/**
 * 输出格式化模块
 * 
 * 将评分结果格式化为美观的 Markdown 输出
 */

import { Course } from './matcher';
import { UserPreferences } from './questionnaire';

/**
 * 格式化推荐列表
 */
export function formatRecommendations(
  courses: Course[],
  preferences: UserPreferences
): string {
  if (courses.length === 0) {
    return '😕 未找到符合条件的课程，建议放宽筛选条件。';
  }

  // 过滤低分课程
  const highQualityCourses = courses.filter(c => c.score && c.score.total >= 6.0);
  
  if (highQualityCourses.length === 0) {
    return '😕 未找到符合条件的优质课程（综合评分≥6.0），建议放宽筛选条件。';
  }

  // 构建输出
  let output = `## 📚 为您找到 **${highQualityCourses.length}** 门优质课程\n\n`;
  output += `**筛选条件**：${preferences.grade} · ${preferences.category} · ${preferences.level}`;
  
  if (preferences.preferences.requireRecent) {
    output += ' · 最近 30 天更新';
  }
  if (preferences.preferences.requireVerifiedUploader) {
    output += ' · 认证 UP 主';
  }
  if (preferences.preferences.preferFree) {
    output += ' · 免费课程';
  }
  
  output += `\n\n---\n\n`;

  // 输出前 10 门课程
  highQualityCourses.slice(0, 10).forEach((course, index) => {
    const medal = getMedal(index);
    const stars = getStars(course.score.total);
    
    output += `### ${medal} 推荐课程 #${index + 1}\n\n`;
    output += `| 项目 | 详情 |\n`;
    output += `|------|------|\n`;
    output += `| **课程名称** | ${course.title} |\n`;
    output += `| **课程链接** | [点击观看](${course.url}) |\n`;
    output += `| **简介** | ${truncate(course.description || '暂无简介', 80)} |\n`;
    output += `| **难度** | ${course.level} |\n`;
    output += `| **适合阶段** | ${course.grade} |\n`;
    output += `| **综合评分** | ${stars} **${course.score.total}**/10 |\n`;
    output += `\n**详细指标**：\n`;
    output += `- 🆓 费用：${course.isFree ? '免费' : '付费'}\n`;
    output += `- ▶️ 播放量：${formatNumber(course.views)}\n`;
    output += `- 👤 UP 主：${course.uploader.name}${course.uploader.isVerified ? ' ✅' : ''}（粉丝${formatNumber(course.uploader.followers)}）\n`;
    output += `- 💬 互动：${formatNumber(course.likes)} 点赞 · ${formatNumber(course.danmaku)} 弹幕\n`;
    output += `- ⭐ 收藏：${formatNumber(course.favorites)}\n`;
    output += `- 📅 更新：${formatDate(course.lastUpdate)}\n`;
    output += `\n---\n\n`;
  });

  output += `💡 **提示**：以上课程按综合评分排序，建议优先观看评分高的课程。\n\n`;
  output += `⚠️ **注意**：数据来自 B 站公开信息，播放量等指标实时变化，以实际页面为准。`;

  return output;
}

/**
 * 获取奖牌图标
 */
function getMedal(index: number): string {
  if (index === 0) return '🥇';
  if (index === 1) return '🥈';
  if (index === 2) return '🥉';
  return '🎯';
}

/**
 * 获取星级评分
 */
function getStars(score: number): string {
  const fullStars = Math.round(score / 2);
  return '⭐'.repeat(fullStars);
}

/**
 * 截断文本
 */
function truncate(text: string, maxLength: number): string {
  if (text.length <= maxLength) return text;
  return text.slice(0, maxLength) + '...';
}

/**
 * 格式化数字（万/千单位）
 */
function formatNumber(num: number): string {
  if (num >= 10000000) {
    return `${(num / 10000000).toFixed(1)}亿+`;
  }
  if (num >= 10000) {
    return `${(num / 10000).toFixed(1)}万+`;
  }
  if (num >= 1000) {
    return `${(num / 1000).toFixed(1)}千+`;
  }
  return num.toString();
}

/**
 * 格式化日期
 */
function formatDate(timestamp: number): string {
  const date = new Date(timestamp);
  const now = new Date();
  const diffMs = now.getTime() - date.getTime();
  const diffDays = Math.floor(diffMs / (24 * 60 * 60 * 1000));
  
  if (diffDays === 0) {
    return '今天';
  } else if (diffDays === 1) {
    return '昨天';
  } else if (diffDays <= 7) {
    return `${diffDays}天前`;
  } else if (diffDays <= 30) {
    return `${Math.floor(diffDays / 7)}周前`;
  } else if (diffDays <= 365) {
    return `${Math.floor(diffDays / 30)}个月前`;
  } else {
    return date.toLocaleDateString('zh-CN', { year: 'numeric', month: 'long' });
  }
}

/**
 * 格式化单个课程详情（用于快速预览）
 */
export function formatCourseCard(course: Course): string {
  const stars = getStars(course.score.total);
  
  let output = `### ${course.title}\n\n`;
  output += `**评分**：${stars} ${course.score.total}/10\n`;
  output += `**课程链接**：[点击观看](${course.url})\n`;
  output += `**UP 主**：${course.uploader.name}${course.uploader.isVerified ? ' ✅' : ''}\n`;
  output += `**播放**：${formatNumber(course.views)} · **收藏**：${formatNumber(course.favorites)}\n`;
  
  return output;
}
