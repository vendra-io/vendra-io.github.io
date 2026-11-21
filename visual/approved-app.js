/* Adaptación del diseño aprobado a los datos y acciones de la app existente. */
(()=>{'use strict';
const n=new Intl.NumberFormat('es-AR',{maximumFractionDigits:0}),pct=new Intl.NumberFormat('es-AR',{maximumFractionDigits:1});
const esc=v=>String(v??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const value=v=>typeof v==='number'&&Number.isFinite(v)?v:null;
const amount=v=>value(v)===null?'—':(v<0?'−':'')+'$'+n.format(Math.abs(v));
const moneyExact=v=>value(v)===null?'Sin dato':new Intl.NumberFormat('es-AR',{style:'currency',currency:'ARS',minimumFractionDigits:2,maximumFractionDigits:2}).format(v);
const big=v=>value(v)===null?'—':`<span class="currency">${v<0?'−':''}$</span>${n.format(Math.abs(v))}`;
function date(v){if(!/^\d{4}-\d{2}-\d{2}$/.test(v||''))return '';return v.slice(8)+'–'+new Date(v+'T12:00:00Z').toLocaleDateString('es-AR',{month:'short',timeZone:'UTC'}).replace('.','')+' '+v.slice(0,4);}
function adapt(data){
 const host=document.querySelector('#panel-content');if(!host||host.querySelector('.result-board'))return;
 const gain=host.querySelector('.kpi[data-met="ganancia"]'),sales=host.querySelector('.kpis>.kpi[data-met="ventas"]'),margin=host.querySelector('.card[data-met="margen"]'),costs=host.querySelector(':scope>.kpis');
 if(!gain||!sales||!margin||!costs)return;
 const partial=data.billingComplete===false||data.sinCostoItems>0||data.adsLocked===true||!data.fiscal;
 const g=value(data.gananciaNeta),f=value(data.facturacion),m=value(data.margenNeto)??(f>0&&g!==null?g/f*100:null);
 const info=gain.querySelector('.info'),caption=sales.querySelector('.d');
 const board=document.createElement('section');board.className='result-board';board.setAttribute('aria-label','Resultado del período');
 const source=document.querySelector('.src.on')?.textContent.trim()||'Mercado Libre';const region=document.querySelector('.js-pais-chip')?.textContent.trim()||'';
 board.innerHTML=`<div class="board-meta"><span class="eyebrow"><i class="market-dot"></i>${esc(source)}${region?' · '+esc(region):''}</span><span class="board-date"><time>${esc(date(data.from))} — ${esc(date(data.to))}</time><i class="barcode" aria-hidden="true"></i></span></div><div class="result-grid"><div class="result-primary"><div class="metric-name">${partial?'Resultado parcial':'Resultado neto calculado'}<button class="metric-help" type="button" aria-label="Cómo se calcula el resultado">ⓘ</button></div><div class="metric-value numeric ${g<0?'negative':'positive'}">${big(g)}</div><p class="metric-caption">${partial?'Hay datos pendientes de completar.':'Después de los gastos incluidos en el período.'}</p></div><div class="result-sales"><div class="metric-name">Facturación del período</div><div class="metric-value numeric">${big(f)}</div><div class="metric-caption sales-caption"></div></div><div class="result-margin"><div class="metric-name">${partial?'Margen parcial':'Margen sobre ventas'}</div><div class="margin-box"><div class="ring-wrap"><svg class="margin-ring" viewBox="0 0 100 100" aria-hidden="true"><circle class="ring-track" cx="50" cy="50" r="45"/><circle class="ring-value ${m<0?'ring-loss':''}" cx="50" cy="50" r="45" style="--arc:${m===null?0:Math.min(100,Math.abs(m))*2.83}"/></svg><div class="ring-inner"><strong class="numeric">${m===null?'—':pct.format(m)+'%'}</strong><span>MARGEN</span></div></div><p class="margin-copy">Por cada $100 vendidos<strong class="numeric">${moneyExact(m)}</strong>${m<0?'de pérdida calculada.':'de resultado calculado.'}</p></div></div></div><div class="board-foot"><span class="status-inline ${partial?'partial':''}">${partial?'Lectura parcial · revisá los datos pendientes':'Datos de tu cuenta · resultado del período'}</span><button class="board-formula" type="button">Cómo se calcula ↗</button></div>`;
 if(caption)board.querySelector('.sales-caption').append(caption);
 board.querySelectorAll('.metric-help,.board-formula').forEach(b=>b.addEventListener('click',()=>info?.click()));
 costs.before(board);
 const oldMarginParent=margin.parentElement;gain.remove();sales.remove();margin.remove();if(!oldMarginParent.children.length)oldMarginParent.remove();
 const days=/^\d{4}-\d{2}-\d{2}$/.test(data.from||'')&&/^\d{4}-\d{2}-\d{2}$/.test(data.to||'')?Math.round((Date.parse(data.to+'T00:00:00Z')-Date.parse(data.from+'T00:00:00Z'))/86400000)+1:null;
 const facts=document.createElement('div');facts.className='quick-facts';facts.innerHTML=[[value(data.ventas)===null?'—':n.format(data.ventas),'Ventas del<br>período'],[value(data.unidades)===null?'—':n.format(data.unidades),'Unidades<br>vendidas'],[data.ventas>0&&f!==null?amount(f/data.ventas):'—','Ticket<br>promedio'],[days>0?n.format(days):'—','Días en<br>este período']].map(([v,label])=>`<div><strong class="numeric">${v}</strong><span>${label}</span></div>`).join('');board.after(facts);
 const row=host.querySelector(':scope>.row');if(row&&row.children.length===1){row.classList.add('analysis-layout');const receipt=document.createElement('aside');receipt.className='receipt';receipt.innerHTML='<div class="receipt-top"><h2>La cuenta detrás.</h2><i class="barcode" aria-hidden="true"></i></div><p class="receipt-intro">Del total vendido a lo que te queda.</p><div class="receipt-row income"><span>Facturación</span><strong class="numeric">'+esc(amount(f))+'</strong></div>';
 costs.classList.add('receipt-list');receipt.append(costs);const total=document.createElement('div');total.className='receipt-total';total.innerHTML='<span>'+ (partial?'Resultado parcial':'Tu resultado') +'</span><strong class="numeric '+(g<0?'negative':'')+'">'+esc(amount(g))+'</strong>';receipt.append(total);row.append(receipt);
 const title=row.querySelector('.card h3');if(title)title.textContent='Tu negocio, día a día.';
 const hint=row.querySelector('.card .hint');if(hint)hint.textContent=hint.textContent.split(' · ')[0]+' · Elegí las series que querés comparar.';
 const toolbar=document.createElement('div');toolbar.className='approved-chart-key';[['ganancia','Resultado'],['ventas','Facturación'],['margen','Margen']].forEach(([key,label])=>{const b=document.createElement('button');b.type='button';b.textContent=label;b.dataset.approvedMetric=key;b.addEventListener('click',()=>{window.toggleMet?.(key);syncSeries();});toolbar.append(b);});row.querySelector('.card .hint')?.after(toolbar);
 }
 costs.querySelectorAll('.kpi.tog').forEach(el=>{el.tabIndex=0;el.setAttribute('role','button');el.addEventListener('click',syncSeries);el.addEventListener('keydown',e=>{if(e.target===el&&(e.key==='Enter'||e.key===' ')){e.preventDefault();el.click();}});});syncSeries();
}
function syncSeries(){document.querySelectorAll('[data-approved-metric],.receipt-list .kpi.tog').forEach(b=>{try{b.setAttribute('aria-pressed',String(metActivas.has(b.dataset.approvedMetric||b.dataset.met)));}catch(_){}});}
function mount(){if(!document.querySelector('#shell'))return;document.body.classList.add('approved-app','workbench','paper-texture');const content=document.querySelector('.content'),top=document.querySelector('.topbar');if(!content||!top)return;
 const heading=document.createElement('div');heading.className='page-heading';const left=document.querySelector('.tb-left'),tools=document.querySelector('#topbar-tools');const eyebrow=document.createElement('p');eyebrow.className='eyebrow';eyebrow.textContent='EL NEGOCIO DETRÁS DE CADA VENTA';left?.prepend(eyebrow);if(left)heading.append(left);if(tools){tools.classList.add('page-actions');heading.append(tools);}content.prepend(heading);
 const bread=document.createElement('span');bread.className='approved-breadcrumb';bread.textContent='Tu negocio / Resumen';top.prepend(bread);
 const title=document.querySelector('#page-title');function updateTitle(){if(title?.textContent==='Resumen')title.textContent='Tu resumen.';bread.textContent='Tu negocio / '+(title?.textContent||'');}updateTitle();if(title)new MutationObserver(updateTitle).observe(title,{childList:true});
 const button=document.querySelector('#dl-btn');if(button){[...button.childNodes].filter(x=>x.nodeType===3).forEach(x=>x.textContent=' Exportar');}
 const original=window.pintarPanel;if(typeof original==='function'){window.pintarPanel=function(data){const result=original.apply(this,arguments);adapt(data);return result;};try{if(ultimaData)adapt(ultimaData);}catch(_){}}
}
if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',mount,{once:true});else mount();
})();
