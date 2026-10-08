import React, { useEffect, useState } from 'react'
import { useSettingsStore } from '../../store/useSettingsStore'
import { useAppStore } from '../../store/useAppStore'
import { getSession, logout } from '../../lib/api'
import { saveProfile, useProfile } from '../../hooks/useProfile'
import { SummaryScheduleSettings } from '../summaries/SummaryScheduleSettings'
import {
  exportAllNotesAsMarkdown,
  exportDatabaseAsJson,
  exportNotesAsZip,
} from '../../lib/export'

export const SettingsPage: React.FC = () => {
  const {
    subscriptionStatus,
    aiMode,
    structuringStyle,
    theme,
    fontScale,
    language,
    updateSettings,
    clearCache,
  } = useSettingsStore()

  const { items } = useAppStore()
  const profile = useProfile()
  const [profileName, setProfileName] = useState(profile.name)
  const [profileAvatar, setProfileAvatar] = useState(profile.avatar)
  const [profileError, setProfileError] = useState<string | null>(null)
  const [avatarLoading, setAvatarLoading] = useState(false)
  useEffect(() => {
    setProfileName(profile.name)
    setProfileAvatar(profile.avatar)
    setProfileError(null)
  }, [profile.name, profile.avatar, profile.email])

  const selectAvatar = (file?: File) => {
    if (!file) return
    setProfileError(null)
    if (!['image/png', 'image/jpeg', 'image/webp'].includes(file.type) || file.size > 2 * 1024 * 1024) {
      setProfileError('Выберите PNG, JPEG или WebP размером до 2 МБ.')
      return
    }
    const owner = getSession()?.user.id
    const reader = new FileReader()
    setAvatarLoading(true)
    reader.onload = () => {
      setAvatarLoading(false)
      if (getSession()?.user.id === owner && typeof reader.result === 'string') setProfileAvatar(reader.result)
    }
    reader.onerror = () => {
      setAvatarLoading(false)
      setProfileError('Не удалось прочитать фотографию. Выберите другой файл.')
    }
    reader.readAsDataURL(file)
  }

  const [exportError, setExportError] = useState<string | null>(null)
  const [logoutError, setLogoutError] = useState<string | null>(null)
  const [loggingOut, setLoggingOut] = useState(false)
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
      {exportError && <p role="alert" className="text-error">{exportError}</p>}
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
            Профиль
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
        <SummaryScheduleSettings />
        {/* 1. Profile Section */}
        <section className="p-space-lg rounded-2xl bg-surface-container-low border border-surface-container-high/30 flex flex-col gap-space-md shadow-sm">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-space-xs">
              <span className="material-symbols-outlined text-primary text-body-lg">person</span>
              <h2 className="font-headline-sm text-headline-sm text-on-surface font-semibold">
                Настройки аккаунта
              </h2>
            </div>
            <span className="px-2.5 py-1 rounded-full bg-secondary-container text-on-secondary font-label-sm text-label-sm font-semibold glow-emerald">
              {subscriptionStatus === 'pro' ? 'Pro Подписка' : 'Базовый тариф'}
            </span>
          </div>

          <div className="flex items-center gap-4 py-2">
            <div className="w-14 h-14 rounded-full bg-surface-container-highest border border-primary/40 text-primary flex items-center justify-center font-bold text-xl shadow-xs">
              {profileAvatar ? <img src={profileAvatar} alt="Фото профиля" className="w-full h-full rounded-full object-cover" /> : profile.initials}
            </div>
            <div className="flex flex-col">
              <span className="text-title-md font-semibold text-on-surface">{profile.name}</span>
              <span className="text-body-sm text-outline">{profile.email}</span>
            </div>
          </div>
          <form className="flex flex-col gap-3" onSubmit={(event) => {
            event.preventDefault()
            setProfileError(null)
            try {
              saveProfile(profileName, profileAvatar)
              showSavedIndicator()
            } catch (error) { setProfileError((error as Error).message) }
          }}>
            <label className="flex flex-col gap-1.5 text-body-sm text-on-surface-variant">
              Отображаемое имя
              <input required maxLength={80} autoComplete="nickname" value={profileName}
                onChange={(event) => setProfileName(event.target.value)}
                className="w-full rounded-xl bg-surface-container border border-outline-variant/30 px-3 py-2.5 text-on-surface focus:outline-primary" />
            </label>
            <label className="flex flex-col gap-1.5 text-body-sm text-on-surface-variant">
              Фотография профиля
              <input type="file" accept="image/png,image/jpeg,image/webp" disabled={avatarLoading}
                onChange={(event) => { selectAvatar(event.target.files?.[0]); event.target.value = '' }}
                className="text-body-sm file:mr-3 file:rounded-lg file:border-0 file:bg-surface-container-high file:px-3 file:py-2 file:text-on-surface" />
            </label>
            <p className="text-body-sm text-outline">PNG, JPEG или WebP до 2 МБ. Имя и фото сохраняются для этого аккаунта в этом браузере.</p>
            {profileError && <p role="alert" className="text-error text-body-sm">{profileError}</p>}
            <div className="flex flex-wrap gap-2">
              <button type="submit" disabled={avatarLoading || !profileName.trim() || (profileName.trim() === profile.name && profileAvatar === profile.avatar)}
                className="rounded-xl bg-primary text-on-primary px-4 py-2 text-label-lg font-medium disabled:opacity-50">
                Сохранить профиль
              </button>
              {profileAvatar && <button type="button" disabled={avatarLoading} onClick={() => setProfileAvatar('')}
                className="rounded-xl px-4 py-2 text-label-lg text-on-surface-variant hover:bg-surface-container-high">Удалить фото</button>}
              <button type="button" disabled={avatarLoading} onClick={() => {
                setProfileName(profile.name)
                setProfileAvatar(profile.avatar)
                setProfileError(null)
              }} className="rounded-xl px-4 py-2 text-label-lg text-on-surface-variant hover:bg-surface-container-high">Отменить</button>
            </div>
          </form>
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
              <div className="grid grid-cols-3 gap-2">
                <button
                  type="button"
                  data-testid="theme-btn-dark"
                  onClick={() => {
                    updateSettings({ theme: 'dark' })
                    showSavedIndicator()
                  }}
                  className={`p-3 rounded-xl border text-sm font-medium transition-all cursor-pointer flex items-center justify-center gap-1.5 ${
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
                  data-testid="theme-btn-light"
                  onClick={() => {
                    updateSettings({ theme: 'light' })
                    showSavedIndicator()
                  }}
                  className={`p-3 rounded-xl border text-sm font-medium transition-all cursor-pointer flex items-center justify-center gap-1.5 ${
                    theme === 'light'
                      ? 'bg-surface-container-high text-on-surface border-primary ring-1 ring-primary/40'
                      : 'bg-surface-container text-outline border-outline-variant/20 hover:text-on-surface'
                  }`}
                >
                  <span className="material-symbols-outlined text-base">light_mode</span>
                  <span>Светлая</span>
                </button>
                <button
                  type="button"
                  data-testid="theme-btn-system"
                  onClick={() => {
                    updateSettings({ theme: 'system' })
                    showSavedIndicator()
                  }}
                  className={`p-3 rounded-xl border text-sm font-medium transition-all cursor-pointer flex items-center justify-center gap-1.5 ${
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

        <section className="p-space-lg rounded-2xl bg-surface-container-low border border-surface-container-high/30 text-on-surface">
          <h2 className="font-semibold">Хранение в аккаунте</h2>
          <p className="text-sm text-on-surface-variant mt-2">Заметки сохраняются в вашем аккаунте и доступны после входа на других устройствах. Исходники загруженного аудио хранятся 14 дней; текст остаётся.</p>
        </section>

        {/* 5. AI Engine & Structuring Style Section */}
        <section className="p-space-lg rounded-2xl bg-surface-container-low border border-surface-container-high/30 flex flex-col gap-space-md shadow-sm">
          <div className="flex items-center gap-space-xs">
            <span className="material-symbols-outlined text-primary text-body-lg">auto_awesome</span>
            <h2 className="font-headline-sm text-headline-sm text-on-surface font-semibold">
              Параметры обработки
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
                  <span className="font-semibold text-body-md text-on-surface">Быстрый</span>
                  <span className="text-xs px-2 py-0.5 rounded bg-surface-container-highest">По умолчанию</span>
                </div>
                <span className="text-xs text-outline">
                  Очистка текста, выделение основной мысли и явно заданных действий.
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
                  <span className="font-semibold text-body-md text-on-surface">Глубокий анализ</span>
                  <span className="text-xs px-2 py-0.5 rounded bg-secondary-container text-on-secondary font-semibold">
                    Pro
                  </span>
                </div>
                <span className="text-xs text-outline">
                  Разбор контекста, связей и последовательности действий с сохранением важных условий.
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
                { key: 'concise' as const, label: 'Кратко', desc: '1–2 тезиса' },
                { key: 'detailed' as const, label: 'Подробно', desc: 'Полный контекст' },
                { key: 'action_plan' as const, label: 'План действий', desc: 'Чек-лист шагов' },
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
            В аккаунте {items.length} записей. Вы можете выгрузить архив или снимок заметок.
          </p>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            <button
              type="button"
              onClick={() => { setExportError(null); void exportNotesAsZip(items).catch((error) => setExportError(error.message)) }}
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
              <span className="text-xs text-outline">Сбросить оформление и настройки этого устройства</span>
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

      <div className="border-t border-outline-variant/20 pt-space-lg pb-space-lg">
        {logoutError && <p role="alert" className="text-error text-body-sm mb-3">{logoutError}</p>}
        <button
          type="button"
          disabled={loggingOut}
          onClick={async () => {
            if (loggingOut) return
            setLoggingOut(true)
            setLogoutError(null)
            try {
              await logout()
            } catch (error) {
              setLogoutError((error as Error).message)
            } finally {
              setLoggingOut(false)
            }
          }}
          className="inline-flex items-center justify-center gap-2 rounded-xl border border-outline-variant/30 px-4 py-2.5 text-sm font-medium text-on-surface-variant hover:bg-surface-container-high transition-colors cursor-pointer disabled:opacity-50 disabled:cursor-wait"
        >
          <span className="material-symbols-outlined text-base" aria-hidden="true">logout</span>
          {loggingOut ? 'Выходим…' : 'Выйти'}
        </button>
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
