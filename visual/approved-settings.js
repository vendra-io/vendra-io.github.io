/* Approved account and product-cost composition. Existing controls are moved,
   never cloned: IDs, listeners, input values and live save-state nodes survive. */
(function () {
  'use strict';
  const make = (tag, cls, text) => {
    const node = document.createElement(tag);
    if (cls) node.className = cls;
    if (text !== undefined) node.textContent = text;
    return node;
  };
  const heading = (title, description) => {
    const head = make('header', 'approved-settings-heading');
    const copy = make('div');
    copy.append(make('h2', '', title));
    if (description) copy.append(make('p', '', description));
    head.append(copy);
    return head;
  };
  function field(control, title) {
    const label = make('label', 'approved-cost-filter');
    label.htmlFor = control.id;
    label.append(make('span', '', title), control);
    return label;
  }
  function moveIds(host, target, ids) {
    ids.forEach(id => { const node = host.querySelector('#' + id); if (node) target.append(node); });
  }
  function adaptCosts(host) {
    if (!host || !host.querySelector('#cq') || !host.querySelector('#costos-body')) return;
    host.classList.add('approved-costs');
    const tools = host.querySelector('.costos-tools');
    if (tools) {
      const intro = heading('Tu base para calcular mejor.', 'Revisá tus publicaciones y mantené al día el costo de cada producto o variante.');
      const status = host.querySelector('#csv');
      if (status) { status.setAttribute('role', 'status'); status.setAttribute('aria-live', 'polite'); intro.append(status); }
      const workspace = make('section', 'approved-cost-workspace');
      workspace.setAttribute('aria-label', 'Buscar y administrar costos');
      const filters = make('div', 'approved-cost-filters');
      [['cq', 'Buscar producto o SKU'], ['c-sort', 'Organizar publicaciones'], ['c-estado', 'Estado de publicación']].forEach(([id, title]) => {
        const control = host.querySelector('#' + id);
        if (control) filters.append(field(control, title));
      });
      const selection = make('div', 'approved-cost-selection');
      selection.setAttribute('aria-label', 'Filtrar por costo');
      moveIds(host, selection, ['cf-all', 'cf-no']);
      filters.append(selection);
      const files = make('div', 'approved-cost-files');
      const fileCopy = make('div', 'approved-cost-file-copy');
      fileCopy.append(make('h3', '', 'Actualizá tus costos en lote'), make('p', '', 'Descargá la plantilla, completala y subí tu Excel. También podés exportar el inventario.'));
      const fileActions = make('div', 'approved-cost-file-actions');
      moveIds(host, fileActions, ['c-tpl', 'c-stock']);
      const upload = host.querySelector('#c-file');
      if (upload) fileActions.append(upload.closest('label') || upload);
      moveIds(host, fileActions, ['c-core']);
      // Preserve future actions not explicitly known to this composition.
      [...tools.childNodes].forEach(node => { if (node.nodeType !== 3 || node.textContent.trim()) fileActions.append(node); });
      files.append(fileCopy, fileActions);
      workspace.append(filters, files);
      tools.replaceWith(intro, workspace);
      const iva = host.querySelector('#ivabar');
      if (iva) {
        const tax = make('section', 'approved-cost-tax');
        tax.append(heading('Cómo cargás tus costos', 'Esta configuración define cómo interpreta Vendra los importes que ingresás.'));
        iva.replaceWith(tax); tax.append(iva);
      }
      const catalog = make('section', 'approved-cost-catalog');
      catalog.setAttribute('aria-label', 'Costos por producto y variante');
      const catalogHead = make('div', 'approved-cost-catalog-heading');
      catalogHead.append(make('h3', '', 'Productos y variantes'), make('p', '', 'Los cambios se guardan automáticamente. Revisá el estado de guardado antes de salir.'));
      const body = host.querySelector('#costos-body');
      body.replaceWith(catalog); catalog.append(catalogHead, body);
    }
    host.querySelectorAll('.ccath:not([data-approved-category])').forEach(header => {
      header.dataset.approvedCategory = 'true';
      header.setAttribute('role', 'button'); header.tabIndex = 0;
      const expanded = () => header.setAttribute('aria-expanded', String(header.closest('.ccat').classList.contains('open')));
      expanded(); header.addEventListener('click', expanded);
      header.addEventListener('keydown', event => { if (event.key === 'Enter' || event.key === ' ') { event.preventDefault(); header.click(); } });
    });
    host.querySelectorAll('.crow:not([data-approved-row]), .vrw:not([data-approved-row])').forEach(row => {
      row.dataset.approvedRow = 'true';
      const product = make('div', 'approved-cost-product');
      const identity = row.querySelector(':scope > .pi, :scope > .vcb');
      const thumb = row.querySelector(':scope > .thumb');
      if (thumb) product.append(thumb);
      if (identity) product.append(identity);
      const price = row.querySelector(':scope > .cpr');
      const amount = row.querySelector(':scope > .cost-in');
      const margin = row.querySelector(':scope > .mtag');
      const priceCell = make('div', 'approved-cost-price');
      priceCell.append(make('span', 'approved-cost-cell-label', 'Precio de venta'));
      if (price) priceCell.append(price);
      const costCell = make('div', 'approved-cost-entry');
      if (amount) {
        const title = identity?.querySelector('.pt, b')?.textContent || identity?.textContent || 'Producto';
        amount.setAttribute('aria-label', 'Costo de ' + title.trim());
        costCell.append(make('span', 'approved-cost-cell-label', 'Tu costo'), amount);
        // cOnCost and cAplicarTodas look for .mtag inside input.parentElement.
        if (margin) costCell.append(margin);
      } else {
        costCell.append(make('span', 'approved-cost-variant-hint', 'Cargá el costo por variante'));
      }
      // Only the renderer's empty alignment spacers are removed.
      [...row.children].forEach(node => { if (!node.textContent.trim() && node.tagName === 'DIV' && !node.children.length) node.remove(); });
      row.prepend(product); row.append(priceCell, costCell);
    });
  }
  function adaptAccount(host) {
    const original = host?.querySelector('.acc-wrap');
    if (!original || original.dataset.approvedSettings) return;
    original.dataset.approvedSettings = 'true';
    host.classList.add('approved-account');
    const top = make('div', 'approved-account-top');
    top.append(heading('Tu cuenta, en orden.', 'Administrá tu perfil, conexión, situación fiscal y suscripción.'));
    const grid = make('div', 'approved-settings-grid');
    const footer = make('footer', 'approved-account-footer');
    const cards = [...original.querySelectorAll(':scope > .acc-card')];
    const sections = [];
    cards.forEach(card => {
      const oldTitle = card.querySelector('h3');
      const title = oldTitle?.textContent.trim() || 'Configuración';
      const subtitle = card.querySelector(':scope > .hint');
      const section = make('section', 'approved-settings-card');
      const head = heading(title);
      if (subtitle) head.firstElementChild.append(subtitle);
      oldTitle?.remove();
      const body = make('div', 'approved-settings-body');
      body.append(...card.childNodes);
      section.append(head, body);
      section.dataset.section = title === 'Tu plan' ? 'plan' : title === 'Seguridad' ? 'security' : 'settings';
      sections.push(section);
      card.remove();
    });
    [...original.childNodes].forEach(node => {
      if (node.nodeType === 3 && !node.textContent.trim()) return;
      if (node.nodeType === 1 && node.querySelector('[onclick*="cerrarCuenta"]')) top.append(node);
      else footer.append(node);
    });
    // The approved four main cards stay paired; security remains fully available below.
    sections.filter(section => section.dataset.section !== 'security').forEach(section => grid.append(section));
    sections.filter(section => section.dataset.section === 'security').forEach(section => grid.append(section));
    original.replaceChildren(top, grid, footer);
  }
  function observe(id, adapt) {
    const host = document.getElementById(id);
    if (!host) return;
    const observer = new MutationObserver(run);
    function run() {
      observer.disconnect();
      try { adapt(host); } finally { observer.observe(host, {childList: true, subtree: true}); }
    }
    run();
  }
  function install() {
    observe('costos-content', adaptCosts);
    observe('cuenta-content', adaptAccount);
  }
  window.VendraApprovedSettings = {adaptCosts, adaptAccount};
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', install, {once: true});
  else install();
})();
