WITH u AS (
  SELECT *
  FROM main.genie_cc.v_genie_usage_daily
  WHERE usage_date BETWEEN CAST(:p_start AS DATE) AND CAST(:p_end AS DATE)
    AND (:p_ws = '' OR workspace_name = :p_ws)
    AND (:p_area = '' OR area = :p_area)
),
c AS (
  SELECT COALESCE(SUM(cost_usd), 0) AS total_cost
  FROM main.genie_cc.v_genie_costs_daily
  WHERE usage_date BETWEEN CAST(:p_start AS DATE) AND CAST(:p_end AS DATE)
    AND (:p_ws = '' OR workspace_name = :p_ws)
    AND (:p_area = '' OR area = :p_area)
)
SELECT
  COALESCE(SUM(u.num_questions), 0)                                   AS questions,
  COUNT(DISTINCT u.user_email)                                       AS active_users,
  COUNT(DISTINCT u.space_id)                                         AS active_spaces,
  COALESCE(SUM(u.num_errors), 0)                                     AS errors,
  COALESCE(SUM(u.feedback_positive), 0)                              AS pos,
  COALESCE(SUM(u.feedback_negative), 0)                              AS neg,
  ROUND(COALESCE(AVG(u.avg_latency_ms), 0))                          AS avg_latency,
  ROUND((SELECT total_cost FROM c), 2)                               AS total_cost
FROM u
