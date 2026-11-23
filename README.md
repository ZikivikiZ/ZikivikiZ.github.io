# ZikivikiZ 的站点

GitHub Pages + Jekyll 搭的静态站。所有内容都是纯文本文件，改完提交就发布。

站点地址：<https://zikivikiz.github.io>

---

## 一、想改什么，改哪个文件

| 想改的东西 | 文件 | 说明 |
|---|---|---|
| 站点名、站点描述 | `_config.yml` | 顶部 `title` / `description` |
| 首页大标题、介绍语 | `index.md` | 标题在 `title:`，正文就是那段介绍 |
| 顶部导航的顺序和项目 | `_config.yml` | `header_pages:` 列表，越靠前越左 |
| 关于页 | `about.md` | 头像在正文开头那行 `<img>` |
| 动态（短句） | `_data/notes.yml` | 见第三节 |
| 文章 | `_posts/*.md` | 见第二节 |
| 评论口令问题 | `_includes/comments.html` | 那段 `comment-hint` 里的文字 |
| 评论接口地址 | `_config.yml` | `comments_endpoint` |
| 页脚名言 | `assets/quotes.js` | 每行一句，随机显示 |
| 页脚版权 | `_includes/footer.html` | `© {{ site.time \| date: '%Y' }} {{ site.title }}` |
| 搜索页提示语 | `search.md` | 输入框下面的说明 |
| 随笔录页开头那句 | `essays.md` | 正文部分 |

改完在网页上点 **Commit changes**，1–2 分钟后生效。

---

## 二、写一篇文章

1. 在 `_posts/` 新建文件，名字必须是 **`年-月-日-标题.md`**，月日补零：

   ```
   _posts/2026-12-01-今天写了点东西.md
   ```

2. 文件开头写头部信息（**日期要和文件名一致**）：

   ```markdown
   ---
   title: "今天写了点东西"
   date: 2026-12-01 09:00:00 +0800
   categories: 随笔
   image: /assets/images/posts/2026-12-01-xxx/cover.jpg
   ---
   ```

   - `image` 可选，不写就不显示封面；
   - `image_full` 可选，只在「首页用横条、正文用整图」时需要；
   - `image_fit: contain` 可选，让缩略图完整显示而不是裁切。

3. 正文直接写，一个回车就换行，段落之间空一行。

4. 封面图放在 `assets/images/posts/日期-短名/` 下面，统一叫 `cover.jpg`。

**注意**：日期不要写「未来的时间」，Jekyll 会把未来日期的文章丢掉。

---

## 三、发一条动态

编辑 `_data/notes.yml`，在**最前面**加一段：

```yaml
- date: 2026-12-01
  text: |-
    第一行。
    第二行会保留换行。
```

- 越靠前越新；
- 一条动态就是一个 `- date:` 加一段 `text:`。

发完首页的「最近一条动态」和 `/notes/` 页面会一起更新。

---

## 四、改完 js 记得升版本号

浏览器会长期缓存 `assets/*.js`。**只要改了这些 js 文件**，就要把 `_config.yml` 里的：

```yaml
assets_version: 4
```

数字 +1，否则读者看到的还是旧脚本。只改 md、图片、样式不需要动它。

---

## 五、目录说明

```
_config.yml          站点总配置
index.md             首页（落地页）
essays.md            随笔录（文章列表）
notes.md             动态页
about.md             关于页
search.md            搜索页
_posts/              所有文章
_data/notes.yml      动态数据
_includes/           页面零件（页头、页脚、评论、文章卡片）
_layouts/            页面模板（首页、文章页、随笔录）
assets/              图片、脚本
  images/posts/      每篇文章的图，一个日期-短名 一个目录
  images/avatar/     头像
  comments.js        评论逻辑
  quotes.js          页脚名言
  search.js          搜索逻辑
  search.json        搜索索引（构建时自动生成，不用手改）
```

---

## 六、不需要碰的文件

除非要改结构，这几个不用动：

- `_includes/head.html`、`head-custom.html`（页面头和深夜模式样式）
- `_layouts/*`（模板）
- `assets/search.json`（Jekyll 自动生成）

---

## 七、发布

仓库 Settings → Pages：

- Source：`Deploy from a branch`
- Branch：`main` / `/ (root)`

提交后 1–3 分钟自动构建，构建记录在仓库顶部的 **Actions** 里看，绿勾 = 成功。
