/**
 * 评分算法模块
 * 
 * 7 维度加权评分系统：
 * - 费用（10%）
 * - 观看量（18%）
 * - UP 主（18%）
 * - 内容质量（27%）
 * - 评价（17%）
 * - 收藏（5%）
 * - 推荐（5%）
 */

import { BilibiliVideo, UploaderInfo } from './bilibili-api';

/**
 * 评分结果
 */
export interface CourseScore {
  total: number;        // 综合评分（0-10）
  free: number;         // 费用分
  views: number;        // 观看量分
  uploader: number;     // UP 主分
  content: number;      // 内容质量分
  reviews: number;      // 评价分
  favorites: number;    // 收藏分
  recommendation: number; // 推荐分
}

/**
 * 权重配置（总和=1.0）
 */
const weights = {
  free: 0.10,
  views: 0.18,
  uploader: 0.18,
  content: 0.27,
  reviews: 0.17,
  favorites: 0.05,
  recommendation: 0.05,
};

/**
 * 归一化标准（基于 B 站教育类视频数据统计）
 */
const normalizationStandards = {
  views: { min: 0, max: 10000000 },      // 0-1000 万
  favorites: { min: 0, max: 500000 },     // 0-50 万
  coins: { min: 0, max: 300000 },         // 0-30 万
  followers: { min: 0, max: 5000000 },    // 0-500 万
  likes: { min: 0, max: 500000 },         // 0-50 万
  danmaku: { min: 0, max: 100000 },       // 0-10 万
};

/**
 * 计算综合评分
 */
export function calculateScore(video: BilibiliVideo): CourseScore {
  const freeScore = video.isFree ? 10 : 0;
  const viewsScore = normalize(video.views, normalizationStandards.views.min, normalizationStandards.views.max);
  const uploaderScore = calculateUploaderScore(video.uploader);
  const contentScore = calculateContentScore(video);
  const reviewsScore = calculateReviewsScore(video);
  const favoritesScore = normalize(video.favorites, normalizationStandards.favorites.min, normalizationStandards.favorites.max);
  const recommendationScore = video.isRecommended ? 10 : 5;

  const total = 
    freeScore * weights.free +
    viewsScore * weights.views +
    uploaderScore * weights.uploader +
    contentScore * weights.content +
    reviewsScore * weights.reviews +
    favoritesScore * weights.favorites +
    recommendationScore * weights.recommendation;

  return {
    total: Math.round(total * 10) / 10,
    free: freeScore,
    views: viewsScore,
    uploader: uploaderScore,
    content: contentScore,
    reviews: reviewsScore,
    favorites: favoritesScore,
    recommendation: recommendationScore,
  };
}

/**
 * 归一化函数
 */
function normalize(value: number, min: number, max: number): number {
  if (max === min) return 5;
  const normalized = (value - min) / (max - min);
  return Math.max(0, Math.min(10, normalized * 10));
}

/**
 * 计算 UP 主评分
 */
function calculateUploaderScore(uploader: UploaderInfo): number {
  const followerScore = normalize(
    uploader.followers,
    normalizationStandards.followers.min,
    normalizationStandards.followers.max
  );
  
  // 认证加分
  const verifiedBonus = uploader.isVerified ? 2 : 0;
  
  // 教育类 UP 主额外加分
  const educationBonus = uploader.verificationType?.includes('教育') ? 1 : 0;
  
  return Math.min(10, followerScore * 0.7 + verifiedBonus + educationBonus);
}

/**
 * 计算内容质量评分
 */
function calculateContentScore(video: BilibiliVideo): number {
  let score = 5;

  // 视频时长（5-20 分钟最佳）
  if (video.duration >= 300 && video.duration <= 1200) {
    score += 2;
  } else if (video.duration > 1200 && video.duration <= 1800) {
    score += 1;
  }

  // 更新频率（最近 30 天有更新）
  const daysSinceUpdate = (Date.now() - video.lastUpdate) / (24 * 60 * 60 * 1000);
  if (daysSinceUpdate <= 30) {
    score += 2;
  } else if (daysSinceUpdate <= 90) {
    score += 1;
  }

  // 系列课程（有合集）
  if (video.hasSeries) {
    score += 1;
  }

  return Math.min(10, score);
}

/**
 * 计算评价评分
 */
function calculateReviewsScore(video: BilibiliVideo): number {
  // 基于点赞/投币比例
  const likeRatio = video.likes / (video.likes + video.coins * 0.5 || 1);
  
  // 基于弹幕/播放量比例（互动质量）
  const engagementRatio = video.danmaku / (video.views || 1);
  const engagementScore = Math.min(10, engagementRatio * 1000);
  
  return Math.round((likeRatio * 0.6 + engagementScore * 0.4) * 10) / 10;
}

/**
 * 验证权重总和
 */
export function validateWeights(): boolean {
  const total = Object.values(weights).reduce((sum, w) => sum + w, 0);
  return Math.abs(total - 1.0) < 0.001;
}

/**
 * 获取权重配置（用于调试）
 */
export function getWeights(): typeof weights {
  return { ...weights };
}
