'use strict';

(() => {
  const $ = id => document.getElementById(id);
  const number = value => value === null || value === undefined || !Number.isFinite(Number(value)) ? '—' : new Intl.NumberFormat('en-IN').format(Number(value));
  const date = (value, time = false) => {
    const parsed = new Date(value);
    if (!Number.isFinite(parsed.getTime())) return 'Unavailable';
    return new Intl.DateTimeFormat('en-IN', { day: 'numeric', month: 'short', year: 'numeric', timeZone: 'Asia/Kolkata', ...(time ? { hour: '2-digit', minute: '2-digit' } : {}) }).format(parsed);
  };
  const shortDate = value => new Intl.DateTimeFormat('en-IN', { day: 'numeric', month: 'short', timeZone: 'Asia/Kolkata' }).format(new Date(value));
  const actionNames = {
    navigation_clicked: 'Navigation', outbound_clicked: 'Website link', cv_opened: 'CV form opened', cv_download_clicked: 'CV download attempt', contact_opened: 'Contact options opened', contact_clicked: 'Contact chosen', email_copied: 'Email copied', media_opened: 'Media opened', video_started: 'Video played', filter_changed: 'Filter changed', menu_opened: 'Navigation menu opened',
  };
  let days = 30;
  let requestVersion = 0;
  let dataVersion = 0;

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
      error.code = payload?.code;
      throw error;
    }
    return endpoint === '/api/export' ? response.blob() : response.json();
  }
  function clearReport() {
    $('report').hidden = true;
    $('export-status').textContent = '';
    for (const id of ['metrics', 'visitor-note', 'daily-chart', 'daily-table', 'pages', 'interactions', 'page-interactions', 'referrers', 'devices', 'contacts', 'contact-count', 'record-note']) replace(id, []);
  }
  function showConnectionError(error) {
    const missing = error.code === 'DATA_NOT_CONNECTED' || error.status === 401 || error.status === 403;
    $('report-error').querySelector('h2').textContent = missing ? 'Live data is not connected.' : 'The report could not be loaded.';
    $('report-error').querySelector('p').textContent = missing
      ? 'This dashboard opens without a password on this Mac. Its secure connection to the website’s private records is not configured here, so CV counts and email addresses are not available yet.'
      : errorMessage(error);
    $('report-error').hidden = false;
  }

  function renderMetrics(data) {
    const startsWithinPeriod = data.uniqueTrackingStartedAt && new Date(data.uniqueTrackingStartedAt) > new Date(`${data.startDate}T00:00:00+05:30`);
    const uniqueNote = data.uniqueTrackingStartedAt ? (startsWithinPeriod ? `Since ${date(data.uniqueTrackingStartedAt)} · partial history` : 'One count per browser in this period') : 'Waiting for the first visit with updated tracking';
    const rows = [
      ['Emails shared', data.cvContacts, 'Distinct addresses · test entries excluded'],
      ['CV requests · all time', data.cvRequestsAllTime, 'Saved form requests · test entries excluded'],
      ['Page views', data.pageViews, `In the last ${days} days`],
      ['Unique visitors', data.uniqueVisitors, uniqueNote],
      ['Clicks & actions', data.clicks, 'Recorded meaningful actions'],
      ['CV requests · this period', data.cvRequests, data.availability?.cvRequestHistory === false ? 'Dated history was not recorded' : `In the last ${days} days`],
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
    const cvHistory = data.availability?.cvRequestHistory !== false;
    const clickHistory = data.availability?.interactions !== false;
    $('cv-legend').hidden = !cvHistory;
    $('click-legend').hidden = !clickHistory;
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
    const description = svgNode('desc', { id: 'chart-description' }); description.textContent = `Blue bars show page views${clickHistory ? ', the orange line shows meaningful actions' : ''}${cvHistory ? ', and the dashed green line shows CV requests' : ''}. Exact recorded counts are in the following daily table.`;
    svg.append(title, description);
    for (const fraction of [0, .5, 1]) svg.append(svgNode('line', { x1: left, x2: width - left, y1: top + plotHeight * fraction, y2: top + plotHeight * fraction, class: 'grid-line' }));
    daily.forEach((day, index) => {
      if (day.pageViews === null || day.pageViews === undefined) return;
      const bar = svgNode('rect', { x: left + slot * (index + .5) - Math.min(28, slot * .65) / 2, y: y(day.pageViews), width: Math.min(28, slot * .65), height: top + plotHeight - y(day.pageViews), rx: 2, class: 'view-bar' });
      const tooltip = svgNode('title'); tooltip.textContent = `${shortDate(day.date)}: ${number(day.pageViews)} views, ${number(day.clicks)} actions, ${number(day.cvRequests)} CV requests`; bar.append(tooltip); svg.append(bar);
    });
    for (const [field, className] of [['clicks', 'click-line'], ['cvRequests', 'cv-line']]) {
      if ((field === 'clicks' && !clickHistory) || (field === 'cvRequests' && !cvHistory)) continue;
      const points = daily.map((day, index) => `${index ? 'L' : 'M'}${left + slot * (index + .5)},${y(day[field] || 0)}`).join(' ');
      svg.append(svgNode('path', { d: points, class: className, 'vector-effect': 'non-scaling-stroke' }));
    }
    const dates = element('div', null, 'chart-dates'); dates.setAttribute('aria-hidden', 'true');
    dates.append(element('span', shortDate(daily[0].date)), element('span', shortDate(daily[Math.floor((daily.length - 1) / 2)].date)), element('span', shortDate(daily[daily.length - 1].date)));
    replace('daily-chart', [element('p', `Daily count · scale 0–${number(max)}`, 'chart-scale'), svg, dates]);
    replace('daily-table', [table(['Date · IST', 'Visitor-days', 'Page views', 'Actions', 'CV requests'], daily.map(day => [date(day.date), number(day.visitors), number(day.pageViews), number(day.clicks), number(day.cvRequests)]), 'Daily website activity in Indian Standard Time')]);
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
    $('visitor-note').textContent = data.uniqueTrackingStartedAt
      ? `Unique visitors count the same browser once across the selected period, using visits recorded since ${date(data.uniqueTrackingStartedAt, true)}. ${number(data.uniqueTrackedPageViews)} of ${number(data.pageViews)} page views in this period have this measurement. Earlier visits cannot be deduplicated. The previous daily estimate is ${number(data.visitors)} visitor-days.`
      : `Older records contain ${number(data.visitors)} visitor-days: a returning browser can count again on another day. Unique visitors will appear after the first visit using updated tracking; historical unique visitors cannot be reconstructed.`;
    $('tracking-start').textContent = data.trackingStartedAt ? `Visitor tracking began ${date(data.trackingStartedAt)}.` : 'Activity appears after a visitor uses the website.';
    if (data.availability?.cvRequestHistory === false) $('tracking-start').textContent += ' Exact dated CV request history was not recorded. All-time request totals and the first/latest dates for each email remain available above.';
    replace('pages', data.topPages.length ? [table(['Page', 'Views', 'Unique visitors', 'Visitor-days'], data.topPages.map(row => [row.path, number(row.views), number(row.browserVisitors), number(row.visitors)]), 'Pages visited in the selected period; unique visitor counts include only visits with the new anonymous identifier', 'page-list')] : [element('p', 'Pages appear after the first recorded visit.', 'empty')]);
    breakdown('interactions', (data.interactions || []).map(row => ({ label: `${actionNames[row.type] || row.type} · ${row.target}`, count: row.count })), 'Meaningful clicks will appear here after visitors interact with the updated website.', true);
    breakdown('page-interactions', (data.pageInteractions || []).map(row => ({ label: row.path, count: row.count })), 'No click activity recorded for this period.', true);
    breakdown('referrers', (data.referrers || []).map(row => ({ label: row.source, count: row.visits })), 'No referrer data recorded yet.');
    breakdown('devices', (data.devices || []).map(row => ({ label: row.device, count: row.visits })), 'No device data recorded yet.');
    $('contact-count').textContent = `${number(data.cvLeadsTotal)} email addresses · ${number(data.cvRequestsAllTime)} recorded requests across all time.`;
    const testAddresses = data.cvLeads.filter(lead => /@(example\.(?:com|org|net)|[^@]+\.invalid)$/i.test(lead.email)).length;
    const excludedContacts = data.excludedCVContacts || 0;
    $('record-note').textContent = excludedContacts ? `Excluded ${number(excludedContacts)} test or disposable email address${excludedContacts === 1 ? '' : 'es'} and ${number(data.excludedCVRequests)} historical requests from these totals and the export. The original records are retained.` : (testAddresses ? `Includes ${number(testAddresses)} address${testAddresses === 1 ? '' : 'es'} on a reserved test domain. These records do not establish downloads by real visitors.` : '');
    if (data.cvLeads.length) {
      const container = element('div', null, 'table-scroll'); container.tabIndex = 0; container.setAttribute('role', 'region'); container.setAttribute('aria-label', 'CV email records; scroll horizontally for all columns');
      container.append(table(['Email', 'Latest request · IST', 'First request · IST', 'Requests', 'Latest page'], data.cvLeads.map(lead => [lead.email, date(lead.last_requested_at, true), date(lead.first_requested_at, true), number(lead.download_count), lead.last_source_path]), 'Email addresses voluntarily shared through the CV form'));
      replace('contacts', [container]);
    } else replace('contacts', [element('p', excludedContacts ? 'No CV requests remain after excluding test addresses.' : 'No one has shared an email through the CV form yet.', 'empty')]);
  }
  async function loadReport() {
    const version = ++requestVersion;
    $('report-status').textContent = 'Loading your live website report…';
    $('report-error').hidden = true;
    clearReport();
    ++dataVersion;
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
      showConnectionError(error);
    } finally {
      $('refresh').disabled = false;
      for (const button of $('ranges').querySelectorAll('button')) button.disabled = false;
    }
  }
  $('hide-data').addEventListener('click', () => {
    ++requestVersion;
    ++dataVersion;
    clearReport();
    $('report-error').hidden = true;
    $('report-status').textContent = 'Report hidden. Refresh to show it again.';
  });
  $('ranges').addEventListener('click', event => { const button = event.target.closest('button[data-days]'); if (button) { days = Number(button.dataset.days); void loadReport(); } });
  $('refresh').addEventListener('click', () => void loadReport());
  $('retry').addEventListener('click', () => void loadReport());
  $('export').addEventListener('click', async () => {
    const version = dataVersion;
    $('export').disabled = true; $('export-status').textContent = 'Preparing your private export…';
    try {
      const blob = await api('/api/export');
      if (version !== dataVersion || $('report').hidden) return;
      const url = URL.createObjectURL(blob); const link = element('a'); link.href = url; link.download = 'cv-interests.csv'; document.body.append(link); link.click(); link.remove(); setTimeout(() => URL.revokeObjectURL(url), 1000);
      $('export-status').textContent = 'Your CSV download is ready.';
    } catch (error) {
      if (version !== dataVersion) return;
      $('export-status').textContent = errorMessage(error);
    } finally { $('export').disabled = false; }
  });
  void loadReport();
})();
