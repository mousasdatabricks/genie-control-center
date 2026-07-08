import { z } from 'zod';
import { Application } from 'express';

// AppKit exposes a Lakebase query helper and a way to extend the Express server.
interface AppKitWithLakebase {
  lakebase: {
    query(text: string, params?: unknown[]): Promise<{ rows: Record<string, unknown>[] }>;
  };
  server: {
    extend(fn: (app: Application) => void): void;
  };
}

// The Service Principal cannot use the `public` schema — it must own its own.
const SCHEMA = 'genie_cc';

const CREATE_SCHEMA_SQL = `CREATE SCHEMA IF NOT EXISTS ${SCHEMA}`;

const CREATE_GOALS_SQL = `
  CREATE TABLE IF NOT EXISTS ${SCHEMA}.area_goals (
    area TEXT PRIMARY KEY,
    mau_goal INTEGER NOT NULL DEFAULT 0,
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
  )`;

const CREATE_THRESHOLDS_SQL = `
  CREATE TABLE IF NOT EXISTS ${SCHEMA}.thresholds (
    key TEXT PRIMARY KEY,
    value DOUBLE PRECISION NOT NULL,
    label TEXT NOT NULL,
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
  )`;

const CREATE_ANNOTATIONS_SQL = `
  CREATE TABLE IF NOT EXISTS ${SCHEMA}.annotations (
    id SERIAL PRIMARY KEY,
    space_id TEXT NOT NULL,
    note TEXT NOT NULL,
    author TEXT NOT NULL DEFAULT 'app',
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
  )`;

// Per-user Genie budget overrides (Unity AI Gateway style). Default budget lives
// in the thresholds table as `default_user_budget_usd`.
const CREATE_BUDGETS_SQL = `
  CREATE TABLE IF NOT EXISTS ${SCHEMA}.user_budgets (
    user_email TEXT PRIMARY KEY,
    monthly_usd DOUBLE PRECISION NOT NULL,
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
  )`;

// Seed data lets the app render meaningful Admin state on first deploy.
const DEFAULT_GOALS: Array<[string, number]> = [
  ['Comercial & Vendas', 45],
  ['Marketing', 30],
  ['Supply Chain', 25],
  ['Produção', 35],
  ['Logística', 20],
  ['Finanças', 22],
  ['Recursos Humanos', 12],
  ['Dados & Analytics', 18],
];

const DEFAULT_THRESHOLDS: Array<[string, number, string]> = [
  ['orphan_days', 45, 'Dias sem atividade para marcar um espaço como Órfão'],
  ['dormant_days', 14, 'Dias sem atividade para marcar um espaço como Dormente'],
  ['cost_alert_usd', 120, 'Custo mensal (US$) por espaço acima do qual disparar alerta'],
  ['min_success_rate', 75, 'Taxa de sucesso (%) mínima aceitável por espaço'],
  ['default_user_budget_usd', 20, 'Orçamento mensal (US$) padrão de Genie por usuário (Paygo)'],
];

const GoalBody = z.object({ area: z.string().min(1), mau_goal: z.number().int().min(0) });
const ThresholdBody = z.object({ key: z.string().min(1), value: z.number() });
const AnnotationBody = z.object({
  space_id: z.string().min(1),
  note: z.string().min(1),
  author: z.string().optional(),
});
const BudgetBody = z.object({ user_email: z.string().min(1), monthly_usd: z.number().min(0) });

export async function setupAdminRoutes(appkit: AppKitWithLakebase) {
  try {
    await appkit.lakebase.query(CREATE_SCHEMA_SQL);
    await appkit.lakebase.query(CREATE_GOALS_SQL);
    await appkit.lakebase.query(CREATE_THRESHOLDS_SQL);
    await appkit.lakebase.query(CREATE_ANNOTATIONS_SQL);
    await appkit.lakebase.query(CREATE_BUDGETS_SQL);

    // Seed goals only when the table is empty.
    const { rows: goalCount } = await appkit.lakebase.query(
      `SELECT COUNT(*)::int AS n FROM ${SCHEMA}.area_goals`,
    );
    if (Number((goalCount[0]?.n as number) ?? 0) === 0) {
      for (const [area, goal] of DEFAULT_GOALS) {
        await appkit.lakebase.query(
          `INSERT INTO ${SCHEMA}.area_goals (area, mau_goal) VALUES ($1, $2)
           ON CONFLICT (area) DO NOTHING`,
          [area, goal],
        );
      }
    }

    // Idempotent: adds any new default threshold keys on redeploy without
    // overwriting values the admin has already changed.
    for (const [key, value, label] of DEFAULT_THRESHOLDS) {
      await appkit.lakebase.query(
        `INSERT INTO ${SCHEMA}.thresholds (key, value, label) VALUES ($1, $2, $3)
         ON CONFLICT (key) DO NOTHING`,
        [key, value, label],
      );
    }
    console.log('[admin] Lakebase schema ready and seeded');
  } catch (err) {
    console.warn('[admin] Lakebase setup failed:', (err as Error).message);
    console.warn('[admin] Admin routes will register but may return errors until the app is deployed (SP must own the schema)');
  }

  appkit.server.extend((app) => {
    // ---- Health ----
    app.get('/api/admin/health', async (_req, res) => {
      try {
        await appkit.lakebase.query('SELECT 1');
        res.json({ lakebase: 'ok', schema: SCHEMA });
      } catch (err) {
        res.status(500).json({ lakebase: 'error', message: (err as Error).message });
      }
    });

    // ---- Area adoption goals ----
    app.get('/api/admin/goals', async (_req, res) => {
      try {
        const { rows } = await appkit.lakebase.query(
          `SELECT area, mau_goal FROM ${SCHEMA}.area_goals ORDER BY area`,
        );
        res.json(rows);
      } catch (err) {
        console.error('goals list failed', err);
        res.status(500).json({ error: 'Failed to load goals' });
      }
    });

    app.put('/api/admin/goals', async (req, res) => {
      const parsed = GoalBody.safeParse(req.body);
      if (!parsed.success) {
        res.status(400).json({ error: 'area and mau_goal required' });
        return;
      }
      try {
        const { rows } = await appkit.lakebase.query(
          `INSERT INTO ${SCHEMA}.area_goals (area, mau_goal, updated_at)
           VALUES ($1, $2, NOW())
           ON CONFLICT (area) DO UPDATE SET mau_goal = EXCLUDED.mau_goal, updated_at = NOW()
           RETURNING area, mau_goal`,
          [parsed.data.area, parsed.data.mau_goal],
        );
        res.json(rows[0]);
      } catch (err) {
        console.error('goal upsert failed', err);
        res.status(500).json({ error: 'Failed to save goal' });
      }
    });

    // ---- Alert thresholds ----
    app.get('/api/admin/thresholds', async (_req, res) => {
      try {
        const { rows } = await appkit.lakebase.query(
          `SELECT key, value, label FROM ${SCHEMA}.thresholds ORDER BY key`,
        );
        res.json(rows);
      } catch (err) {
        console.error('thresholds list failed', err);
        res.status(500).json({ error: 'Failed to load thresholds' });
      }
    });

    app.put('/api/admin/thresholds', async (req, res) => {
      const parsed = ThresholdBody.safeParse(req.body);
      if (!parsed.success) {
        res.status(400).json({ error: 'key and value required' });
        return;
      }
      try {
        const { rows } = await appkit.lakebase.query(
          `UPDATE ${SCHEMA}.thresholds SET value = $2, updated_at = NOW()
           WHERE key = $1 RETURNING key, value, label`,
          [parsed.data.key, parsed.data.value],
        );
        if (rows.length === 0) {
          res.status(404).json({ error: 'Unknown threshold key' });
          return;
        }
        res.json(rows[0]);
      } catch (err) {
        console.error('threshold update failed', err);
        res.status(500).json({ error: 'Failed to save threshold' });
      }
    });

    // ---- Governance annotations (per space) ----
    app.get('/api/admin/annotations', async (req, res) => {
      try {
        const spaceId = typeof req.query.space_id === 'string' ? req.query.space_id : null;
        const { rows } = spaceId
          ? await appkit.lakebase.query(
              `SELECT id, space_id, note, author, created_at FROM ${SCHEMA}.annotations
               WHERE space_id = $1 ORDER BY created_at DESC`,
              [spaceId],
            )
          : await appkit.lakebase.query(
              `SELECT id, space_id, note, author, created_at FROM ${SCHEMA}.annotations
               ORDER BY created_at DESC LIMIT 200`,
            );
        res.json(rows);
      } catch (err) {
        console.error('annotations list failed', err);
        res.status(500).json({ error: 'Failed to load annotations' });
      }
    });

    app.post('/api/admin/annotations', async (req, res) => {
      const parsed = AnnotationBody.safeParse(req.body);
      if (!parsed.success) {
        res.status(400).json({ error: 'space_id and note required' });
        return;
      }
      try {
        const { rows } = await appkit.lakebase.query(
          `INSERT INTO ${SCHEMA}.annotations (space_id, note, author)
           VALUES ($1, $2, $3) RETURNING id, space_id, note, author, created_at`,
          [parsed.data.space_id, parsed.data.note, parsed.data.author ?? 'app'],
        );
        res.status(201).json(rows[0]);
      } catch (err) {
        console.error('annotation create failed', err);
        res.status(500).json({ error: 'Failed to save annotation' });
      }
    });

    app.delete('/api/admin/annotations/:id', async (req, res) => {
      const id = parseInt(req.params.id, 10);
      if (isNaN(id)) {
        res.status(400).json({ error: 'Invalid id' });
        return;
      }
      try {
        const { rows } = await appkit.lakebase.query(
          `DELETE FROM ${SCHEMA}.annotations WHERE id = $1 RETURNING id`,
          [id],
        );
        if (rows.length === 0) {
          res.status(404).json({ error: 'Annotation not found' });
          return;
        }
        res.status(204).send();
      } catch (err) {
        console.error('annotation delete failed', err);
        res.status(500).json({ error: 'Failed to delete annotation' });
      }
    });

    // ---- Per-user Genie budgets (Paygo) ----
    app.get('/api/admin/user-budgets', async (_req, res) => {
      try {
        const { rows } = await appkit.lakebase.query(
          `SELECT user_email, monthly_usd FROM ${SCHEMA}.user_budgets ORDER BY user_email`,
        );
        res.json(rows);
      } catch (err) {
        console.error('user-budgets list failed', err);
        res.status(500).json({ error: 'Failed to load budgets' });
      }
    });

    app.put('/api/admin/user-budgets', async (req, res) => {
      const parsed = BudgetBody.safeParse(req.body);
      if (!parsed.success) {
        res.status(400).json({ error: 'user_email and monthly_usd required' });
        return;
      }
      try {
        const { rows } = await appkit.lakebase.query(
          `INSERT INTO ${SCHEMA}.user_budgets (user_email, monthly_usd, updated_at)
           VALUES ($1, $2, NOW())
           ON CONFLICT (user_email) DO UPDATE SET monthly_usd = EXCLUDED.monthly_usd, updated_at = NOW()
           RETURNING user_email, monthly_usd`,
          [parsed.data.user_email, parsed.data.monthly_usd],
        );
        res.json(rows[0]);
      } catch (err) {
        console.error('user-budget upsert failed', err);
        res.status(500).json({ error: 'Failed to save budget' });
      }
    });

    app.delete('/api/admin/user-budgets/:email', async (req, res) => {
      try {
        const { rows } = await appkit.lakebase.query(
          `DELETE FROM ${SCHEMA}.user_budgets WHERE user_email = $1 RETURNING user_email`,
          [req.params.email],
        );
        if (rows.length === 0) {
          res.status(404).json({ error: 'Budget override not found' });
          return;
        }
        res.status(204).send();
      } catch (err) {
        console.error('user-budget delete failed', err);
        res.status(500).json({ error: 'Failed to delete budget' });
      }
    });
  });
}
