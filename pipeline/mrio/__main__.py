"""uv run --project pipeline python -m mrio : xlsx -> cache -> metrics -> site/public/data/."""
import time

from . import export, load

t = time.time()
load.main()
export.main(sorted(int(p.stem) for p in load.CACHE.glob("*.npz")))
print(f"done in {time.time() - t:.0f}s")
