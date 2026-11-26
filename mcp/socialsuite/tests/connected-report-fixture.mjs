import { randomUUID } from 'node:crypto';

export function connectedReportFixture() {
  const seo = randomUUID(), analytics = randomUUID();
  const period = { start: '2026-11-19', end: '2026-11-25' };
  const metric = (key, field = 'number', grains = ['total'], available = true) => ({ key, label: key, field, grains, available, aggregation: 'period', unit: field });
  const groups = [
    { mappingId: seo, source: 'seo', sourceLabel: 'SEO', account: 'Example practice', status: 'connected', metrics: [
      metric('averageRank'), metric('top10Share', 'percentage'), metric('contentScore'), metric('domainTrust'),
      ...['currentPosition', 'previousPosition', 'rankingCheckDate'].map(key => metric(key, key.endsWith('Date') ? 'date' : 'text', ['keyword'])),
    ] },
    { mappingId: analytics, source: 'ga4', sourceLabel: 'Analytics', account: 'Example property', status: 'connected', metrics: [
      metric('providerSpecificMetric_2026'), metric('missingProviderMetric', 'number', ['total'], false),
    ] },
  ];
  // Model an agent choosing returned keys/fields, including an unfamiliar provider metric.
  const cards = groups.flatMap(group => group.metrics.filter(m => m.grains.includes('total')).map(m => ({
    id: randomUUID(), label: m.label, kind: 'connected', field: m.field, metric: m.key,
    mappingId: group.mappingId, aggregation: m.aggregation,
  })));
  const scores = { id: randomUUID(), grain: 'total', columns: cards, rows: [], values: {}, totals: false };
  const keywords = { id: randomUUID(), grain: 'keyword', recordHeading: 'Keyword', rows: [], values: {}, totals: false,
    columns: groups[0].metrics.filter(m => m.grains.includes('keyword')).map(m => ({
      id: randomUUID(), label: m.label, kind: 'connected', field: m.field, metric: m.key, mappingId: seo, aggregation: m.aggregation,
    })), rowLabels: { [`keyword:${seo}/stable-keyword-1`]: 'Keyword label' },
  };
  const document = { name: 'Connected performance report', description: 'Created from available source metrics', period, comparison: 'previous',
    branding: { agencyLogo: '', clientLogo: '', accent: '#2563eb', font: 'Inter', footer: 'Agency' },
    blocks: [
      ...cards.map(c => ({ id: randomUUID(), type: 'kpi', title: c.label, description: '', internal: false, tableId: scores.id, columnId: c.id })),
      { id: randomUUID(), type: 'table', title: 'Keyword rankings', description: '', internal: false, tableId: keywords.id },
    ],
  };
  const cache = [
    { mappingId: seo, period, totals: { averageRank: 9.5, top10Share: 0.55, contentScore: 76, domainTrust: 28 }, campaigns: [], refreshedAt: '2026-11-26T02:00:00Z',
      snapshots: { contentScore: { value: 76, asOf: '2026-11-26' }, domainTrust: { value: 28, asOf: '2026-11-24' } },
      keywords: [
        { id: 'stable-keyword-1', label: 'dentist', metrics: { currentPosition: 5, previousPosition: 12, rankingCheckDate: '2026-11-25' } },
        { id: 'stable-keyword-2', label: 'dentist', metrics: { currentPosition: 'Unranked', previousPosition: 'No earlier check', rankingCheckDate: '2026-11-25' } },
      ],
    },
    { mappingId: analytics, period, totals: { providerSpecificMetric_2026: 42, missingProviderMetric: null }, campaigns: [], refreshedAt: '2026-11-26T02:00:00Z' },
  ];
  return { groups, draft: { reportId: randomUUID(), clientId: randomUUID(), revision: -1, document, datasets: [scores, keywords] }, cache };
}
