import { createContext, useContext, useState, useCallback, useMemo } from 'react';
import type { ReactNode } from 'react';

export type Lang = 'pt' | 'en' | 'es';

export const LANGS: { code: Lang; flag: string; label: string }[] = [
  { code: 'pt', flag: '🇧🇷', label: 'Português' },
  { code: 'en', flag: '🇺🇸', label: 'English' },
  { code: 'es', flag: '🇪🇸', label: 'Español' },
];

type Entry = Record<Lang, string>;

// Flat dictionary. Keys used across the app; missing keys fall back to the key.
const DICT: Record<string, Entry> = {
  // Brand / shell
  'brand.subtitle': { pt: 'Governança de Uso, Adoção & Custos', en: 'Usage, Adoption & Cost Governance', es: 'Gobierno de Uso, Adopción y Costos' },
  'footer': {
    pt: 'Genie Control Center — em produção, aponte as views v_genie_* para suas system tables.',
    en: 'Genie Control Center — in production, point the v_genie_* views to your system tables.',
    es: 'Genie Control Center — en producción, apunte las vistas v_genie_* a sus system tables.',
  },
  'lang.label': { pt: 'Idioma', en: 'Language', es: 'Idioma' },
  'nav.collapse': { pt: 'Recolher', en: 'Collapse', es: 'Colapsar' },
  'nav.expand': { pt: 'Expandir', en: 'Expand', es: 'Expandir' },

  // Nav
  'nav.overview': { pt: 'Visão Geral', en: 'Overview', es: 'Visión General' },
  'nav.adoption': { pt: 'Adoção', en: 'Adoption', es: 'Adopción' },
  'nav.usage': { pt: 'Uso', en: 'Usage', es: 'Uso' },
  'nav.quality': { pt: 'Qualidade', en: 'Quality', es: 'Calidad' },
  'nav.costs': { pt: 'Custos', en: 'Costs', es: 'Costos' },
  'nav.spaces': { pt: 'Espaços', en: 'Spaces', es: 'Espacios' },
  'nav.admin': { pt: 'Administração', en: 'Administration', es: 'Administración' },

  // Filters
  'filter.period7': { pt: 'Últimos 7 dias', en: 'Last 7 days', es: 'Últimos 7 días' },
  'filter.period30': { pt: 'Últimos 30 dias', en: 'Last 30 days', es: 'Últimos 30 días' },
  'filter.period90': { pt: 'Últimos 90 dias', en: 'Last 90 days', es: 'Últimos 90 días' },
  'filter.allWorkspaces': { pt: 'Todos os workspaces', en: 'All workspaces', es: 'Todos los workspaces' },
  'filter.allAreas': { pt: 'Todas as áreas', en: 'All areas', es: 'Todas las áreas' },

  // Common
  'common.noData': { pt: 'Sem dados para os filtros selecionados.', en: 'No data for the selected filters.', es: 'Sin datos para los filtros seleccionados.' },
  'common.search': { pt: 'Buscar...', en: 'Search...', es: 'Buscar...' },
  'common.save': { pt: 'Salvar', en: 'Save', es: 'Guardar' },
  'common.saving': { pt: 'Salvando...', en: 'Saving...', es: 'Guardando...' },

  // Statuses (data values stay canonical PT; only display is translated)
  'status.Ativo': { pt: 'Ativo', en: 'Active', es: 'Activo' },
  'status.Dormente': { pt: 'Dormente', en: 'Dormant', es: 'Inactivo' },
  'status.Órfão': { pt: 'Órfão', en: 'Orphaned', es: 'Huérfano' },
  'status.Todos': { pt: 'Todos', en: 'All', es: 'Todos' },

  // Column headers (shared)
  'col.space': { pt: 'Espaço', en: 'Space', es: 'Espacio' },
  'col.area': { pt: 'Área', en: 'Area', es: 'Área' },
  'col.workspace': { pt: 'Workspace', en: 'Workspace', es: 'Workspace' },
  'col.owner': { pt: 'Owner', en: 'Owner', es: 'Owner' },
  'col.tables': { pt: 'Tabelas', en: 'Tables', es: 'Tablas' },
  'col.lastActivity': { pt: 'Última atividade', en: 'Last activity', es: 'Última actividad' },
  'col.users': { pt: 'Usuários', en: 'Users', es: 'Usuarios' },
  'col.questions': { pt: 'Perguntas', en: 'Questions', es: 'Preguntas' },
  'col.errors': { pt: 'Erros', en: 'Errors', es: 'Errores' },
  'col.latency': { pt: 'Latência (ms)', en: 'Latency (ms)', es: 'Latencia (ms)' },
  'col.user': { pt: 'Usuário', en: 'User', es: 'Usuario' },
  'col.spacesUsed': { pt: 'Espaços usados', en: 'Spaces used', es: 'Espacios usados' },
  'col.cost': { pt: 'Custo', en: 'Cost', es: 'Costo' },
  'col.costPerQ': { pt: 'Custo/pergunta', en: 'Cost/question', es: 'Costo/pregunta' },
  'col.costPerUser': { pt: 'Custo/usuário', en: 'Cost/user', es: 'Costo/usuario' },
  'col.status': { pt: 'Status', en: 'Status', es: 'Estado' },
  'col.success': { pt: 'Taxa de sucesso', en: 'Success rate', es: 'Tasa de éxito' },
  'col.feedbackTotal': { pt: 'Feedback total', en: 'Total feedback', es: 'Feedback total' },
  'col.users30d': { pt: 'Usuários 30d', en: 'Users 30d', es: 'Usuarios 30d' },
  'col.questions30d': { pt: 'Perguntas 30d', en: 'Questions 30d', es: 'Preguntas 30d' },
  'col.cost30d': { pt: 'Custo 30d', en: 'Cost 30d', es: 'Costo 30d' },

  // Overview
  'ov.title': { pt: 'Visão Geral', en: 'Overview', es: 'Visión General' },
  'ov.desc': { pt: 'Panorama do uso, adoção e custos do AI/BI Genie em todos os workspaces.', en: 'Overview of AI/BI Genie usage, adoption and costs across all workspaces.', es: 'Panorama de uso, adopción y costos de AI/BI Genie en todos los workspaces.' },
  'ov.activeSpaces': { pt: 'Espaços ativos', en: 'Active spaces', es: 'Espacios activos' },
  'ov.activeUsers': { pt: 'Usuários ativos', en: 'Active users', es: 'Usuarios activos' },
  'ov.questions': { pt: 'Perguntas', en: 'Questions', es: 'Preguntas' },
  'ov.successRate': { pt: 'Taxa de sucesso', en: 'Success rate', es: 'Tasa de éxito' },
  'ov.totalCost': { pt: 'Custo total', en: 'Total cost', es: 'Costo total' },
  'ov.costPerQ': { pt: 'Custo / pergunta', en: 'Cost / question', es: 'Costo / pregunta' },
  'ov.attention': { pt: '{n} espaço(s) precisam de atenção', en: '{n} space(s) need attention', es: '{n} espacio(s) requieren atención' },
  'ov.tsTitle': { pt: 'Perguntas e usuários ativos ao longo do tempo', en: 'Questions and active users over time', es: 'Preguntas y usuarios activos en el tiempo' },
  'ov.tsDesc': { pt: 'Volume diário de perguntas e usuários únicos', en: 'Daily volume of questions and unique users', es: 'Volumen diario de preguntas y usuarios únicos' },
  'ov.costByArea': { pt: 'Custo por área', en: 'Cost by area', es: 'Costo por área' },
  'ov.costByAreaDesc': { pt: 'Distribuição de custo no período', en: 'Cost distribution in the period', es: 'Distribución de costo en el período' },
  'ov.adoptionByArea': { pt: 'Adoção por área', en: 'Adoption by area', es: 'Adopción por área' },
  'ov.adoptionByAreaDesc': { pt: 'Usuários ativos por área de negócio', en: 'Active users by business area', es: 'Usuarios activos por área de negocio' },
  'ov.questionsBySpace': { pt: 'Perguntas por espaço', en: 'Questions by space', es: 'Preguntas por espacio' },
  'ov.questionsBySpaceDesc': { pt: 'Top espaços por volume de perguntas', en: 'Top spaces by question volume', es: 'Top espacios por volumen de preguntas' },
  'ov.avgCostLatency': { pt: 'Custo médio por pergunta no período: {c} · Latência média: {l} ms', en: 'Average cost per question in the period: {c} · Average latency: {l} ms', es: 'Costo medio por pregunta en el período: {c} · Latencia media: {l} ms' },

  // Adoption
  'ad.title': { pt: 'Adoção', en: 'Adoption', es: 'Adopción' },
  'ad.desc': { pt: 'Crescimento de usuários, engajamento por área e progresso frente às metas.', en: 'User growth, engagement by area and progress against goals.', es: 'Crecimiento de usuarios, engagement por área y progreso frente a las metas.' },
  'ad.activeUsers': { pt: 'Usuários ativos', en: 'Active users', es: 'Usuarios activos' },
  'ad.newUsers': { pt: 'Novos usuários', en: 'New users', es: 'Nuevos usuarios' },
  'ad.activeAreas': { pt: 'Áreas ativas', en: 'Active areas', es: 'Áreas activas' },
  'ad.qPerUser': { pt: 'Perguntas / usuário', en: 'Questions / user', es: 'Preguntas / usuario' },
  'ad.usersQuestionsByArea': { pt: 'Usuários e perguntas por área', en: 'Users and questions by area', es: 'Usuarios y preguntas por área' },
  'ad.newUsersWeek': { pt: 'Novos usuários por semana', en: 'New users per week', es: 'Nuevos usuarios por semana' },
  'ad.newUsersWeekDesc': { pt: 'Coorte de adoção ao longo do período', en: 'Adoption cohort over the period', es: 'Cohorte de adopción en el período' },
  'ad.heatmap': { pt: 'Mapa de atividade por área e dia da semana', en: 'Activity map by area and weekday', es: 'Mapa de actividad por área y día de la semana' },
  'ad.heatmapDesc': { pt: 'Intensidade de perguntas (verde mais forte = mais uso)', en: 'Question intensity (stronger green = more usage)', es: 'Intensidad de preguntas (verde más fuerte = más uso)' },
  'ad.goals': { pt: 'Progresso frente às metas de adoção (MAU por área)', en: 'Progress against adoption goals (MAU by area)', es: 'Progreso frente a las metas de adopción (MAU por área)' },
  'ad.goalsDesc': { pt: 'Metas configuráveis em Administração', en: 'Goals configurable in Administration', es: 'Metas configurables en Administración' },
  'ad.goal': { pt: 'meta', en: 'goal', es: 'meta' },

  // Usage
  'us.title': { pt: 'Uso', en: 'Usage', es: 'Uso' },
  'us.desc': { pt: 'Volume de perguntas, erros e latência por espaço, usuário e workspace.', en: 'Volume of questions, errors and latency by space, user and workspace.', es: 'Volumen de preguntas, errores y latencia por espacio, usuario y workspace.' },
  'us.errorRate': { pt: 'Taxa de erro', en: 'Error rate', es: 'Tasa de error' },
  'us.avgLatency': { pt: 'Latência média', en: 'Average latency', es: 'Latencia media' },
  'us.questionsBySpace': { pt: 'Perguntas por espaço', en: 'Questions by space', es: 'Preguntas por espacio' },
  'us.questionsBySpaceDesc': { pt: 'Volume no período selecionado', en: 'Volume in the selected period', es: 'Volumen en el período seleccionado' },
  'us.detailBySpace': { pt: 'Detalhe por espaço', en: 'Detail by space', es: 'Detalle por espacio' },
  'us.topUsers': { pt: 'Top 50 usuários', en: 'Top 50 users', es: 'Top 50 usuarios' },
  'us.topUsersDesc': { pt: 'Usuários mais ativos no período', en: 'Most active users in the period', es: 'Usuarios más activos en el período' },

  // Quality
  'ql.title': { pt: 'Qualidade', en: 'Quality', es: 'Calidad' },
  'ql.desc': { pt: 'Feedback dos usuários (👍/👎) por espaço e evolução da taxa de sucesso.', en: 'User feedback (👍/👎) by space and success-rate trend.', es: 'Feedback de usuarios (👍/👎) por espacio y evolución de la tasa de éxito.' },
  'ql.successRate': { pt: 'Taxa de sucesso', en: 'Success rate', es: 'Tasa de éxito' },
  'ql.posFeedback': { pt: 'Feedback positivo', en: 'Positive feedback', es: 'Feedback positivo' },
  'ql.negFeedback': { pt: 'Feedback negativo', en: 'Negative feedback', es: 'Feedback negativo' },
  'ql.totalFeedback': { pt: 'Feedback total', en: 'Total feedback', es: 'Feedback total' },
  'ql.evolution': { pt: 'Evolução da taxa de sucesso', en: 'Success-rate trend', es: 'Evolución de la tasa de éxito' },
  'ql.evolutionDesc': { pt: 'Percentual de feedback positivo por dia', en: 'Percentage of positive feedback per day', es: 'Porcentaje de feedback positivo por día' },
  'ql.worst': { pt: '{n} espaço(s) abaixo de 75% de sucesso — candidatos a revisão de instruções/tabelas', en: '{n} space(s) below 75% success — candidates for instruction/table review', es: '{n} espacio(s) por debajo de 75% de éxito — candidatos a revisión de instrucciones/tablas' },
  'ql.bySpace': { pt: 'Qualidade por espaço', en: 'Quality by space', es: 'Calidad por espacio' },
  'ql.bySpaceDesc': { pt: 'Ordenado do pior para o melhor', en: 'Sorted worst to best', es: 'Ordenado de peor a mejor' },

  // Costs
  'co.title': { pt: 'Custos (FinOps)', en: 'Costs (FinOps)', es: 'Costos (FinOps)' },
  'co.desc': { pt: 'Custo do Genie por espaço, área e SKU, com projeção de run-rate mensal.', en: 'Genie cost by space, area and SKU, with monthly run-rate projection.', es: 'Costo de Genie por espacio, área y SKU, con proyección de run-rate mensual.' },
  'co.totalPeriod': { pt: 'Custo total (período)', en: 'Total cost (period)', es: 'Costo total (período)' },
  'co.costPerUser': { pt: 'Custo / usuário ativo', en: 'Cost / active user', es: 'Costo / usuario activo' },
  'co.runRate': { pt: 'Run-rate mensal (proj.)', en: 'Monthly run-rate (proj.)', es: 'Run-rate mensual (proy.)' },
  'co.daily': { pt: 'Custo diário', en: 'Daily cost', es: 'Costo diario' },
  'co.dailyDesc': { pt: 'Evolução do custo ao longo do período', en: 'Cost trend over the period', es: 'Evolución del costo en el período' },
  'co.bySku': { pt: 'Custo por SKU', en: 'Cost by SKU', es: 'Costo por SKU' },
  'co.bySkuDesc': { pt: 'SQL Serverless vs Model Serving', en: 'SQL Serverless vs Model Serving', es: 'SQL Serverless vs Model Serving' },
  'co.byArea': { pt: 'Custo por área', en: 'Cost by area', es: 'Costo por área' },
  'co.bySpace': { pt: 'Custo por espaço', en: 'Cost by space', es: 'Costo por espacio' },
  'co.efficiency': { pt: 'Eficiência de custo', en: 'Cost efficiency', es: 'Eficiencia de costo' },
  'co.efficiencyDesc': { pt: 'Custo por usuário ativo — no topo, espaços caros com baixa adoção (candidatos a descomissionar)', en: 'Cost per active user — at the top, expensive low-adoption spaces (decommission candidates)', es: 'Costo por usuario activo — arriba, espacios caros con baja adopción (candidatos a desmantelar)' },

  // Spaces
  'sp.title': { pt: 'Espaços', en: 'Spaces', es: 'Espacios' },
  'sp.desc': { pt: 'Inventário completo dos Genie Spaces com sinais de governança. Clique para ver o detalhe.', en: 'Full Genie Spaces inventory with governance signals. Click to view detail.', es: 'Inventario completo de Genie Spaces con señales de gobierno. Clic para ver el detalle.' },
  'sp.searchPlaceholder': { pt: 'Buscar espaço...', en: 'Search space...', es: 'Buscar espacio...' },
  'sp.count': { pt: '{n} de {total} espaços · custo 30d (total): {cost}', en: '{n} of {total} spaces · 30d cost (total): {cost}', es: '{n} de {total} espacios · costo 30d (total): {cost}' },
  'sp.inventory': { pt: 'Inventário de espaços', en: 'Spaces inventory', es: 'Inventario de espacios' },

  // Space detail
  'sd.back': { pt: 'Voltar ao inventário', en: 'Back to inventory', es: 'Volver al inventario' },
  'sd.users30d': { pt: 'Usuários (30d)', en: 'Users (30d)', es: 'Usuarios (30d)' },
  'sd.questions30d': { pt: 'Perguntas (30d)', en: 'Questions (30d)', es: 'Preguntas (30d)' },
  'sd.cost30d': { pt: 'Custo (30d)', en: 'Cost (30d)', es: 'Costo (30d)' },
  'sd.successRate': { pt: 'Taxa de sucesso', en: 'Success rate', es: 'Tasa de éxito' },
  'sd.card': { pt: 'Ficha do espaço', en: 'Space profile', es: 'Ficha del espacio' },
  'sd.owner': { pt: 'Owner', en: 'Owner', es: 'Owner' },
  'sd.area': { pt: 'Área', en: 'Area', es: 'Área' },
  'sd.workspace': { pt: 'Workspace', en: 'Workspace', es: 'Workspace' },
  'sd.warehouse': { pt: 'Warehouse', en: 'Warehouse', es: 'Warehouse' },
  'sd.tables': { pt: 'Tabelas expostas', en: 'Exposed tables', es: 'Tablas expuestas' },
  'sd.created': { pt: 'Criado em', en: 'Created on', es: 'Creado el' },
  'sd.lastActivity': { pt: 'Última atividade', en: 'Last activity', es: 'Última actividad' },
  'sd.trend': { pt: 'Tendência de uso', en: 'Usage trend', es: 'Tendencia de uso' },
  'sd.trendDesc': { pt: 'Perguntas e usuários no período', en: 'Questions and users in the period', es: 'Preguntas y usuarios en el período' },
  'sd.topUsers': { pt: 'Top usuários do espaço', en: 'Top users of the space', es: 'Top usuarios del espacio' },
  'sd.annotations': { pt: 'Anotações de governança', en: 'Governance annotations', es: 'Anotaciones de gobierno' },
  'sd.annotationsDesc': { pt: 'Notas persistidas em Lakebase', en: 'Notes persisted in Lakebase', es: 'Notas persistidas en Lakebase' },
  'sd.annotationPlaceholder': { pt: 'Adicionar anotação (ex.: revisar owner, migrar de área...)', en: 'Add annotation (e.g. review owner, move area...)', es: 'Agregar anotación (ej.: revisar owner, mover de área...)' },
  'sd.add': { pt: 'Adicionar', en: 'Add', es: 'Agregar' },
  'sd.noAnnotations': { pt: 'Nenhuma anotação ainda.', en: 'No annotations yet.', es: 'Aún no hay anotaciones.' },

  // Admin
  'am.title': { pt: 'Administração', en: 'Administration', es: 'Administración' },
  'am.desc': { pt: 'Metas de adoção, thresholds de alerta e saúde das conexões. Persistido em Lakebase.', en: 'Adoption goals, alert thresholds and connection health. Persisted in Lakebase.', es: 'Metas de adopción, thresholds de alerta y salud de las conexiones. Persistido en Lakebase.' },
  'am.lakebaseOk': { pt: 'Lakebase conectado', en: 'Lakebase connected', es: 'Lakebase conectado' },
  'am.lakebaseErr': { pt: 'Lakebase indisponível', en: 'Lakebase unavailable', es: 'Lakebase no disponible' },
  'am.checking': { pt: 'Verificando conexão...', en: 'Checking connection...', es: 'Verificando conexión...' },
  'am.goals': { pt: 'Metas de adoção (MAU por área)', en: 'Adoption goals (MAU by area)', es: 'Metas de adopción (MAU por área)' },
  'am.goalsDesc': { pt: 'Usadas na página de Adoção para medir progresso', en: 'Used on the Adoption page to measure progress', es: 'Usadas en la página de Adopción para medir el progreso' },
  'am.thresholds': { pt: 'Thresholds de alerta', en: 'Alert thresholds', es: 'Thresholds de alerta' },
  'am.thresholdsDesc': { pt: 'Parâmetros de governança e FinOps', en: 'Governance and FinOps parameters', es: 'Parámetros de gobierno y FinOps' },
  'am.workspaces': { pt: 'Workspaces monitorados', en: 'Monitored workspaces', es: 'Workspaces monitoreados' },
  'am.workspacesDesc': { pt: 'Derivados das views de abstração do Genie', en: 'Derived from the Genie abstraction views', es: 'Derivados de las vistas de abstracción del Genie' },
  'am.workspacesTotal': { pt: 'Total: {n} workspace(s). O mapeamento espaço→área vem das views v_genie_*; em produção, aponte-as para suas system tables.', en: 'Total: {n} workspace(s). The space→area mapping comes from the v_genie_* views; in production, point them to your system tables.', es: 'Total: {n} workspace(s). El mapeo espacio→área viene de las vistas v_genie_*; en producción, apúntelas a sus system tables.' },
  'am.loading': { pt: 'Carregando...', en: 'Loading...', es: 'Cargando...' },
  'am.saved': { pt: 'Salvo.', en: 'Saved.', es: 'Guardado.' },

  // Billing / Paygo
  'nav.billing': { pt: 'Cobrança', en: 'Billing', es: 'Facturación' },
  'pg.title': { pt: 'Cobrança do Genie (Paygo)', en: 'Genie Billing (Paygo)', es: 'Facturación de Genie (Paygo)' },
  'pg.desc': { pt: 'Projeção de custo de LLM e controle de orçamento por usuário, no modelo pay-as-you-go do Genie.', en: 'LLM cost projection and per-user budget control under the Genie pay-as-you-go model.', es: 'Proyección de costo de LLM y control de presupuesto por usuario en el modelo pay-as-you-go de Genie.' },
  'pg.model': {
    pt: 'Modelo Genie Paygo: 150 DBUs de LLM grátis por usuário/mês (~US$ 10,50), SKU Serverless Realtime Inference a US$ 0,07/DBU. Promoção de 25% até 31/jan/2027. Estimativa mensal com base nos últimos 30 dias.',
    en: 'Genie Paygo model: 150 free LLM DBUs per user/month (~US$ 10.50), Serverless Realtime Inference SKU at US$ 0.07/DBU. 25% promo through Jan 31, 2027. Monthly estimate based on the last 30 days.',
    es: 'Modelo Genie Paygo: 150 DBUs de LLM gratis por usuario/mes (~US$ 10.50), SKU Serverless Realtime Inference a US$ 0.07/DBU. Promo del 25% hasta 31/ene/2027. Estimación mensual según los últimos 30 días.',
  },
  'pg.note': {
    pt: 'O tier grátis (150 DBU) não aparece em system tables; esta visão usa o modelo de estimativa. Em produção, o custo pago vem de billing_origin_product = \'GENIE\'.',
    en: 'The free tier (150 DBU) is not shown in system tables; this view uses the estimation model. In production, paid cost comes from billing_origin_product = \'GENIE\'.',
    es: 'El tier gratis (150 DBU) no aparece en system tables; esta vista usa el modelo de estimación. En producción, el costo pagado viene de billing_origin_product = \'GENIE\'.',
  },
  'pg.payingUsers': { pt: 'Usuários pagantes', en: 'Paying users', es: 'Usuarios que pagan' },
  'pg.totalDbus': { pt: 'DBUs de LLM (mês)', en: 'LLM DBUs (month)', es: 'DBUs de LLM (mes)' },
  'pg.freeDbus': { pt: 'DBUs grátis (abatidos)', en: 'Free DBUs (waived)', es: 'DBUs gratis (descontados)' },
  'pg.paidDbus': { pt: 'DBUs pagos', en: 'Paid DBUs', es: 'DBUs pagados' },
  'pg.paidCost': { pt: 'Custo pago (list)', en: 'Paid cost (list)', es: 'Costo pagado (list)' },
  'pg.projMonth': { pt: 'Projeção mensal (c/ promo)', en: 'Monthly projection (w/ promo)', es: 'Proyección mensual (c/ promo)' },
  'pg.distribution': { pt: 'Distribuição de usuários por consumo de DBU', en: 'User distribution by DBU consumption', es: 'Distribución de usuarios por consumo de DBU' },
  'pg.distributionDesc': { pt: 'Até 150 DBU = dentro do tier grátis', en: 'Up to 150 DBU = within the free tier', es: 'Hasta 150 DBU = dentro del tier gratis' },
  'pg.userTable': { pt: 'Consumo e orçamento por usuário', en: 'Per-user consumption and budget', es: 'Consumo y presupuesto por usuario' },
  'pg.userTableDesc': { pt: 'Defina overrides de orçamento por usuário (estilo Unity AI Gateway). Padrão configurável em Administração.', en: 'Set per-user budget overrides (Unity AI Gateway style). Default configurable in Administration.', es: 'Defina overrides de presupuesto por usuario (estilo Unity AI Gateway). Predeterminado configurable en Administración.' },
  'pg.defaultBudget': { pt: 'Orçamento padrão/usuário', en: 'Default budget/user', es: 'Presupuesto predet./usuario' },
  'pg.colDbus': { pt: 'DBUs (mês)', en: 'DBUs (month)', es: 'DBUs (mes)' },
  'pg.colFreePct': { pt: '% do grátis', en: '% of free', es: '% del gratis' },
  'pg.colPaidDbus': { pt: 'DBUs pagos', en: 'Paid DBUs', es: 'DBUs pagados' },
  'pg.colPaidCost': { pt: 'Custo (promo)', en: 'Cost (promo)', es: 'Costo (promo)' },
  'pg.colBudget': { pt: 'Orçamento', en: 'Budget', es: 'Presupuesto' },
  'pg.colVsBudget': { pt: 'Uso do orçamento', en: 'Budget usage', es: 'Uso del presupuesto' },
  'pg.statusOver': { pt: 'Estourado', en: 'Over budget', es: 'Excedido' },
  'pg.statusAlert': { pt: 'Alerta', en: 'Alert', es: 'Alerta' },
  'pg.statusOk': { pt: 'OK', en: 'OK', es: 'OK' },
};

// Weekday short labels per language (index 0 = Sunday).
export const DOW_LABELS: Record<Lang, string[]> = {
  pt: ['Dom', 'Seg', 'Ter', 'Qua', 'Qui', 'Sex', 'Sáb'],
  en: ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'],
  es: ['Dom', 'Lun', 'Mar', 'Mié', 'Jue', 'Vie', 'Sáb'],
};

export type TFn = (key: string, vars?: Record<string, string | number>) => string;

interface I18nValue {
  lang: Lang;
  setLang: (l: Lang) => void;
  t: TFn;
}

const I18nContext = createContext<I18nValue | null>(null);

function readLang(): Lang {
  const v = typeof localStorage !== 'undefined' ? localStorage.getItem('genie_lang') : null;
  return v === 'en' || v === 'es' || v === 'pt' ? v : 'pt';
}

export function I18nProvider({ children }: { children: ReactNode }) {
  const [lang, setLangState] = useState<Lang>(readLang);

  const setLang = useCallback((l: Lang) => {
    setLangState(l);
    try {
      localStorage.setItem('genie_lang', l);
    } catch {
      // ignore storage errors
    }
  }, []);

  const t = useCallback<TFn>(
    (key, vars) => {
      let s = DICT[key]?.[lang] ?? key;
      if (vars) {
        for (const [k, v] of Object.entries(vars)) {
          s = s.replace(`{${k}}`, String(v));
        }
      }
      return s;
    },
    [lang],
  );

  const value = useMemo<I18nValue>(() => ({ lang, setLang, t }), [lang, setLang, t]);
  return <I18nContext.Provider value={value}>{children}</I18nContext.Provider>;
}

export function useI18n(): I18nValue {
  const ctx = useContext(I18nContext);
  if (!ctx) throw new Error('useI18n must be used within I18nProvider');
  return ctx;
}

export function useT(): TFn {
  return useI18n().t;
}

export function LanguageSwitcher({ compact = false }: { compact?: boolean }) {
  const { lang, setLang } = useI18n();
  return (
    <div className={`flex items-center gap-1 ${compact ? 'flex-col' : ''}`}>
      {LANGS.map((l) => (
        <button
          key={l.code}
          type="button"
          onClick={() => setLang(l.code)}
          title={l.label}
          aria-label={l.label}
          className={`flex h-7 w-7 items-center justify-center rounded-md text-base transition-colors ${
            lang === l.code
              ? 'bg-sidebar-primary/20 ring-1 ring-sidebar-primary'
              : 'opacity-60 hover:opacity-100'
          }`}
        >
          <span>{l.flag}</span>
        </button>
      ))}
    </div>
  );
}
