SELECT
  usage_date,
  product_surface,
  SUM(num_questions) AS perguntas,
  COUNT(DISTINCT user_email) AS usuarios
FROM main.genie_cc.v_genie_usage_daily
WHERE usage_date BETWEEN CAST(:p_start AS DATE) AND CAST(:p_end AS DATE)
  AND (:p_ws = '' OR workspace_name = :p_ws)
  AND (:p_area = '' OR area = :p_area)
GROUP BY usage_date, product_surface
ORDER BY usage_date, product_surface
