import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import { en, te, TranslationKey } from '../lib/translations';

type Language = 'en' | 'te';

interface TranslationStore {
  lang: Language;
  setLang: (lang: Language) => void;
}

export const useTranslationStore = create<TranslationStore>()(
  persist(
    (set) => ({
      lang: 'en',
      setLang: (lang) => set({ lang }),
    }),
    {
      name: 'u9-language-pref',
    }
  )
);

export function useTranslation() {
  const { lang, setLang } = useTranslationStore();
  const t = lang === 'te' ? te : en;

  return { t, lang, setLang };
}
