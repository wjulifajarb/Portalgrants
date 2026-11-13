import {test} from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {runInNewContext} from 'node:vm';
const source=readFileSync(new URL('../google-apps-script/Code.gs',import.meta.url),'utf8');
const context={Date,Number,String,Object,Math,Array,JSON,RegExp,Set,Error,isFinite,Utilities:{formatDate(date,_tz,format){const s=new Date(date).toISOString();return format==='yyyy-MM-dd'?s.slice(0,10):s.slice(0,19).replace('T',' ');}}};
runInNewContext(source,context);
test('homologación de estados',()=>{
  assert.equal(context.etapa_('Llamado a segunda fase'),'Segunda fase');
  assert.equal(context.etapa_('No aceptada'),'Rechazada');
  assert.equal(context.etapa_('Aceptada / Adjudicada'),'Adjudicada');
  assert.equal(context.etapa_('Enviado'),'Enviada');
  assert.equal(context.etapa_('Pendiente de apertura'),'Mapeada');
});
test('fechas válidas en formato ISO o DD/MM/AAAA',()=>{
  assert.equal(context.fecha_('13/11/2026'),'2026-11-13');
  assert.equal(context.fecha_('2026-11-16'),'2026-11-16');
  assert.equal(context.fecha_('31/02/2026'),'');
});
test('clasificación distingue montos sospechosos',()=>{
  assert.equal(context.montoSeguro_(context.numero_('1.168.500.000.000')),null);
  assert.equal(context.numero_('234.982.356'),234982356);
});
