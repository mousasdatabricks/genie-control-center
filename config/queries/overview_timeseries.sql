SELECT
  usage_date,
  SUM(num_questions)          AS questions,
  COUNT(DISTINCT user_email)  AS active_users,
  SUM(num_errors)             AS errors
FROM main.genie_cc.v_genie_usage_daily
WHERE usage_date BETWEEN CAST(:p_start AS DATE) AND CAST(:p_end AS DATE)
  AND (:p_ws = '' OR workspace_name = :p_ws)
  AND (:p_area = '' OR area = :p_area)
GROUP BY usage_date
ORDER BY usage_date
