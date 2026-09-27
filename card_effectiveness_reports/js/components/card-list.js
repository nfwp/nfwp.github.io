// --- ピック詳細データ関連のグローバル変数 ---
let pickDetailsAllCache = null;

function renderCardListTab(data) {
    console.log("[card-list.js] renderCardListTab called");
    const container = document.getElementById('card-list-tab');
    if (!container) return;

    container.innerHTML = `<div id="card-list-content-wrapper"></div>`;
    loadAndShowCardList(CURRENT_CHAR, LANG);
}

async function loadAndShowCardList(character, language) {
    const contentWrapper = document.getElementById('card-list-content-wrapper');
    if (!contentWrapper) return;

    contentWrapper.innerHTML = `<p style="padding: 20px;">${LANG === 'ja' ? '読み込み中...' : 'Loading...'}</p>`;
    const vParam = (typeof DATA_VERSION !== 'undefined' && DATA_VERSION) ? `?v=${DATA_VERSION}` : `?_=${new Date().getTime()}`;
    const filePath = `card_lists/${character}_card_list_${language}.html${vParam}`;

    try {
        const response = await fetch(filePath);
        if (!response.ok) throw new Error(`Network response was not ok: ${response.statusText}`);
        const htmlContent = await response.text();
        contentWrapper.innerHTML = htmlContent;

        contentWrapper.addEventListener('click', (event) => {
            const btn = event.target.closest('.detail-toggle-btn');
            if (btn) toggleCardDetail(btn);
        });
    } catch (error) {
        console.error("Error loading and displaying card list:", error);
        contentWrapper.innerHTML = `<p style="padding: 20px;">${LANG === 'ja' ? 'カード一覧の読み込みに失敗しました。' : 'Failed to load card list.'}</p>`;
    }
}

async function toggleCardDetail(btnElement) {
    const tr = btnElement.closest('tr');
    if (!tr) return;

    const cardId = btnElement.getAttribute('data-card-id');
    const isJa = (LANG === 'ja');

    let nextTr = tr.nextElementSibling;
    if (nextTr && nextTr.classList.contains('detail-row')) {
        if (nextTr.style.display === 'none') {
            nextTr.style.display = 'table-row';
            btnElement.textContent = isJa ? '▲閉じる' : '▲Close';
        } else {
            nextTr.style.display = 'none';
            btnElement.textContent = isJa ? '▼詳細' : '▼Details';
        }
        return;
    }

    if (!pickDetailsAllCache) {
        btnElement.textContent = isJa ? '読込中...' : 'Loading...';
        const vParam = (typeof DATA_VERSION !== 'undefined' && DATA_VERSION) ? `?v=${DATA_VERSION}` : `?_=${new Date().getTime()}`;
        const jsonPath = `card_lists/pick_details_all.json${vParam}`;
        try {
            const response = await fetch(jsonPath);
            if (!response.ok) throw new Error(`Fetch failed status: ${response.status}`);
            pickDetailsAllCache = await response.json();
        } catch (err) {
            console.error("詳細データの読み込みエラー:", err);
            btnElement.textContent = isJa ? '▼詳細' : '▼Details';
            alert(isJa ? '詳細データの読み込みに失敗しました。' : 'Failed to load detail data.');
            return;
        }
    }

    const charData = pickDetailsAllCache[CURRENT_CHAR] || {};
    const cardData = charData[cardId];

    const stationNameMap = {
        'Enemy': isJa ? '通常戦闘' : 'Enemy',
        'EliteEnemy': isJa ? 'エリート' : 'Elite',
        'Boss': isJa ? 'ボス' : 'Boss',
        'Shop': isJa ? 'ショップ' : 'Shop',
        'Adventure': isJa ? 'イベント' : 'Event',
        'Entry': isJa ? '初期/入口' : 'Entry',
        'Gap': isJa ? '隙間' : 'Gap',
        'Trade': isJa ? '交易' : 'Trade',
        'Unknown': isJa ? 'その他' : 'Other'
    };

    // 6つのカテゴリ定義
    const categories = [
        { key: 'enemy_elite', name: isJa ? '1回目の選択 (通常敵・エリート)' : '1st Pick Choice (Enemy/Elite)' },
        { key: 'boss', name: isJa ? '1回目の選択 (ボス)' : '1st Pick Choice (Boss)' },
        { key: 'shop', name: isJa ? '1回目の選択 (ショップ)' : '1st Pick Choice (Shop)' },
        { key: 'adventure', name: isJa ? '1回目の選択 (通常イベント)' : '1st Pick Choice (Event)' },
        { key: 'trade', name: isJa ? '1回目の選択 (交易)' : '1st Pick Choice (Trade)' },
        { key: 'other', name: isJa ? '1回目の選択 (その他)' : '1st Pick Choice (Other)' }
    ];

    const detailTr = document.createElement('tr');
    detailTr.className = 'detail-row';

    if (!cardData) {
        detailTr.innerHTML = `
            <td colspan="8" class="detail-container">
                <p style="margin: 0; color: #666; padding: 10px;">${isJa ? 'このカードの詳細データはありません。' : 'No detail data available for this card.'}</p>
            </td>
        `;
    } else {
        let totalN = 0;
        if (typeof ALL_RUN_DETAILS !== 'undefined' && Array.isArray(ALL_RUN_DETAILS)) {
            const charSearchTag = CURRENT_CHAR ? `${CURRENT_CHAR.slice(0, -1)}_${CURRENT_CHAR.slice(-1)}` : '';
            totalN = ALL_RUN_DETAILS.filter(run => run && run.run_id && run.run_id.includes(charSearchTag)).length;
            if (totalN === 0) totalN = ALL_RUN_DETAILS.length;
        }

        const runAppRatio = cardData.app || 0;
        const firstPickRatio = cardData.fpk || 0;
        const avgOffered = cardData.avg || 0;

        const countA = totalN > 0 ? Math.round((runAppRatio / 100) * totalN) : '?';
        const countB = (typeof countA === 'number') ? Math.round((firstPickRatio / 100) * countA) : '?';

        const appLabel = isJa ? `提示のあったラン(対全ラン N=${totalN}): ${runAppRatio}% (${countA}/${totalN})` : `Run Appearance (vs All N=${totalN}): ${runAppRatio}% (${countA}/${totalN})`;
        const fpkLabel = isJa ? `初回ピック率: ${firstPickRatio}% (${countB}/${countA})` : `First Pick Rate: ${firstPickRatio}% (${countB}/${countA})`;
        const avgLabel = isJa ? `平均提示数: ${avgOffered}回` : `Avg. Offered/Run: ${avgOffered}`;

        // マス内訳(st)から各マスの全提示数をマップ化
        const stationTotalMap = {};
        if (cardData.st) {
            cardData.st.forEach(item => {
                stationTotalMap[item[0]] = item[1];
            });
        }

        // カテゴリ名に対応する全提示数の算出関数
        const getCatTotalOffer = (catKey) => {
            if (catKey === 'enemy_elite') return (stationTotalMap['Enemy'] || 0) + (stationTotalMap['EliteEnemy'] || 0);
            if (catKey === 'boss') return stationTotalMap['Boss'] || 0;
            if (catKey === 'shop') return stationTotalMap['Shop'] || 0;
            if (catKey === 'adventure') return (stationTotalMap['Adventure'] || 0) + (stationTotalMap['Event'] || 0);
            if (catKey === 'trade') return stationTotalMap['Trade'] || 0;
            return stationTotalMap['Unknown'] || 0;
        };

        // 各カテゴリごとのリスト表示HTML構築
        let choicesHtmlSections = '';
        const choicesData = cardData.choices || {};

        categories.forEach(cat => {
            const catObj = choicesData[cat.key];
            if (!catObj) return;

            // 新旧データの構造差分吸収（オブジェクト形式 {items: [...], first_count: X} / 配列形式 [...]）
            const itemList = Array.isArray(catObj) ? catObj : catObj.items;
            if (!itemList || itemList.length === 0) return;

            const firstCount = Array.isArray(catObj) ? itemList.reduce((acc, item) => acc + item[3], 0) : (catObj.first_count || 0);
            const totalOffer = getCatTotalOffer(cat.key);

            const itemsHtml = itemList.map(item => {
                const choiceId = item[0];
                let cardName = isJa ? item[1] : item[2];
                const count = item[3];

                if (choiceId === "(スキップ/選択なし)") cardName = isJa ? "(スキップ/選択なし)" : "(Skip/None)";
                if (choiceId === "(ショップ他行動/見送り)") cardName = isJa ? "(ショップ他行動/見送り)" : "(Shop Action/Skip)";

                const ratioStr = firstCount > 0 ? ` (${((count / firstCount) * 100).toFixed(1)}%)` : '';

                // 対象カード自体の場合は太字＋下線で強調
                const isTargetCard = (choiceId === cardId);
                const displayName = isTargetCard ? `<strong style="color: #000; font-weight: bold; text-decoration: underline;">${cardName}</strong>` : cardName;

                return `<li style="font-size: 0.88em; color: #333;">${displayName} (${count}${isJa ? '回' : ' times'}${ratioStr})</li>`;
            }).join('');

            // 見出し横に [初回提示: XX回 / 全提示: YY回] を追加
            const headerCountStr = isJa
                ? `<span style="font-size: 0.85em; color: #777; font-weight: normal; margin-left: 6px;">[初回提示: ${firstCount}回 / 全提示: ${totalOffer}回]</span>`
                : `<span style="font-size: 0.85em; color: #777; font-weight: normal; margin-left: 6px;">[1st: ${firstCount} / Total: ${totalOffer}]</span>`;

            choicesHtmlSections += `
                <div style="margin-bottom: 10px;">
                    <strong style="display: block; margin-bottom: 4px; font-size: 0.9em; color: #555;">${cat.name}${headerCountStr}:</strong>
                    <ul style="margin: 0; padding-left: 18px; display: grid; grid-template-columns: repeat(auto-fill, minmax(280px, 1fr)); gap: 2px 16px;">
                        ${itemsHtml}
                    </ul>
                </div>
            `;
        });

        if (!choicesHtmlSections) {
            choicesHtmlSections = `<p style="font-size: 0.88em; color: #777;">${isJa ? '選択データなし' : 'No choice data available.'}</p>`;
        }

        // マス内訳バッジ
        let stationHtml = '';
        if (cardData.st && cardData.st.length > 0) {
            stationHtml = cardData.st.map(item => {
                const rawType = item[0];
                const typeName = stationNameMap[rawType] || rawType;
                return `<span style="display:inline-block; margin-right:6px; margin-bottom:4px; padding:2px 8px; background:#eef2f5; border:1px solid #dcdfe6; border-radius:4px; font-size:0.85em;">${typeName}: ${item[1]}${isJa ? '回' : ''} (${item[2]}%)</span>`;
            }).join(' ');
        } else {
            stationHtml = isJa ? 'なし' : 'None';
        }

        detailTr.innerHTML = `
            <td colspan="8" class="detail-container" style="padding: 0;">
                <div style="padding: 12px 16px; background-color: #fafafa; border-top: 1px solid #eaeaea; border-bottom: 2px solid #e0e0e0; text-align: left;">

                    <!-- 上段: 主要メトリクス -->
                    <div style="display: flex; gap: 20px; flex-wrap: wrap; margin-bottom: 10px; border-bottom: 1px dashed #ddd; padding-bottom: 8px; font-size: 0.92em;">
                        <div><strong>${appLabel}</strong></div>
                        <div><strong>${fpkLabel}</strong></div>
                        <div><strong>${avgLabel}</strong></div>
                    </div>

                    <!-- 中段: 提示マス内訳 -->
                    <div style="margin-bottom: 10px;">
                        <strong style="display: block; margin-bottom: 4px; font-size: 0.9em; color: #555;">${isJa ? '提示マス内訳' : 'Station Breakdown'}:</strong>
                        <div>${stationHtml}</div>
                    </div>

                    <!-- 下段: マス別 1回目の選択 -->
                    ${choicesHtmlSections}

                </div>
            </td>
        `;
    }

    tr.parentNode.insertBefore(detailTr, tr.nextSibling);
    btnElement.textContent = isJa ? '▲閉じる' : '▲Close';
}

window.toggleCardDetail = toggleCardDetail;