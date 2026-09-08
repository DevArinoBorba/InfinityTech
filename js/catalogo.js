/**
 * INFINITYTECH — CATÁLOGO ONLINE DE LOJISTAS
 * Lê os produtos de uma planilha Google Sheets publicada em CSV, renderiza
 * o catálogo com busca/filtro por categoria e gerencia um carrinho (salvo em
 * localStorage) cujo checkout é finalizado com uma mensagem pronta no WhatsApp.
 */

(function () {
  'use strict';

  // ==========================================================================
  // CONFIGURAÇÃO — troque pelo link da sua planilha publicada em CSV
  // ==========================================================================
  // Como gerar: no Google Sheets, Arquivo > Compartilhar > Publicar na web >
  // selecione a aba de produtos > formato "Valores separados por vírgula (.csv)"
  // > Publicar. Cole aqui a URL gerada (formato: .../pub?output=csv).
  //
  // A planilha deve ter uma linha de cabeçalho com as colunas:
  // Nome | Categoria | Preço | Foto
  const CSV_URL = 'https://docs.google.com/spreadsheets/d/e/2PACX-1vTkXiJv2PqMEL5L9FXPt16uuXsoLmdAY9A3PebIrGZP9C7uANzCDvAdw-7dEjRULYS5zAtV8EzS2EOa/pub?gid=0&single=true&output=csv';

  const CART_STORAGE_KEY = 'infinitytech-cart';
  const WHATSAPP_NUMBER = '5567992683435';
  const PAGE_SIZE = 16;

  // Resolve o caminho da pasta img/ a partir da URL absoluta deste próprio
  // script — funciona tanto em catalogo.html quanto no espelho catalogo/index.html
  // sem precisar de configuração separada por página.
  const SCRIPT_SRC = document.currentScript ? document.currentScript.src : '';
  const IMG_BASE = SCRIPT_SRC.replace(/js\/catalogo\.js(\?.*)?$/, 'img/');
  const LOGO_FALLBACK = IMG_BASE + 'logo.png';

  const state = {
    products: [],
    productsById: new Map(),
    filteredProducts: [],
    activeCategory: 'todos',
    searchTerm: '',
    visibleCount: PAGE_SIZE,
    cart: loadCart(),
  };

  // ==========================================================================
  // CSV: fetch + parser (suporta campos entre aspas com vírgulas internas)
  // ==========================================================================
  async function fetchCSV(url) {
    const response = await fetch(url, { cache: 'no-store' });
    if (!response.ok) {
      throw new Error('csv_fetch_failed');
    }
    return response.text();
  }

  function parseCSV(text) {
    const rows = [];
    let row = [];
    let field = '';
    let inQuotes = false;

    for (let i = 0; i < text.length; i++) {
      const char = text[i];
      const next = text[i + 1];

      if (inQuotes) {
        if (char === '"' && next === '"') {
          field += '"';
          i++;
        } else if (char === '"') {
          inQuotes = false;
        } else {
          field += char;
        }
      } else if (char === '"') {
        inQuotes = true;
      } else if (char === ',') {
        row.push(field);
        field = '';
      } else if (char === '\n' || char === '\r') {
        if (char === '\r' && next === '\n') i++;
        row.push(field);
        rows.push(row);
        row = [];
        field = '';
      } else {
        field += char;
      }
    }
    if (field.length > 0 || row.length > 0) {
      row.push(field);
      rows.push(row);
    }

    return rows.filter((r) => r.some((cell) => cell.trim() !== ''));
  }

  function normalizeHeader(header) {
    return header
      .toLowerCase()
      .normalize('NFD')
      .replace(/[̀-ͯ]/g, '')
      .trim();
  }

  function parsePrice(raw) {
    if (!raw) return 0;
    let value = String(raw).replace(/[^\d.,]/g, '').trim();
    if (!value) return 0;

    const hasComma = value.includes(',');
    const hasDot = value.includes('.');

    if (hasComma && hasDot) {
      // Formato BR: 1.234,56 -> ponto é separador de milhar
      value = value.replace(/\./g, '').replace(',', '.');
    } else if (hasComma) {
      value = value.replace(',', '.');
    }

    const parsed = parseFloat(value);
    return Number.isFinite(parsed) ? parsed : 0;
  }

  function formatPrice(value) {
    return value.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });
  }

  function rowsToProducts(rows) {
    if (rows.length < 2) return [];

    const headers = rows[0].map(normalizeHeader);
    const idxNome = headers.findIndex((h) => h.includes('nome') || h.includes('produto'));
    const idxCategoria = headers.findIndex((h) => h.includes('categoria'));
    const idxPreco = headers.findIndex((h) => h.includes('preco') || h.includes('valor'));
    const idxFoto = headers.findIndex((h) => h.includes('foto') || h.includes('imagem') || h.includes('url'));

    if (idxNome === -1 || idxPreco === -1) {
      throw new Error('csv_missing_columns');
    }

    return rows
      .slice(1)
      .map((cells, i) => {
        const nome = (cells[idxNome] || '').trim();
        if (!nome) return null;
        return {
          id: `${nome}-${i}`.toLowerCase().replace(/\s+/g, '-'),
          nome,
          categoria: idxCategoria !== -1 ? (cells[idxCategoria] || '').trim() || 'Geral' : 'Geral',
          preco: parsePrice(cells[idxPreco]),
          foto: idxFoto !== -1 ? (cells[idxFoto] || '').trim() : '',
        };
      })
      .filter(Boolean);
  }

  // ==========================================================================
  // CARRINHO — persistido em localStorage
  // ==========================================================================
  function loadCart() {
    try {
      const raw = localStorage.getItem(CART_STORAGE_KEY);
      return raw ? JSON.parse(raw) : [];
    } catch (e) {
      return [];
    }
  }

  function saveCart() {
    try {
      localStorage.setItem(CART_STORAGE_KEY, JSON.stringify(state.cart));
    } catch (e) {
      /* localStorage indisponível (modo privado etc.) — carrinho segue em memória */
    }
  }

  function addToCart(product, quantity) {
    const existing = state.cart.find((item) => item.id === product.id);
    if (existing) {
      existing.quantidade += quantity;
    } else {
      state.cart.push({
        id: product.id,
        nome: product.nome,
        categoria: product.categoria,
        preco: product.preco,
        foto: product.foto,
        quantidade: quantity,
      });
    }
    saveCart();
    renderCart();
    flashCartButton();
  }

  function updateCartQuantity(id, delta) {
    const item = state.cart.find((i) => i.id === id);
    if (!item) return;
    item.quantidade += delta;
    if (item.quantidade <= 0) {
      state.cart = state.cart.filter((i) => i.id !== id);
    }
    saveCart();
    renderCart();
  }

  function removeFromCart(id) {
    state.cart = state.cart.filter((i) => i.id !== id);
    saveCart();
    renderCart();
  }

  function clearCart() {
    state.cart = [];
    saveCart();
    renderCart();
  }

  function cartTotal() {
    return state.cart.reduce((sum, item) => sum + item.preco * item.quantidade, 0);
  }

  function cartCount() {
    return state.cart.reduce((sum, item) => sum + item.quantidade, 0);
  }

  // ==========================================================================
  // RENDERIZAÇÃO
  // ==========================================================================
  const els = {};

  function cacheEls() {
    els.grid = document.getElementById('catalog-grid');
    els.loadMoreWrap = document.getElementById('catalog-load-more-wrap');
    els.state = document.getElementById('catalog-state');
    els.search = document.getElementById('catalog-search');
    els.categoryFilters = document.getElementById('category-filters');
    els.categoryScrollPrev = document.getElementById('category-scroll-prev');
    els.categoryScrollNext = document.getElementById('category-scroll-next');
    els.cartButton = document.getElementById('cart-button');
    els.cartBadge = document.getElementById('cart-badge');
    els.cartDrawer = document.getElementById('cart-drawer');
    els.cartBackdrop = document.getElementById('cart-backdrop');
    els.cartItems = document.getElementById('cart-items');
    els.cartEmpty = document.getElementById('cart-empty');
    els.cartTotal = document.getElementById('cart-total');
    els.cartCheckout = document.getElementById('cart-checkout');
    els.cartClose = document.getElementById('cart-close');
    els.cartClear = document.getElementById('cart-clear');
  }

  function setState(mode, message) {
    if (!els.state) return;
    if (mode === 'hidden') {
      els.state.hidden = true;
      return;
    }
    els.state.hidden = false;
    els.state.className = `catalog-state catalog-state-${mode}`;
    els.state.innerHTML = message;
  }

  function renderCategoryFilters() {
    const categories = Array.from(new Set(state.products.map((p) => p.categoria))).sort();
    els.categoryFilters.innerHTML = '';

    const allBtn = document.createElement('button');
    allBtn.type = 'button';
    allBtn.className = 'category-pill' + (state.activeCategory === 'todos' ? ' active' : '');
    allBtn.textContent = 'Todos';
    allBtn.addEventListener('click', () => {
      state.activeCategory = 'todos';
      state.visibleCount = PAGE_SIZE;
      renderCategoryFilters();
      renderGrid();
    });
    els.categoryFilters.appendChild(allBtn);

    categories.forEach((cat) => {
      const btn = document.createElement('button');
      btn.type = 'button';
      btn.className = 'category-pill' + (state.activeCategory === cat ? ' active' : '');
      btn.textContent = cat;
      btn.addEventListener('click', () => {
        state.activeCategory = cat;
        state.visibleCount = PAGE_SIZE;
        renderCategoryFilters();
        renderGrid();
      });
      els.categoryFilters.appendChild(btn);
    });

    const activeBtn = els.categoryFilters.querySelector('.category-pill.active');
    if (activeBtn) {
      activeBtn.scrollIntoView({ behavior: 'smooth', inline: 'center', block: 'nearest' });
    }

    updateCategoryScrollButtons();
  }

  function updateCategoryScrollButtons() {
    if (!els.categoryScrollPrev || !els.categoryScrollNext) return;
    const el = els.categoryFilters;
    const maxScroll = el.scrollWidth - el.clientWidth;
    els.categoryScrollPrev.disabled = el.scrollLeft <= 1;
    els.categoryScrollNext.disabled = el.scrollLeft >= maxScroll - 1;
  }

  function initCategoryScroll() {
    if (!els.categoryScrollPrev || !els.categoryScrollNext) return;

    const scrollByAmount = () => Math.round(els.categoryFilters.clientWidth * 0.7);

    els.categoryScrollPrev.addEventListener('click', () => {
      els.categoryFilters.scrollBy({ left: -scrollByAmount(), behavior: 'smooth' });
    });

    els.categoryScrollNext.addEventListener('click', () => {
      els.categoryFilters.scrollBy({ left: scrollByAmount(), behavior: 'smooth' });
    });

    els.categoryFilters.addEventListener('wheel', (e) => {
      if (Math.abs(e.deltaY) > Math.abs(e.deltaX)) {
        e.preventDefault();
        els.categoryFilters.scrollLeft += e.deltaY;
      }
    }, { passive: false });

    els.categoryFilters.addEventListener('scroll', debounce(updateCategoryScrollButtons, 50));
    window.addEventListener('resize', debounce(updateCategoryScrollButtons, 150));
  }

  function getVisibleProducts() {
    const term = state.searchTerm.trim().toLowerCase();
    return state.products.filter((p) => {
      const matchesCategory = state.activeCategory === 'todos' || p.categoria === state.activeCategory;
      const matchesSearch = !term || p.nome.toLowerCase().includes(term);
      return matchesCategory && matchesSearch;
    });
  }

  function productCardHTML(product) {
    const photo = product.foto
      ? `<img src="${escapeAttr(product.foto)}" alt="${escapeAttr(product.nome)}" loading="lazy" decoding="async" onerror="this.onerror=null; this.src='${LOGO_FALLBACK}'; this.closest('.product-photo').classList.add('photo-fallback');" />`
      : `<img src="${LOGO_FALLBACK}" alt="InfinityTech" loading="lazy" decoding="async" />`;

    return `
      <article class="product-card" data-id="${escapeAttr(product.id)}">
        <div class="product-photo${product.foto ? '' : ' photo-fallback'}">
          ${photo}
        </div>
        <div class="product-body">
          <span class="product-category">${escapeHTML(product.categoria)}</span>
          <h3 class="product-name">${escapeHTML(product.nome)}</h3>
          <div class="product-price">${formatPrice(product.preco)}</div>
          <div class="product-actions">
            <div class="qty-stepper" data-qty="1">
              <button type="button" class="qty-btn qty-minus" aria-label="Diminuir quantidade">−</button>
              <span class="qty-value">1</span>
              <button type="button" class="qty-btn qty-plus" aria-label="Aumentar quantidade">+</button>
            </div>
            <button type="button" class="btn btn-accent btn-sm product-add">Adicionar</button>
          </div>
        </div>
      </article>
    `;
  }

  function renderGrid() {
    const visible = getVisibleProducts();

    if (state.products.length === 0) {
      els.grid.innerHTML = '';
      els.loadMoreWrap.innerHTML = '';
      return;
    }

    if (visible.length === 0) {
      els.grid.innerHTML = '';
      els.loadMoreWrap.innerHTML = '';
      setState('empty', `
        <svg width="40" height="40" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5"><circle cx="11" cy="11" r="8"></circle><line x1="21" y1="21" x2="16.65" y2="16.65"></line></svg>
        <p>Nenhum produto encontrado${state.searchTerm ? ` para "${escapeHTML(state.searchTerm)}"` : ''}.</p>
      `);
      return;
    }

    setState('hidden');
    const pageItems = visible.slice(0, state.visibleCount);
    els.grid.innerHTML = pageItems.map(productCardHTML).join('');

    const remaining = visible.length - pageItems.length;
    els.loadMoreWrap.innerHTML = remaining > 0
      ? `<button type="button" class="btn btn-outline" id="catalog-load-more">Carregar mais produtos (${remaining} restantes)</button>`
      : '';
    if (remaining > 0) {
      document.getElementById('catalog-load-more').addEventListener('click', () => {
        state.visibleCount += PAGE_SIZE;
        renderGrid();
      });
    }

    els.grid.querySelectorAll('.product-card').forEach((card) => {
      const id = card.dataset.id;
      const product = state.productsById.get(id);
      const stepper = card.querySelector('.qty-stepper');
      const qtyValue = card.querySelector('.qty-value');

      card.querySelector('.qty-minus').addEventListener('click', () => {
        const current = parseInt(stepper.dataset.qty, 10);
        const next = Math.max(1, current - 1);
        stepper.dataset.qty = next;
        qtyValue.textContent = next;
      });

      card.querySelector('.qty-plus').addEventListener('click', () => {
        const current = parseInt(stepper.dataset.qty, 10);
        const next = current + 1;
        stepper.dataset.qty = next;
        qtyValue.textContent = next;
      });

      const addBtn = card.querySelector('.product-add');
      addBtn.addEventListener('click', () => {
        const qty = parseInt(stepper.dataset.qty, 10);
        addToCart(product, qty);
        stepper.dataset.qty = 1;
        qtyValue.textContent = 1;

        const originalText = addBtn.textContent;
        addBtn.textContent = 'Adicionado ✓';
        addBtn.classList.add('is-added');
        window.setTimeout(() => {
          addBtn.textContent = originalText;
          addBtn.classList.remove('is-added');
        }, 1200);
      });
    });
  }

  function cartItemHTML(item) {
    const photo = item.foto
      ? `<img src="${escapeAttr(item.foto)}" alt="${escapeAttr(item.nome)}" loading="lazy" onerror="this.onerror=null; this.src='${LOGO_FALLBACK}'; this.closest('.cart-item-photo').classList.add('photo-fallback');" />`
      : `<img src="${LOGO_FALLBACK}" alt="InfinityTech" loading="lazy" />`;
    return `
      <li class="cart-item" data-id="${escapeAttr(item.id)}">
        <div class="cart-item-photo${item.foto ? '' : ' photo-fallback'}">${photo}</div>
        <div class="cart-item-info">
          <span class="cart-item-name">${escapeHTML(item.nome)}</span>
          <span class="cart-item-price">${formatPrice(item.preco)} un.</span>
          <div class="cart-item-controls">
            <button type="button" class="qty-btn cart-qty-minus" aria-label="Diminuir quantidade">−</button>
            <span class="qty-value">${item.quantidade}</span>
            <button type="button" class="qty-btn cart-qty-plus" aria-label="Aumentar quantidade">+</button>
            <button type="button" class="cart-item-remove" aria-label="Remover ${escapeAttr(item.nome)}">Remover</button>
          </div>
        </div>
        <div class="cart-item-subtotal">${formatPrice(item.preco * item.quantidade)}</div>
      </li>
    `;
  }

  function renderCart() {
    const count = cartCount();
    els.cartBadge.textContent = count;
    els.cartBadge.hidden = count === 0;

    if (state.cart.length === 0) {
      els.cartItems.innerHTML = '';
      els.cartEmpty.hidden = false;
      els.cartCheckout.disabled = true;
    } else {
      els.cartEmpty.hidden = true;
      els.cartCheckout.disabled = false;
      els.cartItems.innerHTML = state.cart.map(cartItemHTML).join('');

      els.cartItems.querySelectorAll('.cart-item').forEach((el) => {
        const id = el.dataset.id;
        el.querySelector('.cart-qty-minus').addEventListener('click', () => updateCartQuantity(id, -1));
        el.querySelector('.cart-qty-plus').addEventListener('click', () => updateCartQuantity(id, 1));
        el.querySelector('.cart-item-remove').addEventListener('click', () => removeFromCart(id));
      });
    }

    els.cartTotal.textContent = formatPrice(cartTotal());
  }

  function flashCartButton() {
    els.cartButton.classList.add('cart-pulse');
    window.setTimeout(() => els.cartButton.classList.remove('cart-pulse'), 500);
  }

  function openCart() {
    els.cartDrawer.classList.add('open');
    els.cartBackdrop.classList.add('open');
    document.body.style.overflow = 'hidden';
  }

  function closeCart() {
    els.cartDrawer.classList.remove('open');
    els.cartBackdrop.classList.remove('open');
    document.body.style.overflow = '';
  }

  function getLojistaData() {
    try {
      const raw = localStorage.getItem('infinitytech-lojista-cadastro');
      return raw ? JSON.parse(raw) : null;
    } catch (e) {
      return null;
    }
  }

  function buildWhatsAppMessage() {
    const lines = [];
    const lojista = getLojistaData();

    if (lojista) {
      lines.push('*Dados do Lojista*');
      if (lojista.nome) lines.push(`Nome: ${lojista.nome}`);
      if (lojista.cnpj) lines.push(`CNPJ: ${lojista.cnpj}`);
      if (lojista.endereco) lines.push(`Endereço: ${lojista.endereco}`);
      if (lojista.telefone) lines.push(`Telefone: ${lojista.telefone}`);
      if (lojista.email) lines.push(`E-mail: ${lojista.email}`);
      lines.push('');
    }

    lines.push('Olá! Gostaria de fazer o seguinte pedido no atacado:', '');
    state.cart.forEach((item) => {
      lines.push(`• ${item.quantidade}x ${item.nome} — ${formatPrice(item.preco)} un. = ${formatPrice(item.preco * item.quantidade)}`);
    });
    lines.push('');
    lines.push(`Total: ${formatPrice(cartTotal())}`);
    return lines.join('\n');
  }

  function checkout() {
    if (state.cart.length === 0) return;
    const message = encodeURIComponent(buildWhatsAppMessage());
    window.open(`https://wa.me/${WHATSAPP_NUMBER}?text=${message}`, '_blank', 'noopener');
    clearCart();
    closeCart();
  }

  // ==========================================================================
  // UTIL
  // ==========================================================================
  function escapeHTML(str) {
    const div = document.createElement('div');
    div.textContent = str == null ? '' : String(str);
    return div.innerHTML;
  }

  function escapeAttr(str) {
    return escapeHTML(str).replace(/"/g, '&quot;');
  }

  function debounce(fn, wait) {
    let timeout;
    return function (...args) {
      clearTimeout(timeout);
      timeout = setTimeout(() => fn.apply(this, args), wait);
    };
  }

  // ==========================================================================
  // CARGA INICIAL
  // ==========================================================================
  async function loadCatalog() {
    if (!CSV_URL || CSV_URL.indexOf('COLE_AQUI') !== -1) {
      setState('setup', `
        <svg width="40" height="40" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5"><path d="M12 2v6"></path><path d="M12 22v-6"></path><circle cx="12" cy="12" r="4"></circle></svg>
        <p><strong>Catálogo em preparação.</strong><br />Estamos finalizando a lista de produtos. Fale com nosso time comercial para a tabela mais atual.</p>
        <a href="https://wa.me/${WHATSAPP_NUMBER}?text=Ol%C3%A1%2C+gostaria+de+conhecer+o+cat%C3%A1logo+de+pe%C3%A7as+no+atacado." target="_blank" rel="noopener noreferrer" class="btn btn-whatsapp btn-sm">Falar no WhatsApp</a>
      `);
      return;
    }

    setState('loading', `
      <span class="catalog-spinner" aria-hidden="true"></span>
      <p>Carregando catálogo...</p>
    `);

    try {
      const csvText = await fetchCSV(CSV_URL);
      const rows = parseCSV(csvText);
      state.products = rowsToProducts(rows);
      state.productsById = new Map(state.products.map((p) => [p.id, p]));

      if (state.products.length === 0) {
        setState('empty', `
          <svg width="40" height="40" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5"><rect x="3" y="3" width="18" height="18" rx="2"></rect><line x1="3" y1="9" x2="21" y2="9"></line></svg>
          <p>Nenhum produto cadastrado na planilha ainda.</p>
        `);
        return;
      }

      const params = new URLSearchParams(window.location.search);
      const preselect = params.get('categoria');
      if (preselect && state.products.some((p) => p.categoria.toLowerCase() === preselect.toLowerCase())) {
        state.activeCategory = state.products.find((p) => p.categoria.toLowerCase() === preselect.toLowerCase()).categoria;
      }

      setState('hidden');
      renderCategoryFilters();
      renderGrid();
    } catch (err) {
      setState('error', `
        <svg width="40" height="40" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5"><circle cx="12" cy="12" r="10"></circle><line x1="12" y1="8" x2="12" y2="12"></line><line x1="12" y1="16" x2="12.01" y2="16"></line></svg>
        <p><strong>Não foi possível carregar o catálogo agora.</strong><br />Verifique sua conexão ou fale com nosso time comercial para a tabela atual.</p>
        <div class="catalog-state-actions">
          <button type="button" class="btn btn-outline btn-sm" id="catalog-retry">Tentar novamente</button>
          <a href="https://wa.me/${WHATSAPP_NUMBER}?text=Ol%C3%A1%2C+gostaria+de+conhecer+o+cat%C3%A1logo+de+pe%C3%A7as+no+atacado." target="_blank" rel="noopener noreferrer" class="btn btn-whatsapp btn-sm">Falar no WhatsApp</a>
        </div>
      `);
      const retryBtn = document.getElementById('catalog-retry');
      if (retryBtn) retryBtn.addEventListener('click', loadCatalog);
    }
  }

  // ==========================================================================
  // INIT
  // ==========================================================================
  document.addEventListener('DOMContentLoaded', () => {
    cacheEls();
    if (!els.grid) return;

    renderCart();
    initCategoryScroll();

    els.search.addEventListener('input', debounce((e) => {
      state.searchTerm = e.target.value;
      state.visibleCount = PAGE_SIZE;
      renderGrid();
    }, 200));

    els.cartButton.addEventListener('click', openCart);
    els.cartClose.addEventListener('click', closeCart);
    els.cartBackdrop.addEventListener('click', closeCart);
    els.cartCheckout.addEventListener('click', checkout);
    els.cartClear.addEventListener('click', () => {
      if (window.confirm('Esvaziar todos os itens do carrinho?')) {
        clearCart();
      }
    });

    document.addEventListener('keydown', (e) => {
      if (e.key === 'Escape') closeCart();
    });

    loadCatalog();
  });
})();
