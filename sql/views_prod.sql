-- =============================================================================
-- Genie Control Center — PROD abstraction views (template)
-- =============================================================================
-- O app lê SEMPRE as mesmas 4 views. Na demo elas apontam para tabelas
-- sintéticas; aqui elas apontam para as SYSTEM TABLES do seu ambiente + duas
-- pequenas tabelas de referência que VOCÊ mantém.
--
-- COMO USAR:
--   1. Troque o prefixo <<CATALOG>>.<<SCHEMA>> pelo catálogo/esquema onde as
--      views viverão (ex.: main.genie_cc). Faça o mesmo prefixo em
--      config/queries/*.sql do app (ou aponte o default do warehouse).
--   2. Popule as tabelas de referência dim_spaces e dim_users (abaixo).
--   3. AJUSTE os action_name do Genie no seu audit — variam por release.
--      Rode primeiro:  SELECT DISTINCT action_name FROM system.access.audit
--                      WHERE service_name='databricksGenie';
--   4. Rode este script. O app passa a operar sobre dados reais, sem mudança
--      de código.
--
-- Requisitos de acesso: o Service Principal do app precisa de SELECT em
-- system.access.audit, system.billing.usage, system.billing.list_prices,
-- system.access.workspaces_latest e nas tabelas de referência.
-- =============================================================================

CREATE SCHEMA IF NOT EXISTS <<CATALOG>>.<<SCHEMA>>;

-- ── Tabelas de referência (você popula) ─────────────────────────────────────
-- dim_spaces: 1 linha por Genie Space. Fonte: Genie REST API
--   (GET /api/2.0/genie/spaces) + metadados do workspace.
CREATE TABLE IF NOT EXISTS <<CATALOG>>.<<SCHEMA>>.dim_spaces (
  space_id       STRING,
  space_name     STRING,
  owner_email    STRING,
  area           STRING,   -- área de negócio dona do espaço
  workspace_id   BIGINT,
  warehouse_id   STRING,   -- warehouse que serve o espaço (para atribuir custo)
  num_tables     INT,
  created_at     DATE
);

-- dim_users: e-mail → área. Fonte: seu diretório / SCIM / RH.
CREATE TABLE IF NOT EXISTS <<CATALOG>>.<<SCHEMA>>.dim_users (
  user_email   STRING,
  display_name STRING,
  area         STRING,
  home_workspace_id BIGINT,
  joined_date  DATE
);

-- ── Eventos de uso do Genie (base para 3 das 4 views) ───────────────────────
CREATE OR REPLACE VIEW <<CATALOG>>.<<SCHEMA>>._genie_events AS
SELECT
  a.event_date                                            AS usage_date,
  a.workspace_id,
  a.user_identity.email                                   AS user_email,
  -- ⚠️ ajuste conforme o schema do seu audit (pode ser conversation_id, etc.)
  COALESCE(a.request_params.space_id, a.request_params.genie_space_id) AS space_id,
  a.action_name,
  a.response.status_code                                  AS status_code
FROM system.access.audit a
WHERE a.service_name = 'databricksGenie'
  AND a.event_date >= current_date() - INTERVAL 120 DAYS;

-- ── v_genie_usage_daily ─────────────────────────────────────────────────────
CREATE OR REPLACE VIEW <<CATALOG>>.<<SCHEMA>>.v_genie_usage_daily AS
SELECT
  e.usage_date,
  e.workspace_id,
  w.workspace_name,
  e.space_id,
  s.space_name,
  COALESCE(u.area, s.area, 'Não classificado')            AS area,
  e.user_email,
  -- ⚠️ AJUSTE os action_name de "pergunta" e "feedback" ao seu ambiente:
  COUNT_IF(e.action_name IN ('sendMessage', 'executeMessageQuery')) AS num_questions,
  COUNT_IF(e.status_code >= 400)                          AS num_errors,
  CAST(NULL AS DOUBLE)                                    AS avg_latency_ms,
  COUNT_IF(e.action_name IN ('submitFeedback'))           AS feedback_given,
  COUNT_IF(e.action_name = 'submitFeedback' AND e.status_code < 400) AS feedback_positive,
  COUNT_IF(e.action_name = 'submitFeedback' AND e.status_code >= 400) AS feedback_negative
FROM <<CATALOG>>.<<SCHEMA>>._genie_events e
LEFT JOIN <<CATALOG>>.<<SCHEMA>>.dim_spaces s ON s.space_id = e.space_id
LEFT JOIN <<CATALOG>>.<<SCHEMA>>.dim_users  u ON u.user_email = e.user_email
LEFT JOIN (SELECT DISTINCT workspace_id, workspace_name FROM system.access.workspaces_latest) w
       ON w.workspace_id = e.workspace_id
GROUP BY e.usage_date, e.workspace_id, w.workspace_name, e.space_id, s.space_name,
         COALESCE(u.area, s.area, 'Não classificado'), e.user_email;

-- ── v_genie_costs_daily ─────────────────────────────────────────────────────
-- Atribui o custo do warehouse (serverless SQL) ao espaço via dim_spaces.warehouse_id.
-- OBS: se vários espaços compartilham um warehouse, refine o rateio (ex.: por
-- fração de perguntas do espaço no dia). Model Serving pode ser somado se você
-- identificar o endpoint usado pelo Genie.
CREATE OR REPLACE VIEW <<CATALOG>>.<<SCHEMA>>.v_genie_costs_daily AS
WITH wh AS (
  SELECT
    u.usage_date,
    u.usage_metadata.warehouse_id AS warehouse_id,
    CASE WHEN u.sku_name LIKE '%SERVERLESS_SQL%' THEN 'SQL_SERVERLESS' ELSE 'MODEL_SERVING' END AS sku,
    SUM(u.usage_quantity)                                            AS dbus,
    SUM(u.usage_quantity * COALESCE(lp.pricing.effective_list.default, 0)) AS cost_usd
  FROM system.billing.usage u
  LEFT JOIN system.billing.list_prices lp
    ON u.cloud = lp.cloud AND u.sku_name = lp.sku_name
   AND u.usage_start_time >= lp.price_start_time
   AND (lp.price_end_time IS NULL OR u.usage_start_time < lp.price_end_time)
  WHERE u.usage_metadata.warehouse_id IS NOT NULL
    AND u.usage_date >= current_date() - INTERVAL 120 DAYS
  GROUP BY u.usage_date, u.usage_metadata.warehouse_id,
           CASE WHEN u.sku_name LIKE '%SERVERLESS_SQL%' THEN 'SQL_SERVERLESS' ELSE 'MODEL_SERVING' END
)
SELECT
  wh.usage_date,
  s.workspace_id,
  w.workspace_name,
  s.space_id,
  s.space_name,
  s.area,
  wh.sku,
  wh.dbus,
  wh.cost_usd
FROM wh
JOIN <<CATALOG>>.<<SCHEMA>>.dim_spaces s ON s.warehouse_id = wh.warehouse_id
LEFT JOIN (SELECT DISTINCT workspace_id, workspace_name FROM system.access.workspaces_latest) w
       ON w.workspace_id = s.workspace_id;

-- ── v_genie_users ───────────────────────────────────────────────────────────
CREATE OR REPLACE VIEW <<CATALOG>>.<<SCHEMA>>.v_genie_users AS
WITH act AS (
  SELECT user_email, MIN(usage_date) AS first_seen, MAX(usage_date) AS last_seen,
         SUM(num_questions) AS total_questions
  FROM <<CATALOG>>.<<SCHEMA>>.v_genie_usage_daily
  GROUP BY user_email
)
SELECT
  COALESCE(u.user_email, act.user_email)   AS user_email,
  u.display_name,
  COALESCE(u.area, 'Não classificado')     AS area,
  u.home_workspace_id,
  u.joined_date,
  act.first_seen,
  act.last_seen,
  COALESCE(act.total_questions, 0)         AS total_questions
FROM act
LEFT JOIN <<CATALOG>>.<<SCHEMA>>.dim_users u ON u.user_email = act.user_email;

-- ── v_genie_spaces ──────────────────────────────────────────────────────────
CREATE OR REPLACE VIEW <<CATALOG>>.<<SCHEMA>>.v_genie_spaces AS
WITH act AS (
  SELECT space_id,
         MAX(usage_date) AS last_activity,
         COUNT(DISTINCT CASE WHEN usage_date >= current_date() - INTERVAL 30 DAYS THEN user_email END) AS users_30d,
         SUM(CASE WHEN usage_date >= current_date() - INTERVAL 30 DAYS THEN num_questions ELSE 0 END) AS questions_30d,
         SUM(CASE WHEN usage_date >= current_date() - INTERVAL 30 DAYS THEN feedback_positive ELSE 0 END) AS pos_30d,
         SUM(CASE WHEN usage_date >= current_date() - INTERVAL 30 DAYS THEN feedback_negative ELSE 0 END) AS neg_30d
  FROM <<CATALOG>>.<<SCHEMA>>.v_genie_usage_daily
  GROUP BY space_id
),
cost AS (
  SELECT space_id, SUM(CASE WHEN usage_date >= current_date() - INTERVAL 30 DAYS THEN cost_usd ELSE 0 END) AS cost_30d
  FROM <<CATALOG>>.<<SCHEMA>>.v_genie_costs_daily
  GROUP BY space_id
)
SELECT
  s.space_id, s.space_name, s.owner_email, s.area, s.workspace_id,
  w.workspace_name, s.warehouse_id, s.num_tables, s.created_at,
  a.last_activity,
  COALESCE(a.users_30d, 0)          AS users_30d,
  COALESCE(a.questions_30d, 0)      AS questions_30d,
  ROUND(COALESCE(c.cost_30d, 0), 2) AS cost_30d,
  COALESCE(a.pos_30d, 0)            AS pos_30d,
  COALESCE(a.neg_30d, 0)            AS neg_30d,
  CASE
    WHEN s.owner_email IS NULL OR a.last_activity IS NULL
         OR a.last_activity < current_date() - INTERVAL 45 DAYS THEN 'Órfão'
    WHEN a.last_activity < current_date() - INTERVAL 14 DAYS THEN 'Dormente'
    ELSE 'Ativo'
  END AS status
FROM <<CATALOG>>.<<SCHEMA>>.dim_spaces s
LEFT JOIN act a ON a.space_id = s.space_id
LEFT JOIN cost c ON c.space_id = s.space_id
LEFT JOIN (SELECT DISTINCT workspace_id, workspace_name FROM system.access.workspaces_latest) w
       ON w.workspace_id = s.workspace_id;

-- ── v_genie_llm_daily (Paygo LLM billing) ───────────────────────────────────
-- Fonte real: system.billing.usage filtrado por billing_origin_product='GENIE'
-- (SKU Serverless Realtime Inference). ATENÇÃO: só o uso PAGO (acima dos 150 DBU
-- grátis/usuário/mês) aparece em system tables — o tier grátis não é faturado e
-- não aparece. Portanto, em produção esta view traz DBUs PAGOS por usuário/dia;
-- o abatimento dos 150 DBU grátis já ocorre no billing. A visão de "% do grátis"
-- só é possível com dados de token (estimador), não com system tables.
CREATE OR REPLACE VIEW <<CATALOG>>.<<SCHEMA>>.v_genie_llm_daily AS
SELECT
  u.usage_date,
  u.identity_metadata.run_as                              AS user_email,
  u.workspace_id,
  w.workspace_name,
  COALESCE(du.area, 'Não classificado')                   AS area,
  CAST(NULL AS BIGINT)                                    AS num_questions,  -- não disponível em billing
  SUM(u.usage_quantity)                                   AS llm_dbus
FROM system.billing.usage u
LEFT JOIN <<CATALOG>>.<<SCHEMA>>.dim_users du ON du.user_email = u.identity_metadata.run_as
LEFT JOIN (SELECT DISTINCT workspace_id, workspace_name FROM system.access.workspaces_latest) w
       ON w.workspace_id = u.workspace_id
WHERE u.billing_origin_product = 'GENIE'
  AND u.usage_date >= current_date() - INTERVAL 60 DAYS
GROUP BY u.usage_date, u.identity_metadata.run_as, u.workspace_id, w.workspace_name,
         COALESCE(du.area, 'Não classificado');
