WITH m AS (
  SELECT user_email, SUM(llm_dbus) AS dbus
  FROM main.genie_cc.v_genie_llm_daily
  WHERE usage_date >= current_date() - INTERVAL 30 DAYS
    AND (:p_ws = '' OR workspace_name = :p_ws)
    AND (:p_area = '' OR area = :p_area)
  GROUP BY user_email
)
SELECT
  COUNT(*)                                             AS total_users,
  COUNT_IF(dbus > 150)                                 AS paying_users,
  ROUND(SUM(dbus), 0)                                  AS total_dbus,
  ROUND(SUM(LEAST(dbus, 150)), 0)                      AS free_dbus,
  ROUND(SUM(GREATEST(dbus - 150, 0)), 0)               AS paid_dbus,
  ROUND(SUM(GREATEST(dbus - 150, 0)) * 0.07, 2)        AS paid_list,
  ROUND(SUM(GREATEST(dbus - 150, 0)) * 0.07 * 0.75, 2) AS paid_promo
FROM m
