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
            <p class="analysis-note">${texts.data_scope_warning}${texts.chart_notice ? `<br>${texts.chart_notice}` : ''}</p>
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
                </div>
                <div class="control-group-row">
                    <div class="control-section" style="flex-grow: 1;">
                        <h4>${texts.include_items_label}</h4>
                        <div class="control-group-input">
                            <input list="all-items-datalist" id="include-item-input" placeholder="${texts.item_placeholder}">
                            <button id="add-include-item-btn" class="add-btn">${texts.add_btn}</button>
                            <div class="search-logic">
                                <input type="radio" id="include-logic-and" name="include-logic" value="AND" checked>
                                <label for="include-logic-and">${texts.logic_and}</label>
                                <input type="radio" id="include-logic-or" name="include-logic" value="OR">
                                <label for="include-logic-or">${texts.logic_or}</label>
                            </div>
                        </div>
                        <div id="include-items-list" class="item-tag-list"></div>
                    </div>
                    <div class="control-section" style="flex-grow: 1;">
                        <h4>${texts.exclude_items_label}</h4>
                        <div class="control-group-input">
                            <input list="all-items-datalist" id="exclude-item-input" placeholder="${texts.item_placeholder}">
                            <button id="add-exclude-item-btn" class="add-btn">${texts.add_btn}</button>
                        </div>
                        <div id="exclude-items-list" class="item-tag-list"></div>
                    </div>
                </div>
                <div class="control-group-row boss-collapsible-section">
                    <div id="boss-filter-toggle" class="boss-filter-toggle-button">${texts.boss_filter_toggle_expand}</div>
                    <div id="boss-filter-content" class="boss-filter-content collapsed">
                        <div class="control-section" style="flex-grow: 1;">
                            <h4>${texts.include_bosses_label}</h4>
                            <div id="include-boss-selector-container" class="boss-selector-grid"></div>
                            <div class="search-logic" style="margin-top: 10px;">
                                <label><input type="radio" name="boss-logic" value="AND" checked> ${texts.logic_and}</label>
                                <label><input type="radio" name="boss-logic" value="OR" > ${texts.logic_or}</label>

                            </div>
                            <div class="item-tag-list" id="include-bosses-list"></div>
                        </div>
                        <div class="control-section" style="flex-grow: 1;">
                            <h4>${texts.exclude_bosses_label}</h4>
                            <div id="exclude-boss-selector-container" class="boss-selector-grid"></div>
                            <div class="item-tag-list" id="exclude-bosses-list"></div>
                        </div>
                    </div>
                </div>
                <button id="run-search-button" class="primary-search-btn">${texts.search_btn}</button>

                <div id="column-toggle-container" class="column-toggle-container" style="display: none;">
                    <h4>${texts.show_columns_label}</h4>
                        <div class="toggle-options">
                            <label><input type="checkbox" class="column-toggle-checkbox" data-col="version" checked> ${texts.header_version}</label>
                            <label><input type="checkbox" class="column-toggle-checkbox" data-col="character" checked> ${texts.header_character}</label>
                            <label><input type="checkbox" class="column-toggle-checkbox" data-col="deck_size" checked> ${texts.header_deck_size}</label>
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
        </div>
        <datalist id="all-items-datalist">${datalistOptions}</datalist>
        <datalist id="player-name-datalist"></datalist>
    `;

    tabContent.innerHTML = `<div class="analysis-section">${finderHtml}</div>`;

    // UIのイベントリスナーを設定
    document.getElementById('run-search-button').addEventListener('click', performAdvancedSearch);

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

    setupTagInput('include-item-input', 'add-include-item-btn', 'include-items-list');
    setupTagInput('exclude-item-input', 'add-exclude-item-btn', 'exclude-items-list');

    setupBossSelectors();

    const bossToggleBtn = document.getElementById('boss-filter-toggle');
    const bossContent = document.getElementById('boss-filter-content');
    if (bossToggleBtn && bossContent) {
        bossToggleBtn.addEventListener('click', () => {
            const isCollapsed = bossContent.classList.toggle('collapsed');
            bossToggleBtn.textContent = isCollapsed ? texts.boss_filter_toggle_expand : texts.boss_filter_toggle_collapse;
        });
    }


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

        // --- REVISED TOOLTIP TITLE LOGIC ---
        let locationInfo = '';
        if (stationIndex === 'final') {
            locationInfo = ` (${texts.tooltip_final_deck})`;
        } else {
            let stateDetails = '';
            if (act && level && nodeType) {
                // For path/boss icons with full data
                const translationKey = `node_type_${nodeType.toLowerCase()}`;
                const translatedNodeType = texts[translationKey];
                const nodeTypeName = translatedNodeType || nodeType; // Fallback to original name (for bosses)
                stateDetails = `Act ${act}, Lvl ${level}: ${nodeTypeName}`;
            } else if (stationIndexToActLevel[stationIndex]) {
                // For run-id links pointing to a specific station
                const actLevelString = stationIndexToActLevel[stationIndex];
                stateDetails = `Act ${actLevelString}`;
            }
            if (stateDetails) {
                locationInfo = ` (${texts.tooltip_state_prefix}${stateDetails})`;
            }
        }

        // --- 苦戦戦闘 / スペルカード使用セクション (表示中ステーションより前の戦闘のみ) ---
        hoveredTooltipLink = link;
        const targetIdx = (stationIndex === 'final') ? Infinity : parseInt(stationIndex, 10);
        const hfEntries = (hardFightsByChar[character] || {})[runId];
        const hardFightsHtml = buildHardFightsHtml(hfEntries, targetIdx, texts);

        tooltipElement.innerHTML = `
            <div class="deck-tooltip-title">Deck (${cards.length} cards)${locationInfo}</div>
            <ul class="deck-tooltip-list">${deckHtml || '<li>(No cards)</li>'}</ul>
            ${hardFightsHtml}
        `;

        // 先に表示して寸法を確定させる
        tooltipElement.style.display = 'block';
        // 新しい位置調整関数を呼び出す
        updateTooltipPosition(event);

        // hard_fights.json 未ロードのときはロード完了後に再描画 (ホバー中の行が変わっていたら放棄)
        if (!hardFightsByChar.__loaded) {
            loadHardFights().then(() => {
                if (hoveredTooltipLink !== link) return;
                const list2 = (hardFightsByChar[character] || {})[runId];
                if (!list2 || !list2.length) return;
                tooltipElement.innerHTML = `
                    <div class="deck-tooltip-title">Deck (${cards.length} cards)${locationInfo}</div>
                    <ul class="deck-tooltip-list">${deckHtml || '<li>(No cards)</li>'}</ul>
                    ${buildHardFightsHtml(list2, targetIdx, texts)}
                `;
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
    if (listId === 'exclude-items-list' || listId === 'exclude-bosses-list') {
        tag.style.backgroundColor = '#F44336';
    }
    list.appendChild(tag);
}

function addBossToSelection(bossName, listId) {
    addItemToSelection(bossName, listId);
}

function setupBossSelectors() {
    const includeContainer = document.getElementById('include-boss-selector-container');
    const excludeContainer = document.getElementById('exclude-boss-selector-container');
    if (!includeContainer || !excludeContainer) return;
    let bossIconsHtml = '';
    for (const bossName in bossIconMap) {
        const iconUrl = bossIconMap[bossName];
        bossIconsHtml += `<img src="${iconUrl}" alt="${bossName}" title="${bossName}" class="boss-selector-icon" data-boss-name="${bossName}">`;
    }
    includeContainer.innerHTML = bossIconsHtml;
    excludeContainer.innerHTML = bossIconsHtml;
    includeContainer.addEventListener('click', (event) => {
        if (event.target.classList.contains('boss-selector-icon')) {
            addBossToSelection(event.target.dataset.bossName, 'include-bosses-list');
        }
    });
    excludeContainer.addEventListener('click', (event) => {
        if (event.target.classList.contains('boss-selector-icon')) {
            addBossToSelection(event.target.dataset.bossName, 'exclude-bosses-list');
        }
    });
}


// ==================================================================================
//  CORE SEARCH LOGIC - REBUILT FOR PERFORMANCE
// ==================================================================================

// --- 検索結果末尾の棒グラフ: 検索したラン集合での 敵ごと「遭遇回数」を横棒で表示し,
//     苦戦した部分 (🩸ライフ部門 / ⚡️スペルカード部門) だけを濃色で積み上げて表現する ---
let hfBarMode = 'count';   // 苦戦棒グラフの表示モード: 'count' = 遭遇回数ベース / 'pct' = 割合ベース (100% 積み上げ)
let hfBarsCriteria = null; // 棒グラフと一緒に表示する検索条件 (タイトルに条件ラベルを出す)

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
    for (const run of (runs || [])) {
        const enc = (hardFightsEncs[run.character] || {})[run.run_id];
        if (!enc || !enc.length) continue;
        nRuns++;
        for (const code of enc) {
            byEnc.set(code, (byEnc.get(code) || 0) + 1);
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
    // hover 用の詳細数値: [遭遇, 苦戦合計, 苦戦率文字列]
    const custom = sorted.map((row, i) => [encVals[i], hardVals[i], rateTxt[i]]);

    const rev = (a) => a.slice().reverse();
    const labelsRev = rev(labels);

    // 苦戦の部分だけ濃色で塗る: [ライフ / スペル / 両方] を起点側に積み上げ, 残りは薄色
    // (積み上げ基点 = 軸側なので, 軸から「苦戦した長さ」が伸びる形になる)
    const segments = [
        { name: isJa ? '🩸 苦戦 (ライフ)' : 'Hard (HP)', vals: hpVals, color: '#d6455d' },
        { name: isJa ? '⚡️ 苦戦 (スペルカード)' : 'Hard (Spell)', vals: spVals, color: '#7c5ce0' },
        { name: isJa ? '🩸⚡️ 苦戦 (両方)' : 'Hard (both)', vals: bothVals, color: '#7a1f3d' },
        { name: isJa ? '苦戦なし' : 'No hard fights', vals: restVals, color: '#dbe7e4' },
    ];

    // 敵名が長いので高さは敵数に比例させ, 全表示 (ページスクロール) で読む。下限で下限は確保
    const chartHeight = Math.max(700, labels.length * 34 + 160);   // 1行あたり34px: 棒の間隔を広めに取る
    // 表示モード: 'count' = 棒の長さ = 遭遇回数 / 'pct' = 全員の棒が同じ長さ (100% 積み上げ)
    const isPct = hfBarMode === 'pct';
    const scale = (vals) => (isPct ? vals.map((v, i) => v / encVals[i] * 100) : vals);
    const segMax = isPct ? 100 : Math.max(1, ...encVals);

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
        font: { size: 11.5, color: '#64748b' },
    }));

    // タイトルへ検索条件ラベルを追加 (例: "@Sophie CirnoA Act1 …") — 条件が空 ('(all)') のときは出さない
    const criteriaLabel = hfBarsCriteria ? makeQueryLabel(hfBarsCriteria) : '';
    Plotly.newPlot(plotDiv, segments.map(s => ({
        type: 'bar',
        orientation: 'h',
        y: labelsRev,
        x: rev(isPct ? scale(s.vals) : s.vals),
        customdata: rev(custom),
        name: s.name,
        marker: { color: s.color, line: { color: '#fff', width: 0.5 } },
        hovertemplate: `%{y}<br>${isJa ? '遭遇' : 'Encounters'}: %{customdata[0]}`
            + `<br>${isJa ? '苦戦した戦闘' : 'Hard fights'}: %{customdata[2]}`
            + `<br>${s.name}: %{x}${isPct ? '%' : ''}<extra></extra>`,
    })), {
        barmode: 'stack',
        title: {
            text: `${isJa ? '遭遇した戦闘 (敵ごと)' : 'Battles Fought (by Enemy)'}`
                + ` <span style="font-size:0.8em;color:#64748b">(${nRuns} ラン / ${nRuns === 1 ? '1 run' : nRuns + ' runs'})</span>`
                + (criteriaLabel && criteriaLabel !== '(all)' ? ` <span style="font-size:0.75em;color:#475569;font-weight:700">｜${criteriaLabel}</span>` : '')
                + `<br><span style="font-size:0.7em;color:#64748b">${isJa ? '👹=エリート ✨=特殊イベント ・ ボス=キャラ絵 ・ ' : '👹=Elite ✨=Special Event ・ Boss=avatar ・ '}${isJa ? (isPct ? '棒の長さ = 遭遇に対する割合 (100% 積み上げ)' : '棒の長さ = 遭遇回数 ・ 色付き部分 = 苦戦した戦闘') : (isPct ? 'bar length = % of encounters (100% stacked)' : 'bar length = encounters ・ colored part = hard fights')} ・ ${isJa ? '並び順 = 時系列 (Act → 種別 → Lv)' : 'order = chronological (Act → type → level)'}</span>`,
            font: { size: 16 },
        },
        showlegend: true,
        legend: { orientation: 'h', y: -0.08, font: { size: 11 } },
        annotations: rateNotes,
        xaxis: {
            title: isPct ? (isJa ? '遭遇に対する苦戦の割合 (%)' : '% of encounters')
                : (isJa ? '遭遇回数' : 'Encounters'),
            range: [0, segMax * (isPct ? 1.18 : 1.2)],
            gridcolor: '#e2e8f0',
        },
        yaxis: { automargin: true, tickfont: { size: 13 } },
        bargap: 0.3,   // 棒の太さ = 行の70%: 棒の間に空間を入れて見やすくする
        margin: { t: 70, b: 70, l: 0, r: 30 },
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
    // レイアウト完全確定後 (tick ラベル配置後) にもう一度張り直す
    try { plotDiv.on('plotly_afterplot', positionBossAvatarOverlay); } catch (e) { /* イベント無視 */ }
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
    }, 120);
});

// --- NEW: Aggregated Timeline Cache and Fetcher ---
const characterTimelineCache = new Map();

// --- 苦戦戦闘 (ΔHp>=15) / スペルカード使用 (ΔP>=50) per-run 情報 (data/hard_fights.json) ---
const hardFightsByChar = {};   // { character: { runId: [ {si,a,l,dh,sp,g,j,e} ] } }
const hardFightsNames = {};    // { code ('gid1+gid2'): [jaName, enName] }  遭遇/苦戦集計用の名前テーブル
const hardFightsEncs = {};     // { character: { runId: [code, ...] } }      全戦闘ステーションの遭遇リスト
const hardFightsStats = {};    // { character: { runId: {L:総ライフ喪失, LA:[Act別喪失x4], S:スペル回数, T:{'{act}{kind}':[ターン和,戦闘数]}} } }
let hardFightsPromise = null;
let hardFightsDataOk = false;  // stats (data.stats) の読み込みに成功したか (失敗時は検索時に再試行)
let hoveredTooltipLink = null; // マウスが乗っているリンク (遅延ロード後の再描画でのみ参照)

function loadHardFights(force) {
    if (hardFightsPromise && !force) return hardFightsPromise;
    const isLocal = window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1';
    const basePath = isLocal ? `/card_effectiveness_reports/data/` : './data/';
    const ver = (typeof DATA_VERSION !== 'undefined') ? DATA_VERSION : '';
    hardFightsPromise = fetch(`${basePath}hard_fights.json?v=${ver}`)
        .then(response => (response.ok ? response.json() : null))
        .then(data => {
            if (data && data.runs) Object.assign(hardFightsByChar, data.runs);
            if (data && data.names) Object.assign(hardFightsNames, data.names);
            if (data && data.encs) Object.assign(hardFightsEncs, data.encs);
            if (data && data.stats) { Object.assign(hardFightsStats, data.stats); hardFightsDataOk = true; }
            hardFightsByChar.__loaded = true;
            return hardFightsByChar;
        })
        .catch(error => {
            console.error('[ERROR] Failed to fetch hard_fights.json:', error);
            hardFightsByChar.__loaded = true; // 失敗時は次の検索で再試行
            return hardFightsByChar;
        });
    return hardFightsPromise;
}

// 1 ラン分のエントリ -> ツールチップ末尾に付ける HTML
// targetIdx: 表示中ステーションの index (このステーションより前に発生した戦闘のみ出す / Infinity で全件)
function buildHardFightsHtml(entries, targetIdx, texts) {
    const isJa = LANG === 'ja';
    const list = (entries || []).filter(e => (targetIdx === Infinity || isNaN(targetIdx)) ? true : e.si < targetIdx);
    if (!list.length) return '';
    const tTitle = texts.hard_fights_title || (isJa ? '苦戦した戦闘' : 'Hard Fights');
    const maxLines = 8;
    const shown = list.slice(0, maxLines);
    const lines = shown.map(e => {
        const name = isJa ? (e.j || e.e) : (e.e || e.j);
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

async function loadCharacterTimeline(charKey) {
    if (characterTimelineCache.has(charKey)) {
        return characterTimelineCache.get(charKey);
    }

    const isLocal = window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1';
    const basePath = isLocal ? `/card_effectiveness_reports/data/` : './data/';
    const filePath = `${basePath}${charKey}_timelines.json`;

    try {
        const response = await fetch(filePath);
        if (!response.ok) {
            console.warn(`[WARN] Timeline file not found for ${charKey} at ${filePath}. This may be normal if the file doesn't exist.`);
            characterTimelineCache.set(charKey, null);
            return null;
        }
        const data = await response.json();
        characterTimelineCache.set(charKey, data);
        return data;
    } catch (error) {
        console.error(`[ERROR] Failed to fetch or parse timeline for ${charKey}:`, error);
        characterTimelineCache.set(charKey, null);
        return null;
    }
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


async function performAdvancedSearch() {
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
        const includeBosses = getItemsFromList('include-bosses-list');
        const excludeBosses = getItemsFromList('exclude-bosses-list');
        const bossLogic = document.querySelector('input[name="boss-logic"]:checked').value;
        const useTimelineSearch = !!actFilter || !!levelFilter || (deckSizeOperator !== 'any' && !isNaN(deckSizeValue)) || includeKeywords.length > 0 || excludeKeywords.length > 0;


        const searchCriteria = {
            character: selectedChar !== 'All' ? selectedChar : null,
            act: actFilter ? actFilter : null,
            level: levelFilter ? levelFilter : null,
            deckSize: (deckSizeOperator !== 'any' && !isNaN(deckSizeValue)) ? { operator: deckSizeOperator, value: deckSizeValue } : null,
            playerName: playerNameFilter || null,
            includeItems: includeKeywords.length > 0 ? { items: includeKeywords, logic: includeLogic } : null,
            excludeItems: excludeKeywords.length > 0 ? excludeKeywords : null,
            includeBosses: includeBosses.length > 0 ? { bosses: includeBosses, logic: bossLogic } : null,
            excludeBosses: excludeBosses.length > 0 ? excludeBosses : null
        };


        // --- 2. Get base data from GLOBAL variables ---
        if (!ALL_RUN_DETAILS || !STATION_MAP_GLOBAL) {
            console.error('[FATAL] Global data (ALL_RUN_DETAILS or STATION_MAP_GLOBAL) not found! Aborting.');
            return;
        }

        // --- 3. Filter by character if specified ---
        let runsToSearch = (selectedChar === 'All')
            ? ALL_RUN_DETAILS
            : ALL_RUN_DETAILS.filter(run => run.character === selectedChar);

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

        // --- 5. Perform the actual filtering loop ---
        const filteredRuns = [];
        const charactersToLoad = new Set(runsToSearch.map(r => r.character));

        // Load all necessary character timelines in parallel
        console.log(`[DEBUG] Needing timeline data for characters:`, Array.from(charactersToLoad));
        const timelinePromises = Array.from(charactersToLoad).map(char => loadCharacterTimeline(char));
        await Promise.all(timelinePromises);
        console.log(`[DEBUG] All necessary timelines loaded and cached.`);

        for (const run of runsToSearch) {
            // プレイヤー名フィルタ (先にやって軽減) — 大小文字を区別しない部分一致
            if (playerNameFilter && !(run.player_name || '').toLowerCase().includes(playerNameFilter.toLowerCase())) continue;
            // Boss filter (can be done early)
            const runBossNames = run.bosses ? Object.values(run.bosses).map(b => (b.name ? b.name.toLowerCase() : '')) : [];
            const includeBossesLower = includeBosses.map(b => b.toLowerCase());
            const excludeBossesLower = excludeBosses.map(b => b.toLowerCase());
            if (includeBossesLower.length > 0) {
                const includeMatch = (bossLogic === 'AND') ? includeBossesLower.every(boss => runBossNames.includes(boss)) : includeBossesLower.some(boss => runBossNames.includes(boss));
                if (!includeMatch) continue;
            }
            if (excludeBossesLower.length > 0 && excludeBossesLower.some(boss => runBossNames.includes(boss))) continue;

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

                    const allItemIds = [...cards, ...Array.from(exhibits)];
                    if (applyIdFilters(allItemIds, includeIds, excludeIds, includeLogic)) {

                        runWithDisplayData.displayDeckSize = cards.length;
                        runWithDisplayData.matchingStationIndex = stationIndex; // 合致したインデックスを保存
                        matched = true;
                        break; // 一致が見つかったのでループを抜ける

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
// 検索条件を 1 行ラベルにまとめる ("ReimuA A2 L3 deck<=30 +[item, ...]")
function makeQueryLabel(sc) {
    if (!sc) return '';
    const parts = [];
    if (sc.playerName) parts.push('@' + sc.playerName);   // 先頭に置く (@name トークン・名前はスペース非推奨 = 旧履歴解析の制約)
    if (sc.character) parts.push(sc.character);
    if (sc.act) parts.push('Act' + sc.act);
    if (sc.level) parts.push('Lv' + sc.level);
    if (sc.deckSize) parts.push('deck' + (sc.deckSize.operator === 'lte' ? '<=' : '>=') + sc.deckSize.value);
    if (sc.includeItems && (sc.includeItems.items || []).length) parts.push('+' + (sc.includeItems.items || []).join(','));
    if (sc.excludeItems && sc.excludeItems.length) parts.push('-' + sc.excludeItems.join(','));
    if (sc.includeBosses && (sc.includeBosses.bosses || []).length) parts.push('+B:' + (sc.includeBosses.bosses || []).join(','));
    if (sc.excludeBosses && sc.excludeBosses.length) parts.push('-B:' + sc.excludeBosses.join(','));
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
    const sc = { character: null, act: null, level: null, deckSize: null, playerName: null, includeItems: null, excludeItems: null, includeBosses: null, excludeBosses: null };
    (String(q || '').split(' ') || []).forEach(p => {
        let m;
        if (p.startsWith('@') && p.length > 1) sc.playerName = p.slice(1);
        else if (p.startsWith('+B:')) sc.includeBosses = { bosses: p.slice(3).split(','), logic: 'AND' };
        else if (p.startsWith('-B:')) sc.excludeBosses = p.slice(3).split(',');
        else if (p.startsWith('+') && p.length > 1) sc.includeItems = { items: p.slice(1).split(','), logic: 'AND' };
        else if (p.startsWith('-') && p.length > 1) sc.excludeItems = p.slice(1).split(',');
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
    // アイテム/ボスの選択チップを復元
    ['include-items-list', 'exclude-items-list', 'include-bosses-list', 'exclude-bosses-list'].forEach(id => {
        const el = document.getElementById(id);
        if (el) el.innerHTML = '';
    });
    (sc.includeItems && sc.includeItems.items || []).forEach(it => addItemToSelection(it, 'include-items-list'));
    (sc.excludeItems || []).forEach(it => addItemToSelection(it, 'exclude-items-list'));
    (sc.includeBosses && sc.includeBosses.bosses || []).forEach(b => addItemToSelection(b, 'include-bosses-list'));
    (sc.excludeBosses || []).forEach(b => addItemToSelection(b, 'exclude-bosses-list'));
    const logic = sc.includeItems ? sc.includeItems.logic : 'AND';
    const andChk = document.getElementById('include-logic-and');
    if (andChk) andChk.checked = (logic === 'AND');
    const bossLogic = sc.includeBosses ? sc.includeBosses.logic : 'AND';
    const bossRadio = document.querySelector(`input[name="boss-logic"][value="${bossLogic}"]`);
    if (bossRadio) bossRadio.checked = true;
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
            <td class="col-h-q" title="${(h.q || '').replace(/"/g, '&quot;')}"><span class="rf-hist-num" style="color:${rfHistLineColor(i)}">${rfHistNumMark(i)}</span> ${h.q || '-'}</td>
            <td class="col-h-n">${h.n}</td>
            ${pickupCell(h)}
            ${tKeys.map(k => segCell(h, k)).join('')}
            <td><a href="javascript:void(0)" onclick="event.stopPropagation(); deleteSearchHistory(${h.t})" title="${texts.history_delete || 'Delete'}">🗑</a></td>
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
    const hasVals = (m) => m.some(valsRow => valsRow.some(v => v != null && isFinite(v)));
    const spreadLifeM = spreadVals(h => h.segIqr);
    const spreadTurnM = spreadVals(h => h.segTurnIqr);
    const mkEntries = [
        ['life',  lifeVals, true,  (h, k) => rfIqrTriplet(h.segIqr && h.segIqr[k], h.segMed && h.segMed[k]),  texts.hist_chart_life || 'Avg life loss per battle'],
        ['turn',  turnVals, false, (h, k) => rfIqrTriplet(h.segTurnIqr && h.segTurnIqr[k], h.segTurnMed && h.segTurnMed[k]), texts.hist_chart_turn || 'Avg turns per battle'],
        ['slife', spreadLifeM, false, null, texts.hist_chart_life_spread || 'Per-segment life spread'],
        ['sturn', spreadTurnM, false, null, texts.hist_chart_turn_spread || 'Per-segment turn spread'],
        ['clife', cumVals(lifeVals), true,  (h, k) => rfIqrTriplet(h.cumLifeIqr && h.cumLifeIqr[k], h.cumLifeMed && h.cumLifeMed[k]), texts.hist_chart_life_cum || 'Cumulative life loss'],
        ['cturn', cumVals(turnVals), false, (h, k) => rfIqrTriplet(h.cumTurnIqr && h.cumTurnIqr[k], h.cumTurnMed && h.cumTurnMed[k]), texts.hist_chart_turn_cum || 'Cumulative turns'],
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
            <th>${texts.history_q || 'Query'}</th><th>${texts.history_n || 'n'}</th>
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
    //displayRunFinderResults(sortedRuns, actFilter, levelFilter);
    displayRunFinderResults(sortedRuns, searchCriteria, actFilter, levelFilter);
}


function displayRunFinderResults(runs, searchCriteria = {}, actFilter = null, levelFilter = null) {
    const resultsContainer = document.getElementById('run-finder-results');
    const toggleContainer = document.getElementById('column-toggle-container');
    if (toggleContainer) {
        toggleContainer.style.display = (runs && runs.length > 0) ? 'block' : 'none';
    }
    const texts = UI_TEXT.run_finder;
    const nodeIcons = { 'EliteEnemy': '👿', 'Shop': '🛒', 'Gap': '🔥' };

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
        if (searchCriteria.includeBosses) criteriaList.push(crit(critLabel('bosses', 'Bosses'), `${searchCriteria.includeBosses.bosses.join(', ')} (${searchCriteria.includeBosses.logic})`));
        if (searchCriteria.excludeBosses) criteriaList.push(crit(critLabel('ex_bosses', 'Exclude Bosses'), searchCriteria.excludeBosses.join(', ')));

        if (criteriaList.length > 0) {
            criteriaHtml = `<div class="search-criteria-summary">${criteriaList.join('')}</div>`;
        }
    }

    const runRows = runs.map(run => {
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
                            const icon = nodeIcons[node.type] || null;
                            if (!icon) return null;
                            const nodeUrl = `${baseUrl}?a=${actNum}&l=${node.level}`;
                            const stationMapKey = `${actNum}-${node.level}`;
                            const stationIndex = STATION_MAP_GLOBAL[stationMapKey];
                            const dataAttributes = `data-character="${run.character}" data-run-id="${run.run_id}" data-station-index="${stationIndex}" data-act="${actNum}" data-level="${node.level}" data-node-type="${node.type}"`;
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

            return `<tr>
                <td class="col-run_id" title="${run.run_id}"><a href="${finalUrl}" target="_blank" class="run-id-link" data-character="${run.character}" data-run-id="${run.run_id}" data-station-index="${run.matchingStationIndex}">${run.run_id}</a></td>
                <td class="col-version">${run.version}</td>
                <td class="col-character">${run.character}</td>
                <td class="col-deck_size">${run.displayDeckSize ?? 'N/A'}</td>
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
    }).join('');


    const getSortIndicator = (key) => {
        if (currentSortKey === key) return currentSortOrder === 'asc' ? ' ▲' : ' ▼';
        return '';
    };

    // ★修正箇所: テーブル全体を <div class="table-wrapper"> で囲む
    resultsContainer.innerHTML = `
        <div class="results-header">
            <h4>${texts.search_results_title.replace('{count}', runs.length)}</h4>
            <button onclick="generateAndCopyShareLink()" class="copy-share-link">${texts.share_link_button}</button>
            <button onclick="rfJumpToHistory()" class="copy-share-link" title="${texts.hist_jump_title || ''}">${texts.hist_jump || 'Search history comparison'}</button>
        </div>
        ${criteriaHtml}
        <div class="table-wrapper">
            <table class="run-finder-results-table">
                <thead>
                    <tr>
                        <th rowspan="2" class="col-run_id"  onclick="handleSortClick('run_id')">${texts.header_run_id}${getSortIndicator('run_id')}</th>
                        <th rowspan="2" class="col-version" onclick="handleSortClick('version')">${texts.header_version}${getSortIndicator('version')}</th>
                        <th rowspan="2" class="col-character" onclick="handleSortClick('character')">${texts.header_character}${getSortIndicator('character')}</th>
                        <th rowspan="2" class="col-deck_size" onclick="handleSortClick('displayDeckSize')">${texts.header_deck_size}${getSortIndicator('displayDeckSize')}</th>
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

    // --- 検索結果末尾の棒グラフ (検索結果全体の 敵ごと遭遇回数・苦戦の濃淡) ---
    renderEncounterBars(runs, searchCriteria);

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
    const includeBosses = getItemsFromList('include-bosses-list');
    if (includeBosses.length > 0) params.set('includeBosses', includeBosses.join(','));
    const excludeBosses = getItemsFromList('exclude-bosses-list');
    if (excludeBosses.length > 0) params.set('excludeBosses', excludeBosses.join(','));
    const itemLogic = document.querySelector('input[name="include-logic"]:checked').value;
    if (itemLogic !== 'OR') params.set('itemLogic', itemLogic);
    const bossLogic = document.querySelector('input[name="boss-logic"]:checked').value;
    if (bossLogic !== 'OR') params.set('bossLogic', bossLogic);
    params.set('search', 'true');

    const baseUrl = window.location.origin + window.location.pathname;
    const longUrl = `${baseUrl}?${params.toString()}`;

    button.disabled = true;
    button.textContent = '短縮中...';

    try {
        const apiUrl = `https://api.shrtco.de/v2/shorten?url=${encodeURIComponent(longUrl)}`;
        const response = await fetch(apiUrl);
        if (!response.ok) {
            throw new Error(`API request failed with status ${response.status}`);
        }
        const data = await response.json();
        if (!data.ok) {
            throw new Error(`API returned an error: ${data.error}`);
        }
        const shortUrl = data.result.full_short_link;
        await navigator.clipboard.writeText(shortUrl);
        alert(UI_TEXT.run_finder.copy_link_success_short); // 新しい成功メッセージ

    } catch (err) {
        console.error('URLの短縮に失敗しました。元のURLをコピーします。', err);
        // フォールバック: 短縮に失敗したら元の長いURLをコピーする
        await navigator.clipboard.writeText(longUrl);
        alert(UI_TEXT.run_finder.copy_link_fail_fallback); // 新しい失敗メッセージ
    } finally {
        button.disabled = false;
        button.textContent = originalButtonText;
    }
}


/**
 * データがロードされるのを待ってから自動検索を実行する
 */
function attemptAutoSearch() {
    // performAdvancedSearchの先頭にあるのと同じデータ準備チェック
    if (!ALL_RUN_DETAILS || Object.keys(ALL_RUN_DETAILS).length === 0 || !ALL_DATA.lookup_tables) {
        console.log("自動検索: データがまだ準備できていません。200ms後に再試行します。");
        setTimeout(attemptAutoSearch, 200); // 待機して再試行
    } else {
        console.log("自動検索: データ準備完了。検索を実行します。");
        performAdvancedSearch();
    }
}

function populateUiFromUrlParams() {
    const params = new URLSearchParams(window.location.search);
    if (!params.has('search')) return false;

    console.log("URLパラメータを検出しました。UIに設定します...");
    if (params.has('char')) document.getElementById('character-select').value = params.get('char');
    if (params.has('act')) document.getElementById('act-filter').value = params.get('act');
    if (params.has('level')) document.getElementById('level-filter').value = params.get('level');
    if (params.has('deckOp')) document.getElementById('deck-size-operator').value = params.get('deckOp');
    if (params.has('deckVal')) document.getElementById('deck-size-value').value = params.get('deckVal');
    if (params.has('player')) document.getElementById('player-name-filter').value = params.get('player');
    if (params.has('includeItems')) params.get('includeItems').split(',').forEach(item => addItemToSelection(item, 'include-items-list'));
    if (params.has('excludeItems')) params.get('excludeItems').split(',').forEach(item => addItemToSelection(item, 'exclude-items-list'));
    if (params.has('includeBosses')) params.get('includeBosses').split(',').forEach(boss => addBossToSelection(boss, 'include-bosses-list'));
    if (params.has('excludeBosses')) params.get('excludeBosses').split(',').forEach(boss => addBossToSelection(boss, 'exclude-bosses-list'));
    if (params.has('itemLogic')) document.querySelector(`input[name="include-logic"][value="${params.get('itemLogic')}"]`).checked = true;
    if (params.has('bossLogic')) document.querySelector(`input[name="boss-logic"][value="${params.get('bossLogic')}"]`).checked = true;

    // UI設定が完了したら、自動検索を試みる
    attemptAutoSearch();

    return true;
}

// script.dev.js から呼び出される関数をグローバルスコープに登録
window.renderRunFinderTab = renderRunFinderTab;
window.populateUiFromUrlParams = populateUiFromUrlParams;
window.handleSortClick = handleSortClick; // ソート関数もグローバルに
window.generateAndCopyShareLink = generateAndCopyShareLink; // 共有リンク生成関数もグローバルに