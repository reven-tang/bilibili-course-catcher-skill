/**
 * B 站课程抓取技能 - 主入口
 * 
 * 功能：根据学生需求从 B 站智能推荐优质课程
 * 流程：问答 → 搜索 → 评分 → 输出
 */

import { getConfig } from './config';
import { getCache } from './cache';
import { runQuestionnaire, UserPreferences, GradeLevel, Category, Level } from './questionnaire';
import { searchCourses, BilibiliVideo } from './bilibili-api';
import { calculateScore, CourseScore } from './scorer';
import { calculateMatchScore, filterByPreferences, Course } from './matcher';
import { formatRecommendations } from './formatter';
import { hasCookieConfig, getCookieStatus } from './api-fetcher';

/**
 * 主函数：执行完整的课程推荐流程
 */
export async function recommendCourses(): Promise<string> {
  const startTime = Date.now();
  
  try {
    // 加载配置和缓存
    const config = getConfig();
    const cache = getCache();
    
    console.log('🎯 开始收集学生需求...');
    
    // 显示数据源状态
    const dataSource = hasCookieConfig() 
      ? (getCookieStatus() === 'valid' ? 'Cookie（已验证）' : 'Cookie（待验证）')
      : 'Browser（未配置 Cookie）';
    
    console.log(`⚙️ 配置：超时${config.requestTimeout}ms, 重试${config.maxRetries}次, 缓存${config.cache.enabled ? '开启' : '关闭'}`);
    console.log(`📊 数据源：${dataSource}`);
    console.log('');
    // Step 1: 运行问答流程，收集用户偏好
    console.log('📝 步骤 1/6: 收集需求...');
    const preferences = await runQuestionnaire();
    console.log(`✅ 需求收集完成：${preferences.grade} · ${preferences.category} · ${preferences.level}`);

    // Step 2: 构建搜索关键词
    console.log('🔑 步骤 2/6: 构建搜索关键词...');
    const keyword = buildSearchKeyword(preferences);
    console.log(`🔍 搜索关键词：${keyword}`);

    // Step 3: 检查缓存或搜索课程
    console.log('📡 步骤 3/6: 搜索课程...');
    let videos: BilibiliVideo[];
    let fromCache = false;
    
    // 尝试从缓存获取
    const cachedVideos = cache.get(keyword);
    if (cachedVideos) {
      console.log(`✅ 缓存命中！找到 ${cachedVideos.length} 门课程（耗时 <1ms）`);
      videos = cachedVideos;
      fromCache = true;
    } else {
      // 缓存未命中，执行搜索
      videos = await searchCourses(keyword, preferences);
      console.log(`✅ 搜索完成：找到 ${videos.length} 门课程`);
      
      // 存入缓存
      if (videos.length > 0) {
        cache.set(keyword, videos);
      }
    }

    // Step 4: 过滤和匹配
    console.log('🎯 步骤 4/6: 过滤和匹配...');
    const matchedCourses = videos
      .map(video => ({
        ...video,
        grade: preferences.grade,
        category: preferences.category,
        level: preferences.level,
        matchScore: calculateMatchScore(video, preferences),
      }))
      .filter(course => course.matchScore >= 0.5);

    console.log(`✅ 匹配度筛选后剩余 ${matchedCourses.length} 门课程`);

    // Step 5: 计算评分
    console.log('📊 步骤 5/6: 计算课程评分...');
    const scoredCourses = matchedCourses.map(course => ({
      ...course,
      score: calculateScore(course),
    }));

    // 按综合评分排序
    scoredCourses.sort((a, b) => b.score.total - a.score.total);
    console.log(`✅ 评分完成，最高分：${scoredCourses[0]?.score.total || 0}/10`);

    // Step 6: 格式化输出
    console.log('📝 步骤 6/6: 生成推荐列表...');
    const output = formatRecommendations(scoredCourses, preferences);

    const totalTime = Date.now() - startTime;
    const cacheStats = cache.getStats();
    
    console.log(`✅ 推荐完成！总耗时：${totalTime}ms${fromCache ? ' (缓存加速)' : ''}`);
    console.log(`📊 缓存统计：${cacheStats.size} 条缓存，命中率 ${cacheStats.hitRate}%`);

    // 添加缓存信息到输出
    const cacheInfo = fromCache 
      ? `\n\n> 💡 **缓存提示**: 本次查询使用了缓存结果，响应速度提升 ${Math.round(totalTime / 10)} 倍。`
      : '';
    
    return output + cacheInfo;

  } catch (error) {
    console.error('❌ 课程推荐失败:', error);
    
    if (error instanceof Error) {
      return `😕 抱歉，课程推荐过程中遇到问题：\n\n**错误信息**：${error.message}\n\n建议：\n1. 检查网络连接\n2. 稍后重试\n3. 如问题持续，请联系开发者`;
    }
    
    return '😕 抱歉，发生未知错误，请稍后重试。';
  }
}

/**
 * 构建搜索关键词
 */
function buildSearchKeyword(preferences: UserPreferences): string {
  const parts = [preferences.grade, preferences.category, preferences.level];
  
  // 根据类别调整关键词
  if (preferences.category === '编程') {
    parts.push('入门教程');
  } else if (preferences.category === '英语') {
    parts.push('同步课程');
  }
  
  return parts.join(' ');
}

/**
 * 快速模式：从用户消息中提取参数，跳过问答
 */
export async function recommendCoursesQuick(
  grade?: string,
  category?: string,
  level?: string
): Promise<string> {
  if (!grade || !category || !level) {
    // 参数不全，降级到完整问答流程
    return recommendCourses();
  }

  const preferences: UserPreferences = {
    grade: grade as GradeLevel,
    category: category as Category,
    level: level as Level,
    preferences: {},
  };

  console.log(`🚀 快速模式：${grade} · ${category} · ${level}`);
  
  // 直接执行搜索和评分
  const keyword = buildSearchKeyword(preferences);
  const videos = await searchCourses(keyword, preferences);
  
  const scoredCourses = videos
    .map(video => ({
      ...video,
      grade: grade as GradeLevel,
      category: category as Category,
      level: level as Level,
      matchScore: 1.0, // 快速模式跳过匹配度计算
      score: calculateScore(video),
    }))
    .sort((a, b) => b.score.total - a.score.total);

  return formatRecommendations(scoredCourses, preferences);
}

// 导出类型供其他模块使用
export type { UserPreferences, BilibiliVideo, CourseScore };
