const fs = require('node:fs')
const path = require('node:path')

const markdownStyleDir = path.join(__dirname, '../src/themes/markdown-style')
const codeThemeDir = path.join(__dirname, '../src/themes/code-theme')

// Bundle markdown styles
const markdownFiles = fs.readdirSync(markdownStyleDir).filter(f => f.endsWith('.css'))
const resetCss = fs.readFileSync(path.join(markdownStyleDir, 'reset.css'), 'utf8')

const markdownStyles = markdownFiles
  .filter(f => f !== 'reset.css')
  .map(f => {
    const id = f.replace('.css', '')
    const name = id.split('-').map(w => w.charAt(0).toUpperCase() + w.slice(1)).join(' ')
    const css = fs.readFileSync(path.join(markdownStyleDir, f), 'utf8')
    return { id, name, css: resetCss + '\n' + css }
  })

const markdownStyleContent = `/**
 * Markdown preview styles
 * Auto-generated from CSS files
 */

export interface MarkdownStyle {
  id: string
  name: string
  css: string
}

export const markdownStyles: MarkdownStyle[] = ${JSON.stringify(markdownStyles, null, 2)}

export function getMarkdownStyleById(id: string): MarkdownStyle | undefined {
  return markdownStyles.find(style => style.id === id)
}
`

fs.writeFileSync(path.join(__dirname, '../src/themes/markdown-style/index.ts'), markdownStyleContent)

console.log('✓ Bundled markdown styles')

// For code themes, we'll need to handle highlight.js CSS differently
// For now, create a placeholder
const codeThemeContent = `/**
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
`

fs.writeFileSync(path.join(__dirname, '../src/themes/code-theme/index.ts'), codeThemeContent)

console.log('✓ Created code theme placeholder')
