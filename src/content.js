console.log('初期化完了')

async function loadExternalScripts() {

	console.log('Turndown.jsをロード');
	if (!window.TurndownService) {
		const turndownScript = document.createElement('script');
		turndownScript.src = chrome.runtime.getURL('turndown.min.js');
		document.head.appendChild(turndownScript);
		await new Promise(resolve => turndownScript.onload = resolve);
	}

	console.log('Turndown.jsロード後:', window.TurndownService);
}

function getSubmittedCode() {
	const codeElement = document.querySelector('pre[id^="for_copy"]');
	if (!codeElement) {
		throw new Error('提出コードが見つかりません');
	}
	return codeElement.textContent;
}

function getProblemUrl() {
	const links = Array.from(document.querySelectorAll('a')).filter(link => {
		const href = link.getAttribute('href');
		return href && href.includes('/contests/') && href.includes('/tasks/');
	});

	const urls = links.map(link => link.getAttribute('href'));
	if (!links) {
		throw new Error('問題リンクが見つかりません');
	}
	return urls;
}

function getContestNameFromUrl(url) {
	const urlString = Array.isArray(url) ? url[0] : url;

	console.log('処理するURL:', urlString);

	const contestPattern = /\/contests\/([^\/]+)/;
	const match = urlString.match(contestPattern);

	if (match && match[1]) {
		console.log('抽出されたコンテスト名:', match[1]);
		return { contestName: match[1] }; // 例: abc108, arc193 など
	}

	throw new Error('URLからコンテスト名を抽出できませんでした');
}


function getContestAndProblemName() {
	const thElements = Array.from(document.querySelectorAll('tr th'));
	const problemTh = thElements.find(th => th.textContent.includes('問題') || th.textContent.includes('Task'));
	if (!problemTh) {
		throw new Error('問題リンクが見つかりません');
	}

	const parentTr = problemTh.closest('tr');
	const linkElement = parentTr.querySelector('td a');

	const linkText = linkElement.textContent.trim();
	const match = linkText.match(/(.+)\s+-\s+(.+)/);

	if (!match) {
		throw new Error('コンテスト名と問題名の解析に失敗しました');
	}

	return {
		problemAlphabet: match[1].trim(),
		problemName: match[2].trim()
	};
}

function getTextBeforeProblemStatement(element) {
	const allTextNodes = [];
	const walker = document.createTreeWalker(
		element,
		NodeFilter.SHOW_TEXT,
		null,
		false
	);

	let node;
	let foundProblemStatement = false;
	let result = '';

	while ((node = walker.nextNode())) {
		const text = node.textContent;
		if (text.includes('problem statement')) {
			const parts = text.split('problem statement');
			result += parts[0];
			foundProblemStatement = true;
			break;
		} else {
			result += text;
		}
	}

	return result;
}


async function getProblemStatement(problemUrl) {
	try {
		const response = await fetch(problemUrl);
		const html = await response.text();

		const parser = new DOMParser();
		const doc = parser.parseFromString(html, 'text/html');

		const allSections = Array.from(doc.querySelectorAll('.lang-ja'));

		if (!allSections || allSections.length === 0) {
			throw new Error('問題文セクションが見つかりません');
		}

		console.log(`${allSections.length}個のセクションが見つかりました`);

		const container = document.createElement('div');

		allSections.forEach(section => {
			container.appendChild(section.cloneNode(true));
		});

		const turndownService = new TurndownService({
			headingStyle: 'atx',
			codeBlockStyle: 'fenced'
		});

		return turndownService.turndown(container.innerHTML);

	} catch (error) {
		throw new Error(`問題文の取得に失敗しました: ${error.message}`);
	}
}


async function generateTemplate() {
	try {
		console.log('外部スクリプトを読み込み中...');
		await loadExternalScripts();

		console.log('提出コードを取得中...');
		const code = getSubmittedCode();

		console.log('問題URLを取得中...');
		const problemUrl = getProblemUrl();

		console.log('コンテスト名を取得中...');
		const { contestName } = getContestNameFromUrl(problemUrl);

		console.log('問題名を取得中...');
		const { problemAlphabet, problemName } = getContestAndProblemName();

		console.log('問題文を取得中...');
		const problemStatement = await getProblemStatement(problemUrl);

		console.log('プロンプトを生成中...');
		const template = `${contestName}の${problemAlphabet}問題(${problemName})の問題文をもとに、一緒に与えられる提出コードを分かりやすく解説してください。

### 解説してほしいコード
\`\`\`
${code}
\`\`\`

${problemStatement}`;

		console.log('クリップボードにコピー中...');
		console.log(template);

		console.log('完了！');
		return { success: true, template: template };
	} catch (error) {
		console.log(`エラー: ${error.message}`);
		return { success: false, error: error.message };
	}
}

chrome.runtime.onMessage.addListener(function (request, sender, sendResponse) {
	console.log("メッセージ受信:", request);

	if (request.action === 'generateTemplate') {
		generateTemplate().then(result => {
			console.log("生成結果:", result);
			sendResponse(result);
		}).catch(error => {
			console.error("生成エラー:", error);
			sendResponse({ success: false, error: error.message });
		});
		return true;
	} else if (request.action === 'updateStatus') {
		document.getElementById('status').textContent = request.message;
		sendResponse({ success: true });
		return true;
	}
});


Element.prototype.contains = function (text) {
	return this.textContent.includes(text);
};
