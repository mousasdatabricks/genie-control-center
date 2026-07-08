CREATE OR REPLACE VIEW serverless_stable_cvpomp_catalog.heineken_genie.v_genie_usage_daily AS
SELECT
  e.usage_date,
  e.workspace_id,
  s.workspace_name,
  e.space_id,
  s.space_name,
  s.area,
  e.user_email,
  e.num_questions,
  e.num_errors,
  e.avg_latency_ms,
  e.feedback_given,
  e.feedback_positive,
  e.feedback_negative
FROM serverless_stable_cvpomp_catalog.heineken_genie.events_daily e
JOIN serverless_stable_cvpomp_catalog.heineken_genie.spaces s ON s.space_id = e.space_id;

CREATE OR REPLACE VIEW serverless_stable_cvpomp_catalog.heineken_genie.v_genie_costs_daily AS
SELECT
  c.usage_date,
  c.workspace_id,
  s.workspace_name,
  c.space_id,
  s.space_name,
  s.area,
  c.sku,
  c.dbus,
  c.cost_usd
FROM serverless_stable_cvpomp_catalog.heineken_genie.costs_daily c
JOIN serverless_stable_cvpomp_catalog.heineken_genie.spaces s ON s.space_id = c.space_id;

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
  FROM serverless_stable_cvpomp_catalog.heineken_genie.events_daily
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
  FROM serverless_stable_cvpomp_catalog.heineken_genie.events_daily
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

SELECT status, count(*) FROM serverless_stable_cvpomp_catalog.heineken_genie.v_genie_spaces GROUP BY status ORDER BY status;

CREATE OR REPLACE VIEW serverless_stable_cvpomp_catalog.heineken_genie.v_genie_llm_daily AS
SELECT b.usage_date, b.user_email, b.workspace_id, s.workspace_name, s.area, b.num_questions, b.llm_dbus
FROM serverless_stable_cvpomp_catalog.heineken_genie.genie_billing_daily b JOIN serverless_stable_cvpomp_catalog.heineken_genie.spaces s ON s.space_id = b.space_id;
