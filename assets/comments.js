(function () {
	var root = document.getElementById('comments');
	if (!root) return;

	var endpoint = root.getAttribute('data-endpoint');
	var post = root.getAttribute('data-post') || window.location.pathname || '';
	var question = root.getAttribute('data-question') || '';
	if (!endpoint) return;

	var listEl = document.getElementById('comment-list');
	var openBtn = document.getElementById('comment-open');

	var adminToggle = document.getElementById('comment-admin-toggle');
	var adminBox = document.getElementById('comment-admin-box');
	var adminTokenEl = document.getElementById('comment-admin-token');
	var adminSave = document.getElementById('comment-admin-save');
	var adminClear = document.getElementById('comment-admin-clear');

	var TOKEN_KEY = 'dsh_comment_admin';
	var DRAFT_KEY = 'dsh_draft:' + post;
	var token = '';
	var composer = null;
	var blocks = [];
	var saveTimer = null;
	try {
		token = localStorage.getItem(TOKEN_KEY) || '';
	} catch (error) {
		token = '';
	}

	/* ---------- 小工具 ---------- */

	function el(tag, className, text) {
		var node = document.createElement(tag);
		if (className) node.className = className;
		if (text != null) node.textContent = text;
		return node;
	}

	function pad(n) {
		return n < 10 ? '0' + n : String(n);
	}

	function formatTime(ms) {
		var d = new Date(ms);
		return (
			d.getFullYear() + '-' + pad(d.getMonth() + 1) + '-' + pad(d.getDate()) +
			' ' + pad(d.getHours()) + ':' + pad(d.getMinutes())
		);
	}

	/* ---------- 草稿 ---------- */

	function saveDraft() {
		if (saveTimer) window.clearTimeout(saveTimer);
		saveTimer = window.setTimeout(function () {
			try {
				var kept = blocks.filter(function (b) { return b.quote || b.text; });
				if (kept.length) localStorage.setItem(DRAFT_KEY, JSON.stringify({ blocks: kept }));
				else localStorage.removeItem(DRAFT_KEY);
			} catch (error) {}
		}, 300);
	}

	function loadDraft() {
		try {
			var raw = localStorage.getItem(DRAFT_KEY);
			if (!raw) return null;
			var data = JSON.parse(raw);
			if (!data || !Array.isArray(data.blocks)) return null;
			return data.blocks.filter(function (b) {
				return (b.quote && b.quote.trim()) || (b.text && b.text.trim());
			});
		} catch (error) {
			return null;
		}
	}

	function clearDraft() {
		try {
			localStorage.removeItem(DRAFT_KEY);
		} catch (error) {}
	}

	/* ---------- 浮动评论框 ---------- */

	function buildComposer() {
		var box = el('div', 'cm-box');
		box.id = 'cm-box';

		var head = el('div', 'cm-head');
		head.appendChild(el('span', 'cm-title', '写评论'));
		var close = el('button', 'cm-close', '×');
		close.type = 'button';
		close.addEventListener('click', closeComposer);
		head.appendChild(close);
		box.appendChild(head);

		var list = el('div', 'cm-blocks');
		list.id = 'cm-blocks';
		box.appendChild(list);

		var addRow = el('div', 'cm-add-row');
		var addBtn = el('button', 'cm-add', '＋ 再加一段引用');
		addBtn.type = 'button';
		addBtn.addEventListener('click', function () {
			addBlock('');
			renderBlocks(true);
		});
		addRow.appendChild(addBtn);
		box.appendChild(addRow);

		var hint = el('p', 'cm-hint');
		hint.appendChild(el('span', null, 'Code：'));
		hint.appendChild(el('strong', null, question));
		box.appendChild(hint);

		var foot = el('div', 'cm-foot');
		var name = el('input', 'cm-name');
		name.placeholder = '昵称';
		name.maxLength = 20;
		var answer = el('input', 'cm-answer');
		answer.placeholder = '输入答案';
		var submit = el('button', 'cm-submit', '发表');
		submit.type = 'button';
		foot.appendChild(name);
		foot.appendChild(answer);
		foot.appendChild(submit);
		box.appendChild(foot);

		var status = el('span', 'cm-status');
		box.appendChild(status);

		submit.addEventListener('click', function () {
			publish(submit, status, name, answer);
		});

		document.body.appendChild(box);
		return box;
	}

	function openComposer(seedQuote) {
		if (!composer) composer = buildComposer();
		composer.style.display = 'block';

		if (seedQuote) addBlock(seedQuote);
		else if (!blocks.length) {
			var draft = loadDraft();
			if (draft && draft.length) blocks = draft;
			else addBlock('');
		}

		renderBlocks(true);
	}

	function closeComposer() {
		if (composer) composer.style.display = 'none';
		hidePick();
	}

	function addBlock(quote) {
		if (blocks.length >= 8) return;
		blocks.push({ quote: quote || '', text: '' });
	}

	function renderBlocks(focusLast) {
		if (!composer) return;
		var list = document.getElementById('cm-blocks');
		list.textContent = '';
		var lastArea = null;

		blocks.forEach(function (block, index) {
			var wrap = el('div', 'cm-block');

			var top = el('div', 'cm-block-head');
			top.appendChild(el('span', 'cm-block-no', '#' + (index + 1)));
			var del = el('button', 'cm-block-del', '删除');
			del.type = 'button';
			del.addEventListener('click', function () {
				blocks.splice(index, 1);
				renderBlocks(false);
				saveDraft();
			});
			top.appendChild(del);
			wrap.appendChild(top);

			if (block.quote) wrap.appendChild(el('div', 'cm-block-quote', block.quote));

			var area = el('textarea', 'cm-block-text');
			area.rows = 3;
			area.maxLength = 1000;
			area.placeholder = block.quote ? '对这一段的看法…' : '说点什么…';
			area.value = block.text || '';
			area.addEventListener('input', function () {
				block.text = area.value;
				saveDraft();
			});
			wrap.appendChild(area);
			list.appendChild(wrap);
			lastArea = area;
		});

		if (focusLast && lastArea) {
			window.setTimeout(function () {
				lastArea.focus();
			}, 30);
		}
	}

	function publish(button, statusEl, nameEl, answerEl) {
		var name = nameEl.value.trim();
		var answer = answerEl.value.trim();
		var items = blocks
			.map(function (b) {
				return { quote: (b.quote || '').trim(), text: (b.text || '').trim() };
			})
			.filter(function (b) {
				return b.text;
			});

		if (!name) {
			statusEl.textContent = '昵称不能为空。';
			statusEl.className = 'cm-status is-error';
			return;
		}
		if (!answer) {
			statusEl.textContent = '请填 Code 答案。';
			statusEl.className = 'cm-status is-error';
			return;
		}
		if (!items.length) {
			statusEl.textContent = '还没写内容。';
			statusEl.className = 'cm-status is-error';
			return;
		}

		button.disabled = true;
		statusEl.textContent = '发表中…';
		statusEl.className = 'cm-status';

		fetch(endpoint + '/comments', {
			method: 'POST',
			headers: { 'content-type': 'application/json' },
			body: JSON.stringify({ post: post, name: name, answer: answer, items: items }),
		})
			.then(function (res) {
				return res.json().then(function (data) {
					return { ok: res.ok, data: data };
				});
			})
			.then(function (result) {
				if (!result.ok) {
					statusEl.textContent = (result.data && result.data.error) || '发表失败';
					statusEl.className = 'cm-status is-error';
					return;
				}
				blocks = [];
				clearDraft();
				if (composer) {
					composer.style.display = 'none';
					var list = document.getElementById('cm-blocks');
					if (list) list.textContent = '';
				}
				load();
			})
			.catch(function () {
				statusEl.textContent = '网络错误，稍后再试。';
				statusEl.className = 'cm-status is-error';
			})
			.finally(function () {
				button.disabled = false;
			});
	}

	/* ---------- 评论列表 ---------- */

	function removeItem(id, node) {
		fetch(endpoint + '/comments/' + encodeURIComponent(id) + '?post=' + encodeURIComponent(post), {
			method: 'DELETE',
			headers: { 'x-admin-token': token },
		})
			.then(function (res) {
				if (res.status === 403) {
					token = '';
					try {
						localStorage.removeItem(TOKEN_KEY);
					} catch (error) {}
					throw new Error('hail robot!');
				}
				if (!res.ok) throw new Error('删除失败');
				node.remove();
			})
			.catch(function (error) {
				window.alert(error.message || '删除失败');
			});
	}

	function renderComment(item) {
		var wrap = el('div', 'comment-item');

		var head = el('div', 'comment-head');
		head.appendChild(el('span', 'comment-name', item.name));
		head.appendChild(el('span', 'comment-time', formatTime(item.at)));

		if (token) {
			var del = el('button', 'comment-del', '删除');
			del.type = 'button';
			del.addEventListener('click', function () {
				if (window.confirm('删除这条评论？')) removeItem(item.id, wrap);
			});
			head.appendChild(del);
		}
		wrap.appendChild(head);

		var list = Array.isArray(item.items) && item.items.length
			? item.items
			: [{ quote: item.quote || '', text: item.text || '' }];

		list.forEach(function (block) {
			if (block.quote) wrap.appendChild(el('div', 'comment-quote-block', block.quote));
			if (block.text) wrap.appendChild(el('div', 'comment-body', block.text));
		});

		return wrap;
	}

	function render(items) {
		listEl.textContent = '';
		if (!items || !items.length) {
			var empty = el('p', 'comment-empty');
			var strike = el('span', 'comment-strike', '弹幕善意引导');
			empty.appendChild(strike);
			empty.appendChild(document.createTextNode('（划掉）'));
			empty.appendChild(document.createElement('br'));
			empty.appendChild(document.createTextNode('感谢你的阅读'));
			listEl.appendChild(empty);
			return;
		}
		items.forEach(function (item) {
			listEl.appendChild(renderComment(item));
		});
	}

	function load() {
		fetch(endpoint + '/comments?post=' + encodeURIComponent(post), {
			headers: { accept: 'application/json' },
		})
			.then(function (res) {
				if (!res.ok) throw new Error('load failed');
				return res.json();
			})
			.then(render)
			.catch(function () {
				listEl.textContent = '';
				listEl.appendChild(el('p', 'comment-empty', '评论加载失败，刷新重试。'));
			});
	}

	/* ---------- 选中正文 → 引用 ---------- */

	var pick = el('button', 'quote-pick', '引用');
	pick.type = 'button';
	pick.style.display = 'none';
	document.body.appendChild(pick);

	function hidePick() {
		pick.style.display = 'none';
	}

	function selectionText() {
		var sel = window.getSelection();
		if (!sel || sel.isCollapsed || sel.rangeCount === 0) return '';
		var text = sel.toString().trim();
		if (text.length < 4) return '';
		var node = sel.anchorNode;
		var target = node && (node.nodeType === 1 ? node : node.parentElement);
		if (!target || !target.closest || !target.closest('.post-content')) return '';
		return text.slice(0, 300);
	}

	function placePick() {
		var text = selectionText();
		if (!text) {
			hidePick();
			return;
		}
		var rect = window.getSelection().getRangeAt(0).getBoundingClientRect();
		pick.dataset.text = text;
		pick.style.display = 'block';

		/* 默认贴在选区左侧，贴着那一行的垂直中线 */
		var width = pick.offsetWidth || 60;
		var height = pick.offsetHeight || 28;
		var left = rect.left + window.pageXOffset - width - 10;
		if (left < 8) left = rect.left + window.pageXOffset + rect.width + 10;
		var top = rect.top + window.pageYOffset + rect.height / 2 - height / 2;

		pick.style.left = Math.max(8, left) + 'px';
		pick.style.top = Math.max(8, top) + 'px';
	}

	document.addEventListener('mouseup', function () {
		window.setTimeout(placePick, 10);
	});
	document.addEventListener('touchend', function () {
		window.setTimeout(placePick, 280);
	});
	document.addEventListener('mousedown', function (event) {
		if (event.target !== pick) hidePick();
	});

	pick.addEventListener('click', function () {
		var text = pick.dataset.text || '';
		hidePick();
		window.getSelection().removeAllRanges();
		openComposer(text);
	});

	if (openBtn) {
		openBtn.addEventListener('click', function () {
			openComposer('');
		});
	}

	/* ---------- 管理 ---------- */

	if (adminToggle) {
		adminToggle.addEventListener('click', function () {
			adminBox.style.display = adminBox.style.display === 'none' ? 'inline-flex' : 'none';
			if (adminBox.style.display === 'inline-flex') adminTokenEl.focus();
		});
	}

	if (adminSave) {
		adminSave.addEventListener('click', function () {
			var value = adminTokenEl.value.trim();
			if (!value) return;
			fetch(endpoint + '/comments/__probe__', {
				method: 'DELETE',
				headers: { 'x-admin-token': value },
			}).then(function (res) {
				if (res.status === 403) {
					token = '';
					try {
						localStorage.removeItem(TOKEN_KEY);
					} catch (error) {}
					adminBox.style.display = 'none';
					window.alert('hail robot!');
					return;
				}
				token = value;
				try {
					localStorage.setItem(TOKEN_KEY, value);
				} catch (error) {}
				adminTokenEl.value = '';
				adminBox.style.display = 'none';
				load();
			});
		});
	}

	if (adminClear) {
		adminClear.addEventListener('click', function () {
			token = '';
			try {
				localStorage.removeItem(TOKEN_KEY);
			} catch (error) {}
			adminBox.style.display = 'none';
			load();
		});
	}

	/* 有草稿就提示一下 */
	var draft = loadDraft();
	if (draft && draft.length) {
		blocks = draft;
		var tip = el('p', 'comment-draft-tip');
		tip.appendChild(el('span', null, '上一篇没写完的草稿已保留。'));
		var resume = el('button', 'comment-draft-resume', '继续写');
		resume.type = 'button';
		resume.addEventListener('click', function () {
			tip.remove();
			openComposer('');
		});
		tip.appendChild(resume);
		root.insertBefore(tip, listEl);
	}

	load();
})();
