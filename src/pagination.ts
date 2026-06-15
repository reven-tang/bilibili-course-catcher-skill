/**
 * "换一批"功能模块
 * 
 * 功能：
 * - 基于当前查询获取下一页结果
 * - 支持分页浏览
 * - 保持筛选条件
 */

import { BilibiliVideo, BilibiliError, BilibiliErrorType } from './bilibili-api';
import { UserPreferences } from './questionnaire';
import { calculateMatchScore } from './matcher';
import { calculateScore } from './scorer';
import { fetchFromBilibili } from './api-fetcher';

/**
 * 分页搜索结果
 */
export interface PaginatedResult {
  videos: BilibiliVideo[];
  page: number;
  totalResults: number;
  hasMore: boolean;
}

/**
 * 搜索会话（保持状态）
 */
export interface SearchSession {
  id: string;
  keyword: string;
  preferences: UserPreferences;
  currentPage: number;
  results: PaginatedResult[];
  timestamp: number;
}

/**
 * 会话存储（内存）
 */
const sessions: Map<string, SearchSession> = new Map();

/**
 * 创建搜索会话
 */
export function createSearchSession(
  keyword: string,
  preferences: UserPreferences
): string {
  const sessionId = `session_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  
  sessions.set(sessionId, {
    id: sessionId,
    keyword,
    preferences,
    currentPage: 1,
    results: [],
    timestamp: Date.now(),
  });
  
  return sessionId;
}

/**
 * 获取会话
 */
export function getSession(sessionId: string): SearchSession | null {
  return sessions.get(sessionId) || null;
}

/**
 * 换一批（获取下一页）
 */
export async function loadMoreCourses(
  sessionId: string,
  page: number
): Promise<{
  success: boolean;
  output?: string;
  error?: string;
}> {
  const session = getSession(sessionId);
  
  if (!session) {
    return {
      success: false,
      error: '会话不存在或已过期，请重新搜索',
    };
  }
  
  try {
    console.log(`🔄 换一批：第 ${page} 页`);
    
    // 检查是否已有缓存
    const cachedResult = session.results[page - 1];
    if (cachedResult) {
      console.log(`✅ 使用缓存结果：${cachedResult.videos.length} 条`);
      return {
        success: true,
        output: formatPageResult(cachedResult, session.preferences, page),
      };
    }
    
    // 执行新搜索（使用统一入口）
    let videos: BilibiliVideo[];
    
    try {
      videos = await fetchFromBilibili(session.keyword, page);
    } catch (error) {
      console.warn('所有数据源均失败，返回空结果');
      videos = [];
    }
    
    // 过滤和评分
    const matchedCourses = videos
      .map(video => ({
        ...video,
        grade: session.preferences.grade,
        category: session.preferences.category,
        level: session.preferences.level,
        matchScore: calculateMatchScore(video, session.preferences),
      }))
      .filter(course => course.matchScore >= 0.5);
    
    const scoredCourses = matchedCourses.map(course => ({
      ...course,
      score: calculateScore(course),
    }));
    
    scoredCourses.sort((a, b) => b.score.total - a.score.total);
    
    // 保存结果
    const result: PaginatedResult = {
      videos: scoredCourses,
      page,
      totalResults: scoredCourses.length,
      hasMore: scoredCourses.length === 20, // 假设每页 20 条
    };
    
    session.results[page - 1] = result;
    session.currentPage = page;
    
    return {
      success: true,
      output: formatPageResult(result, session.preferences, page),
    };
    
  } catch (error) {
    console.error('换一批失败:', error);
    return {
      success: false,
      error: error instanceof Error ? error.message : '未知错误',
    };
  }
}

/**
 * 格式化分页结果
 */
function formatPageResult(
  result: PaginatedResult,
  preferences: UserPreferences,
  page: number
): string {
  if (result.videos.length === 0) {
    return `😕 第 ${page} 页没有更多结果了`;
  }
  
  let output = `## 📚 第 ${page} 页 - 找到 **${result.videos.length}** 门课程\n\n`;
  output += `**筛选条件**：${preferences.grade} · ${preferences.category} · ${preferences.level}\n\n`;
  output += `---\n\n`;
  
  result.videos.slice(0, 10).forEach((course: any, index) => {
    const medal = index === 0 ? '🎯' : '';
    const stars = '⭐'.repeat(Math.round(course.score.total / 2));
    
    output += `### ${medal} 推荐课程 #${index + 1}\n\n`;
    output += `| 项目 | 详情 |\n`;
    output += `|------|------|\n`;
    output += `| **课程名称** | ${course.title} |\n`;
    output += `| **课程链接** | [点击观看](${course.url}) |\n`;
    output += `| **综合评分** | ${stars} **${course.score.total}**/10 |\n`;
    output += `| **UP 主** | ${course.uploader.name}${course.uploader.isVerified ? ' ✅' : ''} |\n`;
    output += `| **播放** | ${formatNumber(course.views)} |\n`;
    output += `| **收藏** | ${formatNumber(course.favorites)} |\n`;
    output += `\n---\n\n`;
  });
  
  // 分页导航
  output += `📄 **页码**: 第 ${page} 页\n\n`;
  output += `**操作**:\n`;
  output += `- 输入 **"换一批"** 或 **"下一页"** 查看第 ${page + 1} 页\n`;
  output += `- 输入 **"上一页"** 返回第 ${page - 1} 页（如果 ${page > 1}）\n`;
  output += `- 输入 **"重新搜索"** 开始新的搜索\n`;
  
  return output;
}

/**
 * 格式化数字
 */
function formatNumber(num: number): string {
  if (num >= 10000) return `${(num / 10000).toFixed(1)}万+`;
  if (num >= 1000) return `${(num / 1000).toFixed(1)}千+`;
  return num.toString();
}

/**
 * 清理过期会话（>1 小时）
 */
export function cleanupSessions(): void {
  const now = Date.now();
  const oneHour = 60 * 60 * 1000;
  
  let cleaned = 0;
  for (const [id, session] of sessions.entries()) {
    if (now - session.timestamp > oneHour) {
      sessions.delete(id);
      cleaned++;
    }
  }
  
  if (cleaned > 0) {
    console.log(`🧹 清理了 ${cleaned} 个过期会话`);
  }
}

/**
 * 获取活跃会话数
 */
export function getActiveSessionCount(): number {
  return sessions.size;
}
