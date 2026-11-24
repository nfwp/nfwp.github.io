// run-finder.js
// --- 定数 ---
const bossIconMap = {
    "Reimu": "./img/boss/Reimu.avif",
    "Marisa": "./img/boss/Marisa.avif",
    "Sakuya": "./img/boss/Sakuya.avif",
    "Cirno": "./img/boss/Cirno.avif",
    "Koishi": "./img/boss/Koishi.avif",
    "Long": "./img/boss/Long.avif",
    "Tianzi": "./img/boss/Tianzi.avif",
    "Yuyuko": "./img/boss/Yuyuko.avif",
    "Remilia": "./img/boss/Remilia.avif",
    "Sanae": "./img/boss/Sanae.avif",
    "Junko": "./img/boss/Junko.avif",
    "Seija": "./img/boss/Seija.avif"
};


/**
 * "Run Finder"タブのコンテンツを生成・描画する
 * この関数は script.dev.js の switchTab から呼び出される
 */
function renderRunFinderTab() {
    const tabContent = document.getElementById('run-finder-tab');
    if (!tabContent) {
        console.error("Run Finder tab content area not found.");
        return;
    }
    if (tabContent.innerHTML.trim() !== '') return; // 描画済みなら中断

    // UIテキストを定義
    const texts = UI_TEXT.run_finder;

    // ステーションインデックスからAct-Level文字列への逆引きマップを作成
    const stationIndexToActLevel = {};
    if (STATION_MAP_GLOBAL) {
        for (const key in STATION_MAP_GLOBAL) {
            const index = STATION_MAP_GLOBAL[key];
            stationIndexToActLevel[index] = key.replace('-', ', Lvl '); // '1-12' -> '1, Lvl 12'
        }
    }

    // オートコンプリート用のデータリストを作成
    const allItems = new Set();
    if (ALL_DATA.lookup_tables) {
        const cardNameKey = (LANG === 'ja') ? 'JA' : 'EN';
        for (const cardId in ALL_DATA.lookup_tables.cards) {
            const cardData = ALL_DATA.lookup_tables.cards[cardId];
            if (cardData && cardData[cardNameKey]) allItems.add(cardData[cardNameKey]);
        }
        const exhibitNameKey = (LANG === 'ja') ? 'name' : 'name_en';
        for (const exhibitId in ALL_DATA.lookup_tables.exhibits) {
            const exhibitData = ALL_DATA.lookup_tables.exhibits[exhibitId];
            if (exhibitData && exhibitData[exhibitNameKey]) allItems.add(exhibitData[exhibitNameKey]);
        }
    }
    const datalistOptions = Array.from(allItems).sort().map(item => `<option value="${item}"></option>`).join('');

    // キャラクター選択のプルダウンを作成
    let charOptions = `<option value="All">All</option>`;
    if (ALL_DATA && ALL_DATA.all_available_characters) {
        ALL_DATA.all_available_characters.forEach(char => {
            const selected = (char === CURRENT_CHAR) ? 'selected' : '';
            charOptions += `<option value="${char}" ${selected}>${char}</option>`;
        });
    }

    // UIのHTMLを定義
    const finderHtml = `
        <div class="run-finder-container">
            <h3>${texts.title}</h3>
            <p class="analysis-note">${texts.data_scope_warning}${texts.chart_notice ? `<br>${texts.chart_notice}` : ''}${texts.summary_notice ? `<br>${texts.summary_notice}` : ''}</p>
            <div class="finder-controls">
                <div class="control-group-row">
                    <div class="control-group">
                        <label for="character-select">${texts.char_label}</label>
                        <select id="character-select">${charOptions}</select>
                    </div>
                    <div class="control-group">
                        <label for="act-filter">${texts.act_label}</label>
                        <select id="act-filter">
                            <option value="">${texts.no_specify}</option>
                            <option value="1">1</option>
                            <option value="2">2</option>
                            <option value="3">3</option>
                            <option value="4">4</option>
                        </select>
                    </div>
                    <div class="control-group">
                        <label for="level-filter">${texts.level_label}</label>
                        <input type="number" id="level-filter" min="1" max="16" placeholder="1-16" style="width: 80px;">
                    </div>
                    <div class="control-group">
                        <label for="deck-size-operator">${texts.deck_size_label}</label>
                        <select id="deck-size-operator">
                            <option value="any">${texts.deck_size_any}</option>
                            <option value="lte">${texts.deck_size_lte}</option>
                            <option value="gte">${texts.deck_size_gte}</option>
                        </select>
                        <input type="number" id="deck-size-value" min="0" placeholder="${texts.deck_size_placeholder}" style="width: 80px;">
                    </div>
                    <div class="control-group">
                        <label for="player-name-filter">${texts.player_label}</label>
                        <input type="text" id="player-name-filter" list="player-name-datalist" placeholder="${texts.no_specify}" style="width: 140px;">
                    </div>
                    <div class="control-group" title="${texts.include_ns_tooltip || ''}">
                        <label style="display:flex;align-items:center;gap:5px;white-space:nowrap;cursor:pointer;">
                            <input type="checkbox" id="include-ns-checkbox"> ${texts.include_ns_label || 'Include non-stat runs'}
                        </label>
                    </div>
                </div>
                <div class="control-section" style="flex-grow: 1;">
                    <h4>${texts.items_label}</h4>
                    <div class="control-group-input item-input-row">
                        <input list="all-items-datalist" id="item-input" placeholder="${texts.item_placeholder}">
                        <button id="add-item-include-btn" class="add-btn" title="${texts.add_include_tooltip}">${texts.add_include_btn}</button>
                        <button id="add-item-exclude-btn" class="add-btn add-btn-ex" title="${texts.add_exclude_tooltip}">${texts.add_exclude_btn}</button>
                    </div>
                    <div class="search-logic" id="item-logic-row" style="display:none; margin-top: 8px;">
                        <input type="radio" id="include-logic-and" name="include-logic" value="AND" checked>
                        <label for="include-logic-and">${texts.logic_and}</label>
                        <input type="radio" id="include-logic-or" name="include-logic" value="OR">
                        <label for="include-logic-or">${texts.logic_or}</label>
                    </div>
                    <div class="rf-bar-pair">
                        <div class="rf-bar-group" id="item-in-group">
                            <div class="rf-bar-cap" id="item-in-cap" style="display:none;">${texts.item_in_cap}:</div>
                            <div id="include-items-list" class="item-tag-list"></div>
                        </div>
                        <div class="rf-bar-group" id="item-ex-group">
                            <div class="rf-bar-cap" id="item-ex-cap" style="display:none;">${texts.item_ex_cap}:</div>
                            <div id="exclude-items-list" class="item-tag-list"></div>
                        </div>
                    </div>
                </div>
                <div class="boss-collapsible-section">
                    <div id="enemy-filter-toggle" class="boss-filter-toggle-button">${texts.enemy_filter_toggle_expand}</div>
                    <div id="enemy-filter-content" class="boss-filter-content collapsed">
                        <div class="control-section" style="flex-grow: 1;">
                            <h4>${texts.enemies_label}</h4>
                            <div class="control-group-input enemy-input-row">
                                <input list="enemy-groups-datalist" id="enemy-input" placeholder="${texts.enemy_placeholder}">
                                <button id="add-enemy-include-btn" class="add-btn" title="${texts.add_include_tooltip || ''}">${texts.add_include_btn}</button>
                                <button id="add-enemy-exclude-btn" class="add-btn add-btn-ex" title="${texts.add_exclude_tooltip || ''}">${texts.add_exclude_btn}</button>
                            </div>
                            <div class="search-logic" id="enemy-logic-row" style="display:none; margin-top: 8px;">
                                <label><input type="radio" name="enemy-logic" value="AND" checked> ${texts.logic_and}</label>
                                <label><input type="radio" name="enemy-logic" value="OR"> ${texts.logic_or}</label>
                            </div>
                            <div class="rf-bar-pair">
                                <div class="rf-bar-group" id="enemy-in-group">
                                    <div class="rf-bar-cap" id="enemy-in-cap" style="display:none;">${texts.enemy_in_cap}:</div>
                                    <div class="item-tag-list" id="enemy-in-list"></div>
                                </div>
                                <div class="rf-bar-group" id="enemy-ex-group">
                                    <div class="rf-bar-cap" id="enemy-ex-cap" style="display:none;">${texts.enemy_ex_cap}:</div>
                                    <div class="item-tag-list" id="enemy-ex-list"></div>
                                </div>
                            </div>
                            <div style="margin-top: 8px;">
                                <label style="cursor:pointer;"><input type="checkbox" id="enc-at-checkbox"> ${texts.enc_at_label || ''}</label>
                                <div class="rf-mana-note">${texts.enc_at_hint || ''}</div>
                            </div>
                        </div>
                    </div>
                </div>
                <div class="boss-collapsible-section">
                    <div id="route-filter-toggle" class="boss-filter-toggle-button">${texts.route_filter_toggle_expand || 'ルート条件フィルターを開く ▼'}</div>
                    <div id="route-filter-content" class="boss-filter-content collapsed">
                        <div class="control-section" style="flex-grow: 1;">
                            <h4>${texts.route_cond_label || 'ルート条件'}</h4>
                            <span class="rf-mana-note">${texts.route_cond_hint || ''}</span>
                            <div id="route-cond-rows" class="rf-route-rows"></div>
                            <div style="margin-top: 4px; display: flex; flex-wrap: wrap; gap: 6px; align-items: center;">
                                <button id="add-route-cond-btn" type="button" class="add-btn">${texts.route_cond_add || '+'}</button>
                            </div>
                            <span class="rf-mana-note">${texts.route_cond_note || ''}</span>
                        </div>
                    </div>
                </div>
                <div class="control-group" style="flex-basis: 100%;">
                    <label title="${texts.mana_hint || ''}">${texts.mana_label}</label>
                    <div class="rf-mana-filters">
                        <label class="rf-mana-cond" title="${(texts.mana_names || {}).W || 'W'}">🟡≥<input type="number" min="0" max="9" value="0" data-m="W"></label>
                        <label class="rf-mana-cond" title="${(texts.mana_names || {}).U || 'U'}">🔵≥<input type="number" min="0" max="9" value="0" data-m="U"></label>
                        <label class="rf-mana-cond" title="${(texts.mana_names || {}).B || 'B'}">🟣≥<input type="number" min="0" max="9" value="0" data-m="B"></label>
                        <label class="rf-mana-cond" title="${(texts.mana_names || {}).R || 'R'}">🔴≥<input type="number" min="0" max="9" value="0" data-m="R"></label>
                        <label class="rf-mana-cond" title="${(texts.mana_names || {}).G || 'G'}">🟢≥<input type="number" min="0" max="9" value="0" data-m="G"></label>
                        <label class="rf-mana-cond" title="${(texts.mana_names || {}).P || 'P'}">🌈≥<input type="number" min="0" max="9" value="0" data-m="P"></label>
                        <label class="rf-mana-cond" title="${(texts.mana_names || {}).C || 'C'}">🔘≥<input type="number" min="0" max="9" value="0" data-m="C"></label>
                        <label class="rf-mana-cond" title="${(texts.mana_names || {}).A || 'A'}">❓≥<input type="number" min="0" max="9" value="0" data-m="A"></label>
                        <span class="rf-mana-note">${texts.mana_any || ''}</span>
                    </div>
                </div>
                <div class="control-group" style="flex-basis: 100%;">
                    <label><input type="checkbox" id="timeline-search-toggle"> ${texts.timeline_search_lbl || '道中取得を含む'}</label>
                    <span class="rf-mana-note">${texts.timeline_search_hint || 'OFF = 最終デッキに含むランのみ検索'}</span>
                </div>
                <button id="run-search-button" class="primary-search-btn">${texts.search_btn}</button>

                <div id="column-toggle-container" class="column-toggle-container" style="display: none;">
                    <h4>${texts.show_columns_label}</h4>
                        <div class="toggle-options">
                            <label><input type="checkbox" class="column-toggle-checkbox" data-col="version"> ${texts.header_version}</label>
                            <label><input type="checkbox" class="column-toggle-checkbox" data-col="character" checked> ${texts.header_character}</label>
                            <label><input type="checkbox" class="column-toggle-checkbox" data-col="deck_size" checked> ${texts.header_deck_size}</label>
                            <label><input type="checkbox" class="column-toggle-checkbox" data-col="mana"> ${texts.header_mana || 'Mana'}</label>
                            <label><input type="checkbox" class="column-toggle-checkbox" data-col="player_name" checked> ${texts.header_player_name}</label>
                            <span style="border-left: 1px solid #ccc; margin: 0 5px;"></span>
                            <label><input type="checkbox" class="column-toggle-checkbox" data-col="act1" checked> ${texts.toggle_act1}</label>
                            <label><input type="checkbox" class="column-toggle-checkbox" data-col="act2" checked> ${texts.toggle_act2}</label>
                            <label><input type="checkbox" class="column-toggle-checkbox" data-col="act3" checked> ${texts.toggle_act3}</label>

                        </div>
                </div>

            </div>
            <div id="run-finder-results" style="margin-top: 20px;">
                <p>${texts.initial_prompt}</p>
            </div>
            <!-- レイジーロード中の進捗表示 (P-04) -->
            <div id="rf-data-status" style="display: none; margin: 8px 0; font-size: 0.9em; color: #475569;"></div>
        </div>
        <datalist id="all-items-datalist">${datalistOptions}</datalist>
        <datalist id="player-name-datalist"></datalist>
        <datalist id="enemy-groups-datalist"></datalist>
    `;

    tabContent.innerHTML = `<div class="analysis-section">${finderHtml}</div>`;

    // 終了時マナ基盤キャッシュを先回りでロード (検索条件・表示列で使用)
    ensureManaMapLoaded();

    // UIのイベントリスナーを設定
    document.getElementById('run-search-button').addEventListener('click', performAdvancedSearch);

    // P-19: ルート条件ブロック (追加ボタン・行削除の委譲)
    const addRouteBtn = document.getElementById('add-route-cond-btn');
    if (addRouteBtn) addRouteBtn.addEventListener('click', () => rfAddRouteCondRow());
    const routeRowsHost = document.getElementById('route-cond-rows');
    if (routeRowsHost) routeRowsHost.addEventListener('click', (ev) => {
        const del = ev.target.closest('.rf-route-del');
        if (del) { const r = del.closest('.rf-route-row'); if (r) r.remove(); }
    });

    const setupTagInput = (inputId, btnId, listId) => {
        const input = document.getElementById(inputId);
        const button = document.getElementById(btnId);
        const addItem = () => {
            const value = input.value.trim();
            if (value) addItemToSelection(value, listId);
            input.value = '';
            input.focus();
        };
        button.addEventListener('click', addItem);
        input.addEventListener('keydown', (e) => {
            if (e.key === 'Enter') {
                e.preventDefault();
                addItem();
            }
        });
    };

    // カード・展示品: 1入力 + 「含むに追加 / 含まないに追加」の2ボタン (Enter は含むに追加)
    const itemInput = document.getElementById('item-input');
    const addItemBy = (mode) => () => {
        const value = itemInput.value.trim();
        if (value) addItemTag(value, mode);
        itemInput.value = '';
        itemInput.focus();
    };
    document.getElementById('add-item-include-btn').addEventListener('click', addItemBy('in'));
    document.getElementById('add-item-exclude-btn').addEventListener('click', addItemBy('ex'));
    itemInput.addEventListener('keydown', (e) => { if (e.key === 'Enter') { e.preventDefault(); addItemBy('in')(); } });

    // --- 敵グループフィルター (開閉 + タグ入力 + 選択グリッド。候補は hard_fights.json ロード後に充填) ---
    const enemyToggleBtn = document.getElementById('enemy-filter-toggle');
    const enemyContent = document.getElementById('enemy-filter-content');
    if (enemyToggleBtn && enemyContent) {
        enemyToggleBtn.addEventListener('click', () => {
            const isCollapsed = enemyContent.classList.toggle('collapsed');
            enemyToggleBtn.textContent = isCollapsed ? texts.enemy_filter_toggle_expand : texts.enemy_filter_toggle_collapse;
            if (!isCollapsed) loadHardFights().then(() => rfPopulateEnemyDatalist());   // 開いたときに候補を用意
        });
    }
    // --- ルート条件フィルター (開閉のみ。collapsed でも行 DOM は保持されるため検索時の収集に影響しない) ---
    const routeToggleBtn = document.getElementById('route-filter-toggle');
    const routeContent = document.getElementById('route-filter-content');
    if (routeToggleBtn && routeContent) {
        routeToggleBtn.addEventListener('click', () => {
            const isCollapsed = routeContent.classList.toggle('collapsed');
            routeToggleBtn.textContent = isCollapsed ? texts.route_filter_toggle_expand : texts.route_filter_toggle_collapse;
        });
    }
    // 敵グループ: 1入力 + 「含むに追加 / 含まないに追加」の2ボタン (Enter は含むに追加)
    const enemyInput = document.getElementById('enemy-input');
    const addEnemyBy = (mode) => () => {
        const value = enemyInput.value.trim();
        if (value) addEnemyTag(value, mode);
        enemyInput.value = '';
        enemyInput.focus();
    };
    document.getElementById('add-enemy-include-btn').addEventListener('click', addEnemyBy('in'));
    document.getElementById('add-enemy-exclude-btn').addEventListener('click', addEnemyBy('ex'));
    enemyInput.addEventListener('keydown', (e) => { if (e.key === 'Enter') { e.preventDefault(); addEnemyBy('in')(); } });
    // 敵名候補は hard_fights.json (5.4MB) 必要なので、入力欄に触れたときだけロードする
    enemyInput.addEventListener('focus', () => { loadHardFights().then(() => rfPopulateEnemyDatalist()); });


    // ツールチップ用のHTML要素をページに追加
    const tooltipElement = document.createElement('div');
    tooltipElement.id = 'deck-tooltip';
    tooltipElement.className = 'deck-tooltip';
    tooltipElement.style.display = 'none';
    document.body.appendChild(tooltipElement);

    // ツールチップ用のスタイルを追加
    const styleElement = document.createElement('style');
    styleElement.textContent = `
        .deck-tooltip {
            position: absolute;
            z-index: 1010; /* 他の要素より手前に表示 */
            background-color: #2c3e50;
            color: #ecf0f1;
            border: 1px solid #34495e;
            border-radius: 5px;
            padding: 10px;
            box-shadow: 0 4px 8px rgba(0,0,0,0.3);
            max-width: 450px;
            pointer-events: none; /* ツールチップ自体がマウスイベントを邪魔しないように */
            font-size: 0.9em;
            transition: opacity 0.1s ease-in-out;
        }
        .deck-tooltip-title {
            font-weight: bold;
            color: #1abc9c;
            margin-bottom: 5px;
            border-bottom: 1px solid #34495e;
            padding-bottom: 5px;
        }
        .deck-tooltip-list {
            list-style-type: none;
            padding: 0;
            margin: 0;
            max-height: 500px;
            overflow-y: auto;
            display: flex;
            flex-wrap: wrap;
            gap: 0 15px; /* 縦の隙間は0, 横の隙間は15px */
        }
        .deck-tooltip-list li {
            padding: 2px 0;
            width: calc(50% - 15px); /* 2列表示 */
        }
        /* --- 終了時マナ基盤 (2026-11-15 / タイトル直下に配置) --- */
        .deck-tooltip-mana {
            margin: -2px 0 8px;
            font-size: 0.95em;
            color: #dfe6ee;
        }
        .deck-tooltip-mana .mana-emoji-rf {
            font-size: 1.05em;
        }
        /* --- 苦戦戦闘セクション (デッキ一覧の下、1列) --- */
        .deck-tooltip-title-hf {
            margin-top: 10px;
        }
        .deck-tooltip-list-hf {
            display: block; /* 1列表示 (苦戦行は長めなので) */
            max-height: 220px;
            overflow-y: auto;
        }
        .deck-tooltip-list-hf li {
            width: 100%;
            padding: 1px 0;
        }
        /* 5b: マスの戦闘ステータス (💗/⚡️/💰) — ツールチップ内のマナ数字も薄色に (黒数字は暗背景で見えない) */
        .deck-tooltip .rf-fight-status { color: #f8fafc; }
        .deck-tooltip .rf-mg { color: #dfe6ee; }
    `;



    document.head.appendChild(styleElement);



    let tooltipDirection = 'right'; // ツールチップの表示方向を保持する変数

    // ツールチップの位置を動的に調整するヘルパー関数
    const updateTooltipPosition = (event) => {
        if (tooltipElement.style.display !== 'block') return;

        const tooltipWidth = tooltipElement.offsetWidth;
        const tooltipHeight = tooltipElement.offsetHeight;
        const windowHeight = window.innerHeight;
        const margin = 20; // カーソルからの余白

        // --- 水平方向の位置を決定 (保持された方向に従う) ---
        if (tooltipDirection === 'left') {
            tooltipElement.style.left = `${event.pageX - tooltipWidth - margin}px`;
        } else { // 'right'
            tooltipElement.style.left = `${event.pageX + margin}px`;
        }

        // --- 垂直方向の位置を決定 ---
        if (event.clientY + tooltipHeight + margin > windowHeight) {
            tooltipElement.style.top = `${event.pageY - tooltipHeight - margin}px`;
        } else {
            tooltipElement.style.top = `${event.pageY + margin}px`;
        }
    };

    // イベントリスナーを結果表示エリアに設定
    const resultsContainerForTooltip = document.getElementById('run-finder-results');
    let tooltipTimeout = null;

    resultsContainerForTooltip.addEventListener('mouseover', (event) => {
        const link = event.target.closest('a.path-icon-link, a.run-id-link');
        if (!link) return;

        clearTimeout(tooltipTimeout);

        // 表示方向を決定する
        const cell = link.closest('td');
        if (cell) {
            const cellIndex = cell.cellIndex;
            // Act 3 (index 13-16) の列なら、常に左に表示
            if (cellIndex >= 13) {
                tooltipDirection = 'left';
            }
            // Act 1 (index 5-8) の列なら、常に右に表示
            else if (cellIndex >= 5 && cellIndex <= 8) {
                tooltipDirection = 'right';
            }
            // それ以外 (RunID, Act2など) は画面の左右どちらにいるかで判断
            else {
                if (event.pageX > window.innerWidth / 2) {
                    tooltipDirection = 'left';
                } else {
                    tooltipDirection = 'right';
                }
            }
        }

        let { character, runId, stationIndex, act, level, nodeType } = link.dataset;
        if (!character || !runId || stationIndex === undefined) return;

        const charTimelines = characterTimelineCache.get(character);
        if (!charTimelines) return;
        const runTimeline = charTimelines[runId];
        if (!runTimeline) return;

        const targetStationIndex = (stationIndex === "final") ? 999 : parseInt(stationIndex, 10);
        if (isNaN(targetStationIndex)) return;

        const { cards } = reconstructDeckAtStation(runTimeline, targetStationIndex);

        const cardCounts = cards.reduce((acc, cardId) => {
            acc[cardId] = (acc[cardId] || 0) + 1;
            return acc;
        }, {});

        const cardNameKey = LANG === 'en' ? 'EN' : 'JA';
        const cardLookup = ALL_DATA.lookup_tables.cards;

        const deckList = Object.entries(cardCounts)
            .map(([cardId, count]) => {
                const cardData = cardLookup[cardId];
                const cardName = (cardData && cardData[cardNameKey]) ? cardData[cardNameKey] : cardId;
                return { name: cardName, count: count };
            })
            .sort((a, b) => a.name.localeCompare(b.name, LANG));

        const deckHtml = deckList.map(item => `<li>${item.name} &times;${item.count}</li>`).join('');

        const targetIdx = (stationIndex === 'final') ? Infinity : parseInt(stationIndex, 10);

        // --- ヘッダの対象マス表示 ---
        // 2026-11-24: ランID ホバーでもマス名を出す (戦闘なら敵名 / ショップ・スキマ等はマス種別)。
        // path アイコン (エリート/ボス等) は従来どおり「A1-Lv9 エリ 名前」形式。
        const buildLocationInfo = () => {
            if (stationIndex === 'final') return ` (${texts.tooltip_final_deck})`;
            let stateDetails = '';
            let stationSuffix = '';   // ランID ホバー: マス名は括弧の外に出す (「(Act 1, Lvl 4) 店」)
            if (act && level && nodeType) {
                // For path/boss icons with full data
                                // 短縮表示: 「A2-Lv4 エリ 河城にとり」形式
                const SHORT_NODE = { Enemy: '敵', EliteEnemy: 'エリ', Boss: 'ボス', Adventure: '特殊', Gap: 'スキマ', Shop: '店' };
                const SHORT_NODE_EN = { EliteEnemy: 'El', Adventure: 'Event' };
                const stateName = (LANG === 'en') ? (SHORT_NODE_EN[nodeType] || nodeType) : (SHORT_NODE[nodeType] || nodeType);
                stateDetails = `A${act}-Lv${level} ${stateName}`;
                if (link.dataset.enemyName) stateDetails += ` ${escAttr(link.dataset.enemyName)}`;
            } else if (stationIndexToActLevel[stationIndex]) {
                // For run-id links pointing to a specific station
                const actLevelString = stationIndexToActLevel[stationIndex];
                stateDetails = `Act ${actLevelString}`;
                const nameTxt = rfStationNameForRun(character, runId, targetIdx, actLevelString);
                if (nameTxt) stationSuffix = ` ${nameTxt}`;
            }
            return stateDetails ? ` (${stateDetails})${stationSuffix}` : '';
        };

        const renderTooltip = () => {
            const locationInfo = buildLocationInfo();
            const hfEntries = (hardFightsByChar[character] || {})[runId];
            const ownFightMark = rfOwnFightMark(hfEntries, targetIdx);
            const hardFightsHtml = buildHardFightsHtml(hfEntries, targetIdx, texts);
            // 5b (2026-11-23) / 2026-11-24: 対象マスのステータス (💗/⚡️/💰)。
            // 戦闘マスは bvals、戦闘以外のマスは sts の最新スナップショット、最終デッキは Act4 ボス終了時。
            const ownSt = (stationIndex === 'final')
                ? rfLastBattleStatus(character, runId)
                : rfStationStatus(character, runId, targetIdx);
            const ownStatusHtml = ownSt ? `<div class="deck-tooltip-mana rf-fight-status">${rfFightStatusText(ownSt)}</div>` : '';

            tooltipElement.innerHTML = `
                <div class="deck-tooltip-title">Deck (${cards.length} cards)${locationInfo}${ownFightMark}</div>
                <div class="deck-tooltip-mana">${texts.mana_label || '最終マナ基盤:'} ${rfManaIconsHtml(RF_MANA_MAP ? RF_MANA_MAP[runId] : null)}</div>
                ${ownStatusHtml}
                <ul class="deck-tooltip-list">${deckHtml || '<li>(No cards)</li>'}</ul>
                ${hardFightsHtml}
            `;
        };

        hoveredTooltipLink = link;
        renderTooltip();

        // 先に表示して寸法を確定させる
        tooltipElement.style.display = 'block';
        // 新しい位置調整関数を呼び出す
        updateTooltipPosition(event);

        // hard_fights.json 未ロードのときはロード完了後に再描画 (ホバー中の行が変わっていたら放棄)
        if (!hardFightsByChar.__loaded) {
            loadHardFights().then(() => {
                if (hoveredTooltipLink !== link) return;
                renderTooltip();
                updateTooltipPosition(event);
            });
        }
    });

    resultsContainerForTooltip.addEventListener('mouseout', (event) => {
        const link = event.target.closest('a.path-icon-link, a.run-id-link');
        if (!link) return;
        hoveredTooltipLink = null;
        tooltipTimeout = setTimeout(() => {
            tooltipElement.style.display = 'none';
        }, 200);
    });

    // 🔍 デッキ診断へのプレフィル (P-28): クリックでそのランの最終デッキ+展示品をデッキ診断タブに入力して診断実行
    resultsContainerForTooltip.addEventListener('click', (event) => {
        const diag = event.target.closest('a.rf-diag-link');
        if (!diag) return;
        event.preventDefault();
        event.stopPropagation();
        const cards = (diag.dataset.cards || '').split(',').filter(Boolean);
        const exhibits = (diag.dataset.exhibits || '').split(',').filter(Boolean);
        if (typeof window.ddPrefillFromRun === 'function') {
            window.ddPrefillFromRun(diag.dataset.character, diag.dataset.runId, cards, exhibits);
        } else {
            console.warn('deck-diagnosis.js が未ロードのため、デッキ診断へ入力できません。');
        }
    });

    resultsContainerForTooltip.addEventListener('mousemove', (event) => {
        // カーソル移動中も、決定された方向に基づいて位置を更新し続ける
        updateTooltipPosition(event);
    });

    const toggleContainer = document.getElementById('column-toggle-container');
    if (toggleContainer) {
        toggleContainer.addEventListener('change', (event) => {
            const checkbox = event.target;
            if (checkbox.classList.contains('column-toggle-checkbox')) {
                const colName = checkbox.dataset.col;
                const table = document.querySelector('.run-finder-results-table');
                if (table) {
                    // チェックが外れたら hide-col-*** クラスを付与
                    table.classList.toggle(`hide-col-${colName}`, !checkbox.checked);
                }
            }
        });
    }

    /*  // モバイルビューのデバッグ表示を追加
    if (!document.getElementById('mobile-debug-indicator')) {
        const debugIndicator = document.createElement('div');
        debugIndicator.id = 'mobile-debug-indicator';
        debugIndicator.style.position = 'fixed';
        debugIndicator.style.bottom = '0';
        debugIndicator.style.right = '0';
        debugIndicator.style.backgroundColor = 'rgba(0, 0, 0, 0.7)';
        debugIndicator.style.color = 'white';
        debugIndicator.style.padding = '2px 8px';
        debugIndicator.style.fontSize = '10px';
        debugIndicator.style.zIndex = '9999';
        debugIndicator.style.pointerEvents = 'none';
        document.body.appendChild(debugIndicator);

        const updateDebugView = () => {
            if (window.innerWidth <= 768) {
                debugIndicator.textContent = `Mobile View Active (width: ${window.innerWidth}px)`;
            } else {
                debugIndicator.textContent = `Desktop View (width: ${window.innerWidth}px)`;
            }
        };

        window.addEventListener('resize', updateDebugView);
        updateDebugView(); // 初回実行
    }
    */
}



function addItemToSelection(itemName, listId) {
    const list = document.getElementById(listId);
    if (!list) return;
    const existingTags = Array.from(list.children).map(tag => tag.dataset.itemName);
    if (existingTags.includes(itemName)) return;
    const tag = document.createElement('div');
    tag.className = 'item-tag';
    tag.dataset.itemName = itemName;
    tag.innerHTML = `<span>${itemName}</span><button class="remove-tag-btn" onclick="this.parentElement.remove()">&times;</button>`;
    if (listId === 'exclude-items-list' || listId === 'exclude-bosses-list' || listId === 'exclude-enemies-list') {
        tag.style.backgroundColor = '#F44336';
    }
    list.appendChild(tag);
}

// カード・展示品チップ追加 (mode: 'in'=含む / 'ex'=含まない)。同一名は両バーに存在しない
function addItemTag(name, mode) {
    const inList = document.getElementById('include-items-list');
    const exList = document.getElementById('exclude-items-list');
    if (!inList || !exList) return;
    Array.from(inList.children).concat(Array.from(exList.children))
        .filter(tag => tag.dataset.itemName === name)
        .forEach(tag => tag.remove());
    const target = (mode === 'ex') ? exList : inList;
    addItemToSelection(name, target.id);   // 除外バーは赤に自動着色される
    const tag = target.lastElementChild;
    if (tag) tag.dataset.mode = mode;
    const btn = tag && tag.querySelector('.remove-tag-btn');
    if (btn) btn.setAttribute('onclick', 'rfRemoveItemTag(this)');
    rfUpdateItemAreas();
}
window.rfRemoveItemTag = function (btn) {
    btn.parentElement.remove();
    rfUpdateItemAreas();
};
// 空のバー/キャプションは隠す。「含む」カードが2個以上のときだけ AND/OR を出す
function rfUpdateItemAreas() {
    const inList = document.getElementById('include-items-list');
    const exList = document.getElementById('exclude-items-list');
    const row = document.getElementById('item-logic-row');
    if (!inList || !exList) return;
    const nIn = inList.children.length, nEx = exList.children.length;
    const inCap = document.getElementById('item-in-cap'), exCap = document.getElementById('item-ex-cap');
    if (inCap) inCap.style.display = nIn ? '' : 'none';
    inList.style.display = nIn ? '' : 'none';
    if (exCap) exCap.style.display = nEx ? '' : 'none';
    exList.style.display = nEx ? '' : 'none';
    if (row) row.style.display = (nIn >= 2) ? '' : 'none';
}

function escAttr(s) { return String(s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/"/g, '&quot;'); }

// 敵グループ候補 (hard_fights.json の names テーブル): 出現順 (Act → 種別 → Lv) ソート。
// テキスト入力用 datalist と、クリックで追加できる選択グリッド (ボス=ピンク / エリート=紫 / 特殊=黄 の背景色つき) の両方を作る
let _enemyDatalistPopulated = false;
const _enemyKindByDisp = new Map();
function rfPopulateEnemyDatalist() {
    if (_enemyDatalistPopulated || !hardFightsNames) return;
    const KIND_RANK = { e: 0, x: 1, b: 2, s: 3 };
    const esc = (s) => String(s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/"/g, '&quot;');
    const entries = [];
    for (const code in hardFightsNames) {
        const nm = hardFightsNames[code] || [];
        if (!nm.length) continue;
        entries.push({ ja: nm[0] || '', en: nm[1] || '', kind: nm[2] || 'e',
                       act: (typeof nm[3] === 'number') ? nm[3] : 99, lv: (typeof nm[4] === 'number') ? nm[4] : 999 });
    }
    entries.sort((a, b) => (a.act - b.act) ||
        (((KIND_RANK[a.kind] ?? 9) - (KIND_RANK[b.kind] ?? 9)) || (a.lv - b.lv) || a.ja.localeCompare(b.ja, 'ja')));
    // チップ表示は「A<Act> 名前」形式 (ユーザー指定)。datalist の候補も同じ形式で出現順に並ぶ
    // ▼候補の名前自体にボス/エリートの色アイコンを埋め込む (注記なし・1行表示)
    const KIND_MARK = { x: '🟣', b: '🔴' };
    const dispOf = (e) => `A${e.act} ` + (KIND_MARK[e.kind] || '') + ((LANG === 'en') ? (e.en || e.ja) : (e.ja || e.en));
    const dl = document.getElementById('enemy-groups-datalist');
    if (dl) dl.innerHTML = entries.map(e => `<option value="${esc(dispOf(e))}"></option>`).join('');
    for (const e of entries) _enemyKindByDisp.set(dispOf(e), e.kind);
    _enemyDatalistPopulated = true;
}
// 敵チップ追加 (mode: 'in'=含む / 'ex'=含まない)。同一名が既にあればモードを差し替える
// チップの色: 含む=種別の背景色 (エリート=紫 / ボス=ピンク / 特殊=黄、通常=デフォルト) / 含まない=赤
function addEnemyTag(disp, mode) {
    const inList = document.getElementById('enemy-in-list');
    const exList = document.getElementById('enemy-ex-list');
    if (!inList || !exList) return;
    Array.from(inList.children).concat(Array.from(exList.children))
        .filter(tag => tag.dataset.itemName === disp)
        .forEach(tag => tag.remove());
    const target = (mode === 'ex') ? exList : inList;
    addItemToSelection(disp, target.id);
    const tag = target.lastElementChild;
    if (tag) {
        tag.dataset.mode = mode;
        tag.style.backgroundColor = (mode === 'ex') ? '#F44336' : '';
        const btn = tag.querySelector('.remove-tag-btn');
        if (btn) btn.setAttribute('onclick', 'rfRemoveEnemyTag(this)');
    }
    rfUpdateEnemyAreas();
}
window.rfRemoveEnemyTag = function (btn) {
    btn.parentElement.remove();
    rfUpdateEnemyAreas();
};
function rfUpdateEnemyAreas() {
    const inList = document.getElementById('enemy-in-list');
    const exList = document.getElementById('enemy-ex-list');
    const row = document.getElementById('enemy-logic-row');
    if (!inList || !exList || !row) return;
    const nIn = inList.children.length, nEx = exList.children.length;
    document.getElementById('enemy-in-cap').style.display = nIn ? '' : 'none';
    inList.style.display = nIn ? '' : 'none';
    document.getElementById('enemy-ex-cap').style.display = nEx ? '' : 'none';
    exList.style.display = nEx ? '' : 'none';
    row.style.display = (nIn >= 2) ? '' : 'none';
}



// ==================================================================================
//  CORE SEARCH LOGIC - REBUILT FOR PERFORMANCE
// ==================================================================================

// --- 検索結果末尾の棒グラフ: 検索したラン集合での 敵ごと「遭遇回数」を横棒で表示し,
//     苦戦した部分 (🩸ライフ部門 / ⚡️スペルカード部門) だけを濃色で積み上げて表現する ---
let hfBarMode = 'count';   // 苦戦棒グラフの表示モード: 'count' = 遭遇回数ベース / 'pct' = 割合ベース (100% 積み上げ)
let hfBarsCriteria = null; // 棒グラフと一緒に表示する検索条件 (タイトルに条件ラベルを出す)

// 四分位数 [Q1, Q2(中央値), Q3, n] (線形補間・敵別戦績タブと同定義の データで計算)。n<2 は null
function hfQuartiles(raw) {
    const a = (raw || []).filter(v => v != null && isFinite(v)).sort((x, y) => x - y);
    const n = a.length;
    if (n < 2) return null;
    const q = (p) => {
        const pos = (n - 1) * p, lo = Math.floor(pos), hi = Math.ceil(pos);
        return a[lo] + (a[hi] - a[lo]) * (pos - lo);
    };
    return { q1: q(0.25), med: q(0.5), q3: q(0.75), n };
}

// --- ボス行キャラ絵オーバーレイ (Plotly の tick に画像は入れられないため、ラベル欄の余白に <img> を重ねる) ---
let hfBarsPlotDiv = null;                  // 現在の Plotly ルート div (リサイズ再配置用)
let hfBarsBossRows = [];                   // { code, idx }  ボス行 (idx = 降順ソート後の行番号, y 配列では n-1-idx)

function positionBossAvatarOverlay() {
    const gd = hfBarsPlotDiv;
    if (!gd || !hfBarsBossRows.length) return;
    const full = gd._fullLayout;
    if (!full || !gd.data || !gd.data[0]) return;
    const size = full._size;
    const yaxis = full.yaxis;
    const n = gd.data[0].y.length;
    if (!n) return;
    let holder = gd.querySelector('.hf-boss-avatars');
    if (!holder) {
        //基底が静的だと祖先基準になって位置が暴走するため、必ず相対化しておく
        if (getComputedStyle(gd).position === 'static') gd.style.position = 'relative';
        holder = document.createElement('div');
        holder.className = 'hf-boss-avatars';
        holder.style.cssText = 'position:absolute;inset:0;pointer-events:none;z-index:2;';
        gd.appendChild(holder);
    }
    holder.innerHTML = '';
    const AV = 20, PAD = 5;
    // 右寄せラベルの実文字開始位置の左側に置く (ラベル幅は行ごとに違うため、実測して密着配置する)
    // tick は DOM 順 = 下→上・全行必ず 1 要素なので、上から数えた行 index (idx) とそのまま対応する
    const pr = gd.getBoundingClientRect();
    const svg = gd.querySelector('.main-svg');
    const sortedTicks = (svg ? Array.from(svg.querySelectorAll('g.ytick text')) : [])
        .map(t => t.getBoundingClientRect())
        .map(r => ({ cy: r.top + r.height / 2, left: r.left }))
        .sort((a, b) => a.cy - b.cy);          // 上→下順に並べ替え
    for (const { code, idx } of hfBarsBossRows) {
        // カテゴリは軸長を n 等分して均等配置される (idx = 上から何番目か / y配列は下から順に描かれる)
        const cy = size.t + yaxis._length * ((idx + 0.5) / n);
        // 同じ表示順の tick ラベル左端に合わせる
        const tick = sortedTicks[idx];
        // 実測が取れないときは automargin 余白の右端に仮置き
        const left = tick
            ? Math.max(2, Math.round(tick.left - pr.left - AV - PAD))
            : Math.max(2, Math.round(size.l - AV - PAD));
        const img = document.createElement('img');
        img.src = bossIconMap[code] || './img/boss/Unknown.avif';
        img.alt = code;
        img.style.cssText = `position:absolute;width:${AV}px;height:${AV}px;` +
            `left:${left}px;top:${Math.round(cy - AV / 2)}px;` +
            `border-radius:50%;box-shadow:0 0 0 1px rgba(148,163,184,.5);object-fit:cover;`;
        holder.appendChild(img);
    }
}

// --- 敵行全体 (ラベル+棒) のホバー: リッチなカード (.rf-hf-card) を出す ---
//     既定の Plotly ツールチップ (hovertemplate) は無効化して差し替え。HP/ターンの箱ひげは
//     全行で軸を統一 (検索結果+参考値の共通 min〜max) して, ACT別/ボス間の比較をしやすくする
let hfBarsRowData = [];    // 上→下順に {label, enc, rate, hpHard/spHard/bothHard, hpVals, tnVals, charName, charHpVals, charTnVals} (renderEncounterBars で構築)
let rfHfCardEl = null;     // 固定表示用カード (body 直下)
let rfHfCardRow = null;    // 直前に表示した行 (同一行の差し替えを避ける)
let rfHfCardTimer = 0;     // タップ表示時の自動消去タイマー

// 行内の値分布 → Q0〜Q4 (min/Q1/Q2/Q3/max) を数値ごと埋め込んだ箱ひげ SVG (敵別戦績タブと同語彙):
//   細線+目盛 = min〜max (ヒゲ) / 枠付き矩形 = Q1〜Q3 / 太い縦線 = Q2 (中央値) / 青点 = 平均
//   数値は箱の上段 (min/max は下段) に描く。近接して重なる数値は左右にずらし、
//   大きくずれた場合だけ元の位置への小さなガイド線を出す
//   axis = {lo, hi} で同グループ (ACT|種別) 共通の軸にする (軸端の数値は出さず、トラックで揃える)。muted = 参考グラフ (薄め)
function rfHfSparkSvg(vals, q, color, axis, muted) {
    const H = 46, MID = 25, PADX = 3, W = 294;   // カード内幅 (max-width 320 - 余白24 - 枠2) いっぱいに広げる
    const a = (vals || []).filter(v => v != null && isFinite(v));
    if (!q || a.length < 2) return '';
    const vmin = a[0], vmax = a[a.length - 1];   // 呼び出し元で昇順ソート済み (hfQuartiles 内)
    if (!(isFinite(vmin) && isFinite(vmax))) return '';
    const lo = (axis && isFinite(axis.lo)) ? axis.lo : vmin;
    const hi = (axis && isFinite(axis.hi)) ? axis.hi : vmax;
    if (!(isFinite(lo) && isFinite(hi)) || hi - lo <= 0) return '';
    const op = muted ? 0.6 : 1;                 // 参考グラフは薄めに出して「自分のラン」との差を強調
    const x = (v) => PADX + (v - lo) / (hi - lo) * (W - 2 * PADX);
    const fq = (v) => (Math.round(v * 10) / 10).toString().replace(/\.0$/, '');
    let s = `<svg width="${W}" height="${H}" viewBox="0 0 ${W} ${H}" style="font-family:Arial,sans-serif;">`;
    if (axis) {
        // 共通スケールの土台 (トラック): 全行で同じ幅の軸になる
        s += `<line x1="${PADX}" y1="${MID}" x2="${W - PADX}" y2="${MID}" stroke="#e2e8f0" stroke-width="3"/>`;
    }
    if (vmin < 0 && vmax > 0) {
        // プラスとマイナスが混ざる分布 (HP変化なら被弾/回復込み) では 0 の基準線を出す
        s += `<line x1="${x(0).toFixed(1)}" y1="${MID - 8}" x2="${x(0).toFixed(1)}" y2="${MID + 8}" stroke="#94a3b8" stroke-width="1" stroke-dasharray="1 2"/>`;
    }
    // ヒゲ (min〜max) + 両端の目盛
    s += `<line x1="${x(vmin).toFixed(1)}" y1="${MID}" x2="${x(vmax).toFixed(1)}" y2="${MID}" stroke="${color}" stroke-opacity="${(0.45 * op).toFixed(2)}" stroke-width="1.2"/>`;
    s += `<line x1="${x(vmin).toFixed(1)}" y1="${MID - 7}" x2="${x(vmin).toFixed(1)}" y2="${MID + 7}" stroke="${color}" stroke-opacity="${(0.8 * op).toFixed(2)}" stroke-width="1.5"/>`;
    s += `<line x1="${x(vmax).toFixed(1)}" y1="${MID - 7}" x2="${x(vmax).toFixed(1)}" y2="${MID + 7}" stroke="${color}" stroke-opacity="${(0.8 * op).toFixed(2)}" stroke-width="1.5"/>`;
    // 箱 (Q1〜Q3) と 中央値 Q2 (太い縦線) / 平均 (青点, 敵別戦績と同じ)
    s += `<rect x="${x(q.q1).toFixed(1)}" y="${MID - 7}" width="${Math.max(1.5, x(q.q3) - x(q.q1)).toFixed(1)}" height="14" fill="${color}" fill-opacity="${(0.16 * op).toFixed(2)}" stroke="${color}" stroke-opacity="${(0.8 * op).toFixed(2)}"/>`;
    s += `<line x1="${x(q.med).toFixed(1)}" y1="${MID - 9}" x2="${x(q.med).toFixed(1)}" y2="${MID + 9}" stroke="${muted ? '#64748b' : '#1e293b'}" stroke-opacity="${op.toFixed(2)}" stroke-width="2"/>`;
    const mean = a.reduce((acc, v) => acc + v, 0) / a.length;
    s += `<circle cx="${x(mean).toFixed(1)}" cy="${MID}" r="3" fill="#3182bd" fill-opacity="${op.toFixed(2)}"/>`;
    // --- 数値ラベル (上段 = Q1/Q2/Q3, 下段 = min/max)。近接衝突はズラシで回避 ---
    //   共通スケール時も下段は min/max だけ (軸端の数値は出さない。トラックの長さでスケールを伝える)
    const measure = (t) => t.length * 5.3 + 3;   // 9.5px フォントの概算幅
    const chain = (arr, blo, bhi) => {
        if (!arr.length) return;
        let cursor = -Infinity;
        for (const it of arr) {
            const hw = measure(it.txt) / 2;
            it.rx = Math.max(Math.max(blo, it.x), cursor + hw + 2);
            cursor = it.rx + hw + 2;
        }
        // 右端のはみ出しは全体を左に詰めてもう一度走らせる
        const last = arr[arr.length - 1];
        const over = last.rx + measure(last.txt) / 2 - bhi;
        if (over > 0) {
            cursor = -Infinity;
            for (const it of arr) {
                const hw = measure(it.txt) / 2;
                it.rx = Math.max(Math.max(blo, it.x - over), cursor + hw + 2);
                cursor = it.rx + hw + 2;
            }
        }
    };
    const labelsAbove = [q.q1, q.med, q.q3].map(v => ({ txt: fq(v), x: x(v) })).sort((p, r) => p.x - r.x);
    chain(labelsAbove, 8, W - 8);
    const labelsBelow = [{ txt: fq(vmin), x: x(vmin) }, { txt: fq(vmax), x: x(vmax) }].sort((p, r) => p.x - r.x);
    chain(labelsBelow, 8, W - 8);
    for (const it of labelsAbove) {
        if (Math.abs(it.rx - it.x) > 5) {
            s += `<line x1="${it.x.toFixed(1)}" y1="12" x2="${it.x.toFixed(1)}" y2="16" stroke="#94a3b8" stroke-width="1"/>`;
        }
        s += `<text x="${it.rx.toFixed(1)}" y="9" font-size="9.5" fill="${muted ? '#94a3b8' : '#475569'}" text-anchor="middle">${it.txt}</text>`;
    }
    for (const it of labelsBelow) {
        if (Math.abs(it.rx - it.x) > 5) {
            s += `<line x1="${it.x.toFixed(1)}" y1="${MID + 8}" x2="${it.x.toFixed(1)}" y2="${MID + 12}" stroke="#94a3b8" stroke-width="1"/>`;
        }
        s += `<text x="${it.rx.toFixed(1)}" y="${H - 2}" font-size="9.5" fill="#64748b" text-anchor="middle">${it.txt}</text>`;
    }
    s += `</svg>`;
    return s;
}

// 行データ → カードHTML: 名前+遭遇/苦戦率 → 苦戦内訳 → HP/ターンの箱ひげ (同グループ共通スケール)
//   → (検索でキャラ指定時) (参考) そのキャラ全ランの苦戦率/内訳+箱ひげを同じスケール・薄め表示で重ねる
//     (上段=この検索に合致した自分のラン / 下段=全ラン の比較が縦に揃えて読める)
//   共通スケールの軸は「Act|種別」が同じ行 (+その参考値) だけで決める → 全行一律だと
//   極端な敵に引きずられて箱が潰れるため (2026-10-31)
function rfHfCardBuild(rd) {
    const isJa = LANG === 'ja';
    // 苦戦内訳の割合 (n>0 のときのみ付ける): 分母は各行の遭遇回数 (参考側は参考母集団の遭遇回数)
    const segPct = (n, den) => {
        if (!(n > 0 && den)) return '';
        const p = Math.round(n / den * 100);
        return `(${p > 0 ? p + '%' : '<1%'})`;
    };
    let html = `<div class="rf-hf-card-h"><span title="${rd.label}">${rd.label}</span>`
        + `<span class="rf-hf-card-sub">${isJa ? `遭遇 ${rd.enc}回 ・ 苦戦率 ${rd.rate}` : `${rd.enc} enc ・ hard ${rd.rate}`}</span></div>`;
    html += `<div class="rf-hf-seg">${isJa ? '苦戦内訳' : 'Hard by type'}: 🩸${rd.hpHard}${segPct(rd.hpHard, rd.enc)} ・ ⚡️${rd.spHard}${segPct(rd.spHard, rd.enc)} ・ 🩸⚡️${rd.bothHard}${segPct(rd.bothHard, rd.enc)}</div>`;
    const fq = (v) => (Math.round(v * 10) / 10).toString().replace(/\.0$/, '');
    // 同じグループ (Act|種別) の行 + その参考値 から共通スケールを算出 (HP は変化量表示 = 被弾 − / 回復 ＋ で反転)
    const ext = (arr, neg) => {
        let lo = Infinity, hi = -Infinity;
        for (const v of arr) { const w = neg ? -v : v; if (w < lo) lo = w; if (w > hi) hi = w; }
        return [lo, hi];
    };
    let hpLo = Infinity, hpHi = -Infinity, tnLo = Infinity, tnHi = -Infinity;
    for (const r of hfBarsRowData) {
        if (r.gkey !== rd.gkey) continue;   // Act と敵種別が同じグループの軸だけを使う
        if (r.hpVals.length) { const e = ext(r.hpVals, true); if (e[0] < hpLo) hpLo = e[0]; if (e[1] > hpHi) hpHi = e[1]; }
        if (r.tnVals.length) { const e = ext(r.tnVals, false); if (e[0] < tnLo) tnLo = e[0]; if (e[1] > tnHi) tnHi = e[1]; }
        if (r.charHpVals) { const e = ext(r.charHpVals, true); if (e[0] < hpLo) hpLo = e[0]; if (e[1] > hpHi) hpHi = e[1]; }
        if (r.charTnVals) { const e = ext(r.charTnVals, false); if (e[0] < tnLo) tnLo = e[0]; if (e[1] > tnHi) tnHi = e[1]; }
    }
    const hpAxis = isFinite(hpLo) ? { lo: hpLo, hi: hpHi } : null;
    const tnAxis = isFinite(tnLo) ? { lo: tnLo, hi: tnHi } : null;
    const metric = (title, vals, q, color, axis, muted) => {
        if (!q) return '';
        // 見出しの右の余白を利用: avg / Q1 / Q2 / Q3 を均等割りで並べる (ラベル淡色 + 数値太字)
        const fp = vals.filter(v => v != null && isFinite(v));
        const mean = fp.length ? fp.reduce((a, v) => a + v, 0) / fp.length : null;
        const stat = mean == null ? '' : `<span class="avg"><span class="q">avg</span><b>${fq(mean)}</b></span>`
            + `<span class="iqr"><span class="q">IQR</span>`
                + `<span class="br">[</span>`
                + [['Q1', q.q1], ['Q2', q.med], ['Q3', q.q3]]
                    .map(([k, v]) => `<span class="qv"><span class="q">${k}</span><b>${fq(v)}</b></span>`).join('')
                + `<span class="br">]</span></span>`;
        return `<div class="rf-hf-metric">`
            + `<div class="rf-hf-metric-t"><span>${title}</span>${stat ? `<span class="rf-hf-metric-q">${stat}</span>` : ''}</div>`
            + rfHfSparkSvg(vals, q, color, axis, muted)   // Q0〜Q4 の数値はグラフ内に埋め込み
            + `</div>`;
    };
    // HP は「変化量」表示に反転: 被弾 = − (ライフが減る) / 回復 = ＋。Q0〜Q4 も符号が反転する
    const hpQRaw = hfQuartiles(rd.hpVals);
    const hpNeg = rd.hpVals.map(v => -v).sort((a, b) => a - b);
    const hpQ = hpQRaw ? { q1: -hpQRaw.q3, med: -hpQRaw.med, q3: -hpQRaw.q1, n: hpQRaw.n } : null;
    html += metric(isJa ? '🩸 HP変化' : '🩸 HP change', hpNeg, hpQ, '#d6455d', hpAxis, false);
    html += metric(isJa ? '🌀 ターン数' : '🌀 Turns', rd.tnVals, hfQuartiles(rd.tnVals), '#7c5ce0', tnAxis, false);
    // (参考) キャラ全ラン: 検索でキャラ指定があるときだけ表示。苦戦率/内訳も全ラン側で併記する
    if (rd.charName && rd.charEncN) {
        html += `<div class="rf-hf-refhead"><span class="rf-hf-refcap">${isJa ? '(参考)' : '(ref.)'}</span>`
            + ` <b>${rd.charName}</b> ${isJa ? '全ラン' : 'all runs'}`
            + ` ${isJa ? ` ・ 苦戦率 ${rd.charRate}` : ` ・ hard ${rd.charRate}`}</div>`;
        html += `<div class="rf-hf-seg">${isJa ? '苦戦内訳' : 'Hard by type'}: 🩸${rd.charHpHard}${segPct(rd.charHpHard, rd.charEncN)} ・ ⚡️${rd.charSpHard}${segPct(rd.charSpHard, rd.charEncN)} ・ 🩸⚡️${rd.charBothHard}${segPct(rd.charBothHard, rd.charEncN)}</div>`;
        if (rd.charHpVals && rd.charHpVals.length >= 2) {
            const chpNeg = rd.charHpVals.map(v => -v).sort((a, b) => a - b);
            html += metric(isJa ? '🩸 HP変化' : '🩸 HP change', chpNeg, hfQuartiles(chpNeg), '#d6455d', hpAxis, true);
        }
        if (rd.charTnVals && rd.charTnVals.length >= 2) {
            html += metric(isJa ? '🌀 ターン数' : '🌀 Turns', rd.charTnVals, hfQuartiles(rd.charTnVals), '#7c5ce0', tnAxis, true);
        }
    }
    return html;
}

function rfHfCardShow(rd, cx, cy) {
    if (!rfHfCardEl) {
        rfHfCardEl = document.createElement('div');
        rfHfCardEl.id = 'rf-hf-card';
        rfHfCardEl.className = 'rf-hf-card';
        rfHfCardEl.style.display = 'none';
        document.body.appendChild(rfHfCardEl);
    }
    if (rfHfCardRow !== rd) {
        rfHfCardEl.innerHTML = rfHfCardBuild(rd);
        rfHfCardRow = rd;
    }
    rfHfCardEl.style.display = 'block';
    // カーソル右下に置く (右端/下端のはみ出しは反転)
    const w = rfHfCardEl.offsetWidth || 260, h = rfHfCardEl.offsetHeight || 120;
    let x = cx + 16, y = cy + 14;
    if (x + w > window.innerWidth - 6) x = Math.max(6, cx - w - 16);
    if (y + h > window.innerHeight - 6) y = Math.max(6, cy - h - 14);
    rfHfCardEl.style.left = Math.round(x) + 'px';
    rfHfCardEl.style.top = Math.round(y) + 'px';
}

function rfHfCardHide() {
    if (rfHfCardEl) rfHfCardEl.style.display = 'none';
    rfHfCardRow = null;
}

// 各行 (ラベル+棒の帯) に透明 div を重ねてホバー/タップを受け取る
function positionHfRowHover() {
    const gd = hfBarsPlotDiv;
    if (!gd || !hfBarsRowData.length) return;
    const full = gd._fullLayout;
    if (!full || !gd.data || !gd.data[0]) return;
    const size = full._size;
    const yaxis = full.yaxis;
    const n = gd.data[0].y.length;
    if (!n) return;
    let holder = gd.querySelector('.rf-hf-rowhover');
    if (!holder) {
        if (getComputedStyle(gd).position === 'static') gd.style.position = 'relative';
        holder = document.createElement('div');
        holder.className = 'rf-hf-rowhover';
        holder.style.cssText = 'position:absolute;inset:0;pointer-events:none;z-index:2;';
        gd.appendChild(holder);
    }
    holder.innerHTML = '';
    const rowH = yaxis._length / n;
    const cnt = Math.min(n, hfBarsRowData.length);
    for (let i = 0; i < cnt; i++) {
        const rd = hfBarsRowData[i];
        const d = document.createElement('div');
        d.style.cssText = `position:absolute;left:0;top:${Math.round(size.t + i * rowH)}px;`
            + `width:${Math.max(20, Math.round(size.l + size.w))}px;height:${Math.max(12, rowH - 1)}px;`
            + 'pointer-events:auto;cursor:default;';
        d.addEventListener('pointerenter', (ev) => { if (ev.pointerType === 'mouse') rfHfCardShow(rd, ev.clientX, ev.clientY); });
        d.addEventListener('pointermove', (ev) => { if (ev.pointerType === 'mouse') rfHfCardShow(rd, ev.clientX, ev.clientY); });
        d.addEventListener('pointerleave', () => rfHfCardHide());
        // タップ (タッチ) では指を離しても hoverleave が走るため、click で出して自動消去する
        d.addEventListener('click', (ev) => {
            rfHfCardShow(rd, ev.clientX, ev.clientY);
            clearTimeout(rfHfCardTimer);
            rfHfCardTimer = setTimeout(rfHfCardHide, 4000);
        });
        holder.appendChild(d);
    }
}

let hfBarsBumpedMargin = null;             // 直前に設定した余白値 (automargin で戻った場合だけ広げ直す目印)

// 左余白を画像ぶん広げてから再配置 (newPlot 直後と window resize 時に実行)
async function ensureBossAvatarSpace() {
    const gd = hfBarsPlotDiv;
    if (!gd || !hfBarsBossRows.length) { positionBossAvatarOverlay(); return; }
    try {
        const cur = gd._fullLayout._size.l || 0;
        // 前回自分で設定した値でなければ (= automargin が戻したとみなされる) 1 度だけ広げる
        if (cur > 0 && cur !== hfBarsBumpedMargin) {
            hfBarsBumpedMargin = Math.round(cur + 26);
            await Plotly.relayout(gd, { 'margin.l': hfBarsBumpedMargin });
        }
    } catch (e) { /* 調整失敗時は画像位置がずれるだけ */ }
    // automargin/ラベル配置は relayout 解決後も非同期に詰め直されるため、確定後に再度張り直す
    window.setTimeout(positionBossAvatarOverlay, 50);
    window.setTimeout(positionBossAvatarOverlay, 250);
}

async function renderEncounterBars(runs, searchCriteria = null) {
    hfBarsCriteria = searchCriteria;   // 表示モード切替時も同じ条件ラベルを使い回す
    const holder = document.getElementById('run-finder-hardfights-chart');
    if (!holder || typeof Plotly === 'undefined') return;
    const isJa = LANG === 'ja';

    try {
        await loadHardFights();
    } catch (e) {
        console.error('[ERROR] hard_fights load failed for bar chart:', e);
        return;
    }

    // 現在の検索結果ラン集合で集計 (フィルタしても分母・分子が同じ集合から取れる)
    // 部門別積み上げ: 🩸ライフのみ / ⚡スペルのみ / 両方 / それ以外の遭遇 (各敵で排他に分ける)
    let nRuns = 0;
    const byEnc = new Map();      // code -> 遭遇回数
    const segHp = new Map();      // code -> 苦戦 (ライフ のみ)
    const segSp = new Map();      // code -> 苦戦 (スペルカード のみ)
    const segBoth = new Map();    // code -> 苦戦 (ライフ & スペルの両方)
    const encHp = new Map();      // code -> [ΔHp,...]  この検索ラン集合での HP損失 (純損失・回復は負) の分布
    const encTn = new Map();      // code -> [Rounds,...] 同・ターン数の分布
    for (const run of (runs || [])) {
        const enc = (hardFightsEncs[run.character] || {})[run.run_id];
        if (!enc || !enc.length) continue;
        nRuns++;
        const bvs = (hardFightsBvals[run.character] || {})[run.run_id];
        for (let i = 0; i < enc.length; i++) {
            const code = enc[i];
            byEnc.set(code, (byEnc.get(code) || 0) + 1);
            const bv = bvs && bvs[i];
            if (!bv) continue;
            if (bv[0] != null) { let arr = encHp.get(code); if (!arr) { arr = []; encHp.set(code, arr); } arr.push(bv[0]); }
            if (bv[1] != null) { let arr = encTn.get(code); if (!arr) { arr = []; encTn.set(code, arr); } arr.push(bv[1]); }
        }
        const ent = (hardFightsByChar[run.character] || {})[run.run_id];
        for (const e of (ent || [])) {
            const code = e.g;
            if (!code) continue;
            const isHp = e.dh >= 15, isSp = e.sp >= 1;
            if (isHp && isSp) segBoth.set(code, (segBoth.get(code) || 0) + 1);
            else if (isHp) segHp.set(code, (segHp.get(code) || 0) + 1);
            else if (isSp) segSp.set(code, (segSp.get(code) || 0) + 1);
        }
    }

    // ★ キャラ指定があれば そのキャラ「全ラン」の敵別 IQR も比較用に集計 (敵別戦績タブと同定義: HP=純損失 / ターン=Rounds)
    //   遭遇回数・苦戦内訳も数えて (参考) に苦戦率/内訳を併記する
    const searchChar = (searchCriteria && searchCriteria.character && searchCriteria.character !== 'All')
        ? searchCriteria.character : null;
    const charHp = searchChar ? new Map() : null;
    const charTn = searchChar ? new Map() : null;
    const charEnc = searchChar ? new Map() : null;      // code -> 全ランでの遭遇回数
    const charSegHp = searchChar ? new Map() : null;    // code -> 苦戦 (ライフ のみ)
    const charSegSp = searchChar ? new Map() : null;    // code -> 苦戦 (スペル のみ)
    const charSegBoth = searchChar ? new Map() : null;  // code -> 苦戦 (両方)
    if (searchChar) {
        const chEncs = hardFightsEncs[searchChar] || {};
        const chBv = hardFightsBvals[searchChar] || {};
        for (const rid of Object.keys(chBv)) {
            if (hardFightsNsRunIds.has(rid)) continue;   // 参考値は統計母集団固定 (nsランを除外)
            const encAll = chEncs[rid], bvAll = chBv[rid];
            if (!encAll || !bvAll) continue;
            for (let i = 0; i < encAll.length; i++) {
                const code = encAll[i], bv = bvAll[i];
                charEnc.set(code, (charEnc.get(code) || 0) + 1);
                if (!bv) continue;
                if (bv[0] != null) { let arr = charHp.get(code); if (!arr) { arr = []; charHp.set(code, arr); } arr.push(bv[0]); }
                if (bv[1] != null) { let arr = charTn.get(code); if (!arr) { arr = []; charTn.set(code, arr); } arr.push(bv[1]); }
            }
            const ent = (hardFightsByChar[searchChar] || {})[rid];
            for (const e of (ent || [])) {
                const code = e.g;
                if (!code) continue;
                const isHp = e.dh >= 15, isSp = e.sp >= 1;
                if (isHp && isSp) charSegBoth.set(code, (charSegBoth.get(code) || 0) + 1);
                else if (isHp) charSegHp.set(code, (charSegHp.get(code) || 0) + 1);
                else if (isSp) charSegSp.set(code, (charSegSp.get(code) || 0) + 1);
            }
        }
    }

    if (!byEnc.size) {
        holder.innerHTML = `<p style="text-align:center;color:#94a3b8;font-size:0.9em;margin:30px 0;">`
            + `${isJa ? `戦闘データがありません (${runs ? runs.length : 0} ラン)` : `No battle data in ${runs ? runs.length : 0} runs`}</p>`;
        return;
    }

    const nameOf = (code) => {
        const nm = hardFightsNames[code];
        if (!nm) return code;
        const s = isJa ? nm[0] : nm[1];
        return (s && s.length) ? s : code;
    };

    // 並び順は敵別戦績タブと同じ時系列順: Act → 種別 (通常→特殊→エリート→ボス) → MinLevel。
    // (同順内は遭遇回数の降順で補助的に並べる)
    const kOrd = { 'e': 0, 's': 1, 'x': 2, 'b': 3 };
    const _keyOf = (c) => {
        const nm = hardFightsNames[c] || [];
        return [
            (Number.isFinite(nm[3]) ? nm[3] : 99),           // Act
            (kOrd[nm[2]] !== undefined ? kOrd[nm[2]] : 9),   // 種別
            (Number.isFinite(nm[4]) ? nm[4] : 999),          // MinLevel (最初の出現ステーション)
        ];
    };
    const sorted = [...byEnc.entries()].sort((a, b) => {
        const ka = _keyOf(a[0]), kb = _keyOf(b[0]);
        return (ka[0] - kb[0]) || (ka[1] - kb[1]) || (ka[2] - kb[2]) || (b[1] - a[1]);
    });
    // ★ 敵種別: ⚔️=エリート / ✨=特殊イベント / ボス=キャラ絵画像・通常=なし (時系列ソートの種別と同じ分類)
    const kindIcon = { 'x': '👹', 's': '✨' };
    // ★ 同名敵の区別: 特殊イベント行は「（特殊イベント）」を付け, それでも重複する行だけは
    //   出現位置 (A{Act}-L{Level}) を添える (Plotly は同名ラベルを同じカテゴリとして積み上げるため、ラベルは必ず一意にする)
    const raws = sorted.map(([c]) => ({ c, b: nameOf(c), k: (hardFightsNames[c] || [])[2] }));
    const groups = new Map();
    for (const row of raws) groups.set(row.b, (groups.get(row.b) || 0) + 1);
    const seenN = new Map();
    const labels = raws.map(({ c, b, k }) => {
        const icon = kindIcon[k] || '';
        if (k === 's') return `${icon}${b}${isJa ? '（特殊イベント）' : ' (Special Event)'}`;
        if ((groups.get(b) || 0) <= 1) return `${icon}${b}`;
        const nm = hardFightsNames[c] || [];
        const n = (seenN.get(b) || 0) + 1;
        seenN.set(b, n);
        if (Number.isFinite(nm[3]) && Number.isFinite(nm[4])) return `${icon}${b} (A${nm[3]}-L${nm[4]})`;
        return `${icon}${b} (${n})`;
    });
    const encVals = sorted.map(([, n]) => n);
    const segOf = (m) => sorted.map(([c]) => m.get(c) || 0);
    const hpVals = segOf(segHp);
    const spVals = segOf(segSp);
    const bothVals = segOf(segBoth);
    // 苦戦合計 = ライフのみ + スペルのみ + 両方 / それ以外 = 遭遇 - 苦戦合計
    const hardVals = sorted.map(([c]) => (segHp.get(c) || 0) + (segSp.get(c) || 0) + (segBoth.get(c) || 0));
    const restVals = encVals.map((n, i) => n - hardVals[i]);
    // 棒の右端に書く苦戦率 (例: 35%(35/100))
    const rateTxt = sorted.map((row, i) => {
        const h = hardVals[i], n = encVals[i];
        const p = (h / n * 100).toFixed(1).replace(/\.0$/, '');
        return `${p}%(${h}/${n})`;
    });
    // Plotly 用の上下反転ラベル
    const rev = (a) => a.slice().reverse();
    const labelsRev = rev(labels);

    // 苦戦の部分だけ濃色で塗る: [ライフ / スペル / 両方] を起点側に積み上げ, 残りは薄色
    // (積み上げ基点 = 軸側なので, 軸から「苦戦した長さ」が伸びる形になる)
    // 苦戦なし部分は背景の区間色と判別しやすいように色を浅く + 細い枠線で囲む
    const segments = [
        { name: isJa ? '🩸 苦戦 (ライフ)' : 'Hard (HP)', vals: hpVals, color: '#d6455d', line: { color: '#ffffff', width: 0.5 } },
        { name: isJa ? '⚡️ 苦戦 (スペルカード)' : 'Hard (Spell)', vals: spVals, color: '#7c5ce0', line: { color: '#ffffff', width: 0.5 } },
        { name: isJa ? '🩸⚡️ 苦戦 (両方)' : 'Hard (both)', vals: bothVals, color: '#7a1f3d', line: { color: '#ffffff', width: 0.5 } },
        { name: isJa ? '苦戦なし' : 'No hard fights', vals: restVals, color: '#f2f5f3', line: { color: '#93a8a1', width: 1 } },
    ];

    // 敵名が長いので高さは敵数に比例させ, 全表示 (ページスクロール) で読む。下限で下限は確保
    // 狭い幅 (スマホ等) では敵名 tick を折り返して縮め、左余白の増殖でプロット域が消えるのを防ぐ (2026-10-31)
    const NARROW_W = 640;
    const narrow = Math.min(holder.clientWidth, document.documentElement.clientWidth) <= NARROW_W;
    const wrapTickLabel = (lbl) => (!narrow) ? lbl :
        lbl.replace(isJa ? '（特殊イベント）' : ' (Special Event)', isJa ? '<br>（特殊イベント）' : '<br>(Special Event)')
            .replace(/ & /g, ' &<br>')
            .split('<br>')
            .map((part) => {
                const t = part.trim();
                if (t.length > 9 && !t.includes(' ')) return t.replace(/(.{9})(?=.)/g, '$1<br>');   // CJK の長い連続は 9字ごと
                if (t.length > 14 && t.includes(' ')) return t.replace(/ (?=\S)/g, '<br>');   // 英字の長い名前は空白で折る
                return t;
            })
            .join('<br>');
    const tickLabels = labels.map(wrapTickLabel);
    const chartHeight = Math.max(700, labels.length * (narrow ? 44 : 34) + 160);   // 折返しラベルは行間を広めに (狭幅時 1行あたり44px)
    // 表示モード: 'count' = 棒の長さ = 遭遇回数 / 'pct' = 全員の棒が同じ長さ (100% 積み上げ)
    const isPct = hfBarMode === 'pct';
    const scale = (vals) => (isPct ? vals.map((v, i) => v / encVals[i] * 100) : vals);
    const segMax = isPct ? 100 : Math.max(1, ...encVals);

    // ★ 行の背景にうっすら色を敷いて区間が一目で分かるようにする:
    //   グループ = Act × (通常敵はルート選択と同じ lv帯: 序盤/中盤/終盤) + エリート/ボス/特殊
    //   Plotly の shape (paper座標・layer below) は棒の後ろに敷かれる
    const bandColor = {
        'E': '#e2edfa',   // Act1〜3 通常敵 lv0〜5 (序盤)
        'M': '#e6f2e7',   // lv5〜10 (中盤)
        'L': '#fdebd7',   // lv10〜15 (終盤)
        'x': '#eee7f8',   // エリート
        'b': '#f9e6ee',   // ボス
        's': '#f6f3d3',   // 特殊イベント
    };
    const bandKeyOf = (c) => {
        const nm = hardFightsNames[c] || [];
        const kind = nm[2] || '?', act = Number.isFinite(nm[3]) ? nm[3] : 99;
        if (kind === 'e' && act >= 1 && act <= 3 && Number.isFinite(nm[4])) return nm[4] < 5 ? 'E' : nm[4] < 10 ? 'M' : 'L';
        return bandColor[kind] ? kind : null;
    };
    const bandKeys = sorted.map(([c]) => bandKeyOf(c));
    const nRows = bandKeys.length;
    const bandShapes = [];
    for (let i = 1, gs = 0; i <= nRows; i++) {
        if (i === nRows || bandKeys[i] !== bandKeys[gs]) {
            if (bandKeys[gs]) {
                // 上→下の行 gs〜i-1 は下から数えると n-1-i+1 〜 n-1-gs 番目のカテゴリ帯
                bandShapes.push({
                    type: 'rect', xref: 'paper', yref: 'paper', x0: 0, x1: 1,
                    y0: (nRows - i) / nRows, y1: (nRows - gs) / nRows,
                    fillcolor: bandColor[bandKeys[gs]], line: { width: 0 }, layer: 'below',
                });
            }
            gs = i;
        }
    }

    holder.innerHTML = `<div style="text-align:center;margin:0 0 2px 0;">`
        + `<button id="hf-bar-mode-btn" style="font-size:12px;padding:4px 14px;cursor:pointer;border:1px solid #94a3b8;border-radius:6px;background:#f1f5f9;color:#334155;">`
        + (isJa
            ? (isPct ? '遭遇回数ベースで表示' : '割合ベース（全員の長さをそろえて）表示')
            : (isPct ? 'Show counts' : 'Show 100% stacked'))
        + `</button></div>`
        + `<div id="run-finder-hardfights-plot" style="max-width:1600px;margin:0 auto;"></div>`;
    const plotDiv = document.getElementById('run-finder-hardfights-plot');
    // 全表示: チャート自体をスクロールさせずページスクロールで全体を見る
    const modeBtn = document.getElementById('hf-bar-mode-btn');
    if (modeBtn) modeBtn.onclick = () => { hfBarMode = isPct ? 'count' : 'pct'; renderEncounterBars(runs, hfBarsCriteria); };

    // 各棒の右端に苦戦率を文字で書き添える (苦戦した戦闘 / 遭遇)
    const rateNotes = labels.map((lbl, i) => ({
        xref: 'x', yref: 'y',
        x: (isPct ? 100 : encVals[i]) + segMax * 0.02,
        y: lbl,
        xanchor: 'left',
        showarrow: false,
        text: rateTxt[i],
        font: { size: narrow ? 9.5 : 11.5, color: '#64748b' },
    }));

    // タイトルへ検索条件ラベルを追加 (例: "@Sophie CirnoA Act1 …") — 条件が空 ('(all)') のときは出さない
    const criteriaLabel = hfBarsCriteria ? makeQueryLabel(hfBarsCriteria) : '';
    Plotly.newPlot(plotDiv, segments.map(s => ({
        type: 'bar',
        orientation: 'h',
        y: labelsRev,
        x: rev(isPct ? scale(s.vals) : s.vals),
        name: s.name,
        marker: { color: s.color, line: s.line },
        hoverinfo: 'none',   // 既定の簡素ツールチップは出さない。行ホバーは .rf-hf-rowhover + カード (.rf-hf-card) が担当
    })), {
        barmode: 'stack',
        title: {
            text: `${isJa ? '遭遇した戦闘 (敵ごと)' : 'Battles Fought (by Enemy)'}`
                + ` <span style="font-size:0.8em;color:#64748b">(${nRuns} ラン / ${nRuns === 1 ? '1 run' : nRuns + ' runs'})</span>`
                + (criteriaLabel && criteriaLabel !== '(all)' ? ` <span style="font-size:0.75em;color:#475569;font-weight:700">｜${criteriaLabel}</span>` : '')
                + `<br><span style="font-size:0.7em;color:#64748b">${[
                    isJa ? '👹=エリート ✨=特殊イベント ・ ボス=キャラ絵' : '👹=Elite ✨=Special Event ・ Boss=avatar',
                    isJa ? (isPct ? '棒の長さ = 遭遇に対する割合 (100% 積み上げ)' : '棒の長さ = 遭遇回数 ・ 色付き部分 = 苦戦した戦闘') : (isPct ? 'bar length = % of encounters (100% stacked)' : 'bar length = encounters ・ colored part = hard fights'),
                    isJa ? '並び順 = 時系列 (Act → 種別 → Lv)' : 'order = chronological (Act → type → level)',
                ].join(narrow ? '<br>' : ' ・ ')
                + (isJa
                    ? ` ・ 背景 = `
                    + `<span style="color:${bandColor['E']}"><b>■</b></span>序盤 `
                    + `<span style="color:${bandColor['M']}"><b>■</b></span>中盤 `
                    + `<span style="color:${bandColor['L']}"><b>■</b></span>終盤 `
                    + `<span style="color:${bandColor['x']}"><b>■</b></span>エリート `
                    + `<span style="color:${bandColor['b']}"><b>■</b></span>ボス`
                    : '')}</span>`,
            font: { size: narrow ? 13 : 16 },
        },
        showlegend: true,
        legend: { orientation: 'h', y: -0.08, font: { size: narrow ? 9.5 : 11 } },
        annotations: rateNotes,
        shapes: bandShapes,   // 区間 (Act×序盤/中盤/終盤 etc) のうっすら色背景
        xaxis: {
            title: isPct ? (isJa ? '遭遇に対する苦戦の割合 (%)' : '% of encounters')
                : (isJa ? '遭遇回数' : 'Encounters'),
            range: [0, segMax * (isPct ? 1.18 : 1.2)],
            gridcolor: '#e2e8f0',
        },
        yaxis: narrow
            ? { automargin: true, tickmode: 'array', tickvals: labelsRev, ticktext: rev(tickLabels), tickfont: { size: 10 } }
            : { automargin: true, tickfont: { size: 13 } },
        bargap: 0.3,   // 棒の太さ = 行の70%: 棒の間に空間を入れて見やすくする
        margin: { t: narrow ? 96 : 70, b: 70, l: 0, r: narrow ? 24 : 30 },
        paper_bgcolor: '#fff',
        plot_bgcolor: '#fff',
        height: chartHeight,
        autosize: false,   // 親コンテナ (maxHeight 880 のスクロール枠) に高さを塞がれないように固定
    }, { responsive: true, displayModeBar: false });

    // ★ 幅の確定: 初期描画時にコンテナ表示幅がまだ決まっていないケースがあるため、
    //   親要素の実際の幅で明示的に張り直す (autosize:false なので以後は自分で追従させる)
    try {
        const w = Math.max(320, plotDiv.parentElement.clientWidth || 0);
        if (w) await Plotly.relayout(plotDiv, { width: w });
    } catch (e) { /* 幅調整失敗時は初期幅のまま */ }

    // ★ リッチカード用の行データ (上→下順): 名前ラベル・棒・その間の隙間のどれに乗っても同じ内容を出す
    //   charHp/charTnVals = (参考) そのキャラ全ランの分布。カートで共通スケールを算出する
    //   gkey = 共通軸グループ: 「Act|種別」 (通常敵は lv帯で細分: gkeyOf)
    // 共通軸グループ: 基本 = Act|種別。通常敵 (雑魚) はさらに Act1〜3 内で出現レベル帯
    //   (ルート選択と同じ: lv0〜5=序盤 / lv5〜10=中盤 / lv10〜15=終盤) で区切る
    const gkeyOf = (nm) => {
        const kind = nm[2] || '?';
        const act = Number.isFinite(nm[3]) ? nm[3] : 99;
        let band = '';
        if (kind === 'e' && act >= 1 && act <= 3 && Number.isFinite(nm[4])) {
            band = nm[4] < 5 ? 'E' : nm[4] < 10 ? 'M' : 'L';   // 序盤 / 中盤 / 終盤 (MinLevel 基準)
        }
        return `A${act}|${kind}${band ? '|' + band : ''}`;
    };
    const rateTxtOf = (enc, hp, sp, both) => {
        const h = hp + sp + both;
        const p = (h / enc * 100).toFixed(1).replace(/\.0$/, '');
        return `${p}%(${h}/${enc})`;
    };
    hfBarsRowData = sorted.map(([c], i) => {
        const nm = hardFightsNames[c] || [];
        return {
            label: labels[i],
            enc: encVals[i],
            rate: rateTxt[i],
            hpHard: segHp.get(c) || 0,
            spHard: segSp.get(c) || 0,
            bothHard: segBoth.get(c) || 0,
            hpVals: (encHp.get(c) || []).slice().sort((x, y) => x - y),
            tnVals: (encTn.get(c) || []).slice().sort((x, y) => x - y),
            gkey: gkeyOf(nm),
            charName: searchChar,
            charEncN: searchChar ? (charEnc.get(c) || 0) : 0,
            charHpHard: searchChar ? (charSegHp.get(c) || 0) : 0,
            charSpHard: searchChar ? (charSegSp.get(c) || 0) : 0,
            charBothHard: searchChar ? (charSegBoth.get(c) || 0) : 0,
            charRate: searchChar ? rateTxtOf(charEnc.get(c) || 0, charSegHp.get(c) || 0, charSegSp.get(c) || 0, charSegBoth.get(c) || 0) : null,
            charHpVals: searchChar ? (charHp.get(c) || []).slice().sort((x, y) => x - y) : null,
            charTnVals: searchChar ? (charTn.get(c) || []).slice().sort((x, y) => x - y) : null,
        };
    });

    // ★ ボス行だけキャラ絵 (img/boss/*.avif) をラベル脇に重ねる: automargin で決まった左余白に
    //   画像分の余白を足して再レイアウトし、その空いた領域に <img> を重ねる
    hfBarsPlotDiv = plotDiv;
    hfBarsBossRows = sorted.map((row, i) => ({ code: row[0], idx: i }))
        .filter(x => (hardFightsNames[x.code] || [])[2] === 'b');
    if (hfBarsBossRows.length) {
        try {
            const sz = plotDiv._fullLayout._size;
            hfBarsBumpedMargin = Math.round((sz.l || 0) + 26);
            await Plotly.relayout(plotDiv, { 'margin.l': hfBarsBumpedMargin });
        } catch (e) { /* レイアウト調整失敗時は画像位置がずれるだけ */ }
    }
    positionBossAvatarOverlay();
    positionHfRowHover();
    // レイアウト完全確定後 (tick ラベル配置後) にもう一度張り直す
    try {
        plotDiv.on('plotly_afterplot', positionBossAvatarOverlay);
        plotDiv.on('plotly_afterplot', positionHfRowHover);
    } catch (e) { /* イベント無視 */ }
}

// window リサイズ (responsive 再レイアウト) 後に幅・余白と画像位置を張り直す
window.addEventListener('resize', () => {
    if (!hfBarsPlotDiv || !hfBarsBossRows.length) return;
    window.setTimeout(() => {
        if (!hfBarsPlotDiv || !document.body.contains(hfBarsPlotDiv)) return;
        try {
            const w = Math.max(320, hfBarsPlotDiv.parentElement.clientWidth || 0);
            if (w) Plotly.relayout(hfBarsPlotDiv, { width: w });
        } catch (e) { /* 無視 */ }
        ensureBossAvatarSpace();
        positionHfRowHover();
    }, 120);
});

// --- NEW: Aggregated Timeline Cache and Fetcher ---
const characterTimelineCache = new Map();

// --- 苦戦戦闘 (ΔHp>=15) / スペルカード使用 (ΔP>=50) per-run 情報 (data/hard_fights.json) ---
const hardFightsByChar = {};   // { character: { runId: [ {si,a,l,dh,sp,g,j,e} ] } }
const hardFightsNames = {};    // { code ('gid1+gid2'): [jaName, enName] }  遭遇/苦戦集計用の名前テーブル
const hardFightsEncs = {};     // { character: { runId: [code, ...] } }      全戦闘ステーションの遭遇リスト
const hardFightsBvals = {};    // { character: { runId: [[ΔHp(純損失・回復は負)|null, Rounds|null], ...] } }  encs と同順に並ぶ (敵ごとの HP/ターン IQR 集計用・2026-10-31)
const hardFightsPos = {};      // { character: { runId: [[Act, Level], ...] } }      encs と同順の戦闘ノード位置 (Act/Lv×敵 厳密フィルタ用・2026-11-17)
const hardFightsStats = {};    // { character: { runId: {L:総ライフ喪失, LA:[Act別喪失x4], S:スペル回数, T:{'{act}{kind}':[ターン和,戦闘数]}} } }
const hardFightsSts = {};      // { character: { runId: [[si, Hp, Power, Money], ...] } }  戦闘以外で状態が動いた地点 (2026-11-24)
let hardFightsPromise = null;
let hardFightsDataOk = false;  // stats (data.stats) の読み込みに成功したか (失敗時は検索時に再試行)
// hard_fights_ns.json から統合された runId (統計外ラン)。参考値 (キャラ全ラン) は統計母集団固定のため
// このSetに載るランは参考集計から除外する (敵別戦績タブ=統計データと同じ母集団に揃える)
const hardFightsNsRunIds = new Set();
let hoveredTooltipLink = null; // マウスが乗っているリンク (遅延ロード後の再描画でのみ参照)

// --- レイジーロード中の進捗表示 (P-04) ---
// 重い JSON (hard_fights / run_details / ns系) の取得中、検索フォーム下に状況を表示する。
// 複数ロードが並走してもカウンタで管理し、全完了で消える。
let _rfPendingDataLoads = 0;
window.rfDataLoadBegin = function (text) {
    _rfPendingDataLoads++;
    const el = document.getElementById('rf-data-status');
    if (el && text) { el.textContent = '⏳ ' + text; el.style.display = 'inline-block'; }
};
window.rfDataLoadEnd = function () {
    _rfPendingDataLoads = Math.max(0, _rfPendingDataLoads - 1);
    if (_rfPendingDataLoads === 0) {
        const el = document.getElementById('rf-data-status');
        if (el) el.style.display = 'none';
    }
};

function loadHardFights(force) {
    if (hardFightsPromise && !force) return hardFightsPromise;
    const isLocal = window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1';
    const basePath = isLocal ? `/card_effectiveness_reports/data/` : './data/';
    const ver = (typeof DATA_VERSION !== 'undefined') ? DATA_VERSION : '';
    if (window.rfDataLoadBegin) window.rfDataLoadBegin('遭遇データ (hard_fights.json ~6.8MB) を読み込み中… (初回のみ)');
    hardFightsPromise = fetch(`${basePath}hard_fights.json?v=${ver}`)
        .then(response => (response.ok ? response.json() : null))
        .then(data => {
            if (data && data.runs) Object.assign(hardFightsByChar, data.runs);
            if (data && data.names) Object.assign(hardFightsNames, data.names);
            if (data && data.encs) Object.assign(hardFightsEncs, data.encs);
            if (data && data.bvals) Object.assign(hardFightsBvals, data.bvals);
            if (data && data.pos) Object.assign(hardFightsPos, data.pos);
            if (data && data.sts) Object.assign(hardFightsSts, data.sts);
            if (data && data.stats) { Object.assign(hardFightsStats, data.stats); hardFightsDataOk = true; }
            hardFightsByChar.__loaded = true;
            return hardFightsByChar;
        })
        .catch(error => {
            console.error('[ERROR] Failed to fetch hard_fights.json:', error);
            hardFightsByChar.__loaded = true; // 失敗時は次の検索で再試行
            return hardFightsByChar;
        })
        .finally(() => { if (window.rfDataLoadEnd) window.rfDataLoadEnd(); });
    return hardFightsPromise;
}

// --- サンプリング除外ラン (統計外) のレイジーロード (run_details_ns.json / hard_fights_ns.json) ---
// チェックボックスONの検索時のみロードする (OFF時は通信・メモリゼロ / 従来動作のまま)。
let ALL_RUN_DETAILS_NS = null;     // null = 未ロード / 配列 = ロード済み (各エントリに s:0)
let nsAssetsPromise = null;        // run_details_ns + hard_fights_ns のロード Promise (1回だけ)

function isNsEnabled() {
    const el = document.getElementById('include-ns-checkbox');
    return !!(el && el.checked);
}

function _mergeCharDicts(dst, src) {
    // char -> {runId: ...} の2段辞書を run 単位でマージ (既存キーはメイン統計側を優先)
    if (!src) return;
    for (const ch in src) {
        if (!dst[ch]) { dst[ch] = src[ch]; continue; }
        dst[ch] = Object.assign({}, src[ch], dst[ch]);
    }
}

function ensureNsAssetsLoaded() {
    if (!isNsEnabled()) return Promise.resolve(null);
    if (nsAssetsPromise) return nsAssetsPromise;
    const isLocal = window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1';
    const basePath = isLocal ? `/card_effectiveness_reports/data/` : './data/';
    const ver = (typeof DATA_VERSION !== 'undefined') ? DATA_VERSION : '';
    if (window.rfDataLoadBegin) window.rfDataLoadBegin('統計外ランのデータ (ns系 ~5.5MB) を読み込み中… (初回のみ)');
    nsAssetsPromise = Promise.all([
        fetch(`${basePath}run_details_ns.json?v=${ver}`).then(r => (r.ok ? r.json() : null)),
        fetch(`${basePath}hard_fights_ns.json?v=${ver}`).then(r => (r.ok ? r.json() : null)),
    ]).then(async ([rdNs, hfNs]) => {
        // path_summary 圧縮形式 → 展開形式 (script.dev.js と同じデコーダを適用。
        // これがないと統計外ランの Act1-3 序盤/中盤/終盤アイコンが空になる)
        const decoder = window.decodeRunPathSummary;
        ALL_RUN_DETAILS_NS = (rdNs && rdNs.runs) ? rdNs.runs.map(r => decoder ? decoder(r) : r) : [];
        if (hfNs) {
            if (hfNs.encs) for (const ch in hfNs.encs) for (const rid in hfNs.encs[ch]) hardFightsNsRunIds.add(rid);
            _mergeCharDicts(hardFightsByChar, hfNs.runs);
            if (hfNs.names) for (const code in hfNs.names) if (!hardFightsNames[code]) hardFightsNames[code] = hfNs.names[code];
            _mergeCharDicts(hardFightsEncs, hfNs.encs);
            _mergeCharDicts(hardFightsBvals, hfNs.bvals);
            if (hfNs.pos) _mergeCharDicts(hardFightsPos, hfNs.pos);
            if (hfNs.sts) _mergeCharDicts(hardFightsSts, hfNs.sts);
            _mergeCharDicts(hardFightsStats, hfNs.stats);
            hardFightsDataOk = hardFightsDataOk || !!hfNs.stats;
        }
        rfPopulatePlayerDatalist();   // 統計外ランのプレイヤー名も入力補完に追加

        // 既にキャッシュ済みのキャラ別タイムラインにも ns を統合
        // (ns ONより前に検索してキャッシュが先に作られているケースへの対応)
        if (characterTimelineCache.size) {
            const cachedChars = Array.from(characterTimelineCache.keys()).filter(c => c && characterTimelineCache.get(c));
            await Promise.all(cachedChars.map(async ch => {
                try {
                    const resp = await fetch(`${basePath}${ch}_timelines_ns.json`);
                    if (resp.ok) {
                        const nsTl = await resp.json();
                        const cur = characterTimelineCache.get(ch) || {};
                        Object.assign(cur, nsTl);
                        characterTimelineCache.set(ch, cur);
                    }
                } catch (e) { /* ns ファイル無しは正常 */ }
            }));
        }
        console.log(`[DEBUG] NS assets loaded: ${ALL_RUN_DETAILS_NS.length} runs`);
        return ALL_RUN_DETAILS_NS;
    }).catch(err => {
        console.error('[ERROR] NS assets load failed:', err);
        ALL_RUN_DETAILS_NS = [];
        return ALL_RUN_DETAILS_NS;
    }).finally(() => { if (window.rfDataLoadEnd) window.rfDataLoadEnd(); });
    return nsAssetsPromise;
}

// このステーション自体が苦戦戦闘なら、ポップアップのタイトル用の苦戦マーク (🩸/⚡️) を返す
function rfOwnFightMark(entries, targetIdx) {
    if (!entries || targetIdx === Infinity || isNaN(targetIdx)) return '';
    const own = entries.find(e => e.si === targetIdx);
    if (!own) return '';
    let mark = '';
    if (own.dh >= 15) mark += ' 🩸';
    if (own.sp >= 1) mark += ' ⚡️';
    return mark;
}

// 5b (2026-11-23): 戦闘 1 回ごとのステータス (❤/⚡️/💰) を bvals (拡張: [ΔHp, Rounds, Hp, Power, Money]) と
// pos (拡張: [Act, Level, si]) から解決する。si = ステーション index (マスホバーの対応に使用)。
// ΔPower / ΔMoney は「直前の状態変化点」(戦闘終了時 or ショップ・イベント等の変化点) との差分
// (2026-11-24: 以前は直前の戦闘との差分にしていたため、間のショップ支出が戦闘の増減として出ていた)。
// 2026-11-24: 指定 si より前で最後に状態が動いた地点 (戦闘終了時 or 非戦闘の変化点) を返す。
// 戦闘マスの ΔPower / ΔMoney は「直前の戦闘」ではなく「直前の状態変化点」との差で出す
// (ショップ・イベントを挟むと、その支出や回復が戦闘の増減として誤表示されていた)。
function rfPrevStatusBefore(character, runId, si) {
    const pos = (hardFightsPos[character] || {})[runId];
    const bvs = (hardFightsBvals[character] || {})[runId];
    const sts = (hardFightsSts[character] || {})[runId] || [];
    let prev = null;
    if (pos && bvs) {
        for (let i = 0; i < pos.length; i++) {
            const p = pos[i][2];
            if (p < si && (!prev || p > prev.si)) prev = { si: p, hp: bvs[i][2], pow: bvs[i][3], money: bvs[i][4] };
        }
    }
    for (const s of sts) {
        if (s[0] < si && (!prev || s[0] > prev.si)) prev = { si: s[0], hp: s[1], pow: s[2], money: s[3] };
    }
    return prev;
}
function rfFightStatusByIndex(bvs, idx, prev) {
    const bv = bvs[idx];
    if (!bv) return null;
    const pow = bv[3], money = bv[4];
    return {
        hp: bv[2],
        dh: bv[0],
        pow,
        dp: (pow != null && prev && prev.pow != null) ? pow - prev.pow : null,
        money,
        dm: (money != null && prev && prev.money != null) ? money - prev.money : null,
    };
}
function rfFightStatus(character, runId, si) {
    const pos = (hardFightsPos[character] || {})[runId];
    const bvs = (hardFightsBvals[character] || {})[runId];
    if (!pos || !bvs) return null;
    const idx = pos.findIndex(p => p[2] === si);
    if (idx < 0) return null;
    return rfFightStatusByIndex(bvs, idx, rfPrevStatusBefore(character, runId, si));
}
// 2026-11-24: 指定 si の戦闘コード (encs は全戦闘ぶん pos と同順に並ぶ) — ホバーの敵名解決用
function rfBattleCodeAt(character, runId, si) {
    const pos = (hardFightsPos[character] || {})[runId];
    const encs = (hardFightsEncs[character] || {})[runId];
    if (!pos || !encs) return null;
    const idx = pos.findIndex(p => p[2] === si);
    return (idx >= 0 && encs[idx]) ? encs[idx] : null;
}
// 最終デッキ (stationIndex === 'final') 用: 最後の戦闘 = Act4 ボスの終了時ステータス
function rfLastBattleStatus(character, runId) {
    const pos = (hardFightsPos[character] || {})[runId];
    const bvs = (hardFightsBvals[character] || {})[runId];
    if (!pos || !bvs || !pos.length) return null;
    let last = 0;
    for (let i = 1; i < pos.length; i++) if ((pos[i][2] || 0) > (pos[last][2] || 0)) last = i;
    return rfFightStatusByIndex(bvs, last, rfPrevStatusBefore(character, runId, pos[last][2]));
}
// 指定 si 時点のステータス。戦闘マスは bvals (戦闘終了時)、戦闘以外のマスは sts
// (非戦闘で状態が動いた地点) のうち si 以下の最新スナップショットを使う。
// 非戦闘マスの Δ は「直前に状態が動いた地点」との差分 (ショップの支出・スキマの回復など)。
function rfStationStatus(character, runId, si) {
    if (si == null || isNaN(si)) return null;
    const pos = (hardFightsPos[character] || {})[runId];
    const bvs = (hardFightsBvals[character] || {})[runId];
    const sts = (hardFightsSts[character] || {})[runId] || [];
    let best = null;   // { si, kind, idx | v }
    if (pos && bvs) {
        for (let i = 0; i < pos.length; i++) {
            const p = pos[i][2];
            if (p <= si && (!best || p >= best.si)) best = { si: p, kind: 'b', idx: i };
        }
    }
    for (const s of sts) {
        if (s[0] <= si && (!best || s[0] >= best.si)) best = { si: s[0], kind: 's', v: s };
    }
    if (!best) return null;
    const prev = rfPrevStatusBefore(character, runId, best.si);
    if (best.kind === 'b') return rfFightStatusByIndex(bvs, best.idx, prev);
    // 非戦闘マス: 直前の変化点 (戦闘 or 非戦闘) を探す
    const v = best.v;
    return {
        hp: v[1],
        dh: (prev && prev.hp != null && v[1] != null) ? prev.hp - v[1] : null,
        pow: v[2],
        dp: (prev && prev.pow != null && v[2] != null) ? v[2] - prev.pow : null,
        money: v[3],
        dm: (prev && prev.money != null && v[3] != null) ? v[3] - prev.money : null,
    };
}
// --- 2026-11-24: ホバーのヘッダに「対象マス名」(戦闘なら敵名 / それ以外はマス種別) を出すためのヘルパ ---
const RF_STATION_LABEL = { Enemy: '敵', EliteEnemy: 'エリ', Boss: 'ボス', Adventure: '特殊', Shop: '店', Gap: 'スキマ', Supply: '補給', Trade: '交易', Select: '選択', Entry: '開始' };
const RF_STATION_LABEL_EN = { Enemy: 'Enemy', EliteEnemy: 'Elite', Boss: 'Boss', Adventure: 'Event', Shop: 'Shop', Gap: 'Gap', Supply: 'Supply', Trade: 'Trade', Select: 'Select', Entry: 'Start' };
let rfStationActLevelMapCache = null;
// si -> '1, Lvl 3' (STATION_MAP_GLOBAL の逆引き。renderRunFinderTab 外のヘルパからも使う)
function rfStationActLevelMap() {
    if (rfStationActLevelMapCache) return rfStationActLevelMapCache;
    const m = {};
    if (typeof STATION_MAP_GLOBAL !== 'undefined' && STATION_MAP_GLOBAL) {
        for (const key in STATION_MAP_GLOBAL) m[STATION_MAP_GLOBAL[key]] = key.replace('-', ', Lvl ');
    }
    rfStationActLevelMapCache = m;
    return m;
}
function rfFindRunById(runId) {
    for (const arr of [rfAllSortedRuns, lastFoundRuns]) {
        if (!arr) continue;
        for (const r of arr) if (r && r.run_id === runId) return r;
    }
    return null;
}
// 2026-11-24 (企画2): path_summary の STAGE_DEFINITIONS (Early 1-4 / Mid 6-9 / Late 11-14) は
// Lv5 / Lv10 / Lv15 を範囲外にするため、これらのマスは run_details から種別が取れない。
// raw ログ全 3,549 ランで種別が 100% 固定していることを確認済みなので、固定テーブルで補う
// (Act4 の店/スキマも path_summary 対象外 (Act1-3 のみ) のため同様に固定)。
const RF_FIXED_NODE_TYPES = {
    '1-5': 'Select', '2-5': 'Trade', '3-5': 'Trade',
    '1-10': 'Supply', '2-10': 'Supply', '3-10': 'Supply',
    '1-15': 'Gap', '2-15': 'Gap', '3-15': 'Gap',
    '4-1': 'Shop', '4-2': 'Gap',
};
// run の path_summary / bosses から Act-Level のマス種別を得る
function rfRunNodeType(run, act, level) {
    if (!run) return null;
    if (run.bosses) {
        for (const k in run.bosses) {
            const b = run.bosses[k];
            if (b && Number(k) === act && Number(b.level) === level) return 'Boss';
        }
    }
    if (run.path_summary) {
        for (const stage of ['Early', 'Mid', 'Late']) {
            const arr = run.path_summary[`Act${act} ${stage}`];
            if (!Array.isArray(arr)) continue;
            const node = arr.find(n => n && Number(n.level) === level);
            if (node) return node.type;
        }
    }
    return RF_FIXED_NODE_TYPES[`${act}-${level}`] || null;
}
// 対象マスの表示名: 戦闘マスは敵名 (encs/pos から解決)、それ以外はマス種別ラベル
function rfStationNameForRun(character, runId, si, actLevelStr) {
    const code = rfBattleCodeAt(character, runId, si);
    if (code) {
        const nm = hardFightsNames[code] || [];
        const name = (LANG === 'en') ? (nm[1] || nm[0]) : nm[0];
        return name || ((LANG === 'en') ? 'Battle' : '敵');
    }
    const al = actLevelStr || rfStationActLevelMap()[si];
    if (!al) return '';
    const m = String(al).match(/^(\d+),\s*Lvl\s*(\d+)$/);
    if (!m) return '';
    const type = rfRunNodeType(rfFindRunById(runId), parseInt(m[1], 10), parseInt(m[2], 10));
    if (!type) return '';
    return (LANG === 'en') ? (RF_STATION_LABEL_EN[type] || type) : (RF_STATION_LABEL[type] || type);
}

// 💗61(-15) ⚡️112(+8) 💰146(+25) 形式の文字列 (変化なしの項目は括弧を省略)。❤ は黒 notation のためピンクの 💗 を使用
function rfFightStatusText(st) {
    if (!st) return '';
    const paren = (v) => {
        if (v == null || v === 0) return '';
        return (v > 0) ? `(+${v})` : `(${v})`;
    };
    const hpLoss = (st.dh != null && st.dh > 0) ? `(-${st.dh})` : ((st.dh != null && st.dh < 0) ? `(+${-st.dh})` : '');
    let s = `💗${st.hp != null ? st.hp : '?'}${hpLoss}`;
    s += ` ⚡️${st.pow != null ? st.pow : '?'}${paren(st.dp)}`;
    s += ` 💰${st.money != null ? st.money : '?'}${paren(st.dm)}`;
    return s;
}

// 1 ラン分のエントリ -> ツールチップ末尾に付ける HTML
// targetIdx: 表示中ステーションの index (このステーション以前 = 自マスの戦闘を含めて出す / Infinity で全件)
function buildHardFightsHtml(entries, targetIdx, texts) {
    const isJa = LANG === 'ja';
    const list = (entries || []).filter(e => (targetIdx === Infinity || isNaN(targetIdx)) ? true : e.si <= targetIdx);
    if (!list.length) return '';
    const tTitle = texts.hard_fights_title || (isJa ? '苦戦した戦闘' : 'Hard Fights');
    const maxLines = 8;
    const shown = list.slice(0, maxLines);
    const lines = shown.map(e => {
        // 5a (2026-11-23): j/e (名前) は hard_fights.json から削除済み — names テーブル (g → [ja, en]) から解決する
        const nm = hardFightsNames[e.g] || [];
        const name = isJa ? (nm[0] || e.g) : (nm[1] || nm[0] || e.g);
        const flags = [];
        if (e.dh >= 15) flags.push(`🩸(-${e.dh})`);
        if (e.sp >= 1) flags.push('⚡️');
        return `<li>A${e.a}-L${e.l} - ${name} - ${flags.join(' / ')}</li>`;
    });
    if (list.length > maxLines) {
        lines.push(`<li>${isJa ? `…ほか ${list.length - maxLines}件` : `… ${list.length - maxLines} more`}</li>`);
    }
    return `<div class="deck-tooltip-title deck-tooltip-title-hf">${tTitle} (${list.length})</div>`
         + `<ul class="deck-tooltip-list deck-tooltip-list-hf">${lines.join('')}</ul>`;
}

// --- 2026-11-24 (企画3): 検索結果サマリー -------------------------------------------
//   検索結果表の下に、母集団のデッキ在籍 Top20 / ピック(入手) Top20 / 被弾・スペル推定を表示する。
//   Act+Lv 指定時は「そのマス通過時点」で集計 (デッキは timelines から再構築、ピック/戦闘は si 以下のみ)。
//   未指定時は最終デッキ + 全戦闘。初期カード (Basic 24 種) は Top から除外。
const RF_SUM_STAGES = { battle: '戦闘報酬', shop: '店', gap: 'スキマ', event: 'イベント', other: 'その他' };
const RF_SUM_STAGES_EN = { battle: 'Battle', shop: 'Shop', gap: 'Gap', event: 'Event', other: 'Other' };
// Top 集計から除外するカード: Zhukeling (式神トークン・timelines の initial に常時付加されるため 100% になる)
const RF_SUM_EXCLUDE_CARDS = ['Zhukeling'];
// カード種別アイコン (カード総選挙タブと同じ img/types/*.avif)。lookup_tables.cards[].Type と対応
const RF_SUM_TYPES = ['Attack', 'Skill', 'Defense', 'Ability', 'Tool', 'Status', 'Friend', 'Misfortune'];
function rfSumTypeIcon(cardId) {
    const lt = (typeof ALL_DATA !== 'undefined' && ALL_DATA && ALL_DATA.lookup_tables) ? ALL_DATA.lookup_tables : null;
    const c = (lt && lt.cards) ? lt.cards[cardId] : null;
    const t = c && c.Type;
    return (t && RF_SUM_TYPES.indexOf(t) !== -1) ? `<img class="ticon" src="img/types/${t}@2x.avif" onerror="this.style.display='none'">` : '';
}
// 強化 (up_c) が記録されるマス種別は rfSummaryPickPlace と同じ分類を使う
// Act+Lv 両方指定かつ station_map に存在するときのみ「段階集計」(target si) になる
function rfSummaryTargetSi(actFilter, levelFilter) {
    if (!actFilter || !levelFilter || typeof STATION_MAP_GLOBAL === 'undefined' || !STATION_MAP_GLOBAL) return null;
    const si = STATION_MAP_GLOBAL[`${actFilter}-${levelFilter}`];
    return (si === undefined) ? null : si;
}
function rfSummaryCardName(cardId) {
    const lt = (typeof ALL_DATA !== 'undefined' && ALL_DATA && ALL_DATA.lookup_tables) ? ALL_DATA.lookup_tables : null;
    const c = (lt && lt.cards) ? lt.cards[cardId] : null;
    if (!c) return cardId;
    return (typeof LANG !== 'undefined' && LANG === 'en') ? (c.EN || c.JA || cardId) : (c.JA || c.EN || cardId);
}
// add_c が発生したマスの入手分類 (戦闘報酬 / 店 / スキマ / イベント / その他)
function rfSummaryPickPlace(run, si) {
    const al = rfStationActLevelMap()[si];
    let type = null;
    if (al) {
        const m = String(al).match(/^(\d+),\s*Lvl\s*(\d+)$/);
        if (m) type = rfRunNodeType(run, parseInt(m[1], 10), parseInt(m[2], 10));
    }
    if (type === 'Enemy' || type === 'EliteEnemy' || type === 'Boss') return 'battle';
    if (type === 'Shop') return 'shop';
    if (type === 'Gap') return 'gap';
    if (type === 'Adventure') return 'event';
    return 'other';
}
// 1 ラン分の戦闘統計 (被弾 / スペル推定)。maxSi 指定時は si 以下の戦闘のみ。
// スペル推定はサイトの ⚡️ と同定義: 戦闘中の P 減少量が閾値以上 (通常 50 / ボス 10)。
// 状態変化点 (戦闘 = bvals, 非戦闘 = sts) を si 昇順にたどり、直前の P との差で判定する。
function rfSummaryBattleAgg(character, runId, maxSi) {
    const pos = (hardFightsPos[character] || {})[runId];
    const bvs = (hardFightsBvals[character] || {})[runId];
    if (!pos || !bvs) return null;
    const encs = (hardFightsEncs[character] || {})[runId] || [];
    const sts = (hardFightsSts[character] || {})[runId] || [];
    const events = [];
    for (let i = 0; i < pos.length; i++) events.push({ si: pos[i][2], battle: true, idx: i });
    for (const s of sts) events.push({ si: s[0], battle: false, v: s });
    events.sort((a, b) => a.si - b.si);
    let battles = 0, dmgSum = 0, dmgBattles = 0, spelled = 0, heals = 0;
    let prevPow = null, prevHp = null;
    for (const ev of events) {
        if (maxSi != null && ev.si > maxSi) break;
        if (ev.battle) {
            const bv = bvs[ev.idx];
            if (!bv) continue;
            battles++;
            if (typeof bv[0] === 'number' && bv[0] > 0) { dmgSum += bv[0]; dmgBattles++; }
            const hp = bv[2], pow = bv[3];
            if (hp != null && prevHp != null && hp > prevHp) heals++;
            if (pow != null && prevPow != null) {
                const dp = prevPow - pow;
                if (dp > 0) {
                    const code = encs[ev.idx];
                    const kind = (code && hardFightsNames[code]) ? hardFightsNames[code][2] : null;
                    if (dp >= (kind === 'b' ? 10 : 50)) spelled++;
                }
            }
            prevPow = (pow != null) ? pow : prevPow;
            prevHp = (hp != null) ? hp : prevHp;
        } else {
            const v = ev.v;
            if (v[1] != null && prevHp != null && v[1] > prevHp) heals++;
            prevHp = (v[1] != null) ? v[1] : prevHp;
            prevPow = (v[2] != null) ? v[2] : prevPow;
        }
    }
    return { battles, dmgSum, dmgBattles, spelled, heals };
}
function rfAggregateSearchSummary(runs, actFilter, levelFilter) {
    const targetSi = rfSummaryTargetSi(actFilter, levelFilter);
    const stageMode = targetSi != null;
    const deckCount = new Map();   // cardId -> 在籍ラン数
    const copySum = new Map();     // cardId -> 合計枚数 (デッキ在籍・平均枚数表示用)
    const upCount = new Map();     // cardId -> { runs, adds, places }  強化 (2026-11-24: ピック集計から変更)
    const upInDeck = new Map();    // cardId -> 在籍ランのうち強化もしたラン数 (デッキ在籍バーの重ね表示用)
    let deckRuns = 0, deckSizeSum = 0, nNs = 0;
    let battleRuns = 0, battlesSum = 0, dmgSum = 0, spelledSum = 0;
    const initialCache = new Map();
    const getInitial = (ch, tl) => {
        if (initialCache.has(ch)) return initialCache.get(ch);
        let initial = null;
        if (tl) for (const rid in tl) { if (tl[rid] && tl[rid].initial) { initial = tl[rid].initial.c || []; break; } }
        initialCache.set(ch, initial);
        return initial;
    };
    const isStarter = (id, ch) => (typeof lbolIsStarterCard === 'function') ? lbolIsStarterCard(id, ch) : false;
    for (const run of runs) {
        if (!run) continue;
        const ch = run.character, rid = run.run_id;
        if (run.s === 0) nNs++;
        const tl = characterTimelineCache.get(ch);
        const rt = tl ? tl[rid] : null;
        // --- 強化: up_c (Cards_log Type='Upgrade') を集計 (スキマ・店・イベント等) ---
        //   2026-11-24: ピック (add_c) はデッキ在籍と中身がほぼ同じになるため廃止し、
        //   強化ランキングに変更。初期カードの強化 (SakuyaBlockU 等) も実際の行動なので対象に含める
        //   (除外は Zhukeling のみ)。
        //   upIdsThisRun = このランで (集計範囲内で) 強化したカード → デッキ在籍バーの「強化済み」重ね表示にも使う
        let upIdsThisRun = null;
        if (rt && rt.changes) {
            for (const siStr in rt.changes) {
                const si = Number(siStr);
                if (stageMode && si > targetSi) continue;
                const chg = rt.changes[siStr];
                if (!chg || !chg.up_c || !chg.up_c.length) continue;
                const place = rfSummaryPickPlace(run, si);
                for (const id of chg.up_c) {
                    if (RF_SUM_EXCLUDE_CARDS.indexOf(id) !== -1) continue;
                    (upIdsThisRun || (upIdsThisRun = new Set())).add(id);
                    const rec = upCount.get(id) || { runs: 0, adds: 0, places: {} };
                    rec.adds++;
                    rec.places[place] = (rec.places[place] || 0) + 1;
                    upCount.set(id, rec);
                }
            }
            if (upIdsThisRun) for (const id of upIdsThisRun) upCount.get(id).runs++;
        }
        // --- デッキ在籍 (段階集計時は timelines から再構築 / タイムライン無しランは初期デッキ扱い) ---
        let deckIds = null;
        if (!stageMode) {
            deckIds = run.cards || null;
        } else if (rt) {
            deckIds = reconstructDeckAtStation(rt, targetSi).cards;
        } else {
            deckIds = getInitial(ch, tl);
        }
        if (deckIds) {
            deckRuns++;
            deckSizeSum += deckIds.length;
            // 枚数 tally → 在籍ラン数 / 合計枚数 (平均枚数 = 合計枚数 / 集計ラン数 = act-trend の Avg/Run と同基準)
            const tally = new Map();
            for (const id of deckIds) tally.set(id, (tally.get(id) || 0) + 1);
            for (const [id, n] of tally) {
                if (isStarter(id, ch) || RF_SUM_EXCLUDE_CARDS.indexOf(id) !== -1) continue;
                deckCount.set(id, (deckCount.get(id) || 0) + 1);
                copySum.set(id, (copySum.get(id) || 0) + n);
                // 在籍ランのうち強化もしたラン (デッキ在籍バーの重ね表示用)
                if (upIdsThisRun && upIdsThisRun.has(id)) upInDeck.set(id, (upInDeck.get(id) || 0) + 1);
            }
        }
        // --- 戦闘統計 (被弾 / スペル推定) ---
        const agg = rfSummaryBattleAgg(ch, rid, stageMode ? targetSi : null);
        if (agg) {
            battleRuns++;
            battlesSum += agg.battles;
            dmgSum += agg.dmgSum;
            spelledSum += agg.spelled;
        }
    }
    const toTop = (m, limit) => [...m.entries()]
        .map(([id, v]) => (typeof v === 'number') ? { id, runs: v } : { id, ...v })
        .sort((a, b) => b.runs - a.runs || (b.adds || 0) - (a.adds || 0) || a.id.localeCompare(b.id))
        .slice(0, limit);
    return {
        stageMode,
        actFilter: actFilter || null,
        levelFilter: levelFilter || null,
        nRuns: runs.length,
        nNs,
        nDeckRuns: deckRuns,
        nBattleRuns: battleRuns,
        avgDeckSize: deckRuns ? deckSizeSum / deckRuns : null,
        // 累計被弾平均 (2026-11-24): 1 ランあたりの合計被弾の平均 (旧: 被弾平均/戦闘)
        avgDmg: battleRuns ? dmgSum / battleRuns : null,
        avgSpelled: battleRuns ? spelledSum / battleRuns : null,
        deckTop: toTop(deckCount, 40).map(e => ({ ...e, pct: deckRuns ? (e.runs / deckRuns) * 100 : 0, up: (upInDeck.get(e.id) || 0), avg: deckRuns ? (copySum.get(e.id) || 0) / deckRuns : 0 })),
        upTop: toTop(upCount, 40).map(e => ({ ...e, pct: deckRuns ? (e.runs / deckRuns) * 100 : 0, avg: deckRuns ? (e.adds || 0) / deckRuns : 0 })),
    };
}
function rfSummaryListHtml(items, base, barClass) {
    const max = items.length ? items[0].runs : 0;
    const isJa = (typeof LANG === 'undefined') || LANG !== 'en';
    return `<ol class="rf-sum-list">` + items.map((e, i) => {
        const w = max ? Math.max(2, Math.round(e.runs / max * 100)) : 0;
        const pct = e.pct != null ? e.pct.toFixed(1) : '0.0';
        let tip = '';
        if (e.places) {
            const labels = (typeof LANG !== 'undefined' && LANG === 'en') ? RF_SUM_STAGES_EN : RF_SUM_STAGES;
            tip = Object.keys(e.places).filter(k => e.places[k]).map(k => `${labels[k]} ${e.places[k]}`).join(' / ');
        } else if (e.up != null && e.up > 0) {
            // デッキ在籍バーの緑部分 (強化済みラン) の説明
            const upPct = base ? (e.up / base * 100).toFixed(1) : '0.0';
            tip = isJa ? `このうち ${e.up} ラン (${upPct}%) は強化済み` : `${e.up} of these runs (${upPct}%) include an upgraded copy`;
        }
        const title = tip ? ` title="${escAttr(tip)}${e.adds ? ` (${e.adds})` : ''}"` : (e.adds ? ` title="×${e.adds}"` : '');
        // デッキ在籍バー: 青 = 在籍ラン / 緑 = そのうち強化済みのラン (2026-11-24)
        let bar = `<span class="rf-sum-bar ${barClass || ''}">`;
        if (e.up != null && e.up > 0 && e.runs) {
            const upW = Math.max(2, Math.round(w * e.up / e.runs));
            bar += `<i style="width:${w}%"></i><span class="rf-sumbar-up" style="width:${Math.min(upW, w)}%"></span>`;
        } else {
            bar += `<i style="width:${w}%"></i>`;
        }
        bar += `</span>`;
        return `<li><span class="rf-sum-name"${title}>${rfSumTypeIcon(e.id)}${escAttr(rfSummaryCardName(e.id))}${(e.avg != null) ? ` <em class="rf-sum-avg">(${e.avg.toFixed(1)})</em>` : ''}</span>` +
            bar +
            `<span class="rf-sum-val">${e.runs} <em>(${pct}%)</em></span></li>`;
    }).join('') + `</ol>`;
}
function rfRenderSearchSummaryHtml(agg) {
    const isJa = (typeof LANG === 'undefined') || LANG !== 'en';
    const T = isJa ? {
        title: '検索結果サマリー', stage: (a, l) => ` (Act ${a}, Lvl ${l} 通過時点)`, final: ' (最終デッキ)',
        runs: '検索結果', nsRuns: '統計外', deck: '平均デッキ枚数', dmg: '累計被弾平均',
        spell: 'スペル使用 平均 (推定)', deckTop: 'デッキ在籍 Top 40 (初期カードを除く)',
        upTop: '強化 Top 40 (スキマ・店・イベントなど)',
        note: '名前の隣の (x.x) = 1ランあたり平均 (デッキ=平均採用枚数 / 強化=平均強化回数・全ラン基準)。累計被弾・スペル回数は戦闘ログからの推定値 (累計被弾 = 1 ランの被弾合計)。()内は集計ランに対する割合。デッキ在籍バーは 青=在籍ラン・緑=そのうち強化済みのラン (ホバーで詳細)。強化の内訳 (スキマ / 店 / イベント / 戦闘報酬 / その他) はカード名にカーソルで表示。数値は強化したラン数 (合計回数はホバー)',
    } : {
        title: 'Search result summary', stage: (a, l) => ` (as of Act ${a}, Lvl ${l})`, final: ' (final deck)',
        runs: 'Runs', nsRuns: 'Non-stat', deck: 'Avg deck size', dmg: 'Avg total HP loss',
        spell: 'Avg spell-card battles (est.)', deckTop: 'Deck presence Top 40 (excl. starters)',
        upTop: 'Upgrades Top 40 (gap / shop / events, etc.)',
        note: '(x.x) next to a name = per-run average (deck: avg copies / upgrades: avg upgrade count, all-run basis). Total HP loss & spell counts are estimated from battle logs (total HP loss = sum of damage taken in a run). (%) = share of aggregated runs. Deck bars: blue = runs with the card, green = upgraded ones among them (hover for details). Upgrade breakdown (gap / shop / event / battle reward) on card-name hover. Numbers show runs with at least one upgrade; hover for the total count.',
    };
    const stageTxt = agg.stageMode ? T.stage(agg.actFilter, agg.levelFilter) : T.final;
    const fmt = (v, suf) => (v == null) ? '—' : v.toFixed(1) + (suf || '');
    const chips = [
        `${T.runs}: ${agg.nRuns.toLocaleString()}${agg.nNs ? ` (${T.nsRuns} ${agg.nNs})` : ''}`,
        `${T.deck}: ${fmt(agg.avgDeckSize)}`,
        `${T.dmg}: ${fmt(agg.avgDmg)}`,
        `${T.spell}: ${fmt(agg.avgSpelled)}`,
    ].map(c => `<span class="rf-sum-chip">${c}</span>`).join('');
    return `
        <div class="rf-summary">
            <div class="rf-summary-head">${T.title}<span class="rf-sum-stage">${escAttr(stageTxt)}</span></div>
            <div class="rf-sum-chips">${chips}</div>
            <div class="rf-summary-cols">
                <div class="rf-summary-col">
                    <div class="rf-sum-col-title">${T.deckTop} <span class="rf-sum-base">(${agg.nDeckRuns.toLocaleString()})</span></div>
                    ${rfSummaryListHtml(agg.deckTop, agg.nDeckRuns, 'rf-sumbar-deck')}
                </div>
                <div class="rf-summary-col">
                    <div class="rf-sum-col-title">${T.upTop} <span class="rf-sum-base">(${agg.nDeckRuns.toLocaleString()})</span></div>
                    ${rfSummaryListHtml(agg.upTop, agg.nDeckRuns, 'rf-sumbar-pick')}
                </div>
            </div>
            <p class="rf-sum-note">${T.note}</p>
        </div>`;
}
async function rfFillSearchSummary(runs, actFilter, levelFilter) {
    const holder = document.getElementById('rf-search-summary');
    if (!holder || !runs || !runs.length) return;
    // 表示条件 (2026-11-24): Act と Level を両方指定 (そのマス通過時点) か、両方なし (最終デッキ) のときのみ。
    //   片方だけの指定は「どのマス時点か」を一意に決められないためサマリーは表示しない。
    const hasAct = !!(actFilter && String(actFilter).trim());
    const hasLevel = !!(levelFilter && String(levelFilter).trim());
    if (hasAct !== hasLevel) { holder.innerHTML = ''; return; }
    try {
        // ピック / 段階デッキ集計に timelines を使用 (検索時に全キャラ分ロード済みだが保険で再確保)
        const chars = new Set(runs.map(r => r.character).filter(Boolean));
        await Promise.all([...chars].map(ch => loadCharacterTimeline(ch)));
        const agg = rfAggregateSearchSummary(runs, actFilter, levelFilter);
        if (document.getElementById('rf-search-summary') !== holder) return;   // 再描画済みなら放棄
        holder.innerHTML = rfRenderSearchSummaryHtml(agg);
    } catch (e) {
        console.warn('[run-finder] search summary failed:', e);
    }
}

async function loadCharacterTimeline(charKey) {
    if (characterTimelineCache.has(charKey)) {
        return characterTimelineCache.get(charKey);
    }

    const isLocal = window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1';
    const basePath = isLocal ? `/card_effectiveness_reports/data/` : './data/';
    // timelines v2 (2026-11-22): add_c/rem_c が同マス同カードの複数枚を保持する形式。
    // fetch に ?v= が無いことへの対策で _v2 付きファイル名に移行 (旧名はフォールバック)。
    const vParam = (typeof DATA_VERSION !== 'undefined' && DATA_VERSION) ? `?v=${DATA_VERSION}` : '';
    const candidates = [
        `${basePath}${charKey}_timelines_v2.json${vParam}`,
        `${basePath}${charKey}_timelines.json`
    ];

    let data = null;
    for (const filePath of candidates) {
        try {
            const response = await fetch(filePath);
            if (response.ok) {
                data = await response.json();
                break;
            }
        } catch (e) { /* 次の候補へ */ }
    }
    if (!data) {
        console.warn(`[WARN] Timeline file not found for ${charKey} (${candidates.join(', ')}). This may be normal if the file doesn't exist.`);
        characterTimelineCache.set(charKey, null);
        return null;
    }
    // サンプリング除外ランのタイムライン (チェックボックスON時のみ取得・キャッシュに統合)
    if (isNsEnabled()) {
        const nsCandidates = [
            `${basePath}${charKey}_timelines_ns_v2.json${vParam}`,
            `${basePath}${charKey}_timelines_ns.json`
        ];
        for (const nsPath of nsCandidates) {
            try {
                const nsResp = await fetch(nsPath);
                if (nsResp.ok) {
                    const nsData = await nsResp.json();
                    Object.assign(data, nsData);   // run_id キー重複は無いはず (母集団が別のため)
                    break;
                }
            } catch (e) { /* ns ファイル無しは正常 (そのキャラに統計外ランが無い等) */ }
        }
    }
    characterTimelineCache.set(charKey, data);
    return data;
}


// --- Deck Reconstruction Function (from previous version) ---
function reconstructDeckAtStation(runTimeline, targetStationIndex) {
    if (!runTimeline || !runTimeline.initial) {
        return { cards: [], exhibits: new Set() };
    }

    const currentDeck = [...(runTimeline.initial.c || [])];
    const currentExhibits = new Set(runTimeline.initial.e || []);

    if (runTimeline.changes) {
        const sortedChangeKeys = Object.keys(runTimeline.changes).map(Number).sort((a, b) => a - b);

        for (const stationIdx of sortedChangeKeys) {
            if (stationIdx > targetStationIndex) {
                break;
            }
            const changesAtStation = runTimeline.changes[String(stationIdx)];
            if (changesAtStation) {
                if (changesAtStation.add_c) changesAtStation.add_c.forEach(id => currentDeck.push(id));
                if (changesAtStation.rem_c) {
                    changesAtStation.rem_c.forEach(idToRemove => {
                        const index = currentDeck.indexOf(idToRemove);
                        if (index > -1) currentDeck.splice(index, 1);
                    });
                }
                if (changesAtStation.add_e) changesAtStation.add_e.forEach(id => currentExhibits.add(id));
                if (changesAtStation.rem_e) changesAtStation.rem_e.forEach(id => currentExhibits.delete(id));
            }
        }
    }
    return { cards: currentDeck, exhibits: currentExhibits };
}


function applyIdFilters(itemIds, includeIds, excludeIds, includeLogic) {
    if (excludeIds.length > 0) {
        if (excludeIds.some(id => itemIds.includes(id))) return false;
    }
    if (includeIds.length > 0) {
        if (includeLogic === 'AND') {
            if (!includeIds.every(id => itemIds.includes(id))) return false;
        } else {
            if (!includeIds.some(id => itemIds.includes(id))) return false;
        }
    }
    return true;
}


let _rfSearchRunning = false;
async function performAdvancedSearch() {
    if (_rfSearchRunning) { console.log('[DEBUG] search already running — skip'); return; }
    _rfSearchRunning = true;
    rfManaSkipNotice = '';   // P-35: 通知は検索ごとにリセット
    console.log('[DEBUG] --- Starting Search (Final Performance Version) ---');
    const searchButton = document.getElementById('run-search-button');
    const originalButtonText = searchButton.textContent;
    searchButton.disabled = true;
    searchButton.textContent = '検索中...';

    try {
        // --- 0. 検索履歴比較用の stats (hard_fights.json) を必ず先にロード ---
        //   (4MB の JSON なので、読み込み完了前に検索すると履歴の平均が空になる)
        try {
            if (!hardFightsDataOk) {
                await loadHardFights(true);
            } else {
                await loadHardFights();
            }
        } catch (e) { /* stats が無くても検索自体は継続 (履歴は '-' 表示になる) */ }

        // --- 0.5 サンプリング除外ラン (チェックボックスON時のみレイジーロード) ---
        const includeNs = isNsEnabled();
        if (includeNs) await ensureNsAssetsLoaded();

        // --- 0.7 ラン詳細 (run_details.json ~3.6MB) のレイジーロード (P-03) ---
        //   プレイヤー名の入力補完や検索母集団の前に必ず完了させておく。
        await window.ensureRunDetailsLoaded();

        // --- 0.8 終了時マナ基盤キャッシュ (マナ条件があればフィルタに使用) ---
        await ensureManaMapLoaded();

        // --- 1. Get all filter values from UI ---
        rfPopulatePlayerDatalist();   // プレイヤー名の入力補完 (自動検索でもここで更新される)
        const selectedChar = document.getElementById('character-select').value;
        const actFilter = document.getElementById('act-filter').value;
        const levelFilter = document.getElementById('level-filter').value;
        const includeLogic = document.getElementById('include-logic-and').checked ? 'AND' : 'OR';
        const deckSizeOperator = document.getElementById('deck-size-operator').value;
        const deckSizeValueStr = document.getElementById('deck-size-value').value;
        const deckSizeValue = deckSizeValueStr ? parseInt(deckSizeValueStr, 10) : NaN;
        // プレイヤー名フィルタ (空なら指定なし = 全件 / 部分一致)
        const playerNameFilter = (document.getElementById('player-name-filter').value || '').trim();
        const getItemsFromList = (listId) => Array.from(document.getElementById(listId).children).map(tag => tag.dataset.itemName);
        const includeKeywords = getItemsFromList('include-items-list');
        const excludeKeywords = getItemsFromList('exclude-items-list');
        const includeEnemies = Array.from((document.getElementById('enemy-in-list') || { children: [] }).children).map(tag => tag.dataset.itemName);
        const excludeEnemies = Array.from((document.getElementById('enemy-ex-list') || { children: [] }).children).map(tag => tag.dataset.itemName);
        const enemyLogicEl = document.querySelector('input[name="enemy-logic"]:checked');
        const enemyLogic = enemyLogicEl ? enemyLogicEl.value : 'AND';
        // マナ基盤フィルタ (指定色が終了時 BaseMana に N 個以上含まれるランのみ)
        const manaMin = {};
        document.querySelectorAll('.rf-mana-cond input').forEach(inp => {
            const v = +inp.value || 0;
            if (v > 0) manaMin[inp.dataset.m] = v;
        });
        const rfManaFilterOn = Object.keys(manaMin).length > 0 && !RF_MANA_MAP_FAILED;   // P-35: 読み込み失敗時はマナ条件を無視
        if (Object.keys(manaMin).length > 0 && RF_MANA_MAP_FAILED) {
            rfManaSkipNotice = (UI_TEXT.run_finder && UI_TEXT.run_finder.mana_skip_notice) || '';
        }
        // P-52: 最終デッキのみ検索トグル (OFF = 最終デッキ判定 / ON = 道中取得も含む)
        const timelineItemSearch = document.getElementById('timeline-search-toggle')?.checked || false;
        // 敵遭遇の Act/Lv 限定 (encAt): Act/Lv 指定時にその Act/Lv での遭遇のみを対象にする
        const encAtFilter = document.getElementById('enc-at-checkbox')?.checked || false;
        const useTimelineSearch = !!actFilter || !!levelFilter || (deckSizeOperator !== 'any' && !isNaN(deckSizeValue))
            || excludeKeywords.length > 0
            || (includeKeywords.length > 0 && timelineItemSearch);
        // P-19: ルート条件 (Act別・マス種別の通過回数) を行 DOM から収集
        const routeConds = rfCollectRouteConds();


        const searchCriteria = {
            character: selectedChar !== 'All' ? selectedChar : null,
            act: actFilter ? actFilter : null,
            level: levelFilter ? levelFilter : null,
            deckSize: (deckSizeOperator !== 'any' && !isNaN(deckSizeValue)) ? { operator: deckSizeOperator, value: deckSizeValue } : null,
            playerName: playerNameFilter || null,
            includeItems: includeKeywords.length > 0 ? { items: includeKeywords, logic: includeLogic } : null,
            excludeItems: excludeKeywords.length > 0 ? excludeKeywords : null,
            includeEnemies: includeEnemies.length > 0 ? { enemies: includeEnemies, logic: enemyLogic } : null,
            excludeEnemies: excludeEnemies.length > 0 ? excludeEnemies : null,
            includeNs: includeNs ? true : null,
            mana: rfManaFilterOn ? { ...manaMin } : null,
            routeConds: routeConds.length ? routeConds : null,
            encAt: encAtFilter ? true : null,
            timelineItemSearch: timelineItemSearch || null
        };


        // --- 2. Get base data from GLOBAL variables ---
        if (!ALL_RUN_DETAILS || !STATION_MAP_GLOBAL) {
            console.error('[FATAL] Global data (ALL_RUN_DETAILS or STATION_MAP_GLOBAL) not found! Aborting.');
            return;
        }

        // --- 3. Filter by character if specified (チェックボックスON時はサンプリング除外ランも母集団に追加) ---
        let runsToSearch = (selectedChar === 'All')
            ? ALL_RUN_DETAILS
            : ALL_RUN_DETAILS.filter(run => run.character === selectedChar);
        if (includeNs && ALL_RUN_DETAILS_NS && ALL_RUN_DETAILS_NS.length) {
            const nsPool = (selectedChar === 'All')
                ? ALL_RUN_DETAILS_NS
                : ALL_RUN_DETAILS_NS.filter(run => run.character === selectedChar);
            runsToSearch = runsToSearch.concat(nsPool);
        }

        console.log(`[DEBUG] Initial run count for character '${selectedChar}': ${runsToSearch.length}`);

        // --- 4. Prepare for filtering ---
        const nameToIdMap = new Map();
        const cardNameKey = LANG === 'en' ? 'EN' : 'JA';
        const exhibitNameKey = LANG === 'en' ? 'name_en' : 'name';
        for (const id in ALL_DATA.lookup_tables.cards) {
            const data = ALL_DATA.lookup_tables.cards[id];
            if (data[cardNameKey]) nameToIdMap.set(data[cardNameKey].toLowerCase(), id);
        }
        for (const id in ALL_DATA.lookup_tables.exhibits) {
            const data = ALL_DATA.lookup_tables.exhibits[id];
            if (data[exhibitNameKey]) nameToIdMap.set(data[exhibitNameKey].toLowerCase(), id);
        }
        const includeIds = includeKeywords.map(k => nameToIdMap.get(k.toLowerCase())).filter(Boolean);
        const excludeIds = excludeKeywords.map(k => nameToIdMap.get(k.toLowerCase())).filter(Boolean);

        // --- 4.5 敵グループフィルタ: 表示名 → 敵コード変換 (hard_fights names テーブル / 検索条件の単位は苦戦グラフの行と同じ) ---
        const enemyCodeByDisp = new Map();
        for (const code in hardFightsNames) {
            const nm = hardFightsNames[code] || [];
            if (!nm.length) continue;
            const plain = (LANG === 'en') ? (nm[1] || nm[0]) : (nm[0] || nm[1]);
            if (!plain) continue;
            const act_s = (typeof nm[3] === 'number') ? nm[3] : '?';
            const kind = nm[2] || 'e';
            const MARK = { x: '🟣', b: '🔴' };
            const prefixed = `A${act_s} ${plain}`;
            const marked = `A${act_s} ${MARK[kind] || ''}${plain}`;
            if (!enemyCodeByDisp.has(marked.toLowerCase())) enemyCodeByDisp.set(marked.toLowerCase(), code);
            if (!enemyCodeByDisp.has(prefixed.toLowerCase())) enemyCodeByDisp.set(prefixed.toLowerCase(), code);
            if (!enemyCodeByDisp.has(plain.toLowerCase())) enemyCodeByDisp.set(plain.toLowerCase(), code);
        }
        // 表示名 → コード群 (同名コードすべてに解決: 同一グループが複数 Act/Lv に現れる場合の曖昧を解消)
        //   names[code] = [ja, en, kind, act, level]
        const enemyCodesByPlain = {};
        for (const code in hardFightsNames) {
            const nm = hardFightsNames[code] || [];
            if (!nm.length) continue;
            const plain = (LANG === 'en') ? (nm[1] || nm[0]) : (nm[0] || nm[1]);
            if (!plain) continue;
            const key = plain.toLowerCase();
            (enemyCodesByPlain[key] || (enemyCodesByPlain[key] = [])).push(code);
        }
        const _enemyActPrefix = (s) => { const m = /(?:^|\s)A(\d+)\s/.exec(' ' + String(s)); return m ? parseInt(m[1], 10) : null; };
        const _enemyStrip = (s) => String(s).replace(/^A\d+\s*/, '').replace(/[🟣🔴✨]/gu, '').trim();
        // セット = { codes, act }: codes = 同名コードすべて / act = 表示名の接頭辞 (A1 など・無ければ null)。
        //   非厳密モードではこの act でコードを絞る (従来挙動)。
        //   厳密モード (encAt) では actFilter/levelFilter を優先し、戦闘ごとのノード位置 (hardFightsPos) で判定する。
        const resolveEnemySets = (dispNames) => dispNames.map(n => {
            const plain = _enemyStrip(n).toLowerCase();
            return { codes: (enemyCodesByPlain[plain] || []).slice(), act: _enemyActPrefix(n) };
        });
        const includeEnemySets = resolveEnemySets(includeEnemies);
        const excludeEnemySets = resolveEnemySets(excludeEnemies);

        // --- 5. Perform the actual filtering loop ---
        const filteredRuns = [];
        const charactersToLoad = new Set(runsToSearch.map(r => r.character));

        // Load all necessary character timelines in parallel
        console.log(`[DEBUG] Needing timeline data for characters:`, Array.from(charactersToLoad));
        const timelinePromises = Array.from(charactersToLoad).map(char => loadCharacterTimeline(char));
        await Promise.all(timelinePromises);
        console.log(`[DEBUG] All necessary timelines loaded and cached.`);

        for (const run of runsToSearch) {
            // --- 最終デッキのみ検索 (P-52): アイテムを run.cards + run.exhibits で判定 ---
            //   (修正 2026-11-16: この判定がマナ条件ブロックの内側に埋まっており、マナ条件未指定時に
            //    カード/展示品条件が丸ごと無視されるバグを修正。マナブロックの外へ移動、ロジックは不変)
            if (!timelineItemSearch && (includeIds.length > 0 || excludeIds.length > 0)) {
                const allFinalItems = [...(run.cards || []), ...(run.exhibits || [])];
                if (!applyIdFilters(allFinalItems, includeIds, excludeIds, includeLogic)) continue;
            }
            // マナ基盤フィルタ (終了時 BaseMana に指定色が N 個以上含まれるランのみ / 読み込み失敗時はスキップ)
            if (rfManaFilterOn) {
                const mb = RF_MANA_MAP[run.run_id];
                if (!mb) continue;
                let manaOk = true;
                for (const mc in manaMin) {
                    if (mb.split(mc).length - 1 < manaMin[mc]) { manaOk = false; break; }
                }
                if (!manaOk) continue;
            }
            // プレイヤー名フィルタ (先にやって軽減) — 大小文字を区別しない部分一致
            if (playerNameFilter && !(run.player_name || '').toLowerCase().includes(playerNameFilter.toLowerCase())) continue;
            // ルート条件フィルタ (P-19): path_summary を Act別・マス種別の通過回数へ展開して判定
            if (routeConds.length && !rfRouteCondOk(run, routeConds)) continue;
            // 敵グループフィルタ (hard_fights encs = そのランが遭遇した敵コード一覧 / セット内はどれか 1 つでも一致で OK)
            const runEncs = (hardFightsEncs[run.character] || {})[run.run_id];
            if (includeEnemySets.length > 0 || excludeEnemySets.length > 0) {
                if (!runEncs && includeEnemySets.length > 0) continue;   // 遭遇データが無いランは「含む」条件に合致しない
                // 厳密モード (encAt) 用: 戦闘ごとのノード位置 (pos) で Act/Lv を判定する
                const runPos = (hardFightsPos[run.character] || {})[run.run_id] || null;
                const hasMatch = (setObj) => {
                    const actN = encAtFilter ? (actFilter ? parseInt(actFilter, 10) : setObj.act) : setObj.act;
                    const lvN = encAtFilter ? (levelFilter ? parseInt(levelFilter, 10) : null) : null;
                    if (encAtFilter && (actN != null || lvN != null) && runPos) {
                        // pos あり: 戦闘 1 回ごとのノード位置で判定 (Lv 含む)
                        for (let i = 0; i < runEncs.length; i++) {
                            if (setObj.codes.indexOf(runEncs[i]) === -1) continue;
                            const pair = runPos[i] || [0, 0];
                            if (actN != null && pair[0] !== actN) continue;
                            if (lvN != null && pair[1] !== lvN) continue;
                            return true;
                        }
                        return false;
                    }
                    // 従来挙動: コード単位 (pos 無し / Act・Lv 指定なし)。pos 無しの旧データは Act 限定のみ
                    let codes = setObj.codes;
                    if (actN != null) codes = codes.filter(c => (hardFightsNames[c] || [])[3] === actN);
                    return codes.some(c => runEncs.indexOf(c) !== -1);
                };
                if (includeEnemySets.length > 0) {
                    let matched = true;
                    if (enemyLogic === 'AND') {
                        for (const setObj of includeEnemySets) { if (!hasMatch(setObj)) { matched = false; break; } }
                    } else {
                        matched = includeEnemySets.some(setObj => hasMatch(setObj));
                    }
                    if (!matched) continue;
                }
                if (excludeEnemySets.length > 0 && runEncs && excludeEnemySets.some(setObj => hasMatch(setObj))) continue;
            }
            const runWithDisplayData = { ...run };

            if (useTimelineSearch) {
                const charTimelines = characterTimelineCache.get(run.character);
                if (!charTimelines) {
                    continue; // Should not happen if pre-loading worked
                }
                const runTimeline = charTimelines[run.run_id];
                if (!runTimeline) {
                    continue; // This run doesn't have a timeline file, which is normal
                }

                let stationIndicesToSearch = [];
                const act = actFilter;
                const levelNum = levelFilter ? parseInt(levelFilter, 10) : 0;

                if (act && levelNum > 0) {
                    for (let level = levelNum; level <= 17; level++) { // Boss is 17
                        const key = `${act}-${level}`;
                        const targetIndex = STATION_MAP_GLOBAL[key];
                        if (targetIndex !== undefined) stationIndicesToSearch.push(targetIndex);
                    }
                } else if (act) {
                    const actPrefix = `${act}-`;
                    for (const key in STATION_MAP_GLOBAL) {
                        if (key.startsWith(actPrefix)) stationIndicesToSearch.push(STATION_MAP_GLOBAL[key]);
                    }
                } else if (levelNum > 0) {
                    const levelSuffix = `-${levelNum}`;
                    for (const key in STATION_MAP_GLOBAL) {
                        if (key.endsWith(levelSuffix)) stationIndicesToSearch.push(STATION_MAP_GLOBAL[key]);
                    }
                } else {
                    // If no act/level, but other timeline filters exist, search all stations
                    stationIndicesToSearch = Object.values(STATION_MAP_GLOBAL);
                }

                if (stationIndicesToSearch.length === 0 && (actFilter || levelFilter)) continue;

                let matched = false;
                for (const stationIndex of stationIndicesToSearch) {
                    const { cards, exhibits } = reconstructDeckAtStation(runTimeline, stationIndex);

                    if (deckSizeOperator !== 'any' && !isNaN(deckSizeValue)) {
                        const deckSize = cards.length;
                        if ((deckSizeOperator === 'lte' && deckSize > deckSizeValue) || (deckSizeOperator === 'gte' && deckSize < deckSizeValue)) {
                            continue; // このステーションは条件に合わない
                        }
                    }

                    if (timelineItemSearch) {
                        const allItemIds = [...cards, ...Array.from(exhibits)];
                        if (applyIdFilters(allItemIds, includeIds, excludeIds, includeLogic)) {
                            runWithDisplayData.displayDeckSize = cards.length;
                            runWithDisplayData.matchingStationIndex = stationIndex; // 合れたインデックスを保存
                            matched = true;
                            break; // 一致が見つかったのでループを抜ける
                        }
                    } else {
                        // 最終デッキ判定済み — このステーションに到達したことのみ確認
                        runWithDisplayData.displayDeckSize = cards.length;
                        runWithDisplayData.matchingStationIndex = stationIndex;
                        matched = true;
                        break;
                    }
                }
                if (matched) filteredRuns.push(runWithDisplayData);

            } else { // Final deck search (only boss filters were applied)
                runWithDisplayData.displayDeckSize = run.cards ? run.cards.length : 0;
                runWithDisplayData.matchingStationIndex = "final"; // 最終デッキを示す印
                filteredRuns.push(runWithDisplayData);
            }
        }

        // --- 6. Display results ---
        console.log(`[DEBUG] --- Search Finished. Found ${filteredRuns.length} runs. ---`);
        lastFoundRuns = filteredRuns;
        currentSortKey = 'run_id';
        currentSortOrder = 'asc';
        saveSearchHistory(searchCriteria, filteredRuns);   // ★ 検索履歴にスナップショット保存

        sortAndDisplayRuns(searchCriteria);


    } catch (error) {
        console.error("[FATAL] A critical error occurred during search:", error);
    } finally {
        _rfSearchRunning = false;
        searchButton.disabled = false;
        searchButton.textContent = originalButtonText;
    }
}

// --- 検索履歴比較 (localStorage / 検索 1 回ごとに平均値スナップショットを保存) ---
const RF_HISTORY_KEY = 'rf_search_history_v1';
const RF_HISTORY_MAX = 30;

function rfLoadHistory() {
    try {
        const list = JSON.parse(localStorage.getItem(RF_HISTORY_KEY)) || [];
        // stats 未ロードのまま記録された壊れた履歴 (ラン数>0 なのに平均なし) は自動で捨てる
        const clean = list.filter(h => !(h.n > 0 && !(h.nWith > 0)));
        if (clean.length !== list.length) rfSaveHistory(clean);
        return clean;
    } catch (e) { return []; }
}
function rfSaveHistory(list) {
    try { localStorage.setItem(RF_HISTORY_KEY, JSON.stringify(list.slice(0, RF_HISTORY_MAX))); } catch (e) { /* 付随機能なので失敗は無視 */ }
}
// 検索結果 run 集団の平均値を集計 (stats がないランは母数から除外)
function computeRunSetStats(runs) {
    const all = runs || [];
    let nWith = 0, loss = 0, turns = 0;
    const lossAct = [0, 0, 0, 0];
    const turnAgg = {};
    const versions = {};
    // 拾いAct → 所持率: dist[act]=拾ったラン数 / reached[act]=そのActで戦闘したラン数 / held[act]=そのAct開始時点で所持のラン数
    const dist = {}, reached = {}, held = {};
    const segValsAgg = {};   // 区間キー → ランごとの符号付き区間内平均ライフ値 (喪失=負・net=回復込み) → Q1/Q3 (IQR) 用
    const segTurnAgg = {};   // 区間キー → ランごとの区間内 1戦闘あたり平均ターン → Q1/Q3 (IQR) 用
    const runCums = [];   // 各ランの自キー分の符号付き累積 {key: [累積ライフ, 累積ターン]} (後段で全キー軸に frozen 展開 → Q1/Q3 用)
    let anyPickup = false;
    for (const r of all) {
        versions[r.version] = (versions[r.version] || 0) + 1;
        const st = (hardFightsStats[r.character] || {})[r.run_id];
        const pKey = stationIndexToKey(r.matchingStationIndex);
        const pAct = pKey ? pKey.split('-')[0] : null;
        if (pAct) { anyPickup = true; dist[pAct] = (dist[pAct] || 0) + 1; }
        if (!st) continue;
        nWith++;
        loss += st.L || 0;
        if (Array.isArray(st.LA)) for (let i = 0; i < 4; i++) lossAct[i] += st.LA[i] || 0;
        const stActs = new Set();
        for (const k in (st.T || {})) {
            stActs.add(k[0]);
            const v = st.T[k];
            const acc = turnAgg[k] || (turnAgg[k] = [0, 0, 0]);
            acc[0] += v[0];
            acc[1] += (v[1] || 1);
            acc[2] += (v.length > 2 ? v[2] : 0);   // ライフ喪失和 (旧データは 0 扱い)
            // Q1/Q3 用: このランの区間内 1戦闘あたり平均ライフ純損失 (符号付き: 喪失=負・回復=正)
            (segValsAgg[k] || (segValsAgg[k] = [])).push(-(v.length > 2 ? v[2] : 0) / (v[1] || 1));
            // Q1/Q3 用: このランの区間内 1戦闘あたり平均ターン
            (segTurnAgg[k] || (segTurnAgg[k] = [])).push(v[0] / (v[1] || 1));
            turns += v[0];
        }
        for (const a of stActs) {
            reached[a] = (reached[a] || 0) + 1;
            if (pAct && (parseInt(a, 10) >= parseInt(pAct, 10))) held[a] = (held[a] || 0) + 1;
        }
        // 区間累積: ランごとの自キー分の累積値を保持。全 分布化 (frozen 展開) は後段
        if (st.T && Object.keys(st.T).length) {
            let cl = 0, ct = 0;
            const m = {};
            for (const k of Object.keys(st.T).filter(k => k.slice(1) !== 's').sort(rfTKeyCmp)) {
                const v = st.T[k];
                cl += -(v.length > 2 ? v[2] : 0);   // ライフ: 純損失を符号付きで積算 (喪失=負・回復が勝つと+)
                ct += v[0];
                m[k] = [cl, ct];
            }
            if (Object.keys(m).length) runCums.push(m);
        }
    }
    const avg = (s) => (nWith ? s / nWith : null);
    const turnAvg = {};
    for (const k in turnAgg) if (turnAgg[k][1]) turnAvg[k] = turnAgg[k][0] / turnAgg[k][1];
    // 区間別 [平均ライフ喪失, 平均ターン, 平均戦闘回数/ラン] (戦闘1回あたりのライフ・ターン。ライフは純損失/敵別戦績と同一定義)
    const segAvg = {};
    for (const k in turnAgg) if (turnAgg[k][1]) segAvg[k] = [turnAgg[k][2] / turnAgg[k][1], turnAgg[k][0] / turnAgg[k][1], turnAgg[k][1] / nWith];
    // 区間別 Q1/Q3 (IQR): ランごとの区間内平均ライフ純損失の分布から四分位を取る (サンプル2件以上のみ記録)。
    //   注意: segAvg は「全戦闘 pooled 平均」、Q1/Q3 は「ラン平均の分布」なので厳密には別物 (母集団=検索結果ラン集合)
    const mkIqr = (agg) => {
        const out = {};
        for (const k in agg) {
            if (agg[k].length < 2) continue;
            const q1 = rfQuantile(agg[k], 0.25), q3 = rfQuantile(agg[k], 0.75);
            if (q1 != null && q3 != null) out[k] = [q1, q3];
        }
        return out;
    };
    // 中央値 (Q2): IQR帯の描画を「中央値が濃いグラデーション」にする用。旧履歴は med 無し → 塗りは従来の単色
    const mkMed = (agg) => {
        const out = {};
        for (const k in agg) {
            if (agg[k].length < 2) continue;
            const q2 = rfQuantile(agg[k], 0.5);
            if (q2 != null) out[k] = q2;
        }
        return out;
    };
    // 累積分布: 全キー軸 (union) 上に「そのランがその区間に到達していない場合は直前の累積値をそのまま (frozen)」で展開。
    //   これで各時点の分布平均 = 折れ線 (pooled 累積 Σ_k Σ_run T[k][2] / nWith) に恒等式で完全一致する
    const ukSet = {};
    for (const m of runCums) for (const k in m) ukSet[k] = 1;
    const ukKeys = Object.keys(ukSet).sort(rfTKeyCmp);
    const cumLifeAgg = {}, cumTurnAgg = {};
    if (runCums.length >= 2) {
        for (const k of ukKeys) { cumLifeAgg[k] = []; cumTurnAgg[k] = []; }
        for (const m of runCums) {
            const rKeys = Object.keys(m).sort(rfTKeyCmp);
            let pi = 0, last = [0, 0];
            for (const k of ukKeys) {
                while (pi < rKeys.length && rfTKeyCmp(rKeys[pi], k) <= 0) { last = m[rKeys[pi]]; pi++; }
                cumLifeAgg[k].push(last[0]);
                cumTurnAgg[k].push(last[1]);
            }
        }
    }
    const segIqr = mkIqr(segValsAgg), segTurnIqr = mkIqr(segTurnAgg);
    // 累積グラフ用: ランごとの区間累積値の分布の Q1/Q3 (ライフ=符号付き・ターン=素値)
    const cumLifeIqr = mkIqr(cumLifeAgg), cumTurnIqr = mkIqr(cumTurnAgg);
    const segMed = mkMed(segValsAgg), segTurnMed = mkMed(segTurnAgg), cumLifeMed = mkMed(cumLifeAgg), cumTurnMed = mkMed(cumTurnAgg);
    let poss = null;
    if (anyPickup) {
        poss = {};
        for (const a in reached) poss[a] = Math.round((held[a] || 0) / reached[a] * 100);
    }
    return {
        n: all.length, nWith,
        avgLoss: avg(loss), avgTurns: avg(turns),
        actLossAvg: lossAct.map(avg), turnAvg, segAvg, segIqr, segTurnIqr, cumLifeIqr, cumTurnIqr,
        segMed, segTurnMed, cumLifeMed, cumTurnMed, versions,
        pickup: anyPickup ? dist : null, poss
    };
}
// --- 拾いAct: 検索条件が最初に成立したAct (matchingStationIndex → '2-3' → Act2) ---
let STATION_INDEX_TO_KEY_CACHE = null;
function stationIndexToKey(idx) {
    if (STATION_INDEX_TO_KEY_CACHE === null) {
        STATION_INDEX_TO_KEY_CACHE = {};
        for (const key in STATION_MAP_GLOBAL) STATION_INDEX_TO_KEY_CACHE[STATION_MAP_GLOBAL[key]] = key;
    }
    return STATION_INDEX_TO_KEY_CACHE[idx] || null;
}
// プレイヤー名入力補完 (datalist): ALL_RUN_DETAILS から名前一覧を作る (検索時 & 自動検索タイミングで更新)
function rfPopulatePlayerDatalist() {
    const dl = document.getElementById('player-name-datalist');
    if (!dl || !ALL_RUN_DETAILS || !ALL_RUN_DETAILS.length) return;
    const esc = (s) => String(s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/"/g, '&quot;');
    const names = [...new Set(ALL_RUN_DETAILS.map(r => r.player_name).filter(Boolean))].sort();
    dl.innerHTML = names.map(n => `<option value="${esc(n)}"></option>`).join('');
}
// --- P-19: ルートパターン検索 ---
// path_summary を Act別・マス種別の通過回数に展開して判定する。
//   decode 後形式 (script.dev.js decodeRunPathSummary): { 'Act1 Early': [{level, type}, ...], ... }
//     type: Enemy=敵 / EliteEnemy=エリート / Adventure=イベント / Shop=ショップ / Gap=ギャップ
//   エンコード形式 (文字列配列 'E1E2A3S4' 等・3act×3チャンク) も保険で受ける。
//   Act4 はボス直行の固定ルートのため対象外。
function rfCountRouteTypes(pathSummary) {
    const counts = { 0: {}, 1: {}, 2: {}, 3: {} };   // 0 = 合計
    if (!pathSummary) return counts;
    const TY = { Enemy: 'E', EliteEnemy: 'X', Adventure: 'A', Shop: 'S', Gap: 'G' };
    if (Array.isArray(pathSummary)) {
        // エンコード形式: 9エントリ = Act1〜3 × チャンク3、トークンは E=敵 X=エリート A=イベント S=ショップ G=ギャップ
        for (let i = 0; i < pathSummary.length; i++) {
            const act = Math.floor(i / 3) + 1;
            const re = /([A-Z])(\d+)/g;
            let m;
            while ((m = re.exec(String(pathSummary[i] || '')))) {
                const ty = m[1];
                counts[act][ty] = (counts[act][ty] || 0) + 1;
                counts[0][ty] = (counts[0][ty] || 0) + 1;
            }
        }
        return counts;
    }
    if (typeof pathSummary !== 'object') return counts;
    // decode 後形式: キー "Act<n> ..." / 値 = [{level, type}, ...]
    for (const key in pathSummary) {
        const km = /^Act(\d+)/.exec(key);
        if (!km) continue;
        const act = parseInt(km[1], 10);
        if (!(act >= 1 && act <= 3)) continue;
        const arr = pathSummary[key];
        if (!Array.isArray(arr)) continue;
        for (const nd of arr) {
            const ty = nd && TY[nd.type];
            if (!ty) continue;
            counts[act][ty] = (counts[act][ty] || 0) + 1;
            counts[0][ty] = (counts[0][ty] || 0) + 1;
        }
    }
    return counts;
}
function rfRouteCondOk(run, conds) {
    const counts = rfCountRouteTypes(run.path_summary);
    for (const c of conds) {
        const v = counts[c.act] ? (counts[c.act][c.type] || 0) : 0;
        if (c.op === 'gte' ? v < c.n : c.op === 'lte' ? v > c.n : v !== c.n) return false;
    }
    return true;
}
// ルート条件の 1 行 (Act選択/種別/演算子/数値/✕) を DOM で作る。状態は行 DOM が保持する
// (検索時に収集・履歴復元時に再構築するためモジュール変数は不要 = TDZ/タブ再構築の問題を回避)
function rfBuildRouteCondRow(c) {
    const t = (UI_TEXT.run_finder || {});
    const types = ['E', 'X', 'A', 'S', 'G'];
    const ops = ['gte', 'lte', 'eq'];
    const sel = (v, cur) => (String(v) === String(cur) ? ' selected' : '');
    const row = document.createElement('div');
    row.className = 'rf-route-row';
    row.style.cssText = 'display:flex;gap:4px;align-items:center;flex-wrap:wrap;margin-top:4px;';
    row.innerHTML = `
        <select class="rf-route-act">
            <option value="0"${sel(0, c.act)}>${t.route_act_total || '合計'}</option>
            <option value="1"${sel(1, c.act)}>Act1</option>
            <option value="2"${sel(2, c.act)}>Act2</option>
            <option value="3"${sel(3, c.act)}>Act3</option>
        </select>
        <select class="rf-route-type">${types.map(k => `<option value="${k}"${sel(k, c.type)}>${t['route_type_' + k] || k}</option>`).join('')}</select>
        <select class="rf-route-op">${ops.map(k => `<option value="${k}"${sel(k, c.op)}>${t['route_op_' + k] || k}</option>`).join('')}</select>
        <input type="number" class="rf-route-n" min="0" max="9" value="${(c.n != null) ? c.n : 1}" style="width:60px;">
        <button type="button" class="rf-route-del" title="${t.route_cond_del || '✕'}">✕</button>`;
    return row;
}
function rfAddRouteCondRow(c) {
    const host = document.getElementById('route-cond-rows');
    if (host) host.appendChild(rfBuildRouteCondRow(c || {}));
}
// 条件行 DOM から条件リストを収集 (検索・共有リンク生成の共通処理)
function rfCollectRouteConds() {
    const out = [];
    document.querySelectorAll('#route-cond-rows .rf-route-row').forEach(row => {
        const n = parseInt(row.querySelector('.rf-route-n').value, 10);
        if (isNaN(n)) return;
        out.push({
            act: parseInt(row.querySelector('.rf-route-act').value, 10) || 0,
            type: row.querySelector('.rf-route-type').value,
            op: row.querySelector('.rf-route-op').value,
            n
        });
    });
    return out;
}
// ルート条件トークン ("A1X>=2" 等・+R: / URL r パラメータ共通の表記) を条件へ復元
function rfParseRouteCondToken(tok) {
    const rm = String(tok || '').match(/^(A(\d+))?(E|X|A|S|G)(>=|<=|=)(\d+)$/);
    return rm ? { act: rm[2] ? parseInt(rm[2], 10) : 0, type: rm[3], op: rm[4] === '>=' ? 'gte' : rm[4] === '<=' ? 'lte' : 'eq', n: parseInt(rm[5], 10) } : null;
}
// 検索条件を 1 行ラベルにまとめる ("ReimuA A2 L3 deck<=30 +[item, ...]")
function makeQueryLabel(sc) {
    if (!sc) return '';
    const parts = [];
    if (sc.playerName) parts.push('@' + sc.playerName);   // 先頭に置く (@name トークン・名前はスペース非推奨 = 旧履歴解析の制約)
    if (sc.character) parts.push(sc.character);
    if (sc.act) parts.push('Act' + sc.act);
    if (sc.level) parts.push('Lv' + sc.level);
    if (sc.deckSize) parts.push('deck' + (sc.deckSize.operator === 'lte' ? '<=' : '>=') + sc.deckSize.value);
    if (sc.includeItems && (sc.includeItems.items || []).length) parts.push('+' + (sc.includeItems.items || []).map(n => n.replace(/ /g, '_')).join(','));
    if (sc.excludeItems && sc.excludeItems.length) parts.push('-' + sc.excludeItems.map(n => n.replace(/ /g, '_')).join(','));
    if (sc.includeEnemies && (sc.includeEnemies.enemies || []).length) parts.push('+E:' + (sc.includeEnemies.enemies || []).map(n => n.replace(/ /g, '_')).join(','));
    if (sc.excludeEnemies && sc.excludeEnemies.length) parts.push('-E:' + sc.excludeEnemies.map(n => n.replace(/ /g, '_')).join(','));
    if (sc.includeNs) parts.push('+NS');
    if (sc.routeConds && sc.routeConds.length) {
        // 例: "+R:A1X>=2,X>=4" (A<n> が無ければ合計 / 種別は E=敵 X=エリート A=イベント S=ショップ G=ギャップ)
        parts.push('+R:' + sc.routeConds.map(c => (c.act ? 'A' + c.act : '') + c.type + (c.op === 'gte' ? '>=' : c.op === 'lte' ? '<=' : '=') + c.n).join(','));
    }
    if (sc.encAt) parts.push('+ENCAT');   // 敵遭遇を Act/Lv に限定した印
    return parts.join(' ') || '(all)';
}
function saveSearchHistory(searchCriteria, runs) {
    try {
        if (!runs || !runs.length) return;   // 0件検索は履歴に記録しない (ノイズ防止)
        const q = makeQueryLabel(searchCriteria);
        const agg = computeRunSetStats(runs);
        const list = rfLoadHistory().filter(h => h.q !== q);   // 同一条件は差し替え (先頭へ更新)
        // sc = 検索条件の生データ (行/チップ クリックでの再検索 rfRerunSearch 用)
        list.unshift({ t: Date.now(), q, sc: searchCriteria, ...agg });   // pickup / poss は agg に含まれる
        rfSaveHistory(list);
    } catch (e) { /* 無視 */ }
}
// 旧履歴 (sc 無し) 用: ラベル文字列 ("SakuyaA +部屋掃除" / "ReimuA A2 L3 deck<=30 …") を検索条件へ復元
function rfParseQueryLabel(q) {
    const sc = { character: null, act: null, level: null, deckSize: null, playerName: null, includeItems: null, excludeItems: null, includeBosses: null, excludeBosses: null, includeEnemies: null, excludeEnemies: null, includeNs: null, routeConds: null, encAt: null };
    (String(q || '').split(' ') || []).forEach(p => {
        let m;
        if (p === '+NS') sc.includeNs = true;
        else if (p === '+ENCAT') sc.encAt = true;
        else if (p.startsWith('+R:')) sc.routeConds = p.slice(3).split(',').map(tok => {
            // 例: "A1X>=2" (Act1エリート2以上) / "X>=4" (合計エリート4以上)
            const rm = tok.match(/^(A(\d+))?(E|X|A|S|G)(>=|<=|=)(\d+)$/);
            return rm ? { act: rm[2] ? parseInt(rm[2], 10) : 0, type: rm[3], op: rm[4] === '>=' ? 'gte' : rm[4] === '<=' ? 'lte' : 'eq', n: parseInt(rm[5], 10) } : null;
        }).filter(Boolean);
        else if (p.startsWith('+E:')) sc.includeEnemies = { enemies: p.slice(3).split(',').map(s => s.replace(/_/g, ' ')), logic: 'AND' };
        else if (p.startsWith('-E:')) sc.excludeEnemies = p.slice(3).split(',').map(s => s.replace(/_/g, ' '));
        else if (p.startsWith('@') && p.length > 1) sc.playerName = p.slice(1);
        else if (p.startsWith('+B:')) sc.includeBosses = { bosses: p.slice(3).split(','), logic: 'AND' };
        else if (p.startsWith('-B:')) sc.excludeBosses = p.slice(3).split(',');
        else if (p.startsWith('+') && p.length > 1) sc.includeItems = { items: p.slice(1).split(',').map(s => s.replace(/_/g, ' ')), logic: 'AND' };
        else if (p.startsWith('-') && p.length > 1) sc.excludeItems = p.slice(1).split(',').map(s => s.replace(/_/g, ' '));
        else if ((m = p.match(/^Act(\d+)$/))) sc.act = m[1];
        else if ((m = p.match(/^Lv(\d+)$/))) sc.level = m[1];
        else if ((m = p.match(/^deck(<|>)=(\d+)$/))) sc.deckSize = { operator: p[4] === '<' ? 'lte' : 'gte', value: parseInt(m[2], 10) };
        else if (p) sc.character = p;
    });
    return sc;
}
// 履歴行/凡例チップのクリック → その条件で再検索 (UI を復元してから performAdvancedSearch)
window.rfRerunSearch = async function (t) {
    const h = rfLoadHistory().find(x => x.t === t);
    // 新履歴: sc (条件の生データ) / 旧履歴: ラベル文字列から復元
    const sc = h ? (h.sc || rfParseQueryLabel(h.q)) : null;
    if (!sc) return;
    const charEl = document.getElementById('character-select');
    if (charEl) charEl.value = sc.character || 'All';
    const actEl = document.getElementById('act-filter');
    if (actEl) actEl.value = sc.act || '';
    const lvEl = document.getElementById('level-filter');
    if (lvEl) lvEl.value = sc.level || '';
    const deckOp = document.getElementById('deck-size-operator');
    const deckVal = document.getElementById('deck-size-value');
    if (deckOp) deckOp.value = sc.deckSize ? sc.deckSize.operator : 'any';
    if (deckVal) deckVal.value = sc.deckSize ? sc.deckSize.value : '';
    const plEl = document.getElementById('player-name-filter');
    if (plEl) plEl.value = sc.playerName || '';
    // アイテム/ボス/敵グループの選択チップを復元
    ['include-items-list', 'exclude-items-list', 'include-enemies-list', 'exclude-enemies-list'].forEach(id => {
        const el = document.getElementById(id);
        if (el) el.innerHTML = '';
    });
    (sc.includeItems && sc.includeItems.items || []).forEach(it => addItemTag(it, 'in'));
    (sc.excludeItems || []).forEach(it => addItemTag(it, 'ex'));
    (sc.includeEnemies && sc.includeEnemies.enemies || []).forEach(e => addEnemyTag(e, 'in'));
    (sc.excludeEnemies || []).forEach(e => addEnemyTag(e, 'ex'));
    const logic = sc.includeItems ? sc.includeItems.logic : 'AND';
    const andChk = document.getElementById('include-logic-and');
    if (andChk) andChk.checked = (logic === 'AND');
    const enemyLogic = sc.includeEnemies ? sc.includeEnemies.logic : 'AND';
    const enemyRadio = document.querySelector(`input[name="enemy-logic"][value="${enemyLogic}"]`);
    if (enemyRadio) enemyRadio.checked = true;
    const nsChk = document.getElementById('include-ns-checkbox');
    if (nsChk) nsChk.checked = !!sc.includeNs;
    // 敵遭遇 Act/Lv 限定 (encAt) の復元
    const encChk = document.getElementById('enc-at-checkbox');
    if (encChk) encChk.checked = !!sc.encAt;
    // ルート条件行の復元 (P-19)
    const routeRows = document.getElementById('route-cond-rows');
    if (routeRows) {
        routeRows.innerHTML = '';
        (sc.routeConds || []).forEach(c => rfAddRouteCondRow(c));
    }
    await performAdvancedSearch();
    // 結果表示は検索フォームの下 (ページ上方) に出るため、クリック元が画面下に居ると気づきにくい → 結果先頭へ案内
    const resEl = document.getElementById('run-finder-results');
    if (resEl) resEl.scrollIntoView({ behavior: 'smooth', block: 'start' });
};

// 「検索履歴の比較へ」ボタン: 履歴比較セクション (rf-history-panel) へスクロール
function rfJumpToHistory() {
    const panel = document.getElementById('rf-history-panel');
    if (panel) panel.scrollIntoView({ behavior: 'smooth', block: 'start' });
}
function deleteSearchHistory(t) {
    rfSaveHistory(rfLoadHistory().filter(h => h.t !== t));
    const panel = document.getElementById('rf-history-panel');
    if (panel) panel.innerHTML = renderSearchHistoryPanel();
}
// 履歴削除ボタン: セル全体をタップ領域にするため 2 段階確認 (1回目=「削除?」表示, 2回目=削除)。
// 誤タップで他行を押しても削除されない & 3秒で自動解除。
let _rfHistDelTimer = null;
window.rfHistDeleteTap = function (cell, t) {
    if (cell.classList.contains('armed')) {
        if (_rfHistDelTimer) { clearTimeout(_rfHistDelTimer); _rfHistDelTimer = null; }
        deleteSearchHistory(t);
        return;
    }
    // 既に armed な他の行があれば解除
    document.querySelectorAll('.col-h-del.armed').forEach(el => { el.classList.remove('armed'); el.textContent = '🗑'; });
    cell.classList.add('armed');
    cell.textContent = UI_TEXT.run_finder.history_delete_confirm || '削除?';
    if (_rfHistDelTimer) clearTimeout(_rfHistDelTimer);
    _rfHistDelTimer = setTimeout(() => {
        cell.classList.remove('armed');
        cell.textContent = '🗑';
        _rfHistDelTimer = null;
    }, 3000);
};
// --- 検索履歴の比較グラフ (テーブル下: ライフ部門 / ターン部門) ---
// 行番号 (①②…) と線色は履歴リストの表示順に対応。21行目以降は ㉑㉒… を使用
function rfHistNumMark(i) {
    const n = i + 1;
    return n <= 20 ? String.fromCharCode(0x2460 + n - 1) : String.fromCharCode(0x3250 + n - 20);
}
function rfHistLineColor(i) {
    // 金角 (golden angle) で hue を散らすと色が被りにくい
    return `hsl(${(i * 47) % 360} 55% 45%)`;
}
// 四分位数 (線形補間法)。arr が空なら null
function rfQuantile(arr, p) {
    if (!arr || !arr.length) return null;
    const s = [...arr].sort((a, b) => a - b);
    const idx = (s.length - 1) * p, lo = Math.floor(idx), hi = Math.ceil(idx);
    return s[lo] + (s[hi] - s[lo]) * (idx - lo);
}
// 区間キーの並び (Act 昇順 × 敵→エリート→ボス→特殊)。履歴比較テーブルの tKeys と同一順序に使う
const RF_KIND_ORDER = { e: 0, x: 1, b: 2, s: 3 };
function rfTKeyCmp(ka, kb) {
    return (parseInt(ka[0], 10) - parseInt(kb[0], 10)) ||
        ((RF_KIND_ORDER[ka.slice(1)] ?? 9) - (RF_KIND_ORDER[kb.slice(1)] ?? 9));
}
function rfHistNiceTicks(minV, maxV) {
    // データ範囲に近付けた目盛り (0 の強制なし → 上下の無駄スペースを削る)
    const span = Math.max(maxV - minV, 1e-6);
    const mag = Math.pow(10, Math.floor(Math.log10(Math.max(span / 4, 1e-6))));
    for (const m of [1, 2, 2.5, 5, 10]) {
        const s = m * mag;
        if (span / s <= 5) {
            const lo = Math.floor(minV / s) * s, hi = Math.ceil(maxV / s) * s;
            const ticks = [];
            for (let v = lo; v <= hi + s * 0.5; v += s) ticks.push(Math.round(v * 1000) / 1000);
            return ticks;
        }
    }
    return [minV, maxV];
}
// 連動ハイライト: i 番目の線 (両グラフ) + テーブル行 + 凡例チップを強調し、他を薄暗くする
window.rfHistHi = function (i, on) {
    const panel = document.getElementById('rf-history-panel');
    if (!panel) return;
    panel.querySelectorAll('[data-hc]').forEach(el => {
        const act = String(i) === el.getAttribute('data-hc');
        if (el.tagName === 'path') {
            el.style.strokeOpacity = on ? (act ? '1' : '0.08') : '';
            el.style.strokeWidth = (on && act) ? '3.5' : '';
        } else if (el.tagName === 'circle') {
            el.style.fillOpacity = on ? (act ? '1' : '0.06') : '';
            el.style.r = (on && act) ? '5' : '';
        } else if (el.tagName === 'TR') {
            el.classList.toggle('rf-hi-row', !!(on && act));
        } else {
            el.classList.toggle('rf-hi-chip', !!(on && act));
        }
    });
    // IQR帯 (rf-iqr-band): ホバー中の行の帯だけ表示、mouseout で全部消す
    panel.querySelectorAll('.rf-iqr-band').forEach(el => {
        el.style.display = (on && String(i) === el.getAttribute('data-hb')) ? '' : 'none';
    });
};
// 折りたたみセクションの開閉状態をブラウザ内に保持 (再検索で再描画されても復元)
function rfHistSecOpen(key, def) {
    try {
        const v = JSON.parse(localStorage.getItem('rf_hist_sections') || '{}');
        return v[key] != null ? !!v[key] : def;
    } catch (e) { return def; }
}
window.rfHistSectionToggle = function (key, el) {
    try {
        const v = JSON.parse(localStorage.getItem('rf_hist_sections') || '{}');
        v[key] = el.open;
        localStorage.setItem('rf_hist_sections', JSON.stringify(v));
    } catch (e) { /* 無視 */ }
};
// --- グラフの表示チェック (2026-10-28): 6枚のうち見たいグラフだけをチェックで選ぶ。
//     セクション内で表示が1枚だけのときは自動で全幅 (拡大) 表示になる (.rf-hist-solo)
const RF_HIST_VIS_KEYS = ['life', 'turn', 'slife', 'sturn', 'clife', 'cturn'];
function rfHistVisLoad() {
    // 既定: 区間別ライフ/ターンのみ ON (2026-10-28 user 指定)。ばらつき/累積はチェックで増やす
    const def = { life: true, turn: true, slife: false, sturn: false, clife: false, cturn: false };
    try { return Object.assign(def, JSON.parse(localStorage.getItem('rf_hist_chartvis') || '{}')); }
    catch (e) { return def; }
}
function rfHistVisSave(v) {
    try { localStorage.setItem('rf_hist_chartvis', JSON.stringify(v)); } catch (e) { /* 無視 */ }
}
window.rfHistChartVisToggle = function (key) {
    const v = rfHistVisLoad();
    v[key] = !v[key];
    rfHistVisSave(v);
    const panel = document.getElementById('rf-history-panel');
    if (panel) panel.innerHTML = renderSearchHistoryPanel();
};
window.rfHistChartVisReset = function () {
    rfHistVisSave({});
    const panel = document.getElementById('rf-history-panel');
    if (panel) panel.innerHTML = renderSearchHistoryPanel();
};
// --- グラフ拡大: パネル内にライトボックス (ポップアップ拡大) を表示 (2026-10-28・⤢ ボタンからの置き換え) ---
//     クリックしたグラフの SVG を複製して大きく表示。パネル内に置くのは rfHistHi の連動ハイライトが
//     #rf-history-panel 配下を探すため (ポップアップ内でもホバー連動が有効)
window.rfHistLbOpen = function (chartEl) {
    const panel = document.getElementById('rf-history-panel');
    if (!panel || !chartEl) return;
    // 既に開いていれば閉じる (トグル)
    const ex = panel.querySelector('.rf-hist-lightbox');
    if (ex) ex.remove();
    const svg = chartEl.querySelector('svg.rf-hist-svg');
    if (!svg) return;
    const titleEl = chartEl.querySelector('.rf-hist-chart-title span');
    const legend = panel.querySelector('.rf-hist-legend');
    const box = document.createElement('div');
    box.className = 'rf-hist-lightbox';
    box.onclick = function (e) { if (e.target === box) rfHistLbClose(); };
    // クリック連打で選択が伝播しないよう inner 側で stopPropagation
    box.innerHTML = `<div class="rf-hist-lightbox-inner" onclick="event.stopPropagation()">` +
        `<div class="rf-hist-lb-head"><span>${titleEl ? titleEl.textContent : ''}</span>` +
        `<button type="button" class="rf-hist-lb-close" onclick="rfHistLbClose()" title="✕">✕</button></div>` +
        (legend ? `<div class="rf-hist-lb-legend">${legend.innerHTML}</div>` : '') +
        svg.outerHTML + `</div>`;
    panel.appendChild(box);
};
window.rfHistLbClose = function () {
    const box = document.querySelector('#rf-history-panel > .rf-hist-lightbox');
    if (box) box.remove();
};
// ESC キーで閉じる (多重登録防止)
if (!window.rfHistLbEscInit) {
    window.addEventListener('keydown', (e) => { if (e.key === 'Escape') rfHistLbClose(); });
    window.rfHistLbEscInit = true;
}
// 履歴エントリの IQR [Q1,Q3] (+中央値 med) から描画用の3点組を作る。旧履歴 (med 無し) は med = null
function rfIqrTriplet(q, med) {
    if (!q || q.length < 2 || !isFinite(q[0]) || !isFinite(q[1])) return null;
    const m = (typeof med === 'number' && isFinite(med)) ? med : null;
    return [q[0], q[1], m];
}
// IQR帯のグラデーション層: Q2 から両端へ正規化距離 f の等高ポリゴンを足し合わせ (中心ほど濃くなる)
//   ※ rfHistChartSVG 内に literal で定義 (トップレベル const は eval 経由だと呼び出し後に参照できない)
function rfHistChartSVG(values, list, tKeys, segLabels, labelOf, goodTop, iqrOf, hMul) {
    // hMul: プロット縦幅の倍率 (2026-10-28: PC で表示グラフが 2枚以下のとき 2 → 縦を倍にして見やすく)
    // values: 行×区間の値行列 (null は欠損 → 線を切る) / labelOf(v) → ツールチップ用の表示値
    // iqrOf: (h, 区間キー) → [Q1, Q3] | null。あれば点ツールチップに IQR を付し、ホバーで薄い水平線を表示。
    //        (区間ライフ=h.segIqr / 累積ライフ=h.cumLifeIqr / 累積ターン=h.cumTurnIqr。ターン部門は null で非対応)
    // 凡例は共通 (テーブル直下) なので線端ラベルは無し → 右余白を最小化してプロットを広く
    // goodTop: Y軸の向き。true = 上ほど良い (ライフ: 0に近い=喪失小) / false = 下ほど良い (ターン: 少ないほど良い)
    const texts = UI_TEXT.run_finder;
    const W = 560, H = 336 * (hMul || 1), PL = 50, PR = 18, PT = 18, PB = 46;
    const DASH = ['', '7 4', '2 4.5', '12 4 3 4', '5 5', '9 3 3 3 3 3'];   // 重なりのある線を区別する破線パターン (行番号で循環)
    const flat = values.flat().filter(v => v != null && isFinite(v));
    if (!flat.length) return '';
    const ticks = rfHistNiceTicks(Math.min(...flat), Math.max(...flat));
    const lo = ticks[0], hi = ticks[ticks.length - 1];
    const xAt = (si) => PL + si * (W - PL - PR) / Math.max(tKeys.length - 1, 1);
    const yAt = (v) => PT + (hi - v) / Math.max(hi - lo, 1e-6) * (H - PT - PB);
    const fmtTick = (t) => String(Math.round(t * 10) / 10);
    // --- IQR帯 (行ごと・ホバー連動): Q1/Q3 折れ線 (同色の薄い破線) + 中央値 Q2 (密な短破線) + Q1..Q3 間の塗り。
    //     med があれば「中央値に近いほど濃い」層状グラデーション (正規化距離の等高ポリゴン重ね)。
    //     med 無し (旧履歴) は従来どおり単色の薄塗り。表示切替は rfHistHi 側で data-hb を見て行う
    let iqrBands = '';
    if (iqrOf) {
        list.forEach((h, i) => {
            const qr = tKeys.map(k => iqrOf(h, k));
            const valid = (si) => {
                const q = qr[si];
                return !!q && isFinite(q[0]) && isFinite(q[1]);
            };
            if (!qr.some((q, si) => valid(si))) return;
            const color = rfHistLineColor(i);
            const bandPath = (pick) => {
                let d = '', started = false;
                qr.forEach((q, si) => {
                    const v = valid(si) ? pick(q) : null;
                    if (v == null || !isFinite(v)) { started = false; return; }
                    d += `${started ? 'L' : 'M'}${xAt(si).toFixed(1)},${yAt(v).toFixed(1)}`;
                    started = true;
                });
                return d.trim();
            };
            const dq1 = bandPath(q => q[0]), dq3 = bandPath(q => q[1]);
            // Q2 (中央値) も破線で追加 — Q1/Q3 より密な破線 + やや薄めで区別 (med 無し区間は自動で途切れる)
            const dq2 = bandPath(q => q[2]);
            if (!dq1 && !dq3 && !dq2) return;
            // 塗り: med (中央値) が揃う連続区間ごとにグラデ層 / med 無し区間は単色薄塗り
            const GRAD_LAYERS = [1, 0.8, 0.6, 0.4, 0.2], GRAD_OP = 0.055;
            const medOk = (si) => valid(si) && qr[si][2] != null && isFinite(qr[si][2]);
            let grad = '', flat = '', run = [];
            const flushFlat = () => {
                if (run.length > 1) {
                    const up = run.map(si => `${xAt(si).toFixed(1)},${yAt(qr[si][1]).toFixed(1)}`).join(' ');
                    const dn = run.slice().reverse().map(si => `${xAt(si).toFixed(1)},${yAt(qr[si][0]).toFixed(1)}`).join(' ');
                    flat += `<polygon points="${up} ${dn}" fill="${color}" fill-opacity="0.14" stroke="none"/>`;
                }
                run = [];
            };
            const flushGrad = () => { if (run.length > 1) for (const f of GRAD_LAYERS) {
                    const up = run.map(si => `${xAt(si).toFixed(1)},${yAt(qr[si][2] + (qr[si][1] - qr[si][2]) * f).toFixed(1)}`).join(' ');
                    const dn = run.slice().reverse().map(si => `${xAt(si).toFixed(1)},${yAt(qr[si][2] - (qr[si][2] - qr[si][0]) * f).toFixed(1)}`).join(' ');
                    grad += `<polygon points="${up} ${dn}" fill="${color}" fill-opacity="${GRAD_OP}" stroke="none"/>`;
                } run = []; };
            // 現在のモードに対応する flush だけを行う (runMode 無視の全 flush は誤重ね描きになる)
            const flushMode = () => {
                if (runMode === 'grad') flushGrad(); else if (runMode === 'flat') flushFlat();
            };
            // 区間を med 有無で grad/flat に振り分けつつ、連続区間ごとにまとめて flush (push 先に flush すると run が育たない)
            let runMode = null;   // 'grad' | 'flat' | null
            qr.forEach((q, si) => {
                if (medOk(si)) {
                    if (runMode !== 'grad') flushMode();
                    run.push(si); runMode = 'grad';
                } else if (valid(si)) {
                    if (runMode !== 'flat') flushMode();
                    run.push(si); runMode = 'flat';
                } else {
                    flushMode();
                    runMode = null;
                }
            });
            flushMode();
            iqrBands += `<g class="rf-iqr-band" data-hb="${i}" style="display:none">` + flat + grad +
                (dq1 ? `<path d="${dq1}" fill="none" stroke="${color}" stroke-opacity="0.45" stroke-width="1.6" stroke-dasharray="4 3"/>` : '') +
                (dq3 ? `<path d="${dq3}" fill="none" stroke="${color}" stroke-opacity="0.45" stroke-width="1.6" stroke-dasharray="4 3"/>` : '') +
                (dq2 ? `<path d="${dq2}" fill="none" stroke="${color}" stroke-opacity="0.55" stroke-width="1.2" stroke-dasharray="2 3"/>` : '') +
                `</g>`;
        });
    }
    let out = `<svg viewBox="0 0 ${W} ${H}" role="img" class="rf-hist-svg">`;
    out += iqrBands;   // 帯はメイン線より下層に置く
    // Y軸の向きラベル (縦書き): ライフは上ほど良い (0に近い=喪失小) / ターンは下ほど良い
    out += `<text transform="translate(13 ${(PT + (H - PT - PB) / 2).toFixed(1)}) rotate(-90)" text-anchor="middle" font-size="11.5" fill="#999">${goodTop ? (texts.hist_axis_goodtop || '↑ higher is better') : (texts.hist_axis_goodbottom || '↓ lower is better')}</text>`;
    for (const tv of ticks) {
        const y = yAt(tv).toFixed(1);
        const zero = Math.abs(tv) < 1e-9;
        out += `<line x1="${PL}" y1="${y}" x2="${W - PR}" y2="${y}" stroke="${zero ? '#aaa' : '#e6e6e6'}" stroke-width="1"/>`;
        out += `<text x="${PL - 6}" y="${Number(y) + 4}" text-anchor="end" font-size="12" fill="#888">${fmtTick(tv)}</text>`;
    }
    // X軸ラベル: "A1敵" など (テーブルの列と同じ並び)
    tKeys.forEach((k, si) => {
        out += `<text x="${xAt(si).toFixed(1)}" y="${H - PB + 20}" text-anchor="middle" font-size="13" fill="#555">${segLabels[si]}</text>`;
        out += `<line x1="${xAt(si).toFixed(1)}" y1="${H - PB}" x2="${xAt(si).toFixed(1)}" y2="${H - PB + 5}" stroke="#bbb" stroke-width="1"/>`;
    });
    out += `<line x1="${PL}" y1="${PT - 8}" x2="${PL}" y2="${H - PB}" stroke="#bbb" stroke-width="1"/>`;
    list.forEach((h, i) => {
        const color = rfHistLineColor(i);
        const dash = DASH[i % DASH.length];
        const vals = values[i];
        let d = '', started = false;
        vals.forEach((v, si) => {
            if (v == null || !isFinite(v)) { started = false; return; }
            d += ` ${started ? 'L' : 'M'}${xAt(si).toFixed(1)},${yAt(v).toFixed(1)}`;
            started = true;
        });
        if (d) out += `<path class="rf-hist-line" data-hc="${i}" onmouseover="rfHistHi(${i},1)" onmouseout="rfHistHi(${i},0)" d="${d.trim()}" fill="none" stroke="${color}" stroke-width="2.4" ${dash ? `stroke-dasharray="${dash}" ` : ''}stroke-linejoin="round" stroke-linecap="round" opacity="0.9"/>`;
        vals.forEach((v, si) => {
            if (v == null || !isFinite(v)) return;
            // その区間の Q1/Q3 (+中央値 Q2) (IQR) があれば title に付ける (帯の折れ線/塗りは rfHistHi のホバー連動側で表示)
            const iqr = iqrOf ? iqrOf(h, tKeys[si]) : null;
            const iqrSuffix = (iqr && iqr.length > 1)
                ? ` (${texts.hist_seg_iqr_short || 'IQR'}: ${labelOf(iqr[0])}〜${labelOf(iqr[1])}${(iqr[2] != null) ? `, ${texts.hist_seg_q2_short || 'med'} ${labelOf(iqr[2])}` : ''})`
                : '';
            out += `<circle class="rf-hist-dot" data-hc="${i}" onmouseover="rfHistHi(${i},1)" onmouseout="rfHistHi(${i},0)" cx="${xAt(si).toFixed(1)}" cy="${yAt(v).toFixed(1)}" r="3.4" fill="${color}" opacity="0.85"><title>${rfHistNumMark(i)} ${(h.q || '-')} — ${segLabels[si]}: ${labelOf(v)}${iqrSuffix}</title></circle>`;
        });
    });
    return out + '</svg>';
}
function clearSearchHistory() {
    rfSaveHistory([]);
    const panel = document.getElementById('rf-history-panel');
    if (panel) panel.innerHTML = renderSearchHistoryPanel();
}
function renderSearchHistoryPanel() {
    const texts = UI_TEXT.run_finder;
    const list = rfLoadHistory();
    if (!list.length) return `<p class="analysis-note" style="margin:6px 0 0;">${texts.history_none || ''}</p>`;
    const hiddenLines = rfHistHiddenLoad();   // 「グラフ」列チェックで外した条件 (t の Set)
    const tk = new Set();
    for (const h of list) for (const k in (h.turnAvg || {})) if (k.slice(1) !== 's') tk.add(k);   // 特殊イベント (…s) は比較列から外す
    // 列の並び: Act 昇順 × 敵→エリート→ボス (例: A1敵 A1エ A1ボ … A3ボ A4ボ。Act4はボスのみ) — rfTKeyCmp (共通)
    const tKeys = Array.from(tk).sort(rfTKeyCmp);
    const fmt = (v) => (v == null ? '-' : (Math.round(v * 10) / 10).toFixed(1));
    // Act×種別の列ラベル: "A1e" → "A1敵" (ja) / "A1 Foe" (en)
    const turnKindLabel = (kindChar) => ({
        e: texts.turn_kind_e || 'En',
        x: texts.turn_kind_x || 'El',
        b: texts.turn_kind_b || 'B',
        s: texts.turn_kind_s || 'Event'
    }[kindChar] || kindChar);
    // 所持率列: 各Actを戦ったランのうち、検索条件をすでに満たしていた割合 ("A1·54% A2·81%")
    //   旧形式 (pickup のみ・poss 無し) の履歴はラン数表示にフォールバック
    const pickupCell = (h) => {
        if (h.poss) {
            const counts = Object.keys(h.pickup).sort((a, b) => parseInt(a, 10) - parseInt(b, 10))
                .map(a => `A${a}:${h.pickup[a]}/${h.n}`).join(' ');
            return `<td class="col-h-pick" title="${counts}">${Object.keys(h.pickup).sort((a, b) => parseInt(a, 10) - parseInt(b, 10))
                .map(a => `A${a}·${h.poss[a] != null ? h.poss[a] : '-'}%`).join(' ')}</td>`;
        }
        if (h.pickup) {
            return `<td class="col-h-pick">${Object.keys(h.pickup).sort((a, b) => parseInt(a, 10) - parseInt(b, 10))
                .map(a => `A${a}·${h.pickup[a]}`).join(' ')}</td>`;
        }
        return `<td class="col-h-pick">-</td>`;
    };
    // 区間セル: ヘッダー1つに cells 2つ (colspan)。左=平均ライフ喪失 (負の値・net純損失/敵別戦績と同一定義) / 右=平均ターン
    //   旧履歴 (segAvg 無し) は ライフ '-' + ターンユーノ表示でフォールバック
    const segCell = (h, k) => {
        const s = h.segAvg && h.segAvg[k];
        if (s) {
            // [旧] 回復が被弾を上回る区間 (net<=0) も強制的に "0" 表示していた:
            // const life = s[0] > 0 ? `-${fmt(s[0])}` : '0';
            // [新] 純損失を素直に表示: 被弾優位は -x / 回復優位 (net<0) は +x / 完全一致は 0
            const life = s[0] > 0 ? `-${fmt(s[0])}` : (s[0] < 0 ? `+${fmt(-s[0])}` : '0');
            // ホバー時 (title=ネイティブ tooltip) に Q1/Q2/Q3 (IQR) を出す。旧履歴 (segIqr/segMed 無し) は付かない
            const iqr = h.segIqr && h.segIqr[k];
            const med = h.segMed && h.segMed[k];
            const iqrTitle = (iqr && iqr.length > 1)
                ? ` title="${texts.hist_seg_iqr_prefix || 'IQR'}: Q1 ${fmt(iqr[0])} / ${med != null ? `Q2 ${fmt(med)} / ` : ''}Q3 ${fmt(iqr[1])}"`
                : '';
            return `<td class="col-h-life"${iqrTitle}>${life}</td><td class="col-h-turn">${fmt(s[1])}</td>`;
        }
        return `<td class="col-h-life">-</td><td class="col-h-turn">${fmt(h.turnAvg[k])}</td>`;
    };
    const rerunTip = texts.hist_rerun || 'Click to re-run this search';
    const rows = list.map((h, i) => {
        /* (後で再表示する場合用) 全体平均ライフ喪失 / 全体ターン平均 のセル:
            <td class="col-h-val">${fmt(h.avgLoss)}</td>
            <td class="col-h-val">${fmt(h.avgTurns)}</td> */
        return `<tr data-hc="${i}" onmouseover="rfHistHi(${i},1)" onmouseout="rfHistHi(${i},0)" onclick="rfRerunSearch(${h.t})" title="${rerunTip}">
            <td class="col-h-graph" onclick="event.stopPropagation()"><label><input type="checkbox" ${hiddenLines.has(h.t) ? '' : 'checked'} onchange="rfHistLineToggle(${h.t})"></label></td>
            <td class="col-h-q" title="${(h.q || '').replace(/"/g, '&quot;')}"><span class="rf-hist-num" style="color:${rfHistLineColor(i)}">${rfHistNumMark(i)}</span> ${h.q || '-'}</td>
            <td class="col-h-n">${h.n}</td>
            ${pickupCell(h)}
            ${tKeys.map(k => segCell(h, k)).join('')}
            <td class="col-h-del" onclick="event.stopPropagation(); rfHistDeleteTap(this, ${h.t})" title="${texts.history_delete || 'Delete'}">🗑</td>
        </tr>`;
    }).join('');
    // --- 比較グラフ (ライフ/ターン + 各累積)。欠損区間は線を切る。番号・色は表の行と対応 (hover で連動ハイライト) ---
    const segLabels = tKeys.map(k => `A${k[0]}${turnKindLabel(k.slice(1))}`);
    // 区間別 平均値の行列 (ライフは喪失=負で描画。ターンは旧履歴は turnAvg にフォールバック)
    const lifeVals = list.map(h => tKeys.map(k => {
        const s = h.segAvg && h.segAvg[k];
        return (s && s[0] != null) ? -s[0] : null;
    }));
    const turnVals = list.map(h => tKeys.map(k => {
        const s = h.segAvg && h.segAvg[k];
        if (s && s[1] != null) return s[1];
        return (h.turnAvg && h.turnAvg[k] != null && isFinite(h.turnAvg[k])) ? h.turnAvg[k] : null;
    }));
    // 累積: 区間 j までの合計 = Σ (戦闘あたり平均 × 平均戦闘回数)。戦闘回数 (s[2]) が無ければそこで線を切る
    const cumVals = (vals) => vals.map((valsEntry, i) => {
        const h = list[i], out = tKeys.map(() => null); let cum = 0;
        for (let si = 0; si < tKeys.length; si++) {
            const b = (h.segAvg && h.segAvg[tKeys[si]]) ? h.segAvg[tKeys[si]][2] : null;
            if (valsEntry[si] == null || b == null) break;
            cum += valsEntry[si] * b;
            out[si] = cum;
        }
        return out;
    });
    // ばらつき (IQR幅): 区間ごとの Q3-Q1 絶対値 = その条件のランが区間でどれだけ「ブレる」か。
    //     旧履歴 (segIqr 無し) は該当区間で線を切る。値は必ず 0 以上 → 下ほどブレが小さい (安定)
    const spreadVals = (iqrPick) => list.map(h => tKeys.map(k => {
        const q = iqrPick(h) && iqrPick(h)[k];
        return (q && q.length > 1 && isFinite(q[0]) && isFinite(q[1])) ? Math.abs(q[1] - q[0]) : null;
    }));
    // グラフ表示チェック (rf_hist_chartvis): ON/OFF は rfHistChartVisToggle で再描画
    const vis = rfHistVisLoad();
    // 凡例チップ: hover で線・行と連動ハイライト
    const legendChips = list.map((h, i) =>
        `<span class="rf-hist-chip" data-hc="${i}" onmouseover="rfHistHi(${i},1)" onmouseout="rfHistHi(${i},0)" onclick="rfRerunSearch(${h.t})" title="${rerunTip}"><span class="rf-hist-num" style="color:${rfHistLineColor(i)}">${rfHistNumMark(i)}</span> ${(h.q || '-').replace(/"/g, '&quot;')} <span class="rf-hist-chip-n">(n=${h.n})</span></span>`
    ).join('');
    // --- グラフ6枚を1つのグリッドに並べる (チェックで表示/非表示・アコーディオンは廃止 2026-10-28) ---
    //     PC (幅 >880px) で見えるグラフが 2枚以下のときは縦も 2倍にして大きく描画
    // 「グラフ」列チェックで外された条件は行列を null 化 (線が切れる) + iqrOf も null (IQR帯も消える)。
    // 行自体は残すので ①②③ の番号・色はずれない
    const hideRow = (m) => m.map((row, i) => (list[i] && hiddenLines.has(list[i].t)) ? row.map(() => null) : row);
    const wrapIqr = (fn) => (fn ? (h, k) => (hiddenLines.has(h.t) ? null : fn(h, k)) : null);
    const hasVals = (m) => m.some(valsRow => valsRow.some(v => v != null && isFinite(v)));
    const spreadLifeM = hideRow(spreadVals(h => h.segIqr));
    const spreadTurnM = hideRow(spreadVals(h => h.segTurnIqr));
    const lifeValsH = hideRow(lifeVals);
    const turnValsH = hideRow(turnVals);
    const mkEntries = [
        ['life',  lifeValsH, true,  wrapIqr((h, k) => rfIqrTriplet(h.segIqr && h.segIqr[k], h.segMed && h.segMed[k])),  texts.hist_chart_life || 'Avg life loss per battle'],
        ['turn',  turnValsH, false, wrapIqr((h, k) => rfIqrTriplet(h.segTurnIqr && h.segTurnIqr[k], h.segTurnMed && h.segTurnMed[k])), texts.hist_chart_turn || 'Avg turns per battle'],
        ['slife', spreadLifeM, false, null, texts.hist_chart_life_spread || 'Per-segment life spread'],
        ['sturn', spreadTurnM, false, null, texts.hist_chart_turn_spread || 'Per-segment turn spread'],
        ['clife', hideRow(cumVals(lifeVals)), true,  wrapIqr((h, k) => rfIqrTriplet(h.cumLifeIqr && h.cumLifeIqr[k], h.cumLifeMed && h.cumLifeMed[k])), texts.hist_chart_life_cum || 'Cumulative life loss'],
        ['cturn', hideRow(cumVals(turnVals)), false, wrapIqr((h, k) => rfIqrTriplet(h.cumTurnIqr && h.cumTurnIqr[k], h.cumTurnMed && h.cumTurnMed[k])), texts.hist_chart_turn_cum || 'Cumulative turns'],
    ];
    const shownCount = mkEntries.filter(([k, m]) => vis[k] && hasVals(m)).length;
    // モバイル (≤880px) は縦横比が環境ごとに異なるため高さは据え置き (user 同日確認)
    // const hMul = (window.innerWidth > 880 && (shownCount === 1 || shownCount === 2)) ? 2 : 1;
    const hMul = 1; // 常に縦1倍に固定

    const defs = mkEntries
        .filter(([k, m]) => vis[k] && hasVals(m))
        .map(([k, m, goodTop, iqrOf, title]) => [k, rfHistChartSVG(m, list, tKeys, segLabels, fmt, goodTop, iqrOf, hMul), title]);
    // クリック → ライトボックス拡大 (rfHistLbOpen)。表示チェック1枚のときは全幅
    const chartBlock = ([k, svg, title]) => (!svg || !vis[k]) ? '' :
        `<div class="rf-hist-chart rf-hist-clickable${(shownCount === 1) ? ' rf-hist-solo' : ''}" onclick="rfHistLbOpen(this)">` +
        `<div class="rf-hist-chart-title"><span>${title}</span></div>${svg}</div>`;
    return `
    <details class="rf-hist-sec" ${(rfHistSecOpen('table', true) ? 'open' : '')} ontoggle="rfHistSectionToggle('table', this)">
        <summary>${texts.hist_sec_table || 'Segment table'}</summary>
        <div class="table-wrapper rf-history-wrapper">
        <table class="run-finder-history-table">
        <thead><tr>
            <th>${texts.history_graph || 'グラフ'}</th><th>${texts.history_q || 'Query'}</th><th>${texts.history_n || 'n'}</th>
            <!-- (後で再表示する場合用) 全体平均ライフ喪失 / 全体ターン平均 のヘッダー:
                hint_life_loss -> 平均ライフ喪失 / hint_turns -> ターン平均 -->
            <th title="${texts.hint_pickup || ''}">${texts.history_pickact || 'Pickup'}</th>
            ${tKeys.map(k => `<th colspan="2" style="border-left:1px solid #ccc;" title="${texts.hint_seg || ''}">A${k[0]}${turnKindLabel(k.slice(1))}</th>`).join('')}
            <th></th>
        </tr></thead>
        <tbody>${rows}</tbody>
        </table></div>
    </details>
    <div class="rf-hist-legend">${legendChips}</div>
    <div class="rf-hist-visbar">
        <span>${texts.hist_vis_title || 'Charts to show'}:</span>
        ${[['life', texts.hist_vis_life || 'Avg life'], ['turn', texts.hist_vis_turn || 'Avg turns'],
           ['slife', texts.hist_vis_spread_life || 'Spread (life)'], ['sturn', texts.hist_vis_spread_turn || 'Spread (turns)'],
           ['clife', texts.hist_vis_cum_life || 'Cumulative life'], ['cturn', texts.hist_vis_cum_turn || 'Cumulative turns']]
            .map(([k, lbl]) => `<label><input type="checkbox" ${vis[k] ? 'checked' : ''} onchange="rfHistChartVisToggle('${k}')">${lbl}</label>`).join('')}
        <button type="button" class="rf-hist-vis-reset" onclick="rfHistChartVisReset()">${texts.hist_vis_reset || 'Reset'}</button>
    </div>
    <div class="rf-hist-charts rf-hist-grid">
    ${defs.map(chartBlock).join('')}
    </div>`;
}
// --- 「グラフ」列の行チェック: その条件 (①②③…) の線/IQR帯を比較グラフから出し入れする ---
// 状態は localStorage に「非表示にした履歴 t の配列」で保持 (行番号はリスト先頭のままで色・番号がずれない)
function rfHistHiddenLoad() {
    try {
        const arr = JSON.parse(localStorage.getItem('rf_hist_linehidden') || '[]');
        return new Set(Array.isArray(arr) ? arr : []);
    } catch (e) { return new Set(); }
}
window.rfHistLineToggle = function (t) {
    const hidden = rfHistHiddenLoad();
    if (hidden.has(t)) hidden.delete(t); else hidden.add(t);
    try { localStorage.setItem('rf_hist_linehidden', JSON.stringify([...hidden])); } catch (e) { /* 無視 */ }
    const panel = document.getElementById('rf-history-panel');
    if (panel) panel.innerHTML = renderSearchHistoryPanel();
};
window.deleteSearchHistory = deleteSearchHistory;
window.clearSearchHistory = clearSearchHistory;

function handleSortClick(sortKey) {
    if (currentSortKey === sortKey) {
        currentSortOrder = currentSortOrder === 'asc' ? 'desc' : 'asc';
    } else {
        currentSortKey = sortKey;
        currentSortOrder = 'asc';
    }
    sortAndDisplayRuns();
}

function sortAndDisplayRuns(searchCriteria = {}) {
    const sortedRuns = [...lastFoundRuns].sort((a, b) => {
        const order = currentSortOrder === 'asc' ? 1 : -1;
        let valA = a[currentSortKey];
        let valB = b[currentSortKey];
        if (valA == null && valB == null) return 0;
        if (valA == null) return 1;
        if (valB == null) return -1;
        if (typeof valA === 'number' && typeof valB === 'number') {
            return (valA - valB) * order;
        }
        return String(valA).localeCompare(String(valB), undefined, { numeric: true }) * order;
    });
    const actFilter = document.getElementById('act-filter').value;
    const levelFilter = document.getElementById('level-filter').value;
    // 分割描画: 全ソート結果を保持し、先頭 RF_PAGE_SIZE 件のみ DOM 化する
    rfAllSortedRuns = sortedRuns;
    displayRunFinderResults(sortedRuns.slice(0, RF_PAGE_SIZE), searchCriteria, actFilter, levelFilter);
}


// --- 結果テーブルの分割描画 (大件数検索の負荷対策・2026-11-02) ---
// 初回レンダリングは先頭 RF_PAGE_SIZE 件のみ DOM 化し、残りは「さらに表示」ボタン /
// スクロール検知 (IntersectionObserver) で追加する。全データは rfAllSortedRuns に保持するため、
// 件数表示・ソート・共有リンクは従来全景 (全件) が分母のまま。
const RF_PAGE_SIZE = 500;
let rfAllSortedRuns = [];
let rfShownRows = 0;
let rfCurrentActFilter = null;
let rfCurrentLevelFilter = null;
let rfMoreObserver = null;
const rfNodeIcons = { 'EliteEnemy': '👿', 'Shop': '🛒', 'Gap': '🔥' };

// --- 終了時マナ基盤 (2026-11-15): data/deck_mana_cache.json (run_id -> 展開済み BaseMana) を遅延ロード ---
let RF_MANA_MAP = null;
let RF_MANA_MAP_FAILED = false;   // 読み込み失敗フラグ (P-35: 失敗時はマナ条件を無視して検索を継続する)
let rfManaSkipNotice = '';        // マナ条件を無視した際に検索結果へ表示するお知らせ
const RF_MANA_ICONS = { W: '🟡', U: '🔵', B: '🟣', R: '🔴', G: '🟢', P: '🌈', C: '🔘', A: '❓' };
const RF_MANA_DOT_COLORS = { W: '#eab308', U: '#3b82f6', B: '#a855f7', R: '#ef4444', G: '#22c55e', P: 'rainbow', C: '#94a3b8', A: '#cbd5e1' };
function ensureManaMapLoaded() {
    if (RF_MANA_MAP && !RF_MANA_MAP_FAILED) return Promise.resolve(RF_MANA_MAP);
    return fetch(`data/deck_mana_cache.json?v=${DATA_VERSION}`)
        .then((res) => { if (!res.ok) throw new Error('HTTP ' + res.status); return res.json(); })
        .then((m) => { RF_MANA_MAP = m || {}; RF_MANA_MAP_FAILED = false; return RF_MANA_MAP; })
        .catch((e) => {
            console.warn('[run-finder] mana base cache load failed:', e);
            RF_MANA_MAP = RF_MANA_MAP || {};
            RF_MANA_MAP_FAILED = true;   // 検索ごとに再試行される
            return RF_MANA_MAP;
        });
}
// PC=カラーアイコン / モバイル=色ドット+個数のコンパクト表記
function rfManaIconsHtml(m) {
    if (!m) return '-';
    if (window.innerWidth <= 768) {
        const counts = {};
        for (const ch of m) counts[ch] = (counts[ch] || 0) + 1;
        let out = '';
        for (const ch of ['W', 'U', 'B', 'R', 'G', 'P', 'C', 'A']) {
            if (!counts[ch]) continue;
            const bg = ch === 'P'
                ? 'background:linear-gradient(135deg,#f87171,#fbbf24,#4ade80,#60a5fa,#c084fc);'
                : `background:${RF_MANA_DOT_COLORS[ch] || '#94a3b8'};`;
            out += `<span class="rf-mg"><span class="rf-mdot" style="${bg}"></span>${counts[ch]}</span>`;
        }
        return out ? `<span class="rf-mana-icons">${out}</span>` : '-';
    }
    let out = '';
    for (const ch of m) out += RF_MANA_ICONS[ch] || ch;
    return `<span class="mana-emoji-rf">${out}</span>`;
}

// 1ラン分の行HTML生成 (旧 displayRunFinderResults 内の行ビルダを流用したもの)
function rfRowHtml(run, actFilter, levelFilter) {
    const texts = UI_TEXT.run_finder;
    try {
            const baseUrl = `https://lbol-logs.github.io/${run.version}/${run.run_id}`;
            const params = [];
            if (actFilter) params.push(`a=${actFilter}`);
            if (levelFilter) params.push(`l=${levelFilter}`);
            const queryParams = params.length > 0 ? '?' + params.join('&') : '';
            const finalUrl = baseUrl + queryParams;

            const pathCells = {
                act1: { early: '&nbsp;', mid: '&nbsp;', late: '&nbsp;', boss: '&nbsp;' },
                act2: { early: '&nbsp;', mid: '&nbsp;', late: '&nbsp;', boss: '&nbsp;' },
                act3: { early: '&nbsp;', mid: '&nbsp;', late: '&nbsp;', boss: '&nbsp;' }
            };

            if (run.path_summary) {
                for (let actNum = 1; actNum <= 3; actNum++) {
                    for (const stage of ['Early', 'Mid', 'Late']) {
                        const key = `Act${actNum} ${stage}`;
                        const nodesInStage = run.path_summary[key] || [];
                        const stageHtml = nodesInStage.map(node => {
                            const icon = rfNodeIcons[node.type] || null;
                            if (!icon) return null;
                            const nodeUrl = `${baseUrl}?a=${actNum}&l=${node.level}`;
                            const stationMapKey = `${actNum}-${node.level}`;
                            const stationIndex = STATION_MAP_GLOBAL[stationMapKey];
                            let eliteAttr = '';
                            if (node.type === 'EliteEnemy' && run.elite_ids) {
                                const ecode = run.elite_ids[`${actNum}-${node.level}`];
                                const enm = (ecode && hardFightsNames[ecode]) ? ((LANG === 'en') ? (hardFightsNames[ecode][1] || hardFightsNames[ecode][0]) : hardFightsNames[ecode][0]) : null;
                                if (enm) eliteAttr = ` data-enemy-name="${escAttr(enm)}"`;
                            }
                            const dataAttributes = `data-character="${run.character}" data-run-id="${run.run_id}" data-station-index="${stationIndex}" data-act="${actNum}" data-level="${node.level}" data-node-type="${node.type}"${eliteAttr}`;
                            return `<a href="${nodeUrl}" target="_blank" class="path-icon-link" ${dataAttributes}>${icon}</a>`;
                        }).filter(Boolean).join('');

                        if (stageHtml) {
                            pathCells[`act${actNum}`][stage.toLowerCase()] = stageHtml;
                        }
                    }

                    const actBossData = run.bosses ? run.bosses[String(actNum)] : null;
                    if (actBossData && bossIconMap[actBossData.name]) {
                        const bossIconUrl = bossIconMap[actBossData.name] || "./img/boss/Unknown.avif";
                        const bossUrl = `${baseUrl}?a=${actNum}&l=${actBossData.level}`;
                        const stationMapKey = `${actNum}-${actBossData.level}`;
                        const stationIndex = STATION_MAP_GLOBAL[stationMapKey];
                        const dataAttributes = `data-character="${run.character}" data-run-id="${run.run_id}" data-station-index="${stationIndex}" data-act="${actNum}" data-level="${actBossData.level}" data-node-type="${actBossData.name}"`;
                        const bossIconHtml = `<a href="${bossUrl}" target="_blank" class="path-icon-link boss-icon-container" ${dataAttributes}><img src="${bossIconUrl}" alt="${actBossData.name}"></a>`;
                        pathCells[`act${actNum}`].boss = bossIconHtml;
                    }
                }
            }

            // 🔍 デッキ診断へプレフィル (デッキ診断タブで類似ランを検索)
            const diagTooltip = texts.diag_tooltip || ((typeof LANG !== 'undefined' && LANG === 'en')
                ? 'Deck Diagnosis: find runs with a similar deck' : 'デッキ診断: このランのデッキと似たランを検索');
            const diagCards = escAttr((run.cards || []).join(','));
            const diagExhibits = escAttr((run.exhibits || []).join(','));

            return `<tr>
                <td class="col-run_id" title="${run.run_id}"><a href="javascript:void(0)" class="rf-diag-link" title="${diagTooltip}" data-character="${run.character}" data-run-id="${run.run_id}" data-cards="${diagCards}" data-exhibits="${diagExhibits}">🔍</a><a href="${finalUrl}" target="_blank" class="run-id-link" data-character="${run.character}" data-run-id="${run.run_id}" data-station-index="${run.matchingStationIndex}">${run.run_id}</a>${run.s === 0 ? ` <span class="rf-ns-badge" title="${texts.ns_badge_tooltip || texts.ns_badge || 'Non-statistics run'}">${texts.ns_badge || 'Non-stat'}</span>` : ''}</td>
                <td class="col-version">${run.version}</td>
                <td class="col-character">${run.character}</td>
                <td class="col-deck_size">${run.displayDeckSize ?? 'N/A'}</td>
                <td class="col-mana" title="${(RF_MANA_MAP && RF_MANA_MAP[run.run_id]) || ''}">${rfManaIconsHtml(RF_MANA_MAP ? RF_MANA_MAP[run.run_id] : null)}</td>
                <td class="col-player_name" title="${run.player_name}">${run.player_name}</td>
                <td class="path-summary-cell col-act1">${pathCells.act1.early}</td>
                <td class="path-summary-cell col-act1">${pathCells.act1.mid}</td>
                <td class="path-summary-cell col-act1">${pathCells.act1.late}</td>
                <td class="path-summary-cell col-act1">${pathCells.act1.boss}</td>
                <td class="path-summary-cell col-act2">${pathCells.act2.early}</td>
                <td class="path-summary-cell col-act2">${pathCells.act2.mid}</td>
                <td class="path-summary-cell col-act2">${pathCells.act2.late}</td>
                <td class="path-summary-cell col-act2">${pathCells.act2.boss}</td>
                <td class="path-summary-cell col-act3">${pathCells.act3.early}</td>
                <td class="path-summary-cell col-act3">${pathCells.act3.mid}</td>
                <td class="path-summary-cell col-act3">${pathCells.act3.late}</td>
                <td class="path-summary-cell col-act3">${pathCells.act3.boss}</td>
            </tr>`;

    } catch (error) {
        console.error(`[ERROR] Failed to process run HTML for run_id: ${run ? run.run_id : 'unknown'}.`, error, run);
        return '';
    }
}

function rfRowsHtml(slice, actFilter, levelFilter) {
    return slice.map(run => rfRowHtml(run, actFilter, levelFilter)).join('');
}

// 「さらに表示」: 続きの RF_PAGE_SIZE 件を tbody 末尾に追加する
function rfShowMoreRuns() {
    const tbody = document.querySelector('#run-finder-results table.run-finder-results-table tbody');
    if (!tbody || rfShownRows >= rfAllSortedRuns.length) { rfUpdateMoreControls(); return; }
    const slice = rfAllSortedRuns.slice(rfShownRows, rfShownRows + RF_PAGE_SIZE);
    tbody.insertAdjacentHTML('beforeend', rfRowsHtml(slice, rfCurrentActFilter, rfCurrentLevelFilter));
    rfShownRows += slice.length;
    rfUpdateMoreControls();
}

// 「さらに表示」ボタンの文言 (残件数) と表示状態を更新
function rfUpdateMoreControls() {
    const holder = document.getElementById('rf-more-holder');
    if (!holder) return;
    const remain = rfAllSortedRuns.length - rfShownRows;
    const isJa = (typeof LANG !== 'undefined' && LANG === 'ja');
    if (remain <= 0) {
        holder.style.display = 'none';
        holder.innerHTML = '';
        return;
    }
    holder.style.display = '';
    holder.innerHTML = `<button id="rf-more-btn" class="copy-share-link">${isJa ? `さらに表示 (残り ${remain.toLocaleString()} 件)` : `Show more (${remain.toLocaleString()} remaining)`}</button>`;
    const moreBtn = document.getElementById('rf-more-btn');
    if (moreBtn) moreBtn.onclick = () => rfShowMoreRuns();
}

// 無限スクロール検知: 残件ボタンが視野近くに入ったら自動追加 (非対応環境はボタンのみ)
function rfBindMoreControls() {
    if (rfMoreObserver) { rfMoreObserver.disconnect(); rfMoreObserver = null; }
    const holder = document.getElementById('rf-more-holder');
    if (!holder || typeof IntersectionObserver === 'undefined') return;
    rfMoreObserver = new IntersectionObserver((entries) => {
        for (const e of entries) {
            if (e.isIntersecting) { rfShowMoreRuns(); break; }
        }
    }, { rootMargin: '800px 0px' });
    rfMoreObserver.observe(holder);
}

// --- 重い Plotly の遭遇棒グラフを、テーブル描画完了後に遅延実行 ---
//   (検索結果の表が先に出る。アイドル時 or 最長 2 秒後 — 二重実行はタイマの差し替えで回避)
let rfEncBarsTimer = null;
function rfScheduleEncounterBars(runs, searchCriteria) {
    if (rfEncBarsTimer !== null) {
        if (typeof window.cancelIdleCallback === 'function' && typeof rfEncBarsTimer === 'number') window.cancelIdleCallback(rfEncBarsTimer);
        else clearTimeout(rfEncBarsTimer);
        rfEncBarsTimer = null;
    }
    const schedule = (typeof window.requestIdleCallback === 'function')
        ? (fn) => { rfEncBarsTimer = window.requestIdleCallback(fn, { timeout: 2000 }); }
        : (fn) => { rfEncBarsTimer = setTimeout(fn, 500); };
    schedule(() => {
        rfEncBarsTimer = null;
        renderEncounterBars(runs, searchCriteria);
    });
}

function displayRunFinderResults(runs, searchCriteria = {}, actFilter = null, levelFilter = null) {
    const resultsContainer = document.getElementById('run-finder-results');
    const toggleContainer = document.getElementById('column-toggle-container');
    if (toggleContainer) {
        toggleContainer.style.display = (runs && runs.length > 0) ? 'block' : 'none';
    }
    const texts = UI_TEXT.run_finder;

    if (!runs || runs.length === 0) {
        resultsContainer.innerHTML = `<p>${texts.search_no_results}</p>`;
        return;
    }

    let criteriaHtml = '';
    if (searchCriteria && Object.values(searchCriteria).some(v => v !== null)) {
        const criteriaList = [];
        const critLabel = (key, fallback) => UI_TEXT.run_finder[`crit_${key}`] || fallback;
        const crit = (label, value) => `<span class="search-criterion"><strong>${label}:</strong> ${value}</span>`;

        if (searchCriteria.character) criteriaList.push(crit(critLabel('char', 'Char'), searchCriteria.character));
        if (searchCriteria.playerName) criteriaList.push(crit(critLabel('player', 'Player'), searchCriteria.playerName));
        if (searchCriteria.act) criteriaList.push(crit(critLabel('act', 'Act'), searchCriteria.act));
        if (searchCriteria.level) criteriaList.push(crit(critLabel('level', 'Level'), searchCriteria.level));
        if (searchCriteria.deckSize) {
            const op = searchCriteria.deckSize.operator === 'lte' ? '<=' : '>=';
            criteriaList.push(crit(critLabel('deck', 'Deck'), `${op} ${searchCriteria.deckSize.value}`));
        }
        if (searchCriteria.includeItems) criteriaList.push(crit(critLabel('include', 'Include'), `${searchCriteria.includeItems.items.join(', ')} (${searchCriteria.includeItems.logic})`));
        if (searchCriteria.excludeItems) criteriaList.push(crit(critLabel('exclude', 'Exclude'), searchCriteria.excludeItems.join(', ')));
        if (searchCriteria.includeEnemies) criteriaList.push(crit(critLabel('enemies', 'Include enemies'), `${(searchCriteria.includeEnemies.enemies || []).join(', ')} (${searchCriteria.includeEnemies.logic})`));
        if (searchCriteria.excludeEnemies) criteriaList.push(crit(critLabel('ex_enemies', 'Exclude enemies'), searchCriteria.excludeEnemies.join(', ')));
        if (searchCriteria.includeNs) criteriaList.push(crit(critLabel('ns', 'Non-stat'), UI_TEXT.run_finder.ns_crit_value || 'ON'));
        if (searchCriteria.mana) {
            const manaNames = UI_TEXT.run_finder.mana_names || {};
            const parts = Object.entries(searchCriteria.mana).map(([c, n]) => `${(RF_MANA_ICONS[c] || c)}≥${n}(${manaNames[c] || c})`);
            criteriaList.push(crit(critLabel('mana', 'Mana base'), parts.join(' ')));
        }

        if (criteriaList.length > 0) {
            criteriaHtml = `<div class="search-criteria-summary">${criteriaList.join('')}</div>`;
        }
    }

    // 分割描画 (A案): 初回は先頭 RF_PAGE_SIZE 件のみ行を生成 (続行は rfShowMoreRuns が追加)
    rfCurrentActFilter = actFilter;
    rfCurrentLevelFilter = levelFilter;
    rfShownRows = Math.min(RF_PAGE_SIZE, runs.length);
    const runRows = rfRowsHtml(runs.slice(0, rfShownRows), actFilter, levelFilter);


    const getSortIndicator = (key) => {
        if (currentSortKey === key) return currentSortOrder === 'asc' ? ' ▲' : ' ▼';
        return '';
    };

    // ★修正箇所: テーブル全体を <div class="table-wrapper"> で囲む
    resultsContainer.innerHTML = `
        <div class="results-header">
            <h4>${texts.search_results_title.replace('{count}', rfAllSortedRuns.length)}</h4>
            <button onclick="generateAndCopyShareLink()" class="copy-share-link">${texts.share_link_button}</button>
            <button onclick="rfJumpToHistory()" class="copy-share-link" title="${texts.hist_jump_title || ''}">${texts.hist_jump || 'Search history comparison'}</button>
        </div>
        ${criteriaHtml}
        ${rfManaSkipNotice ? `<p class="analysis-note" style="margin: 6px 0 0;">${rfManaSkipNotice}</p>` : ''}
        <div class="table-wrapper">
            <table class="run-finder-results-table">
                <thead>
                    <tr>
                        <th rowspan="2" class="col-run_id"  onclick="handleSortClick('run_id')">${texts.header_run_id}${getSortIndicator('run_id')}</th>
                        <th rowspan="2" class="col-version" onclick="handleSortClick('version')">${texts.header_version}${getSortIndicator('version')}</th>
                        <th rowspan="2" class="col-character" onclick="handleSortClick('character')">${texts.header_character}${getSortIndicator('character')}</th>
                        <th rowspan="2" class="col-deck_size" onclick="handleSortClick('displayDeckSize')">${texts.header_deck_size}${getSortIndicator('displayDeckSize')}</th>
                        <th rowspan="2" class="col-mana">${texts.header_mana || 'Mana'}</th>
                        <th rowspan="2" class="col-player_name" onclick="handleSortClick('player_name')">${texts.header_player_name}${getSortIndicator('player_name')}</th>
                        <th colspan="4" class="act-header col-act1">${texts.header_act1}</th>
                        <th colspan="4" class="act-header col-act2">${texts.header_act2}</th>
                        <th colspan="4" class="act-header col-act3">${texts.header_act3}</th>
                    </tr>
                    <tr class="stage-header-row">
                        <th class="col-act1">${texts.header_stage_early}</th><th class="col-act1">${texts.header_stage_mid}</th><th class="col-act1">${texts.header_stage_late}</th><th class="col-act1">${texts.header_stage_boss}</th>
                        <th class="col-act2">${texts.header_stage_early}</th><th class="col-act2">${texts.header_stage_mid}</th><th class="col-act2">${texts.header_stage_late}</th><th class="col-act2">${texts.header_stage_boss}</th>
                        <th class="col-act3">${texts.header_stage_early}</th><th class="col-act3">${texts.header_stage_mid}</th><th class="col-act3">${texts.header_stage_late}</th><th class="col-act3">${texts.header_stage_boss}</th>
                    </tr>
                </thead>
                <tbody>
                    ${runRows}
                </tbody>
            </table>
        </div>
        <div id="rf-more-holder" style="display:none; text-align:center; margin:14px 0;"></div>
        <div id="rf-search-summary"></div>
        <div id="run-finder-hardfights-chart" style="max-width: 1600px; margin: 0 auto; width: 100%;"></div>
        <div style="max-width: 1600px; margin: 26px auto 0;">
            <div class="results-header">
                <h4>${texts.history_title || ''}</h4>
                <button onclick="clearSearchHistory()" class="copy-share-link">${texts.history_clear || ''}</button>
            </div>
            <p class="analysis-note" style="margin:6px 0 0;">${texts.history_hint || ''}</p>
            <div id="rf-history-panel">${renderSearchHistoryPanel()}</div>
        </div>
    `;

    // --- 分割描画コントロール + 棒グラフ (重い Plotly 描画) はテーブル表示後に遅延実行 ---
    // --- 列の表示状態を「表示する列」チェックボックスに同期 (初期状態 ver/マナ=非表示, ソート時の再描画でも維持) ---
    const renderedTable = resultsContainer.querySelector('.run-finder-results-table');
    if (renderedTable) {
        document.querySelectorAll('.column-toggle-checkbox').forEach(cb => {
            renderedTable.classList.toggle(`hide-col-${cb.dataset.col}`, !cb.checked);
        });
    }

    rfUpdateMoreControls();
    rfBindMoreControls();
    rfScheduleEncounterBars(rfAllSortedRuns, searchCriteria);
    // 2026-11-24 (企画3): 検索結果サマリー (表の下・遅延描画)
    //   注意: runs は先頭 RF_PAGE_SIZE 件のスライスなので、全件が入った rfAllSortedRuns を集計する
    rfFillSearchSummary(rfAllSortedRuns, actFilter, levelFilter);

}

async function generateAndCopyShareLink() {
    const button = document.querySelector('.copy-share-link');
    const originalButtonText = button.textContent;

    const params = new URLSearchParams();
    const char = document.getElementById('character-select').value;
    if (char) params.set('char', char);
    const act = document.getElementById('act-filter').value;
    if (act) params.set('act', act);
    const level = document.getElementById('level-filter').value;
    if (level) params.set('level', level);
    const deckOp = document.getElementById('deck-size-operator').value;
    const deckVal = document.getElementById('deck-size-value').value;
    if (deckOp !== 'any' && deckVal) {
        params.set('deckOp', deckOp);
        params.set('deckVal', deckVal);
    }
    const pln = (document.getElementById('player-name-filter').value || '').trim();
    if (pln) params.set('player', pln);
    const getItemsFromList = (listId) => Array.from(document.getElementById(listId).children).map(tag => tag.dataset.itemName);
    const includeItems = getItemsFromList('include-items-list');
    if (includeItems.length > 0) params.set('includeItems', includeItems.join(','));
    const excludeItems = getItemsFromList('exclude-items-list');
    if (excludeItems.length > 0) params.set('excludeItems', excludeItems.join(','));
    const itemLogic = document.querySelector('input[name="include-logic"]:checked').value;
    if (itemLogic !== 'OR') params.set('itemLogic', itemLogic);
    const includeEnemies = Array.from((document.getElementById('enemy-in-list') || { children: [] }).children).map(tag => tag.dataset.itemName);
    if (includeEnemies.length > 0) params.set('includeEnemies', includeEnemies.join(','));
    const excludeEnemies = Array.from((document.getElementById('enemy-ex-list') || { children: [] }).children).map(tag => tag.dataset.itemName);
    if (excludeEnemies.length > 0) params.set('excludeEnemies', excludeEnemies.join(','));
    const enemyLogicEl = document.querySelector('input[name="enemy-logic"]:checked');
    if (enemyLogicEl && enemyLogicEl.value !== 'OR') params.set('enemyLogic', enemyLogicEl.value);
    if (document.getElementById('include-ns-checkbox') && document.getElementById('include-ns-checkbox').checked) params.set('ns', '1');
    // 終了時マナ基盤の条件 (P-33系: 🟡≥N 等を mana=B2,U5 形式で埋め込む)
    const manaParts = [];
    document.querySelectorAll('.rf-mana-cond input').forEach(inp => {
        const v = +inp.value || 0;
        if (v > 0) manaParts.push(`${inp.dataset.m}${v}`);
    });
    if (manaParts.length > 0) params.set('mana', manaParts.join(','));
    if (document.getElementById('timeline-search-toggle')?.checked) params.set('ts', '1');
    // 敵遭遇 Act/Lv 限定 (encAt チェックボックス)
    if (document.getElementById('enc-at-checkbox')?.checked) params.set('encAt', '1');
    // ルート条件 (P-19): r=A1X>=2,X>=4 形式 (+R: 履歴ラベルと同じ表記 / A<n> 無し = 合計)
    const routeCondsForLink = rfCollectRouteConds();
    if (routeCondsForLink.length > 0) {
        params.set('r', routeCondsForLink.map(c => (c.act ? 'A' + c.act : '') + c.type + (c.op === 'gte' ? '>=' : c.op === 'lte' ? '<=' : '=') + c.n).join(','));
    }
    params.set('search', 'true');

    const baseUrl = window.location.origin + window.location.pathname;
    const longUrl = `${baseUrl}?${params.toString()}`;

    button.disabled = true;
    button.textContent = '短縮中...';

    try {
        // ③-G2: 短縮は lbolShortenUrl (結果キャッシュ + is.gd → v.gd → spoo.me) に統一。
        //   is.gd は IP あたり 200 件/時の制限があり、同じ条件の再短縮で制限に当たるため。
        const shortUrl = (typeof lbolShortenUrl === 'function') ? await lbolShortenUrl(longUrl) : null;
        if (!shortUrl) {
            throw new Error('all shorteners failed');
        }
        await rfCopyToClipboard(shortUrl);
        alert(UI_TEXT.run_finder.copy_link_success_short);

    } catch (err) {
        console.error('URLの短縮に失敗しました。元のURLをコピーします。', err);
        // フォールバック: 短縮に失敗したら元の長いURLをコピーする
        try {
            await rfCopyToClipboard(longUrl);
            alert(UI_TEXT.run_finder.copy_link_fail_fallback);
        } catch (err2) {
            // クリップボードも使えない場合 (非セキュアコンテキスト等) はURLを表示して手コピーできるようにする
            prompt(UI_TEXT.run_finder.copy_link_fail_fallback, longUrl);
        }
    } finally {
        button.disabled = false;
        button.textContent = originalButtonText;
    }
}

// クリップボード複写 (navigator.clipboard が使えない環境では execCommand にフォールバック)
async function rfCopyToClipboard(text) {
    if (navigator.clipboard && window.isSecureContext) {
        await navigator.clipboard.writeText(text);
        return;
    }
    const ta = document.createElement('textarea');
    ta.value = text;
    ta.style.position = 'fixed';
    ta.style.left = '-9999px';
    document.body.appendChild(ta);
    ta.focus();
    ta.select();
    try {
        if (!document.execCommand('copy')) throw new Error('execCommand copy failed');
    } finally {
        document.body.removeChild(ta);
    }
}


/**
 * データがロードされるのを待ってから自動検索を実行する
 */
function attemptAutoSearch() {
    // performAdvancedSearchの先頭にあるのと同じデータ準備チェック
    if (!ALL_DATA.lookup_tables) {
        console.log("自動検索: データがまだ準備できていません。200ms後に再試行します。");
        setTimeout(attemptAutoSearch, 200); // 待機して再試行
        return;
    }
    // (P-03) run_details.json はレイジーロード → 完了を待ってから1回だけ検索
    (window.ensureRunDetailsLoaded ? window.ensureRunDetailsLoaded() : Promise.resolve())
        .then(() => {
            if (ALL_RUN_DETAILS && ALL_RUN_DETAILS.length) {
                console.log("自動検索: データ準備完了。検索を実行します。");
                performAdvancedSearch();
            } else {
                console.error("自動検索: run_details.json が利用できないため中止します。");
            }
        });
}

let _rfUrlParamsApplied = false;
function populateUiFromUrlParams() {
    let params = new URLSearchParams(window.location.search);
    // ③-G: localStorage 経由の条件 (?rfq=<key> / openRunFinderSearch の長条件受け渡し)
    const rfqKey = params.get('rfq');
    if (rfqKey) {
        try {
            const raw = localStorage.getItem(rfqKey);
            if (raw) {
                params = new URLSearchParams(raw);
                params.set('search', 'true');
            }
        } catch (e) { /* 壊れたキーは URL パラメータにフォールバック */ }
        try { localStorage.removeItem(rfqKey); } catch (e) {}   // 一度使った受け渡しキーは削除
    }
    if (!params.has('search')) return false;
    if (_rfUrlParamsApplied) return false;   // タブ再訪時に再適用して条件 (アイテム/敵/ルートのタグ・行) を二重復元するのを防止
    _rfUrlParamsApplied = true;

    console.log("URLパラメータを検出しました。UIに設定します...");
    if (params.has('char')) document.getElementById('character-select').value = params.get('char');
    if (params.has('act')) document.getElementById('act-filter').value = params.get('act');
    if (params.has('level')) document.getElementById('level-filter').value = params.get('level');
    if (params.has('deckOp')) document.getElementById('deck-size-operator').value = params.get('deckOp');
    if (params.has('deckVal')) document.getElementById('deck-size-value').value = params.get('deckVal');
    if (params.has('player')) document.getElementById('player-name-filter').value = params.get('player');
    if (params.has('includeItems')) params.get('includeItems').split(',').forEach(item => addItemTag(item, 'in'));
    if (params.has('excludeItems')) params.get('excludeItems').split(',').forEach(item => addItemTag(item, 'ex'));
    if (params.has('itemLogic')) document.querySelector(`input[name="include-logic"][value="${params.get('itemLogic')}"]`).checked = true;
    if (params.has('includeEnemies')) params.get('includeEnemies').split(',').forEach(e => addEnemyTag(e, 'in'));
    if (params.has('excludeEnemies')) params.get('excludeEnemies').split(',').forEach(e => addEnemyTag(e, 'ex'));
    if (params.has('enemyLogic')) { const r = document.querySelector(`input[name="enemy-logic"][value="${params.get('enemyLogic')}"]`); if (r) r.checked = true; }
    if (params.has('ns')) { const nsEl = document.getElementById('include-ns-checkbox'); if (nsEl) nsEl.checked = true; }
    // 終了時マナ基盤の条件復元 (mana=B2,U5 形式)
    if (params.has('mana')) {
        params.get('mana').split(',').forEach(part => {
            const m = part.match(/^([WUBRGCAP])(\d+)$/);
            if (m) { const inp = document.querySelector(`.rf-mana-cond input[data-m="${m[1]}"]`); if (inp) inp.value = m[2]; }
        });
    }
    if (params.has('ts')) { const tsEl = document.getElementById('timeline-search-toggle'); if (tsEl) tsEl.checked = true; }
    // 敵遭遇 Act/Lv 限定 (encAt=1) の復元。共有された条件は見える状態で敵フィルターを開く
    if (params.has('encAt')) {
        const encEl = document.getElementById('enc-at-checkbox');
        if (encEl) encEl.checked = true;
        const eContent = document.getElementById('enemy-filter-content');
        if (eContent && eContent.classList.contains('collapsed')) {
            eContent.classList.remove('collapsed');
            const eToggle = document.getElementById('enemy-filter-toggle');
            if (eToggle) eToggle.textContent = (UI_TEXT.run_finder && UI_TEXT.run_finder.enemy_filter_toggle_collapse) || '敵グループフィルターを閉じる ▲';
        }
    }
    // ルート条件の復元 (r=A1X>=2,X>=4 形式 / P-19)。共有された条件は見える状態で開く
    if (params.has('r')) {
        params.get('r').split(',').forEach(tok => {
            const c = rfParseRouteCondToken(tok);
            if (c) rfAddRouteCondRow(c);
        });
        const rtEl = document.getElementById('route-filter-toggle');
        const rcEl = document.getElementById('route-filter-content');
        if (rtEl && rcEl && rcEl.classList.contains('collapsed')) {
            rcEl.classList.remove('collapsed');
            rtEl.textContent = (UI_TEXT.run_finder && UI_TEXT.run_finder.route_filter_toggle_collapse) || 'ルート条件フィルターを閉じる ▲';
        }
    }

    // 自動検索は呼び出し元 (script.dev.js) が attemptAutoSearch() で行う (二重検索防止)
    return true;
}

// script.dev.js から呼び出される関数をグローバルスコープに登録
window.renderRunFinderTab = renderRunFinderTab;
window.populateUiFromUrlParams = populateUiFromUrlParams;
window.attemptAutoSearch = attemptAutoSearch;
window.handleSortClick = handleSortClick; // ソート関数もグローバルに
window.generateAndCopyShareLink = generateAndCopyShareLink; // 共有リンク生成関数もグローバルに