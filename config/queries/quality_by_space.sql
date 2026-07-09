SELECT
  space_name,
  area,
  SUM(feedback_positive)                                              AS positivos,
  SUM(feedback_negative)                                              AS negativos,
  SUM(feedback_given)                                                 AS feedback_total,
  ROUND(100 * TRY_DIVIDE(SUM(feedback_positive), SUM(feedback_positive) + SUM(feedback_negative)), 1) AS taxa_sucesso
FROM main.genie_cc.v_genie_usage_daily
WHERE usage_date BETWEEN CAST(:p_start AS DATE) AND CAST(:p_end AS DATE)
  AND (:p_ws = '' OR workspace_name = :p_ws)
  AND (:p_area = '' OR area = :p_area)
GROUP BY space_name, area
HAVING SUM(feedback_given) > 0
ORDER BY taxa_sucesso ASC
