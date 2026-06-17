'use client'

import { createContext, useContext, useState, useEffect } from 'react'
import { translations } from '@/lib/translations'

type Lang = 'en' | 'te'

interface LanguageContextType {
  lang: Lang
  t: typeof translations['en']
  switchLanguage: (lang: Lang) => void
}

const LanguageContext = createContext<LanguageContextType>({
  lang: 'en',
  t: translations['en'],
  switchLanguage: () => {}
})

export function LanguageProvider({ 
  children 
}: { 
  children: React.ReactNode 
}) {
  const [lang, setLang] = useState<Lang>('en')

  useEffect(() => {
    const saved = localStorage.getItem('u9pgs_lang') as Lang
    if (saved === 'en' || saved === 'te') {
      setLang(saved)
    }
  }, [])

  const switchLanguage = (newLang: Lang) => {
    setLang(newLang)
    localStorage.setItem('u9pgs_lang', newLang)
  }

  return (
    <LanguageContext.Provider
      value={{ lang, t: translations[lang], switchLanguage }}
    >
      {children}
    </LanguageContext.Provider>
  )
}

export const useLanguage = () => useContext(LanguageContext)
