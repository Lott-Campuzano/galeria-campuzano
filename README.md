# Galería Campuzano

Sitio de galería de arte estático para la obra de **Lott Campuzano**:
dibujo, fotografía, pintura y técnica mixta. Incluye un archivo público,
páginas de obra y autor, un visor a pantalla completa y un panel local para
importar imágenes desde carpetas públicas de Google Drive.

No usa frameworks, backend, npm ni paso de compilación. Solo HTML, CSS,
JavaScript, SVG y un archivo JSON de datos.

> Para saber qué archivo tocar según lo que quieras cambiar, consulta
> **[GUIA.md](GUIA.md)**: mapa de archivos, textos, colores, obra, panel y
> publicación.

## Qué incluye

- **Portada**: solo el nombre de la galería y una selección aleatoria de 30
  obras (o todas si hay menos). El botón «Otra selección» vuelve a barajar.
- **Obra**: filtros por técnica, búsqueda, orden por curaduría, fecha o
  título, enlaces profundos y colecciones.
- **Visor**: diálogo nativo a pantalla completa con navegación por teclado,
  compartir enlace y enlace al archivo original.
- **Autor**: retrato, declaración, prácticas, ficha técnica, redes y una
  selección aleatoria de obra.
- **Panel**: importación desde enlaces de Drive, edición de metadatos,
  borrador local, exportación e importación de `galeria.json`. Vive solo en
  local: no está enlazado ni indexado en el sitio público.
- **Color dinámico**: cada obra aporta su color dominante al ambiente, al
  acento y al fondo del visor, con respaldo determinista si el CDN bloquea
  la lectura por canvas.
- **Diseño**: blanco hueso y gris profundo, Times New Roman para titulares, IBM
  Plex Sans para lectura, JetBrains Mono para datos, cristal acrílico,
  bordes rectos y grano fotográfico.

## Estructura

```text
galeria-campuzano/
├── index.html              Portada
├── obra.html               Archivo y colecciones
├── autor.html              Página del autor
├── admin.html              Panel local (sin enlaces en el sitio)
├── GUIA.md                 Dónde tocar cada cosa
├── assets/
│   ├── css/
│   │   ├── base.css        Variables, reinicio, botones, formularios
│   │   ├── site.css        Páginas públicas
│   │   └── admin.css       Panel
│   ├── data/
│   │   ├── README.md       Formato del manifiesto
│   │   └── galeria.json    Archivo generado por el panel (opcional)
│   ├── img/
│   │   ├── obras/          Obras de demostración en SVG
│   │   ├── retrato.svg
│   │   └── favicon.svg
│   └── js/
│       ├── config.js       Textos, enlaces y API key
│       ├── seed.js         32 obras de demostración
│       ├── color.js        Paletas dinámicas
│       ├── drive.js        Enlaces y miniaturas de Drive
│       ├── manifest.js     Lectura, borrador y exportación
│       ├── common.js       Cabecera, textos y redes
│       ├── gallery-core.js Tarjetas, mosaico y visor
│       ├── page-home.js    Portada
│       ├── page-obra.js    Archivo
│       ├── page-autor.js   Autor
│       └── admin.js        Panel
├── LICENSE
└── README.md
```

## Ver el sitio en local

Cualquier servidor estático funciona. Por ejemplo:

```bash
cd galeria-campuzano
python3 -m http.server 8000
```

Abre `http://localhost:8000/`. No abras los HTML con `file://`: el manifiesto
se carga con `fetch` y el navegador bloquea esa petición.

## El panel es local

`admin.html` no está enlazado desde el sitio público y no aparece en ninguna
navegación. Se abre a mano desde tu equipo:

```text
http://localhost:8000/admin.html
```

El archivo se conserva en el repositorio, pero el sitio de producción no lo
muestra. Al no tener backend ni sesión, cualquiera que adivine la URL puede
cargar la página; no puede leer Drive sin la API key, y el panel solo escribe
en el navegador de quien lo abre. Si quieres que ni siquiera exista en
producción, borra `admin.html` antes de desplegar o usa un host con reglas de
exclusión.

## Cómo se publica la obra

1. Abre `admin.html` en local.
2. Pega una o varias URLs de carpetas públicas de Drive (o enlaces directos
   a imágenes) en **Carpetas**.
3. Pulsa **Escanear** e importa las imágenes que quieras.
4. Edita título, fecha, técnica, medidas, categoría y descripción.
5. Ordena la curaduría con las flechas de cada ficha.
6. Marca **Publicada** solo las piezas que deben verse.
7. Pulsa **Descargar JSON**.
8. Guarda el archivo como `assets/data/galeria.json`.
9. Revisa la portada y el archivo en local y publica el repositorio.

El borrador se guarda en `localStorage`, en el navegador donde trabajas. Si
cambias de equipo, usa **Copiar** o **Importar un JSON**.

### Google Drive

Para leer carpetas hace falta una API key de Google Drive restringida:

1. Crea un proyecto en <https://console.cloud.google.com>.
2. Activa **Google Drive API**.
3. Crea una **API key** en «Credenciales».
4. Restríngela a Google Drive API y, si vas a desplegar el panel, a tu
   dominio.
5. Pega la key en `assets/js/config.js`, dentro de `drive.apiKey`.

La key se usa **solo** en el panel y solo con los enlaces que aparecen en el
formulario. El sitio público nunca llama a la API: las imágenes se muestran
con `https://drive.google.com/thumbnail?id=FILE_ID&sz=w2000`.

Una API key en JavaScript es visible para quien abra el panel. Si el panel es
solo para ti, úsalo en local. No publiques una key sin restricciones.

### Google Fotos e iCloud

Ninguno de los dos permite leer álbumes compartidos desde el navegador. El
panel lo avisa: descarga las fotos y súbelas a una carpeta pública de Drive,
o usa enlaces directos a las imágenes.

## Publicar el sitio

### GitHub Pages

1. Sube el proyecto a un repositorio público.
2. En **Settings → Pages**, elige la rama `main` y la carpeta raíz.
3. Espera a que GitHub genere la URL.

### Vercel o Netlify

Importa el repositorio y publica como sitio estático. No hay comando de
build: la carpeta raíz del proyecto es la salida.

### Imágenes locales

Si prefieres no depender de Drive, descarga las imágenes a
`assets/img/obras/`, cambia `imageUrl` en cada obra desde el panel y vuelve a
descargar `galeria.json`. El sitio funciona igual.

## Personalizar

Casi todo el contenido editorial vive en `assets/js/config.js`:

- `site.name`, `site.artist`, `site.role`, `site.location`, `site.since`
- `site.intro`, `site.statement`, `site.quote`, `site.availability`
- `site.social` (Instagram, LinkedIn, GitHub, Dribbble, Behance, sitio)
- `site.facts` y `site.practice`
- `gallery.homeCount` (mínimo recomendado: 30)
- `drive.apiKey`

Los textos del HTML son respaldos: si JavaScript falla, la página sigue
mostrando contenido legible.

## Accesibilidad y rendimiento

- Navegación por teclado en el menú y en el visor.
- `<dialog>` nativo con foco atrapado y cierre con Escape.
- Textos alternativos en las imágenes y etiquetas ARIA en los controles.
- `prefers-reduced-motion` desactiva animaciones.
- Imágenes con `loading="lazy"` salvo las primeras de cada retícula.
- Sin fuentes de iconos: los iconos vienen de Iconify como SVG bajo demanda.
- Sin dependencias de JavaScript más allá de los archivos locales.

## Diseño

La identidad toma el lenguaje visual de los proyectos de Lott Campuzano:

- Blanco hueso `#FAF8F3` y gris profundo `#1E1E21` en bandas y pie.
- Tinta casi negra `#0D0D0D`, coral `#F25E3D` y salmón `#F2AB9B`.
- Titulares enormes en Times New Roman, con la palabra en cursiva en coral.
- Datos técnicos en monoespaciada.
- Retícula visible, marcos gruesos y cero esquinas redondeadas.
- Paneles acrílicos inspirados en el Acrílico de Windows 11.
- Grano sutil y halos de color tomados de cada obra.

## Créditos

Iconos: [Iconify](https://iconify.design/) con el set Phosphor.
Tipografías: IBM Plex Sans y JetBrains Mono desde Google Fonts.
Times New Roman es una fuente del sistema.

## Licencia

MIT. Consulta `LICENSE`.
