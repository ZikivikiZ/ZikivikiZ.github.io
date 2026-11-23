(function () {
	var root = document.getElementById('comments');
	if (!root) return;

	var endpoint = root.getAttribute('data-endpoint');
	var post = root.getAttribute('data-post') || window.location.pathname || '';
	/* data-post 是百分号编码过的地址；统一还原成原始路径，
	   否则读写两侧的 key 会对不上，评论存进去却查不出来 */
	try {
		if (/%[0-9A-Fa-f]{2}/.test(post)) post = decodeURIComponent(post);
	} catch (error) {}
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

	function openComposer(seedQuote, inline, seedPara) {
		if (!composer) composer = buildComposer();

		/* 从底部「写评论」进入时，就地展开一个普通输入框；
		   从选中文字进入时，才用右下角浮层 */
		var row = document.querySelector('.comment-open-row');
		if (inline && row && row.parentNode) {
			if (composer.parentNode !== row.parentNode) {
				row.parentNode.insertBefore(composer, row.nextSibling);
			}
			composer.classList.add('cm-inline');
		} else {
			if (composer.parentNode !== document.body) document.body.appendChild(composer);
			composer.classList.remove('cm-inline');
		}

		composer.style.display = 'block';
		if (typeof bar !== 'undefined' && bar) bar.style.display = 'none';

		if (seedQuote) addBlock(seedQuote, seedPara);
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

	function addBlock(quote, para) {
		if (blocks.length >= 8) return;
		blocks.push({
			quote: quote || '',
			text: '',
			para: typeof para === 'number' && isFinite(para) ? para : null,
		});
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
				return {
					quote: (b.quote || '').trim(),
					text: (b.text || '').trim(),
					para: typeof b.para === 'number' && isFinite(b.para) ? b.para : null,
				};
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
				/* 先把自己刚发的那条插进去，不用等重新拉列表 */
				if (result.data && result.data.id) prependComment(result.data);
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

	function prependComment(item) {
		var empty = listEl.querySelector('.comment-empty');
		if (empty) empty.remove();
		var node = renderComment(item);
		node.classList.add('is-fresh');
		if (listEl.firstChild) listEl.insertBefore(node, listEl.firstChild);
		else listEl.appendChild(node);
	}

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

	var articleTextCache = null;

	function normalizeText(value) {
		return String(value || '').replace(/\s+/g, '').toLowerCase();
	}

	/* 引用还在不在当前正文里（忽略空白与大小写） */
	function quoteStillThere(quote) {
		var map = getTextMap();
		if (!map) return true;
		if (!map.norm) return true;
		return map.norm.indexOf(normalizeText(quote)) !== -1;
	}

	/* 把正文拼成一条「去空白」的字符串，并记住每个字符来自哪个文本节点，
	   这样就能从引用文字反查出它在页面里的位置 */
	var textMapCache = null;

	function getTextMap() {
		var body = document.querySelector('.post-content');
		if (!body) return null;
		if (textMapCache) return textMapCache;

		var walker = document.createTreeWalker(body, NodeFilter.SHOW_TEXT, null);
		var norm = '';
		var positions = [];
		var node;
		while ((node = walker.nextNode())) {
			var value = node.nodeValue || '';
			for (var i = 0; i < value.length; i++) {
				var ch = value.charAt(i);
				if (/\s/.test(ch)) continue;
				norm += ch.toLowerCase();
				positions.push({ node: node, offset: i });
			}
		}
		textMapCache = { norm: norm, positions: positions };
		return textMapCache;
	}

	function clearHighlight() {
		if (window.CSS && CSS.highlights) CSS.highlights.delete('quote-hit');
	}

	var backBtn = null;
	var lastSource = null;

	function ensureBackButton() {
		if (backBtn) return backBtn;
		backBtn = el('button', 'quote-back', '← 返回评论');
		backBtn.type = 'button';
		backBtn.addEventListener('click', function () {
			clearHighlight();
			backBtn.style.display = 'none';
			if (lastSource && lastSource.scrollIntoView) {
				lastSource.scrollIntoView({ behavior: 'smooth', block: 'center' });
			}
		});
		document.body.appendChild(backBtn);
		return backBtn;
	}

	function jumpToQuote(quote, sourceEl) {
		var map = getTextMap();
		if (!map) return;
		var needle = normalizeText(quote);
		if (!needle) return;
		var index = map.norm.indexOf(needle);
		if (index < 0) return;

		var start = map.positions[index];
		var end = map.positions[index + needle.length - 1];
		if (!start || !end) return;

		var range = document.createRange();
		try {
			range.setStart(start.node, start.offset);
			range.setEnd(end.node, end.offset + 1);
		} catch (error) {
			return;
		}

		if (window.CSS && CSS.highlights && window.Highlight) {
			CSS.highlights.set('quote-hit', new Highlight(range));
		}

		var rect = range.getBoundingClientRect();
		var top = rect.top + window.pageYOffset - Math.round(window.innerHeight * 0.3);
		window.scrollTo({ top: Math.max(0, top), behavior: 'smooth' });

		lastSource = sourceEl;
		ensureBackButton().style.display = 'block';
	}

	/* 原文被改过：按引用时记下的段落序号跳过去 */
	var paraHitTimer = null;

	function jumpToPara(index, sourceEl) {
		var body = document.querySelector('.post-content');
		if (!body) return;
		var blocks = body.querySelectorAll('p, h2, h3, h4, blockquote, li');
		var target = blocks[index];
		if (!target) return;

		clearHighlight();
		var previous = document.querySelector('.quote-para-hit');
		if (previous) previous.classList.remove('quote-para-hit');
		target.classList.add('quote-para-hit');
		if (paraHitTimer) window.clearTimeout(paraHitTimer);
		paraHitTimer = window.setTimeout(function () {
			target.classList.remove('quote-para-hit');
		}, 2600);

		var top = target.getBoundingClientRect().top + window.pageYOffset - Math.round(window.innerHeight * 0.3);
		window.scrollTo({ top: Math.max(0, top), behavior: 'smooth' });

		lastSource = sourceEl;
		ensureBackButton().style.display = 'block';
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
			if (block.quote) {
				var found = quoteStillThere(block.quote);
				var hasPara = typeof block.para === 'number' && isFinite(block.para);
				var canJump = found || hasPara;
				var qb = el('div', 'comment-quote-block' + (canJump ? ' is-link' : ''), block.quote);
				if (!found) qb.classList.add('is-gone');

				if (canJump) {
					qb.title = found ? '点击跳到原文' : '原文已修改，点击跳到原位置';
					qb.addEventListener('click', function () {
						if (found) jumpToQuote(block.quote, wrap);
						else jumpToPara(block.para, wrap);
					});
				}
				if (!found) qb.appendChild(el('span', 'comment-quote-badge', '原内容已编辑'));
				wrap.appendChild(qb);
			}
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

	function placePick(text) {
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

	/* 手机上没有可靠的「选完」事件，改成底部固定条 */
	var touchMode = window.matchMedia
		? window.matchMedia('(pointer: coarse)').matches
		: 'ontouchstart' in window;

	var bar = el('div', 'cm-quote-bar');
	bar.style.display = 'none';
	var barLabel = el('span', 'cm-quote-bar-label', '引用选中的文字');
	var barBtn = el('button', 'cm-quote-bar-btn', '引用');
	barBtn.type = 'button';
	bar.appendChild(barLabel);
	bar.appendChild(barBtn);
	document.body.appendChild(bar);

	var pendingQuote = '';
	var pendingPara = null;

	/* 选区所在段落在正文里的序号（用于原文被改后的兜底定位） */
	function paraIndexFromSelection() {
		var body = document.querySelector('.post-content');
		var sel = window.getSelection();
		if (!body || !sel || !sel.anchorNode) return null;
		var node = sel.anchorNode;
		var el = node.nodeType === 1 ? node : node.parentElement;
		if (!el || !body.contains(el)) return null;
		var blocks = body.querySelectorAll('p, h2, h3, h4, blockquote, li');
		for (var i = 0; i < blocks.length; i++) {
			if (blocks[i].contains(el)) return i;
		}
		return null;
	}

	function quoteSelected(text, para) {
		hidePick();
		bar.style.display = 'none';
		window.getSelection().removeAllRanges();
		openComposer(text, false, para);
	}

	barBtn.addEventListener('click', function () {
		if (pendingQuote) quoteSelected(pendingQuote, pendingPara);
	});

	pick.addEventListener('click', function () {
		var para = pick.dataset.para;
		quoteSelected(pick.dataset.text || '', para === undefined ? null : Number(para));
	});

	/* 选区变化后 220ms 再判断，避开拖选过程中的抖动 */
	var selTimer = null;
	document.addEventListener('selectionchange', function () {
		if (selTimer) window.clearTimeout(selTimer);
		selTimer = window.setTimeout(function () {
			var text = selectionText();
			if (!text) {
				hidePick();
				bar.style.display = 'none';
				return;
			}
			pendingQuote = text;
			pendingPara = paraIndexFromSelection();
			if (touchMode) {
				hidePick();
				if (composer && composer.style.display === 'block') {
					bar.style.display = 'none';
				} else {
					barLabel.textContent = '引用 ' + text.length + ' 字';
					bar.style.display = 'flex';
				}
			} else {
				placePick(text);
				pick.dataset.para = pendingPara === null ? '' : String(pendingPara);
			}
		}, 220);
	});

	document.addEventListener('mousedown', function (event) {
		if (event.target !== pick && !bar.contains(event.target)) hidePick();
	});

	if (openBtn) {
		openBtn.addEventListener('click', function () {
			openComposer('', true);
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
