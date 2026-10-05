import React, { useState } from 'react'
import { useSettingsStore } from '../../store/useSettingsStore'
import { useAppStore } from '../../store/useAppStore'
import {
  exportAllNotesAsMarkdown,
  exportDatabaseAsJson,
  exportNotesAsZip,
} from '../../lib/export'

export const SettingsPage: React.FC = () => {
  const {
    userName,
    subscriptionStatus,
    aiMode,
    structuringStyle,
    theme,
    fontScale,
    language,
    devices,
    isSyncing,
    updateSettings,
    syncDevices,
    clearCache,
  } = useSettingsStore()

  const { items } = useAppStore()

  const [showClearConfirm, setShowClearConfirm] = useState(false)
  const [isSavedFeedback, setIsSavedFeedback] = useState(false)

  const showSavedIndicator = () => {
    setIsSavedFeedback(true)
    setTimeout(() => setIsSavedFeedback(false), 2000)
  }

  const handleClearCacheConfirm = async () => {
    await clearCache()
    setShowClearConfirm(false)
    window.location.reload()
  }

  return (
    <div className="flex flex-col w-full gap-space-lg pt-space-md max-w-4xl">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-end justify-between gap-space-md">
        <div>
          <div className="flex items-center gap-space-xs text-outline font-label-sm text-label-sm mb-1">
            <span className="material-symbols-outlined text-secondary text-sm">settings</span>
            <span className="uppercase tracking-wider">Параметры системы</span>
            <span>•</span>
            <span className="text-secondary font-medium">Версия 2.5.0</span>
          </div>
          <h1 className="font-headline-xl text-headline-xl text-on-surface tracking-tight font-semibold">
            Настройки
          </h1>
          <p className="font-body-md text-body-md text-on-surface-variant mt-1">
            Управление профилем, внешним видом, устройствами, параметрами AI и данными
          </p>
        </div>

        {isSavedFeedback && (
          <div className="px-3 py-1.5 rounded-xl bg-secondary-container text-on-secondary font-medium text-xs flex items-center gap-1 shadow-sm">
            <span className="material-symbols-outlined text-sm">check</span>
            <span>Настройки сохранены</span>
          </div>
        )}
      </div>

      <div className="flex flex-col gap-space-lg">
        {/* 1. Profile Section */}
        <section className="p-space-lg rounded-2xl bg-surface-container-low border border-surface-container-high/30 flex flex-col gap-space-md shadow-sm">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-space-xs">
              <span className="material-symbols-outlined text-primary text-body-lg">person</span>
              <h2 className="font-headline-sm text-headline-sm text-on-surface font-semibold">
                Профиль пользователя
              </h2>
            </div>
            <span className="px-2.5 py-1 rounded-full bg-secondary-container text-on-secondary font-label-sm text-label-sm font-semibold glow-emerald">
              {subscriptionStatus === 'pro' ? 'Pro Подписка' : 'Базовый тариф'}
            </span>
          </div>

          <div className="flex items-center gap-4 py-2">
            <div className="w-14 h-14 rounded-full bg-surface-container-highest border border-primary/40 text-primary flex items-center justify-center font-bold text-xl shadow-xs">
              {userName.charAt(0)}
            </div>
            <div className="flex flex-col">
              <span className="text-title-md font-semibold text-on-surface">{userName}</span>
              <span className="text-body-sm text-outline">alexander.developer@voicenotes.ai</span>
            </div>
          </div>
        </section>

        {/* 2. Appearance Section */}
        <section className="p-space-lg rounded-2xl bg-surface-container-low border border-surface-container-high/30 flex flex-col gap-space-md shadow-sm">
          <div className="flex items-center gap-space-xs">
            <span className="material-symbols-outlined text-secondary text-body-lg">palette</span>
            <h2 className="font-headline-sm text-headline-sm text-on-surface font-semibold">
              Внешний вид и Тема
            </h2>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="text-label-sm text-outline block mb-1.5 uppercase tracking-wider">
                Тема оформления
              </label>
              <div className="grid grid-cols-2 gap-2">
                <button
                  type="button"
                  onClick={() => {
                    updateSettings({ theme: 'dark' })
                    showSavedIndicator()
                  }}
                  className={`p-3 rounded-xl border text-sm font-medium transition-all cursor-pointer flex items-center justify-center gap-2 ${
                    theme === 'dark'
                      ? 'bg-surface-container-high text-on-surface border-primary ring-1 ring-primary/40'
                      : 'bg-surface-container text-outline border-outline-variant/20 hover:text-on-surface'
                  }`}
                >
                  <span className="material-symbols-outlined text-base">dark_mode</span>
                  <span>Тёмная</span>
                </button>
                <button
                  type="button"
                  onClick={() => {
                    updateSettings({ theme: 'system' })
                    showSavedIndicator()
                  }}
                  className={`p-3 rounded-xl border text-sm font-medium transition-all cursor-pointer flex items-center justify-center gap-2 ${
                    theme === 'system'
                      ? 'bg-surface-container-high text-on-surface border-primary ring-1 ring-primary/40'
                      : 'bg-surface-container text-outline border-outline-variant/20 hover:text-on-surface'
                  }`}
                >
                  <span className="material-symbols-outlined text-base">settings_suggest</span>
                  <span>Системная</span>
                </button>
              </div>
            </div>

            <div>
              <label className="text-label-sm text-outline block mb-1.5 uppercase tracking-wider">
                Масштаб интерфейса
              </label>
              <div className="grid grid-cols-2 gap-2">
                <button
                  type="button"
                  onClick={() => {
                    updateSettings({ fontScale: 'standard' })
                    showSavedIndicator()
                  }}
                  className={`p-3 rounded-xl border text-sm font-medium transition-all cursor-pointer flex items-center justify-center gap-2 ${
                    fontScale === 'standard'
                      ? 'bg-surface-container-high text-on-surface border-primary ring-1 ring-primary/40'
                      : 'bg-surface-container text-outline border-outline-variant/20 hover:text-on-surface'
                  }`}
                >
                  <span>Стандартный</span>
                </button>
                <button
                  type="button"
                  onClick={() => {
                    updateSettings({ fontScale: 'compact' })
                    showSavedIndicator()
                  }}
                  className={`p-3 rounded-xl border text-sm font-medium transition-all cursor-pointer flex items-center justify-center gap-2 ${
                    fontScale === 'compact'
                      ? 'bg-surface-container-high text-on-surface border-primary ring-1 ring-primary/40'
                      : 'bg-surface-container text-outline border-outline-variant/20 hover:text-on-surface'
                  }`}
                >
                  <span>Компактный</span>
                </button>
              </div>
            </div>
          </div>
        </section>

        {/* 3. Language Section */}
        <section className="p-space-lg rounded-2xl bg-surface-container-low border border-surface-container-high/30 flex flex-col gap-space-md shadow-sm">
          <div className="flex items-center gap-space-xs">
            <span className="material-symbols-outlined text-primary text-body-lg">translate</span>
            <h2 className="font-headline-sm text-headline-sm text-on-surface font-semibold">
              Язык и Распознавание речи (STT)
            </h2>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
            {[
              { code: 'ru-RU' as const, label: 'Русский (ru-RU)' },
              { code: 'en-US' as const, label: 'English (en-US)' },
              { code: 'auto' as const, label: 'Автоопределение' },
            ].map((item) => (
              <button
                key={item.code}
                type="button"
                onClick={() => {
                  updateSettings({ language: item.code })
                  showSavedIndicator()
                }}
                className={`p-3 rounded-xl border text-sm font-medium transition-all cursor-pointer text-center ${
                  language === item.code
                    ? 'bg-surface-container-high text-on-surface border-primary ring-1 ring-primary/40'
                    : 'bg-surface-container text-outline border-outline-variant/20 hover:text-on-surface'
                }`}
              >
                {item.label}
              </button>
            ))}
          </div>
        </section>

        {/* 4. Connected Devices Section */}
        <section className="p-space-lg rounded-2xl bg-surface-container-low border border-surface-container-high/30 flex flex-col gap-space-md shadow-sm">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-space-xs">
              <span className="material-symbols-outlined text-secondary text-body-lg">devices</span>
              <h2 className="font-headline-sm text-headline-sm text-on-surface font-semibold">
                Подключенные устройства
              </h2>
            </div>

            <button
              type="button"
              onClick={syncDevices}
              disabled={isSyncing}
              className="px-3.5 py-1.5 rounded-xl bg-surface-container-high hover:bg-surface-container-highest text-on-surface text-label-md font-medium transition-all flex items-center gap-1.5 cursor-pointer disabled:opacity-50"
            >
              <span className={`material-symbols-outlined text-base text-secondary ${isSyncing ? 'animate-spin' : ''}`}>
                sync
              </span>
              <span>{isSyncing ? 'Синхронизация...' : 'Синхронизировать сейчас'}</span>
            </button>
          </div>

          <div className="flex flex-col gap-2">
            {devices.map((device) => (
              <div
                key={device.id}
                className="p-3.5 rounded-xl bg-surface-container border border-outline-variant/20 flex items-center justify-between"
              >
                <div className="flex items-center gap-3">
                  <span className="material-symbols-outlined text-primary text-xl">
                    {device.type === 'laptop' ? 'laptop_mac' : 'smartphone'}
                  </span>
                  <div className="flex flex-col">
                    <span className="text-body-md font-medium text-on-surface flex items-center gap-2">
                      {device.name}
                      {device.isCurrent && (
                        <span className="px-1.5 py-0.5 rounded text-[10px] bg-secondary-container text-on-secondary font-semibold">
                          Текущее устройство
                        </span>
                      )}
                    </span>
                    <span className="text-xs text-outline">
                      Последняя синхронизация: {device.lastSyncAt}
                    </span>
                  </div>
                </div>

                <span className="w-2.5 h-2.5 rounded-full bg-secondary shadow-[0_0_8px_rgba(78,222,163,0.8)]" />
              </div>
            ))}
          </div>
        </section>

        {/* 5. AI Engine & Structuring Style Section */}
        <section className="p-space-lg rounded-2xl bg-surface-container-low border border-surface-container-high/30 flex flex-col gap-space-md shadow-sm">
          <div className="flex items-center gap-space-xs">
            <span className="material-symbols-outlined text-primary text-body-lg">auto_awesome</span>
            <h2 className="font-headline-sm text-headline-sm text-on-surface font-semibold">
              ИИ Движок и Структурирование (Gemini Flash)
            </h2>
          </div>

          {/* AI Mode Selector */}
          <div>
            <label className="text-label-sm text-outline block mb-1.5 uppercase tracking-wider">
              Режим обработки
            </label>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <button
                type="button"
                onClick={() => {
                  updateSettings({ aiMode: 'fast' })
                  showSavedIndicator()
                }}
                className={`p-4 rounded-xl border text-left transition-all cursor-pointer flex flex-col gap-1 ${
                  aiMode === 'fast'
                    ? 'bg-surface-container-high text-on-surface border-primary ring-1 ring-primary/40'
                    : 'bg-surface-container text-outline border-outline-variant/20 hover:text-on-surface'
                }`}
              >
                <div className="flex items-center justify-between">
                  <span className="font-semibold text-body-md text-on-surface">«Быстрый» (Fast Mode)</span>
                  <span className="text-xs px-2 py-0.5 rounded bg-surface-container-highest">По умолчанию</span>
                </div>
                <span className="text-xs text-outline">
                  Мгновенная очистка текста, выделение сути и задач (&lt; 0.6 сек).
                </span>
              </button>

              <button
                type="button"
                onClick={() => {
                  updateSettings({ aiMode: 'deep' })
                  showSavedIndicator()
                }}
                className={`p-4 rounded-xl border text-left transition-all cursor-pointer flex flex-col gap-1 ${
                  aiMode === 'deep'
                    ? 'bg-surface-container-high text-on-surface border-primary ring-1 ring-primary/40'
                    : 'bg-surface-container text-outline border-outline-variant/20 hover:text-on-surface'
                }`}
              >
                <div className="flex items-center justify-between">
                  <span className="font-semibold text-body-md text-on-surface">«Глубокий анализ (Pro)»</span>
                  <span className="text-xs px-2 py-0.5 rounded bg-secondary-container text-on-secondary font-semibold">
                    Pro
                  </span>
                </div>
                <span className="text-xs text-outline">
                  Углубленный разбор связей, декомпозиция подзадач, категоризация и дайджесты.
                </span>
              </button>
            </div>
          </div>

          {/* Structuring Style Selector */}
          <div>
            <label className="text-label-sm text-outline block mb-1.5 uppercase tracking-wider">
              Стиль суммаризации
            </label>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
              {[
                { key: 'concise' as const, label: '«Кратко»', desc: '1–2 тезиса' },
                { key: 'detailed' as const, label: '«Подробно»', desc: 'Полный контекст' },
                { key: 'action_plan' as const, label: '«План действий»', desc: 'Чек-лист шагов' },
              ].map((style) => (
                <button
                  key={style.key}
                  type="button"
                  onClick={() => {
                    updateSettings({ structuringStyle: style.key })
                    showSavedIndicator()
                  }}
                  className={`p-3 rounded-xl border text-left transition-all cursor-pointer flex flex-col ${
                    structuringStyle === style.key
                      ? 'bg-surface-container-high text-on-surface border-primary ring-1 ring-primary/40'
                      : 'bg-surface-container text-outline border-outline-variant/20 hover:text-on-surface'
                  }`}
                >
                  <span className="font-medium text-sm text-on-surface">{style.label}</span>
                  <span className="text-[11px] text-outline mt-0.5">{style.desc}</span>
                </button>
              ))}
            </div>
          </div>
        </section>

        {/* 6. Data Management Section */}
        <section className="p-space-lg rounded-2xl bg-surface-container-low border border-surface-container-high/30 flex flex-col gap-space-md shadow-sm">
          <div className="flex items-center gap-space-xs">
            <span className="material-symbols-outlined text-secondary text-body-lg">database</span>
            <h2 className="font-headline-sm text-headline-sm text-on-surface font-semibold">
              Управление данными и Экспорт
            </h2>
          </div>

          <p className="text-body-sm text-on-surface-variant">
            Локальное хранилище данных содержит {items.length} элементов. Вы можете в любой момент выгрузить полный архив или снимок базы.
          </p>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            <button
              type="button"
              onClick={() => exportNotesAsZip(items)}
              className="p-3 rounded-xl bg-surface-container hover:bg-surface-container-high border border-outline-variant/20 text-on-surface text-sm font-medium transition-all flex items-center justify-center gap-2 cursor-pointer"
            >
              <span className="material-symbols-outlined text-primary text-base">folder_zip</span>
              <span>Экспорт в ZIP</span>
            </button>

            <button
              type="button"
              onClick={() => exportDatabaseAsJson(items)}
              className="p-3 rounded-xl bg-surface-container hover:bg-surface-container-high border border-outline-variant/20 text-on-surface text-sm font-medium transition-all flex items-center justify-center gap-2 cursor-pointer"
            >
              <span className="material-symbols-outlined text-secondary text-base">data_object</span>
              <span>Экспорт в JSON</span>
            </button>

            <button
              type="button"
              onClick={() => exportAllNotesAsMarkdown(items)}
              className="p-3 rounded-xl bg-surface-container hover:bg-surface-container-high border border-outline-variant/20 text-on-surface text-sm font-medium transition-all flex items-center justify-center gap-2 cursor-pointer"
            >
              <span className="material-symbols-outlined text-[#4fc3f7] text-base">markdown</span>
              <span>Экспорт в .md</span>
            </button>
          </div>

          <div className="pt-2 border-t border-outline-variant/20 flex justify-between items-center">
            <div className="flex flex-col">
              <span className="text-sm font-medium text-error">Очистить локальный кэш</span>
              <span className="text-xs text-outline">Сбросить локальные данные и вернуть демо-состояние</span>
            </div>

            <button
              type="button"
              onClick={() => setShowClearConfirm(true)}
              className="px-4 py-2 rounded-xl bg-error-container text-on-error-container hover:bg-error text-sm font-medium transition-colors cursor-pointer"
            >
              Очистить кэш
            </button>
          </div>
        </section>
      </div>

      {/* Confirmation Modal for Clearing Cache */}
      {showClearConfirm && (
        <div
          role="dialog"
          aria-modal="true"
          aria-label="Подтверждение очистки кэша"
          className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-xs"
        >
          <div className="w-full max-w-md bg-surface-container rounded-2xl border border-error/40 p-6 flex flex-col gap-4 text-on-surface shadow-2xl">
            <div className="flex items-center gap-3 text-error">
              <span className="material-symbols-outlined text-2xl">warning</span>
              <h3 className="text-title-md font-semibold">Очистить локальный кэш?</h3>
            </div>
            <p className="text-body-sm text-on-surface-variant leading-relaxed">
              Это действие удалит локальные настройки и кэшированные данные в браузере. Вы уверены, что хотите продолжить?
            </p>
            <div className="flex items-center justify-end gap-3 pt-2">
              <button
                type="button"
                onClick={() => setShowClearConfirm(false)}
                className="px-4 py-2 rounded-xl bg-surface-container-high hover:bg-surface-container-highest text-on-surface text-sm font-medium transition-colors cursor-pointer"
              >
                Отмена
              </button>
              <button
                type="button"
                onClick={handleClearCacheConfirm}
                className="px-4 py-2 rounded-xl bg-error text-on-error hover:bg-error/90 text-sm font-medium transition-colors cursor-pointer"
              >
                Подтвердить очистку
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
