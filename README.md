# 站点说明

GitHub Pages + Jekyll 的个人站，纯静态，不需要服务器。

## 目录

| 路径 | 作用 |
|---|---|
| `_config.yml` | 站点名、描述、主题、URL |
| `index.md` | 首页（自动列出文章） |
| `about.md` | 关于页 |
| `_posts/` | 所有文章，一篇一个文件 |

## 发布一篇文章

1. 在 `_posts/` 新建 `YYYY-MM-DD-标题.md`；
2. 文件开头写：

   ```markdown
   ---
   title: 标题
   date: 2026-11-23 20:30:00 +0800
   categories: 随笔
   ---
   ```

3. 后面写正文，提交到 `main` 分支。

## 开启 Pages

仓库 Settings → Pages → Build and deployment：
- Source 选 `Deploy from a branch`
- Branch 选 `main`，目录选 `/ (root)`
- 保存，等 1–2 分钟

访问地址：
- 仓库名为 `ZikivikiZ.github.io` → `https://zikivikiz.github.io`
- 其他仓库名 → `https://zikivikiz.github.io/<仓库名>`（同时把 `_config.yml` 的 `baseurl` 改成 `/<仓库名>`）

## 本地预览（可选）

装 Ruby 后：

```powershell
gem install bundler jekyll
jekyll serve
```

不装也行，直接提交看线上效果。
