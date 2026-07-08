import React, { useEffect, useMemo, useState } from 'react';
import { createSpanishLocalConfig } from './data/spanishIdentityList.js';
import { anonymizeText, DEFAULT_CONFIG } from './lib/anonymizer.js';

const CONFIG_KEY = 'localguard.config.v1';
const SETTINGS_OPEN_KEY = 'localguard.settingsOpen.v1';

const COUNTRY_OPTIONS = [
  ['espana', '🇪🇸 España', 'España'],
  ['francia', '🇫🇷 Francia', 'Francia'],
  ['italia', '🇮🇹 Italia', 'Italia'],
  ['alemania', '🇩🇪 Alemania', 'Alemania'],
  ['portugal', '🇵🇹 Portugal', 'Portugal'],
  ['reino-unido', '🇬🇧 Reino Unido', 'Reino Unido'],
  ['estados-unidos', '🇺🇸 Estados Unidos', 'Estados Unidos'],
  ['marruecos', '🇲🇦 Marruecos', 'Marruecos'],
  ['rumania', '🇷🇴 Rumanía', 'Rumanía'],
  ['colombia', '🇨🇴 Colombia', 'Colombia'],
  ['argentina', '🇦🇷 Argentina', 'Argentina'],
  ['mexico', '🇲🇽 México', 'México'],
];

export default function App() {
  const [inputText, setInputText] = useState('');
  const [outputText, setOutputText] = useState('');
  const [message, setMessage] = useState('');
  const [config, setConfig] = useState(DEFAULT_CONFIG);
  const [settingsOpen, setSettingsOpen] = useState(() => localStorage.getItem(SETTINGS_OPEN_KEY) === 'true');
  const [fileName, setFileName] = useState('');
  const [selectedCountry, setSelectedCountry] = useState(COUNTRY_OPTIONS[0][0]);

  const selectedCountryName = COUNTRY_OPTIONS.find(([value]) => value === selectedCountry)?.[2] || 'España';
  const countryPrompt = `Dame una lista de 1000 nombres y 1000 apellidos frecuentes de ${selectedCountryName}, con acentos y caracteres propios del idioma cuando correspondan, separados por comas, sin explicación, para pegar en una app de anonimización.`;

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
    localStorage.setItem(SETTINGS_OPEN_KEY, String(settingsOpen));
    setMessage('Configuración guardada solo en este dispositivo/navegador.');
  }

  function clearConfig() {
    if (!window.confirm('¿Seguro que quieres borrar la configuración guardada?')) return;
    localStorage.removeItem(CONFIG_KEY);
    setConfig(DEFAULT_CONFIG);
    setMessage('Configuración borrada.');
  }

  function loadSpanishConfig() {
    setConfig((current) => {
      const spanishConfig = {
        ...current,
        ...createSpanishLocalConfig(),
        spanishExtraIdentities: current.spanishExtraIdentities,
        internationalIdentities: current.internationalIdentities,
        alwaysHideOrganizations: current.alwaysHideOrganizations,
      };
      localStorage.setItem(CONFIG_KEY, JSON.stringify(spanishConfig));
      return spanishConfig;
    });
    setMessage('Configuración española cargada');
  }

  function updateConfigField(key, value) {
    setConfig((current) => {
      const nextConfig = { ...current, [key]: value };
      localStorage.setItem(CONFIG_KEY, JSON.stringify(nextConfig));
      return nextConfig;
    });
  }

  async function copyCountryPrompt() {
    await navigator.clipboard.writeText(countryPrompt);
    setMessage(`Prompt para ${selectedCountryName} copiado al portapapeles.`);
  }

  async function shareCountryPrompt() {
    if (navigator.share) {
      await navigator.share({ title: 'LocalGuard', text: countryPrompt });
      return;
    }

    await navigator.clipboard.writeText(countryPrompt);
    setMessage('Prompt copiado. Puedes pegarlo en tu IA.');
  }

  function toggleSettings() {
    setSettingsOpen((open) => {
      const nextOpen = !open;
      localStorage.setItem(SETTINGS_OPEN_KEY, String(nextOpen));
      return nextOpen;
    });
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
        <button className="settings-toggle" type="button" onClick={toggleSettings}>
          {settingsOpen ? 'Ocultar configuración' : 'Configuración'}
        </button>

        {settingsOpen && (
          <div className="settings-content">
            <div className="settings-actions single-column">
              <button type="button" onClick={loadSpanishConfig}>🇪🇸 Cargar configuración español</button>
            </div>

            <label className="config-field">
              <span>Nombres/apellidos españoles extra</span>
              <textarea
                value={config.spanishExtraIdentities}
                onChange={(event) => updateConfigField('spanishExtraIdentities', event.target.value)}
                placeholder="Saura, Gómez, Joaquín Saura"
              />
            </label>

            <label className="config-field">
              <span>Nombres/apellidos de otro país</span>
              <textarea
                value={config.internationalIdentities}
                onChange={(event) => updateConfigField('internationalIdentities', event.target.value)}
                placeholder="Smith, Johnson, William, Emma"
              />
            </label>

            <label className="config-field">
              <span>Organizaciones, centros o empresas a ocultar</span>
              <textarea
                value={config.alwaysHideOrganizations}
                onChange={(event) => updateConfigField('alwaysHideOrganizations', event.target.value)}
                placeholder="Una entrada por línea, coma o punto y coma"
              />
            </label>

            <label className="config-field">
              <span>🌍 Crear lista de otro país</span>
              <select value={selectedCountry} onChange={(event) => setSelectedCountry(event.target.value)}>
                {COUNTRY_OPTIONS.map(([value, label]) => (
                  <option key={value} value={value}>{label}</option>
                ))}
              </select>
            </label>

            <div className="settings-actions">
              <button type="button" onClick={copyCountryPrompt}>Copiar prompt</button>
              <button type="button" onClick={shareCountryPrompt}>Compartir prompt</button>
            </div>

            <div className="settings-actions">
              <button type="button" onClick={saveConfig}>Guardar configuración</button>
              <button type="button" onClick={clearConfig}>Borrar configuración</button>
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
