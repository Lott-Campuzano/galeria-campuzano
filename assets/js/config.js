/* ============================================================
   GALERÍA CAMPUZANO · configuración general
   ------------------------------------------------------------
   Este es el ÚNICO archivo que necesitas tocar para cambiar
   textos, enlaces y datos del estudio. No borres las llaves ni
   las comas: es JavaScript, no un archivo de texto.

   Contenido:
   1. drive    → API key para importar carpetas públicas de Drive
   2. gallery  → ruta del manifiesto publicado y tamaño del azar
   3. site     → nombre, biografía, enlaces, créditos y textos
   ============================================================ */

window.GC_CONFIG = {
  /* ----------------------------------------------------------
     1. GOOGLE DRIVE
     ----------------------------------------------------------
     La API key SOLO se usa en admin.html para listar las
     carpetas públicas que tú pegas en el formulario. No permite
     recorrer todo tu Drive ni acceder a archivos privados.

     Pasos para crear la key:
     a) https://console.cloud.google.com → nuevo proyecto.
     b) "APIs y servicios" → activa "Google Drive API".
     c) "Credenciales" → Crear credencial → API key.
     d) Restringe la key a Google Drive API y a tu dominio.
     e) Pega la key entre las comillas de apiKey.

     Mientras apiKey esté vacía, el panel muestra la guía y el
     sitio público funciona con las 32 obras de demostración.
     ---------------------------------------------------------- */
  drive: {
    apiKey: ""
  },

  /* ----------------------------------------------------------
     2. GALERÍA
     ----------------------------------------------------------
     manifest: archivo que genera el panel al publicar.
     homeCount: cuántas obras al azar muestra la portada.
                El requisito del proyecto es 30 como mínimo; si
                publicas menos obras, se muestran todas.
     ---------------------------------------------------------- */
  gallery: {
    manifest: "assets/data/galeria.json",
    homeCount: 30
  },

  /* ----------------------------------------------------------
     3. DATOS DEL SITIO
     ----------------------------------------------------------
     Todo lo que aparece en las páginas sale de aquí (o del
     manifiesto de obras). Cambia los textos sin miedo: los
     archivos HTML tienen valores de respaldo para que la página
     nunca se vea vacía si JavaScript falla.
     ---------------------------------------------------------- */
  site: {
    /* Identidad -------------------------------------------------- */
    name: "Galería Campuzano",
    artist: "Lott Campuzano",
    role: "Desarrollador frontend, fotógrafo y artista visual",
    tagline: "Dibujo, fotografía y obra sobre papel",
    location: "Ixtapan de la Sal, México",
    since: "2026",

    /* Correo de contacto.
       Déjalo vacío ("") si todavía no tienes uno público: el
       sitio oculta los botones de correo y usa las redes.
       Cuando lo tengas, escribe algo como "hola@tudominio.com". */
    email: "",

    /* Redes y perfiles públicos.
       Borra o deja vacío el que no quieras mostrar; el sitio lo
       oculta automáticamente. */
    social: {
      instagram: "https://www.instagram.com/lotto_hc/",
      linkedin: "https://www.linkedin.com/in/lott-campuzano",
      github: "https://github.com/Lott-Campuzano",
      dribbble: "https://dribbble.com/lott-campuzano",
      behance: "https://www.behance.net/lottocampuzano",
      website: "https://lott-campuzano.vercel.app/"
    },

    /* Textos editoriales ---------------------------------------- */
    intro:
      "Un archivo personal de dibujos, fotografías y pinturas. Piezas que nacen de la observación cotidiana: la luz que cae, el peso de una forma, la memoria de un lugar.",

    statement: [
      "Soy Lott Campuzano. Trabajo entre el desarrollo frontend, la fotografía y el dibujo. Me interesa lo que queda cuando una imagen se despoja de lo anecdótico: una tensión, un borde, una sombra que insiste.",
      "Mi formación en ingeniería en sistemas y mis estudios en comunicación visual y diseño atraviesan mi manera de mirar. El papel es un territorio de prueba; la cámara, una forma de detener la mirada. Ambas prácticas comparten la misma pregunta: cómo hacer visible lo que está a punto de desaparecer.",
      "Vivo y trabajo en Ixtapan de la Sal, México. Este archivo reúne obra gráfica, fotografía y estudios de color que van creciendo por series."
    ],

    quote:
      "Dibujar es sostener la duda el tiempo suficiente para que aparezca una forma.",
    quoteAuthor: "Notas de estudio, 2024",

    availability:
      "Obra original, ediciones y proyectos editoriales. Escríbeme para compartir el catálogo completo o coordinar una visita al estudio.",

    portrait: "assets/img/retrato.svg",

    /* Ficha del autor. Se muestra como lista de datos. */
    facts: [
      { label: "Base", value: "Ixtapan de la Sal, México" },
      {
        label: "Formación",
        value:
          "Ingeniería en Sistemas Computacionales · Comunicación Visual y Diseño"
      },
      {
        label: "Práctica",
        value: "Dibujo, fotografía, pintura y técnica mixta"
      },
      {
        label: "Herramientas",
        value: "Papel, cámara analógica y digital, HTML, CSS y JavaScript"
      }
    ],

    /* Tres bloques de la página de autor. Edita títulos y textos. */
    practice: [
      {
        title: "Dibujo",
        text:
          "El dibujo como registro del tiempo: líneas que se acumulan, se corrigen y conservan la huella del proceso. Trabajo sobre papel con grafito, carbón, tinta y acuarela."
      },
      {
        title: "Fotografía",
        text:
          "Fotografía analógica y digital centrada en la luz, la arquitectura cotidiana y los paisajes mínimos. La cámara detiene aquello que el ojo ya estaba a punto de perder."
      },
      {
        title: "Diseño",
        text:
          "El desarrollo frontend y el diseño visual son parte de la misma práctica: construir interfaces limpias, accesibles y sensibles al contenido. Este sitio es un ejercicio de esa idea."
      }
    ],

    /* Crédito del pie. El texto debe permanecer idéntico. */
    credit: "Hecho con amor por Lott Campuzano y OpenCode"
  }
};
