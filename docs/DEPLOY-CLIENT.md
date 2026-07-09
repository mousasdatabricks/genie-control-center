# Deploy Genie Control Center — client workspace

> **Instalação detalhada com Databricks Asset Bundles (DAB):** veja **[INSTALL.md](INSTALL.md)** (guia principal, em português).

Este documento resume o runbook em inglês. Todos os passos de deploy usam o **Asset Bundle** definido em [`databricks.yml`](../databricks.yml).

## Prerequisites

| Requirement | Notes |
|-------------|-------|
| Databricks workspace | Serverless recommended |
| Databricks CLI | v0.22+ with `bundle` commands |
| System tables | `system.access.audit`, `system.billing.usage`, `system.access.workspaces_latest` |
| SQL Warehouse | Serverless warehouse for analytics |
| Lakebase | Postgres instance for app state |
| Permissions | Create **Databricks Apps**, use warehouses, access Lakebase |

## Installation flow (DAB)

```
Clone repo → UC views (sql/views_prod.sql) → Configure databricks.yml
    → bundle validate → bundle deploy → bundle run app → Grant CAN_USE + UC SELECT
```

### 1. Authenticate

```bash
databricks auth login --host https://<client-workspace>.cloud.databricks.com --profile <client-profile>
```

### 2. Unity Catalog (before bundle deploy)

- Populate `dim_spaces` and `dim_users`
- Run `sql/views_prod.sql` with `<<CATALOG>>.<<SCHEMA>>` replaced (e.g. `main.genie_cc`)
- If not using `main.genie_cc`, run `./scripts/configure-analytics-schema.sh <catalog>.<schema>`

### 3. Discover bundle variables

```bash
# SQL Warehouse ID
databricks warehouses list -p <client-profile> --output json | jq '.[].id'

# Lakebase branch + database
databricks postgres list-projects -p <client-profile>
databricks postgres list-branches projects/<project-id> -p <client-profile>
databricks postgres list-databases "projects/<project-id>/branches/production" -p <client-profile>
```

### 4. Configure [`databricks.yml`](../databricks.yml)

```yaml
targets:
  default:
    mode: production
    workspace:
      host: https://<client-workspace>.cloud.databricks.com
    variables:
      sql_warehouse_id: <warehouse-id>
      postgres_branch: projects/<lakebase-project>/branches/production
      postgres_database: projects/<lakebase-project>/branches/production/databases/databricks-postgres
```

Or pass at deploy time: `--var sql_warehouse_id=... --var postgres_branch=... --var postgres_database=...`

### 5. Validate and deploy

```bash
databricks bundle validate -t default -p <client-profile>
databricks bundle deploy -t default -p <client-profile>
databricks bundle run app -t default -p <client-profile>
```

Or: `make deploy PROFILE=<client-profile>`

App URL: `databricks apps get genie-control-center -p <client-profile> --output json | jq -r '.url'`

### 6. Post-deploy permissions

- Grant app SP `SELECT` on UC views/schema and system tables
- Grant user group `CAN_USE` on the app:

```bash
databricks apps set-permissions genie-control-center \
  --json '{"access_control_list":[{"group_name":"<client-group>","permission_level":"CAN_USE"}]}' \
  -p <client-profile>
```

### 7. First use

Open `/admin` → verify health → configure goals/thresholds → share app URL.

## Handoff checklist

- [ ] Workspace URL + CLI profile
- [ ] UC catalog.schema + views created
- [ ] `sql_warehouse_id`, `postgres_branch`, `postgres_database`
- [ ] `bundle validate` + `bundle deploy` + `bundle run app` succeeded
- [ ] SP grants on UC + system tables
- [ ] SSO group with `CAN_USE`

## Troubleshooting

| Symptom | Check |
|---------|-------|
| `bundle validate` fails | Variables and workspace host in `databricks.yml` |
| Empty charts | UC views + query prefix in `config/queries/` |
| Admin DB errors | Lakebase names in bundle variables |
| App CRASHED | `databricks apps logs genie-control-center` |

Full DAB troubleshooting: [INSTALL.md](INSTALL.md).

## Optional demo

Synthetic data: `sql/demo_*.sql` — see [examples/heineken/](examples/heineken/).
