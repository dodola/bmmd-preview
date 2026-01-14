import type { Platform } from './render'
import { render } from './render'

/**
 * Markdown 渲染引擎配置选项
 */
export interface MarkdownEngineOptions {
  /** Markdown 源文本 */
  markdown: string
  /** Markdown 排版样式 ID */
  markdownStyle?: string
  /** 代码块高亮主题 ID */
  codeTheme?: string
  /** 自定义 CSS 样式 */
  customCss?: string
  /** 是否将文中链接自动转换为脚注形式 */
  enableFootnoteLinks?: boolean
  /** 是否为所有外部链接添加 target="_blank" */
  openLinksInNewWindow?: boolean
  /** 目标发布平台 */
  platform?: Platform
}

/**
 * Markdown 渲染引擎
 * 
 * 封装 Markdown 处理管道，提供统一的渲染接口
 */
export class MarkdownEngine {
  /**
   * 渲染 Markdown 为 HTML
   * 
   * @param options 渲染选项
   * @returns 渲染后的 HTML 字符串
   * @throws 渲染过程中的任何错误
   */
  static async render(options: MarkdownEngineOptions): Promise<string> {
    try {
      // 验证输入
      if (!this.isValidMarkdown(options.markdown)) {
        throw new Error('Markdown 内容为空或无效')
      }

      // 验证平台
      if (options.platform && !this.isValidPlatform(options.platform)) {
        throw new Error(`不支持的平台: ${options.platform}`)
      }

      return await render(options)
    }
    catch (error) {
      // 记录错误日志
      console.error('Markdown 渲染错误:', error)

      // 包装错误信息，提供更好的错误上下文
      const errorMessage = error instanceof Error ? error.message : String(error)
      const stack = error instanceof Error ? error.stack : undefined

      // 创建详细的错误对象
      const detailedError = new Error(`Markdown 渲染失败: ${errorMessage}`)
      if (stack) {
        detailedError.stack = stack
      }

      throw detailedError
    }
  }

  /**
   * 验证 Markdown 内容是否有效
   * 
   * @param markdown Markdown 源文本
   * @returns 是否有效
   */
  static isValidMarkdown(markdown: string): boolean {
    return typeof markdown === 'string' && markdown.trim().length > 0
  }

  /**
   * 获取支持的平台列表
   * 
   * @returns 平台 ID 数组
   */
  static getSupportedPlatforms(): Platform[] {
    return ['html', 'wechat', 'zhihu', 'juejin']
  }

  /**
   * 验证平台 ID 是否有效
   * 
   * @param platform 平台 ID
   * @returns 是否有效
   */
  static isValidPlatform(platform: string): platform is Platform {
    return this.getSupportedPlatforms().includes(platform as Platform)
  }
}
