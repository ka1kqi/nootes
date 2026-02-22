import { createContext, useContext, useEffect, useState } from 'react'

// ─── Types ─────────────────────────────────────────────────────────────────────

export interface ThemeColors {
  forest: string
  forestDeep: string
  sage: string
  parchment: string
  cream: string
  amber: string
  sienna: string
  rust: string
  moss: string
  lichen: string
}

export interface Theme {
  id: string
  name: string
  /** 4 colors shown in the preview circle (quadrant conic-gradient) */
  preview: [string, string, string, string]
  colors: ThemeColors
}

export type FontScale = 'sm' | 'md' | 'lg'

// ─── Theme Definitions ─────────────────────────────────────────────────────────

export const THEMES: Theme[] = [
  {
    id: 'botanical',
    name: 'Botanical',
    preview: ['#1a2f26', '#8a9b75', '#E9E4D4', '#D4A843'],
    colors: {
      forest: '#1a2f26',
      forestDeep: '#0f1f1a',
      sage: '#8a9b75',
      parchment: '#E9E4D4',
      cream: '#F5F2EA',
      amber: '#D4A843',
      sienna: '#8B6E4E',
      rust: '#8B4513',
      moss: '#4A6741',
      lichen: '#5C7A6B',
    },
  },
  {
    id: 'ocean',
    name: 'Midnight Ocean',
    preview: ['#0f2744', '#4a8fad', '#d5e8f2', '#e0a830'],
    colors: {
      forest: '#0f2744',
      forestDeep: '#071a30',
      sage: '#4a8fad',
      parchment: '#d5e8f2',
      cream: '#e8f3f9',
      amber: '#e0a830',
      sienna: '#3a6888',
      rust: '#c03020',
      moss: '#1a5070',
      lichen: '#3070a0',
    },
  },
  {
    id: 'desert',
    name: 'Desert Rose',
    preview: ['#4a2010', '#c09070', '#f0e0cc', '#d48030'],
    colors: {
      forest: '#4a2010',
      forestDeep: '#2d1208',
      sage: '#c09070',
      parchment: '#f0e0cc',
      cream: '#f8f0e4',
      amber: '#d48030',
      sienna: '#a06840',
      rust: '#8b2010',
      moss: '#6a3018',
      lichen: '#8a5030',
    },
  },
  {
    id: 'lavender',
    name: 'Lavender Fields',
    preview: ['#2d1b5a', '#8a78b8', '#e8e2f8', '#c8a040'],
    colors: {
      forest: '#2d1b5a',
      forestDeep: '#1a0f38',
      sage: '#8a78b8',
      parchment: '#e8e2f8',
      cream: '#f3f0fb',
      amber: '#c8a040',
      sienna: '#7a68a0',
      rust: '#8b2070',
      moss: '#4a3878',
      lichen: '#6a58a8',
    },
  },
  {
    id: 'cherry',
    name: 'Cherry Blossom',
    preview: ['#4a1428', '#c07890', '#f5e2ea', '#e09040'],
    colors: {
      forest: '#4a1428',
      forestDeep: '#2d0818',
      sage: '#c07890',
      parchment: '#f5e2ea',
      cream: '#faf4f7',
      amber: '#e09040',
      sienna: '#b06080',
      rust: '#c02040',
      moss: '#782038',
      lichen: '#a84870',
    },
  },
  {
    id: 'charcoal',
    name: 'Charcoal',
    preview: ['#1c1c1c', '#888888', '#e2e2e2', '#e08030'],
    colors: {
      forest: '#1c1c1c',
      forestDeep: '#0a0a0a',
      sage: '#888888',
      parchment: '#e2e2e2',
      cream: '#f2f2f2',
      amber: '#e08030',
      sienna: '#808080',
      rust: '#c03020',
      moss: '#404040',
      lichen: '#606060',
    },
  },
  {
    id: 'arctic',
    name: 'Arctic',
    preview: ['#1a3555', '#5a90b8', '#d8ecf8', '#4090e0'],
    colors: {
      forest: '#1a3555',
      forestDeep: '#0f2040',
      sage: '#5a90b8',
      parchment: '#d8ecf8',
      cream: '#edf6fb',
      amber: '#4090e0',
      sienna: '#5080a0',
      rust: '#4060c0',
      moss: '#2060a0',
      lichen: '#4080b0',
    },
  },
  {
    id: 'ember',
    name: 'Ember',
    preview: ['#2c1808', '#c07848', '#f5e0c8', '#d48020'],
    colors: {
      forest: '#2c1808',
      forestDeep: '#180d04',
      sage: '#c07848',
      parchment: '#f5e0c8',
      cream: '#fbf0e4',
      amber: '#d48020',
      sienna: '#a06030',
      rust: '#c03010',
      moss: '#6a3010',
      lichen: '#8a5020',
    },
  },
  {
    id: 'coffee',
    name: 'Coffee House',
    preview: ['#1e1208', '#907868', '#e8ddd0', '#c09050'],
    colors: {
      forest: '#1e1208',
      forestDeep: '#100a04',
      sage: '#907868',
      parchment: '#e8ddd0',
      cream: '#f5f0ea',
      amber: '#c09050',
      sienna: '#7a6050',
      rust: '#8b4020',
      moss: '#4a3020',
      lichen: '#6a5040',
    },
  },
  {
    id: 'slate',
    name: 'Slate',
    preview: ['#1e2a38', '#6080a0', '#d8e2ee', '#c08830'],
    colors: {
      forest: '#1e2a38',
      forestDeep: '#0f1820',
      sage: '#6080a0',
      parchment: '#d8e2ee',
      cream: '#eaf0f6',
      amber: '#c08830',
      sienna: '#5070a0',
      rust: '#8b2020',
      moss: '#304060',
      lichen: '#507090',
    },
  },
  {
    id: 'rosegold',
    name: 'Rose Gold',
    preview: ['#3d2028', '#c09090', '#f8e8e8', '#d4a060'],
    colors: {
      forest: '#3d2028',
      forestDeep: '#250f15',
      sage: '#c09090',
      parchment: '#f8e8e8',
      cream: '#fdf4f4',
      amber: '#d4a060',
      sienna: '#a07070',
      rust: '#c02030',
      moss: '#6a3040',
      lichen: '#a05060',
    },
  },
  {
    id: 'sage-dusk',
    name: 'Sage Dusk',
    preview: ['#2a3530', '#7a9088', '#e2e8e4', '#a89060'],
    colors: {
      forest: '#2a3530',
      forestDeep: '#18201e',
      sage: '#7a9088',
      parchment: '#e2e8e4',
      cream: '#f0f3f1',
      amber: '#a89060',
      sienna: '#6a8078',
      rust: '#7a3020',
      moss: '#3a5048',
      lichen: '#5a7068',
    },
  },

  // ── Dark themes ───────────────────────────────────────────────────────────────
  {
    id: 'dark-navy',
    name: 'Deep Navy',
    preview: ['#0f1722', '#c8d8e8', '#1a2535', '#d4a030'],
    colors: {
      forest: '#c8d8e8',
      forestDeep: '#daeaf8',
      sage: '#6080a0',
      parchment: '#1a2535',
      cream: '#0f1722',
      amber: '#d4a030',
      sienna: '#5070a0',
      rust: '#d05030',
      moss: '#1a3050',
      lichen: '#2a4880',
    },
  },
  {
    id: 'dark-void',
    name: 'Void',
    preview: ['#0d0d10', '#dddae8', '#18181e', '#c89040'],
    colors: {
      forest: '#dddae8',
      forestDeep: '#eee8f8',
      sage: '#8878b8',
      parchment: '#18181e',
      cream: '#0d0d10',
      amber: '#c89040',
      sienna: '#7860a0',
      rust: '#c03060',
      moss: '#1a1828',
      lichen: '#2a2840',
    },
  },
  {
    id: 'dark-dusk',
    name: 'Dusk',
    preview: ['#12100c', '#e8dfc8', '#1e1a14', '#d49030'],
    colors: {
      forest: '#e8dfc8',
      forestDeep: '#f0e8d0',
      sage: '#908060',
      parchment: '#1e1a14',
      cream: '#12100c',
      amber: '#d49030',
      sienna: '#806040',
      rust: '#c04020',
      moss: '#2c2010',
      lichen: '#4a3820',
    },
  },
]

// ─── Context ───────────────────────────────────────────────────────────────────

interface ThemeContextValue {
  themeId: string
  setThemeId: (id: string) => void
  currentTheme: Theme
  fontScale: FontScale
  setFontScale: (scale: FontScale) => void
  compactMode: boolean
  setCompactMode: (v: boolean) => void
  latexPreview: boolean
  setLatexPreview: (v: boolean) => void
}

const ThemeContext = createContext<ThemeContextValue | null>(null)

// ─── Provider ─────────────────────────────────────────────────────────────────

export function ThemeProvider({ children }: { children: React.ReactNode }) {
  const [themeId, setThemeIdState] = useState<string>(
    () => localStorage.getItem('nootes-theme') ?? 'botanical'
  )
  const [fontScale, setFontScaleState] = useState<FontScale>(
    () => (localStorage.getItem('nootes-font-scale') as FontScale) ?? 'md'
  )
  const [compactMode, setCompactModeState] = useState<boolean>(
    () => localStorage.getItem('nootes-compact') === 'true'
  )
  const [latexPreview, setLatexPreviewState] = useState<boolean>(
    () => localStorage.getItem('nootes-latex-preview') !== 'false'
  )

  const currentTheme = THEMES.find(t => t.id === themeId) ?? THEMES[0]

  // Apply CSS variables whenever theme changes
  useEffect(() => {
    const root = document.documentElement
    const c = currentTheme.colors
    root.style.setProperty('--color-forest', c.forest)
    root.style.setProperty('--color-forest-deep', c.forestDeep)
    root.style.setProperty('--color-sage', c.sage)
    root.style.setProperty('--color-parchment', c.parchment)
    root.style.setProperty('--color-cream', c.cream)
    root.style.setProperty('--color-amber', c.amber)
    root.style.setProperty('--color-sienna', c.sienna)
    root.style.setProperty('--color-rust', c.rust)
    root.style.setProperty('--color-moss', c.moss)
    root.style.setProperty('--color-lichen', c.lichen)
  }, [themeId, currentTheme])

  // Apply font scale class to html element
  useEffect(() => {
    const html = document.documentElement
    html.classList.remove('font-scale-sm', 'font-scale-lg')
    if (fontScale === 'sm') html.classList.add('font-scale-sm')
    else if (fontScale === 'lg') html.classList.add('font-scale-lg')
  }, [fontScale])

  // Apply compact mode class to html element
  useEffect(() => {
    if (compactMode) document.documentElement.classList.add('compact-mode')
    else document.documentElement.classList.remove('compact-mode')
  }, [compactMode])

  const setThemeId = (id: string) => {
    localStorage.setItem('nootes-theme', id)
    setThemeIdState(id)
  }

  const setFontScale = (scale: FontScale) => {
    localStorage.setItem('nootes-font-scale', scale)
    setFontScaleState(scale)
  }

  const setCompactMode = (v: boolean) => {
    localStorage.setItem('nootes-compact', String(v))
    setCompactModeState(v)
  }

  const setLatexPreview = (v: boolean) => {
    localStorage.setItem('nootes-latex-preview', String(v))
    setLatexPreviewState(v)
  }

  return (
    <ThemeContext.Provider
      value={{ themeId, setThemeId, currentTheme, fontScale, setFontScale, compactMode, setCompactMode, latexPreview, setLatexPreview }}
    >
      {children}
    </ThemeContext.Provider>
  )
}

// ─── Hook ─────────────────────────────────────────────────────────────────────

export function useTheme() {
  const ctx = useContext(ThemeContext)
  if (!ctx) throw new Error('useTheme must be used within ThemeProvider')
  return ctx
}
