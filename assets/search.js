(function () {
	var root = document.getElementById('post-search');
	if (!root) return;

	var indexUrl = root.getAttribute('data-index');
	var input = document.getElementById('post-search-input');
	var list = document.getElementById('post-search-results');
	var hint = document.getElementById('post-search-hint');
	var posts = [];

	function esc(value) {
		return String(value).replace(/[&<>"]/g, function (ch) {
			return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[ch];
		});
	}

	function render(items) {
		if (!items.length) {
			list.innerHTML = '<li style="color:#828282;padding:.5rem 0;">没有匹配的文章</li>';
			return;
		}
		list.innerHTML = items
			.map(function (p) {
				return (
					'<li style="padding:.55rem 0;border-bottom:1px solid #eee;line-height:1.6;">' +
					'<span style="color:#828282;font-size:.85em;margin-right:.7rem;font-variant-numeric:tabular-nums;">' +
					esc(p.date) +
					'</span><a href="' + esc(p.url) + '">' + esc(p.title) + '</a></li>'
				);
			})
			.join('');
	}

	function filter() {
		var q = input.value.trim().toLowerCase();
		if (!q) {
			render(posts);
			return;
		}
		render(
			posts.filter(function (p) {
				return p.title.toLowerCase().indexOf(q) >= 0 || p.date.indexOf(q) === 0;
			}),
		);
	}

	fetch(indexUrl)
		.then(function (response) {
			if (!response.ok) throw new Error('index unavailable');
			return response.json();
		})
		.then(function (data) {
			posts = Array.isArray(data) ? data : [];
			render(posts);
			input.addEventListener('input', filter);
			input.focus();
		})
		.catch(function () {
			if (hint) hint.textContent = '搜索索引加载失败，刷新页面重试。';
		});
})();
