/* ============================================================
   GALERÍA CAMPUZANO · núcleo de la galería
   ------------------------------------------------------------
   Este archivo es compartido por index.html, obra.html y
   autor.html. Se encarga de:

   1. Cargar la obra publicada (galeria.json) o la demo local.
   2. Crear las tarjetas y el mosaico.
   3. Extraer el color dominante de cada imagen y aplicarlo.
   4. Abrir el visor <dialog> con todos los datos.
   5. Sincronizar enlaces profundos (?obra=...).

   NO contiene textos del sitio: eso vive en config.js.
   NO contiene estilos: eso vive en CSS.
   ============================================================ */
(function () {
  "use strict";

  const CONFIG = window.GC_CONFIG || {};
  const SITE = CONFIG.site || {};
  const $ = (selector, root = document) => root.querySelector(selector);
  const $$ = (selector, root = document) => Array.from(root.querySelectorAll(selector));

  /* ------------------------------------------------------------
     CATEGORÍAS
     Si agregas una categoría en el panel, añádela aquí para que
     tenga nombre visible y descripción en la página de obra.
     ------------------------------------------------------------ */
  const CATEGORIES = {
    dibujo: {
      label: "Dibujo",
      description: "Papel, grafito, carbón y tinta. El gesto como punto de partida."
    },
    fotografia: {
      label: "Fotografía",
      description: "Luz detenida, paisajes y estudios de la mirada cotidiana."
    },
    pintura: {
      label: "Pintura",
      description: "Materia, color y capas. Series construidas por veladuras."
    },
    mixta: {
      label: "Técnica mixta",
      description: "Técnicas que se cruzan: dibujo, acuarela, collage y archivo."
    }
  };

  const CATEGORY_ORDER = ["dibujo", "fotografia", "pintura", "mixta"];
  const reducedMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
  const canHover = window.matchMedia("(hover: hover)").matches;

  /* Estado en memoria de la página actual. */
  const state = {
    works: [],
    demo: false,
    baseWorkId: null,
    hovering: false,
    paletteToken: 0,
    revealObserver: null,
    visibleObserver: null,
    visibleTimer: null,
    visibleRatios: new Map(),
    dialogList: [],
    dialogIndex: -1,
    lastFocus: null
  };

  const els = {};

  /* ------------------------------------------------------------
     UTILIDADES DE PRESENTACIÓN
     ------------------------------------------------------------ */

  function esc(value) {
    return String(value ?? "").replace(/[&<>"']/g, (char) => {
      return { "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[char];
    });
  }

  function safeUrl(value) {
    if (window.GCSite?.safeUrl) return window.GCSite.safeUrl(value);
    try {
      const url = new URL(String(value), window.location.href);
      return url.protocol === "http:" || url.protocol === "https:" ? url.href : "";
    } catch (error) {
      return "";
    }
  }

  function formatDate(value) {
    if (window.GCSite?.formatDate) return window.GCSite.formatDate(value);
    return String(value || "");
  }

  function categoryLabel(key) {
    return CATEGORIES[key]?.label || "Obra";
  }

  function categoryDescription(key) {
    return CATEGORIES[key]?.description || "Obra seleccionada del archivo.";
  }

  // URL de la imagen. Drive usa su servicio de miniaturas.
  function imageUrlFor(work, size = 1600) {
    if (!work) return "";
    return window.GCDrive?.imageUrlFor(work, size) || work.imageUrl || "";
  }

  // Proporción real de la imagen, acotada para que el mosaico no se rompa.
  function ratioFor(work) {
    const width = Number(work?.width) || 0;
    const height = Number(work?.height) || 0;
    if (!width || !height) return 0.8;
    return Math.min(1.85, Math.max(0.55, width / height));
  }

  function metaLine(work) {
    return [formatDate(work?.date), work?.technique].filter(Boolean).join(" · ");
  }

  function clampNumber(value, min, max) {
    return Math.min(max, Math.max(min, value));
  }

  /* ------------------------------------------------------------
     CARGA DE DATOS
     Orden:
     1. assets/data/galeria.json (lo que publicaste).
     2. Si no existe, las 32 obras de demostración de seed.js.
     3. Si existe pero no tiene obras, la galería queda vacía.
     ------------------------------------------------------------ */
  async function load() {
    const path = CONFIG.gallery?.manifest || "assets/data/galeria.json";
    let manifest = null;

    if (window.GCManifest) {
      manifest = await window.GCManifest.loadPublished(path);
    }

    if (manifest) {
      state.works = window.GCManifest.publicWorks(manifest);
      state.demo = false;
    } else {
      state.works = (window.GCManifest?.demoWorks?.() || []).filter((work) => work.published !== false);
      state.demo = true;
    }

    return { works: state.works, demo: state.demo };
  }

  /* Barajado Fisher-Yates: selección realmente aleatoria. */
  function randomSample(works, count) {
    const copy = [...works];
    for (let i = copy.length - 1; i > 0; i -= 1) {
      const j = Math.floor(Math.random() * (i + 1));
      [copy[i], copy[j]] = [copy[j], copy[i]];
    }
    return copy.slice(0, Math.max(0, Math.min(count, copy.length)));
  }

  /* ------------------------------------------------------------
     TARJETAS
     Una tarjeta es un botón accesible que abre el visor. La
     imagen mantiene su proporción real mediante --ratio.
     ------------------------------------------------------------ */
  function createCard(work, index, options = {}) {
    const list = options.list || state.works;
    const src = imageUrlFor(work, index < 3 ? 1400 : 1000);
    const ratio = ratioFor(work);
    const eager = index < (options.eager ?? 3);

    const article = document.createElement("article");
    article.className = "work-card";
    article.dataset.workId = work.id;
    article.style.setProperty("--ratio", String(ratio));

    const button = document.createElement("button");
    button.type = "button";
    button.className = "work-card__button";
    button.setAttribute(
      "aria-label",
      `Ver ${work.title || "obra sin título"}, ${categoryLabel(work.category)}`
    );

    button.innerHTML = `
      <span class="work-card__media">
        <img src="${esc(src)}"
             alt="${esc(work.title || "Obra sin título")}${work.technique ? `, ${esc(work.technique)}` : ""}"
             loading="${eager ? "eager" : "lazy"}"
             decoding="async"
             ${work.width ? `width="${Number(work.width)}"` : ""}
             ${work.height ? `height="${Number(work.height)}"` : ""}>
        <span class="work-card__veil" aria-hidden="true"></span>
        <span class="work-card__tag mono">${esc(categoryLabel(work.category))}</span>
        <span class="work-card__hover" aria-hidden="true">
          <span>Ver obra</span>
          <iconify-icon icon="ph:arrow-up-right"></iconify-icon>
        </span>
      </span>
      <span class="work-card__caption">
        <span class="work-card__index">${String(index + 1).padStart(2, "0")}</span>
        <span class="work-card__body">
          <span class="work-card__title">${esc(work.title || "Sin título")}</span>
          <span class="work-card__meta">${esc(metaLine(work) || categoryLabel(work.category))}</span>
        </span>
        <span class="work-card__year">${esc(formatDate(work.date) || "—")}</span>
      </span>`;

    // Aviso visual si la imagen no carga (Drive privado, enlace roto…).
    const media = $(".work-card__media", button);
    $("img", button).addEventListener("error", () => {
      media.classList.add("is-broken");
    });

    // Abrir visor o navegar, según la página.
    button.addEventListener("click", () => {
      if (typeof options.onOpen === "function") {
        options.onOpen(work, list);
      } else {
        open(work.id, list);
      }
    });

    // Vista previa del color al pasar el cursor (solo con ratón).
    if (canHover) {
      button.addEventListener("pointerenter", () => preview(work));
      button.addEventListener("pointerleave", () => restore());
    }

    // Accesibilidad: el mismo efecto al enfocar con teclado.
    button.addEventListener("focus", () => preview(work));
    button.addEventListener("blur", () => restore());

    article.appendChild(button);
    return article;
  }

  /* ------------------------------------------------------------
     MOSAICO
     renderGrid(contenedor, obras, opciones):
     - observe: actualizar el color ambiental al hacer scroll.
     - onOpen: función propia en lugar del visor.
     - palette: aplicar el color de la primera obra al terminar.
     ------------------------------------------------------------ */
  function renderGrid(container, works, options = {}) {
    if (!container) return;

    container.innerHTML = "";
    const fragment = document.createDocumentFragment();

    (works || []).forEach((work, index) => {
      fragment.appendChild(createCard(work, index, { ...options, list: works }));
    });

    container.appendChild(fragment);
    reveal(container);

    if (options.observe) {
      observeVisible(container);
    }

    if (options.palette && works?.length) {
      setBase(works[0], { showNow: options.showNow !== false });
    }
  }

  /* Animación de entrada de las tarjetas. */
  function reveal(container) {
    const cards = $$(".work-card", container);

    if (reducedMotion || !("IntersectionObserver" in window)) {
      cards.forEach((card) => card.classList.add("is-in"));
      return;
    }

    state.revealObserver?.disconnect();
    state.revealObserver = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (!entry.isIntersecting) return;
          entry.target.classList.add("is-in");
          state.revealObserver.unobserve(entry.target);
        });
      },
      { threshold: 0.06, rootMargin: "0px 0px -3% 0px" }
    );

    cards.forEach((card) => state.revealObserver.observe(card));
  }

  /* ------------------------------------------------------------
     COLOR DINÁMICO
     Se extrae del píxel de la imagen con canvas. Si el CDN no
     permite CORS, color.js genera una paleta estable a partir de
     la URL, así que nunca se rompe la interfaz.
     ------------------------------------------------------------ */
  async function applyFor(work, options = {}) {
    if (!work || !window.GCColor) return;

    const token = ++state.paletteToken;
    const src = imageUrlFor(work, 900);
    if (!src) return;

    const palette = await window.GCColor.fromImage(src);
    if (token !== state.paletteToken) return; // Llegó tarde: se descarta.

    window.GCColor.apply(palette);

    if (options.showNow) updateNow(work);
  }

  function setBase(work, options = {}) {
    if (!work) return;
    state.baseWorkId = work.id;
    applyFor(work, options);
  }

  function preview(work) {
    state.hovering = true;
    applyFor(work, { showNow: true });
  }

  function restore() {
    state.hovering = false;
    if (state.dialogIndex >= 0) return; // El visor manda mientras esté abierto.
    const base = state.works.find((work) => work.id === state.baseWorkId) || state.works[0];
    if (base) applyFor(base, { showNow: true });
  }

  /* Detecta qué obra ocupa más pantalla para cambiar el ambiente. */
  function observeVisible(container) {
    const cards = $$(".work-card", container);
    state.visibleObserver?.disconnect();
    state.visibleRatios.clear();

    if (!("IntersectionObserver" in window)) return;

    state.visibleObserver = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          state.visibleRatios.set(
            entry.target.dataset.workId,
            entry.isIntersecting ? entry.intersectionRatio : 0
          );
        });

        clearTimeout(state.visibleTimer);
        state.visibleTimer = setTimeout(() => {
          if (state.hovering || state.dialogIndex >= 0) return;

          let bestId = null;
          let bestRatio = 0;
          state.visibleRatios.forEach((ratio, id) => {
            if (ratio > bestRatio) {
              bestRatio = ratio;
              bestId = id;
            }
          });

          if (bestId && bestRatio > 0.35) {
            const work = state.works.find((item) => item.id === bestId);
            if (work) setBase(work, { showNow: true });
          }
        }, 180);
      },
      { threshold: [0.25, 0.4, 0.55, 0.7, 0.9] }
    );

    cards.forEach((card) => state.visibleObserver.observe(card));
  }

  /* Barra inferior con la obra activa. */
  function updateNow(work) {
    if (!els.now || !work) return;
    els.nowTitle.textContent = work.title || "Sin título";
    els.nowMeta.textContent = [formatDate(work.date), categoryLabel(work.category)]
      .filter(Boolean)
      .join(" · ");
    const visible = window.scrollY > window.innerHeight * 0.35 || state.dialogIndex >= 0;
    els.now.classList.toggle("is-visible", visible);
  }

  function initNow() {
    els.now = $("#now");
    els.nowTitle = $("#now-title");
    els.nowMeta = $("#now-meta");
    if (!els.now) return;

    const onScroll = () => {
      const visible = window.scrollY > window.innerHeight * 0.35 || state.dialogIndex >= 0;
      els.now.classList.toggle("is-visible", visible && Boolean(state.baseWorkId));
    };

    window.addEventListener("scroll", onScroll, { passive: true });
    onScroll();
  }

  /* ------------------------------------------------------------
     VISOR DE OBRA
     Usa el <dialog> nativo: foco atrapado, Escape y backdrop
     incluidos por el navegador.
     ------------------------------------------------------------ */
  function cacheDialog() {
    els.dialog = $("#work-dialog");
    if (!els.dialog) return;

    els.dialogImage = $("#dialog-image");
    els.dialogCounter = $("#dialog-counter");
    els.dialogCategory = $("#dialog-category");
    els.dialogTitle = $("#dialog-title");
    els.dialogDate = $("#dialog-date");
    els.dialogDescription = $("#dialog-description");
    els.dialogTechnique = $("#dialog-technique");
    els.dialogDimensions = $("#dialog-dimensions");
    els.dialogYear = $("#dialog-year");
    els.dialogSource = $("#dialog-source");
    els.dialogInquire = $("#dialog-inquire");
    els.dialogShare = $("#dialog-share");
    els.dialogClose = $("#dialog-close");
    els.dialogPrev = $("#dialog-prev");
    els.dialogNext = $("#dialog-next");

    els.dialogImage?.addEventListener("error", () => {
      els.dialogImage.classList.add("is-broken");
    });
  }

  function initDialog() {
    cacheDialog();
    if (!els.dialog) return;

    els.dialogClose?.addEventListener("click", close);
    els.dialogPrev?.addEventListener("click", () => step(-1));
    els.dialogNext?.addEventListener("click", () => step(1));
    els.dialogShare?.addEventListener("click", shareCurrent);

    // Clic en el fondo = cerrar.
    els.dialog.addEventListener("click", (event) => {
      if (event.target === els.dialog) close();
    });

    // Flechas del teclado dentro del visor.
    els.dialog.addEventListener("keydown", (event) => {
      if (event.key === "ArrowLeft") {
        event.preventDefault();
        step(-1);
      }
      if (event.key === "ArrowRight") {
        event.preventDefault();
        step(1);
      }
    });

    // Al cerrar, limpiamos estado, URL y devolvemos el foco.
    els.dialog.addEventListener("close", () => {
      state.dialogIndex = -1;
      state.dialogList = [];
      document.body.classList.remove("is-locked");
      setDialogParam("");
      state.lastFocus?.focus?.();
      restore();
    });
  }

  function open(workId, list) {
    if (!els.dialog) {
      // Sin visor en esta página: llevamos a la página de obra.
      window.location.href = `obra.html?obra=${encodeURIComponent(workId)}`;
      return;
    }

    const source = Array.isArray(list) && list.length ? list : state.works;
    let index = source.findIndex((work) => work.id === workId);

    if (index < 0) {
      index = state.works.findIndex((work) => work.id === workId);
      state.dialogList = state.works;
    } else {
      state.dialogList = source;
    }

    if (index < 0) return;

    state.dialogIndex = index;
    fillDialog();

    if (!els.dialog.open) {
      state.lastFocus = document.activeElement;
      els.dialog.showModal();
      document.body.classList.add("is-locked");
    }

    setDialogParam(state.dialogList[index].id);
    updateNow(state.dialogList[index]);
  }

  function close() {
    if (els.dialog?.open) els.dialog.close();
  }

  function step(direction) {
    if (!state.dialogList.length) return;
    state.dialogIndex =
      (state.dialogIndex + direction + state.dialogList.length) % state.dialogList.length;
    fillDialog();
    const work = state.dialogList[state.dialogIndex];
    setDialogParam(work.id);
    updateNow(work);
  }

  function fillDialog() {
    const work = state.dialogList[state.dialogIndex];
    if (!work || !els.dialog) return;

    const src = imageUrlFor(work, 2400);
    els.dialogImage.classList.remove("is-broken");
    els.dialogImage.src = src;
    els.dialogImage.alt = `${work.title || "Obra sin título"}, ${categoryLabel(work.category)}`;

    els.dialogCounter.textContent = `${String(state.dialogIndex + 1).padStart(2, "0")} / ${String(
      state.dialogList.length
    ).padStart(2, "0")}`;
    els.dialogCategory.textContent = categoryLabel(work.category);
    els.dialogTitle.textContent = work.title || "Sin título";
    els.dialogDate.textContent = [formatDate(work.date), categoryLabel(work.category)]
      .filter(Boolean)
      .join(" · ");
    els.dialogDescription.textContent =
      work.description || "Obra original del archivo de la galería.";
    els.dialogTechnique.textContent = work.technique || "—";
    els.dialogDimensions.textContent =
      work.dimensions ||
      (work.width && work.height ? `${work.width} × ${work.height} px` : "—");
    els.dialogYear.textContent = formatDate(work.date) || "—";

    // Enlace al archivo original (Drive o URL externa).
    const source = work.fileId
      ? `https://drive.google.com/file/d/${work.fileId}/view`
      : work.imageUrl;
    const safe = safeUrl(source);
    if (els.dialogSource) {
      els.dialogSource.hidden = !safe;
      if (safe) els.dialogSource.href = safe;
    }

    // Correo con el título ya escrito (solo si hay dirección).
    const email = String(SITE.email || "").trim();
    if (els.dialogInquire) {
      els.dialogInquire.hidden = !email;
      if (email) {
        const subject = `Información sobre «${work.title || "obra"}»`;
        const body = `Hola, me interesa la obra «${work.title || "sin título"}» (${
          formatDate(work.date) || "sin fecha"
        }). ¿Podrían enviarme más información?`;
        els.dialogInquire.href = `mailto:${email}?subject=${encodeURIComponent(
          subject
        )}&body=${encodeURIComponent(body)}`;
      }
    }

    setBase(work, { showNow: true });
  }

  /* Copia un enlace permanente a la obra en la página de archivo. */
  async function shareCurrent() {
    const work = state.dialogList[state.dialogIndex];
    if (!work) return;

    const url = new URL(`obra.html?obra=${encodeURIComponent(work.id)}`, window.location.href).href;
    let copied = false;

    try {
      await navigator.clipboard.writeText(url);
      copied = true;
    } catch (error) {
      // Navegadores sin permiso de portapapeles.
      window.prompt("Copia el enlace de la obra:", url);
    }

    if (copied && els.dialogShare) {
      const original = els.dialogShare.innerHTML;
      els.dialogShare.innerHTML =
        '<iconify-icon icon="ph:check"></iconify-icon> Enlace copiado';
      setTimeout(() => {
        els.dialogShare.innerHTML = original;
      }, 1800);
    }
  }

  /* Mantiene ?obra= en la URL de la página de archivo. */
  function setDialogParam(workId) {
    if (document.body.dataset.page !== "obra") return;

    const url = new URL(window.location.href);
    if (workId) {
      url.searchParams.set("obra", workId);
    } else {
      url.searchParams.delete("obra");
    }
    history.replaceState({ obra: workId || null }, "", url);
  }

  /* ------------------------------------------------------------
     ARRANQUE
     ------------------------------------------------------------ */
  function init() {
    initDialog();
    initNow();
  }

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", init);
  } else {
    init();
  }

  // API que usan los scripts de cada página.
  window.GCGallery = {
    CATEGORIES,
    CATEGORY_ORDER,
    state,
    esc,
    safeUrl,
    formatDate,
    categoryLabel,
    categoryDescription,
    imageUrlFor,
    ratioFor,
    metaLine,
    load,
    randomSample,
    renderGrid,
    observeVisible,
    setBase,
    applyFor,
    preview,
    restore,
    initDialog,
    initNow,
    open,
    close,
    clampNumber
  };
})();
