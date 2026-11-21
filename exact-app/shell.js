/* Bridge the approved shell to the existing application. No business API calls. */
(function(root){'use strict';
const $=id=>document.getElementById(id);
const titles={resumen:['Tu resumen.','EL NEGOCIO DETRÁS DE CADA VENTA','Resumen'],productos:['Qué se vende.','PRODUCTOS / RESULTADO PARCIAL','Productos'],ventas:['Cada venta cuenta.','OPERACIÓN / VENTAS DEL PERÍODO','Ventas'],marketing:['Tu inversión en publicidad.','MARKETING / GASTOS Y ATRIBUCIÓN','Publicidad'],full:['Lo que cuesta Full.','LOGÍSTICA / ALMACENAMIENTO Y ENVÍOS','Logística Full'],devoluciones:['Lo que volvió.','OPERACIÓN / DEVOLUCIONES','Devoluciones'],cancelaciones:['Las ventas que no fueron.','OPERACIÓN / CANCELACIONES','Cancelaciones'],costos:['Empezá por tus costos.','CONFIGURACIÓN / COSTOS DE PRODUCTO','Costos'],cuenta:['Todo en su lugar.','CONFIGURACIÓN / TU CUENTA','Mi cuenta'],admin:['Administración.','GESTIÓN / PLATAFORMA','Administración'],experto:['Decisiones con tus datos.','EXPERTO / TU OPERACIÓN EN PERSPECTIVA','Experto']};
let current='resumen';
function icons(host=document){host.querySelectorAll('[data-icon]').forEach(e=>{if(!e.querySelector('svg'))e.innerHTML=root.VendraExactPanel.icon(e.dataset.icon);});}
function heading(view){const t=titles[view];if(!t)return;current=view;for(const [id,text]of [['page-title',t[0]],['page-kicker',t[1]],['breadcrumb',t[2]]])if($(id)?.textContent!==text)$(id).textContent=text;document.querySelectorAll('#nav [data-view],#nav-experto,#nav-admin').forEach(el=>{const selected=(el.dataset.view||el.id.replace('nav-',''))===view;el.classList.toggle('active',selected);el.classList.toggle('on',selected);if(selected)el.setAttribute('aria-current','page');else el.removeAttribute('aria-current');});}
function adaptTransient(){for(const id of ['nota-pop','rep-pop','mp-email-ov'])$(id)?.classList.add('legacy-ui');const expert=$('nav-experto');if(expert&&!expert.dataset.exact){expert.dataset.exact='1';expert.dataset.view='experto';expert.innerHTML='<span data-icon="chart"></span><span>Experto</span>';expert.setAttribute('role','button');icons(expert);}
 document.querySelectorAll('.metric-value.numeric').forEach(el=>{const digits=el.textContent.replace(/\D/g,'').length;el.classList.toggle('long-number',digits>=8);el.classList.toggle('very-long-number',digits>=9);});
 if($('expert-root')&&!$('costos-content').classList.contains('oculto'))heading('experto');
 document.querySelectorAll('#expert-root .btn,.sales-export-dialog .btn').forEach(el=>{el.classList.add('button');if(el.classList.contains('btn-verde'))el.classList.add('primary');});
 const refresh=$('btn-refresh');if(refresh&&!refresh.querySelector('svg'))refresh.innerHTML=root.VendraExactPanel.icon('refresh');if(refresh)refresh.setAttribute('aria-label',refresh.disabled?'Actualizando datos':'Actualizar datos');
}
function install(){
 if(install.done)return;install.done=true;icons();
 const oldVer=root.ver;root.ver=function(id){const result=oldVer.apply(this,arguments);const view=id==='view-panel'?(typeof subVista!=='undefined'?subVista:'resumen'):id.replace('view-','');heading(view);root.VendraExactPanel.stopPlayback();return result;};
 const oldPaint=root.pintarPanel;root.pintarPanel=function(data){const result=oldPaint.apply(this,arguments);const host=$('panel-content'),snapshot=document.createElement('div');snapshot.append(...host.childNodes);const view=typeof subVista!=='undefined'?subVista:'resumen';if(!root.VendraExactPanel.render(host,data,view,snapshot))host.append(...snapshot.childNodes);heading(view);return result;};
 const disconnected=root.marcarDesconectadoSidebar;root.marcarDesconectadoSidebar=function(){const dot=document.querySelector('.workspace .connected');if(dot){dot.classList.add('disconnected');dot.title='La cuenta necesita reconexión';}return disconnected.apply(this,arguments);};
 root.toggleDrawer=function(open){const side=$('sidebar'),shade=$('side-bk'),next=open===undefined?!side.classList.contains('open'):Boolean(open);side.classList.toggle('open',next);shade.hidden=!next;$('menu').setAttribute('aria-expanded',String(next));if(!next&&document.activeElement===shade)$('menu').focus();};
 $('nav-productos').addEventListener('click',()=>root.irSub('productos'));
 $('nav-cuenta').addEventListener('click',()=>root.cargarCuenta());
 $('nav-planes').addEventListener('click',()=>root.mostrarPlanes());
 $('src-ml').addEventListener('keydown',e=>{if(e.key==='Enter'||e.key===' '){e.preventDefault();e.currentTarget.click();}});
 $('sidebar').addEventListener('click',e=>{if(e.target.closest('button,a:not(.brand)'))root.toggleDrawer(false);});
 document.addEventListener('keydown',e=>{if(e.key==='Escape'&&$('sidebar').classList.contains('open')){root.toggleDrawer(false);$('menu').focus();}});
 const media=matchMedia('(max-width:800px)');media.addEventListener('change',()=>root.toggleDrawer(false));
 const observer=new MutationObserver(()=>{observer.disconnect();adaptTransient();observer.observe(document.body,{childList:true,subtree:true});});observer.observe(document.body,{childList:true,subtree:true});
 adaptTransient();root.VendraExactSettings.install();heading(current);
 if(typeof ultimaData!=='undefined'&&ultimaData&&!$('panel-content').classList.contains('oculto'))root.pintarPanel(ultimaData);
}
root.VendraExactShell={install,heading};install();
})(window);
