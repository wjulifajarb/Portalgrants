/** PORTAL EDUCAMÁS · frontend sin dependencias ni login */
const C={
  id:'ID maestro',year:'Año oportunidad',ally:'Empresa/aliado/Grant/cliente',
  name:'Convocatoria / proyecto',status:'Status',priority:'Expectativa',
  client:'Tipo de cliente',relation:'Antiguo o nuevo',line:'Línea de negocio',
  type:'Tipo de oportunidad',description:'Descripción de oportunidad',
  eligibility:'Elegibilidad / requisitos',fit:'Encaje Educamás',
  start:'Fecha de apertura',deadline:'Fecha límite envío o envío de la propuesta',
  deadlineWeb:'Fecha cierre web',sendDate:'Fecha de envío',nextDate:'Fecha próximo seguimiento',
  next:'Próxima acción',requestedOriginal:'Valor de la propuesta',
  requestedCOP:'Valor propuesto COP REGISTRADO',requestedValidated:'Valor propuesto COP VALIDADO',
  approvedCOP:'Valor aprobado COP DOCUMENTADO',reportedCOP:'Monto adjudicado COP REPORTADO',
  awardedOriginal:'Monto adjudicado original',awardedCurrency:'Moneda adjudicación',
  currency:'Moneda original',publicAmount:'Monto PÚBLICO del programa (NO propuesta)',
  folder:'URL carpeta Drive',callUrl:'URL convocatoria',applyUrl:'URL postulación',
  termsUrl:'Link TR',proposalUrl:'Link de la propuesta',contact:'Contacto',
  verification:'Estado verificación',sendVerified:'Envío comprobado',
  resultVerified:'Resultado documentado',feedback:'Feedback / retroalimentación',
  notes:'Observaciones',alert:'Alertas / inconsistencias',source:'Fuentes consolidadas',
  outcome:'Resultado del grant',outcomeDate:'Fecha de decisión',
  outcomeProof:'URL soporte del resultado',lessons:'Lecciones aprendidas / análisis'
};
const STAGES=['Mapeada','En preparación','Enviada','Segunda fase','Adjudicada','Rechazada','No postulada'];
const OUTCOMES=['Pendiente','Adjudicado','No adjudicado','No postulado','Desistido'];
const STEP_STATES=['Pendiente','En curso','Bloqueado','Completado'];
const REVISIONS=['Por evaluar','Postular','Postular con condiciones','No postular','Esperar nueva edición'];
const state={view:'dashboard',items:[],dashboard:null,options:{catalog:{},years:[]},year:'all',query:'',stage:'all',outcome:'all',selectedId:null,detail:null,tab:'summary',busy:false};
const $=id=>document.getElementById(id);
const escapeHTML=s=>String(s??'').replace(/[&<>"']/g,ch=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[ch]));
const money=n=>(n===null||n===undefined||n==='')?'—':Number(n).toLocaleString('es-CO',{style:'currency',currency:'COP',maximumFractionDigits:0});
const number=n=>Number(n||0).toLocaleString('es-CO');
const safeUrl=v=>{try{const u=new URL(v);return ['http:','https:'].includes(u.protocol)?u.href:'';}catch{return '';}};
const link=(url,label)=>safeUrl(url)?`<a class="link-chip" rel="noopener noreferrer" target="_blank" href="${escapeHTML(safeUrl(url))}">${escapeHTML(label)} ↗</a>`:'';
const short=(v,n=170)=>String(v||'').length>n?String(v).slice(0,n)+'…':String(v||'');
function badge(text){const t=String(text||'—');const cls=/adjudicad|completad/i.test(t)&&!/no adjud/i.test(t)?'green':/rechazad|no adjudicad|bloquead/i.test(t)?'red':/urgente|30 dias|pendiente|preparacion|segunda fase/i.test(t)?'amber':/enviad|curso/i.test(t)?'blue':'neutral';return `<span class="badge ${cls}">${escapeHTML(t)}</span>`;}
function showToast(message,bad=false){const t=$('toast');t.textContent=message;t.className='toast'+(bad?' danger':'');clearTimeout(showToast.timer);showToast.timer=setTimeout(()=>t.classList.add('hidden'),4800);}
function loading(isBusy){state.busy=isBusy;$('refreshBtn').disabled=isBusy;}
async function api(action,payload={}){
  const r=await fetch('/api/grants',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({action,payload}),cache:'no-store'});
  const x=await r.json().catch(()=>({ok:false,error:'La API respondió con un formato inesperado.'}));
  if(!r.ok||!x.ok)throw new Error(x.error||'Error de conexión con Google Sheets.');
  return x.data;
}
async function load(){
  if(state.busy)return;
  loading(true);
  try{
    const [dashboard,options,page]=await Promise.all([api('dashboard'),api('options'),api('list',{page:1,pageSize:250})]);
    let items=[...page.items];
    if(page.total>items.length){
      const pages=Math.ceil(page.total/250);
      for(let p=2;p<=pages;p++){const more=await api('list',{page:p,pageSize:250});items.push(...more.items);}
    }
    state.dashboard=dashboard;state.options=options;state.items=items;
    $('lastUpdated').textContent=`Actualizado ${dashboard.updatedAt||''}`;
    render();
  }catch(err){
    $('mainContent').innerHTML=`<div class="panel"><h2>No fue posible conectar con Google Sheets</h2><p>${escapeHTML(err.message)}</p><div class="warning-box">Verifica la URL /exec, la implementación pública de Apps Script y las variables de entorno de Vercel. No coloques la clave en esta página.</div><button class="btn btn-primary" data-action="refresh">Reintentar</button></div>`;
    showToast(err.message,true);
  }finally{loading(false);}
}
function navigate(view){state.view=view;state.query='';state.stage='all';state.outcome='all';document.querySelectorAll('[data-nav]').forEach(b=>b.classList.toggle('selected',b.dataset.nav===view));$('pageName').textContent=({dashboard:'Vista general',opportunities:'Convocatorias',analysis:'Análisis y resultados',new:'Nuevo grant'})[view]||'Inicio';document.querySelector('.sidebar').classList.remove('open');render();window.scrollTo({top:0,behavior:'smooth'});}
function yearsOptions(selected='all'){const years=[...new Set(state.items.map(x=>x.year).filter(Boolean))].sort((a,b)=>b-a);return `<option value="all" ${selected==='all'?'selected':''}>Todos los años</option>`+years.map(y=>`<option value="${y}" ${String(selected)===String(y)?'selected':''}>${y}</option>`).join('');}
function header(title,subtitle='',extras=''){return `<div class="page-head"><div><div class="eyebrow">CONTROL DE INNOVACIÓN</div><h1>${escapeHTML(title)}</h1><p>${escapeHTML(subtitle)}</p></div><div class="head-actions">${extras}</div></div>`;}
function stat(label,value,foot='',highlight=false){return `<div class="stat ${highlight?'highlight':''}"><span class="mini-icon">✳</span><div class="stat-label">${escapeHTML(label)}</div><div class="stat-val">${escapeHTML(value)}</div><div class="stat-foot">${escapeHTML(foot)}</div></div>`;}
function filteredByYear(){return state.items.filter(x=>state.year==='all'||String(x.year)===String(state.year));}
function dashboardView(){
  const arr=filteredByYear();const count=stage=>arr.filter(x=>x.stage===stage).length;const sent=arr.filter(x=>x.submittedCRM).length;
  const future=arr.filter(x=>Number.isFinite(x.daysLeft)&&x.daysLeft>=0&&!['Enviada','Segunda fase','Adjudicada','Rechazada','No postulada'].includes(x.stage)).sort((a,b)=>a.daysLeft-b.daysLeft).slice(0,5);
  const max=Math.max(1,...STAGES.map(count));const years=[...new Set(state.items.map(x=>x.year).filter(Boolean))].sort((a,b)=>b-a);
  return header('Radar de financiación','Monitoreo de grants, alianzas y resultados de Educamás',`<select class="select year-select" id="yearFilter">${yearsOptions(state.year)}</select><button class="btn btn-primary" data-action="new">＋ Nuevo grant</button>`)+`
   <div class="hero"><div><div class="eyebrow">INTELIGENCIA DE OPORTUNIDADES</div><h2>Más oportunidades.<br><span>Más impacto.</span></h2><p>Tu radar central de subvenciones, oportunidades comerciales y convocatorias, con trazabilidad desde el mapeo hasta el resultado.</p></div></div>
   <div class="stat-grid">${stat('Oportunidades únicas',number(arr.length),'Sin duplicar el ID maestro',true)}${stat('Enviadas históricas',number(sent),'Según etapa CRM; verificar soporte')}${stat('En segunda fase',number(count('Segunda fase')),'Pendientes de decisión')}${stat('Adjudicadas en CRM',number(count('Adjudicada')),'No todas están documentadas')}${stat('Mapeadas',number(count('Mapeada')))}${stat('En preparación',number(count('En preparación')))}${stat('Rechazadas',number(count('Rechazada')))}${stat('Monto documentado + enlace',money(arr.reduce((s,x)=>s+(x.proofLinkRecorded?(x.documentedAwardCOP||0):0),0)),'Soportes registrados, no auditados')}</div>
   <div class="section-grid"><section class="panel"><div class="panel-title"><h3>5 próximas convocatorias por enviar</h3>${badge('Radar de cierres')}</div><p class="hint">Muestra las siguientes cinco fechas. Amarillo desde 30 días antes; rojo en la última semana.</p>${future.length?future.map(x=>`<div class="date-card"><div><b>${escapeHTML(x.name)}</b><div class="sub">${escapeHTML(x.ally)} · cierre ${escapeHTML(x.deadline||'—')}</div><div class="link-group" style="margin-top:8px">${link(x.applyUrl,'Postulación')}${link(x.termsUrl,'Términos')}</div></div><div class="date-card-right">${badge(x.daysLeft<=7?'Urgente':x.daysLeft<=30?'30 días':'Programado')}<strong class="no-break">${x.daysLeft} días</strong><button class="btn btn-small" data-action="detail" data-id="${escapeHTML(x.id)}">Ver ficha</button></div></div>`).join(''):'<div class="empty">No hay oportunidades pendientes con fechas de cierre futuras y exactas.</div>'}</section>
   <section class="panel"><h3>Embudo de seguimiento</h3><p class="hint">Distribución por estado actual, sin doble contabilización.</p>${STAGES.map(stage=>`<div class="funnel-row"><label>${escapeHTML(stage)}</label><div class="track"><div style="width:${count(stage)/max*100}%"></div></div><b>${number(count(stage))}</b></div>`).join('')}<p class="subtle" style="margin-top:19px">Una convocatoria aparece en una única etapa. El total histórico de enviadas incluye segunda fase, adjudicadas y rechazadas.</p></section></div>
   <section class="panel"><h3>Histórico anual</h3><p class="hint">Comparación por año de oportunidad; los estados del CRM no equivalen a envíos comprobados.</p><div class="table-wrap"><table class="data-table"><thead><tr><th>Año</th><th class="numeric">Total</th><th class="numeric">Enviadas CRM</th><th class="numeric">Envío con registro</th><th class="numeric">Segunda fase</th><th class="numeric">Adjudicadas CRM</th><th class="numeric">Rechazadas CRM</th></tr></thead><tbody>${years.map(y=>{const r=state.items.filter(x=>x.year===y);return `<tr><td><b>${y}</b></td><td class="numeric">${r.length}</td><td class="numeric">${r.filter(x=>x.submittedCRM).length}</td><td class="numeric">${r.filter(x=>x.submissionEvidenceRecorded).length}</td><td class="numeric">${r.filter(x=>x.stage==='Segunda fase').length}</td><td class="numeric">${r.filter(x=>x.stage==='Adjudicada').length}</td><td class="numeric">${r.filter(x=>x.stage==='Rechazada').length}</td></tr>`;}).join('')}</tbody></table></div><div class="info-box">${escapeHTML(state.dashboard?.amountDisclaimer||'La evidencia de envío y de adjudicación debe verificarse documentalmente.')}</div></section>`;
}
function listFiltered(){const q=state.query.toLowerCase().trim();return state.items.filter(x=>(state.year==='all'||String(x.year)===String(state.year))&&(state.stage==='all'||x.stage===state.stage)&&(state.outcome==='all'||x.outcome===state.outcome)&&(!q||[x.name,x.ally,x.id,x.description].join(' ').toLowerCase().includes(q)));}
function opportunityCard(x){return `<article class="opportunity-card"><div class="opportunity-top"><span>${escapeHTML(x.year||'Sin año')} · ${escapeHTML(x.id)}</span>${badge(x.stage)}</div><h3>${escapeHTML(x.name)}</h3><p>${escapeHTML(x.ally)} · ${escapeHTML(short(x.description||x.type,125))}</p><div class="opportunity-foot"><div><div class="metric-label">Monto solicitado COP</div><strong>${money(x.requestedCOP)}</strong></div><button class="btn btn-primary btn-small" data-action="detail" data-id="${escapeHTML(x.id)}">Abrir análisis ↗</button></div><div class="link-group opportunity-links">${link(x.driveUrl,'Carpeta Educamás')}${link(x.termsUrl,'Términos')}${link(x.applyUrl,'Postulación')}</div></article>`;}
function opportunitiesView(){const filtered=listFiltered();return header('Convocatorias','Todas las oportunidades, documentos y acciones en un solo lugar',`<button class="btn btn-primary" data-action="new">＋ Nueva convocatoria</button>`)+`<div class="toolbar"><input class="input" id="searchInput" placeholder="Buscar por aliado, grant, proyecto o ID" value="${escapeHTML(state.query)}"><select id="yearFilter" class="select">${yearsOptions(state.year)}</select><select id="stageFilter" class="select"><option value="all">Todas las etapas</option>${STAGES.map(s=>`<option value="${escapeHTML(s)}" ${state.stage===s?'selected':''}>${escapeHTML(s)}</option>`).join('')}</select></div><div class="result-count">${number(filtered.length)} oportunidades encontradas.</div><div class="opportunity-grid">${filtered.map(opportunityCard).join('')||'<div class="empty">No hay registros con estos filtros.</div>'}</div>`;}
function analysisView(){const a=listFiltered();const awarded=state.items.filter(x=>x.outcome==='Adjudicado');const rejected=state.items.filter(x=>x.outcome==='No adjudicado');const documented=state.items.reduce((s,x)=>s+(x.proofLinkRecorded?(x.documentedAwardCOP||0):0),0);const years=[...new Set(state.items.map(x=>x.year).filter(Boolean))].sort((a,b)=>b-a);
return header('Análisis y resultados','Decisiones, montos aprobados, revisiones y rutas de trabajo')+`<div class="stat-grid">${stat('Resultado adjudicado',number(awarded.length),'Confirmación documental por revisar',true)}${stat('No adjudicadas',number(rejected.length),'Estado de rechazo registrado')}${stat('Pendientes de decisión',number(state.items.filter(x=>x.outcome==='Pendiente').length))}${stat('Adjudicación documentada COP',money(documented),'Solo con enlace de soporte')}</div>
<section class="panel"><h3>Resultado de convocatorias por año</h3><div class="table-wrap"><table class="data-table"><thead><tr><th>Año</th><th class="numeric">Enviadas históricas</th><th class="numeric">Adjudicadas</th><th class="numeric">No adjudicadas</th><th class="numeric">Monto documentado con enlace</th></tr></thead><tbody>${years.map(y=>{const r=state.items.filter(x=>x.year===y);return `<tr><td><b>${y}</b></td><td class="numeric">${r.filter(x=>x.submittedCRM).length}</td><td class="numeric">${r.filter(x=>x.outcome==='Adjudicado').length}</td><td class="numeric">${r.filter(x=>x.outcome==='No adjudicado').length}</td><td class="numeric">${money(r.reduce((s,x)=>s+(x.proofLinkRecorded?(x.documentedAwardCOP||0):0),0))}</td></tr>`;}).join('')}</tbody></table></div></section>
<section class="panel"><div class="section-heading"><h3>Revisión individual de convocatorias</h3>${badge('Resultados auditables')}</div><div class="toolbar"><input class="input" id="searchInput" placeholder="Buscar resultado o financiador" value="${escapeHTML(state.query)}"><select id="yearFilter" class="select">${yearsOptions(state.year)}</select><select id="outcomeFilter" class="select"><option value="all">Todos los resultados</option>${OUTCOMES.map(s=>`<option ${state.outcome===s?'selected':''}>${s}</option>`).join('')}</select></div><div class="table-wrap"><table class="data-table"><thead><tr><th>Convocatoria y aliado</th><th>Etapa</th><th>Resultado</th><th class="numeric">Solicitado COP</th><th class="numeric">Adjudicado reportado</th><th class="numeric">Documentado COP</th><th>Soporte</th><th></th></tr></thead><tbody>${a.map(x=>`<tr><td class="name-cell">${escapeHTML(x.name)}<small>${escapeHTML(x.ally)} · ${x.year}</small></td><td>${badge(x.stage)}</td><td>${badge(x.outcome)}</td><td class="numeric">${money(x.requestedCOP)}</td><td class="numeric">${money(x.reportedAwardCOP)}</td><td class="numeric">${money(x.documentedAwardCOP)}</td><td>${x.proofLinkRecorded?link(x.outcomeProofUrl,'Ver enlace'):'<span class="number-small">Pendiente</span>'}</td><td><button class="btn btn-small btn-primary" data-action="detail" data-id="${escapeHTML(x.id)}">Analizar</button></td></tr>`).join('')}</tbody></table></div><p class="subtle" style="margin-top:12px">El enlace de soporte confirma que existe una referencia, no que el documento haya sido auditado. No usar montos registrados sin validar para informes financieros oficiales.</p></section>`;
}
function render(){if(!state.dashboard)return;const root=$('mainContent');root.innerHTML=state.view==='dashboard'?dashboardView():state.view==='opportunities'?opportunitiesView():state.view==='analysis'?analysisView():newGrantView();}

// Los alias de la API coinciden con el objeto C del Google Apps Script.
const FIELD_GROUPS=[
  ['Identificación y clasificación',[
    ['year','Año de oportunidad','number'],['ally','Financiador / aliado','text'],
    ['name','Convocatoria / proyecto','text'],['status','Estado CRM','select'],
    ['priority','Expectativa / prioridad','select'],['client','Tipo de cliente','select'],
    ['relation','Antiguo o nuevo','select'],['line','Líneas de negocio (selección múltiple)','multi'],
    ['type','Tipo de oportunidad','select'],['contact','Contacto','text']
  ]],
  ['Descripción y evaluación',[
    ['description','Descripción de la oportunidad','textarea'],
    ['eligibility','Requisitos / elegibilidad','textarea'],
    ['fit','Encaje con Educamás','textarea'],
    ['verification','Estado de verificación','text'],
    ['next','Próxima acción','textarea'],
    ['nextDate','Fecha de seguimiento','date'],
    ['notes','Observaciones','textarea'],
    ['feedback','Retroalimentación','textarea']
  ]],
  ['Montos y fechas',[
    ['currency','Moneda de propuesta','text'],
    ['requestedOriginal','Valor de la propuesta original','text'],
    ['requestedCOP','Valor propuesto COP REGISTRADO','text'],
    ['requestedValidated','Valor propuesto COP VALIDADO','text'],
    ['publicAmount','Monto PÚBLICO del programa (no adjudicado)','text'],
    ['start','Fecha de apertura','date'],
    ['deadline','Fecha límite interna / envío','text'],
    ['deadlineWeb','Fecha cierre web exacta','date'],
    ['sendDate','Fecha de envío comprobado / informada','date']
  ]],
  ['Enlaces y documentos',[
    ['folder','Carpeta Drive de Educamás','url'],
    ['callUrl','URL convocatoria','url'],
    ['applyUrl','URL directa de postulación','url'],
    ['termsUrl','Términos de referencia','url'],
    ['proposalUrl','Propuesta Educamás','url']
  ]]
];
function toDate(v){const s=String(v||'').trim();if(/^\d{4}-\d{2}-\d{2}/.test(s))return s.slice(0,10);const m=s.match(/^(\d{1,2})\/(\d{1,2})\/(\d{4})$/);return m?`${m[3]}-${m[2].padStart(2,'0')}-${m[1].padStart(2,'0')}`:'';}
function cellInput(key,label,type,value='',required=false){
  const id=`grant_${key}`;const val=String(value??'');const opts=state.options.catalog?.[C[key]]||[];
  let control='';
  if(type==='multi'){
    const selected=val.split(/\s+\|\s+/).map(s=>s.trim()).filter(Boolean);
    const all=[...new Set([...opts,...selected])];
    control=`<div class="multi-box">${all.map((x,i)=>`<label class="multi-option"><input type="checkbox" name="line" value="${escapeHTML(x)}" ${selected.includes(x)?'checked':''}>${escapeHTML(x)}</label>`).join('')}</div><small>Puedes marcar varias líneas. Las opciones provienen de la hoja Catálogos.</small>`;
  }else if(type==='textarea'){
    control=`<textarea class="textarea" name="${key}" id="${id}" ${required?'required':''}>${escapeHTML(val)}</textarea>`;
  }else if(type==='select'){
    const choices=[...new Set([val,...opts].filter(Boolean))];
    control=`<select class="select" name="${key}" id="${id}"><option value="">Seleccionar</option>${choices.map(x=>`<option ${x===val?'selected':''} value="${escapeHTML(x)}">${escapeHTML(x)}</option>`).join('')}</select>`;
  }else{
    control=`<input class="input" name="${key}" id="${id}" type="${type}" value="${escapeHTML(type==='date'?toDate(val):val)}" ${required?'required':''} ${type==='number'?'min="2020" max="2100"':''}>`;
  }
  return `<div class="form-field ${type==='textarea'||type==='multi'?'span2':''}"><label for="${id}">${escapeHTML(label)}${required?' *':''}</label>${control}</div>`;
}
function grantFormHTML(detail=null){const fields=detail?.fields||{};const newRecord=!detail;
 return `<form id="grantForm" data-mode="${newRecord?'create':'edit'}" novalidate>${newRecord?'<div class="warning-box">Solo el nombre de la convocatoria es obligatorio. Los demás campos pueden completarse después. Se valida duplicidad por año + aliado + convocatoria.</div>':''}
 ${FIELD_GROUPS.map(([name,grp])=>`<section class="form-section"><h3>${escapeHTML(name)}</h3><div class="form-grid">${grp.map(([key,label,type])=>cellInput(key,label,type,fields[C[key]]||(key==='year'&&newRecord?new Date().getFullYear():''),key==='name')).join('')}</div></section>`).join('')}
 <div class="form-actions"><span class="subtle">La información se guardará en Consolidado.</span><button type="submit" class="btn btn-primary">${newRecord?'Guardar nuevo grant':'Guardar cambios'} ↗</button></div></form>`;
}
function newGrantView(){return header('Nueva oportunidad','Registra un grant y completa sus datos cuando estén disponibles')+grantFormHTML();}
function keyValue(label,value){return `<div class="kv"><dt>${escapeHTML(label)}</dt><dd>${value===undefined||value===null||value===''?'—':escapeHTML(value)}</dd></div>`;}
function detailHeader(detail){const s=detail.summary;return `<div class="panel"><div class="action-line">${badge(s.stage)}${badge(s.outcome)}<span class="number-small">${escapeHTML(s.id)} · ${s.year||'Sin año'}</span></div><h3 style="font-size:22px;margin:11px 0 6px">${escapeHTML(s.name)}</h3><div class="subtle">${escapeHTML(s.ally)}</div><div class="link-group" style="margin-top:13px">${link(s.driveUrl,'Carpeta Drive Educamás')}${link(s.callUrl,'Convocatoria oficial')}${link(s.applyUrl,'Formulario postulación')}${link(s.termsUrl,'Términos de referencia')}${link(s.proposalUrl,'Propuesta')}${link(s.outcomeProofUrl,'Soporte decisión')}</div></div>`;}
function tabButton(tab,label){return `<button type="button" class="tab ${state.tab===tab?'selected':''}" data-action="tab" data-tab="${tab}">${escapeHTML(label)}</button>`;}
function summaryTab(d){const s=d.summary,f=d.fields;return `<div class="analysis-grid"><div class="stat"><div class="metric-label">Solicitado COP</div><div class="metric-value">${money(s.requestedCOP)}</div><div class="subtle">${escapeHTML(s.requestedCOPQuality)}</div></div><div class="stat"><div class="metric-label">Adjudicado reportado</div><div class="metric-value">${money(s.reportedAwardCOP)}</div></div><div class="stat"><div class="metric-label">Adjudicado documentado</div><div class="metric-value">${money(s.documentedAwardCOP)}</div></div></div>
 ${s.needsEvidence?'<div class="warning-box">El CRM indica adjudicación o rechazo, pero falta el enlace a una comunicación oficial. No presentar el resultado como verificado hasta revisar el soporte.</div>':''}
 <section class="panel"><div class="section-heading"><h3>Datos de la oportunidad</h3><button class="btn btn-small btn-primary" data-action="tab" data-tab="edit">Editar ficha</button></div><dl>
 ${keyValue('Aliado',f[C.ally])}${keyValue('Estado CRM',s.status)}${keyValue('Resultado',s.outcome)}${keyValue('Prioridad',f[C.priority])}${keyValue('Tipo de oportunidad',f[C.type])}${keyValue('Líneas de negocio',f[C.line])}${keyValue('Fecha de cierre',s.deadline)}${keyValue('Próxima acción',s.nextAction)}${keyValue('Elegibilidad',f[C.eligibility])}${keyValue('Descripción',f[C.description])}${keyValue('Encaje Educamás',f[C.fit])}${keyValue('Observaciones',f[C.notes])}
 </dl></section><div class="action-line"><button class="btn btn-primary" data-action="tab" data-tab="result">Registrar decisión y adjudicación</button><button class="btn" data-action="tab" data-tab="steps">Ver ruta de pasos</button></div>`;}
function outcomeTab(d){const f=d.fields;const outcome=f[C.outcome]||d.summary.outcome;const status=f[C.status]||'';
const outcomes=[...new Set([outcome,...OUTCOMES])];const states=[...new Set([status,...(state.options.catalog?.[C.status]||[])].filter(Boolean))];
return `<div class="warning-box">Diferenciamos el monto solicitado del <b>monto adjudicado reportado</b> y del <b>monto adjudicado documentado</b>. Para guardar un monto documentado se exige un enlace al soporte. Ese enlace debe ser revisado por el equipo.</div><form id="outcomeForm"><section class="form-section"><h3>Decisión del financiador</h3><div class="form-grid">
<div class="form-field"><label>Resultado</label><select class="select" name="outcome">${outcomes.map(x=>`<option ${x===outcome?'selected':''}>${escapeHTML(x)}</option>`).join('')}</select></div>
<div class="form-field"><label>Estado CRM</label><select class="select" name="status">${states.map(x=>`<option ${x===status?'selected':''}>${escapeHTML(x)}</option>`).join('')}</select></div>
${simpleField('decisionDate','Fecha de decisión','date',f[C.outcomeDate])}
${simpleField('reportedCOP','Monto adjudicado COP REPORTADO','text',f[C.reportedCOP])}
${simpleField('documentedCOP','Monto adjudicado COP DOCUMENTADO','text',f[C.approvedCOP])}
${simpleField('currency','Moneda adjudicación','text',f[C.awardedCurrency])}
${simpleField('originalAmount','Monto adjudicado original','text',f[C.awardedOriginal])}
${simpleField('proofUrl','URL soporte del resultado','url',f[C.outcomeProof])}
${simpleField('analysis','Lecciones aprendidas / análisis','textarea',f[C.lessons])}
</div></section><div class="form-actions"><button class="btn btn-primary" type="submit">Guardar análisis y resultado</button></div></form>`;}
function simpleField(name,label,type,value=''){const v=type==='date'?toDate(value):String(value||'');return `<div class="form-field ${type==='textarea'?'span2':''}"><label>${escapeHTML(label)}</label>${type==='textarea'?`<textarea class="textarea" name="${name}">${escapeHTML(v)}</textarea>`:`<input class="input" name="${name}" type="${type}" value="${escapeHTML(v)}">`}</div>`;}
function reviewsTab(d){const reviews=d.reviews||[];return `<section class="panel"><div class="section-heading"><h3>Revisiones de la convocatoria</h3>${badge(`${reviews.length} registros`)}</div>${reviews.length?reviews.slice().reverse().map(r=>`<div class="history-item"><strong>${escapeHTML(r.verdict||'Revisión')} · ${escapeHTML(r.date||'')}</strong><div class="subtle">${escapeHTML(r.owner||'Sin responsable')} · ${escapeHTML(r.verification||'')}</div><p>${escapeHTML(r.analysis||'Sin análisis')}</p><p><b>Próxima acción:</b> ${escapeHTML(r.next||'No definida')}</p>${link(r.sourceUrl,'Fuente')}</div>`).join(''):'<div class="empty">Aún no hay revisiones registradas.</div>'}</section><form id="reviewForm"><section class="form-section"><h3>Nueva evaluación</h3><div class="form-grid"><div class="form-field"><label>Veredicto</label><select class="select" name="verdict">${REVISIONS.map(v=>`<option>${escapeHTML(v)}</option>`).join('')}</select></div>${simpleField('owner','Responsable (nombre, sin usuarios)','text')}${simpleField('verification','Estado de verificación','text',d.fields[C.verification])}${simpleField('fit','Encaje Educamás','textarea',d.fields[C.fit])}${simpleField('requirements','Requisitos pendientes','textarea')}${simpleField('analysis','Análisis / justificación','textarea')}${simpleField('next','Acción recomendada','textarea',d.fields[C.next])}${simpleField('sourceUrl','URL fuente oficial','url')}</div></section><div class="form-actions"><button class="btn btn-primary">Guardar revisión</button></div></form>`;}
function stepForm(step=null){return `<form id="stepForm" data-step-id="${escapeHTML(step?.id||'')}"><div class="form-grid">${simpleField('title','Actividad','text',step?.title)}<div class="form-field"><label>Estado</label><select class="select" name="status">${STEP_STATES.map(s=>`<option ${s===(step?.status||'Pendiente')?'selected':''}>${s}</option>`).join('')}</select></div>${simpleField('owner','Responsable (nombre, sin usuarios)','text',step?.owner)}${simpleField('due','Fecha objetivo','date',step?.due)}${simpleField('evidenceUrl','URL evidencia','url',step?.evidenceUrl)}${simpleField('notes','Notas','textarea',step?.notes)}</div><div class="form-actions"><button class="btn btn-primary" type="submit">${step?'Actualizar paso':'Guardar nuevo paso'}</button></div></form>`;}
function stepsTab(d){const steps=d.steps||[];return `<section class="panel"><div class="section-heading"><h3>Ruta de acciones</h3><div class="action-line"><span class="subtle">${steps.length} pasos</span><button class="btn btn-small" data-action="suggest">✦ Sugerir ruta</button></div></div>${steps.length?steps.map(s=>`<div class="step-card"><div class="step-top"><div><strong>${escapeHTML(s.title)}</strong><p>${escapeHTML(s.owner||'Sin responsable')} · objetivo ${escapeHTML(s.due||'Sin fecha')}</p></div>${badge(s.status)}</div>${s.notes?`<p>${escapeHTML(s.notes)}</p>`:''}<div class="row"><div class="link-group">${link(s.evidenceUrl,'Evidencia')}</div><button class="btn btn-small" data-action="edit-step" data-step="${escapeHTML(s.id)}">Editar paso</button></div></div>`).join(''):'<div class="empty">No hay pasos todavía. Puedes agregarlos o generar una ruta sugerida según el estado del grant.</div>'}</section><section class="panel"><h3 id="stepFormTitle">Agregar un paso</h3><div id="stepFormSlot">${stepForm()}</div></section>`;}
function historyTab(d){return `<section class="panel"><h3>Historial de modificaciones</h3>${d.history?.length?d.history.map(h=>`<div class="history-item"><small>${escapeHTML(h.date||'')} · ${escapeHTML(h.origin||'')}</small><strong>${escapeHTML(h.action||'')}</strong><p>${escapeHTML(h.detail||'')}</p></div>`).join(''):'<div class="empty">No hay cambios registrados todavía.</div>'}</section>`;}
function renderModal(){const d=state.detail;if(!d)return;const titles={summary:'Ficha',result:'Adjudicación',reviews:'Revisiones',steps:'Pasos',history:'Historial',edit:'Editar'};$('modalTitle').textContent=d.summary.name;
const bar=`<div class="tab-bar">${Object.entries(titles).map(([key,label])=>tabButton(key,label)).join('')}</div>`;
const body=state.tab==='summary'?summaryTab(d):state.tab==='result'?outcomeTab(d):state.tab==='reviews'?reviewsTab(d):state.tab==='steps'?stepsTab(d):state.tab==='history'?historyTab(d):grantFormHTML(d);
$('modalContent').innerHTML=detailHeader(d)+bar+body;
}
async function openDetail(id,tab='summary'){state.selectedId=id;state.tab=tab;$('modal').classList.remove('hidden');$('modalTitle').textContent='Cargando ficha…';$('modalContent').innerHTML='<div class="loading">Consultando registro y pasos…</div>';try{state.detail=await api('detail',{id});renderModal();}catch(e){showToast(e.message,true);$('modalContent').innerHTML=`<div class="warning-box">${escapeHTML(e.message)}</div>`;}}
function closeModal(){$('modal').classList.add('hidden');state.selectedId=null;state.detail=null;}
function formData(form){return Object.fromEntries(new FormData(form).entries());}
function getGrantData(form){const raw=formData(form);const obj={};for(const key of Object.keys(C))if(raw[key]!==undefined)obj[key]=raw[key].trim();const multiselect=[...form.querySelectorAll('input[name="line"]:checked')].map(i=>i.value);if(multiselect.length)obj.line=multiselect;else if(form.dataset.mode==='edit'&&state.detail?.fields?.[C.line])obj.line='';
 if(form.dataset.mode==='edit'&&state.detail){for(const key of Object.keys(obj)){const val=Array.isArray(obj[key])?obj[key].join(' | '):obj[key];let old=String(state.detail.fields[C[key]]||'');if(['start','deadlineWeb','sendDate','nextDate'].includes(key))old=toDate(old);if(String(val)===old)delete obj[key];}}
 else {for(const key of Object.keys(obj))if(obj[key]===''&&key!=='year')delete obj[key];}
 return obj;
}
async function submitForm(form){const kind=form.id;try{const btn=form.querySelector('button[type="submit"]');if(btn)btn.disabled=true;let result;
 if(kind==='grantForm'){
   const data=getGrantData(form);if(!data.name&&form.dataset.mode==='create')throw new Error('Escribe el nombre de la convocatoria.');
   result=await api('saveGrant',{id:form.dataset.mode==='edit'?state.selectedId:undefined,data});
   showToast(`Grant guardado: ${result.id}`+(result.syncWarning?' · Hoja anual pendiente':''));
   if(result.syncWarning)console.warn(result.syncWarning);
   closeModal();await load();if(form.dataset.mode==='edit')await openDetail(result.id,'summary');else await openDetail(result.id,'summary');
 } else if(kind==='outcomeForm'){
   result=await api('saveOutcome',{id:state.selectedId,...formData(form)});
   showToast('Resultado guardado en Consolidado.');await refreshDetail('result');
 } else if(kind==='reviewForm'){
   result=await api('saveReview',{id:state.selectedId,...formData(form)});
   showToast('Revisión registrada.');await refreshDetail('reviews');
 } else if(kind==='stepForm'){
   result=await api('saveStep',{id:state.selectedId,stepId:form.dataset.stepId||undefined,...formData(form)});
   showToast('Paso guardado.');await refreshDetail('steps');
 }
 }catch(e){showToast(e.message,true);}finally{const btn=form.querySelector('button[type="submit"]');if(btn)btn.disabled=false;}}
async function refreshDetail(tab){const id=state.selectedId;const was=state.tab;await load();if(id)await openDetail(id,tab||was);}
function inputUpdated(event){if(event.target.id==='searchInput'){state.query=event.target.value;const selection=event.target.selectionStart;render();const input=$('searchInput');if(input){input.focus();input.setSelectionRange(selection,selection);}}}
function selectUpdated(event){const id=event.target.id;if(id==='yearFilter'){state.year=event.target.value;render();}if(id==='stageFilter'){state.stage=event.target.value;render();}if(id==='outcomeFilter'){state.outcome=event.target.value;render();}}
function init(){
  document.addEventListener('click',async event=>{
    const nav=event.target.closest('[data-nav]');if(nav){navigate(nav.dataset.nav);return;}
    const btn=event.target.closest('[data-action]');if(!btn)return;const act=btn.dataset.action;
    if(act==='new'){navigate('new');return;}
    if(act==='refresh'){await load();return;}
    if(act==='detail'){await openDetail(btn.dataset.id);return;}
    if(act==='tab'){state.tab=btn.dataset.tab;renderModal();return;}
    if(act==='suggest'){if(!state.selectedId)return;try{const d=await api('suggestSteps',{id:state.selectedId});showToast(`Se agregaron ${d.added} pasos sugeridos.`);await refreshDetail('steps');}catch(e){showToast(e.message,true);}return;}
    if(act==='edit-step'){const step=state.detail?.steps?.find(s=>s.id===btn.dataset.step);if(!step)return;$('stepFormTitle').textContent='Editar actividad';$('stepFormSlot').innerHTML=stepForm(step);$('stepFormSlot').scrollIntoView({behavior:'smooth',block:'nearest'});return;}
  });
  document.addEventListener('submit',event=>{const form=event.target;if(['grantForm','outcomeForm','reviewForm','stepForm'].includes(form.id)){event.preventDefault();submitForm(form);}});
  document.addEventListener('input',inputUpdated);
  document.addEventListener('change',selectUpdated);
  $('closeModal').addEventListener('click',closeModal);
  $('modal').addEventListener('click',e=>{if(e.target===$('modal'))closeModal();});
  window.addEventListener('keydown',e=>{if(e.key==='Escape')closeModal();});
  $('refreshBtn').addEventListener('click',load);
  $('menuToggle').addEventListener('click',()=>document.querySelector('.sidebar').classList.toggle('open'));
  load();
}
init();
