/**
 * "カード一覧"タブが最初にクリックされたときに呼び出される。
 * コンテンツを非同期で読み込み、ページに直接挿入する。
 */
function renderCardListTab(data) {
    const container = document.getElementById('card-list-tab');
    if (!container) {
        console.error("Card list tab container not found!");
        return;
    }

    if (!data || !data.metadata) {
        console.error("renderCardListTab: Invalid data object received.", data);
        container.innerHTML = "<p>カード一覧のデータの読み込みに失敗しました。</p>";
        return;
    }

    // iframeとコントロールを廃止し、コンテンツを挿入するためのラッパーdivだけを設置
    container.innerHTML = `<div id="card-list-content-wrapper"></div>`;

    // 現在のキャラクターとグローバル言語設定を元に、表示するカードリストを決定
    const currentCharacter = data.metadata.character;
    const currentLang = LANG; // グローバル変数LANGを想定

    // 非同期でコンテンツを読み込んで表示する関数を呼び出す
    loadAndShowCardList(currentCharacter, currentLang);
}

/**
 * 指定されたキャラクターと言語のカードリストHTMLを非同期で取得し、
 * ページに直接挿入する。
 * @param {string} character - 表示するキャラクター名
 * @param {string} language - 表示する言語 ('ja' or 'en')
 */
async function loadAndShowCardList(character, language) {
    const contentWrapper = document.getElementById('card-list-content-wrapper');
    if (!contentWrapper) {
        console.error("Card list content wrapper not found!");
        return;
    }

    // 読み込み中のメッセージを表示
    contentWrapper.innerHTML = `<p>読み込み中...</p>`;

    const filePath = `card_lists/${character}_card_list_${language}.html`;

    try {
        // fetch APIを使用してHTMLファイルの内容を取得
        const response = await fetch(`${filePath}?_=${new Date().getTime()}`);
        if (!response.ok) {
            throw new Error(`Network response was not ok: ${response.statusText}`);
        }
        const htmlContent = await response.text();

        // 取得したHTMLをラッパーdivに直接挿入
        contentWrapper.innerHTML = htmlContent;

    } catch (error) {
        console.error("Error loading and displaying card list:", error);
        contentWrapper.innerHTML = `<p>カード一覧の読み込みに失敗しました。ファイルが見つからないか、読み込み中にエラーが発生しました。</p>`;
    }
}