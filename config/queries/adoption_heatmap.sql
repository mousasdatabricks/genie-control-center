SELECT
  area,
  DAYOFWEEK(usage_date) AS dow,
  SUM(num_questions)    AS perguntas
FROM serverless_stable_cvpomp_catalog.heineken_genie.v_genie_usage_daily
WHERE usage_date BETWEEN CAST(:p_start AS DATE) AND CAST(:p_end AS DATE)
  AND (:p_ws = '' OR workspace_name = :p_ws)
  AND (:p_area = '' OR area = :p_area)
GROUP BY area, DAYOFWEEK(usage_date)
