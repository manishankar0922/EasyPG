import { useState, useEffect } from 'react';
import { translations } from '../lib/translations';

export function useTranslation() {
  const [lang, setLang] = useState<'en' | 'te'>(() => {
    if (typeof window !== 'undefined') {
      return (localStorage.getItem('u9pgs_lang') as 'en' | 'te') || 'en';
    }
    return 'en';
  });

  const switchLanguage = (newLang: 'en' | 'te') => {
    setLang(newLang);
    if (typeof window !== 'undefined') {
      localStorage.setItem('u9pgs_lang', newLang);
    }
  };

  const t = translations[lang];

  return { t, lang, setLang: switchLanguage };
}
