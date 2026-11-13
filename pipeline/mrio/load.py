"""ADB MRIO xlsx workbooks -> data/cache/{year}.npz.

Parsed by labels only: economy row, c1..c35 / F1..F5 code row, row codes r60..r69.
Saved arrays (float64, millions of US$, node n = economy*35 + sector):
  Z (2555,2555) intermediate flows, rows sell to columns
  F (2555,365)  final demand, economy-major then F1..F5
  va, tax (2555,) value added at basic prices (r64), taxes less subsidies on products (r99)
  other (2555,) r61+r62+r63+trs (normally zero)
  x (2555,) gross output = row sum of Z + F
  sheet_total_col (2555,) sheet's own TOTAL column; sheet_total_row (2555,) its r69 row
  codes: economy codes in order
"""
import re
import sys
from pathlib import Path

import numpy as np
import openpyxl

ROOT = Path(__file__).resolve().parents[2]
CACHE = ROOT / "data" / "cache"
NS, NF = 35, 5
EXTRA_ROWS = ("r61", "r62", "r63", "trs")


def year_files():
    """{year: path} for the 72/73-economy workbooks, matched by the A1/A2 titles."""
    found = {}
    for p in sorted(ROOT.glob("ADB-MRIO*.xlsx")):
        if "62" in p.name:
            continue
        wb = openpyxl.load_workbook(p, read_only=True, data_only=True)
        rows = wb[wb.sheetnames[0]].iter_rows(min_row=1, max_row=2, max_col=1, values_only=True)
        a1, a2 = (r[0] for r in rows)
        wb.close()
        m = re.fullmatch(r"Multiregional Input-Output Table (\d{4})", str(a1).strip())
        if m and re.match(r"7[23] economies", str(a2).strip()):
            found[int(m[1])] = p
    return found


def parse(path):
    wb = openpyxl.load_workbook(path, read_only=True, data_only=True)
    rows = wb[wb.sheetnames[0]].iter_rows(values_only=True)
    econ_row = None
    cols = []  # (column index, economy code, c/F code) for flow columns
    total_col = None
    body = {}  # key -> list of floats (whole row from column 4)
    order = []  # (economy, code) of industry rows in sheet order
    prev = None
    for r in rows:
        if cols == []:
            if r[4] == "c1":  # code row; previous row holds the economies
                econ_row = prev
                for j in range(4, len(r)):
                    if r[j] is not None and re.fullmatch(r"[cF]\d+", str(r[j])):
                        cols.append((j, econ_row[j], r[j]))
                    elif r[j] is None and econ_row[j] == "ToT":
                        total_col = j
                last = max(j for j, _, _ in cols)
            prev = r
            continue
        if total_col is None:  # the ToT column is the one right after the last F
            total_col = last + 1
        code = r[3]
        if code is None:
            continue
        vals = [(r[j] if isinstance(r[j], (int, float)) else 0.0) for j in [c[0] for c in cols] + [total_col]]
        if re.fullmatch(r"c\d+", str(code)):
            order.append((r[2], code))
            body[(r[2], code)] = vals
        else:
            body[str(code)] = vals
            if code == "r69":
                break
    wb.close()
    return cols, order, body


def build(path):
    cols, order, body = parse(path)
    codes = list(dict.fromkeys(e for _, e, _ in cols))
    assert len(codes) == 73, len(codes)
    n = len(codes) * NS
    # column layout check: industries first (economy-major c1..c35), then F1..F5 economy-major
    ind = [(e, c) for _, e, c in cols if c.startswith("c")]
    fin = [(e, c) for _, e, c in cols if c.startswith("F")]
    want_ind = [(e, f"c{s+1}") for e in codes for s in range(NS)]
    want_fin = [(e, f"F{k+1}") for e in codes for k in range(NF)]
    assert ind == want_ind and fin == want_fin, "column layout differs"
    assert order == want_ind, "row layout differs"
    nc = len(cols)
    M = np.array([body[k] for k in order], dtype=np.float64)  # n x (nc+1)
    Z, F = M[:, :n], M[:, n:nc]
    assert F.shape[1] == len(codes) * NF
    vec = lambda k: np.array(body[k][:n], dtype=np.float64)
    other = sum((vec(k) for k in EXTRA_ROWS if k in body), np.zeros(n))
    return dict(
        Z=Z, F=F, va=vec("r64"), tax=vec("r99"), other=other,
        x=Z.sum(1) + F.sum(1),
        sheet_total_col=M[:, nc], sheet_total_row=vec("r69"),
        sheet_r60=vec("r60"), codes=np.array(codes),
    )


def main():
    CACHE.mkdir(parents=True, exist_ok=True)
    for year, p in sorted(year_files().items()):
        out = CACHE / f"{year}.npz"
        if out.exists() and out.stat().st_mtime > p.stat().st_mtime:
            print(year, "cached")
            continue
        np.savez(out, **build(p))
        print(year, "built")


if __name__ == "__main__":
    sys.exit(main())
