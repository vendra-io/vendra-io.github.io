(function(){
'use strict';
const country=document.querySelector('.pais-sel'),countryHome=document.querySelector('.header-account'),countryNav=document.querySelector('#site-nav'),countryMedia=matchMedia('(max-width:760px)');if(country&&countryHome&&countryNav){const placeCountry=()=>{(countryMedia.matches?countryNav:countryHome).append(country);};placeCountry();countryMedia.addEventListener('change',placeCountry);}
const menu=document.getElementById('menu-toggle'),nav=document.getElementById('site-nav'),mobile=window.matchMedia('(max-width:760px)'),reduced=window.matchMedia('(prefers-reduced-motion: reduce)');
function closeMenu(restoreFocus){menu.setAttribute('aria-expanded','false');menu.setAttribute('aria-label','Abrir menú');nav.classList.remove('is-open');if(restoreFocus)menu.focus();}
menu.addEventListener('click',()=>{const open=menu.getAttribute('aria-expanded')!=='true';menu.setAttribute('aria-expanded',String(open));menu.setAttribute('aria-label',open?'Cerrar menú':'Abrir menú');nav.classList.toggle('is-open',open);if(open)nav.querySelector('a').focus();});
document.addEventListener('keydown',e=>{if(e.key==='Escape'&&menu.getAttribute('aria-expanded')==='true'){closeMenu(true);}});
document.addEventListener('click',e=>{if(menu.getAttribute('aria-expanded')==='true'&&!e.target.closest('.header-inner'))closeMenu(false);});
nav.querySelectorAll('a').forEach(a=>a.addEventListener('click',()=>{closeMenu(false);const target=document.getElementById(a.hash.slice(1));if(target)target.focus({preventScroll:true});}));
mobile.addEventListener('change',()=>closeMenu(false));
document.getElementById('try-hero-example').addEventListener('click',()=>{document.getElementById('precio').value='30000';document.getElementById('costo').value='18000';document.getElementById('precio').dispatchEvent(new Event('input',{bubbles:true}));const target=document.getElementById('calculadora');target.scrollIntoView({behavior:reduced.matches?'instant':'smooth',block:'start'});target.focus({preventScroll:true});});
document.getElementById('year').textContent=new Date().getFullYear();
if('IntersectionObserver' in window&&!reduced.matches){document.body.classList.add('js-motion');const observer=new IntersectionObserver(entries=>{entries.forEach(entry=>{if(entry.isIntersecting){entry.target.classList.add('is-visible');observer.unobserve(entry.target);}});},{threshold:.08,rootMargin:'0px 0px -20px 0px'});document.querySelectorAll('.reveal').forEach(el=>observer.observe(el));reduced.addEventListener('change',e=>{if(e.matches){observer.disconnect();document.body.classList.remove('js-motion');}});}
})();
