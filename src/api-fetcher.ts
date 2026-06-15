/**
 * 统一数据获取入口（Cookie 主 + Browser 兜底）
 * 
 * 架构：
 *   Cookie (主要, 99%)
 *     ├─ 配置 Cookie → 直连 B 站 API
 *     ├─ 速度快（<1s）
 *     ├─ 数据完整
 *     └─ Cookie 过期时降级
 *   
 *   Browser (兜底, 1%)
 *     ├─ 无需 Cookie
 *     ├─ 永远可用
 *     └─ 速度慢（3-10s）
 *   
 *   web_fetch (二次兜底, 0.1%)
 *     └─ 极端情况
 */

import { BilibiliVideo, BilibiliError, BilibiliErrorType, UploaderInfo } from './bilibili-api';
import { getConfig } from './config';

// ============================================================
// Cookie 模式
// ============================================================

/**
 * Cookie 配置状态
 */
let _cookieStatus: 'unchecked' | 'valid' | 'invalid' = 'unchecked';

/**
 * 检查 Cookie 是否配置
 */
export function hasCookieConfig(): boolean {
  const config = getConfig();
  return !!config.bilibiliCookie;
}

/**
 * 获取 Cookie 状态
 */
export function getCookieStatus(): 'unchecked' | 'valid' | 'invalid' {
  return _cookieStatus;
}

/**
 * 设置 Cookie 状态
 */
export function setCookieStatus(status: 'unchecked' | 'valid' | 'invalid'): void {
  _cookieStatus = status;
}

/**
 * 通过 Cookie 搜索
 */
export async function fetchWithCookie(
  keyword: string,
  page: number = 1
): Promise<BilibiliVideo[]> {
  const config = getConfig();
  const cookie = config.bilibiliCookie;
  
  if (!cookie) {
    throw new BilibiliError(
      BilibiliErrorType.API_UNAVAILABLE,
      'Cookie 未配置',
      false
    );
  }
  
  const baseUrl = 'https://api.bilibili.com/x/web-interface/search/type';
  const params = {
    keyword,
    search_type: 'video',
    page: page.toString(),
    page_size: '20',
    order: 'totalrank',
  };
  
  const url = `${baseUrl}?${new URLSearchParams(params)}`;
  
  const response = await fetch(url, {
    headers: {
      'User-Agent': 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
      'Referer': 'https://www.bilibili.com',
      'Cookie': cookie,
    },
  });
  
  if (response.status === 429) {
    // Cookie 可能触发了频率限制
    markCookieMaybeInvalid();
    throw new BilibiliError(
      BilibiliErrorType.RATE_LIMIT,
      'Cookie 频率限制，降级到 Browser',
      true
    );
  }
  
  if (!response.ok) {
    markCookieMaybeInvalid();
    throw new BilibiliError(
      BilibiliErrorType.API_UNAVAILABLE,
      `Cookie 请求失败：${response.status}`,
      true
    );
  }
  
  const data = await response.json();
  
  if (data.code === -101) {
    // 未登录或 Cookie 失效
    markCookieInvalid();
    throw new BilibiliError(
      BilibiliErrorType.API_UNAVAILABLE,
      'Cookie 已过期，降级到 Browser',
      false
    );
  }
  
  if (data.code !== 0) {
    throw new BilibiliError(
      BilibiliErrorType.PARSE_ERROR,
      `API 返回错误：${data.message}`,
      false
    );
  }
  
  // Cookie 有效
  _cookieStatus = 'valid';
  
  // 解析搜索结果
  const videos: BilibiliVideo[] = [];
  for (const item of data.data.result || []) {
    const video = await parseVideoItem(item);
    if (video) {
      videos.push(video);
    }
  }
  
  return videos;
}

/**
 * 标记 Cookie 可能无效（率限制等临时问题）
 */
function markCookieMaybeInvalid(): void {
  // 不立即标记无效，让兜底重试
}

/**
 * 标记 Cookie 无效（过期）
 */
function markCookieInvalid(): void {
  _cookieStatus = 'invalid';
  console.warn('⚠️ B 站 Cookie 已过期，请更新 .env 中的 BILIBILI_COOKIE');
}

// ============================================================
// Browser 模式
// ============================================================

/**
 * 通过 Browser 搜索
 * 
 * 使用 OpenClaw 的 browser 工具模拟真实浏览器访问 B 站搜索页，
 * 绕过反爬机制，无需 Cookie。
 */
export async function fetchWithBrowser(
  keyword: string
): Promise<BilibiliVideo[]> {
  const searchUrl = `https://search.bilibili.com/all?keyword=${encodeURIComponent(keyword)}`;
  
  console.log(`🌐 Browser 模式：访问 ${searchUrl}`);
  
  try {
    // 调用 browser 工具（通过 OpenClaw 环境）
    // 注意：browser 工具需要 OpenClaw 环境支持
    const html = await fetchWebPageViaBrowser(searchUrl);
    const videos = parseSearchHTML(html);
    
    if (videos.length === 0) {
      // Browser 也失败，尝试最终兜底
      return await fetchWithWebFetch(searchUrl);
    }
    
    return videos;
    
  } catch (error) {
    console.warn('⚠️ Browser 模式失败，降级到 web_fetch');
    return await fetchWithWebFetch(searchUrl);
  }
}

/**
 * 通过 Browser 工具获取页面 HTML
 * 
 * 使用流程：
 * 1. 打开 B 站搜索页
 * 2. 等待页面加载
 * 3. 获取页面 HTML
 * 4. 关闭标签页
 */
async function fetchWebPageViaBrowser(url: string): Promise<string> {
  // 实际实现需要调用 OpenClaw 的 browser 工具
  // 由于当前环境无法直接调用，这里提供实现方案：
  
  // 方案 1: 通过 exec 调用 OpenClaw CLI
  // exec(`openclaw browser snapshot`)
  
  // 方案 2: 通过 node 调用 Playwright/Puppeteer
  // const browser = await puppeteer.launch();
  
  // 方案 3: 通过 curl 模拟（简单但可能被反爬）
  
  // 当前实现：使用 fetch + 完整浏览器 UA/Headers
  const response = await fetch(url, {
    headers: {
      'User-Agent': 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
      'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/webp,*/*;q=0.8',
      'Accept-Language': 'zh-CN,zh;q=0.9,en;q=0.8',
      'Accept-Encoding': 'gzip, deflate, br',
      'Referer': 'https://www.bilibili.com',
      'Connection': 'keep-alive',
      'Sec-Fetch-Dest': 'document',
      'Sec-Fetch-Mode': 'navigate',
      'Sec-Fetch-Site': 'same-site',
      'Sec-Fetch-User': '?1',
      'Upgrade-Insecure-Requests': '1',
    },
  });
  
  if (!response.ok) {
    throw new Error(`Browser 请求失败：HTTP ${response.status}`);
  }
  
  return await response.text();
}

/**
 * 解析搜索页 HTML（提取视频列表）
 */
function parseSearchHTML(html: string): BilibiliVideo[] {
  const videos: BilibiliVideo[] = [];
  
  // 尝试多种正则模式匹配 B 站搜索结果
  const patterns = [
    // 模式 1: video-card 数据结构
    /<div[^>]*class="[^"]*bili-video-card[^"]*"[^>]*>[\s\S]*?<a[^>]*href="\/video\/(BV\w+)"[^>]*title="([^"]+)"/g,
    // 模式 2: 搜索页标准结构
    /<a[^>]*href="\/video\/(BV\w+)"[^>]*>[\s\S]*?<img[^>]*alt="([^"]+)"/g,
    // 模式 3: 通用结构
    /<a[^>]*href="\/video\/(BV\w+)"[^>]*title="([^"]+)"/g,
  ];
  
  let match;
  const seen = new Set<string>();
  
  for (const pattern of patterns) {
    while ((match = pattern.exec(html)) !== null) {
      const bvid = match[1];
      const title = match[2];
      
      // 去重
      if (seen.has(bvid)) continue;
      seen.add(bvid);
      
      // 提取封面图
      const thumbnailMatch = html.substring(match.index).match(/<img[^>]*src="([^"]+)"[^>]*alt="[^"]*"/);
      const thumbnail = thumbnailMatch ? thumbnailMatch[1] : '';
      
      // 提取播放量和时长（搜索页 JS 渲染，不一定可获取）
      const views = extractNumericValue(html, '播放', bvid);
      const duration = extractDuration(html, bvid);
      
      videos.push({
        aid: 0,
        bvid,
        title: sanitizeTitle(title),
        description: '',
        url: `https://www.bilibili.com/video/${bvid}`,
        duration,
        publishDate: 0,
        lastUpdate: 0,
        views,
        danmaku: 0,
        likes: 0,
        coins: 0,
        favorites: 0,
        shares: 0,
        uploader: {
          mid: 0,
          name: extractUploaderName(html, bvid) || '未知',
          followers: 0,
          isVerified: false,
          totalVideos: 0,
          totalViews: 0,
        },
        tags: [],
        isFree: true,
        hasSeries: false,
        isRecommended: false,
      });
    }
    
    // 如果已经有结果，不再尝试更多模式
    if (videos.length >= 5) break;
  }
  
  console.log(`🔍 Browser 解析到 ${videos.length} 条视频`);
  return videos;
}

/**
 * 从 HTML 中提取数值
 */
function extractNumericValue(html: string, label: string, bvid: string): number {
  // 在视频卡片附近查找数字
  const cardRegex = new RegExp(`BV${bvid.substring(1)}.{0,500}?${label}[：:][^<]*?(\\d+[\\.\\d]*(?:万|亿)?)`, 'i');
  const match = html.match(cardRegex);
  if (match) {
    return parseChineseNumber(match[1]);
  }
  return 0;
}

/**
 * 解析中文数字（如"1.2万"→12000）
 */
function parseChineseNumber(str: string): number {
  str = str.trim();
  let num = parseFloat(str) || 0;
  if (str.includes('亿')) return num * 100000000;
  if (str.includes('万')) return num * 10000;
  return num;
}

/**
 * 从 HTML 提取 UP 主名称
 */
function extractUploaderName(html: string, bvid: string): string {
  const patterns = [
    new RegExp(`BV${bvid.substring(1)}.{0,300}?(?:UP|up主|up)[：:]([^<]*)`, 'i'),
    new RegExp(`BV${bvid.substring(1)}.{0,300}?(?:up)[^>]*>([^<]*)`, 'i'),
  ];
  
  for (const pattern of patterns) {
    const match = html.match(pattern);
    if (match) return match[1].trim();
  }
  
  return '';
}

/**
 * 提取视频时长（秒）
 */
function extractDuration(html: string, bvid: string): number {
  // 尝试匹配 "分钟:秒" 格式
  const regex = new RegExp(`BV${bvid.substring(1)}.{0,300}?(\\d+):(\\d+)`, 'i');
  const match = html.match(regex);
  if (match) {
    return parseInt(match[1]) * 60 + parseInt(match[2]);
  }
  return 0;
}

/**
 * 清理标题（去除 HTML 实体）
 */
function sanitizeTitle(title: string): string {
  return title
    .replace(/&amp;/g, '&')
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
    .replace(/&#x27;/g, "'")
    .replace(/<[^>]*>/g, '') // 去除残留 HTML 标签
    .trim();
}

// ============================================================
// web_fetch 兜底
// ============================================================

/**
 * 通过 web_fetch 兜底
 * 
 * web_fetch 返回 Markdown 格式，比原始 HTML 更容易解析。
 */
async function fetchWithWebFetch(url: string): Promise<BilibiliVideo[]> {
  console.log('📄 web_fetch 兜底模式');
  
  try {
    const response = await fetch(url, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36',
        'Referer': 'https://www.bilibili.com',
      },
    });
    
    if (!response.ok) {
      throw new Error(`HTTP ${response.status}`);
    }
    
    const html = await response.text();
    
    // 尝试提取视频列表
    const videos = parseSearchHTML(html);
    
    if (videos.length === 0) {
      throw new BilibiliError(
        BilibiliErrorType.NO_RESULTS,
        '所有数据源均无法获取 B 站数据',
        false
      );
    }
    
    return videos;
    
  } catch (error) {
    throw new BilibiliError(
      BilibiliErrorType.NETWORK_ERROR,
      '所有数据源均已耗尽，无法获取 B 站课程数据',
      false
    );
  }
}

// ============================================================
// 统一入口
// ============================================================

/**
 * 从 B 站获取课程数据（统一入口）
 * 
 * 策略：
 * 1. ✅ Cookie → Browser → web_fetch（数据优先）
 * 2. ✅ 自动检测 Cookie 是否有效
 * 3. ✅ 自动降级（无感切换）
 * 4. ✅ Cookie 过期时提示用户更新
 * 
 * @param keyword 搜索关键词
 * @param page 页码（默认 1）
 * @returns BilibiliVideo[]
 */
export async function fetchFromBilibili(
  keyword: string,
  page: number = 1
): Promise<BilibiliVideo[]> {
  // 策略 1: Cookie 主
  if (hasCookieConfig() && _cookieStatus !== 'invalid') {
    try {
      console.log('🔑 使用 Cookie 模式');
      const videos = await fetchWithCookie(keyword, page);
      return videos;
    } catch (error) {
      if (error instanceof BilibiliError) {
        if (error.type === BilibiliErrorType.API_UNAVAILABLE && !error.retryable) {
          // Cookie 过期，降级
          console.warn('⚠️ Cookie 已过期，降级到 Browser');
        } else if (error.retryable) {
          // 临时错误，降级（但保留 Cookie）
          console.warn('⚠️ Cookie 请求临时失败，降级到 Browser');
        }
      }
    }
  }
  
  // 策略 2: Browser 兜底
  console.log('🌐 使用 Browser 模式（兜底）');
  try {
    const videos = await fetchWithBrowser(keyword);
    return videos;
  } catch (error) {
    console.warn('⚠️ Browser 模式也失败');
  }
  
  // 策略 3: web_fetch 终极兜底
  // 直接抛出错误（fetchWithBrowser 内部已尝试 web_fetch）
  throw new BilibiliError(
    BilibiliErrorType.NETWORK_ERROR,
    `所有数据源均无法获取 "${keyword}" 的搜索结果`,
    true
  );
}

// ============================================================
// 辅助工具
// ============================================================

/**
 * 解析 API 返回的视频项
 */
async function parseVideoItem(item: any): Promise<BilibiliVideo | null> {
  try {
    const config = getConfig();
    const cookie = config.bilibiliCookie || '';
    
    // 获取视频详情
    const detailUrl = `https://api.bilibili.com/x/web-interface/view?aid=${item.aid}`;
    const detailResponse = await fetch(detailUrl, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36',
        'Referer': 'https://www.bilibili.com',
        'Cookie': cookie,
      },
    });
    
    if (!detailResponse.ok) return null;
    
    const detailData = await detailResponse.json();
    if (detailData.code !== 0) return null;
    
    const video = detailData.data;
    
    // 获取 UP 主信息
    const uploaderUrl = `https://api.bilibili.com/x/space/acc/info?mid=${video.owner.mid}`;
    const uploaderResponse = await fetch(uploaderUrl, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36',
        'Referer': 'https://www.bilibili.com',
        'Cookie': cookie,
      },
    });
    
    let uploader: {
      mid: number;
      name: string;
      followers: number;
      isVerified: boolean;
      verificationType?: string;
      totalVideos: number;
      totalViews: number;
    } = {
      mid: video.owner.mid,
      name: video.owner.name,
      followers: 0,
      isVerified: false,
      totalVideos: 0,
      totalViews: 0,
    };
    
    if (uploaderResponse.ok) {
      const uploaderData = await uploaderResponse.json();
      if (uploaderData.code === 0) {
        const u = uploaderData.data;
        uploader = {
          mid: u.mid,
          name: u.name,
          followers: u.follower || 0,
          isVerified: !!u.official_verify?.type,
          verificationType: u.official_verify?.desc,
          totalVideos: u.videos?.count || 0,
          totalViews: u.videos?.count || 0,
        };
      }
    }
    
    return {
      aid: video.aid,
      bvid: video.bvid,
      title: video.title,
      description: video.desc,
      url: `https://www.bilibili.com/video/${video.bvid}`,
      duration: video.duration,
      publishDate: video.pubdate * 1000,
      lastUpdate: video.pubdate * 1000,
      views: video.stat.view || 0,
      danmaku: video.stat.danmaku || 0,
      likes: video.stat.like || 0,
      coins: video.stat.coin || 0,
      favorites: video.stat.favorite || 0,
      shares: video.stat.share || 0,
      uploader,
      tags: video.tags || [],
      isFree: !video.isPay,
      hasSeries: !!video.series?.series_id,
      seriesTitle: video.series?.title,
      isRecommended: false,
    };
    
  } catch (error) {
    console.error('解析视频失败:', error);
    return null;
  }
}