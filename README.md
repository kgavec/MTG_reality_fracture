# MTG Limited · guías de set con datos de Scryfall

Notebooks (DataCamp DataLab) que descargan datos de [Scryfall](https://scryfall.com) y generan una **guía de Limited/prerelease** como sitio estático para GitHub Pages.

**Sitio:** `https://<tu-usuario>.github.io/mtg-limited/` · un set concreto: `?set=fra`

## Estructura

```
00_funciones.ipynb                 funciones (se carga con %run desde los otros)
01_descarga.ipynb                  bulk data de Scryfall → Parquet (data/)
02_analisis_reality_fracture.ipynb análisis del set + exportación del sitio
web/                               front-end (plantilla): index.html, assets/app.css, assets/app.js
docs/                              sitio generado (lo que publica GitHub Pages)
```

`data/` y `reportes/` no se suben: se regeneran corriendo los notebooks.

## Flujo

1. En DataLab, pon los notebooks y la carpeta `web/` en el mismo directorio.
2. Corre `02_analisis_*`: descarga el set si hace falta y genera
   - `docs/` → sitio para GitHub Pages (`exportar_sitio`)
   - `reportes/limited_<set>.html` → versión de un solo archivo (`reporte_set`), para abrir con doble clic.
3. Sube `docs/` al repo. En GitHub: **Settings → Pages → Deploy from a branch → `main` / `/docs`**.

Para otro set, cambia `SET` en el notebook 02 y vuelve a exportar: `docs/data/sets.json` guarda la lista y el sitio carga el más reciente por defecto.

Prueba local del sitio: `python -m http.server -d docs` y abre http://localhost:8000.

## Front-end

- Sin dependencias ni build: HTML + CSS + JS nativos.
- Cada sección se dibuja al acercarse a la pantalla; las cartas usan la imagen `small` de Scryfall (con `srcset` para pantallas retina) y `loading="lazy"`.
- Sin scroll anidado ni efectos costosos durante el scroll (sin `backdrop-filter`, sin listeners de scroll pesados).
- Filtros de color, rareza y texto sincronizados con la URL (`?c=BR&r=common,uncommon&q=flying`), para compartir vistas.
- Ficha de carta con navegación ← → (o deslizando en el móvil), tema claro/oscuro, atajo `/` para buscar.

## Créditos

Datos e imágenes: Scryfall. Magic: The Gathering © Wizards of the Coast. Proyecto no oficial, sin afiliación con Wizards of the Coast.
