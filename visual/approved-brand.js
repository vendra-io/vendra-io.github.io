/* Uses official, unmodified ML CDN assets. No affiliation or certification implied. */
(function(){
'use strict';
const thisScript=document.currentScript;
const assetRoot=new URL('./',thisScript&&thisScript.src?thisScript.src:document.baseURI);
function logo(){const plate=document.createElement('span');plate.className='ml-brand-plate';const img=document.createElement('img');img.src=new URL('ml-logo-official.webp',assetRoot).href;img.alt='Mercado Libre';img.width=134;img.height=34;img.decoding='async';plate.append(img);return plate;}
function install(){
 const kicker=document.querySelector('.hero-kicker');
 if(kicker&&!kicker.classList.contains('vendra-context-kicker')){kicker.classList.remove('ml-context-kicker');kicker.classList.add('vendra-context-kicker');const signal=document.createElement('span');signal.className='vendra-hero-signal';signal.setAttribute('aria-hidden','true');for(const role of ['echo first','echo second','original']){const mark=document.createElement('img');mark.className='vendra-signal-'+role.replace(' ',' vendra-signal-');mark.src=new URL('vendra-mark.svg',assetRoot).href;mark.alt='';mark.width=44;mark.height=49;signal.append(mark);}const label=document.createElement('span');label.className='vendra-hero-context';const first=document.createElement('span');first.textContent='LA CUENTA DETRÁS DE TUS VENTAS';const market=document.createElement('span');market.className='vendra-market-reference';market.append(document.createTextNode('Para quienes venden en '));const marketLogo=document.createElement('img');marketLogo.src=new URL('ml-icon-official.svg',assetRoot).href;marketLogo.alt='';marketLogo.width=25;marketLogo.height=25;market.append(marketLogo,document.createTextNode('Mercado Libre'));label.append(first,market);kicker.replaceChildren(signal,label);}
 const heading=document.querySelector('.calculator-heading');
 if(heading&&!heading.querySelector('.ml-calculator-context')){const block=document.createElement('div');block.className='ml-calculator-context';const text=document.createElement('span'),strong=document.createElement('strong');strong.textContent='Simulá tu publicación';text.append(strong,document.createTextNode('Con tus costos y cargos'));block.append(logo(),text);const target=heading.lastElementChild;target.append(block);}
 const workspace=document.querySelector('.workspace');
 if(workspace&&!workspace.classList.contains('ml-workspace')){const slot=workspace.querySelector('.workspace-icon');if(slot){const img=document.createElement('img');img.src=new URL('ml-icon-official.svg',assetRoot).href;img.alt='';img.width=32;img.height=32;img.setAttribute('aria-hidden','true');slot.replaceChildren(img);workspace.classList.add('ml-workspace');}}
}
window.installMercadoLibreIdentity=install;
if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',install,{once:true});else install();
})();

