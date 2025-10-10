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
let GRAPH_DIV = null;

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
    renderAllTabs(CURRENT_CHAR, LANG);

    document.getElementById('loading-overlay').style.display = 'none';
    document.getElementById('dashboard-container').style.visibility = 'visible';

    document.querySelector('.tab-button')?.click();
});

// =================================================================
// UIコンポーネント描画
// =================================================================

function renderGlobalHeader() {
    const container = document.getElementById('global-header');
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

function renderAllTabs(char, lang) {
    renderTabButtons();
    renderCardPerformanceTab(char, lang);
    renderExhibitAnalysisTab(lang);
    renderRouteEventTab(lang);
    renderEnemyAnalysisTab(char, lang);
}

function renderTabButtons() {
    const container = document.getElementById('tab-buttons');
    container.innerHTML = `
        <button class="tab-button" onclick="openTab(event, 'card-performance-tab')">${UI_TEXT.card_perf_tab_title}</button>
        <button class="tab-button" onclick="openTab(event, 'exhibit-analysis-tab')">${UI_TEXT.exhibit_tab_title}</button>
        <button class="tab-button" onclick="openTab(event, 'route-event-tab')">${UI_TEXT.route_tab_title}</button>
        <button class="tab-button" onclick="openTab(event, 'enemy-analysis-tab')">${UI_TEXT.enemy_analysis_title}</button>
    `;
}

function renderCardPerformanceTab(char, lang) {
    const container = document.getElementById('card-performance-tab');
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
        <div class="filter-group" id="filter-group-rarity">
            <label>${UI_TEXT.rarity}:</label>
            <select id="rarity-filter">
                <option value="All">${UI_TEXT.filter_all}</option>
                <option value="Common">Common</option>
                <option value="Uncommon">Uncommon</option>
                <option value="Rare">Rare</option>
            </select>
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
    </div>`;
}



function drawPlotlyGraph(char, lang) {
    const cardNameCol = (lang === 'ja') ? 'Card_Name' : 'Card_Name_EN';
    const aggData = ALL_DATA.agg_data_for_graph;
    const sitData = ALL_DATA.sit_data;
    const orderedSituations = ALL_DATA.metadata.ordered_situations;

    document.getElementById('main-title').textContent = `${char} - ${UI_TEXT.main_title} (Ver: ${ALL_DATA.metadata.version})`;

    const traces_agg = [{
        x: aggData.map(d => d.Weighted_Avg_Turn_Deviation),
        y: aggData.map(d => d.Weighted_Avg_HP_Deviation),
        text: aggData.map(d => createHoverText(d, lang)),
        customdata: aggData,
        mode: 'markers+text',
        type: 'scatter',
        marker: {
            size: aggData.map(d => Math.sqrt(d.Total_Fights_With) / 2.5),
            color: aggData.map(d => d.Stability_Score),
            colorscale: 'Viridis',
            colorbar: { title: UI_TEXT.stability, thickness: 15 },
            showscale: true,
            cmin: 75,
            cmax: 100,
        },
        textfont: { size: 11, color: '#333' },
        textposition: 'top center',
        hoverinfo: 'text',
        hoverlabel: { bgcolor: '#FFF', bordercolor: '#333' }
    }];

    const traces_sit = orderedSituations.map((sit, i) => {
        const sit_filtered = sitData.filter(d => d.Situation === sit);
        return {
            x: sit_filtered.map(d => d.Turn_Deviation),
            y: sit_filtered.map(d => d.HP_Deviation),
            text: sit_filtered.map(d => createHoverText(d, lang)),
            customdata: sit_filtered,
            mode: 'markers',
            type: 'scatter',
            name: sit,
            marker: {
                size: 8,
                color: Plotly.d3.scale.category20().range()[i % 20]
            },
            hoverinfo: 'text',
            hoverlabel: { bgcolor: '#FFF', bordercolor: '#333' }
        };
    });


    const isMobile = window.innerWidth <= 768;

    const layout = {
        xaxis: { title: UI_TEXT.attack_perf, range: [25, 75] },
        yaxis: { title: UI_TEXT.defense_perf, range: [25, 75] },
        title: false,
        hovermode: 'closest',
        showlegend: false,
        updatemenus: [
            { // View switcher
                buttons: [
                    {
                        method: 'update',
                        args: [{
                            'x': [traces_agg[0].x],
                            'y': [traces_agg[0].y],
                            'text': [traces_agg[0].text],
                            'customdata': [traces_agg[0].customdata],
                            'mode': ['markers+text'],
                            'marker.colorbar.title.text': [UI_TEXT.stability],
                            'showlegend': [false]
                        }, { 'xaxis.title': UI_TEXT.attack_perf, 'yaxis.title': UI_TEXT.defense_perf }],
                        label: UI_TEXT.agg_view
                    },
                    {
                        method: 'update',
                        args: [
                            {
                                'x': traces_sit.map(t => t.x),
                                'y': traces_sit.map(t => t.y),
                                'text': traces_sit.map(t => t.text),
                                'customdata': traces_sit.map(t => t.customdata),
                                'mode': 'markers',
                                'showlegend': true
                            },
                            { 'xaxis.title': UI_TEXT.attack_perf_sit, 'yaxis.title': UI_TEXT.defense_perf_sit }
                        ],
                        label: UI_TEXT.sit_view
                    }
                ],
                direction: 'down',
                showactive: true,
                type: 'buttons',
                x: isMobile ? 0.5 : 0.5,
                xanchor: 'center',
                y: isMobile ? 1.22 : 1.15,
                yanchor: 'top',
                pad: { t: 0, r: 10, b: 10, l: 10 },
                bgcolor: '#f0f0f0',
                bordercolor: '#ccc',
                borderwidth: 1
            },
            { // Label switcher
                buttons: [
                    {
                        method: 'restyle',
                        args: ['text', [aggData.map(d => d[cardNameCol])]],
                        label: UI_TEXT.show_labels
                    },
                    {
                        method: 'restyle',
                        args: ['text', [aggData.map(d => '')]],
                        label: UI_TEXT.hide_labels
                    }
                ],
                direction: 'down',
                showactive: true,
                type: 'buttons',
                x: isMobile ? 0.5 : 0.95,
                xanchor: isMobile ? 'center' : 'right',
                y: isMobile ? 1.10 : 1.15,
                yanchor: 'top',
                pad: { t: 0, r: 10, b: 10, l: 10 },
                bgcolor: '#f0f0f0',
                bordercolor: '#ccc',
                borderwidth: 1
            }
        ],
        legend: {
            orientation: 'h',
            y: -0.2,
            x: 0.5,
            xanchor: 'center'
        },
        margin: {
            t: isMobile ? 100 : 80,
            l: 60,
            r: 20,
            b: 50
        },
        annotations: [{
            xref: 'paper', yref: 'paper',
            x: 0.5, y: 0.5,
            text: '<b>50</b>',
            showarrow: false,
            font: { size: 100, color: 'rgba(0,0,0,0.05)' }
        }]
    };


    Plotly.newPlot(GRAPH_DIV, traces_agg, layout, { responsive: true, displaylogo: false });
    GRAPH_DIV.on('plotly_click', (data) => {
        const cardName = data.points[0].customdata[cardNameCol];
        if (cardName) {
            updateNetworkGraph(cardName, lang);
        }
    });
}


// =================================================================
// ヘルパー関数群
// =================================================================

function openTab(evt, tabName) {
    let i, tabcontent, tablinks;
    tabcontent = document.getElementsByClassName("tab-content");
    for (i = 0; i < tabcontent.length; i++) {
        tabcontent[i].style.display = "none";
    }
    tablinks = document.getElementsByClassName("tab-button");
    for (i = 0; i < tablinks.length; i++) {
        tablinks[i].className = tablinks[i].className.replace(" active", "");
    }
    const tabToShow = document.getElementById(tabName);
    tabToShow.style.display = "block";
    evt.currentTarget.className += " active";

    const graphInTab = tabToShow.querySelector('.plotly-graph-div');
    if (graphInTab) {
        Plotly.Plots.resize(graphInTab);
    }
}

function setupGraphFilters(lang) {
    const rarityFilter = document.getElementById('rarity-filter');
    const medalFilter = document.getElementById('medal-filter');
    const infoBox = document.getElementById('info-box');
    let hideBoxTimeout = null;

    const atkSliderEl = document.getElementById('attack-tendency-slider');
    const defSliderEl = document.getElementById('defense-tendency-slider');
    const atkAllCheckbox = document.getElementById('atk-tendency-all');
    const defAllCheckbox = document.getElementById('def-tendency-all');
    const tendencyLogicRadios = document.querySelectorAll('input[name="tendency-logic"]');
    const atkMinInput = document.getElementById('atk-tendency-min');
    const atkMaxInput = document.getElementById('atk-tendency-max');
    const defMinInput = document.getElementById('def-tendency-min');
    const defMaxInput = document.getElementById('def-tendency-max');

    function createSlider(element, minInput, maxInput) {
        if (!element) return null;
        const slider = noUiSlider.create(element, { start: [-2.5, 2.5], connect: true, range: { 'min': -2.5, 'max': 2.5 }, step: 0.05, margin: 0.05, format: { to: v => parseFloat(v).toFixed(2), from: v => Number(v) } });
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
            clearTimeout(hideBoxTimeout);
            const point = e.points[0];
            infoBox.innerHTML = createHoverText(point.customdata, lang);
            infoBox.style.opacity = 1;
            infoBox.style.transform = 'translateX(0)';
            infoBox.style.pointerEvents = 'auto';
            updateVisuals(point.customdata[(lang === 'ja' ? 'Card_Name' : 'Card_Name_EN')], point.customdata[(lang === 'ja' ? 'Co_occurrence_Partners' : 'Co_occurrence_Partners_EN')] || []);
        });
        GRAPH_DIV.on('plotly_unhover', () => {
            hideBoxTimeout = setTimeout(() => {
                infoBox.style.opacity = 0;
                infoBox.style.transform = 'translateX(20px)';
                infoBox.style.pointerEvents = 'none';
                updateVisuals(null, []);
            }, 900);
        });
        infoBox.addEventListener('mouseenter', () => clearTimeout(hideBoxTimeout));
        infoBox.addEventListener('mouseleave', () => {
            infoBox.style.opacity = 0;
            infoBox.style.transform = 'translateX(20px)';
            infoBox.style.pointerEvents = 'none';
            updateVisuals(null, []);
        });
    }

    [rarityFilter, medalFilter].forEach(f => f?.addEventListener('change', () => updateVisuals(null, [])));
    tendencyLogicRadios.forEach(r => r?.addEventListener('change', () => updateVisuals(null, [])));

    const analysisReports = document.getElementById('analysis-reports');
    if (analysisReports) {
        analysisReports.addEventListener('click', function(e) {
            const clickableCard = e.target.closest('.spotlight-card');
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
                    clearTimeout(hideBoxTimeout);
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
    if (!isAggView) {
        const aggCardData = ALL_DATA.agg_data_full.find(agg_d => agg_d[cardNameCol] === cardName);
        if (aggCardData) {
            sourceData = { ...aggCardData, ...d }; 
        }
    }

    const topCol = (lang === 'ja') ? 'Top_20_Co_occurrence' : 'Top_20_Co_occurrence_EN';
    const highlightCol = (lang === 'ja') ? 'Highlights_JA_Hover' : 'Highlights_EN_Hover';

    const highlightsHtml = sourceData[highlightCol] ? `<hr style='margin: 8px 0;'><b>${UI_TEXT.highlights}: ${sourceData.Medal || ''}</b><br>${sourceData[highlightCol]}` : "";
    const coOccurrenceHtml = sourceData[topCol] ? `<b>${UI_TEXT.top_20}:</b><br>${sourceData[topCol]}` : "";

    const createBoxplotHTML = (min, q1, median, q3, max, mean, scale_min = 25, scale_max = 75) => {
        if (min == null || q1 == null || median == null || q3 == null || max == null || mean == null) return "";
        const range = scale_max - scale_min;
        if (range <= 0) return "";
        const to_percent = val => (Math.max(scale_min, Math.min(scale_max, val)) - scale_min) / range * 100;
        const [p_min, p_q1, p_median, p_q3, p_max, p_mean] = [min, q1, median, q3, max, mean].map(to_percent);
        return `<div class="boxplot-wrapper"><div class="boxplot-container"><div class="boxplot-whisker" style="left:${p_min}%;width:${p_q1 - p_min}%;"></div><div class="boxplot-box" style="left:${p_q1}%;width:${p_q3 - p_q1}%;"></div><div class="boxplot-whisker" style="left:${p_q3}%;width:${p_max - p_q3}%;"></div><div class="boxplot-median" style="left:${p_median}%;"></div><div class="boxplot-mean" style="left:${p_mean}%;"></div></div><div class="boxplot-label" style="left:0;">25</div><div class="boxplot-label" style="left:48%;">50</div><div class="boxplot-label" style="right:0;">75</div></div>`;
    };

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

    let perfHtml = '', adoptionHtml = '';

    if (isAggView) {
        perfHtml = `
            <div>${UI_TEXT.attack_perf}: ${safeToFixed(sourceData.Weighted_Avg_Turn_Deviation, 2)}</div>
            ${createBoxplotHTML(sourceData.Turn_Min, sourceData.Turn_Q1, sourceData.Turn_Median, sourceData.Turn_Q3, sourceData.Turn_Max, sourceData.Weighted_Avg_Turn_Deviation)}
            <div>${UI_TEXT.defense_perf}: ${safeToFixed(sourceData.Weighted_Avg_HP_Deviation, 2)}</div>
            ${createBoxplotHTML(sourceData.HP_Min, sourceData.HP_Q1, sourceData.HP_Median, sourceData.HP_Q3, sourceData.HP_Max, sourceData.Weighted_Avg_HP_Deviation)}
            <div style='margin-top:5px;'>${UI_TEXT.stability}: ${safeToFixed(sourceData.Stability_Score, 2)}</div>
            <hr style='margin:5px 0;'>
            ${UI_TEXT.atk_tendency}: ${formatTendency(sourceData.Turn_Tendency, 0.25, -0.8)}${star(sourceData.Turn_Tendency)}<br>
            ${UI_TEXT.def_tendency}: ${formatTendency(sourceData.HP_Tendency, 0.25, -1.0)}${star(sourceData.HP_Tendency)}
        `;
        adoptionHtml = `
            <div style='margin-top:5px;'>
                ${UI_TEXT.adoption_rate}: ${safeToPercent(sourceData.Adoption_Rate, 1)}%<br>
                ${UI_TEXT.avg_copies_when_adopted}: ${safeToFixed(sourceData.Avg_Copies, 2)}<br>
                ${UI_TEXT.avg_upgrade_rate}: ${safeToPercent(sourceData.Avg_Upgrade_Rate, 1)}%
            </div>
        `;
    } else {
        perfHtml = `
            <div>${UI_TEXT.attack_perf_sit}: ${safeToFixed(d.Turn_Deviation, 2)}</div>
            <div>${UI_TEXT.defense_perf_sit}: ${safeToFixed(d.HP_Deviation, 2)}</div>
            <div style='margin-top:5px;'>${UI_TEXT.fights_sit}: ${d.Fights_With || 0}</div>
        `;
        adoptionHtml = `
            <hr style='margin: 8px 0;'>
            <b>${UI_TEXT.agg_view} Stats:</b><br>
            <div style='margin-top:5px;'>
                ${UI_TEXT.adoption_rate}: ${safeToPercent(sourceData.Adoption_Rate, 1)}%<br>
                ${UI_TEXT.avg_copies_when_adopted}: ${safeToFixed(sourceData.Avg_Copies, 2)}<br>
                ${UI_TEXT.avg_upgrade_rate}: ${safeToPercent(sourceData.Avg_Upgrade_Rate, 1)}%
            </div>
        `;
    }

    return `<div class='info-column'><b>${cardName}</b> ${wikiLinkHtml}<br>${UI_TEXT.type}: ${sourceData.Type}<br>${UI_TEXT.rarity}: ${sourceData.Rarity}<hr style='margin:5px 0;'>${perfHtml}${adoptionHtml}${highlightsHtml}</div><div class='info-column'>${coOccurrenceHtml}</div>`;
}


function updateVisuals(hoveredCardName, synergyPartners) {
    const rarityValue = document.getElementById('rarity-filter').value;
    const medalValue = document.getElementById('medal-filter').value;
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
            const rarityMatch = (rarityValue === 'All' || d.Rarity === rarityValue);
            const atkTendencyMatch = isAtkAll || (d.Turn_Tendency >= atkRange[0] && d.Turn_Tendency <= atkRange[1]);
            const defTendencyMatch = isDefAll || (d.HP_Tendency >= defRange[0] && d.HP_Tendency <= defRange[1]);
            const tendencyConditionMatch = (tendencyLogic === 'and') ? (atkTendencyMatch && defTendencyMatch) : (atkTendencyMatch || defTendencyMatch);
            let medalMatch = (medalValue === 'All') || (medalValue === 'Gold' && d.Medal === '🥇') || (medalValue === 'SilverOrBetter' && ['🥇', '🥈'].includes(d.Medal)) || (medalValue === 'BronzeOrBetter' && ['🥇', '🥈', '🥉'].includes(d.Medal)) || (medalValue === 'None' && (d.Medal === '' || d.Medal == null));
            const allFiltersMatch = rarityMatch && tendencyConditionMatch && medalMatch;

            let opacity = 0.7, lineWidth = 0, lineColor = 'black', fontColor = '#555';
            if (!allFiltersMatch) {
                opacity = 0.05; fontColor = '#ddd';
            } else if (hoveredCardName) {
                if (d[cardNameCol] === hoveredCardName) {
                    opacity = 1.0; lineWidth = 3; fontColor = '#333';
                } else if (synergyPartners && synergyPartners.includes(d[cardNameCol])) {
                    opacity = 0.9; lineWidth = 1; fontColor = '#333';
                } else {
                    opacity = 0.1; fontColor = '#ccc';
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

// script.js の createAnalysisReportsHtml 関数を置き換え

function createAnalysisReportsHtml(lang) {
    const cardNameCol = (lang === 'ja') ? 'Card_Name' : 'Card_Name_EN';
    // ★★★ 修正: ルックアップ用の全データを参照する ★★★
    const aggData = ALL_DATA.agg_data_full;
    const sitData = ALL_DATA.sit_data;

    if (!aggData || !sitData) return ""; // データがない場合は空文字を返す

    const top20Adopted = aggData.slice().sort((a, b) => b.Total_Fights_With - a.Total_Fights_With).slice(0, 20).map(d => d[cardNameCol]);
    const spotlightHtml = createSpotlightHtml(aggData, cardNameCol, top20Adopted);

    const act1Data = sitData.filter(d => d.Act === 1);
    const act4Data = sitData.filter(d => d.Act === 4);

    const createRankings = (data, nameCol) => {
        const perfMap = new Map();
        const adoptionMap = new Map();
        data.forEach(d => {
            const perfScore = (d.Turn_Deviation || 0) + (d.HP_Deviation || 0);
            if (!perfMap.has(d[nameCol])) perfMap.set(d[nameCol], { sum: 0, count: 0 });
            const perfEntry = perfMap.get(d[nameCol]);
            perfEntry.sum += perfScore;
            perfEntry.count++;

            if (!adoptionMap.has(d[nameCol])) adoptionMap.set(d[nameCol], 0);
            adoptionMap.set(d[nameCol], adoptionMap.get(d[nameCol]) + (d.Fights_With || 0));
        });

        const perfAvg = Array.from(perfMap.entries()).map(([name, data]) => [name, data.sum / data.count]);
        const topPerformers = perfAvg.sort((a, b) => b[1] - a[1]);
        const topAdoption = Array.from(adoptionMap.entries()).sort((a, b) => b[1] - a[1]);
        return { topPerformers, topAdoption };
    };

    const act1Rankings = createRankings(act1Data, cardNameCol);
    const act4Rankings = createRankings(act4Data, cardNameCol);

    const act1AdoptionHtml = createRankedListHtml("act1-adoption-report", UI_TEXT.act1_top_adoption_title, UI_TEXT.act1_top_adoption_desc, act1Rankings.topAdoption.slice(0, 20), (lang === 'ja' ? "採用数" : "Adoptions"), ".0f");
    const act1PerfHtml = createRankedListHtml("act1-performers-report", UI_TEXT.act1_top_performers_title, UI_TEXT.act1_top_performers_desc, act1Rankings.topPerformers.slice(0, 20), "Score", ".1f");
    const act4AdoptionHtml = createRankedListHtml("act4-adoption-report", UI_TEXT.act4_top_adoption_title, UI_TEXT.act4_top_adoption_desc, act4Rankings.topAdoption.slice(0, 40), (lang === 'ja' ? "採用数" : "Adoptions"), ".0f");
    const act4PerfHtml = createRankedListHtml("act4-performers-report", UI_TEXT.act4_top_performers_title, UI_TEXT.act4_top_performers_desc, act4Rankings.topPerformers.slice(0, 40), "Score", ".1f");

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

    return `<div id='analysis-reports'>${spotlightHtml}${act1AdoptionHtml}${act1PerfHtml}${act4AdoptionHtml}${act4PerfHtml}</div>${criteriaHtml}`;
}




function createSpotlightHtml(aggData, cardNameCol, top20Adopted) {
    const isLateGameSpecialist = (highlightsStr) => {
        if (!highlightsStr) return false;
        return highlightsStr.split('<br>').every(line => line.includes("Act 3") || line.includes("Act 4"));
    };

    let star_cards = [], honor_cards = [], high_roller_cards = [], solid_cards = [], balancer_cards = [], counter_cards = [];
    const highlightCol = (LANG === 'ja') ? 'Highlights_JA_Hover' : 'Highlights_EN_Hover';

    aggData.forEach(r => {
        const atk_tendency = r.Turn_Tendency || 0;
        const def_tendency = r.HP_Tendency || 0;
        const card_type = r.Type;
        const tendency_sum = atk_tendency + def_tendency;
        const perf_sum = (r.Weighted_Avg_Turn_Deviation || 0) + (r.Weighted_Avg_HP_Deviation || 0);
        const highlight_text = r[highlightCol] || '';
        const medal = r.Medal;

        const is_balanced_positive = atk_tendency > 0.25 && def_tendency > 0.25;
        const has_star = atk_tendency > 0.5 || def_tendency > 0.5;
        const has_big_star = atk_tendency > 0.75 || def_tendency > 0.75;
        const has_bronze_or_better = ["🥇", "🥈", "🥉"].includes(medal);

        if (medal === "🥇" || medal === "🥈") { honor_cards.push(r[cardNameCol]); }
        else if (is_balanced_positive && has_big_star) { honor_cards.push(r[cardNameCol]); }
        else if (has_bronze_or_better && is_balanced_positive && has_star) { honor_cards.push(r[cardNameCol]); }
        else if (perf_sum < 100 && highlight_text.includes("Act 4 - Boss")) { star_cards.push(r[cardNameCol]); }
        else if (medal && isLateGameSpecialist(highlight_text)) { star_cards.push(r[cardNameCol]); }
        else if (card_type !== 'Misfortune' && ((tendency_sum >= 0.75 && medal) || (tendency_sum >= 1.0)) && perf_sum >= 100) { honor_cards.push(r[cardNameCol]); }
        else if (atk_tendency >= 0.25 && (def_tendency >= -0.75 && def_tendency <= 0.25)) { high_roller_cards.push(r[cardNameCol]); }
        else if (def_tendency >= 0.25 && (atk_tendency >= -0.75 && atk_tendency <= 0.25)) { solid_cards.push(r[cardNameCol]); }
        else if (atk_tendency > 0 && def_tendency > 0 && tendency_sum >= 0.5) { balancer_cards.push(r[cardNameCol]); }
        else if (tendency_sum < -1.5 && medal) { counter_cards.push(r[cardNameCol]); }
        else if (atk_tendency > 1.0 || def_tendency > 1.0) { star_cards.push(r[cardNameCol]); }
    });

    const createList = (title, desc, cards) => {
        if (!cards || cards.length === 0) return "";
        const uniqueCards = [...new Set(cards)].sort();
        const listItems = uniqueCards.map(name => {
            const liClass = `spotlight-card ${top20Adopted.includes(name) ? 'top-adopted' : ''}`;
            return `<li class="${liClass}" data-card-name="${name}">${name}</li>`;
        }).join('');
        return `<h4>${title}</h4><p class="spotlight-desc">${desc}</p><ul>${listItems}</ul>`;
    };

    let html = `<div id='spotlight-report' class='analysis-section'><h3>${UI_TEXT.spotlight_title}</h3><p style='font-size:11px; color:#777; margin-top:-5px; margin-bottom:15px;'>${UI_TEXT.spotlight_note}</p>`;
    html += createList(UI_TEXT.spotlight_cat0_title, UI_TEXT.spotlight_cat0_desc, star_cards);
    html += createList(UI_TEXT.spotlight_cat1_title, UI_TEXT.spotlight_cat1_desc, honor_cards);
    html += createList(UI_TEXT.spotlight_cat5_title, UI_TEXT.spotlight_cat5_desc, balancer_cards);
    html += createList(UI_TEXT.spotlight_cat2_title, UI_TEXT.spotlight_cat2_desc, high_roller_cards);
    html += createList(UI_TEXT.spotlight_cat3_title, UI_TEXT.spotlight_cat3_desc, solid_cards);
    html += createList(UI_TEXT.spotlight_cat4_title, UI_TEXT.spotlight_cat4_desc, counter_cards);
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
    if (!ALL_DATA.exhibit_data) {
        container.innerHTML = `<div class='analysis-section'><h3>${UI_TEXT.exhibit_title}</h3><p>${UI_TEXT.no_data}</p></div>`;
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

function renderRouteEventTab(lang) {
    const container = document.getElementById('route-event-tab');
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

    let flowChartHtml = '<div class="route-acts-container">';
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
                const color = node_type_colors[node_type] || '#BDBDBD';
                const node_full_id = `${node_id_base}-${node_type}`;
                const label = node_type_labels[node_type] || node_type[0];
                barHtml += `<div id="bar-${node_full_id}" class="node-choice-segment" style="width: ${percentage * 100}%; background-color: ${color};" title="${node_type}: ${(percentage * 100).toFixed(1)}%" onmouseover="showNodeDetails('${node_full_id}')">${label}</div>`;
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

                    let table_html = `<h5>${UI_TEXT.encounter_title}</h5><table class="enemy-stats-table">`;
                    table_html += `<thead><tr><th>${UI_TEXT.enemy_table_metric}</th>${sorted_enemies.map(e => `<th>${e[lang]}</th>`).join('')}</tr></thead>`;
                    table_html += '<tbody>';
                    table_html += `<tr><td>${UI_TEXT.enemy_table_rate}</td>${sorted_enemies.map(e => `<td>${(e.rate * 100).toFixed(1)}%</td>`).join('')}</tr>`;
                    table_html += `<tr><td>${UI_TEXT.enemy_table_avg_t}</td>${sorted_enemies.map(e => `<td>${e.avg_turns.toFixed(1)}${createInlineBoxplotHtml(e.turns_boxplot, scales.turns_min, scales.turns_max)}</td>`).join('')}</tr>`;
                    table_html += `<tr><td>${UI_TEXT.enemy_table_hp}</td>${sorted_enemies.map(e => `<td style='background-color:${getColorForValue(e.avg_hp_loss, act_stats[act].hp_min, act_stats[act].hp_max)}'>${(-e.avg_hp_loss).toFixed(1)}${createInlineBoxplotHtml(e.hp_loss_boxplot, scales.hp_loss_min, scales.hp_loss_max, true)}</td>`).join('')}</tr>`;
                    table_html += `<tr><td>${UI_TEXT.enemy_table_p}</td>${sorted_enemies.map(e => `<td style='background-color:${getColorForValue(e.avg_p_change, act_stats[act].p_min, act_stats[act].p_max, true)}'>${e.avg_p_change.toFixed(1)}${createInlineBoxplotHtml(e.p_change_boxplot, scales.p_change_min, scales.p_change_max)}</td>`).join('')}</tr>`;
                    table_html += '</tbody></table>';
                    top_section_html = table_html;
                }

                const node_actions = event_actions[node_full_key] || {};
                ['Card', 'Exhibit'].forEach(item_type => {
                    ['Add', 'Remove', 'Upgrade'].forEach(action_type => {
                        const items = node_actions[`${action_type}_${item_type}`];
                        if (items && items.length > 0) {
                            has_content = true;
                            const title_key = `${node_type.toLowerCase()}_${action_type.toLowerCase()}_${item_type.toLowerCase()}`;
                            const title = UI_TEXT[title_key] || UI_TEXT[`${item_type.toLowerCase()}_${action_type.toLowerCase()}`] || `${action_type} ${item_type}`;
                            
                            const lookup_table = (item_type === 'Card') ? ALL_DATA.lookup_tables.cards : ALL_DATA.lookup_tables.exhibits;
                            const name_key = (lang === 'ja') ? 'JA' : 'EN';

                            const list_items = items.map(([item_id, count]) => {
                                const item_info = lookup_table[item_id] || {};
                                const display_name = item_info[name_key] || item_id;
                                return `<li>${createWikiLink(display_name, item_type.toLowerCase(), lang)} (${count})</li>`;
                            }).join('');

                            if (item_type === 'Card') {
                                card_grid_content += `<div><h5>${title}</h5><ol>${list_items}</ol></div>`;
                            } else {
                                exhibit_grid_content += `<div><h5>${title}</h5><ol>${list_items}</ol></div>`;
                            }
                        }
                    });
                });
                
                if (top_section_html) details_content += `<div class="details-section">${top_section_html}</div>`;
                if (card_grid_content) details_content += `<div class="details-section"><h5>${UI_TEXT.card_section_title}</h5><div class="details-grid">${card_grid_content}</div></div>`;
                if (exhibit_grid_content) details_content += `<div class="details-section"><h5>${UI_TEXT.exhibit_section_title}</h5><div class="details-grid">${exhibit_grid_content}</div></div>`;

                if (!has_content) {
                    details_content += `<p>${UI_TEXT.no_data}</p>`;
                }
                detailsPanelHtml += `<div id="${details_id}" class="node-details">${details_content}</div>`;
            });
        });
        actHtmlSegment += '</div>';
        flowChartHtml += actHtmlSegment;
    }

    flowChartHtml += '</div>';
    detailsPanelHtml += '</div>';

    container.innerHTML = `<div class='analysis-section'>
        <h3>${UI_TEXT.node_selection_title}</h3>
        <p>${UI_TEXT.node_selection_desc}</p>
        <div class='route-analysis-wrapper'>${flowChartHtml}${detailsPanelHtml}</div>
    </div>`;
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

    const tooltip = is_negative 
        ? `最小: ${(-b_max).toFixed(1)}, 25%: ${(-q3).toFixed(1)}, 中央: ${(-median).toFixed(1)}, 75%: ${(-q1).toFixed(1)}, 最大: ${(-b_min).toFixed(1)}, 平均: ${(-mean).toFixed(1)}`
        : `最小: ${b_min.toFixed(1)}, 25%: ${q1.toFixed(1)}, 中央: ${median.toFixed(1)}, 75%: ${q3.toFixed(1)}, 最大: ${b_max.toFixed(1)}, 平均: ${mean.toFixed(1)}`;
    
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

        // ★★★ Actごとのスケール（箱ひげ図用と背景色用）を事前に計算 ★★★
        const actScales = {};
        const actStats = {};
        const acts = [...new Set(sortedData.map(d => d.Act))];

        acts.forEach(act => {
            const actData = sortedData.filter(d => d.Act === act);
            // 背景色用のスケール
            actStats[act] = {
                hp_loss_min: Math.min(...actData.map(d => d.Avg_HP_Loss)),
                hp_loss_max: Math.max(...actData.map(d => d.Avg_HP_Loss)),
                p_change_min: Math.min(...actData.map(d => d.Avg_P_Change)),
                p_change_max: Math.max(...actData.map(d => d.Avg_P_Change)),
            };
            // 箱ひげ図用のスケール
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
            
            // 箱ひげ図のHTMLを生成
            const scales = actScales[row.Act] || {};
            const turnsBoxplotHtml = createInlineBoxplotHtml(row.TurnsBoxplot, scales.turns_min, scales.turns_max);
            const hpLossBoxplotHtml = createInlineBoxplotHtml(row.HpLossBoxplot, scales.hp_loss_min, scales.hp_loss_max, true);
            const pChangeBoxplotHtml = createInlineBoxplotHtml(row.PChangeBoxplot, scales.p_change_min, scales.p_change_max);

            // ★★★ 背景色を計算 ★★★
            const statsForAct = actStats[row.Act] || {};
            // HPロス: 値が大きいほど悪い(赤) -> reverse_color: false
            const hpColor = getColorForValue(row.Avg_HP_Loss, statsForAct.hp_loss_min, statsForAct.hp_loss_max, false);
            // P変動: 値が大きいほど良い(緑) -> reverse_color: true
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
