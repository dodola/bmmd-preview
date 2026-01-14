import { describe, expect, it } from 'vitest'
import type { PreviewConfig } from './config'

describe('ConfigurationManager', () => {
  it('PreviewConfig 接口定义正确', () => {
    // 验证 PreviewConfig 接口的类型定义
    const config: PreviewConfig = {
      markdownStyle: 'ayu-light',
      codeTheme: 'kimbie-light',
      customCss: '',
      enableFootnoteLinks: true,
      openLinksInNewWindow: true,
      enableScrollSync: true,
    }

    expect(config.markdownStyle).toBe('ayu-light')
    expect(config.codeTheme).toBe('kimbie-light')
    expect(config.customCss).toBe('')
    expect(config.enableFootnoteLinks).toBe(true)
    expect(config.openLinksInNewWindow).toBe(true)
    expect(config.enableScrollSync).toBe(true)
  })
})
