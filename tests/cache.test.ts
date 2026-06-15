/**
 * 缓存模块测试
 */

import { VideoCache, getCache, resetCache } from './cache';
import { BilibiliVideo } from './bilibili-api';

/**
 * 创建模拟视频数据
 */
function createMockVideos(count: number): BilibiliVideo[] {
  return Array.from({ length: count }, (_, i) => ({
    aid: i,
    bvid: `BV${i}`,
    title: `测试课程 ${i}`,
    description: '测试描述',
    url: `https://www.bilibili.com/video/BV${i}`,
    duration: 600,
    publishDate: Date.now(),
    lastUpdate: Date.now(),
    views: 100000 * (i + 1),
    danmaku: 5000,
    likes: 50000,
    coins: 10000,
    favorites: 30000,
    shares: 2000,
    uploader: {
      mid: 123,
      name: 'UP 主',
      followers: 500000,
      isVerified: true,
      verificationType: '教育 UP 主',
      totalVideos: 100,
      totalViews: 10000000,
    },
    tags: [],
    isFree: true,
    hasSeries: false,
    isRecommended: false,
  }));
}

describe('缓存模块测试', () => {
  beforeEach(() => {
    resetCache();
  });

  test('缓存基本功能', () => {
    const cache = new VideoCache({
      enabled: true,
      ttlMs: 300000,
      maxSize: 100,
    });

    const videos = createMockVideos(5);
    
    // 设置缓存
    cache.set('test_keyword', videos);
    
    // 获取缓存
    const cached = cache.get('test_keyword');
    
    expect(cached).not.toBeNull();
    expect(cached?.length).toBe(5);
    expect(cached?.[0].title).toBe('测试课程 0');
  });

  test('缓存未命中返回 null', () => {
    const cache = new VideoCache({
      enabled: true,
      ttlMs: 300000,
      maxSize: 100,
    });

    const result = cache.get('nonexistent');
    expect(result).toBeNull();
  });

  test('缓存过期自动失效', async () => {
    const cache = new VideoCache({
      enabled: true,
      ttlMs: 100, // 100ms 过期
      maxSize: 100,
    });

    const videos = createMockVideos(3);
    cache.set('test', videos);
    
    // 立即获取应该命中
    expect(cache.get('test')).not.toBeNull();
    
    // 等待过期
    await new Promise(resolve => setTimeout(resolve, 150));
    
    // 过期后应该返回 null
    expect(cache.get('test')).toBeNull();
  });

  test('LRU 淘汰策略', () => {
    const cache = new VideoCache({
      enabled: true,
      ttlMs: 300000,
      maxSize: 3, // 最多 3 条
    });

    // 添加 3 条缓存
    cache.set('keyword1', createMockVideos(1));
    cache.set('keyword2', createMockVideos(1));
    cache.set('keyword3', createMockVideos(1));
    
    // 访问 keyword1 和 keyword2（增加 hits）
    cache.get('keyword1');
    cache.get('keyword1');
    cache.get('keyword2');
    
    // 添加第 4 条，应该淘汰 keyword3（hits 最少）
    cache.set('keyword4', createMockVideos(1));
    
    expect(cache.get('keyword1')).not.toBeNull();
    expect(cache.get('keyword2')).not.toBeNull();
    expect(cache.get('keyword3')).toBeNull(); // 被淘汰
    expect(cache.get('keyword4')).not.toBeNull();
  });

  test('缓存统计', () => {
    const cache = new VideoCache({
      enabled: true,
      ttlMs: 300000,
      maxSize: 100,
    });

    const videos = createMockVideos(2);
    cache.set('test', videos);
    
    // 命中 3 次
    cache.get('test');
    cache.get('test');
    cache.get('test');
    
    // 未命中 2 次
    cache.get('nonexistent1');
    cache.get('nonexistent2');
    
    const stats = cache.getStats();
    
    expect(stats.size).toBe(1);
    expect(stats.hits).toBe(3);
    expect(stats.misses).toBe(2);
    expect(stats.hitRate).toBeCloseTo(60, 0);
  });

  test('禁用缓存', () => {
    const cache = new VideoCache({
      enabled: false,
      ttlMs: 300000,
      maxSize: 100,
    });

    const videos = createMockVideos(2);
    cache.set('test', videos);
    
    // 禁用缓存应该总是返回 null
    expect(cache.get('test')).toBeNull();
  });

  test('清空缓存', () => {
    const cache = new VideoCache({
      enabled: true,
      ttlMs: 300000,
      maxSize: 100,
    });

    cache.set('test1', createMockVideos(1));
    cache.set('test2', createMockVideos(1));
    
    expect(cache.getStats().size).toBe(2);
    
    cache.clear();
    
    expect(cache.getStats().size).toBe(0);
    expect(cache.getStats().hits).toBe(0);
    expect(cache.getStats().misses).toBe(0);
  });

  test('删除指定缓存', () => {
    const cache = new VideoCache({
      enabled: true,
      ttlMs: 300000,
      maxSize: 100,
    });

    cache.set('test1', createMockVideos(1));
    cache.set('test2', createMockVideos(1));
    
    const deleted = cache.delete('test1');
    expect(deleted).toBe(true);
    
    expect(cache.get('test1')).toBeNull();
    expect(cache.get('test2')).not.toBeNull();
    
    // 删除不存在的键
    const notDeleted = cache.delete('nonexistent');
    expect(notDeleted).toBe(false);
  });

  test('缓存键生成', () => {
    const cache = new VideoCache({
      enabled: true,
      ttlMs: 300000,
      maxSize: 100,
    });

    const videos = createMockVideos(1);
    
    // 相同关键词应该使用相同缓存
    cache.set('初中数学', videos);
    expect(cache.get('初中数学')).not.toBeNull();
    
    // 不同关键词应该独立
    expect(cache.get('初中物理')).toBeNull();
  });

  test('单例模式', () => {
    const cache1 = getCache();
    const cache2 = getCache();
    
    expect(cache1).toBe(cache2);
  });
});
