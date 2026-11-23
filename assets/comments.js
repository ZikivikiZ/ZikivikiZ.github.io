(function () {
	var root = document.getElementById('comments');
	if (!root) return;

	var endpoint = root.getAttribute('data-endpoint');
	if (!endpoint) return;

	var listEl = document.getElementById('comment-list');
	var form = document.getElementById('comment-form');
	var nameEl = document.getElementById('comment-name');
	var textEl = document.getElementById('comment-text');
	var answerEl = document.getElementById('comment-answer');
	var statusEl = document.getElementById('comment-status');
	var submitEl = document.getElementById('comment-submit');

	var quoteBox = document.getElementById('comment-quote');
	var quoteTextEl = document.getElementById('comment-quote-text');
	var quoteClearEl = document.getElementById('comment-quote-clear');

	var adminToggle = document.getElementById('comment-admin-toggle');
	var adminBox = document.getElementById('comment-admin-box');
	var adminTokenEl = document.getElementById('comment-admin-token');
	var adminSave = document.getElementById('comment-admin-save');
	var adminClear = document.getElementById('comment-admin-clear');

	var TOKEN_KEY = 'dsh_comment_admin';
	var token = '';
	var quote = '';
	try {
		token = localStorage.getItem(TOKEN_KEY) || '';
	} catch (error) {
		token = '';
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

	var statusTimer = null;

	function setStatus(text, kind) {
		if (statusTimer) {
			window.clearTimeout(statusTimer);
			statusTimer = null;
		}
		statusEl.textContent = text || '';
		statusEl.className = 'comment-status' + (kind ? ' is-' + kind : '');
		if (text && kind === 'ok') {
			statusTimer = window.setTimeout(function () {
				statusEl.textContent = '';
				statusEl.className = 'comment-status';
				statusTimer = null;
			}, 3500);
		}
	}

	function setQuote(text) {
		quote = text || '';
		if (!quote) {
			quoteBox.style.display = 'none';
			quoteTextEl.textContent = '';
			return;
		}
		quoteTextEl.textContent = quote;
		quoteBox.style.display = 'block';
	}

	function removeItem(id, node) {
		fetch(endpoint + '/comments/' + encodeURIComponent(id), {
			method: 'DELETE',
			headers: { 'x-admin-token': token },
		})
			.then(function (res) {
				if (res.status === 403) {
					token = '';
					try {
						localStorage.removeItem(TOKEN_KEY);
					} catch (error) {}
					throw new Error('管理密码不对');
				}
				if (!res.ok) throw new Error('删除失败');
				node.remove();
			})
			.catch(function (error) {
				setStatus(error.message || '删除失败', 'error');
			});
	}

	function render(items) {
		listEl.textContent = '';
		if (!items || !items.length) {
			var empty = document.createElement('p');
			empty.className = 'comment-empty';

			var strike = document.createElement('span');
			strike.className = 'comment-strike';
			strike.textContent = '弹幕善意引导';
			empty.appendChild(strike);

			empty.appendChild(document.createTextNode('（划掉）'));
			empty.appendChild(document.createElement('br'));
			empty.appendChild(document.createTextNode('感谢你的阅读'));

			listEl.appendChild(empty);
			return;
		}

		items.forEach(function (item) {
			var wrap = document.createElement('div');
			wrap.className = 'comment-item';

			var head = document.createElement('div');
			head.className = 'comment-head';

			var name = document.createElement('span');
			name.className = 'comment-name';
			name.textContent = item.name;

			var time = document.createElement('span');
			time.className = 'comment-time';
			time.textContent = formatTime(item.at);

			head.appendChild(name);
			head.appendChild(time);

			if (token) {
				var del = document.createElement('button');
				del.type = 'button';
				del.className = 'comment-del';
				del.textContent = '删除';
				del.addEventListener('click', function () {
					if (window.confirm('删除这条评论？')) removeItem(item.id, wrap);
				});
				head.appendChild(del);
			}

			wrap.appendChild(head);

			if (item.quote) {
				var q = document.createElement('div');
				q.className = 'comment-quote-block';
				q.textContent = item.quote;
				wrap.appendChild(q);
			}

			var body = document.createElement('div');
			body.className = 'comment-body';
			body.textContent = item.text;

			wrap.appendChild(body);
			listEl.appendChild(wrap);
		});
	}

	function load() {
		fetch(endpoint + '/comments', { headers: { accept: 'application/json' } })
			.then(function (res) {
				if (!res.ok) throw new Error('load failed');
				return res.json();
			})
			.then(render)
			.catch(function () {
				listEl.textContent = '';
				var p = document.createElement('p');
				p.className = 'comment-empty';
				p.textContent = '评论加载失败，刷新重试。';
				listEl.appendChild(p);
			});
	}

	form.addEventListener('submit', function (event) {
		event.preventDefault();
		var payload = {
			name: nameEl.value.trim(),
			text: textEl.value.trim(),
			answer: answerEl.value.trim(),
			quote: quote,
		};
		if (!payload.name || !payload.text || !payload.answer) {
			setStatus('昵称、内容、口令都要填。', 'error');
			return;
		}

		submitEl.disabled = true;
		setStatus('发表中…');

		fetch(endpoint + '/comments', {
			method: 'POST',
			headers: { 'content-type': 'application/json' },
			body: JSON.stringify(payload),
		})
			.then(function (res) {
				return res.json().then(function (data) {
					return { ok: res.ok, data: data };
				});
			})
			.then(function (result) {
				if (!result.ok) {
					setStatus(result.data && result.data.error ? result.data.error : '发表失败', 'error');
					return;
				}
				textEl.value = '';
				answerEl.value = '';
				setQuote('');
				setStatus('已发表。', 'ok');
				load();
			})
			.catch(function () {
				setStatus('网络错误，稍后再试。', 'error');
			})
			.finally(function () {
				submitEl.disabled = false;
			});
	});

	if (quoteClearEl) {
		quoteClearEl.addEventListener('click', function () {
			setQuote('');
		});
	}

	/* 选中正文 → 出现「引用」按钮 */
	var pick = document.createElement('button');
	pick.type = 'button';
	pick.className = 'quote-pick';
	pick.textContent = '引用';
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
		var el = node && (node.nodeType === 1 ? node : node.parentElement);
		if (!el || !el.closest || !el.closest('.post-content')) return '';
		return text.slice(0, 300);
	}

	function placePick() {
		var text = selectionText();
		if (!text) {
			hidePick();
			return;
		}
		var rect = window.getSelection().getRangeAt(0).getBoundingClientRect();
		pick.style.left = Math.max(8, rect.left + window.pageXOffset + rect.width / 2 - 22) + 'px';
		pick.style.top = rect.top + window.pageYOffset - 38 + 'px';
		pick.dataset.text = text;
		pick.style.display = 'block';
	}

	document.addEventListener('mouseup', function () {
		window.setTimeout(placePick, 10);
	});
	document.addEventListener('touchend', function () {
		window.setTimeout(placePick, 260);
	});
	document.addEventListener('mousedown', function (event) {
		if (event.target !== pick) hidePick();
	});

	pick.addEventListener('click', function () {
		setQuote(pick.dataset.text || '');
		hidePick();
		window.getSelection().removeAllRanges();
		setStatus('已引用，写下你的看法吧。', 'ok');
		root.scrollIntoView({ behavior: 'smooth', block: 'start' });
		textEl.focus();
	});

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
			token = value;
			try {
				localStorage.setItem(TOKEN_KEY, value);
			} catch (error) {}
			adminTokenEl.value = '';
			adminBox.style.display = 'none';
			setStatus('管理模式已开启。', 'ok');
			load();
		});
	}

	if (adminClear) {
		adminClear.addEventListener('click', function () {
			token = '';
			try {
				localStorage.removeItem(TOKEN_KEY);
			} catch (error) {}
			adminBox.style.display = 'none';
			setStatus('已退出管理模式。', 'ok');
			load();
		});
	}

	load();
})();
