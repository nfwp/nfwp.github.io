// script.js (完全版)

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
let UI_TEXT = {};
let LANG = 'ja';
let CURRENT_CHAR = 'CirnoA';

let attentionSlider = null;


let GRAPH_DIV = null; // グラフのDIV要素を格納する。初期値は null
const ROUTE_NODE_HOVER_DELAY = 400; // ホバーの遅延時間 (ミリ秒)。この数値を調整してお好みの長さにできます。
let routeNodeHoverTimer = null;    // タイマーIDを保存する変数

// =================================================================
// メイン処理
// =================================================================
window.addEventListener('DOMContentLoaded', async () => {
    const params = new URLSearchParams(window.location.search);
    CURRENT_CHAR = params.get('char') || 'CirnoA';
    LANG = params.get('lang') || 'ja';

    try {
        const response = await fetch(`data/${CURRENT_CHAR}_data.json`);
        if (!response.ok) throw new Error(`Failed to load data for ${CURRENT_CHAR}`);
        ALL_DATA = await response.json();
    } catch (error) {
        console.error(error);
        document.getElementById('loading-overlay').textContent = `エラー: ${error.message}`;
        return;
    }

    await setupUiText(LANG);

    renderGlobalHeader();
    setupNavigation();

    renderCardPerformanceTab(CURRENT_CHAR, LANG);
    renderExhibitAnalysisTab(LANG);
    renderRouteEventTab(LANG);
    renderEnemyAnalysisTab(CURRENT_CHAR, LANG);
    renderCardListTab(ALL_DATA);

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

    container.innerHTML = `
        <div class="character-switcher">
            <label for="char-select-global">${UI_TEXT.char_select_label || 'Character:'}</label>
            <select id="char-select-global">${options}</select>
        </div>
    `;

    document.getElementById('char-select-global').addEventListener('change', (e) => {
        const newChar = e.target.value;
        const currentParams = new URLSearchParams(window.location.search);
        currentParams.set('char', newChar);
        window.location.search = currentParams.toString();
    });
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

function setupNavigation() {
    const tabsConfig = [
        { id: 'card-performance-tab', label: UI_TEXT.card_perf_tab_title },
        { id: 'exhibit-analysis-tab', label: UI_TEXT.exhibit_tab_title },
        { id: 'route-event-tab', label: UI_TEXT.route_tab_title },
        { id: 'enemy-analysis-tab', label: UI_TEXT.enemy_analysis_title },
        { id: 'card-list-tab', label: UI_TEXT.card_list_tab_title || 'カード一覧' }
    ];

    const tabButtonsContainer = document.getElementById('tab-buttons');
    const mobileTabSelector = document.getElementById('mobile-tab-selector');
    const tabContents = document.querySelectorAll('.tab-content');

    const switchTab = (tabId) => {
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
    };

    if (tabButtonsContainer) tabButtonsContainer.innerHTML = '';
    if (mobileTabSelector) mobileTabSelector.innerHTML = '';

    tabsConfig.forEach(tabConfig => {
        if (!tabConfig.label) return;

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

    if (tabsConfig.length > 0 && tabsConfig[0].label) {
        switchTab(tabsConfig[0].id);
    }
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
    const aggCardData = ALL_DATA.agg_data_full.find(agg_d => agg_d[cardNameCol] === cardName);
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
    if (!itemName) return "";
    const encodedName = encodeURIComponent(itemName.replace(/ /g, '_'));
    const baseUrl = lang === 'ja' ? `https://wikiwiki.jp/tohokoyoya/${encodeURIComponent(itemName)}` : `https://lbol.miraheze.org/wiki/${encodedName}`;
    return `<a href="${baseUrl}" target="_blank">${itemName}</a>`;
}


// エラーを回避するため、呼び出される createAnalysisReportsHtml より前にランキング生成関数を定義します。
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


// ▼▼▼ この関数を丸ごと置き換えてください ▼▼▼
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
                ${upgradeRankingHtml}
                ${removeRankingHtml}
                ${act1AdoptionHtml}
                ${act1PerfHtml}
                ${act4AdoptionHtml}
                ${act4PerfHtml}
                ${tendencyPerfHtml}
            </div>
            `;
}

//消した
//                ${spotlightHtml}
//            </div>
//            ${criteriaHtml}`;

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

    // 3. HTMLを生成するヘルパー関数 (この部分は変更なし)
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
        else if (category === 'ショップ') nameHtml = `${linkedName} 🛒`;
        else if (category === 'イベント') nameHtml = `${linkedName} ✨`;

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

// この関数を丸ごと置き換えてください
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
                    for (const choice_name of ["休憩", "カード強化", "その他"]) { // 表示順を固定
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

                    // 削除
                    gradient_parts_bottom.push(`#42A5F5 ${current_pos * 100}%`);
                    current_pos += remove_rate;
                    gradient_parts_bottom.push(`#42A5F5 ${current_pos * 100}%`);
                    // 強化
                    gradient_parts_bottom.push(`#FFB74D ${current_pos * 100}%`);
                    current_pos += upgrade_rate;
                    gradient_parts_bottom.push(`#FFB74D ${current_pos * 100}%`);
                    // その他
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

                //barHtml += `<div id="bar-${node_full_id}" class="node-choice-segment" style="${style_attr}" title="${node_type}: ${(percentage * 100).toFixed(1)}%" onmouseover="showNodeDetails('${node_full_id}')">${label}</div>`;
            });
            barHtml += '</div></div>';
            actHtmlSegment += barHtml;

            Object.keys(level_data).forEach(node_type => {
                if (node_type === 'total') return;
                const node_full_key = `${act}-${level}-${node_type}`;
                const visit_count = level_data[node_type] || 0;
                const details_id = `details-${node_full_key}`;
                let details_content = `<h4>Act ${act} - Level ${level} (${node_type}) - ${UI_TEXT.traversal_count}: (${visit_count} / ${total_runs}) ${(visit_count / total_runs * 100).toFixed(1)}%</h4>`;

                let has_content = false, top_section_html = "", card_grid_content = "", exhibit_grid_content = "";
                const node_specific_details = node_details[node_full_key] || {};

                if (['Enemy', 'EliteEnemy', 'Boss'].includes(node_type) && node_specific_details.enemies) {
                    has_content = true;
                    const enemy_data = node_specific_details.enemies;
                    const scales = node_specific_details.scales || {};
                    const sorted_enemies = Object.values(enemy_data).sort((a, b) => b.rate - a.rate);

                    let table_html = `<h5>${UI_TEXT.encounter_title || '出現する敵'}</h5><table class="enemy-stats-table">`;
                    table_html += `<thead><tr><th>${UI_TEXT.enemy_table_metric}</th>${sorted_enemies.map(e => `<th>${e[lang]}</th>`).join('')}</tr></thead>`;
                    table_html += '<tbody>';
                    table_html += `<tr><td>${UI_TEXT.enemy_table_rate}</td>${sorted_enemies.map(e => `<td>${(e.rate * 100).toFixed(1)}%</td>`).join('')}</tr>`;
                    table_html += `<tr><td>${UI_TEXT.enemy_table_avg_t}</td>${sorted_enemies.map(e => `<td>${e.avg_turns.toFixed(1)}${createInlineBoxplotHtml(e.turns_boxplot, scales.turns_min, scales.turns_max)}</td>`).join('')}</tr>`;
                    table_html += `<tr><td>${UI_TEXT.enemy_table_hp}</td>${sorted_enemies.map(e => `<td style='background-color:${getColorForValue(e.avg_hp_loss, act_stats[act].hp_min, act_stats[act].hp_max)}'>${(-e.avg_hp_loss).toFixed(1)}${createInlineBoxplotHtml(e.hp_loss_boxplot, scales.hp_loss_min, scales.hp_loss_max, true)}</td>`).join('')}</tr>`;
                    table_html += `<tr><td>${UI_TEXT.enemy_table_p}</td>${sorted_enemies.map(e => `<td style='background-color:${getColorForValue(e.avg_p_change, act_stats[act].p_min, act_stats[act].p_max, true)}'>${e.avg_p_change.toFixed(1)}${createInlineBoxplotHtml(e.p_change_boxplot, scales.p_change_min, scales.p_change_max)}</td>`).join('')}</tr>`;

                    table_html += `<tr><td>${UI_TEXT.sample_decks_title || 'サンプルデッキ'}</td>`;
                    table_html += sorted_enemies.map(e => {
                        const sampleRuns = e.sample_runs || [];
                        if (sampleRuns.length === 0) {
                            return '<td>-</td>';
                        }
                        const links = sampleRuns.map((run, index) => {
                            const short_version = run.version.split('.').slice(0, 3).join('.');
                            const prev_level = Math.max(0, parseInt(level, 10) - 1);
                            const url = `https://lbol-logs.github.io/${short_version}/${run.run_id}/?a=${act}&l=${prev_level}`;
                            const deckTooltip = run.deck.join(', ');
                            return `<a href="${url}" target="_blank" title="${deckTooltip}">${index + 1}</a>`;
                        }).join(' '); // ol/liではなく、スペース区切りで横に並べる
                        return `<td>${links}</td>`;
                    }).join('');
                    table_html += '</tr>';
                    table_html += '</tbody></table>';
                    top_section_html = table_html;
                }
                // Shopノードの選択肢割合を表示する処理
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
                // Gapノードの選択肢割合を表示する処理
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
                        if (choice_map[choice]) {
                            aggregated_choices[choice_map[choice]] = (aggregated_choices[choice_map[choice]] || 0) + stats.rate;
                        } else {
                            other_rate += stats.rate;
                        }
                    }

                    if (other_rate > 0) {
                        aggregated_choices[other_label] = other_rate;
                    }

                    for (const [display_choice, rate] of Object.entries(aggregated_choices)) {
                         gap_choices_html += `<li>${display_choice}: ${(rate * 100).toFixed(1)}%</li>`;
                    }

                    gap_choices_html += '</ul>';
                    top_section_html = gap_choices_html;
                }


                let sampleDecksHtml = '';
                // Python側で追加した sample_runs データが存在するかチェック
                if (node_specific_details.sample_runs && node_specific_details.sample_runs.length > 0) {
                    has_content = true; // 表示するコンテンツがあることを示すフラグ

                    // サンプルデッキのリスト項目を生成
                    const listItems = node_specific_details.sample_runs.map((run, index) => {
                        // バージョン文字列を "1.8.0" のような形式に整形
                        const short_version = run.version.split('.').slice(0, 3).join('.');
                        // ご指定の形式でURLを組み立てる
                        const url = `https://lbol-logs.github.io/${short_version}/${run.run_id}/?a=${act}&l=${level}`;
                        // リンクにマウスオーバーした時にデッキ内容が見えるようにtooltipを設定
                        const deckTooltip = run.deck.join(', ');

                        return `<li><a href="${url}" target="_blank" title="${deckTooltip}">${index + 1}</a></li>`;
                    }).join('');

                    // セクション全体のHTMLを組み立てる
                    sampleDecksHtml = `
                        <div class="details-section">
                            <h5>${UI_TEXT.sample_decks_title || 'サンプルデッキ'}</h5>
                            <ol class="sample-deck-list">${listItems}</ol>
                        </div>
                    `;
                }

                const node_actions = event_actions[node_full_key] || {};
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

                            const action_title_key = `${action_type.toLowerCase()}_${item_type.toLowerCase()}`;
                            const action_title = UI_TEXT[action_title_key] || `${action_type} ${item_type}`;

                            if (item_type === 'Card') {
                                card_grid_content += `<div><h5>${action_title}</h5><ol>${list_items}</ol></div>`;
                            } else {
                                exhibit_grid_content += `<div><h5>${action_title}</h5><ol>${list_items}</ol></div>`;
                            }
                        }
                    });
                });

                if (top_section_html) details_content += `<div class="details-section">${top_section_html}</div>`;
                if (sampleDecksHtml) details_content += sampleDecksHtml;
                if (card_grid_content) details_content += `<div class="details-section"><h5>${UI_TEXT.card_section_title || 'カード関連'}</h5><div class="details-grid">${card_grid_content}</div></div>`;
                if (exhibit_grid_content) details_content += `<div class="details-section"><h5>${UI_TEXT.exhibit_section_title || '展示品関連'}</h5><div class="details-grid">${exhibit_grid_content}</div></div>`;

                if (!has_content) {
                    details_content += `<p>${UI_TEXT.no_data}</p>`;
                }
                detailsPanelHtml += `<div id="${details_id}" class="node-details">${details_content}</div>`;
            });
        });
        actHtmlSegment += '</div>';
        flowChartHtml += actHtmlSegment;
    }

    flowChartHtml += '</div></div>'; // Close route-acts-container and wrapper
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
    // ▲▲▲ 修正ここまで ▲▲▲

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

// script.js に以下の2つの関数を追加

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