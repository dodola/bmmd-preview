/**
 * Code theme styles for highlight.js
 * Note: In VSCode extension, we need to bundle these differently
 */

export interface CodeTheme {
  id: string
  name: string
  css: string
  isDark: boolean
}

// Placeholder - will be populated with actual themes
export const codeThemes: CodeTheme[] = []

export function getCodeThemeById(id: string): CodeTheme | undefined {
  return codeThemes.find(theme => theme.id === id)
}
