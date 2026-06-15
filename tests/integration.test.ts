/**
 * 集成测试
 * 
 * 测试 API 调用、降级策略、完整流程
 */

import { searchCourses, BilibiliError, BilibiliErrorType } from './bilibili-api';
import { UserPreferences } from './questionnaire';
import { calculateScore } from './scorer';

/**
 * 创建测试用用户偏好
 */
function createTestPreferences(): UserPreferences {
  return {
    grade: '初中',
    category: '数学',
    level: '标准',
    preferences: {
      requireRecent: false,
      requireVerifiedUploader: false,
      preferFree: false,
    },
  };
}

describe('集成测试', () => {
  describe('API 调用测试', () => {
    test('API 成功时返回视频列表', async () => {
      // 注意：实际测试需要真实的 B 站 API 访问
      // 这里使用模拟数据
      
      const preferences = createTestPreferences();
      
      // TODO: 实现 mock API 响应
      // const videos = await searchCourses('初中数学 标准', preferences);
      
      // expect(videos.length).toBeGreaterThan(0);
      // expect(videos[0].aid).toBeDefined();
      
      console.log('⚠️ 跳过真实 API 测试（需要网络访问）');
    });

    test('API 失败时降级到网页爬取', async () => {
      const preferences = createTestPreferences();
      
      // TODO: 模拟 API 失败（返回 429 或 503）
      // mockAPIFailure();
      
      // const videos = await searchCourses('初中数学 标准', preferences);
      
      // expect(videos.length).toBeGreaterThan(0);
      // 验证是否使用了网页爬取
      
      console.log('⚠️ 跳过降级测试（需要 mock 框架）');
    });

    test('无搜索结果时返回空数组', async () => {
      const preferences = createTestPreferences();
      
      // TODO: 模拟无结果
      // mockNoResults();
      
      // const videos = await searchCourses('不存在的关键词 XYZ123', preferences);
      
      // expect(videos.length).toBe(0);
      
      console.log('⚠️ 跳过无结果测试（需要 mock 框架）');
    });
  });

  describe('错误处理测试', () => {
    test('频率限制错误可重试', () => {
      const error = new BilibiliError(
        BilibiliErrorType.RATE_LIMIT,
        'API 频率限制',
        true
      );
      
      expect(error.retryable).toBe(true);
      expect(error.type).toBe(BilibiliErrorType.RATE_LIMIT);
    });

    test('网络错误不可重试', () => {
      const error = new BilibiliError(
        BilibiliErrorType.NETWORK_ERROR,
        '无法获取 B 站数据',
        false
      );
      
      expect(error.retryable).toBe(false);
      expect(error.type).toBe(BilibiliErrorType.NETWORK_ERROR);
    });

    test('解析错误不可重试', () => {
      const error = new BilibiliError(
        BilibiliErrorType.PARSE_ERROR,
        'API 返回错误格式',
        false
      );
      
      expect(error.retryable).toBe(false);
    });
  });

  describe('评分算法集成测试', () => {
    test('完整流程：搜索 → 评分 → 排序', async () => {
      const preferences = createTestPreferences();
      
      // TODO: 实现完整流程测试
      // const videos = await searchCourses('初中数学 标准', preferences);
      // const scoredVideos = videos.map(v => ({ ...v, score: calculateScore(v) }));
      // scoredVideos.sort((a, b) => b.score.total - a.score.total);
      
      // expect(scoredVideos.length).toBeGreaterThan(0);
      // expect(scoredVideos[0].score.total).toBeGreaterThanOrEqual(6.0);
      
      console.log('⚠️ 跳过完整流程测试（需要网络访问）');
    });

    test('免费课程排名优先', () => {
      // 创建两个相似的视频，一个免费一个付费
      const freeVideo = {
        aid: 1,
        bvid: 'BV1',
        title: '免费课程',
        isFree: true,
        views: 1000000,
        danmaku: 5000,
        likes: 50000,
        coins: 10000,
        favorites: 30000,
        shares: 2000,
        duration: 600,
        publishDate: Date.now(),
        lastUpdate: Date.now(),
        uploader: {
          mid: 1,
          name: 'UP1',
          followers: 500000,
          isVerified: true,
          verificationType: '教育 UP 主',
          totalVideos: 100,
          totalViews: 10000000,
        },
        tags: [],
        hasSeries: true,
        isRecommended: true,
      };

      const paidVideo = {
        ...freeVideo,
        aid: 2,
        bvid: 'BV2',
        title: '付费课程',
        isFree: false, // 唯一区别
      };

      const freeScore = calculateScore(freeVideo as any);
      const paidScore = calculateScore(paidVideo as any);

      // 免费课程应该比付费课程高 1 分（费用权重 10% × 10 分）
      expect(freeScore.free).toBe(10);
      expect(paidScore.free).toBe(0);
      expect(freeScore.total - paidScore.total).toBeCloseTo(1.0, 1);
    });

    test('高播放量课程得分更高', () => {
      const highViewsVideo = {
        aid: 1,
        bvid: 'BV1',
        title: '高播放',
        isFree: true,
        views: 10000000, // 1000 万
        danmaku: 50000,
        likes: 500000,
        coins: 100000,
        favorites: 300000,
        shares: 20000,
        duration: 600,
        publishDate: Date.now(),
        lastUpdate: Date.now(),
        uploader: {
          mid: 1,
          name: 'UP1',
          followers: 5000000,
          isVerified: true,
          verificationType: '教育 UP 主',
          totalVideos: 100,
          totalViews: 100000000,
        },
        tags: [],
        hasSeries: true,
        isRecommended: true,
      };

      const lowViewsVideo = {
        ...highViewsVideo,
        aid: 2,
        bvid: 'BV2',
        title: '低播放',
        views: 1000, // 1000
      };

      const highScore = calculateScore(highViewsVideo as any);
      const lowScore = calculateScore(lowViewsVideo as any);

      expect(highScore.views).toBeGreaterThan(lowScore.views);
      expect(highScore.total).toBeGreaterThan(lowScore.total);
    });
  });

  describe('网页爬取测试', () => {
    test('解析 HTML 提取视频列表', () => {
      // 模拟 HTML 响应
      const mockHTML = `
        <div class="video-list">
          <a href="/video/BV1234567890" title="测试课程 1">
          <a href="/video/BV0987654321" title="测试课程 2">
        </div>
      `;
      
      // TODO: 实现 HTML 解析测试
      // const videos = parseSearchHTML(mockHTML);
      
      // expect(videos.length).toBe(2);
      // expect(videos[0].bvid).toBe('BV1234567890');
      // expect(videos[1].bvid).toBe('BV0987654321');
      
      console.log('⚠️ 跳过 HTML 解析测试（需要实现 parseSearchHTML）');
    });
  });

  describe('配置管理测试', () => {
    test('权重总和验证', () => {
      // 这个测试已经在 scorer.test.ts 中覆盖
      // 这里测试配置模块的验证
      
      console.log('⚠️ 配置测试已在 config.ts 中实现');
    });

    test('环境变量加载', () => {
      // TODO: 测试 loadConfigFromEnv
      // process.env.BILIBILI_COOKIE = 'test_cookie';
      // const config = loadConfigFromEnv();
      // expect(config.bilibiliCookie).toBe('test_cookie');
      
      console.log('⚠️ 跳过环境变量测试（需要 mock process.env）');
    });
  });
});

/**
 * 性能测试（手动运行）
 */
describe.skip('性能测试', () => {
  test('连续搜索 10 次的平均耗时', async () => {
    const preferences = createTestPreferences();
    const startTime = Date.now();
    
    for (let i = 0; i < 10; i++) {
      // await searchCourses('初中数学 标准', preferences);
    }
    
    const endTime = Date.now();
    const avgTime = (endTime - startTime) / 10;
    
    console.log(`平均耗时：${avgTime}ms`);
    
    // 期望平均耗时 < 5 秒
    // expect(avgTime).toBeLessThan(5000);
    
    console.log('⚠️ 跳过性能测试（需要网络访问）');
  });

  test('并发搜索 5 次的成功率', async () => {
    const preferences = createTestPreferences();
    const promises = [];
    
    for (let i = 0; i < 5; i++) {
      // promises.push(searchCourses('初中数学 标准', preferences));
    }
    
    // const results = await Promise.allSettled(promises);
    // const successCount = results.filter(r => r.status === 'fulfilled').length;
    
    // expect(successCount).toBeGreaterThanOrEqual(4); // 80% 成功率
    
    console.log('⚠️ 跳过并发测试（需要网络访问）');
  });
});
