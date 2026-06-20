# 📚 Bilibili Course Catcher — B站课程智能推荐技能

> 从B站（bilibili）智能搜索并推荐优质学习课程，多轮交互收集需求，5维生产级评分筛选最佳课程

![Version](https://img.shields.io/badge/version-1.6-green)
![License](https://img.shields.io/badge/license-MIT-blue)
![Platform](https://img.shields.io/badge/platform-OpenClaw-orange)

---

## ✨ 功能亮点

- 🎯 **多轮交互** — 每轮只问1个问题，降低用户负担，4轮必问+2轮可选
- 📊 **5维生产级评分** — 内容质量30% + 用户口碑25% + 匹配度20% + UP主可信度15% + 时效性10%
- 🔗 **课程链接硬性要求** — 无链接课程直接排除，每门推荐必带BV链接
- 🧠 **智能匹配** — 年级→课程类别动态映射，语文额外支持作文/阅读理解专项
- 🚀 **快速触发** — 用户消息已包含年级/类别/级别时，自动提取参数跳过对应轮次

---

## 📋 问答流程

### 6轮交互（4轮必问 + 2轮必展示）

| 轮次 | 问题 | 说明 |
|------|------|------|
| 第1轮 | 年级？ | 小学(1-6年级)、初中(7-9年级)、高中(10-12年级)、大学、其他 |
| 第2轮 | 课程类别？ | **根据年级动态调整**（小学不显示理化生，初中加理化生） |
| 第3轮 | 难度级别？ | **根据类别动态调整**（语文额外支持作文专项/阅读理解专项） |
| 第4轮 | 更新时间？ | 最近半年、最近一年、不限 |
| 第5轮 | 认证UP主？ | 可选但必须展示，用户答"不限"才跳过 |
| 第6轮 | 视频时长？ | 可选但必须展示，短课<30min、中课30-60min、长课>60min |

### 年级→课程类别映射

| 年级 | 可选课程 | 说明 |
|------|---------|------|
| 小学 | 语文、数学、英语、编程、艺术、音乐、体育、其他 | 无理化生，语文是主科 |
| 初中 | 语文、数学、英语、物理、化学、生物、历史、地理、编程、体育、其他 | 初中开始理化生 |
| 高中 | +政治 | 高中加政治 |
| 大学 | 编程、数学、英语、物理、其他专业 | 以专业技能为主 |

### 难度级别说明

| 级别 | 说明 | 适用场景 |
|------|------|---------|
| 入门 | 零基础，从头开始 | 完全没接触过该学科 |
| 标准 | 课本同步，巩固基础 | 跟上学校进度 |
| 拔高 | 跳出课本，思维拓展/奥数启蒙 | 学有余力想拓展 |
| 提优 | 竞赛冲刺，深度训练 | 准备参加竞赛 |
| 作文专项 | 写作能力提升 | **仅语文可选** |
| 阅读理解专项 | 阅读理解技巧训练 | **仅语文可选** |

---

## 📊 5维评分系统

每门课程按5个维度加权评分，总分0-10：

```
总分 = 内容质量×0.30 + 用户口碑×0.25 + 匹配度×0.20 + UP主可信度×0.15 + 时效性×0.10
```

| 维度 | 权重 | 核心指标 |
|------|------|---------|
| 📚 内容质量 | 30% | 体系完整性、时长合理性、更新频率、配套资源 |
| 💬 用户口碑 | 25% | 点赞比、收藏率(收藏/播放)、弹幕互动 |
| 🎯 匹配度 | 20% | 年级匹配、难度匹配、类别匹配 |
| 👤 UP主可信度 | 15% | 教育认证、更新频率、专业度 |
| 🕐 时效性 | 10% | 课程版本标注时间 |

**准入规则**：无链接课程直接排除，不进入评分。

---

## 🚀 安装指南

### 前置条件

| 依赖 | 版本要求 | 说明 |
|------|---------|------|
| [OpenClaw](https://github.com/openclaw/openclaw) | v2.0+ | AI助手运行平台 |
| Node.js | v18+ | OpenClaw运行环境 |
| B站账号Cookie | **必需** | 用于直连B站API获取数据（主数据源） |

### 方式1：一键安装（推荐）

```bash
# 进入OpenClaw工作区
cd ~/.openclaw/workspace

# 克隆技能仓库
git clone https://github.com/你的用户名/bilibili-course-catcher.git skills/bilibili-course-catcher

# 配置B站Cookie（见下方配置说明）
cp skills/bilibili-course-catcher/.env.example skills/bilibili-course-catcher/.env
# 编辑 .env 填入你的B站Cookie

# 重启OpenClaw加载新技能
openclaw gateway restart
```

### 方式2：手动安装

```bash
# 1. 创建技能目录
mkdir -p ~/.openclaw/workspace/skills/bilibili-course-catcher

# 2. 下载SKILL.md到技能目录
curl -o ~/.openclaw/workspace/skills/bilibili-course-catcher/SKILL.md \
  https://raw.githubusercontent.com/你的用户名/bilibili-course-catcher/main/SKILL.md

# 3. 创建.env文件配置B站Cookie
echo "BILIBILI_COOKIE=你的Cookie字符串" > ~/.openclaw/workspace/skills/bilibili-course-catcher/.env

# 4. 重启OpenClaw
openclaw gateway restart
```

### 方式3：OpenClaw CLI安装（未来支持）

```bash
openclaw skills install bilibili-course-catcher
# 安装后需手动配置B站Cookie
```

---

## ⚙️ 配置说明

### B站Cookie配置（⚠️ 必需）

本技能**主要依赖B站Cookie直连API获取数据**，搜索API仅作为极端情况的兜底方案。

#### 获取B站Cookie步骤

1. **登录B站**（https://www.bilibili.com）
2. **打开开发者工具**（F12 或右键→检查）
3. **切换到Network/网络标签**
4. **刷新页面**，找到任意请求
5. **复制Cookie**：在请求头中找到 `Cookie:` 字段，复制整个值
6. **填入.env文件**：

```bash
# 编辑技能目录下的.env文件
BILIBILI_COOKIE=SESSDATA=xxx; bili_jct=xxx; buvid3=xxx; ...
```

#### Cookie配置示例

```bash
# ~/.openclaw/workspace/skills/bilibili-course-catcher/.env
BILIBILI_COOKIE=SESSDATA=abc123; bili_jct=def456; buvid3=ghi789
```

#### Cookie有效期

- Cookie通常有效期为**1-3个月**
- 过期后技能会自动降级到Browser模式（较慢）
- 建议定期更新Cookie

### 搜索API配置（可选兜底）

当B站Cookie失效或API不可用时，技能会自动降级使用搜索API：

#### Tavily（推荐作为兜底）

```yaml
# ~/.openclaw/config.yaml
plugins:
  entries:
    tavily:
      config:
        apiKey: "tvly-你的API密钥"
```

获取API密钥：[https://tavily.com](https://tavily.com)

### 配置优先级

| 优先级 | 数据源 | 速度 | 数据完整度 |
|--------|--------|------|-----------|
| 1 | **B站Cookie**（主） | <1秒 | ⭐⭐⭐⭐⭐ |
| 2 | Browser模拟（兜底） | 3-10秒 | ⭐⭐⭐⭐ |
| 3 | 搜索API（极端兜底） | 5-15秒 | ⭐⭐⭐ |

### OpenClaw配置确认

安装后可通过以下命令确认技能配置：

```bash
# 查看技能是否加载
openclaw skills list | grep bilibili-course-catcher

# 检查Cookie是否配置
cat ~/.openclaw/workspace/skills/bilibili-course-catcher/.env | grep BILIBILI_COOKIE

# 测试搜索（触发技能）
# 发送消息：帮我找B站课程
```

---

## 🎮 使用示例

### 示例1：完整问答流程

```
你：帮我找 B 站课程

萨莉：请问学生目前是哪个年级？
      A. 小学（1-6年级）  B. 初中（7-9年级）  C. 高中（10-12年级）  D. 大学  E. 其他

你：小学

萨莉：需要哪类课程？（小学阶段以语数英为主）
      A. 语文  B. 数学  C. 英语  D. 编程  E. 艺术  F. 音乐  G. 体育  H. 其他

你：语文

萨莉：课程难度级别？
      A. 入门（零基础）  B. 标准（课本同步）  C. 拔高（思维拓展）  D. 提优（竞赛冲刺）
      E. 作文专项  F. 阅读理解专项

你：作文专项

萨莉：更新时间偏好？
      A. 最近半年  B. 最近一年  C. 不限

你：最近一年

萨莉：是否偏好认证UP主？（认证UP主经过B站官方审核，教学内容更有保障）
      A. 是，只看认证UP主  B. 不限

你：不限

萨莉：视频时长偏好？
      A. 短课（<30min）  B. 中课（30-60min）  C. 长课（>60min）  D. 不限

你：不限

萨莉：🎯 小学 · 语文 · 作文专项 · 最近一年 · 不限UP主 · 不限时长
      正在搜索...

      ## 📚 为您找到 5 门优质课程

      | 排名 | 课程名称 | UP主 | 课程链接 | 综合评分 |
      |------|---------|------|---------|---------|
      | 🥇 | ... | ... | https://www.bilibili.com/video/BVxxx | ⭐⭐⭐⭐⭐ 9.3 |
```

### 示例2：快速触发

```
你：推荐初中物理入门课程

萨莉：🎯 已提取参数：初中 · 物理 · 入门
      [跳过已提取的轮次，补充未提取的轮次]
      ...
```

### 示例3：场景触发

```
你：孩子四年级数学跟不上

萨莉：[自动识别为小学+数学+标准需求]
      🎯 已提取参数：小学四年级 · 数学 · 标准
      ...
```

---

## 📁 文件结构

```
bilibili-course-catcher/
├── README.md                 # 本文档（开源发布用）
├── SKILL.md                  # 技能定义（OpenClaw加载，<1000词精简版）
├── LICENSE                   # MIT许可证
├── evals/                    # 测试用例（Perplexity规范）
│   └── cases.md              # Positive/Negative/Boundary用例
├── templates/                # 输出模板（Perplexity规范）
│   └── output-template.md    # 推荐结果格式模板
├── references/               # 参考文档（Perplexity规范）
│   ├── bilibili-api-docs.md  # B站API参考文档
│   └── changelog.md          # 变更日志（v1.0-v1.6）
└── src/                      # 源代码
    ├── index.ts
    ├── questionnaire.ts
    ├── bilibili-api.ts
    ├── scorer.ts
    ├── matcher.ts
    └── formatter.ts
```

**Perplexity 优化说明**：遵循渐进披露原则，重型内容（变更日志、输出模板、测试用例）外置到独立文件，SKILL.md 保持精简（<1000词），降低每次加载的 token 消耗。

---

## 🔧 自定义与扩展

### 修改触发词

编辑 `SKILL.md` 的 `triggers` 部分：

```yaml
triggers:
  - "帮我找 B 站课程"       # 精确触发
  - "暑假想补下 XXX"         # 场景触发
  - "初中数学 课"            # 组合触发
```

### 修改评分权重

编辑 `SKILL.md` 的评分算法部分：

```
总分 = 内容质量×0.30 + 用户口碑×0.25 + 匹配度×0.20 + UP主可信度×0.15 + 时效性×0.10
```

如果你认为匹配度更重要，可以调整为：

```
总分 = 匹配度×0.30 + 内容质量×0.25 + 用户口碑×0.20 + UP主可信度×0.15 + 时效性×0.10
```

### 添加新年级/类别映射

编辑 `SKILL.md` 的映射表：

```markdown
| 年级 | 可选课程类别 | 说明 |
|------|-------------|------|
| 小学 | 语文、数学、英语、编程、艺术、音乐、体育、其他 | 小学无理化生 |
```

### 添加新难度级别

编辑类别→难度映射表，例如给英语加"听力专项"：

```markdown
| 类别 | 可选难度级别 | 说明 |
|------|-------------|------|
| 语文 | 入门、标准、拔高、提优、作文专项、阅读理解专项 | 6选项 |
| 英语 | 入门、标准、拔高、提优、听力专项 | 5选项 |
| 其他 | 入门、标准、拔高、提优 | 4选项 |
```

---

## ❓ 常见问题

### Q: 安装后技能没有触发？

**检查步骤**：
1. 确认 `SKILL.md` 在正确目录：`~/.openclaw/workspace/skills/bilibili-course-catcher/SKILL.md`
2. 确认已重启 OpenClaw：`openclaw gateway restart`
3. 确认技能出现在列表中：`openclaw skills list`
4. 检查触发词是否包含你使用的表达方式

### Q: 搜索结果很少或没有结果？

**可能原因**：
- 搜索API未配置或密钥失效 → 检查Tavily/Serper配置
- 搜索关键词过于具体 → 尝试更宽泛的查询
- B站该类别课程较少 → 换一个类别试试

### Q: 课程链接无法访问？

**可能原因**：
- 课程已被UP主删除 → 链接失效是B站常见情况
- 地域限制 → 某些课程可能有地区限制
- BV号提取错误 → 报告issue

### Q: 如何切换搜索API？

本技能会自动使用OpenClaw配置中的搜索服务，优先级：
1. Tavily（推荐，搜索质量最高）
2. Serper（Google原生结果）
3. 内置多引擎兜底

只需确保至少一个搜索API已配置即可。

### Q: 支持哪些聊天平台？

OpenClaw支持的所有平台均可使用：
- 飞书（Feishu）
- Discord
- Telegram
- Signal
- WhatsApp
- Web界面

---

## 🤝 贡献指南

欢迎贡献！以下是参与方式：

1. **Fork** 本仓库
2. 创建功能分支：`git checkout -b feature/你的功能名`
3. 提交改动：`git commit -m '添加某个功能'`
4. 推送分支：`git push origin feature/你的功能名`
5. 提交 **Pull Request**

### 贡献方向

- 🌍 多语言支持（英文/日文课程搜索）
- 📱 新平台适配（学堂在线、网易公开课）
- 🎯 新类别专项（英语听力专项、数学计算专项）
- 📊 评分算法优化（引入完播率等新指标）
- 🐛 Bug修复和触发词优化

---

## 📝 版本历史

| 版本 | 日期 | 核心改动 |
|------|------|---------|
| v1.0 | 2026-06-14 | 初始版本，7维评分+交互式问答 |
| v1.1 | 2026-06-15 | 触发词细化（7→15条），课程链接硬性要求 |
| v1.2 | 2026-06-15 | 多轮问答（每轮1问），5维生产级评分 |
| v1.3 | 2026-06-15 | 难度级别加说明，可选轮次必展示 |
| v1.4 | 2026-06-15 | 新增语文类别，年级→课程动态映射 |
| v1.5 | 2026-06-15 | 语文专项训练（作文/阅读理解） |
| v1.6 | 2026-06-15 | 输出表格增加UP主列 |

---

## 📄 许可证

MIT License — 自由使用、修改、分发

---

## 💬 反馈与支持

- **Bug报告**：[GitHub Issues](https://github.com/你的用户名/bilibili-course-catcher/issues)
- **功能建议**：[GitHub Discussions](https://github.com/你的用户名/bilibili-course-catcher/discussions)
- **使用交流**：加入OpenClaw社区

---

> 🏆 **"The compiled truth is the answer. The timeline is the proof."**
