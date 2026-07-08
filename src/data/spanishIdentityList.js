export const spanishFirstNames = [
  'José',
  'María',
  'Antonio',
  'Manuel',
  'Francisco',
  'Juan',
  'Carmen',
  'Ana',
  'Laura',
  'Javier',
];

export const spanishSurnames = [
  'García',
  'Rodríguez',
  'González',
  'Fernández',
  'López',
  'Martínez',
  'Sánchez',
  'Pérez',
  'Gómez',
  'Saura',
];

export function createSpanishLocalConfig() {
  return {
    profileName: 'Configuración española',
    alwaysHideIdentities: [...spanishFirstNames, ...spanishSurnames].join('\n'),
    alwaysHideOrganizations: '',
    preserveOrganizations: '',
    preserveClinicalWords: '',
    customIdentityLabels: '',
  };
}
