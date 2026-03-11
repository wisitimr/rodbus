"use client";

import { createContext, useContext } from "react";
import type { Locale } from "./i18n";
import { getTranslations } from "./i18n";

type Translations = ReturnType<typeof getTranslations>;

const I18nContext = createContext<{ t: Translations; locale: Locale }>({
  t: getTranslations("en"),
  locale: "en",
});

export function I18nProvider({
  locale,
  children,
}: {
  locale: Locale;
  children: React.ReactNode;
}) {
  const t = getTranslations(locale);
  return (
    <I18nContext.Provider value={{ t, locale }}>
      {children}
    </I18nContext.Provider>
  );
}

export function useT() {
  return useContext(I18nContext);
}
