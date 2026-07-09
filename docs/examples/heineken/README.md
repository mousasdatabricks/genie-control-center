# Heineken Brasil — example deployment

This folder contains **customer-specific** materials for the Heineken Brasil demo. They are **not** required for a generic client install.

| File | Purpose |
|------|---------|
| `handoff-heineken.md` | Sales / SE handoff notes |
| `demo-walkthrough.md` | 8–10 min demo script |

## Demo infrastructure (internal FEVM)

| Resource | Value |
|----------|-------|
| Workspace | `fevm-serverless-stable-cvpomp` |
| UC prefix | `serverless_stable_cvpomp_catalog.heineken_genie` |
| Lakebase | `heineken-genie-db` |
| Demo SQL | `sql/demo_01_data.sql`, `sql/demo_02_views.sql` |

To replicate the Heineken demo locally, restore the demo UC prefix:

```bash
./scripts/configure-analytics-schema.sh serverless_stable_cvpomp_catalog.heineken_genie main.genie_cc
```

Then run the demo SQL scripts and deploy with your FEVM `databricks.yml` overrides (keep those values out of the public repo).
