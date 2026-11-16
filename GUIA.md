# Guía para moverle al código

Este documento explica dónde vive cada cosa y qué archivo tocar según lo que
quieras cambiar. Está escrito para editar a mano, sin frameworks, sin `npm` y
sin compilación.

Si solo quieres publicar obra nueva, no necesitas esta guía: abre el panel,
importa y descarga `galeria.json`. Lo demás está aquí.

---

## 1. Antes de empezar

El sitio son archivos estáticos. Para verlo en local hace falta un servidor
sencillo, porque el manifiesto se carga con `fetch` y el navegador bloquea esa
petición si abres los HTML con doble clic (`file://`).

```bash
cd galeria-campuzano
python3 -m http.server 8000
```

Luego abre:

- `http://localhost:8000/` — portada
- `http://localhost:8000/obra.html` — archivo
- `http://localhost:8000/autor.html` — autor
- `http://localhost:8000/admin.html` — panel (solo local)

Para parar el servidor: `Ctrl + C`.

### Regla de oro

Toca **un archivo a la vez** y recarga el navegador. Los cambios de texto y de
color se ven al instante; los de JavaScript necesitan recargar. Si algo se
rompe, casi siempre es una coma, una llave o una comilla mal cerrada.

---

## 2. Mapa de archivos

```text
galeria-campuzano/
├── index.html                 Portada
├── obra.html                  Archivo, filtros y visor
├── autor.html                 Página del autor
├── admin.html                 Panel local (no enlazado en el sitio)
├── GUIA.md                    Este documento
├── README.md                  Presentación e instrucciones breves
└── assets/
    ├── css/
    │   ├── base.css           Variables, tipografía, botones, formularios
    │   ├── site.css           Páginas públicas
    │   └── admin.css          Panel
    ├── data/
    │   ├── README.md          Formato de galeria.json
    │   └── galeria.json       Lo genera el panel (no se sube si no hay obra)
    ├── img/
    │   ├── obras/             Obras de demostración en SVG
    │   ├── retrato.svg        Retrato del autor
    │   └── favicon.svg
    └── js/
        ├── config.js          Textos, enlaces, correo, API key, portada
        ├── seed.js            32 obras de demostración
        ├── color.js           Paleta dinámica por obra
        ├── drive.js           Lectura de enlaces de Drive
        ├── manifest.js        Borrador local y exportación del JSON
        ├── common.js          Cabecera, textos y redes en todas las páginas
        ├── gallery-core.js    Tarjetas, mosaico, visor y paleta aplicada
        ├── page-home.js       Portada
        ├── page-obra.js       Archivo y enlaces profundos
        ├── page-autor.js      Página del autor
        └── admin.js           Panel
```

### Qué carga cada página

Las páginas públicas cargan, en este orden:

```text
config.js → seed.js → color.js → drive.js → manifest.js
→ common.js → gallery-core.js → page-*.js
```

El panel carga:

```text
config.js → seed.js → drive.js → manifest.js → common.js → admin.js
```

**No cambies el orden** salvo que sepas qué dependencia estás moviendo: cada
archivo usa lo que dejó el anterior en `window`.

---

## 3. Cambios frecuentes: dónde ir

| Quiero cambiar… | Archivo | Qué buscar |
| --- | --- | --- |
| Nombre, descripción, redes, correo | `assets/js/config.js` | `site` |
| Textos de la página de autor | `assets/js/config.js` | `statement`, `practice`, `facts` |
| Número de obras en portada | `assets/js/config.js` | `gallery.homeCount` |
| API key de Google Drive | `assets/js/config.js` | `drive.apiKey` |
| Obras publicadas | `assets/data/galeria.json` (o el panel) | `works` |
| Obras de demostración | `assets/js/seed.js` | `window.GC_SEED` |
| Colores base | `assets/css/base.css` | `:root` |
| Tipografías | `assets/css/base.css` | `--font-display`, `--font-sans`, `--font-mono` |
| Cabecera y menú | `assets/css/site.css` | sección 1 |
| Tarjetas y mosaico | `assets/css/site.css` | sección 4 |
| Visor de obra | `assets/css/site.css` | buscar `work-dialog` |
| Pie de página | `assets/css/site.css` | sección 9 |
| Estilos del panel | `assets/css/admin.css` | secciones numeradas |
| Paleta automática por obra | `assets/js/color.js` | `DEFAULTS`, `FALLBACK_ACCENTS` |
| Iconos | cualquier HTML/JS | `iconify-icon icon="ph:…"` |
| Comportamiento del panel | `assets/js/admin.js` | funciones por bloque |

---

## 4. Textos y datos del sitio

Casi todo el contenido editorial vive en `assets/js/config.js`, dentro de
`window.GC_CONFIG.site`.

- `name`, `artist`, `role`, `tagline`, `location`, `since`: identidad.
- `email`: si lo dejas vacío (`""`), el sitio oculta los botones de correo.
- `social`: borra una red o déjala vacía y desaparece sola. No hace falta tocar
  el HTML.
- `intro`, `statement`, `quote`, `quoteAuthor`, `availability`: textos
  editoriales. `statement` es una lista: cada cadena es un párrafo.
- `portrait`: ruta al retrato. Si cambias la imagen, conserva la proporción
  vertical para no romper la retícula.
- `facts`: lista de `{ label, value }` para la ficha del autor.
- `practice`: los tres bloques de la página de autor.

Los HTML tienen textos de respaldo. Si JavaScript falla, la página sigue
mostrando algo; por eso, al cambiar un texto, conviene actualizar también el
respaldo en el HTML correspondiente si es un titular visible.

### Redes y correo

`common.js` recorre `config.js`, rellena los enlaces y oculta los que están
vacíos. Si añades una red nueva, necesitas dos cosas:

1. El campo en `config.js`.
2. El enlace con `data-social="nombre"` en el HTML de la página donde deba
   aparecer.

---

## 5. Obra: el panel y el manifiesto

### El panel es local

`admin.html` se conserva en el repositorio, pero:

- no está enlazado en la cabecera, el pie ni los estados vacíos;
- tiene `meta robots noindex, nofollow`;
- solo se activa en `localhost`, `127.0.0.1` o `file://`.

Si se abre en un dominio público, un script en el `<head>` marca
`<html class="is-remote">` y `admin.css` oculta la interfaz para mostrar un
aviso. No es autenticación: es una cortina para que el editor no forme parte
del sitio publicado. La autenticación real exigiría un servidor o un borde
(Cloudflare Access, por ejemplo).

### Flujo de publicación

1. Abre `http://localhost:8000/admin.html`.
2. Pega enlaces de carpetas públicas de Drive o enlaces directos a imágenes.
3. Pulsa **Escanear** y luego **Importar todo**.
4. Edita título, fecha, técnica, medidas, categoría y descripción.
5. Marca **Publicada** solo lo que debe verse.
6. Pulsa **Descargar JSON**.
7. Guarda el archivo como `assets/data/galeria.json`.
8. Recarga el sitio y revisa.
9. Sube el cambio al repositorio.

### Reglas del manifiesto

- **Sin `galeria.json`** el sitio muestra las 32 obras de `seed.js`.
- **Con `galeria.json`** muestra solo las obras con `published: true`.
- **Con `works: []`** muestra el estado vacío; no vuelve a la demo.
- Las categorías válidas son `dibujo`, `fotografia`, `pintura` y `mixta`.
  Están definidas en `gallery-core.js` y en `admin.js`: si añades una, cambia
  las dos.

El formato completo está en `assets/data/README.md`. No escribas el JSON a
mano salvo para una corrección puntual.

---

## 6. Diseño: colores, tipografía y formas

### Colores

Todo sale de variables en `assets/css/base.css`, dentro de `:root`.

| Variable | Valor | Uso |
| --- | --- | --- |
| `--paper` | `#faf8f3` | Fondo general (blanco hueso) |
| `--paper-2` | `#fffdf8` | Superficies elevadas |
| `--paper-3` | `#ede8df` | Bloques y separadores suaves |
| `--ink` | `#0d0d0d` | Texto principal |
| `--ink-deep` | `#1e1e21` | Bandas, visor y pie |
| `--muted` | `#70675b` | Texto secundario |
| `--dyn-*` | variable | Acento que cambia con cada obra |

Cambiar `--paper` o `--ink-deep` actualiza todo el sitio. Evita escribir colores
sueltos en `site.css`: si necesitas uno nuevo, conviértelo en variable.

### Tipografías

- Títulos: Times New Roman (`--font-display`).
- Texto: IBM Plex Sans (`--font-sans`).
- Datos y etiquetas: JetBrains Mono (`--font-mono`).

Las dos fuentes web se cargan desde Google Fonts en el `<head>` de cada HTML.
Times New Roman es del sistema y no se descarga.

### Formas

`--radius: 0`. No hay esquinas redondeadas en ningún componente. Si añades uno,
no uses `border-radius` salvo para círculos reales (puntos, avatares).

Los paneles translúcidos usan `--acrylic`, `--acrylic-strong`,
`--acrylic-dark` y `--acrylic-dark-strong`, con `backdrop-filter`. Si el panel
se ve lavado, sube la opacidad del tinte, no el desenfoque.

### Orden de `site.css`

El archivo está numerado por secciones. Al añadir reglas, colócalas en la
sección que les corresponde; así el archivo sigue siendo legible:

1. Cabecera y navegación
2. Fondo ambiental y barra de color
3. Portada
4. Tarjetas y mosaico
5. Bandas de página
6. Archivo: filtros, búsqueda y orden
7. Colecciones
8. Autor
9. Pie
10. Visor de obra
11. Ajustes responsive

---

## 7. Paleta dinámica por obra

`color.js` dibuja cada imagen en un canvas de 56×56, agrupa los píxeles por
tono y elige un acento. Después deriva el resto de la paleta mezclando con el
blanco hueso o con la tinta. El resultado se escribe en `--dyn`, `--dyn-soft`,
`--dyn-deep`, `--dyn-tint`, `--dyn-contrast` y `--dyn-rgb`.

- Si una imagen bloquea CORS (Drive suele hacerlo), se usa una paleta estable
  derivada de la URL, no un color aleatorio.
- Los acentos de respaldo están en `FALLBACK_ACCENTS`; el coral de la identidad
  está en `DEFAULTS`.
- Para que una obra casi monocroma no herede un gris muerto, `tuneAccent`
  impone un mínimo de saturación.

No hace falta tocar nada aquí para publicar obra. Solo entra si quieres cambiar
la personalidad del acento o el peso de la saturación.

---

## 8. Portada, archivo y visor

### Portada (`page-home.js`)

Muestra el nombre de la galería y una selección aleatoria. El número sale de
`gallery.homeCount` (30 por defecto). Si hay menos obras publicadas, se muestran
todas. El botón **Otra selección** vuelve a barajar sin recargar.

No añadas eslóganes ni llamadas a la acción: es un requisito del proyecto.

### Archivo (`page-obra.js`)

- Filtros por categoría, búsqueda y orden.
- Enlaces profundos: `obra.html?obra=ID` abre una obra concreta y
  `obra.html?serie=dibujo` entra ya filtrado.
- Si una obra no existe, vuelve al archivo sin romper la página.

### Visor (`gallery-core.js`)

El diálogo se construye una sola vez y se reutiliza. Al abrir una obra:

1. Se aplica su paleta.
2. Se cargan los datos.
3. Se actualiza la URL con `history.pushState`.
4. `Esc` cierra y devuelve el foco al elemento que abrió el visor.

Si cambias el HTML del visor, conserva los `id` que usa `gallery-core.js`
(`work-dialog`, `dialog-image`, `dialog-title`, etc.) o el visor dejará de
funcionar.

---

## 9. El panel por dentro

`admin.js` está dividido por bloques comentados:

1. Estado y utilidades.
2. Carga inicial (borrador o publicado).
3. Fuentes: escanear, importar, quitar.
4. Obra: buscar, editar, ordenar, publicar, eliminar.
5. Salida: descargar, copiar, importar JSON, demo, vaciar borrador.

El borrador vive en `localStorage` con la clave `gc.gallery.draft.v1`. Si
cambias esa clave en `manifest.js`, los borradores viejos dejan de aparecer.

### API key de Drive

Sin `drive.apiKey`, el panel muestra la guía y la demo sigue funcionando. La key
se crea en Google Cloud, se restringe a Google Drive API y conviene limitarla
por dominio. Recuerda que una key en el navegador es pública: sirve para leer
carpetas compartidas, no para proteger archivos privados.

### Elementos que el JavaScript espera

`admin.js` busca elementos por `id`. Si reescribes `admin.html`, conserva estos
identificadores o el panel fallará en silencio:

```text
stat-total, stat-published, stat-sources, stat-drafts, api-status,
api-detail, drive-guide, source-input, scan-sources, import-all,
clear-input, scan-results, sources-label, sources-list, works-badge,
work-search, add-manual, works-list, works-empty, publish-status,
publish-download, publish-copy, import-json, import-file, load-demo,
clear-draft, toasts
```

---

## 10. Iconos

Se usan con Iconify y el set Phosphor:

```html
<iconify-icon icon="ph:arrow-up-right"></iconify-icon>
```

- No hay emojis en la interfaz.
- El script de Iconify se carga en el `<head>`.
- Si un icono no aparece, comprueba el nombre en
  <https://icon-sets.iconify.design/ph/>.

---

## 11. Publicar los cambios

El repositorio es `Lott-Campuzano/galeria-campuzano` y se publica con GitHub
Pages desde la rama `main`.

```bash
git status
git add -A
git commit -m "Describe el cambio"
git push origin main
```

A los pocos minutos se actualiza el sitio. Si cambiaste CSS o JavaScript y no
ves el cambio, fuerza la recarga (`Cmd + Shift + R`): el navegador guarda
versiones viejas.

### Antes de subir

- Revisa que `assets/data/galeria.json` sea el que quieres publicar.
- Comprueba que `admin.html` no esté enlazado en ninguna página pública.
- Abre las cuatro páginas en local y mira la consola: no debe haber errores
  salvo el 404 esperado de `galeria.json` cuando aún no existe.
- Si tocaste el panel, pruébalo en local y simula un host remoto para ver el
  aviso.

---

## 12. Qué no tocar sin motivo

- **El orden de los scripts** en los HTML.
- **Los `id`** que usan `gallery-core.js` y `admin.js`.
- **`--radius`**: el proyecto es de esquinas rectas.
- **Los textos de la portada**: solo nombre y obras.
- **La guarda local del panel**: si la quitas, el editor queda visible en
  producción.
- **`assets/data/galeria.json` a mano**: el panel mantiene el formato, las
  fechas y el orden.
- **La licencia y los créditos de terceros**: Iconify, IBM Plex Sans y
  JetBrains Mono tienen sus propias licencias.

---

## 13. Problemas comunes

| Síntoma | Causa probable | Solución |
| --- | --- | --- |
| La página se ve sin estilos | Ruta mal escrita en el `<link>` | Revisa `assets/css/…` |
| La portada muestra la demo | No existe `galeria.json` | Es el comportamiento esperado |
| La portada está vacía | `galeria.json` con `works: []` | Publica obra o borra el archivo |
| Las imágenes de Drive no cargan | Carpeta privada o permisos cambiados | Compártela como «Cualquiera con el enlace» |
| El panel dice que falta la API key | `drive.apiKey` vacía | Pega la key en `config.js` |
| El panel no responde | Falta un `id` en `admin.html` | Compara con la lista de la sección 9 |
| El panel muestra el aviso en local | El host no es `localhost` ni `127.0.0.1` | Usa el servidor local |
| Un cambio de JS no se ve | Caché del navegador | `Cmd + Shift + R` |
| El visor no abre | Falta `work-dialog` o cambió su estructura | Restaura los `id` originales |
| El sitio se ve beige | Se cambió `--paper` | Vuelve a `#faf8f3` |

---

## 14. Cómo están comentados los archivos

Cada archivo JavaScript empieza con un bloque que explica qué hace y en qué
orden. Dentro, los bloques importantes llevan un comentario corto encima. Los
CSS están divididos por secciones numeradas.

Si añades código, sigue esa convención:

```js
/* Qué hace este bloque y por qué existe. */
function nombre() {
  // Detalle puntual que no se deduce leyendo la línea.
}
```

Los comentarios están en español y explican decisiones, no sintaxis. Evita
comentar lo obvio: `// suma uno` no aporta nada.

---

## 15. Resumen para el día a día

- **Texto o redes**: `assets/js/config.js`.
- **Obra**: panel → `galeria.json`.
- **Color o tipografía**: `assets/css/base.css`.
- **Un componente visual**: la sección correspondiente de `site.css`.
- **Panel**: `admin.html` + `admin.css` + `admin.js`, siempre en local.
- **Publicar**: `git add`, `git commit`, `git push`.

Con eso se puede mantener el sitio completo sin frameworks y sin salir del
navegador.
