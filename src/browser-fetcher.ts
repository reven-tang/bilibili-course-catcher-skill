/**
 * Browser 工具模块
 * 
 * 使用 OpenClaw 的 browser 工具访问 B 站，绕过反爬机制。
 * 这是 Cookie 模式不可用时的首选降级方案。
 * 
 * 架构：
 *   browser.open → 搜索页
 *   browser.snapshot → 获取页面内容
 *   browser.act → 翻页/筛选
 *   browser.close → 清理
 * 
 * 优势：
 * - 模拟真实用户，不被反爬
 * - 无需 Cookie
 * - 可获取 JS 渲染内容
 * - 可滚动、翻页、点击筛选
 * 
 * 劣势：
 * - 速度较慢（3-10 秒）
 * - 需要 OpenClaw browser 工具可用
 * - 过多调用可能被限流
 */

import { BilibiliVideo } from './bilibili-api';

/**
 * Browser 搜索配置
 */
export interface BrowserSearchConfig {
  timeoutMs: number;       // 页面加载超时
  maxRetries: number;      // 最大重试次数
  scrollDelayMs: number;   // 滚动延迟
  maxScrolls: number;      // 最大滚动次数
  headless: boolean;       // 是否无头模式
}

/**
 * 默认配置
 */
const DEFAULT_CONFIG: BrowserSearchConfig = {
  timeoutMs: 15000,
  maxRetries: 2,
  scrollDelayMs: 500,
  maxScrolls: 3,
  headless: true,
};

/**
 * Browser 搜索结果
 */
export interface BrowserSearchResult {
  bvid: string;
  title: string;
  url: string;
  upName?: string;
  views?: number;
  duration?: string;
  thumbnailUrl?: string;
}

/**
 * 通过 Browser 搜索 B 站课程
 * 
 * 流程：
 * 1. 打开 B 站搜索页
 * 2. 等待搜索结果加载
 * 3. 滚动加载更多（先截后滚）
 * 4. 截图获取页面内容
 * 5. 解析结果
 * 6. 关闭标签页
 * 
 * @param keyword 搜索关键词
 * @param config 可选配置
 * @returns BrowserSearchResult[]
 */
export async function browserSearch(
  keyword: string,
  config: Partial<BrowserSearchConfig> = {}
): Promise<BrowserSearchResult[]> {
  const cfg = { ...DEFAULT_CONFIG, ...config };
  const searchUrl = `https://search.bilibili.com/all?keyword=${encodeURIComponent(keyword)}`;
  
  console.log(`🌐 Browser 搜索：${keyword}`);
  
  try {
    // 步骤 1: 打开搜索页
    // TODO: 实际调用 browser 工具
    // const page = await browser.open(searchUrl, { timeout: cfg.timeoutMs });
    console.log('  1/3 打开搜索页...');
    
    // 步骤 2: 等待搜索结果加载
    // await page.waitForSelector('.video-list', { timeout: cfg.timeoutMs });
    console.log('  2/3 等待结果加载...');
    
    // 步骤 3: 滚动加载更多
    // for (let i = 0; i < cfg.maxScrolls; i++) {
    //   await page.scrollDown({ delay: cfg.scrollDelayMs });
    // }
    console.log(`  3/3 滚动 ${cfg.maxScrolls} 次...`);
    
    // 步骤 4: 获取页面快照
    // const snapshot = await page.snapshot();
    console.log('  📸 获取页面快照...');
    
    // 步骤 5: 解析结果
    // const results = parseSnapshotResults(snapshot);
    
    // 步骤 6: 关闭标签页
    // await page.close();
    
    // 当前无法直接调用 browser 工具，返回提示
    console.log('⚠️ Browser 工具不可用，请确认 OpenClaw 环境已启用');
    
    return [];
    
  } catch (error) {
    console.error('❌ Browser 搜索失败:', error);
    throw error;
  }
}

/**
 * Browser 搜索（带优先缓存键，与 api-fetcher 统一缓存）
 * 
 * @param keyword 搜索关键词
 * @returns BrowserSearchResult[]
 */
export async function browserSearchForFetcher(
  keyword: string
): Promise<BrowserSearchResult[]> {
  return browserSearch(keyword);
}

/**
 * 解析 Browser snapshot 结果
 * 
 * B 站搜索结果页面结构（2024-2025 年结构）：
 * 
 * <div class="video-list">
 *   <div class="video-item">
 *     <a href="//www.bilibili.com/video/BV1..." title="课程标题">
 *       <img src="thumbnail.jpg" />
 *     </a>
 *     <div class="info">
 *       <div class="title">课程标题</div>
 *       <div class="up-name">UP主名称</div>
 *       <div class="play-count">播放量</div>
 *       <div class="duration">时长</div>
 *     </div>
 *   </div>
 * </div>
 */
export function parseSnapshotResults(
  snapshot: any
): BrowserSearchResult[] {
  const results: BrowserSearchResult[] = [];
  
  // Browser snapshot 返回的是结构化数据
  // 需要根据实际 snapshot 格式解析
  // 这里提供解析逻辑框架
  
  if (!snapshot || !snapshot.children) {
    return results;
  }
  
  // 递归查找视频卡片元素
  function findVideoCards(node: any): any[] {
    const cards: any[] = [];
    
    if (!node || !node.children) return cards;
    
    for (const child of node.children) {
      // 检测视频卡片（根据实际 snapshot 结构调整）
      if (child.role === 'link' && child.href?.includes('/video/BV')) {
        cards.push(child);
      }
      
      // 递归
      if (child.children) {
        cards.push(...findVideoCards(child));
      }
    }
    
    return cards;
  }
  
  const cards = findVideoCards(snapshot);
  
  for (const card of cards) {
    // 从 href 提取 BV 号
    const bvidMatch = card.href?.match(/BV\w+/);
    if (!bvidMatch) continue;
    
    const bvid = bvidMatch[0];
    
    results.push({
      bvid,
      title: card.label || card.title || '',
      url: `https://www.bilibili.com/video/${bvid}`,
    });
  }
  
  return results;
}

/**
 * 获取搜索结果页快照
 * 
 * @param keyword 搜索关键词
 * @param page 页码
 * @returns 快照内容
 */
export async function getSearchSnapshot(
  keyword: string,
  page: number = 1
): Promise<any> {
  const searchUrl = `https://search.bilibili.com/all?keyword=${encodeURIComponent(keyword)}&page=${page}`;
  
  console.log(`🌐 Browser 访问：${searchUrl}`);
  
  // TODO: 调用 OpenClaw browser 工具
  // const browserStatus = await browser.doctor();
  // const snapshot = await browser.snapshot(searchUrl);
  // return snapshot;
  
  console.log('⚠️ Browser 工具暂不可用，返回空结果');
  return null;
}

/**
 * 诊断 Browser 工具状态
 */
export async function diagnoseBrowserTool(): Promise<{
  available: boolean;
  status: string;
  details: string[];
}> {
  console.log('🔍 诊断 Browser 工具状态...');
  
  const details: string[] = [];
  
  // TODO: 检查 browser 工具是否可用
  // const status = await browser.doctor();
  
  details.push('⚠️ Browser 工具状态检查需要 OpenClaw 环境支持');
  details.push('  请确认: OpenClaw gateway 运行中');
  details.push('  请确认: browser-automation 技能已安装');
  details.push('  请确认: Playwright/Puppeteer 已安装');
  
  return {
    available: false,
    status: 'unknown',
    details,
  };
}

/**
 * 标记 Browser 可否可用
 */
let _browserAvailable: boolean | null = null;

export function isBrowserAvailable(): boolean {
  return _browserAvailable === true;
}

export function setBrowserAvailable(available: boolean): void {
  _browserAvailable = available;
}

/**
 * 打开并搜索 B 站
 */
export async function browserSearchAndExtract(
  keyword: string
): Promise<BrowserSearchResult[]> {
  const searchUrl = `https://search.bilibili.com/all?keyword=${encodeURIComponent(keyword)}`;
  
  console.log(`🌐 通过 browser 访问：${searchUrl}`);
  
  try {
    // 1. 打开页面
    // await browser.open(searchUrl);
    // await browser.waitForSelector('.video-list', { timeout: 10000 });
    
    // 2. 滚动
    // await browser.scrollDown();
    
    // 3. 获取快照
    // const snapshot = await browser.snapshot();
    
    // 4. 解析
    // const results = parseSnapshotResults(snapshot);
    
    // 5. 关闭
    // await browser.close();
    
    return [];
    
  } catch (error) {
    console.error('Browser 搜索失败:', error);
    throw error;
  }
}