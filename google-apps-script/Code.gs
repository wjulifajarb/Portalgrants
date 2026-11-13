/**
 * EDUCAMÁS | API DE GRANTS PARA WEB EN GITHUB + VERCEL
 * Versión 1.0 - Google Apps Script vinculado al Google Sheets nuevo.
 *
 * No contiene claves en el código. La conexión se guarda en Script Properties.
 * La web pública NO debe llamar directamente con la clave: usa un proxy seguro
 * del servidor (p. ej. Vercel /api/grants).
 *
 * Fuentes: pestaña Consolidado + _PASOS_GRANTS + _REVISIONES_GRANTS.
 * Mantiene los registros existentes; no reemplaza 2024/2025/2026/2027.
 */

const EDU = Object.freeze({
  MASTER: 'Consolidado',
  STEPS: '_PASOS_GRANTS',
  REVIEWS: '_REVISIONES_GRANTS',
  HISTORY: '_HISTORIAL_GRANTS',
  TZ: 'America/Bogota',
  ALERT_DAYS: 30,
  MAX_ROWS: 5000,
  MAX_PAGE: 250,
  PROPERTY_SHEET: 'EDU_SHEET_ID',
  PROPERTY_TOKEN: 'EDU_API_TOKEN'
});

// Los textos coinciden con los encabezados de tu Excel/Sheets depurado.
const C = Object.freeze({
  id: 'ID maestro',
  year: 'Año oportunidad',
  ally: 'Empresa/aliado/Grant/cliente',
  name: 'Convocatoria / proyecto',
  status: 'Status',
  priority: 'Expectativa',
  client: 'Tipo de cliente',
  relation: 'Antiguo o nuevo',
  line: 'Línea de negocio',
  type: 'Tipo de oportunidad',
  description: 'Descripción de oportunidad',
  eligibility: 'Elegibilidad / requisitos',
  fit: 'Encaje Educamás',
  start: 'Fecha de apertura',
  deadline: 'Fecha límite envío o envío de la propuesta',
  deadlineWeb: 'Fecha cierre web',
  deadlineOfficial: 'CIERRE PUBLICO VERIFICADO',
  sendDate: 'Fecha de envío',
  nextDate: 'Fecha próximo seguimiento',
  next: 'Próxima acción',
  requestedOriginal: 'Valor de la propuesta',
  requestedCOP: 'Valor propuesto COP REGISTRADO',
  requestedValidated: 'Valor propuesto COP VALIDADO',
  approvedCOP: 'Valor aprobado COP DOCUMENTADO',
  reportedCOP: 'Monto adjudicado COP REPORTADO',
  awardedOriginal: 'Monto adjudicado original',
  awardedCurrency: 'Moneda adjudicación',
  currency: 'Moneda original',
  publicAmount: 'Monto PÚBLICO del programa (NO propuesta)',
  folder: 'URL carpeta Drive',
  callUrl: 'URL convocatoria',
  applyUrl: 'URL postulación',
  termsUrl: 'Link TR',
  proposalUrl: 'Link de la propuesta',
  contact: 'Contacto',
  verification: 'Estado verificación',
  sendVerified: 'Envío comprobado',
  resultVerified: 'Resultado documentado',
  feedback: 'Feedback / retroalimentación',
  notes: 'Observaciones',
  alert: 'Alertas / inconsistencias',
  source: 'Fuentes consolidadas',
  outcome: 'Resultado del grant',
  outcomeDate: 'Fecha de decisión',
  outcomeProof: 'URL soporte del resultado',
  lessons: 'Lecciones aprendidas / análisis'
});

const EXTRA_COLUMNS = [
  C.applyUrl, C.deadlineWeb, C.outcome, C.outcomeDate,
  C.outcomeProof, C.lessons, C.reportedCOP,
  C.awardedOriginal, C.awardedCurrency
];

const STEPS_HEADER = [
  'ID paso', 'ID maestro', 'Actividad', 'Estado', 'Responsable',
  'Fecha objetivo', 'Fecha completado', 'URL evidencia', 'Notas',
  'Fecha creación', 'Fecha actualización'
];
const REVIEWS_HEADER = [
  'ID revisión', 'ID maestro', 'Fecha', 'Responsable',
  'Veredicto de revisión', 'Estado de verificación', 'Encaje',
  'Requisitos pendientes', 'Análisis / justificación',
  'Acción recomendada', 'URL fuente'
];
const HISTORY_HEADER = [
  'Fecha', 'Acción', 'ID maestro', 'Detalle', 'Origen'
];
const OUTCOMES = [
  'Pendiente', 'Adjudicado', 'No adjudicado',
  'No postulado', 'Desistido'
];
const STEP_STATUS = [
  'Pendiente', 'En curso', 'Bloqueado', 'Completado'
];
const REVIEW_VERDICTS = [
  'Por evaluar', 'Postular', 'Postular con condiciones',
  'No postular', 'Esperar nueva edición'
];

// -------------------- 1. INSTALACIÓN --------------------

function onOpen() {
  SpreadsheetApp.getUi().createMenu('Portal Grants Educamás')
    .addItem('1. Instalar / actualizar', 'instalarPortal')
    .addItem('2. Probar conexión', 'probarConexion')
    .addItem('3. Crear nueva clave API', 'generarNuevoTokenAPI')
    .addItem('4. Diagnóstico', 'diagnosticarPortal')
    .addItem('5. Conciliar fichas anuales', 'sincronizarFichasAnuales')
    .addToUi();
}

/** Ejecutar una vez desde Extensiones > Apps Script del NUEVO Sheets. */
function instalarPortal() {
  const ss = SpreadsheetApp.getActiveSpreadsheet();
  if (!ss) throw new Error('Abre Apps Script desde el Google Sheets nuevo.');
  const props = PropertiesService.getScriptProperties();
  props.setProperty(EDU.PROPERTY_SHEET, ss.getId());
  const sh = ss.getSheetByName(EDU.MASTER);
  if (!sh) throw new Error('Debes tener una pestaña llamada "Consolidado".');
  const required = [C.id, C.year, C.ally, C.name, C.status];
  const headers = encabezados_(sh);
  const missing = required.filter(x => !headers.includes(x));
  if (missing.length) throw new Error('Faltan columnas: ' + missing.join(', '));
  EXTRA_COLUMNS.forEach(col => garantizarColumna_(sh, col));
  crearAuxiliar_(ss, EDU.STEPS, STEPS_HEADER);
  crearAuxiliar_(ss, EDU.REVIEWS, REVIEWS_HEADER);
  crearAuxiliar_(ss, EDU.HISTORY, HISTORY_HEADER);
  if (!props.getProperty(EDU.PROPERTY_TOKEN)) {
    props.setProperty(EDU.PROPERTY_TOKEN, nuevoToken_());
  }
  const out = probarConexion();
  Logger.log('Instalación lista: ' + JSON.stringify(out));
  Logger.log('La clave está en Configuración del proyecto > Propiedades de secuencia de comandos > EDU_API_TOKEN. NO publicarla en GitHub.');
  return out;
}

/** Revoca la clave anterior. Actualiza después el secreto en Vercel. */
function generarNuevoTokenAPI() {
  const token = nuevoToken_();
  PropertiesService.getScriptProperties().setProperty(EDU.PROPERTY_TOKEN, token);
  Logger.log('Se generó una nueva clave. Cópiela desde Propiedades de secuencia de comandos (EDU_API_TOKEN).');
  return 'Nueva clave generada. Recuerda actualizarla en Vercel.';
}

function nuevoToken_() {
  return Utilities.getUuid().replace(/-/g, '') + Utilities.getUuid().replace(/-/g, '');
}

function probarConexion() {
  const ss = libro_();
  const sheet = maestra_();
  const n = Math.max(0, sheet.getLastRow() - 1);
  const out = {
    spreadsheet: ss.getName(),
    id: ss.getId(),
    url: ss.getUrl(),
    master: EDU.MASTER,
    registros: n,
    columnas: sheet.getLastColumn(),
    aux: [EDU.STEPS, EDU.REVIEWS, EDU.HISTORY].map(name => ({
      name, exists: !!ss.getSheetByName(name)
    }))
  };
  Logger.log(JSON.stringify(out, null, 2));
  return out;
}

// -------------------- 2. API HTTP --------------------

/** GET únicamente confirma que el servicio existe; nunca devuelve datos. */
function doGet() {
  return json_({
    ok: true,
    service: 'Educamás Grants API',
    method: 'POST',
    message: 'Usa el proxy privado de Vercel para consultar esta API.'
  });
}

/**
 * El proxy de Vercel enviará:
 * { "token":"SECRETO", "action":"dashboard", "payload":{} }
 * Nunca pongas el token en el frontend público ni en la URL.
 */
function doPost(e) {
  try {
    if (!e || !e.postData || !e.postData.contents) {
      throw new Error('Solicitud vacía.');
    }
    if (e.postData.contents.length > 1000000) {
      throw new Error('Solicitud demasiado grande.');
    }
    const req = JSON.parse(e.postData.contents);
    if (!req || typeof req !== 'object' || Array.isArray(req)) {
      throw new Error('JSON inválido.');
    }
    validarToken_(req.token);
    const p = req.payload && typeof req.payload === 'object' ? req.payload : {};
    let data;
    switch (req.action) {
      case 'ping': data = { connected: true, spreadsheet: libro_().getName() }; break;
      case 'dashboard': data = dashboard_(p); break;
      case 'list': data = listar_(p); break;
      case 'detail': data = detalle_(p.id); break;
      case 'options': data = opciones_(); break;
      case 'diagnostics': data = diagnostico_(); break;
      case 'saveGrant': data = guardarGrant_(p); break;
      case 'saveOutcome': data = guardarResultado_(p); break;
      case 'saveReview': data = guardarRevision_(p); break;
      case 'saveStep': data = guardarPaso_(p); break;
      case 'suggestSteps': data = sugerirPasos_(p.id); break;
      default: throw new Error('Acción no permitida: ' + String(req.action || ''));
    }
    return json_({ ok: true, data: data });
  } catch (err) {
    // Apps Script ContentService no permite controlar el HTTP status.
    // El proxy web debe interpretar ok:false como fallo.
    return json_({ ok: false, error: err.message || String(err) });
  }
}

function json_(value) {
  return ContentService.createTextOutput(JSON.stringify(value))
    .setMimeType(ContentService.MimeType.JSON);
}

function validarToken_(sent) {
  const expected = PropertiesService.getScriptProperties().getProperty(EDU.PROPERTY_TOKEN);
  if (!expected || typeof sent !== 'string' || sent.length !== expected.length) {
    throw new Error('No autorizado.');
  }
  // Comparación sin salida anticipada por carácter.
  let diff = 0;
  for (let i = 0; i < expected.length; i++) diff |= expected.charCodeAt(i) ^ sent.charCodeAt(i);
  if (diff !== 0) throw new Error('No autorizado.');
}

// -------------------- 3. DATOS DEL SHEETS --------------------

function libro_() {
  const id = PropertiesService.getScriptProperties().getProperty(EDU.PROPERTY_SHEET);
  if (!id) throw new Error('Ejecuta primero instalarPortal desde el Sheets nuevo.');
  return SpreadsheetApp.openById(id);
}

function maestra_() {
  const sh = libro_().getSheetByName(EDU.MASTER);
  if (!sh) throw new Error('No existe Consolidado.');
  return sh;
}

function encabezados_(sh) {
  const last = Math.max(1, sh.getLastColumn());
  return sh.getRange(1, 1, 1, last).getDisplayValues()[0].map(x => String(x).trim());
}

function garantizarColumna_(sh, name) {
  const headers = encabezados_(sh);
  if (headers.includes(name)) return headers.indexOf(name) + 1;
  const next = sh.getLastColumn() + 1;
  if (next > sh.getMaxColumns()) sh.insertColumnsAfter(sh.getMaxColumns(), next - sh.getMaxColumns());
  sh.getRange(1, next).setValue(name).setFontWeight('bold').setBackground('#173943').setFontColor('#ffffff');
  return next;
}

function crearAuxiliar_(ss, name, headers) {
  let sh = ss.getSheetByName(name);
  if (!sh) sh = ss.insertSheet(name);
  if (sh.getLastRow() === 0) {
    if (sh.getMaxColumns() < headers.length) sh.insertColumnsAfter(sh.getMaxColumns(), headers.length - sh.getMaxColumns());
    sh.getRange(1, 1, 1, headers.length).setValues([headers]);
    sh.getRange(1, 1, 1, headers.length).setBackground('#173943').setFontColor('#ffffff').setFontWeight('bold');
    sh.setFrozenRows(1);
  } else {
    const actual = encabezados_(sh);
    headers.forEach(h => { if (!actual.includes(h)) garantizarColumna_(sh, h); });
  }
  return sh;
}

function leer_() {
  const sh = maestra_();
  const h = encabezados_(sh);
  const count = Math.max(0, sh.getLastRow() - 1);
  if (count > EDU.MAX_ROWS) throw new Error('El Consolidado excede el máximo admitido de registros.');
  const rows = count ? sh.getRange(2, 1, count, h.length).getValues() : [];
  const items = rows.map((row, i) => {
    const o = { __row: i + 2 };
    h.forEach((name, j) => { if (name) o[name] = texto_(row[j]); });
    return o;
  }).filter(o => o[C.id]);
  return { sh, h, items };
}

function texto_(v) {
  if (v === null || v === undefined) return '';
  if (Object.prototype.toString.call(v) === '[object Date]' && !isNaN(v.getTime())) {
    return Utilities.formatDate(v, EDU.TZ, 'yyyy-MM-dd');
  }
  return String(v);
}

function limpio_(v) { return texto_(v).trim().slice(0, 20000); }
function celdaSegura_(v) {
  if (typeof v === 'number' && isFinite(v)) return v;
  const s = limpio_(v);
  return /^[=+\-@]/.test(s) ? "'" + s : s;
}
function canon_(v) {
  return texto_(v).normalize('NFD').replace(/[\u0300-\u036f]/g, '')
    .toLowerCase().replace(/[^a-z0-9]+/g, ' ').trim();
}
function hoy_() { return Utilities.formatDate(new Date(), EDU.TZ, 'yyyy-MM-dd'); }
function fecha_(v) {
  const s = texto_(v).trim();
  let m = s.match(/^(\d{4})-(\d{1,2})-(\d{1,2})(?:\D|$)/);
  if (!m) {
    const d = s.match(/^(\d{1,2})\/(\d{1,2})\/(\d{4})(?:\D|$)/);
    if (d) m = [d[0], d[3], d[2], d[1]];
  }
  if (!m) return '';
  const y = Number(m[1]), mo = Number(m[2]), day = Number(m[3]);
  const test = new Date(Date.UTC(y, mo - 1, day));
  if (test.getUTCFullYear() !== y || test.getUTCMonth() !== mo - 1 || test.getUTCDate() !== day) return '';
  return `${y}-${String(mo).padStart(2,'0')}-${String(day).padStart(2,'0')}`;
}
function diasHasta_(iso) {
  if (!iso) return null;
  return Math.round((Date.parse(iso + 'T00:00:00Z') - Date.parse(hoy_() + 'T00:00:00Z')) / 86400000);
}
function numero_(v) {
  if (typeof v === 'number' && isFinite(v)) return v;
  let s = texto_(v).replace(/COP|USD|EUR|\$|\s/gi, '').trim();
  if (!s || !/^[\d.,]+$/.test(s)) return null;
  if (/^\d{1,3}([,.]\d{3})+$/.test(s)) s = s.replace(/[,.]/g, '');
  else if (s.includes(',') && s.includes('.')) {
    s = s.lastIndexOf(',') > s.lastIndexOf('.') ? s.replace(/\./g, '').replace(',', '.') : s.replace(/,/g, '');
  } else if (s.includes(',')) s = s.replace(',', '.');
  const n = Number(s);
  return isFinite(n) && n >= 0 ? n : null;
}

function etapa_(status) {
  const x = canon_(status);
  if (/no acept|rechaz|no adjudic/.test(x)) return 'Rechazada';
  if (/no aplic|desist|suspend/.test(x)) return 'No postulada';
  if (/adjudic|^aceptada$|en ejecucion|firma del convenio/.test(x)) return 'Adjudicada';
  if (/segunda fase|segunda etapa|finalista|preseleccion/.test(x)) return 'Segunda fase';
  if (/enviad|presentad|postulad|radicad/.test(x)) return 'Enviada';
  if (/pendiente enviar|creacion|preparacion|revision para postulacion/.test(x)) return 'En preparación';
  return 'Mapeada';
}
function resultado_(o) {
  const exp = o[C.outcome];
  if (OUTCOMES.includes(exp)) return exp;
  const stage = etapa_(o[C.status]);
  if (stage === 'Adjudicada') return 'Adjudicado';
  if (stage === 'Rechazada') return 'No adjudicado';
  if (stage === 'No postulada') return 'No postulado';
  return 'Pendiente';
}
function enviadoCRM_(o) {
  return ['Enviada', 'Segunda fase', 'Adjudicada', 'Rechazada'].includes(etapa_(o[C.status]));
}
function fechaCierre_(o) {
  return fecha_(o[C.deadlineWeb]) || fecha_(o[C.deadlineOfficial]) || fecha_(o[C.deadline]);
}
function montoSeguro_(n) { return n !== null && n <= 1e11 ? n : null; }

function resumen_(o) {
  const val = montoSeguro_(numero_(o[C.requestedValidated]));
  const reg = montoSeguro_(numero_(o[C.requestedCOP]));
  const approved = montoSeguro_(numero_(o[C.approvedCOP]));
  const reported = montoSeguro_(numero_(o[C.reportedCOP]));
  const deadline = fechaCierre_(o);
  const outcome = resultado_(o);
  return {
    id: o[C.id],
    year: Number(o[C.year]) || null,
    name: o[C.name] || '',
    ally: o[C.ally] || '',
    status: o[C.status] || '',
    stage: etapa_(o[C.status]),
    outcome,
    priority: o[C.priority] || '',
    type: o[C.type] || '',
    line: o[C.line] || '',
    client: o[C.client] || '',
    description: o[C.description] || '',
    eligibility: o[C.eligibility] || '',
    fit: o[C.fit] || '',
    deadline,
    daysLeft: diasHasta_(deadline),
    submittedOn: fecha_(o[C.sendDate]),
    submittedCRM: enviadoCRM_(o),
    submissionEvidenceRecorded: /^si$|^sí$/i.test((o[C.sendVerified] || '').trim()),
    requestedOriginal: o[C.requestedOriginal] || '',
    requestedCOP: val !== null ? val : reg,
    requestedCOPQuality: val !== null ? 'Validado' : reg !== null ? 'Registrado; validar' : 'Sin monto válido',
    reportedAwardCOP: reported,
    documentedAwardCOP: approved,
    outcomeProofUrl: o[C.outcomeProof] || '',
    proofLinkRecorded: /^https?:\/\//i.test(o[C.outcomeProof] || ''),
    currency: o[C.currency] || '',
    nextAction: o[C.next] || '',
    nextDate: fecha_(o[C.nextDate]),
    driveUrl: o[C.folder] || '',
    callUrl: o[C.callUrl] || '',
    applyUrl: o[C.applyUrl] || '',
    termsUrl: o[C.termsUrl] || '',
    proposalUrl: o[C.proposalUrl] || '',
    verification: o[C.verification] || '',
    hasAmountWarning: (numero_(o[C.requestedCOP]) || 0) > 1e11,
    needsEvidence: (outcome === 'Adjudicado' || outcome === 'No adjudicado') && !/^https?:\/\//i.test(o[C.outcomeProof] || '')
  };
}

// -------------------- 4. CONSULTAS --------------------

function dashboard_(p) {
  const year = p.year && p.year !== 'all' ? Number(p.year) : null;
  const all = leer_().items.map(resumen_);
  const arr = year ? all.filter(x => x.year === year) : all;
  const stages = ['Mapeada', 'En preparación', 'Enviada', 'Segunda fase', 'Adjudicada', 'Rechazada', 'No postulada'];
  const funnel = {};
  stages.forEach(s => { funnel[s] = arr.filter(x => x.stage === s).length; });
  const yearly = {};
  all.forEach(x => {
    const k = String(x.year || 'Sin año');
    if (!yearly[k]) yearly[k] = { year: x.year, total:0, submittedCRM:0, submissionEvidenceRecorded:0, secondPhase:0, awardedCRM:0, rejectedCRM:0, documentedAwardCOPWithLink:0 };
    const r = yearly[k];
    r.total++;
    if (x.submittedCRM) r.submittedCRM++;
    if (x.submissionEvidenceRecorded) r.submissionEvidenceRecorded++;
    if (x.stage === 'Segunda fase') r.secondPhase++;
    if (x.stage === 'Adjudicada') r.awardedCRM++;
    if (x.stage === 'Rechazada') r.rejectedCRM++;
    if (x.documentedAwardCOP !== null && x.proofLinkRecorded) r.documentedAwardCOPWithLink += x.documentedAwardCOP;
  });
  const upcoming = arr.filter(x => x.daysLeft !== null && x.daysLeft >= 0 &&
    !['Enviada','Segunda fase','Adjudicada','Rechazada','No postulada'].includes(x.stage))
    .sort((a,b) => a.daysLeft - b.daysLeft).slice(0,5)
    .map(x => Object.assign({}, x, { alert: x.daysLeft <= 7 ? 'Urgente' : x.daysLeft <= EDU.ALERT_DAYS ? 'Próximo (30 días)' : 'Programado' }));
  const dueSoon = arr.filter(x => x.daysLeft !== null && x.daysLeft >= 0 && x.daysLeft <= EDU.ALERT_DAYS &&
    ['Mapeada','En preparación'].includes(x.stage));
  return {
    spreadsheet: libro_().getName(),
    updatedAt: Utilities.formatDate(new Date(), EDU.TZ, 'yyyy-MM-dd HH:mm:ss'),
    year: year || 'all',
    total: arr.length,
    funnel,
    submittedHistoricalCRM: arr.filter(x => x.submittedCRM).length,
    submissionEvidenceRecorded: arr.filter(x => x.submissionEvidenceRecorded).length,
    adjudicated: arr.filter(x => x.outcome === 'Adjudicado').length,
    rejected: arr.filter(x => x.outcome === 'No adjudicado').length,
    resultsWithProofLink: arr.filter(x => ['Adjudicado','No adjudicado'].includes(x.outcome) && x.proofLinkRecorded).length,
    requestedCOP: arr.reduce((a,x) => a + (x.requestedCOP || 0), 0),
    awardedDocumentedCOPWithLink: arr.reduce((a,x) => a + (x.proofLinkRecorded ? (x.documentedAwardCOP || 0) : 0), 0),
    awardedRecordedWithoutLinkCOP: arr.reduce((a,x) => a + (!x.proofLinkRecorded ? (x.documentedAwardCOP || 0) : 0), 0),
    alerts30Days: dueSoon.length,
    upcoming,
    byYear: Object.values(yearly).sort((a,b) => (b.year||0)-(a.year||0)),
    amountDisclaimer: 'Montos de CRM: no equivalen a adjudicación ni envío comprobados. El enlace de soporte registrado tampoco valida por sí solo su contenido.'
  };
}

function listar_(p) {
  const q = canon_(p.q || '');
  const year = p.year && p.year !== 'all' ? Number(p.year) : null;
  const stage = p.stage || '';
  const outcome = p.outcome || '';
  const all = leer_().items.map(resumen_);
  let filtered = all.filter(x =>
    (!year || x.year === year) &&
    (!stage || stage === 'all' || x.stage === stage) &&
    (!outcome || outcome === 'all' || x.outcome === outcome) &&
    (!q || canon_([x.id,x.name,x.ally,x.description].join(' ')).includes(q))
  );
  if (p.sort === 'deadline') filtered.sort((a,b) => (a.deadline || '9999').localeCompare(b.deadline || '9999'));
  else filtered.sort((a,b) => (b.year || 0)-(a.year || 0) || a.ally.localeCompare(b.ally));
  const page = Math.max(1, Math.floor(Number(p.page) || 1));
  const pageSize = Math.max(1, Math.min(EDU.MAX_PAGE, Math.floor(Number(p.pageSize) || 50)));
  return {
    total: filtered.length, page, pageSize,
    items: filtered.slice((page-1)*pageSize,page*pageSize)
  };
}

function detalle_(id) {
  const o = buscar_(id);
  return {
    summary: resumen_(o),
    fields: Object.assign({}, o, { __row: undefined }),
    steps: pasosPorId_(id),
    reviews: revisionesPorId_(id),
    history: historialPorId_(id)
  };
}

function opciones_() {
  const ss = libro_();
  const sh = ss.getSheetByName('Catálogos');
  const catalog = {};
  if (sh && sh.getLastRow() > 1) {
    const values = sh.getDataRange().getDisplayValues();
    values[0].forEach((h, i) => {
      if (h) catalog[h] = [...new Set(values.slice(1).map(r => r[i]).filter(Boolean))];
    });
  }
  return {
    catalog,
    outcomes: OUTCOMES,
    steps: STEP_STATUS,
    reviewVerdicts: REVIEW_VERDICTS,
    years: [...new Set(leer_().items.map(o => Number(o[C.year])).filter(Boolean))].sort((a,b)=>b-a)
  };
}

function buscar_(id) {
  const o = leer_().items.find(x => x[C.id] === String(id || ''));
  if (!o) throw new Error('No existe la convocatoria con ID ' + id);
  return o;
}

function leerAux_(name, headers) {
  const sh = libro_().getSheetByName(name);
  if (!sh || sh.getLastRow() < 2) return [];
  const actual = encabezados_(sh);
  const data = sh.getRange(2,1,sh.getLastRow()-1,actual.length).getValues();
  return data.map((row,i) => {
    const o = { __row:i+2 };
    actual.forEach((h,j)=>o[h] = texto_(row[j]));
    return o;
  }).filter(x=>x[headers[0]]);
}

function pasosPorId_(id) {
  return leerAux_(EDU.STEPS, STEPS_HEADER).filter(x=>x['ID maestro'] === id).map(x => ({
    id:x['ID paso'], title:x['Actividad'], status:x['Estado'], owner:x['Responsable'],
    due:fecha_(x['Fecha objetivo']), finished:fecha_(x['Fecha completado']),
    evidenceUrl:x['URL evidencia'], notes:x['Notas']
  }));
}
function revisionesPorId_(id) {
  return leerAux_(EDU.REVIEWS, REVIEWS_HEADER).filter(x=>x['ID maestro'] === id).map(x => ({
    id:x['ID revisión'], date:fecha_(x['Fecha']), owner:x['Responsable'],
    verdict:x['Veredicto de revisión'], verification:x['Estado de verificación'],
    fit:x['Encaje'], requirements:x['Requisitos pendientes'],
    analysis:x['Análisis / justificación'], next:x['Acción recomendada'], sourceUrl:x['URL fuente']
  }));
}
function historialPorId_(id) {
  return leerAux_(EDU.HISTORY, HISTORY_HEADER).filter(x=>x['ID maestro'] === id).slice(-20).reverse().map(x => ({
    date:x['Fecha'], action:x['Acción'], detail:x['Detalle'], origin:x['Origen']
  }));
}

// -------------------- 5. ESCRITURAS / SINCRONIZACIÓN --------------------

function conBloqueo_(fn) {
  const lock = LockService.getScriptLock();
  lock.waitLock(25000);
  try { return fn(); } finally { lock.releaseLock(); }
}
function auditar_(action, id, detail) {
  const sh = libro_().getSheetByName(EDU.HISTORY);
  if (!sh) return;
  sh.appendRow([new Date(), action, id, limpio_(detail), 'API / portal']);
}
function normalizarDatos_(raw, headers) {
  const data = {};
  const keys = Object.keys(raw || {});
  if (keys.length > 150) throw new Error('Demasiados campos.');
  keys.forEach(k => {
    const col = C[k] || k;
    if (headers.includes(col) && col !== '#' && col !== C.id) {
      const v = raw[k];
      if (v === null || typeof v === 'undefined') return;
      if (typeof v === 'object') {
        data[col] = Array.isArray(v) ? v.map(limpio_).join(' | ') : '';
      } else data[col] = celdaSegura_(v);
    }
  });
  return data;
}
function nuevoId_(year, items) {
  const prefix = 'WEB-' + year + '-';
  let max = 0;
  items.forEach(x => {
    const id = x[C.id] || '';
    if (id.startsWith(prefix)) max = Math.max(max, Number(id.slice(prefix.length)) || 0);
  });
  return prefix + String(max+1).padStart(4,'0');
}
function escribirCampos_(sh, row, values, headers) {
  Object.entries(values).forEach(([col, value]) => {
    const i = headers.indexOf(col);
    if (i >= 0) sh.getRange(row,i+1).setValue(value);
  });
}

function guardarGrant_(p) {
  return conBloqueo_(() => {
    const ctx = leer_();
    const id = limpio_(p.id || '');
    const old = id ? ctx.items.find(x => x[C.id] === id) : null;
    if (id && !old) throw new Error('ID inexistente: ' + id);
    const data = normalizarDatos_(p.data || {}, ctx.h);
    const year = Number(data[C.year] || (old && old[C.year]) || hoy_().slice(0,4));
    const ally = limpio_(data[C.ally] !== undefined ? data[C.ally] : old && old[C.ally]);
    const name = limpio_(data[C.name] !== undefined ? data[C.name] : old && old[C.name]);
    if (!name) throw new Error('El nombre de la convocatoria es obligatorio.');
    if (!Number.isInteger(year) || year < 2020 || year > 2100) throw new Error('Año inválido.');
    const duplicate = ctx.items.find(x => x[C.id] !== id && Number(x[C.year]) === year &&
      canon_(x[C.ally]) === canon_(ally) && canon_(x[C.name]) === canon_(name));
    if (duplicate) throw new Error('Posible duplicado: ' + duplicate[C.id] + '. Revisa aliado, convocatoria y año.');
    [C.applyUrl,C.callUrl,C.termsUrl,C.folder,C.proposalUrl,C.outcomeProof].forEach(col => {
      if (Object.prototype.hasOwnProperty.call(data, col) && data[col] && !/^https?:\/\//i.test(data[col])) {
        throw new Error('URL inválida en ' + col);
      }
    });
    const finalId = old ? id : nuevoId_(year, ctx.items);
    const row = old ? old.__row : ctx.sh.getLastRow()+1;
    data[C.year] = String(year);
    if (!old) {
      data[C.id] = finalId;
      if (ctx.h.includes('#')) data['#'] = ctx.items.length+1;
      if (!data[C.status]) data[C.status] = 'En revisión';
    }
    escribirCampos_(ctx.sh,row,data,ctx.h);
    auditar_(old ? 'EDITAR GRANT' : 'CREAR GRANT',finalId,ally+' | '+name);
    let syncWarning = '';
    try {
      sincronizarRegistro_(finalId, old && String(old[C.year]) !== String(year) ? String(old[C.year]) : '');
    } catch (err) {
      syncWarning = 'Guardado en Consolidado; hoja anual pendiente: '+err.message;
      auditar_('ERROR SINCRONIZACIÓN',finalId,syncWarning);
    }
    return { id:finalId, saved:true, syncWarning };
  });
}

function guardarResultado_(p) {
  return conBloqueo_(() => {
    const ctx = leer_();
    const o = ctx.items.find(x=>x[C.id] === String(p.id || ''));
    if (!o) throw new Error('Convocatoria no encontrada.');
    const outcome = p.outcome || o[C.outcome] || 'Pendiente';
    if (!OUTCOMES.includes(outcome)) throw new Error('Resultado inválido.');
    const proof = Object.prototype.hasOwnProperty.call(p,'proofUrl') ? limpio_(p.proofUrl) : limpio_(o[C.outcomeProof]);
    if (proof && !/^https?:\/\//i.test(proof)) throw new Error('El soporte debe ser URL https://');
    const values = { [C.outcome]:outcome };
    if (Object.prototype.hasOwnProperty.call(p,'decisionDate')) {
      if (p.decisionDate && !fecha_(p.decisionDate)) throw new Error('Fecha de decisión inválida.');
      values[C.outcomeDate] = fecha_(p.decisionDate);
    }
    if (Object.prototype.hasOwnProperty.call(p,'proofUrl')) values[C.outcomeProof] = proof;
    if (Object.prototype.hasOwnProperty.call(p,'analysis')) values[C.lessons] = celdaSegura_(p.analysis);
    if (Object.prototype.hasOwnProperty.call(p,'currency')) values[C.awardedCurrency] = celdaSegura_(p.currency);
    if (Object.prototype.hasOwnProperty.call(p,'originalAmount')) values[C.awardedOriginal] = celdaSegura_(p.originalAmount);
    if (Object.prototype.hasOwnProperty.call(p,'reportedCOP')) {
      const n = p.reportedCOP === '' ? '' : numero_(p.reportedCOP);
      if (n === null) throw new Error('Monto reportado inválido.');
      values[C.reportedCOP] = n;
    }
    if (Object.prototype.hasOwnProperty.call(p,'documentedCOP')) {
      const n = p.documentedCOP === '' ? '' : numero_(p.documentedCOP);
      if (n === null) throw new Error('Monto documentado inválido.');
      if (n !== '' && outcome !== 'Adjudicado') throw new Error('Monto adjudicado requiere resultado Adjudicado.');
      if (n !== '' && !proof) throw new Error('Para guardar monto documentado registra el enlace al documento de soporte.');
      values[C.approvedCOP] = n;
    }
    if (p.status) values[C.status] = celdaSegura_(p.status);
    escribirCampos_(ctx.sh,o.__row,values,ctx.h);
    auditar_('RESULTADO',p.id,JSON.stringify({outcome,reportedCOP:values[C.reportedCOP],documentedCOP:values[C.approvedCOP],proofLink:!!proof}));
    let syncWarning = '';
    try { sincronizarRegistro_(p.id,''); }
    catch(err) { syncWarning = 'Resultado guardado en Consolidado; sincronización anual pendiente: '+err.message; }
    return { saved:true, id:p.id, syncWarning, proofLinkRecorded:!!proof };
  });
}

function guardarRevision_(p) {
  return conBloqueo_(() => {
    const ctx = leer_();
    const o = ctx.items.find(x=>x[C.id] === String(p.id || ''));
    if (!o) throw new Error('Grant no encontrado.');
    const verdict = limpio_(p.verdict || 'Por evaluar');
    if (!REVIEW_VERDICTS.includes(verdict)) throw new Error('Veredicto inválido.');
    const source = limpio_(p.sourceUrl || '');
    if (source && !/^https?:\/\//i.test(source)) throw new Error('URL fuente inválida.');
    const row = [Utilities.getUuid(),p.id,new Date(),limpio_(p.owner),verdict,limpio_(p.verification),
      limpio_(p.fit),limpio_(p.requirements),celdaSegura_(p.analysis),celdaSegura_(p.next),source];
    libro_().getSheetByName(EDU.REVIEWS).appendRow(row);
    const changes = {};
    if (p.verification !== undefined) changes[C.verification] = celdaSegura_(p.verification);
    if (p.next !== undefined) changes[C.next] = celdaSegura_(p.next);
    if (p.fit !== undefined) changes[C.fit] = celdaSegura_(p.fit);
    escribirCampos_(ctx.sh,o.__row,changes,ctx.h);
    auditar_('REVISIÓN',p.id,verdict+' | '+limpio_(p.analysis).slice(0,300));
    let syncWarning = '';
    try { sincronizarRegistro_(p.id,''); }
    catch(err) { syncWarning = 'Revisión guardada; hoja anual pendiente: '+err.message; }
    return { saved:true, reviewId:row[0], syncWarning };
  });
}

function guardarPaso_(p) {
  return conBloqueo_(() => {
    buscar_(p.id);
    const title = limpio_(p.title);
    if (!title) throw new Error('Debes escribir la actividad.');
    const status = p.status || 'Pendiente';
    if (!STEP_STATUS.includes(status)) throw new Error('Estado de paso inválido.');
    const due = p.due ? fecha_(p.due) : '';
    if (p.due && !due) throw new Error('Fecha objetivo inválida.');
    const evidence = limpio_(p.evidenceUrl);
    if (evidence && !/^https?:\/\//i.test(evidence)) throw new Error('URL de evidencia inválida.');
    const sh = libro_().getSheetByName(EDU.STEPS);
    const previous = pasosPorId_(p.id).find(x=>x.id===p.stepId);
    if (p.stepId && !previous) throw new Error('Paso a editar no encontrado en este grant.');
    const when = new Date();
    const values = {
      'ID paso':previous ? previous.id : Utilities.getUuid(), 'ID maestro':p.id,
      'Actividad':celdaSegura_(title), 'Estado':status, 'Responsable':celdaSegura_(p.owner),
      'Fecha objetivo':due,
      'Fecha completado':status === 'Completado' ? (previous && previous.finished || hoy_()) : '',
      'URL evidencia':evidence, 'Notas':celdaSegura_(p.notes),
      'Fecha creación':previous ? '' : when, 'Fecha actualización':when
    };
    if (previous) {
      const row = leerAux_(EDU.STEPS,STEPS_HEADER).find(x=>x['ID paso'] === p.stepId && x['ID maestro'] === p.id);
      if (!row) throw new Error('No se encontró la fila del paso.');
      const cols = encabezados_(sh);
      delete values['Fecha creación'];
      escribirCampos_(sh,row.__row,values,cols);
    } else {
      sh.appendRow(STEPS_HEADER.map(k=>values[k] === undefined ? '' : values[k]));
    }
    auditar_('PASO',p.id,status+' | '+title);
    return { saved:true, stepId:values['ID paso'] };
  });
}

function sugerirPasos_(id) {
  return conBloqueo_(() => {
    const o = buscar_(id);
    const outcome = resultado_(o);
    const stage = etapa_(o[C.status]);
    let tasks;
    if (outcome === 'Adjudicado') {
      tasks = ['Guardar carta de adjudicación','Verificar monto aprobado y condiciones','Firmar convenio y pólizas',
        'Aprobar presupuesto y cronograma de desembolsos','Definir metas, indicadores e informes','Iniciar ejecución y seguimiento'];
    } else if (outcome === 'No adjudicado') {
      tasks = ['Archivar resultado de no selección','Solicitar retroalimentación','Analizar brechas de elegibilidad y propuesta',
        'Reformular alcance y presupuesto','Evaluar siguiente edición o financiador'];
    } else if (['Enviada','Segunda fase'].includes(stage)) {
      tasks = ['Archivar acuse de radicación','Confirmar cronograma de evaluación','Preparar documentación de segunda fase',
        'Hacer seguimiento al financiador','Registrar decisión y monto aprobado'];
    } else {
      tasks = ['Verificar apertura, cierre y términos oficiales','Evaluar elegibilidad y encaje Educamás',
        'Definir aliados y carta de intención','Estructurar presupuesto y ruta de impacto','Revisar documentos y aprobaciones internas',
        'Enviar postulación y guardar comprobante'];
    }
    const existing = new Set(pasosPorId_(id).map(x=>canon_(x.title)));
    const sh = libro_().getSheetByName(EDU.STEPS);
    let added=0;
    tasks.forEach(title=>{
      if (existing.has(canon_(title))) return;
      sh.appendRow([Utilities.getUuid(),id,title,'Pendiente','','','','','Ruta sugerida editable',new Date(),new Date()]);
      existing.add(canon_(title)); added++;
    });
    auditar_('SUGERIR PASOS',id,String(added)+' pasos añadidos');
    return { added, steps:pasosPorId_(id) };
  });
}

/**
 * Actualiza SOLO el registro correspondiente en la hoja del año.
 * No reconstruye ni borra una pestaña anual completa.
 */
function sincronizarRegistro_(id, oldYear) {
  const ss = libro_();
  const ctx = leer_();
  const o = ctx.items.find(x=>x[C.id] === id);
  if (!o) throw new Error('ID inexistente en Consolidado.');
  const year = String(o[C.year] || '');
  if (!/^20\d{2}$/.test(year)) throw new Error('Año del registro inválido.');
  if (oldYear && oldYear !== year) {
    const past = ss.getSheetByName(oldYear);
    if (past) {
      const h = encabezados_(past), pos = h.indexOf(C.id);
      if (pos >= 0 && past.getLastRow()>1) {
        const values = past.getRange(2,pos+1,past.getLastRow()-1,1).getDisplayValues();
        const index = values.findIndex(x=>x[0]===id);
        if (index>=0) past.deleteRow(index+2);
      }
    }
  }
  let sh = ss.getSheetByName(year);
  if (!sh) {
    sh = ss.insertSheet(year);
    if (sh.getMaxColumns() < ctx.h.length) sh.insertColumnsAfter(sh.getMaxColumns(),ctx.h.length-sh.getMaxColumns());
    sh.getRange(1,1,1,ctx.h.length).setValues([ctx.h]);
    sh.setFrozenRows(1);
  }
  const annualHeaders = encabezados_(sh);
  ctx.h.forEach(h=>{
    if (h && !annualHeaders.includes(h)) {
      garantizarColumna_(sh,h);
      annualHeaders.push(h);
    }
  });
  const col = annualHeaders.indexOf(C.id);
  const ids = sh.getLastRow()>1 ? sh.getRange(2,col+1,sh.getLastRow()-1,1).getDisplayValues() : [];
  const index = ids.findIndex(x=>x[0]===id);
  const row = index>=0 ? index+2 : sh.getLastRow()+1;
  const data = {};
  annualHeaders.forEach(k=>{
    if (k === '#') { data[k] = index>=0 ? row-1 : row-1; return; }
    if (Object.prototype.hasOwnProperty.call(o,k)) data[k] = celdaSegura_(o[k]);
  });
  escribirCampos_(sh,row,data,annualHeaders);
  return { year,row };
}

/** Manual. No elimina filas históricas; únicamente concilia IDs presentes. */
function sincronizarFichasAnuales() {
  const items = leer_().items;
  const result = { ok:0, errors:[] };
  items.forEach(o=>{
    try { sincronizarRegistro_(o[C.id], ''); result.ok++; }
    catch(err) { result.errors.push({ id:o[C.id],error:err.message }); }
  });
  Logger.log(JSON.stringify(result,null,2));
  return result;
}

function diagnostico_() {
  const ctx = leer_(), seen=new Set(),duplicates=[];
  const noDeadline=[],noFolder=[],invalidYear=[],amountWarnings=[];
  ctx.items.forEach(x=>{
    const id=x[C.id];
    if (seen.has(id)) duplicates.push(id); else seen.add(id);
    if (!fechaCierre_(x)) noDeadline.push(id);
    if (!x[C.folder]) noFolder.push(id);
    if (!/^20\d{2}$/.test(String(x[C.year]))) invalidYear.push(id);
    if ((numero_(x[C.requestedCOP])||0)>1e11) amountWarnings.push(id);
  });
  return {
    records:ctx.items.length,
    uniqueIds:seen.size, duplicateIds:duplicates,
    withoutExactDeadline:noDeadline.length,
    withoutDriveFolder:noFolder.length,
    invalidYears:invalidYear,
    suspiciousCOP:amountWarnings,
    note:'La ausencia de soporte no se corrige automáticamente; se requiere revisión humana.'
  };
}
function diagnosticarPortal() { const r=diagnostico_(); Logger.log(JSON.stringify(r,null,2)); return r; }

// ----- FIN DEL SCRIPT -----
