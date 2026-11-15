/* ============================================================
   PORTADA · index.html
   ------------------------------------------------------------
   Requisito del proyecto: la portada muestra ÚNICAMENTE el
   nombre de la galería y una selección aleatoria de al menos 30
   obras. No hay eslóganes, hero comercial ni llamadas genéricas.

   El botón «Otra selección» vuelve a barajar las obras sin
   recargar la página.
   ============================================================ */
(function () {
  "use strict";

  const CONFIG = window.GC_CONFIG || {};
  const HOME_COUNT = Number(CONFIG.gallery?.homeCount) || 30;

  const $ = (selector) => document.querySelector(selector);

  const grid = $("#home-grid");
  const stateBox = $("#home-state");
  const countNode = $("#home-count");
  const shuffleButton = $("#home-shuffle");

  let allWorks = [];

  /* Genera y pinta una selección aleatoria nueva. */
  function paintRandomSelection() {
    const sample = window.GCGallery.randomSample(allWorks, HOME_COUNT);

    if (countNode) countNode.textContent = String(sample.length);

    window.GCGallery.renderGrid(grid, sample, {
      observe: true,
      palette: true,
      eager: 4
    });

    // Si hay menos de 30 obras, se muestran todas y no se oculta nada.
    if (stateBox) stateBox.hidden = true;
  }

  /* Estado vacío: manifiesto publicado sin obras. */
  function showEmpty() {
    if (grid) grid.innerHTML = "";
    if (countNode) countNode.textContent = "0";
    if (!stateBox) return;

    stateBox.hidden = false;
    stateBox.innerHTML = `
      <p class="mono">Sala en preparación</p>
      <p class="state__title">La obra se está colgando.</p>
      <p class="state__text">
        Todavía no hay piezas publicadas. Puedes importar una carpeta
        pública de Google Drive o cargar la demostración desde el panel.
      </p>
      <div class="state__actions">
        <a class="btn btn--solid" href="admin.html">Abrir el panel <iconify-icon icon="ph:arrow-up-right"></iconify-icon></a>
        <a class="btn" href="autor.html">Conocer al autor</a>
      </div>`;
  }

  async function init() {
    if (!grid) return;

    try {
      const { works } = await window.GCGallery.load();
      allWorks = works;

      if (!works.length) {
        showEmpty();
        return;
      }

      paintRandomSelection();
    } catch (error) {
      console.error("Galería Campuzano · portada:", error);
      if (stateBox) {
        stateBox.hidden = false;
        stateBox.innerHTML = `
          <p class="mono">Error de carga</p>
          <p class="state__title">No se pudo leer el archivo.</p>
          <p class="state__text">Revisa tu conexión y vuelve a intentarlo.</p>
          <div class="state__actions">
            <button class="btn" type="button" id="home-retry">Reintentar</button>
          </div>`;
        $("#home-retry")?.addEventListener("click", init);
      }
    }
  }

  // Barajar de nuevo sin recargar.
  shuffleButton?.addEventListener("click", () => {
    if (allWorks.length) paintRandomSelection();
  });

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", init);
  } else {
    init();
  }
})();
