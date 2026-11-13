import json

import numpy as np
import pytest

from mrio.load import CACHE, ROOT

YEARS = range(2017, 2025)
META = json.loads((ROOT / "site/public/data/meta.json").read_text())
CODES = [e["code"] for e in META["economies"]]
N = 73 * 35


@pytest.fixture(scope="module", params=YEARS)
def d(request):
    path = CACHE / f"{request.param}.npz"
    assert path.exists(), "run: uv run --project pipeline python -m mrio.load"
    return request.param, np.load(path)


def test_shapes_and_order(d):
    _, c = d
    assert list(c["codes"]) == CODES and len(CODES) == 73
    assert c["Z"].shape == (N, N) and c["F"].shape == (N, 365)
    for k in ("va", "tax", "other", "x"):
        assert c[k].shape == (N,)
    assert all(c[k].dtype == np.float64 for k in ("Z", "F", "va", "tax", "other", "x"))
    assert np.isfinite(c["Z"]).all() and np.isfinite(c["F"]).all()


def test_balance(d):
    year, c = d
    col = c["Z"].sum(0) + c["tax"] + c["va"] + c["other"]
    err = np.abs(col - c["x"])
    n = err.argmax()
    print(year, "worst abs error", err[n], "at node", n)
    assert (err <= 1e-9 * np.maximum(np.abs(c["x"]), 1)).all()


def test_matches_sheet_totals(d):
    _, c = d
    col = c["Z"].sum(0) + c["tax"] + c["va"] + c["other"]
    assert np.allclose(c["sheet_total_col"], c["x"], rtol=1e-9, atol=1e-6)
    assert np.allclose(c["sheet_total_row"], col, rtol=1e-9, atol=1e-6)
    assert np.allclose(c["sheet_r60"], c["Z"].sum(0), rtol=1e-9, atol=1e-6)


def test_world_value_added_plausible(d):
    _, c = d
    assert 75e6 < c["va"].sum() < 110e6  # millions of US$


def test_world_value_added_rises():
    va = {y: np.load(CACHE / f"{y}.npz")["va"].sum() for y in YEARS}
    for y in YEARS:
        if y > 2017 and y != 2020:
            assert va[y] > va[y - 1], y
