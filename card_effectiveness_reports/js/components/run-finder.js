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
            <p class="analysis-note">${texts.data_scope_warning}</p>
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

        tooltipElement.innerHTML = `
            <div class="deck-tooltip-title">Deck (${cards.length} cards)${locationInfo}</div>
            <ul class="deck-tooltip-list">${deckHtml || '<li>(No cards)</li>'}</ul>
        `;

        // 先に表示して寸法を確定させる
        tooltipElement.style.display = 'block';
        // 新しい位置調整関数を呼び出す
        updateTooltipPosition(event);
    });

    resultsContainerForTooltip.addEventListener('mouseout', (event) => {
        const link = event.target.closest('a.path-icon-link, a.run-id-link');
        if (!link) return;
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

    // ★修正箇所: モバイルビューのデバッグ表示を追加
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

// --- NEW: Aggregated Timeline Cache and Fetcher ---
const characterTimelineCache = new Map();

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
        // --- 1. Get all filter values from UI ---
        const selectedChar = document.getElementById('character-select').value;
        const actFilter = document.getElementById('act-filter').value;
        const levelFilter = document.getElementById('level-filter').value;
        const includeLogic = document.getElementById('include-logic-and').checked ? 'AND' : 'OR';
        const deckSizeOperator = document.getElementById('deck-size-operator').value;
        const deckSizeValueStr = document.getElementById('deck-size-value').value;
        const deckSizeValue = deckSizeValueStr ? parseInt(deckSizeValueStr, 10) : NaN;
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

        sortAndDisplayRuns(searchCriteria);


    } catch (error) {
        console.error("[FATAL] A critical error occurred during search:", error);
    } finally {
        searchButton.disabled = false;
        searchButton.textContent = originalButtonText;
    }
}

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
                <td class="col-run_id"><a href="${finalUrl}" target="_blank" class="run-id-link" data-character="${run.character}" data-run-id="${run.run_id}" data-station-index="${run.matchingStationIndex}">${run.run_id}</a></td>
                <td class="col-version">${run.version}</td>
                <td class="col-character">${run.character}</td>
                <td class="col-deck_size">${run.displayDeckSize ?? 'N/A'}</td>
                <td class="col-player_name">${run.player_name}</td>
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
    `;

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