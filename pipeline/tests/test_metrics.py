from collections import defaultdict
from functools import cache, lru_cache

import numpy as np
import openpyxl
import pytest

from mrio import metrics as M
from mrio.load import CACHE, ROOT

YEARS = range(2017, 2025)
GVC = ROOT / "ADB-MRIO-GVC Participation-BM-based-By Exporting Sector,2022-2024_current.xlsx"
MIN_EXPORTS = 1.0  # US$ million: below this ADB's ratios are numerical noise
R, ALL, MFG = M.ROWS, M.NS, M.NS + 1


@lru_cache(maxsize=1)  # one year in memory at a time (~1 GB)
def table(year):
    d = np.load(CACHE / f"{year}.npz")
    Z, F, x = d["Z"], d["F"], d["x"]
    A, v = M.coefficients(Z, x)
    B = np.linalg.inv(np.eye(M.N) - A)
    return dict(Z=Z, F=F, x=x, A=A, v=v, B=B, G=M.origin(v, B), d=d, m=M.year(Z, F, x))


@pytest.fixture(scope="module", params=YEARS)
def t(request):
    return table(request.param)


def test_origin_sums_to_one(t):
    live = t["x"] > 0
    assert np.allclose(t["G"].sum(0)[live], 1, atol=1e-9)


def test_origin_without_taxes_leaves_tax_content(t):
    """With v = r64 only, G sums to 1 minus the product-tax (+ r61..trs) content embodied in j."""
    d, xs = t["d"], np.where(t["x"] > 0, t["x"], 1)
    G = M.origin(d["va"] / xs, t["B"])
    tax = ((d["tax"] + d["other"]) / xs) @ t["B"]
    live = t["x"] > 0
    assert np.allclose((G.sum(0) + tax)[live], 1, atol=1e-9)


def test_routes_add_up(t):
    direct, home, third = M.routes(t["G"], t["A"])
    assert (direct[M.OWN] == 0).all()
    assert np.allclose(direct + home + third + M.OWN * t["v"], t["G"], atol=1e-12)


def test_world_value_added(t):
    """Value added embodied in all final demand, by origin, equals each economy's value added."""
    G, F, v, x = t["G"], t["F"], t["v"], t["x"]
    assert np.allclose(G @ F.sum(1), M.by_economy(v * x), rtol=1e-9)


def test_aggregates_are_flow_sums(t):
    m = t["m"]
    X = m["x"].reshape(M.NE, R)
    assert np.allclose(X[:, ALL], X[:, :M.NS].sum(1)) and np.allclose(X[:, MFG], X[:, M.MFG].sum(1))
    for k in ("va", "direct", "home", "third", "inputs", "imp"):
        a = (np.nan_to_num(m[k]) * m["x"][:, None]).reshape(M.NE, R, -1)
        assert np.allclose(a[:, ALL], a[:, :M.NS].sum(1)), k
        assert np.allclose(a[:, MFG], a[:, M.MFG].sum(1)), k
    dest = m["dest"].reshape(M.NE, R, M.NE)
    assert np.allclose(dest[:, ALL], dest[:, :M.NS].sum(1))
    assert np.allclose(m["e"], m["dest"].sum(1))
    e = m["e"].reshape(M.NE, R)[:, ALL].sum()
    Z, F = t["Z"], t["F"]
    assert np.isclose(e, Z.sum() + F.sum() - M.domestic(Z).sum() - sum(
        F[i * M.NS:(i + 1) * M.NS, i * 5:(i + 1) * 5].sum() for i in range(M.NE)))
    assert np.allclose(m["rca"].reshape(M.NE, R)[:, ALL], 1)
    assert np.allclose(m["fva"], 1 - m["va"][np.arange(M.NE * R), np.repeat(np.arange(M.NE), R)], equal_nan=True)


def test_reference_point_ind_c9_2024():
    """Independent computation from the 2024 table (value added = r64 only)."""
    t = table(2024)
    codes = list(t["d"]["codes"])
    ind, prc, usa = (codes.index(c) for c in ("IND", "PRC", "USA"))
    n = ind * M.NS + 8
    xs = np.where(t["x"] > 0, t["x"], 1)
    G = M.origin(t["d"]["va"] / xs, t["B"])
    assert np.allclose(G[[ind, prc, usa], n], [0.642, 0.041, 0.032], atol=5e-4)
    inputs = t["m"]["inputs"][ind * R + 8]
    assert abs(inputs[prc] / inputs.sum() - 0.034) < 5e-4


@cache
def adb():
    """{(year, aggregation): {economy index 0..74: [(sector, f, b), ...] in sheet order}}."""
    out = defaultdict(lambda: defaultdict(list))
    ws = openpyxl.load_workbook(GVC, read_only=True).active
    for y, agg, e, s, f, b, _ in ws.iter_rows(min_row=2, values_only=True):
        out[y, agg][e - 1].append((s, f, b))
    return out


# Aggregation codes: 0 = economy total, 35 = sectors c1..c35, 5 and 15 = ADB sector groups.
# Group 5/15 rows are listed sorted by group, so membership is not in the sheet; it was found by
# exhaustive search over subsets of c3..c18 and is exact (note c11 moves between the two groupings).
GROUPS = {
    0: {0: range(1, 36)},
    5: {1: [1, 2], 2: [3, 4, 5, 6, 7, 10, 16, 17, 18], 3: [8, 9, 11, 12, 13, 14, 15],
        4: range(19, 31), 5: range(31, 36)},
    15: {1: [1], 2: [2], 3: [3, 4, 5, 6, 7, 10, 11, 16], 4: [8, 9, 12, 13, 14, 15], 5: [17], 6: [18],
         7: [19, 20, 21], 8: [22], 9: [23, 24, 25, 26], 10: [27], 11: [28], 12: [29, 30], 13: [31],
         14: [32, 33], 15: [34, 35]},
    35: {s: [s] for s in range(1, 36)},
}


def compare(year):
    """(aggregation, exports, our f, ADB f, our b, ADB b, RoW share of exports) per comparable ADB row."""
    t = table(year)
    D = M.exports(t["Z"], t["F"])
    E = D.sum(1)
    dva, fwd = M.participation(t["A"], t["v"], t["F"], E)
    rows = []
    for agg in (0, 5, 15, 35):
        sheet = adb()[year, agg]
        for e in range(M.NE - 1):  # ADB splits Tajikistan and Uzbekistan out of RoW: compare 1..72
            ref = {s: (f, b) for s, f, b in sheet[e]}
            for s, sectors in GROUPS[agg].items():
                n = e * M.NS + np.array(sectors) - 1
                ex = max(E[n].sum(), 1e-300)
                rows.append((agg, ex, fwd[n].sum() / ex, ref[s][0], 1 - dva[n].sum() / ex, ref[s][1],
                             D[n, -1].sum() / ex))
    a = np.array(rows)
    return a[a[:, 1] > MIN_EXPORTS]


def summary(a, col_ours, col_adb):
    err = np.abs(a[:, col_ours] - a[:, col_adb])
    by = {int(g): f"max {err[a[:, 0] == g].max():.2e} median {np.median(err[a[:, 0] == g]):.2e}"
          for g in (0, 5, 15, 35)}
    return err, f"n={len(err)} >1e-3: {(err > 1e-3).sum()} by aggregation {by}"


@pytest.mark.parametrize("year", [2022, 2023, 2024])
def test_adb_backward_participation(year):
    err, msg = summary(compare(year), 4, 5)
    print(year, "backward", msg)
    assert err.max() < 1e-3, msg


# Forward participation depends on how each partner absorbs imports domestically. ADB's workbook was
# computed from a 75-economy table (Tajikistan and Uzbekistan split out of RoW, with partner-side trade
# re-estimated), so rows exporting much to RoW (KAZ, KGZ, RUS, MON, GEO, LVA, UAE) deviate by up to ~0.07.
# Rows sending < 1% of exports to RoW must match. 2022 also differs by a table revision (backward is off
# by up to 2e-4 there too): TAP rows reach 1.1e-3. Rows with negative domestic value added (gvc_b > 1,
# e.g. CYP c25 2022) are ill-conditioned and excluded from the strict check.
FORWARD_LOW_ROW = {2022: 1.5e-3, 2023: 1e-3, 2024: 1e-3}


@pytest.mark.parametrize("year", [2022, 2023, 2024])
def test_adb_forward_participation(year):
    a = compare(year)
    err, msg = summary(a, 2, 3)
    print(year, "forward", msg)
    strict = (a[:, 6] < 0.01) & (a[:, 4] <= 1)
    assert err[strict].max() < FORWARD_LOW_ROW[year], msg
    assert np.median(err) <= 1e-4, msg
    assert np.quantile(err, 0.99) <= 2e-3, msg
    assert err[a[:, 0] == 0].max() <= 2e-3, msg
