// --- ピック詳細データ関連のグローバル変数 ---
let pickDetailsAllCache = null;

/**
 * "カード一覧" タブの描画関数 (非同期 fetch & 直挿入方式)
 */
function renderCardListTab(data) {
    console.log("[card-list.js] renderCardListTab called");
    const container = document.getElementById('card-list-tab');
    if (!container) return;

    container.innerHTML = `<div id="card-list-content-wrapper"></div>`;
    loadAndShowCardList(CURRENT_CHAR, LANG);
}

/**
 * 指定キャラクター・言語のカードリストHTMLを非同期ロードして挿入する
 */
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

/**
 * ▼詳細 ボタンクリック時にカードピック詳細情報を展開/折りたたむ
 */
async function toggleCardDetail(btnElement) {
    const tr = btnElement.closest('tr');
    if (!tr) return;

    const cardId = btnElement.getAttribute('data-card-id');
    const isJa = (LANG === 'ja');

    // 1. 既に詳細行が存在する場合はトグル表示
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

    // 2. 初回クリック時: pick_details_all.json を読み込み
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

    // 3. データ参照
    const charData = pickDetailsAllCache[CURRENT_CHAR] || {};
    const cardData = charData[cardId];

    const stationNameMap = {
        'Enemy': isJa ? '通常戦闘' : 'Enemy',
        'EliteEnemy': isJa ? 'エリート' : 'Elite',
        'Boss': isJa ? 'ボス' : 'Boss',
        'Shop': isJa ? 'ショップ' : 'Shop',
        'Adventure': isJa ? 'イベント' : 'Event',
        'Entry': isJa ? '初期/入口' : 'Entry',
        'Gap': isJa ? 'スキマ' : 'Gap',
        'Trade': isJa ? '交易' : 'Trade',
        'Unknown': isJa ? 'その他' : 'Other'
    };

    const detailTr = document.createElement('tr');
    detailTr.className = 'detail-row';

    if (!cardData) {
        detailTr.innerHTML = `
            <td colspan="8" class="detail-container">
                <p style="margin: 0; color: #666; padding: 10px;">${isJa ? 'このカードの詳細データはありません。' : 'No detail data available for this card.'}</p>
            </td>
        `;
    } else {
        // メトリクス数値
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
        const totalSkips = (typeof countA === 'number' && typeof countB === 'number') ? (countA - countB) : 0;

        const appLabel = isJa ? `提示のあったラン(対全ラン N=${totalN}): ${runAppRatio}% (${countA}/${totalN})` : `Run Appearance (vs All N=${totalN}): ${runAppRatio}% (${countA}/${totalN})`;
        const fpkLabel = isJa ? `初回ピック率: ${firstPickRatio}% (${countB}/${countA})` : `First Pick Rate: ${firstPickRatio}% (${countB}/${countA})`;
        const avgLabel = isJa ? `平均提示数: ${avgOffered}回` : `Avg. Offered/Run: ${avgOffered}`;

        // 代替カードHTML生成関数
        const buildInsteadListHtml = (instList) => {
            if (!instList || instList.length === 0) {
                return `<li style="font-size: 0.88em; color: #777;">${isJa ? 'なし' : 'None'}</li>`;
            }

            // 合計出現数を算出し割合計算
            const subTotal = instList.reduce((acc, item) => acc + item[3], 0);

            return instList.map(item => {
                let cardName = isJa ? item[1] : item[2];
                const count = item[3];

                if (item[0] === "(スキップ/選択なし)") cardName = isJa ? "(スキップ/選択なし)" : "(Skip/None)";
                if (item[0] === "(ショップ他行動/見送り)") cardName = isJa ? "(ショップ他行動/見送り)" : "(Shop Action/Skip)";

                let ratioStr = '';
                if (subTotal > 0) {
                    ratioStr = ` (${((count / subTotal) * 100).toFixed(1)}%)`;
                }

                return `<li style="font-size: 0.88em; color: #333;">${cardName} (${count}${isJa ? '回' : ' times'}${ratioStr})</li>`;
            }).join('');
        };

        const insteadNonShopHtml = buildInsteadListHtml(cardData.inst_non_shop || cardData.inst);
        const insteadShopHtml = buildInsteadListHtml(cardData.inst_shop);

        // マス内訳
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

                    <!-- 下段: 代替ピック（ショップ以外TOP10） -->
                    <div style="margin-bottom: 10px;">
                        <strong style="display: block; margin-bottom: 4px; font-size: 0.9em; color: #555;">${isJa ? '1回目に見送られた際に代わりに選ばれたカード (ショップ以外 TOP10)' : 'Cards picked instead on 1st skip (Non-Shop TOP10)'}:</strong>
                        <ul style="margin: 0; padding-left: 18px; display: grid; grid-template-columns: repeat(auto-fill, minmax(280px, 1fr)); gap: 2px 16px;">
                            ${insteadNonShopHtml}
                        </ul>
                    </div>

                    <!-- 下段: 代替ピック（ショップTOP10） -->
                    <div>
                        <strong style="display: block; margin-bottom: 4px; font-size: 0.9em; color: #555;">${isJa ? '1回目に見送られた際に代わりに選ばれたカード (ショップ TOP10)' : 'Cards picked instead on 1st skip (Shop TOP10)'}:</strong>
                        <ul style="margin: 0; padding-left: 18px; display: grid; grid-template-columns: repeat(auto-fill, minmax(280px, 1fr)); gap: 2px 16px;">
                            ${insteadShopHtml}
                        </ul>
                    </div>

                </div>
            </td>
        `;
    }

    tr.parentNode.insertBefore(detailTr, tr.nextSibling);
    btnElement.textContent = isJa ? '▲閉じる' : '▲Close';
}

window.toggleCardDetail = toggleCardDetail;