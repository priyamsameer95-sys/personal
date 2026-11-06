'use strict';
const { test } = require('node:test');
const assert = require('node:assert/strict');
const charts = require('../local-analytics/charts.js');

test('Sankey uses a single linear count scale and conserves ribbons at a branching node', () => {
  const data = { nodes: [{ id: 'a', label: 'Home', count: 10, stage: 0 }, { id: 'b', label: 'Work', count: 7, stage: 1 }, { id: 'c', label: 'CV', count: 3, stage: 1 }], links: [{ source: 'a', target: 'b', count: 7 }, { source: 'a', target: 'c', count: 3 }] };
  const result = charts.sankey(data);
  assert.ok(Math.abs(result.links[0].width / result.links[1].width - 7 / 3) < 1e-12);
  assert.equal(result.links.reduce((sum, link) => sum + link.width, 0), result.nodes[0].height);
  assert.equal(result.nodes[1].height, result.links[0].width);
  assert.ok(result.nodes.every(node => node.y >= 0 && node.y + node.height <= result.height));
  assert.equal(data.nodes[0].x, undefined, 'Layout must not mutate report records');
});

test('Small flow branches retain their actual weight instead of visual inflation', () => {
  const result = charts.sankey({ nodes: [{ id: 'a', count: 1000, stage: 0 }, { id: 'b', count: 999, stage: 1 }, { id: 'c', count: 1, stage: 1 }], links: [{ source: 'a', target: 'b', count: 999 }, { source: 'a', target: 'c', count: 1 }] });
  const small = result.links.find(link => link.count === 1);
  assert.equal(small.width, result.scale);
  assert.ok(small.width < 1);
});

test('Repeated pages keep separate stage identities and terminal nodes keep their category', () => {
  const result = charts.sankey({ nodes: [{ id: 'home:0', label: 'Home', count: 2, stage: 0 }, { id: 'home:2', label: 'Home', count: 2, stage: 2 }, { id: 'active:3', label: 'In progress', kind: 'in_progress', count: 2, stage: 3 }], links: [{ source: 'home:0', target: 'home:2', count: 2 }, { source: 'home:2', target: 'active:3', count: 2 }] });
  assert.equal(result.nodes.length, 3);
  assert.notEqual(result.nodes[0].x, result.nodes[1].x);
  assert.equal(result.nodes[2].kind, 'in_progress');
});

test('Funnel heights are proportional and stage ratios have named denominators', () => {
  const result = charts.funnel([{ label: 'Open', count: 20 }, { label: 'Submit', count: 10 }, { label: 'Saved', count: 5 }]);
  assert.equal(result.stages[1].height / result.stages[0].height, .5);
  assert.equal(result.stages[2].fromStart, .25);
  assert.equal(result.stages[2].fromPrevious, .5);
  assert.equal(result.stages[2].connector, null);
  assert.equal(charts.funnel([{ count: 0 }, { count: 0 }]).stages[1].fromPrevious, null);
});

test('Line geometry retains zero and handles one-point and empty datasets without NaN', () => {
  const result = charts.line([{ date: '2026-11-06', views: 0 }], ['views']);
  assert.equal(result.lines[0].points[0].y, result.bottom);
  assert.ok(Number.isFinite(result.lines[0].points[0].x));
  assert.equal(charts.line([], ['views']).lines[0].path, '');
  assert.doesNotMatch(JSON.stringify(result), /NaN|Infinity/);
});

test('CSV quotes labels and neutralizes spreadsheet formulas', () => {
  const csv = charts.csv(['Label', 'Count'], [['=HYPERLINK("bad")', 1], ['Name, with comma', 2], ['<img onerror=x>', 3]]);
  assert.match(csv, /"'=HYPERLINK\(""bad""\)"/);
  assert.match(csv, /"Name, with comma",/);
  assert.match(csv, /"<img onerror=x>"/);
});

test('Unavailable daily history creates gaps, not zero points or connected lines', () => {
  const result = charts.line([{ date: '2026-11-01', views: null }, { date: '2026-11-02', views: 3 }, { date: '2026-11-03', views: null }, { date: '2026-11-04', views: 2 }, { date: '2026-11-05', views: 0 }], ['views']);
  const series = result.lines[0];
  assert.deepEqual(series.points.map(point => point.missing), [true, false, true, false, false]);
  assert.equal(series.points[0].y, null);
  assert.equal((series.path.match(/M/g) || []).length, 2, 'A new segment begins after each gap');
  assert.equal((series.path.match(/L/g) || []).length, 1, 'Only consecutive measured days connect');
  assert.equal(series.points[4].y, result.bottom, 'Recorded zero remains a measured zero');
});
