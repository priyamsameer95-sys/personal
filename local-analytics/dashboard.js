'use strict';

(() => {
  const $ = id => document.getElementById(id), C = globalThis.PriyamCharts;
  const number = value => value === null || value === undefined || !Number.isFinite(Number(value)) ? '—' : new Intl.NumberFormat('en-IN').format(Number(value));
  const countLabel = (value, noun, plural = `${noun}s`) => `${number(value)} ${Number(value) === 1 ? noun : plural}`;
  const duration = value => value === null || value === undefined || !Number.isFinite(Number(value)) ? '—' : (value < 1000 ? '0s' : value < 60000 ? `${Math.round(value / 1000)}s` : `${Math.floor(value / 60000)}m ${Math.round(value % 60000 / 1000)}s`);
  const percent = value => value === null || value === undefined || !Number.isFinite(value) ? '—' : `${(value * 100).toFixed(value === 0 || value === 1 ? 0 : 1)}%`;
  const date = (value, time = false) => {
    const parsed = new Date(typeof value === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(value) ? `${value}T12:00:00+05:30` : value);
    return Number.isFinite(parsed.getTime()) ? new Intl.DateTimeFormat('en-IN', { day: 'numeric', month: 'short', year: 'numeric', timeZone: 'Asia/Kolkata', ...(time ? { hour: '2-digit', minute: '2-digit' } : {}) }).format(parsed) : 'Unavailable';
  };
  const day = value => new Intl.DateTimeFormat('en-CA', { timeZone: 'Asia/Kolkata', year: 'numeric', month: '2-digit', day: '2-digit' }).format(value);
  const ACTIONS = { page_view: 'Page visited', navigation_clicked: 'Navigation', outbound_clicked: 'Website link', cv_opened: 'CV form opened', cv_submitted: 'CV form submitted', cv_request_saved: 'CV request saved', cv_request_rejected: 'CV request rejected', cv_download_initiated: 'Download initiated', cv_download_clicked: 'CV download attempt', contact_opened: 'Contact options opened', contact_clicked: 'Contact chosen', email_copied: 'Email copied', media_opened: 'Image enlarged', video_started: 'Video started', video_progress: 'Video watched', video_completed: 'Video completed', demo_started: 'Demo launched', filter_changed: 'Filter changed', menu_opened: 'Menu opened', cta_viewed: 'Button seen', section_viewed: 'Section seen', scroll_depth_reached: 'Scroll milestone', evidence: 'Evidence interaction', conversion: 'CV or contact action' };
  const TITLES = { '/': 'Home', '/product': 'Selected work', '/cv': 'Experience', '/github': 'GitHub projects', '/art': 'Art', '/blog': 'Writing' };
  const s = { view: 'overview', hidden: false, version: 0, refreshVersion: 0, overviewLoading: false, exportVersion: 0, overview: null, legacy: null, journey: null, funnel: null, pages: null, health: null, leads: null, funnelMode: 'funnel', journeyHistory: [], selectedPage: '', saved: [] };
  let chartNumber = 0;
  const el = (tag, text, className) => { const n = document.createElement(tag); if (text !== undefined && text !== null) n.textContent = String(text); if (className) n.className = className; return n; };
  const svgEl = (tag, attributes = {}, text) => { const n = document.createElementNS('http://www.w3.org/2000/svg', tag); for (const [key, value] of Object.entries(attributes)) n.setAttribute(key, String(value)); if (text !== undefined) n.textContent = String(text); return n; };
  const replace = (id, nodes) => $(id).replaceChildren(...nodes);
  function button(text, action, className = 'quiet') { const n = el('button', text, className); n.type = 'button'; n.addEventListener('click', action); return n; }
  function title(path) { return TITLES[path] || (s.overview?.filters?.paths || []).find(row => typeof row === 'object' && row.path === path)?.title || path; }
  function table(headers, rows, caption) {
    const t = el('table'), head = el('thead'), hr = el('tr'), body = el('tbody');
    if (caption) t.append(el('caption', caption));
    for (const name of headers) { const th = el('th', name); th.scope = 'col'; hr.append(th); } head.append(hr);
    for (const row of rows) { const tr = el('tr'); row.forEach((value, index) => { const cell = el(index ? 'td' : 'th'); if (!index) cell.scope = 'row'; if (value && typeof value === 'object' && value.nodeType) cell.append(value); else cell.textContent = String(value ?? '—'); tr.append(cell); }); body.append(tr); }
    t.append(head, body); return t;
  }
  function empty(heading, text) { const n = el('div', null, 'empty-state'); n.append(el('span', '↗', 'empty-icon'), el('h3', heading), el('p', text)); return n; }
  function errorMessage(error) { return error instanceof Error ? error.message : 'The report could not be loaded. Please try again.'; }
  async function api(endpoint, body = {}) {
    const response = await fetch(endpoint, { method: 'POST', credentials: 'same-origin', mode: 'same-origin', cache: 'no-store', headers: { 'Content-Type': 'application/json', 'X-Local-Analytics': '1' }, body: JSON.stringify(body), signal: AbortSignal.timeout(20000) });
    if (!response.ok) { let payload; try { payload = await response.json(); } catch {} const error = new Error(payload?.error || 'The live report could not be reached. Please try again.'); error.status = response.status; error.code = payload?.code; throw error; }
    return endpoint === '/api/export' ? response.blob() : response.json();
  }
  function filters() {
    const range = $('date-range').value, body = {};
    if (range === 'today' || range === 'yesterday') { const now = new Date(Date.now() - (range === 'yesterday' ? 86400000 : 0)); body.startDate = body.endDate = day(now); }
    else if (range === 'custom') { body.startDate = $('start-date').value; body.endDate = $('end-date').value; }
    else body.days = Number(range);
    for (const [key, id] of [['device', 'device-filter'], ['source', 'source-filter'], ['path', 'page-filter']]) if ($(id).value) body[key] = $(id).value;
    return body;
  }
  function explore(view, extra = {}) { return api('/api/explore', { ...filters(), view, ...extra }); }
  function coverage(data) { const started = data?.coverage?.startedAt; return started ? `Journey measurement since ${date(started, true)}. Older visits do not have reconstructable paths.` : 'Journey and timing history starts with the updated tracking. Historical totals remain available; earlier paths cannot be reconstructed.'; }
  function setOptions(id, entries, initial) {
    const select = $(id), selected = select.value, selectedLabel = select.selectedOptions[0]?.textContent || title(selected); select.replaceChildren(); const first = el('option', initial); first.value = ''; select.append(first);
    for (const entry of entries) { const value = typeof entry === 'string' ? entry : (entry.path || entry.name || entry.value); if (!value) continue; const option = el('option', typeof entry === 'string' ? title(entry) : (entry.title || entry.label || value)); option.value = value; select.append(option); }
    if (selected && ![...select.options].some(option => option.value === selected)) { const retained = el('option', selectedLabel); retained.value = selected; select.append(retained); }
    select.value = selected;
  }
  function metricCards(rows) {
    return rows.map(([label, value, note]) => { const n = el('div', null, 'metric'); n.append(el('p', label), el('strong', typeof value === 'string' ? value : number(value)), el('span', note)); return n; });
  }
  function renderMetrics(data) {
    const summary = data.summary || {}, old = data.legacy || s.legacy;
    const historical = Boolean(old && !filters().device && !filters().source && !filters().path);
    const range = data.range || old || {};
    $('report-period').textContent = range.startDate ? `${date(range.startDate)} – ${date(range.endDate)} · IST` : 'Selected period · IST';
    $('totals-summary').hidden = !historical;
    replace('metrics', historical ? metricCards([
      ['Unique visitors', old.uniqueVisitors, old.uniqueTrackingStartedAt ? `Selected period · browser records since ${date(old.uniqueTrackingStartedAt)}` : 'Selected period · recorded browsers'],
      ['Page views', old.pageViews, 'Selected period · includes earlier page-view records'],
      ['CV requests saved · all time', old.cvRequestsAllTime, `${countLabel(old.cvContacts, 'email address', 'email addresses')} · ${countLabel(old.excludedCVRequests, 'test request')} excluded`],
    ]) : []);
    $('visitor-note').textContent = historical ? `Visitors estimate browsers, not verified people. ${old.uniqueTrackedPageViews !== undefined && old.uniqueTrackedPageViews !== null ? `${number(old.uniqueTrackedPageViews)} of ${number(old.pageViews)} page views have browser identification. ` : ''}Saved CV requests record access granted after email submission; completed PDF transfers were not measured.` : '';
    const started = data.coverage?.startedAt;
    $('detailed-period').textContent = started ? `Measured since ${date(started, true)} IST · within the selected period.` : 'Awaiting the first recorded session with detailed tracking.';
    replace('detailed-metrics', metricCards([
      ['Tracked visitors', data.available ? summary.browsers : null, 'Distinct browsers in this detailed coverage'],
      ['Tracked sessions', data.available ? summary.sessions : null, 'A new session starts after 30 minutes of inactivity'],
      ['Tracked page views', data.available ? summary.views : null, 'Page arrivals in this detailed coverage'],
      ['Avg. active time', data.available ? duration(summary.avgActiveMs) : '—', data.available && summary.avgSessionActiveMs !== null && summary.avgSessionActiveMs !== undefined ? `Per measured view · ${duration(summary.avgSessionActiveMs)} per session` : 'Per measured page view'],
      ['CV download starts', data.available ? summary.cvDownloadStarts : null, 'Recorded browser download actions · this detailed coverage'],
      ['Contact actions', data.available ? summary.contactActions : null, 'Channel clicks & successful copies · this detailed coverage'],
    ]));
    $('detailed-note').textContent = `${historical ? 'These detailed counts cover the same browsers and time window; they are a subset of the recorded traffic above. ' : ''}${summary.measuredViews !== undefined && summary.views ? `${number(summary.measuredViews)} of ${number(summary.views)} tracked page views have timing measurements. ` : ''}${started ? 'Earlier sessions and paths cannot be reconstructed.' : 'Historical totals remain available; earlier sessions and paths cannot be reconstructed.'}`;
  }
  function breakdown(id, rows, noData, metric = number) {
    if (!rows.length) return replace(id, [el('p', noData, 'empty')]);
    const max = Math.max(1, ...rows.map(row => Number(row.count) || 0)), list = el('ol', null, 'breakdown');
    for (const row of rows) { const item = el('li'), label = el('div', null, 'row-label'); label.append(el('span', row.label || row.name), el('strong', metric(row.count))); const track = el('div', null, 'bar-track'), bar = el('div', null, 'bar-value'); track.setAttribute('aria-hidden', 'true'); bar.style.width = `${Math.max(0, Number(row.count) || 0) / max * 100}%`; track.append(bar); item.append(label, track); list.append(item); }
    replace(id, [list]);
  }
  function download(blob, filename) { const url = URL.createObjectURL(blob), a = el('a'); a.href = url; a.download = filename; document.body.append(a); a.click(); a.remove(); setTimeout(() => URL.revokeObjectURL(url), 1500); }
  function filterDescription() { return [['Device', $('device-filter').value || 'All'], ['Source', $('source-filter').value || 'All'], ['Page', $('page-filter').value || 'All']].map(([name, value]) => `${name}: ${value}`).join(' · '); }
  function exportSVG(svg, heading) {
    const clone = svg.cloneNode(true); clone.setAttribute('xmlns', 'http://www.w3.org/2000/svg');
    const style = svgEl('style', {}, '.node-name{fill:#24251f;font:11px Arial}.node-count,.stage-heading{fill:#77786b;font:10px Arial}.graph-link{fill:none;stroke-opacity:.3}.graph-link-hit{stroke:transparent;fill:none}.visible-node{rx:2}'); clone.insertBefore(style, clone.firstChild);
    const info = svgEl('title', {}, `${heading} · ${$('report-period').textContent} · ${filterDescription()}`); clone.insertBefore(info, clone.firstChild);
    return new Blob([new XMLSerializer().serializeToString(clone)], { type: 'image/svg+xml;charset=utf-8' });
  }
  function chartTools(card, svg, heading, columns, rows) {
    const tools = el('div', null, 'chart-tools'), status = el('p', '', 'export-notice'); status.setAttribute('role', 'status');
    const name = heading.toLowerCase().replace(/[^a-z0-9]+/g, '-');
    tools.append(button('CSV', () => download(new Blob([C.csv(['Report', heading], [['Period', $('report-period').textContent], ['Filters', filterDescription()], [], columns, ...rows])], { type: 'text/csv;charset=utf-8' }), `${name}.csv`)));
    if (svg) {
      tools.append(button('SVG', () => download(exportSVG(svg, heading), `${name}.svg`)));
      tools.append(button('PNG', async () => {
        try { const blob = exportSVG(svg, heading), url = URL.createObjectURL(blob), image = new Image(); await new Promise((resolve, reject) => { image.onload = resolve; image.onerror = reject; image.src = url; }); const vb = svg.viewBox.baseVal, canvas = document.createElement('canvas'); canvas.width = Math.ceil(vb.width * 2); canvas.height = Math.ceil(vb.height * 2 + 100); const ctx = canvas.getContext('2d'); ctx.fillStyle = '#fffdf8'; ctx.fillRect(0, 0, canvas.width, canvas.height); ctx.fillStyle = '#24251f'; ctx.font = '24px Arial'; ctx.fillText(`${heading} · ${$('report-period').textContent}`, 28, 39); ctx.drawImage(image, 0, 72, vb.width * 2, vb.height * 2); URL.revokeObjectURL(url); const png = await new Promise(resolve => canvas.toBlob(resolve, 'image/png')); if (png) download(png, `${name}.png`); else throw Error(); }
        catch { status.textContent = 'The image could not be exported. SVG and CSV are still available.'; }
      }));
      if (card.requestFullscreen) tools.append(button('Expand ↗', () => card.requestFullscreen().catch(() => { status.textContent = 'Full-screen view is unavailable in this browser.'; })));
    }
    return { tools, status };
  }
  function chartTitle(svg, heading, description) { const id = `chart-${++chartNumber}`; svg.setAttribute('role', 'group'); svg.setAttribute('aria-labelledby', `${id}-title ${id}-description`); svg.append(svgEl('title', { id: `${id}-title` }, heading), svgEl('desc', { id: `${id}-description` }, description)); }
  function activation(node, action) { node.addEventListener('click', action); node.addEventListener('keydown', event => { if (event.key === 'Enter' || event.key === ' ') { event.preventDefault(); action(); } }); }
  function selectAnchor(anchor, direction = 'after') {
    if (!anchor) return;
    s.journeyHistory.push({ anchor: $('journey-anchor').value, direction: $('journey-direction').value });
    if (![...$('journey-anchor').options].some(option => option.value === anchor)) { const option = el('option', title(anchor)); option.value = anchor; $('journey-anchor').append(option); }
    $('journey-anchor').value = anchor; $('journey-direction').value = direction; void switchView('journeys');
  }
  function renderFlow(id, data, compact = false) {
    const card = $(id); card.replaceChildren(); card.classList.add('flow-chart');
    if (!C || !data?.available || !(data.nodes || []).length) { card.append(empty(data?.available ? 'No journeys in this selection' : 'Journeys start with the new tracking', data?.available ? 'Try a wider date range or reset the filters. Nothing has been inferred from older totals.' : coverage(data))); return; }
    const layout = C.sankey(data), svg = svgEl('svg', { viewBox: `0 0 ${layout.width} ${layout.height}` });
    chartTitle(svg, 'Traffic and visitor journeys', 'Band widths show recorded tab journeys. Select a route or node for details. The equivalent table contains exact counts.');
    const bar = el('div', null, 'chart-bar'), stats = el('p', `${countLabel(data.totalJourneys, 'tab journey')} · ${countLabel(data.browsers, 'browser')} · ${countLabel(data.sessions, 'session')}`);
    const rows = layout.links.map(link => [link.sourceNode.label, link.targetNode.label, link.count, percent(link.sourceNode.count ? link.count / link.sourceNode.count : null)]);
    const exports = chartTools(card, svg, 'Visitor journeys', ['From', 'To', 'Tab journeys', 'Share of preceding node'], rows);
    exports.tools.prepend(button('Show graph', () => { card.classList.toggle('show-graph'); }, 'quiet mobile-graph-toggle'));
    if (s.journeyHistory.length && !compact) exports.tools.prepend(button('← Back', () => { const old = s.journeyHistory.pop(); $('journey-anchor').value = old.anchor; $('journey-direction').value = old.direction; void reloadView(); }));
    bar.append(stats, exports.tools); card.append(bar);
    const flow = el('div', null, 'flow-layout'), body = el('div', null, 'chart-body'), details = el('aside', null, 'flow-detail'); details.hidden = true; details.setAttribute('aria-label', 'Selected journey details');
    const linksGroup = svgEl('g'), hitsGroup = svgEl('g'), nodesGroup = svgEl('g');
    const visualLinks = [], visualNodes = [];
    const select = (node, link) => {
      const selectedIds = new Set(node ? [node.id] : [link.source, link.target]);
      visualLinks.forEach(({ n, entry }) => { const match = node ? entry.source === node.id || entry.target === node.id : entry === link; n.classList.toggle('selected', match); n.classList.toggle('dimmed', !match); if (match) { selectedIds.add(entry.source); selectedIds.add(entry.target); } });
      visualNodes.forEach(({ n, entry }) => n.classList.toggle('dimmed', !selectedIds.has(entry.id)));
      details.replaceChildren(); details.hidden = false; flow.classList.add('has-detail');
      details.append(el('p', node ? 'Selected point' : 'Selected route', 'eyebrow'), el('h3', node ? node.label : `${link.sourceNode.label} → ${link.targetNode.label}`));
      const dl = el('dl'); const items = [['Recorded tab journeys', number(node ? node.count : link.count)]];
      if (link) items.push(['Share of preceding point', percent(link.sourceNode.count ? link.count / link.sourceNode.count : null)]);
      if (node?.browsers !== undefined) items.push(['Distinct browsers', number(node.browsers)]);
      if (node?.sessions !== undefined) items.push(['Distinct sessions', number(node.sessions)]);
      for (const [label, value] of items) dl.append(el('dt', label), el('dd', value)); details.append(dl);
      if (node?.path) details.append(el('p', node.path, 'path-url'));
      const anchor = node?.path || node?.eventType;
      if (anchor) details.append(button('What happened after? →', () => selectAnchor(anchor, 'after')), button('← What happened before?', () => selectAnchor(anchor, 'before')));
      if (node?.kind === 'other') details.append(button('Show more branches', () => { $('journey-limit').value = '10'; void switchView('journeys'); }));
      details.append(el('p', 'Browsers and sessions may appear on more than one branch. They are not added across routes.', 'muted'), button('Clear selection', () => { details.hidden = true; flow.classList.remove('has-detail'); visualLinks.forEach(({ n }) => n.classList.remove('selected', 'dimmed')); visualNodes.forEach(({ n }) => n.classList.remove('dimmed')); }));
    };
    layout.stages.forEach((stage, index) => svg.append(svgEl('text', { x: 12 + index * layout.columnWidth, y: 20, class: 'stage-heading' }, index === 0 ? 'START' : `STEP ${index}`)));
    for (const link of layout.links) {
      const path = svgEl('path', { d: link.path, stroke: link.color, 'stroke-width': link.width, class: 'graph-link' }); linksGroup.append(path); visualLinks.push({ n: path, entry: link });
      const hit = svgEl('path', { d: link.path, 'stroke-width': Math.max(12, link.width), class: 'graph-link-hit', tabindex: 0, role: 'button', 'aria-label': `${link.sourceNode.label} to ${link.targetNode.label}: ${number(link.count)} tab journeys` }); hit.append(svgEl('title', {}, `${link.sourceNode.label} → ${link.targetNode.label}: ${number(link.count)}`)); activation(hit, () => select(null, link)); hitsGroup.append(hit);
    }
    for (const node of layout.nodes) {
      const group = svgEl('g', { class: 'graph-node', tabindex: 0, role: 'button', 'aria-label': `${node.label}: ${number(node.count)} tab journeys` });
      group.append(svgEl('rect', { x: node.x - 4, y: node.y - 5, width: Math.max(90, layout.columnWidth - 18), height: Math.max(30, node.height + 10), fill: 'transparent' }), svgEl('rect', { x: node.x, y: node.y, width: node.width, height: node.height, fill: node.color, class: 'visible-node' }));
      const label = String(node.label || 'Unknown'), short = label.length > 25 ? `${label.slice(0, 23)}…` : label;
      group.append(svgEl('text', { x: node.x + 22, y: node.y + Math.min(node.height / 2, 13) + 1, class: 'node-name' }, short), svgEl('text', { x: node.x + 22, y: node.y + Math.min(node.height / 2, 13) + 17, class: 'node-count' }, number(node.count)), svgEl('title', {}, `${label}: ${number(node.count)} tab journeys`));
      activation(group, () => select(node)); nodesGroup.append(group); visualNodes.push({ n: group, entry: node });
    }
    svg.append(linksGroup, hitsGroup, nodesGroup); body.append(svg); flow.append(body, details);
    const mobile = el('div', null, 'mobile-stages'); for (const stage of layout.stages) { const section = el('div', null, 'mobile-stage'); section.append(el('h3', stage === 0 ? 'Starting points' : `Step ${stage}`)); for (const node of layout.nodes.filter(item => item.stage === stage)) { const b = button('', () => select(node)); b.append(el('span', node.label), el('span', number(node.count))); section.append(b); } mobile.append(section); }
    card.append(flow, mobile);
    const foot = el('div', null, 'chart-footer'); foot.append(el('p', 'In progress ≠ drop-off. “Continued” means the path extends beyond the visible steps.'), button(compact ? 'Explore this flow ↗' : 'Show exact counts ↓', () => compact ? void switchView('journeys') : $('journey-table').scrollIntoView({ behavior: 'smooth', block: 'start' }), 'text-button')); card.append(foot, exports.status);
    if (!compact) replace('journey-table', [table(['From', 'To', 'Tab journeys', 'Share of preceding point'], rows, 'Exact flow counts. Browsers and sessions are non-additive across branches.')]);
  }
  function renderTrend(id, rows, fields, heading) {
    const card = $(id); card.replaceChildren();
    if (!C || !rows.length || rows.every(row => fields.every(field => row[field] === null || row[field] === undefined))) { card.append(empty('No trend recorded yet', 'This chart will appear when measurements are available for the selected dates.')); return; }
    const layout = C.line(rows, fields), svg = svgEl('svg', { viewBox: `0 0 ${layout.width} ${layout.height}` }); chartTitle(svg, heading, 'Exact daily measurements are provided in the accompanying table.');
    for (const fraction of [0, .5, 1]) { const y = layout.bottom - (layout.bottom - layout.top) * fraction; svg.append(svgEl('line', { x1: layout.left, y1: y, x2: layout.right, y2: y, stroke: '#deded1', 'stroke-width': 1 }), svgEl('text', { x: layout.left - 10, y: y + 3, 'text-anchor': 'end', fill: '#77786b', 'font-size': 10 }, number(Math.round(layout.max * fraction)))); }
    for (const [index, series] of layout.lines.entries()) { const color = ['#426b9b', '#54805b', '#c1914d'][index % 3]; svg.append(svgEl('path', { d: series.path, stroke: color, fill: 'none', 'stroke-width': 2.5 })); for (const point of series.points) { if (point.missing) continue; const dot = svgEl('circle', { cx: point.x, cy: point.y, r: rows.length > 40 ? 2 : 3, fill: color, tabindex: 0, 'aria-label': `${date(point.date)}: ${number(point.value)} ${series.field}` }); dot.append(svgEl('title', {}, `${date(point.date)}: ${number(point.value)} ${series.field}`)); svg.append(dot); } }
    for (const index of [...new Set([0, Math.floor((rows.length - 1) / 2), rows.length - 1])]) { const point = layout.lines[0].points[index]; svg.append(svgEl('text', { x: point.x, y: layout.height - 5, 'text-anchor': index === 0 ? 'start' : index === rows.length - 1 ? 'end' : 'middle', fill: '#77786b', 'font-size': 10 }, date(point.date))); }
    const bar = el('div', null, 'chart-bar'), exports = chartTools(card, svg, heading, ['Date · IST', ...fields], rows.map(row => [row.date, ...fields.map(field => row[field])])); bar.append(el('p', `${heading} · daily counts`), exports.tools); const body = el('div', null, 'chart-body trend'); body.append(svg); card.append(bar, body, exports.status);
  }
  function renderOverview() {
    const data = s.overview; renderMetrics(data); const f = data.filters || {};
    setOptions('source-filter', f.sources || [], 'All sources'); setOptions('page-filter', f.paths || [], 'All pages');
    const anchorValue = $('journey-anchor').value; setOptions('journey-anchor', f.paths || [], 'All entry paths');
    for (const type of ['cv_request_saved', 'cv_opened', 'contact_clicked', 'email_copied', 'video_started', 'demo_started']) { const option = el('option', ACTIONS[type]); option.value = type; $('journey-anchor').append(option); } if ([...$('journey-anchor').options].some(option => option.value === anchorValue)) $('journey-anchor').value = anchorValue;
    const rows = data.daily || []; const field = $('trend-metric').value; renderTrend('daily-chart', rows, [field], $('trend-metric').selectedOptions[0]?.textContent || 'Daily activity');
    replace('daily-table', rows.length ? [table(['Date · IST', 'Page views', 'Sessions', 'Unique browsers', 'CV requests'], rows.map(row => [date(row.date), number(row.views), number(row.sessions), number(row.browsers), number(row.cvRequests)]), `${data.combinedHistory ? 'Page views and CV requests include earlier recorded history. Sessions and daily unique browsers use journey measurement only. ' : ''}Daily activity · — means unavailable history. The first collection day may be partial. Daily browser counts are not added to produce period visitors.`)] : []);
    $('sources-title').textContent = data.legacyAggregates ? 'Sources of page views' : 'Where visits start'; $('devices-title').textContent = data.legacyAggregates ? 'Devices · page views' : 'Devices';
    breakdown('referrers', data.sources || [], 'Session sources appear with the new tracking.'); breakdown('devices', data.devices || [], 'Device breakdown is not available for this selection.');
  }
  function renderFunnel(data) {
    const card = $('funnel-chart'); card.replaceChildren(); $('funnel-table').replaceChildren();
    if (!C || !data?.available || !(data.stages || []).length) { card.append(empty(data?.available ? 'No sessions entered this funnel' : 'Funnel measurement starts now', data?.available ? 'Widen the date range or select another funnel. Older unconnected actions cannot complete these stages.' : coverage(data))); $('funnel-summary').textContent = ''; return; }
    const stages = data.stages, layout = C.funnel(stages); $('funnel-summary').textContent = `${number(data.total)} sessions entered · ${data.pending ? `${number(data.pending)} still in progress. Conversion is provisional; pending sessions are not confirmed abandonment.` : 'No unfinished sessions are currently in progress.'}`;
    const rows = layout.stages.map((stage, index) => [stage.label, number(stage.count), percent(stage.fromStart), percent(stage.fromPrevious), index < stages.length - 1 ? number(stages[index + 1].dropOff) : '—', index < stages.length - 1 ? number(stage.pendingAtStage) : '—', duration(stage.medianToNextMs)]);
    replace('funnel-table', [table(['Stage', 'Sessions', 'From start', 'From previous', 'Ended before next', 'Still in progress here', 'Median time to next'], rows, 'Ordered sessions; intermediate actions are allowed. Unfinished sessions can still progress.')]);
    if (s.funnelMode === 'table') { card.hidden = true; return; } card.hidden = false;
    if (s.funnelMode === 'trend') { renderTrend('funnel-chart', data.daily || [], ['entered', 'converted'], 'Funnel entries and conversions'); return; }
    const svg = svgEl('svg', { viewBox: `0 0 ${layout.width} ${layout.height}` }); chartTitle(svg, 'Conversion funnel', 'Stage heights use the same linear scale. Counts and rates are listed below each stage and in the table.');
    for (const stage of layout.stages) { if (stage.connector) svg.append(svgEl('path', { d: stage.connector, fill: stage.color, opacity: .2 })); const rect = svgEl('rect', { x: stage.x, y: stage.y, width: stage.width, height: stage.height, fill: stage.color, tabindex: 0, 'aria-label': `${stage.label}: ${number(stage.count)} sessions, ${percent(stage.fromStart)} of initial sessions` }); rect.append(svgEl('title', {}, `${stage.label}: ${number(stage.count)} sessions`)); svg.append(rect); }
    const bar = el('div', null, 'chart-bar'), exports = chartTools(card, svg, 'Conversion funnel', ['Stage', 'Sessions', 'From start', 'From previous', 'Ended before next', 'Still in progress', 'Median time to next'], rows); bar.append(el('p', 'Sessions · one count per stage'), exports.tools); const body = el('div', null, 'funnel-body'), plot = el('div', null, 'chart-body'); plot.append(svg); const labels = el('div', null, 'funnel-labels'); labels.style.gridTemplateColumns = `repeat(${stages.length}, minmax(0, 1fr))`;
    layout.stages.forEach((stage, index) => { const n = el('div', null, 'funnel-stage'); n.style.setProperty('--stage-color', stage.color); n.append(el('h3', `${index + 1}. ${stage.label}`), el('strong', `${number(stage.count)} · ${percent(stage.fromStart)}`), el('p', index ? `${percent(stage.fromPrevious)} from previous stage` : 'Starting cohort')); if (index < stages.length - 1) n.append(el('p', `${number(stages[index + 1].dropOff)} ended before next stage`), el('p', `${number(stage.pendingAtStage)} still in progress here`)); if (stage.medianToNextMs !== null && stage.medianToNextMs !== undefined) n.append(el('p', `${duration(stage.medianToNextMs)} median to next`)); labels.append(n); }); body.append(plot, labels); card.append(bar, body, exports.status);
  }
  function renderLegacyPages(old) {
    const rows = (old.topPages || []).slice(0, 100), byPage = new Map((old.pageInteractions || []).map(row => [row.path, row.count]));
    breakdown('page-view-ranking', rows.slice(0, 6).map(row => ({ label: title(row.path), count: row.views })), 'No historical page views recorded in this period.');
    replace('page-time-ranking', [el('p', 'Active time was not measured in these historical records. It starts with the updated tracking.', 'empty')]);
    const actionCount = row => old.availability?.interactions === false || !Array.isArray(old.pageInteractions) ? null : (byPage.get(row.path) || 0);
    const history = el('div', null, 'notice'); history.append(el('h3', 'Historical page totals'), el('p', 'These are existing page views and broad actions in the selected period. They have no recorded sessions, reading time or individual button placement. New measurements will appear alongside this history.'));
    const contents = [history];
    if (rows.length) contents.push(table(['Page', 'Views', 'Unique browsers', 'Recorded actions'], rows.map(row => [title(row.path), number(row.views), number(row.browserVisitors), number(actionCount(row))]), 'Existing page totals. A dash indicates unavailable measurement, not zero.'));
    else contents.push(el('p', 'No page totals were recorded for this period.', 'empty'));
    replace('pages', contents);
    const detail = $('page-detail'); detail.replaceChildren(); s.selectedPage = '';
    if (old.availability?.interactions === false) { detail.append(el('p', 'Historical action tracking is unavailable for this period.', 'empty')); return; }
    const actions = (old.interactions || []).slice(0, 40);
    detail.append(el('h3', 'Historical actions · all pages'), el('p', 'These broad action totals cover the whole website. They are not assigned to a particular page or individual button.', 'muted'));
    if (!actions.length) { detail.append(el('p', 'No historical actions recorded in this period.', 'empty')); return; }
    const list = el('ol', null, 'breakdown'), max = Math.max(1, ...actions.map(row => row.count));
    for (const row of actions.slice(0, 12)) { const item = el('li'), label = el('div', null, 'row-label'), track = el('div', null, 'bar-track'), fill = el('div', null, 'bar-value'); label.append(el('span', `${ACTIONS[row.type] || row.type} · ${title(row.target)}`), el('strong', number(row.count))); fill.style.width = `${row.count / max * 100}%`; track.setAttribute('aria-hidden', 'true'); track.append(fill); item.append(label, track); list.append(item); }
    detail.append(list); const wrap = el('div', null, 'table-scroll'); wrap.append(table(['Action', 'Target', 'Count'], actions.map(row => [ACTIONS[row.type] || row.type, title(row.target), number(row.count)]), 'Historical actions across all pages')); detail.append(wrap);
  }
  function renderPages(data) {
    const old = s.overview?.legacy || s.legacy;
    const historical = old && !filters().device && !filters().source && !filters().path;
    if (!data.available && historical) { renderLegacyPages(old); return; }
    const rows = [...(data.pages || [])].sort((a, b) => (Number(b[$('page-sort').value]) || 0) - (Number(a[$('page-sort').value]) || 0));
    const allPages = historical && Array.isArray(old.topPages) ? old.topPages : null;
    breakdown('page-view-ranking', [...(allPages || rows)].sort((a, b) => b.views - a.views).slice(0, 6).map(row => ({ label: row.title || title(row.path), count: row.views })), 'No page-view history in this selection.');
    breakdown('page-time-ranking', rows.filter(row => row.avgActiveMs !== null && row.avgActiveMs !== undefined).sort((a, b) => b.avgActiveMs - a.avgActiveMs).slice(0, 6).map(row => ({ label: row.title || title(row.path), count: row.avgActiveMs })), 'Active-time measurements are not available yet.', duration);
    const contents = [];
    if (allPages) {
      contents.push(el('h3', 'All recorded page totals'), el('p', 'Selected period, including earlier history. These counts already include the views measured below; do not add the two tables.', 'muted'));
      if (allPages.length) contents.push(table(['Page', 'Page views', 'Unique browsers'], allPages.map(row => [title(row.path), number(row.views), number(row.browserVisitors)]), 'Up to 100 pages, ranked by all recorded views. Browser counts cover only the available identification history.'));
      else contents.push(el('p', 'No page totals were recorded for this period.', 'empty'));
    }
    contents.push(el('h3', 'Measured engagement'), el('p', coverage(data), 'muted'));
    if (!rows.length) { contents.push(empty(data.available ? 'No measured page activity in this selection' : 'Page detail starts with the new tracking', data.available ? `${allPages ? 'Earlier page totals remain above. ' : ''}Try a wider date range or reset filters to find detailed measurements.` : coverage(data))); replace('pages', contents); replace('page-detail', []); return; }
    contents.push(table(['Page', 'New page views', 'Browsers', 'Sessions', 'Timed views', 'Avg. active time', 'Entries', 'Last observed'], rows.map(row => [button(row.title || title(row.path), () => renderPageDetail(row), 'table-link'), number(row.views), number(row.browsers), number(row.sessions), number(row.measuredViews), duration(row.avgActiveMs), number(row.entries), number(row.lastObserved)]), 'Only views recorded since journey collection began. Select a page for controls, reading depth and media engagement.'));
    replace('pages', contents);
    const selected = rows.find(row => row.path === s.selectedPage); if (selected) renderPageDetail(selected); else replace('page-detail', []);
  }
  function renderPageDetail(row) {
    s.selectedPage = row.path; const box = $('page-detail'); box.replaceChildren(); const heading = el('div', null, 'section-heading'), text = el('div'); text.append(el('p', 'Page detail', 'eyebrow'), el('h2', row.title || title(row.path)), el('p', row.path)); heading.append(text, button('Explore this journey ↗', () => selectAnchor(row.path))); box.append(heading);
    const metrics = el('div', null, 'metrics'); for (const [name, value, note] of [['Average active time', duration(row.avgActiveMs), 'Per measured view'], ['Median active time', duration(row.medianActiveMs), 'Per measured view'], ['Timing coverage', `${number(row.measuredViews)} / ${number(row.views)}`, 'Measured page views'], ['Total active time', duration(row.activeMs), 'Recorded foreground engagement']]) { const n = el('div', null, 'metric'); n.append(el('p', name), el('strong', value), el('span', note)); metrics.append(n); } box.append(metrics);
    const grid = el('div', null, 'two-column'); for (const [name, values] of [['Scroll depth', (row.scroll || []).map(item => ({ name: `${item.depth}% reached`, count: item.count }))], ['Sections reached', row.sections || []]]) { const panel = el('section', null, 'panel'); panel.append(el('h2', name)); const list = el('div'); panel.append(list); const max = Math.max(1, ...values.map(item => item.count)); for (const item of values) { const itemRow = el('div', null, 'row-label'); itemRow.append(el('span', item.name), el('strong', number(item.count))); const track = el('div', null, 'bar-track'), fill = el('div', null, 'bar-value'); fill.style.width = `${item.count / max * 100}%`; track.append(fill); const itemBox = el('div'); itemBox.style.marginTop = '14px'; itemBox.append(itemRow, track); list.append(itemBox); } if (!values.length) list.append(el('p', 'No measurements recorded yet.', 'empty')); grid.append(panel); } box.append(grid);
    const controls = (row.controls || []).filter(item => item.count > 0).slice(0, 10);
    if (controls.length) {
      const ranked = el('section', null, 'panel'); ranked.append(el('h3', 'Most-used controls')); const list = el('ol', null, 'breakdown'), max = Math.max(...controls.map(item => item.count));
      for (const item of controls) { const li = el('li'), label = el('div', null, 'row-label'), track = el('div', null, 'bar-track'), fill = el('div', null, 'bar-value'); label.append(el('span', String(item.id || item.control || item.target).replace(/[:_-]+/g, ' ')), el('strong', number(item.count))); fill.style.width = `${item.count / max * 100}%`; track.setAttribute('aria-hidden', 'true'); track.append(fill); li.append(label, track); list.append(li); }
      ranked.append(list); box.append(ranked);
    }
    for (const [name, columns, values] of [
      ['Controls & buttons', ['Control / placement', 'Action', 'Clicks', 'Visible instances', 'Click rate'], (row.controls || []).map(item => [item.id || item.control || item.target, ACTIONS[item.type] || item.type, number(item.count), number(item.impressions), percent(item.clickRate)])],
      ['Media engagement', ['Media', 'Action', 'Count'], (row.media || []).map(item => [item.id || item.target, item.type === 'video_progress' && item.value !== null && item.value !== undefined ? `${number(item.value)}% watched` : (ACTIONS[item.type] || item.type), number(item.count)])],
    ]) { box.append(el('h3', name)); if (values.length) { const wrap = el('div', null, 'table-scroll'); wrap.append(table(columns, values)); box.append(wrap); } else box.append(el('p', 'No recorded interactions for this page.', 'empty')); }
  }
  function renderLeads(data) {
    const leads = data.leads || data.cvLeads || [], total = data.total ?? data.cvLeadsTotal ?? leads.length, requests = data.requestsAllTime ?? data.cvRequestsAllTime;
    $('contact-count').textContent = `${number(total)} email addresses · ${number(requests)} saved requests across all time.`;
    $('record-note').textContent = data.excludedCVContacts ? `${number(data.excludedCVContacts)} test or disposable addresses and ${number(data.excludedCVRequests)} historical requests are excluded. Original records are retained.` : '';
    if (!leads.length) return replace('contacts', [empty('No CV contacts to show', data.excludedCVContacts ? 'No requests remain after excluding test addresses.' : 'Addresses voluntarily shared through the CV form will appear here.')]);
    const wrap = el('div', null, 'table-scroll'); wrap.tabIndex = 0; wrap.setAttribute('role', 'region'); wrap.setAttribute('aria-label', 'CV contact records'); wrap.append(table(['Email', 'Latest request · IST', 'First request · IST', 'Requests', 'Latest page'], leads.map(lead => [lead.email, date(lead.last_requested_at, true), date(lead.first_requested_at, true), number(lead.download_count), lead.last_source_path]), 'Latest contacts, separate from anonymous browsing histories.')); replace('contacts', [wrap]);
  }
  function renderHealth(data) {
    const overview = s.overview || {}, health = data?.health || data || {}, summary = overview.summary || {}, items = [
      ['Journey collection', overview.coverage?.startedAt ? date(overview.coverage.startedAt, true) : 'Awaiting first recorded journey', 'Earlier aggregate records remain separate.'],
      ['Timing coverage', `${number(summary.measuredViews)} / ${number(summary.views)}`, 'Page views with usable active-time measurements.'],
      ['Last event', health.lastEventAt ? date(health.lastEventAt, true) : 'Not available yet', 'No event is fabricated to keep the dashboard looking active.'],
      ['Retention', '180 days', 'Raw traffic history. CV contact records remain separate.'],
      ['Browser identification', '90-day first-party identifier', 'Random browser identity; no device fingerprinting.'],
      ['Access', 'This Mac only', 'Passwordless local interface; protected read-only database connection.'],
    ];
    for (const [key, label] of [['duplicates', 'Duplicate events'], ['rejected', 'Rejected events'], ['excluded', 'Excluded events']]) if (health[key] !== undefined) items.push([label, number(health[key]), 'Recorded diagnostic count for the available coverage.']);
    if (health.boundaryTimingExcluded !== undefined) items.push(['Timing at date boundaries', number(health.boundaryTimingExcluded), 'Ambiguous cross-boundary durations are excluded rather than assigned to the wrong day.']);
    const grid = el('div', null, 'health-grid'); for (const [name, value, note] of items) { const card = el('div', null, 'health-item'); card.append(el('h3', name), el('p', value, 'value'), el('p', note)); grid.append(card); } replace('health-content', [grid]);
  }
  function unavailable(error) {
    $('report-error').querySelector('h2').textContent = error.code === 'DATA_NOT_CONNECTED' ? 'Live data is not connected.' : 'The report could not be loaded.';
    $('report-error').querySelector('p').textContent = error.code === 'DATA_NOT_CONNECTED' ? 'The private connection to your website needs attention. No credentials or visitor data are exposed here.' : errorMessage(error); $('report-error').hidden = false;
  }
  function scrubLegacy(data) { const { cvLeads, ...safe } = data; return safe; }
  function legacyOverview(data) {
    return { available: false, legacyAggregates: true, legacy: data, coverage: {}, range: { startDate: data.startDate, endDate: data.endDate }, summary: {}, daily: (data.daily || []).map(row => ({ date: row.date, views: row.pageViews, cvRequests: row.cvRequests, sessions: null, browsers: null })), sources: (data.referrers || []).map(row => ({ name: row.source, count: row.visits })), devices: (data.devices || []).map(row => ({ name: row.device, count: row.visits })), filters: { paths: (data.topPages || []).map(row => row.path), sources: [] } };
  }
  function combineHistory(data) {
    const old = legacyOverview(data.legacy), measured = new Map((data.daily || []).map(row => [row.date, row]));
    // The existing counters also receive new page views and saved CV requests.
    // Replace those columns; adding the two streams would double-count them.
    const days = new Map((data.daily || []).map(row => [row.date, { ...row }]));
    for (const row of old.daily) days.set(row.date, { ...row, ...measured.get(row.date), views: row.views, cvRequests: row.cvRequests });
    const result = { ...data, combinedHistory: true, daily: [...days.values()].sort((a, b) => a.date.localeCompare(b.date)) };
    if (!data.available) Object.assign(result, { legacyAggregates: true, sources: old.sources, devices: old.devices, filters: { sources: data.filters?.sources?.length ? data.filters.sources : old.filters.sources, paths: data.filters?.paths?.length ? data.filters.paths : old.filters.paths } });
    return result;
  }
  async function loadOverview() {
    try {
      const data = await explore('overview');
      if (data.legacy && !filters().device && !filters().source && !filters().path) return combineHistory(data);
      return data;
    }
    catch (error) { if (error.status !== 404 && error.status !== 400) throw error; if ($('date-range').value === 'custom' || ['today', 'yesterday'].includes($('date-range').value) || filters().device || filters().source || filters().path) return { available: false, coverage: {}, summary: {}, daily: [], filters: {} }; const old = await api('/api/report', { days: filters().days || 30 }); s.legacy = scrubLegacy(old); return legacyOverview(s.legacy); }
  }
  function journeyOptions() { return { anchor: $('journey-anchor').value || undefined, direction: $('journey-direction').value, detail: $('journey-detail').value, depth: Number($('journey-depth').value), limit: Number($('journey-limit').value) }; }
  function funnelOptions() { const id = $('funnel-select').value, saved = s.saved.find(item => item.id === id); return saved ? { steps: saved.steps } : { funnel: id }; }
  async function loadView(version = s.version) {
    try {
      if (s.view === 'overview') { let data; try { data = await explore('journey', { detail: 'pages', depth: 5, limit: 5 }); } catch (error) { if (error.status !== 404 && error.status !== 400) throw error; data = { available: false }; } if (version !== s.version || s.hidden) return; s.journey = data; renderFlow('overview-flow', data, true); }
      else if (s.view === 'journeys') { const data = await explore('journey', journeyOptions()); if (version !== s.version || s.hidden) return; s.journey = data; $('journey-summary').textContent = `${coverage(data)} Each band counts tab journeys. Browser and session totals are deduplicated separately.`; renderFlow('journey-chart', data); }
      else if (s.view === 'funnels') { const data = await explore('funnel', funnelOptions()); if (version !== s.version || s.hidden) return; s.funnel = data; renderFunnel(data); }
      else if (s.view === 'pages') { const data = await explore('pages'); if (version !== s.version || s.hidden) return; s.pages = data; renderPages(data); }
      else if (s.view === 'cv') { const data = await api('/api/leads'); if (version !== s.version || s.hidden) return; s.leads = data; renderLeads(data); }
      else if (s.view === 'health') { const data = await explore('health'); if (version !== s.version || s.hidden) return; s.health = data; renderHealth(data); }
    } catch (error) { if (version !== s.version || s.hidden) return; unavailable(error); }
  }
  async function refresh() {
    s.hidden = false; const refreshVersion = ++s.refreshVersion; ++s.version; ++s.exportVersion; s.overviewLoading = true;
    $('report-error').hidden = true; $('refresh').disabled = true; $('report-status').textContent = 'Refreshing live records…';
    try {
      const overview = await loadOverview(); if (refreshVersion !== s.refreshVersion || s.hidden) return;
      s.overviewLoading = false; s.overview = overview; renderOverview(); $('report').hidden = false;
      // Navigation can change while the overview is pending. Load the latest
      // selected view against this snapshot, without cancelling refresh cleanup.
      await loadView(++s.version); if (refreshVersion !== s.refreshVersion || s.hidden) return;
      $('report-status').textContent = `Updated ${new Intl.DateTimeFormat('en-IN', { hour: '2-digit', minute: '2-digit', timeZone: 'Asia/Kolkata' }).format(new Date())} IST`;
    }
    catch (error) { if (refreshVersion !== s.refreshVersion || s.hidden) return; unavailable(error); $('report-status').textContent = 'Refresh unavailable'; }
    finally { if (refreshVersion === s.refreshVersion) { s.overviewLoading = false; $('refresh').disabled = false; } }
  }
  async function reloadView() {
    ++s.version;
    if (s.hidden || s.overviewLoading) return;
    if (!s.overview) await refresh(); else await loadView();
  }
  async function switchView(view) {
    if (!['overview', 'journeys', 'funnels', 'pages', 'cv', 'health'].includes(view)) return;
    s.view = view; ++s.exportVersion; $('report-error').hidden = true;
    for (const section of document.querySelectorAll('.view')) section.hidden = section.id !== `view-${view}`;
    for (const n of document.querySelectorAll('.view-nav button')) { if (n.dataset.view === view) n.setAttribute('aria-current', 'page'); else n.removeAttribute('aria-current'); }
    // Contact rows are not retained in hidden panels.
    if (view !== 'cv') { replace('contacts', []); $('contact-count').textContent = ''; s.leads = null; }
    await reloadView();
  }
  function hide() {
    s.hidden = true; ++s.version; ++s.refreshVersion; ++s.exportVersion; s.overviewLoading = false; s.overview = s.legacy = s.journey = s.funnel = s.pages = s.health = s.leads = null;
    $('report').hidden = true; $('report-error').hidden = true; $('refresh').disabled = false;
    for (const id of ['metrics', 'visitor-note', 'detailed-metrics', 'detailed-period', 'detailed-note', 'report-period', 'overview-flow', 'daily-chart', 'daily-table', 'referrers', 'devices', 'journey-chart', 'journey-table', 'journey-summary', 'funnel-chart', 'funnel-table', 'funnel-summary', 'pages', 'page-view-ranking', 'page-time-ranking', 'page-detail', 'contacts', 'contact-count', 'record-note', 'health-content', 'export-status']) replace(id, []);
    $('report-status').textContent = 'Data hidden. Refresh when you are ready.';
  }
  function loadSaved() { try { const value = JSON.parse(localStorage.getItem('priyam-analytics-funnels-v1') || '[]'); s.saved = Array.isArray(value) ? value.filter(item => item && typeof item.id === 'string' && /^saved-[a-z0-9-]+$/.test(item.id) && typeof item.name === 'string' && item.name.length <= 60 && Array.isArray(item.steps) && item.steps.length >= 2 && item.steps.length <= 6 && item.steps.every(step => step && typeof step.type === 'string' && Object.hasOwn(ACTIONS, step.type))).slice(0, 20) : []; } catch { s.saved = []; } for (const saved of s.saved) { const option = el('option', saved.name); option.value = saved.id; $('funnel-select').append(option); } }
  function addBuilderStep(initial) {
    const list = $('funnel-steps'); if (list.children.length >= 6) return;
    const row = el('div', null, 'builder-step'), label = el('label', `Stage ${list.children.length + 1}`), select = el('select'); select.setAttribute('aria-label', `Stage ${list.children.length + 1}`);
    for (const type of ['page_view', 'cv_opened', 'cv_submitted', 'cv_request_saved', 'cv_download_initiated', 'contact_opened', 'contact_clicked', 'email_copied', 'evidence', 'conversion', 'video_started', 'video_completed', 'media_opened', 'demo_started', 'outbound_clicked']) { const option = el('option', ACTIONS[type]); option.value = JSON.stringify({ type, label: ACTIONS[type] }); select.append(option); }
    for (const item of s.overview?.filters?.paths || []) { const path = typeof item === 'string' ? item : item.path; if (!path) continue; const label = typeof item === 'string' ? title(path) : (item.title || path); const option = el('option', `Page: ${label}`); option.value = JSON.stringify({ type: 'page_view', path, label }); select.append(option); }
    if (initial) select.value = JSON.stringify({ type: initial, label: ACTIONS[initial] }); label.append(select); row.append(label, button('Remove', () => { if (list.children.length > 2) row.remove(); })); list.append(row);
  }
  $('hide-data').addEventListener('click', hide); $('refresh').addEventListener('click', () => void refresh()); $('retry').addEventListener('click', () => void refresh());
  document.querySelector('.view-nav').addEventListener('click', event => { const b = event.target.closest('button[data-view]'); if (b) void switchView(b.dataset.view); });
  for (const b of document.querySelectorAll('[data-open-view]')) b.addEventListener('click', () => void switchView(b.dataset.openView));
  $('date-range').addEventListener('change', () => { $('custom-dates').hidden = $('date-range').value !== 'custom'; if ($('date-range').value !== 'custom') void refresh(); });
  $('apply-dates').addEventListener('click', () => { const start = $('start-date').value, end = $('end-date').value; if (!start || !end || start > end || (new Date(end) - new Date(start)) / 86400000 > 179) { $('report-status').textContent = 'Choose a valid range of up to 180 days.'; return; } void refresh(); });
  for (const id of ['device-filter', 'source-filter', 'page-filter']) $(id).addEventListener('change', () => void refresh());
  $('reset-filters').addEventListener('click', () => { for (const id of ['device-filter', 'source-filter', 'page-filter']) $(id).value = ''; $('date-range').value = '30'; $('custom-dates').hidden = true; void refresh(); });
  for (const id of ['journey-anchor', 'journey-direction', 'journey-detail', 'journey-depth', 'journey-limit', 'funnel-select']) $(id).addEventListener('change', () => void reloadView());
  $('journey-reset').addEventListener('click', () => { $('journey-anchor').value = ''; $('journey-direction').value = 'after'; $('journey-detail').value = 'pages'; $('journey-depth').value = '5'; $('journey-limit').value = '5'; s.journeyHistory = []; void reloadView(); });
  $('trend-metric').addEventListener('change', () => { if (s.overview) renderOverview(); }); $('page-sort').addEventListener('change', () => { if (s.pages) renderPages(s.pages); });
  $('funnel-mode').addEventListener('click', event => { const b = event.target.closest('button[data-mode]'); if (!b) return; s.funnelMode = b.dataset.mode; for (const n of $('funnel-mode').querySelectorAll('button')) n.setAttribute('aria-pressed', String(n === b)); if (s.funnel) renderFunnel(s.funnel); });
  $('new-funnel').addEventListener('click', () => { $('funnel-builder').hidden = false; $('funnel-steps').replaceChildren(); addBuilderStep('cv_opened'); addBuilderStep('cv_request_saved'); $('funnel-name').focus(); });
  $('add-step').addEventListener('click', () => addBuilderStep()); $('cancel-funnel').addEventListener('click', () => { $('funnel-builder').hidden = true; });
  $('funnel-builder').addEventListener('submit', event => { event.preventDefault(); const name = $('funnel-name').value.trim(), steps = [...$('funnel-steps').querySelectorAll('select')].map(n => JSON.parse(n.value)); if (!name || steps.length < 2 || steps.length > 6) return; const saved = { id: `saved-${Date.now().toString(36)}`, name: name.slice(0, 60), steps }; s.saved = [...s.saved.slice(-19), saved]; try { localStorage.setItem('priyam-analytics-funnels-v1', JSON.stringify(s.saved)); } catch { $('builder-status').textContent = 'Browser storage is unavailable. The funnel is available for this visit only.'; } const option = el('option', saved.name); option.value = saved.id; $('funnel-select').append(option); $('funnel-select').value = saved.id; $('funnel-builder').hidden = true; void reloadView(); });
  $('export').addEventListener('click', async () => { const version = s.exportVersion; $('export').disabled = true; $('export-status').textContent = 'Preparing your private CSV…'; try { const blob = await api('/api/export'); if (version !== s.exportVersion || s.hidden || s.view !== 'cv') return; download(blob, 'priyam-cv-requests.csv'); $('export-status').textContent = 'Your CSV is ready.'; } catch (error) { if (version === s.exportVersion && !s.hidden) $('export-status').textContent = errorMessage(error); } finally { $('export').disabled = false; } });
  document.addEventListener('visibilitychange', () => { if (document.visibilityState === 'visible' && !s.hidden) void refresh(); });
  setInterval(() => { if (document.visibilityState === 'visible' && !s.hidden && !$('refresh').disabled) void refresh(); }, 60000);
  loadSaved(); void refresh();
})();
