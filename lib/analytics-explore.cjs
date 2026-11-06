'use strict';

// Shared, deterministic report calculations. Input contains no contact details.
const DAY = 86400000, TIMEOUT = 30 * 60000;
const TYPES = new Set(['page_view','navigation_clicked','outbound_clicked','cv_opened','cv_submitted','cv_request_saved','cv_request_rejected','cv_download_initiated','contact_opened','contact_clicked','email_copied','media_opened','video_started','video_progress','video_completed','filter_changed','menu_opened','cta_viewed','section_viewed','scroll_depth_reached','demo_started','evidence','conversion']);
const TITLES = {'/':'Home','/product':'Selected Work','/cv':'Experience','/github':'GitHub projects','/art':'Art','/blog':'Writing'};
const LABELS = {cv_opened:'CV form opened',cv_submitted:'CV submitted',cv_request_saved:'Request saved',cv_request_rejected:'Request rejected',cv_download_initiated:'Download initiated',contact_opened:'Contact options',contact_clicked:'Contact chosen',email_copied:'Email copied',media_opened:'Image enlarged',video_started:'Video started',video_progress:'Video watched',video_completed:'Video completed',demo_started:'Demo launched',outbound_clicked:'Website link',navigation_clicked:'Navigation',filter_changed:'Filter changed',menu_opened:'Menu opened',cta_viewed:'CTA seen',section_viewed:'Section reached',scroll_depth_reached:'Scroll depth',evidence:'Evidence explored',conversion:'CV or contact action'};
const evidence = new Set(['media_opened','video_started','demo_started']);
const conversions = new Set(['cv_request_saved','contact_clicked','email_copied']);
const clickTypes = new Set(['navigation_clicked','outbound_clicked','cv_opened','cv_download_initiated','contact_opened','contact_clicked','email_copied','media_opened','video_started','filter_changed','menu_opened','demo_started']);
const noisy = new Set(['navigation_clicked','cta_viewed','section_viewed','scroll_depth_reached','video_progress','menu_opened']);
function day(ms) { return new Date(Number(ms) + 19800000).toISOString().slice(0,10); }
function shift(value, n) { return new Date(Date.parse(value+'T00:00:00Z') + n*DAY).toISOString().slice(0,10); }
function validDate(value) { return typeof value==='string' && /^\d{4}-\d{2}-\d{2}$/.test(value) && Number.isFinite(Date.parse(value)) && new Date(value).toISOString().slice(0,10)===value; }
function safePath(value) { return typeof value==='string' && value.length<=240 && /^\/(?:[a-zA-Z0-9_/-]*)$/.test(value) && !value.includes('//'); }
function normalizeOptions(body={}, now=Date.now()) {
  const allowed = new Set(['view','days','startDate','endDate','device','source','path','anchor','direction','detail','depth','limit','funnel','steps','sessionId']);
  if (!body || typeof body!=='object' || Array.isArray(body) || Object.keys(body).some(k=>!allowed.has(k))) throw new TypeError('Invalid report options.');
  const today=day(now), days=[1,7,30,90].includes(body.days)?body.days:30;
  const startDate=body.startDate??shift(today,1-days), endDate=body.endDate??today;
  if (!validDate(startDate)||!validDate(endDate)||startDate>endDate||endDate>today||startDate<shift(today,-179)) throw new TypeError('Choose dates within the last 180 days.');
  const view=body.view??'overview';
  if (!['overview','journey','funnel','pages','session','health'].includes(view)) throw new TypeError('Unknown report.');
  const result={view,startDate,endDate,until:shift(endDate,1),device:body.device||'',source:body.source||'',path:body.path||'',anchor:body.anchor||'',direction:body.direction||'after',detail:body.detail||'pages',depth:body.depth??5,limit:body.limit??5,funnel:body.funnel||'cv',steps:body.steps,sessionId:body.sessionId};
  if (result.device&&!['Phone','Tablet','Desktop'].includes(result.device)) throw new TypeError('Invalid device.');
  if (typeof result.source!=='string'||result.source.length>253||/[\x00-\x1f<>@]/.test(result.source)) throw new TypeError('Invalid source.');
  if (result.path&&!safePath(result.path)) throw new TypeError('Invalid page.');
  if (result.anchor&&!safePath(result.anchor)&&!TYPES.has(result.anchor)) throw new TypeError('Invalid starting point.');
  if (!['before','after'].includes(result.direction)||!['pages','actions','groups'].includes(result.detail)||!Number.isInteger(result.depth)||result.depth<2||result.depth>10||!Number.isInteger(result.limit)||result.limit<2||result.limit>12) throw new TypeError('Invalid chart options.');
  if (!['cv','work','project','contact','custom'].includes(result.funnel)) throw new TypeError('Unknown funnel.');
  if (result.sessionId && !/^[a-f0-9-]{36}$/i.test(result.sessionId)) throw new TypeError('Invalid session.');
  if (body.steps!==undefined) {
    if (!Array.isArray(body.steps)||body.steps.length<2||body.steps.length>6) throw new TypeError('Choose two to six stages.');
    result.steps=body.steps.map(s=>{
      if (!s||typeof s!=='object'||Object.keys(s).some(k=>!['type','path','target','label'].includes(k))||!TYPES.has(s.type)||(s.path&&!safePath(s.path))||(s.target&&!/^[a-zA-Z0-9_./:-]{1,160}$/.test(s.target))||(s.label&&(typeof s.label!=='string'||s.label.length>80||/[<>\x00-\x1f]/.test(s.label)))) throw new TypeError('Invalid funnel stage.');
      return {...s};
    });
  }
  return result;
}
function title(path) { return TITLES[path]||path.split('/').filter(Boolean).pop()?.replace(/[-_]/g,' ').replace(/^./,x=>x.toUpperCase())||'Home'; }
function group(path) { return path.startsWith('/product/')?'Case studies':TITLES[path]|| (path.startsWith('/art/')?'Art':path.startsWith('/blog/')?'Writing':title(path)); }
function median(values) { if(!values.length)return null; const a=values.slice().sort((x,y)=>x-y),m=Math.floor(a.length/2);return a.length%2?a[m]:(a[m-1]+a[m])/2; }
function stamp(x) { const n=new Date(x).getTime(); return Number.isFinite(n)?n:0; }
function indexData(data,o) {
  const start=Date.parse(o.startDate+'T00:00:00+05:30'),until=Date.parse(o.until+'T00:00:00+05:30');
  const allViews=data.views.map(v=>{const time=stamp(v.occurred_at),inRange=time>=start&&time<until,boundary=!inRange||stamp(v.last_observed_at)>=until;return {...v,time,inRange,boundary,active_ms:boundary||v.active_ms===null||v.active_ms===undefined?null:Number(v.active_ms),sequence:Number(v.sequence)};});
  const views=allViews.filter(v=>v.inRange), map=new Map(allViews.map(v=>[v.id,v]));
  const events=data.events.flatMap(e=>{const v=map.get(e.page_view_id);return v&&stamp(e.occurred_at)>=start&&stamp(e.occurred_at)<until?[{...e,time:stamp(e.occurred_at),sequence:Number(e.sequence),path:v.path,browser_hash:v.browser_hash,source:v.source,device:v.device}]:[];});
  const sessions=new Map();
  for(const v of allViews){if(!sessions.has(v.session_id))sessions.set(v.session_id,{id:v.session_id,browser:v.browser_hash,source:v.source,device:v.device,last:stamp(v.session_last_activity),views:[],events:[]});sessions.get(v.session_id).views.push(v);}
  for(const e of events)sessions.get(e.session_id)?.events.push(e);
  for(const s of sessions.values())s.timeline=[...s.views.filter(v=>v.inRange).map(v=>({...v,event_type:'page_view',page_view_id:v.id})),...s.events].sort((a,b)=>a.time-b.time||(a.tab_id===b.tab_id?a.sequence-b.sequence:0)||String(a.event_id||a.id).localeCompare(String(b.event_id||b.id)));
  return {views,allViews,events,sessions,start,until};
}
function base(data,o) {return {available:Boolean(data.available),coverage:data.coverage||{startedAt:null,engagementStartedAt:null},range:{startDate:o.startDate,endDate:o.endDate},truncated:Boolean(data.truncated)};}
function journey(data,o,now) {
  const d=indexData(data,o), paths=new Map();
  for(const s of d.sessions.values())for(const event of s.timeline){if(event.event_type!=='page_view'&&(o.detail!=='actions'||noisy.has(event.event_type)))continue;const key=s.id+':'+event.tab_id;if(!paths.has(key))paths.set(key,{session:s,items:[]});paths.get(key).items.push(event);}
  const selected=[];
  for(const item of paths.values()){
    let items=item.items.sort((a,b)=>a.time-b.time||a.sequence-b.sequence).filter((e,i,arr)=>!(e.event_type==='page_view'&&i&&arr[i-1].event_type==='page_view'&&arr[i-1].path===e.path));
    if(o.anchor){const at=items.findIndex(e=>e.path===o.anchor||e.event_type===o.anchor);if(at<0)continue;items=o.direction==='before'?items.slice(0,at+1).reverse():items.slice(at);}
    const steps=items.map(e=>e.event_type==='page_view'?{key:o.detail==='groups'?group(e.path):e.path,label:o.detail==='groups'?group(e.path):title(e.path),kind:'page',path:e.path}:{key:e.event_type+':'+(e.target||''),label:(LABELS[e.event_type]||e.event_type)+(e.target&&!['cv','email','video','image','menu'].includes(e.target)?' · '+title(e.target):''),kind:'action',eventType:e.event_type});
    if(!o.anchor)steps.unshift({key:'source:'+item.session.source,label:item.session.source,kind:'source'});
    const continued=steps.length>o.depth;
    const end=continued?'continued':o.direction==='before'&&o.anchor?'start':now-item.session.last<TIMEOUT?'in_progress':'ended';
    const list=steps.slice(0,o.depth);
    list.push({key:end,label:{continued:'Continued beyond displayed steps',start:'Start of recorded tab journey',in_progress:'In progress',ended:'No further recorded activity'}[end],kind:end});
    selected.push({steps:list,session:item.session});
  }
  const stages=[];for(const p of selected)p.steps.forEach((n,i)=>{stages[i]||=new Map();const old=stages[i].get(n.key);if(old)old.count++;else stages[i].set(n.key,{...n,count:1});});
  const keep=stages.map(m=>new Set([...m].filter(([,n])=>!['ended','continued','in_progress','start'].includes(n.kind)).sort((a,b)=>b[1].count-a[1].count||a[0].localeCompare(b[0])).slice(0,o.limit).map(([k])=>k)));
  const nodes=new Map(),links=new Map();
  for(const p of selected){let previous; p.steps.forEach((n,stage)=>{const terminal=['ended','continued','in_progress','start'].includes(n.kind);const other=!terminal&&!keep[stage].has(n.key);const key=other?'other':n.key;const id=stage+':'+key; if(!nodes.has(id))nodes.set(id,{id,stage,label:other?'Other':n.label,kind:other?'other':n.kind,...(!other&&n.path?{path:n.path}:{}),...(!other&&n.eventType?{eventType:n.eventType}:{}),count:0,browserSet:new Set(),sessionSet:new Set()});nodes.get(id).count++;nodes.get(id).browserSet.add(p.session.browser);nodes.get(id).sessionSet.add(p.session.id);if(previous){const edge=previous+'\0'+id;if(!links.has(edge))links.set(edge,{source:previous,target:id,count:0});links.get(edge).count++;}previous=id;});}
  return {...base(data,o),unit:'tab journeys',totalJourneys:selected.length,sessions:new Set(selected.map(p=>p.session.id)).size,browsers:new Set(selected.map(p=>p.session.browser)).size,nodes:[...nodes.values()].map(({browserSet,sessionSet,...n})=>({...n,browsers:browserSet.size,sessions:sessionSet.size})),links:[...links.values()]};
}
const FUNNELS={cv:[{type:'cv_opened'},{type:'cv_submitted'},{type:'cv_request_saved'},{type:'cv_download_initiated'}],work:[{type:'page_view',path:'/product',label:'Selected Work'},{type:'page_view',target:'case',label:'Case study'},{type:'cv_opened'},{type:'cv_request_saved'}],project:[{type:'page_view',target:'case',label:'Case study'},{type:'evidence'},{type:'conversion'}],contact:[{type:'contact_opened'},{type:'conversion',target:'contact',label:'Contact chosen or email copied'}]};
function matches(e,s) {const type=s.type==='evidence'?evidence.has(e.event_type):s.type==='conversion'?conversions.has(e.event_type):e.event_type===s.type;return type&&(!s.path||s.path===e.path)&&(!s.target||(s.target==='case'?e.path.startsWith('/product/'):s.target==='contact'?['contact_clicked','email_copied'].includes(e.event_type):s.target===e.target));}
function funnel(data,o,now) {
  const d=indexData(data,o),steps=o.steps||FUNNELS[o.funnel]||FUNNELS.cv,counts=steps.map(()=>0),times=steps.map(()=>[]),pendingAtStage=steps.map(()=>0);let pending=0;const daily=new Map();
  for(const s of d.sessions.values()){let cursor=0,previous=null,entered=null;for(const e of s.timeline){if(matches(e,steps[cursor])){counts[cursor]++;if(previous!==null)times[cursor].push(Math.max(0,e.time-previous));previous=e.time;if(entered===null)entered=day(e.time);cursor++;if(cursor===steps.length)break;}}
    if(cursor){if(!daily.has(entered))daily.set(entered,{date:entered,entered:0,converted:0});daily.get(entered).entered++;if(cursor===steps.length)daily.get(entered).converted++;else if(now-s.last<TIMEOUT){pending++;pendingAtStage[cursor-1]++;}}}
  return {...base(data,o),unit:'sessions',total:counts[0],pending,provisional:pending>0,steps,stages:steps.map((s,i)=>({id:String(i),label:s.label||(s.path?title(s.path):LABELS[s.type]||s.type),count:counts[i],fromStart:counts[0]?counts[i]/counts[0]:null,fromPrevious:i&&counts[i-1]?counts[i]/counts[i-1]:i?null:1,dropOff:i?counts[i-1]-counts[i]-pendingAtStage[i-1]:0,pendingAtStage:pendingAtStage[i],medianMs:median(times[i]),medianToNextMs:i+1<steps.length?median(times[i+1]):null})),daily:[...daily.values()].sort((a,b)=>a.date.localeCompare(b.date))};
}
function pages(data,o) {
  const d=indexData(data,o),groups=new Map();for(const v of d.allViews){if(!groups.has(v.path))groups.set(v.path,[]);groups.get(v.path).push(v);}
  const eventsByPage=new Map();for(const e of d.events){if(!eventsByPage.has(e.path))eventsByPage.set(e.path,[]);eventsByPage.get(e.path).push(e);}
  const entries=new Map(),last=new Map();for(const s of d.sessions.values()){const ordered=s.views.slice().sort((a,b)=>a.time-b.time);if(ordered.length){if(ordered[0].inRange&&(!ordered[0].session_started_at||stamp(ordered[0].session_started_at)>=d.start))entries.set(ordered[0].path,(entries.get(ordered[0].path)||0)+1);last.set(ordered.at(-1).path,(last.get(ordered.at(-1).path)||0)+1);}}
  return {...base(data,o),pages:[...groups].map(([path,vs])=>{const es=eventsByPage.get(path)||[],timed=vs.filter(v=>v.active_ms!==null),activeMs=timed.reduce((a,v)=>a+v.active_ms,0),controls=new Map(),sections=new Map(),scroll=new Map(),media=new Map();
    for(const e of es){if(e.event_type==='scroll_depth_reached'){const depth=Number(e.value??e.target);if([25,50,75,90].includes(depth)){if(!scroll.has(depth))scroll.set(depth,new Set());scroll.get(depth).add(e.page_view_id);}continue;}if(e.event_type==='section_viewed'){const key=e.control||e.target;if(!sections.has(key))sections.set(key,new Set());sections.get(key).add(e.page_view_id);continue;}
      if(e.event_type.startsWith('video_')||['media_opened','demo_started'].includes(e.event_type)){const k=(e.control||e.target)+':'+e.event_type+':'+(e.value||'');if(!media.has(k))media.set(k,{id:e.control||e.target,type:e.event_type,count:0,value:e.value});media.get(k).count++;}
      if(e.control&&(e.event_type==='cta_viewed'||clickTypes.has(e.event_type))){const k=e.control;if(!controls.has(k))controls.set(k,{id:k,type:e.event_type,target:e.target,count:0,views:new Set(),seen:new Set()});const c=controls.get(k);if(e.event_type==='cta_viewed')c.seen.add(e.page_view_id);else {c.count++;c.type=e.event_type;c.views.add(e.page_view_id);c.seen.add(e.page_view_id);}}}
    return {path,title:title(path),views:vs.filter(v=>v.inRange).length,browsers:new Set(vs.map(v=>v.browser_hash)).size,sessions:new Set(vs.map(v=>v.session_id)).size,activeMs,measuredViews:timed.length,avgActiveMs:timed.length?activeMs/timed.length:null,medianActiveMs:median(timed.map(v=>v.active_ms)),entries:entries.get(path)||0,lastObserved:last.get(path)||0,scroll:[...scroll].map(([depth,s])=>({depth,count:s.size})),sections:[...sections].map(([name,s])=>({name,count:s.size})),controls:[...controls.values()].map(c=>({id:c.id,type:c.type,target:c.target,count:c.count,impressions:c.seen.size,clickRate:c.seen.size?c.views.size/c.seen.size:null})).sort((a,b)=>b.count-a.count),media:[...media.values()]};}).sort((a,b)=>b.views-a.views||a.path.localeCompare(b.path))};
}
function overview(data,o,now) {
  const d=indexData(data,o),timed=d.views.filter(v=>v.active_ms!==null),activeMs=timed.reduce((a,v)=>a+v.active_ms,0),daily=new Map(),sources=new Map(),devices=new Map();
  for(let date=o.startDate;date<=o.endDate;date=shift(date,1))daily.set(date,{date,views:0,sessions:new Set(),browsers:new Set(),activeMs:0,cvRequests:0});
  for(const v of d.views){const row=daily.get(day(v.time));if(row){row.views++;row.sessions.add(v.session_id);row.browsers.add(v.browser_hash);row.activeMs+=v.active_ms||0;}}
  for(const e of d.events){const row=daily.get(day(e.time));if(row){row.sessions.add(e.session_id);row.browsers.add(e.browser_hash);if(e.event_type==='cv_request_saved')row.cvRequests++;}}
  for(const s of d.sessions.values()){sources.set(s.source,(sources.get(s.source)||0)+1);devices.set(s.device,(devices.get(s.device)||0)+1);}
  const measuredSessions=[...d.sessions.values()].filter(s=>s.views.some(v=>v.active_ms!==null));
  // Focus-gated collection prevents ordinary overlap. Clamp sessions to the
  // observed wall interval too, so multiple windows cannot inflate total time.
  const sessionTimes=measuredSessions.map(s=>Math.min(s.views.reduce((a,v)=>a+(v.active_ms||0),0),s.views.reduce((a,v)=>Math.max(a,stamp(v.last_observed_at)),0)-s.views.reduce((a,v)=>Math.min(a,v.time),Infinity)));
  const summary={browsers:new Set(d.allViews.map(v=>v.browser_hash)).size,sessions:d.sessions.size,views:d.views.length,activeMs,measuredViews:timed.length,avgActiveMs:timed.length?activeMs/timed.length:null,medianActiveMs:median(timed.map(v=>v.active_ms)),avgSessionActiveMs:sessionTimes.length?sessionTimes.reduce((a,b)=>a+b,0)/sessionTimes.length:null,cvRequests:d.events.filter(e=>e.event_type==='cv_request_saved').length,cvDownloadStarts:d.events.filter(e=>e.event_type==='cv_download_initiated').length,contactActions:d.events.filter(e=>['contact_clicked','email_copied'].includes(e.event_type)).length,activeSessions:[...d.sessions.values()].filter(s=>now-s.last<5*60000).length,engagedSessions:[...d.sessions.values()].filter(s=>s.views.length>=2||s.views.reduce((a,v)=>a+(v.active_ms||0),0)>=10000||s.events.some(e=>conversions.has(e.event_type))).length};
  return {...base(data,o),summary,daily:[...daily.values()].map(r=>data.coverage?.startedAt&&r.date<day(stamp(data.coverage.startedAt))?{date:r.date,views:null,sessions:null,browsers:null,activeMs:null,cvRequests:null}:{...r,sessions:r.sessions.size,browsers:r.browsers.size,partial:Boolean(data.coverage?.startedAt&&r.date===day(stamp(data.coverage.startedAt)))}),sources:[...sources].map(([name,count])=>({name,count})).sort((a,b)=>b.count-a.count),devices:[...devices].map(([name,count])=>({name,count})),filters:{sources:[...sources.keys()].sort(),paths:[...new Set(d.allViews.map(v=>v.path))].sort()},health:{lastEventAt:d.allViews.length?new Date(d.events.reduce((a,e)=>Math.max(a,e.time),d.allViews.reduce((a,v)=>Math.max(a,Math.min(stamp(v.last_observed_at),d.until-1)),0))).toISOString():null,boundaryTimingExcluded:d.allViews.filter(v=>v.boundary).length,timingCoverage:d.views.length?timed.length/d.views.length:null,retentionDays:180,source:'First-party browser events',emailLinkage:false}};
}
function explore(data,options={},now=Date.now()) {
  const o=normalizeOptions(options,now);if(!data.available)return {...base(data,o),available:false,reason:'Journey measurement has not started. Historical page views remain available; paths and time cannot be reconstructed.'};
  if(data.truncated)return {...base(data,o),available:false,reason:'This selection exceeds the report limit. Choose a shorter period or a source filter; no sampled totals are shown.'};
  if(o.view==='journey')return journey(data,o,now);if(o.view==='funnel')return funnel(data,o,now);if(o.view==='pages')return pages(data,o);if(o.view==='session'){const d=indexData(data,o),s=d.sessions.get(o.sessionId);return {...base(data,o),session:s?{id:s.id,source:s.source,device:s.device,timeline:s.timeline.slice(0,300).map(e=>({type:e.event_type,path:e.path,target:e.target,occurredAt:new Date(e.time).toISOString(),activeMs:e.active_ms??null}))}:null};}return overview(data,o,now);
}
module.exports={normalizeOptions,explore,title,day,shift,FUNNELS};
