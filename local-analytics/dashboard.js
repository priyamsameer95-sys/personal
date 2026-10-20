'use strict';

(() => {
  const $ = id => document.getElementById(id);
  const number = value => new Intl.NumberFormat('en-IN').format(Number.isFinite(Number(value)) ? Number(value) : 0);
  const date = (value, time = false) => {
    const parsed = new Date(value);
    if (!Number.isFinite(parsed.getTime())) return 'Unavailable';
    return new Intl.DateTimeFormat('en-IN', { day: 'numeric', month: 'short', year: 'numeric', timeZone: 'Asia/Kolkata', ...(time ? { hour: '2-digit', minute: '2-digit' } : {}) }).format(parsed);
  };
  const shortDate = value => new Intl.DateTimeFormat('en-IN', { day: 'numeric', month: 'short', timeZone: 'Asia/Kolkata' }).format(new Date(value));
  const actionNames = {
    navigation_clicked: 'Navigation', outbound_clicked: 'Website link', cv_opened: 'CV form opened', cv_download_clicked: 'CV download clicked', contact_opened: 'Contact options opened', contact_clicked: 'Contact chosen', email_copied: 'Email copied', media_opened: 'Media opened', video_started: 'Video played', filter_changed: 'Filter changed', menu_opened: 'Navigation menu opened',
  };
  let days = 30;
  let requestVersion = 0;
  let authVersion = 0;

  function element(tag, text, className) {
    const node = document.createElement(tag);
    if (text !== undefined && text !== null) node.textContent = String(text);
    if (className) node.className = className;
    return node;
  }
  function replace(id, nodes) { $(id).replaceChildren(...nodes); }
  function errorMessage(error) { return error instanceof Error ? error.message : 'The report could not be loaded. Please try again.'; }
  async function api(endpoint, body = {}) {
    const response = await fetch(endpoint, {
      method: 'POST', credentials: 'same-origin', mode: 'same-origin', cache: 'no-store',
      headers: { 'Content-Type': 'application/json', 'X-Local-Analytics': '1' },
      body: JSON.stringify(body), signal: AbortSignal.timeout(20000),
    });
    if (!response.ok) {
      let payload;
      try { payload = await response.json(); } catch { /* Never expose upstream HTML. */ }
      const error = new Error(payload?.error || 'The live website could not be reached. Please try again.');
      error.status = response.status;
      throw error;
    }
    return endpoint === '/api/export' ? response.blob() : response.json();
  }
  function showSignIn(message) {
    ++requestVersion;
    ++authVersion;
    $('dashboard').hidden = true;
    $('report').hidden = true;
    $('export-status').textContent = '';
    // Clear private records from the DOM on sign-out or session expiry.
    for (const id of ['metrics', 'daily-chart', 'daily-table', 'pages', 'interactions', 'page-interactions', 'referrers', 'devices', 'contacts']) replace(id, []);
    $('sign-in').hidden = false;
    $('login-error').textContent = message || '';
    $('login-error').hidden = !message;
  }
  function showDashboard() { ++authVersion; $('sign-in').hidden = true; $('dashboard').hidden = false; }

  function renderMetrics(data) {
    const rows = [
      ['Page views', data.pageViews, `In the last ${days} days`],
      ['Visitor-days', data.visitors, 'Estimated daily browsers, summed'],
      ['Clicks & actions', data.clicks || 0, 'Recorded meaningful actions'],
      ['CV requests', data.cvRequests, 'Successful form submissions in this period'],
      ['Emails shared', data.cvContacts, 'Distinct email addresses · all time'],
    ];
    replace('metrics', rows.map(([label, value, note]) => {
      const metric = element('div', null, 'metric');
      metric.append(element('p', label), element('strong', number(value)), element('span', note));
      return metric;
    }));
  }
  function table(headers, rows, caption, className) {
    const result = element('table', null, className);
    if (caption) { const title = element('caption', caption); title.hidden = true; result.append(title); }
    const head = element('thead');
    const heading = element('tr');
    for (const title of headers) { const cell = element('th', title); cell.scope = 'col'; heading.append(cell); }
    head.append(heading);
    const body = element('tbody');
    for (const values of rows) {
      const row = element('tr');
      values.forEach((value, index) => { const cell = element(index === 0 ? 'th' : 'td', value); if (index === 0) cell.scope = 'row'; row.append(cell); });
      body.append(row);
    }
    result.append(head, body);
    return result;
  }
  function renderChart(data) {
    const daily = data.daily || [];
    if (!daily.length) { replace('daily-chart', [element('p', 'No daily activity is available yet.', 'empty')]); replace('daily-table', []); return; }
    const width = 1000, height = 230, left = 8, top = 15, plotWidth = 984, plotHeight = 205;
    const max = Math.max(1, ...daily.map(day => Math.max(day.pageViews || 0, day.clicks || 0, day.cvRequests || 0)));
    const slot = plotWidth / daily.length;
    const y = value => top + plotHeight * (1 - value / max);
    const svgNode = (tag, attributes) => {
      const node = document.createElementNS('http://www.w3.org/2000/svg', tag);
      Object.entries(attributes || {}).forEach(([key, value]) => node.setAttribute(key, value));
      return node;
    };
    const svg = svgNode('svg', { viewBox: `0 0 ${width} ${height}`, preserveAspectRatio: 'none', role: 'img', 'aria-labelledby': 'chart-title chart-description' });
    const title = svgNode('title', { id: 'chart-title' }); title.textContent = 'Daily page views, clicks and actions, and CV requests';
    const description = svgNode('desc', { id: 'chart-description' }); description.textContent = 'Blue bars show page views, the orange line shows clicks and other meaningful actions, and the dashed green line shows CV requests. Exact counts are available in the following daily table.';
    svg.append(title, description);
    for (const fraction of [0, .5, 1]) svg.append(svgNode('line', { x1: left, x2: width - left, y1: top + plotHeight * fraction, y2: top + plotHeight * fraction, class: 'grid-line' }));
    daily.forEach((day, index) => {
      const bar = svgNode('rect', { x: left + slot * (index + .5) - Math.min(28, slot * .65) / 2, y: y(day.pageViews), width: Math.min(28, slot * .65), height: top + plotHeight - y(day.pageViews), rx: 2, class: 'view-bar' });
      const tooltip = svgNode('title'); tooltip.textContent = `${shortDate(day.date)}: ${number(day.pageViews)} views, ${number(day.clicks || 0)} actions, ${number(day.cvRequests)} CV requests`; bar.append(tooltip); svg.append(bar);
    });
    for (const [field, className] of [['clicks', 'click-line'], ['cvRequests', 'cv-line']]) {
      const points = daily.map((day, index) => `${index ? 'L' : 'M'}${left + slot * (index + .5)},${y(day[field] || 0)}`).join(' ');
      svg.append(svgNode('path', { d: points, class: className, 'vector-effect': 'non-scaling-stroke' }));
    }
    const dates = element('div', null, 'chart-dates'); dates.setAttribute('aria-hidden', 'true');
    dates.append(element('span', shortDate(daily[0].date)), element('span', shortDate(daily[Math.floor((daily.length - 1) / 2)].date)), element('span', shortDate(daily[daily.length - 1].date)));
    replace('daily-chart', [element('p', `Daily count · scale 0–${number(max)}`, 'chart-scale'), svg, dates]);
    replace('daily-table', [table(['Date · IST', 'Visitor-days', 'Page views', 'Actions', 'CV requests'], daily.map(day => [date(day.date), number(day.visitors), number(day.pageViews), number(day.clicks || 0), number(day.cvRequests)]), 'Daily website activity in Indian Standard Time')]);
  }
  function breakdown(id, rows, empty, orange = false) {
    if (!rows.length) return replace(id, [element('p', empty, 'empty')]);
    const max = Math.max(1, ...rows.map(row => row.count));
    const list = element('ol', null, 'breakdown');
    rows.forEach(row => {
      const item = element('li');
      const label = element('div', null, 'row-label'); label.append(element('span', row.label), element('strong', number(row.count)));
      const track = element('div', null, 'bar-track'); track.setAttribute('aria-hidden', 'true');
      const bar = element('div', null, `bar-value${orange ? ' orange-bar' : ''}`); bar.style.width = `${Math.max(0, row.count) / max * 100}%`; track.append(bar);
      item.append(label, track); list.append(item);
    });
    replace(id, [list]);
  }
  function render(data) {
    $('report-period').textContent = `${date(data.startDate)} – ${date(data.endDate)} · IST`;
    renderMetrics(data); renderChart(data);
    $('tracking-start').textContent = data.trackingStartedAt ? `Visitor tracking began ${date(data.trackingStartedAt)}. Click tracking begins with the latest website update.` : 'Tracking is ready. Activity appears after a visitor uses the updated website.';
    replace('pages', data.topPages.length ? [table(['Page', 'Views', 'Visitor-days'], data.topPages.map(row => [row.path, number(row.views), number(row.visitors)]), 'Pages visited in the selected period', 'page-list')] : [element('p', 'Pages appear after the first recorded visit.', 'empty')]);
    breakdown('interactions', (data.interactions || []).map(row => ({ label: `${actionNames[row.type] || row.type} · ${row.target}`, count: row.count })), 'Meaningful clicks will appear here after visitors interact with the updated website.', true);
    breakdown('page-interactions', (data.pageInteractions || []).map(row => ({ label: row.path, count: row.count })), 'No click activity recorded for this period.', true);
    breakdown('referrers', (data.referrers || []).map(row => ({ label: row.source, count: row.visits })), 'No referrer data recorded yet.');
    breakdown('devices', (data.devices || []).map(row => ({ label: row.device, count: row.visits })), 'No device data recorded yet.');
    $('contact-count').textContent = `${number(data.cvLeadsTotal)} email addresses · ${number(data.cvRequestsAllTime)} recorded requests across all time.`;
    if (data.cvLeads.length) {
      const container = element('div', null, 'table-scroll'); container.tabIndex = 0; container.setAttribute('role', 'region'); container.setAttribute('aria-label', 'CV email records; scroll horizontally for all columns');
      container.append(table(['Email', 'Latest request · IST', 'First request · IST', 'Requests', 'Latest page'], data.cvLeads.map(lead => [lead.email, date(lead.last_requested_at, true), date(lead.first_requested_at, true), number(lead.download_count), lead.last_source_path]), 'Email addresses voluntarily shared through the CV form'));
      replace('contacts', [container]);
    } else replace('contacts', [element('p', 'No one has shared an email through the CV form yet.', 'empty')]);
  }
  async function loadReport() {
    const version = ++requestVersion;
    $('report-status').textContent = 'Loading your live website report…';
    $('report-error').hidden = true;
    $('report').hidden = true;
    $('refresh').disabled = true;
    for (const button of $('ranges').querySelectorAll('button')) { button.disabled = true; button.setAttribute('aria-pressed', String(Number(button.dataset.days) === days)); }
    try {
      const data = await api('/api/report', { days });
      if (version !== requestVersion) return;
      render(data); $('report').hidden = false;
      $('report-status').textContent = `Updated ${new Intl.DateTimeFormat('en-IN', { hour: '2-digit', minute: '2-digit', timeZone: 'Asia/Kolkata' }).format(new Date())} IST.`;
    } catch (error) {
      if (version !== requestVersion) return;
      $('report-status').textContent = '';
      if (error.status === 401) { showSignIn(errorMessage(error)); $('password').focus(); return; }
      $('report-error').querySelector('p').textContent = errorMessage(error); $('report-error').hidden = false;
    } finally {
      $('refresh').disabled = false;
      for (const button of $('ranges').querySelectorAll('button')) button.disabled = false;
    }
  }
  $('login-form').addEventListener('submit', async event => {
    event.preventDefault();
    const button = $('login-form').querySelector('button');
    const password = $('password').value; $('password').value = '';
    button.disabled = true; button.textContent = 'Signing in…'; $('login-error').hidden = true;
    try { await api('/api/login', { password }); showDashboard(); $('dashboard-title').tabIndex = -1; $('dashboard-title').focus(); await loadReport(); }
    catch (error) { $('login-error').textContent = errorMessage(error); $('login-error').hidden = false; $('password').focus(); }
    finally { button.disabled = false; button.textContent = 'Open my analytics ↗'; }
  });
  $('logout').addEventListener('click', async () => {
    $('logout').disabled = true;
    try { await api('/api/logout'); showSignIn(); $('password').focus(); }
    catch (error) { $('report-status').textContent = `Sign-out could not complete. ${errorMessage(error)}`; }
    finally { $('logout').disabled = false; }
  });
  $('ranges').addEventListener('click', event => { const button = event.target.closest('button[data-days]'); if (button) { days = Number(button.dataset.days); void loadReport(); } });
  $('refresh').addEventListener('click', () => void loadReport());
  $('retry').addEventListener('click', () => void loadReport());
  $('export').addEventListener('click', async () => {
    const version = authVersion;
    $('export').disabled = true; $('export-status').textContent = 'Preparing your private export…';
    try {
      const blob = await api('/api/export');
      if (version !== authVersion || $('dashboard').hidden) return;
      const url = URL.createObjectURL(blob); const link = element('a'); link.href = url; link.download = 'cv-interests.csv'; document.body.append(link); link.click(); link.remove(); setTimeout(() => URL.revokeObjectURL(url), 1000);
      $('export-status').textContent = 'Your CSV download is ready.';
    } catch (error) {
      if (version !== authVersion) return;
      if (error.status === 401) { showSignIn(errorMessage(error)); $('password').focus(); }
      else $('export-status').textContent = errorMessage(error);
    } finally { $('export').disabled = false; }
  });
  void api('/api/session').then(result => { if (result.authenticated) { showDashboard(); void loadReport(); } }).catch(() => { showSignIn('The local dashboard could not be reached. Refresh this page after restarting it.'); });
})();
