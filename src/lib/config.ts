import * as vscode from 'vscode'

/**
 * 预览配置接口
 * 定义所有可配置的预览选项
 */
export interface PreviewConfig {
  /** Markdown 排版样式 */
  markdownStyle: string
  /** 代码块高亮主题 */
  codeTheme: string
  /** 自定义 CSS 样式 */
  customCss: string
  /** 是否将链接转换为脚注（微信公众号格式） */
  enableFootnoteLinks: boolean
  /** 是否在新窗口打开链接 */
  openLinksInNewWindow: boolean
  /** 是否启用编辑器与预览的滚动同步 */
  enableScrollSync: boolean
}

/**
 * 配置变化监听器类型
 */
export type ConfigChangeListener = (config: PreviewConfig) => void

/**
 * 配置管理器
 * 负责读取、更新和监听 VS Code 配置变化
 */
export class ConfigurationManager {
  private static readonly CONFIG_SECTION = 'bmmd'
  private listeners: Set<ConfigChangeListener> = new Set()
  private disposables: vscode.Disposable[] = []

  constructor() {
    // 监听配置变化
    const configChangeDisposable = vscode.workspace.onDidChangeConfiguration(
      (event) => {
        if (event.affectsConfiguration(ConfigurationManager.CONFIG_SECTION)) {
          this.notifyListeners()
        }
      },
    )
    this.disposables.push(configChangeDisposable)
  }

  /**
   * 获取当前配置
   * @returns 当前的预览配置
   */
  getConfig(): PreviewConfig {
    const config = vscode.workspace.getConfiguration(
      ConfigurationManager.CONFIG_SECTION,
    )

    return {
      markdownStyle: config.get<string>('markdownStyle', 'ayu-light'),
      codeTheme: config.get<string>('codeTheme', 'kimbie-light'),
      customCss: config.get<string>('customCss', ''),
      enableFootnoteLinks: config.get<boolean>('enableFootnoteLinks', true),
      openLinksInNewWindow: config.get<boolean>('openLinksInNewWindow', true),
      enableScrollSync: config.get<boolean>('enableScrollSync', true),
    }
  }

  /**
   * 更新配置项
   * @param key 配置键名
   * @param value 配置值
   * @param target 配置目标（全局或工作区）
   */
  async updateConfig<K extends keyof PreviewConfig>(
    key: K,
    value: PreviewConfig[K],
    target: vscode.ConfigurationTarget = vscode.ConfigurationTarget.Global,
  ): Promise<void> {
    const config = vscode.workspace.getConfiguration(
      ConfigurationManager.CONFIG_SECTION,
    )
    await config.update(key, value, target)
  }

  /**
   * 注册配置变化监听器
   * @param listener 监听器函数
   * @returns 用于取消监听的 Disposable 对象
   */
  onConfigChange(listener: ConfigChangeListener): vscode.Disposable {
    this.listeners.add(listener)

    return {
      dispose: () => {
        this.listeners.delete(listener)
      },
    }
  }

  /**
   * 通知所有监听器配置已变化
   */
  private notifyListeners(): void {
    const config = this.getConfig()
    this.listeners.forEach((listener) => {
      try {
        listener(config)
      }
      catch (error) {
        console.error('配置变化监听器执行失败:', error)
      }
    })
  }

  /**
   * 清理资源
   */
  dispose(): void {
    this.disposables.forEach((d) => d.dispose())
    this.disposables = []
    this.listeners.clear()
  }
}
