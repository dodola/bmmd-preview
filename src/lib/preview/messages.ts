/**
 * 消息类型定义
 * 
 * 定义扩展和 Webview 之间的消息协议
 */

/**
 * 从扩展发送到 Webview 的消息类型
 */
export type ExtensionToWebviewMessage =
  | UpdateMessage
  | ErrorMessage
  | ScrollFromEditorMessage
  | ConfigMessage

/**
 * 从 Webview 发送到扩展的消息类型
 */
export type WebviewToExtensionMessage =
  | ReadyMessage
  | ScrollMessage
  | OpenExternalMessage
  | ErrorReportMessage
  | ChangeMarkdownStyleMessage
  | ChangeCodeThemeMessage

/**
 * 更新预览内容消息
 */
export interface UpdateMessage {
  type: 'update'
  html: string
}

/**
 * 错误消息
 */
export interface ErrorMessage {
  type: 'error'
  message: string
}

/**
 * 从编辑器触发的滚动消息
 */
export interface ScrollFromEditorMessage {
  type: 'scrollFromEditor'
  percent: number
  line: number
}

/**
 * 配置消息（发送当前配置到 webview）
 */
export interface ConfigMessage {
  type: 'config'
  markdownStyle: string
  codeTheme: string
}

/**
 * Webview 准备就绪消息
 */
export interface ReadyMessage {
  type: 'ready'
}

/**
 * 滚动同步消息
 */
export interface ScrollMessage {
  type: 'scroll'
  percent: number
  line?: number
}

/**
 * 打开外部链接消息
 */
export interface OpenExternalMessage {
  type: 'openExternal'
  url: string
}

/**
 * 错误报告消息
 */
export interface ErrorReportMessage {
  type: 'error'
  message: string
}

/**
 * 切换 Markdown 样式消息
 */
export interface ChangeMarkdownStyleMessage {
  type: 'changeMarkdownStyle'
  style: string
}

/**
 * 切换代码主题消息
 */
export interface ChangeCodeThemeMessage {
  type: 'changeCodeTheme'
  theme: string
}

/**
 * 消息验证器
 */
export class MessageValidator {
  /**
   * 验证消息是否为有效的 ExtensionToWebviewMessage
   */
  static isExtensionToWebviewMessage(message: any): message is ExtensionToWebviewMessage {
    if (!message || typeof message !== 'object') {
      return false
    }

    switch (message.type) {
      case 'update':
        return typeof message.html === 'string'

      case 'error':
        return typeof message.message === 'string'

      case 'scrollFromEditor':
        return typeof message.percent === 'number'
          && typeof message.line === 'number'

      case 'config':
        return typeof message.markdownStyle === 'string'
          && typeof message.codeTheme === 'string'

      default:
        return false
    }
  }

  /**
   * 验证消息是否为有效的 WebviewToExtensionMessage
   */
  static isWebviewToExtensionMessage(message: any): message is WebviewToExtensionMessage {
    if (!message || typeof message !== 'object') {
      return false
    }

    switch (message.type) {
      case 'ready':
        return true

      case 'scroll':
        return typeof message.percent === 'number'
          && (message.line === undefined || typeof message.line === 'number')

      case 'openExternal':
        return typeof message.url === 'string'

      case 'error':
        return typeof message.message === 'string'

      case 'changeMarkdownStyle':
        return typeof message.style === 'string'

      case 'changeCodeTheme':
        return typeof message.theme === 'string'

      default:
        return false
    }
  }

  /**
   * 验证 UpdateMessage
   */
  static isUpdateMessage(message: any): message is UpdateMessage {
    return message?.type === 'update' && typeof message.html === 'string'
  }

  /**
   * 验证 ErrorMessage
   */
  static isErrorMessage(message: any): message is ErrorMessage {
    return message?.type === 'error' && typeof message.message === 'string'
  }

  /**
   * 验证 ReadyMessage
   */
  static isReadyMessage(message: any): message is ReadyMessage {
    return message?.type === 'ready'
  }

  /**
   * 验证 ScrollMessage
   */
  static isScrollMessage(message: any): message is ScrollMessage {
    return message?.type === 'scroll'
      && typeof message.percent === 'number'
      && (message.line === undefined || typeof message.line === 'number')
  }

  /**
   * 验证 OpenExternalMessage
   */
  static isOpenExternalMessage(message: any): message is OpenExternalMessage {
    return message?.type === 'openExternal' && typeof message.url === 'string'
  }

  /**
   * 验证 ErrorReportMessage
   */
  static isErrorReportMessage(message: any): message is ErrorReportMessage {
    return message?.type === 'error' && typeof message.message === 'string'
  }

  /**
   * 验证 ScrollFromEditorMessage
   */
  static isScrollFromEditorMessage(message: any): message is ScrollFromEditorMessage {
    return message?.type === 'scrollFromEditor'
      && typeof message.percent === 'number'
      && typeof message.line === 'number'
  }
}

/**
 * 消息发送器
 * 
 * 提供类型安全的消息发送方法
 */
export class MessageSender {
  /**
   * 发送更新消息
   */
  static createUpdateMessage(html: string): UpdateMessage {
    return {
      type: 'update',
      html,
    }
  }

  /**
   * 发送错误消息
   */
  static createErrorMessage(message: string): ErrorMessage {
    return {
      type: 'error',
      message,
    }
  }

  /**
   * 创建准备就绪消息
   */
  static createReadyMessage(): ReadyMessage {
    return {
      type: 'ready',
    }
  }

  /**
   * 创建滚动消息
   */
  static createScrollMessage(percent: number, line?: number): ScrollMessage {
    return {
      type: 'scroll',
      percent,
      line,
    }
  }

  /**
   * 创建打开外部链接消息
   */
  static createOpenExternalMessage(url: string): OpenExternalMessage {
    return {
      type: 'openExternal',
      url,
    }
  }

  /**
   * 创建错误报告消息
   */
  static createErrorReportMessage(message: string): ErrorReportMessage {
    return {
      type: 'error',
      message,
    }
  }

  /**
   * 创建从编辑器触发的滚动消息
   */
  static createScrollFromEditorMessage(percent: number, line: number): ScrollFromEditorMessage {
    return {
      type: 'scrollFromEditor',
      percent,
      line,
    }
  }

  /**
   * 创建切换 Markdown 样式消息
   */
  static createChangeMarkdownStyleMessage(style: string): ChangeMarkdownStyleMessage {
    return {
      type: 'changeMarkdownStyle',
      style,
    }
  }

  /**
   * 创建切换代码主题消息
   */
  static createChangeCodeThemeMessage(theme: string): ChangeCodeThemeMessage {
    return {
      type: 'changeCodeTheme',
      theme,
    }
  }

  /**
   * 创建配置消息
   */
  static createConfigMessage(markdownStyle: string, codeTheme: string): ConfigMessage {
    return {
      type: 'config',
      markdownStyle,
      codeTheme,
    }
  }
}
