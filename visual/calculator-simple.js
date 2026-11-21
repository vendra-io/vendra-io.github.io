(function(){
'use strict';
const $=id=>document.getElementById(id),money=n=>new Intl.NumberFormat('es-AR',{style:'currency',currency:'ARS',maximumFractionDigits:2}).format(n),number=n=>new Intl.NumberFormat('es-AR',{maximumFractionDigits:2}).format(n);
let rates=window.VendraPublicRates,latest=null,request=0,timer,controller,category=null,unsupported=false,refreshing=false;
rates.shippingVerifiedAt=rates.verifiedAt;rates.shippingExpiresAt=rates.expiresAt;
const inputIds=['sale-price','product-cost','installment-option','fee-percent','fixed-fee','shipping-cost','other-cost','billable-weight','seller-reputation','physical-weight','package-height','package-width','package-length','shipping-mode','voluntary-shipping'];
const moneyIds=['sale-price','product-cost','fixed-fee','shipping-cost','other-cost','fee-percent'];
moneyIds.forEach(id=>{$(id).type='text';$(id).dataset.money='true';$(id).setAttribute('inputmode','decimal');});
const numeric=id=>{const el=$(id);return !el?null:moneyIds.includes(id)?window.VendraPublicEstimate.parseMoney(el.value):el.validity.badInput?NaN:el.value.trim()===''?null:Number(el.value);};
function read(){return {price:numeric('sale-price'),cost:numeric('product-cost'),installments:$('installment-option').value,feePercent:numeric('fee-percent'),fixedFee:numeric('fixed-fee'),shipping:numeric('shipping-cost'),other:numeric('other-cost'),billableWeight:numeric('billable-weight'),physicalWeight:numeric('physical-weight'),height:numeric('package-height'),width:numeric('package-width'),length:numeric('package-length'),reputation:$('seller-reputation')?.value||'unknown',shippingMode:$('shipping-mode')?.value||'standard',voluntaryShipping:$('voluntary-shipping')?.value==='yes',specialShipping:/zapatillas|botas|sandalias|mochilas|camperas|camisetas.*f[uú]tbol/i.test(category?.category_name||'')};}
function shippingRule(x){
 const el=$('shipping-rule');if(!el)return;
 if(x.price===null||x.price<=0){el.textContent='Productos nuevos · Mercado Envíos. El envío se ajusta según precio, paquete y reputación.';return;}
 const estimate=latest?.shippingEstimate;
 const threshold=x.price>=rates.freeShippingThreshold,thresholdLabel='$'+number(rates.freeShippingThreshold);
 let text=threshold?'Desde '+thresholdLabel+', Mercado Libre exige ofrecer envío gratis o descuentos según el destino y el paquete. '+(x.price>=rates.fixedFeeThreshold?'El cargo fijo desaparece; el costo de envío no. ':'El costo de envío debe incluirse. '):'Menos de '+thresholdLabel+': estimamos sin envío gratis voluntario; el cargo por unidad sigue aplicando. ';
 if(!threshold&&x.voluntaryShipping)text='Elegiste ofrecer envío gratis por debajo de '+thresholdLabel+'. Sumamos el cargo por unidad y tu costo de envío. ';
 if(estimate?.source==='weight_pending')text+='Falta el peso facturable para descontar el envío. ';
 if(estimate?.source==='special')text+='Esta modalidad o categoría usa una tarifa especial. Agregá tu costo de envío real. ';
 if(estimate?.source==='manual')text+='Envío calculado con el importe que ingresaste. ';
 if(estimate?.source==='table'){
  text+='Envío estimado para '+number(latest.weight)+' kg facturables. ';
  if(x.reputation==='unknown')text+='Elegí tu reputación para calcular el importe. ';
  if(latest.shippingBoundaryEstimate)text+='A $'+number(x.price)+' usamos el mayor cargo de los dos tramos, porque la cabecera oficial no define ese borde con precisión. ';
  const date=new Intl.DateTimeFormat('es-AR',{dateStyle:'short',timeZone:'America/Argentina/Buenos_Aires'}).format(new Date(rates.shippingVerifiedAt));
  text+='Tabla de envíos verificada el '+date+'. ';
  if(Date.now()>=Date.parse(rates.shippingExpiresAt))text+='Tarifa de envío pendiente de actualización; estimación histórica. ';
 }
 el.replaceChildren(document.createTextNode(text));
 const link=document.createElement('a');link.href='#refine-calculation';link.textContent=estimate?.amount?'Ajustar envío':'Completar envío';link.addEventListener('click',e=>{e.preventDefault();$('refine-calculation').open=true;$('refine-calculation').scrollIntoView({behavior:matchMedia('(prefers-reduced-motion: reduce)').matches?'instant':'smooth',block:'start'});($('billable-weight')||$('shipping-cost')).focus({preventScroll:true});});el.append(link);
}
function sourceStatus(){
 const validDate=Number.isFinite(Date.parse(rates?.verifiedAt)),date=validDate?new Intl.DateTimeFormat('es-AR',{dateStyle:'short',timeStyle:'short',timeZone:'America/Argentina/Buenos_Aires'}).format(new Date(rates.verifiedAt)):'no disponible';
 const stale=!Number.isFinite(Date.parse(rates?.expiresAt))||Date.now()>=Date.parse(rates.expiresAt);
 $('rate-status').textContent=(stale?'Tarifario pendiente de actualización. Estimación histórica del ':rates?.status==='fresh'?'Fuente oficial consultada: ':'Tarifario oficial verificado: ')+date+(stale?'. Verificá los costos antes de publicar.':'.');
 $('rate-status').dataset.stale=String(stale);
 return stale;
}
function update(){
 latest=null;$('copy-status').textContent='';$('result-error').hidden=true;$('result-value').dataset.pending='false';const stale=sourceStatus(),x=read();shippingRule(x);
 if($('calculator-scope'))$('calculator-scope').textContent='Productos nuevos · '+(x.shippingMode==='flex'?'Flex':x.shippingMode==='other'?'Tarifa especial':'Mercado Envíos general')+' · Argentina';
 const fixedHint=$('fixed-fee').parentElement.querySelector('.cs-hint');if(fixedHint)fixedHint.textContent='Estimamos según precio y peso. Desde $'+number(rates.fixedFeeThreshold)+' no se aplica este cargo al marketplace general.';
 let weight;try{weight=window.VendraPublicEstimate.weightOf(x);}catch{}
 if($('scenario-assumptions')){const reputation={'green':'verde o sin reputación','yellow':'amarilla','red':'naranja o roja','unknown':'reputación por elegir'}[x.reputation],link=$('edit-shipping-assumptions');$('scenario-assumptions').replaceChildren(document.createTextNode('Paquete estimado: '+(weight?number(weight)+' kg':'por completar')+' · Reputación: '+reputation+'. '),...(link?[link]:[]));}
 $('copy-result').disabled=true;
 if(x.price===null||x.cost===null){$('result-label').textContent='Tu estimación';$('result-value').textContent='—';$('result-description').textContent='Ingresá costo, precio y el cargo por venta de tu publicación. Calculamos al escribir.';$('result-detail').hidden=true;return;}
 try{
  if(unsupported)throw Error('Esta categoría tiene otro esquema de cargos. Usá el simulador oficial de Mercado Libre.');
  latest=window.VendraPublicEstimate.calculateConcrete(x,rates);
  shippingRule(x);
  const historical=stale||(latest.shippingEstimate.source==='table'&&Date.now()>=Date.parse(rates.shippingExpiresAt));
  const pending=latest.status!=='calculated';
  $('result-label').textContent=pending?'Completá el dato pendiente':historical?'Resultado con tarifario histórico':'Te quedarían';
  $('result-value').dataset.pending=String(pending);
  $('result-value').textContent=pending?'—':money(latest.result);
  $('result-value').dataset.negative=String(!pending&&latest.result<0);
  const prompts={commission:'Ingresá el porcentaje de cargo por venta que figura en tu publicación.',package:'Indicá el peso facturable del paquete para estimar el cargo por unidad y el envío.',reputation:'Elegí tu reputación para estimar el envío.',shipping_cost:'Ingresá tu costo de envío: esta modalidad o categoría usa una tarifa especial.'};
  $('result-description').textContent=pending?prompts[latest.missing[0]]:'Antes de '+latest.pendingExpenses.join(' e ')+'. Envío y cargo por unidad según el escenario indicado.';
  $('result-detail').hidden=false;
  $('result-sale').textContent=money(latest.price);$('result-cost').textContent='−'+money(latest.cost);
  $('result-fee').textContent=latest.commission===null?'Completá el porcentaje':'−'+money(latest.commission)+' ('+number(latest.feePercent)+'%)';
  $('result-installments').textContent=latest.financing===0?'Sin cargo adicional':'−'+money(latest.financing)+' ('+number(rates.installments[x.installments])+'%)';
  $('result-fixed').textContent=latest.fixed===null?'Falta el paquete':'−'+money(latest.fixed)+(x.fixedFee!==null?' · tu dato':'');
  $('result-shipping').textContent=latest.shipping===null?'Falta completar':latest.shippingEstimate.source==='buyer'?'$0 · sin gratis voluntario':'−'+money(latest.shipping);
  $('result-other').textContent=latest.other===null?'Sin incluir':'−'+money(latest.other);
  $('result-profit').textContent=pending?'Pendiente':money(latest.result);$('copy-result').disabled=pending;
 }catch(error){$('result-value').textContent='—';$('result-detail').hidden=true;$('result-error').hidden=false;$('result-error').textContent=error.message;$('result-description').textContent='Revisá el dato indicado para seguir.';}
}
inputIds.forEach(id=>$(id)?.addEventListener('input',()=>{if(['physical-weight','package-height','package-width','package-length'].includes(id))$('billable-weight').value='';if(id==='billable-weight')for(const other of ['physical-weight','package-height','package-width','package-length'])$(other).value='';if(['fee-percent','billable-weight','physical-weight','package-height','package-width','package-length','seller-reputation'].includes(id)&&$('example-note'))$('example-note').hidden=true;update();}));
$('edit-shipping-assumptions')?.addEventListener('click',e=>{e.preventDefault();$('refine-calculation').open=true;$('billable-weight').focus();});
function resetSearch(){request++;clearTimeout(timer);controller?.abort();controller=null;category=null;unsupported=false;$('category-choice').replaceChildren();$('category-choice').hidden=true;$('category-status').textContent='La categoría ayuda a identificar tarifas especiales. La comisión se toma del porcentaje que ingresás.';}
async function search(){
 const query=$('product-query').value.trim();if(query.length<3)return;
 const id=++request,abort=new AbortController();controller=abort;const timeout=setTimeout(()=>abort.abort(),8000);
 $('category-status').textContent='Buscando tu producto en Mercado Libre…';
 try{
  const url=new URL('https://api.mercadolibre.com/sites/MLA/domain_discovery/search');url.search=new URLSearchParams({q:query,limit:'3',target:'core'});
  const response=await fetch(url,{signal:abort.signal,credentials:'omit',referrerPolicy:'no-referrer'});if(!response.ok)throw Error('Unavailable');
  const data=await response.json();if(id!==request)return;
  const seen=new Set(),options=(Array.isArray(data)?data:[]).filter(x=>/^MLA\d+$/.test(x.category_id)&&typeof x.category_name==='string'&&!seen.has(x.category_id)&&seen.add(x.category_id));
  if(!options.length)throw Error('No matching category');
  $('category-choice').replaceChildren(...options.map(x=>new Option(x.category_name,x.category_id)));$('category-choice').hidden=false;
  category=options[0];$('category-status').textContent='Categoría sugerida. Revisamos las excepciones de envío; mantenemos el porcentaje de tu publicación.';
  await checkCategory(category.category_id,id,abort.signal);
 }catch{if(id===request){$('category-status').textContent='No pudimos sugerir la categoría. Podés calcular con el porcentaje de tu publicación.';}}
 finally{clearTimeout(timeout);}
}
async function checkCategory(categoryId,id,signal){
 try{const r=await fetch('https://api.mercadolibre.com/categories/'+categoryId,{signal,credentials:'omit',referrerPolicy:'no-referrer'});if(!r.ok)return;const c=await r.json();if(id!==request)return;unsupported=(c.path_from_root||[]).some(p=>['MLA1743','MLA1459','MLA1540'].includes(p.id));if(unsupported)$('category-status').textContent='Vehículos, inmuebles y servicios no están incluidos en esta estimación de productos.';update();}catch{}
}
$('product-query').addEventListener('input',()=>{resetSearch();update();if($('product-query').value.trim().length>=3)timer=setTimeout(search,650);});
$('category-choice').addEventListener('change',()=>{controller?.abort();controller=new AbortController();const id=++request;category={category_id:$('category-choice').value,category_name:$('category-choice').selectedOptions[0].text};unsupported=false;update();checkCategory(category.category_id,id,controller.signal);});
function clearInputs(){const defaults={'installment-option':'none','seller-reputation':'green','shipping-mode':'standard','voluntary-shipping':'no','billable-weight':'0.5'};for(const id of inputIds)if($(id))$(id).value=defaults[id]||'';}
$('load-example').addEventListener('click',()=>{resetSearch();clearInputs();$('product-query').value='';$('sale-price').value='30000';$('product-cost').value='18000';$('fee-percent').value='15';if($('example-note'))$('example-note').hidden=false;update();});
$('clear-calculator').addEventListener('click',()=>{resetSearch();clearInputs();$('product-query').value='';if($('example-note'))$('example-note').hidden=true;update();$('product-cost').focus();});
$('copy-result').addEventListener('click',async()=>{
 if(!latest||latest.status!=='calculated')return;const text=['Vendra · Estimación por unidad, ARS',category?'Categoría sugerida: '+category.category_name:'Productos nuevos · escenario general',$('scenario-assumptions')?.textContent||'',...['result-sale','result-cost','result-fee','result-installments','result-fixed','result-shipping','result-other'].map(id=>{const e=$(id);return e.previousElementSibling.textContent+': '+e.textContent;}),$('result-label').textContent+': '+money(latest.result),$('result-description').textContent,$('shipping-rule')?.textContent||'',$('rate-status').textContent,'La comisión es el dato ingresado por el vendedor. No es ganancia neta ni una cotización personalizada. Fuente: https://www.mercadolibre.com.ar/ayuda/Costos-para-vender-productos_870'].join('\n');
 try{await navigator.clipboard.writeText(text);$('copy-status').textContent='Escenario copiado con sus supuestos.';}catch{$('copy-status').textContent='No se pudo copiar. Podés seleccionar el resultado y su detalle.';}
});
async function refreshRates(){
 if(refreshing||location.protocol==='file:')return;refreshing=true;const abort=new AbortController(),timeout=setTimeout(()=>abort.abort(),15000);
 try{const response=await fetch('https://nyqglmfsuyhhhnlexehe.supabase.co/functions/v1/public-ml-rates',{signal:abort.signal,cache:'no-store',credentials:'omit',headers:{apikey:"eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im55cWdsbWZzdXloaGhubGV4ZWhlIiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODMxOTkzNTEsImV4cCI6MjA5ODc3NTM1MX0.zcv96m70URnmGQ3MPx65OKN9jTiZfs0HSe9PhigKZiI",Authorization:'Bearer '+"eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im55cWdsbWZzdXloaGhubGV4ZWhlIiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODMxOTkzNTEsImV4cCI6MjA5ODc3NTM1MX0.zcv96m70URnmGQ3MPx65OKN9jTiZfs0HSe9PhigKZiI"}});if(!response.ok)throw Error('No refresh');const data=await response.json();if(!['fresh','cached','stale'].includes(data.status)||!Number.isFinite(Date.parse(data.verifiedAt))||!Number.isFinite(Date.parse(data.expiresAt)))throw Error('Invalid data');window.VendraPublicEstimate.calculate({price:30000,cost:18000,installments:'none'},data);rates={...data,shipping:data.shipping||rates.shipping,shippingVerifiedAt:data.shipping?data.verifiedAt:rates.shippingVerifiedAt,shippingExpiresAt:data.shipping?data.expiresAt:rates.shippingExpiresAt};update();}
 catch{sourceStatus();}finally{clearTimeout(timeout);refreshing=false;}
}
document.addEventListener('visibilitychange',()=>{if(!document.hidden){update();if(Date.now()>=Date.parse(rates.expiresAt))refreshRates();}});
setInterval(()=>{if(!document.hidden){sourceStatus();if(Date.now()>=Date.parse(rates.expiresAt)){update();refreshRates();}}},60000);
resetSearch();update();refreshRates();
})();
