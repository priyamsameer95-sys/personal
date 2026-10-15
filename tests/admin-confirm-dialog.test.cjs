const assert = require('node:assert/strict');
const { readFileSync } = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');
const { test } = require('node:test');
const ts = require('typescript');

// Exercise the real component's lifecycle with native-dialog doubles. The
// browser supplies focus containment; these tests cover our controlled state,
// safe initial focus, Escape handling and cleanup contract.
function fixture(isOpen = true) {
  const refs = [];
  const effects = [];
  let nextId = 0;
  class Element {
    isConnected = true;
    focusCount = 0;
    focus() { this.focusCount += 1; }
  }
  const launcher = new Element();
  const cancel = new Element();
  const modal = { open: false, shown: 0, closed: 0,
    showModal() { this.open = true; this.shown += 1; },
    close() { this.open = false; this.closed += 1; },
  };
  const document = { activeElement: launcher, body: { style: { overflow: 'auto' } } };
  const react = {
    useRef(initial) { const ref = { current: initial }; refs.push(ref); return ref; },
    useId() { return `dialog-${++nextId}`; },
    useEffect(effect) { effects.push(effect); },
  };
  const source = readFileSync(path.join(__dirname, '../components/admin/shared.tsx'), 'utf8');
  const { outputText } = ts.transpileModule(source, {
    compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022, jsx: ts.JsxEmit.ReactJSX, esModuleInterop: true },
  });
  const module = { exports: {} };
  vm.runInNewContext(outputText, {
    module, exports: module.exports, document, HTMLElement: Element,
    require: id => id === 'react' ? react : id === '@/components/Icon' ? require('./helpers/icon.cjs') : require(id),
  }, { filename: 'components/admin/shared.tsx' });
  let cancelled = 0;
  let confirmed = 0;
  const tree = module.exports.ConfirmDialog({ isOpen, title: 'Delete this work?', message: 'This action removes the selected item.', danger: true,
    onCancel() { cancelled += 1; }, onConfirm() { confirmed += 1; },
  });
  refs[0].current = modal;
  refs[1].current = cancel;
  return { tree, document, modal, cancel, launcher, runEffect: effects[0], cancelled: () => cancelled, confirmed: () => confirmed };
}

test('delete confirmation is a labelled native modal with explicit actions', () => {
  const f = fixture();
  assert.equal(f.tree.type, 'dialog');
  assert.equal(f.tree.props.open, undefined, 'showModal supplies modal semantics rather than a non-modal open attribute');
  const [content, actions] = f.tree.props.children;
  const [title, description] = content.props.children;
  assert.equal(f.tree.props['aria-labelledby'], title.props.id);
  assert.equal(f.tree.props['aria-describedby'], description.props.id);
  assert.equal(title.type, 'h2');
  const [cancel, confirm] = actions.props.children;
  assert.equal(cancel.props.type, 'button');
  assert.equal(confirm.props.type, 'button');
  cancel.props.onClick();
  confirm.props.onClick();
  assert.equal(f.cancelled(), 1);
  assert.equal(f.confirmed(), 1);
});

test('opening protects the background and focuses Cancel, then restores the launcher', () => {
  const f = fixture();
  const cleanup = f.runEffect();
  assert.equal(f.modal.shown, 1);
  assert.equal(f.modal.open, true);
  assert.equal(f.cancel.focusCount, 1);
  assert.equal(f.document.body.style.overflow, 'hidden');
  cleanup();
  assert.equal(f.modal.open, false);
  assert.equal(f.modal.closed, 1);
  assert.equal(f.document.body.style.overflow, 'auto');
  assert.equal(f.launcher.focusCount, 1);
});

test('Escape follows cancellation without invoking the destructive handler', () => {
  const f = fixture();
  let prevented = false;
  f.tree.props.onCancel({ preventDefault() { prevented = true; } });
  assert.equal(prevented, true);
  assert.equal(f.cancelled(), 1);
  assert.equal(f.confirmed(), 0);
});

test('closed state does not lock the page and cleanup tolerates a removed launcher', () => {
  const closed = fixture(false);
  assert.equal(closed.runEffect(), undefined);
  assert.equal(closed.modal.shown, 0);
  assert.equal(closed.document.body.style.overflow, 'auto');
  const open = fixture();
  const cleanup = open.runEffect();
  open.launcher.isConnected = false;
  cleanup();
  assert.equal(open.launcher.focusCount, 0);
  assert.equal(open.document.body.style.overflow, 'auto');
});
