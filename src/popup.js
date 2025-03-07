function updateStatus(message) {
	const statusElement = document.getElementById('status');
	statusElement.textContent = message;
}

document.getElementById('generateTemplate').addEventListener('click', async () => {
	updateStatus('処理を開始します...');
	console.log('処理を開始します...');

	try {
		const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });

		try {
			const result = await chrome.tabs.sendMessage(tab.id, { action: 'generateTemplate' });

			if (result.success) {
				updateStatus('プロンプトが生成されました！');
				console.log('プロンプトが生成されました！');

				generatedTemplate = result.template;

				const templateContentElement = document.getElementById('templateContent');
				templateContentElement.textContent = generatedTemplate;
				templateContentElement.style.display = 'block';

				document.getElementById('copyButton').disabled = false;
				document.getElementById('copyButton').hidden = false;
			} else {
				updateStatus(`エラー: ${result.error}`);
				console.log(`エラー: ${result.error}`);
			}
		} catch (error) {
			updateStatus('この拡張機能はsubmissionを見ているときのみ有効です');
			console.log('この拡張機能はsubmissionを見ているときのみ有効です');
			await chrome.scripting.executeScript({
				target: { tabId: tab.id },
				files: ['content.js']
			});

			const result = await chrome.tabs.sendMessage(tab.id, { action: 'generateTemplate' });

			if (result.success) {
				updateStatus('プロンプトが生成されました！');

				generatedTemplate = result.template;

				const templateContentElement = document.getElementById('templateContent');
				templateContentElement.textContent = generatedTemplate;
				templateContentElement.style.display = 'block';

				document.getElementById('copyButton').disabled = false;
				document.getElementById('copyButton').hidden = false;
			} else {
				updateStatus(`エラー: ${result.error}`);
			}
		}
	} catch (error) {
		updateStatus(`エラー: ${error.message}`);
	}
});

document.getElementById('copyButton').addEventListener('click', async () => {
	try {
		await navigator.clipboard.writeText(generatedTemplate);
		updateStatus('プロンプトをクリップボードにコピーしました！');
	} catch (error) {
		updateStatus(`コピーに失敗しました: ${error.message}`);
	}
});

chrome.runtime.onMessage.addListener((message) => {
	if (message.action === 'updateStatus') {
		updateStatus(message.message);
	}
});
