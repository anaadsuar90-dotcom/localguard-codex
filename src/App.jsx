import React, { useEffect, useMemo, useRef, useState } from 'react';
import { anonymizeText, DEFAULT_CONFIG } from './lib/anonymizer.js';

const CONFIG_KEY = 'localguard.config.v1';

const CONFIG_FIELDS = [
  ['profileName', 'Nombre de perfil local', 'text'],
  ['alwaysHideIdentities', 'Identidades a ocultar siempre', 'textarea'],
  ['alwaysHideOrganizations', 'Organizaciones, centros o empresas a ocultar', 'textarea'],
  ['preserveOrganizations', 'Organizaciones o cabeceras a conservar', 'textarea'],
  ['preserveClinicalWords', 'Palabras clínicas a conservar', 'textarea'],
  ['customIdentityLabels', 'Etiquetas identificativas personalizadas', 'textarea'],
];

export default function App() {
  const [inputText, setInputText] = useState('');
  const [outputText, setOutputText] = useState('');
  const [message, setMessage] = useState('');
  const [config, setConfig] = useState(DEFAULT_CONFIG);
  const [settingsOpen, setSettingsOpen] = useState(false);
  const [fileName, setFileName] = useState('');
  const importRef = useRef(null);

  useEffect(() => {
    const saved = localStorage.getItem(CONFIG_KEY);
    if (!saved) return;
    try {
      setConfig({ ...DEFAULT_CONFIG, ...JSON.parse(saved) });
    } catch {
      setMessage('La configuración guardada no se pudo leer. Puedes restaurar valores por defecto.');
    }
  }, []);

  const canShare = useMemo(() => typeof navigator !== 'undefined' && Boolean(navigator.share), []);

  function handleFilter() {
    const result = anonymizeText(inputText, config);
    setOutputText(result);
    setMessage(result ? 'Texto filtrado localmente en este navegador.' : 'Pega texto o carga un archivo antes de filtrar.');
  }

  async function handleFileChange(event) {
    const file = event.target.files?.[0];
    if (!file) return;

    setMessage('');
    setFileName(file.name);

    try {
      const text = await readLocalFile(file);
      setInputText(text);
      setOutputText('');
      setMessage(`Archivo cargado localmente: ${file.name}`);
    } catch (error) {
      setMessage(error.message || 'No se pudo leer el archivo.');
    } finally {
      event.target.value = '';
    }
  }

  async function copyResult() {
    if (!outputText) {
      setMessage('No hay resultado para copiar.');
      return;
    }
    await navigator.clipboard.writeText(outputText);
    setMessage('Resultado copiado al portapapeles.');
  }

  function openWhatsApp() {
    if (!outputText) {
      setMessage('No hay resultado para compartir por WhatsApp.');
      return;
    }
    window.open(`https://wa.me/?text=${encodeURIComponent(outputText)}`, '_blank', 'noopener,noreferrer');
  }

  function openEmail() {
    if (!outputText) {
      setMessage('No hay resultado para enviar por email.');
      return;
    }
    window.location.href = `mailto:?subject=${encodeURIComponent('Texto anonimizado con LocalGuard')}&body=${encodeURIComponent(outputText)}`;
  }

  async function shareNative() {
    if (!outputText) {
      setMessage('No hay resultado para compartir.');
      return;
    }
    if (!navigator.share) {
      setMessage('El menú nativo de compartir no está disponible en este navegador.');
      return;
    }
    await navigator.share({ title: 'LocalGuard', text: outputText });
  }

  function saveConfig() {
    localStorage.setItem(CONFIG_KEY, JSON.stringify(config));
    setMessage('Configuración guardada solo en este dispositivo/navegador.');
  }

  function clearConfig() {
    localStorage.removeItem(CONFIG_KEY);
    setConfig(DEFAULT_CONFIG);
    setMessage('Configuración borrada.');
  }

  function restoreDefaults() {
    setConfig(DEFAULT_CONFIG);
    setMessage('Valores por defecto restaurados. Pulsa guardar para conservarlos.');
  }

  function exportConfig() {
    const blob = new Blob([JSON.stringify(config, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = 'localguard-config.json';
    link.click();
    URL.revokeObjectURL(url);
  }

  async function importConfig(event) {
    const file = event.target.files?.[0];
    if (!file) return;
    try {
      const imported = JSON.parse(await file.text());
      setConfig({ ...DEFAULT_CONFIG, ...imported });
      setMessage('Configuración importada. Pulsa guardar para conservarla.');
    } catch {
      setMessage('El archivo de configuración no es un JSON válido.');
    } finally {
      event.target.value = '';
    }
  }

  function updateConfigField(key, value) {
    setConfig((current) => ({ ...current, [key]: value }));
  }

  return (
    <main className="app-shell">
      <header className="app-header">
        <div>
          <p className="eyebrow">Procesamiento 100% local</p>
          <h1>LocalGuard</h1>
        </div>
      </header>

      <section className="panel">
        <label htmlFor="sourceText">Texto original</label>
        <textarea
          id="sourceText"
          value={inputText}
          onChange={(event) => setInputText(event.target.value)}
          placeholder="Pega aquí el texto que quieres anonimizar."
        />

        <div className="file-row">
          <label className="file-button">
            <input type="file" accept=".txt,.docx,.pdf,text/plain,application/pdf" onChange={handleFileChange} />
            Cargar archivo
          </label>
          <span>{fileName || 'TXT, DOCX o PDF'}</span>
        </div>

        <button className="primary-button" type="button" onClick={handleFilter}>
          Filtrar Datos
        </button>
      </section>

      <section className="panel">
        <label htmlFor="resultText">Resultado anonimizado</label>
        <textarea
          id="resultText"
          className="result-box"
          value={outputText}
          onChange={(event) => setOutputText(event.target.value)}
          placeholder="Aquí aparecerá el texto anonimizado."
        />

        <div className="action-grid">
          <button type="button" onClick={copyResult}>Copiar</button>
          <button type="button" onClick={openWhatsApp}>WhatsApp</button>
          <button type="button" onClick={openEmail}>Email</button>
          {canShare && <button type="button" onClick={shareNative}>Compartir</button>}
        </div>
      </section>

      <section className="settings-panel">
        <button className="settings-toggle" type="button" onClick={() => setSettingsOpen((open) => !open)}>
          {settingsOpen ? 'Ocultar configuración' : 'Configuración'}
        </button>

        {settingsOpen && (
          <div className="settings-content">
            <p className="help-text">
              Esta configuración se guarda solo en este dispositivo/navegador. No se envía a servidores.
            </p>

            {CONFIG_FIELDS.map(([key, label, type]) => (
              <label className="config-field" key={key}>
                <span>{label}</span>
                {type === 'textarea' ? (
                  <textarea
                    value={config[key]}
                    onChange={(event) => updateConfigField(key, event.target.value)}
                    placeholder="Una entrada por línea"
                  />
                ) : (
                  <input value={config[key]} onChange={(event) => updateConfigField(key, event.target.value)} />
                )}
              </label>
            ))}

            <div className="settings-actions">
              <button type="button" onClick={saveConfig}>Guardar configuración</button>
              <button type="button" onClick={clearConfig}>Borrar configuración</button>
              <button type="button" onClick={restoreDefaults}>Restaurar valores por defecto</button>
              <button type="button" onClick={exportConfig}>Exportar configuración</button>
              <button type="button" onClick={() => importRef.current?.click()}>Importar configuración</button>
              <input ref={importRef} hidden type="file" accept="application/json,.json" onChange={importConfig} />
            </div>
          </div>
        )}
      </section>

      {message && <p className="status-message" role="status">{message}</p>}
    </main>
  );
}

async function readLocalFile(file) {
  const extension = file.name.split('.').pop()?.toLowerCase();

  if (extension === 'txt' || file.type === 'text/plain') {
    return file.text();
  }

  if (extension === 'docx') {
    const arrayBuffer = await file.arrayBuffer();
    const { default: mammoth } = await import('mammoth/mammoth.browser');
    const result = await mammoth.extractRawText({ arrayBuffer });
    return result.value.trim();
  }

  if (extension === 'pdf' || file.type === 'application/pdf') {
    return readPdfText(file);
  }

  throw new Error('Formato no compatible. Usa archivos .txt, .docx o .pdf.');
}

async function readPdfText(file) {
  try {
    const [pdfjsLib, pdfWorker] = await Promise.all([
      import('pdfjs-dist'),
      import('pdfjs-dist/build/pdf.worker.mjs?url'),
    ]);
    pdfjsLib.GlobalWorkerOptions.workerSrc = pdfWorker.default;

    const arrayBuffer = await file.arrayBuffer();
    const pdf = await pdfjsLib.getDocument({ data: arrayBuffer }).promise;
    const pages = [];

    for (let pageNumber = 1; pageNumber <= pdf.numPages; pageNumber += 1) {
      const page = await pdf.getPage(pageNumber);
      const content = await page.getTextContent();
      pages.push(content.items.map((item) => item.str).join(' '));
    }

    const text = pages.join('\n').replace(/\s+\n/g, '\n').trim();
    if (!text) {
      throw new Error('El PDF no contiene texto extraíble. Puede ser un PDF escaneado.');
    }

    return text;
  } catch (error) {
    if (/password|encrypted|protected/i.test(error.message || '')) {
      throw new Error('El PDF está protegido o cifrado y no se puede leer localmente.');
    }
    if (error.message?.includes('escaneado')) {
      throw error;
    }
    throw new Error('No se pudo leer el PDF. Puede estar protegido, escaneado o dañado.');
  }
}
