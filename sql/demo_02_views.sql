-- Genie Code demo events (sem space_id)
CREATE OR REPLACE TABLE serverless_stable_cvpomp_catalog.heineken_genie.code_events_daily AS
SELECT
  usage_date,
  workspace_id,
  user_email,
  CAST(NULL AS STRING) AS space_id,
  'GENIE_CODE' AS product_surface,
  CAST(1 + (hash(user_email, usage_date) % 4) AS INT) AS num_questions,
  CAST(hash(user_email, usage_date) % 2 AS INT) AS num_errors,
  CAST(1200 + (hash(user_email) % 800) AS INT) AS avg_latency_ms,
  0 AS feedback_given,
  0 AS feedback_positive,
  0 AS feedback_negative
FROM (
  SELECT DISTINCT usage_date, workspace_id, user_email
  FROM serverless_stable_cvpomp_catalog.heineken_genie.events_daily
  WHERE hash(user_email) % 7 = 0
);

CREATE OR REPLACE VIEW serverless_stable_cvpomp_catalog.heineken_genie.v_genie_usage_daily AS
SELECT
  e.usage_date, e.workspace_id, s.workspace_name, e.space_id, s.space_name, s.area, e.user_email,
  'GENIE_SPACES' AS product_surface,
  e.num_questions, e.num_errors, e.avg_latency_ms,
  e.feedback_given, e.feedback_positive, e.feedback_negative
FROM serverless_stable_cvpomp_catalog.heineken_genie.events_daily e
JOIN serverless_stable_cvpomp_catalog.heineken_genie.spaces s ON s.space_id = e.space_id
UNION ALL
SELECT
  c.usage_date, c.workspace_id,
  (SELECT max(workspace_name) FROM serverless_stable_cvpomp_catalog.heineken_genie.spaces WHERE workspace_id = c.workspace_id),
  c.space_id, CAST(NULL AS STRING), 'Dados & Analytics', c.user_email, c.product_surface,
  c.num_questions, c.num_errors, c.avg_latency_ms,
  c.feedback_given, c.feedback_positive, c.feedback_negative
FROM serverless_stable_cvpomp_catalog.heineken_genie.code_events_daily c;

CREATE OR REPLACE VIEW serverless_stable_cvpomp_catalog.heineken_genie.v_genie_costs_daily AS
SELECT
  c.usage_date,
  c.workspace_id,
  s.workspace_name,
  c.space_id,
  s.space_name,
  s.area,
  c.sku AS sku_name,
  CASE
    WHEN c.sku = 'SQL_SERVERLESS' THEN 'COMPUTE_SQL'
    WHEN c.sku = 'MODEL_SERVING' THEN 'COMPUTE_LLM_INFRA'
    ELSE 'COMPUTE_OTHER'
  END AS sku,
  c.dbus,
  c.cost_usd
FROM serverless_stable_cvpomp_catalog.heineken_genie.costs_daily c
JOIN serverless_stable_cvpomp_catalog.heineken_genie.spaces s ON s.space_id = c.space_id;

CREATE OR REPLACE VIEW serverless_stable_cvpomp_catalog.heineken_genie.v_genie_billing_sku_daily AS
SELECT
  c.usage_date,
  c.workspace_id,
  s.workspace_name,
  e.user_email,
  s.area,
  c.sku AS sku_name,
  CASE WHEN c.sku = 'MODEL_SERVING' THEN 'GENIE' ELSE CAST(NULL AS STRING) END AS billing_origin_product,
  CASE
    WHEN c.sku = 'SQL_SERVERLESS' THEN 'COMPUTE_SQL'
    WHEN c.sku = 'MODEL_SERVING' THEN 'LLM_PAYGO'
    ELSE 'COMPUTE_OTHER'
  END AS cost_category,
  c.dbus,
  c.cost_usd
FROM serverless_stable_cvpomp_catalog.heineken_genie.costs_daily c
JOIN serverless_stable_cvpomp_catalog.heineken_genie.spaces s ON s.space_id = c.space_id
JOIN (
  SELECT usage_date, space_id, user_email
  FROM serverless_stable_cvpomp_catalog.heineken_genie.events_daily
  QUALIFY row_number() OVER (PARTITION BY usage_date, space_id ORDER BY num_questions DESC) = 1
) e ON e.usage_date = c.usage_date AND e.space_id = c.space_id;

CREATE OR REPLACE VIEW serverless_stable_cvpomp_catalog.heineken_genie.v_genie_users AS
SELECT
  u.user_email,
  u.display_name,
  u.area,
  u.home_workspace_id,
  u.joined_date,
  a.first_seen,
  a.last_seen,
  coalesce(a.total_questions, 0) AS total_questions
FROM serverless_stable_cvpomp_catalog.heineken_genie.users u
LEFT JOIN (
  SELECT user_email, min(usage_date) AS first_seen, max(usage_date) AS last_seen, sum(num_questions) AS total_questions
  FROM serverless_stable_cvpomp_catalog.heineken_genie.v_genie_usage_daily
  GROUP BY user_email
) a ON a.user_email = u.user_email;

CREATE OR REPLACE VIEW serverless_stable_cvpomp_catalog.heineken_genie.v_genie_spaces AS
WITH act AS (
  SELECT space_id,
         max(usage_date) AS last_activity,
         count(DISTINCT CASE WHEN usage_date >= current_date() - INTERVAL 30 DAYS THEN user_email END) AS users_30d,
         sum(CASE WHEN usage_date >= current_date() - INTERVAL 30 DAYS THEN num_questions ELSE 0 END) AS questions_30d,
         sum(CASE WHEN usage_date >= current_date() - INTERVAL 30 DAYS THEN feedback_positive ELSE 0 END) AS pos_30d,
         sum(CASE WHEN usage_date >= current_date() - INTERVAL 30 DAYS THEN feedback_negative ELSE 0 END) AS neg_30d
  FROM serverless_stable_cvpomp_catalog.heineken_genie.v_genie_usage_daily
  WHERE space_id IS NOT NULL
  GROUP BY space_id
),
cost AS (
  SELECT space_id, sum(CASE WHEN usage_date >= current_date() - INTERVAL 30 DAYS THEN cost_usd ELSE 0 END) AS cost_30d
  FROM serverless_stable_cvpomp_catalog.heineken_genie.costs_daily
  GROUP BY space_id
)
SELECT
  s.space_id,
  s.space_name,
  s.owner_email,
  s.area,
  s.workspace_id,
  s.workspace_name,
  s.warehouse_id,
  s.num_tables,
  date_sub(current_date(), s.created_days_ago) AS created_at,
  a.last_activity,
  coalesce(a.users_30d, 0) AS users_30d,
  coalesce(a.questions_30d, 0) AS questions_30d,
  round(coalesce(c.cost_30d, 0), 2) AS cost_30d,
  coalesce(a.pos_30d, 0) AS pos_30d,
  coalesce(a.neg_30d, 0) AS neg_30d,
  CASE
    WHEN s.owner_email = '(ex-colaborador)' OR a.last_activity IS NULL OR a.last_activity < current_date() - INTERVAL 45 DAYS THEN 'Órfão'
    WHEN a.last_activity < current_date() - INTERVAL 14 DAYS THEN 'Dormente'
    ELSE 'Ativo'
  END AS status
FROM serverless_stable_cvpomp_catalog.heineken_genie.spaces s
LEFT JOIN act a ON a.space_id = s.space_id
LEFT JOIN cost c ON c.space_id = s.space_id;

CREATE OR REPLACE VIEW serverless_stable_cvpomp_catalog.heineken_genie.v_genie_llm_daily AS
SELECT
  b.usage_date,
  b.user_email,
  b.workspace_id,
  s.workspace_name,
  s.area,
  b.space_id,
  b.num_questions,
  b.llm_dbus,
  round(greatest(b.llm_dbus - 150, 0) * 0.07 * 0.75, 4) AS llm_cost_usd
FROM serverless_stable_cvpomp_catalog.heineken_genie.genie_billing_daily b
JOIN serverless_stable_cvpomp_catalog.heineken_genie.spaces s ON s.space_id = b.space_id;

CREATE OR REPLACE VIEW serverless_stable_cvpomp_catalog.heineken_genie.v_genie_user_cost_daily AS
WITH compute AS (
  SELECT
    e.usage_date, e.workspace_id, w.workspace_name, e.user_email, u.area,
    sum(c.cost_usd * try_divide(e.num_questions, st.q)) AS compute_cost_usd,
    sum(c.dbus * try_divide(e.num_questions, st.q)) AS compute_dbus
  FROM serverless_stable_cvpomp_catalog.heineken_genie.events_daily e
  JOIN serverless_stable_cvpomp_catalog.heineken_genie.users u ON u.user_email = e.user_email
  JOIN (
    SELECT usage_date, space_id, sum(num_questions) AS q
    FROM serverless_stable_cvpomp_catalog.heineken_genie.events_daily
    GROUP BY usage_date, space_id
  ) st ON st.usage_date = e.usage_date AND st.space_id = e.space_id
  JOIN serverless_stable_cvpomp_catalog.heineken_genie.costs_daily c
    ON c.usage_date = e.usage_date AND c.space_id = e.space_id
  LEFT JOIN (SELECT DISTINCT workspace_id, workspace_name FROM serverless_stable_cvpomp_catalog.heineken_genie.spaces) w
    ON w.workspace_id = e.workspace_id
  GROUP BY e.usage_date, e.workspace_id, w.workspace_name, e.user_email, u.area
),
llm AS (
  SELECT usage_date, workspace_id, workspace_name, user_email, area,
         sum(llm_dbus) AS llm_dbus, sum(llm_cost_usd) AS llm_cost_usd
  FROM serverless_stable_cvpomp_catalog.heineken_genie.v_genie_llm_daily
  GROUP BY usage_date, workspace_id, workspace_name, user_email, area
)
SELECT
  coalesce(c.usage_date, l.usage_date) AS usage_date,
  coalesce(c.workspace_id, l.workspace_id) AS workspace_id,
  coalesce(c.workspace_name, l.workspace_name) AS workspace_name,
  coalesce(c.user_email, l.user_email) AS user_email,
  coalesce(c.area, l.area) AS area,
  coalesce(c.compute_cost_usd, 0) AS compute_cost_usd,
  coalesce(c.compute_dbus, 0) AS compute_dbus,
  coalesce(l.llm_dbus, 0) AS llm_dbus,
  coalesce(l.llm_cost_usd, 0) AS llm_cost_usd,
  coalesce(c.compute_cost_usd, 0) + coalesce(l.llm_cost_usd, 0) AS total_cost_usd
FROM compute c
FULL OUTER JOIN llm l ON c.usage_date = l.usage_date AND c.user_email = l.user_email AND c.workspace_id = l.workspace_id;

CREATE OR REPLACE VIEW serverless_stable_cvpomp_catalog.heineken_genie.v_genie_product_usage_daily AS
SELECT
  usage_date, workspace_id, workspace_name, product_surface, area,
  count(DISTINCT user_email) AS active_users,
  count(DISTINCT space_id) AS active_spaces,
  sum(num_questions) AS num_questions,
  sum(num_errors) AS num_errors
FROM serverless_stable_cvpomp_catalog.heineken_genie.v_genie_usage_daily
GROUP BY usage_date, workspace_id, workspace_name, product_surface, area;
