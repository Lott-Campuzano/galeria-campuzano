/* ============================================================
   Google Drive + enlaces externos
   ------------------------------------------------------------
   - Lee SOLO las carpetas / archivos que se pegan en el panel.
   - No recorre el Drive completo ni pide OAuth: usa una API key
     pública restringida (config.js → drive.apiKey).
   - No usa librerías externas.

   Flujo: pegar enlace → parseLink → scanSource → lista de
   archivos → workFromImport crea la ficha de cada obra.
   ============================================================ */
(function () {
  const CFG = window.GC_CONFIG || {};
  const D = CFG.drive || {};
  const API = "https://www.googleapis.com/drive/v3";
  const IMAGE_EXT = /\.(jpe?g|png|webp|avif|gif|bmp|tiff?)$/i;

  /* Error con código propio para que el panel distinga «falta la
     key» de «carpeta privada» o «sin conexión». */
  class DriveError extends Error {
    constructor(message, code, detail) {
      super(message);
      this.name = "DriveError";
      this.code = code;
      this.detail = detail;
    }
  }

  function apiKey() {
    return String(D.apiKey || "").trim();
  }

  function isConfigured() {
    return apiKey().length > 20;
  }

  /* Miniaturas públicas: no necesitan key y son lo que usa el
     sitio en producción para mostrar las imágenes. */
  function thumbnail(fileId, size = 2000) {
    if (!fileId) return "";
    return `https://drive.google.com/thumbnail?id=${encodeURIComponent(fileId)}&sz=w${size}`;
  }

  function folderUrl(folderId) {
    return `https://drive.google.com/drive/folders/${folderId}`;
  }

  /* Traduce los códigos HTTP de Google a mensajes entendibles. */
  function driveErrorFromResponse(res, data) {
    const detail = data?.error?.message || `Error ${res.status}`;
    if (res.status === 400) {
      return new DriveError(
        "La API key no es válida o está restringida. Revisa config.js y las restricciones en Google Cloud.",
        "BAD_KEY",
        detail
      );
    }
    if (res.status === 401) {
      return new DriveError("Google rechazó la solicitud. Revisa tu API key.", "UNAUTHORIZED", detail);
    }
    if (res.status === 403) {
      return new DriveError(
        "Sin permiso para leer esa carpeta. Compártela como «Cualquiera con el enlace» y verifica que la API key tenga activa Google Drive API.",
        "FORBIDDEN",
        detail
      );
    }
    if (res.status === 404) {
      return new DriveError(
        "No se encontró la carpeta. Comprueba el enlace y que siga compartida como «Cualquiera con el enlace».",
        "NOT_FOUND",
        detail
      );
    }
    return new DriveError("Google Drive no respondió correctamente.", "DRIVE_ERROR", detail);
  }

  /* Única puerta a la red de Drive: añade la key y normaliza
     los errores. */
  async function driveFetch(path, params) {
    if (!isConfigured()) {
      throw new DriveError(
        "Falta la API key de Google Drive. Agrégala en assets/js/config.js y recarga la página.",
        "NO_KEY"
      );
    }
    const url = new URL(API + path);
    Object.entries(params || {}).forEach(([k, v]) => {
      if (v !== undefined && v !== null && v !== "") url.searchParams.set(k, v);
    });
    url.searchParams.set("key", apiKey());

    let res;
    try {
      res = await fetch(url.toString(), { cache: "no-store" });
    } catch (error) {
      throw new DriveError(
        "No se pudo conectar con Google Drive. Revisa tu conexión a internet.",
        "NETWORK",
        error.message
      );
    }
    const data = await res.json().catch(() => null);
    if (!res.ok) throw driveErrorFromResponse(res, data);
    return data;
  }

  /* Clasifica lo que el usuario pegó. Acepta carpetas y archivos
     de Drive, IDs sueltos y enlaces directos a imágenes; explica
     por qué Google Fotos o iCloud no se pueden leer. */
  function parseLink(raw) {
    const input = String(raw || "").trim();
    if (!input) return null;

    if (/photos\.app\.goo\.gl|photos\.google\.com\/share/i.test(input)) {
      return {
        type: "unsupported",
        raw: input,
        reason:
          "Google Fotos no permite leer álbumes compartidos desde una web. Descarga las fotos y súbelas a una carpeta pública de Drive, o pega enlaces directos a las imágenes."
      };
    }
    if (/icloud\.com|share\.icloud/i.test(input)) {
      return {
        type: "unsupported",
        raw: input,
        reason:
          "iCloud no ofrece una API pública para leer álbumes o iCloud Drive desde el navegador. Descarga las fotos desde iCloud/Fotos y colócalas en una carpeta pública de Drive."
      };
    }

    const folder = input.match(/\/folders\/([a-zA-Z0-9_-]{10,})/);
    if (folder) return { type: "folder", id: folder[1], raw: input };

    const file = input.match(/\/file\/d\/([a-zA-Z0-9_-]{10,})/);
    if (file) return { type: "file", id: file[1], raw: input };

    const idParam = input.match(/[?&]id=([a-zA-Z0-9_-]{10,})/);
    if (idParam) return { type: "unknown", id: idParam[1], raw: input };

    if (/^[a-zA-Z0-9_-]{15,}$/.test(input) && !input.includes(".")) {
      return { type: "unknown", id: input, raw: input };
    }

    if (IMAGE_EXT.test(input.split("?")[0]) || /googleusercontent\.com|images\.unsplash\.com/i.test(input)) {
      return { type: "image", url: input, raw: input };
    }

    return {
      type: "unsupported",
      raw: input,
      reason:
        "Enlace no reconocido. Usa el enlace de una carpeta de Google Drive, un archivo de Drive o un enlace directo a una imagen."
    };
  }

  /* Lista imágenes de una carpeta. El límite de 6 páginas evita
     bloquear el navegador con carpetas enormes. */
  async function listFolder(folderId) {
    const files = [];
    let pageToken = "";
    let pages = 0;
    do {
      const data = await driveFetch("/files", {
        q: `'${folderId}' in parents and trashed = false and mimeType contains 'image/'`,
        fields:
          "nextPageToken,files(id,name,mimeType,size,createdTime,modifiedTime,imageMediaMetadata(width,height,time))",
        pageSize: 1000,
        orderBy: "name_natural",
        pageToken
      });
      (data.files || []).forEach((file) => files.push(file));
      pageToken = data.nextPageToken || "";
      pages += 1;
    } while (pageToken && pages < 6);
    return files;
  }

  async function getFile(fileId) {
    return driveFetch(`/files/${encodeURIComponent(fileId)}`, {
      fields: "id,name,mimeType,size,createdTime,modifiedTime,imageMediaMetadata(width,height,time)"
    });
  }

  async function resolveTarget(parsed) {
    if (parsed.type === "folder" || parsed.type === "file") return parsed;
    if (parsed.type !== "unknown") return parsed;
    const file = await getFile(parsed.id);
    const type = file.mimeType === "application/vnd.google-apps.folder" ? "folder" : "file";
    return { ...parsed, type, file };
  }

  async function scanSource(raw, options = {}) {
    const parsed = parseLink(raw);
    if (!parsed) return null;
    if (parsed.type === "unsupported") {
      return { ok: false, input: raw, error: parsed.reason };
    }

    try {
      if (parsed.type === "image") {
        return {
          ok: true,
          source: { id: `img_${hash(raw)}`, type: "image", url: raw, input: raw, title: "Imagen externa" },
          files: [{ type: "image", url: raw, name: raw.split("/").pop() || "imagen", id: `img_${hash(raw)}` }]
        };
      }

      const target = await resolveTarget(parsed);
      if (target.type === "folder") {
        const files = await listFolder(target.id);
        return {
          ok: true,
          source: {
            id: target.id,
            type: "folder",
            folderId: target.id,
            url: folderUrl(target.id),
            input: raw,
            title: files.length ? `${files.length} imagen${files.length === 1 ? "" : "es"}` : "Carpeta vacía"
          },
          files: files.map((file) => ({ ...file, type: "drive" }))
        };
      }

      const file = target.file || (await getFile(target.id));
      if (!String(file.mimeType || "").startsWith("image/")) {
        return {
          ok: false,
          input: raw,
          error: "Ese archivo de Drive no es una imagen. Usa una carpeta o un archivo JPG, PNG, WEBP…"
        };
      }
      return {
        ok: true,
        source: {
          id: file.id,
          type: "file",
          fileId: file.id,
          url: `https://drive.google.com/file/d/${file.id}/view`,
          input: raw,
          title: prettifyName(file.name)
        },
        files: [{ ...file, type: "drive" }]
      };
    } catch (error) {
      return { ok: false, input: raw, error: error.message, code: error.code };
    }
  }

  function hash(str) {
    let h = 2166136261;
    for (let i = 0; i < str.length; i++) {
      h ^= str.charCodeAt(i);
      h = Math.imul(h, 16777619);
    }
    return (h >>> 0).toString(36);
  }

  function prettifyName(name) {
    const clean = String(name || "Sin título")
      .replace(/\.[^.]+$/, "")
      .replace(/[_-]+/g, " ")
      .replace(/\s+/g, " ")
      .trim();
    if (!clean) return "Sin título";
    return clean.charAt(0).toUpperCase() + clean.slice(1);
  }

  function dateFromFile(file) {
    const raw = file?.imageMediaMetadata?.time || file?.createdTime || file?.modifiedTime || "";
    return raw ? raw.slice(0, 10) : "";
  }

  /* Convierte un archivo de Drive o un enlace externo en la ficha
     que espera el manifiesto. Los metadatos editoriales quedan
     vacíos para rellenarlos en el panel. */
  function workFromImport(file, source, defaults = {}) {
    const isExternal = file.type === "image";
    const id = isExternal ? `w_${file.id}` : `w_${file.id}`;
    return {
      id,
      fileId: isExternal ? "" : file.id,
      imageUrl: isExternal ? file.url : "",
      sourceId: source?.id || "",
      sourceName: source?.type === "folder" ? "Google Drive" : source?.type === "image" ? "Enlace externo" : "Google Drive",
      sourceType: source?.type || "drive",
      title: defaults.title || prettifyName(file.name),
      date: dateFromFile(file),
      technique: "",
      dimensions: "",
      category: defaults.category || "dibujo",
      description: "",
      featured: false,
      published: true,
      sortOrder: 0,
      width: Number(file.imageMediaMetadata?.width || file.width || 0) || 0,
      height: Number(file.imageMediaMetadata?.height || file.height || 0) || 0,
      addedAt: new Date().toISOString()
    };
  }

  /* URL final de la imagen: local o externa si existe; si no,
     miniatura de Drive. */
  function imageUrlFor(work, size = 2000) {
    if (work.imageUrl) return work.imageUrl;
    if (work.fileId) return thumbnail(work.fileId, size);
    return "";
  }

  /* Mide la imagen cargándola en memoria; si falla devuelve 0 y la
     tarjeta usa una proporción por defecto. */
  async function probeImage(url) {
    return new Promise((resolve) => {
      const img = new Image();
      img.decoding = "async";
      img.onload = () => resolve({ width: img.naturalWidth, height: img.naturalHeight });
      img.onerror = () => resolve({ width: 0, height: 0 });
      img.src = url;
    });
  }

  window.GCDrive = {
    DriveError,
    isConfigured,
    parseLink,
    scanSource,
    thumbnail,
    folderUrl,
    imageUrlFor,
    workFromImport,
    prettifyName,
    dateFromFile,
    probeImage,
    listFolder,
    getFile
  };
})();
