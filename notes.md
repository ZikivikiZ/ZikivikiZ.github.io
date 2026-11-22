---
layout: page
title: 动态
permalink: /notes/
---

{% assign notes = site.data.notes %}
{% if notes and notes.size > 0 %}
<ul style="list-style:none;padding:0;margin:0;">
  {% for n in notes %}
  <li style="padding:1.15rem 0;border-bottom:1px solid #262628;">
    <div style="color:#8a8a8a;font-size:.82em;font-variant-numeric:tabular-nums;">{{ n.date }}</div>
    <div style="margin-top:.35rem;line-height:1.9;">{{ n.text | newline_to_br }}</div>
  </li>
  {% endfor %}
</ul>
{% else %}
<p style="color:#8a8a8a;">还没有动态。</p>
{% endif %}
