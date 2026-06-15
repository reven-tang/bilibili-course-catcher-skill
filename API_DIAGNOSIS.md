# B 站 API 访问问题排查报告

**排查时间**: 2026-06-14  
**排查者**: 萨莉

---

## 🔍 问题现象

在试用技能时，无法访问 B 站 API，导致无法获取真实课程数据。

---

## 📋 排查步骤

### 1. 网络连通性测试

**测试命令**:
```bash
curl -I "https://api.bilibili.com/x/web-interface/search/type?keyword=小学数学&search_type=video"
```

**预期结果**:
```
HTTP/2 200 
server: nginx
content-type: application/json
```

**实际结果**: 需要实际执行测试

**可能问题**:
- ❌ 网络不通（防火墙/代理）
- ❌ DNS 解析失败
- ❌ B 站 API 服务不可用

---

### 2. API 权限检查

**B 站 API 访问要求**:
| 接口 | 是否需要登录 | 频率限制 |
|------|-------------|---------|
| 搜索接口 | 否（公开） | ~50 次/分钟 |
| 视频详情 | 否（公开） | ~100 次/分钟 |
| UP 主信息 | 部分需要 | ~100 次/分钟 |

**当前配置**:
- Cookie: 未配置（`.env` 文件中 `BILIBILI_COOKIE` 为空）
- User-Agent: 已配置（标准浏览器 UA）
- Referer: 已配置（`https://www.bilibili.com`）

**可能问题**:
- ⚠️ 部分接口需要 Cookie（无 Cookie 时返回部分数据）
- ⚠️ 频率限制触发（返回 429 错误）

---

### 3. 代码层面检查

#### 检查点 1: fetch 请求配置
```typescript
// src/bilibili-api.ts
const response = await fetch(url, {
  headers: {
    'User-Agent': 'Mozilla/5.0...',
    'Referer': 'https://www.bilibili.com',
  },
});
```

**状态**: ✅ 配置正确

#### 检查点 2: 错误处理
```typescript
if (response.status === 429) {
  throw new BilibiliError(RATE_LIMIT, 'API 频率限制', true);
}
```

**状态**: ✅ 已处理

#### 检查点 3: Cookie 加载
```typescript
// src/config.ts
if (process.env.BILIBILI_COOKIE) {
  config.bilibiliCookie = process.env.BILIBILI_COOKIE;
}
```

**状态**: ⚠️ 需要配置 `.env` 文件

---

### 4. 环境检查

**OpenClaw 环境**:
- 运行位置：本地 MacBook Air
- Node.js 版本：v26.3.0
- 网络环境：需要确认是否可访问外网

**可能限制**:
- 🔒 OpenClaw sandbox 可能限制外部网络访问
- 🔒 防火墙可能阻止 B 站域名

---

## 🎯 根本原因分析

### 最可能的原因

**原因 1: OpenClaw 网络限制**
- OpenClaw 默认运行在 sandbox 环境
- sandbox 可能不允许访问外部 API
- **验证方法**: 尝试访问其他外部 API（如 Google）

**原因 2: 缺少 Cookie 配置**
- 部分 B 站接口需要登录态
- 当前未配置 `BILIBILI_COOKIE`
- **验证方法**: 配置 Cookie 后重试

**原因 3: B 站反爬机制**
- B 站检测到自动化请求
- 触发反爬（返回 403 或验证码）
- **验证方法**: 使用 browser 工具模拟真实浏览器

---

## ✅ 解决方案

### 方案 A: 配置 Cookie（推荐）

**步骤**:
1. 登录 B 站（浏览器）
2. 打开开发者工具（F12）
3. 复制 Cookie: `Application > Cookies > https://www.bilibili.com`
4. 粘贴到 `.env` 文件:
   ```
   BILIBILI_COOKIE=SESSDATA=xxx; bili_jct=xxx; ...
   ```
5. 重启 OpenClaw

**优点**: 数据完整，可访问更多接口  
**缺点**: Cookie 会过期（约 30 天）

---

### 方案 B: 使用 browser 工具（最稳定）

**修改代码**:
```typescript
// 使用 browser 工具访问 B 站
browser(action='navigate', url='https://search.bilibili.com/...');
browser(action='snapshot');
// 解析页面内容
```

**优点**: 
- 绕过反爬（模拟真实用户）
- 无需 Cookie
- 数据最完整

**缺点**: 
- 速度较慢（3-10 秒）
- 需要 browser 技能支持

---

### 方案 C: 降级到 web_fetch

**修改代码**:
```typescript
// 使用 web_fetch 提取页面内容
const content = await web_fetch(url);
// 解析 Markdown 内容
```

**优点**: 简单，无需额外配置  
**缺点**: 数据不完整，解析困难

---

## 📝 实施建议

### 短期（立即执行）
1. ✅ 更新问题选项（已完成）
2. ⏳ 配置 B 站 Cookie（需用户提供）
3. ⏳ 测试 API 访问

### 中期（本周内）
1. 实现 browser 工具方案（方案 B）
2. 添加 API 访问诊断命令
3. 完善错误提示（区分网络错误/API 错误）

### 长期（优化方向）
1. 实现浏览器自动化（Playwright/Puppeteer）
2. 建立代理池（避免单 IP 频率限制）
3. 数据缓存策略优化

---

## 🔧 诊断工具

**新增诊断命令**（建议）:
```typescript
// 测试 B 站 API 连通性
async function diagnoseBilibiliAPI(): Promise<string> {
  const tests = [
    { name: '网络连通', fn: testNetwork },
    { name: 'API 响应', fn: testAPI },
    { name: 'Cookie 有效', fn: testCookie },
    { name: '频率限制', fn: testRateLimit },
  ];
  
  const results = [];
  for (const test of tests) {
    try {
      await test.fn();
      results.push(`✅ ${test.name}`);
    } catch (error) {
      results.push(`❌ ${test.name}: ${error.message}`);
    }
  }
  
  return results.join('\n');
}
```

---

## 📊 当前状态

| 检查项 | 状态 | 说明 |
|--------|------|------|
| 代码实现 | ✅ 完成 | API 调用逻辑完整 |
| 错误处理 | ✅ 完成 | 重试 + 降级机制 |
| Cookie 配置 | ⚠️ 待配置 | 需要用户提供 |
| 网络访问 | ❓ 待验证 | OpenClaw sandbox 限制未知 |
| browser 方案 | ❌ 未实现 | 需要额外开发 |

---

## 🎯 下一步行动

1. **用户提供 Cookie**（如有）
   - 测试 API 访问
   - 验证数据完整性

2. **实现 browser 方案**
   - 调用 browser 工具
   - 解析 HTML 内容
   - 测试稳定性

3. **添加诊断功能**
   - 一键检测所有问题
   - 给出明确修复建议

---

**排查者**: 萨莉  
**排查时间**: 2026-06-14 19:45  
**状态**: 待用户提供 Cookie 或确认网络环境
