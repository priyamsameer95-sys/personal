/* First-party chart geometry. The same functions run in browser and tests. */
(function (root, factory) {
  const charts = factory();
  if (typeof module === 'object' && module.exports) module.exports = charts;
  else root.PriyamCharts = charts;
})(typeof globalThis === 'object' ? globalThis : this, function () {
  'use strict';
  const COLORS = { source: '#8c8578', home: '#68675f', work: '#426b9b', cv: '#54805b', art: '#b46f83', github: '#8274a3', blog: '#598d88', action: '#c1914d', ended: '#bd7866', in_progress: '#87966b', continued: '#aaa18f', other: '#b4ad9f' };
  function color(node) {
    if (COLORS[node.kind]) return COLORS[node.kind];
    const value = String(node.path || node.id || node.label || '').toLowerCase();
    if (/cv|download|saved|contact|copied/.test(value)) return COLORS.cv;
    if (/product|work|silkroute|eduloans|riskstac|college/.test(value)) return COLORS.work;
    if (/github|demo/.test(value)) return COLORS.github;
    if (/art|paint/.test(value)) return COLORS.art;
    if (/blog|writing/.test(value)) return COLORS.blog;
    return COLORS.home;
  }
  function safeCount(value) { return Number.isFinite(Number(value)) && Number(value) >= 0 ? Number(value) : 0; }
  function sankey(data, options = {}) {
    const width = options.width || 1240, height = options.height || 560;
    const top = 52, bottom = 24, nodeWidth = 14, gap = 28;
    const nodes = (data.nodes || []).map(node => ({ ...node, count: safeCount(node.count), stage: Math.max(0, Number(node.stage) || 0) }));
    const stages = [...new Set(nodes.map(node => node.stage))].sort((a, b) => a - b);
    const available = height - top - bottom;
    const scale = stages.length ? Math.min(...stages.map(stage => {
      const group = nodes.filter(node => node.stage === stage);
      const total = group.reduce((sum, node) => sum + node.count, 0);
      return total ? Math.max(0, available - gap * (group.length - 1)) / total : 1;
    })) : 1;
    const columnWidth = (width - 36) / Math.max(stages.length, 1);
    stages.forEach((stage, index) => {
      const group = nodes.filter(node => node.stage === stage).sort((a, b) => b.count - a.count || String(a.label).localeCompare(String(b.label)));
      let y = top + (available - group.reduce((sum, node) => sum + node.count * scale, 0) - gap * (group.length - 1)) / 2;
      group.forEach(node => { node.x = 12 + index * columnWidth; node.y = y; node.height = node.count * scale; node.width = nodeWidth; node.color = color(node); y += node.height + gap; });
    });
    const byId = new Map(nodes.map(node => [node.id, node]));
    const outgoing = new Map(), incoming = new Map();
    const links = (data.links || []).filter(link => byId.has(link.source) && byId.has(link.target) && safeCount(link.count) > 0).map(link => ({ ...link, count: safeCount(link.count), sourceNode: byId.get(link.source), targetNode: byId.get(link.target) }));
    links.sort((a, b) => a.sourceNode.x - b.sourceNode.x || a.sourceNode.y - b.sourceNode.y || a.targetNode.y - b.targetNode.y);
    for (const link of links) {
      const source = link.sourceNode, target = link.targetNode, thickness = link.count * scale;
      const sy = source.y + (outgoing.get(source.id) || 0) + thickness / 2;
      const ty = target.y + (incoming.get(target.id) || 0) + thickness / 2;
      outgoing.set(source.id, (outgoing.get(source.id) || 0) + thickness);
      incoming.set(target.id, (incoming.get(target.id) || 0) + thickness);
      const sx = source.x + nodeWidth, tx = target.x, bend = (tx - sx) * .5;
      link.width = thickness; link.color = source.color;
      link.path = `M${sx},${sy} C${sx + bend},${sy} ${tx - bend},${ty} ${tx},${ty}`;
    }
    return { width, height, nodes, links, stages, scale, columnWidth };
  }
  function funnel(stages, options = {}) {
    const width = options.width || 1120, height = options.height || 310, baseline = height - 32, top = 30;
    const max = Math.max(1, ...stages.map(stage => safeCount(stage.count))), slot = width / Math.max(1, stages.length);
    return { width, height, max, stages: stages.map((stage, index) => {
      const count = safeCount(stage.count), next = stages[index + 1], barHeight = count / max * (baseline - top), x = index * slot + 8, barWidth = slot - 26;
      const nextHeight = next ? safeCount(next.count) / max * (baseline - top) : barHeight;
      return { ...stage, count, x, y: baseline - barHeight, width: barWidth, height: barHeight, color: ['#426b9b', '#598d88', '#8274a3', '#c1914d', '#54805b', '#b46f83'][index % 6],
        connector: next ? `M${x + barWidth},${baseline - barHeight} L${(index + 1) * slot + 8},${baseline - nextHeight} L${(index + 1) * slot + 8},${baseline} L${x + barWidth},${baseline} Z` : null,
        fromStart: stages[0] && safeCount(stages[0].count) ? count / safeCount(stages[0].count) : null,
        fromPrevious: index && safeCount(stages[index - 1].count) ? count / safeCount(stages[index - 1].count) : (index === 0 && count ? 1 : null),
      };
    }) };
  }
  function line(rows, fields, options = {}) {
    const width = options.width || 1100, height = options.height || 220, left = 45, right = width - 15, top = 16, bottom = height - 28;
    const max = Math.max(1, ...rows.flatMap(row => fields.map(field => safeCount(row[field]))));
    const x = index => rows.length < 2 ? (left + right) / 2 : left + index * (right - left) / (rows.length - 1);
    const y = value => bottom - safeCount(value) / max * (bottom - top);
    return { width, height, max, left, right, top, bottom, lines: fields.map(field => {
      let connected = false; const segments = [];
      const points = rows.map((row, index) => {
        const missing = row[field] === null || row[field] === undefined || !Number.isFinite(Number(row[field]));
        const point = { x: x(index), y: missing ? null : y(row[field]), value: row[field], date: row.date, missing };
        if (missing) connected = false;
        else { segments.push(`${connected ? 'L' : 'M'}${point.x},${point.y}`); connected = true; }
        return point;
      });
      return { field, points, path: segments.join(' ') };
    }) };
  }
  function csv(headers, rows) {
    const cell = value => { const raw = String(value ?? ''); const safe = /^[\s\x00-\x1f]*[=+\-@]/.test(raw) ? `'${raw}` : raw; return `"${safe.replace(/"/g, '""')}"`; };
    return [headers, ...rows].map(row => row.map(cell).join(',')).join('\r\n');
  }
  return { sankey, funnel, line, color, csv };
});
