SELECT
  s.space_id,
  s.space_name,
  s.owner_email,
  s.area,
  s.workspace_name,
  s.warehouse_id,
  s.num_tables,
  s.created_at,
  s.last_activity,
  s.status,
  s.users_30d,
  s.questions_30d,
  s.cost_30d,
  s.pos_30d,
  s.neg_30d,
  ROUND(100 * TRY_DIVIDE(s.pos_30d, s.pos_30d + s.neg_30d), 1) AS taxa_sucesso
FROM main.genie_cc.v_genie_spaces s
WHERE s.space_id = :p_space_id
