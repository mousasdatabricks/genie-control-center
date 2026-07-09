# Deploy Genie Control Center — client workspace

Runbook for installing the app in a **customer Databricks workspace**. No Heineken- or demo-specific configuration is required.

## Prerequisites

| Requirement | Notes |
|-------------|-------|
| Databricks workspace | Serverless recommended |
| System tables | `system.access.audit`, `system.billing.usage`, `system.access.workspaces_latest` |
| SQL Warehouse | Serverless warehouse for analytics |
| Lakebase | Postgres instance for app state |
| Databricks CLI | Authenticated to client workspace |
| Permissions | Ability to create **Databricks Apps** and grant SP access |

## 1. Authenticate

```bash
databricks auth login --host https://<client-workspace>.cloud.databricks.com --profile <client-profile>
```

## 2. Unity Catalog — reference tables + views

### 2a. Reference dimensions

Populate (see DDL comments in `sql/views_prod.sql`):

- **`dim_spaces`** — one row per Genie space (`GET /api/2.0/genie/spaces`)
- **`dim_users`** — email → business area (from your directory/SCIM/HR)

### 2b. Create views

Run `sql/views_prod.sql` in a SQL editor, replacing:

```
<<CATALOG>>.<<SCHEMA>>  →  e.g. main.genie_cc
```

**Tune `action_name` filters** for your Databricks release:

```sql
SELECT DISTINCT action_name
FROM system.access.audit
WHERE service_name = 'databricksGenie';
```

### 2c. Point app queries to your schema

Default in this repo: `main.genie_cc`. If different:

```bash
./scripts/configure-analytics-schema.sh <catalog>.<schema>
```

## 3. Lakebase

Create a Lakebase project/instance and note:

- Postgres branch resource name
- Database resource name
- `PGHOST` (for local seed only)

The app creates schema **`genie_cc`** automatically on first start.

## 4. Configure the bundle

Edit [`databricks.yml`](../databricks.yml):

```yaml
targets:
  default:
    workspace:
      host: https://<client-workspace>.cloud.databricks.com
    variables:
      sql_warehouse_id: <warehouse-id>
      postgres_branch: projects/<lakebase-project>/branches/production
      postgres_database: projects/<lakebase-project>/branches/production/databases/databricks-postgres
```

List Lakebase resources:

```bash
databricks postgres list-branches projects/<project-id> -p <client-profile>
databricks postgres list-databases <branch-name> -p <client-profile>
```

## 5. White-label branding (optional)

Edit [`client/src/lib/brand-config.ts`](../client/src/lib/brand-config.ts):

- `orgName` — customer name shown in sidebar
- `primary`, `accent`, `gold` — chart/theme colors

## 6. Service Principal permissions

After deploy, grant the **app service principal**:

| Resource | Permission |
|----------|------------|
| SQL Warehouse | `CAN_USE` (via bundle) |
| Lakebase | `CAN_CONNECT_AND_CREATE` (via bundle) |
| `main.genie_cc` views + `dim_*` tables | `SELECT` |
| System tables used in `views_prod.sql` | `SELECT` |

## 7. Deploy

```bash
npm install
databricks bundle deploy -t default -p <client-profile>
databricks bundle run app -t default -p <client-profile>
```

App URL pattern: `https://genie-control-center-<org-id>.<region>.databricksapps.com`

## 8. Grant user access

```bash
databricks apps set-permissions genie-control-center \
  --json '{"access_control_list":[{"group_name":"<client-group>","permission_level":"CAN_USE"}]}' \
  -p <client-profile>
```

Or: App UI → Permissions → Add group → **Can use**.

## 9. First use

1. Open the app URL → **Administration** (`/admin`)
2. Verify Lakebase + warehouse health indicators
3. Adjust adoption goals and alert thresholds for the client's org structure
4. Share the app URL with platform/CoE users

## Handoff checklist (ask the client)

- [ ] Workspace URL + admin contact with Apps/Lakebase permissions
- [ ] Target UC catalog.schema for views
- [ ] Lakebase project (or permission to create)
- [ ] SQL Warehouse ID
- [ ] SSO group for `CAN_USE`
- [ ] Source for `dim_users` (area mapping)
- [ ] Process to sync `dim_spaces` from Genie API

## Troubleshooting

| Symptom | Check |
|---------|-------|
| Empty charts | Views exist? SP has `SELECT`? Correct catalog prefix in `config/queries/`? |
| Admin DB errors | Lakebase branch/database names in `databricks.yml` |
| Paygo page empty | `v_genie_llm_daily` + `billing_origin_product='GENIE'` in your region |
| Build fails on deploy | `npm ci` in `app.yaml` — check App logs in workspace |

## Optional demo

To run with synthetic data instead of system tables, use `sql/demo_01_data.sql` + `sql/demo_02_views.sql` and point queries at that schema. See [examples/heineken/](examples/heineken/) for a reference walkthrough.
