// script.js (完全修正版)

// --- グローバル定数 ---
const X_RANGE = [30, 70];
const Y_RANGE = [30, 70];
const TYPE_COLOR_MAP = {
    'Attack': '#E57373', 'Defense': '#FFD54F', 'Skill': '#64B5F6',
    'Ability': '#81C784', 'Friend': '#BA68C8', 'Tool': '#FFB0CA',
    'Unknown': '#BDBDBD', 'Misfortune': '#757575'
};

// --- グローバル変数 ---
let ALL_DATA = {};
let ADVENTURE_EVENTS_DATA = {}; // ★追加: イベント分析データを保持
let UI_TEXT = {};
let LANG = 'ja';
let CURRENT_CHAR = 'CirnoA';
let allRunsData = [];
let allCards = new Set();
let allExhibits = new Set();


// --- Run Finder の状態管理 ---
let lastFoundRuns = [];
let currentSortKey = 'run_id';
let currentSortOrder = 'desc';

let attentionSlider = null;
let AGG_MAP = new Map();
let ALL_RUN_DETAILS = [];
let ALL_DECK_TIMELINES = {};
let ITEM_MASTER_LOOKUP = {};
let STATION_MAP_GLOBAL = {}; // ★追加: グローバルスコープに移動

let GRAPH_DIV = null;
const ROUTE_NODE_HOVER_DELAY = 400;
let routeNodeHoverTimer = null;


window.addEventListener('DOMContentLoaded', async () => {
    const params = new URLSearchParams(window.location.search);
    const requestedChar = params.get('char') || 'CirnoA';
    LANG = (params.get('lang') || 'ja').toLowerCase();
    const charToLoad = (requestedChar === 'All') ? 'CirnoA' : requestedChar;

    try {
        // データを並行して読み込む
        const [
            itemMasterResponse,
            runsResponse,
            timelineResponse,
            charDataResponse,
            adventureEventsResponse // ★追加
        ] = await Promise.all([
            fetch('./data/item_master.json'),
            fetch('./data/run_details.json'),
            fetch('./data/run_decks_by_station.json'),
            fetch(`data/${charToLoad}_data.json`),
            fetch('data/adventure_events_data.json') // ★追加
        ]);

        // --- 各データの処理 ---
        if (itemMasterResponse.ok) {
            ITEM_MASTER_LOOKUP = await itemMasterResponse.json();
            console.log(`Loaded item_master.json with ${Object.keys(ITEM_MASTER_LOOKUP).length} items.`);
        } else {
            console.error('item_master.json のロードに失敗しました。検索機能は無効になります。');
        }

        if (runsResponse.ok) {
            const runDetailsData = await runsResponse.json();
            ALL_RUN_DETAILS = runDetailsData.runs;
            console.log(`Loaded run_details.json generated at: ${runDetailsData.metadata?.generated_at || 'N/A'}`);
        } else {
            console.error('run_details.json のロードに失敗しました。検索機能は無効になります。');
        }

        if (timelineResponse.ok) {
            const timelineData = await timelineResponse.json();
            ALL_DECK_TIMELINES = timelineData.timelines;
            STATION_MAP_GLOBAL = timelineData.station_map;
            console.log(`Loaded run_decks_by_station.json generated at: ${timelineData.metadata?.generated_at || 'N/A'}`);
        } else {
            console.error('run_decks_by_station.json のロードに失敗しました。');
        }

        if (!charDataResponse.ok) {
            if (requestedChar === 'All') {
                 throw new Error(`Failed to load default data for '${charToLoad}' to handle 'All' characters view.`);
            }
            throw new Error(`Failed to load data for ${charToLoad}`);
        }
        ALL_DATA = await charDataResponse.json();

        // ★追加: イベント分析データの処理
        if (adventureEventsResponse.ok) {
            ADVENTURE_EVENTS_DATA = await adventureEventsResponse.json();
            console.log("Loaded adventure_events_data.json successfully.");
        } else {
            console.error("Failed to load adventure_events_data.json. Event Analysis tab may not work.");
        }

        CURRENT_CHAR = requestedChar;

        if (ALL_DATA.agg_data_full) {
            const cardNameCol = (LANG === 'ja') ? 'Card_Name' : 'Card_Name_EN';
            ALL_DATA.agg_data_full.forEach(d => {
                AGG_MAP.set(d[cardNameCol], d);
            });
        }

    } catch (error) {
        console.error(error);
        document.getElementById('loading-overlay').textContent = `エラー: ${error.message}`;
        return;
    }

    await setupUiText(LANG);
    renderGlobalHeader();
    setupNavigation();

    if (params.has('search')) {
        switchTab('run-finder-tab', true);
    } else {
        switchTab('card-performance-tab');
    }

    document.getElementById('loading-overlay').style.display = 'none';
    document.getElementById('dashboard-container').style.visibility = 'visible';
});


// =================================================================
// UIコンポーネント描画
// =================================================================

function renderGlobalHeader() {
    const container = document.getElementById('global-header');
    if (!container) return;
    const allChars = ALL_DATA.all_available_characters || [];

    const options = allChars.map(char =>
        `<option value="${char}" ${char === CURRENT_CHAR ? 'selected' : ''}>${char}</option>`
    ).join('');

    const switcherHtml = `
        <div class="character-switcher">
            <label for="char-select-global">${UI_TEXT.char_select_label || 'Character:'}</label>
            <select id="char-select-global">${options}</select>
        </div>
    `;

    container.innerHTML = switcherHtml;
    container.querySelector('select').addEventListener('change', (e) => {
        const newChar = e.target.value;
        const currentParams = new URLSearchParams(window.location.search);
        currentParams.set('char', newChar);
        window.location.search = currentParams.toString();
    });

    const mobileContainer = document.getElementById('global-header-mobile');
    if (mobileContainer) {
        mobileContainer.innerHTML = switcherHtml;
        const mobileSelect = mobileContainer.querySelector('select');
        if (mobileSelect) {
            mobileSelect.id = 'char-select-mobile';
            mobileContainer.querySelector('label').setAttribute('for', 'char-select-mobile');
            mobileSelect.addEventListener('change', (e) => {
                const newChar = e.target.value;
                const currentParams = new URLSearchParams(window.location.search);
                currentParams.set('char', newChar);
                window.location.search = currentParams.toString();
            });
        }
    }
}

async function setupUiText(lang) {
    try {
        const response = await fetch(`locales/${lang}.json`);
        if (!response.ok) throw new Error(`Failed to load locale file for ${lang}`);
        let textData = await response.json();

        const mainTitleEl = document.getElementById('main-title');
        if (mainTitleEl) {
            mainTitleEl.textContent = `${ALL_DATA.metadata.character} - ${textData.main_title} (Ver: ${ALL_DATA.metadata.version})`;
        }

        textData.agg_title = textData.agg_title
            .replace('{character}', ALL_DATA.metadata.character)
            .replace('{version}', ALL_DATA.metadata.version);
        textData.sit_title = textData.sit_title
            .replace('{character}', ALL_DATA.metadata.character)
            .replace('{version}', ALL_DATA.metadata.version);

        UI_TEXT = textData;
    } catch (error) {
        console.error(error);
        UI_TEXT = { error: `Failed to load UI texts: ${error.message}` };
    }
}

/**
 * 指定されたIDのタブに切り替える（遅延レンダリング対応版）
 * @param {string} tabId - 表示するタブのID
 * @param {boolean} [autoSearch=false] - ラン検索タブの場合に自動検索を実行するか
 */
function switchTab(tabId, autoSearch = false) {
    const tabButtonsContainer = document.getElementById('tab-buttons');
    const mobileTabSelector = document.getElementById('mobile-tab-selector');
    const tabContents = document.querySelectorAll('.tab-content');

    tabContents.forEach(content => {
        content.style.display = 'none';
    });
    if (tabButtonsContainer) {
        tabButtonsContainer.querySelectorAll('.tab-button').forEach(button => {
            button.classList.remove('active');
        });
    }

    const contentToShow = document.getElementById(tabId);
    if (contentToShow) {
        contentToShow.style.display = 'block';

        if (contentToShow.innerHTML.trim() === '') {
            console.log(`Rendering content for tab: ${tabId}`);
            switch (tabId) {
                case 'card-performance-tab':
                    renderCardPerformanceTab(CURRENT_CHAR, LANG);
                    break;
                case 'exhibit-analysis-tab':
                    renderExhibitAnalysisTab(LANG);
                    break;
                case 'route-event-tab':
                    renderRouteEventTab(LANG);
                    break;
                case 'enemy-analysis-tab':
                    renderEnemyAnalysisTab(CURRENT_CHAR, LANG);
                    break;
                // ★追加: イベント分析タブの描画呼び出し
                case 'event-analysis-tab':
                    renderEventAnalysisTab();
                    break;
                case 'act-trend-tab':
                    renderActTrendTab(LANG);
                    break;
                case 'card-list-tab':
                    renderCardListTab(ALL_DATA);
                    break;
                case 'run-finder-tab':
                    renderRunFinderTab();
                    break;
            }
        }

        if (tabId === 'run-finder-tab') {
            const uiPopulated = populateUiFromUrlParams();
            if (autoSearch && uiPopulated) {
                console.log("自動検索を実行します...");
                performAdvancedSearch();
            }
        }

        const graphInTab = contentToShow.querySelector('.plotly-graph-div');
        if (graphInTab) {
            try {
                Plotly.Plots.resize(graphInTab);
            } catch (e) {
                // console.warn("Plotly resize failed, maybe graph not ready.", e);
            }
        }
    }

    if (tabButtonsContainer) {
        const buttonToActivate = tabButtonsContainer.querySelector(`[data-tab-id="${tabId}"]`);
        if (buttonToActivate) {
            buttonToActivate.classList.add('active');
        }
    }

    if (mobileTabSelector) {
        mobileTabSelector.value = tabId;
    }
}

function setupNavigation() {
    const tabsConfig = [
        { id: 'card-performance-tab', label: `📊 ${UI_TEXT.card_perf_tab_title}` },
        { id: 'exhibit-analysis-tab', label: `🏺 ${UI_TEXT.exhibit_tab_title}` },
        { id: 'route-event-tab', label: `🗺️ ${UI_TEXT.route_tab_title}` },
        { id: 'enemy-analysis-tab', label: `⚔️ ${UI_TEXT.enemy_analysis_title}` },
        { id: 'event-analysis-tab', label: `❓ ${(UI_TEXT.event_analysis_tab_title || (LANG === 'ja' ? 'イベント分析' : 'Event Analysis'))}` },
        { id: 'act-trend-tab', label: `📈 ${(LANG === 'ja' ? 'Act別トレンド' : 'Act Trends')}` },
        { id: 'card-list-tab', label: `🎴 ${(UI_TEXT.card_list_tab_title || 'カード一覧')}` },
        { id: 'run-finder-tab', label: `🔍 ${(UI_TEXT.run_finder_tab_title || 'ラン検索')}` }
    ];

    const tabButtonsContainer = document.getElementById('tab-buttons');
    const mobileTabSelector = document.getElementById('mobile-tab-selector');

    if (tabButtonsContainer) tabButtonsContainer.innerHTML = '';
    if (mobileTabSelector) mobileTabSelector.innerHTML = '';

    tabsConfig.forEach(tabConfig => {
        if (!tabConfig.label || (tabConfig.id === 'run-finder-tab' && ALL_RUN_DETAILS.length === 0)) {
            return;
        }

        if (tabButtonsContainer) {
            const button = document.createElement('button');
            button.className = 'tab-button';
            button.textContent = tabConfig.label;
            button.dataset.tabId = tabConfig.id;
            button.addEventListener('click', () => switchTab(tabConfig.id));
            tabButtonsContainer.appendChild(button);
        }

        if (mobileTabSelector) {
            const option = document.createElement('option');
            option.value = tabConfig.id;
            option.textContent = tabConfig.label;
            mobileTabSelector.appendChild(option);
        }
    });

    if (mobileTabSelector) {
        mobileTabSelector.addEventListener('change', (e) => {
            switchTab(e.target.value);
        });
    }
}


function renderEventAnalysisTab() {
    const container = document.getElementById('event-analysis-tab');
    if (!container) return;

    // 1. データの取得とチェック
    const charData = ADVENTURE_EVENTS_DATA[CURRENT_CHAR];
    const title = UI_TEXT.event_analysis_tab_title || (LANG === 'ja' ? 'イベント分析' : 'Event Analysis');
    const description = UI_TEXT.event_analysis_desc || (LANG === 'ja' ? '「？」マスで発生するイベントの集計データです。イベントはゲームの進行順（序盤→終盤）に並んでいます。' : 'Aggregated data for events occurring on "?" nodes. Events are sorted chronologically (early game → late game).');

    if (!charData || charData.length === 0) {
        container.innerHTML = `<div class='analysis-section'><h3>${title}</h3><p>${UI_TEXT.no_data || 'データなし'}</p></div>`;
        return;
    }

    // 2. ヘルパー関数定義
    const getItemName = (itemId, itemType) => {
        const nameKey = LANG === 'ja' ? 'JA' : 'EN';
        const lookup = (itemType === 'card') ? ALL_DATA.lookup_tables.cards : ALL_DATA.lookup_tables.exhibits;
        return lookup[itemId]?.[nameKey] || itemId;
    };
    const formatResourceChange = (res) => {
        let parts = [];
        const createHtml = (iconName, value, altText) => {
            // 正の値には `+` を付ける
            const sign = value > 0 ? '+' : '';
            return `
                <span class="resource-change-item">
                    <img src="./img/station/${iconName}.avif" srcset="./img/station/${iconName}@2x.avif 2x" class="resource-icon" alt="${altText}">
                    <span class="resource-value">${sign}${value.toFixed(1)}</span>
                </span>
            `;
        };

        if (Math.abs(res.hp) > 0.05) parts.push(createHtml('Hp1', res.hp, 'HP'));
        if (Math.abs(res.power) > 0.05) parts.push(createHtml('Power', res.power, 'Power'));
        if (Math.abs(res.money) > 0.05) parts.push(createHtml('Money', res.money, 'Money'));

        // joinの区切り文字をなくす
        return parts.length > 0 ? parts.join('') : (UI_TEXT.no_change_label || 'なし');
    };
    const formatItemList = (items, itemType) => {
        if (!items || items.length === 0) return (UI_TEXT.no_change_label || 'なし');
        return items.map(item => {
            const name = getItemName(item.id, itemType);
            const countLabel = LANG === 'ja' ? '回' : (item.count === 1 ? ' time' : ' times');
            // バッククォートを削除し、代わりにspanタグで囲む
            return `<span class="item-name-highlight">${name}</span> (${item.count}${countLabel})`;
        }).join(', ');
    };

    // 3. HTMLの組み立て (★ここを修正★)
    const eventsHtml = charData.map(event => {
        const eventName = LANG === 'ja' ? event.eventNameJA : event.eventNameEN;
        const encounterCountLabel = LANG === 'ja' ? '回' : (event.encounterCount === 1 ? ' time' : ' times');
        const vsAllRunsLabel = LANG === 'ja' ? '対 全ラン' : 'vs. All Runs';

        // ▼▼▼ 画像パスを生成 ▼▼▼
        const imgSrc = `./img/events/${event.eventId}.avif`;
        const imgSrcset = `./img/events/${event.eventId}@2x.avif 2x`;
        // ▲▲▲ ここまで ▲▲▲

        const choicesHtml = event.choices.map(choice => {
            const choiceIndexLabel = choice.choiceIndex === 'N/A'
                ? (UI_TEXT.no_choice_label || '選択肢なし')
                : `${UI_TEXT.choice_label_prefix || '選択肢'}${choice.choiceIndex}`;
            const choiceCountLabel = LANG === 'ja' ? '回' : (choice.count === 1 ? ' time' : ' times');

            return `
                <div class="event-choice-details">
                    <h4>${choiceIndexLabel} (${choice.count}${choiceCountLabel}, ${choice.rate.toFixed(1)}%)</h4>
                    <ul>
                        <li><strong>${UI_TEXT.avg_resource_label || '平均リソース変化'}:</strong> ${formatResourceChange(choice.avgResourceChange)}</li>
                        <li><strong>${UI_TEXT.card_add_label || 'カード追加'} Top5:</strong> ${formatItemList(choice.cardsAdded, 'card')}</li>
                        <li><strong>${UI_TEXT.card_rem_label || 'カード削除'} Top5:</strong> ${formatItemList(choice.cardsRemoved, 'card')}</li>
                        <li><strong>${UI_TEXT.card_upg_label || 'カード強化'} Top5:</strong> ${formatItemList(choice.cardsUpgraded, 'card')}</li>
                        <li><strong>${UI_TEXT.exh_add_label || '展示品追加'} Top5:</strong> ${formatItemList(choice.exhibitsAdded, 'exhibit')}</li>
                        <li><strong>${UI_TEXT.exh_rem_label || '展示品削除'} Top5:</strong> ${formatItemList(choice.exhibitsRemoved, 'exhibit')}</li>
                    </ul>
                </div>
            `;
        }).join('');

        return `
            <div class="accordion-item">
                <button class="accordion-header">
                    <!-- ▼▼▼ imgタグを追加 ▼▼▼ -->
                    <img src="${imgSrc}" srcset="${imgSrcset}" class="event-icon" alt="" onerror="this.style.display='none'">
                    <span class="accordion-title">${eventName}</span>
                    <span class="accordion-stats">${event.encounterCount}${encounterCountLabel} (${vsAllRunsLabel} ${event.encounterRate.toFixed(1)}%)</span>
                    <span class="accordion-icon">▼</span>
                </button>
                <div class="accordion-content">
                    ${choicesHtml}
                </div>
            </div>
        `;
    }).join('');

    container.innerHTML = `
        <div class='analysis-section'>
            <h3>${title}</h3>
            <p>${description}</p>
            <div class="accordion-container">${eventsHtml}</div>
        </div>
    `;

    // 4. イベントリスナーの設定
    container.querySelectorAll('.accordion-header').forEach(header => {
        header.addEventListener('click', () => {
            const item = header.parentElement;
            item.classList.toggle('active');
        });
    });
}



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

    const charOptionsHtml = allCharacters.map(char =>
        `<option value="${char}" ${char === currentCharacter ? 'selected' : ''}>${char}</option>`
    ).join('');

    container.innerHTML = `
        <div class="card-list-controls" style="background-color: #fff; padding: 15px; border-radius: 8px; margin-bottom: 20px; border: 1px solid #ddd; display: flex; align-items: center; flex-wrap: wrap;">
            <label for="card-list-char-select" style="margin-right: 10px; font-weight: bold;">${UI_TEXT.character_label || 'キャラクター:'}</label>
            <select id="card-list-char-select" onchange="showCardList()" style="margin-right: 20px; font-size: 14px; padding: 5px;">
                ${charOptionsHtml}
            </select>
            <label style="margin-left: 20px; font-weight: bold;">${UI_TEXT.language_label || '言語:'}</label>
            <input type="radio" id="lang-ja" name="card-list-lang" value="ja" ${LANG === 'ja' ? 'checked' : ''} onchange="showCardList()" style="margin-left: 10px;">
            <label for="lang-ja">${UI_TEXT.japanese_label || '日本語'}</label>
            <input type="radio" id="lang-en" name="card-list-lang" value="en" ${LANG === 'en' ? 'checked' : ''} onchange="showCardList()" style="margin-left: 10px;">
            <label for="lang-en">${UI_TEXT.english_label || 'English'}</label>
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

function renderCardPerformanceTab(char, lang) {
    const container = document.getElementById('card-performance-tab');
    if (!container) return;
    const filterBarHtml = createFilterBarHtml();
    const graphDiv = '<div id="plotly-graph" class="plotly-graph-div" style="width:100%; height:800px;"></div>';
    const analysisReportsHtml = createAnalysisReportsHtml(lang);

    container.innerHTML = filterBarHtml + graphDiv + analysisReportsHtml;

    GRAPH_DIV = document.getElementById('plotly-graph');
    drawPlotlyGraph(char, lang);
    setupGraphFilters(lang);
}

function createFilterBarHtml() {
    return `
    <div id="custom-filters">
        <div id="filter-toggle-button" class="filter-toggle-button">${UI_TEXT.open_filters || 'フィルターを開く ▼'}</div>
        <div id="filter-content" class="filter-content collapsed">

            <div class="filter-row">
                <div class="filter-group" id="filter-group-rarity">
                    <label>${UI_TEXT.rarity}:</label>
                    <select id="rarity-filter">
                        <option value="All">${UI_TEXT.filter_all}</option>
                        <option value="Common">Common</option>
                        <option value="Uncommon">Uncommon</option>
                        <option value="Rare">Rare</option>
                    </select>
                </div>

                <div class="filter-group" id="filter-group-medal">
                    <label>${UI_TEXT.medal_filter_label}</label>
                    <select id="medal-filter">
                        <option value="All">${UI_TEXT.medal_filter_all}</option>
                        <option value="Gold">${UI_TEXT.medal_filter_gold}</option>
                        <option value="SilverOrBetter">${UI_TEXT.medal_filter_silver}</option>
                        <option value="BronzeOrBetter">${UI_TEXT.medal_filter_bronze}</option>
                        <option value="None">${UI_TEXT.medal_filter_none}</option>
                    </select>
                </div>
            </div>

            <div class="slider-filter-group" id="filter-group-attention">
                <label>${UI_TEXT.attention_score_label || '注目度スコア'}:</label>
                <div class="slider-container-single" style="width: 250px;">
                    <div id="attention-score-slider" class="slider"></div>
                    <span id="attention-score-value"></span>
                </div>
            </div>

            <div class="slider-filter-group" id="filter-group-atk">
                <label>${UI_TEXT.atk_tendency_filter_label}</label>
                <div class="slider-container">
                    <input type="checkbox" id="atk-tendency-all" checked>
                    <label for="atk-tendency-all" class="checkbox-label">${UI_TEXT.filter_all}</label>
                    <input type="number" id="atk-tendency-min" class="slider-input" step="0.05">
                    <div id="attack-tendency-slider" class="slider"></div>
                    <input type="number" id="atk-tendency-max" class="slider-input" step="0.05">
                </div>
            </div>
            <div class="filter-group" id="filter-group-logic">
                <input type="radio" id="tendency-logic-and" name="tendency-logic" value="and" checked>
                <label for="tendency-logic-and" class="checkbox-label">${UI_TEXT.tendency_condition_and}</label>
                <input type="radio" id="tendency-logic-or" name="tendency-logic" value="or">
                <label for="tendency-logic-or" class="checkbox-label">${UI_TEXT.tendency_condition_or}</label>
            </div>
            <div class="slider-filter-group" id="filter-group-def">
                <label>${UI_TEXT.def_tendency_filter_label}</label>
                <div class="slider-container">
                    <input type="checkbox" id="def-tendency-all" checked>
                    <label for="def-tendency-all" class="checkbox-label">${UI_TEXT.filter_all}</label>
                    <input type="number" id="def-tendency-min" class="slider-input" step="0.05">
                    <div id="defense-tendency-slider" class="slider"></div>
                    <input type="number" id="def-tendency-max" class="slider-input" step="0.05">
                </div>
            </div>
        </div>
    </div>`;
}


function drawPlotlyGraph(char, lang) {
    if (!GRAPH_DIV) {
        console.error("drawPlotlyGraph: The graph container div was not found.");
        return;
    }

    const cardNameCol = (lang === 'ja') ? 'Card_Name' : 'Card_Name_EN';
    const aggData = ALL_DATA.agg_data_for_graph;
    const sitData = ALL_DATA.sit_data;
    const orderedSituations = ALL_DATA.metadata.ordered_situations;

    if (!aggData) {
        console.error("Graph data (agg_data_for_graph) is missing.");
        GRAPH_DIV.innerHTML = "グラフデータを読み込めませんでした。";
        return;
    }

    const traces = [];
    const aggTypes = [...new Set(ALL_DATA.agg_data_full.map(d => d.Type))].sort();
    const sizerefVal = aggData.length > 0 ? 2. * Math.max(...aggData.map(d => d.Total_Fights_With)) / (40.**2) : 1;

    aggTypes.forEach(cardType => {
        const dff = aggData.filter(d => d.Type === cardType);
        traces.push({
            x: dff.map(d => d.Weighted_Avg_HP_Deviation),
            y: dff.map(d => d.Weighted_Avg_Turn_Deviation),
            mode: 'markers+text', name: cardType, legendgroup: cardType,
            text: dff.map(d => d[cardNameCol]),
            textfont: { size: 9, color: "#555" }, textposition: 'middle right',
            marker: {
                color: TYPE_COLOR_MAP[cardType] || '#BDBDBD',
                size: dff.map(d => d.Total_Fights_With),
                sizemode: 'area', sizeref: sizerefVal, sizemin: 4, opacity: 0.7, line: { width: 0 }
            },
            customdata: dff, hoverinfo: 'none', visible: true
        });
    });

    orderedSituations.forEach(situation => {
        const [act, combatType] = situation;
        const sitDffBase = sitData.filter(d => d.Act === act && d.Combat_Type === combatType && d.IsStarter === false);
        const maxFightsInSituation = Math.max(...sitDffBase.map(d => d.Fights_With), 0);

        aggTypes.forEach(cardType => {
            const dff = sitDffBase.filter(d => d.Type === cardType);
            if (dff.length === 0) {
                traces.push({ x: [null], y: [null], mode: 'markers', visible: false, showlegend: false });
                return;
            }
            const bubbleSizes = dff.map(d => (maxFightsInSituation > 0) ? (d.Fights_With / maxFightsInSituation * 40) : 4);
            traces.push({
                x: dff.map(d => d.HP_Deviation), y: dff.map(d => d.Turn_Deviation),
                mode: 'markers+text', name: cardType, legendgroup: cardType,
                text: dff.map(d => d[cardNameCol]),
                textfont: { size: 10, color: "#444" }, textposition: 'middle right',
                marker: {
                    size: bubbleSizes, sizemin: 4, color: TYPE_COLOR_MAP[cardType] || '#BDBDBD',
                    opacity: 0.7, line: { width: 0 }
                },
                customdata: dff, hoverinfo: 'none', visible: false
            });
        });
    });

    const numAggTraces = aggTypes.length;
    const numSitTracesPerSituation = aggTypes.length;
    const totalSitTraces = orderedSituations.length * numSitTracesPerSituation;
    const aggVisibility = [...Array(numAggTraces).fill(true), ...Array(totalSitTraces).fill(false)];
    const sitVisibilityInitial = [...Array(numAggTraces).fill(false), ...Array(numSitTracesPerSituation).fill(true), ...Array(totalSitTraces - numSitTracesPerSituation).fill(false)];

    const situationButtons = orderedSituations.map((situation, i) => {
        const visibility = Array(numAggTraces + totalSitTraces).fill(false);
        const startIndex = numAggTraces + (i * numSitTracesPerSituation);
        for (let j = 0; j < numSitTracesPerSituation; j++) { visibility[startIndex + j] = true; }
        const situationLabel = `Act${situation[0]} - ${situation[1]}`;
        return { label: situationLabel, method: "update", args: [{ visible: visibility }, { "title.text": `${UI_TEXT.sit_title}: ${situationLabel}` }] };
    });

    const layout = {
        height: 800,
        title: { text: UI_TEXT.agg_title, x: 0.05, y: 0.98, xanchor: 'left', yanchor: 'top' },
        xaxis: { range: X_RANGE, title: UI_TEXT.xaxis },
        yaxis: { range: Y_RANGE, title: UI_TEXT.yaxis, scaleanchor: "x", scaleratio: 1 },
        hovermode: 'closest',
        legend: { orientation: "h", xanchor: "center", yanchor: "top", x: 0.5, y: -0.15 },
        dragmode: 'pan',
        modebar: { orientation: 'v' },
        updatemenus: [
            { type: "buttons", direction: "right", active: 0, x: 0, y: 1.08, xanchor: "left", yanchor: "top", buttons: [
                { label: UI_TEXT.agg_view, method: "update", args: [{ visible: aggVisibility }, { "title.text": UI_TEXT.agg_title, "updatemenus[1].visible": false }] },
                { label: UI_TEXT.sit_view, method: "update", args: [{ visible: sitVisibilityInitial }, { "title.text": `${UI_TEXT.sit_title}: ${`Act${orderedSituations[0][0]} - ${orderedSituations[0][1]}` || ''}`, "updatemenus[1].visible": true }] }
            ]},
            { type: "dropdown", direction: "down", active: 0, x: 0, y: 1.0, xanchor: "left", yanchor: "top", buttons: situationButtons, visible: false, showactive: true }
        ],
        margin: { l: 60, r: 20, t: 80, b: 120 },
        shapes: [
            ...[5, 10, 15].map(r => ({ type: "circle", xref: "x", yref: "y", x0: 50 - r, y0: 50 - r, x1: 50 + r, y1: 50 + r, line: { color: "LightGrey", width: 1, dash: "dot" }, layer: "below" })),
            { type: "line", xref: "x", yref: "y", x0: 50, y0: Y_RANGE[0], x1: 50, y1: Y_RANGE[1], line: { color: "grey", width: 1, dash: "dash" }, layer: "below" },
            { type: "line", xref: "x", yref: "y", x0: X_RANGE[0], y0: 50, x1: X_RANGE[1], y1: 50, line: { color: "grey", width: 1, dash: "dash" }, layer: "below" }
        ]
    };

    const config = { responsive: true, scrollZoom: true, displaylogo: false, modeBarButtonsToRemove: ['select2d', 'lasso2d'] };

    Plotly.newPlot(GRAPH_DIV, traces, layout, config);

    GRAPH_DIV.removeAllListeners('plotly_relayout');
    GRAPH_DIV.on('plotly_relayout', function(eventData) {
        if (eventData['updatemenus[0].active'] !== undefined) {
            setTimeout(() => {
                updateVisuals(null, null);
            }, 50);
        }
    });
}

// =================================================================
// ヘルパー関数群
// =================================================================

function setupGraphFilters(lang) {
    const filterToggleButton = document.getElementById('filter-toggle-button');
    const filterContent = document.getElementById('filter-content');

    if (filterToggleButton && filterContent) {
        filterToggleButton.addEventListener('click', () => {
            const isCollapsed = filterContent.classList.contains('collapsed');
            if (isCollapsed) {
                filterContent.classList.remove('collapsed');
                filterToggleButton.textContent = UI_TEXT.close_filters || 'フィルターを閉じる ▲';
            } else {
                filterContent.classList.add('collapsed');
                filterToggleButton.textContent = UI_TEXT.open_filters || 'フィルターを開く ▼';
            }
        });
    }

    const rarityFilter = document.getElementById('rarity-filter');
    const medalFilter = document.getElementById('medal-filter');
    const infoBox = document.getElementById('info-box');

    let hideBoxTimeout = null;
    const HIDE_DELAY = 300;

    const startHideTimer = () => {
        clearTimeout(hideBoxTimeout);
        hideBoxTimeout = setTimeout(() => {
            if (infoBox) {
                infoBox.style.opacity = 0;
                infoBox.style.transform = 'translateX(20px)';
                infoBox.style.pointerEvents = 'none';
            }
            updateVisuals(null, []);
        }, HIDE_DELAY);
    };

    const cancelHideTimer = () => {
        clearTimeout(hideBoxTimeout);
    };

    const attentionSliderEl = document.getElementById('attention-score-slider');
    const attentionValueEl = document.getElementById('attention-score-value');

    const atkSliderEl = document.getElementById('attack-tendency-slider');
    const defSliderEl = document.getElementById('defense-tendency-slider');
    const atkAllCheckbox = document.getElementById('atk-tendency-all');
    const defAllCheckbox = document.getElementById('def-tendency-all');
    const tendencyLogicRadios = document.querySelectorAll('input[name="tendency-logic"]');
    const atkMinInput = document.getElementById('atk-tendency-min');
    const atkMaxInput = document.getElementById('atk-tendency-max');
    const defMinInput = document.getElementById('def-tendency-min');
    const defMaxInput = document.getElementById('def-tendency-max');

    if (attentionSliderEl) {
        attentionSlider = noUiSlider.create(attentionSliderEl, {
            start: 30,
            range: { 'min': 30, 'max': 90 },
            step: 1,
            format: { to: v => Math.round(v), from: v => Number(v) }
        });
        attentionSlider.on('update', (values, handle) => {
            if (attentionValueEl) {
                attentionValueEl.textContent = `≥ ${values[handle]}`;
            }
        });
        attentionSlider.on('change', () => updateVisuals(null, []));
    }


    function createSlider(element, minInput, maxInput) {
        if (!element) return null;
        const slider = noUiSlider.create(element, { start: [-3.0, 3.0], connect: true, range: { 'min': -3.0, 'max': 3.0 }, step: 0.05, margin: 0.05, format: { to: v => parseFloat(v).toFixed(2), from: v => Number(v) } });
        slider.on('update', values => { minInput.value = values[0]; maxInput.value = values[1]; });
        const syncAndUpdate = () => updateVisuals(null, []);
        slider.on('change', syncAndUpdate);
        minInput.addEventListener('change', () => { slider.set([minInput.value, null]); syncAndUpdate(); });
        maxInput.addEventListener('change', () => { slider.set([null, maxInput.value]); syncAndUpdate(); });
        return slider;
    }

    const atkSlider = createSlider(atkSliderEl, atkMinInput, atkMaxInput);
    const defSlider = createSlider(defSliderEl, defMinInput, defMaxInput);

    function setupCheckbox(checkbox, sliderElement, minInput, maxInput) {
        if (!checkbox) return;
        const toggleSlider = () => {
            const isDisabled = checkbox.checked;
            if (sliderElement) sliderElement.toggleAttribute('disabled', isDisabled);
            minInput.disabled = isDisabled;
            maxInput.disabled = isDisabled;
            updateVisuals(null, []);
        };
        checkbox.addEventListener('change', toggleSlider);
        toggleSlider();
    }
    setupCheckbox(atkAllCheckbox, atkSliderEl, atkMinInput, atkMaxInput);
    setupCheckbox(defAllCheckbox, defSliderEl, defMinInput, defMaxInput);

    const isMobile = ('ontouchstart' in window) || (navigator.maxTouchPoints > 0);
    let pinnedPoint = null;

    if (isMobile) {
        GRAPH_DIV.on('plotly_click', function(e) {
            if (!e.points || !e.points.length) return;
            const point = e.points[0];
            if (pinnedPoint && pinnedPoint.pointNumber === point.pointNumber && pinnedPoint.curveNumber === point.curveNumber) {
                infoBox.classList.remove('visible');
                pinnedPoint = null;
                updateVisuals(null, []);
                return;
            }
            pinnedPoint = { pointNumber: point.pointNumber, curveNumber: point.curveNumber };
            infoBox.innerHTML = createHoverText(point.customdata, lang);
            infoBox.classList.add('visible');
            updateVisuals(point.customdata[(lang === 'ja' ? 'Card_Name' : 'Card_Name_EN')], point.customdata[(lang === 'ja' ? 'Co_occurrence_Partners' : 'Co_occurrence_Partners_EN')] || []);
        });
        GRAPH_DIV.on('plotly_relayout', () => {
            if (pinnedPoint) { infoBox.classList.remove('visible'); pinnedPoint = null; updateVisuals(null, []); }
        });
    } else {
        GRAPH_DIV.on('plotly_hover', e => {
            if (!e.points || e.points.length === 0) return;
            cancelHideTimer();
            const point = e.points[0];
            infoBox.innerHTML = createHoverText(point.customdata, lang);
            infoBox.style.opacity = 1;
            infoBox.style.transform = 'translateX(0)';
            infoBox.style.pointerEvents = 'auto';
            updateVisuals(point.customdata[(lang === 'ja' ? 'Card_Name' : 'Card_Name_EN')], point.customdata[(lang === 'ja' ? 'Co_occurrence_Partners' : 'Co_occurrence_Partners_EN')] || []);
        });

        GRAPH_DIV.on('plotly_unhover', () => {
            startHideTimer();
        });

        infoBox.addEventListener('mouseenter', () => {
            cancelHideTimer();
        });

        infoBox.addEventListener('mouseleave', () => {
            startHideTimer();
        });
    }

    [rarityFilter, medalFilter].forEach(f => f?.addEventListener('change', () => updateVisuals(null, [])));
    tendencyLogicRadios.forEach(r => r?.addEventListener('change', () => updateVisuals(null, [])));

    const analysisReports = document.getElementById('analysis-reports');
    if (analysisReports) {
        analysisReports.addEventListener('click', function(e) {
            const clickableCard = e.target.closest('.spotlight-card, .card-name-cell');
            if (!clickableCard) return;

            const cardNameToHighlight = clickableCard.dataset.cardName;
            let pointData = null;
            let pointIndex = -1;
            let traceIndex = -1;

            for (let i = 0; i < GRAPH_DIV.data.length; i++) {
                const trace = GRAPH_DIV.data[i];
                if (trace.customdata) {
                    const cardNameCol = (LANG === 'ja') ? 'Card_Name' : 'Card_Name_EN';
                    pointIndex = trace.customdata.findIndex(d => d[cardNameCol] === cardNameToHighlight);
                    if (pointIndex !== -1) {
                        pointData = trace.customdata[pointIndex];
                        traceIndex = i;
                        break;
                    }
                }
            }

            if (pointData) {
                if (isMobile) {
                    pinnedPoint = { pointNumber: pointIndex, curveNumber: traceIndex };
                    infoBox.innerHTML = createHoverText(pointData, lang);
                    infoBox.classList.add('visible');
                } else {
                    cancelHideTimer();
                    infoBox.innerHTML = createHoverText(pointData, lang);
                    infoBox.style.opacity = 1;
                    infoBox.style.transform = 'translateX(0)';
                    infoBox.style.pointerEvents = 'auto';
                }

                const partnersCol = (LANG === 'ja') ? 'Co_occurrence_Partners' : 'Co_occurrence_Partners_EN';
                updateVisuals(pointData[(LANG === 'ja' ? 'Card_Name' : 'Card_Name_EN')], pointData[partnersCol] || []);
                GRAPH_DIV.scrollIntoView({ behavior: 'smooth', block: 'center' });
            }
        });
    }
}


function createHoverText(d, lang) {
    if (!d) return "";
    const cardNameCol = (lang === 'ja') ? 'Card_Name' : 'Card_Name_EN';
    const cardName = d[cardNameCol];

    const encodedName = encodeURIComponent(cardName.replace(/ /g, '_'));
    const wikiUrl = lang === 'ja'
        ? `https://wikiwiki.jp/tohokoyoya/${encodeURIComponent(cardName)}`
        : `https://lbol.miraheze.org/wiki/${encodedName}`;
    const wikiLinkHtml = `<a href="${wikiUrl}" target="_blank" style="font-size:10px;">(wiki)</a>`;

    const currentViewButtonIndex = GRAPH_DIV.layout.updatemenus[0].active;
    const isAggView = (currentViewButtonIndex === 0);

    let sourceData = d;
    const aggCardData = AGG_MAP.get(cardName);
    if (aggCardData) {
        sourceData = { ...aggCardData, ...d };
    }

    const safeToFixed = (val, digits) => (val != null ? val.toFixed(digits) : 'N/A');
    const safeToPercent = (val, digits) => (val != null ? (val * 100).toFixed(digits) : 'N/A');
    const formatTendency = (val, pos, neg) => {
        const numVal = val != null ? val : 0;
        const color = numVal > pos ? "#2ca02c" : numVal < neg ? "#d62728" : "#333";
        return `<span style='color:${color};font-weight:bold;'>${safeToFixed(val, 2)}</span>`;
    };
    const star = val => {
        const numVal = val != null ? val : 0;
        return numVal > 0.75 ? ' ⭐' : numVal > 0.5 ? ' ☆' : '';
    }

    let perfHtml = '';
    let turnPlotData, hpPlotData;
    let turnScalingParams, hpScalingParams;
    let turnHighlight, hpHighlight;

    if (isAggView) {
        // --- 総合ビューの表示 ---
        turnPlotData = sourceData.Turn_Deviation_Situational_Values || [];
        hpPlotData = sourceData.HP_Deviation_Situational_Values || [];
        turnScalingParams = undefined; // 偏差値プロットなのでスケーリング不要
        hpScalingParams = undefined;
        turnHighlight = sourceData.Weighted_Avg_Turn_Deviation; // 総合偏差値をハイライト
        hpHighlight = sourceData.Weighted_Avg_HP_Deviation;

        perfHtml = `
            <div>${UI_TEXT.attack_perf || '攻撃性能'}: ${safeToFixed(sourceData.Weighted_Avg_Turn_Deviation, 2)}</div>
            <div id="dist-plot-turn" class="dist-plot-container"></div>
            <div>${UI_TEXT.defense_perf || '防御性能'}: ${safeToFixed(sourceData.Weighted_Avg_HP_Deviation, 2)}</div>
            <div id="dist-plot-hp" class="dist-plot-container"></div>
            <hr style='margin:5px 0;'>
            <div class="tooltip-row">
                <span>${UI_TEXT.atk_tendency}:</span>
                <span>${formatTendency(sourceData.Turn_Tendency, 0.25, -0.8)}${star(sourceData.Turn_Tendency)}</span>
            </div>
            <div class="tooltip-row">
                <span>${UI_TEXT.def_tendency}:</span>
                <span>${formatTendency(sourceData.HP_Tendency, 0.25, -1.0)}${star(sourceData.HP_Tendency)}</span>
            </div>
        `;
    } else {
        // --- 状況別ビューの表示 ---

        perfHtml = `
            <div>${UI_TEXT.sit_attack_perf || '攻撃性能 (この状況)'}: ${safeToFixed(d.Turn_Deviation, 2)}</div>
            <div>${UI_TEXT.sit_defense_perf || '防御性能 (この状況)'}: ${safeToFixed(d.HP_Deviation, 2)}</div>
        `;
    }

    let adoptionHtml = '';
    if (isAggView) {
         adoptionHtml = `
            <hr style='margin: 8px 0;'>
            <div class="tooltip-row"><span>${UI_TEXT.adoption_rate || '採用率'}:</span><span>${safeToPercent(sourceData.Adoption_Rate, 1)}%</span></div>
            <div class="tooltip-row"><span>${UI_TEXT.attention_score_label || '注目度スコア'}:</span><span>${safeToFixed(sourceData.Attention_Score, 1)}</span></div>
            <div class="tooltip-row"><span>${UI_TEXT.stability || '安定性'}:</span><span>${safeToFixed(sourceData.Stability_Score, 1)}</span></div>
            <hr style='margin: 8px 0;'>
            ${UI_TEXT.avg_copies_when_adopted}: ${safeToFixed(sourceData.Avg_Copies, 2)}<br>
            ${UI_TEXT.avg_upgrade_rate}: ${safeToPercent(sourceData.Avg_Upgrade_Rate, 1)}%
        `;
    } else {
        const sitAdoptionRate = (d.Total_Fights_In_Situation > 0)
            ? (d.Fights_With / d.Total_Fights_In_Situation)
            : null;

         adoptionHtml = `
            <hr style='margin: 8px 0;'>
            <b>${UI_TEXT.sit_view || '状況別'} Stats:</b><br>
            <div class="tooltip-row">
                <span>${UI_TEXT.sit_adoption_rate || 'この状況での採用率'}:</span>
                <span>${safeToPercent(sitAdoptionRate, 1)}% (${d.Fights_With || 0}回)</span>
            </div>
            <hr style='margin: 8px 0;'>
            <b>${UI_TEXT.agg_view || '総合'} Stats (参考):</b><br>
            <div class="tooltip-row"><span>${UI_TEXT.adoption_rate || '採用率'}:</span><span>${safeToPercent(sourceData.Adoption_Rate, 1)}%</span></div>
            <div class="tooltip-row"><span>${UI_TEXT.attention_score_label || '注目度スコア'}:</span><span>${safeToFixed(sourceData.Attention_Score, 1)}</span></div>
            <div class="tooltip-row"><span>${UI_TEXT.stability || '安定性'}:</span><span>${safeToFixed(sourceData.Stability_Score, 1)}</span></div>
        `;
    }

    const highlightCol = (lang === 'ja') ? 'Highlights_JA_Hover' : 'Highlights_EN_Hover';
    const highlightsHtml = sourceData[highlightCol] ? `<hr style='margin: 8px 0;'><b>${UI_TEXT.highlights}: ${sourceData.Medal || ''}</b><br>${sourceData[highlightCol]}` : "";

    let coOccurrenceHtml = '';
    if (isAggView) {
        const topCol = (lang === 'ja') ? 'Top_20_Co_occurrence_JA' : 'Top_20_Co_occurrence_EN';
        if (sourceData[topCol]) {
            coOccurrenceHtml = `<b>${UI_TEXT.top_20 || '共起Top20'}:</b><br>${sourceData[topCol]}`;
        }
    } else {
        const sitTopCol = (lang === 'ja') ? 'Situational_Co_occurrence_JA' : 'Situational_Co_occurrence_EN';
        const situationalCoOccurrence = d[sitTopCol];
        if (situationalCoOccurrence) {
            coOccurrenceHtml = `<b>${UI_TEXT.sit_top_20 || '共起Top20 (この状況)'}:</b><br>${situationalCoOccurrence}`;
        } else {
            coOccurrenceHtml = `<b>${UI_TEXT.sit_top_20 || '共起Top20 (この状況)'}:</b><br><span style="font-size:11px; color:#999;">${UI_TEXT.no_data || 'データなし'}</span>`;
        }
    }

    const tooltipHtml = `<div class='info-column'><b>${cardName}</b> ${wikiLinkHtml}<br>${UI_TEXT.type}: ${sourceData.Type}<br>${UI_TEXT.rarity}: ${sourceData.Rarity}<hr style='margin:5px 0;'>${perfHtml}${adoptionHtml}${highlightsHtml}</div><div class='info-column'>${coOccurrenceHtml}</div>`;


    if (isAggView) {
        setTimeout(() => {
            drawDistributionPlot('dist-plot-turn', turnPlotData, '#E57373', turnHighlight, turnScalingParams);
            drawDistributionPlot('dist-plot-hp', hpPlotData, '#64B5F6', hpHighlight, hpScalingParams);
        }, 0);
    }

    return tooltipHtml;
}

function drawDistributionPlot(divId, data, color, highlightValue, scalingParams) {
    const container = document.getElementById(divId);
    if (!container || !data || data.length === 0) {
        if(container) container.innerHTML = `<p style="font-size:10px; color:#999; text-align: center; margin: 20px 0;">${UI_TEXT.no_data || 'データなし'}</p>`;
        return;
    }

    const trace = {
        x: data,
        type: 'box',
        orientation: 'h',
        name: ' ',
        marker: {
            color: color,
            outliercolor: 'rgba(219, 64, 82, 0.6)',
            line: {
                outliercolor: 'rgba(219, 64, 82, 1.0)',
                outlierwidth: 2
            }
        },
        boxpoints: 'outliers',
        jitter: 0.5,
        hoverinfo: 'none'
    };

    let xAxisLayout;
    let shapes = [];

    if (scalingParams && scalingParams.median !== undefined && scalingParams.iqr !== undefined && scalingParams.iqr > 0) {
        // --- 状況別ビュー (生の値を偏差値スケールで表示) ---
        const { median, iqr } = scalingParams;

        const raw_for_dev = (dev_score) => median + (dev_score - 50) / 10 * iqr;

        xAxisLayout = {
            range: [raw_for_dev(25), raw_for_dev(75)],
            tickvals: [raw_for_dev(30), raw_for_dev(40), raw_for_dev(50), raw_for_dev(60), raw_for_dev(70)],
            ticktext: ['30', '40', '50', '60', '70'],
            showgrid: true,
            gridcolor: '#eee',
            zeroline: false,
            tickfont: { size: 9 }
        };

        if (highlightValue !== undefined && highlightValue !== null) {
            const highlightRawValue = raw_for_dev(highlightValue);
            shapes.push({
                type: 'line',
                x0: highlightRawValue,
                x1: highlightRawValue,
                y0: -0.4,
                y1: 0.4,
                line: { color: 'red', width: 2, dash: 'solid' },
                layer: 'above'
            });
        }

    } else {
        // --- 総合ビュー (偏差値の分布をそのまま表示) ---
        xAxisLayout = {
            range: [25, 75],
            tickvals: [30, 40, 50, 60, 70],
            showgrid: true,
            gridcolor: '#eee',
            zeroline: false,
            tickfont: { size: 9 }
        };

        if (highlightValue !== undefined && highlightValue !== null) {
            shapes.push({
                type: 'line',
                x0: highlightValue,
                x1: highlightValue,
                y0: -0.4,
                y1: 0.4,
                line: { color: 'red', width: 2, dash: 'solid' },
                layer: 'above'
            });
        }
    }

    const layout = {
        height: 60,
        margin: { l: 25, r: 25, b: 25, t: 5 },
        xaxis: xAxisLayout,
        yaxis: {
            showticklabels: false,
            showgrid: false,
        },
        showlegend: false,
        paper_bgcolor: 'rgba(0,0,0,0)',
        plot_bgcolor: 'rgba(0,0,0,0)',
        shapes: shapes
    };

    const config = {
        staticPlot: true,
        displayModeBar: false
    };

    Plotly.newPlot(divId, [trace], layout, config);
}


function updateVisuals(hoveredCardName, synergyPartners) {
    if (!GRAPH_DIV || !GRAPH_DIV.layout) {
        return;
    }

    const currentViewButtonIndex = GRAPH_DIV.layout.updatemenus[0].active;
    const isAggView = (currentViewButtonIndex === 0);

    const rarityValue = document.getElementById('rarity-filter').value;
    const medalValue = document.getElementById('medal-filter').value;
    const attentionScoreValue = attentionSlider ? parseFloat(attentionSlider.get()) : 30;
    const isAtkAll = document.getElementById('atk-tendency-all').checked;
    const isDefAll = document.getElementById('def-tendency-all').checked;
    const atkRange = [parseFloat(document.getElementById('atk-tendency-min').value), parseFloat(document.getElementById('atk-tendency-max').value)];
    const defRange = [parseFloat(document.getElementById('def-tendency-min').value), parseFloat(document.getElementById('def-tendency-max').value)];
    const tendencyLogic = document.querySelector('input[name="tendency-logic"]:checked').value;
    const cardNameCol = (LANG === 'ja') ? 'Card_Name' : 'Card_Name_EN';

    const restyleUpdate = { 'marker.opacity': [], 'marker.line.width': [], 'marker.line.color': [], 'textfont.color': [] };
    const tracesToUpdate = [];

    for (let i = 0; i < GRAPH_DIV.data.length; i++) {
        const trace = GRAPH_DIV.data[i];
        if (!trace.customdata || trace.customdata.length === 0) continue;
        tracesToUpdate.push(i);
        const newOpacities = [], newLineWidths = [], newLineColors = [], newFontColors = [];

        for (let j = 0; j < trace.customdata.length; j++) {
            const d = trace.customdata[j];
            let opacity = 0.7, lineWidth = 0, lineColor = 'black', fontColor = '#555';

            let allFiltersMatch = true;

            if (isAggView) {
                const rarityMatch = (rarityValue === 'All' || d.Rarity === rarityValue);
                const attentionMatch = (d.Attention_Score === null || d.Attention_Score >= attentionScoreValue);
                const atkTendencyMatch = isAtkAll || (d.Turn_Tendency >= atkRange[0] && d.Turn_Tendency <= atkRange[1]);
                const defTendencyMatch = isDefAll || (d.HP_Tendency >= defRange[0] && d.HP_Tendency <= defRange[1]);
                const tendencyConditionMatch = (tendencyLogic === 'and') ? (atkTendencyMatch && defTendencyMatch) : (atkTendencyMatch || defTendencyMatch);
                const medalMatch = (medalValue === 'All') || (medalValue === 'Gold' && d.Medal === '🥇') || (medalValue === 'SilverOrBetter' && ['🥇', '🥈'].includes(d.Medal)) || (medalValue === 'BronzeOrBetter' && ['🥇', '🥈', '🥉'].includes(d.Medal)) || (medalValue === 'None' && (d.Medal === '' || d.Medal == null));

                allFiltersMatch = rarityMatch && tendencyConditionMatch && medalMatch && attentionMatch;

            } else {
                const aggCardData = ALL_DATA.agg_data_full.find(agg_d => agg_d[cardNameCol] === d[cardNameCol]);

                if (aggCardData) {
                    const rarityMatch = (rarityValue === 'All' || d.Rarity === rarityValue);
                    const attentionMatch = (aggCardData.Attention_Score === null || aggCardData.Attention_Score >= attentionScoreValue);
                    const medalMatch = (medalValue === 'All') || (medalValue === 'Gold' && aggCardData.Medal === '🥇') || (medalValue === 'SilverOrBetter' && ['🥇', '🥈'].includes(aggCardData.Medal)) || (medalValue === 'BronzeOrBetter' && ['🥇', '🥈', '🥉'].includes(aggCardData.Medal)) || (medalValue === 'None' && (aggCardData.Medal === '' || aggCardData.Medal == null));
                    allFiltersMatch = rarityMatch && medalMatch && attentionMatch;
                }
            }

            if (!allFiltersMatch) {
                opacity = 0.05;
                fontColor = '#ddd';
            }
            else if (hoveredCardName) {
                if (d[cardNameCol] === hoveredCardName) {
                    opacity = 1.0;
                    lineWidth = 3;
                    fontColor = '#333';
                } else if (synergyPartners && synergyPartners.includes(d[cardNameCol])) {
                    opacity = 0.9;
                    lineWidth = 1;
                    fontColor = '#333';
                } else {
                    opacity = 0.1;
                    fontColor = '#ccc';
                }
            }

            newOpacities.push(opacity);
            newLineWidths.push(lineWidth);
            newLineColors.push(lineColor);
            newFontColors.push(fontColor);
        }
        restyleUpdate['marker.opacity'].push(newOpacities);
        restyleUpdate['marker.line.width'].push(newLineWidths);
        restyleUpdate['marker.line.color'].push(newLineColors);
        restyleUpdate['textfont.color'].push(newFontColors);
    }
    if (tracesToUpdate.length > 0) {
        Plotly.restyle(GRAPH_DIV, restyleUpdate, tracesToUpdate);
    }
}

function createWikiLink(itemName, itemType, lang) {
    if (!itemName) return ""; // nullチェック
    const nameStr = String(itemName);
    const encodedName = encodeURIComponent(nameStr.replace(/ /g, '_'));

    const baseUrl = lang === 'ja'
        ? `https://wikiwiki.jp/tohokoyoya/${encodeURIComponent(nameStr)}`
        : `https://lbol.miraheze.org/wiki/${encodedName}`;

    return `<a href="${baseUrl}" target="_blank">${nameStr}</a>`;
}


function createAttentionRankingHtml(aggData, cardNameCol, lang) {
    const topN = 40; // ランキングの表示件数 (Top40)
    const sortedData = [...aggData]
        .filter(d => d.Attention_Score !== null)
        .sort((a, b) => b.Attention_Score - a.Attention_Score)
        .slice(0, topN);

    if (sortedData.length === 0) return '';


    const isJa = lang === 'ja';
    const title = UI_TEXT.attention_ranking_title || (isJa ? `注目度ランキング Top${topN}` : `Attention Ranking Top ${topN}`);
    const description = UI_TEXT.attention_ranking_desc || (isJa ? '採用率、ハイライト、性能を総合的に評価したランキングです。' : 'A comprehensive ranking based on adoption rate, highlights, and performance.');
    const attentionLabel = UI_TEXT.attention_score_label || (isJa ? '注目度' : 'Attention');
    const adoptionLabel = UI_TEXT.adoption_rate_header || (isJa ? '採用率' : 'Adoption');
    const performanceLabel = UI_TEXT.performance_header || (isJa ? '性能' : 'Perf.');


    const splitPoint = Math.ceil(sortedData.length / 2);
    const col1Data = sortedData.slice(0, splitPoint);
    const col2Data = sortedData.slice(splitPoint);

    const createLi = (d) => {
        const cardName = d.Medal ? `${d.Medal} ${d[cardNameCol]}` : d[cardNameCol];
        const performance = (d.Weighted_Avg_Turn_Deviation + d.Weighted_Avg_HP_Deviation) / 2;
        // 翻訳済みラベルを使用
        const stats = `${attentionLabel}: ${d.Attention_Score.toFixed(1)}, ${adoptionLabel}: ${(d.Adoption_Rate * 100).toFixed(1)}%, ${performanceLabel}: ${performance.toFixed(1)}`;
        return `<li><strong class="spotlight-card" data-card-name="${d[cardNameCol]}" style="cursor:pointer; background:none; padding:0; display:inline;">${cardName}</strong> (${stats})</li>`;
    };

    const listItems1 = col1Data.map(createLi).join('');
    const listItems2 = col2Data.map(createLi).join('');

    const listHtml = `
        <div style="display: flex; gap: 40px; flex-wrap: wrap;">
            <ol style="padding-left: 25px; flex: 1; margin-top: 0; min-width: 300px;">${listItems1}</ol>
            ${col2Data.length > 0 ? `<ol start="${splitPoint + 1}" style="padding-left: 25px; flex: 1; margin-top: 0; min-width: 300px;">${listItems2}</ol>` : ''}
        </div>
    `;

    return `<div id="attention-ranking-report" class="analysis-section"><h3>${title}</h3><p>${description}</p>${listHtml}</div>`;
}



function createAnalysisReportsHtml(lang) {
    const cardNameCol = (lang === 'ja') ? 'Card_Name' : 'Card_Name_EN';

    const rankableAggData = ALL_DATA.agg_data_full.filter(d => d.Turn_Tendency !== null && d.HP_Tendency !== null);

    if (!rankableAggData || rankableAggData.length === 0) {
        return `<div id='analysis-reports'><p>${UI_TEXT.no_data || '表示できるデータがありません。'}</p></div>`;
    }

    const top20Adopted = rankableAggData.slice().sort((a, b) => b.Total_Fights_With - a.Total_Fights_With).slice(0, 20).map(d => d[cardNameCol]);

    const spotlightHtml = createSpotlightHtml(rankableAggData, cardNameCol, top20Adopted);
    const attentionRankingHtml = createAttentionRankingHtml(rankableAggData, cardNameCol, lang);
    const upgradeRankingHtml = createUpgradeRankingHtml(ALL_DATA.upgrade_ranking_data, cardNameCol, lang);
    const removeRankingHtml = createRemoveRankingHtml(ALL_DATA.remove_ranking_data, cardNameCol, lang);

    // --- Act1 ランキングの生成 ---
    const act1Data = ALL_DATA.sit_data.filter(d => d.Act === 1);
    const createSitRankings = (data, nameCol) => {
        const perfMap = new Map();
        const adoptionMap = new Map();
        data.forEach(d => {
            const perfScore = (d.Turn_Deviation || 0) + (d.HP_Deviation || 0);
            if (!perfMap.has(d[nameCol])) perfMap.set(d[nameCol], { sum: 0, count: 0 });
            const perfEntry = perfMap.get(d[nameCol]);
            perfEntry.sum += perfScore;
            perfEntry.count++;

            if (!adoptionMap.has(d[nameCol])) adoptionMap.set(d[nameCol], 0);
            adoptionMap.set(d[nameCol], (adoptionMap.get(d[nameCol]) || 0) + (d.Fights_With || 0));
        });

        const perfAvg = Array.from(perfMap.entries()).map(([name, data]) => [name, data.sum / data.count]);
        const topPerformers = perfAvg.sort((a, b) => b[1] - a[1]);
        const topAdoption = Array.from(adoptionMap.entries()).sort((a, b) => b[1] - a[1]);
        return { topPerformers, topAdoption };
    };

    const act1Rankings = createSitRankings(act1Data, cardNameCol);
    const act1AdoptionHtml = createRankedListHtml("act1-adoption-report", UI_TEXT.act1_top_adoption_title, UI_TEXT.act1_top_adoption_desc, act1Rankings.topAdoption.slice(0, 20), (lang === 'ja' ? "採用数" : "Adoptions"), ".0f");
    const act1PerfHtml = createRankedListHtml("act1-performers-report", UI_TEXT.act1_top_performers_title, UI_TEXT.act1_top_performers_desc, act1Rankings.topPerformers.slice(0, 20), "Score", ".1f");

    // --- Act4 ランキングの生成 ---
    const act4SitData = ALL_DATA.sit_data.filter(d => d.Act === 4);

    // パフォーマンスランキング (agg_data_full を使用)
    const act4Performers = rankableAggData
        .filter(d => d.Turn_Act_4 != null && d.HP_Act_4 != null)
        .map(d => {
            const score = (d.Turn_Act_4 + d.HP_Act_4) ;
            return [d[cardNameCol], score];
        })
        .sort((a, b) => b[1] - a[1]);
    const act4PerfHtml = createRankedListHtml("act4-performers-report", UI_TEXT.act4_top_performers_title, UI_TEXT.act4_top_performers_desc, act4Performers.slice(0, 40), "Score", ".1f");

    // 採用数ランキング (sit_data を使用)
    const act4AdoptionRankings = createSitRankings(act4SitData, cardNameCol);
    const act4AdoptionHtml = createRankedListHtml("act4-adoption-report", UI_TEXT.act4_top_adoption_title, UI_TEXT.act4_top_adoption_desc, act4AdoptionRankings.topAdoption.slice(0, 40), (lang === 'ja' ? "採用数" : "Adoptions"), ".0f");


    // --- 傾向値ランキングの生成 (攻撃Top20 / 防御Top20) ---
    const ADOPTION_RATE_THRESHOLD = 0.05;
    const baseTendencyData = ALL_DATA.agg_data_full.filter(d =>
        d[cardNameCol] && d.Adoption_Rate >= ADOPTION_RATE_THRESHOLD
    );
    // 攻撃傾向値 Top20
    const attackTendencyTop20= baseTendencyData
        .filter(d => d.Turn_Tendency != null)
        .sort((a, b) => b.Turn_Tendency - a.Turn_Tendency)
        .slice(0, 20);

    // 防御傾向値 Top20
    const defenseTendencyTop20 = baseTendencyData
        .filter(d => d.HP_Tendency != null)
        .sort((a, b) => b.HP_Tendency - a.HP_Tendency)
        .slice(0, 20);

    // HTMLのリスト項目を生成するヘルパー関数
    const createTendencyListItems = (data, valueKey, valueLabel) => {
        return data.map(d => {
            const cardName = d[cardNameCol];
            const value = d[valueKey];
            return `<li><strong class="spotlight-card" data-card-name="${cardName}" style="cursor:pointer; background:none; padding:0; display:inline;">${cardName}</strong> (${valueLabel}: ${value.toFixed(2)})</li>`;
        }).join('');
    };

    const attackListHtml = createTendencyListItems(attackTendencyTop20, 'Turn_Tendency', UI_TEXT.atk_tendency || '攻撃傾向');
    const defenseListHtml = createTendencyListItems(defenseTendencyTop20, 'HP_Tendency', UI_TEXT.def_tendency || '防御傾向');

    const tendencyPerfHtml = `
        <div id="tendency-ranking-report" class="analysis-section">
            <h3>${UI_TEXT.tendency_ranking_title || '傾向値ランキング'}</h3>
            <p>${UI_TEXT.tendency_ranking_desc || '攻撃または防御に特化したカードです。'}</p>
            <div style="display: flex; gap: 40px; flex-wrap: wrap;">
                <div style="flex: 1; min-width: 300px;">
                    <h4>${UI_TEXT.attack_tendency_top_10_title || '攻撃傾向 Top 20'}</h4>
                    <ol style="padding-left: 25px; margin-top: 0;">${attackListHtml}</ol>
                </div>
                <div style="flex: 1; min-width: 300px;">
                    <h4>${UI_TEXT.defense_tendency_top_10_title || '防御傾向 Top 20'}</h4>
                    <ol style="padding-left: 25px; margin-top: 0;">${defenseListHtml}</ol>
                </div>
            </div>
        </div>
    `;


    const criteriaHtml = `
        <div id='criteria-explanation' class="analysis-section">
            <h3>${UI_TEXT.criteria_title}</h3><p>${UI_TEXT.criteria_desc}</p>
            <h4>${UI_TEXT.spotlight_cat0_title}</h4><ul><li>${UI_TEXT.star_cond1}</li><li>${UI_TEXT.star_cond2}</li><li>${UI_TEXT.star_cond3}</li></ul>
            <h4>${UI_TEXT.spotlight_cat1_title}</h4><ul><li>${UI_TEXT.honor_cond1}</li><li>${UI_TEXT.honor_cond2}</li><li>${UI_TEXT.honor_cond3}</li><li>${UI_TEXT.honor_cond4}</li></ul>
            <h4>${UI_TEXT.spotlight_cat5_title}</h4><ul><li>${UI_TEXT.balancer_cond1}</li></ul>
            <h4>${UI_TEXT.spotlight_cat2_title}</h4><ul><li>${UI_TEXT.high_roller_cond1}</li></ul>
            <h4>${UI_TEXT.spotlight_cat3_title}</h4><ul><li>${UI_TEXT.solid_defender_cond1}</li></ul>
            <h4>${UI_TEXT.spotlight_cat4_title}</h4><ul><li>${UI_TEXT.counter_cond1}</li></ul>
        </div>`;

    return `<div id='analysis-reports'>
                ${attentionRankingHtml}
                ${act1PerfHtml}
                ${act4PerfHtml}
                ${tendencyPerfHtml}
            </div>
            `;
}
                //${upgradeRankingHtml}
                //${removeRankingHtml}
                //${act1AdoptionHtml}
                //${act4AdoptionHtml}

function createSpotlightHtml(aggData, cardNameCol, top20Adopted) {
    // 1. カテゴリごとのカードリストを初期化
    const spotlights = {
        star: [],
        honor: [],
        balancer: [],
        high_roller: [],
        solid: [],
        counter: []
    };

    // 2. Pythonで計算済みのカテゴリに基づいてカードを振り分ける
    aggData.forEach(r => {
        const category = r.Spotlight_Category; // Pythonが生成したカテゴリ名を取得
        if (spotlights.hasOwnProperty(category)) {
            spotlights[category].push(r[cardNameCol]);
        }
    });

    // 3. HTMLを生成するヘルパー関数
    const createList = (title, desc, cards) => {
        if (!cards || cards.length === 0) return "";
        const uniqueCards = [...new Set(cards)].sort();
        const listItems = uniqueCards.map(name => {
            const liClass = `spotlight-card ${top20Adopted.includes(name) ? 'top-adopted' : ''}`;
            return `<li class="${liClass}" data-card-name="${name}">${name}</li>`;
        }).join('');
        return `<h4>${title}</h4><p class="spotlight-desc">${desc}</p><ul>${listItems}</ul>`;
    };

    // 4. 各カテゴリのリストをHTMLとして組み立てる
    let html = `<div id='spotlight-report' class='analysis-section'><h3>${UI_TEXT.spotlight_title}</h3><p style='font-size:11px; color:#777; margin-top:-5px; margin-bottom:15px;'>${UI_TEXT.spotlight_note}</p>`;
    html += createList(UI_TEXT.spotlight_cat0_title, UI_TEXT.spotlight_cat0_desc, spotlights.star);
    html += createList(UI_TEXT.spotlight_cat1_title, UI_TEXT.spotlight_cat1_desc, spotlights.honor);
    html += createList(UI_TEXT.spotlight_cat5_title, UI_TEXT.spotlight_cat5_desc, spotlights.balancer);
    html += createList(UI_TEXT.spotlight_cat2_title, UI_TEXT.spotlight_cat2_desc, spotlights.high_roller);
    html += createList(UI_TEXT.spotlight_cat3_title, UI_TEXT.spotlight_cat3_desc, spotlights.solid);
    html += createList(UI_TEXT.spotlight_cat4_title, UI_TEXT.spotlight_cat4_desc, spotlights.counter);
    html += `</div>`;

    return html;
}

function createRankedListHtml(reportId, title, description, cardsData, valueLabel, valueFormatStr) {
    if (!cardsData || cardsData.length === 0) return "";
    const splitPoint = Math.ceil(cardsData.length / 2);
    const col1Data = cardsData.slice(0, splitPoint);
    const col2Data = cardsData.slice(splitPoint);

    const createLi = (name, value) => {
        const valueStr = (valueFormatStr === ".0f") ? Math.round(value) : value.toFixed(1);
        return `<li><strong class="spotlight-card" data-card-name="${name}" style="cursor:pointer; background:none; padding:0; display:inline;">${name}</strong> (${valueLabel}: ${valueStr})</li>`;
    };

    const listItems1 = col1Data.map(([name, val]) => createLi(name, val)).join('');
    const listItems2 = col2Data.map(([name, val]) => createLi(name, val)).join('');

    if (col2Data.length === 0) {
        return `<div id="${reportId}" class="analysis-section"><h3>${title}</h3><p>${description}</p><ol style="padding-left: 25px;">${listItems1}</ol></div>`;
    }
    return `
        <div id="${reportId}" class="analysis-section">
            <h3>${title}</h3><p>${description}</p>
            <div style="display: flex; gap: 40px;">
                <ol style="padding-left: 25px; flex: 1; margin-top: 0;">${listItems1}</ol>
                <ol start="${splitPoint + 1}" style="padding-left: 25px; flex: 1; margin-top: 0;">${listItems2}</ol>
            </div>
        </div>`;
}

function renderExhibitAnalysisTab(lang) {
    const container = document.getElementById('exhibit-analysis-tab');
    if (!container || !ALL_DATA.exhibit_data) {
        if (container) container.innerHTML = `<div class='analysis-section'><h3>${UI_TEXT.exhibit_title}</h3><p>${UI_TEXT.no_data}</p></div>`;
        return;
    }

    const desiredOrderJa = ['光耀', '一般', '一般レア', '一般アンコモン', '一般コモン', 'ショップ', 'イベント'];
    const categoryMapJaToEn = { '光耀': 'Shining', '一般': 'General', '一般レア': 'Std. Rare', '一般アンコモン': 'Std. Uncommon', '一般コモン': 'Std. Common', 'ショップ': 'Shop', 'イベント': 'Event' };
    const categoriesInData = [...new Set(ALL_DATA.exhibit_data.map(d => d.Display_Category))];
    const categoriesJa = desiredOrderJa.filter(cat => categoriesInData.includes(cat) || (cat === '一般' && categoriesInData.some(c => c.startsWith('一般'))));

    let catButtons = `<div class="exhibit-filter-group" data-filter-type="category"><b>${UI_TEXT.category}:</b> <button class="filter-btn active" data-value="All" onclick="updateExhibitFilters('All')">${UI_TEXT.filter_all}</button>`;
    categoriesJa.forEach(catJa => {
        const displayName = (lang === 'en') ? categoryMapJaToEn[catJa] || catJa : catJa;
        catButtons += `<button class="filter-btn" data-value="${catJa}" onclick="updateExhibitFilters('${catJa}')">${displayName}</button>`;
    });
    catButtons += '</div>';
    const filterHtml = `<div class="exhibit-filters">${catButtons}</div>`;

    const sortedData = ALL_DATA.exhibit_data.slice().sort((a, b) => b.Adoption_Rate - a.Adoption_Rate);
    const tableRows = sortedData.map(row => {
        const nameForLink = (lang === 'ja') ? row.JA : row.EN;
        const linkedName = createWikiLink(nameForLink, 'exhibit', lang);
        const rate = row.Adoption_Rate;
        const barWidth = (rate || 0) * 100;
        const category = row.Display_Category;
        const exhibit_id = row.Exhibit_ID;
        const groupAttr = category.startsWith('一般') ? 'data-group="一般"' : '';

        let nameHtml = linkedName;

        if (category === '光耀') {
            const manaType = ALL_DATA.lookup_tables.exhibit_mana_map[exhibit_id];
            if (manaType) {
                const icon = ALL_DATA.lookup_tables.mana_icon_map[manaType];
                if (icon) {
                    nameHtml = `${icon} ${linkedName}`;
                }
            }
            nameHtml = `<span class="exhibit-name-shining">${nameHtml}</span>`;
        }
        else if (category === '一般レア') nameHtml = `<span class="exhibit-name-rare">${linkedName}</span>`;
        else if (category === '一般アンコモン') nameHtml = `<span class="exhibit-name-uncommon">${linkedName}</span>`;
        else if (category === 'ショップ') nameHtml = `🛒 ${linkedName}`;
        else if (category === 'イベント') nameHtml = `✨ ${linkedName}`;

        return `<tr data-category="${category}" ${groupAttr}><td>${nameHtml}</td><td><div class="exhibit-bar-container"><div class="exhibit-bar" style="width: ${barWidth}%;">${(rate * 100).toFixed(1)}%</div></div></td></tr>`;
    }).join('');

    container.innerHTML = `<div class='analysis-section'><h3>${UI_TEXT.exhibit_title}</h3>${filterHtml}<table id="exhibit-analysis-table"><thead><tr><th>${UI_TEXT.exhibit_name}</th><th>${UI_TEXT.adoption_rate}</th></tr></thead><tbody>${tableRows}</tbody></table></div>`;
}

function updateExhibitFilters(value) {
    document.querySelectorAll('.exhibit-filter-group .filter-btn').forEach(btn => btn.classList.toggle('active', btn.dataset.value === value));
    const rows = document.querySelectorAll('#exhibit-analysis-table tbody tr');
    rows.forEach(row => {
        const category = row.dataset.category;
        const group = row.dataset.group;
        const show = (value === 'All') || (value === '一般' && group === '一般') || (category === value);
        row.style.display = show ? '' : 'none';
    });
}

function renderRouteEventTab(lang) {
    const container = document.getElementById('route-event-tab');
    if (!container) return;
    const routeData = ALL_DATA.route_data;
    if (!routeData || Object.keys(routeData.node_selection).length === 0) {
        container.innerHTML = `<div class='analysis-section'><h3>${UI_TEXT.route_tab_title}</h3><p>${UI_TEXT.no_data}</p></div>`;
        return;
    }

    const { node_selection, event_actions, node_details, total_runs } = routeData;

    const node_type_colors = { 'Enemy': '#E57373', 'EliteEnemy': '#C62828', 'Boss': '#B71C1C', 'Shop': '#64B5F6', 'Gap': '#81C784', 'Adventure': '#FFD54F', 'Trade': '#BA68C8', 'Supply': '#FFB0CA', 'Others': '#BDBDBD', 'Entry': '#4DD0E1' };
    const node_type_labels = (lang === 'ja')
        ? { 'Enemy': '戦', 'EliteEnemy': '強', 'Boss': 'ボ', 'Shop': '店', 'Gap': '休', 'Adventure': '？', 'Trade': '交', 'Supply': '補', 'Others': '他', 'Entry': '入' }
        : { 'Enemy': 'Enemy', 'EliteEnemy': 'Elite', 'Boss': 'Boss', 'Shop': 'Shop', 'Gap': 'Gap', 'Adventure': '?', 'Trade': 'Trade', 'Supply': 'Supply', 'Others': 'Others', 'Entry': 'Entry' };

    const act_stats = {};
    for (let act_num = 1; act_num < 5; act_num++) {
        const hp_losses = [], p_changes = [];
        Object.keys(node_details).forEach(key => {
            const [act, ,] = key.split('-');
            if (parseInt(act) === act_num && node_details[key].enemies) {
                Object.values(node_details[key].enemies).forEach(enemy_stats => {

                    hp_losses.push(enemy_stats.avg_hp_loss);
                    p_changes.push(enemy_stats.avg_p_change);
                });
            }
        });
        act_stats[act_num] = {
            hp_min: hp_losses.length > 0 ? Math.min(...hp_losses) : 0, hp_max: hp_losses.length > 0 ? Math.max(...hp_losses) : 1,
            p_min: p_changes.length > 0 ? Math.min(...p_changes) : 0, p_max: p_changes.length > 0 ? Math.max(...p_changes) : 1,
        };
    }

    let flowChartHtml = '<div id="route-analysis-table-wrapper"><div class="route-acts-container">';
    let detailsPanelHtml = `<div class="route-details-panel" id="route-details-panel-content"><p>${UI_TEXT.route_placeholder || 'Select a node from the flowchart to see details.'}</p>`;

    for (let act = 1; act < 5; act++) {
        const act_levels = Object.keys(node_selection).filter(key => key.startsWith(`${act}-`)).sort((a, b) => parseInt(a.split('-')[1]) - parseInt(b.split('-')[1]));
        if (act_levels.length === 0) continue;

        let actHtmlSegment = `<div class="route-act-column"><h4>Act ${act}</h4>`;
        act_levels.forEach(level_key => {
            const level_data = node_selection[level_key];
            const total_visits_at_level = level_data.total || 1;
            const level = level_key.split('-')[1];
            const node_id_base = `${act}-${level}`;

            actHtmlSegment += `<div class="route-level-node"><p><b>Level ${level}</b> (Reach Rate: ${(total_visits_at_level / total_runs * 100).toFixed(1)}%)</p>`;
            let barHtml = '<div class="node-choice-bar">';
            const sortedNodeTypes = Object.entries(level_data).filter(([key,]) => key !== 'total').sort(([, a], [, b]) => b - a);

            sortedNodeTypes.forEach(([node_type, count]) => {
                const percentage = count / total_visits_at_level;
                const node_full_key = `${act}-${level}-${node_type}`;
                const node_full_id = `${node_id_base}-${node_type}`;
                const label = node_type_labels[node_type] || node_type[0];


                let style_attr = `width: ${percentage * 100}%;`;
                const node_specific_details = node_details[node_full_key] || {};
                const base_color = node_type_colors[node_type] || '#BDBDBD';

                if (node_type === 'Gap' && node_specific_details.choices) {
                    const choice_colors = { "カード強化": "#FFB74D", "休憩": "#81C784", "その他": "#BDBDBD" };
                    const choice_map = { "UpgradeCard": "カード強化", "DrinkTea": "休憩", "Rest": "休憩" };

                    let aggregated_choices = {};
                    let other_rate = 0;
                    for (const [choice, stats] of Object.entries(node_specific_details.choices)) {
                        const mapped_choice = choice_map[choice];
                        if (mapped_choice) {
                            aggregated_choices[mapped_choice] = (aggregated_choices[mapped_choice] || 0) + stats.rate;
                        } else {
                            other_rate += stats.rate;
                        }
                    }
                    if (other_rate > 0) aggregated_choices["その他"] = other_rate;

                    let gradient_parts_bottom = [];
                    let current_pos = 0;
                    for (const choice_name of ["休憩", "カード強化", "その他"]) {
                        if (aggregated_choices[choice_name]) {
                            const rate = aggregated_choices[choice_name];
                            const color = choice_colors[choice_name];
                            gradient_parts_bottom.push(`${color} ${current_pos * 100}%`);
                            current_pos += rate;
                            gradient_parts_bottom.push(`${color} ${current_pos * 100}%`);
                        }
                    }
                    if (gradient_parts_bottom.length > 0) {
                        const bottom_gradient = `linear-gradient(to right, ${gradient_parts_bottom.join(', ')})`;
                        const top_gradient = `linear-gradient(${base_color}, ${base_color})`;
                        style_attr += ` background-image: ${bottom_gradient}, ${top_gradient}; background-size: 100% 50%, 100% 100%; background-position: bottom, top; background-repeat: no-repeat;`;
                    } else {
                         style_attr += ` background-color: ${base_color};`;
                    }

                } else if (node_type === 'Shop' && node_specific_details) {
                    const remove_rate = node_specific_details.remove_card_rate || 0;
                    const upgrade_rate = node_specific_details.upgrade_card_rate || 0;
                    const other_rate = Math.max(0, 1 - remove_rate - upgrade_rate);

                    let gradient_parts_bottom = [];
                    let current_pos = 0;

                    gradient_parts_bottom.push(`#42A5F5 ${current_pos * 100}%`);
                    current_pos += remove_rate;
                    gradient_parts_bottom.push(`#42A5F5 ${current_pos * 100}%`);
                    gradient_parts_bottom.push(`#FFB74D ${current_pos * 100}%`);
                    current_pos += upgrade_rate;
                    gradient_parts_bottom.push(`#FFB74D ${current_pos * 100}%`);
                    if (other_rate > 0.001) {
                        gradient_parts_bottom.push(`#90CAF9 ${current_pos * 100}%`);
                        current_pos += other_rate;
                        gradient_parts_bottom.push(`#90CAF9 ${current_pos * 100}%`);
                    }

                    const bottom_gradient = `linear-gradient(to right, ${gradient_parts_bottom.join(', ')})`;
                    const top_gradient = `linear-gradient(${base_color}, ${base_color})`;
                    style_attr += ` background-image: ${bottom_gradient}, ${top_gradient}; background-size: 100% 50%, 100% 100%; background-position: bottom, top; background-repeat: no-repeat;`;

                } else {
                    style_attr += ` background-color: ${base_color};`;
                }

                barHtml += `<div id="bar-${node_full_id}" class="node-choice-segment" style="${style_attr}" title="${node_type}: ${(percentage * 100).toFixed(1)}%" onmouseover="startNodeDetailTimer('${node_full_id}')" onmouseout="cancelNodeDetailTimer()">${label}</div>`;
            });
            barHtml += '</div></div>';
            actHtmlSegment += barHtml;

            // 各ノード（マス）の詳細パネルを生成するループ
            Object.keys(level_data).forEach(node_type => {
                if (node_type === 'total') return;

                const node_full_key = `${act}-${level}-${node_type}`;
                const visit_count = level_data[node_type] || 0;
                const details_id = `details-${node_full_key}`;

                // 1. データの取得
                const node_specific_details = node_details[node_full_key] || {};

                let details_content = `<h4>Act ${act} - Level ${level} (${node_type}) - ${UI_TEXT.traversal_count}: (${visit_count} / ${total_runs}) ${(visit_count / total_runs * 100).toFixed(1)}%</h4>`;

                let has_content = false;
                let top_section_html = "";
                let card_grid_content = "";
                let exhibit_grid_content = "";

                // --- 2. ノードタイプ別の詳細表示 (Enemy / Shop / Gap) ---

                // 通常敵・エリート・ボスの統計
                if (['Enemy', 'EliteEnemy', 'Boss'].includes(node_type) && node_specific_details.enemies) {
                    has_content = true;
                    const enemy_data = node_specific_details.enemies;
                    const scales = node_specific_details.scales || {};
                    const sorted_enemies = Object.values(enemy_data).sort((a, b) => b.rate - a.rate);

                    let table_html = `<h5>${UI_TEXT.encounter_title || '出現する敵'}</h5><table class="enemy-stats-table">`;
                    table_html += `<thead><tr><th>${UI_TEXT.enemy_table_metric}</th>${sorted_enemies.map(e => `<th>${e[lang]}</th>`).join('')}</tr></thead><tbody>`;
                    table_html += `<tr><td>${UI_TEXT.enemy_table_rate}</td>${sorted_enemies.map(e => `<td>${(e.rate * 100).toFixed(1)}%</td>`).join('')}</tr>`;
                    table_html += `<tr><td>${UI_TEXT.enemy_table_avg_t}</td>${sorted_enemies.map(e => `<td>${e.avg_turns.toFixed(1)}${createInlineBoxplotHtml(e.turns_boxplot, scales.turns_min, scales.turns_max)}</td>`).join('')}</tr>`;
                    table_html += `<tr><td>${UI_TEXT.enemy_table_hp}</td>${sorted_enemies.map(e => `<td style='background-color:${getColorForValue(e.avg_hp_loss, act_stats[act].hp_min, act_stats[act].hp_max)}'>${(-e.avg_hp_loss).toFixed(1)}${createInlineBoxplotHtml(e.hp_loss_boxplot, scales.hp_loss_min, scales.hp_loss_max, true)}</td>`).join('')}</tr>`;
                    table_html += `<tr><td>${UI_TEXT.enemy_table_p}</td>${sorted_enemies.map(e => `<td style='background-color:${getColorForValue(e.avg_p_change, act_stats[act].p_min, act_stats[act].p_max, true)}'>${e.avg_p_change.toFixed(1)}${createInlineBoxplotHtml(e.p_change_boxplot, scales.p_change_min, scales.p_change_max)}</td>`).join('')}</tr>`;

                    // サンプルデッキのリンク（敵ごと）
                    table_html += `<tr><td>${UI_TEXT.sample_decks_title || 'サンプル'}</td>`;
                    table_html += sorted_enemies.map(e => {
                        const sampleRuns = e.sample_runs || [];
                        if (sampleRuns.length === 0) return '<td>-</td>';
                        const links = sampleRuns.map((run, index) => {
                            const sv = run.version.split('.').slice(0, 3).join('.');
                            const url = `https://lbol-logs.github.io/${sv}/${run.run_id}/?a=${act}&l=${Math.max(0, parseInt(level) - 1)}`;
                            return `<a href="${url}" target="_blank">${index + 1}</a>`;
                        }).join(' ');
                        return `<td>${links}</td>`;
                    }).join('');

                    table_html += '</tr></tbody></table>';
                    top_section_html = table_html;
                }

                // ショップ (Shop) の統計
                else if (node_type === 'Shop' && node_specific_details) {
                    let shop_choices_html = `<h5>${UI_TEXT.choice_rates_title || '選択肢の割合'}</h5><ul class="details-list">`;
                    let has_shop_choices = false;
                    if (node_specific_details.remove_card_rate != null) {
                        shop_choices_html += `<li>${UI_TEXT.shop_remove_card || 'カードの削除'}: ${(node_specific_details.remove_card_rate * 100).toFixed(1)}%</li>`;
                        has_shop_choices = true;
                    }
                    if (node_specific_details.upgrade_card_rate != null) {
                        shop_choices_html += `<li>${UI_TEXT.shop_upgrade_card || 'カードの強化'}: ${(node_specific_details.upgrade_card_rate * 100).toFixed(1)}%</li>`;
                        has_shop_choices = true;
                    }
                    shop_choices_html += '</ul>';
                    if (has_shop_choices) {
                        top_section_html = shop_choices_html;
                        has_content = true;
                    }
                }

                // 休憩所 (Gap) の統計
                else if (node_type === 'Gap' && node_specific_details.choices) {
                    has_content = true;
                    let gap_choices_html = `<h5>${UI_TEXT.choice_rates_title || '選択肢の割合'}</h5><ul class="details-list">`;

                    const choice_map = {
                        "UpgradeCard": UI_TEXT.gap_upgrade || "カード強化",
                        "DrinkTea": UI_TEXT.gap_rest || "休憩",
                        "Rest": UI_TEXT.gap_rest || "休憩"
                    };
                    const other_label = UI_TEXT.gap_other || "その他";

                    let aggregated_choices = {};
                    let other_rate = 0;

                    for (const [choice, stats] of Object.entries(node_specific_details.choices)) {
                        const rate = (stats && typeof stats === 'object') ? (stats.rate || 0) : stats;
                        if (choice_map[choice]) {
                            aggregated_choices[choice_map[choice]] = (aggregated_choices[choice_map[choice]] || 0) + rate;
                        } else {
                            other_rate += rate;
                        }
                    }

                    if (other_rate > 0) aggregated_choices[other_label] = other_rate;

                    // 「休憩」「カード強化」「その他」の順に並べて表示
                    [UI_TEXT.gap_rest || "休憩", UI_TEXT.gap_upgrade || "カード強化", other_label].forEach(label => {
                        if (aggregated_choices[label] !== undefined && aggregated_choices[label] > 0) {
                            gap_choices_html += `<li>${label}: ${(aggregated_choices[label] * 100).toFixed(1)}%</li>`;
                        }
                    });

                    gap_choices_html += '</ul>';
                    top_section_html = gap_choices_html;
                }

                // --- 3. サンプルデッキ (全ノード共通) ---
                let sampleDecksHtml = '';
                if (node_specific_details.sample_runs && node_specific_details.sample_runs.length > 0) {
                    has_content = true;
                    const listItems = node_specific_details.sample_runs.map((run, index) => {
                        const sv = run.version.split('.').slice(0, 3).join('.');
                        const url = `https://lbol-logs.github.io/${sv}/${run.run_id}/?a=${act}&l=${level}`;
                        return `<li><a href="${url}" target="_blank" title="${run.deck.join(', ')}">${index + 1}</a></li>`;
                    }).join('');

                    sampleDecksHtml = `
                        <div class="details-section">
                            <h5>${UI_TEXT.sample_decks_title || 'サンプルデッキ'}</h5>
                            <ol class="sample-deck-list">${listItems}</ol>
                        </div>
                    `;
                }

                // --- 4. カード・展示品のアクション (全ノード共通) ---
                const node_actions = node_specific_details.event_actions || {};
                ['Card', 'Exhibit'].forEach(item_type => {
                    ['Add', 'Remove', 'Upgrade'].forEach(action_type => {
                        const items = node_actions[`${action_type}_${item_type}`];
                        if (items && items.length > 0) {
                            has_content = true;
                            const lookup_table = (item_type === 'Card') ? ALL_DATA.lookup_tables.cards : ALL_DATA.lookup_tables.exhibits;
                            const name_key = (lang === 'ja') ? 'JA' : 'EN';

                            const list_items = items.map(([item_id, count]) => {
                                const item_info = lookup_table[item_id] || {};
                                const display_name = item_info[name_key] || item_id;
                                return `<li>${createWikiLink(display_name, item_type.toLowerCase(), lang)} (${count})</li>`;
                            }).join('');

                            const action_title = UI_TEXT[`${action_type.toLowerCase()}_${item_type.toLowerCase()}`] || `${action_type} ${item_type}`;
                            const html = `<div><h5>${action_title}</h5><ol>${list_items}</ol></div>`;

                            if (item_type === 'Card') card_grid_content += html;
                            else exhibit_grid_content += html;
                        }
                    });
                });

                // --- 5. 最終組み立て ---
                if (top_section_html) details_content += `<div class="details-section">${top_section_html}</div>`;
                if (sampleDecksHtml) details_content += sampleDecksHtml;
                if (card_grid_content) details_content += `<div class="details-section"><h5>${UI_TEXT.card_section_title || 'カード関連'}</h5><div class="details-grid">${card_grid_content}</div></div>`;
                if (exhibit_grid_content) details_content += `<div class="details-section"><h5>${UI_TEXT.exhibit_section_title || '展示品関連'}</h5><div class="details-grid">${exhibit_grid_content}</div></div>`;

                if (!has_content) details_content += `<p>${UI_TEXT.no_data}</p>`;

                detailsPanelHtml += `<div id="${details_id}" class="node-details">${details_content}</div>`;
            });
        });
        actHtmlSegment += '</div>';
        flowChartHtml += actHtmlSegment;
    }

    flowChartHtml += '</div></div>';
    detailsPanelHtml += '</div>';

    container.innerHTML = `<div class='analysis-section'>
        <h3>${UI_TEXT.node_selection_title}</h3>
        <p>${UI_TEXT.node_selection_desc}</p>
        <div class='route-analysis-wrapper'>${flowChartHtml}${detailsPanelHtml}</div>
    </div>`;
}


/**
 * ルートノードの詳細表示タイマーを開始します。
 * @param {string} nodeId 表示するノードのID
 */
function startNodeDetailTimer(nodeId) {
    // 既に他のタイマーが動いていたらキャンセルする
    cancelNodeDetailTimer();
    // 指定した時間後に showNodeDetails を実行するタイマーをセット
    routeNodeHoverTimer = setTimeout(() => {
        showNodeDetails(nodeId);
    }, ROUTE_NODE_HOVER_DELAY);
}

/**
 * ルートノードの詳細表示タイマーをキャンセルします。
 */
function cancelNodeDetailTimer() {
    clearTimeout(routeNodeHoverTimer);
}


function showNodeDetails(nodeId) {
    document.querySelectorAll('#route-details-panel-content .node-details').forEach(el => el.classList.remove('active'));
    const placeholder = document.querySelector('#route-details-panel-content > p');
    if (placeholder) placeholder.style.display = 'none';
    const detailsElement = document.getElementById('details-' + nodeId);
    if (detailsElement) {
        detailsElement.classList.add('active');
    } else {
        if (placeholder) placeholder.style.display = 'block';
    }
}

function getColorForValue(value, v_min, v_max, reverse_color = false) {
    if (v_min === v_max) return 'rgba(255, 255, 255, 0)';
    let norm_val = (value - v_min) / (v_max - v_min);
    norm_val = Math.max(0, Math.min(1, norm_val));
    if (reverse_color) norm_val = 1 - norm_val;
    let r, g;
    if (norm_val < 0.5) {
        r = Math.round(255 * (norm_val * 2));
        g = 255;
    } else {
        r = 255;
        g = Math.round(255 * (1 - (norm_val - 0.5) * 2));
    }
    return `rgba(${r}, ${g}, 0, 0.4)`;
}

function createInlineBoxplotHtml(boxplot_data, scale_min, scale_max, is_negative = false) {
    if (!boxplot_data) return "";
    let { min: b_min, q1, median, q3, max: b_max, mean } = boxplot_data;

    let calc_b_min, calc_q1, calc_median, calc_q3, calc_b_max, calc_mean;
    let calc_scale_min, calc_scale_max;

    if (is_negative) {
        [calc_b_min, calc_q1, calc_median, calc_q3, calc_b_max, calc_mean] = [-b_max, -q3, -median, -q1, -b_min, -mean];
        [calc_scale_min, calc_scale_max] = [-scale_max, -scale_min];
    } else {
        [calc_b_min, calc_q1, calc_median, calc_q3, calc_b_max, calc_mean] = [b_min, q1, median, q3, b_max, mean];
        [calc_scale_min, calc_scale_max] = [scale_min, scale_max];
    }

    const data_range = calc_scale_max - calc_scale_min;
    if (data_range <= 0) return "";

    const to_percent = (val) => {
        const clipped_val = Math.max(calc_scale_min, Math.min(calc_scale_max, val));
        return (clipped_val - calc_scale_min) / data_range * 100;
    };

    const [p_min, q1_pos, median_pos, q3_pos, p_max, mean_pos] =
        [calc_b_min, calc_q1, calc_median, calc_q3, calc_b_max, calc_mean].map(to_percent);

    const box_left = q1_pos, box_width = q3_pos - q1_pos;
    const w1_left = p_min, w1_width = q1_pos - p_min;
    const w2_left = q3_pos, w2_width = p_max - q3_pos;


    // 翻訳テキストを取得するためのオブジェクト（UI_TEXTはグローバル変数です）
    const labels = {
        min: UI_TEXT.boxplot_min || '最小',
        q1: UI_TEXT.boxplot_q1 || '25%',
        median: UI_TEXT.boxplot_median || '中央',
        q3: UI_TEXT.boxplot_q3 || '75%',
        max: UI_TEXT.boxplot_max || '最大',
        mean: UI_TEXT.boxplot_mean || '平均'
    };

    // 翻訳テキストを使ってツールチップ文字列を組み立てる
    const tooltip = is_negative
        ? `${labels.min}: ${(-b_max).toFixed(1)}, ${labels.q1}: ${(-q3).toFixed(1)}, ${labels.median}: ${(-median).toFixed(1)}, ${labels.q3}: ${(-q1).toFixed(1)}, ${labels.max}: ${(-b_min).toFixed(1)}, ${labels.mean}: ${(-mean).toFixed(1)}`
        : `${labels.min}: ${b_min.toFixed(1)}, ${labels.q1}: ${q1.toFixed(1)}, ${labels.median}: ${median.toFixed(1)}, ${labels.q3}: ${q3.toFixed(1)}, ${labels.max}: ${b_max.toFixed(1)}, ${labels.mean}: ${mean.toFixed(1)}`;


    const label_start = is_negative ? (-scale_max).toFixed(0) : scale_min.toFixed(0);
    const label_end = is_negative ? (-scale_min).toFixed(0) : scale_max.toFixed(0);

    return `<div class="inline-boxplot" title="${tooltip}">
        <div class="inline-boxplot-chart">
            <div class="inline-boxplot-whisker" style="left: ${w1_left}%; width: ${w1_width}%;"></div>
            <div class="inline-boxplot-box" style="left: ${box_left}%; width: ${box_width}%;"></div>
            <div class="inline-boxplot-whisker" style="left: ${w2_left}%; width: ${w2_width}%;"></div>
            <div class="inline-boxplot-median" style="left: ${median_pos}%;"></div>
            <div class="inline-boxplot-mean" style="left: ${mean_pos}%;"></div>
        </div>
        <div class="inline-boxplot-labels">
            <span>${label_start}</span>
            <span>${label_end}</span>
        </div>
    </div>`;
}

function renderEnemyAnalysisTab(char, lang) {
    const container = document.getElementById('enemy-analysis-tab');
    if (!container) return;
    const enemyData = ALL_DATA.enemy_data;
    if (!enemyData || enemyData.length === 0) {
        container.innerHTML = `<div class='analysis-section'><h3>${UI_TEXT.enemy_analysis_title}</h3><p>${UI_TEXT.no_data}</p></div>`;
        return;
    }

    const allChars = [...new Set(enemyData.map(d => d.Character))].sort();
    const dropdownHtml = `
        <div style="margin-bottom: 15px;">
            <label for="char-select-enemy-analysis" style="margin-right: 10px;"><b>${UI_TEXT.char_select_label}</b></label>
            <select id="char-select-enemy-analysis" onchange="switchEnemyAnalysisCharacter(this.value)">
                ${allChars.map(c => `<option value="${c}"${c === char ? ' selected' : ''}>${c}</option>`).join('')}
            </select>
        </div>`;

    let allTablesHtml = '';
    allChars.forEach(charOption => {
        const enemyDfChar = enemyData.filter(d => d.Character === charOption);
        const displayStyle = charOption === char ? 'block' : 'none';
        const tableId = `enemy-analysis-table-${charOption}`;

        const headers = `
            <th class="col-act" onclick="sortTable('${tableId}', 0, 'numeric')">${UI_TEXT.enemy_table_act}</th>
            <th class="col-name" onclick="sortTable('${tableId}', 1, 'string')">${UI_TEXT.enemy_table_name}</th>
            <th class="col-encounters" onclick="sortTable('${tableId}', 2, 'numeric')">${UI_TEXT.enemy_table_encounters}</th>
            <th class="col-stats" onclick="sortTable('${tableId}', 3, 'numeric')">${UI_TEXT.enemy_table_avg_t}</th>
            <th class="col-stats" onclick="sortTable('${tableId}', 4, 'numeric')">${UI_TEXT.enemy_table_hp}</th>
            <th class="col-stats" onclick="sortTable('${tableId}', 5, 'numeric')">${UI_TEXT.enemy_table_p}</th>`;

        const typeOrderMap = { 'Enemy': 0, 'EliteEnemy': 1, 'Boss': 2 };
        const sortedData = enemyDfChar.sort((a, b) => a.Act - b.Act || (typeOrderMap[a.Type] - typeOrderMap[b.Type]) || a.MinLevel - b.MinLevel);

        const actScales = {};
        const actStats = {};
        const acts = [...new Set(sortedData.map(d => d.Act))];

        acts.forEach(act => {
            const actData = sortedData.filter(d => d.Act === act);
            actStats[act] = {
                hp_loss_min: Math.min(...actData.map(d => d.Avg_HP_Loss)),
                hp_loss_max: Math.max(...actData.map(d => d.Avg_HP_Loss)),
                p_change_min: Math.min(...actData.map(d => d.Avg_P_Change)),
                p_change_max: Math.max(...actData.map(d => d.Avg_P_Change)),
            };
            actScales[act] = {
                turns_min: Math.min(...actData.map(d => d.TurnsBoxplot?.min ?? Infinity)),
                turns_max: Math.max(...actData.map(d => d.TurnsBoxplot?.max ?? -Infinity)),
                hp_loss_min: Math.min(...actData.map(d => d.HpLossBoxplot?.min ?? Infinity)),
                hp_loss_max: Math.max(...actData.map(d => d.HpLossBoxplot?.max ?? -Infinity)),
                p_change_min: Math.min(...actData.map(d => d.PChangeBoxplot?.min ?? Infinity)),
                p_change_max: Math.max(...actData.map(d => d.PChangeBoxplot?.max ?? -Infinity)),
            };
        });

        const rows = sortedData.map(row => {
            const nameCol = (lang === 'ja') ? 'EnemyName_JA' : 'EnemyName_EN';
            const trClass = row.Type === 'EliteEnemy' ? 'elite-enemy' : row.Type === 'Boss' ? 'boss-enemy' : '';

            const scales = actScales[row.Act] || {};
            const turnsBoxplotHtml = createInlineBoxplotHtml(row.TurnsBoxplot, scales.turns_min, scales.turns_max);
            const hpLossBoxplotHtml = createInlineBoxplotHtml(row.HpLossBoxplot, scales.hp_loss_min, scales.hp_loss_max, true);
            const pChangeBoxplotHtml = createInlineBoxplotHtml(row.PChangeBoxplot, scales.p_change_min, scales.p_change_max);

            const statsForAct = actStats[row.Act] || {};
            const hpColor = getColorForValue(row.Avg_HP_Loss, statsForAct.hp_loss_min, statsForAct.hp_loss_max, false);
            const pColor = getColorForValue(row.Avg_P_Change, statsForAct.p_change_min, statsForAct.p_change_max, true);

            return `
                <tr class="${trClass}">
                    <td>${row.Act}</td>
                    <td>${row[nameCol]}</td>
                    <td>${row.Encounters}</td>
                    <td>${(row.Avg_Turns || 0).toFixed(1)}${turnsBoxplotHtml}</td>
                    <td style="background-color: ${hpColor};">${(-(row.Avg_HP_Loss || 0)).toFixed(1)}${hpLossBoxplotHtml}</td>
                    <td style="background-color: ${pColor};">${(row.Avg_P_Change || 0).toFixed(1)}${pChangeBoxplotHtml}</td>
                </tr>`;
        }).join('');

        allTablesHtml += `
            <div id="enemy-table-${charOption}" class="enemy-analysis-char-table" style="display: ${displayStyle};">
                <div id="enemy-analysis-table-wrapper-${charOption}">
                    <table id="${tableId}" class="sortable-table">
                        <thead><tr>${headers}</tr></thead>
                        <tbody>${rows}</tbody>
                    </table>
                </div>
            </div>`;
    });

    container.innerHTML = `<div class='analysis-section'><h3>${UI_TEXT.enemy_analysis_title}</h3>${dropdownHtml}${allTablesHtml}</div>`;
}

function switchEnemyAnalysisCharacter(selectedChar) {
    document.querySelectorAll('.enemy-analysis-char-table').forEach(table => table.style.display = 'none');
    const tableToShow = document.getElementById(`enemy-table-${selectedChar}`);
    if (tableToShow) tableToShow.style.display = 'block';
}

function sortTable(tableId, columnIndex, type) {
    const table = document.getElementById(tableId);
    if (!table) return;
    const tbody = table.querySelector('tbody');
    const rows = Array.from(tbody.querySelectorAll('tr'));
    const header = table.querySelector(`th:nth-child(${columnIndex + 1})`);
    if (!header) return;
    const isAsc = !header.classList.contains('sorted-asc');
    table.querySelectorAll('th').forEach(th => th.classList.remove('sorted-asc', 'sorted-desc'));
    header.classList.toggle('sorted-asc', isAsc);
    header.classList.toggle('sorted-desc', !isAsc);
    rows.sort((a, b) => {
        let valA = a.cells[columnIndex].textContent.trim();
        let valB = b.cells[columnIndex].textContent.trim();
        if (type === 'numeric') {
            const numA = parseFloat(valA.replace(/[()]/g, '')) || 0;
            const numB = parseFloat(valB.replace(/[()]/g, '')) || 0;
            return isAsc ? numA - numB : numB - numA;
        }
        return isAsc ? valA.localeCompare(valB, undefined, {numeric: true}) : valB.localeCompare(valA, undefined, {numeric: true});
    });
    rows.forEach(row => tbody.appendChild(row));
}


/**
 * Gap/Shopでのカード強化ランキングのHTMLを生成します。
 */
function createUpgradeRankingHtml(rankingData, cardNameCol, lang) {
    const topN = 20;
    const sortedData = [...rankingData]
        .sort((a, b) => b.Upgrade_Count - a.Upgrade_Count)
        .slice(0, topN);

    if (sortedData.length === 0) return '';

    const isJa = lang === 'ja';
    const title = isJa ? 'Gap/Shop カード強化ランキング' : 'Gap/Shop Card Upgrade Ranking';
    const description = isJa ? 'GapまたはShopで強化された回数の多いカードです。' : 'Cards most frequently upgraded at Gaps or Shops.';
    const countLabel = isJa ? '強化回数' : 'Upgrades';


    const splitPoint = Math.ceil(sortedData.length / 2);
    const col1Data = sortedData.slice(0, splitPoint);
    const col2Data = sortedData.slice(splitPoint);

    const createLi = (d) => {
        const cardName = d[cardNameCol];
        const stats = `${countLabel}: ${d.Upgrade_Count}`;
        return `<li><strong class="spotlight-card" data-card-name="${d['Card_Name']}" style="cursor:pointer;">${cardName}</strong> (${stats})</li>`;
    };

    const listItems1 = col1Data.map(createLi).join('');
    const listItems2 = col2Data.map(createLi).join('');

    const listHtml = `
        <div style="display: flex; gap: 40px; flex-wrap: wrap;">
            <ol style="padding-left: 25px; flex: 1; margin-top: 0; min-width: 300px;">${listItems1}</ol>
            ${col2Data.length > 0 ? `<ol start="${splitPoint + 1}" style="padding-left: 25px; flex: 1; margin-top: 0; min-width: 300px;">${listItems2}</ol>` : ''}
        </div>
    `;

    return `<div class="analysis-section"><h3>${title}</h3><p>${description}</p>${listHtml}</div>`;

}

/**
 * Shopでのカード削除ランキングのHTMLを生成します。
 */
function createRemoveRankingHtml(rankingData, cardNameCol, lang) {
    const topN = 20;
    const sortedData = [...rankingData]
        .sort((a, b) => b.Remove_Count - a.Remove_Count)
        .slice(0, topN);

    if (sortedData.length === 0) return '';

    const isJa = lang === 'ja';
    const title = isJa ? 'Shop カード削除ランキング' : 'Shop Card Remove Ranking';
    const description = isJa ? 'Shopで削除された回数の多いカードです。初期デッキのカードが多くランクインする傾向があります。' : 'Cards most frequently removed at Shops. Initial deck cards tend to rank high.';
    const countLabel = isJa ? '削除回数' : 'Removes';


    const splitPoint = Math.ceil(sortedData.length / 2);
    const col1Data = sortedData.slice(0, splitPoint);
    const col2Data = sortedData.slice(splitPoint);

    const createLi = (d) => {
        const cardName = d[cardNameCol];
        const stats = `${countLabel}: ${d.Remove_Count}`;
        return `<li><strong class="spotlight-card" data-card-name="${d['Card_Name']}" style="cursor:pointer;">${cardName}</strong> (${stats})</li>`;
    };

    const listItems1 = col1Data.map(createLi).join('');
    const listItems2 = col2Data.map(createLi).join('');

    const listHtml = `
        <div style="display: flex; gap: 40px; flex-wrap: wrap;">
            <ol style="padding-left: 25px; flex: 1; margin-top: 0; min-width: 300px;">${listItems1}</ol>
            ${col2Data.length > 0 ? `<ol start="${splitPoint + 1}" style="padding-left: 25px; flex: 1; margin-top: 0; min-width: 300px;">${listItems2}</ol>` : ''}
        </div>
    `;

    return `<div class="analysis-section"><h3>${title}</h3><p>${description}</p>${listHtml}</div>`;

}



function renderActTrendTab(lang) {
    const container = document.getElementById('act-trend-tab');
    if (!container) return;

    const trendData = ALL_DATA.act_trend_data;
    const totalRuns = ALL_DATA.route_data.total_runs;
    const totalRunsAll = ALL_DATA.metadata.total_runs_all_characters || 1;
    const globalNodeVisits = ALL_DATA.route_data.global_node_visits || {};

    if (!trendData || !totalRuns || Object.keys(trendData).length === 0) {
        container.innerHTML = `<div class='analysis-section'><p>${UI_TEXT.no_data || 'データなし'}</p></div>`;
        return;
    }


    // ... (nodeTypeLabels, exhibitCategoryMap, acts, subTabsHtml の定義) ...
    const nodeTypeLabels = (lang === 'ja')
        ? { 'Enemy': '通常敵', 'EliteEnemy': 'エリート', 'Boss': 'ボス', 'Shop': 'ショップ', 'Gap': 'スキマ', 'Adventure': 'イベント', 'Trade': '交換', 'Supply': '補給', 'Entry': '入口' }
        : { 'Enemy': 'Enemy', 'EliteEnemy': 'Elite', 'Boss': 'Boss', 'Shop': 'Shop', 'Gap': 'Gap', 'Adventure': 'Event', 'Trade': 'Trade', 'Supply': 'Supply', 'Entry': 'Entry' };

    const exhibitCategoryMap = {};
    if (ALL_DATA.exhibit_data) {
        ALL_DATA.exhibit_data.forEach(ex => {
            exhibitCategoryMap[ex.Exhibit_ID] = ex.Display_Category;
        });
    }

    const acts = ['1', '2', '3', '4', 'Total'];
    let subTabsHtml = '<div class="sub-tab-buttons" style="margin-bottom: 20px;">';
    acts.forEach((act, index) => {
        const activeClass = index === 0 ? 'active' : '';
        const label = act === 'Total' ? (lang === 'ja' ? '全体 (Total)' : 'Total') : `Act ${act}`;
        subTabsHtml += `<button class="filter-btn ${activeClass}" onclick="switchActTrend('${act}')">${label}</button>`;
    });
    subTabsHtml += '</div>';


    let contentHtml = '';
    acts.forEach((act, index) => {
        const displayStyle = index === 0 ? 'block' : 'none';
        const actData = trendData[act] || trendData[parseInt(act)] || {};
        const globalActData = globalNodeVisits[act] || globalNodeVisits[parseInt(act)] || {};

        const categories = [
            { key: 'Add_Card', title: (lang === 'ja' ? 'よく追加されるカード' : 'Added Cards'), type: 'card' },
            { key: 'Remove_Card', title: (lang === 'ja' ? 'よく削除されるカード' : 'Removed Cards'), type: 'card' },
            { key: 'Upgrade_Card', title: (lang === 'ja' ? 'よく強化されるカード' : 'Upgraded Cards'), type: 'card' },
            { key: 'Add_Exhibit', title: (lang === 'ja' ? 'よく追加される展示品' : 'Added Exhibits'), type: 'exhibit' }
        ];

        if (['1', '2', '3', 'Total'].includes(String(act))) {
            categories.push({
                key: 'Organize_Card',
                title: (lang === 'ja' ? '整頓対象(Boss削除変化)' : 'Organized Item (Boss Removal Change)'),
                type: 'card'
            });
        }

        categories.push({ key: 'Node_Visits', title: (lang === 'ja' ? '踏破マスの内訳' : 'Node Visits'), type: 'node' });
        let gridHtml = '<div style="display: grid; grid-template-columns: repeat(auto-fit, minmax(320px, 1fr)); gap: 20px;">';

        categories.forEach(cat => {
            const items = actData[cat.key] || {};
            let totalCount = Object.values(items).reduce((sum, count) => sum + count, 0);
            const avgTotal = (totalRuns > 0) ? (totalCount / totalRuns).toFixed(1) : "0.0";
            const titleWithAvg = `${cat.title} <span style="font-size:0.85em; font-weight:normal; color:#666;">(${avgTotal})</span>`;

            let categoryBlockHtml = `<div class="analysis-section" style="margin: 0;"><h4 style="margin-top: 0; border-bottom: 2px solid #eee; padding-bottom: 10px;">${titleWithAvg}</h4>`;

            if (cat.type === 'card' || cat.type === 'exhibit') {
                const sortedItems = Object.entries(items).sort(([, a], [, b]) => b - a).slice(0, 100);
                let removeRankMap = {};
                if (cat.key === 'Organize_Card') {
                    const removeItems = actData['Remove_Card'] || {};
                    const sortedRemoveIds = Object.entries(removeItems).sort(([, a], [, b]) => b - a).map(([id]) => id);
                    sortedRemoveIds.forEach((id, idx) => { removeRankMap[id] = idx + 1; });
                }

                if (sortedItems.length === 0) {
                    categoryBlockHtml += `<p style="color: #999; text-align: center; padding: 20px 0;">${UI_TEXT.no_data || 'データなし'}</p>`;
                } else {
                    const headerRank = '#';
                    const headerName = cat.type === 'card' ? (lang === 'ja' ? 'カード名' : 'Card Name') : (lang === 'ja' ? '展示品名' : 'Exhibit Name');
                    const headerAvg = lang === 'ja' ? 'Avg/Run' : 'Avg/Run';
                    categoryBlockHtml += `<div style="max-height: 600px; overflow-y: auto;"><table class="act-trend-table" style="width: 100%; border-collapse: collapse;"><thead><tr style="text-align: left; position: sticky; top: 0; background: #f8f8f8;"><th style="padding: 8px; width: 40px;">${headerRank}</th><th style="padding: 8px;">${headerName}</th><th style="padding: 8px; width: 80px;">${headerAvg}</th></tr></thead><tbody>`;

                    sortedItems.forEach(([id, count], index) => {
                        const currentRank = index + 1;
                        const perRun = (count / totalRuns).toFixed(2);
                        let name = id;
                        let bgColor = '#FFFFFF';
                        let isBold = false;
                        if (cat.key === 'Organize_Card') {
                            const removeRank = removeRankMap[id] || 999;
                            if (removeRank - currentRank >= 3) {
                                isBold = true;
                            }
                        }
                        const nameStyle = isBold ? 'font-weight: 900 !important; color: #000 !important;' : '';

                        if (cat.type === 'card') {
                            const cardInfo = ALL_DATA.lookup_tables.cards[id];
                            let displayName = cardInfo ? (lang === 'ja' ? cardInfo.JA : cardInfo.EN) : id;
                            name = createWikiLink(displayName, 'card', lang);
                            const cardType = cardInfo ? cardInfo.Type : 'Unknown';
                            const typeColor = TYPE_COLOR_MAP[cardType] || TYPE_COLOR_MAP['Unknown'];
                            bgColor = `${typeColor}33`;


                            // 道具カードと厄災カードにアイコンを追加
                            if (cardType === 'Tool') {
                                name = '🧰 ' + name; // アイコンとスペースを前に追加
                            } else if (cardType === 'Misfortune') {
                                name = '🌀 ' + name; // アイコンとスペースを前に追加
                            }


                        } else { // exhibit
                            const exInfo = ALL_DATA.lookup_tables.exhibits[id];
                            let linkedName = exInfo ? (lang === 'ja' ? exInfo.JA : exInfo.EN) : id;
                            linkedName = createWikiLink(linkedName, 'exhibit', lang);
                            const category = exhibitCategoryMap[id];
                            if (category === '光耀') {
                                const manaType = ALL_DATA.lookup_tables.exhibit_mana_map[id];
                                if (manaType) {
                                    const icon = ALL_DATA.lookup_tables.mana_icon_map[manaType];
                                    if (icon) linkedName = `${icon} ${linkedName}`;
                                }
                                name = `<span class="exhibit-name-shining">${linkedName}</span>`;
                            } else if (category === '一般レア') {
                                name = `<span style="background-color: #fff3c4; padding: 2px 4px; border-radius: 3px;">${linkedName}</span>`;
                            } else if (category === '一般アンコモン') {
                                name = `<span style="background-color: #e8f4ff; padding: 2px 4px; border-radius: 3px;">${linkedName}</span>`;
                            } else if (category === 'ショップ') {
                                name = `🛒 ${linkedName} `;
                            } else if (category === 'イベント') {
                                name = `✨ ${linkedName}`;
                            } else {
                                name = linkedName;
                            }
                        }

                        categoryBlockHtml += `<tr style="background-color: ${bgColor}; border-bottom: 1px solid #eee;"><td style="padding: 6px 8px; text-align: center; ${nameStyle}">${currentRank}</td><td style="padding: 6px 8px; ${nameStyle}">${name}</td><td style="padding: 6px 8px; text-align: right; font-weight: bold; ${nameStyle}">${perRun}</td></tr>`;
                    });
                    categoryBlockHtml += `</tbody></table></div>`;
                }
            } else if (cat.type === 'node') {
                const breakdownRows = [
                    { label: nodeTypeLabels['Enemy'], key: 'Enemy', type: 'node' },
                    { label: nodeTypeLabels['EliteEnemy'], key: 'EliteEnemy', type: 'node' },
                    { label: nodeTypeLabels['Boss'], key: 'Boss', type: 'node' },
                    { label: nodeTypeLabels['Shop'], key: 'Shop', type: 'node' },
                    { label: (lang === 'ja' ? '└ 削除' : '└ Remove'), key: 'Remove', type: 'shop_detail', indent: true },
                    { label: (lang === 'ja' ? '└ 強化' : '└ Upgrade'), key: 'Upgrade', type: 'shop_detail', indent: true },
                    { label: nodeTypeLabels['Gap'], key: 'Gap', type: 'node' },
                    { label: (lang === 'ja' ? '└ 休憩' : '└ Rest'), key: 'Rest', type: 'gap_detail', indent: true },
                    { label: (lang === 'ja' ? '└ 強化' : '└ Upgrade'), key: 'Upgrade', type: 'gap_detail', indent: true },
                    { label: nodeTypeLabels['Adventure'], key: 'Adventure', type: 'node' }
                ];
                const getCount = (dataObj, categoryType, key) => {
                    if (!dataObj) return 0;
                    if (categoryType === 'node') return dataObj.Node_Visits?.[key] || 0;
                    if (categoryType === 'shop_detail') return dataObj.Shop_Details?.[key] || 0;
                    if (categoryType === 'gap_detail') return dataObj.Gap_Details?.[key] || 0;
                    return 0;
                };
                categoryBlockHtml += '<div style="max-height: 600px; overflow-y: auto;"><table class="act-trend-table" style="width: 100%; border-collapse: collapse;">';
                const headerName = lang === 'ja' ? 'マス種類' : 'Node Type';
                const headerAvg = lang === 'ja' ? 'Avg/Run (全キャラ平均)' : 'Avg/Run (Global Avg)';
                categoryBlockHtml += `<thead><tr style="text-align: left; position: sticky; top: 0; background: #f8f8f8;"><th style="padding: 8px;">${headerName}</th><th style="padding: 8px; width: 140px;">${headerAvg}</th></tr></thead><tbody>`;
                breakdownRows.forEach(row => {
                    const count = getCount(actData, row.type, row.key);
                    const globalCount = getCount(globalActData, row.type, row.key);
                    if (count === 0 && globalCount === 0) return;
                    const perRun = (count / totalRuns).toFixed(2);
                    const globalPerRun = (globalCount / totalRunsAll).toFixed(2);
                    const paddingStyle = row.indent ? 'padding-left: 20px; color: #666; font-size: 0.9em;' : 'font-weight: bold;';
                    categoryBlockHtml += `<tr style="border-bottom: 1px solid #eee;"><td style="padding: 6px 8px; ${paddingStyle}">${row.label}</td><td style="padding: 6px 8px; text-align: right;"><span style="font-weight: bold;">${perRun}</span><span style="color: #888; font-size: 0.9em; margin-left: 4px;">(${globalPerRun})</span></td></tr>`;
                });
                categoryBlockHtml += '</tbody></table></div>';
            }
            categoryBlockHtml += '</div>';
            gridHtml += categoryBlockHtml;
        });

        if (act !== 'Total') {
            const stats = actData.Combat_Stats || { Total_Damage: 0, Gap_Recovery: 0 };
            const globalStats = globalActData.Combat_Stats || { Total_Damage: 0, Gap_Recovery: 0 };
            const perfStats = actData.Vs_Performance_Stats || {};
            const devMeta = ALL_DATA.combat_deviation_metadata?.[act] || {};
            const myAvgDmg = stats.Total_Damage / totalRuns;
            const myAvgRec = stats.Gap_Recovery / totalRuns;
            const myAvgCmbRec = (stats.Combat_Recovery || 0) / totalRuns;
            const mySustain = (100 - myAvgDmg - myAvgRec + myAvgCmbRec).toFixed(1);
            const glAvgDmg = globalStats.Total_Damage / totalRunsAll;
            const glAvgRec = globalStats.Gap_Recovery / totalRunsAll;
            const glAvgCmbRec = (globalStats.Combat_Recovery || 0) / totalRunsAll;
            const glSustain = (100 - glAvgDmg - glAvgRec + glAvgCmbRec).toFixed(1);
            const getGradationColor = (val, ref) => {
                const diff = val - ref;
                const range = 15;
                const factor = Math.max(-1, Math.min(1, diff / range));
                if (factor >= 0) {
                    const r = Math.round(241 + factor * (46 - 241));
                    const g = Math.round(196 + factor * (204 - 196));
                    const b = Math.round(15 + factor * (113 - 15));
                    return `rgb(${r},${g},${b})`;
                } else {
                    const f = Math.abs(factor);
                    const r = Math.round(241 + f * (231 - 241));
                    const g = Math.round(196 + f * (76 - 196));
                    const b = Math.round(15 + f * (60 - 15));
                    return `rgb(${r},${g},${b})`;
                }
            };
            const calcTScore = (myAvg, mean, sd) => {
                if (!sd || sd <= 0) return 50.0;
                return (50 + 10 * (mean - myAvg) / sd).toFixed(1);
            };
            const i18n = {
                title: lang === 'ja' ? '性能・リソース指標' : 'Performance Metrics',
                headerItem: lang === 'ja' ? '項目' : 'Item',
                headerValue: lang === 'ja' ? 'スコア' : 'Score',
                sustainability: lang === 'ja' ? '継戦能力' : 'Combat Endurance',
                dmgLoss: lang === 'ja' ? '└ 戦闘での総被弾量' : '└ Total Combat Damage taken',
                gapRec: lang === 'ja' ? '└ スキマでの総回復量' : '└ Total Gap Recovery',
                cmbRec: lang === 'ja' ? '└ 戦闘終了後の純回復' : '└ Post-combat Pure Recovery',
                vsPrefix: lang === 'ja' ? '対' : 'Vs. ',
                vsSuffix: lang === 'ja' ? '性能' : ' Performance',
                atkTurns: lang === 'ja' ? '└ 攻撃性能' : '└ Attack Score',
                defLoss: lang === 'ja' ? '└ 防御性能' : '└ Defense Score'
            };
            let resourceHtml = `<div class="analysis-section" style="margin: 0;"><h4 style="margin-top: 0; border-bottom: 2px solid #3498db; padding-bottom: 10px;">${i18n.title}</h4><table class="act-trend-table" style="width: 100%; border-collapse: collapse; font-size: 0.95em;"><thead><tr style="text-align: left; background: #f8f8f8; border-bottom: 2px solid #eee;"><th style="padding: 8px;">${i18n.headerItem}</th><th style="padding: 8px; text-align: right;">${i18n.headerValue}</th></tr></thead><tbody><tr><td style="padding: 8px; font-weight: bold;">${i18n.sustainability}</td><td style="padding: 8px; text-align: right; font-weight: bold;"><span style="color: ${getGradationColor(mySustain, glSustain)}; font-size: 1.1em;">${mySustain}</span><span style="color: #888; font-weight: normal; margin-left: 5px;">(${glSustain})</span></td></tr><tr style="color: #666; font-size: 0.85em;"><td style="padding-left: 15px;">${i18n.dmgLoss}</td><td style="text-align: right;">${myAvgDmg.toFixed(1)} (${glAvgDmg.toFixed(1)})</td></tr><tr style="color: #666; font-size: 0.85em;"><td style="padding-left: 15px;">${i18n.gapRec}</td><td style="text-align: right;">${myAvgRec.toFixed(1)} (${glAvgRec.toFixed(1)})</td></tr><tr style="color: #27ae60; font-size: 0.85em; border-bottom: 1px solid #eee;"><td style="padding-left: 15px;">${i18n.cmbRec}</td><td style="text-align: right;">+${myAvgCmbRec.toFixed(1)} (+${glAvgCmbRec.toFixed(1)})</td></tr>${['Enemy', 'EliteEnemy', 'Boss'].map(type => { const s = perfStats[type]; const meta = devMeta[type]; if (!s || s.Count === 0 || !meta) return ''; const atkScore = calcTScore(s.Turn_Sum / s.Count, meta.turn_mean, meta.turn_sd); const defScore = calcTScore(s.HP_Loss_Sum / s.Count, meta.hp_mean, meta.hp_sd); const encountersPerRun = s.Count / totalRuns; const perfIndex = ((parseFloat(atkScore) + parseFloat(defScore)) / 2 * encountersPerRun).toFixed(1); const globalEncounters = (globalActData.Node_Visits?.[type] || 0) / totalRunsAll; const globalPerfIndex = (50 * globalEncounters).toFixed(1); const label = nodeTypeLabels[type] || type; const vsPrefix = lang === 'ja' ? '対' : 'Vs. '; const vsSuffix = lang === 'ja' ? '性能' : ' Perf.'; const indexLabel = lang === 'ja' ? '└ 指数 (性能×踏破数)' : '└ Efficiency Index'; return `<tr style="background: #fafafa;"><td colspan="2" style="padding: 4px 8px; font-weight: bold;">${vsPrefix}${label}${vsSuffix}</td></tr><tr><td style="padding-left: 20px; color: #555;">${lang === 'ja' ? '└ 攻撃 (ターン)' : '└ Attack (Turns)'}</td><td style="text-align: right; font-weight: bold; color: ${getGradationColor(atkScore, 50)}">${atkScore}</td></tr><tr><td style="padding-left: 20px; color: #555;">${lang === 'ja' ? '└ 防御 (被弾)' : '└ Defense (Damage)'}</td><td style="text-align: right; font-weight: bold; color: ${getGradationColor(defScore, 50)}">${defScore}</td></tr><tr style="border-bottom: 1px solid #eee;"><td style="padding-left: 20px; color: #333; font-weight: bold;">${indexLabel}</td><td style="text-align: right; font-weight: bold; color: ${getGradationColor(perfIndex, globalPerfIndex)}"><span style="font-size: 1.1em;">${perfIndex}</span><span style="color: #888; font-weight: normal; margin-left: 5px; font-size: 0.9em;">(${globalPerfIndex})</span></td></tr>`; }).join('')}</tbody></table></div>`;
            gridHtml += resourceHtml;
            if (act === '1') {
                const report_ja = ALL_DATA.act1_tendency_report_ja;
                const report_en = ALL_DATA.act1_tendency_report_en;
                const reportToShow = (lang === 'ja' ? report_ja : report_en) || '';
                if (reportToShow) {
                    const reportHtml = `<div class="analysis-section" style="grid-column: 1 / -1; margin-top: 20px; padding: 20px;">${reportToShow}</div>`;
                    gridHtml += reportHtml;
                }
            }
        }
        gridHtml += '</div>';
        contentHtml += `<div id="act-trend-content-${act}" style="display: ${displayStyle};">${gridHtml}</div>`;
    });

    const desc = lang === 'ja'
        ? '各Actにおけるカードや展示品の取得・削除・強化の傾向です。数値は1ランあたりの平均回数です。イベントによる操作も含まれます。<br><strong>※Act 1のみ、より詳細な行動傾向レポートを別途生成します。</strong>'
        : 'Trends in card/exhibit acquisition, removal, and upgrades per Act. Values represent average count per run. Changes caused by events are also included.<br><strong>Note: A more detailed behavioral tendency report is generated separately for Act 1 only.</strong>';

    container.innerHTML = `<div class='analysis-section'><h3>${UI_TEXT.act_trend_tab_title}</h3><p>${desc}</p>${subTabsHtml}${contentHtml}</div>`;


    // Act1のレポート内のテーブルを探してラッパーで囲む
    const act1ReportContainer = container.querySelector('#act-trend-content-1 div[style*="grid-column"]');
    if (act1ReportContainer) {
        const table = act1ReportContainer.querySelector('table');
        if (table) {
            const wrapper = document.createElement('div');
            wrapper.className = 'table-scroll-wrapper';
            // tableの親要素(act1ReportContainer)の子として、tableの前にwrapperを挿入
            table.parentNode.insertBefore(wrapper, table);
            // tableをwrapperの子要素に移動
            wrapper.appendChild(table);
        }
    }

}



/**
 * Act別トレンドの表示を切り替える関数
 */
window.switchActTrend = function(act) {
    console.log("Switching to Act:", act);

    const container = document.getElementById('act-trend-tab');
    if (!container) return;

    // 1. ボタンの active クラス切り替え
    const buttons = container.querySelectorAll('.filter-btn');
    buttons.forEach(btn => {
        // onclick 属性に該当の Act 名が含まれているかチェック
        if (btn.getAttribute('onclick').includes(`'${act}'`)) {
            btn.classList.add('active');
        } else {
            btn.classList.remove('active');
        }
    });

    // 2. コンテンツの表示切り替え
    const contents = container.querySelectorAll('div[id^="act-trend-content-"]');
    contents.forEach(div => {
        if (div.id === `act-trend-content-${act}`) {
            div.style.display = 'block';
        } else {
            div.style.display = 'none';
        }
    });
};

/**
 * "Run Finder"タブのコンテンツを生成・描画する
 * [修正版] ボスフィルターのHTML構造とクラス名を修正
 */
function renderRunFinderTab() {
    const tabContent = document.getElementById('run-finder-tab');
    if (!tabContent) return;
    if (tabContent.innerHTML.trim() !== '') return; // 描画済みなら中断

    // 0. UIテキストを定義
    const texts = {
        title: UI_TEXT.run_finder_title || "Run Finder",
        experimental_warning: UI_TEXT.run_finder_experimental_warning || "<strong>[Experimental Feature]</strong> This search function is under development.",
        data_scope_warning: UI_TEXT.run_finder_data_scope_warning || "※This search can only be performed within the data range used for creating statistics.",
        act_label: UI_TEXT.run_finder_act_label || "Act:",
        level_label: UI_TEXT.run_finder_level_label || "Level:",
        char_label: UI_TEXT.run_finder_char_label || "Character:",
        no_specify: UI_TEXT.run_finder_no_specify || "None",
        include_items_label: UI_TEXT.run_finder_include_items_label || "含むアイテム",
        item_placeholder: UI_TEXT.run_finder_item_placeholder || "カード/展示品名を入力...",
        add_btn: UI_TEXT.run_finder_add_btn || "追加",
        logic_and: UI_TEXT.run_finder_logic_and || "AND (すべて)",
        logic_or: UI_TEXT.run_finder_logic_or || "OR (いずれか)",
        exclude_items_label: UI_TEXT.run_finder_exclude_items_label || "含まないアイテム (指定したものは全て除外)",
        search_btn: UI_TEXT.run_finder_search_btn || "検索実行",
        initial_prompt: UI_TEXT.run_finder_initial_prompt || "Enter search criteria and press the 'Search Runs' button.",
        deck_size_label: UI_TEXT.run_finder_deck_size_label || "Deck Size (at station / final):",
        deck_size_any: UI_TEXT.run_finder_deck_size_any || "Any",
        deck_size_lte: UI_TEXT.run_finder_deck_size_lte || "<=",
        deck_size_gte: UI_TEXT.run_finder_deck_size_gte || ">=",
        deck_size_placeholder: UI_TEXT.run_finder_deck_size_placeholder || "e.g., 10",
        include_bosses_label: UI_TEXT.run_finder_include_bosses_label || "Include Bosses",
        exclude_bosses_label: UI_TEXT.run_finder_exclude_bosses_label || "Exclude Bosses",
        boss_filter_toggle_expand: UI_TEXT.run_finder_boss_filter_expand || "Open Boss filter▼",
        boss_filter_toggle_collapse: UI_TEXT.run_finder_boss_filter_collapse || "Close Boss filte ▲"
    };

    // 1. オートコンプリート用のデータリストを作成
    const allItems = new Set();
    if (ITEM_MASTER_LOOKUP) {
        const nameKey = (LANG === 'ja') ? 'ja' : 'en';
        for (const itemId in ITEM_MASTER_LOOKUP) {
            const itemData = ITEM_MASTER_LOOKUP[itemId];
            if (itemData && itemData[nameKey]) {
                allItems.add(itemData[nameKey]);
            }
        }
    }
    const datalistOptions = Array.from(allItems).sort().map(item => `<option value="${item}"></option>`).join('');

    // 2. キャラクター選択のプルダウンを作成
    let charOptions = `<option value="All">All</option>`;
    if (ALL_DATA && ALL_DATA.all_available_characters) {
        ALL_DATA.all_available_characters.forEach(char => {
            const selected = (char === CURRENT_CHAR) ? 'selected' : '';
            charOptions += `<option value="${char}" ${selected}>${char}</option>`;
        });
    }

    // 3. UIのHTMLを定義
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
                <!-- Row 1: 基本フィルター -->
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

                <!-- Row 2: カード/展示品フィルター -->
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

                <!-- ▼▼▼ Row 3: ボスフィルター (クラス名を修正) ▼▼▼ -->
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
                <!-- ▲▲▲ ボスフィルターここまで ▲▲▲ -->

                <button id="run-search-button" class="primary-search-btn">${texts.search_btn}</button>

            </div>
            <div id="run-finder-results" style="margin-top: 20px;">
                <p>${texts.initial_prompt}</p>
            </div>
        </div>
        <datalist id="all-items-datalist">${datalistOptions}</datalist>
    `;

    tabContent.innerHTML = finderHtml;

    // 4. UIのイベントリスナーを設定
    document.getElementById('run-search-button').addEventListener('click', performAdvancedSearch);

    const setupTagInput = (inputId, btnId, listId) => {
        const input = document.getElementById(inputId);
        const button = document.getElementById(btnId);
        const addItem = () => {
            const value = input.value.trim();
            if (value) {
                addItemToSelection(value, listId);
            }
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

    // 5. ボス選択UIのセットアップを呼び出す
    setupBossSelectors();

    // 6. 展開/折りたたみボタンのイベントリスナーを追加
    const bossToggleBtn = document.getElementById('boss-filter-toggle');
    const bossContent = document.getElementById('boss-filter-content');
    if (bossToggleBtn && bossContent) {
        bossToggleBtn.addEventListener('click', () => {
            const isCollapsed = bossContent.classList.toggle('collapsed');
            bossToggleBtn.textContent = isCollapsed ? texts.boss_filter_toggle_expand : texts.boss_filter_toggle_collapse;
        });
    }
}

/**
 * 検索タブの入力補完リストを作成する
 */
function populateFinderDatalists() {
    const cardDatalist = document.getElementById('card-list-datalist');
    const exhibitDatalist = document.getElementById('exhibit-list-datalist');
    if (!cardDatalist || !exhibitDatalist) return;

    // 既に中身があれば何もしない
    if (cardDatalist.options.length > 0) return;

    if (!ALL_DATA || !ALL_DATA.lookup_tables || !ALL_DATA.lookup_tables.cards) {
        console.error("populateFinderDatalists: lookup_tables.cards が見つかりません。");
        return;
    }

    const cardNameKey = LANG === 'en' ? 'EN' : 'JA';
    const exhibitNameKey = LANG === 'en' ? 'EN' : 'JA';

    if (ALL_DATA.lookup_tables.cards) {
        for (const cardId in ALL_DATA.lookup_tables.cards) {
            const cardData = ALL_DATA.lookup_tables.cards[cardId];
            if (cardData && cardData[cardNameKey]) {
                const cardName = cardData[cardNameKey];
                const option = document.createElement('option');
                option.value = cardName;
                cardDatalist.appendChild(option);
            }
        }
    }

    if (ALL_DATA.lookup_tables.exhibits) {
        for (const exhibitId in ALL_DATA.lookup_tables.exhibits) {
            const exhibitData = ALL_DATA.lookup_tables.exhibits[exhibitId];
            if (exhibitData && exhibitData[exhibitNameKey]) {
                const exhibitName = exhibitData[exhibitNameKey];
                const option = document.createElement('option');
                option.value = exhibitName;
                exhibitDatalist.appendChild(option);
            }
        }
    }
}

/**
 * ランの検索を実行し、結果を表示する
 */
function searchRuns() {
    const conditions = {
        includeCards: [
            document.getElementById('include-card-1').value.trim(),
            document.getElementById('include-card-2').value.trim()
        ].filter(Boolean),
        includeExhibits: [
            document.getElementById('include-exhibit-1').value.trim(),
            document.getElementById('include-exhibit-2').value.trim()
        ].filter(Boolean),
        excludeCards: [
            document.getElementById('exclude-card-1').value.trim(),
            document.getElementById('exclude-card-2').value.trim()
        ].filter(Boolean),
        excludeExhibits: [
            document.getElementById('exclude-exhibit-1').value.trim(),
            document.getElementById('exclude-exhibit-2').value.trim()
        ].filter(Boolean),
    };

    const filterByChar = document.getElementById('filter-by-current-char').checked;
    let runsToSearch = ALL_RUN_DETAILS;

    if (filterByChar) {
        runsToSearch = ALL_RUN_DETAILS.filter(run => run.character === CURRENT_CHAR);
    }

    const filteredRuns = runsToSearch.filter(run => {
        const runCards = new Set(run.cards);
        const runExhibits = new Set(run.exhibits);

        for (const card of conditions.includeCards) {
            if (!runCards.has(card)) return false;
        }
        for (const exhibit of conditions.includeExhibits) {
            if (!runExhibits.has(exhibit)) return false;
        }
        for (const card of conditions.excludeCards) {
            if (runCards.has(card)) return false;
        }
        for (const exhibit of conditions.excludeExhibits) {
            if (runExhibits.has(exhibit)) return false;
        }
        return true;
    });
    console.log("【デバッグ1】検索条件:", { act: actFilter, level: levelFilter });
    displayRunFinderResults(filteredRuns, actFilter, levelFilter);
}

/**
 * テーブルヘッダーがクリックされたときに呼び出される関数
 * @param {string} sortKey - 並べ替えの基準となるキー ('run_id', 'version', etc.)
 */
function handleSortClick(sortKey) {
    if (currentSortKey === sortKey) {
        // 同じキーがクリックされた場合は、昇順/降順を切り替える
        currentSortOrder = currentSortOrder === 'asc' ? 'desc' : 'asc';
    } else {
        // 新しいキーがクリックされた場合は、そのキーで昇順に設定
        currentSortKey = sortKey;
        currentSortOrder = 'asc';
    }
    // 現在の検索結果を新しい設定で並べ替えて再表示
    sortAndDisplayRuns();
}

/**
 * lastFoundRuns を現在のソート設定で並べ替え、テーブルを再描画する
 * [デバッグ版] ソート前後の配列の状態をログに出力する
 * @param {string|null} actFilter
 * @param {string|null} levelFilter
 */
function sortAndDisplayRuns(actFilter = null, levelFilter = null) {
    // ★★★デバッグ★★★ ソート前の配列の状態を確認
    console.log(`[DEBUG] sortAndDisplayRuns started. lastFoundRuns.length:`, lastFoundRuns.length);
    if (lastFoundRuns.length > 0) {
        console.log('[DEBUG] lastFoundRuns (before sort):', [...lastFoundRuns]);
    }

    const sortedRuns = [...lastFoundRuns].sort((a, b) => {
        const order = currentSortOrder === 'asc' ? 1 : -1;

        let valA = a[currentSortKey];
        let valB = b[currentSortKey];

        // null や undefined は常に最後尾に来るようにする
        if (valA == null && valB == null) return 0;
        if (valA == null) return 1;
        if (valB == null) return -1;

        // 値が数値型の場合 (DeckSizeなど) は、数値として比較
        if (typeof valA === 'number' && typeof valB === 'number') {
            return (valA - valB) * order;
        }

        // それ以外は、文字列として比較 (run_idやversionの数字も正しく扱えるように)
        return String(valA).localeCompare(String(valB), undefined, { numeric: true }) * order;
    });

    // ★★★デバッグ★★★ ソート後の配列の状態を確認
    console.log(`%c[DEBUG] Sorting complete. sortedRuns.length: ${sortedRuns.length}`, 'color: green; font-weight: bold;');
    if (sortedRuns.length > 0) {
        console.log('[DEBUG] sortedRuns (after sort):', sortedRuns);
    }


    // 並べ替えたデータでテーブルを表示
    displayRunFinderResults(sortedRuns, actFilter, levelFilter);
}


/**
 * 検索結果のランをテーブル形式で表示する。
 * [修正版] 各Actの経路サマリーのアイコンとボスアイコンに、そのマスへのリンクを追加する
 * @param {Array} runs - 表示するランの配列
 * @param {string|null} actFilter - 検索で使用されたActフィルターの値
 * @param {string|null} levelFilter - 検索で使用されたLevelフィルターの値
 */
function displayRunFinderResults(runs, actFilter = null, levelFilter = null) {
    const resultsContainer = document.getElementById('run-finder-results');

    // 1. UIテキストとアイコン定義
    const texts = {
        title: UI_TEXT.search_results_title || "Found {count} runs",
        no_results: UI_TEXT.search_no_results || "No runs were found matching the criteria.",
        run_id: "Run ID",
        version: "Ver",
        character: "Char",
        deck_size: "Size",
        player_name: "Player",
        act1_header: "Act1",
        act2_header: "Act2",
        act3_header: "Act3"
    };

    const nodeIcons = { 'EliteEnemy': '👿', 'Shop': '🛒', 'Gap': '🔥' };

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

    if (!runs || runs.length === 0) {
        resultsContainer.innerHTML = `<p>${texts.no_results}</p>`;
        return;
    }

    // 2. 各ランのテーブル行を生成
    const runRows = runs.map(run => {
        try {
            const baseUrl = `https://lbol-logs.github.io/${run.version}/${run.run_id}`;
            const params = [];
            // 検索時のフィルターを維持する
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
                            if (!icon) return null; // 表示対象外のアイコンはここで弾かれる
                            // 各アイコンに、そのマスへのリンクを付与
                            const nodeUrl = `${baseUrl}?a=${actNum}&l=${node.level}`;
                            return `<a href="${nodeUrl}" target="_blank" class="path-icon-link" title="Act ${actNum}, Level ${node.level}: ${node.type}">${icon}</a>`;
                        }).filter(Boolean).join('');

                        stageHtmlParts.push(`<span class="stage-summary-part">${currentStageString || '&nbsp;'}</span>`);
                    }
                    pathStrings[`act${actNum}`] = stageHtmlParts.join('<span class="stage-separator">→</span>');

                    const actBossData = run.bosses ? run.bosses[String(actNum)] : null;
                    if (actBossData && bossIconMap[actBossData.name]) {
                        const bossIconUrl = bossIconMap[actBossData.name] || "./img/boss/Unknown.avif";
                        // ボスのレベル情報を使ってリンクを生成
                        const bossUrl = `${baseUrl}?a=${actNum}&l=${actBossData.level}`;
                        const bossIconHtml = `
                            <span class="stage-separator">→</span>
                            <a href="${bossUrl}" target="_blank" class="path-icon-link boss-icon-container" title="${actBossData.name} (Lvl ${actBossData.level})">
                                <img src="${bossIconUrl}" alt="${actBossData.name}">
                            </a>
                        `;
                        pathStrings[`act${actNum}`] += bossIconHtml;
                    }
                }
            }

            return `
                <tr>
                    <td><a href="${finalUrl}" target="_blank" title="${run.run_id}">${run.run_id}</a></td>
                    <td>${run.version}</td>
                    <td>${run.character}</td>
                    <td>${run.displayDeckSize ?? 'N/A'}</td>
                    <td>${run.player_name}</td>
                    <td class="path-summary-cell-container">
                        <div class="path-summary-grid">${pathStrings.act1}</div>
                    </td>
                    <td class="path-summary-cell-container">
                        <div class="path-summary-grid">${pathStrings.act2}</div>
                    </td>
                    <td class="path-summary-cell-container">
                        <div class="path-summary-grid">${pathStrings.act3}</div>
                    </td>
                </tr>
            `;
        } catch (error) {
            console.error(`[ERROR] Failed to process run HTML for run_id: ${run ? run.run_id : 'unknown'}.`, error, run);
            return '';
        }
    }).join('');

    // 3. テーブル全体のHTMLを生成
    const getSortIndicator = (key) => {
        if (currentSortKey === key) {
            return currentSortOrder === 'asc' ? ' ▲' : ' ▼';
        }
        return '';
    };

    resultsContainer.innerHTML = `
        <div class="results-header">
            <h4>${texts.title.replace('{count}', runs.length)}</h4>
            <button onclick="generateAndCopyShareLink()" class="copy-share-link">
                🔗 Copy Link
            </button>
        </div>
        <table class="run-finder-results-table">
            <thead>
                <tr>
                    <th onclick="handleSortClick('run_id')">${texts.run_id}${getSortIndicator('run_id')}</th>
                    <th onclick="handleSortClick('version')">${texts.version}${getSortIndicator('version')}</th>
                    <th onclick="handleSortClick('character')">${texts.character}${getSortIndicator('character')}</th>
                    <th onclick="handleSortClick('displayDeckSize')">${texts.deck_size}${getSortIndicator('displayDeckSize')}</th>
                    <th onclick="handleSortClick('player_name')">${texts.player_name}${getSortIndicator('player_name')}</th>
                    <th>${texts.act1_header}</th>
                    <th>${texts.act2_header}</th>
                    <th>${texts.act3_header}</th>
                </tr>
            </thead>
            <tbody>
                ${runRows}
            </tbody>
        </table>
    `;
}

/**
 * Act別トレンドの表示を切り替える関数
 */
window.switchActTrend = function(act) {
    const container = document.getElementById('act-trend-tab');
    if (!container) return;

    const buttons = container.querySelectorAll('.filter-btn');
    buttons.forEach(btn => {
        if (btn.getAttribute('onclick').includes(`'${act}'`)) {
            btn.classList.add('active');
        } else {
            btn.classList.remove('active');
        }
    });

    const contents = container.querySelectorAll('div[id^="act-trend-content-"]');
    contents.forEach(div => {
        if (div.id === `act-trend-content-${act}`) {
            div.style.display = 'block';
        } else {
            div.style.display = 'none';
        }
    });
};


/**
 * 差分データから指定されたステーション時点のデッキ状態を復元する
 * [修正版] デッキを配列として扱い、重複を保持する
 * @param {object} runTimeline - 1ラン分のタイムラインデータ
 * @param {number} targetStationIndex - 復元したいステーションのインデックス
 * @returns {{cards: Array<number>, exhibits: Set<number>}} - 復元されたカード(配列)と展示品(Set)
 */
function reconstructDeckAtStation(runTimeline, targetStationIndex) {
    // 1. 初期デッキを配列としてコピーして開始
    const currentDeck = [...(runTimeline.initial.c || [])];
    const currentExhibits = new Set(runTimeline.initial.e || []);

    // 2. ターゲットのマスまで、変更を順に適用
    const sortedChangeKeys = Object.keys(runTimeline.changes)
                                   .map(Number)
                                   .sort((a, b) => a - b);

    for (const stationIdx of sortedChangeKeys) {
        if (stationIdx > targetStationIndex) {
            break;
        }

        const changesAtStation = runTimeline.changes[String(stationIdx)];
        if (changesAtStation) {
            // カードの追加 (push)
            if (changesAtStation.add_c) {
                changesAtStation.add_c.forEach(id => currentDeck.push(id));
            }
            // カードの削除 (spliceで最初に見つかったものを1つ削除)
            if (changesAtStation.rem_c) {
                changesAtStation.rem_c.forEach(idToRemove => {
                    const index = currentDeck.indexOf(idToRemove);
                    if (index > -1) {
                        currentDeck.splice(index, 1);
                    }
                });
            }
            // 展示品はSetのままでOK
            if (changesAtStation.add_e) {
                changesAtStation.add_e.forEach(id => currentExhibits.add(id));
            }
            if (changesAtStation.rem_e) {
                changesAtStation.rem_e.forEach(id => currentExhibits.delete(id));
            }
        }
    }

    // カードは配列、展示品はSetとして返す
    return { cards: currentDeck, exhibits: currentExhibits };
}

/**
 * 高度な検索を実行し、結果を表示する
 * [修正版] ボスフィルター機能を追加
 */
function performAdvancedSearch() {
    console.log(`[SEARCH DEBUG] Current language (LANG) is: '${LANG}'`);

    if (!ALL_RUN_DETAILS || Object.keys(ALL_RUN_DETAILS).length === 0 ||
        !ALL_DECK_TIMELINES || Object.keys(ALL_DECK_TIMELINES).length === 0 ||
        !ITEM_MASTER_LOOKUP || Object.keys(ITEM_MASTER_LOOKUP).length === 0) {

        const resultsContainer = document.getElementById('run-finder-results');
        const errorMessage = UI_TEXT.run_finder_data_error || "検索データの読み込みに失敗しました。ページを再読み込みしてください。";

        console.error("検索を中止: 必須データ (ALL_RUN_DETAILS, ALL_DECK_TIMELINES, ITEM_MASTER_LOOKUP) が見つかりません。");

        if (resultsContainer) {
            resultsContainer.innerHTML = `<p style="color: red; font-weight: bold;">${errorMessage}</p>`;
        }
        return; // ここで処理を中断
    }

    console.log(`[DEBUG] Starting filter. Total runs in ALL_RUN_DETAILS: ${ALL_RUN_DETAILS.length}`);

    // 1. UIから検索条件を取得
    const selectedChar = document.getElementById('character-select').value;
    const actFilter = document.getElementById('act-filter').value;
    const levelFilter = document.getElementById('level-filter').value;
    const includeLogic = document.getElementById('include-logic-and').checked ? 'AND' : 'OR';
    const deckSizeOperator = document.getElementById('deck-size-operator').value;
    const deckSizeValueStr = document.getElementById('deck-size-value').value;
    const deckSizeValue = deckSizeValueStr ? parseInt(deckSizeValueStr, 10) : NaN;

    const getItemsFromList = (listId) => {
        const list = document.getElementById(listId);
        return Array.from(list.children).map(tag => tag.dataset.itemName);
    };

    const includeKeywords = getItemsFromList('include-items-list').map(k => k.toLowerCase());
    const excludeKeywords = getItemsFromList('exclude-items-list').map(k => k.toLowerCase());

    const includeBosses = getItemsFromList('include-bosses-list');
    const excludeBosses = getItemsFromList('exclude-bosses-list');
    const bossLogic = document.querySelector('input[name="boss-logic"]:checked').value;


    const useTimelineSearch = !!actFilter || !!levelFilter;

    // 2. ランデータをフィルタリング
    const runsToSearch = ALL_RUN_DETAILS.map(r => ({...r}));
    const filteredRuns = runsToSearch.filter((run, index) => {
        // --- 条件A: キャラクターでの絞り込み ---
        if (selectedChar !== 'All' && run.character !== selectedChar) {
            return false;
        }


        const runBosses = run.bosses ? Object.values(run.bosses) : [];

        // Include Filter
        if (includeBosses.length > 0) {
            const includeMatch = (bossLogic === 'AND')
                ? includeBosses.every(boss => runBosses.includes(boss))
                : includeBosses.some(boss => runBosses.includes(boss));
            if (!includeMatch) {
                return false;
            }
        }

        // Exclude Filter
        if (excludeBosses.length > 0) {
            const excludeMatch = excludeBosses.some(boss => runBosses.includes(boss));
            if (excludeMatch) {
                return false;
            }
        }


        // --- 条件B: Act/Level とカード/展示品での絞り込み ---
        if (useTimelineSearch) {
            // --- タイムライン検索 (Act/Level指定あり) ---
            const runTimeline = ALL_DECK_TIMELINES[run.run_id];
            if (!runTimeline || !STATION_MAP_GLOBAL) return false;

            let stationIndicesToSearch = [];
            if (actFilter && levelFilter) {
                const stationKey = `${actFilter}-${levelFilter}`;
                const targetIndex = STATION_MAP_GLOBAL[stationKey];
                if (targetIndex !== undefined) stationIndicesToSearch.push(targetIndex);
            } else if (actFilter) {
                const actPrefix = `${actFilter}-`;
                for (const stationKey in STATION_MAP_GLOBAL) {
                    if (stationKey.startsWith(actPrefix)) stationIndicesToSearch.push(STATION_MAP_GLOBAL[stationKey]);
                }
            } else if (levelFilter) {
                const levelSuffix = `-${levelFilter}`;
                 for (const stationKey in STATION_MAP_GLOBAL) {
                    if (stationKey.endsWith(levelSuffix)) stationIndicesToSearch.push(STATION_MAP_GLOBAL[stationKey]);
                }
            }

            if (stationIndicesToSearch.length === 0 && (actFilter || levelFilter)) return false;

            // Act/Level指定がない場合は全マスを対象にする（あまりないケースだが念のため）
            if (stationIndicesToSearch.length === 0) {
                 stationIndicesToSearch = Object.values(STATION_MAP_GLOBAL);
            }

            return stationIndicesToSearch.some(stationIndex => {
                const { cards, exhibits } = reconstructDeckAtStation(runTimeline, stationIndex);

                if (deckSizeOperator !== 'any' && !isNaN(deckSizeValue)) {
                    const deckSize = cards.length;
                    if (deckSizeOperator === 'lte' && deckSize > deckSizeValue) return false;
                    if (deckSizeOperator === 'gte' && deckSize < deckSizeValue) return false;
                }

                const allItemIds = [...cards, ...exhibits];
                const searchableItems = [];
                for (const itemId of allItemIds) {
                    const itemData = ITEM_MASTER_LOOKUP[itemId];
                    if (itemData) {
                        if (itemData.ja) searchableItems.push(itemData.ja.toLowerCase());
                        if (itemData.en) searchableItems.push(itemData.en.toLowerCase());
                    }
                }
                const itemsMatch = applyKeywordFilters(searchableItems, includeKeywords, excludeKeywords, includeLogic);

                if (itemsMatch) {
                    run.displayDeckSize = cards.length;
                    return true;
                }
                return false;
            });

        } else {
            // --- 最終デッキ検索 (Act/Level指定なし) ---
            const finalDeckSize = run.cards ? run.cards.length : 0;

            if (deckSizeOperator !== 'any' && !isNaN(deckSizeValue)) {
                if (deckSizeOperator === 'lte' && finalDeckSize > deckSizeValue) return false;
                if (deckSizeOperator === 'gte' && finalDeckSize < deckSizeValue) return false;
            }

            run.displayDeckSize = finalDeckSize;

            const searchableItems = [];
            const allItemIds = [...(run.cards || []), ...(run.exhibits || [])];
            for (const itemId of allItemIds) {
                const itemData = ITEM_MASTER_LOOKUP[itemId];
                if (itemData) {
                    if (itemData.ja) searchableItems.push(itemData.ja.toLowerCase());
                    if (itemData.en) searchableItems.push(itemData.en.toLowerCase());
                }
            }
            return applyKeywordFilters(searchableItems, includeKeywords, excludeKeywords, includeLogic);
        }
    });

    console.log(`%c[DEBUG] Filtering complete. Filtered runs count: ${filteredRuns.length}`, 'color: green; font-weight: bold;');

    // 3. 検索結果をグローバル変数に保存し、ソートして表示
    lastFoundRuns = filteredRuns;
    currentSortKey = 'run_id';
    currentSortOrder = 'asc';
    sortAndDisplayRuns(actFilter, levelFilter);
}

/**
 * キーワードフィルターを適用するヘルパー関数
 */
function applyKeywordFilters(lowerCaseItems, includeKeywords, excludeKeywords, includeLogic) {
    // --- 「含まない」アイテムのフィルター ---
    if (excludeKeywords.length > 0) {
        if (excludeKeywords.some(keyword => lowerCaseItems.some(item => item.includes(keyword.toLowerCase())))) {
            return false;
        }
    }

    // --- 「含む」アイテムのフィルター ---
    if (includeKeywords.length > 0) {
        if (includeLogic === 'AND') {
            if (!includeKeywords.every(keyword => lowerCaseItems.some(item => item.includes(keyword.toLowerCase())))) {
                return false;
            }
        } else { // OR検索
            if (!includeKeywords.some(keyword => lowerCaseItems.some(item => item.includes(keyword.toLowerCase())))) {
                return false;
            }
        }
    }
    return true;
}


// script.js に追加

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
 * 選択されたボスをタグとしてリストに追加する
 * @param {string} bossName - ボス名
 * @param {string} listId - タグを追加するリストのID ('include-bosses-list' or 'exclude-bosses-list')
 */
function addBossToSelection(bossName, listId) {
    const list = document.getElementById(listId);
    if (!list) return;

    const existingTags = Array.from(list.children).map(tag => tag.dataset.itemName);
    if (existingTags.includes(bossName)) {
        return; // 既にあれば何もしない
    }

    const tag = document.createElement('div');
    tag.className = 'item-tag';
    tag.dataset.itemName = bossName;

    tag.innerHTML = `
        <span>${bossName}</span>
        <button class="remove-tag-btn" onclick="this.parentElement.remove()">&times;</button>
    `;

    if (listId === 'exclude-bosses-list') {
        tag.style.backgroundColor = '#F44336';
    }

    list.appendChild(tag);
}

/**
 * ボス選択用のアイコンUIを動的に生成する
 */
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

// カード/展示品用のタグ追加関数 (汎用化)
function addItemToSelection(itemName, listId) {
    const list = document.getElementById(listId);
    if (!list) return;

    const existingTags = Array.from(list.children).map(tag => tag.dataset.itemName);
    if (existingTags.includes(itemName)) {
        return;
    }

    const tag = document.createElement('div');
    tag.className = 'item-tag';
    tag.dataset.itemName = itemName;
    tag.innerHTML = `
        <span>${itemName}</span>
        <button class="remove-tag-btn" onclick="this.parentElement.remove()">&times;</button>
    `;
    if (listId === 'exclude-items-list') {
        tag.style.backgroundColor = '#F44336';
    }
    list.appendChild(tag);
}


// script.js に追加

/**
 * 現在の検索条件から共有可能なURLを生成し、クリップボードにコピーする
 */
function generateAndCopyShareLink() {
    const params = new URLSearchParams();

    // 1. 基本的なフィルターの値を取得
    const char = document.getElementById('character-select').value;
    if (char) {
        params.set('char', char);
    }

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

    // 2. タグ形式のフィルターの値を取得
    const getItemsFromList = (listId) => Array.from(document.getElementById(listId).children).map(tag => tag.dataset.itemName);

    const includeItems = getItemsFromList('include-items-list');
    if (includeItems.length > 0) params.set('includeItems', includeItems.join(','));

    const excludeItems = getItemsFromList('exclude-items-list');
    if (excludeItems.length > 0) params.set('excludeItems', excludeItems.join(','));

    const includeBosses = getItemsFromList('include-bosses-list');
    if (includeBosses.length > 0) params.set('includeBosses', includeBosses.join(','));

    const excludeBosses = getItemsFromList('exclude-bosses-list');
    if (excludeBosses.length > 0) params.set('excludeBosses', excludeBosses.join(','));

    // 3. AND/ORロジックの値を取得
    const itemLogic = document.querySelector('input[name="include-logic"]:checked').value;
    if (itemLogic !== 'OR') params.set('itemLogic', itemLogic); // デフォルト(OR)は不要

    const bossLogic = document.querySelector('input[name="boss-logic"]:checked').value;
    if (bossLogic !== 'OR') params.set('bossLogic', bossLogic); // デフォルト(OR)は不要

    // 4. 検索を実行するためのフラグを追加
    params.set('search', 'true');

    // 5. URLを組み立ててコピー
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
 * URLパラメータに基づいて検索UIを自動的に設定する
 */
function populateUiFromUrlParams() {
    const params = new URLSearchParams(window.location.search);
    if (!params.has('search')) return false; // 検索パラメータがなければ何もしない

    console.log("URLパラメータを検出しました。UIに設定します...");

    // 1. 基本的なフィルターを設定
    if (params.has('char')) document.getElementById('character-select').value = params.get('char');
    if (params.has('act')) document.getElementById('act-filter').value = params.get('act');
    if (params.has('level')) document.getElementById('level-filter').value = params.get('level');
    if (params.has('deckOp')) document.getElementById('deck-size-operator').value = params.get('deckOp');
    if (params.has('deckVal')) document.getElementById('deck-size-value').value = params.get('deckVal');

    // 2. タグ形式のフィルターを設定
    if (params.has('includeItems')) {
        params.get('includeItems').split(',').forEach(item => addItemToSelection(item, 'include-items-list'));
    }
    if (params.has('excludeItems')) {
        params.get('excludeItems').split(',').forEach(item => addItemToSelection(item, 'exclude-items-list'));
    }
    if (params.has('includeBosses')) {
        params.get('includeBosses').split(',').forEach(boss => addBossToSelection(boss, 'include-bosses-list'));
    }
    if (params.has('excludeBosses')) {
        params.get('excludeBosses').split(',').forEach(boss => addBossToSelection(boss, 'exclude-bosses-list'));
    }

    // 3. AND/ORロジックを設定
    if (params.has('itemLogic')) {
        document.querySelector(`input[name="include-logic"][value="${params.get('itemLogic')}"]`).checked = true;
    }
    if (params.has('bossLogic')) {
        document.querySelector(`input[name="boss-logic"][value="${params.get('bossLogic')}"]`).checked = true;
    }

    return true; // UI設定が実行されたことを示す
}