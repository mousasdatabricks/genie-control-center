SELECT
  user_email,
  area,
  SUM(num_questions) AS perguntas
FROM main.genie_cc.v_genie_usage_daily
WHERE space_id = :p_space_id
  AND usage_date BETWEEN CAST(:p_start AS DATE) AND CAST(:p_end AS DATE)
GROUP BY user_email, area
ORDER BY perguntas DESC
LIMIT 15
