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

        await ensurePickDetailsCache();
        applyCardIcons();
        setupCardFilters();
        setupTableSorting();

        contentWrapper.addEventListener('click', (event) => {
            const btn = event.target.closest('.detail-toggle-btn');
            if (btn) toggleCardDetail(btn);
        });
    } catch (error) {
        console.error("Error loading and displaying card list:", error);
        contentWrapper.innerHTML = `<p style="padding: 20px;">${LANG === 'ja' ? 'カード一覧の読み込みに失敗しました。' : 'Failed to load card list.'}</p>`;
    }
}

async function ensurePickDetailsCache() {
    if (pickDetailsAllCache) return;
    const vParam = (typeof DATA_VERSION !== 'undefined' && DATA_VERSION) ? `?v=${DATA_VERSION}` : `?_=${new Date().getTime()}`;
    const jsonPath = `card_lists/pick_details_all.json${vParam}`;
    try {
        const response = await fetch(jsonPath);
        if (response.ok) {
            pickDetailsAllCache = await response.json();
        }
    } catch (err) {
        console.error("Failed to pre-fetch pick_details_all.json:", err);
    }
}

// アイコン動的付与ロジック
function applyCardIcons() {
    if (!pickDetailsAllCache) return;
    const charData = pickDetailsAllCache[CURRENT_CHAR] || {};
    const iconSpans = document.querySelectorAll('.card-pick-icon');

    iconSpans.forEach(span => {
        const cardId = span.getAttribute('data-card-id');
        const finalAdoption = parseFloat(span.getAttribute('data-adoption') || '0');

        const tr = span.closest('tr');
        const typeCellText = tr ? tr.children[5]?.textContent.trim() : '';
        const isTool = (typeCellText === 'Tool' || typeCellText === '道具' || typeCellText === '道具(Tool)');

        const cData = charData[cardId];
        if (!cData) return;

        const appRatio = (cData.app || 0) / 100;
        const fpkRatio = (cData.fpk || 0) / 100;
        const pFirst = appRatio * fpkRatio;

        const isJa = (LANG === 'ja');
        let iconHtml = '';
        const isBroom = !isTool && (pFirst > 0.01 && (finalAdoption / pFirst) < 0.80);
        const isCrown = (!isBroom && fpkRatio >= 0.50 && finalAdoption >= 0.10);
        const isStar = (!isBroom && !isCrown && fpkRatio >= 0.30 && finalAdoption >= 0.10);

        if (isBroom) {
            const titleText = isJa
                ? `🧹 整頓・削除対象 (序盤ピック実績 ${(pFirst*100).toFixed(1)}% -> 最終残存 ${(finalAdoption*100).toFixed(1)}%)`
                : `🧹 Removable/Transient (Early Pick ${(pFirst*100).toFixed(1)}% -> Final ${(finalAdoption*100).toFixed(1)}%)`;
            iconHtml = `<span title="${titleText}" style="cursor:help; margin: 0 4px; font-size: 1.1em;">🧹</span>`;
        } else if (isCrown) {
            const titleText = isJa
                ? `👑 必須級 (初回ピック率 ${(fpkRatio*100).toFixed(1)}% / 最終採用 ${(finalAdoption*100).toFixed(1)}%)`
                : `👑 Must Pick (First Pick Rate ${(fpkRatio*100).toFixed(1)}%)`;
            iconHtml = `<span title="${titleText}" style="cursor:help; margin: 0 4px; font-size: 1.1em;">👑</span>`;
        } else if (isStar) {
            const titleText = isJa
                ? `⭐ 推奨 (初回ピック率 ${(fpkRatio*100).toFixed(1)}% / 最終採用 ${(finalAdoption*100).toFixed(1)}%)`
                : `⭐ High Priority (First Pick Rate ${(fpkRatio*100).toFixed(1)}%)`;
            iconHtml = `<span title="${titleText}" style="cursor:help; margin: 0 4px; font-size: 1.1em;">⭐</span>`;
        }

        span.innerHTML = iconHtml;
    });
}

// --- テーブルヘッダーのソート機能（矢印アイコン付き） ---
function setupTableSorting() {
    const table = document.querySelector('#card-list-content-wrapper table');
    if (!table) return;

    const headers = table.querySelectorAll('th');
    headers.forEach((th, index) => {
        if (!th.querySelector('.sort-indicator')) {
            const indicator = document.createElement('span');
            indicator.className = 'sort-indicator';
            indicator.style.cssText = 'margin-left: 5px; font-size: 0.85em; color: #64748b; font-weight: normal;';
            indicator.textContent = ' ↕';
            th.appendChild(indicator);
        }

        th.style.cursor = 'pointer';
        th.style.userSelect = 'none';
        th.title = LANG === 'ja' ? 'クリックして並び替え' : 'Click to sort';

        th.addEventListener('mouseenter', () => { th.style.backgroundColor = '#f1f5f9'; });
        th.addEventListener('mouseleave', () => { th.style.backgroundColor = ''; });

        th.addEventListener('click', () => {
            sortTable(table, index);
        });
    });
}

function sortTable(table, colIndex) {
    const rows = Array.from(table.querySelectorAll('tr[data-card-id]'));

    const lastCol = table.getAttribute('data-sort-col');
    const lastDir = table.getAttribute('data-sort-dir') || 'asc';

    let currentDirection = 'asc';
    if (lastCol == colIndex) {
        currentDirection = (lastDir === 'asc') ? 'desc' : 'asc';
    }

    table.setAttribute('data-sort-dir', currentDirection);
    table.setAttribute('data-sort-col', colIndex);

    const headers = table.querySelectorAll('th');
    headers.forEach((th, idx) => {
        const indicator = th.querySelector('.sort-indicator');
        if (indicator) {
            if (idx === colIndex) {
                indicator.textContent = currentDirection === 'asc' ? ' ▲' : ' ▼';
                indicator.style.color = '#2563eb';
                indicator.style.fontWeight = 'bold';
            } else {
                indicator.textContent = ' ↕';
                indicator.style.color = '#64748b';
                indicator.style.fontWeight = 'normal';
            }
        }
    });

    rows.sort((rowA, rowB) => {
        const cellA = rowA.children[colIndex]?.textContent.trim() || '';
        const cellB = rowB.children[colIndex]?.textContent.trim() || '';

        const valA = parseFloat(cellA.replace('%', ''));
        const valB = parseFloat(cellB.replace('%', ''));

        if (!isNaN(valA) && !isNaN(valB)) {
            return currentDirection === 'asc' ? valA - valB : valB - valA;
        } else {
            return currentDirection === 'asc' ? cellA.localeCompare(cellB) : cellB.localeCompare(cellA);
        }
    });

    rows.forEach(row => {
        const nextRow = row.nextElementSibling;
        const hasDetail = nextRow && nextRow.classList.contains('detail-row');

        table.appendChild(row);
        if (hasDetail) {
            table.appendChild(nextRow);
        }
    });
}

// --- 拡張版フィルターUIの挿入とイベント設定 ---
function setupCardFilters() {
    const contentWrapper = document.getElementById('card-list-content-wrapper');
    if (!contentWrapper || document.getElementById('card-filter-bar')) return;

    const filterBar = document.createElement('div');
    filterBar.id = 'card-filter-bar';
    filterBar.style.cssText = 'margin: 15px 0; padding: 12px 14px; background: #f8fafc; border: 1px solid #e2e8f0; border-radius: 6px; display: flex; gap: 12px; align-items: center; flex-wrap: wrap; font-size: 0.9em;';

    const isJa = (LANG === 'ja');
    filterBar.innerHTML = `
        <div style="display: flex; align-items: center; gap: 8px; width: 100%; flex-wrap: wrap;">
            <strong>${isJa ? '表示フィルター:' : 'Filter:'}</strong>
            <div style="display: flex; gap: 4px; flex-wrap: wrap;" id="filter-btn-group">
                <button class="filter-btn active" data-filter="all" style="padding: 3px 8px; cursor: pointer; border: 1px solid #cbd5e1; background: #3b82f6; color: #fff; border-radius: 4px;">${isJa ? 'すべて' : 'All'}</button>
                <button class="filter-btn" data-filter="crown" style="padding: 3px 8px; cursor: pointer; border: 1px solid #cbd5e1; background: #fff; border-radius: 4px; color: #334155;">👑 ${isJa ? '必須級' : 'Must Pick'}</button>
                <button class="filter-btn" data-filter="star" style="padding: 3px 8px; cursor: pointer; border: 1px solid #cbd5e1; background: #fff; border-radius: 4px; color: #334155;">⭐ ${isJa ? '推奨' : 'Priority'}</button>
                <button class="filter-btn" data-filter="broom" style="padding: 3px 8px; cursor: pointer; border: 1px solid #cbd5e1; background: #fff; border-radius: 4px; color: #334155;">🧹 ${isJa ? '整頓対象' : 'Removable'}</button>
            </div>
        </div>
        <div style="display: flex; gap: 12px; align-items: center; flex-wrap: wrap; width: 100%; border-top: 1px dashed #e2e8f0; padding-top: 8px; margin-top: 2px;">
            <div style="display: flex; gap: 4px; align-items: center;">
                <span>${isJa ? '初回ピック率:' : '1st Pick:'}</span>
                <select id="min-fpk-select" style="padding: 2px 6px; border: 1px solid #cbd5e1; border-radius: 4px;">
                    <option value="0">${isJa ? '指定なし' : 'Any'}</option>
                    <option value="10">10% ${isJa ? '以上' : '+'}</option>
                    <option value="20">20% ${isJa ? '以上' : '+'}</option>
                    <option value="30">30% ${isJa ? '以上' : '+'}</option>
                    <option value="40">40% ${isJa ? '以上' : '+'}</option>
                    <option value="50">50% ${isJa ? '以上' : '+'}</option>
                    <option value="60">60% ${isJa ? '以上' : '+'}</option>
                    <option value="70">70% ${isJa ? '以上' : '+'}</option>
                </select>
            </div>
            <div style="display: flex; gap: 4px; align-items: center;">
                <span>${isJa ? '最終採用率:' : 'Final Adop:'}</span>
                <select id="min-final-select" style="padding: 2px 6px; border: 1px solid #cbd5e1; border-radius: 4px;">
                    <option value="0">${isJa ? '指定なし' : 'Any'}</option>
                    <option value="lt10">${isJa ? '10% 未満' : '< 10%'}</option>
                    <option value="10">10% ${isJa ? '以上' : '+'}</option>
                    <option value="20">20% ${isJa ? '以上' : '+'}</option>
                    <option value="30">30% ${isJa ? '以上' : '+'}</option>
                    <option value="40">40% ${isJa ? '以上' : '+'}</option>
                    <option value="50">50% ${isJa ? '以上' : '+'}</option>
                </select>
            </div>
            <div style="display: flex; gap: 4px; align-items: center;">
                <span>${isJa ? '採用ギャップ:' : 'Adoption Gap:'}</span>
                <select id="gap-select" style="padding: 2px 6px; border: 1px solid #cbd5e1; border-radius: 4px;">
                    <option value="all">${isJa ? '指定なし' : 'Any'}</option>
                    <option value="ge1.2">${isJa ? '1.2倍以上 (後から採用)' : '>= 1.2x (Late-picked)'}</option>
                    <option value="mid">${isJa ? '0.8倍 〜 1.2倍 (安定)' : '0.8x - 1.2x (Stable)'}</option>
                    <option value="lt0.8">${isJa ? '0.8倍 未満 (減少)' : '< 0.8x (Declining)'}</option>
                </select>
            </div>
            <div style="display: flex; gap: 4px; align-items: center;">
                <span>${isJa ? '強化率:' : 'Upgrade:'}</span>
                <select id="upgrade-select" style="padding: 2px 6px; border: 1px solid #cbd5e1; border-radius: 4px;">
                    <option value="0">${isJa ? '指定なし' : 'Any'}</option>
                    <option value="lt20">${isJa ? '20% 未満' : '< 20%'}</option>
                    <option value="20">20% ${isJa ? '以上' : '+'}</option>
                    <option value="40">40% ${isJa ? '以上' : '+'}</option>
                    <option value="60">60% ${isJa ? '以上' : '+'}</option>
                    <option value="80">80% ${isJa ? '以上' : '+'}</option>
                </select>
            </div>
            <div style="display: flex; gap: 4px; align-items: center;">
                <span>${isJa ? 'レアリティ:' : 'Rarity:'}</span>
                <select id="rarity-select" style="padding: 2px 6px; border: 1px solid #cbd5e1; border-radius: 4px;">
                    <option value="all">${isJa ? 'すべて' : 'All'}</option>
                    <option value="${isJa ? 'コモン' : 'Com'}">${isJa ? 'コモン' : 'Common'}</option>
                    <option value="${isJa ? 'アンコ' : 'Unco'}">${isJa ? 'アンコモン' : 'Uncommon'}</option>
                    <option value="${isJa ? 'レア' : 'Rare'}">${isJa ? 'レア' : 'Rare'}</option>
                </select>
            </div>
            <div style="display: flex; gap: 4px; align-items: center;">
                <span>${isJa ? 'タイプ:' : 'Type:'}</span>
                <select id="type-select" style="padding: 2px 6px; border: 1px solid #cbd5e1; border-radius: 4px;">
                    <option value="all">${isJa ? 'すべて' : 'All'}</option>
                    <option value="${isJa ? '攻撃' : 'Atk'}">${isJa ? '攻撃' : 'Attack'}</option>
                    <option value="${isJa ? '防御' : 'Def'}">${isJa ? '防御' : 'Defense'}</option>
                    <option value="${isJa ? 'スキル' : 'Skl'}">${isJa ? 'スキル' : 'Skill'}</option>
                    <option value="${isJa ? '能力' : 'Abl'}">${isJa ? '能力' : 'Ability'}</option>
                    <option value="${isJa ? 'パートナー' : 'Frd'}">${isJa ? 'パートナー' : 'Friend'}</option>
                    <option value="${isJa ? '道具' : 'Tool'}">${isJa ? '道具' : 'Tool'}</option>
                </select>
            </div>
        </div>
        <div style="width: 100%; font-size: 0.85em; color: #64748b; border-top: 1px solid #e2e8f0; padding-top: 6px; margin-top: 2px;">
            ${isJa ? '※採用ギャップは初期カードに対しては正しく機能しません。' : '※Adoption Gap does not function correctly for starting cards.'}
        </div>
    `;

    const table = contentWrapper.querySelector('table');
    if (table) {
        table.parentNode.insertBefore(filterBar, table);
    }

    // 複数選択ボタンのイベント
    filterBar.addEventListener('click', (e) => {
        if (!e.target.classList.contains('filter-btn')) return;
        const btn = e.target;
        const filterVal = btn.getAttribute('data-filter');
        const allBtn = filterBar.querySelector('.filter-btn[data-filter="all"]');

        if (filterVal === 'all') {
            filterBar.querySelectorAll('.filter-btn').forEach(b => {
                b.style.background = '#fff';
                b.style.color = '#334155';
                b.classList.remove('active');
            });
            allBtn.style.background = '#3b82f6';
            allBtn.style.color = '#fff';
            allBtn.classList.add('active');
        } else {
            allBtn.style.background = '#fff';
            allBtn.style.color = '#334155';
            allBtn.classList.remove('active');

            if (btn.classList.contains('active')) {
                btn.style.background = '#fff';
                btn.style.color = '#334155';
                btn.classList.remove('active');

                const activeCount = filterBar.querySelectorAll('.filter-btn.active').length;
                if (activeCount === 0) {
                    allBtn.style.background = '#3b82f6';
                    allBtn.style.color = '#fff';
                    allBtn.classList.add('active');
                }
            } else {
                btn.style.background = '#3b82f6';
                btn.style.color = '#fff';
                btn.classList.add('active');
            }
        }
        applyFilterLogic();
    });

    // 各種セレクトボックスの変更イベント
    filterBar.querySelector('#min-fpk-select')?.addEventListener('change', applyFilterLogic);
    filterBar.querySelector('#min-final-select')?.addEventListener('change', applyFilterLogic);
    filterBar.querySelector('#gap-select')?.addEventListener('change', applyFilterLogic);
    filterBar.querySelector('#upgrade-select')?.addEventListener('change', applyFilterLogic);
    filterBar.querySelector('#rarity-select')?.addEventListener('change', applyFilterLogic);
    filterBar.querySelector('#type-select')?.addEventListener('change', applyFilterLogic);
}

// 拡張版絞り込みロジック
function applyFilterLogic() {
    const activeButtons = document.querySelectorAll('#card-filter-bar .filter-btn.active');
    const selectedFilters = Array.from(activeButtons).map(b => b.getAttribute('data-filter'));
    const isAllSelected = selectedFilters.includes('all');

    const minFpk = parseFloat(document.querySelector('#card-filter-bar #min-fpk-select')?.value || '0');
    const finalSelectVal = document.querySelector('#card-filter-bar #min-final-select')?.value || '0';
    const gapSelectVal = document.querySelector('#card-filter-bar #gap-select')?.value || 'all';
    const upgradeSelectVal = document.querySelector('#card-filter-bar #upgrade-select')?.value || '0';
    const selectedRarity = document.querySelector('#card-filter-bar #rarity-select')?.value || 'all';
    const selectedType = document.querySelector('#card-filter-bar #type-select')?.value || 'all';

    const rows = document.querySelectorAll('tr[data-card-id]');
    const charData = (pickDetailsAllCache && pickDetailsAllCache[CURRENT_CHAR]) || {};

    rows.forEach(row => {
        const cardId = row.getAttribute('data-card-id');
        const cData = charData[cardId];

        let matchIcon = true;
        let matchFpk = true;
        let matchFinal = true;
        let matchGap = true;
        let matchUpgrade = true;
        let matchRarity = true;
        let matchType = true;

        const finalAdoption = parseFloat(row.querySelector('.card-pick-icon')?.getAttribute('data-adoption') || '0');
        const upgradeRateText = row.children[3]?.textContent.trim().replace('%', '') || '0';
        const upgradeRateVal = parseFloat(upgradeRateText) || 0;

        const rarityText = row.children[4]?.textContent.trim() || '';
        const typeText = row.children[5]?.textContent.trim() || '';

        if (selectedRarity !== 'all' && !rarityText.includes(selectedRarity)) matchRarity = false;
        if (selectedType !== 'all' && !typeText.includes(selectedType)) matchType = false;

        if (upgradeSelectVal === 'lt20') {
            matchUpgrade = (upgradeRateVal < 20);
        } else if (parseFloat(upgradeSelectVal) > 0) {
            matchUpgrade = (upgradeRateVal >= parseFloat(upgradeSelectVal));
        }

        if (cData) {
            const appRatio = (cData.app || 0) / 100;
            const fpkRatio = (cData.fpk || 0) / 100;
            const pFirst = appRatio * fpkRatio;

            let gapRatio = 0;
            if (pFirst > 0.001) {
                gapRatio = finalAdoption / pFirst;
            }

            if (gapSelectVal === 'ge1.2') {
                matchGap = (gapRatio >= 1.2);
            } else if (gapSelectVal === 'mid') {
                matchGap = (gapRatio >= 0.8 && gapRatio < 1.2);
            } else if (gapSelectVal === 'lt0.8') {
                matchGap = (gapRatio < 0.8 && pFirst > 0.001);
            }

            const isTool = (typeText === 'Tool' || typeText === '道具' || typeText === '道具(Tool)');

            // フィルター側と完全に同じ条件に統一
            const isBroom = !isTool && (pFirst > 0.001 && (finalAdoption / pFirst) < 0.80);
            const isCrown = (!isBroom && fpkRatio >= 0.50 && finalAdoption >= 0.10);
            const isStar = (!isBroom && !isCrown && fpkRatio >= 0.30 && finalAdoption >= 0.10);

            if (!isAllSelected) {
                let matchedOne = false;
                if (selectedFilters.includes('crown') && isCrown) matchedOne = true;
                if (selectedFilters.includes('star') && isStar) matchedOne = true;
                if (selectedFilters.includes('broom') && isBroom) matchedOne = true;
                matchIcon = matchedOne;
            }

            if (minFpk > 0) {
                matchFpk = (fpkRatio * 100) >= minFpk;
            }
            if (finalSelectVal === 'lt10') {
                matchFinal = (finalAdoption * 100) < 10;
            } else if (parseFloat(finalSelectVal) > 0) {
                matchFinal = (finalAdoption * 100) >= parseFloat(finalSelectVal);
            }
        } else {
            if (!isAllSelected || minFpk > 0 || finalSelectVal !== '0' || gapSelectVal !== 'all') {
                matchIcon = false;
                matchFpk = false;
                matchFinal = false;
                matchGap = false;
            }
        }

        if (matchIcon && matchFpk && matchFinal && matchGap && matchUpgrade && matchRarity && matchType) {
            row.style.display = '';
        } else {
            row.style.display = 'none';
        }
    });
}


async function toggleCardDetail(btnElement) {
    const tr = btnElement.closest('tr');
    if (!tr) return;

    const cardId = btnElement.getAttribute('data-card-id');
    const isJa = (LANG === 'ja');

    const iconSpan = tr.querySelector('.card-pick-icon');
    const finalAdoption = parseFloat(iconSpan?.getAttribute('data-adoption') || '0');

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
        await ensurePickDetailsCache();
        if (!pickDetailsAllCache) {
            btnElement.textContent = isJa ? '▼詳細' : '▼Details';
            alert(isJa ? '詳細データの読み込みに失敗しました。' : 'Failed to load detail data.');
            return;
        }
        applyCardIcons();
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

        const pFirst = (runAppRatio / 100) * (firstPickRatio / 100);
        let gapFactorText = '-';
        let gapColor = '#333';
        if (pFirst > 0.001) {
            const gapVal = finalAdoption / pFirst;
            gapFactorText = `${gapVal.toFixed(2)}x`;
            if (gapVal >= 1.2) gapColor = '#2563eb';
            else if (gapVal < 0.8) gapColor = '#dc2626';
        }

        const appLabel = isJa ? `提示のあったラン(対全ラン N=${totalN}): ${runAppRatio}% (${countA}/${totalN})` : `Run Appearance (vs All N=${totalN}): ${runAppRatio}% (${countA}/${totalN})`;
        const fpkLabel = isJa ? `初回ピック率: ${firstPickRatio}% (${countB}/${countA})` : `First Pick Rate: ${firstPickRatio}% (${countB}/${countA})`;
        const avgLabel = isJa ? `平均提示数: ${avgOffered}回` : `Avg. Offered/Run: ${avgOffered}`;
        const gapLabel = isJa ? `採用ギャップ係数: <span style="color: ${gapColor}; font-weight: bold;">${gapFactorText}</span>` : `Adoption Gap: <span style="color: ${gapColor}; font-weight: bold;">${gapFactorText}</span>`;

        const stationTotalMap = {};
        if (cardData.st) {
            cardData.st.forEach(item => {
                stationTotalMap[item[0]] = item[1];
            });
        }

        const getCatTotalOffer = (catKey) => {
            if (catKey === 'enemy_elite') return (stationTotalMap['Enemy'] || 0) + (stationTotalMap['EliteEnemy'] || 0);
            if (catKey === 'boss') return stationTotalMap['Boss'] || 0;
            if (catKey === 'shop') return stationTotalMap['Shop'] || 0;
            if (catKey === 'adventure') return (stationTotalMap['Adventure'] || 0) + (stationTotalMap['Event'] || 0);
            if (catKey === 'trade') return stationTotalMap['Trade'] || 0;
            return stationTotalMap['Unknown'] || 0;
        };

        let choicesHtmlSections = '';
        const choicesData = cardData.choices || {};

        categories.forEach(cat => {
            const catObj = choicesData[cat.key];
            if (!catObj) return;

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
                const isTargetCard = (choiceId === cardId);
                const displayName = isTargetCard ? `<strong style="color: #000; font-weight: bold; text-decoration: underline;">${cardName}</strong>` : cardName;

                return `<li style="font-size: 0.88em; color: #333;">${displayName} (${count}${isJa ? '回' : ' times'}${ratioStr})</li>`;
            }).join('');

            const headerCountStr = isJa
                ? `<span style="font-size: 0.85em; color: #777; font-weight: normal; margin-left: 6px;">[初回遭遇マス: ${firstCount}回 / 提示マス数: ${totalOffer}回]</span>`
                : `<span style="font-size: 0.85em; color: #777; font-weight: normal; margin-left: 6px;">[1st Encounter: ${firstCount} / Total Stations: ${totalOffer}]</span>`;

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
                    <div style="display: flex; gap: 20px; flex-wrap: wrap; margin-bottom: 10px; border-bottom: 1px dashed #ddd; padding-bottom: 8px; font-size: 0.92em;">
                        <div><strong>${appLabel}</strong></div>
                        <div><strong>${fpkLabel}</strong></div>
                        <div><strong>${avgLabel}</strong></div>
                        <div><strong>${gapLabel}</strong></div>
                    </div>
                    <div style="margin-bottom: 10px;">
                        <strong style="display: block; margin-bottom: 4px; font-size: 0.9em; color: #555;">${isJa ? '提示マス内訳' : 'Station Breakdown'}:</strong>
                        <div>${stationHtml}</div>
                    </div>
                    ${choicesHtmlSections}
                </div>
            </td>
        `;
    }

    tr.parentNode.insertBefore(detailTr, tr.nextSibling);
    btnElement.textContent = isJa ? '▲閉じる' : '▲Close';
}

window.toggleCardDetail = toggleCardDetail;