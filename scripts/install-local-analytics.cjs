#!/usr/bin/env node
'use strict';

const fs = require('node:fs/promises');
const path = require('node:path');
const os = require('node:os');
const { execFile } = require('node:child_process');
const { promisify } = require('node:util');
const { createRequire } = require('node:module');

const runFile = promisify(execFile);
const LABEL = 'com.priyamsameer.analytics';
const ORIGIN = 'http://127.0.0.1:4310/';

function xml(value) {
  return String(value).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;').replace(/'/g, '&apos;');
}

function renderPlist(plan) {
  return `<?xml version="1.0" encoding="UTF-8"?>
<!DOCTYPE plist PUBLIC "-//Apple//DTD PLIST 1.0//EN" "http://www.apple.com/DTDs/PropertyList-1.0.dtd">
<plist version="1.0">
<dict>
  <key>Label</key><string>${LABEL}</string>
  <key>ProgramArguments</key>
  <array><string>${xml(plan.nodeExecutable)}</string><string>${xml(plan.scriptPath)}</string></array>
  <key>WorkingDirectory</key><string>${xml(plan.runtimeDir)}</string>
  <key>RunAtLoad</key><true/>
  <key>KeepAlive</key><true/>
  <key>ThrottleInterval</key><integer>10</integer>
  <key>ProcessType</key><string>Background</string>
  <key>Umask</key><integer>63</integer>
  <key>StandardOutPath</key><string>${xml(plan.stdoutPath)}</string>
  <key>StandardErrorPath</key><string>${xml(plan.stderrPath)}</string>
</dict>
</plist>
`;
}

async function createInstallPlan({
  projectDir = path.resolve(__dirname, '..'),
  nodeExecutable = process.execPath,
  homeDir = os.homedir(),
  uid = process.getuid?.(),
} = {}) {
  if (!Number.isInteger(uid) || uid < 0) throw new Error('A signed-in macOS user is required.');
  const realProject = await fs.realpath(projectDir);
  const realNode = await fs.realpath(nodeExecutable);
  const sourceScriptPath = path.join(realProject, 'scripts', 'local-analytics.cjs');
  const [nodeStats, scriptStats] = await Promise.all([fs.stat(realNode), fs.stat(sourceScriptPath)]);
  if (!nodeStats.isFile() || !scriptStats.isFile()) throw new Error('The analytics script and Node runtime must be files.');
  await fs.access(realNode, fs.constants.X_OK);
  const source = await fs.readFile(sourceScriptPath, 'utf8');
  if (!/\b4310\b/.test(source) || !/\.listen\(\s*port\s*,\s*['"]127\.0\.0\.1['"]/.test(source)) {
    throw new Error('The analytics server must bind to 127.0.0.1 on port 4310.');
  }
  // launchd cannot depend on a privacy-protected Downloads working directory.
  // The installed copy is self-contained and contains code, assets and packages only.
  const runtimeDir = path.join(path.resolve(homeDir), 'Library', 'Application Support', 'Priyam Analytics');
  const scriptPath = path.join(runtimeDir, 'scripts', 'local-analytics.cjs');
  const privateDir = path.join(runtimeDir, 'data');
  const logDir = path.join(runtimeDir, 'logs');
  const sourceFiles = [
    ['scripts/local-analytics.cjs', 'scripts/local-analytics.cjs'],
    ['scripts/local-analytics-data.cjs', 'scripts/local-analytics-data.cjs'],
    ['local-analytics/index.html', 'local-analytics/index.html'],
    ['local-analytics/dashboard.css', 'local-analytics/dashboard.css'],
    ['local-analytics/dashboard.js', 'local-analytics/dashboard.js'],
    ['local-analytics/icon.svg', 'local-analytics/icon.svg'],
  ].map(([from, to]) => ({ from: path.join(realProject, from), to: path.join(runtimeDir, to) }));
  await Promise.all(sourceFiles.map(async file => {
    if (!(await fs.stat(file.from)).isFile()) throw new Error('An analytics runtime source is missing.');
  }));
  const packages = await packageCopies(realProject, runtimeDir);
  const plan = {
    label: LABEL,
    origin: ORIGIN,
    projectDir: realProject,
    runtimeDir,
    nodeExecutable: realNode,
    scriptPath,
    sourceScriptPath,
    sourceFiles,
    packages,
    privateDir,
    connectionFilePath: path.join(privateDir, 'local-analytics.connection.json'),
    logDir,
    stdoutPath: path.join(logDir, 'dashboard.out.log'),
    stderrPath: path.join(logDir, 'dashboard.err.log'),
    plistPath: path.join(path.resolve(homeDir), 'Library', 'LaunchAgents', `${LABEL}.plist`),
    launchDomain: `gui/${uid}`,
    serviceTarget: `gui/${uid}/${LABEL}`,
  };
  return { ...plan, plist: renderPlist(plan) };
}

async function packageRoot(packageName, fromFile) {
  if (!/^(?:@[a-z0-9_.-]+\/)?[a-z0-9_.-]+$/i.test(packageName)) throw new Error('Invalid analytics dependency.');
  for (const searchPath of createRequire(fromFile).resolve.paths(packageName) || []) {
    try {
      const folder = await fs.realpath(path.join(searchPath, packageName));
      const data = JSON.parse(await fs.readFile(path.join(folder, 'package.json'), 'utf8'));
      if (data.name === packageName) return { folder, data };
    } catch (error) { if (error.code !== 'ENOENT') throw error; }
  }
  throw new Error('A required analytics dependency could not be located.');
}

async function packageCopies(projectDir, runtimeDir) {
  const copies = [];
  async function visit(name, fromFile, targetParent, ancestors = new Set()) {
    const resolved = await packageRoot(name, fromFile);
    if (ancestors.has(resolved.folder)) return;
    if (copies.length >= 100) throw new Error('The analytics dependency graph is unexpectedly large.');
    const to = path.join(targetParent, 'node_modules', name);
    copies.push({ from: resolved.folder, to });
    const chain = new Set([...ancestors, resolved.folder]);
    for (const dependency of Object.keys(resolved.data.dependencies || {}).sort()) {
      await visit(dependency, path.join(resolved.folder, 'package.json'), to, chain);
    }
  }
  await visit('@vercel/postgres', path.join(projectDir, 'package.json'), runtimeDir);
  return copies;
}

async function assertSafeExisting(target, kind) {
  try {
    const info = await fs.lstat(target);
    if (info.isSymbolicLink() || (kind === 'directory' ? !info.isDirectory() : !info.isFile())) {
      throw new Error('An analytics install path has an unexpected file type.');
    }
  } catch (error) {
    if (error.code !== 'ENOENT') throw error;
  }
}

async function bootstrapService(plan, execute, pause) {
  for (let attempt = 0; attempt < 3; attempt += 1) {
    try {
      await execute('/bin/launchctl', ['bootstrap', plan.launchDomain, plan.plistPath], { timeout: 10000 });
      return;
    } catch (error) {
      // launchd may briefly retain a just-booted-out service. Only retry its
      // transient I/O or busy statuses; permission and configuration faults fail.
      if (![5, 16].includes(error.code) || attempt === 2) {
        throw new Error('The analytics startup service could not be registered.');
      }
      await pause(150 * (attempt + 1));
    }
  }
}

async function install(plan, { platform = process.platform, execute = runFile, pause = delay => new Promise(resolve => setTimeout(resolve, delay)) } = {}) {
  if (platform !== 'darwin') throw new Error('Automatic startup is available on macOS only.');
  // These paths contain no credentials. Logs and future local report state stay private.
  await assertSafeExisting(plan.runtimeDir, 'directory');
  await assertSafeExisting(plan.privateDir, 'directory');
  await assertSafeExisting(plan.logDir, 'directory');
  for (const folder of ['scripts', 'local-analytics', 'node_modules']) {
    await assertSafeExisting(path.join(plan.runtimeDir, folder), 'directory');
  }
  await assertSafeExisting(plan.stdoutPath, 'file');
  await assertSafeExisting(plan.stderrPath, 'file');
  await assertSafeExisting(plan.plistPath, 'file');
  await fs.mkdir(plan.runtimeDir, { recursive: true, mode: 0o700 });
  await fs.chmod(plan.runtimeDir, 0o700);
  await fs.mkdir(plan.privateDir, { recursive: true, mode: 0o700 });
  await fs.mkdir(plan.logDir, { recursive: true, mode: 0o700 });
  await fs.chmod(plan.privateDir, 0o700);
  await fs.chmod(plan.logDir, 0o700);
  for (const file of [plan.stdoutPath, plan.stderrPath]) {
    const handle = await fs.open(file, 'a', 0o600);
    await handle.close();
    await fs.chmod(file, 0o600);
  }
  await fs.mkdir(path.dirname(plan.plistPath), { recursive: true, mode: 0o700 });
  const current = await fs.readFile(plan.plistPath, 'utf8').catch(error => {
    if (error.code === 'ENOENT') return null;
    throw error;
  });
  let loaded = false;
  try { await execute('/bin/launchctl', ['print', plan.serviceTarget], { timeout: 10000 }); loaded = true; }
  catch (error) { if (error.code !== 113 && error.code !== 3) throw new Error('The analytics startup service could not be inspected.'); }
  const changed = current !== plan.plist;
  let runtimeChanged = false;
  // Sync the reviewed runtime without copying repository config, data or secrets.
  for (const file of plan.sourceFiles) {
    await fs.mkdir(path.dirname(file.to), { recursive: true, mode: 0o700 });
    await assertSafeExisting(file.to, 'file');
    const [sourceContent, previousContent] = await Promise.all([fs.readFile(file.from), fs.readFile(file.to).catch(error => {
      if (error.code === 'ENOENT') return null;
      throw error;
    })]);
    if (!previousContent || !sourceContent.equals(previousContent)) runtimeChanged = true;
    await fs.copyFile(file.from, file.to);
    await fs.chmod(file.to, 0o600);
  }
  for (const item of plan.packages) {
    await assertSafeExisting(item.to, 'directory');
    await fs.mkdir(path.dirname(item.to), { recursive: true, mode: 0o700 });
    const [sourcePackage, previousPackage] = await Promise.all([fs.readFile(path.join(item.from, 'package.json')), fs.readFile(path.join(item.to, 'package.json')).catch(error => {
      if (error.code === 'ENOENT') return null;
      throw error;
    })]);
    if (!previousPackage || !sourcePackage.equals(previousPackage)) runtimeChanged = true;
    await fs.cp(item.from, item.to, { recursive: true, dereference: true, filter: source => {
      const relative = path.relative(item.from, source);
      return !relative.split(path.sep).some(part => part === 'node_modules' || part.startsWith('.env'));
    } });
  }
  if (changed) {
    const tempFile = `${plan.plistPath}.${process.pid}.tmp`;
    try {
      await fs.writeFile(tempFile, plan.plist, { mode: 0o600, flag: 'wx' });
      await fs.rename(tempFile, plan.plistPath);
    } finally { await fs.rm(tempFile, { force: true }); }
  }
  await fs.chmod(plan.plistPath, 0o600);
  if (loaded && (changed || runtimeChanged)) {
    await execute('/bin/launchctl', ['bootout', plan.serviceTarget], { timeout: 10000 });
    loaded = false;
  }
  if (!loaded) await bootstrapService(plan, execute, pause);
  else await execute('/bin/launchctl', ['kickstart', plan.serviceTarget], { timeout: 10000 });
  return { installed: true, changed, runtimeChanged, started: !loaded, origin: plan.origin, plistPath: plan.plistPath, runtimeDir: plan.runtimeDir, connectionFilePath: plan.connectionFilePath };
}

async function main(args = process.argv.slice(2), options = {}) {
  if (args.length > 1 || args.some(value => !['--dry-run', '--install'].includes(value))) {
    throw new Error('Use --dry-run to review or --install to enable automatic startup.');
  }
  const plan = await createInstallPlan(options);
  if (args[0] !== '--install') {
    return { dryRun: true, installed: false, origin: plan.origin, plistPath: plan.plistPath, nodeExecutable: plan.nodeExecutable, scriptPath: plan.scriptPath, runtimeDir: plan.runtimeDir, connectionFilePath: plan.connectionFilePath, packageCount: plan.packages.length, logDir: plan.logDir, startsAtLogin: true, restartsAutomatically: true };
  }
  return install(plan, options);
}

if (require.main === module) {
  main().then(result => process.stdout.write(`${JSON.stringify(result, null, 2)}\n`)).catch(() => {
    // Do not print child-process output, environment values or filesystem file contents.
    process.stderr.write('Analytics automatic startup could not be configured. Check that the project and Node runtime exist and that this macOS account can write its LaunchAgents folder.\n');
    process.exitCode = 1;
  });
}

module.exports = { LABEL, ORIGIN, xml, renderPlist, createInstallPlan, install, main };
