import { SPANISH_FIRST_NAMES, SPANISH_SURNAMES } from '../data/spanishNames.js';

export const DEFAULT_CONFIG = {
  profileName: '',
  alwaysHideIdentities: '',
  spanishExtraIdentities: '',
  internationalIdentities: '',
  alwaysHideOrganizations: '',
  preserveOrganizations: '',
  preserveClinicalWords: '',
  customIdentityLabels: '',
};

const MARKERS = {
  dni: '[DNI_NIE_CENSURADO]',
  email: '[EMAIL_CENSURADO]',
  phone: '[TEL_CENSURADO]',
  id: '[ID_CENSURADO]',
  address: '[DIRECCION_CENSURADA]',
  identity: '[IDENTIDAD_OCULTA]',
  organization: '[ORGANISMO_OCULTO]',
};

const BASE_ORGANIZATION_WORDS = [
  'HOSPITAL', 'GENERAL', 'UNIVERSITARIO', 'CLINICO', 'CLÍNICO', 'PROVINCIAL',
  'SERVICIO', 'DEPARTAMENTO', 'GENERALITAT', 'CONSELLERIA', 'SANITAT', 'CENTRO',
  'CLINICA', 'CLÍNICA', 'UNIDAD', 'CONSULTA', 'URGENCIAS', 'RADIOLOGIA',
  'RADIOLOGÍA', 'TRAUMATOLOGIA', 'TRAUMATOLOGÍA', 'REHABILITACION',
  'REHABILITACIÓN', 'NEUROLOGIA', 'NEUROLOGÍA', 'ADMINISTRACION',
  'ADMINISTRACIÓN', 'AYUNTAMIENTO', 'MUTUA', 'INSS', 'FREMAP', 'ASISA',
  'SEGURIDAD SOCIAL', 'INSTITUTO', 'NACIONAL',
];

const BASE_CLINICAL_WORDS = [
  'DOLOR', 'LUMBAR', 'CERVICAL', 'CRONICO', 'CRÓNICO', 'FRACTURA', 'HERNIA',
  'PROTRUSION', 'PROTRUSIÓN', 'ARTROSIS', 'TENDINITIS', 'ANSIEDAD',
  'DEPRESION', 'DEPRESIÓN', 'HEMORROIDES', 'ALMORRANA', 'FISURA', 'QUISTE',
  'INFECCION', 'INFECCIÓN', 'DIAGNOSTICO', 'DIAGNÓSTICO', 'TRATAMIENTO',
  'OBSERVACIONES', 'ANTECEDENTES', 'EXPLORACION', 'EXPLORACIÓN', 'CONCLUSIONES',
  'RESONANCIA', 'RADIOGRAFIA', 'RADIOGRAFÍA', 'ECOGRAFIA', 'ECOGRAFÍA',
  'ANALITICA', 'ANALÍTICA', 'FARMACOLOGICO', 'FARMACOLÓGICO', 'MAGNETICA',
  'MAGNÉTICA',
];

const PERSONAL_LABELS = [
  'PACIENTE', 'NOMBRE', 'APELLIDOS', 'NOMBRE Y APELLIDOS', 'FILIACION',
  'FILIACIÓN', 'TITULAR', 'SOLICITANTE', 'FDO', 'FIRMADO', 'DR', 'DRA',
  'MEDICO', 'MÉDICO', 'FACULTATIVO',
];

const ID_LABELS = [
  'SIP', 'NHC', 'HISTORIA CLINICA', 'HISTORIA CLÍNICA', 'Nº HISTORIA',
  'NUMERO HISTORIA', 'NÚMERO HISTORIA', 'NASS', 'SEGURIDAD SOCIAL', 'IBAN',
  'CUENTA', 'CUENTA BANCARIA', 'TARJETA', 'REFERENCIA', 'EXPEDIENTE',
  'LOCALIZADOR', 'CODIGO', 'CÓDIGO',
];

const ADDRESS_LABELS = ['DOMICILIO', 'DIRECCIÓN', 'DIRECCION'];
const FIRST_NAME_SET = new Set(SPANISH_FIRST_NAMES.map(normalizeForCompare));
const SURNAME_SET = new Set(SPANISH_SURNAMES.map(normalizeForCompare));
const LOWER_CONNECTORS = new Set(['de', 'del', 'la', 'las', 'los', 'y']);
const UPPER_CONNECTORS = new Set(['DE', 'DEL', 'LA', 'LAS', 'LOS', 'Y']);

export function normalizeForCompare(value) {
  return String(value || '')
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/Ñ/g, 'N')
    .replace(/ñ/g, 'n')
    .toUpperCase()
    .replace(/\s+/g, ' ')
    .trim();
}

export function parseMultilineList(value) {
  return String(value || '')
    .split(/\r?\n|,|;/)
    .map((item) => item.trim())
    .filter(Boolean);
}

export function anonymizeText(input, config = DEFAULT_CONFIG) {
  let text = String(input || '');
  if (!text.trim()) return '';

  const normalizedConfig = { ...DEFAULT_CONFIG, ...config };
  const customIdentities = [
    ...parseMultilineList(normalizedConfig.alwaysHideIdentities),
    ...parseMultilineList(normalizedConfig.spanishExtraIdentities),
    ...parseMultilineList(normalizedConfig.internationalIdentities),
  ];
  const customOrganizations = parseMultilineList(normalizedConfig.alwaysHideOrganizations);
  const customLabels = parseMultilineList(normalizedConfig.customIdentityLabels);
  const clinicalWords = [
    ...BASE_CLINICAL_WORDS,
    ...parseMultilineList(normalizedConfig.preserveClinicalWords),
  ].map(normalizeForCompare);
  const organizationWords = [
    ...BASE_ORGANIZATION_WORDS,
    ...parseMultilineList(normalizedConfig.preserveOrganizations),
  ].map(normalizeForCompare);

  text = replaceLiteralList(text, customIdentities, MARKERS.identity);
  text = replaceLiteralList(text, customOrganizations, MARKERS.organization);
  text = replaceLabeledValues(text, customLabels, MARKERS.identity, true);
  text = applyAutomaticIdRules(text);
  text = replaceAddresses(text);
  text = replacePersonalLabels(text);
  text = replaceUppercaseNames(text, organizationWords, clinicalWords);
  text = replaceTitleCaseNames(text, organizationWords, clinicalWords);

  return text;
}

function replaceLiteralList(text, values, marker) {
  return values.reduce((current, value) => {
    const escaped = escapeRegExp(value.trim());
    if (!escaped) return current;
    return current.replace(new RegExp(`\\b${escaped}\\b`, 'giu'), marker);
  }, text);
}

function applyAutomaticIdRules(text) {
  let output = text
    .replace(/\b(?:[XYZ]\s?\d{7}\s?[A-Z]|\d{8}\s?[A-Z])\b/giu, MARKERS.dni)
    .replace(/\b[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}\b/giu, MARKERS.email)
    .replace(/\b(?:ES\s?\d{2}(?:[\s-]?\d{4}){5}|[A-Z]{2}\s?\d{2}(?:[\s-]?[A-Z0-9]{4}){3,7})\b/giu, MARKERS.id)
    .replace(/\b(?:\d[ -]*?){13,19}\b/g, (match) => (digitCount(match) >= 13 ? MARKERS.id : match))
    .replace(/(^|[^\dA-Z])((?:\+34[\s-]?)?[6789]\d(?:[\s-]?\d){7})\b/giu, (_match, prefix) => `${prefix}${MARKERS.phone}`);

  output = replaceLabeledValues(output, ID_LABELS, MARKERS.id, false);

  return output.replace(/\b\d{6,}\b/g, (match, offset, fullText) => {
    if (isDateContext(match, offset, fullText) || hasClinicalUnit(offset + match.length, fullText)) {
      return match;
    }

    const before = fullText.slice(Math.max(0, offset - 48), offset);
    if (labelAppearsBefore(before, ID_LABELS)) {
      return MARKERS.id;
    }

    return `${match.slice(0, -3)}***`;
  });
}

function replaceLabeledValues(text, labels, marker, keepWords) {
  if (!labels.length) return text;
  const labelPattern = [...labels].sort((a, b) => b.length - a.length).map(escapeRegExp).join('|');
  const valuePattern = keepWords
    ? '[A-ZÁÉÍÓÚÜÑ][A-ZÁÉÍÓÚÜÑa-záéíóúüñ .-]{2,80}'
    : '[A-Z0-9ÁÉÍÓÚÜÑ][A-Z0-9ÁÉÍÓÚÜÑ ./-]{2,80}';
  const regex = new RegExp(`\\b(${labelPattern})\\b\\s*[:：-]?\\s*(${valuePattern})`, 'giu');

  return text.replace(regex, (match, label, value) => {
    const safeValue = trimAtLineEnd(value);
    return match.replace(value, `${marker}${value.slice(safeValue.length)}`);
  });
}

function replaceAddresses(text) {
  const labelPattern = ADDRESS_LABELS.map(escapeRegExp).join('|');
  const regex = new RegExp(`\\b(${labelPattern})\\b\\s*[:：-]?\\s*([^\\n\\r]{4,140})`, 'giu');
  return text.replace(regex, (_match, label) => `${label}: ${MARKERS.address}`);
}

function replacePersonalLabels(text) {
  return replaceLabeledValues(text, PERSONAL_LABELS, MARKERS.identity, true);
}

function replaceUppercaseNames(text, organizationWords, clinicalWords) {
  return text.replace(
    /\b(?:[A-ZÁÉÍÓÚÜÑ]{2,}|DE|DEL|LA|LAS|LOS|Y)(?:\s+(?:[A-ZÁÉÍÓÚÜÑ]{2,}|DE|DEL|LA|LAS|LOS|Y)){2,5}\b/gu,
    (match) => (looksLikeUppercasePerson(match, organizationWords, clinicalWords) ? MARKERS.identity : match),
  );
}

function replaceTitleCaseNames(text, organizationWords, clinicalWords) {
  return text.replace(
    /\b[A-ZÁÉÍÓÚÜÑ][a-záéíóúüñ]{2,}(?:\s+(?:de|del|la|las|los|y))?(?:\s+[A-ZÁÉÍÓÚÜÑ][a-záéíóúüñ]{2,}){1,4}\b/gu,
    (match, offset, fullText) => {
      const before = fullText.slice(Math.max(0, offset - 24), offset);
      if (!/[.:;\n\r]\s*$|^\s*$/.test(before)) return match;
      return looksLikeTitleCasePerson(match, organizationWords, clinicalWords) ? MARKERS.identity : match;
    },
  );
}

function looksLikeUppercasePerson(value, organizationWords, clinicalWords) {
  const normalized = normalizeForCompare(value);
  if (containsAny(normalized, organizationWords) || containsAny(normalized, clinicalWords)) return false;

  const tokens = normalized.split(' ').filter((token) => !UPPER_CONNECTORS.has(token));
  if (tokens.length < 3 || tokens.length > 6) return false;

  const hasKnownFirstName = tokens.some((token) => FIRST_NAME_SET.has(token));
  const hasKnownSurname = tokens.some((token) => SURNAME_SET.has(token));
  return hasKnownFirstName && hasKnownSurname;
}

function looksLikeTitleCasePerson(value, organizationWords, clinicalWords) {
  const normalized = normalizeForCompare(value);
  if (containsAny(normalized, organizationWords) || containsAny(normalized, clinicalWords)) return false;

  const rawTokens = value.split(/\s+/).filter(Boolean);
  const tokens = rawTokens
    .filter((token) => !LOWER_CONNECTORS.has(token.toLowerCase()))
    .map(normalizeForCompare);
  if (tokens.length < 2 || tokens.length > 5) return false;

  const hasKnownFirstName = tokens.some((token) => FIRST_NAME_SET.has(token));
  const hasKnownSurname = tokens.some((token) => SURNAME_SET.has(token));
  return hasKnownFirstName && hasKnownSurname;
}

function containsAny(normalizedText, normalizedWords) {
  return normalizedWords.some((word) => word && new RegExp(`\\b${escapeRegExp(word)}\\b`, 'u').test(normalizedText));
}

function trimAtLineEnd(value) {
  return String(value).split(/\r?\n/)[0].trimEnd();
}

function labelAppearsBefore(before, labels) {
  const normalized = normalizeForCompare(before);
  return labels.map(normalizeForCompare).some((label) => new RegExp(`\\b${escapeRegExp(label)}\\b\\s*[:：-]?\\s*$`, 'u').test(normalized));
}

function hasClinicalUnit(endOffset, text) {
  return /^\s*(mg\/dl|mmol\/l|mmhg|mg|ml|mm|cm|kg|g|%|ui|horas|min)\b/iu.test(text.slice(endOffset, endOffset + 12));
}

function isDateContext(match, offset, text) {
  const left = text.slice(Math.max(0, offset - 6), offset);
  const right = text.slice(offset + match.length, offset + match.length + 6);
  const around = `${left}${match}${right}`;
  return /\b\d{1,2}[/-]\d{1,2}[/-]\d{4}\b/.test(around) || /\b\d{4}[/-]\d{1,2}[/-]\d{1,2}\b/.test(around);
}

function digitCount(value) {
  return (value.match(/\d/g) || []).length;
}

function escapeRegExp(value) {
  return String(value).replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}
