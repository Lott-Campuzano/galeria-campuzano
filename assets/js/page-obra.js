/* ============================================================
   ARCHIVO · obra.html
   ------------------------------------------------------------
   Página de colecciones y obra individual. Permite:
   - Filtrar por técnica (categoría).
   - Buscar por título, técnica, año o descripción.
   - Ordenar por curaduría, fecha o título.
   - Abrir una obra con enlace profundo: obra.html?obra=ID
   - Entrar ya filtrado: obra.html?serie=dibujo
   ============================================================ */
(function () {
  "use strict";

  const $ = (selector) => document.querySelector(selector);

  const els = {
    grid: $("#archive-grid"),
    filters: $("#archive-filters"),
    status: $("#archive-status"),
    count: $("#works-count"),
    years: $("#works-years"),
    search: $("#archive-search"),
    sort: $("#archive-sort"),
    reset: $("#archive-reset"),
    state: $("#archive-state"),
    collections: $("#collections-list")
  };

  const params = new URLSearchParams(window.location.search);
  const VALID_SORTS = ["curated", "recent", "oldest", "title"];

  const state = {
    works: [],
    filtered: [],
    category: "all",
    query: "",
    sort: "curated"
  };

  /* ------------------------------------------------------------
     UTILIDADES
     ------------------------------------------------------------ */
  function normalize(value) {
    return String(value || "")
      .normalize("NFD")
      .replace(/[\u0300-\u036f]/g, "")
      .toLowerCase()
      .trim();
  }

  function dateKey(work) {
    const match = String(work.date || "").match(/(\d{4})(?:-(\d{2}))?(?:-(\d{2}))?/);
    if (!match) return 0;
    return Number(`${match[1]}${match[2] || "00"}${match[3] || "00"}`);
  }

  function sortWorks(works) {
    const list = [...works];

    if (state.sort === "recent") {
      list.sort((a, b) => dateKey(b) - dateKey(a) || (a.sortOrder || 0) - (b.sortOrder || 0));
    } else if (state.sort === "oldest") {
      list.sort((a, b) => dateKey(a) - dateKey(b) || (a.sortOrder || 0) - (b.sortOrder || 0));
    } else if (state.sort === "title") {
      list.sort((a, b) =>
        String(a.title || "").localeCompare(String(b.title || ""), "es", { sensitivity: "base" })
      );
    } else {
      // Curaduría: respeta el orden publicado desde el panel.
      list.sort((a, b) => (a.sortOrder || 0) - (b.sortOrder || 0));
    }

    return list;
  }

  function categoryLabel(key) {
    return window.GCGallery.categoryLabel(key);
  }

  /* ------------------------------------------------------------
     FILTROS
     ------------------------------------------------------------ */
  function renderFilters() {
    if (!els.filters) return;

    const counts = state.works.reduce((acc, work) => {
      const key = work.category || "otro";
      acc[key] = (acc[key] || 0) + 1;
      return acc;
    }, {});

    const keys = window.GCGallery.CATEGORY_ORDER.filter((key) => counts[key]);
    Object.keys(counts).forEach((key) => {
      if (!keys.includes(key)) keys.push(key);
    });

    const buttons = [
      `<button class="filter" type="button" data-filter="all">Todo <span class="filter__count">${state.works.length}</span></button>`,
      ...keys.map(
        (key) =>
          `<button class="filter" type="button" data-filter="${window.GCGallery.esc(key)}">${window.GCGallery.esc(
            categoryLabel(key)
          )} <span class="filter__count">${counts[key]}</span></button>`
      )
    ];

    els.filters.innerHTML = buttons.join("");
    updateFilterUI();
  }

  function updateFilterUI() {
    if (!els.filters) return;
    els.filters.querySelectorAll("[data-filter]").forEach((button) => {
      const active = button.dataset.filter === state.category;
      button.classList.toggle("is-active", active);
      button.setAttribute("aria-pressed", String(active));
    });
  }

  function setCategory(category) {
    state.category = category;
    apply();
    syncUrl();
  }

  /* ------------------------------------------------------------
     APLICAR FILTROS Y PINTAR
     ------------------------------------------------------------ */
  function apply() {
    const query = normalize(state.query);

    const list = state.works.filter((work) => {
      if (state.category !== "all" && work.category !== state.category) return false;
      if (!query) return true;

      const haystack = normalize(
        [work.title, work.technique, work.date, work.description, categoryLabel(work.category)].join(" ")
      );
      return haystack.includes(query);
    });

    state.filtered = sortWorks(list);

    window.GCGallery.renderGrid(els.grid, state.filtered, {
      observe: state.filtered.length > 0,
      palette: false,
      eager: 3
    });

    updateFilterUI();
    updateStatus();
    renderState();
  }

  function updateStatus() {
    if (els.count) els.count.textContent = String(state.works.length);

    if (!els.status) return;

    const parts = [];
    if (state.category !== "all") parts.push(categoryLabel(state.category));
    if (state.query.trim()) parts.push(`«${state.query.trim()}»`);

    const total = state.filtered.length;
    parts.push(`${total} ${total === 1 ? "obra" : "obras"}`);

    if (state.sort !== "curated") {
      const labels = {
        recent: "más recientes",
        oldest: "más antiguas",
        title: "título A–Z"
      };
      parts.push(labels[state.sort]);
    }

    els.status.textContent = parts.join(" · ");
  }

  function renderState() {
    if (!els.state) return;

    const empty = state.filtered.length === 0;
    els.state.hidden = !empty;
    if (els.grid) els.grid.hidden = empty;
    if (!empty) return;

    els.state.innerHTML = `
      <p class="mono">Sin coincidencias</p>
      <p class="state__title">No hay obra con esos filtros.</p>
      <p class="state__text">Prueba con otra técnica, borra la búsqueda o vuelve a toda la colección.</p>
      <div class="state__actions">
        <button class="btn btn--solid" type="button" id="archive-empty-reset">
          Ver toda la obra <iconify-icon icon="ph:arrow-counter-clockwise"></iconify-icon>
        </button>
      </div>`;

    $("#archive-empty-reset")?.addEventListener("click", resetFilters);
  }

  /* ------------------------------------------------------------
     COLECCIONES
     Agrupadas por técnica. Al pulsar una fila se filtra el
     archivo y se baja hasta la retícula.
     ------------------------------------------------------------ */
  function renderCollections() {
    if (!els.collections) return;

    const groups = new Map();
    state.works.forEach((work) => {
      const key = work.category || "otro";
      if (!groups.has(key)) groups.set(key, []);
      groups.get(key).push(work);
    });

    const keys = window.GCGallery.CATEGORY_ORDER.filter((key) => groups.has(key));
    groups.forEach((_, key) => {
      if (!keys.includes(key)) keys.push(key);
    });

    els.collections.innerHTML = keys
      .map((key, index) => {
        const works = groups.get(key);
        return `
          <button class="collection-row" type="button" data-serie="${window.GCGallery.esc(key)}">
            <span class="collection-row__index">${String(index + 1).padStart(2, "0")}</span>
            <span class="collection-row__title">${window.GCGallery.esc(categoryLabel(key))}</span>
            <span class="collection-row__desc">${window.GCGallery.esc(
              window.GCGallery.categoryDescription(key)
            )}</span>
            <span class="collection-row__count">${works.length} ${
              works.length === 1 ? "obra" : "obras"
            }</span>
            <iconify-icon class="collection-row__arrow" icon="ph:arrow-up-right"></iconify-icon>
          </button>`;
      })
      .join("");

    els.collections.querySelectorAll("[data-serie]").forEach((row) => {
      row.addEventListener("click", () => {
        setCategory(row.dataset.serie);
        $("#archivo")?.scrollIntoView({
          behavior: window.matchMedia("(prefers-reduced-motion: reduce)").matches ? "auto" : "smooth",
          block: "start"
        });
      });
    });
  }

  /* ------------------------------------------------------------
     ESTADO VACÍO GLOBAL (manifiesto sin obras)
     ------------------------------------------------------------ */
  function showEmptyGallery() {
    if (els.grid) els.grid.innerHTML = "";
    if (els.state) {
      els.state.hidden = false;
      els.state.innerHTML = `
        <p class="mono">Archivo vacío</p>
        <p class="state__title">La obra se está colgando.</p>
        <p class="state__text">
          Todavía no hay piezas publicadas. Vuelve pronto.
        </p>
        <div class="state__actions">
          <a class="btn" href="index.html">Volver a la portada</a>
        </div>`;
    }
    if (els.filters) els.filters.innerHTML = "";
    if (els.status) els.status.textContent = "0 obras";
    if (els.count) els.count.textContent = "0";
  }

  /* ------------------------------------------------------------
     URL
     Mantiene los filtros en la barra de direcciones para poder
     compartir una selección. No toca ?obra= (lo maneja el visor).
     ------------------------------------------------------------ */
  function syncUrl() {
    const url = new URL(window.location.href);

    if (state.category === "all") url.searchParams.delete("serie");
    else url.searchParams.set("serie", state.category);

    const query = state.query.trim();
    if (query) url.searchParams.set("q", query);
    else url.searchParams.delete("q");

    if (state.sort === "curated") url.searchParams.delete("orden");
    else url.searchParams.set("orden", state.sort);

    history.replaceState({}, "", url);
  }

  function resetFilters() {
    state.category = "all";
    state.query = "";
    state.sort = "curated";
    if (els.search) els.search.value = "";
    if (els.sort) els.sort.value = "curated";
    apply();
    syncUrl();
  }

  /* ------------------------------------------------------------
     EVENTOS
     ------------------------------------------------------------ */
  function bindEvents() {
    els.filters?.addEventListener("click", (event) => {
      const button = event.target.closest("[data-filter]");
      if (!button) return;
      setCategory(button.dataset.filter);
    });

    let searchTimer = null;
    els.search?.addEventListener("input", () => {
      clearTimeout(searchTimer);
      searchTimer = setTimeout(() => {
        state.query = els.search.value;
        apply();
        syncUrl();
      }, 130);
    });

    els.sort?.addEventListener("change", () => {
      state.sort = VALID_SORTS.includes(els.sort.value) ? els.sort.value : "curated";
      apply();
      syncUrl();
    });

    els.reset?.addEventListener("click", resetFilters);
  }

  /* ------------------------------------------------------------
     ARRANQUE
     ------------------------------------------------------------ */
  async function init() {
    try {
      const { works } = await window.GCGallery.load();
      state.works = works;

      if (!works.length) {
        showEmptyGallery();
        return;
      }

      // Filtros iniciales desde la URL.
      const serie = params.get("serie") || "all";
      const known = new Set(works.map((work) => work.category));
      state.category = serie === "all" || known.has(serie) ? serie : "all";
      state.query = params.get("q") || "";
      state.sort = VALID_SORTS.includes(params.get("orden")) ? params.get("orden") : "curated";

      if (els.search) els.search.value = state.query;
      if (els.sort) els.sort.value = state.sort;

      // Rango de años visible en la cabecera.
      if (els.years) {
        const years = works
          .map((work) => String(work.date || "").slice(0, 4))
          .filter((year) => /^\d{4}$/.test(year))
          .sort();
        if (years.length) els.years.textContent = `${years[0]} — ${years[years.length - 1]}`;
      }

      renderFilters();
      renderCollections();
      bindEvents();
      apply();

      // Enlace profundo a una obra concreta.
      const obraId = params.get("obra");
      if (obraId) {
        const work = works.find((item) => item.id === obraId);
        if (work) window.GCGallery.open(work.id, state.works);
      }
    } catch (error) {
      console.error("Galería Campuzano · archivo:", error);
      if (els.state) {
        els.state.hidden = false;
        els.state.innerHTML = `
          <p class="mono">Error de carga</p>
          <p class="state__title">No se pudo leer el archivo.</p>
          <p class="state__text">Revisa tu conexión y vuelve a intentarlo.</p>
          <div class="state__actions">
            <button class="btn" type="button" id="archive-retry">Reintentar</button>
          </div>`;
        $("#archive-retry")?.addEventListener("click", () => window.location.reload());
      }
    }
  }

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", init);
  } else {
    init();
  }
})();
