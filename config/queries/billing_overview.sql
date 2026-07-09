WITH sku AS (
  SELECT
    ROUND(SUM(cost_usd), 2) AS total_sku,
    ROUND(SUM(CASE WHEN cost_category = 'LLM_PAYGO' THEN cost_usd ELSE 0 END), 2) AS llm_cost,
    ROUND(SUM(CASE WHEN cost_category IN ('COMPUTE_SQL', 'COMPUTE_LLM_INFRA', 'COMPUTE_OTHER') THEN cost_usd ELSE 0 END), 2) AS compute_cost
  FROM main.genie_cc.v_genie_billing_sku_daily
  WHERE usage_date BETWEEN CAST(:p_start AS DATE) AND CAST(:p_end AS DATE)
    AND (:p_ws = '' OR workspace_name = :p_ws)
    AND (:p_area = '' OR area = :p_area)
),
usage AS (
  SELECT
    COUNT(DISTINCT user_email) AS active_users,
    SUM(num_questions) AS questions
  FROM main.genie_cc.v_genie_usage_daily
  WHERE usage_date BETWEEN CAST(:p_start AS DATE) AND CAST(:p_end AS DATE)
    AND (:p_ws = '' OR workspace_name = :p_ws)
    AND (:p_area = '' OR area = :p_area)
)
SELECT
  sku.total_sku,
  sku.llm_cost,
  sku.compute_cost,
  usage.active_users,
  usage.questions,
  ROUND(TRY_DIVIDE(sku.total_sku, usage.questions), 4) AS cost_per_question
FROM sku CROSS JOIN usage
