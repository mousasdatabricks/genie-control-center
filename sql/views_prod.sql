-- =============================================================================
-- Genie Control Center — PROD abstraction views (template)
-- =============================================================================
-- O app lê estas views. Na demo elas apontam para tabelas sintéticas; aqui
-- apontam para SYSTEM TABLES + dim_spaces / dim_users.
--
-- COMO USAR:
--   1. Troque <<CATALOG>>.<<SCHEMA>> (ex.: main.genie_cc) e o mesmo prefixo
--      em config/queries/*.sql (scripts/configure-analytics-schema.sh).
--   2. Popule dim_spaces e dim_users.
--   3. AJUSTE action_name / product_surface em _genie_events ao seu release.
--   4. Rode este script.
--
-- Requisitos: SELECT em system.access.audit, system.billing.usage,
-- system.billing.list_prices, system.access.workspaces_latest e dim_*.
-- =============================================================================

CREATE SCHEMA IF NOT EXISTS <<CATALOG>>.<<SCHEMA>>;

CREATE TABLE IF NOT EXISTS <<CATALOG>>.<<SCHEMA>>.dim_spaces (
  space_id       STRING,
  space_name     STRING,
  owner_email    STRING,
  area           STRING,
  workspace_id   BIGINT,
  warehouse_id   STRING,
  num_tables     INT,
  created_at     DATE
);

CREATE TABLE IF NOT EXISTS <<CATALOG>>.<<SCHEMA>>.dim_users (
  user_email          STRING,
  display_name        STRING,
  area                STRING,
  home_workspace_id   BIGINT,
  joined_date         DATE
);

-- ── Eventos Genie com superfície de produto (Spaces / Code / Other) ─────────
CREATE OR REPLACE VIEW <<CATALOG>>.<<SCHEMA>>._genie_events AS
SELECT
  a.event_date                                            AS usage_date,
  a.workspace_id,
  a.user_identity.email                                   AS user_email,
  COALESCE(a.request_params.space_id, a.request_params.genie_space_id) AS space_id,
  a.action_name,
  a.response.status_code                                  AS status_code,
  -- ⚠️ Ajuste os action_name ao seu ambiente (ver docs/BILLING-MONITORING.md)
  CASE
    WHEN COALESCE(a.request_params.space_id, a.request_params.genie_space_id) IS NOT NULL
         OR a.action_name IN ('sendMessage', 'executeMessageQuery', 'submitFeedback')
      THEN 'GENIE_SPACES'
    WHEN a.action_name ILIKE '%code%'
         OR a.action_name IN ('runGenieCode', 'executeGenieCode', 'genieCodeRun', 'startGenieCodeSession')
      THEN 'GENIE_CODE'
    ELSE 'GENIE_OTHER'
  END                                                     AS product_surface
FROM system.access.audit a
WHERE a.service_name = 'databricksGenie'
  AND a.event_date >= current_date() - INTERVAL 120 DAYS;

-- ── v_genie_usage_daily ─────────────────────────────────────────────────────
CREATE OR REPLACE VIEW <<CATALOG>>.<<SCHEMA>>.v_genie_usage_daily AS
SELECT
  e.usage_date,
  e.workspace_id,
  w.workspace_name,
  e.space_id,
  s.space_name,
  COALESCE(u.area, s.area, 'Não classificado')            AS area,
  e.user_email,
  e.product_surface,
  COUNT_IF(e.action_name IN ('sendMessage', 'executeMessageQuery')) AS num_questions,
  COUNT_IF(e.status_code >= 400)                          AS num_errors,
  CAST(NULL AS DOUBLE)                                    AS avg_latency_ms,
  COUNT_IF(e.action_name IN ('submitFeedback'))           AS feedback_given,
  COUNT_IF(e.action_name = 'submitFeedback' AND e.status_code < 400) AS feedback_positive,
  COUNT_IF(e.action_name = 'submitFeedback' AND e.status_code >= 400) AS feedback_negative
FROM <<CATALOG>>.<<SCHEMA>>._genie_events e
LEFT JOIN <<CATALOG>>.<<SCHEMA>>.dim_spaces s ON s.space_id = e.space_id
LEFT JOIN <<CATALOG>>.<<SCHEMA>>.dim_users  u ON u.user_email = e.user_email
LEFT JOIN (SELECT DISTINCT workspace_id, workspace_name FROM system.access.workspaces_latest) w
       ON w.workspace_id = e.workspace_id
GROUP BY e.usage_date, e.workspace_id, w.workspace_name, e.space_id, s.space_name,
         COALESCE(u.area, s.area, 'Não classificado'), e.user_email, e.product_surface;

-- ── v_genie_costs_daily (rateio proporcional por perguntas no warehouse) ────
CREATE OR REPLACE VIEW <<CATALOG>>.<<SCHEMA>>.v_genie_costs_daily AS
WITH wh AS (
  SELECT
    u.usage_date,
    u.usage_metadata.warehouse_id                           AS warehouse_id,
    u.sku_name,
    CASE
      WHEN u.sku_name LIKE '%SERVERLESS_SQL%' THEN 'COMPUTE_SQL'
      WHEN u.sku_name LIKE '%SERVERLESS_REALTIME%' OR u.sku_name LIKE '%MODEL_SERVING%' THEN 'COMPUTE_LLM_INFRA'
      ELSE 'COMPUTE_OTHER'
    END                                                     AS sku_category,
    SUM(u.usage_quantity)                                   AS dbus,
    SUM(u.usage_quantity * COALESCE(lp.pricing.effective_list.default, 0)) AS cost_usd
  FROM system.billing.usage u
  LEFT JOIN system.billing.list_prices lp
    ON u.cloud = lp.cloud AND u.sku_name = lp.sku_name
   AND u.usage_start_time >= lp.price_start_time
   AND (lp.price_end_time IS NULL OR u.usage_start_time < lp.price_end_time)
  WHERE u.usage_metadata.warehouse_id IS NOT NULL
    AND u.usage_date >= current_date() - INTERVAL 120 DAYS
    AND (
      u.billing_origin_product = 'GENIE'
      OR u.usage_metadata.warehouse_id IN (SELECT DISTINCT warehouse_id FROM <<CATALOG>>.<<SCHEMA>>.dim_spaces WHERE warehouse_id IS NOT NULL)
    )
  GROUP BY u.usage_date, u.usage_metadata.warehouse_id, u.sku_name,
           CASE
             WHEN u.sku_name LIKE '%SERVERLESS_SQL%' THEN 'COMPUTE_SQL'
             WHEN u.sku_name LIKE '%SERVERLESS_REALTIME%' OR u.sku_name LIKE '%MODEL_SERVING%' THEN 'COMPUTE_LLM_INFRA'
             ELSE 'COMPUTE_OTHER'
           END
),
space_q AS (
  SELECT
    u.usage_date,
    u.workspace_id,
    s.warehouse_id,
    u.space_id,
    s.space_name,
    COALESCE(u.area, s.area, 'Não classificado')          AS area,
    SUM(u.num_questions)                                  AS questions
  FROM <<CATALOG>>.<<SCHEMA>>.v_genie_usage_daily u
  JOIN <<CATALOG>>.<<SCHEMA>>.dim_spaces s ON s.space_id = u.space_id
  WHERE u.space_id IS NOT NULL AND s.warehouse_id IS NOT NULL
  GROUP BY u.usage_date, u.workspace_id, s.warehouse_id, u.space_id, s.space_name,
           COALESCE(u.area, s.area, 'Não classificado')
),
wh_day AS (
  SELECT usage_date, warehouse_id, SUM(questions) AS total_questions
  FROM space_q
  GROUP BY usage_date, warehouse_id
)
SELECT
  sq.usage_date,
  sq.workspace_id,
  w.workspace_name,
  sq.space_id,
  sq.space_name,
  sq.area,
  wh.sku_name,
  wh.sku_category                                         AS sku,
  wh.dbus * TRY_DIVIDE(sq.questions, wd.total_questions) AS dbus,
  wh.cost_usd * TRY_DIVIDE(sq.questions, wd.total_questions) AS cost_usd
FROM wh
JOIN wh_day wd ON wd.usage_date = wh.usage_date AND wd.warehouse_id = wh.warehouse_id
JOIN space_q sq ON sq.usage_date = wh.usage_date AND sq.warehouse_id = wh.warehouse_id
LEFT JOIN (SELECT DISTINCT workspace_id, workspace_name FROM system.access.workspaces_latest) w
       ON w.workspace_id = sq.workspace_id
WHERE wd.total_questions > 0;

-- ── v_genie_billing_sku_daily — SKUs reais ligados ao Genie ─────────────────
CREATE OR REPLACE VIEW <<CATALOG>>.<<SCHEMA>>.v_genie_billing_sku_daily AS
SELECT
  u.usage_date,
  u.workspace_id,
  w.workspace_name,
  u.identity_metadata.run_as                              AS user_email,
  COALESCE(du.area, 'Não classificado')                 AS area,
  u.sku_name,
  u.billing_origin_product,
  CASE
    WHEN u.billing_origin_product = 'GENIE' THEN 'LLM_PAYGO'
    WHEN u.sku_name LIKE '%SERVERLESS_SQL%' THEN 'COMPUTE_SQL'
    WHEN u.sku_name LIKE '%SERVERLESS_REALTIME%' OR u.sku_name LIKE '%MODEL_SERVING%' THEN 'COMPUTE_LLM_INFRA'
    ELSE 'COMPUTE_OTHER'
  END                                                     AS cost_category,
  SUM(u.usage_quantity)                                   AS dbus,
  SUM(u.usage_quantity * COALESCE(lp.pricing.effective_list.default, 0)) AS cost_usd
FROM system.billing.usage u
LEFT JOIN system.billing.list_prices lp
  ON u.cloud = lp.cloud AND u.sku_name = lp.sku_name
 AND u.usage_start_time >= lp.price_start_time
 AND (lp.price_end_time IS NULL OR u.usage_start_time < lp.price_end_time)
LEFT JOIN <<CATALOG>>.<<SCHEMA>>.dim_users du ON du.user_email = u.identity_metadata.run_as
LEFT JOIN (SELECT DISTINCT workspace_id, workspace_name FROM system.access.workspaces_latest) w
       ON w.workspace_id = u.workspace_id
WHERE u.usage_date >= current_date() - INTERVAL 120 DAYS
  AND (
    u.billing_origin_product = 'GENIE'
    OR u.usage_metadata.warehouse_id IN (SELECT DISTINCT warehouse_id FROM <<CATALOG>>.<<SCHEMA>>.dim_spaces WHERE warehouse_id IS NOT NULL)
  )
GROUP BY u.usage_date, u.workspace_id, w.workspace_name, u.identity_metadata.run_as,
         COALESCE(du.area, 'Não classificado'), u.sku_name, u.billing_origin_product,
         CASE
           WHEN u.billing_origin_product = 'GENIE' THEN 'LLM_PAYGO'
           WHEN u.sku_name LIKE '%SERVERLESS_SQL%' THEN 'COMPUTE_SQL'
           WHEN u.sku_name LIKE '%SERVERLESS_REALTIME%' OR u.sku_name LIKE '%MODEL_SERVING%' THEN 'COMPUTE_LLM_INFRA'
           ELSE 'COMPUTE_OTHER'
         END;

-- ── v_genie_llm_daily (Paygo — custo LLM por usuário; space quando disponível) ─
CREATE OR REPLACE VIEW <<CATALOG>>.<<SCHEMA>>.v_genie_llm_daily AS
WITH llm AS (
  SELECT
    u.usage_date,
    u.identity_metadata.run_as                            AS user_email,
    u.workspace_id,
    SUM(u.usage_quantity)                               AS llm_dbus,
    SUM(u.usage_quantity * COALESCE(lp.pricing.effective_list.default, 0)) AS llm_cost_usd
  FROM system.billing.usage u
  LEFT JOIN system.billing.list_prices lp
    ON u.cloud = lp.cloud AND u.sku_name = lp.sku_name
   AND u.usage_start_time >= lp.price_start_time
   AND (lp.price_end_time IS NULL OR u.usage_start_time < lp.price_end_time)
  WHERE u.billing_origin_product = 'GENIE'
    AND u.usage_date >= current_date() - INTERVAL 60 DAYS
  GROUP BY u.usage_date, u.identity_metadata.run_as, u.workspace_id
),
usage_space AS (
  SELECT usage_date, user_email, workspace_id, space_id, SUM(num_questions) AS num_questions
  FROM <<CATALOG>>.<<SCHEMA>>.v_genie_usage_daily
  WHERE space_id IS NOT NULL
  GROUP BY usage_date, user_email, workspace_id, space_id
),
ranked AS (
  SELECT *, ROW_NUMBER() OVER (PARTITION BY usage_date, user_email, workspace_id ORDER BY num_questions DESC) AS rn
  FROM usage_space
)
SELECT
  l.usage_date,
  l.user_email,
  l.workspace_id,
  w.workspace_name,
  COALESCE(du.area, 'Não classificado')                 AS area,
  rs.space_id,
  COALESCE(rs.num_questions, 0)                         AS num_questions,
  l.llm_dbus,
  l.llm_cost_usd
FROM llm l
LEFT JOIN ranked rs ON rs.usage_date = l.usage_date AND rs.user_email = l.user_email
                   AND rs.workspace_id = l.workspace_id AND rs.rn = 1
LEFT JOIN <<CATALOG>>.<<SCHEMA>>.dim_users du ON du.user_email = l.user_email
LEFT JOIN (SELECT DISTINCT workspace_id, workspace_name FROM system.access.workspaces_latest) w
       ON w.workspace_id = l.workspace_id;

-- ── v_genie_user_cost_daily — compute rateado + LLM por usuário/dia ───────────
CREATE OR REPLACE VIEW <<CATALOG>>.<<SCHEMA>>.v_genie_user_cost_daily AS
WITH user_space_q AS (
  SELECT usage_date, workspace_id, space_id, user_email, area, workspace_name,
         SUM(num_questions) AS questions
  FROM <<CATALOG>>.<<SCHEMA>>.v_genie_usage_daily
  WHERE space_id IS NOT NULL
  GROUP BY usage_date, workspace_id, space_id, user_email, area, workspace_name
),
space_total AS (
  SELECT usage_date, space_id, SUM(questions) AS total_questions
  FROM user_space_q GROUP BY usage_date, space_id
),
compute_alloc AS (
  SELECT
    u.usage_date, u.workspace_id, u.workspace_name, u.user_email, u.area,
    SUM(c.cost_usd * TRY_DIVIDE(u.questions, st.total_questions)) AS compute_cost_usd,
    SUM(c.dbus * TRY_DIVIDE(u.questions, st.total_questions))     AS compute_dbus
  FROM user_space_q u
  JOIN space_total st ON st.usage_date = u.usage_date AND st.space_id = u.space_id
  JOIN <<CATALOG>>.<<SCHEMA>>.v_genie_costs_daily c
    ON c.usage_date = u.usage_date AND c.space_id = u.space_id
  GROUP BY u.usage_date, u.workspace_id, u.workspace_name, u.user_email, u.area
),
llm AS (
  SELECT usage_date, workspace_id, workspace_name, user_email, area,
         SUM(llm_dbus) AS llm_dbus, SUM(llm_cost_usd) AS llm_cost_usd
  FROM <<CATALOG>>.<<SCHEMA>>.v_genie_llm_daily
  GROUP BY usage_date, workspace_id, workspace_name, user_email, area
)
SELECT
  COALESCE(c.usage_date, l.usage_date)                    AS usage_date,
  COALESCE(c.workspace_id, l.workspace_id)              AS workspace_id,
  COALESCE(c.workspace_name, l.workspace_name)            AS workspace_name,
  COALESCE(c.user_email, l.user_email)                    AS user_email,
  COALESCE(c.area, l.area, 'Não classificado')            AS area,
  COALESCE(c.compute_cost_usd, 0)                         AS compute_cost_usd,
  COALESCE(c.compute_dbus, 0)                             AS compute_dbus,
  COALESCE(l.llm_dbus, 0)                                 AS llm_dbus,
  COALESCE(l.llm_cost_usd, 0)                             AS llm_cost_usd,
  COALESCE(c.compute_cost_usd, 0) + COALESCE(l.llm_cost_usd, 0) AS total_cost_usd
FROM compute_alloc c
FULL OUTER JOIN llm l
  ON c.usage_date = l.usage_date AND c.user_email = l.user_email AND c.workspace_id = l.workspace_id;

-- ── v_genie_product_usage_daily — uso por superfície (Spaces / Code) ──────────
CREATE OR REPLACE VIEW <<CATALOG>>.<<SCHEMA>>.v_genie_product_usage_daily AS
SELECT
  usage_date,
  workspace_id,
  workspace_name,
  product_surface,
  area,
  COUNT(DISTINCT user_email)                              AS active_users,
  COUNT(DISTINCT space_id)                                AS active_spaces,
  SUM(num_questions)                                      AS num_questions,
  SUM(num_errors)                                         AS num_errors
FROM <<CATALOG>>.<<SCHEMA>>.v_genie_usage_daily
GROUP BY usage_date, workspace_id, workspace_name, product_surface, area;

-- ── v_genie_users ───────────────────────────────────────────────────────────
CREATE OR REPLACE VIEW <<CATALOG>>.<<SCHEMA>>.v_genie_users AS
WITH act AS (
  SELECT user_email, MIN(usage_date) AS first_seen, MAX(usage_date) AS last_seen,
         SUM(num_questions) AS total_questions
  FROM <<CATALOG>>.<<SCHEMA>>.v_genie_usage_daily
  GROUP BY user_email
)
SELECT
  COALESCE(u.user_email, act.user_email)   AS user_email,
  u.display_name,
  COALESCE(u.area, 'Não classificado')     AS area,
  u.home_workspace_id,
  u.joined_date,
  act.first_seen,
  act.last_seen,
  COALESCE(act.total_questions, 0)         AS total_questions
FROM act
LEFT JOIN <<CATALOG>>.<<SCHEMA>>.dim_users u ON u.user_email = act.user_email;

-- ── v_genie_spaces ──────────────────────────────────────────────────────────
CREATE OR REPLACE VIEW <<CATALOG>>.<<SCHEMA>>.v_genie_spaces AS
WITH act AS (
  SELECT space_id,
         MAX(usage_date) AS last_activity,
         COUNT(DISTINCT CASE WHEN usage_date >= current_date() - INTERVAL 30 DAYS THEN user_email END) AS users_30d,
         SUM(CASE WHEN usage_date >= current_date() - INTERVAL 30 DAYS THEN num_questions ELSE 0 END) AS questions_30d,
         SUM(CASE WHEN usage_date >= current_date() - INTERVAL 30 DAYS THEN feedback_positive ELSE 0 END) AS pos_30d,
         SUM(CASE WHEN usage_date >= current_date() - INTERVAL 30 DAYS THEN feedback_negative ELSE 0 END) AS neg_30d
  FROM <<CATALOG>>.<<SCHEMA>>.v_genie_usage_daily
  GROUP BY space_id
),
cost AS (
  SELECT space_id, SUM(CASE WHEN usage_date >= current_date() - INTERVAL 30 DAYS THEN cost_usd ELSE 0 END) AS cost_30d
  FROM <<CATALOG>>.<<SCHEMA>>.v_genie_costs_daily
  GROUP BY space_id
)
SELECT
  s.space_id, s.space_name, s.owner_email, s.area, s.workspace_id,
  w.workspace_name, s.warehouse_id, s.num_tables, s.created_at,
  a.last_activity,
  COALESCE(a.users_30d, 0)          AS users_30d,
  COALESCE(a.questions_30d, 0)      AS questions_30d,
  ROUND(COALESCE(c.cost_30d, 0), 2) AS cost_30d,
  COALESCE(a.pos_30d, 0)            AS pos_30d,
  COALESCE(a.neg_30d, 0)            AS neg_30d,
  CASE
    WHEN s.owner_email IS NULL OR a.last_activity IS NULL
         OR a.last_activity < current_date() - INTERVAL 45 DAYS THEN 'Órfão'
    WHEN a.last_activity < current_date() - INTERVAL 14 DAYS THEN 'Dormente'
    ELSE 'Ativo'
  END AS status
FROM <<CATALOG>>.<<SCHEMA>>.dim_spaces s
LEFT JOIN act a ON a.space_id = s.space_id
LEFT JOIN cost c ON c.space_id = s.space_id
LEFT JOIN (SELECT DISTINCT workspace_id, workspace_name FROM system.access.workspaces_latest) w
       ON w.workspace_id = s.workspace_id;
