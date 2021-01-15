import { useState, useEffect, useCallback } from 'react'
import { useTranslation } from 'react-i18next'
import { LangConfig, LangKey } from '../types'

export const Languages: { [key in LangKey]: { name: string } } = {
  en: { name: 'English' },
  zh: { name: 'Chinese' },
  fr: { name: 'French' },
  ko: { name: 'Korean' },
}

export default (initial?: LangKey): LangConfig => {
  const [current, setCurrent] = useState<LangKey>()
  const { i18n } = useTranslation()

  const set = useCallback(
    (langKey: LangKey) => {
      i18n.changeLanguage(langKey)
      setCurrent(langKey)
    },
    [i18n]
  )

  useEffect(() => {
    set(initial ?? 'en')
  }, [initial, set])

  const list: LangKey[] = ['en', 'zh', 'fr', 'ko']

  return { current, list, set }
}

/* helper */
export const getLang = (langKey: LangKey) =>
  Languages[langKey] ?? Languages['en']
