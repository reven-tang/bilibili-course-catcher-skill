# B 站 API 接口文档参考

> 本文档记录 B 站课程抓取技能使用的 API 接口

## 搜索接口

**接口**: `GET /x/web-interface/search/type`

**基础 URL**: `https://api.bilibili.com`

**参数**:
| 参数 | 类型 | 必填 | 说明 |
|------|------|------|------|
| keyword | string | 是 | 搜索关键词 |
| search_type | string | 是 | 固定值 `video` |
| page | number | 否 | 页码，默认 1 |
| page_size | number | 否 | 每页数量，默认 20，最大 50 |
| order | string | 否 | 排序方式：`totalrank`(综合)、`click`(播放)、`pubdate`(发布时间)、`stow`(收藏) |
| duration | number | 否 | 时长筛选：0=全部，1=<10分钟，2=10-30分钟，3=>30分钟 |

**示例**:
```
GET https://api.bilibili.com/x/web-interface/search/type?keyword=初中数学入门&search_type=video&page=1&page_size=20&order=totalrank
```

**响应**:
```json
{
  "code": 0,
  "message": "0",
  "ttl": 1,
  "data": {
    "numResults": 1000,
    "pageSize": 20,
    "page": 1,
    "resultList": [
      {
        "aid": 123456789,
        "bvid": "BV1234567890",
        "title": "初中数学入门教程",
        "description": "...",
        "author": "UP主名",
        "mid": 12345678,
        "duration": "10:00",
        "pic": "https://i0.hdslb.com/...",
        "play": 100000,
        "video_review": 5000,
        "favorites": 10000,
        "tags": ["初中", "数学", "入门"]
      }
    ]
  }
}
```

---

## 视频详情接口

**接口**: `GET /x/web-interface/view`

**参数**:
| 参数 | 类型 | 必填 | 说明 |
|------|------|------|------|
| aid | number | 是* | AV 号（aid 或 bvid 二选一） |
| bvid | string | 是* | BV 号 |

**示例**:
```
GET https://api.bilibili.com/x/web-interface/view?aid=123456789
```

**响应**:
```json
{
  "code": 0,
  "message": "0",
  "data": {
    "aid": 123456789,
    "bvid": "BV1234567890",
    "title": "视频标题",
    "desc": "视频简介",
    "duration": 600,
    "pubdate": 1704067200,
    "owner": {
      "mid": 12345678,
      "name": "UP主名",
      "face": "https://i0.hdslb.com/..."
    },
    "stat": {
      "view": 1000000,
      "like": 50000,
      "coin": 10000,
      "favorite": 30000,
      "share": 2000,
      "danmaku": 5000
    },
    "is_pay": 0,
    "is_preview": 0
  }
}
```

---

## UP 主信息接口

**接口**: `GET /x/space/acc/info`

**参数**:
| 参数 | 类型 | 必填 | 说明 |
|------|------|------|------|
| mid | number | 是 | UP 主 ID |

**示例**:
```
GET https://api.bilibili.com/x/space/acc/info?mid=12345678
```

**响应**:
```json
{
  "code": 0,
  "message": "0",
  "data": {
    "mid": 12345678,
    "name": "UP主名",
    "sex": "保密",
    "face": "https://i0.hdslb.com/...",
    "sign": "UP主简介",
    "level": 6,
    "pendant": {...},
    "nameplate": {...},
    "official_verify": {
      "type": 2,
      "desc": "教育 UP 主"
    },
    "follower": 500000,
    "videos": {
      "count": 100,
      "tlist": [...]
    }
  }
}
```

---

## 常见错误码

| 错误码 | 说明 |
|--------|------|
| 0 | 成功 |
| -400 | 请求错误 |
| -401 | 未授权（需要登录 Cookie） |
| -403 | 权限不足 |
| -404 | 资源不存在 |
| -509 | 请求过于频繁（频率限制） |

---

## 频率限制

- 搜索接口：约 50 次/分钟
- 详情接口：约 100 次/分钟
- UP 主接口：约 100 次/分钟

**超出限制**：
- 返回 509 错误
- 建议实现指数退避重试
- 或降级到网页爬取方案

---

## 注意事项

1. **User-Agent**: 需要携带正常的浏览器 User-Agent
2. **Referer**: 需要携带 `Referer: https://www.bilibili.com`
3. **Cookie**: 部分接口需要登录 Cookie，建议使用已登录的凭证
4. **数据时效性**: API 返回的数据可能有几分钟延迟
5. **HTTPS**: 建议使用 HTTPS 协议

---

## 更新日志

- 2026-06-14: 初始版本
