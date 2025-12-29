import { useState, useEffect, useCallback } from 'react'

export interface Settings {
  aiBaseUrl: string
  aiApiKey: string
  aiModel: string
}

const STORAGE_KEY = 'jd_notes_settings'

const defaultSettings: Settings = {
  aiBaseUrl: 'https://api.deepseek.com',
  aiApiKey: '',
  aiModel: 'deepseek-chat',
}

function loadSettings(): Settings {
  if (typeof window === 'undefined') return defaultSettings
  try {
    const stored = localStorage.getItem(STORAGE_KEY)
    if (stored) {
      return { ...defaultSettings, ...JSON.parse(stored) }
    }
  } catch (e) {
    console.error('Failed to load settings:', e)
  }
  return defaultSettings
}

function saveSettings(settings: Settings): void {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(settings))
  } catch (e) {
    console.error('Failed to save settings:', e)
  }
}

export function useSettings() {
  const [settings, setSettingsState] = useState<Settings>(loadSettings)

  // 更新单个设置项
  const updateSetting = useCallback(<K extends keyof Settings>(key: K, value: Settings[K]) => {
    setSettingsState((prev) => {
      const newSettings = { ...prev, [key]: value }
      saveSettings(newSettings)
      return newSettings
    })
  }, [])

  // 更新所有设置
  const updateSettings = useCallback((newSettings: Partial<Settings>) => {
    setSettingsState((prev) => {
      const merged = { ...prev, ...newSettings }
      saveSettings(merged)
      return merged
    })
  }, [])

  // 重置为默认设置
  const resetSettings = useCallback(() => {
    setSettingsState(defaultSettings)
    saveSettings(defaultSettings)
  }, [])

  return {
    settings,
    updateSetting,
    updateSettings,
    resetSettings,
  }
}

// 直接获取设置（用于非 React 环境）
export function getSettings(): Settings {
  return loadSettings()
}
