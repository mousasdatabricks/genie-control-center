CREATE SCHEMA IF NOT EXISTS serverless_stable_cvpomp_catalog.heineken_genie
COMMENT 'Dados sintéticos + views de abstração do Genie Control Center (demo Heineken Brasil)';

CREATE OR REPLACE TABLE serverless_stable_cvpomp_catalog.heineken_genie.spaces AS
SELECT space_id, space_name, owner_email, area, cast(workspace_id AS bigint) AS workspace_id,
       workspace_name, warehouse_id, cast(num_tables AS int) AS num_tables,
       cast(created_days_ago AS int) AS created_days_ago, cast(activity_weight AS double) AS activity_weight,
       cast(quality AS double) AS quality, cast(error_rate AS double) AS error_rate,
       cast(latency_base AS int) AS latency_base, is_orphan
FROM VALUES
 ('sp_vendas_regiao','Vendas por Região','carla.ferreira@heineken.com.br','Comercial & Vendas',1111111111,'heineken-brasil-prod','wh_prod_sales',12,210,0.95,0.88,0.03,1800,false),
 ('sp_market_share','Market Share & Sell-out','bruno.almeida@heineken.com.br','Marketing',1111111111,'heineken-brasil-prod','wh_prod_sales',9,180,0.80,0.82,0.04,2100,false),
 ('sp_estoque_insumos','Estoque de Insumos','patricia.gomes@heineken.com.br','Supply Chain',2222222222,'heineken-brasil-analytics','wh_analytics',15,240,0.70,0.90,0.02,1500,false),
 ('sp_oee_cervejarias','OEE das Cervejarias','rafael.souza@heineken.com.br','Produção',1111111111,'heineken-brasil-prod','wh_prod_ops',20,200,0.75,0.86,0.05,2600,false),
 ('sp_custos_producao','Custos de Produção','luiza.martins@heineken.com.br','Finanças',2222222222,'heineken-brasil-analytics','wh_analytics',11,160,0.60,0.84,0.03,1900,false),
 ('sp_fretes_logistica','Fretes & Logística','diego.rocha@heineken.com.br','Logística',1111111111,'heineken-brasil-prod','wh_prod_ops',14,150,0.78,0.80,0.06,2200,false),
 ('sp_ruptura_gondola','Ruptura de Gôndola','carla.ferreira@heineken.com.br','Comercial & Vendas',1111111111,'heineken-brasil-prod','wh_prod_sales',8,90,0.85,0.79,0.05,2000,false),
 ('sp_trade_mkt','Performance de Trade Marketing','bruno.almeida@heineken.com.br','Marketing',1111111111,'heineken-brasil-prod','wh_prod_sales',10,120,0.65,0.83,0.04,2300,false),
 ('sp_esg_agua_energia','Consumo de Água & Energia (ESG)','rafael.souza@heineken.com.br','Produção',3333333333,'heineken-latam-shared','wh_latam',7,70,0.45,0.90,0.02,1700,false),
 ('sp_fluxo_caixa','Fluxo de Caixa','luiza.martins@heineken.com.br','Finanças',2222222222,'heineken-brasil-analytics','wh_analytics',9,300,0.55,0.87,0.02,1600,false),
 ('sp_headcount','Headcount & Turnover','fernanda.dias@heineken.com.br','Recursos Humanos',2222222222,'heineken-brasil-analytics','wh_analytics',6,130,0.40,0.85,0.03,1500,false),
 ('sp_qualidade_cerveja','Qualidade Cerveja (lotes)','rafael.souza@heineken.com.br','Produção',1111111111,'heineken-brasil-prod','wh_prod_ops',13,110,0.50,0.91,0.04,2400,false),
 ('sp_previsao_demanda','Previsão de Demanda','patricia.gomes@heineken.com.br','Supply Chain',2222222222,'heineken-brasil-analytics','wh_analytics',18,60,0.60,0.80,0.07,2800,false),
 ('sp_pricing_promo','Pricing & Promoções','carla.ferreira@heineken.com.br','Comercial & Vendas',1111111111,'heineken-brasil-prod','wh_prod_sales',12,140,0.50,0.78,0.05,2100,false),
 ('sp_sac_consumidor','SAC / Consumidor','(ex-colaborador)','Marketing',3333333333,'heineken-latam-shared','wh_latam',9,220,0.20,0.70,0.06,2500,true),
 ('sp_painel_exec','Painel Executivo','marcos.oliveira@heineken.com.br','Dados & Analytics',3333333333,'heineken-latam-shared','wh_latam',22,260,0.35,0.88,0.03,1400,false),
 ('sp_logistica_legado','Análise Logística (legado)','(ex-colaborador)','Logística',1111111111,'heineken-brasil-prod','wh_prod_ops',5,620,0.00,0.75,0.08,3000,true)
 AS t(space_id,space_name,owner_email,area,workspace_id,workspace_name,warehouse_id,num_tables,created_days_ago,activity_weight,quality,error_rate,latency_base,is_orphan);

CREATE OR REPLACE TABLE serverless_stable_cvpomp_catalog.heineken_genie.users AS
WITH fn AS (SELECT array('Ana','Bruno','Carla','Diego','Fernanda','Gustavo','Helena','Igor','Juliana','Lucas','Mariana','Nicolas','Patricia','Rafael','Sofia','Thiago','Vanessa','William','Beatriz','Eduardo') AS a),
     ln AS (SELECT array('Silva','Souza','Oliveira','Santos','Ferreira','Almeida','Gomes','Martins','Rocha','Dias','Costa','Ribeiro','Carvalho','Araujo','Barbosa','Cardoso','Teixeira','Moraes','Pereira','Nunes') AS b),
     aw AS (SELECT array('Comercial & Vendas','Comercial & Vendas','Comercial & Vendas','Comercial & Vendas','Comercial & Vendas','Marketing','Marketing','Marketing','Supply Chain','Supply Chain','Supply Chain','Produção','Produção','Produção','Produção','Logística','Logística','Logística','Finanças','Finanças','Finanças','Recursos Humanos','Recursos Humanos','Dados & Analytics','Dados & Analytics') AS a)
SELECT
  lower(concat(element_at(fn.a, cast(id div 20 AS int)+1), '.', element_at(ln.b, cast(id % 20 AS int)+1))) || '@heineken.com.br' AS user_email,
  concat(element_at(fn.a, cast(id div 20 AS int)+1), ' ', element_at(ln.b, cast(id % 20 AS int)+1)) AS display_name,
  element_at(aw.a, cast(id % 25 AS int)+1) AS area,
  CASE WHEN element_at(aw.a, cast(id % 25 AS int)+1) IN ('Supply Chain','Finanças','Recursos Humanos','Dados & Analytics') THEN 2222222222
       WHEN id % 11 = 0 THEN 3333333333
       ELSE 1111111111 END AS home_workspace_id,
  date_sub(current_date(), cast(30 + rand()*330 AS int)) AS joined_date
FROM range(180) CROSS JOIN fn CROSS JOIN ln CROSS JOIN aw;

CREATE OR REPLACE TABLE serverless_stable_cvpomp_catalog.heineken_genie.space_users AS
WITH base AS (
  SELECT s.space_id, s.workspace_id, u.user_email, s.activity_weight,
         row_number() OVER (PARTITION BY s.space_id ORDER BY rand()) AS rn
  FROM serverless_stable_cvpomp_catalog.heineken_genie.spaces s
  JOIN serverless_stable_cvpomp_catalog.heineken_genie.users u ON u.area = s.area
),
picked AS (SELECT space_id, workspace_id, user_email, activity_weight FROM base WHERE rn <= cast(6 + activity_weight*18 AS int)),
analysts AS (
  SELECT s.space_id, s.workspace_id, u.user_email, s.activity_weight
  FROM serverless_stable_cvpomp_catalog.heineken_genie.spaces s
  JOIN serverless_stable_cvpomp_catalog.heineken_genie.users u ON u.area = 'Dados & Analytics'
  WHERE rand() < 0.25
)
SELECT DISTINCT space_id, workspace_id, user_email, activity_weight
FROM (SELECT * FROM picked UNION ALL SELECT * FROM analysts);

CREATE OR REPLACE TABLE serverless_stable_cvpomp_catalog.heineken_genie.usage_fact AS
WITH days AS (
  SELECT explode(sequence(0, 89)) AS di
),
grid AS (
  SELECT su.space_id, su.workspace_id, su.user_email, su.activity_weight,
         sp.quality, sp.error_rate, sp.latency_base, sp.is_orphan, sp.created_days_ago,
         d.di,
         date_add(date_sub(current_date(), 89), d.di) AS usage_date,
         (89 - d.di) AS days_ago
  FROM serverless_stable_cvpomp_catalog.heineken_genie.space_users su
  JOIN serverless_stable_cvpomp_catalog.heineken_genie.spaces sp ON sp.space_id = su.space_id
  CROSS JOIN days d
),
scored AS (
  SELECT g.*,
    dayofweek(usage_date) AS dow,
    (0.40 + 0.60 * (di/89.0)) AS ramp,
    CASE WHEN dayofweek(usage_date) IN (1,7) THEN 0.20 ELSE 1.0 END AS wk
  FROM grid g
  WHERE days_ago <= created_days_ago
    AND (NOT is_orphan OR days_ago >= 60)
),
active AS (
  SELECT *, rand() AS r,
    (0.16 * (0.4 + activity_weight) * ramp * wk) AS p_active
  FROM scored
)
SELECT
  usage_date, space_id, workspace_id, user_email,
  (1 + cast(rand() * (2 + activity_weight*7) AS int)) AS num_questions,
  latency_base + cast(rand()*1600 AS int) AS avg_latency_ms,
  quality, error_rate
FROM active
WHERE r < p_active;

CREATE OR REPLACE TABLE serverless_stable_cvpomp_catalog.heineken_genie.events_daily AS
SELECT
  usage_date, space_id, workspace_id, user_email,
  num_questions,
  cast(floor(num_questions * error_rate + rand()*0.6) AS int) AS num_errors,
  avg_latency_ms,
  cast(round(num_questions * 0.35) AS int) AS feedback_given,
  cast(round(round(num_questions * 0.35) * quality) AS int) AS feedback_positive,
  cast(round(num_questions * 0.35) - round(round(num_questions * 0.35) * quality) AS int) AS feedback_negative
FROM serverless_stable_cvpomp_catalog.heineken_genie.usage_fact;

CREATE OR REPLACE TABLE serverless_stable_cvpomp_catalog.heineken_genie.costs_daily AS
WITH agg AS (
  SELECT usage_date, space_id, workspace_id, sum(num_questions) AS q
  FROM serverless_stable_cvpomp_catalog.heineken_genie.events_daily
  GROUP BY usage_date, space_id, workspace_id
)
SELECT usage_date, space_id, workspace_id, 'SQL_SERVERLESS' AS sku,
       round(0.5 + q*0.02, 3) AS dbus,
       round((0.5 + q*0.02) * 0.70, 2) AS cost_usd
FROM agg
UNION ALL
SELECT usage_date, space_id, workspace_id, 'MODEL_SERVING' AS sku,
       round(q*0.05, 3) AS dbus,
       round(q*0.05 * 0.60, 2) AS cost_usd
FROM agg;

SELECT
 (SELECT count(*) FROM serverless_stable_cvpomp_catalog.heineken_genie.spaces) AS spaces,
 (SELECT count(*) FROM serverless_stable_cvpomp_catalog.heineken_genie.users) AS users,
 (SELECT count(*) FROM serverless_stable_cvpomp_catalog.heineken_genie.events_daily) AS event_rows,
 (SELECT round(sum(num_questions)) FROM serverless_stable_cvpomp_catalog.heineken_genie.events_daily) AS total_questions,
 (SELECT round(sum(cost_usd)) FROM serverless_stable_cvpomp_catalog.heineken_genie.costs_daily) AS total_cost;

CREATE OR REPLACE TABLE serverless_stable_cvpomp_catalog.heineken_genie.genie_billing_daily AS
SELECT e.usage_date, e.user_email, e.workspace_id, e.space_id, e.num_questions,
  ROUND(e.num_questions * (1.0 + s.activity_weight*1.3 + s.num_tables/20.0*1.6) * 1.15 * (0.75 + rand()*0.6), 3) AS llm_dbus
FROM serverless_stable_cvpomp_catalog.heineken_genie.events_daily e JOIN serverless_stable_cvpomp_catalog.heineken_genie.spaces s ON s.space_id = e.space_id;
