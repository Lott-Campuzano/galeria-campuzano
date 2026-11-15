/* ============================================================
   AUTOR · autor.html
   ------------------------------------------------------------
   Esta página cuenta quién está detrás de la galería. Se apoya
   en config.js para los textos y en gallery-core.js para la
   selección de obra.

   Orden de trabajo:
   1. Prácticas (dibujo, fotografía, diseño).
   2. Ficha técnica del autor.
   3. Enlaces profesionales.
   4. Selección aleatoria de seis obras.
   ============================================================ */
(function () {
  "use strict";

  const CONFIG = window.GC_CONFIG || {};
  const SITE = CONFIG.site || {};

  const $ = (selector, root = document) => root.querySelector(selector);

  /* Iconos de Iconify para cada red. Se usan solo los que
     existan en config.js; los vacíos no se pintan. */
  const SOCIAL_ICONS = {
    instagram: "ph:instagram-logo",
    linkedin: "ph:linkedin-logo",
    github: "ph:github-logo",
    dribbble: "ph:dribbble-logo",
    behance: "ph:behance-logo",
    website: "ph:globe"
  };

  const SOCIAL_ORDER = ["instagram", "linkedin", "dribbble", "behance", "github", "website"];

  function esc(value) {
    return window.GCGallery?.esc
      ? window.GCGallery.esc(value)
      : String(value ?? "").replace(/[&<>"']/g, (char) => {
          return { "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[char];
        });
  }

  function safeUrl(value) {
    return window.GCSite?.safeUrl ? window.GCSite.safeUrl(value) : String(value || "");
  }

  /* ------------------------------------------------------------
     1. PRÁCTICAS
     Tres bloques numerados. Si config.js no trae textos, la
     sección se oculta para no dejar huecos.
     ------------------------------------------------------------ */
  function renderPractice() {
    const container = $("#author-practice");
    if (!container) return;

    const items = Array.isArray(SITE.practice) ? SITE.practice : [];
    if (!items.length) {
      container.closest(".practice")?.setAttribute("hidden", "");
      return;
    }

    container.innerHTML = items
      .map(
        (item, index) => `
        <article class="practice__item">
          <p class="mono practice__num">${String(index + 1).padStart(2, "0")}</p>
          <h3>${esc(item.title || "Práctica")}</h3>
          <p>${esc(item.text || "")}</p>
        </article>`
      )
      .join("");
  }

  /* ------------------------------------------------------------
     2. FICHA DEL AUTOR
     ------------------------------------------------------------ */
  function renderFacts() {
    const list = $("#author-facts");
    if (!list) return;

    const facts = Array.isArray(SITE.facts) ? SITE.facts : [];
    if (!facts.length) {
      list.closest(".facts")?.setAttribute("hidden", "");
      return;
    }

    list.innerHTML = facts
      .map(
        (fact) => `
        <div class="facts__item">
          <dt>${esc(fact.label || "")}</dt>
          <dd>${esc(fact.value || "")}</dd>
        </div>`
      )
      .join("");
  }

  /* ------------------------------------------------------------
     3. ENLACES PROFESIONALES
     Se generan a partir de config.js. Si una red no tiene URL,
     no se muestra. Todos abren en otra pestaña.
     ------------------------------------------------------------ */
  function renderLinks() {
    const container = $("#author-links");
    if (!container) return;

    const social = SITE.social || {};
    const rows = SOCIAL_ORDER.map((key) => {
      const url = safeUrl(social[key] || "");
      if (!url) return "";
      const label = window.GCSite?.socialLabels?.[key] || key;
      return `
        <a class="link-row" href="${esc(url)}" target="_blank" rel="noopener noreferrer">
          <span class="link-row__label">
            <iconify-icon icon="${SOCIAL_ICONS[key] || "ph:globe"}"></iconify-icon>
            ${esc(label)}
          </span>
          <iconify-icon class="link-row__arrow" icon="ph:arrow-up-right"></iconify-icon>
        </a>`;
    }).filter(Boolean);

    if (!rows.length) {
      container.closest(".author-contact__links")?.setAttribute("hidden", "");
      return;
    }

    container.innerHTML = rows.join("");
  }

  /* ------------------------------------------------------------
     4. SELECCIÓN DE OBRA
     Seis piezas al azar, con el mismo visor que el resto del
     sitio. El color ambiental se toma de la primera pieza.
     ------------------------------------------------------------ */
  async function renderWorks() {
    const grid = $("#author-grid");
    if (!grid) return;

    try {
      const { works } = await window.GCGallery.load();

      if (!works.length) {
        grid.closest(".author__works")?.setAttribute("hidden", "");
        return;
      }

      const sample = window.GCGallery.randomSample(works, 6);
      const count = $("#author-works-count");
      if (count) count.textContent = String(sample.length);

      window.GCGallery.renderGrid(grid, sample, {
        observe: true,
        palette: true,
        eager: 2
      });
    } catch (error) {
      console.error("Galería Campuzano · autor:", error);
      grid.closest(".author__works")?.setAttribute("hidden", "");
    }
  }

  function init() {
    renderPractice();
    renderFacts();
    renderLinks();
    renderWorks();
  }

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", init);
  } else {
    init();
  }
})();
