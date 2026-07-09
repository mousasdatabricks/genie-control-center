# Roteiro de demonstração — Genie Control Center (Heineken)

**Duração:** 8–10 min · **Formato:** demo ao vivo (screen-share) ou vídeo gravado.
**Contexto para abrir:** "Com o Genie entrando em pay-as-you-go, vocês precisam de um lugar único para governar uso, adoção, qualidade e **custo** do Genie — e controlar orçamento por usuário. Isto é esse painel; ele lê as system tables de vocês e roda como um Databricks App no ambiente de vocês."

Filtros globais (período · workspace · área) e seletor de idioma (🇧🇷🇺🇸🇪🇸) estão sempre no topo — troque para inglês/espanhol se houver stakeholders regionais.

---

### 1. Visão Geral (30–60s)
- Aponte os KPIs: espaços ativos, usuários ativos, perguntas, **taxa de sucesso**, custo, custo/pergunta.
- Destaque o card de **alerta**: "estes espaços precisam de atenção" (órfãos/dormentes). Clique num deles → leva ao detalhe.
- Mensagem: "panorama executivo em 5 segundos, cruzando adoção e custo."

### 2. Adoção (60s)
- Usuários/perguntas por área; **novos usuários por semana**.
- Mostre o **mapa de atividade** (área × dia da semana).
- Role até **metas por área** (barras de progresso) — "metas configuráveis; medimos adoção contra elas."

### 3. Cobrança / Paygo — *o momento-chave* (2–3 min)
- Abra o banner: **150 DBUs de LLM grátis por usuário/mês** (SRTI $0,07/DBU), promo 25%.
- KPIs: **usuários pagantes vs total (~16%)**, DBUs grátis abatidos, DBUs pagos, **projeção mensal com promo**.
- Gráfico de distribuição: a maioria dentro do tier grátis — "≈80% dos usuários não geram custo."
- **Tabela por usuário = o controle:** para cada usuário, consumo, % do grátis, custo, **orçamento** e status (OK/Alerta/Estourado).
  - Edite o **orçamento padrão** ($20/usuário).
  - Defina um **override** para um power user (ex.: 50) e salve — "espelha o Unity AI Gateway Budgets: default + overrides por usuário/grupo."
- Diga a verdade do modelo: "o tier grátis não aparece em system tables; esta % usa o estimador. Em produção o custo pago vem de `billing_origin_product='GENIE'`."

### 4. Custos / FinOps (45s)
- Custo de **compute** (SQL serverless) por espaço/área/SKU; run-rate; **eficiência** (espaços caros com baixa adoção = candidatos a descomissionar).
- Mensagem: "LLM (Paygo) e compute são componentes distintos da conta; aqui está o compute."

### 5. Qualidade (30s)
- Feedback 👍/👎 por espaço, evolução da taxa de sucesso, espaços abaixo de 75% (revisar instruções/tabelas).

### 6. Espaços + Detalhe (60s)
- Inventário com status; filtre por **Órfão**. "Owner saiu, sem uso há 60+ dias — decisão de governança."
- Clique num espaço → **detalhe 360**: ficha, tendência, top usuários e **anotações de governança** (persistidas em Lakebase). Adicione uma nota ao vivo.

### 7. Administração (30s)
- Metas de adoção, thresholds de alerta, **orçamento padrão** por usuário, saúde das conexões. "Tudo que é estado do app vive em Lakebase, no ambiente de vocês."

### Fechamento (30s)
- "É um **template**: lê 4 views de abstração. Na demo apontam para dados sintéticos; no ambiente de vocês, apontam para as system tables — o app não muda. Deploy via Databricks Asset Bundle. Próximo passo: uma sessão de 30 min com o time de plataforma para plugar nas system tables de vocês."

---

**Dica de gravação:** deixe o idioma em PT-BR; use o filtro de período em "Últimos 90 dias" para gráficos mais densos; abra a página **Cobrança** por último antes do fechamento — é o maior diferencial dado o novo pricing.
