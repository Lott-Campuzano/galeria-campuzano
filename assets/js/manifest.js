/* ============================================================
   Manifiesto de la galería
   El panel guarda un borrador local y exporta galeria.json.
   La galería pública lee ese archivo, sin tocar Drive en vivo.
   ============================================================ */
(function () {
  const CFG = window.GC_CONFIG || {};
  const STORAGE_KEY = "gc.gallery.draft.v1";

  const WORK_DEFAULTS = {
    id: "",
    fileId: "",
    imageUrl: "",
    sourceId: "",
    sourceName: "",
    sourceType: "",
    title: "Sin título",
    date: "",
    technique: "",
    dimensions: "",
    category: "dibujo",
    description: "",
    featured: false,
    published: true,
    sortOrder: 0,
    width: 0,
    height: 0,
    addedAt: ""
  };

  function empty() {
    return { version: 1, gallery: "Galería Campuzano", updatedAt: null, sources: [], works: [] };
  }

  function normalize(data) {
    if (!data || typeof data !== "object") return empty();
    const works = (Array.isArray(data.works) ? data.works : [])
      .filter((w) => w && typeof w === "object" && (w.fileId || w.imageUrl || w.id))
      .map((w, index) => ({
        ...WORK_DEFAULTS,
        ...w,
        id: w.id || `w_${w.fileId || index}`,
        title: String(w.title || "Sin título"),
        sortOrder: Number.isFinite(Number(w.sortOrder)) ? Number(w.sortOrder) : index,
        width: Number(w.width) || 0,
        height: Number(w.height) || 0,
        featured: Boolean(w.featured),
        published: w.published !== false
      }));
    const sources = (Array.isArray(data.sources) ? data.sources : [])
      .filter((s) => s && typeof s === "object")
      .map((s) => ({
        id: String(s.id || ""),
        type: s.type || "folder",
        folderId: s.folderId || "",
        fileId: s.fileId || "",
        url: s.url || "",
        input: s.input || "",
        title: s.title || "",
        addedAt: s.addedAt || ""
      }));
    return {
      version: 1,
      gallery: data.gallery || "Galería Campuzano",
      updatedAt: data.updatedAt || null,
      sources,
      works
    };
  }

  function sortedWorks(works) {
    return [...works].sort((a, b) => {
      const order = Number(a.sortOrder) - Number(b.sortOrder);
      if (order !== 0) return order;
      return String(b.addedAt || "").localeCompare(String(a.addedAt || ""));
    });
  }

  async function loadPublished(path) {
    const url = path || CFG.gallery?.manifest || "assets/data/galeria.json";
    let res;
    try {
      res = await fetch(`${url}${url.includes("?") ? "&" : "?"}v=${Date.now()}`, {
        cache: "no-store"
      });
    } catch (error) {
      return null;
    }
    if (!res.ok) return null;
    const data = await res.json().catch(() => null);
    if (!data || !Array.isArray(data.works)) return null;
    return normalize(data);
  }

  function loadDraft() {
    try {
      const raw = localStorage.getItem(STORAGE_KEY);
      if (!raw) return null;
      const data = JSON.parse(raw);
      if (!data || !Array.isArray(data.works)) return null;
      return normalize(data);
    } catch (error) {
      return null;
    }
  }

  function saveDraft(manifest) {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(manifest));
      return true;
    } catch (error) {
      return false;
    }
  }

  function clearDraft() {
    try {
      localStorage.removeItem(STORAGE_KEY);
    } catch (error) {
      /* sin almacenamiento disponible */
    }
  }

  function copyPayload(manifest) {
    return JSON.stringify(
      {
        ...normalize(manifest),
        updatedAt: new Date().toISOString()
      },
      null,
      2
    );
  }

  function download(manifest) {
    const payload = copyPayload(manifest);
    const blob = new Blob([payload], { type: "application/json" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = "galeria.json";
    document.body.appendChild(a);
    a.click();
    a.remove();
    setTimeout(() => URL.revokeObjectURL(url), 2000);
    return payload;
  }

  async function copy(manifest) {
    const payload = copyPayload(manifest);
    await navigator.clipboard.writeText(payload);
    return payload;
  }

  async function parseFile(file) {
    const text = await file.text();
    const data = JSON.parse(text);
    if (!data || !Array.isArray(data.works)) {
      throw new Error("El archivo no contiene una lista de obras válida.");
    }
    return normalize(data);
  }

  function publicWorks(manifest) {
    return sortedWorks((manifest?.works || []).filter((w) => w.published !== false));
  }

  function demoWorks() {
    return (window.GC_SEED || []).map((w, index) => ({
      ...WORK_DEFAULTS,
      ...w,
      sortOrder: w.sortOrder ?? index,
      imageUrl: w.imageUrl || w.image_url || "",
      published: w.published !== false
    }));
  }

  window.GCManifest = {
    STORAGE_KEY,
    empty,
    normalize,
    sortedWorks,
    publicWorks,
    demoWorks,
    loadPublished,
    loadDraft,
    saveDraft,
    clearDraft,
    download,
    copy,
    parseFile,
    copyPayload
  };
})();
