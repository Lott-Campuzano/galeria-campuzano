/* ============================================================
   Paletas dinámicas a partir de cada obra.
   Extrae color con canvas y lo aplica como acento ambiental
   (estilo Apple Music) sin romper la base hueso/carbón.
   ============================================================ */
(function () {
  const cache = new Map();

  /* Paleta de respaldo: el coral de la identidad de Lott.
     Se usa antes de leer la primera imagen o si el manifiesto
     está vacío. */
  const DEFAULTS = {
    accent: "#e2542f",
    soft: "#f2ab9b",
    deep: "#8f2f1c",
    tint: "#fbe9e4",
    contrast: "#fffaf3"
  };

  function hash(str) {
    let h = 2166136261;
    for (let i = 0; i < str.length; i++) {
      h ^= str.charCodeAt(i);
      h = Math.imul(h, 16777619);
    }
    return h >>> 0;
  }

  /* Acentos de respaldo tomados de las paletas de sus proyectos
     en Dribbble: coral, ámbar, índigo, cian, vino, violeta, teal,
     rojo, azul y oliva. Se eligen de forma determinista. */
  const FALLBACK_ACCENTS = [
    "#e2542f", "#b4691f", "#4b4b8f", "#2a8ea6",
    "#8a3b62", "#6a4b8f", "#2f6b5e", "#b03a34",
    "#3d5d8a", "#6f7445"
  ];

  const clamp = (n, min, max) => Math.min(max, Math.max(min, n));

  function rgbToHex(r, g, b) {
    const h = (n) => clamp(Math.round(n), 0, 255).toString(16).padStart(2, "0");
    return `#${h(r)}${h(g)}${h(b)}`;
  }

  function hexToRgb(hex) {
    const clean = hex.replace("#", "");
    const full = clean.length === 3 ? clean.split("").map((c) => c + c).join("") : clean;
    return {
      r: parseInt(full.slice(0, 2), 16),
      g: parseInt(full.slice(2, 4), 16),
      b: parseInt(full.slice(4, 6), 16)
    };
  }

  function rgbToHsl(r, g, b) {
    r /= 255; g /= 255; b /= 255;
    const max = Math.max(r, g, b);
    const min = Math.min(r, g, b);
    let h = 0;
    let s = 0;
    const l = (max + min) / 2;
    if (max !== min) {
      const d = max - min;
      s = l > 0.5 ? d / (2 - max - min) : d / (max + min);
      switch (max) {
        case r: h = (g - b) / d + (g < b ? 6 : 0); break;
        case g: h = (b - r) / d + 2; break;
        default: h = (r - g) / d + 4;
      }
      h /= 6;
    }
    return { h: h * 360, s, l };
  }

  function hslToHex(h, s, l) {
    h = ((h % 360) + 360) % 360;
    s = clamp(s, 0, 1);
    l = clamp(l, 0, 1);
    const c = (1 - Math.abs(2 * l - 1)) * s;
    const x = c * (1 - Math.abs(((h / 60) % 2) - 1));
    const m = l - c / 2;
    let r, g, b;
    if (h < 60) { r = c; g = x; b = 0; }
    else if (h < 120) { r = x; g = c; b = 0; }
    else if (h < 180) { r = 0; g = c; b = x; }
    else if (h < 240) { r = 0; g = x; b = c; }
    else if (h < 300) { r = x; g = 0; b = c; }
    else { r = c; g = 0; b = x; }
    return rgbToHex((r + m) * 255, (g + m) * 255, (b + m) * 255);
  }

  function luminance(hex) {
    const { r, g, b } = hexToRgb(hex);
    const channel = (v) => {
      v /= 255;
      return v <= 0.03928 ? v / 12.92 : Math.pow((v + 0.055) / 1.055, 2.4);
    };
    return 0.2126 * channel(r) + 0.7152 * channel(g) + 0.0722 * channel(b);
  }

  function mix(hexA, hexB, amount) {
    const a = hexToRgb(hexA);
    const b = hexToRgb(hexB);
    return rgbToHex(
      a.r + (b.r - a.r) * amount,
      a.g + (b.g - a.g) * amount,
      a.b + (b.b - a.b) * amount
    );
  }

  function tuneAccent(hex) {
    const { h, s, l } = rgbToHsl(...Object.values(hexToRgb(hex)));
    let sat = s;
    let light = l;
    if (sat < 0.16) {
      // Obras casi monocromas: acento pizarra cálido, no un gris muerto.
      return hslToHex(205, 0.16, 0.4);
    }
    sat = clamp(sat * 0.9 + 0.12, 0.28, 0.68);
    if (light > 0.62) light = 0.42;
    if (light < 0.22) light = 0.32;
    return hslToHex(h, sat, light);
  }

  function paletteFrom(hex) {
    const accent = tuneAccent(hex);
    return {
      accent,
      soft: mix(accent, "#faf8f3", 0.82),
      deep: mix(accent, "#0d0d0d", 0.36),
      tint: mix(accent, "#faf8f3", 0.93),
      contrast: luminance(accent) > 0.44 ? "#0d0d0d" : "#fffaf3"
    };
  }

  function fallbackPalette(seed) {
    const accent = FALLBACK_ACCENTS[hash(String(seed)) % FALLBACK_ACCENTS.length];
    return paletteFrom(accent);
  }

  function extractFromPixels(data) {
    const buckets = new Map();
    for (let i = 0; i < data.length; i += 4) {
      const a = data[i + 3];
      if (a < 160) continue;
      const r = data[i];
      const g = data[i + 1];
      const b = data[i + 2];
      const { h, s, l } = rgbToHsl(r, g, b);
      // Descartamos extremos (papel quemado y negros de sombra).
      if (l < 0.06 || l > 0.94) continue;
      const key = `${Math.round(h / 22)}-${Math.round(s * 8)}-${Math.round(l * 8)}`;
      const prev = buckets.get(key);
      const weight = 1 + s * 2.2;
      if (prev) {
        prev.r += r * weight;
        prev.g += g * weight;
        prev.b += b * weight;
        prev.w += weight;
        prev.n += 1;
      } else {
        buckets.set(key, { r: r * weight, g: g * weight, b: b * weight, w: weight, n: 1, h, s, l });
      }
    }

    const candidates = [...buckets.values()]
      .map((bucket) => {
        const r = bucket.r / bucket.w;
        const g = bucket.g / bucket.w;
        const b = bucket.b / bucket.w;
        const hsl = rgbToHsl(r, g, b);
        const count = bucket.n;
        const score =
          count *
          (0.35 + hsl.s * 1.8) *
          (1 - Math.abs(hsl.l - 0.48) * 0.85) *
          (hsl.l > 0.1 && hsl.l < 0.9 ? 1 : 0.35);
        return { hex: rgbToHex(r, g, b), score, count, ...hsl };
      })
      .sort((a, b) => b.score - a.score);

    if (!candidates.length) return null;

    const colorful = candidates.filter((c) => c.s > 0.16 && c.l > 0.14 && c.l < 0.86);
    const chosen = colorful[0] || candidates[0];
    return paletteFrom(chosen.hex);
  }

  function readImage(url) {
    return new Promise((resolve, reject) => {
      const img = new Image();
      img.crossOrigin = "anonymous";
      img.decoding = "async";
      img.onload = () => resolve(img);
      img.onerror = () => reject(new Error("No se pudo leer la imagen"));
      img.src = url;
    });
  }

  async function fromImage(url) {
    if (!url) return { ...DEFAULTS };
    if (cache.has(url)) return cache.get(url);

    try {
      const img = await readImage(url);
      const size = 56;
      const canvas = document.createElement("canvas");
      canvas.width = size;
      canvas.height = size;
      const ctx = canvas.getContext("2d", { willReadFrequently: true });
      ctx.drawImage(img, 0, 0, size, size);
      const { data } = ctx.getImageData(0, 0, size, size);
      const palette = extractFromPixels(data) || fallbackPalette(url);
      cache.set(url, palette);
      return palette;
    } catch (error) {
      // Drive/otros CDN sin CORS: paleta estable derivada del identificador.
      const palette = fallbackPalette(url);
      cache.set(url, palette);
      return palette;
    }
  }

  function apply(palette, target = document.documentElement) {
    if (!palette) return;
    const p = { ...DEFAULTS, ...palette };
    target.style.setProperty("--dyn", p.accent);
    target.style.setProperty("--dyn-soft", p.soft);
    target.style.setProperty("--dyn-deep", p.deep);
    target.style.setProperty("--dyn-tint", p.tint);
    target.style.setProperty("--dyn-contrast", p.contrast);
    target.style.setProperty("--dyn-rgb", Object.values(hexToRgb(p.accent)).join(", "));
    target.dataset.palette = p.accent.replace("#", "");
  }

  async function applyForImage(url, target) {
    const palette = await fromImage(url);
    apply(palette, target);
    return palette;
  }

  window.GCColor = {
    fromImage,
    apply,
    applyForImage,
    paletteFrom,
    fallbackPalette,
    mix,
    luminance,
    defaults: { ...DEFAULTS }
  };
})();
