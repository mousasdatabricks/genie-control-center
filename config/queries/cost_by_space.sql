WITH u AS (
  SELECT space_name, SUM(num_questions) AS perguntas, COUNT(DISTINCT user_email) AS usuarios
  FROM main.genie_cc.v_genie_usage_daily
  WHERE usage_date BETWEEN CAST(:p_start AS DATE) AND CAST(:p_end AS DATE)
    AND (:p_ws = '' OR workspace_name = :p_ws)
    AND (:p_area = '' OR area = :p_area)
  GROUP BY space_name
),
c AS (
  SELECT space_name, area, workspace_name, SUM(cost_usd) AS custo
  FROM main.genie_cc.v_genie_costs_daily
  WHERE usage_date BETWEEN CAST(:p_start AS DATE) AND CAST(:p_end AS DATE)
    AND (:p_ws = '' OR workspace_name = :p_ws)
    AND (:p_area = '' OR area = :p_area)
  GROUP BY space_name, area, workspace_name
)
SELECT
  c.space_name,
  c.area,
  c.workspace_name,
  ROUND(c.custo, 2)                              AS custo,
  COALESCE(u.perguntas, 0)                       AS perguntas,
  COALESCE(u.usuarios, 0)                        AS usuarios,
  ROUND(TRY_DIVIDE(c.custo, u.perguntas), 3)     AS custo_por_pergunta
FROM c LEFT JOIN u ON u.space_name = c.space_name
ORDER BY custo DESC
