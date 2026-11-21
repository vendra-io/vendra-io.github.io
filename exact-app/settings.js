/* Live controls inside the literal settings-grid and cost-table compositions
   from rehecho-2026-11-20/app.js. No renderer, save handler or API is replaced. */
(function () {
  'use strict';
  const node=(tag,cls,text)=>{const el=document.createElement(tag);if(cls)el.className=cls;if(text!==undefined)el.textContent=text;return el;};
  function buttons(host){host.querySelectorAll('.btn,.ivaopt').forEach(button=>{button.classList.add('button');button.classList.toggle('primary',button.classList.contains('btn-verde')||button.classList.contains('ivaopt')&&button.classList.contains('on'));if(button.tagName==='BUTTON')button.type='button';});}
  function setText(el,text){if(el&&el.textContent!==text)el.textContent=text;}
  function costRow(source){
    const row=node('tr'),identity=node('td'),price=node('td','numeric'),cost=node('td');
    const title=node('span','product-title'),sub=node('span','product-sub');
    const pi=source.querySelector(':scope>.pi'),variant=source.querySelector(':scope>.vcb');
    if(pi){const oldTitle=pi.querySelector('.pt'),oldSub=pi.querySelector('.ps');if(oldTitle)title.append(...oldTitle.childNodes);if(oldSub)sub.append(...oldSub.childNodes);}
    else if(variant){const name=variant.querySelector('b');if(name){title.append(...name.childNodes);name.remove();}sub.append(...variant.childNodes);}
    identity.append(title,sub);
    const oldPrice=source.querySelector(':scope>.cpr');if(oldPrice)price.append(...oldPrice.childNodes);
    const input=source.querySelector(':scope>.cost-in'),margin=source.querySelector(':scope>.mtag');
    if(input){input.classList.add('cost-input','numeric');input.setAttribute('aria-label','Costo de '+title.textContent.trim());cost.append(input,node('span','cost-state'));cost.querySelector('.cost-state').setAttribute('role','status');if(margin)cost.append(margin);}
    else cost.append(node('span','cost-state','Costo por variante'));
    row.append(identity,price,cost);return row;
  }
  function wireToggle(toggle,container){
    toggle.setAttribute('role','button');toggle.tabIndex=0;
    const sync=()=>toggle.setAttribute('aria-expanded',String(container.classList.contains('open')));
    toggle.addEventListener('click',sync);
    toggle.addEventListener('keydown',event=>{if(event.key==='Enter'||event.key===' '){event.preventDefault();toggle.click();}});sync();
  }
  function makeCategory(category){
    if(category.dataset.exactCosts)return;
    const original=category.querySelector(':scope>.ccatb'),header=category.querySelector(':scope>.ccath');
    if(!original||!header)return;
    category.dataset.exactCosts='true';category.className='panel ccat open';
    header.classList.add('panel-heading');
    const oldHeading=header.querySelector('h4');if(oldHeading)oldHeading.replaceWith(node('h2','',oldHeading.textContent));
    wireToggle(header,category);
    const wrap=node('div','table-wrap ccatb');wrap.tabIndex=0;wrap.setAttribute('role','region');wrap.setAttribute('aria-label','Costos de productos: '+(header.querySelector('h2')?.textContent||''));
    const table=node('table','data-table cost-table'),thead=node('thead'),headRow=node('tr');
    ['Producto / variante','Precio de venta','Costo de producto'].forEach(text=>headRow.append(node('th','',text)));thead.append(headRow);table.append(thead);
    let singleBody=null;
    [...original.children].forEach(source=>{
      if(source.classList.contains('cpub')){
        singleBody=null;const group=node('tbody','cpub open');
        const main=source.querySelector(':scope>.crow');if(main)group.append(costRow(main));
        const bulk=source.querySelector('.vbulk');
        if(bulk){const tr=node('tr','cvars exact-cost-bulk'),td=node('td');td.colSpan=3;const controls=node('div','filter-bar');controls.append(...bulk.childNodes);controls.querySelectorAll('.cost-in').forEach(input=>{input.classList.add('cost-input','numeric');input.setAttribute('aria-label',bulk.querySelector('.vbl')?.textContent||'Mismo costo para todas las variantes');});td.append(controls);tr.append(td);group.append(tr);}
        source.querySelectorAll('.vrw').forEach(variant=>{const tr=costRow(variant);tr.classList.add('cvars');group.append(tr);});
        const toggle=group.querySelector('.vtog');if(toggle)wireToggle(toggle,group);
        table.append(group);
      }else if(source.classList.contains('crow')){if(!singleBody){singleBody=node('tbody');table.append(singleBody);}singleBody.append(costRow(source));}
    });
    wrap.append(table);original.replaceWith(wrap);
  }
  function adaptCosts(host=document.getElementById('costos-content')){
    if(!host?.querySelector('#cq')||!host.querySelector('#costos-body'))return;
    host.classList.add('exact-costs');
    const originalTools=host.querySelector('.costos-tools');
    if(originalTools){
      const note=node('p','scope-note');note.dataset.exactCostNote='true';
      const heading=node('div','section-heading'),copy=node('div');
      copy.append(node('h2','','Tu base para calcular mejor.'),node('p','','Cargá el costo de cada producto o variante. Los cambios se guardan automáticamente.'));
      const count=node('span','eyebrow');count.dataset.exactCostCount='true';heading.append(copy,count);
      const filters=node('div','filter-bar');
      [['cq','Buscar producto o SKU'],['c-sort','Orden'],['c-estado','Estado']].forEach(([id,labelText])=>{const control=host.querySelector('#'+id);if(control){control.removeAttribute('style');const label=node('label');label.htmlFor=id;control.setAttribute('aria-label',labelText);label.append(control);filters.append(label);}});
      ['cf-all','cf-no'].forEach(id=>{const control=host.querySelector('#'+id);if(control)filters.append(control);});
      const extras=node('details','exact-cost-tools');extras.append(node('summary','text-button','Importar, exportar y configurar costos'));
      const actions=node('div','filter-bar');
      const status=host.querySelector('#csv');if(status){status.setAttribute('role','status');status.setAttribute('aria-live','polite');}
      [...originalTools.childNodes].forEach(child=>{if(child!==status&&(child.nodeType!==3||child.textContent.trim()))actions.append(child);});
      extras.append(actions);
      originalTools.replaceWith(note,heading,filters,extras);
      const iva=host.querySelector('#ivabar');if(iva){iva.classList.add('filter-bar');extras.append(iva);}
      if(status)extras.after(status);
    }
    host.querySelectorAll('#costos-body>.ccat').forEach(makeCategory);
    const con=host.querySelector('#iva-con')?.classList.contains('on');
    setText(host.querySelector('[data-exact-cost-note]'),'Cargá el costo de cada producto. Tus importes se ingresan '+(con?'con IVA':'sin IVA')+'. Conservá esta configuración al cargar tu archivo o editar una variante.');
    host.querySelectorAll('.cost-table thead th:last-child').forEach(th=>setText(th,con?'Costo con IVA':'Costo sin IVA'));
    setText(host.querySelector('[data-exact-cost-count]'),host.querySelectorAll('.cost-input[data-key]').length+' productos / variantes');
    host.querySelectorAll('.cost-input[data-key]').forEach(input=>{
      const status=input.parentElement.querySelector('.cost-state');
      const failed=input.classList.contains('err'),saving=input.classList.contains('sv'),saved=input.classList.contains('ok');
      if(failed)input.setAttribute('aria-invalid','true');else input.removeAttribute('aria-invalid');
      setText(status,failed?'No se pudo guardar':saving?'Guardando…':saved?'Guardado':input.value?'Costo cargado':'Sin costo cargado');
    });
    host.querySelectorAll('.ccath').forEach(header=>header.setAttribute('aria-expanded',String(header.closest('.ccat').classList.contains('open'))));
    host.querySelectorAll('.vtog').forEach(toggle=>toggle.setAttribute('aria-expanded',String(toggle.closest('.cpub').classList.contains('open'))));
    const hint=host.querySelector('#costos-body>.hint');if(hint){hint.classList.add('table-note');hint.removeAttribute('style');}
    buttons(host);
  }
  function unwrapFields(host){host.querySelectorAll('.acc-field').forEach(field=>field.replaceWith(...field.childNodes));}
  function adaptAccount(host=document.getElementById('cuenta-content')){
    const original=host?.querySelector('.acc-wrap');if(!original)return;
    host.classList.add('exact-account');
    const grid=node('div','settings-grid'),extras=node('div','exact-account-actions'),sections=[];
    [...original.querySelectorAll(':scope>.acc-card')].forEach(card=>{
      const oldTitle=card.querySelector('h3'),title=oldTitle?.textContent.trim()||'Configuración';
      const names={'Tu perfil':'Tu perfil.','Mercado Libre':'Tu cuenta de Mercado Libre.','Situación fiscal':'Situación fiscal.','Tu plan':'Tu plan.','Seguridad':'Seguridad.'};
      const descriptions={'Tu perfil':'La identidad que ves en tu panel.','Mercado Libre':'La cuenta de la que Vendra lee tus ventas.','Situación fiscal':'Tu información fiscal para calcular el resultado.','Tu plan':'Tu suscripción y las herramientas disponibles.','Seguridad':'Administrá tu forma de acceso.'};
      const section=node('section','settings-card');section.dataset.kind=title==='Seguridad'?'security':title==='Tu plan'?'plan':'settings';
      section.append(node('h2','',names[title]||title),node('p','',descriptions[title]||''));
      const hint=card.querySelector(':scope>.hint');
      if(title!=='Tu plan')hint?.remove();
      oldTitle?.remove();
      if(title==='Tu perfil'){
        const form=node('form');form.id='exact-profile-form';
        const photo=card.querySelector(':scope>.acc-row');
        [...card.childNodes].forEach(child=>{if(child!==photo)form.append(child);});
        unwrapFields(form);
        form.querySelectorAll('.acc-actions').forEach(actions=>actions.replaceWith(...actions.childNodes));
        form.addEventListener('submit',event=>{event.preventDefault();form.querySelector('[onclick^="guardarNombre"]')?.click();});
        section.append(form);if(photo)section.append(photo);
      }else{
        section.append(...card.childNodes);unwrapFields(section);
      }
      section.querySelectorAll('.acc-in').forEach(input=>input.classList.remove('acc-in'));
      section.querySelectorAll('.acc-actions').forEach(actions=>actions.classList.add('dialog-actions'));
      if(title==='Situación fiscal'){
        const connection=section.querySelector('.acc-conn'),info=connection?.querySelector('div');
        if(connection&&info){const label=node('label','','Condición fiscal');label.htmlFor='exact-fiscal-condition';const condition=node('input');condition.id='exact-fiscal-condition';condition.disabled=true;condition.value=info.firstElementChild?.textContent||info.textContent;const hint=node('p','',info.children[1]?.textContent||'');connection.replaceWith(label,condition,hint);}
      }
      if(title==='Tu plan'){
        const titleBlock=[...section.children].find(child=>child.tagName==='DIV'&&child.style.fontSize==='14px');
        if(titleBlock){const planTitle=node('h3');planTitle.style.marginTop='25px';planTitle.append(...titleBlock.childNodes);titleBlock.replaceWith(planTitle);}
      }
      if(title==='Mercado Libre'){
        const connection=section.querySelector('.acc-conn');
        if(connection){
          const info=connection.querySelector('div');
          if(info){const lines=[...info.children],text=node('div');if(lines[0])text.append(node('strong','',lines[0].textContent));if(lines[1])text.append(node('small','',lines[1].textContent));info.replaceWith(text);}
          connection.className='connected-profile';
          const dot=connection.querySelector('.acc-dot');if(dot){const logo=node('img','workspace-icon');logo.src='/exact-app/assets/ml-icon-official.svg';logo.alt='Mercado Libre';dot.replaceWith(logo);}
        }
      }
      sections.push(section);card.remove();
    });
    [...original.childNodes].forEach(child=>{if(child.nodeType!==3||child.textContent.trim())extras.append(child);});
    sections.filter(section=>section.dataset.kind!=='security').forEach(section=>grid.append(section));
    sections.filter(section=>section.dataset.kind==='security').forEach(section=>grid.append(section));
    original.replaceWith(grid,extras);buttons(host);
  }
  const watched=new WeakSet();
  function watch(id,adapt){const host=document.getElementById(id);if(!host||watched.has(host))return;watched.add(host);const observer=new MutationObserver(run);function run(){observer.disconnect();try{adapt(host);}finally{observer.observe(host,{childList:true,subtree:true,attributes:true,attributeFilter:['class']});}}run();}
  function install(){watch('costos-content',adaptCosts);watch('cuenta-content',adaptAccount);}
  function contracts(){
    const errors=[],costs=document.getElementById('costos-content'),account=document.getElementById('cuenta-content');
    if(costs?.querySelector('#cq')){
      for(const id of ['cq','c-sort','c-estado','cf-all','cf-no','c-file','c-tpl','c-stock','iva-sin','iva-con','csv'])if(costs.querySelectorAll('#'+id).length!==1)errors.push('ID costos: '+id);
      costs.querySelectorAll('.cost-in[data-key]').forEach(input=>{if(input.parentElement.tagName!=='TD'||!input.parentElement.querySelector('.mtag'))errors.push('Celda costo/margen: '+input.dataset.key);if(!input.matches('.cost-input.numeric'))errors.push('Clase exacta costo: '+input.dataset.key);});
      costs.querySelectorAll('.cost-table').forEach(table=>{if(table.tHead?.rows[0]?.cells.length!==3)errors.push('Cabecera de tabla');});
    }
    if(account?.querySelector('.settings-grid')){for(const id of ['acc-nombre','acc-email','foto-input','acc-iibb','perfil-msg','iibb-msg'])if(account.querySelectorAll('#'+id).length!==1)errors.push('ID cuenta: '+id);}
    return {passed:errors.length===0,errors};
  }
  window.VendraExactSettings={install,adaptCosts,adaptAccount,contracts};
  if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',install,{once:true});else install();
})();
