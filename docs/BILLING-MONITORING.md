# Monitoramento de Billing Genie — visão completa para o cliente

Este documento descreve o que o **Genie Control Center** cobre hoje em billing, o que o cliente deve configurar, e relatórios/controles recomendados.

## Objetivo

Dar ao time de plataforma/FinOps **visão total** do que aparece na fatura relacionado ao Genie:

| Camada | Fonte | O que mede |
|--------|-------|------------|
| **Uso** | `system.access.audit` | Perguntas, erros, feedback, superfície (Spaces / Code) |
| **Compute** | `system.billing.usage` | SQL Serverless, infra LLM, warehouses dos spaces |
| **LLM Paygo** | `system.billing.usage` | `billing_origin_product = 'GENIE'` |
| **Controles** | Lakebase | Orçamentos por usuário, metas, thresholds |

## Views UC (produção)

Após rodar [`sql/views_prod.sql`](../sql/views_prod.sql):

| View | Uso no app |
|------|------------|
| `v_genie_usage_daily` | Uso por space/usuário + `product_surface` |
| `v_genie_costs_daily` | Compute **rateado** por space (proporcional a perguntas no warehouse) |
| `v_genie_billing_sku_daily` | **sku_name real** + `cost_category` |
| `v_genie_llm_daily` | LLM DBUs/custo por usuário (+ space quando inferível) |
| `v_genie_user_cost_daily` | **Compute + LLM** por usuário/dia |
| `v_genie_product_usage_daily` | Agregado Spaces vs Code |

### Categorias de custo (`cost_category`)

| Valor | Significado |
|-------|-------------|
| `LLM_PAYGO` | LLM faturado via Genie Paygo |
| `COMPUTE_SQL` | SQL Serverless (warehouses dos spaces) |
| `COMPUTE_LLM_INFRA` | Model Serving / SRTI associado |
| `COMPUTE_OTHER` | Outros SKUs de compute ligados ao warehouse |

### Superfícies de produto (`product_surface`)

Definidas em `_genie_events` — **ajuste ao release do cliente**:

| Valor | Critério padrão |
|-------|-----------------|
| `GENIE_SPACES` | `space_id` presente ou `action_name` de conversa |
| `GENIE_CODE` | `action_name` contendo `code` ou lista explícita |
| `GENIE_OTHER` | Demais eventos `databricksGenie` |

Validação recomendada:

```sql
SELECT action_name, COUNT(*) AS n
FROM system.access.audit
WHERE service_name = 'databricksGenie'
  AND event_date >= current_date() - 30
GROUP BY action_name ORDER BY n DESC;
```

## Páginas do app

| Página | Conteúdo billing |
|--------|------------------|
| **Billing Genie** (`/billing`) | Visão unificada: total, SKU, Spaces/Code, usuário, espaço + Paygo |
| **Custos** (`/costs`) | FinOps compute rateado por space/área/categoria |
| **Uso** (`/usage`) | Volume por space/usuário (sem $) |
| **Admin** (`/admin`) | Orçamentos, thresholds, metas |

## Queries analíticas (relatórios)

| Query | Relatório |
|-------|-----------|
| `billing_overview` | KPIs: custo total Genie, LLM, compute, custo/pergunta |
| `billing_daily_total` | Série diária custo total |
| `billing_by_sku_detail` | Tabela por **sku_name** real |
| `billing_by_product` | Uso Spaces vs Code |
| `billing_by_user_total` | **Chargeback por usuário** (compute + LLM) |
| `billing_by_space_total` | **Chargeback por space** |
| `billing_timeseries` | Série por categoria (LLM vs compute) |
| `paygo_summary` / `paygo_user_costs` | Paygo + orçamentos |

### Relatórios SQL adicionais (fora do app)

Para auditoria mensal, exporte do warehouse:

```sql
-- Fatura Genie por SKU (mês corrente)
SELECT sku_name, cost_category, ROUND(SUM(cost_usd), 2) AS usd
FROM main.genie_cc.v_genie_billing_sku_daily
WHERE usage_date >= date_trunc('month', current_date())
GROUP BY sku_name, cost_category ORDER BY usd DESC;

-- Top usuários por custo total
SELECT user_email, ROUND(SUM(total_cost_usd), 2) AS usd
FROM main.genie_cc.v_genie_user_cost_daily
WHERE usage_date >= date_trunc('month', current_date())
GROUP BY user_email ORDER BY usd DESC LIMIT 50;
```

## Controles implementados

| Controle | Onde | Escopo |
|----------|------|--------|
| Orçamento mensal por usuário | `/billing` → Paygo | LLM Paygo (US$) |
| Orçamento padrão | Admin → thresholds `default_user_budget_usd` | Todos os usuários |
| Alerta custo por space | Admin → `cost_alert_usd` | Governança (não bloqueia uso) |
| Metas MAU por área | Admin → goals | Adoção |

## Controles recomendados (roadmap)

| Controle | Prioridade | Notas |
|----------|------------|-------|
| Orçamento por **space** | Alta | Lakebase `space_budgets` |
| Orçamento por **área** | Média | Agregar usuários da área |
| Alerta e-mail/Slack ao estourar orçamento | Alta | Integração externa |
| Export CSV/PDF mensal | Média | Botão na UI Billing |
| Tag `cost_center` em `dim_spaces` | Alta | Chargeback financeiro |
| Sync diário `dim_spaces` via Job | Alta | API Genie Spaces |

## Limitações conhecidas

1. **Tier grátis (150 DBU)** não aparece em system tables — Paygo usa modelo de estimativa para `% grátis`.
2. **Genie Code sem warehouse** — custo compute de Code pode aparecer só em `billing_origin_product=GENIE`, não rateado por space.
3. **Warehouses compartilhados** — rateio é por **perguntas**, não por DBU real por space (melhor que duplicar custo integral).
4. **LLM por space** — em produção, `space_id` no LLM é inferido pelo space com mais perguntas no dia (heurística).

## Checklist de go-live billing

- [ ] `views_prod.sql` executado com prefixo UC correto
- [ ] `product_surface` validado contra `action_name` do cliente
- [ ] `dim_spaces.warehouse_id` preenchido para cada space
- [ ] SP do app com SELECT em system tables + views
- [ ] Página Billing Genie mostra custo total > 0
- [ ] Tabela SKU lista `sku_name` esperados
- [ ] Paygo: usuários pagantes coerentes com invoice Databricks
