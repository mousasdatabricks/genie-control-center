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

**Portability:** the app reads abstraction views over system tables. In production you create them once — **application code does not change**.

| View | Content |
|------|---------|
| `v_genie_usage_daily` | Daily usage per space/user + product surface |
| `v_genie_costs_daily` | Compute cost per space (proportional allocation) |
| `v_genie_billing_sku_daily` | Real `sku_name` from billing + cost category |
| `v_genie_llm_daily` | LLM DBUs/cost per user (+ space when inferable) |
| `v_genie_user_cost_daily` | Compute + LLM per user/day |
| `v_genie_product_usage_daily` | Aggregated Spaces vs Code usage |
| `v_genie_users` | Users, area, first/last access |
| `v_genie_spaces` | Inventory + derived status |

Default analytics prefix in queries: **`main.genie_cc`**. Change with `scripts/configure-analytics-schema.sh`.

**Billing monitoring guide:** [docs/BILLING-MONITORING.md](docs/BILLING-MONITORING.md)

## Instalação (cliente)

**Guia completo com Databricks Asset Bundles:** **[docs/INSTALL.md](docs/INSTALL.md)**

Resumo:

```bash
git clone https://github.com/mousasdatabricks/genie-control-center.git
cd genie-control-center

# 1. (Opcional) branding → client/src/lib/brand-config.ts
# 2. (Opcional) UC prefix → ./scripts/configure-analytics-schema.sh catalog.schema
# 3. Criar views UC → sql/views_prod.sql (no workspace)
# 4. Configurar databricks.yml (host, warehouse, Lakebase)

databricks auth login --host https://YOUR-WORKSPACE.cloud.databricks.com --profile your-profile
databricks bundle validate -t default -p your-profile
databricks bundle deploy -t default -p your-profile
databricks bundle run app -t default -p your-profile
```

Runbook complementar (inglês): [docs/DEPLOY-CLIENT.md](docs/DEPLOY-CLIENT.md).  
Billing e monitoramento: [docs/BILLING-MONITORING.md](docs/BILLING-MONITORING.md).

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
