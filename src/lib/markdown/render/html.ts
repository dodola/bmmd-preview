import type { Platform } from './adapters'
import fs from 'node:fs'
import juice from 'juice'
import rehypeExternalLinks from 'rehype-external-links'
import rehypeGithubAlert from 'rehype-github-alert'
import rehypeHighlight from 'rehype-highlight'
import rehypeKatex from 'rehype-katex'
import rehypeRaw from 'rehype-raw'
import rehypeSanitize, { defaultSchema } from 'rehype-sanitize'
import rehypeStringify from 'rehype-stringify'

// 懒加载 KaTeX CSS
let katexCssCache: string | null = null
function getKatexCss(): string {
  if (katexCssCache === null) {
    try {
      const katexCssPath = require.resolve('katex/dist/katex.css')
      katexCssCache = fs.readFileSync(katexCssPath, 'utf8')
    }
    catch (error) {
      console.error('加载 KaTeX CSS 失败:', error)
      katexCssCache = ''
    }
  }
  return katexCssCache
}
import remarkFrontmatter from 'remark-frontmatter'
import remarkGfm from 'remark-gfm'
import remarkMath from 'remark-math'
import remarkParse from 'remark-parse'
import remarkRehype from 'remark-rehype'
import { unified } from 'unified'
import { getCodeThemeById } from '../../../themes/code-theme'
import { getMarkdownStyleById } from '../../../themes/markdown-style'
import { getAdapterPlugins } from './adapters'
import { rehypeDivToSection, rehypeFigureWrapper, rehypeFootnoteLinks, rehypeWrapTextNodes, remarkFrontmatterTable } from './plugins'

export interface RenderOptions {
  markdown: string
  markdownStyle?: string
  codeTheme?: string
  customCss?: string
  enableFootnoteLinks?: boolean
  openLinksInNewWindow?: boolean
  platform?: Platform
}

interface ProcessorOptions {
  enableFootnoteLinks?: boolean
  openLinksInNewWindow?: boolean
  platform?: Platform
}

const sanitizeSchema = {
  ...defaultSchema,
  protocols: {
    ...(defaultSchema.protocols || {}),
    href: ['http', 'https', 'mailto', 'tel'],
  },
  tagNames: [
    ...(defaultSchema.tagNames || []),
    'svg',
    'path',
    'figcaption',
    'section',
  ],
  attributes: {
    ...defaultSchema.attributes,
    a: [...(defaultSchema.attributes?.a || []), 'target', 'rel'],
    div: [...(defaultSchema.attributes?.div || []), 'className'],
    section: [...(defaultSchema.attributes?.section || []), 'className'],
    p: [...(defaultSchema.attributes?.p || []), 'className'],
    svg: ['className', 'viewBox', 'version', 'width', 'height', 'ariaHidden'],
    path: ['d'],
  },
}

function createProcessor({ enableFootnoteLinks, openLinksInNewWindow, platform = 'html' }: ProcessorOptions) {
  const processor = unified()
    .use(remarkParse)
    .use(remarkGfm)
    .use(remarkMath)
    .use(remarkFrontmatter, ['yaml', 'toml'])
    .use(remarkFrontmatterTable)
    .use(remarkRehype, {
      allowDangerousHtml: true,
      footnoteLabel: '脚注',
      footnoteBackLabel: '返回正文',
      footnoteLabelTagName: 'h4',
    })

  if (openLinksInNewWindow) {
    processor.use(rehypeExternalLinks, {
      target: '_blank',
      rel: ['noreferrer', 'noopener'],
    })
  }

  processor
    .use(rehypeRaw)
    .use(rehypeGithubAlert)
    .use(rehypeSanitize, sanitizeSchema)
    .use(rehypeKatex)
    .use(rehypeHighlight)
    .use(rehypeFigureWrapper)

  if (enableFootnoteLinks && platform !== 'wechat') {
    processor.use(rehypeFootnoteLinks)
  }

  const adapterPlugins = getAdapterPlugins(platform)
  for (const plugin of adapterPlugins) {
    processor.use(plugin)
  }

  processor.use(rehypeDivToSection)
  processor.use(rehypeWrapTextNodes)

  processor.use(rehypeStringify, { allowDangerousHtml: true })

  return processor
}

export default async function render(options: RenderOptions): Promise<string> {
  const {
    markdown,
    markdownStyle,
    codeTheme,
    customCss = '',
    enableFootnoteLinks = true,
    openLinksInNewWindow = true,
    platform = 'html',
  } = options

  try {
    const processor = createProcessor({ enableFootnoteLinks, openLinksInNewWindow, platform })
    const html = (await processor.process(markdown)).toString()

    const hasKatex = html.includes('class="katex"')
      || html.includes('class="katex-display"')
      || html.includes('class="katex-mathml"')

    if (!markdownStyle && !codeTheme && !hasKatex && !customCss) {
      return html
    }

    // 尝试加载样式，如果失败则回退到默认样式
    let markdownStyleCss = ''
    if (markdownStyle) {
      const style = getMarkdownStyleById(markdownStyle)
      if (style) {
        markdownStyleCss = style.css
      }
      else {
        // 样式加载失败，记录警告并回退到默认样式
        console.warn(`Markdown 样式 "${markdownStyle}" 未找到，回退到默认样式`)
        const defaultStyle = getMarkdownStyleById('ayu-light')
        markdownStyleCss = defaultStyle?.css || ''
      }
    }

    let codeThemeCss = ''
    if (codeTheme) {
      const theme = getCodeThemeById(codeTheme)
      if (theme) {
        codeThemeCss = theme.css
      }
      else {
        // 代码主题加载失败，记录警告并回退到默认主题
        console.warn(`代码主题 "${codeTheme}" 未找到，回退到默认主题`)
        const defaultTheme = getCodeThemeById('kimbie-light')
        codeThemeCss = defaultTheme?.css || ''
      }
    }

    const css = [
      markdownStyleCss,
      codeThemeCss,
      hasKatex ? getKatexCss() : '',
      customCss,
    ].filter(Boolean).join('\n')

    const wrapped = `<section id="bm-md">${html}</section>`

    try {
      return juice.inlineContent(wrapped, css, {
        inlinePseudoElements: true,
        preserveImportant: true,
      })
    }
    catch (error) {
      console.error('CSS 内联处理错误:', error)
      // 如果 CSS 内联失败，返回未处理的 HTML
      return wrapped
    }
  }
  catch (error) {
    // 记录解析错误
    console.error('Markdown 解析错误:', error)

    // 重新抛出错误，提供更详细的信息
    const errorMessage = error instanceof Error ? error.message : String(error)
    throw new Error(`解析失败: ${errorMessage}`)
  }
}
