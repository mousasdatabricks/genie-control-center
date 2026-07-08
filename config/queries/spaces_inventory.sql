SELECT
  space_id,
  space_name,
  owner_email,
  area,
  workspace_name,
  warehouse_id,
  num_tables,
  created_at,
  last_activity,
  users_30d,
  questions_30d,
  cost_30d,
  pos_30d,
  neg_30d,
  status
FROM serverless_stable_cvpomp_catalog.heineken_genie.v_genie_spaces
WHERE (:p_ws = '' OR workspace_name = :p_ws)
  AND (:p_area = '' OR area = :p_area)
ORDER BY questions_30d DESC
