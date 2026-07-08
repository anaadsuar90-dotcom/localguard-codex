# LocalGuard

LocalGuard es una aplicación local de navegador para anonimizar textos y documentos antes de compartirlos con IA, WhatsApp o email.

Todo el procesamiento se realiza en el navegador. La app no usa servidor, no usa claves API y no envía el texto a servicios externos.

## Funciones

- Pegar texto original y generar una versión anonimizada.
- Cargar archivos `.txt`, `.docx` y `.pdf`.
- Extraer texto de DOCX con `mammoth`.
- Extraer texto de PDF con `pdfjs-dist` localmente en el navegador.
- Copiar, compartir por WhatsApp, abrir email o usar el menú nativo de compartir si el navegador lo permite.
- Configuración local guardada solo en `localStorage`.

## Instalar

```bash
npm install
```

## Ejecutar

```bash
npm run dev
```

## Construir

```bash
npm run build
```

## Advertencia

LocalGuard ayuda a anonimizar información sensible, pero el usuario debe revisar siempre el resultado antes de compartirlo.
