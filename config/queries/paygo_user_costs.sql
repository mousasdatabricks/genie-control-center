WITH m AS (
  SELECT user_email, MAX(area) AS area, MAX(workspace_name) AS workspace_name,
         SUM(num_questions) AS perguntas, SUM(llm_dbus) AS dbus
  FROM serverless_stable_cvpomp_catalog.heineken_genie.v_genie_llm_daily
  WHERE usage_date >= current_date() - INTERVAL 30 DAYS
    AND (:p_ws = '' OR workspace_name = :p_ws)
    AND (:p_area = '' OR area = :p_area)
  GROUP BY user_email
)
SELECT
  user_email,
  area,
  workspace_name,
  perguntas,
  ROUND(dbus, 1)                                       AS dbus,
  ROUND(LEAST(dbus, 150), 1)                           AS dbus_gratis,
  ROUND(GREATEST(dbus - 150, 0), 1)                    AS dbus_pagos,
  ROUND(GREATEST(dbus - 150, 0) * 0.07, 2)             AS custo_list,
  ROUND(GREATEST(dbus - 150, 0) * 0.07 * 0.75, 2)      AS custo_promo,
  ROUND(LEAST(100, dbus / 150.0 * 100), 0)             AS pct_free
FROM m
ORDER BY custo_promo DESC, dbus DESC
