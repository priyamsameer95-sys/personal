'use strict';

const assert = require('node:assert/strict');
const fs = require('node:fs/promises');
const path = require('node:path');
const os = require('node:os');
const { test } = require('node:test');
const { LABEL, xml, renderPlist, createInstallPlan, install, main } = require('../scripts/install-local-analytics.cjs');

async function fixture(t) {
  const root = await fs.mkdtemp(path.join(os.tmpdir(), 'priyam-analytics-install-'));
  t.after(() => fs.rm(root, { recursive: true, force: true }));
  const projectDir = path.join(root, 'A & B <private> "project"');
  const homeDir = path.join(root, 'A & B <private> "home"');
  await fs.mkdir(path.join(projectDir, 'scripts'), { recursive: true });
  await fs.mkdir(homeDir);
  await fs.writeFile(path.join(projectDir, 'scripts', 'local-analytics.cjs'), "const port = 4310; server.listen(port, '127.0.0.1');\n");
  await fs.writeFile(path.join(projectDir, 'scripts', 'local-analytics-data.cjs'), "module.exports = {};\n");
  await fs.mkdir(path.join(projectDir, 'lib'));
  await fs.writeFile(path.join(projectDir, 'lib', 'cv-email-policy.cjs'), "module.exports = {};\n");
  await fs.writeFile(path.join(projectDir, 'lib', 'analytics-explore.cjs'), 'module.exports = {};\n');
  await fs.mkdir(path.join(projectDir, 'local-analytics'));
  for (const asset of ['index.html', 'dashboard.css', 'dashboard.js', 'charts.js', 'icon.svg']) await fs.writeFile(path.join(projectDir, 'local-analytics', asset), 'test asset');
  for (const [name, dependencies] of [['@vercel/postgres', { 'runtime-dependency': '1.0.0' }], ['runtime-dependency', {}]]) {
    const folder = path.join(projectDir, 'node_modules', name);
    await fs.mkdir(folder, { recursive: true });
    await fs.writeFile(path.join(folder, 'package.json'), JSON.stringify({ name, version: '1.0.0', dependencies, main: 'index.cjs' }));
    await fs.writeFile(path.join(folder, 'index.cjs'), 'module.exports = {};');
    await fs.writeFile(path.join(folder, '.env'), 'NEVER_COPY=synthetic-private-value');
  }
  await fs.writeFile(path.join(projectDir, '.env.local'), 'NEVER_COPY=synthetic-project-secret');
  return { root, projectDir, homeDir, uid: 501, nodeExecutable: process.execPath };
}

test('generated LaunchAgent escapes XML and invokes the unchanged loopback server with an absolute Node runtime', async t => {
  const options = await fixture(t);
  const plan = await createInstallPlan(options);
  assert.equal(plan.label, LABEL);
  assert.equal(plan.origin, 'http://127.0.0.1:4310/');
  assert.equal(plan.nodeExecutable, await fs.realpath(process.execPath));
  assert.equal(plan.scriptPath, path.join(plan.runtimeDir, 'scripts', 'local-analytics.cjs'));
  assert.equal(plan.connectionFilePath, path.join(plan.runtimeDir, 'data', 'local-analytics.connection.json'));
  assert.match(plan.plist, /A &amp; B &lt;private&gt; &quot;home&quot;/);
  assert.match(plan.plist, /Application Support\/Priyam Analytics/);
  assert.doesNotMatch(plan.plist, /&quot;project&quot;/);
  assert.match(plan.plist, /<key>ProgramArguments<\/key>\s*<array><string>\/.*<\/string><string>\/.*\/scripts\/local-analytics\.cjs<\/string><\/array>/);
  assert.match(plan.plist, /<key>RunAtLoad<\/key><true\/>/);
  assert.match(plan.plist, /<key>KeepAlive<\/key><true\/>/);
  assert.match(plan.plist, /<key>Umask<\/key><integer>63<\/integer>/);
  assert.match(plan.plist, /<key>ThrottleInterval<\/key><integer>10<\/integer>/);
  assert.doesNotMatch(plan.plist, /EnvironmentVariables|ADMIN_PASSWORD|SESSION|TOKEN|PASSWORD|0\.0\.0\.0/);
  assert.equal(xml("<&>\"'"), '&lt;&amp;&gt;&quot;&apos;');
  assert.equal(renderPlist(plan), plan.plist);
});

test('the default and explicit dry run inspect only and never write, launch or install', async t => {
  const options = await fixture(t);
  let executed = 0;
  for (const args of [[], ['--dry-run']]) {
    const result = await main(args, { ...options, execute: () => { executed += 1; } });
    assert.equal(result.dryRun, true);
    assert.equal(result.installed, false);
    assert.match(result.plistPath, /\/Library\/LaunchAgents\/com\.priyamsameer\.analytics\.plist$/);
    assert.match(result.logDir, /\/Application Support\/Priyam Analytics\/logs$/);
    assert.equal(result.packageCount, 2);
    assert.doesNotMatch(JSON.stringify(result), /password|secret|cookie|credential/i);
  }
  assert.equal(executed, 0);
  assert.deepEqual(await fs.readdir(options.homeDir), []);
  assert.deepEqual((await fs.readdir(options.projectDir)).sort(), ['.env.local', 'lib', 'local-analytics', 'node_modules', 'scripts']);
});

test('install writes private local log paths and boots the per-user service once', async t => {
  const options = await fixture(t);
  const plan = await createInstallPlan(options);
  const calls = [];
  const execute = async (file, args) => {
    calls.push([file, ...args]);
    if (args[0] === 'print') throw Object.assign(new Error('not loaded'), { code: 113 });
  };
  const result = await install(plan, { platform: 'darwin', execute });
  assert.equal(result.installed, true);
  assert.equal(result.changed, true);
  assert.equal(result.started, true);
  assert.equal(await fs.readFile(plan.plistPath, 'utf8'), plan.plist);
  assert.deepEqual(calls, [
    ['/bin/launchctl', 'print', 'gui/501/com.priyamsameer.analytics'],
    ['/bin/launchctl', 'bootstrap', 'gui/501', plan.plistPath],
  ]);
  for (const dir of [plan.runtimeDir, plan.privateDir, plan.logDir]) assert.equal((await fs.stat(dir)).mode & 0o777, 0o700);
  for (const file of [plan.plistPath, plan.stdoutPath, plan.stderrPath]) assert.equal((await fs.stat(file)).mode & 0o777, 0o600);
  assert.equal(await fs.readFile(plan.stdoutPath, 'utf8'), '');
  assert.equal(await fs.readFile(plan.stderrPath, 'utf8'), '');
  assert.equal(await fs.readFile(plan.scriptPath, 'utf8'), await fs.readFile(plan.sourceScriptPath, 'utf8'));
  for (const item of plan.packages) {
    assert.equal(await fs.readFile(path.join(item.to, 'index.cjs'), 'utf8'), 'module.exports = {};');
    await assert.rejects(fs.stat(path.join(item.to, '.env')), /ENOENT/);
  }
  await assert.rejects(fs.stat(path.join(plan.runtimeDir, '.env.local')), /ENOENT/);
  assert.equal((await fs.readFile(path.join(plan.runtimeDir, 'local-analytics', 'dashboard.js'), 'utf8')), 'test asset');
  assert.equal(await fs.readFile(path.join(plan.runtimeDir, 'lib', 'cv-email-policy.cjs'), 'utf8'), 'module.exports = {};\n');
});

test('an unchanged loaded service is not interrupted and a changed one is restarted', async t => {
  const options = await fixture(t);
  const plan = await createInstallPlan(options);
  const calls = [];
  const execute = async (file, args) => calls.push([file, ...args]);
  await install(plan, { platform: 'darwin', execute: async (_file, args) => {
    if (args[0] === 'print') throw Object.assign(new Error('not loaded'), { code: 113 });
  } });
  const existing = await install(plan, { platform: 'darwin', execute });
  assert.equal(existing.changed, false);
  assert.equal(existing.started, false);
  assert.deepEqual(calls, [
    ['/bin/launchctl', 'print', plan.serviceTarget],
    ['/bin/launchctl', 'kickstart', plan.serviceTarget],
  ]);
  await fs.writeFile(plan.plistPath, 'old install');
  calls.length = 0;
  const changed = await install(plan, { platform: 'darwin', execute });
  assert.equal(changed.changed, true);
  assert.equal(changed.started, true);
  assert.deepEqual(calls, [
    ['/bin/launchctl', 'print', plan.serviceTarget],
    ['/bin/launchctl', 'bootout', plan.serviceTarget],
    ['/bin/launchctl', 'bootstrap', plan.launchDomain, plan.plistPath],
  ]);
});

test('installer refuses an unsafe source, missing runtime, invalid options and non-macOS application', async t => {
  const options = await fixture(t);
  await assert.rejects(createInstallPlan({ ...options, nodeExecutable: path.join(options.root, 'missing-node') }), /ENOENT/);
  await assert.rejects(createInstallPlan({ ...options, uid: null }), /signed-in macOS user/);
  await assert.rejects(main(['--install', '--dry-run'], options), /Use --dry-run/);
  await assert.rejects(main(['--unknown'], options), /Use --dry-run/);
  const plan = await createInstallPlan(options);
  await assert.rejects(install(plan, { platform: 'linux' }), /macOS only/);
  await fs.writeFile(plan.sourceScriptPath, "const port = 4310; server.listen(port, '0.0.0.0');\n");
  await assert.rejects(createInstallPlan(options), /must bind to 127\.0\.0\.1/);
});

test('symlinked log or plist destinations and unexpected launchctl failures abort safely', async t => {
  const options = await fixture(t);
  const plan = await createInstallPlan(options);
  await fs.mkdir(plan.logDir, { recursive: true });
  const outside = path.join(options.root, 'outside');
  await fs.writeFile(outside, 'do not change');
  await fs.symlink(outside, plan.stdoutPath);
  await assert.rejects(install(plan, { platform: 'darwin' }), /unexpected file type/);
  assert.equal(await fs.readFile(outside, 'utf8'), 'do not change');
  await fs.rm(plan.stdoutPath);
  await assert.rejects(install(plan, { platform: 'darwin', execute: async () => { throw Object.assign(new Error('private child output'), { code: 'ETIMEDOUT' }); } }), /could not be inspected/);
});

test('installer refuses a symlinked shared-policy destination before copying runtime files', async t => {
  const options = await fixture(t);
  const plan = await createInstallPlan(options);
  await fs.mkdir(plan.runtimeDir, { recursive: true });
  const outside = path.join(options.root, 'outside-policy');
  await fs.mkdir(outside);
  await fs.symlink(outside, path.join(plan.runtimeDir, 'lib'));
  await assert.rejects(install(plan, { platform: 'darwin' }), /unexpected file type/);
  assert.deepEqual(await fs.readdir(outside), []);
});

test('a just-booted-out service retries only transient bootstrap statuses with bounded delays', async t => {
  const options = await fixture(t);
  const plan = await createInstallPlan(options);
  await fs.mkdir(path.dirname(plan.plistPath), { recursive: true });
  await fs.writeFile(plan.plistPath, 'old install');
  const calls = [], waits = [];
  let bootstraps = 0;
  const result = await install(plan, { platform: 'darwin', pause: async delay => waits.push(delay), execute: async (_file, args) => {
    calls.push(args);
    if (args[0] === 'bootstrap' && ++bootstraps < 3) throw Object.assign(new Error('private child output'), { code: bootstraps === 1 ? 5 : 16 });
  } });
  assert.equal(result.started, true);
  assert.deepEqual(waits, [150, 300]);
  assert.deepEqual(calls.map(args => args[0]), ['print', 'bootout', 'bootstrap', 'bootstrap', 'bootstrap']);
  for (const args of calls.filter(args => args[0] === 'bootstrap')) assert.deepEqual(args, ['bootstrap', plan.launchDomain, plan.plistPath]);
});

test('bootstrap permission faults are not retried and transient failures stop after three attempts', async t => {
  const options = await fixture(t);
  const plan = await createInstallPlan(options);
  for (const [code, expectedAttempts, expectedWaits] of [[1, 1, []], [64, 1, []], [5, 3, [150, 300]]]) {
    let attempts = 0;
    const waits = [];
    await assert.rejects(install(plan, { platform: 'darwin', pause: async delay => waits.push(delay), execute: async (_file, args) => {
      if (args[0] === 'print') throw Object.assign(new Error('not loaded'), { code: 113 });
      if (args[0] === 'bootstrap') { attempts += 1; throw Object.assign(new Error('private child output'), { code }); }
    } }), error => error.message === 'The analytics startup service could not be registered.');
    assert.equal(attempts, expectedAttempts);
    assert.deepEqual(waits, expectedWaits);
  }
});
