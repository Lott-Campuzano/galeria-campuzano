# Datos de la galería

Esta carpeta guarda el manifiesto que lee el sitio público.

## El archivo importante

`galeria.json` se genera desde `admin.html` con el botón **Descargar JSON**.
No se escribe a mano: el panel se encarga del formato, del orden y de las
fechas.

- Si **no existe** `galeria.json`, el sitio muestra automáticamente las 32
  obras de demostración de `assets/js/seed.js`.
- Si existe y tiene obras, el sitio muestra solo las obras con
  `"published": true`.
- Si existe y tiene `"works": []`, el sitio muestra la sala en preparación
  (estado vacío). No vuelve a la demo.

## Estructura del manifiesto

```json
{
  "version": 1,
  "gallery": "Galería Campuzano",
  "updatedAt": "2026-01-01T00:00:00.000Z",
  "sources": [
    {
      "id": "1AbCdEfGhIjKlMnOp",
      "type": "folder",
      "folderId": "1AbCdEfGhIjKlMnOp",
      "url": "https://drive.google.com/drive/folders/1AbCdEfGhIjKlMnOp",
      "input": "https://drive.google.com/drive/folders/1AbCdEfGhIjKlMnOp",
      "title": "12 imágenes",
      "addedAt": "2026-01-01T00:00:00.000Z"
    }
  ],
  "works": [
    {
      "id": "w_1AbCdEfGhIjKlMnOp",
      "fileId": "1AbCdEfGhIjKlMnOp",
      "imageUrl": "",
      "sourceId": "1AbCdEfGhIjKlMnOp",
      "sourceName": "Google Drive",
      "sourceType": "folder",
      "title": "Materia y memoria",
      "date": "2025-04-12",
      "technique": "Carbón y tinta sobre papel",
      "dimensions": "100 × 125 cm",
      "category": "dibujo",
      "description": "Una serie de gestos densos y capas de carbón.",
      "featured": false,
      "published": true,
      "sortOrder": 0,
      "width": 1000,
      "height": 1250,
      "addedAt": "2026-01-01T00:00:00.000Z"
    }
  ]
}
```

## Categorías

Las categorías válidas están definidas en `assets/js/gallery-core.js` y en
`assets/js/admin.js`:

- `dibujo`
- `fotografia`
- `pintura`
- `mixta`

Si añades una categoría nueva, actualiza los dos archivos para que el panel
y el archivo público usen el mismo nombre.

## Imágenes de Google Drive

El sitio público **no llama a la API de Drive**. Usa la URL de miniaturas:

```text
https://drive.google.com/thumbnail?id=FILE_ID&sz=w2000
```

Por eso la carpeta debe seguir compartida como «Cualquiera con el enlace»:
si cambias los permisos, las imágenes dejan de cargar aunque el JSON siga
publicado.

Si necesitas independencia total de Drive, descarga las imágenes, colócalas
en `assets/img/obras/` y usa rutas locales como
`assets/img/obras/mi-obra.jpg` en el campo `imageUrl`.
