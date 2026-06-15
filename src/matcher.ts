/**
 * 匹配算法模块
 * 
 * 计算课程与用户偏好的匹配度
 */

import { BilibiliVideo } from './bilibili-api';
import { UserPreferences, GradeLevel, CategoryType, DifficultyLevel } from './questionnaire';

/**
 * 扩展课程接口
 */
export interface Course extends BilibiliVideo {
  grade: GradeLevel;
  category: CategoryType;
  level: DifficultyLevel;
  matchScore: number;
}

/**
 * 计算匹配度评分
 */
export function calculateMatchScore(
  video: BilibiliVideo,
  preferences: UserPreferences
): number {
  let matchScore = 1.0;

  // 年级匹配（通过标签判断）
  if (!gradeMatches(video.tags, preferences.grade)) {
    matchScore *= 0.5;
  }

  // 难度匹配
  if (!levelMatches(video.tags, preferences.level)) {
    matchScore *= 0.7;
  }

  // 更新日期过滤（新逻辑）
  const recency = preferences.preferences.recency || (preferences.preferences.requireRecent ? '30days' : 'any');
  const daysSinceUpdate = (Date.now() - video.lastUpdate) / (24 * 60 * 60 * 1000);
  
  if (recency === '30days' && daysSinceUpdate > 30) {
    matchScore *= 0.3;
  } else if (recency === '180days' && daysSinceUpdate > 180) {
    matchScore *= 0.3;
  } else if (recency === '365days' && daysSinceUpdate > 365) {
    matchScore *= 0.3;
  }
  // 'any' 不过滤

  // UP 主认证过滤
  if (preferences.preferences.requireVerifiedUploader) {
    if (!video.uploader.isVerified) {
      matchScore *= 0.5;
    }
  }

  // 时长过滤
  if (preferences.preferences.maxDuration) {
    const maxDurationSec = preferences.preferences.maxDuration * 60;
    if (video.duration > maxDurationSec) {
      matchScore *= 0.2;
    }
  }

  return matchScore;
}

/**
 * 过滤低匹配度课程
 */
export function filterByPreferences(
  courses: Course[],
  preferences: UserPreferences
): Course[] {
  return courses.filter(course => {
    // 免费过滤
    if (preferences.preferences.preferFree && !course.isFree) {
      return false;
    }
    
    // 匹配度阈值
    if (course.matchScore < 0.5) {
      return false;
    }
    
    return true;
  });
}

/**
 * 判断年级是否匹配
 */
function gradeMatches(tags: string[], grade: GradeLevel): boolean {
  const gradeKeywords: Record<GradeLevel, string[]> = {
    '小学': ['小学', '小学生', '三年级', '四年级', '五年级', '六年级'],
    '初中': ['初中', '初中生', '初一', '初二', '初三', '中考'],
    '高中': ['高中', '高中生', '高一', '高二', '高三', '高考'],
    '大学': ['大学', '大学生', '本科', '研究生', '考研'],
    '其他': [],
  };
  
  const keywords = gradeKeywords[grade];
  if (!keywords || keywords.length === 0) {
    return true; // "其他"匹配所有
  }
  
  return tags.some(tag => 
    keywords.some(keyword => tag.includes(keyword))
  );
}

/**
 * 判断难度级别是否匹配
 */
function levelMatches(tags: string[], level: DifficultyLevel): boolean {
  const levelKeywords: Record<DifficultyLevel, string[]> = {
    '入门': ['入门', '基础', '零基础', '初级', '新手'],
    '标准': ['标准', '系统', '中级', '提高'],
    '拔高': ['拔高', '进阶', '高级', '提升'],
    '提优': ['提优', '竞赛', '冲刺', '压轴', '难题'],
  };
  
  const keywords = levelKeywords[level];
  if (!keywords || keywords.length === 0) {
    return true;
  }
  
  return tags.some(tag => 
    keywords.some(keyword => tag.includes(keyword))
  );
}
