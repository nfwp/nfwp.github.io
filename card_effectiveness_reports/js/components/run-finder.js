// run-finder.js (最終・完全・確定版)

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
    const texts = {
        title: UI_TEXT.run_finder_title || "Run Finder",
        experimental_warning: UI_TEXT.run_finder_experimental_warning || "<strong>[Experimental Feature]</strong> This search function is under development.",
        data_scope_warning: UI_TEXT.run_finder_data_scope_warning || "※This search can only be performed within the data range used for creating statistics.",
        act_label: UI_TEXT.run_finder_act_label || "Act:",
        level_label: UI_TEXT.run_finder_level_label || "Level:",
        char_label: UI_TEXT.run_finder_char_label || "Character:",
        no_specify: UI_TEXT.run_finder_no_specify || "None",
        include_items_label: UI_TEXT.run_finder_include_items_label || "Items to Include",
        item_placeholder: UI_TEXT.run_finder_item_placeholder || "Enter card/exhibit name...",
        add_btn: UI_TEXT.run_finder_add_btn || "Add",
        logic_and: UI_TEXT.run_finder_logic_and || "AND (All)",
        logic_or: UI_TEXT.run_finder_logic_or || "OR (Any)",
        exclude_items_label: UI_TEXT.run_finder_exclude_items_label || "Items to Exclude",
        search_btn: UI_TEXT.run_finder_search_btn || "Search Runs",
        initial_prompt: UI_TEXT.run_finder_initial_prompt || "Enter search criteria and press the 'Search Runs' button.",
        deck_size_label: UI_TEXT.run_finder_deck_size_label || "Deck Size (at station / final):",
        deck_size_any: UI_TEXT.run_finder_deck_size_any || "Any",
        deck_size_lte: UI_TEXT.run_finder_deck_size_lte || "<=",
        deck_size_gte: UI_TEXT.run_finder_deck_size_gte || ">=",
        deck_size_placeholder: UI_TEXT.run_finder_deck_size_placeholder || "e.g., 10",
        include_bosses_label: UI_TEXT.run_finder_include_bosses_label || "Include Bosses",
        exclude_bosses_label: UI_TEXT.run_finder_exclude_bosses_label || "Exclude Bosses",
        boss_filter_toggle_expand: UI_TEXT.run_finder_boss_filter_expand || "Open Boss Filter ▼",
        boss_filter_toggle_collapse: UI_TEXT.run_finder_boss_filter_collapse || "Close Boss Filter ▲"
    };

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
            <p style="font-style: italic; color: #e67e22; border: 1px solid #f39c12; padding: 8px; border-radius: 4px; background-color: #fef9e7; margin-top: 0;">
                ${texts.experimental_warning}
            </p>
            <p style="font-size: 0.9em; color: #555;">
                ${texts.data_scope_warning}
            </p>
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
                                <input type="radio" id="include-logic-and" name="include-logic" value="AND">
                                <label for="include-logic-and">${texts.logic_and}</label>
                                <input type="radio" id="include-logic-or" name="include-logic" value="OR" checked>
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
                                <label><input type="radio" name="boss-logic" value="OR" checked> ${texts.logic_or}</label>
                                <label><input type="radio" name="boss-logic" value="AND"> ${texts.logic_and}</label>
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
            </div>
            <div id="run-finder-results" style="margin-top: 20px;">
                <p>${texts.initial_prompt}</p>
            </div>
        </div>
        <datalist id="all-items-datalist">${datalistOptions}</datalist>
    `;

    tabContent.innerHTML = finderHtml;

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

                const matchInTimeline = stationIndicesToSearch.some(stationIndex => {
                    const { cards, exhibits } = reconstructDeckAtStation(runTimeline, stationIndex);
                    if (deckSizeOperator !== 'any' && !isNaN(deckSizeValue)) {
                        const deckSize = cards.length;
                        if ((deckSizeOperator === 'lte' && deckSize > deckSizeValue) || (deckSizeOperator === 'gte' && deckSize < deckSizeValue)) return false;
                    }
                    const allItemIds = [...cards, ...Array.from(exhibits)];
                    if (applyIdFilters(allItemIds, includeIds, excludeIds, includeLogic)) {
                        runWithDisplayData.displayDeckSize = cards.length;
                        return true;
                    }
                    return false;
                });
                if (matchInTimeline) filteredRuns.push(runWithDisplayData);

            } else { // Final deck search (only boss filters were applied)
                runWithDisplayData.displayDeckSize = run.cards ? run.cards.length : 0;
                filteredRuns.push(runWithDisplayData);
            }
        }

        // --- 6. Display results ---
        console.log(`[DEBUG] --- Search Finished. Found ${filteredRuns.length} runs. ---`);
        lastFoundRuns = filteredRuns;
        currentSortKey = 'run_id';
        currentSortOrder = 'asc';
        sortAndDisplayRuns();

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

function sortAndDisplayRuns() {
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
    displayRunFinderResults(sortedRuns, actFilter, levelFilter);
}

function displayRunFinderResults(runs, actFilter = null, levelFilter = null) {
    const resultsContainer = document.getElementById('run-finder-results');
    const texts = {
        title: UI_TEXT.search_results_title || "Found {count} runs",
        no_results: UI_TEXT.search_no_results || "No runs were found matching the criteria.",
        run_id: UI_TEXT.run_finder_header_run_id || "Run ID",
        version: UI_TEXT.run_finder_header_version || "Ver",
        character: UI_TEXT.run_finder_header_character || "Char",
        deck_size: UI_TEXT.run_finder_header_deck_size || "Size",
        player_name: UI_TEXT.run_finder_header_player_name || "Player",
        act1_header: UI_TEXT.run_finder_header_act1 || "Act1",
        act2_header: UI_TEXT.run_finder_header_act2 || "Act2",
        act3_header: UI_TEXT.run_finder_header_act3 || "Act3"
    };
    const nodeIcons = { 'EliteEnemy': '👿', 'Shop': '🛒', 'Gap': '🔥' };
    if (!runs || runs.length === 0) {
        resultsContainer.innerHTML = `<p>${texts.no_results}</p>`;
        return;
    }
    const runRows = runs.map(run => {
        try {
            const baseUrl = `https://lbol-logs.github.io/${run.version}/${run.run_id}`;
            const params = [];
            if (actFilter) params.push(`a=${actFilter}`);
            if (levelFilter) params.push(`l=${levelFilter}`);
            const queryParams = params.length > 0 ? '?' + params.join('&') : '';
            const finalUrl = baseUrl + queryParams;
            const pathStrings = { act1: '', act2: '', act3: '' };
            if (run.path_summary) {
                for (let actNum = 1; actNum <= 3; actNum++) {
                    const stageHtmlParts = [];
                    for (const stage of ['Early', 'Mid', 'Late']) {
                        const key = `Act${actNum} ${stage}`;
                        const nodesInStage = run.path_summary[key] || [];
                        const currentStageString = nodesInStage.map(node => {
                            const icon = nodeIcons[node.type] || null;
                            if (!icon) return null;
                            const nodeUrl = `${baseUrl}?a=${actNum}&l=${node.level}`;
                            return `<a href="${nodeUrl}" target="_blank" class="path-icon-link" title="Act ${actNum}, Level ${node.level}: ${node.type}">${icon}</a>`;
                        }).filter(Boolean).join('');
                        stageHtmlParts.push(`<span class="stage-summary-part">${currentStageString || '&nbsp;'}</span>`);
                    }
                    pathStrings[`act${actNum}`] = stageHtmlParts.join('<span class="stage-separator">→</span>');
                    const actBossData = run.bosses ? run.bosses[String(actNum)] : null;
                    if (actBossData && bossIconMap[actBossData.name]) {
                        const bossIconUrl = bossIconMap[actBossData.name] || "./img/boss/Unknown.avif";
                        const bossUrl = `${baseUrl}?a=${actNum}&l=${actBossData.level}`;
                        const bossIconHtml = `<span class="stage-separator">→</span><a href="${bossUrl}" target="_blank" class="path-icon-link boss-icon-container" title="${actBossData.name} (Lvl ${actBossData.level})"><img src="${bossIconUrl}" alt="${actBossData.name}"></a>`;
                        pathStrings[`act${actNum}`] += bossIconHtml;
                    }
                }
            }
            return `<tr><td><a href="${finalUrl}" target="_blank" title="${run.run_id}">${run.run_id}</a></td><td>${run.version}</td><td>${run.character}</td><td>${run.displayDeckSize ?? 'N/A'}</td><td>${run.player_name}</td><td class="path-summary-cell-container"><div class="path-summary-grid">${pathStrings.act1}</div></td><td class="path-summary-cell-container"><div class="path-summary-grid">${pathStrings.act2}</div></td><td class="path-summary-cell-container"><div class="path-summary-grid">${pathStrings.act3}</div></td></tr>`;
        } catch (error) {
            console.error(`[ERROR] Failed to process run HTML for run_id: ${run ? run.run_id : 'unknown'}.`, error, run);
            return '';
        }
    }).join('');
    const getSortIndicator = (key) => {
        if (currentSortKey === key) return currentSortOrder === 'asc' ? ' ▲' : ' ▼';
        return '';
    };
    resultsContainer.innerHTML = `<div class="results-header"><h4>${texts.title.replace('{count}', runs.length)}</h4><button onclick="generateAndCopyShareLink()" class="copy-share-link">🔗 Copy Link</button></div><table class="run-finder-results-table"><thead><tr><th onclick="handleSortClick('run_id')">${texts.run_id}${getSortIndicator('run_id')}</th><th onclick="handleSortClick('version')">${texts.version}${getSortIndicator('version')}</th><th onclick="handleSortClick('character')">${texts.character}${getSortIndicator('character')}</th><th onclick="handleSortClick('displayDeckSize')">${texts.deck_size}${getSortIndicator('displayDeckSize')}</th><th onclick="handleSortClick('player_name')">${texts.player_name}${getSortIndicator('player_name')}</th><th>${texts.act1_header}</th><th>${texts.act2_header}</th><th>${texts.act3_header}</th></tr></thead><tbody>${runRows}</tbody></table>`;
}

function generateAndCopyShareLink() {
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
    const finalUrl = `${baseUrl}?${params.toString()}`;
    navigator.clipboard.writeText(finalUrl).then(() => {
        alert('検索条件のリンクをクリップボードにコピーしました！');
    }).catch(err => {
        console.error('リンクのコピーに失敗しました: ', err);
        alert('リンクのコピーに失敗しました。');
    });
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