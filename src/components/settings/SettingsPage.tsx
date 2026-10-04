import React, { useState, useRef, useEffect } from 'react'

export const SettingsPage: React.FC = () => {
  const [apiKey, setApiKey] = useState('')
  const [showKey, setShowKey] = useState(false)
  const [selectedModel, setSelectedModel] = useState('gemini-2.0-flash')
  const [isSaved, setIsSaved] = useState(false)
  const saveTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null)

  useEffect(() => {
    return () => {
      if (saveTimeoutRef.current) {
        clearTimeout(saveTimeoutRef.current)
      }
    }
  }, [])

  const handleSave = (e: React.FormEvent) => {
    e.preventDefault()
    setIsSaved(true)
    if (saveTimeoutRef.current) {
      clearTimeout(saveTimeoutRef.current)
    }
    saveTimeoutRef.current = setTimeout(() => {
      setIsSaved(false)
    }, 3000)
  }

  return (
    <div className="flex flex-col w-full gap-space-lg pt-space-md max-w-4xl">
      {/* Header */}
      <div>
        <div className="flex items-center gap-space-xs text-outline font-label-sm text-label-sm mb-1">
          <span className="material-symbols-outlined text-secondary text-sm">settings</span>
          <span className="uppercase tracking-wider">Параметры системы</span>
        </div>
        <h1 className="font-headline-xl text-headline-xl text-on-surface tracking-tight">
          Настройки и Профиль
        </h1>
        <p className="font-body-md text-body-md text-on-surface-variant mt-1">
          Управление AI-движком (Google AI Studio BYOK), хранилищем и персонализацией
        </p>
      </div>

      {/* Settings Form */}
      <form onSubmit={handleSave} className="flex flex-col gap-space-lg">
        {/* API Key Section */}
        <section className="p-space-lg rounded-2xl bg-surface-container-low border border-surface-container-high/30 flex flex-col gap-space-md shadow-sm">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-space-xs">
              <span className="material-symbols-outlined text-primary text-body-lg">key</span>
              <h3 className="font-headline-sm text-headline-sm text-on-surface">
                Google AI Studio API Key (BYOK)
              </h3>
            </div>
            <span className="px-2 py-0.5 rounded-full bg-secondary-container text-on-secondary font-label-sm text-label-sm">
              Бесплатный тариф ($0/мес)
            </span>
          </div>

          <p className="font-body-sm text-body-sm text-on-surface-variant leading-relaxed">
            Ваш ключ хранится исключительно в локальном хранилище вашего браузера (Local Storage /
            IndexedDB) и отправляется только напрямую на сервера Google AI Studio.
          </p>

          <div className="flex items-center gap-space-sm">
            <div className="relative flex-1">
              <label htmlFor="gemini-api-key" className="sr-only">
                Google AI Studio API Key
              </label>
              <input
                id="gemini-api-key"
                type={showKey ? 'text' : 'password'}
                value={apiKey}
                onChange={(e) => setApiKey(e.target.value)}
                placeholder="AIzaSy..."
                aria-label="Google AI Studio API Key"
                className="w-full px-space-md py-2.5 rounded-xl bg-surface-container text-on-surface placeholder:text-outline border border-surface-container-high/40 focus:border-primary/50 outline-none font-mono text-body-sm"
              />
              <button
                type="button"
                onClick={() => setShowKey(!showKey)}
                aria-label={showKey ? 'Скрыть ключ' : 'Показать ключ'}
                className="absolute right-3 top-2.5 text-outline hover:text-on-surface transition-colors cursor-pointer"
              >
                <span className="material-symbols-outlined text-sm">
                  {showKey ? 'visibility_off' : 'visibility'}
                </span>
              </button>
            </div>

            <button
              type="submit"
              className="px-space-lg py-2.5 rounded-xl bg-primary text-on-primary hover:bg-primary-container hover:text-on-primary-container font-label-md text-label-md transition-all glow-violet cursor-pointer shrink-0"
            >
              {isSaved ? 'Сохранено!' : 'Сохранить ключ'}
            </button>
          </div>

          {/* Model Selector */}
          <div className="flex flex-col gap-space-xs mt-2">
            <span id="model-selector-label" className="font-label-sm text-label-sm text-outline">
              Используемая языковая модель:
            </span>
            <div
              role="radiogroup"
              aria-labelledby="model-selector-label"
              className="grid grid-cols-1 sm:grid-cols-2 gap-space-sm"
            >
              <button
                type="button"
                role="radio"
                aria-checked={selectedModel === 'gemini-2.0-flash'}
                onClick={() => setSelectedModel('gemini-2.0-flash')}
                className={`p-space-sm rounded-xl text-left border transition-all cursor-pointer ${
                  selectedModel === 'gemini-2.0-flash'
                    ? 'bg-primary/10 border-primary text-on-surface'
                    : 'bg-surface-container border-surface-container-high/30 text-on-surface-variant'
                }`}
              >
                <div className="font-label-md text-label-md font-semibold">Gemini 2.0 Flash</div>
                <div className="font-body-sm text-xs text-outline">
                  Сверхбыстрый отклик &lt; 0.6 сек, идеален для заметок
                </div>
              </button>

              <button
                type="button"
                role="radio"
                aria-checked={selectedModel === 'gemini-2.5-flash'}
                onClick={() => setSelectedModel('gemini-2.5-flash')}
                className={`p-space-sm rounded-xl text-left border transition-all cursor-pointer ${
                  selectedModel === 'gemini-2.5-flash'
                    ? 'bg-primary/10 border-primary text-on-surface'
                    : 'bg-surface-container border-surface-container-high/30 text-on-surface-variant'
                }`}
              >
                <div className="font-label-md text-label-md font-semibold">Gemini 2.5 Flash</div>
                <div className="font-body-sm text-xs text-outline">
                  Глубокий анализ задач и суммаризация встреч
                </div>
              </button>
            </div>
          </div>
        </section>

        {/* Local Storage Section */}
        <section className="p-space-lg rounded-2xl bg-surface-container-low border border-surface-container-high/30 flex flex-col gap-space-md shadow-sm">
          <div className="flex items-center gap-space-xs">
            <span className="material-symbols-outlined text-secondary text-body-lg">database</span>
            <h3 className="font-headline-sm text-headline-sm text-on-surface">
              Локальное хранилище (Local-First IndexedDB)
            </h3>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-space-md">
            <div className="p-space-sm rounded-xl bg-surface-container flex flex-col gap-1">
              <span className="text-outline text-xs">Статус базы</span>
              <span className="text-secondary font-semibold text-sm flex items-center gap-1">
                <span className="w-2 h-2 rounded-full bg-secondary" />
                IndexedDB Активна
              </span>
            </div>
            <div className="p-space-sm rounded-xl bg-surface-container flex flex-col gap-1">
              <span className="text-outline text-xs">Размер хранилища</span>
              <span className="text-on-surface font-semibold text-sm">16.4 / 20 ГБ</span>
            </div>
            <div className="p-space-sm rounded-xl bg-surface-container flex flex-col gap-1">
              <span className="text-outline text-xs">FTS Поисковый индекс</span>
              <span className="text-tertiary font-semibold text-sm">MiniSearch готов</span>
            </div>
          </div>
        </section>
      </form>
    </div>
  )
}
