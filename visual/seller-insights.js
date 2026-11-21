/* Vendra · local refresh. Contract inspected: ml-ganancias v132, 2026-11-20.
   Pure analysis + opt-in renderers. No requests, token access, persistence or invented data. */
(function (root) {
  'use strict';
  const BILLING_SOURCE = 'https://developers.mercadolibre.com.ar/es_ar/manejo-de-pagos/buenas-practicas-para-el-consumo-de-las-apis-de-reportes-de-facturacion';
  const PRODUCT_NOTE = 'Resultado parcial: el servicio resta comisión de venta, costo cargado e IIBB. No descuenta envíos, Full, publicidad ni cupones del vendedor. No es ganancia neta. Si faltan costos, también puede estar sobreestimado.';
  const SAMPLE_NOTE = 'Productos destacados · hasta 20 grupos por facturación, agrupados por similitud de título. No es tu catálogo completo ni permite conocer stock o rentabilidad neta por publicación.';
  const money = new Intl.NumberFormat('es-AR', { style: 'currency', currency: 'ARS', maximumFractionDigits: 2 });
  const count = new Intl.NumberFormat('es-AR', { maximumFractionDigits: 0 });
  const finite = v => typeof v === 'number' && Number.isFinite(v) && Math.abs(v) < Number.MAX_SAFE_INTEGER / 100;
  const quantity = v => finite(v) && Number.isInteger(v) && v >= 0;
  const cash = v => finite(v) ? money.format(v) : 'Sin dato';
  const num = v => quantity(v) ? count.format(v) : 'Sin dato';
  const text = v => typeof v === 'string' ? v : '';
  const esc = v => String(v ?? '').replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
  const fold = v => text(v).normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLocaleLowerCase('es');
  const cents = v => Math.round(v * 100);
  function inspect(data) {
    const d = data && typeof data === 'object' && !Array.isArray(data) ? data : {};
    const alerts = [];
    const add = (id, title, detail, action, label, tone = 'attention') => alerts.push({ id, title, detail, action, label, tone });
    const hasData = Object.keys(d).length > 0 && !d.error && d.connected !== false;
    if (!hasData) return { hasData: false, alerts: [], equation: null, seriesCheck: null, products: [], productState: 'unavailable', invalidProducts: 0, period: '', negativePoints: [] };
    if (d.sync?.periodReady === false) add('sync', 'El período todavía se está completando', 'La sincronización aún no cubre todo el rango. Esperá a que termine antes de sacar conclusiones.', 'refresh', 'Actualizar datos');
    if (quantity(d.sinCostoItems) && d.sinCostoItems > 0) add('costs', `${num(d.sinCostoItems)} ${d.sinCostoItems === 1 ? 'unidad' : 'unidades'} con costo pendiente`, 'Esas unidades entran sin costo de producto. El resultado puede estar sobreestimado; completá los costos y volvé a revisar.', 'costs', 'Cargar costos');
    else if (d.hayCostos === false && quantity(d.unidades) && d.unidades > 0) add('costs', 'Faltan costos de producto', 'El servicio no informa costos cargados para este período. No tomes el resultado como una ganancia completa.', 'costs', 'Cargar costos');
    if (d.billingComplete === false) add('billing', 'Hay facturación pendiente de cargar', 'Los cargos pueden estar incompletos. Volvé a consultar el período para revisar el resultado actualizado.', 'refresh', 'Actualizar datos');
    if (d.adsLocked === true) add('ads', 'Marketing excluido del resultado', 'El plan actual excluye publicidad y cupones del vendedor del cálculo. Un cero aquí no confirma que no hubo gasto.', 'plans', 'Ver planes');
    if (d.adsLocked !== true && finite(d.publicidad) && d.publicidad > 0 && d.publicidadDiariaReal === false) add('ads-daily', 'Falta el detalle diario de publicidad facturada', 'El total del período y el gráfico pueden diferir. Revisá Marketing; no repartimos el gasto entre días sin evidencia.', 'marketing', 'Revisar marketing');
    const points = Array.isArray(d.series) ? d.series.filter(p => p && typeof p === 'object') : [];
    const validPoints = points.filter(p => finite(p.ganancia));
    const negativePoints = validPoints.filter(p => p.ganancia < 0).map(p => ({ label: text(p.label) || 'Sin fecha', result: p.ganancia }));
    const singular = negativePoints.length === 1;
    const unit = d.granularity === 'day' ? (singular ? 'día' : 'días') : d.granularity === 'month' ? (singular ? 'mes' : 'meses') : (singular ? 'intervalo' : 'intervalos');
    if (negativePoints.length) add('negative', `${num(negativePoints.length)} ${unit} con resultado negativo`, 'Revisá ventas y cargos en esos intervalos. Es el resultado informado por la serie, sujeto a los costos y gastos disponibles.', 'series', 'Ver intervalos');
    const fields = ['facturacion', 'cargosML', 'fullCosto', 'publicidad', 'cuponesMarketing', 'costoBruto', 'impuestos', 'gananciaNeta'];
    let equation = null;
    if (fields.every(k => finite(d[k]))) {
      const expectedCents = cents(d.facturacion) - ['cargosML', 'fullCosto', 'publicidad', 'cuponesMarketing', 'costoBruto', 'impuestos'].reduce((s, k) => s + cents(d[k]), 0);
      if (Number.isSafeInteger(expectedCents)) {
        const deltaCents = cents(d.gananciaNeta) - expectedCents;
        equation = { expected: expectedCents / 100, reported: d.gananciaNeta, delta: deltaCents / 100, mismatch: Math.abs(deltaCents) > 1 };
        if (equation.mismatch) add('equation', 'El desglose no cierra con el resultado', `La diferencia interna es ${cash(equation.delta)} (resultado informado menos desglose). Revisá el período antes de usarlo para decidir.`, 'reconciliation', 'Revisar desglose');
      }
    }
    let seriesCheck = null;
    if (points.length > 0 && Array.isArray(d.series) && points.length === d.series.length && validPoints.length === points.length && finite(d.gananciaNeta)) {
      const sumCents = validPoints.reduce((s, p) => s + cents(p.ganancia), 0);
      const toleranceCents = Math.ceil(points.length * 0.5) + 2;
      if (Number.isSafeInteger(sumCents)) {
        const deltaCents = sumCents - cents(d.gananciaNeta);
        seriesCheck = { sum: sumCents / 100, delta: deltaCents / 100, tolerance: toleranceCents / 100, mismatch: Math.abs(deltaCents) > toleranceCents };
        if (seriesCheck.mismatch) add('series-gap', 'La evolución y el total no coinciden', `La suma de los intervalos difiere ${cash(seriesCheck.delta)} del resultado del período. Puede faltar una asignación por fecha; no lo interpretamos como un cargo extra.`, 'reconciliation', 'Comparar cifras');
      }
    }
    const unknown = [];
    if (typeof d.billingComplete !== 'boolean') unknown.push('estado de facturación');
    if (!quantity(d.sinCostoItems)) unknown.push('unidades sin costo');
    if (typeof d.adsLocked !== 'boolean') unknown.push('inclusión de marketing');
    if (unknown.length) add('unknown', 'Hay controles sin información suficiente', `No recibimos: ${unknown.join(', ')}. La ausencia de un dato no se toma como cero ni como una verificación aprobada.`, 'refresh', 'Volver a consultar', 'info');
    if (d.periodOpen === true) add('open', 'El período sigue en curso', 'Los importes pueden cambiar con nuevas ventas, cargos y bonificaciones. Compará períodos equivalentes.', null, null, 'info');
    const productState = d.productsLocked === true ? 'locked' : !Array.isArray(d.topProducts) ? 'unavailable' : d.topProducts.length === 0 ? 'empty' : 'available';
    let invalidProducts = 0;
    const products = productState === 'available' ? d.topProducts.filter(p => {
      const valid = p && typeof p === 'object' && !Array.isArray(p);
      if (!valid) invalidProducts++; return valid;
    }).map((p, index) => ({
      index, title: text(p.titulo) || 'Producto sin título', units: quantity(p.unidades) ? p.unidades : null,
      revenue: finite(p.facturacion) ? p.facturacion : null, partialResult: finite(p.ganancia) ? p.ganancia : null,
      variants: Array.isArray(p.variantes) ? p.variantes.filter(v => v && typeof v === 'object').map(v => ({ label: text(v.label) || 'Sin descripción', units: quantity(v.unidades) ? v.unidades : null, revenue: finite(v.facturacion) ? v.facturacion : null })) : []
    })) : [];
    return { hasData, alerts, equation, seriesCheck, products, productState, invalidProducts, period: text(d.periodLabel) || [text(d.from), text(d.to)].filter(Boolean).join(' — '), negativePoints };
  }
  function filterProducts(products, query = '', filter = 'all', sort = 'revenue') {
    const q = fold(query).trim();
    const list = products.filter(p => (!q || fold([p.title, ...p.variants.map(v => v.label)].join(' ')).includes(q)) && (filter === 'negative' ? p.partialResult !== null && p.partialResult < 0 : filter === 'missing' ? [p.units, p.revenue, p.partialResult].includes(null) : true));
    const key = sort === 'units' ? 'units' : sort === 'partial' ? 'partialResult' : 'revenue';
    return list.sort((a, b) => {
      if (sort === 'title') return a.title.localeCompare(b.title, 'es');
      if (a[key] === null) return b[key] === null ? a.index - b.index : 1;
      if (b[key] === null) return -1;
      return (sort === 'partial' ? a[key] - b[key] : b[key] - a[key]) || a.index - b.index;
    });
  }
  const action = (key, label) => key ? `<button type="button" class="si-action" data-si-action="${esc(key)}">${esc(label)} <span aria-hidden="true">↗</span></button>` : '';
  function summaryHTML(model) {
    if (!model.hasData) return '<section class="si-panel"><h2>Qué revisar</h2><p class="si-muted">Todavía no hay datos del período para preparar esta revisión.</p></section>';
    const issues = model.alerts.filter(a => a.tone === 'attention').length;
    const cards = model.alerts.map(a => `<li class="si-check si-${a.tone}"><div class="si-check-marker" aria-hidden="true">${a.tone === 'attention' ? '!' : 'i'}</div><div><h3>${esc(a.title)}</h3><p>${esc(a.detail)}</p>${action(a.action, a.label)}</div></li>`).join('');
    const detail = model.negativePoints.length ? `<details class="si-disclosure" data-si-detail="series"><summary>Intervalos con resultado negativo</summary><ul class="si-intervals">${model.negativePoints.map(p => `<li><span>${esc(p.label)}</span><strong class="si-negative">${esc(cash(p.result))}</strong></li>`).join('')}</ul></details>` : '';
    const eq = model.equation;
    const recon = `<details class="si-disclosure" data-si-detail="reconciliation"><summary>Cómo se revisan las cifras</summary><p>Comprobamos la resta interna: ventas − cargos ML − Full − publicidad − cupones del vendedor − costo de producto − impuestos.</p>${eq ? `<dl class="si-facts"><div><dt>Resultado del desglose</dt><dd>${esc(cash(eq.expected))}</dd></div><div><dt>Resultado informado</dt><dd>${esc(cash(eq.reported))}</dd></div><div><dt>Diferencia interna</dt><dd>${esc(cash(eq.delta))}</dd></div></dl>` : '<p>Faltan campos numéricos para comprobar esa resta. No completamos los faltantes con cero.</p>'}<p>Esto no confirma una conciliación con la factura de Mercado Libre. Para eso hay que contrastar cargos del mismo tipo y período de facturación.</p><a href="${BILLING_SOURCE}" target="_blank" rel="noopener noreferrer">Criterio oficial de conciliación de Mercado Libre ↗</a></details>`;
    return `<section class="si-panel" aria-label="Qué revisar"><div class="si-heading"><div><span class="si-eyebrow">Tu próximo paso</span><h2>Qué revisar</h2></div><span class="si-badge">${issues ? `${issues} ${issues === 1 ? 'punto para revisar' : 'puntos para revisar'}` : 'Controles del período'}</span></div><p class="si-muted">${esc(model.period || 'Período recibido')} · lectura de los datos disponibles en Vendra.</p>${cards ? `<ul class="si-checks">${cards}</ul>` : '<p class="si-neutral">No surgieron alertas de estos controles. Esto no certifica que estén incluidos todos los costos de tu negocio.</p>'}${detail}${recon}</section>`;
  }
  let sequence = 0;
  const productViews = new WeakMap();
  const resolve = target => typeof target === 'string' ? root.document?.querySelector(target) : target;
  function renderSellerInsights(data, target = '#seller-insights') {
    const model = inspect(data), el = resolve(target);
    if (el) el.innerHTML = summaryHTML(model);
    return model;
  }
  function productRows(products) {
    return products.map(p => `<li class="si-product"><div class="si-product-main"><span class="si-rank" aria-label="Posición en la muestra original">${p.index + 1}</span><h3>${esc(p.title)}</h3></div><dl class="si-product-values"><div><dt>Unidades vendidas</dt><dd>${esc(num(p.units))}</dd></div><div><dt>Facturación</dt><dd>${esc(cash(p.revenue))}</dd></div><div><dt>Resultado parcial</dt><dd class="${p.partialResult !== null && p.partialResult < 0 ? 'si-negative' : ''}">${esc(cash(p.partialResult))}</dd></div></dl><details class="si-product-detail"><summary>Ver desglose y alcance</summary><p>${PRODUCT_NOTE}</p>${p.variants.length ? `<h4>Variantes agrupadas por título</h4><ul class="si-variants">${p.variants.map(v => `<li><span>${esc(v.label)}</span><span>${esc(num(v.units))} u.</span><strong>${esc(cash(v.revenue))}</strong></li>`).join('')}</ul><p>La agrupación por texto no identifica un SKU ni garantiza que las variantes correspondan a una única publicación.</p>` : '<p>El servicio no envió un desglose de variantes para este grupo.</p>'}</details></li>`).join('');
  }
  function updateProducts(el) {
    const state = productViews.get(el); if (!state) return;
    const q = el.querySelector('[data-si-query]')?.value || '';
    const filter = el.querySelector('[data-si-filter]')?.value || 'all';
    const sort = el.querySelector('[data-si-sort]')?.value || 'revenue';
    const list = filterProducts(state.model.products, q, filter, sort);
    el.querySelector('[data-si-results]').innerHTML = list.length ? `<ol class="si-product-list">${productRows(list)}</ol>` : '<p class="si-empty">No hay coincidencias en esta muestra. Probá otro nombre o quitá los filtros.</p>';
    el.querySelector('[data-si-count]').textContent = `${list.length} de ${state.model.products.length} grupos de la muestra`;
  }
  function renderSellerProducts(data, target = '#seller-products') {
    const model = inspect(data), el = resolve(target); if (!el) return model;
    const id = `si-products-${++sequence}`;
    let body = '';
    if (!model.hasData || model.productState === 'unavailable') body = '<p class="si-empty">No recibimos el ranking de productos para este período. No se muestra una lista de ejemplo.</p>';
    else if (model.productState === 'locked') body = `<div class="si-empty"><h3>El detalle de productos no está incluido en tu plan</h3><p>No recibimos la muestra para esta cuenta. Podés consultar qué incluye cada plan.</p>${action('plans', 'Ver planes')}</div>`;
    else if (model.productState === 'empty') body = '<p class="si-empty">La respuesta no contiene productos en esta muestra. Esto no confirma que tu catálogo esté vacío.</p>';
    else body = `<div class="si-tools"><div class="si-search"><label for="${id}-query">Buscar en la muestra</label><input id="${id}-query" type="search" data-si-query placeholder="Nombre o variante" autocomplete="off"></div><div><label for="${id}-filter">Mostrar</label><select id="${id}-filter" data-si-filter><option value="all">Todos</option><option value="negative">Resultado parcial negativo</option><option value="missing">Con datos faltantes</option></select></div><div><label for="${id}-sort">Ordenar por</label><select id="${id}-sort" data-si-sort><option value="revenue">Mayor facturación</option><option value="units">Más unidades</option><option value="partial">Menor resultado parcial</option><option value="title">Nombre</option></select></div></div><p class="si-muted" data-si-count role="status" aria-live="polite"></p><div data-si-results></div>`;
    el.innerHTML = `<section class="si-panel si-products" aria-label="Productos"><div class="si-heading"><div><span class="si-eyebrow">Entendé qué se vende</span><h2>Productos</h2></div><span class="si-badge">Muestra del período</span></div><p class="si-muted">${esc(model.period || 'Período recibido')}</p><p class="si-scope">${SAMPLE_NOTE}</p><details class="si-disclosure"><summary>Qué significa el resultado parcial</summary><p>${PRODUCT_NOTE}</p><p>El servicio puede distribuir cupones de Mercado Libre entre grupos según su facturación diaria. Los importes por grupo están redondeados al peso. El dato no permite identificar qué producto tiene un costo faltante.</p></details>${model.invalidProducts ? '<p class="si-muted">Algunos registros no se pudieron interpretar y se omitieron de la muestra.</p>' : ''}${body}</section>`;
    if (!productViews.has(el)) {
      el.addEventListener('input', e => { if (e.target.matches('[data-si-query]')) updateProducts(el); });
      el.addEventListener('change', e => { if (e.target.matches('[data-si-filter], [data-si-sort]')) updateProducts(el); });
    }
    productViews.set(el, { model });
    if (model.productState === 'available') updateProducts(el);
    return model;
  }
  function updateLegacyProductLabels(target = '#panel-content') {
    const el = resolve(target); if (!el) return 0; let updated = 0;
    el.querySelectorAll('.tcard').forEach(card => {
      if (card.querySelector('h3')?.textContent.trim() !== 'Los que más te venden') return;
      const th = card.querySelector('thead th:last-child');
      if (th && ['Ganancia', 'Ganancia neta'].includes(th.textContent.trim())) { th.textContent = 'Resultado parcial'; updated++; }
      if (!card.querySelector('[data-si-legacy-note]')) {
        const note = root.document.createElement('p'); note.className = 'si-legacy-note'; note.dataset.siLegacyNote = '';
        note.textContent = `${SAMPLE_NOTE} ${PRODUCT_NOTE}`;
        card.querySelector('.th')?.after(note);
      }
    });
    return updated;
  }
  let installed = false, onAction = null;
  function installSellerInsights(options = {}) {
    if (typeof options.onAction === 'function') onAction = options.onAction;
    if (!installed && root.document) {
      installed = true;
      root.document.addEventListener('click', e => {
        const button = e.target.closest('[data-si-action]'); if (!button) return;
        const key = button.dataset.siAction;
        const local = button.closest('.si-panel')?.querySelector(`[data-si-detail="${key === 'series' ? 'series' : 'reconciliation'}"]`);
        if (['series', 'reconciliation'].includes(key) && local) { local.open = true; local.querySelector('summary')?.focus(); return; }
        if (onAction) onAction(key, button);
        else root.document.dispatchEvent(new CustomEvent('vendra:insight-action', { detail: { action: key } }));
      });
    }
    return api;
  }
  const api = { inspect, filterProducts, summaryHTML, renderSellerInsights, renderSellerProducts, updateLegacyProductLabels, installSellerInsights, PRODUCT_NOTE, SAMPLE_NOTE };
  root.SellerInsights = api;
  root.renderSellerInsights = renderSellerInsights;
  root.renderSellerProducts = renderSellerProducts;
  root.installSellerInsights = installSellerInsights;
  if (typeof module !== 'undefined' && module.exports) module.exports = api;
})(typeof window !== 'undefined' ? window : globalThis);
