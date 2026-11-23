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

	function setStatus(text, kind) {
		statusEl.textContent = text || '';
		statusEl.className = 'comment-status' + (kind ? ' is-' + kind : '');
	}

	function render(items) {
		listEl.textContent = '';
		if (!items || !items.length) {
			var empty = document.createElement('p');
			empty.className = 'comment-empty';
			empty.textContent = '还没有评论，来说第一句吧。';
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

			var body = document.createElement('div');
			body.className = 'comment-body';
			body.textContent = item.text;

			wrap.appendChild(head);
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
					return { ok: res.ok, status: res.status, data: data };
				});
			})
			.then(function (result) {
				if (!result.ok) {
					setStatus(result.data && result.data.error ? result.data.error : '发表失败', 'error');
					return;
				}
				textEl.value = '';
				answerEl.value = '';
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

	load();
})();
