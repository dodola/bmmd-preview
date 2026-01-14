import * as vscode from 'vscode'
import { MarkdownEngine } from '../markdown/engine'
import type { MarkdownEngineOptions } from '../markdown/engine'
import type { Platform } from '../markdown/render'

/**
 * 命令处理器
 * 
 * 提供所有 bm.md 扩展命令的实现
 */
export class CommandHandler {
  /**
   * 复制为指定平台格式
   * 
   * @param platform 目标平台
   */
  static async copyAsPlatform(platform: Platform): Promise<void> {
    const editor = vscode.window.activeTextEditor
    if (!editor) {
      vscode.window.showWarningMessage('请先打开一个 Markdown 文件')
      return
    }

    if (editor.document.languageId !== 'markdown') {
      vscode.window.showWarningMessage('当前文件不是 Markdown 文件')
      return
    }

    try {
      // 显示进度提示
      await vscode.window.withProgress(
        {
          location: vscode.ProgressLocation.Notification,
          title: `正在生成${this.getPlatformName(platform)}格式...`,
          cancellable: false,
        },
        async () => {
          // 获取配置
          const config = vscode.workspace.getConfiguration('bmmd')
          const markdownStyle = config.get<string>('markdownStyle', 'ayu-light')
          const codeTheme = config.get<string>('codeTheme', 'kimbie-light')
          const customCss = config.get<string>('customCss', '')
          const enableFootnoteLinks = config.get<boolean>('enableFootnoteLinks', true)
          const openLinksInNewWindow = config.get<boolean>('openLinksInNewWindow', true)

          const markdown = editor.document.getText()

          // 渲染为目标平台格式
          const options: MarkdownEngineOptions = {
            markdown,
            markdownStyle,
            codeTheme,
            customCss,
            enableFootnoteLinks,
            openLinksInNewWindow,
            platform,
          }

          const html = await MarkdownEngine.render(options)

          // 复制到剪贴板
          await vscode.env.clipboard.writeText(html)

          vscode.window.showInformationMessage(
            `已复制为${this.getPlatformName(platform)}格式`,
          )
        },
      )
    }
    catch (error) {
      // 记录错误日志
      const errorMessage = error instanceof Error ? error.message : String(error)
      const errorStack = error instanceof Error ? error.stack : undefined

      console.error('复制失败:', errorMessage)
      if (errorStack) {
        console.error('错误堆栈:', errorStack)
      }

      // 显示错误通知
      vscode.window.showErrorMessage(`复制失败: ${errorMessage}`)
    }
  }

  /**
   * 导出为图片
   * 
   * 通过预览面板截图实现
   */
  static async exportAsImage(): Promise<void> {
    const editor = vscode.window.activeTextEditor
    if (!editor) {
      vscode.window.showWarningMessage('请先打开一个 Markdown 文件')
      return
    }

    if (editor.document.languageId !== 'markdown') {
      vscode.window.showWarningMessage('当前文件不是 Markdown 文件')
      return
    }

    try {
      // 提示用户：需要先打开预览
      const result = await vscode.window.showInformationMessage(
        '图片导出功能需要先打开预览窗口。是否现在打开预览？',
        '打开预览',
        '取消',
      )

      if (result !== '打开预览') {
        return
      }

      // 执行预览命令
      await vscode.commands.executeCommand('bmmd.showPreview')

      // 提示用户使用浏览器的截图功能
      vscode.window.showInformationMessage(
        '请在预览窗口中右键选择"另存为图片"或使用浏览器的截图功能',
      )
    }
    catch (error) {
      // 记录错误日志
      const errorMessage = error instanceof Error ? error.message : String(error)
      const errorStack = error instanceof Error ? error.stack : undefined

      console.error('导出失败:', errorMessage)
      if (errorStack) {
        console.error('错误堆栈:', errorStack)
      }

      // 显示错误通知
      vscode.window.showErrorMessage(`导出失败: ${errorMessage}`)
    }
  }

  /**
   * 切换 Markdown 样式
   * 
   * 显示 QuickPick 界面供用户选择
   */
  static async changeMarkdownStyle(): Promise<void> {
    const config = vscode.workspace.getConfiguration('bmmd')
    const currentStyle = config.get<string>('markdownStyle', 'ayu-light')

    // 定义可用的样式列表
    const styles = [
      { id: 'ayu-light', name: 'Ayu Light', description: '清新明亮的浅色主题' },
      { id: 'bauhaus', name: 'Bauhaus', description: '包豪斯风格，简洁几何' },
      { id: 'blueprint', name: 'Blueprint', description: '蓝图风格，技术感十足' },
      { id: 'botanical', name: 'Botanical', description: '植物风格，自然清新' },
      { id: 'green-simple', name: 'Green Simple', description: '简约绿色主题' },
      { id: 'maximalism', name: 'Maximalism', description: '极繁主义，丰富多彩' },
      { id: 'neo-brutalism', name: 'Neo-Brutalism', description: '新野兽派，粗犷有力' },
      { id: 'newsprint', name: 'Newsprint', description: '报纸风格，复古经典' },
      { id: 'organic', name: 'Organic', description: '有机风格，柔和自然' },
      { id: 'playful-geometric', name: 'Playful Geometric', description: '趣味几何，活泼可爱' },
      { id: 'professional', name: 'Professional', description: '专业风格，商务正式' },
      { id: 'retro', name: 'Retro', description: '复古风格，怀旧经典' },
      { id: 'sketch', name: 'Sketch', description: '手绘风格，随性自由' },
      { id: 'terminal', name: 'Terminal', description: '终端风格，极客范儿' },
    ]

    // 创建 QuickPick 选项
    const items = styles.map(style => ({
      label: style.name,
      description: style.description,
      detail: style.id === currentStyle ? '当前使用' : undefined,
      id: style.id,
    }))

    // 显示 QuickPick
    const selected = await vscode.window.showQuickPick(items, {
      placeHolder: '选择 Markdown 样式',
      matchOnDescription: true,
    })

    if (!selected) {
      return
    }

    try {
      // 更新配置
      await config.update('markdownStyle', selected.id, vscode.ConfigurationTarget.Global)
      vscode.window.showInformationMessage(`已切换到 ${selected.label} 样式`)
    }
    catch (error) {
      // 记录错误日志
      const errorMessage = error instanceof Error ? error.message : String(error)
      const errorStack = error instanceof Error ? error.stack : undefined

      console.error('切换样式失败:', errorMessage)
      if (errorStack) {
        console.error('错误堆栈:', errorStack)
      }

      // 显示错误通知
      vscode.window.showErrorMessage(`切换样式失败: ${errorMessage}`)
    }
  }

  /**
   * 切换代码主题
   * 
   * 显示 QuickPick 界面供用户选择
   */
  static async changeCodeTheme(): Promise<void> {
    const config = vscode.workspace.getConfiguration('bmmd')
    const currentTheme = config.get<string>('codeTheme', 'kimbie-light')

    // 定义可用的代码主题列表
    const themes = [
      { id: 'andromeeda', name: 'Andromeeda', description: '深邃星空主题', isDark: true },
      { id: 'aurora-x', name: 'Aurora X', description: '极光主题', isDark: true },
      { id: 'catppuccin-latte', name: 'Catppuccin Latte', description: '拿铁浅色主题', isDark: false },
      { id: 'catppuccin-mocha', name: 'Catppuccin Mocha', description: '摩卡深色主题', isDark: true },
      { id: 'github-dark', name: 'GitHub Dark', description: 'GitHub 深色主题', isDark: true },
      { id: 'github-light', name: 'GitHub Light', description: 'GitHub 浅色主题', isDark: false },
      { id: 'kimbie-dark', name: 'Kimbie Dark', description: 'Kimbie 深色主题', isDark: true },
      { id: 'kimbie-light', name: 'Kimbie Light', description: 'Kimbie 浅色主题', isDark: false },
      { id: 'min-dark', name: 'Min Dark', description: '极简深色主题', isDark: true },
      { id: 'min-light', name: 'Min Light', description: '极简浅色主题', isDark: false },
      { id: 'nord', name: 'Nord', description: 'Nord 北欧主题', isDark: true },
      { id: 'one-dark-pro', name: 'One Dark Pro', description: 'One Dark Pro 主题', isDark: true },
      { id: 'rose-pine-dawn', name: 'Rosé Pine Dawn', description: '玫瑰松黎明主题', isDark: false },
      { id: 'vitesse-dark', name: 'Vitesse Dark', description: 'Vitesse 深色主题', isDark: true },
    ]

    // 创建 QuickPick 选项
    const items = themes.map(theme => ({
      label: theme.name,
      description: `${theme.description} ${theme.isDark ? '🌙' : '☀️'}`,
      detail: theme.id === currentTheme ? '当前使用' : undefined,
      id: theme.id,
    }))

    // 显示 QuickPick
    const selected = await vscode.window.showQuickPick(items, {
      placeHolder: '选择代码高亮主题',
      matchOnDescription: true,
    })

    if (!selected) {
      return
    }

    try {
      // 更新配置
      await config.update('codeTheme', selected.id, vscode.ConfigurationTarget.Global)
      vscode.window.showInformationMessage(`已切换到 ${selected.label} 主题`)
    }
    catch (error) {
      // 记录错误日志
      const errorMessage = error instanceof Error ? error.message : String(error)
      const errorStack = error instanceof Error ? error.stack : undefined

      console.error('切换主题失败:', errorMessage)
      if (errorStack) {
        console.error('错误堆栈:', errorStack)
      }

      // 显示错误通知
      vscode.window.showErrorMessage(`切换主题失败: ${errorMessage}`)
    }
  }

  /**
   * 编辑自定义 CSS
   * 
   * 打开输入框供用户编辑 CSS
   */
  static async editCustomCss(): Promise<void> {
    const config = vscode.workspace.getConfiguration('bmmd')
    const currentCss = config.get<string>('customCss', '')

    // 显示输入框
    const newCss = await vscode.window.showInputBox({
      prompt: '输入自定义 CSS 样式',
      value: currentCss,
      placeHolder: '例如: body { font-size: 16px; }',
      validateInput: (value) => {
        // 基本的 CSS 语法验证
        if (value.trim() === '') {
          return null // 允许空值
        }

        // 检查是否包含基本的 CSS 语法
        const hasOpenBrace = value.includes('{')
        const hasCloseBrace = value.includes('}')

        if (hasOpenBrace && !hasCloseBrace) {
          return '缺少闭合的大括号 }'
        }

        if (!hasOpenBrace && hasCloseBrace) {
          return '缺少开始的大括号 {'
        }

        // 检查大括号是否匹配
        const openCount = (value.match(/{/g) || []).length
        const closeCount = (value.match(/}/g) || []).length

        if (openCount !== closeCount) {
          return '大括号不匹配'
        }

        return null
      },
    })

    // 用户取消输入
    if (newCss === undefined) {
      return
    }

    try {
      // 更新配置
      await config.update('customCss', newCss, vscode.ConfigurationTarget.Global)

      if (newCss.trim() === '') {
        vscode.window.showInformationMessage('已清除自定义 CSS')
      }
      else {
        vscode.window.showInformationMessage('已更新自定义 CSS')
      }
    }
    catch (error) {
      // 记录错误日志
      const errorMessage = error instanceof Error ? error.message : String(error)
      const errorStack = error instanceof Error ? error.stack : undefined

      console.error('更新 CSS 失败:', errorMessage)
      if (errorStack) {
        console.error('错误堆栈:', errorStack)
      }

      // 显示错误通知
      vscode.window.showErrorMessage(`更新 CSS 失败: ${errorMessage}`)
    }
  }

  /**
   * 获取平台的显示名称
   * 
   * @param platform 平台 ID
   * @returns 平台显示名称
   */
  private static getPlatformName(platform: Platform): string {
    const names: Record<Platform, string> = {
      html: 'HTML',
      wechat: '微信公众号',
      zhihu: '知乎',
      juejin: '掘金',
    }
    return names[platform]
  }
}

