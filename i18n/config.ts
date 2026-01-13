export const locales = ['ko', 'en'] as const;
export type Locale = (typeof locales)[number];
export const defaultLocale: Locale = 'ko';

// Get browser preferred locale
export function getBrowserLocale(): Locale {
  if (typeof window === 'undefined') return defaultLocale;

  const browserLang = navigator.language.split('-')[0];
  return locales.includes(browserLang as Locale) ? (browserLang as Locale) : defaultLocale;
}

// Local storage key for persisted locale
export const LOCALE_STORAGE_KEY = 'coscos-locale';

// Get stored locale from localStorage
export function getStoredLocale(): Locale | null {
  if (typeof window === 'undefined') return null;

  const stored = localStorage.getItem(LOCALE_STORAGE_KEY);
  if (stored && locales.includes(stored as Locale)) {
    return stored as Locale;
  }
  return null;
}

// Store locale to localStorage
export function setStoredLocale(locale: Locale): void {
  if (typeof window === 'undefined') return;
  localStorage.setItem(LOCALE_STORAGE_KEY, locale);
}
