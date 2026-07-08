# 🍺 Heineken · Genie Control Center

App de **governança de uso, adoção e custos do AI/BI Genie** em todos os workspaces de uma conta Databricks. Painel único para o time de plataforma/CoE gerenciar tudo que acontece com o Genie: quem usa, quanto usa, com que qualidade, quais espaços estão vivos/órfãos e quanto custa.

> Construído como **Databricks App (AppKit)** — React + TypeScript no front, Express/AppKit no back, **system tables** para analytics e **Lakebase (Postgres)** para o estado do app. Identidade visual Heineken Brasil.

## Módulos

| Módulo | O que mostra |
|--------|--------------|
| **Visão Geral** | KPIs (espaços/usuários ativos, perguntas, taxa de sucesso, custo, custo/pergunta), séries temporais e alertas de espaços que precisam de atenção |
| **Adoção** | WAU/novos usuários, engajamento por área, mapa de atividade (área × dia), progresso frente às **metas** |
| **Uso** | Perguntas, erros e latência por espaço, usuário e workspace |
| **Qualidade** | Feedback 👍/👎, taxa de sucesso no tempo, espaços com pior qualidade |
| **Custos (FinOps)** | Custo de **compute** por espaço/área/SKU, custo por pergunta/usuário, run-rate mensal e eficiência (caros com baixa adoção) |
| **Cobrança (Paygo)** | Modelo real Genie Paygo: **150 DBU LLM grátis/usuário/mês** (SRTI $0,07/DBU, promo 25%), projeção mensal, distribuição free vs pagante, e **controle de orçamento por usuário** (default + overrides estilo Unity AI Gateway) |
| **Espaços** | Inventário completo com status (Ativo/Dormente/Órfão), busca e filtros |
| **Detalhe do Espaço** | Visão 360 + **anotações de governança** (Lakebase) |
| **Administração** | Metas de adoção por área, thresholds de alerta e saúde das conexões |

Filtros globais (período · workspace · área) com deep-linking na URL.

## Arquitetura

```
                    ┌─────────────────── Databricks App (AppKit) ───────────────────┐
  System Tables ──► │  config/queries/*.sql  ──►  React (charts, tabelas, KPIs)      │
  (via 4 views)     │  (SQL Warehouse)                                               │
                    │  Lakebase (Postgres)  ──►  metas · thresholds · anotações       │
                    └────────────────────────────────────────────────────────────────┘
```

**A peça central da portabilidade são 4 views de abstração** que o app sempre lê:

| View | Conteúdo |
|------|----------|
| `v_genie_usage_daily` | uso diário por espaço/usuário (perguntas, erros, latência, feedback) |
| `v_genie_costs_daily` | custo diário por espaço/SKU |
| `v_genie_users` | usuários, área, primeiro/último acesso |
| `v_genie_spaces` | inventário + status derivado da atividade |
| `v_genie_llm_daily` | DBUs de LLM por usuário/dia (Paygo) — em prod, de `billing_origin_product='GENIE'` |

> **Nota Paygo:** o modelo real cobra LLM em DBUs (SRTI, $0,07/DBU) com **150 DBU grátis por usuário/mês**; o tier grátis **não aparece em system tables** (só o pago). A visão "% do grátis" da página Cobrança usa o modelo de estimativa (demo); em produção o custo pago vem direto do billing. Controles de orçamento por usuário espelham o Unity AI Gateway Budgets.

Na **demo** essas views apontam para dados sintéticos. Em **produção** você as recria apontando para suas **system tables** — **o código do app não muda**.

## Este deploy (demo Heineken)

- **Workspace:** `fevm-serverless-stable-cvpomp`
- **App:** `heineken-genie-cc` · URL: https://heineken-genie-cc-7474647325287912.aws.databricksapps.com
- **Dados de demo:** `serverless_stable_cvpomp_catalog.heineken_genie` (17 espaços, ~180 usuários, 90 dias, 3 workspaces fictícios da Heineken)
- **Lakebase:** projeto `heineken-genie-db`

Recriar a demo do zero: `sql/demo_01_data.sql` (dados sintéticos) + `sql/demo_02_views.sql` (views apontando para eles).

## Replicar no ambiente do cliente (produção)

1. **Pré-requisitos:** system tables habilitadas (`system.access.audit`, `system.billing.usage`, `system.access.workspaces_latest`), um SQL Warehouse (serverless), uma instância Lakebase e o Databricks CLI autenticado.

2. **Popule as tabelas de referência** `dim_spaces` (1 linha por Genie Space — via `GET /api/2.0/genie/spaces`) e `dim_users` (e-mail → área, do seu diretório). DDL em `sql/views_prod.sql`.

3. **Crie as 4 views** rodando `sql/views_prod.sql`:
   - troque `<<CATALOG>>.<<SCHEMA>>` pelo seu destino (ex.: `main.genie_cc`);
   - **ajuste os `action_name`** do Genie ao seu release (rode antes `SELECT DISTINCT action_name FROM system.access.audit WHERE service_name='databricksGenie'`).

4. **Aponte o app para o seu esquema** — troque o prefixo nas queries:
   ```bash
   grep -rl 'serverless_stable_cvpomp_catalog.heineken_genie' config/queries \
     | xargs sed -i '' 's/serverless_stable_cvpomp_catalog.heineken_genie/main.genie_cc/g'
   ```

5. **Configure recursos** em `databricks.yml` (warehouse + Lakebase do seu ambiente) e **conceda ao Service Principal do app** `SELECT` nas system tables, nas views e nas tabelas de referência.

6. **Deploy:**
   ```bash
   databricks bundle deploy -t default --profile <SEU_PROFILE>
   databricks bundle run  app -t default --profile <SEU_PROFILE>
   ```

O app builda no ambiente Databricks (o `command` do `app.yaml` roda `npm run build && npm start`).

## Estrutura

```
config/queries/*.sql     Queries analíticas (lêem as 4 views)  → tipadas via AppKit typegen
server/server.ts         Bootstrap AppKit (analytics + lakebase)
server/routes/admin-routes.ts   API Lakebase: metas, thresholds, anotações, health
client/src/pages/*       8 módulos
client/src/lib/          filtros globais, formatters, tema Heineken
client/src/components/   KpiCard, StatusBadge, DataGrid, marca
sql/views_prod.sql       Template das 4 views sobre system tables (replicação)
sql/demo_*.sql           Dados sintéticos + views da demo
app.yaml / databricks.yml  Deploy
```

## Estado do app (Lakebase)

Schema `genie_cc` (criado pelo SP no 1º start), com `area_goals`, `thresholds` e `annotations`. Metas e thresholds são semeados na inicialização e editáveis em **Administração**.

## Desenvolvimento local

```bash
npm install
npm run dev
```
Para Lakebase local, veja `server/.env` (variáveis `PG*` do endpoint). Nunca comite `.env`.

---
_Dados de demonstração são sintéticos. Em produção, aponte as views `v_genie_*` para suas system tables._
