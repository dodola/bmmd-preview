/**
 * ConfigurationManager 使用示例
 * 
 * 此文件展示如何在扩展中使用配置管理器
 */

import * as vscode from 'vscode'
import { ConfigurationManager } from './config'

/**
 * 示例：在扩展激活时初始化配置管理器
 */
export function exampleActivate(context: vscode.ExtensionContext): void {
  // 创建配置管理器实例
  const configManager = new ConfigurationManager()

  // 获取当前配置
  const config = configManager.getConfig()
  console.log('当前配置:', config)

  // 监听配置变化
  const configChangeDisposable = configManager.onConfigChange((newConfig) => {
    console.log('配置已更新:', newConfig)
    // 在这里可以触发预览刷新等操作
  })

  // 注册到扩展的 subscriptions 中，确保在扩展停用时清理资源
  context.subscriptions.push(configManager)
  context.subscriptions.push(configChangeDisposable)
}

/**
 * 示例：更新配置
 */
export async function exampleUpdateConfig(): Promise<void> {
  const configManager = new ConfigurationManager()

  // 更新 Markdown 样式
  await configManager.updateConfig('markdownStyle', 'bauhaus')

  // 更新代码主题
  await configManager.updateConfig('codeTheme', 'github-dark')

  // 更新自定义 CSS
  await configManager.updateConfig('customCss', 'body { font-size: 16px; }')

  // 更新布尔配置
  await configManager.updateConfig('enableScrollSync', false)
}

/**
 * 示例：在命令中使用配置
 */
export function exampleCommandWithConfig(): void {
  const configManager = new ConfigurationManager()

  // 注册切换样式命令
  vscode.commands.registerCommand('bmmd.changeMarkdownStyle', async () => {
    const config = configManager.getConfig()
    const styles = [
      'ayu-light',
      'bauhaus',
      'blueprint',
      'botanical',
      'green-simple',
      'maximalism',
      'neo-brutalism',
      'newsprint',
      'organic',
      'playful-geometric',
      'professional',
      'retro',
      'sketch',
      'terminal',
    ]

    const selected = await vscode.window.showQuickPick(styles, {
      placeHolder: '选择 Markdown 样式',
      title: '切换 Markdown 样式',
    })

    if (selected) {
      await configManager.updateConfig('markdownStyle', selected)
      vscode.window.showInformationMessage(`已切换到 ${selected} 样式`)
    }
  })
}
