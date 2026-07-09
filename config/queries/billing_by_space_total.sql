WITH usage AS (
  SELECT space_id, space_name, area, workspace_name,
         SUM(num_questions) AS perguntas,
         COUNT(DISTINCT user_email) AS usuarios
  FROM main.genie_cc.v_genie_usage_daily
  WHERE usage_date BETWEEN CAST(:p_start AS DATE) AND CAST(:p_end AS DATE)
    AND (:p_ws = '' OR workspace_name = :p_ws)
    AND (:p_area = '' OR area = :p_area)
    AND space_id IS NOT NULL
  GROUP BY space_id, space_name, area, workspace_name
),
cost AS (
  SELECT space_id, ROUND(SUM(cost_usd), 2) AS custo_compute
  FROM main.genie_cc.v_genie_costs_daily
  WHERE usage_date BETWEEN CAST(:p_start AS DATE) AND CAST(:p_end AS DATE)
    AND (:p_ws = '' OR workspace_name = :p_ws)
    AND (:p_area = '' OR area = :p_area)
  GROUP BY space_id
),
llm AS (
  SELECT space_id, ROUND(SUM(llm_cost_usd), 2) AS custo_llm, ROUND(SUM(llm_dbus), 1) AS llm_dbus
  FROM main.genie_cc.v_genie_llm_daily
  WHERE usage_date BETWEEN CAST(:p_start AS DATE) AND CAST(:p_end AS DATE)
    AND space_id IS NOT NULL
    AND (:p_ws = '' OR workspace_name = :p_ws)
    AND (:p_area = '' OR area = :p_area)
  GROUP BY space_id
)
SELECT
  u.space_name,
  u.area,
  u.workspace_name,
  u.perguntas,
  u.usuarios,
  COALESCE(c.custo_compute, 0) AS custo_compute,
  COALESCE(l.custo_llm, 0) AS custo_llm,
  COALESCE(c.custo_compute, 0) + COALESCE(l.custo_llm, 0) AS custo_total,
  COALESCE(l.llm_dbus, 0) AS llm_dbus
FROM usage u
LEFT JOIN cost c ON c.space_id = u.space_id
LEFT JOIN llm l ON l.space_id = u.space_id
ORDER BY custo_total DESC
