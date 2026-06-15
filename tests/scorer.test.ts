/**
 * 评分算法单元测试
 */

import { calculateScore, validateWeights, getWeights } from './scorer';
import { BilibiliVideo, UploaderInfo } from './bilibili-api';

/**
 * 创建模拟视频数据
 */
function createMockVideo(overrides: Partial<BilibiliVideo> = {}): BilibiliVideo {
  return {
    aid: 123456,
    bvid: 'BV1234567890',
    title: '测试课程',
    description: '这是一个测试课程',
    url: 'https://www.bilibili.com/video/BV1234567890',
    duration: 600, // 10 分钟
    publishDate: Date.now() - 7 * 24 * 60 * 60 * 1000, // 7 天前
    lastUpdate: Date.now() - 7 * 24 * 60 * 60 * 1000,
    
    views: 1000000,
    danmaku: 5000,
    likes: 50000,
    coins: 10000,
    favorites: 30000,
    shares: 2000,
    
    uploader: {
      mid: 98765,
      name: '测试 UP 主',
      followers: 500000,
      isVerified: true,
      verificationType: '教育 UP 主',
      totalVideos: 100,
      totalViews: 10000000,
    },
    
    tags: ['初中', '数学', '入门'],
    isFree: true,
    hasSeries: true,
    seriesTitle: '初中数学系列',
    isRecommended: true,
    
    ...overrides,
  };
}

describe('评分算法测试', () => {
  test('权重总和必须为 1.0', () => {
    expect(validateWeights()).toBe(true);
  });

  test('免费课程费用分为 10 分', () => {
    const video = createMockVideo({ isFree: true });
    const score = calculateScore(video);
    expect(score.free).toBe(10);
  });

  test('付费课程费用分为 0 分', () => {
    const video = createMockVideo({ isFree: false });
    const score = calculateScore(video);
    expect(score.free).toBe(0);
  });

  test('认证教育 UP 主获得额外加分', () => {
    const uploader: UploaderInfo = {
      mid: 123,
      name: '教育名师',
      followers: 1000000,
      isVerified: true,
      verificationType: '教育 UP 主',
      totalVideos: 200,
      totalViews: 50000000,
    };
    
    const video = createMockVideo({ uploader });
    const score = calculateScore(video);
    
    // 认证 UP 主应该有较高分（至少 7 分以上）
    expect(score.uploader).toBeGreaterThan(7);
  });

  test('近期更新内容获得加分', () => {
    const now = Date.now();
    const recentVideo = createMockVideo({ lastUpdate: now - 10 * 24 * 60 * 60 * 1000 }); // 10 天前
    const oldVideo = createMockVideo({ lastUpdate: now - 200 * 24 * 60 * 60 * 1000 }); // 200 天前
    
    const recentScore = calculateScore(recentVideo);
    const oldScore = calculateScore(oldVideo);
    
    // 近期更新的内容质量分应该更高
    expect(recentScore.content).toBeGreaterThan(oldScore.content);
  });

  test('系列课程获得加分', () => {
    const withSeries = createMockVideo({ hasSeries: true });
    const withoutSeries = createMockVideo({ hasSeries: false });
    
    const scoreWithSeries = calculateScore(withSeries);
    const scoreWithoutSeries = calculateScore(withoutSeries);
    
    expect(scoreWithSeries.content).toBeGreaterThan(scoreWithoutSeries.content);
  });

  test('视频时长在合理范围内获得加分', () => {
    const optimalVideo = createMockVideo({ duration: 600 }); // 10 分钟
    const tooShort = createMockVideo({ duration: 60 }); // 1 分钟
    const tooLong = createMockVideo({ duration: 3600 }); // 60 分钟
    
    const optimalScore = calculateScore(optimalVideo);
    const shortScore = calculateScore(tooShort);
    const longScore = calculateScore(tooLong);
    
    // 最优时长应该得分最高
    expect(optimalScore.content).toBeGreaterThanOrEqual(7);
    expect(shortScore.content).toBeLessThan(optimalScore.content);
    expect(longScore.content).toBeLessThan(optimalScore.content);
  });

  test('综合评分计算正确', () => {
    const video = createMockVideo();
    const score = calculateScore(video);
    
    // 综合评分应该在 0-10 之间
    expect(score.total).toBeGreaterThanOrEqual(0);
    expect(score.total).toBeLessThanOrEqual(10);
    
    // 优质课程应该至少有 6 分
    expect(score.total).toBeGreaterThanOrEqual(6);
  });

  test('播放量归一化正确', () => {
    const lowViews = createMockVideo({ views: 1000 });
    const highViews = createMockVideo({ views: 10000000 });
    
    const lowScore = calculateScore(lowViews);
    const highScore = calculateScore(highViews);
    
    // 高播放量的观看量分应该更高
    expect(highScore.views).toBeGreaterThan(lowScore.views);
  });

  test('权重配置可获取', () => {
    const weights = getWeights();
    
    expect(weights.free).toBe(0.10);
    expect(weights.views).toBe(0.18);
    expect(weights.uploader).toBe(0.18);
    expect(weights.content).toBe(0.27);
    expect(weights.reviews).toBe(0.17);
    expect(weights.favorites).toBe(0.05);
    expect(weights.recommendation).toBe(0.05);
  });
});
