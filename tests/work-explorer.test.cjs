const { test } = require('node:test');
const assert = require('node:assert/strict');
const { readFileSync } = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');
const ts = require('typescript');
const { createElement } = require('react');
const { renderToStaticMarkup } = require('react-dom/server');
const root = path.join(__dirname, '..');
const css = new Proxy({}, { get: (_, name) => name === '__esModule' ? false : String(name) });
function load(relativePath, stubs = {}, globals = {}) {
  const { outputText } = ts.transpileModule(readFileSync(path.join(root, relativePath), 'utf8'), {
    compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2020, jsx: ts.JsxEmit.ReactJSX, esModuleInterop: true },
  });
  const module = { exports: {} };
  vm.runInNewContext(outputText, { ...globals, module, exports: module.exports, require: id => Object.hasOwn(stubs, id) ? stubs[id] : require(id) }, { filename: relativePath });
  return module.exports;
}
const link=({children,...props})=>createElement('a',props,children);
const registry=JSON.parse(readFileSync(path.join(root,'content/work/case-studies.json'),'utf8'));
const groups=registry.companies.map(company=>({company,studies:registry.caseStudies.filter(study=>study.companyId===company.id)}));
const presentation=load('lib/work-presentation.ts');
const brandMarks=load('components/BrandMarks.tsx',{'@/lib/brands':load('lib/brands.ts'),'./brand-marks.module.css':css}).default;
const media=load('components/work/Media.tsx',{'./work.module.css':css}).default;
const previewModule=load('components/work/WorkPreview.tsx',{'next/link':link,'@/lib/work-types':load('lib/work-types.ts'),'@/lib/work-presentation':presentation,'./Media':media,'@/components/BrandMarks':brandMarks,'./work-preview.module.css':css});
const preview=previewModule.default;
const help=({id})=>createElement('section',{id},'Discuss a relevant product problem');
const stubs={'next/link':link,'./WorkPreview':preview,'./work-explorer.module.css':css,'@/components/HowICanHelp':help};
const explorer=load('components/work/WorkExplorer.tsx',stubs);
const selected=['cashkaro-college-money-education-loans','cashkaro-lending-mcp-feedback','cashkaro-lender-integration-operations','cashkaro-eduloans-policy-workflow','absolute-rural-credit-uli','absolute-silkroute-marketplace','absolute-crop-health-ai','urbankhet-farm-to-fork'];
const paths={
 'lending-journeys':['cashkaro-college-money-education-loans','absolute-rural-credit-uli'],
 'partner-platforms':['cashkaro-lender-integration-operations','absolute-silkroute-marketplace'],
 'applied-ai':['absolute-crop-health-ai','cashkaro-eduloans-policy-workflow','cashkaro-lending-mcp-feedback'],
 'operating-business':['urbankhet-farm-to-fork'],
};
const escaped=text=>text.replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;').replace(/"/g,'&quot;').replace(/'/g,'&#x27;');
function render(){return renderToStaticMarkup(createElement(explorer.default,{groups}));}
function previewAt(html,study){return html.indexOf(`id="preview-${study.id}"`);}

test('Work initially presents all eight selected studies through four understandable product problems',()=>{
 const html=render();
 assert.deepEqual(Array.from(explorer.selectedWorkSlugs),selected);
 assert.equal((html.match(/id="preview-/g)||[]).length,8);
 for(const [id,slugs] of Object.entries(paths)){
  assert.match(html,new RegExp(`href="#${id}"`));
  const start=html.indexOf(`<section id="${id}"`),end=html.indexOf('</section>',start);
  assert.ok(start>=0,id);
  const section=html.slice(start,end);
  for(const slug of slugs){const study=registry.caseStudies.find(study=>study.slug===slug);assert.ok(section.includes(`id="preview-${study.id}"`),`${slug}: useful problem grouping`);}
 }
 for(const study of registry.caseStudies.filter(study=>selected.includes(study.slug))){
  assert.ok(previewAt(html,study)>=0,study.slug);
  const ownership=previewModule.selectedProjectOwnership[study.slug];
  assert.match(ownership,/\bI (?:owned|proposed|worked|built|shaped|connected|moved)/,`${study.slug}: personal contribution`);
  assert.ok(html.includes(escaped(ownership)),study.slug);
 }
 for(const study of registry.caseStudies.filter(study=>!selected.includes(study.slug))) assert.ok(!html.includes(`id="preview-${study.id}"`),`${study.slug}: not silently promoted into selection`);
 assert.doesNotMatch(html,/<details|<summary|<select|\shidden=|aria-pressed|Filter work|Full project index|Read more/);
 assert.doesNotMatch(html,/autoplay|<a[^>]+download=/i);
});

test('selection helpers retain all 25 source records and do not mutate author data',()=>{
 const before=JSON.stringify(groups);
 const chosen=explorer.selectWorkGroups(groups);
 assert.deepEqual(Array.from(chosen,group=>group.company.id),['cashkaro','absolute','urbankhet']);
 assert.deepEqual(Array.from(chosen,group=>group.studies.length),[4,3,1]);
 assert.deepEqual(Array.from(chosen).flatMap(group=>Array.from(group.studies,study=>study.slug)),selected);
 assert.equal(JSON.stringify(groups),before);assert.equal(registry.caseStudies.length,25);
 assert.deepEqual(Array.from(explorer.selectWorkGroups([])),[]);
 const missing=groups.map(group=>({...group,studies:group.studies.filter(study=>study.slug!==selected[0])}));
 assert.equal(explorer.selectWorkGroups(missing).flatMap(group=>group.studies).length,7);
});

test('all original company anchors and problem links resolve without mixing employment with other contexts',()=>{
 const html=render();
 for(const company of registry.companies){
  assert.ok(html.includes(`id="${company.id}"`),`${company.id}: old anchor retained`);
  assert.equal(explorer.resolveWorkFragment(`#${company.id}`,groups),company.id);
 }
 const destinations={credflow:'/cv#credflow','founder-programmes':'/cv#founder-programmes','water-farmers':'/cv#internship','gujarat-action-group':'/cv#other-contexts',advisory:'/cv#other-contexts',cept:'/cv#education'};
 for(const [id,href] of Object.entries(destinations)) assert.match(html,new RegExp(`<a[^>]+id="${id}"[^>]+href="${href}"`));
 for(const id of [...Object.keys(paths),'other-contexts','company-index','upaj-stack-title']) assert.equal(explorer.resolveWorkFragment(`#${id}`,groups),id);
 assert.equal(explorer.resolveWorkFragment('#%63ashkaro',groups),'cashkaro');
 for(const hash of ['','#','#%E0%A4','#missing-company','#story-build']) assert.equal(explorer.resolveWorkFragment(hash,groups),null);
 assert.match(html,/href="\/cv"/);
});

test('fragment navigation cancels stale work and restores focus before scrolling',()=>{
 const frames=new Map(),events=[];let nextFrame=0,effect,hashChange;
 const location={hash:'#absolute'};
 const target={focus:options=>events.push(['focus',options.preventScroll]),scrollIntoView:options=>events.push(['scroll',options.block,options.behavior])};
 const component=load('components/work/WorkExplorer.tsx',{...stubs,'react':{...require('react'),useEffect:callback=>{effect=callback;}}},{
  window:{location,addEventListener:(_,callback)=>{hashChange=callback;},removeEventListener:(_,callback)=>{assert.equal(callback,hashChange);hashChange=undefined;}},
  document:{getElementById:id=>{events.push(['target',id]);return target;}},
  requestAnimationFrame:callback=>{frames.set(++nextFrame,callback);return nextFrame;},cancelAnimationFrame:id=>frames.delete(id),
 });
 renderToStaticMarkup(createElement(component.default,{groups}));const cleanup=effect();
 assert.equal(frames.size,1);location.hash='#applied-ai';hashChange();assert.equal(frames.size,1);
 frames.values().next().value();assert.deepEqual(events,[['target','applied-ai'],['focus',true],['scroll','start','instant']]);
 cleanup();assert.equal(frames.size,0);assert.equal(hashChange,undefined);
});

test('preview media follows explicit editorial selection and never substitutes unrelated fallback evidence',()=>{
 for(const slug of selected){
  const study=registry.caseStudies.find(study=>study.slug===slug);
  const html=renderToStaticMarkup(createElement(preview,{study}));
  const primary=presentation.getPrimaryMedia(study)[0];
  if(primary){
   assert.ok(html.includes(`src="${primary.src}"`),slug);
   assert.ok(html.includes(escaped(primary.caption)),`${slug}: evidence qualification`);
  }else{
   assert.doesNotMatch(html,/<figure|<video|aria-haspopup="dialog"/,`${slug}: unrelated fallback evidence`);
   assert.match(html,/textOnly/);
  }
  assert.match(html,new RegExp(`href="/product/${slug}"`));
  assert.match(html,/Read the case/);
  assert.doesNotMatch(html,/autoplay|<details|<summary/i);
 }
 const college=registry.caseStudies.find(study=>study.slug===selected[0]);
 const forced={...college,primaryMediaIds:[],heroMediaId:college.media[0]?.id};
 assert.doesNotMatch(renderToStaticMarkup(createElement(preview,{study:forced})),/<figure|<video|aria-haspopup="dialog"/);
});

test('work-type labels and copy distinguish delivered flow, scripted prototype and proposed MCP',()=>{
 const mcp=registry.caseStudies.find(study=>study.slug==='cashkaro-lending-mcp-feedback');
 const prototype=registry.caseStudies.find(study=>study.slug==='cashkaro-eduloans-policy-workflow');
 const crop=registry.caseStudies.find(study=>study.slug==='absolute-crop-health-ai');
 assert.equal(mcp.workType,'proposal');assert.equal(prototype.workType,'prototype');assert.equal(crop.workType,'delivered');
 const proposal=renderToStaticMarkup(createElement(preview,{study:mcp}));
 assert.match(proposal,/Proposal/);assert.match(proposal,/proposed|proposed tool contract/i);assert.match(proposal,/approval before policy changes/);
 const proto=renderToStaticMarkup(createElement(preview,{study:prototype}));
 assert.match(proto,/Prototype/);assert.match(proto,/sample records and scripted responses/);
 const historical=renderToStaticMarkup(createElement(preview,{study:crop}));
 assert.match(historical,/Historical product delivery/);assert.match(historical,/intended conversational-advisory layer/);
});

test('company remit precedes the relevant account; supporting links deepen the actual farmer-product story',()=>{
 const html=render();
 const cash=registry.caseStudies.find(study=>study.slug==='cashkaro-college-money-education-loans');
 const absolute=registry.caseStudies.find(study=>study.slug==='absolute-rural-credit-uli');
 assert.ok(html.indexOf('At CashKaro, my remit')<previewAt(html,cash));
 assert.ok(html.indexOf('At Absolute, I worked')<previewAt(html,absolute));
 assert.match(html,/href="https:\/\/cashkaro.com\/"/);assert.match(html,/href="https:\/\/absolute.bio\/"/);
 assert.doesNotMatch(html,/Company-reported|Company milestone|Shopping network|Sources ·|Reviewed 14 October/);
 const stack=html.slice(html.indexOf('id="upaj-stack-title"'),html.indexOf('id="work-conversation"'));
 const links=Array.from(stack.matchAll(/href="(\/product\/[^"#]+)"/g),match=>match[1]);
 assert.deepEqual(links,['/product/absolute-upaj-farmer-experience','/product/absolute-farm-os-iot-gis']);
 for(const href of links) assert.ok(registry.caseStudies.some(study=>`/product/${study.slug}`===href));
 assert.match(html,/href="\/cv"/);
});

test('Work and preview avoid retired extra brand marks and misleading metric duplication',()=>{
 const html=render();
 assert.doesNotMatch(html,/src="\/brands\/bankkaro\.png"|src="\/brands\/upaj-black\.svg"/);
 for(const src of ['/brands/cashkaro.svg','/brands/absolute.svg','/brands/urbankhet.png']) assert.ok(html.includes(`src="${src}"`));
 assert.doesNotMatch(html,/100K\s*→\s*600K|100,000 to 600,000|500K\+.*Under 30|1 days|Reported settlement cycle/);
 assert.equal((html.match(/Read the case/g)||[]).length,8);
 const sample=registry.caseStudies.find(study=>study.slug===selected[0]);
 assert.doesNotMatch(renderToStaticMarkup(createElement(preview,{study:sample,showBrand:false})),/src="\/brands\//);
});

test('Work route explains problem-led selection and does not append a separate uncurated project list',()=>{
 const source=readFileSync(path.join(root,'app/product/page.tsx'),'utf8');
 assert.match(source,/The decisions behind the products\./);assert.match(source,/Start with the problem closest to yours/);
 assert.match(source,/Eight cases/);
 assert.doesNotMatch(source,/loadPublishedWork|additionalWork|Additional product work|complete company index/);
});
