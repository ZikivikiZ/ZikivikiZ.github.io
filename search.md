---
layout: page
title: 搜索
permalink: /search/
---

<div id="post-search" data-index="{{ '/assets/search.json' | relative_url }}">
  <input id="post-search-input" type="search" placeholder="输入标题关键字，或日期 2026-08-31" autocomplete="off"
         style="width:100%;box-sizing:border-box;padding:.65rem .85rem;font-size:1rem;line-height:1.4;
                border:1px solid #d8d8d8;border-radius:6px;background:#fff;color:#111;">
  <p id="post-search-hint" style="color:#828282;font-size:.85em;margin:.7rem 0 0;line-height:1.6;">
    输入标题里的字，或输入日期：<code>2026</code>、<code>2026-08</code>、<code>2026-08-31</code> 都能用。
  </p>
  <ul id="post-search-results" style="list-style:none;padding:0;margin:1.6rem 0 0;"></ul>
</div>

<script src="{{ '/assets/search.js' | relative_url }}?v={{ site.time | date: '%Y%m%d%H%M' }}"></script>
