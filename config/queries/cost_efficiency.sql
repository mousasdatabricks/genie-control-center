WITH c AS (
  SELECT space_name, SUM(cost_usd) AS custo
  FROM main.genie_cc.v_genie_costs_daily
  WHERE usage_date BETWEEN CAST(:p_start AS DATE) AND CAST(:p_end AS DATE)
    AND (:p_ws = '' OR workspace_name = :p_ws)
    AND (:p_area = '' OR area = :p_area)
  GROUP BY space_name
)
SELECT
  s.space_name,
  s.area,
  s.status,
  s.users_30d                              AS usuarios,
  s.questions_30d                          AS perguntas,
  ROUND(c.custo, 2)                        AS custo,
  ROUND(TRY_DIVIDE(c.custo, NULLIF(s.users_30d, 0)), 2) AS custo_por_usuario
FROM main.genie_cc.v_genie_spaces s
JOIN c ON c.space_name = s.space_name
WHERE (:p_ws = '' OR s.workspace_name = :p_ws)
  AND (:p_area = '' OR s.area = :p_area)
ORDER BY custo_por_usuario DESC NULLS LAST
