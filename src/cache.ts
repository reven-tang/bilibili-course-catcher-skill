/**
 * 缓存模块
 * 
 * 功能：
 * - 内存缓存（LRU 策略）
 * - 自动过期
 * - 最大条目限制
 */

import { BilibiliVideo } from './bilibili-api';

/**
 * 缓存条目
 */
interface CacheEntry {
  data: BilibiliVideo[];
  timestamp: number;
  hits: number;
}

/**
 * 缓存配置
 */
interface CacheConfig {
  enabled: boolean;
  ttlMs: number;        // 缓存有效期（毫秒）
  maxSize: number;      // 最大缓存条目数
}

/**
 * 缓存类（LRU 策略）
 */
export class VideoCache {
  private cache: Map<string, CacheEntry>;
  private config: CacheConfig;
  private hits: number;
  private misses: number;

  constructor(config: CacheConfig) {
    this.cache = new Map();
    this.config = config;
    this.hits = 0;
    this.misses = 0;
  }

  /**
   * 生成缓存键
   */
  private generateKey(keyword: string): string {
    return `bilibili:search:${keyword}`;
  }

  /**
   * 检查缓存是否有效
   */
  private isValid(entry: CacheEntry): boolean {
    const now = Date.now();
    const age = now - entry.timestamp;
    return age < this.config.ttlMs;
  }

  /**
   * 获取缓存
   */
  get(keyword: string): BilibiliVideo[] | null {
    if (!this.config.enabled) {
      return null;
    }

    const key = this.generateKey(keyword);
    const entry = this.cache.get(key);

    if (!entry) {
      this.misses++;
      return null;
    }

    if (!this.isValid(entry)) {
      // 缓存过期，删除
      this.cache.delete(key);
      this.misses++;
      return null;
    }

    // 缓存命中
    entry.hits++;
    this.hits++;
    return entry.data;
  }

  /**
   * 设置缓存
   */
  set(keyword: string, videos: BilibiliVideo[]): void {
    if (!this.config.enabled) {
      return;
    }

    const key = this.generateKey(keyword);

    // 如果缓存已满，删除最少使用的条目
    if (this.cache.size >= this.config.maxSize) {
      this.evictLeastUsed();
    }

    this.cache.set(key, {
      data: videos,
      timestamp: Date.now(),
      hits: 0,
    });
  }

  /**
   * 淘汰最少使用的条目（LRU）
   */
  private evictLeastUsed(): void {
    let minHits = Infinity;
    let minKey: string | null = null;

    for (const [key, entry] of this.cache.entries()) {
      if (entry.hits < minHits) {
        minHits = entry.hits;
        minKey = key;
      }
    }

    if (minKey) {
      this.cache.delete(minKey);
      console.log(`🗑️  缓存淘汰：${minKey} (hits: ${minHits})`);
    }
  }

  /**
   * 清空缓存
   */
  clear(): void {
    this.cache.clear();
    this.hits = 0;
    this.misses = 0;
    console.log('🧹 缓存已清空');
  }

  /**
   * 获取缓存统计
   */
  getStats(): {
    size: number;
    hits: number;
    misses: number;
    hitRate: number;
  } {
    const total = this.hits + this.misses;
    const hitRate = total > 0 ? (this.hits / total) * 100 : 0;

    return {
      size: this.cache.size,
      hits: this.hits,
      misses: this.misses,
      hitRate: Math.round(hitRate * 10) / 10,
    };
  }

  /**
   * 删除指定缓存
   */
  delete(keyword: string): boolean {
    const key = this.generateKey(keyword);
    return this.cache.delete(key);
  }

  /**
   * 预热点门缓存（可选）
   */
  warm(keywords: string[], fetchFn: (kw: string) => Promise<BilibiliVideo[]>): Promise<void> {
    const promises = keywords.map(async (keyword) => {
      const videos = await fetchFn(keyword);
      this.set(keyword, videos);
      console.log(`🔥 预热缓存：${keyword} (${videos.length} 条)`);
    });

    return Promise.all(promises).then(() => {});
  }
}

/**
 * 缓存实例（单例）
 */
let instance: VideoCache | null = null;

/**
 * 获取缓存实例
 */
export function getCache(): VideoCache {
  if (!instance) {
    instance = new VideoCache({
      enabled: true,
      ttlMs: 300000,    // 5 分钟
      maxSize: 100,     // 最多 100 条
    });
  }
  return instance;
}

/**
 * 重置缓存实例（用于测试）
 */
export function resetCache(): void {
  instance = null;
}
