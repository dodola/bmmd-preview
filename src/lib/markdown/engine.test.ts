import { describe, expect, it } from 'vitest'
import { MarkdownEngine } from './engine'

describe('MarkdownEngine', () => {
  it('should render simple markdown', async () => {
    const result = await MarkdownEngine.render({
      markdown: '# Hello World\n\nThis is a test.',
    })
    
    expect(result).toContain('Hello World')
    expect(result).toContain('This is a test')
  })

  it('should validate markdown content', () => {
    expect(MarkdownEngine.isValidMarkdown('# Test')).toBe(true)
    expect(MarkdownEngine.isValidMarkdown('')).toBe(false)
    expect(MarkdownEngine.isValidMarkdown('   ')).toBe(false)
  })

  it('should return supported platforms', () => {
    const platforms = MarkdownEngine.getSupportedPlatforms()
    expect(platforms).toContain('html')
    expect(platforms).toContain('wechat')
    expect(platforms).toContain('zhihu')
    expect(platforms).toContain('juejin')
  })

  it('should validate platform IDs', () => {
    expect(MarkdownEngine.isValidPlatform('html')).toBe(true)
    expect(MarkdownEngine.isValidPlatform('wechat')).toBe(true)
    expect(MarkdownEngine.isValidPlatform('invalid')).toBe(false)
  })

  it('should handle rendering errors gracefully', async () => {
    // The engine handles missing styles gracefully by not applying them
    // This test verifies that rendering still succeeds even with invalid style
    const result = await MarkdownEngine.render({
      markdown: '# Test',
      markdownStyle: 'non-existent-style',
    })
    
    expect(result).toContain('Test')
  })

  it('should render with markdown style', async () => {
    const result = await MarkdownEngine.render({
      markdown: '# Styled Content',
      markdownStyle: 'ayu-light',
    })
    
    expect(result).toContain('Styled Content')
  })

  it('should render code blocks with syntax highlighting', async () => {
    const markdown = '```javascript\nconst x = 1;\n```'
    const result = await MarkdownEngine.render({
      markdown,
      codeTheme: 'kimbie-light',
    })
    
    expect(result).toContain('const')
    expect(result).toContain('hljs')
  })

  it('should support GFM features', async () => {
    const markdown = '- [ ] Task 1\n- [x] Task 2\n\n| Col 1 | Col 2 |\n|-------|-------|\n| A     | B     |'
    const result = await MarkdownEngine.render({
      markdown,
    })
    
    expect(result).toContain('checkbox')
    expect(result).toContain('table')
  })

  it('should handle footnote links', async () => {
    const markdown = 'Check out [this link](https://example.com)'
    const result = await MarkdownEngine.render({
      markdown,
      enableFootnoteLinks: true,
    })
    
    expect(result).toContain('example.com')
  })

  it('should adapt for different platforms', async () => {
    const markdown = '# Platform Test\n\n[Link](https://example.com)'
    
    const htmlResult = await MarkdownEngine.render({
      markdown,
      platform: 'html',
    })
    
    const wechatResult = await MarkdownEngine.render({
      markdown,
      platform: 'wechat',
    })
    
    expect(htmlResult).toBeTruthy()
    expect(wechatResult).toBeTruthy()
    // WeChat format should have different link handling
    expect(wechatResult).not.toEqual(htmlResult)
  })
})
