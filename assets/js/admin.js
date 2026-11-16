/* ============================================================
   GALERÍA CAMPUZANO · lógica del panel
   ------------------------------------------------------------
   Todo ocurre en el navegador. Este archivo:

   1. Carga el borrador local o el manifiesto publicado.
   2. Escanea los enlaces que se pegan en Fuentes.
   3. Importa imágenes y conserva los metadatos existentes.
   4. Edita, ordena, publica o elimina cada obra.
   5. Descarga, copia e importa galeria.json.

   No hay llamadas a un backend propio. La única red que se usa
   es la API pública de Google Drive, y solo para los enlaces que
   aparecen en el formulario.
   ============================================================ */
(function () {
  "use strict";

  const CONFIG = window.GC_CONFIG || {};
  const MANIFEST_PATH = CONFIG.gallery?.manifest || "assets/data/galeria.json";

  const $ = (selector, root = document) => root.querySelector(selector);
  const $$ = (selector, root = document) => Array.from(root.querySelectorAll(selector));

  /* Categorías visibles. Deben coincidir con gallery-core.js para
     que el archivo público agrupe la obra con el mismo nombre. */
  const CATEGORIES = [
    { value: "dibujo", label: "Dibujo" },
    { value: "fotografia", label: "Fotografía" },
    { value: "pintura", label: "Pintura" },
    { value: "mixta", label: "Técnica mixta" }
  ];

  const SOURCE_LABELS = {
    folder: "Carpeta",
    file: "Archivo",
    image: "Enlace",
    demo: "Demo",
    manual: "Manual"
  };

  const state = {
    manifest: null,
    scan: [],
    filter: "",
    openId: null,
    focusId: null,
    origin: "empty",
    dirty: false,
    saveTimer: null,
    scanning: false,
    warnedStorage: false
  };

  const els = {};

  /* ------------------------------------------------------------
     UTILIDADES
     ------------------------------------------------------------ */
  function esc(value) {
    return String(value ?? "").replace(/[&<>"']/g, (char) => {
      return { "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[char];
    });
  }

  function safeUrl(value) {
    return window.GCSite?.safeUrl ? window.GCSite.safeUrl(value) : String(value || "");
  }

  function formatDate(value) {
    return window.GCSite?.formatDate ? window.GCSite.formatDate(value) : String(value || "");
  }

  function normalize(value) {
    return String(value || "")
      .normalize("NFD")
      .replace(/[\u0300-\u036f]/g, "")
      .toLowerCase()
      .trim();
  }

  function categoryLabel(key) {
    return CATEGORIES.find((item) => item.value === key)?.label || "Sin categoría";
  }

  function timeLabel(iso) {
    if (!iso) return "";
    const date = new Date(iso);
    if (Number.isNaN(date.getTime())) return "";
    return date.toLocaleTimeString("es-MX", { hour: "2-digit", minute: "2-digit" });
  }

  function manifestDateLabel() {
    if (!state.manifest?.updatedAt) return "";
    const date = new Date(state.manifest.updatedAt);
    if (Number.isNaN(date.getTime())) return "";
    return date.toLocaleDateString("es-MX", {
      day: "2-digit",
      month: "short",
      year: "numeric"
    });
  }

  /* ------------------------------------------------------------
     AVISOS FLOTANTES
     ------------------------------------------------------------ */
  const TOAST_ICONS = {
    info: "ph:info",
    ok: "ph:check-circle",
    error: "ph:warning-circle",
    warn: "ph:warning"
  };

  function toast(message, type = "info") {
    if (!els.toasts) return;

    const node = document.createElement("div");
    node.className = `toast toast--${type}`;
    node.innerHTML = `
      <iconify-icon icon="${TOAST_ICONS[type] || TOAST_ICONS.info}"></iconify-icon>
      <span class="toast__text">${esc(message)}</span>`;
    els.toasts.appendChild(node);

    setTimeout(() => {
      node.style.opacity = "0";
      node.style.transform = "translateY(6px)";
      node.style.transition = "opacity .25s ease, transform .25s ease";
      setTimeout(() => node.remove(), 260);
    }, 4200);
  }

  /* ------------------------------------------------------------
     PERSISTENCIA DEL BORRADOR
     ------------------------------------------------------------ */
  function persistNow() {
    state.manifest.updatedAt = new Date().toISOString();
    state.origin = "draft";

    const ok = window.GCManifest.saveDraft(state.manifest);
    state.dirty = !ok;
    clearTimeout(state.saveTimer);
    state.saveTimer = null;

    if (!ok && !state.warnedStorage) {
      state.warnedStorage = true;
      toast(
        "El navegador no permitió guardar el borrador. Descarga el JSON para no perder cambios.",
        "error"
      );
    }

    updateMeta();
    updateStats();
  }

  function scheduleSave() {
    state.dirty = true;
    clearTimeout(state.saveTimer);
    state.saveTimer = setTimeout(persistNow, 320);
  }

  /* ------------------------------------------------------------
     ESTADÍSTICAS Y ESTADO
     ------------------------------------------------------------ */
  function counts() {
    const works = state.manifest?.works || [];
    const published = works.filter((work) => work.published !== false).length;
    return {
      total: works.length,
      published,
      drafts: works.length - published,
      sources: state.manifest?.sources?.length || 0
    };
  }

  function updateStats() {
    const data = counts();

    if (els.statTotal) els.statTotal.textContent = String(data.total);
    if (els.statPublished) els.statPublished.textContent = String(data.published);
    if (els.statDrafts) {
      els.statDrafts.textContent = `${data.drafts} ${
        data.drafts === 1 ? "en borrador" : "en borrador"
      }`;
    }
    if (els.statSources) els.statSources.textContent = String(data.sources);

    if (els.worksBadge) {
      els.worksBadge.textContent = `${data.total} ${data.total === 1 ? "obra" : "obras"}`;
    }

    if (els.sourceCount) {
      els.sourceCount.textContent = `${data.sources} ${
        data.sources === 1 ? "fuente" : "fuentes"
      }`;
    }

    if (els.publishStatus) {
      els.publishStatus.textContent = data.total
        ? `${data.published} publicadas`
        : "Sin obra";
      els.publishStatus.className = "badge badge--draft";
    }
  }

  function updateMeta() {
    if (!els.adminUpdated) return;

    if (state.origin === "published" && !state.dirty) {
      const date = manifestDateLabel();
      els.adminUpdated.textContent = date
        ? `Manifiesto publicado · ${date}`
        : "Manifiesto publicado";
      return;
    }

    if (state.manifest?.updatedAt) {
      els.adminUpdated.textContent = `Borrador guardado · ${timeLabel(
        state.manifest.updatedAt
      )}`;
      return;
    }

    els.adminUpdated.textContent = "Borrador sin guardar";
  }

  /* ------------------------------------------------------------
     API KEY DE DRIVE
     ------------------------------------------------------------ */
  function renderApiStatus() {
    if (!els.apiStatus) return;

    const configured = window.GCDrive?.isConfigured?.() || false;

    els.apiStatus.innerHTML = configured
      ? `<span class="badge badge--ok"><iconify-icon icon="ph:check"></iconify-icon> API key activa</span>
         <span class="mono">Lectura de enlaces pegados</span>`
      : `<span class="badge badge--warn"><iconify-icon icon="ph:key"></iconify-icon> API key pendiente</span>
         <span class="mono">La demo sigue disponible</span>`;

    if (els.apiDetail) {
      els.apiDetail.textContent = configured
        ? "Solo se consultan las carpetas que pegues en Fuentes."
        : "Abre assets/js/config.js y pega la key en drive.apiKey.";
    }

    if (els.driveGuide) els.driveGuide.hidden = configured;
  }

  /* ------------------------------------------------------------
     FUENTES
     ------------------------------------------------------------ */
  function ensureSource(source) {
    if (!source?.id) return;
    const sources = state.manifest.sources;
    const exists = sources.some((item) => item.id === source.id && item.type === source.type);
    if (exists) return;

    sources.push({
      id: source.id,
      type: source.type || "folder",
      folderId: source.folderId || "",
      fileId: source.fileId || "",
      url: source.url || "",
      input: source.input || "",
      title: source.title || "",
      addedAt: new Date().toISOString()
    });
  }

  function renderSources() {
    if (!els.sourcesList) return;

    const sources = state.manifest?.sources || [];
    if (els.sourcesLabel) els.sourcesLabel.hidden = sources.length === 0;

    els.sourcesList.innerHTML = sources
      .map((source) => {
        const works = state.manifest.works.filter((work) => work.sourceId === source.id).length;
        const url = safeUrl(source.url || "");
        const title = source.title || source.input || "Fuente sin título";
        const link = url
          ? `<a href="${esc(url)}" target="_blank" rel="noopener noreferrer">Abrir</a>`
          : "";

        return `
          <div class="source-row" data-source-id="${esc(source.id)}">
            <span class="badge">${esc(SOURCE_LABELS[source.type] || "Fuente")}</span>
            <span class="source-row__title" title="${esc(title)}">
              ${esc(title)} ${link}
            </span>
            <span class="mono">${works} ${works === 1 ? "obra" : "obras"}</span>
            <button class="btn btn--small" type="button" data-source-remove="${esc(source.id)}">
              Quitar
            </button>
          </div>`;
      })
      .join("");
  }

  /* ------------------------------------------------------------
     ESCANEO
     ------------------------------------------------------------ */
  function scanIcon(entry) {
    if (entry.status === "loading") return "ph:hourglass";
    if (entry.status === "ok") return "ph:check-circle";
    return "ph:warning-circle";
  }

  function scanTitle(entry) {
    if (entry.status === "pending") return "En espera";
    if (entry.status === "loading") return "Leyendo enlace…";
    if (entry.status === "error") return "No se pudo leer";
    if (entry.source?.type === "folder") {
      const total = entry.files?.length || 0;
      return `Carpeta pública · ${total} ${total === 1 ? "imagen" : "imágenes"}`;
    }
    if (entry.source?.type === "file") return `Archivo · ${entry.source.title || "imagen"}`;
    return `Imagen externa · ${entry.source?.title || "enlace"}`;
  }

  function scanDetail(entry) {
    if (entry.status === "error") return entry.error || "Error desconocido";
    if (entry.status === "loading") return entry.input;
    if (entry.status !== "ok") return entry.input;
    return entry.source?.url || entry.input;
  }

  function renderScan() {
    if (!els.scanResults) return;

    const entries = state.scan;
    els.scanResults.innerHTML = entries
      .map((entry, index) => {
        const count = entry.files?.length || 0;
        const canImport = entry.status === "ok" && count > 0;
        const action = canImport
          ? `<button class="btn btn--small" type="button" data-scan-import="${index}">
               Importar ${count}
             </button>`
          : "";

        return `
          <div class="scan-row scan-row--${esc(entry.status || "pending")}">
            <iconify-icon icon="${scanIcon(entry)}"></iconify-icon>
            <span class="scan-row__text">
              <span class="scan-row__title">${esc(scanTitle(entry))}</span>
              <span class="scan-row__detail" title="${esc(scanDetail(entry))}">
                ${esc(scanDetail(entry))}
              </span>
            </span>
            ${action}
          </div>`;
      })
      .join("");

    const hasImportable = entries.some(
      (entry) => entry.status === "ok" && (entry.files?.length || 0) > 0
    );

    if (els.importAll) els.importAll.disabled = !hasImportable || state.scanning;
    if (els.scanSources) els.scanSources.disabled = state.scanning;
  }

  async function scanSources() {
    if (state.scanning) return;

    const raw = els.sourceInput?.value || "";
    const lines = raw
      .split(/\n+/)
      .map((line) => line.trim())
      .filter(Boolean);

    if (!lines.length) {
      toast("Pega al menos un enlace de Google Drive o una URL de imagen.", "warn");
      els.sourceInput?.focus();
      return;
    }

    if (!window.GCDrive?.isConfigured?.()) {
      if (els.driveGuide) els.driveGuide.hidden = false;
      toast("Falta la API key de Google Drive en assets/js/config.js.", "error");
      return;
    }

    state.scanning = true;
    state.scan = lines.map((input) => ({ input, status: "pending" }));
    renderScan();

    let ok = 0;
    let failed = 0;

    for (let index = 0; index < state.scan.length; index += 1) {
      const entry = state.scan[index];
      entry.status = "loading";
      renderScan();

      const result = await window.GCDrive.scanSource(entry.input);

      if (result?.ok) {
        state.scan[index] = { ...entry, ...result, status: "ok" };
        ok += 1;
      } else {
        state.scan[index] = {
          ...entry,
          status: "error",
          error: result?.error || "No se pudo leer el enlace."
        };
        failed += 1;
      }

      renderScan();
    }

    state.scanning = false;
    renderScan();

    if (!failed) {
      toast(`${ok} ${ok === 1 ? "fuente lista" : "fuentes listas"} para importar.`, "ok");
    } else if (ok) {
      toast(`${ok} fuentes listas · ${failed} con problemas.`, "warn");
    } else {
      toast("No se pudo leer ninguna fuente. Revisa los enlaces y la API key.", "error");
    }
  }

  /* ------------------------------------------------------------
     IMPORTACIÓN DE IMÁGENES
     Conserva los metadatos por fileId: si una obra ya existe, no
     se sobrescribe. Así puedes reimportar una carpeta sin perder
     títulos, fechas ni descripciones.
     ------------------------------------------------------------ */
  function nextOrder() {
    const works = state.manifest.works;
    if (!works.length) return 0;
    return Math.max(...works.map((work) => Number(work.sortOrder) || 0)) + 1;
  }

  function findExisting(candidate) {
    return state.manifest.works.find((work) => {
      if (candidate.fileId && work.fileId === candidate.fileId) return true;
      if (candidate.imageUrl && work.imageUrl === candidate.imageUrl) return true;
      return false;
    });
  }

  function importEntry(entry) {
    let added = 0;
    let skipped = 0;

    (entry.files || []).forEach((file) => {
      const candidate = window.GCDrive.workFromImport(file, entry.source);
      const existing = findExisting(candidate);

      if (existing) {
        skipped += 1;
        return;
      }

      candidate.sortOrder = nextOrder();
      state.manifest.works.push(candidate);
      added += 1;
    });

    if (added) ensureSource(entry.source);
    return { added, skipped };
  }

  function importScanAt(index) {
    const entry = state.scan[index];
    if (!entry || entry.status !== "ok") return;

    const { added, skipped } = importEntry(entry);

    if (!added && !skipped) {
      toast("Esa fuente no contiene imágenes.", "warn");
      return;
    }

    if (added) {
      state.origin = "draft";
      persistNow();
      renderSources();
      renderWorks();
      toast(
        `${added} ${added === 1 ? "obra importada" : "obras importadas"}${
          skipped ? ` · ${skipped} ya existían` : ""
        }.`,
        "ok"
      );
    } else {
      toast("Todas las imágenes de esa fuente ya estaban en el borrador.", "info");
    }
  }

  function importAllScanned() {
    let added = 0;
    let skipped = 0;

    state.scan.forEach((entry) => {
      if (entry.status !== "ok") return;
      const result = importEntry(entry);
      added += result.added;
      skipped += result.skipped;
    });

    if (!added) {
      toast(
        skipped
          ? "Todas las imágenes ya estaban en el borrador."
          : "No hay imágenes listas para importar.",
        skipped ? "info" : "warn"
      );
      return;
    }

    state.origin = "draft";
    persistNow();
    renderSources();
    renderWorks();
    toast(
      `${added} ${added === 1 ? "obra importada" : "obras importadas"}${
        skipped ? ` · ${skipped} ya existían` : ""
      }.`,
      "ok"
    );
  }

  /* ------------------------------------------------------------
     TARJETAS EDITABLES
     ------------------------------------------------------------ */
  function thumbFor(work) {
    const url = window.GCDrive?.imageUrlFor(work, 320) || work.imageUrl || "";
    return safeUrl(url);
  }

  function workMeta(work) {
    return [formatDate(work.date), work.technique, categoryLabel(work.category)]
      .filter(Boolean)
      .join(" · ");
  }

  function flagsFor(work) {
    const parts = [];
    parts.push(
      work.published !== false
        ? '<span class="badge badge--ok">Publicada</span>'
        : '<span class="badge badge--draft">Borrador</span>'
    );
    if (work.featured) parts.push('<span class="badge badge--accent">Destacada</span>');
    return parts.join("");
  }

  function categoryOptions(current) {
    const options = CATEGORIES.map(
      (item) =>
        `<option value="${esc(item.value)}" ${
          item.value === current ? "selected" : ""
        }>${esc(item.label)}</option>`
    );

    if (current && !CATEGORIES.some((item) => item.value === current)) {
      options.push(
        `<option value="${esc(current)}" selected>${esc(current)} (personalizada)</option>`
      );
    }

    return options.join("");
  }

  function workCard(work) {
    const image = thumbFor(work);
    const open = state.openId === work.id ? "open" : "";
    const featured = work.featured ? "checked" : "";
    const published = work.published !== false ? "checked" : "";

    return `
      <details class="admin-work ${work.published !== false ? "" : "is-draft"}"
               data-work-id="${esc(work.id)}" ${open}>
        <summary class="admin-work__summary">
          <span class="admin-thumb">
            ${
              image
                ? `<img src="${esc(image)}" alt="" loading="lazy" decoding="async">`
                : ""
            }
          </span>

          <span class="admin-work__id">
            <span class="admin-work__title">${esc(work.title || "Sin título")}</span>
            <span class="admin-work__meta">${esc(workMeta(work) || "Sin datos todavía")}</span>
          </span>

          <span class="admin-work__flags">${flagsFor(work)}</span>

          <span class="admin-work__tools">
            <button class="btn btn--small" type="button" data-action="up" data-id="${esc(
              work.id
            )}" title="Subir" aria-label="Subir ${esc(work.title || "obra")}">
              <iconify-icon icon="ph:arrow-up"></iconify-icon>
            </button>
            <button class="btn btn--small" type="button" data-action="down" data-id="${esc(
              work.id
            )}" title="Bajar" aria-label="Bajar ${esc(work.title || "obra")}">
              <iconify-icon icon="ph:arrow-down"></iconify-icon>
            </button>
          </span>
        </summary>

        <div class="admin-work__body">
          <div class="admin-form">
            <label class="field">
              <span>Título</span>
              <input type="text" data-field="title" value="${esc(
                work.title || ""
              )}" placeholder="Sin título">
            </label>

            <label class="field">
              <span>Año o fecha</span>
              <input type="text" data-field="date" value="${esc(
                work.date || ""
              )}" placeholder="2025 o 2025-04-12">
            </label>

            <label class="field">
              <span>Técnica</span>
              <input type="text" data-field="technique" value="${esc(
                work.technique || ""
              )}" placeholder="Carbón sobre papel">
            </label>

            <label class="field">
              <span>Medidas</span>
              <input type="text" data-field="dimensions" value="${esc(
                work.dimensions || ""
              )}" placeholder="100 × 125 cm">
            </label>

            <label class="field">
              <span>Categoría</span>
              <select data-field="category">${categoryOptions(work.category)}</select>
            </label>

            <label class="field">
              <span>Orden de curaduría</span>
              <input type="number" data-field="sortOrder" value="${Number(
                work.sortOrder
              ) || 0}" step="1">
            </label>

            <label class="field field--wide">
              <span>URL de imagen (Drive o enlace directo)</span>
              <input type="text" data-field="imageUrl" value="${esc(
                work.imageUrl || ""
              )}" placeholder="https://drive.google.com/thumbnail?id=…">
            </label>

            <label class="field field--wide">
              <span>Descripción</span>
              <textarea class="textarea" data-field="description" placeholder="Notas de la obra, serie o proceso">${esc(
                work.description || ""
              )}</textarea>
            </label>
          </div>

          <div class="admin-work__foot">
            <div class="admin-checks">
              <label class="check">
                <input type="checkbox" data-field="featured" ${featured}>
                Destacada
              </label>
              <label class="check">
                <input type="checkbox" data-field="published" ${published}>
                Publicada
              </label>
              <span class="mono">${esc(work.fileId ? `Drive · ${work.fileId}` : "Enlace local")}</span>
            </div>

            <div class="admin-actions">
              ${
                image
                  ? `<a class="btn btn--small" href="${esc(
                      image
                    )}" target="_blank" rel="noopener noreferrer">Ver imagen</a>`
                  : ""
              }
              <button class="btn btn--small btn--danger" type="button" data-action="remove" data-id="${esc(
                work.id
              )}">
                <iconify-icon icon="ph:trash"></iconify-icon>
                Eliminar
              </button>
            </div>
          </div>
        </div>
      </details>`;
  }

  function renderEmpty(message) {
    if (!els.worksEmpty) return;
    els.worksEmpty.hidden = false;
    els.worksEmpty.innerHTML = `
      <p class="mono">${state.filter ? "Sin coincidencias" : "Sin obra todavía"}</p>
      <p>${esc(message)}</p>`;
  }

  function renderWorks() {
    if (!els.worksList) return;

    const all = state.manifest?.works || [];
    const query = normalize(state.filter);

    const filtered = window.GCManifest
      .sortedWorks(all)
      .filter((work) => {
        if (!query) return true;
        return normalize(
          [work.title, work.technique, work.date, work.description, categoryLabel(work.category)].join(
            " "
          )
        ).includes(query);
      });

    if (!all.length) {
      els.worksList.innerHTML = "";
      renderEmpty(
        "Pega enlaces de Drive en Fuentes o carga las 32 obras de demostración desde Publicar."
      );
      return;
    }

    if (!filtered.length) {
      els.worksList.innerHTML = "";
      renderEmpty("Ninguna obra coincide con esa búsqueda. Prueba con otro término.");
      return;
    }

    if (els.worksEmpty) els.worksEmpty.hidden = true;
    els.worksList.innerHTML = filtered.map(workCard).join("");

    // Después de re-renderizar, enfocamos la obra recién creada.
    if (state.focusId) {
      const card = els.worksList.querySelector(
        `[data-work-id="${CSS.escape(state.focusId)}"]`
      );
      state.focusId = null;
      if (card) {
        card.open = true;
        const input = card.querySelector('[data-field="title"]');
        input?.focus();
        input?.select?.();
      }
    }
  }

  /* Actualiza la tarjeta sin volver a pintar toda la lista: así el
     cursor no salta mientras se escribe. */
  function updateCard(card, work) {
    if (!card || !work) return;

    card.classList.toggle("is-draft", work.published === false);

    const title = $(".admin-work__title", card);
    if (title) title.textContent = work.title || "Sin título";

    const meta = $(".admin-work__meta", card);
    if (meta) meta.textContent = workMeta(work) || "Sin datos todavía";

    const flags = $(".admin-work__flags", card);
    if (flags) flags.innerHTML = flagsFor(work);

    const thumb = $(".admin-thumb img", card);
    const src = thumbFor(work);
    if (thumb && src) thumb.src = src;
  }

  function findWork(id) {
    return state.manifest.works.find((work) => work.id === id);
  }

  function reorder(id, direction) {
    const ordered = window.GCManifest.sortedWorks(state.manifest.works);
    const index = ordered.findIndex((work) => work.id === id);
    const target = index + direction;

    if (index < 0 || target < 0 || target >= ordered.length) return;

    [ordered[index], ordered[target]] = [ordered[target], ordered[index]];
    ordered.forEach((work, position) => {
      work.sortOrder = position;
    });

    persistNow();
    renderWorks();
  }

  function removeWork(id) {
    const work = findWork(id);
    if (!work) return;

    const label = work.title || "esta obra";
    if (!window.confirm(`¿Eliminar «${label}» del borrador? Esta acción no toca el archivo ya publicado.`)) {
      return;
    }

    state.manifest.works = state.manifest.works.filter((item) => item.id !== id);
    state.manifest.works.forEach((item, index) => {
      item.sortOrder = index;
    });

    persistNow();
    renderWorks();
    renderSources();
    toast("Obra eliminada del borrador.", "ok");
  }

  function handleField(event) {
    const target = event.target.closest("[data-field]");
    if (!target) return;

    const card = target.closest("[data-work-id]");
    const work = card ? findWork(card.dataset.workId) : null;
    if (!work) return;

    const field = target.dataset.field;

    if (target.type === "checkbox") {
      work[field] = target.checked;
    } else if (target.type === "number") {
      work[field] = Number(target.value) || 0;
    } else {
      work[field] = target.value;
    }

    updateCard(card, work);
    updateStats();
    scheduleSave();
  }

  function handleWorkClick(event) {
    const button = event.target.closest("[data-action]");
    if (!button) return;

    // Los botones viven dentro de <summary>: evitamos que el
    // navegador abra o cierre la ficha al pulsarlos.
    event.preventDefault();
    event.stopPropagation();

    const id = button.dataset.id;
    if (!id) return;

    if (button.dataset.action === "remove") removeWork(id);
    if (button.dataset.action === "up") reorder(id, -1);
    if (button.dataset.action === "down") reorder(id, 1);
  }

  function addManualWork() {
    const id = `w_manual_${Date.now().toString(36)}`;

    state.manifest.works.push({
      id,
      fileId: "",
      imageUrl: "",
      sourceId: "manual",
      sourceName: "Manual",
      sourceType: "manual",
      title: "Nueva obra",
      date: "",
      technique: "",
      dimensions: "",
      category: "dibujo",
      description: "",
      featured: false,
      published: false,
      sortOrder: nextOrder(),
      width: 0,
      height: 0,
      addedAt: new Date().toISOString()
    });

    state.openId = id;
    state.focusId = id;
    state.origin = "draft";
    persistNow();
    renderWorks();
    toast("Ficha vacía añadida. Completa sus datos y marca «Publicada».", "ok");
  }

  /* ------------------------------------------------------------
     PUBLICACIÓN E IMPORTACIÓN
     ------------------------------------------------------------ */
  function downloadManifest() {
    if (!state.manifest.works.length) {
      const proceed = window.confirm(
        "No hay obras en el borrador. ¿Descargar un archivo vacío para mostrar la sala en preparación?"
      );
      if (!proceed) return;
    }

    persistNow();
    window.GCManifest.download(state.manifest);
    toast(`${MANIFEST_PATH} generado. Colócalo en assets/data/.`, "ok");
  }

  async function copyManifest() {
    try {
      await window.GCManifest.copy(state.manifest);
      toast("JSON copiado al portapapeles.", "ok");
    } catch (error) {
      toast("El navegador no permitió copiar. Usa «Descargar JSON».", "error");
    }
  }

  async function importManifestFile(file) {
    if (!file) return;

    try {
      const manifest = await window.GCManifest.parseFile(file);
      state.manifest = manifest;
      state.origin = "draft";
      state.scan = [];
      state.openId = null;
      persistNow();
      renderScan();
      renderWorks();
      renderSources();
      toast(
        `Archivo importado: ${manifest.works.length} ${
          manifest.works.length === 1 ? "obra" : "obras"
        }.`,
        "ok"
      );
    } catch (error) {
      toast(error.message || "No se pudo leer el archivo JSON.", "error");
    }
  }

  function loadDemo() {
    if (
      !window.confirm(
        "Esto reemplaza el borrador actual con las 32 obras de demostración. ¿Continuar?"
      )
    ) {
      return;
    }

    const works = window.GCManifest.demoWorks().map((work, index) => ({
      ...work,
      sortOrder: index,
      sourceId: "demo",
      sourceName: "Demostración",
      sourceType: "demo"
    }));

    state.manifest = {
      ...window.GCManifest.empty(),
      works,
      sources: [
        {
          id: "demo",
          type: "demo",
          title: "Obras de demostración",
          url: "",
          input: "",
          addedAt: new Date().toISOString()
        }
      ]
    };

    state.origin = "draft";
    state.scan = [];
    state.openId = null;
    persistNow();
    renderScan();
    renderWorks();
    renderSources();
    toast("32 obras de demostración cargadas.", "ok");
  }

  function clearDraft() {
    if (
      !window.confirm(
        "Se vaciará el borrador de este navegador. El galeria.json ya publicado no se modifica. ¿Continuar?"
      )
    ) {
      return;
    }

    window.GCManifest.clearDraft();
    state.manifest = window.GCManifest.empty();
    state.scan = [];
    state.filter = "";
    state.openId = null;
    state.origin = "empty";
    state.dirty = false;

    if (els.workSearch) els.workSearch.value = "";

    renderScan();
    renderWorks();
    renderSources();
    updateMeta();
    updateStats();
    toast("Borrador vaciado. El sitio conserva su último archivo publicado.", "ok");
  }

  /* ------------------------------------------------------------
     EVENTOS
     ------------------------------------------------------------ */
  function bindEvents() {
    els.scanSources?.addEventListener("click", scanSources);
    els.importAll?.addEventListener("click", importAllScanned);

    els.clearInput?.addEventListener("click", () => {
      if (els.sourceInput) els.sourceInput.value = "";
      state.scan = [];
      renderScan();
      els.sourceInput?.focus();
    });

    els.scanResults?.addEventListener("click", (event) => {
      const button = event.target.closest("[data-scan-import]");
      if (!button) return;
      importScanAt(Number(button.dataset.scanImport));
    });

    els.sourcesList?.addEventListener("click", (event) => {
      const button = event.target.closest("[data-source-remove]");
      if (!button) return;

      const id = button.dataset.sourceRemove;
      state.manifest.sources = state.manifest.sources.filter((source) => source.id !== id);
      persistNow();
      renderSources();
      updateStats();
      toast("Fuente quitada de la lista. Las obras importadas se conservan.", "ok");
    });

    els.worksList?.addEventListener("input", handleField);
    els.worksList?.addEventListener("change", handleField);
    els.worksList?.addEventListener("click", handleWorkClick);

    let filterTimer = null;
    els.workSearch?.addEventListener("input", () => {
      clearTimeout(filterTimer);
      filterTimer = setTimeout(() => {
        state.filter = els.workSearch.value;
        renderWorks();
      }, 140);
    });

    els.addManual?.addEventListener("click", addManualWork);

    els.publishDownload?.addEventListener("click", downloadManifest);
    els.publishCopy?.addEventListener("click", copyManifest);

    els.importJson?.addEventListener("click", () => els.importFile?.click());
    els.importFile?.addEventListener("change", () => {
      const file = els.importFile.files?.[0];
      importManifestFile(file);
      els.importFile.value = "";
    });

    els.loadDemo?.addEventListener("click", loadDemo);
    els.clearDraft?.addEventListener("click", clearDraft);

    // Guarda cualquier cambio pendiente antes de cerrar la pestaña.
    // saveDraft es síncrono, así que no hace falta bloquear el cierre.
    window.addEventListener("beforeunload", () => {
      if (state.saveTimer) persistNow();
    });
  }

  /* ------------------------------------------------------------
     ARRANQUE
     ------------------------------------------------------------ */
  function cacheElements() {
    els.adminUpdated = $("#admin-updated");
    els.statTotal = $("#stat-total");
    els.statPublished = $("#stat-published");
    els.statDrafts = $("#stat-drafts");
    els.statSources = $("#stat-sources");
    els.worksBadge = $("#works-badge");
    els.sourceCount = $("#source-count");
    els.apiStatus = $("#api-status");
    els.apiDetail = $("#api-detail");
    els.driveGuide = $("#drive-guide");

    els.sourceInput = $("#source-input");
    els.scanSources = $("#scan-sources");
    els.importAll = $("#import-all");
    els.clearInput = $("#clear-input");
    els.scanResults = $("#scan-results");
    els.sourcesLabel = $("#sources-label");
    els.sourcesList = $("#sources-list");

    els.workSearch = $("#work-search");
    els.addManual = $("#add-manual");
    els.worksList = $("#works-list");
    els.worksEmpty = $("#works-empty");

    els.publishStatus = $("#publish-status");
    els.publishDownload = $("#publish-download");
    els.publishCopy = $("#publish-copy");
    els.importJson = $("#import-json");
    els.importFile = $("#import-file");
    els.loadDemo = $("#load-demo");
    els.clearDraft = $("#clear-draft");

    els.toasts = $("#toasts");
  }

  async function init() {
    // Fuera de local no se arranca nada: admin.css muestra el aviso.
    if (document.documentElement.classList.contains("is-remote")) return;

    cacheElements();
    bindEvents();
    renderApiStatus();

    let draft = null;
    try {
      draft = window.GCManifest.loadDraft();
    } catch (error) {
      draft = null;
    }

    if (draft) {
      state.manifest = draft;
      state.origin = "draft";
    } else {
      let published = null;
      try {
        published = await window.GCManifest.loadPublished(MANIFEST_PATH);
      } catch (error) {
        published = null;
      }

      if (published) {
        state.manifest = published;
        state.origin = "published";
      } else {
        state.manifest = window.GCManifest.empty();
        state.origin = "empty";
      }
    }

    updateMeta();
    updateStats();
    renderWorks();
    renderSources();
    renderScan();

    if (!state.manifest.works.length && state.origin === "empty") {
      toast("Panel listo. Importa una carpeta o carga la demostración para empezar.", "info");
    }
  }

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", init);
  } else {
    init();
  }
})();
