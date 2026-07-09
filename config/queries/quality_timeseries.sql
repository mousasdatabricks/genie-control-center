SELECT
  usage_date,
  ROUND(100 * TRY_DIVIDE(SUM(feedback_positive), SUM(feedback_positive) + SUM(feedback_negative)), 1) AS taxa_sucesso,
  SUM(feedback_positive) AS positivos,
  SUM(feedback_negative) AS negativos
FROM main.genie_cc.v_genie_usage_daily
WHERE usage_date BETWEEN CAST(:p_start AS DATE) AND CAST(:p_end AS DATE)
  AND (:p_ws = '' OR workspace_name = :p_ws)
  AND (:p_area = '' OR area = :p_area)
GROUP BY usage_date
ORDER BY usage_date
