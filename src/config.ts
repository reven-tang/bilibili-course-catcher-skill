/**
 * B 站课程抓取技能 - 配置管理
 * 
 * 管理 API Key、Cookie、权重配置等
 */

/**
 * 技能配置接口
 */
export interface SkillConfig {
  // B 站 Cookie（用于需要登录的接口）
  bilibiliCookie?: string;
  
  // 请求配置
  requestTimeout: number;        // 请求超时（毫秒）
  maxRetries: number;            // 最大重试次数
  retryDelay: number;            // 重试延迟基数（毫秒）
  
  // 频率限制配置
  rateLimit: {
    maxRequests: number;         // 最大请求数
    windowMs: number;            // 时间窗口（毫秒）
  };
  
  // 评分权重
  weights: {
    free: number;
    views: number;
    uploader: number;
    content: number;
    reviews: number;
    favorites: number;
    recommendation: number;
  };
  
  // 归一化标准
  normalization: {
    views: { min: number; max: number };
    favorites: { min: number; max: number };
    coins: { min: number; max: number };
    followers: { min: number; max: number };
    likes: { min: number; max: number };
    danmaku: { min: number; max: number };
  };
  
  // 缓存配置
  cache: {
    enabled: boolean;
    ttlMs: number;               // 缓存有效期（毫秒）
    maxSize: number;             // 最大缓存条目数
  };
  
  // 日志配置
  logging: {
    level: 'debug' | 'info' | 'warn' | 'error';
    enableConsole: boolean;
  };
}

/**
 * 默认配置
 */
export const defaultConfig: SkillConfig = {
  bilibiliCookie: undefined,
  
  requestTimeout: 30000,         // 30 秒
  maxRetries: 3,
  retryDelay: 1000,              // 1 秒基数
  
  rateLimit: {
    maxRequests: 50,             // 50 次/分钟
    windowMs: 60000,             // 1 分钟
  },
  
  weights: {
    free: 0.10,
    views: 0.18,
    uploader: 0.18,
    content: 0.27,
    reviews: 0.17,
    favorites: 0.05,
    recommendation: 0.05,
  },
  
  normalization: {
    views: { min: 0, max: 10000000 },
    favorites: { min: 0, max: 500000 },
    coins: { min: 0, max: 300000 },
    followers: { min: 0, max: 5000000 },
    likes: { min: 0, max: 500000 },
    danmaku: { min: 0, max: 100000 },
  },
  
  cache: {
    enabled: false,              // TODO: 实现缓存后启用
    ttlMs: 300000,               // 5 分钟
    maxSize: 100,
  },
  
  logging: {
    level: 'info',
    enableConsole: true,
  },
};

/**
 * 从环境变量加载配置
 */
export function loadConfigFromEnv(): Partial<SkillConfig> {
  const config: Partial<SkillConfig> = {};
  
  // B 站 Cookie
  if (process.env.BILIBILI_COOKIE) {
    config.bilibiliCookie = process.env.BILIBILI_COOKIE;
  }
  
  // 请求超时
  if (process.env.REQUEST_TIMEOUT) {
    config.requestTimeout = parseInt(process.env.REQUEST_TIMEOUT, 10);
  }
  
  // 最大重试次数
  if (process.env.MAX_RETRIES) {
    config.maxRetries = parseInt(process.env.MAX_RETRIES, 10);
  }
  
  // 日志级别
  if (process.env.LOG_LEVEL) {
    const level = process.env.LOG_LEVEL as SkillConfig['logging']['level'];
    if (['debug', 'info', 'warn', 'error'].includes(level)) {
      config.logging = { ...defaultConfig.logging, level };
    }
  }
  
  return config;
}

/**
 * 合并配置
 */
export function mergeConfig(
  base: SkillConfig,
  overrides: Partial<SkillConfig>
): SkillConfig {
  return {
    ...base,
    ...overrides,
    rateLimit: { ...base.rateLimit, ...overrides.rateLimit },
    weights: { ...base.weights, ...overrides.weights },
    normalization: { ...base.normalization, ...overrides.normalization },
    cache: { ...base.cache, ...overrides.cache },
    logging: { ...base.logging, ...overrides.logging },
  };
}

/**
 * 验证配置
 */
export function validateConfig(config: SkillConfig): boolean {
  // 验证权重总和
  const weightSum = Object.values(config.weights).reduce((sum, w) => sum + w, 0);
  if (Math.abs(weightSum - 1.0) > 0.001) {
    console.error(`配置错误：权重总和必须为 1.0，当前为${weightSum}`);
    return false;
  }
  
  // 验证重试次数
  if (config.maxRetries < 0 || config.maxRetries > 10) {
    console.error('配置错误：maxRetries 必须在 0-10 之间');
    return false;
  }
  
  // 验证缓存大小
  if (config.cache.maxSize < 0 || config.cache.maxSize > 10000) {
    console.error('配置错误：cache.maxSize 必须在 0-10000 之间');
    return false;
  }
  
  return true;
}

/**
 * 获取当前配置（单例）
 */
let currentConfig: SkillConfig | null = null;

export function getConfig(): SkillConfig {
  if (!currentConfig) {
    const envConfig = loadConfigFromEnv();
    currentConfig = mergeConfig(defaultConfig, envConfig);
    
    if (!validateConfig(currentConfig)) {
      console.warn('配置验证失败，使用默认配置');
      currentConfig = defaultConfig;
    }
  }
  
  return currentConfig;
}

/**
 * 更新配置
 */
export function updateConfig(updates: Partial<SkillConfig>): void {
  const config = getConfig();
  const newConfig = mergeConfig(config, updates);
  
  if (!validateConfig(newConfig)) {
    throw new Error('配置验证失败');
  }
  
  currentConfig = newConfig;
  console.log('✅ 配置已更新');
}

/**
 * 重置配置为默认值
 */
export function resetConfig(): void {
  currentConfig = null;
  console.log('✅ 配置已重置为默认值');
}
