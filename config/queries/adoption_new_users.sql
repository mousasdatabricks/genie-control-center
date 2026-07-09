SELECT
  DATE_TRUNC('WEEK', first_seen) AS semana,
  COUNT(*)                       AS novos_usuarios
FROM main.genie_cc.v_genie_users
WHERE first_seen IS NOT NULL
  AND first_seen BETWEEN CAST(:p_start AS DATE) AND CAST(:p_end AS DATE)
  AND (:p_area = '' OR area = :p_area)
GROUP BY DATE_TRUNC('WEEK', first_seen)
ORDER BY semana
