/**
 * 问答模块 - 交互式收集学生需求
 * 
 * 特性：
 * - 7 个问题，全部带选项
 * - 单选/是非题两种题型
 * - 难度级别附带解释说明
 * - 动态调整选项
 */

/**
 * 用户偏好接口
 */
export interface UserPreferences {
  grade: GradeLevel;
  category: CategoryType;
  level: DifficultyLevel;
  preferences: AdditionalPreferences;
}

export type GradeLevel = '小学' | '初中' | '高中' | '大学' | '其他';

export type CategoryType = 
  | '数学' | '英语' | '物理' | '化学' 
  | '生物' | '历史' | '地理' | '编程' 
  | '艺术' | '音乐' | '体育' | '其他';

export type DifficultyLevel = '入门' | '标准' | '拔高' | '提优';

export type UpdateRecency = '30days' | '180days' | '365days' | 'any';

export interface AdditionalPreferences {
  requireRecent?: boolean;        // 要求最近更新（30 天内）[已废弃，保留兼容]
  recency?: UpdateRecency;        // 更新时间要求（新）
  requireVerifiedUploader?: boolean; // 要求 UP 主认证
  preferFree?: boolean;           // 优先免费
  maxDuration?: number;           // 最大视频时长（分钟）
}

/**
 * 问题定义
 */
interface Question {
  id: keyof UserPreferences | 'recent_update' | 'verified_uploader' | 'free_only' | 'duration';
  question: string;
  type: 'single_choice' | 'yes_no';
  options?: string[];
  description?: Record<string, string>;
  default?: string;
  required: boolean;
}

/**
 * 问题列表（带选项）
 */
const questions: Question[] = [
  {
    id: 'grade',
    question: '请问学生目前是哪个年级？',
    type: 'single_choice',
    options: ['小学', '初中', '高中', '大学', '其他'],
    required: true,
  },
  {
    id: 'category',
    question: '需要哪类课程？',
    type: 'single_choice',
    options: ['数学', '英语', '物理', '化学', '生物', '历史', '地理', '编程', '艺术', '音乐', '体育', '其他'],
    required: true,
  },
  {
    id: 'level',
    question: '课程难度级别？',
    type: 'single_choice',
    options: ['入门', '标准', '拔高', '提优'],
    required: true,
    description: {
      '入门': '零基础或刚开始学习',
      '标准': '有一定基础，系统学习',
      '拔高': '基础扎实，拓展提升',
      '提优': '冲刺高分，竞赛级别',
    },
  },
  {
    id: 'recent_update',
    question: '对课程更新时间有要求吗？',
    type: 'single_choice',
    options: [
      '最新（30 天内）',
      '近半年（180 天内）',
      '近一年（365 天内）',
      '否（经典课程也可以）'
    ],
    default: '否（经典课程也可以）',
    required: false,
    description: {
      '最新（30 天内）': '内容最新，适合跟进最新考纲',
      '近半年（180 天内）': '内容较新，兼顾质量和时效',
      '近一年（365 天内）': '内容可靠，选择范围更广',
      '否（经典课程也可以）': '经典永流传，质量优先',
    },
  },
  {
    id: 'verified_uploader',
    question: '是否优先选择认证 UP 主的课程？',
    type: 'yes_no',
    default: 'yes',
    required: false,
  },
  {
    id: 'free_only',
    question: '是否只看免费课程？',
    type: 'yes_no',
    default: 'no',
    required: false,
  },
  {
    id: 'duration',
    question: '对视频时长有偏好吗？',
    type: 'single_choice',
    options: ['无偏好', '短视频（<10 分钟）', '中等（10-30 分钟）', '长视频（>30 分钟）'],
    default: '无偏好',
    required: false,
  },
];

/**
 * 运行完整的问答流程
 */
export async function runQuestionnaire(): Promise<UserPreferences> {
  const answers: Record<string, any> = {};
  
  console.log('🎯 开始收集学习需求...\n');
  
  for (const q of questions) {
    const answer = await askQuestion(q);
    answers[q.id] = answer;
    
    // 动态调整：如果选择小学，不显示"提优"选项
    if (q.id === 'grade' && answer === '小学') {
      const levelQuestion = questions.find(q => q.id === 'level');
      if (levelQuestion && levelQuestion.options) {
        levelQuestion.options = levelQuestion.options.filter(opt => opt !== '提优');
      }
    }
  }
  
  // 转换为 UserPreferences 对象
  return transformAnswersToPreferences(answers);
}

/**
 * 询问单个问题
 */
async function askQuestion(question: Question): Promise<any> {
  // 构建问题文本
  let prompt = `\n**${question.question}**\n`;
  
  if (question.type === 'single_choice' && question.options) {
    // 单选格式
    question.options.forEach((opt, index) => {
      const label = String.fromCharCode(65 + index); // A, B, C, D...
      const desc = question.description?.[opt] || '';
      prompt += `${label}. ${opt}${desc ? `（${desc}）` : ''}\n`;
    });
    prompt += '\n请回复选项字母（A/B/C/D...）或选项内容：';
    
    // 模拟用户输入（实际使用时通过消息交互）
    const answer = await simulateUserInput(prompt, question.options!);
    return answer;
    
  } else if (question.type === 'yes_no') {
    // 是非题格式
    prompt += `A. 是  B. 否\n\n请回复选项字母（A/B）或"是/否"：`;
    
    const answer = await simulateUserInput(prompt, ['是', '否', 'yes', 'no']);
    return answer === '是' || answer === 'yes' || answer === 'A';
  }
  
  return null;
}

/**
 * 模拟用户输入（实际使用时替换为真实交互）
 */
async function simulateUserInput(prompt: string, options: string[]): Promise<string> {
  // 在实际技能中，这里会通过消息系统等待用户回复
  // 现在返回第一个选项作为默认值（用于测试）
  console.log(prompt);
  console.log(`[等待用户输入...]`);
  
  // TODO: 实际实现时，这里需要等待用户消息
  // 暂时返回第一个选项
  return options[0];
}

/**
 * 将答案转换为 UserPreferences 对象
 */
function transformAnswersToPreferences(answers: Record<string, any>): UserPreferences {
  const preferences: UserPreferences = {
    grade: answers.grade as GradeLevel,
    category: answers.category as CategoryType,
    level: answers.level as DifficultyLevel,
    preferences: {},
  };
  
  // 处理更新时间要求（新）
  if (answers.recent_update) {
    const recencyMap: Record<string, UpdateRecency> = {
      '最新（30 天内）': '30days',
      '近半年（180 天内）': '180days',
      '近一年（365 天内）': '365days',
      '否（经典课程也可以）': 'any',
    };
    preferences.preferences.recency = recencyMap[answers.recent_update] || 'any';
  }
  
  // 兼容旧字段（已废弃）
  if (answers.recent_update === '最新（30 天内）') {
    preferences.preferences.requireRecent = true;
  }
  
  // 处理 UP 主认证
  if (answers.verified_uploader) {
    preferences.preferences.requireVerifiedUploader = answers.verified_uploader === true || answers.verified_uploader === '是';
  }
  
  // 处理免费偏好
  if (answers.free_only) {
    preferences.preferences.preferFree = answers.free_only === true || answers.free_only === '是';
  }
  
  // 处理时长偏好
  if (answers.duration && answers.duration !== '无偏好') {
    if (answers.duration.includes('<10')) {
      preferences.preferences.maxDuration = 10;
    } else if (answers.duration.includes('10-30')) {
      preferences.preferences.maxDuration = 30;
    }
    // 长视频不设上限
  }
  
  return preferences;
}

/**
 * 从用户消息中提取参数（快速模式）
 */
export function extractPreferencesFromMessage(message: string): Partial<UserPreferences> {
  const preferences: Partial<UserPreferences> = {};
  
  // 年级匹配
  const gradeMatch = message.match(/(小学 | 初中 | 高中 | 大学)/);
  if (gradeMatch) {
    preferences.grade = gradeMatch[0] as GradeLevel;
  }
  
  // 类别匹配
  const categoryMatch = message.match(/(数学 | 英语 | 物理 | 化学 | 生物 | 历史 | 地理 | 编程 | 艺术 | 音乐 | 体育)/);
  if (categoryMatch) {
    preferences.category = categoryMatch[0] as CategoryType;
  }
  
  // 级别匹配
  const levelMatch = message.match(/(入门 | 标准 | 拔高 | 提优 | 基础 | 提高 | 进阶 | 竞赛)/);
  if (levelMatch) {
    const levelText = levelMatch[0];
    if (levelText === '基础' || levelText === '入门') {
      preferences.level = '入门';
    } else if (levelText === '提高' || levelText === '标准') {
      preferences.level = '标准';
    } else if (levelText === '进阶' || levelText === '拔高') {
      preferences.level = '拔高';
    } else if (levelText === '竞赛' || levelText === '提优') {
      preferences.level = '提优';
    }
  }
  
  return preferences;
}
