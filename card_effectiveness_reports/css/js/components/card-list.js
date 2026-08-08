function renderCardListTab(data) {
    const container = document.getElementById('card-list-tab');
    if (!container) {
        console.error("Card list tab container not found!");
        return;
    }

    if (!data || !data.all_available_characters || !data.metadata) {
        console.error("renderCardListTab: Invalid data object received.", data);
        container.innerHTML = "<p>カード一覧のデータの読み込みに失敗しました。</p>";
        return;
    }

    const allCharacters = data.all_available_characters;
    const currentCharacter = data.metadata.character;
    const C = UI_TEXT.common;

    const charOptionsHtml = allCharacters.map(char =>
        `<option value="${char}" ${char === currentCharacter ? 'selected' : ''}>${char}</option>`
    ).join('');

    container.innerHTML = `
        <div class="card-list-controls" style="background-color: #fff; padding: 15px; border-radius: 8px; margin-bottom: 20px; border: 1px solid #ddd; display: flex; align-items: center; flex-wrap: wrap;">
            <label for="card-list-char-select" style="margin-right: 10px; font-weight: bold;">${C.character}:</label>
            <select id="card-list-char-select" onchange="showCardList()" style="margin-right: 20px; font-size: 14px; padding: 5px;">
                ${charOptionsHtml}
            </select>
            <label style="margin-left: 20px; font-weight: bold;">${C.language}:</label>
            <input type="radio" id="lang-ja" name="card-list-lang" value="ja" ${LANG === 'ja' ? 'checked' : ''} onchange="showCardList()" style="margin-left: 10px;">
            <label for="lang-ja">${C.japanese}</label>
            <input type="radio" id="lang-en" name="card-list-lang" value="en" ${LANG === 'en' ? 'checked' : ''} onchange="showCardList()" style="margin-left: 10px;">
            <label for="lang-en">${C.english}</label>
        </div>
        <iframe id="card-list-iframe" style="width: 100%; height: 85vh; border: 1px solid #ccc; border-radius: 8px;" frameborder="0"></iframe>
    `;

    showCardList();
}

function showCardList() {
    const charSelect = document.getElementById('card-list-char-select');
    const langSelect = document.querySelector('input[name="card-list-lang"]:checked');
    const iframe = document.getElementById('card-list-iframe');

    if (charSelect && langSelect && iframe) {
        const selectedChar = charSelect.value;
        const selectedLang = langSelect.value;
        const filePath = `card_lists/${selectedChar}_card_list_${selectedLang}.html`;

        iframe.src = `${filePath}?_=${new Date().getTime()}`;
    }
}
