import * as vscode from 'vscode'
import { MessageSender } from './messages'

/**
 * 滚动同步管理器
 * 
 * 负责编辑器和 Webview 之间的滚动位置同步
 */
export class ScrollSyncManager {
  private isScrollingFromEditor = false
  private isScrollingFromWebview = false
  private scrollTimeout: NodeJS.Timeout | undefined
  private disposables: vscode.Disposable[] = []

  constructor(
    private readonly panel: vscode.WebviewPanel,
    private readonly document: vscode.TextDocument,
  ) {
    this.setupEditorScrollListener()
  }

  /**
   * 设置编辑器滚动监听
   */
  private setupEditorScrollListener(): void {
    // 监听编辑器可见范围变化（滚动事件）
    const listener = vscode.window.onDidChangeTextEditorVisibleRanges(event => {
      const editor = vscode.window.activeTextEditor
      if (!editor || editor.document !== this.document) {
        return
      }

      // 如果是从 Webview 触发的滚动，忽略
      if (this.isScrollingFromWebview) {
        return
      }

      // 检查配置是否启用滚动同步
      const config = vscode.workspace.getConfiguration('bmmd')
      const enableScrollSync = config.get<boolean>('enableScrollSync', true)
      if (!enableScrollSync) {
        return
      }

      // 标记为从编辑器触发的滚动
      this.isScrollingFromEditor = true

      // 防抖处理
      if (this.scrollTimeout) {
        clearTimeout(this.scrollTimeout)
      }

      this.scrollTimeout = setTimeout(() => {
        this.syncWebviewScroll(editor)
        this.isScrollingFromEditor = false
      }, 100)
    })

    this.disposables.push(listener)
  }

  /**
   * 同步 Webview 滚动位置
   * 
   * 根据编辑器的可见范围计算滚动百分比，并发送到 Webview
   * 
   * @param editor 编辑器实例
   */
  private async syncWebviewScroll(editor: vscode.TextEditor): Promise<void> {
    if (!editor.visibleRanges.length) {
      return
    }

    // 获取编辑器可见范围的第一行
    const visibleRange = editor.visibleRanges[0]
    const firstVisibleLine = visibleRange.start.line

    // 计算滚动百分比
    const totalLines = editor.document.lineCount
    const scrollPercent = totalLines > 1 ? firstVisibleLine / (totalLines - 1) : 0

    // 发送滚动消息到 Webview
    await this.panel.webview.postMessage({
      type: 'scrollFromEditor',
      percent: scrollPercent,
      line: firstVisibleLine,
    })
  }

  /**
   * 处理来自 Webview 的滚动事件
   * 
   * @param percent 滚动百分比 (0-1)
   * @param line 可选的行号
   */
  handleWebviewScroll(percent: number, line?: number): void {
    const editor = vscode.window.activeTextEditor
    if (!editor || editor.document !== this.document) {
      return
    }

    // 检查配置是否启用滚动同步
    const config = vscode.workspace.getConfiguration('bmmd')
    const enableScrollSync = config.get<boolean>('enableScrollSync', true)
    if (!enableScrollSync) {
      return
    }

    // 如果是从编辑器触发的滚动，忽略
    if (this.isScrollingFromEditor) {
      return
    }

    // 标记为从 Webview 触发的滚动
    this.isScrollingFromWebview = true

    // 计算目标行号
    let targetLine: number
    if (line !== undefined) {
      targetLine = line
    }
    else {
      const totalLines = editor.document.lineCount
      targetLine = Math.floor(percent * (totalLines - 1))
    }

    // 确保行号在有效范围内
    targetLine = Math.max(0, Math.min(targetLine, editor.document.lineCount - 1))

    // 滚动到目标位置
    const targetPosition = new vscode.Position(targetLine, 0)
    editor.revealRange(
      new vscode.Range(targetPosition, targetPosition),
      vscode.TextEditorRevealType.AtTop,
    )

    // 延迟重置标记，避免循环触发
    setTimeout(() => {
      this.isScrollingFromWebview = false
    }, 150)
  }

  /**
   * 清理资源
   */
  dispose(): void {
    if (this.scrollTimeout) {
      clearTimeout(this.scrollTimeout)
    }

    this.disposables.forEach(d => d.dispose())
    this.disposables = []
  }
}
