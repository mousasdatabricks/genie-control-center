# Genie Control Center — Handoff Heineken

## O que é
Um **Databricks App** para o time de dados/plataforma da Heineken **governar o AI/BI Genie** em todos os workspaces: uso, adoção, qualidade, custo de compute e — no novo modelo **Genie Paygo** — **projeção de custo de LLM e controle de orçamento por usuário**. Roda no ambiente Databricks da Heineken, lendo as system tables da própria conta.

## Por que agora
Desde 7-jul-2026 o Genie é **pay-as-you-go**: uso de LLM em DBUs (SKU Serverless Realtime Inference, ~US$ 0,07/DBU), com **150 DBUs grátis por usuário/mês** (~US$ 10,50) e promoção de 25% até 31-jan-2027. Cobrir ~80% dos usuários no tier grátis é ótimo, mas os administradores precisam de **visibilidade e controle** (orçamentos por usuário/grupo, alertas) e de projeção de custo. Este app entrega isso num painel único e com a marca Heineken.

## O que entrega (10 módulos)
- **Visão Geral** — KPIs e alertas (espaços órfãos/dormentes, custo).
- **Adoção** — WAU/novos usuários, engajamento por área, metas configuráveis.
- **Uso** — perguntas, erros, latência por espaço/usuário/workspace.
- **Qualidade** — feedback 👍/👎, taxa de sucesso, espaços a revisar.
- **Custos (FinOps)** — custo de compute por espaço/área/SKU, eficiência.
- **Cobrança (Paygo)** — 150 DBU grátis/usuário, projeção mensal, **orçamento por usuário** (default + overrides estilo Unity AI Gateway).
- **Espaços** — inventário com status de governança.
- **Detalhe do Espaço** — visão 360 + anotações de governança.
- **Administração** — metas, thresholds, orçamento padrão, saúde.
- Multi-idioma **PT / EN / ES** e sidebar colapsável.

## Arquitetura (resumo)
- **Databricks App (AppKit)**: React + TypeScript (frontend) e Express (backend).
- **Analytics**: consultas às system tables via SQL Warehouse.
- **Lakebase (Postgres)**: estado do app — metas, thresholds, orçamentos por usuário, anotações.
- **Camada de abstração (chave da portabilidade)**: o app lê sempre 4 views — `v_genie_usage_daily`, `v_genie_costs_daily`, `v_genie_users`, `v_genie_spaces` (+ `v_genie_llm_daily` para Paygo). Trocar a origem dessas views troca de "demo" para "produção" **sem alterar o app**.

## Como a Heineken coloca no ar (visão de alto nível)
1. **Pré-requisitos**: system tables habilitadas (`system.access.audit`, `system.billing.usage`, `system.access.workspaces_latest`), um SQL Warehouse serverless e uma instância Lakebase.
2. **Popular 2 tabelas de referência**: `dim_spaces` (via API do Genie) e `dim_users` (e-mail → área, do diretório).
3. **Criar as views** rodando `sql/views_prod.sql` (trocar o prefixo do catálogo/esquema; ajustar os `action_name` do Genie ao release).
4. **Conceder ao Service Principal do app** leitura nas system tables, views e tabelas de referência.
5. **Deploy**: `databricks bundle deploy` + `databricks bundle run app`.

> Passo a passo técnico completo no `README.md` do repositório. Nota: o **tier grátis do Genie não aparece em system tables** (só o uso pago, via `billing_origin_product='GENIE'`); a visão de "% do grátis" usa modelo de estimativa.

## Próximo passo sugerido
Sessão de **30 min** com o time de plataforma da Heineken para plugar o app nas system tables do ambiente deles (popular `dim_spaces`/`dim_users`, rodar `views_prod.sql`, primeiro deploy). Depois, habilitar os administradores a definir orçamentos por usuário/grupo na página **Cobrança**.

---
_Repositório (privado): ver link compartilhado. Demo disponível sob agendamento (o app roda em workspace interno de demonstração; acesso via sessão guiada ou vídeo)._
