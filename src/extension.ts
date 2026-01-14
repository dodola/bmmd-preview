import * as vscode from 'vscode'
import { MarkdownPreviewProvider } from './lib/preview'
import { CommandHandler } from './lib/commands'

/**
 * 插件激活函数
 * 当用户打开 Markdown 文件时自动激活
 */
export function activate(context: vscode.ExtensionContext): void {
  console.info('bm.md Markdown Preview 扩展已激活')

  // 创建预览提供者
  const previewProvider = new MarkdownPreviewProvider(context)

  // 注册预览命令
  const showPreviewCommand = vscode.commands.registerCommand('bmmd.showPreview', async () => {
    const editor = vscode.window.activeTextEditor
    if (!editor) {
      vscode.window.showWarningMessage('请先打开一个 Markdown 文件')
      return
    }

    if (editor.document.languageId !== 'markdown') {
      vscode.window.showWarningMessage('当前文件不是 Markdown 文件')
      return
    }

    await previewProvider.showPreview(editor.document)
  })

  // 注册侧边预览命令（与 showPreview 功能相同，但更明确地表示在侧边打开）
  const showPreviewToSideCommand = vscode.commands.registerCommand('bmmd.showPreviewToSide', async () => {
    const editor = vscode.window.activeTextEditor
    if (!editor) {
      vscode.window.showWarningMessage('请先打开一个 Markdown 文件')
      return
    }

    if (editor.document.languageId !== 'markdown') {
      vscode.window.showWarningMessage('当前文件不是 Markdown 文件')
      return
    }

    await previewProvider.showPreview(editor.document)
  })

  context.subscriptions.push(showPreviewCommand, showPreviewToSideCommand)

  // 注册平台导出命令
  const copyAsWechatCommand = vscode.commands.registerCommand('bmmd.copyAsWechat', async () => {
    await CommandHandler.copyAsPlatform('wechat')
  })

  const copyAsZhihuCommand = vscode.commands.registerCommand('bmmd.copyAsZhihu', async () => {
    await CommandHandler.copyAsPlatform('zhihu')
  })

  const copyAsJuejinCommand = vscode.commands.registerCommand('bmmd.copyAsJuejin', async () => {
    await CommandHandler.copyAsPlatform('juejin')
  })

  const copyAsHtmlCommand = vscode.commands.registerCommand('bmmd.copyAsHtml', async () => {
    await CommandHandler.copyAsPlatform('html')
  })

  context.subscriptions.push(
    copyAsWechatCommand,
    copyAsZhihuCommand,
    copyAsJuejinCommand,
    copyAsHtmlCommand,
  )

  // 注册图片导出命令
  const exportAsImageCommand = vscode.commands.registerCommand('bmmd.exportAsImage', async () => {
    await CommandHandler.exportAsImage()
  })

  context.subscriptions.push(exportAsImageCommand)

  // 注册主题切换命令
  const changeMarkdownStyleCommand = vscode.commands.registerCommand('bmmd.changeMarkdownStyle', async () => {
    await CommandHandler.changeMarkdownStyle()
  })

  const changeCodeThemeCommand = vscode.commands.registerCommand('bmmd.changeCodeTheme', async () => {
    await CommandHandler.changeCodeTheme()
  })

  context.subscriptions.push(changeMarkdownStyleCommand, changeCodeThemeCommand)

  // 注册自定义 CSS 命令
  const editCustomCssCommand = vscode.commands.registerCommand('bmmd.editCustomCss', async () => {
    await CommandHandler.editCustomCss()
  })

  context.subscriptions.push(editCustomCssCommand)

  // 监听文档变化，自动更新预览（带防抖机制）
  let debounceTimeout: NodeJS.Timeout | undefined
  const changeDocumentSubscription = vscode.workspace.onDidChangeTextDocument(event => {
    if (event.document.languageId === 'markdown') {
      // 清除之前的定时器
      if (debounceTimeout) {
        clearTimeout(debounceTimeout)
      }

      // 设置新的定时器（防抖 100ms）
      debounceTimeout = setTimeout(() => {
        previewProvider.updatePreview(event.document)
      }, 100)
    }
  })

  context.subscriptions.push(changeDocumentSubscription)

  // 监听活动编辑器变化，切换编辑器时更新预览
  const changeActiveEditorSubscription = vscode.window.onDidChangeActiveTextEditor(editor => {
    if (editor && editor.document.languageId === 'markdown') {
      previewProvider.switchDocument(editor.document)
    }
  })

  context.subscriptions.push(changeActiveEditorSubscription)

  // 监听配置变化，配置变化时更新预览
  const changeConfigurationSubscription = vscode.workspace.onDidChangeConfiguration(event => {
    // 检查是否是 bmmd 相关的配置变化
    if (event.affectsConfiguration('bmmd')) {
      previewProvider.updatePreview()
    }
  })

  context.subscriptions.push(changeConfigurationSubscription)
}

/**
 * 插件停用函数
 * 清理资源
 */
export function deactivate(): void {
  console.info('bm.md Markdown Preview 扩展已停用')
}
