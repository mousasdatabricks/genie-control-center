SELECT
  space_name,
  area,
  workspace_name,
  SUM(num_questions)          AS perguntas,
  COUNT(DISTINCT user_email)  AS usuarios,
  SUM(num_errors)             AS erros,
  ROUND(AVG(avg_latency_ms))  AS latencia_ms
FROM serverless_stable_cvpomp_catalog.heineken_genie.v_genie_usage_daily
WHERE usage_date BETWEEN CAST(:p_start AS DATE) AND CAST(:p_end AS DATE)
  AND (:p_ws = '' OR workspace_name = :p_ws)
  AND (:p_area = '' OR area = :p_area)
GROUP BY space_name, area, workspace_name
ORDER BY perguntas DESC
