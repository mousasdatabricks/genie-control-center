# Genie Control Center

Databricks App (**AppKit**) for **governing AI/BI Genie** across workspaces: usage, adoption, quality, compute FinOps, and **Genie Paygo** (LLM DBU projection + per-user budgets).

Built with React + TypeScript (UI), Express/AppKit (server), **Unity Catalog views** over system tables (analytics), and **Lakebase (Postgres)** for app state (goals, thresholds, annotations, budgets).

## Modules

| Module | What it shows |
|--------|----------------|
| **Overview** | KPIs, time series, spaces needing attention |
| **Adoption** | WAU/new users, engagement by area, heatmap, goals progress |
| **Usage** | Questions, errors, latency by space/user/workspace |
| **Quality** | Feedback, success rate over time, worst spaces |
| **Costs (FinOps)** | Compute cost by space/area/SKU, cost per question/user |
| **Billing (Paygo)** | 150 free LLM DBU/user/month model, monthly projection, per-user budgets |
| **Spaces** | Full inventory with status (Active/Dormant/Orphan) |
| **Space detail** | 360° view + governance annotations (Lakebase) |
| **Admin** | Adoption goals by area, alert thresholds, connection health |

Global filters (period · workspace · area) with URL deep-linking. UI in **PT / EN / ES**.

## Architecture

```
System Tables (audit, billing) + dim_spaces / dim_users
        ↓
5 abstraction views (v_genie_*)
        ↓
config/queries/*.sql  →  AppKit Analytics (SQL Warehouse)
        ↓
React UI (8 modules)

Lakebase schema genie_cc  →  Admin API (goals, thresholds, annotations, budgets)
```

**Portability:** the app always reads five abstraction views. In production you create them over your system tables — **application code does not change**.

| View | Content |
|------|---------|
| `v_genie_usage_daily` | Daily usage per space/user |
| `v_genie_costs_daily` | Daily compute cost per space/SKU |
| `v_genie_users` | Users, area, first/last access |
| `v_genie_spaces` | Inventory + derived status |
| `v_genie_llm_daily` | LLM DBUs per user/day (Paygo) |

Default analytics prefix in queries: **`main.genie_cc`**. Change with `scripts/configure-analytics-schema.sh`.

## Quick start (client deploy)

See **[docs/DEPLOY-CLIENT.md](docs/DEPLOY-CLIENT.md)** for the full runbook.

```bash
# 1. Customize branding (optional)
#    Edit client/src/lib/brand-config.ts

# 2. Point queries to your UC catalog.schema (if not main.genie_cc)
./scripts/configure-analytics-schema.sh your_catalog.your_schema

# 3. Configure databricks.yml (workspace, warehouse, Lakebase)
# 4. Create UC views — sql/views_prod.sql

# 5. Deploy
databricks auth login --host https://YOUR-WORKSPACE.cloud.databricks.com --profile your-profile
databricks bundle deploy -t default -p your-profile
databricks bundle run app -t default -p your-profile
```

## Demo data (optional)

Synthetic demo SQL (not required for production):

- `sql/demo_01_data.sql` — sample spaces/users/events (example: Heineken Brasil)
- `sql/demo_02_views.sql` — views pointing at demo tables

Example customer walkthrough: [docs/examples/heineken/](docs/examples/heineken/).

## Project structure

```
config/queries/*.sql     Analytics queries (read v_genie_* views)
server/server.ts         AppKit bootstrap
server/routes/admin-routes.ts   Lakebase admin API
client/src/              React UI + brand-config.ts (white-label)
sql/views_prod.sql       Production view template (system tables)
sql/demo_*.sql           Optional synthetic demo
databricks.yml           Asset Bundle (app + resources)
app.yaml                 Databricks App runtime
scripts/                 configure-analytics-schema.sh
```

## Local development

```bash
npm install
cp .env.example .env   # fill in warehouse + Lakebase
npm run dev
```

Never commit `.env`.

## Lakebase app state

Schema `genie_cc` (created on first start): `area_goals`, `thresholds`, `annotations`, `user_budgets`. Defaults are seeded at startup and editable in **Administration**.

## License

Unlicensed — confirm licensing with your Databricks account team before external distribution.
