/* Progressive presentation only: no network calls, accounts or billing writes. */
(()=>{'use strict';
const root=document.documentElement,key='vendra.theme',modes=['light','dark','system'],media=matchMedia('(prefers-color-scheme: dark)');
let preference='light';try{const value=localStorage.getItem(key);if(modes.includes(value))preference=value;}catch(_){}
function apply(){root.dataset.vendraTheme=preference==='system'?(media.matches?'dark':'light'):preference;root.dataset.vendraThemePreference=preference;document.querySelectorAll('[data-vendra-theme-select]').forEach(el=>el.value=preference);window.dispatchEvent(new CustomEvent('vendra:theme-changed',{detail:{preference,theme:root.dataset.vendraTheme}}));}
function set(value){if(!modes.includes(value))return;preference=value;try{localStorage.setItem(key,value);}catch(_){}apply();}
apply();media.addEventListener('change',()=>{if(preference==='system')apply();});window.addEventListener('storage',e=>{if(e.key===key){preference=modes.includes(e.newValue)?e.newValue:'light';apply();}});
function control(){const label=document.createElement('label');label.className='vendra-theme-control';label.innerHTML='<svg viewBox="0 0 24 24" aria-hidden="true"><circle cx="12" cy="12" r="4"/><path d="M12 2v2m0 16v2M2 12h2m16 0h2M5 5l1.5 1.5m11 11L19 19M5 19l1.5-1.5m11-11L19 5"/></svg><span>Apariencia</span><select data-vendra-theme-select aria-label="Apariencia de Vendra"><option value="light">Claro</option><option value="dark">Oscuro</option><option value="system">Sistema</option></select>';label.querySelector('select').value=preference;label.querySelector('select').addEventListener('change',e=>set(e.target.value));return label;}
function mount(){
const header=document.querySelector('.header-account')||document.querySelector('.nav-actions');if(header&&!document.body.classList.contains('approved-home'))header.prepend(control());
const top=document.querySelector('.topbar');if(top){const choice=control(),mobile=matchMedia('(max-width:860px)');const place=()=>{const row=top.querySelector('.tb-headrow>div:last-child');(mobile.matches&&row?row:top).append(choice);};place();mobile.addEventListener('change',place);}
document.querySelectorAll('.fullcenter').forEach(view=>view.prepend(control()));
}
if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',mount,{once:true});else mount();window.VendraTheme={set,get:()=>({preference,theme:root.dataset.vendraTheme})};})();