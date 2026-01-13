"use client";

import { createContext, useContext, useState, useEffect, ReactNode } from "react";
import { IntlProvider } from "next-intl";
import {
  Locale,
  defaultLocale,
  getBrowserLocale,
  getStoredLocale,
  setStoredLocale,
} from "@/i18n/config";

import ko from "@/messages/ko.json";
import en from "@/messages/en.json";

const messages: Record<Locale, typeof ko> = {
  ko,
  en,
};

interface I18nContextType {
  locale: Locale;
  setLocale: (locale: Locale) => void;
}

const I18nContext = createContext<I18nContextType | null>(null);

export function useI18n() {
  const context = useContext(I18nContext);
  if (!context) {
    throw new Error("useI18n must be used within I18nProvider");
  }
  return context;
}

interface I18nProviderProps {
  children: ReactNode;
}

export function I18nProvider({ children }: I18nProviderProps) {
  const [locale, setLocaleState] = useState<Locale>(defaultLocale);
  const [isInitialized, setIsInitialized] = useState(false);

  // Initialize locale from storage or browser preference
  useEffect(() => {
    const storedLocale = getStoredLocale();
    if (storedLocale) {
      setLocaleState(storedLocale);
    } else {
      const browserLocale = getBrowserLocale();
      setLocaleState(browserLocale);
      setStoredLocale(browserLocale);
    }
    setIsInitialized(true);
  }, []);

  const setLocale = (newLocale: Locale) => {
    setLocaleState(newLocale);
    setStoredLocale(newLocale);
  };

  // Prevent flash of default locale content
  if (!isInitialized) {
    return null;
  }

  return (
    <I18nContext.Provider value={{ locale, setLocale }}>
      <IntlProvider locale={locale} messages={messages[locale]} timeZone="Asia/Seoul">
        {children}
      </IntlProvider>
    </I18nContext.Provider>
  );
}
