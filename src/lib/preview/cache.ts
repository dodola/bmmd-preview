import * as crypto from 'node:crypto'

/**
 * 缓存条目
 */
interface CacheEntry {
  /** 渲染后的 HTML */
  html: string
  /** 创建时间戳 */
  timestamp: number
  /** 访问次数 */
  accessCount: number
  /** 最后访问时间 */
  lastAccess: number
}

/**
 * 渲染缓存配置
 */
export interface RenderCacheOptions {
  /** 最大缓存条目数 */
  maxSize?: number
  /** 缓存过期时间（毫秒） */
  ttl?: number
  /** 最大缓存内存大小（字节），默认 50MB */
  maxMemorySize?: number
}

/**
 * 渲染缓存管理器
 * 
 * 使用 LRU (Least Recently Used) 策略管理渲染结果缓存
 * 实现内存大小限制，避免内存泄漏
 */
export class RenderCache {
  private cache: Map<string, CacheEntry> = new Map()
  private readonly maxSize: number
  private readonly ttl: number
  private readonly maxMemorySize: number
  private currentMemorySize: number = 0

  constructor(options: RenderCacheOptions = {}) {
    this.maxSize = options.maxSize ?? 100
    this.ttl = options.ttl ?? 5 * 60 * 1000 // 默认 5 分钟
    this.maxMemorySize = options.maxMemorySize ?? 50 * 1024 * 1024 // 默认 50MB
  }

  /**
   * 生成缓存键
   * 
   * @param markdown Markdown 源文本
   * @param options 渲染选项
   * @returns 缓存键
   */
  static generateKey(markdown: string, options: Record<string, any>): string {
    // 将 markdown 和 options 组合成一个字符串
    const content = JSON.stringify({
      markdown,
      options,
    })

    // 使用 SHA-256 生成哈希
    return crypto
      .createHash('sha256')
      .update(content)
      .digest('hex')
  }

  /**
   * 获取缓存的渲染结果
   * 
   * @param key 缓存键
   * @returns 渲染结果，如果不存在或已过期则返回 undefined
   */
  get(key: string): string | undefined {
    const entry = this.cache.get(key)

    if (!entry) {
      return undefined
    }

    // 检查是否过期
    const now = Date.now()
    if (now - entry.timestamp > this.ttl) {
      this.cache.delete(key)
      return undefined
    }

    // 更新访问信息
    entry.accessCount++
    entry.lastAccess = now

    return entry.html
  }

  /**
   * 存储渲染结果到缓存
   * 
   * @param key 缓存键
   * @param html 渲染后的 HTML
   */
  set(key: string, html: string): void {
    const now = Date.now()
    const htmlSize = this.estimateSize(html)

    // 如果单个条目超过最大内存限制的 20%，不缓存
    if (htmlSize > this.maxMemorySize * 0.2) {
      console.warn(`HTML 大小 (${htmlSize} 字节) 超过缓存限制，跳过缓存`)
      return
    }

    // 如果缓存已满（按条目数或内存大小），清理空间
    while (
      this.cache.size >= this.maxSize ||
      this.currentMemorySize + htmlSize > this.maxMemorySize
    ) {
      // 如果缓存为空但仍然超过限制，说明配置有问题
      if (this.cache.size === 0) {
        console.warn('缓存配置异常：无法存储新条目')
        return
      }
      this.evictLeastRecentlyUsed()
    }

    // 如果键已存在，先删除旧条目以更新内存计数
    if (this.cache.has(key)) {
      const oldEntry = this.cache.get(key)!
      this.currentMemorySize -= this.estimateSize(oldEntry.html)
    }

    // 存储新条目
    this.cache.set(key, {
      html,
      timestamp: now,
      accessCount: 1,
      lastAccess: now,
    })

    // 更新内存使用量
    this.currentMemorySize += htmlSize
  }

  /**
   * 检查缓存中是否存在指定键
   * 
   * @param key 缓存键
   * @returns 是否存在
   */
  has(key: string): boolean {
    const entry = this.cache.get(key)

    if (!entry) {
      return false
    }

    // 检查是否过期
    const now = Date.now()
    if (now - entry.timestamp > this.ttl) {
      this.cache.delete(key)
      return false
    }

    return true
  }

  /**
   * 清除指定键的缓存
   * 
   * @param key 缓存键
   */
  delete(key: string): void {
    const entry = this.cache.get(key)
    if (entry) {
      this.currentMemorySize -= this.estimateSize(entry.html)
      this.cache.delete(key)
    }
  }

  /**
   * 清空所有缓存
   */
  clear(): void {
    this.cache.clear()
    this.currentMemorySize = 0
  }

  /**
   * 清理过期的缓存条目
   * 
   * @returns 清理的条目数
   */
  cleanExpired(): number {
    const now = Date.now()
    let count = 0

    for (const [key, entry] of this.cache.entries()) {
      if (now - entry.timestamp > this.ttl) {
        this.currentMemorySize -= this.estimateSize(entry.html)
        this.cache.delete(key)
        count++
      }
    }

    return count
  }

  /**
   * 驱逐最少使用的缓存条目
   */
  private evictLeastRecentlyUsed(): void {
    let lruKey: string | undefined
    let lruTime = Number.POSITIVE_INFINITY

    // 找到最少最近使用的条目
    for (const [key, entry] of this.cache.entries()) {
      if (entry.lastAccess < lruTime) {
        lruTime = entry.lastAccess
        lruKey = key
      }
    }

    // 删除该条目
    if (lruKey) {
      const entry = this.cache.get(lruKey)!
      this.currentMemorySize -= this.estimateSize(entry.html)
      this.cache.delete(lruKey)
    }
  }

  /**
   * 估算字符串的内存大小（字节）
   * 
   * JavaScript 字符串使用 UTF-16 编码，每个字符占用 2 字节
   * 
   * @param str 字符串
   * @returns 估算的字节数
   */
  private estimateSize(str: string): number {
    // UTF-16 编码，每个字符 2 字节
    // 加上对象开销（大约 100 字节）
    return str.length * 2 + 100
  }

  /**
   * 获取缓存统计信息
   * 
   * @returns 统计信息
   */
  getStats(): {
    size: number
    maxSize: number
    ttl: number
    memorySize: number
    maxMemorySize: number
    memoryUsagePercent: number
  } {
    return {
      size: this.cache.size,
      maxSize: this.maxSize,
      ttl: this.ttl,
      memorySize: this.currentMemorySize,
      maxMemorySize: this.maxMemorySize,
      memoryUsagePercent: (this.currentMemorySize / this.maxMemorySize) * 100,
    }
  }
}
