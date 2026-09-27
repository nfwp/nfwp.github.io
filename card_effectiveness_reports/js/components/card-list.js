// --- ピック詳細データ関連のグローバル変数 ---
let pickDetailsAllCache = null;

/**
 * "カード一覧" タブの描画関数 (非同期 fetch & 直挿入方式)
 * @param {Object} data - script.js から渡される ALL_DATA
 */
function renderCardListTab(data) {
    console.log("[card-list.js] renderCardListTab called");
    const container = document.getElementById('card-list-tab');
    if (!container) {
        console.error("Card list tab container not found!");
        return;
    }

    container.innerHTML = `<div id="card-list-content-wrapper"></div>`;
    loadAndShowCardList(CURRENT_CHAR, LANG);
}

/**
 * 指定キャラクター・言語のカードリストHTMLを非同期ロードして挿入する
 */
async function loadAndShowCardList(character, language) {
    console.log(`[card-list.js] loadAndShowCardList for ${character} (${language})`);
    const contentWrapper = document.getElementById('card-list-content-wrapper');
    if (!contentWrapper) return;

    contentWrapper.innerHTML = `<p style="padding: 20px;">${LANG === 'ja' ? '読み込み中...' : 'Loading...'}</p>`;

    const vParam = (typeof DATA_VERSION !== 'undefined' && DATA_VERSION) ? `?v=${DATA_VERSION}` : `?_=${new Date().getTime()}`;
    const filePath = `card_lists/${character}_card_list_${language}.html${vParam}`;

    try {
        const response = await fetch(filePath);
        if (!response.ok) {
            throw new Error(`Network response was not ok: ${response.statusText}`);
        }
        const htmlContent = await response.text();

        contentWrapper.innerHTML = htmlContent;

        // イベント委譲（クリックイベントの監視）
        contentWrapper.addEventListener('click', (event) => {
            const btn = event.target.closest('.detail-toggle-btn');
            if (btn) {
                console.log("[card-list.js] Detail button clicked!", btn);
                toggleCardDetail(btn);
            }
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

    // マス名の日本語マッピング
    const stationNameMap = {
        'Enemy': isJa ? '通常戦闘' : 'Enemy',
        'EliteEnemy': isJa ? 'エリート' : 'Elite',
        'Boss': isJa ? 'ボス' : 'Boss',
        'Shop': isJa ? 'ショップ' : 'Shop',
        'Adventure': isJa ? 'イベント' : 'Event',
        'Entry': isJa ? '初期/入口' : 'Entry',
        'Unknown': isJa ? 'その他' : 'Other'
    };

    // 4. 詳細行を作成して挿入
    const detailTr = document.createElement('tr');
    detailTr.className = 'detail-row';

    if (!cardData) {
        detailTr.innerHTML = `
            <td colspan="8" class="detail-container">
                <p style="margin: 0; color: #666; padding: 10px;">${isJa ? 'このカードの詳細データはありません。' : 'No detail data available for this card.'}</p>
            </td>
        `;
    } else {
        // --- メトリクス用実数値 (N, A, B) の計算 ---
        // 全ラン数 N（特定キャラクターの該当難易度等の総ラン数）
        // ALL_RUN_DETAILS から現在キャラクター (例: CirnoA -> Cirno_A) のラン数を取得（取得不能時は 0）
        let totalN = 0;
        if (typeof ALL_RUN_DETAILS !== 'undefined' && Array.isArray(ALL_RUN_DETAILS)) {
            const charSearchTag = CURRENT_CHAR ? `${CURRENT_CHAR.slice(0, -1)}_${CURRENT_CHAR.slice(-1)}` : '';
            totalN = ALL_RUN_DETAILS.filter(run => run && run.run_id && run.run_id.includes(charSearchTag)).length;
            // フィルタ結果が0件の場合は全体件数フォールバック
            if (totalN === 0) totalN = ALL_RUN_DETAILS.length;
        }

        const runAppRatio = cardData.app || 0;
        const firstPickRatio = cardData.fpk || 0;
        const avgOffered = cardData.avg || 0;

        // 実数 A (提示があったラン数) と B (初回ピックしたラン数) の算定
        const countA = totalN > 0 ? Math.round((runAppRatio / 100) * totalN) : '?';
        const countB = (typeof countA === 'number') ? Math.round((firstPickRatio / 100) * countA) : '?';

        // 表示ラベルの構築
        const appLabel = isJa
            ? `提示のあったラン(対全ラン N=${totalN}): ${runAppRatio}% (${countA}/${totalN})`
            : `Run Appearance (vs All N=${totalN}): ${runAppRatio}% (${countA}/${totalN})`;

        const fpkLabel = isJa
            ? `初回ピック率: ${firstPickRatio}% (${countB}/${countA})`
            : `First Pick Rate: ${firstPickRatio}% (${countB}/${countA})`;

        const avgLabel = isJa
            ? `平均提示数: ${avgOffered}回`
            : `Avg. Offered/Run: ${avgOffered}`;

        // TOP10 代替カードのHTML作成 (言語に応じて名前を1つ選択し、2列グリッドで配置、パーセントのみ付与)
        let insteadHtml = '';
        if (cardData.inst && cardData.inst.length > 0) {
            insteadHtml = cardData.inst.map(item => {
                // item: [inst_id, name_ja, name_en, count]
                const cardName = isJa ? item[1] : item[2];
                const count = item[3];
                // 総見送り回数(A - B)から割合を算出
                let ratioStr = '';
                if (typeof countA === 'number' && typeof countB === 'number' && (countA - countB) > 0) {
                    const ratio = ((count / (countA - countB)) * 100).toFixed(1);
                    ratioStr = ` (${ratio}%)`;
                }
                return `<li style="font-size: 0.88em; color: #333;">${cardName} (${count}${isJa ? '回' : ' times'}${ratioStr})</li>`;
            }).join('');
        } else {
            insteadHtml = `<li style="font-size: 0.88em; color: #777;">${isJa ? 'なし' : 'None'}</li>`;
        }

        // マス内訳のHTML作成
        let stationHtml = '';
        if (cardData.st && cardData.st.length > 0) {
            stationHtml = cardData.st.map(item => {
                const rawType = item[0];
                const typeName = stationNameMap[rawType] || rawType;
                const count = item[1];
                const ratio = item[2];
                return `<span style="display:inline-block; margin-right:6px; margin-bottom:4px; padding:2px 8px; background:#eef2f5; border:1px solid #dcdfe6; border-radius:4px; font-size:0.85em;">${typeName}: ${count}${isJa ? '回' : ''} (${ratio}%)</span>`;
            }).join(' ');
        } else {
            stationHtml = isJa ? 'なし' : 'None';
        }

        detailTr.innerHTML = `
            <td colspan="8" class="detail-container" style="padding: 0;">
                <div style="padding: 12px 16px; background-color: #fafafa; border-top: 1px solid #eaeaea; border-bottom: 2px solid #e0e0e0; text-align: left;">

                    <!-- 上段: 主要メトリクスバッジ -->
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

                    <!-- 下段: 代替ピックTOP10 (2列グリッドで横幅を有効活用) -->
                    <div>
                        <strong style="display: block; margin-bottom: 4px; font-size: 0.9em; color: #555;">${isJa ? '1回目に見送られた際に代わりに選ばれたカード (TOP10)' : 'Cards picked instead on 1st skip (TOP10)'}:</strong>
                        <ul style="margin: 0; padding-left: 18px; display: grid; grid-template-columns: repeat(auto-fill, minmax(280px, 1fr)); gap: 2px 16px;">
                            ${insteadHtml}
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