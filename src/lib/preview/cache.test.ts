import { describe, expect, it } from 'vitest'
import { RenderCache } from './cache'

describe('RenderCache', () => {
  it('应该能够生成缓存键', () => {
    const markdown = '# Hello World'
    const options = { style: 'ayu-light', theme: 'kimbie-light' }
    
    const key1 = RenderCache.generateKey(markdown, options)
    const key2 = RenderCache.generateKey(markdown, options)
    
    // 相同的输入应该生成相同的键
    expect(key1).toBe(key2)
    expect(key1).toHaveLength(64) // SHA-256 哈希长度
  })

  it('应该能够存储和获取缓存', () => {
    const cache = new RenderCache()
    const key = 'test-key'
    const html = '<h1>Hello World</h1>'
    
    cache.set(key, html)
    const result = cache.get(key)
    
    expect(result).toBe(html)
  })

  it('应该在缓存不存在时返回 undefined', () => {
    const cache = new RenderCache()
    const result = cache.get('non-existent-key')
    
    expect(result).toBeUndefined()
  })

  it('应该能够检查缓存是否存在', () => {
    const cache = new RenderCache()
    const key = 'test-key'
    
    expect(cache.has(key)).toBe(false)
    
    cache.set(key, '<h1>Test</h1>')
    expect(cache.has(key)).toBe(true)
  })

  it('应该能够删除缓存', () => {
    const cache = new RenderCache()
    const key = 'test-key'
    
    cache.set(key, '<h1>Test</h1>')
    expect(cache.has(key)).toBe(true)
    
    cache.delete(key)
    expect(cache.has(key)).toBe(false)
  })

  it('应该能够清空所有缓存', () => {
    const cache = new RenderCache()
    
    cache.set('key1', '<h1>Test 1</h1>')
    cache.set('key2', '<h1>Test 2</h1>')
    
    expect(cache.has('key1')).toBe(true)
    expect(cache.has('key2')).toBe(true)
    
    cache.clear()
    
    expect(cache.has('key1')).toBe(false)
    expect(cache.has('key2')).toBe(false)
  })

  it('应该在缓存满时驱逐最少使用的条目', () => {
    const cache = new RenderCache({ maxSize: 2 })
    
    cache.set('key1', '<h1>Test 1</h1>')
    
    // 等待一小段时间确保时间戳不同
    const delay = () => new Promise(resolve => setTimeout(resolve, 10))
    
    return delay().then(() => {
      cache.set('key2', '<h1>Test 2</h1>')
      
      return delay()
    }).then(() => {
      // 访问 key1，使其成为最近使用
      cache.get('key1')
      
      return delay()
    }).then(() => {
      // 添加第三个条目，应该驱逐 key2（最少最近使用）
      cache.set('key3', '<h1>Test 3</h1>')
      
      expect(cache.has('key1')).toBe(true)
      expect(cache.has('key2')).toBe(false)
      expect(cache.has('key3')).toBe(true)
    })
  })

  it('应该能够清理过期的缓存', async () => {
    const cache = new RenderCache({ ttl: 100 }) // 100ms TTL
    
    cache.set('key1', '<h1>Test 1</h1>')
    
    expect(cache.has('key1')).toBe(true)
    
    // 等待缓存过期
    await new Promise(resolve => setTimeout(resolve, 150))
    
    const cleaned = cache.cleanExpired()
    
    expect(cleaned).toBe(1)
    expect(cache.has('key1')).toBe(false)
  })

  it('应该返回正确的统计信息', () => {
    const cache = new RenderCache({ maxSize: 10, ttl: 5000 })
    
    cache.set('key1', '<h1>Test 1</h1>')
    cache.set('key2', '<h1>Test 2</h1>')
    
    const stats = cache.getStats()
    
    expect(stats.size).toBe(2)
    expect(stats.maxSize).toBe(10)
    expect(stats.ttl).toBe(5000)
  })
})

  it('应该在达到内存限制时驱逐条目', () => {
    // 设置一个很小的内存限制
    const cache = new RenderCache({ maxSize: 100, maxMemorySize: 1000 })
    
    // 添加一些小条目
    cache.set('key1', '<h1>Test 1</h1>')
    cache.set('key2', '<h1>Test 2</h1>')
    
    const statsBefore = cache.getStats()
    expect(statsBefore.size).toBe(2)
    
    // 添加一个大条目，应该触发驱逐
    const largeHtml = '<h1>' + 'x'.repeat(500) + '</h1>'
    cache.set('key3', largeHtml)
    
    const statsAfter = cache.getStats()
    // 由于内存限制，可能会驱逐一些条目
    expect(statsAfter.memorySize).toBeLessThanOrEqual(statsAfter.maxMemorySize)
  })

  it('应该拒绝缓存过大的单个条目', () => {
    const cache = new RenderCache({ maxMemorySize: 1000 })
    
    // 创建一个超过内存限制 20% 的条目
    const largeHtml = '<h1>' + 'x'.repeat(1000) + '</h1>'
    
    cache.set('large-key', largeHtml)
    
    // 不应该被缓存
    expect(cache.has('large-key')).toBe(false)
  })

  it('应该在删除条目时更新内存计数', () => {
    const cache = new RenderCache()
    
    cache.set('key1', '<h1>Test 1</h1>')
    const statsAfterSet = cache.getStats()
    const memoryAfterSet = statsAfterSet.memorySize
    
    cache.delete('key1')
    const statsAfterDelete = cache.getStats()
    
    expect(statsAfterDelete.memorySize).toBeLessThan(memoryAfterSet)
  })

  it('应该在清空缓存时重置内存计数', () => {
    const cache = new RenderCache()
    
    cache.set('key1', '<h1>Test 1</h1>')
    cache.set('key2', '<h1>Test 2</h1>')
    
    const statsBefore = cache.getStats()
    expect(statsBefore.memorySize).toBeGreaterThan(0)
    
    cache.clear()
    
    const statsAfter = cache.getStats()
    expect(statsAfter.memorySize).toBe(0)
    expect(statsAfter.size).toBe(0)
  })
