WITH cost AS (
  SELECT
    user_email,
    area,
    workspace_name,
    ROUND(SUM(compute_cost_usd), 2) AS custo_compute,
    ROUND(SUM(llm_cost_usd), 2) AS custo_llm,
    ROUND(SUM(total_cost_usd), 2) AS custo_total,
    ROUND(SUM(llm_dbus), 1) AS llm_dbus
  FROM main.genie_cc.v_genie_user_cost_daily
  WHERE usage_date BETWEEN CAST(:p_start AS DATE) AND CAST(:p_end AS DATE)
    AND (:p_ws = '' OR workspace_name = :p_ws)
    AND (:p_area = '' OR area = :p_area)
  GROUP BY user_email, area, workspace_name
),
usage AS (
  SELECT user_email, workspace_name, SUM(num_questions) AS perguntas
  FROM main.genie_cc.v_genie_usage_daily
  WHERE usage_date BETWEEN CAST(:p_start AS DATE) AND CAST(:p_end AS DATE)
    AND (:p_ws = '' OR workspace_name = :p_ws)
    AND (:p_area = '' OR area = :p_area)
  GROUP BY user_email, workspace_name
)
SELECT
  c.user_email,
  c.area,
  c.workspace_name,
  c.custo_compute,
  c.custo_llm,
  c.custo_total,
  c.llm_dbus,
  COALESCE(u.perguntas, 0) AS perguntas
FROM cost c
LEFT JOIN usage u ON u.user_email = c.user_email AND u.workspace_name = c.workspace_name
ORDER BY c.custo_total DESC
LIMIT 100
