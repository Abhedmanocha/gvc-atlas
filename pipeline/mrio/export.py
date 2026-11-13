"""data/cache/{year}.npz -> site/public/data/. The contract is docs/data.md."""
import json
import math
import shutil

import numpy as np

from . import metrics
from .load import CACHE, ROOT

OUT = ROOT / "site" / "public" / "data"
ARRAYS = ("va", "direct", "home", "third", "inputs", "dest", "imp", "impsh")
SCALARS = ("x", "e", "own", "fva", "fdirect", "hhi", "top", "topva", "nsup", "imports",
           "gvc_b", "gvc_f", "up", "rca")
SMALL = ("va", "direct", "home", "third", "inputs", "imp")  # per-$ arrays: |v| < 1e-5 written as 0


def num(v):
    if not math.isfinite(v):
        return "null"
    s = f"{v:.4g}"
    return str(int(float(s))) if abs(v) >= 1e4 else s  # 12340, not 1.234e+04


def dump(o):
    """Compact JSON with every number at 4 significant digits and NaN/inf as null."""
    if isinstance(o, dict):
        return "{" + ",".join(f'"{k}":{dump(v)}' for k, v in o.items()) + "}"
    o = np.asarray(o, dtype=float)
    if o.ndim == 1:
        return "[" + ",".join(map(num, o.tolist())) + "]"
    return "[" + ",".join(dump(v) for v in o) + "]"


def write(path, obj):
    path.parent.mkdir(parents=True, exist_ok=True)
    path.write_text(dump(obj))


def main(years):
    codes = [e["code"] for e in json.loads((OUT / "meta.json").read_text())["economies"]]
    R = metrics.ROWS
    series = {c: {k: [] for k in SCALARS} for c in codes}
    for y in years:
        d = np.load(CACHE / f"{y}.npz")
        assert list(d["codes"]) == codes, "economy order differs from meta.json"
        m = metrics.year(d["Z"], d["F"], d["x"])  # scalars are computed before the cut below
        for k in SMALL:
            m[k] = np.where(np.abs(m[k]) < 1e-5, 0, m[k])
        write(OUT / str(y) / "index.json", {k: m[k].reshape(len(codes), R) for k in SCALARS})
        for e, c in enumerate(codes):
            rows = slice(e * R, (e + 1) * R)
            write(OUT / str(y) / f"{c}.json", {k: m[k][rows] for k in ARRAYS + SCALARS})
            for k in SCALARS:
                series[c][k].append(m[k][rows])
        print(y, "exported")
    for c in codes:
        write(OUT / "series" / f"{c}.json", series[c])
    shutil.copyfile(ROOT / "docs" / "data.md", OUT.parent / "data.md")  # the contract ships with the site
