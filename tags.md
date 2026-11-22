---
layout: page
title: 标签
permalink: /tags/
---

按分类汇总全部文章。点文章标题进入正文。

{% assign cats = site.categories | sort %}
{% for category in cats %}
<h2 id="{{ category[0] }}">{{ category[0] }} <small style="color:#828282;font-weight:normal;">（{{ category[1] | size }} 篇）</small></h2>

<ul>
{% for post in category[1] %}
  <li>
    <a href="{{ post.url | relative_url }}">{{ post.title | escape }}</a>
    <span style="color:#828282;font-size:.85em;">{{ post.date | date: "%Y-%m-%d" }}</span>
  </li>
{% endfor %}
</ul>
{% endfor %}
