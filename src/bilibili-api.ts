/**
 * B 站数据获取模块
 * 
 * 策略：混合模式（最终版）
 * 1. Cookie 主（API 直连，<1s 响应）
 * 2. Browser 兜底（模拟用户，3-10s）
 * 3. web_fetch 二次兜底（极端情况）
 * 
 * 详细实现：
 * - 统一入口：api-fetcher.ts
 * - Browser 实现：browser-fetcher.ts
 * - 本模块：类型定义 + 导出 + 兼容包装
 */

import { UserPreferences } from './questionnaire';
import { fetchFromBilibili, hasCookieConfig, getCookieStatus } from './api-fetcher';
import { getConfig } from './config';

/**
 * B 站视频数据结构
 */
export interface BilibiliVideo {
  // 基本信息
  aid: number;
  bvid: string;
  title: string;
  description?: string;
  url: string;
  duration: number; // 秒
  publishDate: number; // 时间戳
  lastUpdate: number; // 时间戳
  
  // 统计数据
  views: number;
  danmaku: number;
  likes: number;
  coins: number;
  favorites: number;
  shares: number;
  
  // UP 主信息
  uploader: UploaderInfo;
  
  // 内容特征
  tags: string[];
  isFree: boolean;
  hasSeries: boolean;
  seriesTitle?: string;
  isRecommended: boolean;
  
  // 评分（计算后填充）
  score?: any;
}

/**
 * UP 主信息
 */
export interface UploaderInfo {
  mid: number;
  name: string;
  followers: number;
  isVerified: boolean;
  verificationType?: string;
  totalVideos: number;
  totalViews: number;
}

/**
 * 错误类型
 */
export enum BilibiliErrorType {
  RATE_LIMIT = 'RATE_LIMIT',
  API_UNAVAILABLE = 'API_UNAVAILABLE',
  PARSE_ERROR = 'PARSE_ERROR',
  NO_RESULTS = 'NO_RESULTS',
  NETWORK_ERROR = 'NETWORK_ERROR',
}

export class BilibiliError extends Error {
  constructor(
    public type: BilibiliErrorType,
    message: string,
    public retryable: boolean = true
  ) {
    super(message);
  }
}

/**
 * 搜索课程（主函数）
 * 
 * 调用统一入口 fetchFromBilibili：
 * 1. 优先 Cookie（直连 API）
 * 2. 失败降级 Browser
 * 3. 再失败 web_fetch
 */
export async function searchCourses(
  keyword: string,
  preferences: UserPreferences
): Promise<BilibiliVideo[]> {
  console.log(`🔍 搜索关键词：${keyword}`);
  
  // 显示当前数据源状态
  if (hasCookieConfig()) {
    const cookieStatus = getCookieStatus();
    if (cookieStatus === 'valid') {
      console.log('🔑 数据源：Cookie（已验证）');
    } else if (cookieStatus === 'invalid') {
      console.log('🌐 数据源：Browser（Cookie 已过期）');
    } else {
      console.log('🔑 数据源：Cookie（待验证）');
    }
  } else {
    console.log('🌐 数据源：Browser（未配置 Cookie）');
  }
  
  try {
    // 统一入口
    const videos = await fetchFromBilibili(keyword);
    
    if (videos.length === 0) {
      throw new BilibiliError(
        BilibiliErrorType.NO_RESULTS,
        '未找到相关课程',
        false
      );
    }
    
    console.log(`✅ 搜索成功，找到 ${videos.length} 条结果`);
    return videos;
    
  } catch (error) {
    if (error instanceof BilibiliError && !error.retryable) {
      throw error;
    }
    
    // 所有方式均失败
    throw new BilibiliError(
      BilibiliErrorType.NETWORK_ERROR,
      '无法获取 B 站数据，请检查网络连接。' +
      (hasCookieConfig() && getCookieStatus() === 'invalid'
        ? ' Cookie 已过期，请更新。'
        : ''),
      false
    );
  }
}

// 导出函数
// 注意：fetchFromBilibili / fetchWithCookie / fetchWithBrowser 在 api-fetcher.ts 中
// Browser 相关工具在 browser-fetcher.ts 中

/**
 * 构建搜索关键词
 */
export function buildSearchKeyword(preferences: UserPreferences): string {
  const parts = [preferences.grade, preferences.category, preferences.level];
  
  // 根据类别调整
  if (preferences.category === '编程') {
    parts.push('教程');
  } else if (preferences.category === '英语') {
    parts.push('课程');
  }
  
  return parts.join(' ');
}
