import { create } from 'zustand'

type Theme = 'minimal-white' | 'dark' | 'warm'

const THEME_STORAGE_KEY = 'novelcraft-theme'

const themeDataAttribute: Record<Theme, string | null> = {
  'minimal-white': null,
  'dark': 'dark',
  'warm': 'warm',
}

interface ThemeState {
  theme: Theme
  setTheme: (theme: Theme) => void
  cycleTheme: () => void
}

export const useThemeStore = create<ThemeState>((set, get) => ({
  theme: (localStorage.getItem(THEME_STORAGE_KEY) as Theme) || 'minimal-white',

  setTheme: (theme) => {
    const attr = themeDataAttribute[theme]
    if (attr) {
      document.documentElement.setAttribute('data-theme', attr)
    } else {
      document.documentElement.removeAttribute('data-theme')
    }
    localStorage.setItem(THEME_STORAGE_KEY, theme)
    set({ theme })
  },

  cycleTheme: () => {
    const themes: Theme[] = ['minimal-white', 'dark', 'warm']
    const current = get().theme
    const next = themes[(themes.indexOf(current) + 1) % themes.length]
    get().setTheme(next)
  },
}))
