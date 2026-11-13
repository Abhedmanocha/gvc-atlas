# GVC Atlas

A static site that answers supply-chain questions from the ADB Multiregional Input-Output tables: 72 economies plus Rest of World, 35 sectors, 2017-2024. Five questions:

- Exposure: how much of an economy's sector depends on a partner.
- Risk: which industries lean most on foreign suppliers.
- Position: whether a sector is moving up the value chain.
- Gaps: which imported inputs the economy could buy at home.
- Change: whose sector became more tied into global supply chains.

Live: https://OWNER.github.io/gvc-atlas/

## URLs

The URL is the state: `#/{economy}/{sector}/{year}/{view}[/{partner}]`.
Economy is a code from `meta.json`; sector is `c1`..`c35`, `all` or `mfg`; view is `exposure`, `risk`, `position`, `gaps` or `change`.

```
https://OWNER.github.io/gvc-atlas/#/IND/c14/2024/exposure
https://OWNER.github.io/gvc-atlas/#/PRC/all/2024/change
```

## Data

The data is public JSON under `site/public/data/`, served at `data/` on the site. Three file shapes, indexed by position in `data/meta.json`:

| file | content |
|---|---|
| `data/{year}/{ECON}.json` | every field for one economy-year |
| `data/{year}/index.json` | scalar fields for all economies |
| `data/series/{ECON}.json` | scalar fields for all years |

```
curl https://OWNER.github.io/gvc-atlas/data/2024/IND.json
```

Every field and formula: [docs/data.md](docs/data.md). For agents: [llms.txt](site/public/llms.txt).

## Rebuild

1. Download the ADB MRIO tables from https://kidb.adb.org/globalization and put these eight workbooks in the repo root:
   - `ADB-MRIO72-2017-August 2025.xlsx` (2017: August 2025)
   - `ADB-MRIO-2018_September 2024.xlsx` (2018: September 2024)
   - `ADB-MRIO-2019_December 2024.xlsx` (2019: December 2024)
   - `ADB-MRIO-2020_September 2024.xlsx` (2020: September 2024)
   - `ADB-MRIO-2021_August 2024.xlsx` (2021: August 2024)
   - `ADB-MRIO72-2022_July 2025.xlsx` (2022: July 2025)
   - `ADB-MRIO72-2023_July 2025.xlsx` (2023: July 2025)
   - `ADB-MRIO72-2024_August 2025.xlsx` (2024: August 2025)
2. `uv run --project pipeline python -m mrio` loads, computes, validates and writes `site/public/data/`.
3. `npm --prefix site run build` writes `site/dist/`.

ADB revises its tables, so the years come from different editions.

## Validation

`pipeline/tests/` checks identities and reproduces ADB's own GVC participation indicators (Borin and Mancini, by exporting sector, 2022-2024): `gvc_b` to within 2e-4, `gvc_f` to a median error of 1e-4.
Known deviation: ADB computed those from a 75-economy table that splits Tajikistan and Uzbekistan out of Rest of World, so `gvc_f` differs for exporters with large sales to Rest of World (KAZ, KGZ, RUS, MON and a few rows elsewhere; largest sector-row error 0.068). Details in [docs/data.md](docs/data.md).

## Source and licence

Data: Asian Development Bank, Multiregional Input-Output Tables. Derived indicators computed by this project; ADB is not responsible for them.

Code licence: to be decided.
