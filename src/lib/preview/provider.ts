import * as vscode from 'vscode'
import { MarkdownEngine } from '../markdown/engine'
import type { MarkdownEngineOptions } from '../markdown/engine'
import { getWebviewContent } from './webview-content'
import { MessageSender, MessageValidator } from './messages'
import type { WebviewToExtensionMessage } from './messages'
import { RenderCache } from './cache'
import { ScrollSyncManager } from './scroll-sync'

/**
 * Markdown 预览提供者
 * 
 * 管理 Webview 面板的生命周期，处理预览更新和消息通信
 */
export class MarkdownPreviewProvider {
  private panel: vscode.WebviewPanel | undefined
  private disposables: vscode.Disposable[] = []
  private currentDocument: vscode.TextDocument | undefined
  private updateTimeout: NodeJS.Timeout | undefined
  private cache: RenderCache
  private scrollSyncManager: ScrollSyncManager | undefined
  private cacheCleanupInterval: NodeJS.Timeout | undefined

  constructor(
    private readonly context: vscode.ExtensionContext,
  ) {
    this.cache = new RenderCache({
      maxSize: 100,
      ttl: 5 * 60 * 1000, // 5 分钟
      maxMemorySize: 50 * 1024 * 1024, // 50MB
    })

    // 启动定期缓存清理（每分钟清理一次过期条目）
    this.cacheCleanupInterval = setInterval(() => {
      const cleaned = this.cache.cleanExpired()
      if (cleaned > 0) {
        console.log(`清理了 ${cleaned} 个过期缓存条目`)
      }
    }, 60 * 1000)
  }

  /**
   * 显示 Markdown 预览
   * 
   * @param document 要预览的文档
   */
  async showPreview(document: vscode.TextDocument): Promise<void> {
    this.currentDocument = document

    // 如果面板已存在，则显示并更新
    if (this.panel) {
      this.panel.reveal(vscode.ViewColumn.Beside)
      await this.updatePreview()
      return
    }

    // 创建新的 Webview 面板
    this.panel = vscode.window.createWebviewPanel(
      'bmmdPreview',
      `预览: ${document.fileName}`,
      vscode.ViewColumn.Beside,
      {
        enableScripts: true,
        retainContextWhenHidden: true,
        localResourceRoots: [this.context.extensionUri],
      },
    )

    // 设置 Webview 内容
    this.panel.webview.html = getWebviewContent(this.panel.webview, this.context.extensionUri)

    // 监听面板关闭事件
    this.panel.onDidDispose(() => {
      this.dispose()
    }, null, this.disposables)

    // 监听来自 Webview 的消息
    this.panel.webview.onDidReceiveMessage(
      message => this.handleWebviewMessage(message),
      null,
      this.disposables,
    )

    // 初始化滚动同步管理器
    this.scrollSyncManager = new ScrollSyncManager(this.panel, document)

    // 初始渲染
    await this.updatePreview()
  }

  /**
   * 更新预览内容
   * 
   * 使用防抖机制避免频繁更新
   * 
   * @param document 可选的文档参数，如果提供则更新该文档的预览
   */
  async updatePreview(document?: vscode.TextDocument): Promise<void> {
    // 如果提供了文档参数，检查是否是当前预览的文档
    if (document && this.currentDocument && document.uri.toString() !== this.currentDocument.uri.toString()) {
      return
    }

    if (!this.panel || !this.currentDocument) {
      return
    }

    // 清除之前的更新定时器
    if (this.updateTimeout) {
      clearTimeout(this.updateTimeout)
    }

    // 设置新的更新定时器（防抖 100ms，符合需求 10.1）
    this.updateTimeout = setTimeout(async () => {
      await this.doUpdatePreview()
    }, 100)
  }

  /**
   * 切换预览的文档
   * 
   * 当活动编辑器变化时调用
   * 
   * @param document 新的文档
   */
  async switchDocument(document: vscode.TextDocument): Promise<void> {
    if (!this.panel) {
      return
    }

    // 更新当前文档
    this.currentDocument = document

    // 更新面板标题
    this.panel.title = `预览: ${document.fileName}`

    // 重新创建滚动同步管理器
    if (this.scrollSyncManager) {
      this.scrollSyncManager.dispose()
    }
    this.scrollSyncManager = new ScrollSyncManager(this.panel, document)

    // 立即更新预览
    await this.doUpdatePreview()
  }

  /**
   * 执行实际的预览更新
   */
  private async doUpdatePreview(): Promise<void> {
    if (!this.panel || !this.currentDocument) {
      return
    }

    try {
      // 记录开始时间（用于性能监控）
      const startTime = Date.now()

      // 获取配置
      const config = vscode.workspace.getConfiguration('bmmd')
      const markdownStyle = config.get<string>('markdownStyle', 'ayu-light')
      const codeTheme = config.get<string>('codeTheme', 'kimbie-light')
      const customCss = config.get<string>('customCss', '')
      const enableFootnoteLinks = config.get<boolean>('enableFootnoteLinks', true)
      const openLinksInNewWindow = config.get<boolean>('openLinksInNewWindow', true)

      const markdown = this.currentDocument.getText()

      // 生成缓存键
      const cacheKey = RenderCache.generateKey(markdown, {
        markdownStyle,
        codeTheme,
        customCss,
        enableFootnoteLinks,
        openLinksInNewWindow,
        platform: 'html',
      })

      // 尝试从缓存获取
      let html = this.cache.get(cacheKey)
      let cacheHit = true

      if (!html) {
        // 缓存未命中，执行渲染
        cacheHit = false
        const options: MarkdownEngineOptions = {
          markdown,
          markdownStyle,
          codeTheme,
          customCss,
          enableFootnoteLinks,
          openLinksInNewWindow,
          platform: 'html',
        }

        // 捕获控制台警告以检测样式加载失败
        const originalWarn = console.warn
        let styleWarning: string | undefined
        console.warn = (...args: any[]) => {
          const message = args.join(' ')
          if (message.includes('样式') || message.includes('主题')) {
            styleWarning = message
          }
          originalWarn.apply(console, args)
        }

        try {
          html = await MarkdownEngine.render(options)

          // 如果有样式警告，显示通知
          if (styleWarning) {
            vscode.window.showWarningMessage(styleWarning)
          }
        }
        finally {
          console.warn = originalWarn
        }

        // 存储到缓存
        this.cache.set(cacheKey, html)
      }

      // 发送渲染结果到 Webview
      await this.panel.webview.postMessage(MessageSender.createUpdateMessage(html))

      // 计算总渲染时间
      const renderTime = Date.now() - startTime

      // 如果渲染时间超过 200ms，记录警告（需求 10.4）
      if (renderTime > 200) {
        console.warn(
          `预览渲染耗时 ${renderTime}ms，超过 200ms 阈值 ` +
          `(缓存${cacheHit ? '命中' : '未命中'}，文档大小: ${markdown.length} 字符)`,
        )
      }
    }
    catch (error) {
      // 记录错误日志
      const errorMessage = error instanceof Error ? error.message : String(error)
      const errorStack = error instanceof Error ? error.stack : undefined

      console.error('预览更新失败:', errorMessage)
      if (errorStack) {
        console.error('错误堆栈:', errorStack)
      }

      // 发送错误消息到 Webview（在预览面板显示）
      await this.panel.webview.postMessage(MessageSender.createErrorMessage(errorMessage))

      // 同时显示 VS Code 通知
      vscode.window.showErrorMessage(`预览更新失败: ${errorMessage}`)
    }
  }

  /**
   * 处理来自 Webview 的消息
   * 
   * @param message 消息对象
   */
  private async handleWebviewMessage(message: any): Promise<void> {
    // 验证消息格式
    if (!MessageValidator.isWebviewToExtensionMessage(message)) {
      console.warn('收到无效的消息:', message)
      return
    }

    const typedMessage = message as WebviewToExtensionMessage

    switch (typedMessage.type) {
      case 'ready':
        // Webview 已准备好，发送当前配置并执行初始渲染
        await this.sendCurrentConfig()
        await this.doUpdatePreview()
        break

      case 'scroll':
        // 处理滚动同步（如果启用）
        if (this.scrollSyncManager && typedMessage.percent !== undefined) {
          this.scrollSyncManager.handleWebviewScroll(
            typedMessage.percent,
            typedMessage.line,
          )
        }
        break

      case 'openExternal':
        // 在外部浏览器中打开链接
        await vscode.env.openExternal(vscode.Uri.parse(typedMessage.url))
        break

      case 'error':
        // 显示错误消息
        vscode.window.showErrorMessage(`预览错误: ${typedMessage.message}`)
        break

      case 'changeMarkdownStyle':
        // 切换 Markdown 样式
        await this.handleChangeMarkdownStyle(typedMessage.style)
        break

      case 'changeCodeTheme':
        // 切换代码主题
        await this.handleChangeCodeTheme(typedMessage.theme)
        break

      default:
        console.warn('未知的消息类型:', (typedMessage as any).type)
    }
  }

  /**
   * 发送当前配置到 webview
   */
  private async sendCurrentConfig(): Promise<void> {
    if (!this.panel) {
      return
    }

    const config = vscode.workspace.getConfiguration('bmmd')
    const markdownStyle = config.get<string>('markdownStyle', 'ayu-light')
    const codeTheme = config.get<string>('codeTheme', 'kimbie-light')

    await this.panel.webview.postMessage(MessageSender.createConfigMessage(markdownStyle, codeTheme))
  }

  /**
   * 处理切换 Markdown 样式
   */
  private async handleChangeMarkdownStyle(style: string): Promise<void> {
    try {
      const config = vscode.workspace.getConfiguration('bmmd')
      await config.update('markdownStyle', style, vscode.ConfigurationTarget.Global)
      // 配置更新后会自动触发预览更新
    }
    catch (error) {
      const errorMessage = error instanceof Error ? error.message : String(error)
      console.error('切换样式失败:', errorMessage)
      vscode.window.showErrorMessage(`切换样式失败: ${errorMessage}`)
    }
  }

  /**
   * 处理切换代码主题
   */
  private async handleChangeCodeTheme(theme: string): Promise<void> {
    try {
      const config = vscode.workspace.getConfiguration('bmmd')
      await config.update('codeTheme', theme, vscode.ConfigurationTarget.Global)
      // 配置更新后会自动触发预览更新
    }
    catch (error) {
      const errorMessage = error instanceof Error ? error.message : String(error)
      console.error('切换主题失败:', errorMessage)
      vscode.window.showErrorMessage(`切换主题失败: ${errorMessage}`)
    }
  }

  /**
   * 清理资源
   */
  dispose(): void {
    if (this.updateTimeout) {
      clearTimeout(this.updateTimeout)
    }

    if (this.cacheCleanupInterval) {
      clearInterval(this.cacheCleanupInterval)
      this.cacheCleanupInterval = undefined
    }

    if (this.scrollSyncManager) {
      this.scrollSyncManager.dispose()
      this.scrollSyncManager = undefined
    }

    // 清空缓存以释放内存
    this.cache.clear()

    this.panel = undefined
    this.currentDocument = undefined

    // 清理所有订阅
    this.disposables.forEach(d => d.dispose())
    this.disposables = []
  }

  /**
   * 获取缓存统计信息（用于调试）
   */
  getCacheStats() {
    return this.cache.getStats()
  }
}
