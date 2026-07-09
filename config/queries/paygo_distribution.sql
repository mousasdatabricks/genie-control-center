WITH m AS (
  SELECT user_email, SUM(llm_dbus) AS dbus
  FROM main.genie_cc.v_genie_llm_daily
  WHERE usage_date >= current_date() - INTERVAL 30 DAYS
    AND (:p_ws = '' OR workspace_name = :p_ws)
    AND (:p_area = '' OR area = :p_area)
  GROUP BY user_email
),
b AS (
  SELECT CASE
      WHEN dbus <= 50  THEN '0–50'
      WHEN dbus <= 100 THEN '50–100'
      WHEN dbus <= 150 THEN '100–150'
      WHEN dbus <= 300 THEN '150–300'
      ELSE '300+' END AS faixa,
    CASE
      WHEN dbus <= 50  THEN 1
      WHEN dbus <= 100 THEN 2
      WHEN dbus <= 150 THEN 3
      WHEN dbus <= 300 THEN 4
      ELSE 5 END AS ord
  FROM m
)
SELECT faixa, COUNT(*) AS usuarios, MIN(ord) AS ord
FROM b GROUP BY faixa ORDER BY ord
