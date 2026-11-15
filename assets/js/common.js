/* ============================================================
   GALERÍA CAMPUZANO · utilidades comunes
   ------------------------------------------------------------
   Se carga en TODAS las páginas públicas antes que gallery-core
   y los scripts de cada página. Hace cuatro cosas:

   1. Vuelca los textos de config.js en el HTML.
   2. Rellena enlaces de redes y correo (y oculta los vacíos).
   3. Controla la cabecera fija y el menú móvil.
   4. Expone utilidades pequeñas (escapar texto, URLs seguras).

   No contiene datos de obras ni lógica de la galería.
   ============================================================ */
(function () {
  "use strict";

  const CONFIG = window.GC_CONFIG || {};
  const SITE = CONFIG.site || {};

  /* Atajos de selección de DOM. */
  const $ = (selector, root = document) => root.querySelector(selector);
  const $$ = (selector, root = document) => Array.from(root.querySelectorAll(selector));

  /* ------------------------------------------------------------
     UTILIDADES
     ------------------------------------------------------------ */

  // Escapa texto antes de insertarlo como HTML.
  function esc(value) {
    return String(value ?? "").replace(/[&<>"']/g, (char) => {
      return { "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[char];
    });
  }

  // Solo permite http(s). Evita javascript: en datos externos.
  function safeUrl(value) {
    try {
      const url = new URL(String(value), window.location.href);
      return url.protocol === "http:" || url.protocol === "https:" ? url.href : "";
    } catch (error) {
      return "";
    }
  }

  // Convierte "2025-04-12" en "12.04.2025". Si solo hay año, lo deja.
  function formatDate(value) {
    const raw = String(value || "").trim();
    if (!raw) return "";
    if (/^\d{4}$/.test(raw)) return raw;
    const match = raw.match(/^(\d{4})-(\d{2})-(\d{2})/);
    if (match) return `${match[3]}.${match[2]}.${match[1]}`;
    return raw;
  }

  /* ------------------------------------------------------------
     1. TEXTOS DEL SITIO
     Cualquier elemento con data-site="clave" recibe el texto de
     config.js. Así se puede editar el contenido sin tocar HTML.
     ------------------------------------------------------------ */
  const SITE_TEXT = {
    name: SITE.name,
    artist: SITE.artist,
    role: SITE.role,
    tagline: SITE.tagline,
    location: SITE.location,
    since: SITE.since,
    intro: SITE.intro,
    quote: SITE.quote,
    quoteAuthor: SITE.quoteAuthor,
    availability: SITE.availability,
    email: SITE.email
  };

  function fillSiteText() {
    $$("[data-site]").forEach((node) => {
      const key = node.dataset.site;
      if (Object.prototype.hasOwnProperty.call(SITE_TEXT, key) && SITE_TEXT[key]) {
        node.textContent = SITE_TEXT[key];
      }
    });

    // Declaración del autor: un párrafo por entrada del arreglo.
    $$("[data-statement]").forEach((container) => {
      if (!Array.isArray(SITE.statement)) return;
      container.innerHTML = SITE.statement.map((paragraph) => `<p>${esc(paragraph)}</p>`).join("");
    });

    // Retrato y textos alternativos.
    $$("[data-portrait]").forEach((img) => {
      if (SITE.portrait) img.src = SITE.portrait;
      if (SITE.artist) img.alt = `Retrato de ${SITE.artist}`;
    });

    // Año actual en el pie.
    $$("[data-year]").forEach((node) => {
      node.textContent = String(new Date().getFullYear());
    });
  }

  /* ------------------------------------------------------------
     2. REDES Y CORREO
     Los enlaces con data-social="instagram" toman la URL de
     config.js. Si está vacía, se oculta la fila completa.
     ------------------------------------------------------------ */
  const SOCIAL_LABELS = {
    instagram: "Instagram",
    linkedin: "LinkedIn",
    github: "GitHub",
    dribbble: "Dribbble",
    behance: "Behance",
    website: "Sitio web"
  };

  function fillSocial() {
    const social = SITE.social || {};

    $$("[data-social]").forEach((link) => {
      const key = link.dataset.social;
      const url = safeUrl(social[key] || "");
      if (!url) {
        // Se oculta el contenedor marcado o el propio enlace.
        (link.closest("[data-social-row]") || link).hidden = true;
        return;
      }
      link.href = url;
      link.target = "_blank";
      link.rel = "noopener noreferrer";
      link.hidden = false;
      // Si el enlace contiene un texto con data-social-label, lo actualiza.
      const label = $("[data-social-label]", link);
      if (label) label.textContent = SOCIAL_LABELS[key] || key;
    });

    // Correo: si no hay dirección configurada, se ocultan los bloques.
    const email = String(SITE.email || "").trim();
    $$("[data-email-link]").forEach((link) => {
      if (!email) {
        (link.closest("[data-email-block]") || link).hidden = true;
        return;
      }
      link.href = `mailto:${email}`;
      link.hidden = false;
      const label = $("[data-email-label]", link);
      if (label) label.textContent = email;
    });

    $$("[data-email-block]").forEach((block) => {
      if (!email) block.hidden = true;
    });
  }

  /* ------------------------------------------------------------
     3. CABECERA Y MENÚ
     ------------------------------------------------------------ */
  function initHeader() {
    const header = $("[data-header]");
    const nav = $("#site-nav");
    const toggle = $("#nav-toggle");
    const openIcon = $("[data-menu-open]");
    const closeIcon = $("[data-menu-close]");

    // Fondo acrílico al bajar.
    if (header) {
      const onScroll = () => {
        header.classList.toggle("is-scrolled", window.scrollY > 10);
      };
      window.addEventListener("scroll", onScroll, { passive: true });
      onScroll();
    }

    // Marca la página actual en la navegación.
    const current = document.body.dataset.page || "";
    $$("[data-nav]").forEach((link) => {
      link.classList.toggle("is-active", link.dataset.nav === current);
      if (link.dataset.nav === current) link.setAttribute("aria-current", "page");
    });

    // Menú móvil.
    if (!nav || !toggle) return;

    const setOpen = (open) => {
      toggle.setAttribute("aria-expanded", String(open));
      nav.classList.toggle("is-open", open);
      if (openIcon) openIcon.hidden = open;
      if (closeIcon) closeIcon.hidden = !open;
    };

    toggle.addEventListener("click", () => {
      setOpen(toggle.getAttribute("aria-expanded") !== "true");
    });

    $$("a", nav).forEach((link) => {
      link.addEventListener("click", () => setOpen(false));
    });

    document.addEventListener("keydown", (event) => {
      if (event.key === "Escape" && nav.classList.contains("is-open")) {
        setOpen(false);
        toggle.focus();
      }
    });

    // Cierra al tocar fuera del panel.
    document.addEventListener("click", (event) => {
      if (!nav.classList.contains("is-open")) return;
      if (nav.contains(event.target) || toggle.contains(event.target)) return;
      setOpen(false);
    });

    // Si se agranda la ventana, el menú móvil deja de tener sentido.
    window.addEventListener("resize", () => {
      if (window.innerWidth > 980) setOpen(false);
    });
  }

  /* ------------------------------------------------------------
     4. ARRANQUE
     ------------------------------------------------------------ */
  function init() {
    fillSiteText();
    fillSocial();
    initHeader();
  }

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", init);
  } else {
    init();
  }

  // API pública para el resto de scripts.
  window.GCSite = {
    config: CONFIG,
    site: SITE,
    esc,
    safeUrl,
    formatDate,
    socialLabels: SOCIAL_LABELS
  };
})();
