# 配置 B 站 Cookie 快速指南

> 📌 **为什么需要 Cookie？**
> 
> B 站部分 API 接口需要登录态才能返回完整数据（如 UP 主信息、收藏数等）。
> 配置 Cookie 后，技能可以获取更准确的评分数据。

---

## 🔧 获取 Cookie 步骤

### 步骤 1: 登录 B 站

在浏览器中打开 https://www.bilibili.com 并登录你的账号。

### 步骤 2: 打开开发者工具

**Chrome/Edge**:
- 按 `F12` 或 `Cmd+Option+I` (Mac) / `Ctrl+Shift+I` (Windows)
- 或右键页面 → "检查"

**Safari**:
- 按 `Cmd+Option+I`
- 如未显示，需先在偏好设置中启用"开发"菜单

### 步骤 3: 找到 Cookie

1. 切换到 **Application** 标签页（Chrome）或 **Storage** 标签页（Firefox）
2. 展开左侧 **Cookies** → `https://www.bilibili.com`
3. 看到 Cookie 列表

### 步骤 4: 复制 Cookie

**方法 A: 复制全部（推荐）**
- 右键 Cookie 列表 → "Copy All" 或 "Export"
- 或手动全选（Cmd+A / Ctrl+A）→ 复制

**方法 B: 复制关键字段**
至少复制以下字段（用分号连接）:
```
SESSDATA=xxx; bili_jct=xxx; DedeUserID=xxx; DedeUserID__ckMd5=xxx;
```

**关键字段说明**:
| 字段名 | 作用 | 是否必需 |
|--------|------|---------|
| `SESSDATA` | 会话凭证 | ✅ 必需 |
| `bili_jct` | CSRF 令牌 | ✅ 必需 |
| `DedeUserID` | 用户 ID | ✅ 必需 |
| `DedeUserID__ckMd5` | 用户 ID 校验 | ✅ 必需 |

### 步骤 5: 粘贴到 .env 文件

1. 打开技能目录下的 `.env` 文件:
   ```
   /Users/jhwu/.openclaw/workspace/skills/bilibili-course-catcher/.env
   ```
   
2. 粘贴 Cookie:
   ```env
   BILIBILI_COOKIE=SESSDATA=xxx; bili_jct=xxx; DedeUserID=xxx; ...
   ```

3. 保存文件

---

## ✅ 验证配置

**方法 1: 查看配置加载**
```bash
cd /Users/jhwu/.openclaw/workspace/skills/bilibili-course-catcher
node -e "console.log(process.env.BILIBILI_COOKIE ? '✅ Cookie 已配置' : '❌ Cookie 未配置')"
```

**方法 2: 运行技能**
```
用户：帮我找 B 站课程
AI: ⚙️ 配置：... 缓存开启，Cookie 已加载 ✅
```

---

## ⚠️ 注意事项

### 1. Cookie 有效期
- **有效期**: 约 30 天（B 站会话过期时间）
- **过期表现**: API 返回未授权错误
- **解决方法**: 重新登录 B 站，复制新 Cookie

### 2. 安全提示
- ⚠️ **不要分享 Cookie**: Cookie 包含账号登录凭证
- ⚠️ **不要提交到 Git**: `.env` 已在 `.gitignore` 中
- ⚠️ **定期更新**: 建议每 2-3 周更新一次

### 3. 权限说明
- 技能只会读取公开的课程数据
- **不会**发送评论、弹幕、点赞等操作
- **不会**修改账号任何信息
- **不会**访问付费内容（除非账号有大会员）

---

## 🔍 故障排查

### 问题 1: Cookie 配置后仍无法访问

**可能原因**:
- Cookie 已过期
- Cookie 格式错误
- 网络问题（非 Cookie 问题）

**解决方法**:
1. 重新登录 B 站，复制新 Cookie
2. 检查 Cookie 格式（应包含 `SESSDATA=xxx;`）
3. 查看 API 诊断报告：`API_DIAGNOSIS.md`

### 问题 2: 提示"Cookie 未配置"

**可能原因**:
- `.env` 文件不存在
- 变量名错误（应为 `BILIBILI_COOKIE`）
- OpenClaw 未重新加载配置

**解决方法**:
1. 创建 `.env` 文件（参考 `.env.example`）
2. 确认变量名正确
3. 重启 OpenClaw: `openclaw gateway restart`

### 问题 3: API 返回 429（频率限制）

**可能原因**:
- 短时间内请求过多
- 多个用户共用同一 Cookie

**解决方法**:
1. 等待 1-2 分钟再试
2. 技能会自动重试（指数退避）
3. 考虑使用 browser 工具方案（绕过频率限制）

---

## 📞 需要帮助？

如遇到其他问题：
1. 查看 `API_DIAGNOSIS.md` 详细排查
2. 查看技能日志（OpenClaw 控制台）
3. 联系技能开发者

---

**最后更新**: 2026-06-14  
**适用版本**: bilibili-course-catcher v1.0+
