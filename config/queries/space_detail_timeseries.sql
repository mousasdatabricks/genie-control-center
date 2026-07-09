SELECT
  usage_date,
  SUM(num_questions)         AS perguntas,
  COUNT(DISTINCT user_email) AS usuarios
FROM main.genie_cc.v_genie_usage_daily
WHERE space_id = :p_space_id
  AND usage_date BETWEEN CAST(:p_start AS DATE) AND CAST(:p_end AS DATE)
GROUP BY usage_date
ORDER BY usage_date
