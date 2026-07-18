function renderCardPerformanceTab(char, lang) {
    const container = document.getElementById('card-performance-tab');
    if (!container) return;

    // メインタイトルを設定
    const mainTitleEl = document.getElementById('main-title');
    if (mainTitleEl) {
        mainTitleEl.textContent = UI_TEXT.card_perf.agg_title
            .replace('{character}', CURRENT_CHAR)
            .replace('{version}', DATA_VERSION);
    }

    const filterBarHtml = createFilterBarHtml();
    const graphDiv = '<div id="plotly-graph" class="plotly-graph-div" style="width:100%; height:800px;"></div>';
    const analysisReportsHtml = createAnalysisReportsHtml(lang);

    container.innerHTML = filterBarHtml + graphDiv + analysisReportsHtml;

    GRAPH_DIV = document.getElementById('plotly-graph');
    drawPlotlyGraph(char, lang);
    setupGraphFilters(lang);
}

function createFilterBarHtml() {
    const T = UI_TEXT.card_perf.filters;
    const C = UI_TEXT.common;
    return `
    <div id="custom-filters">
        <div id="filter-toggle-button" class="filter-toggle-button">${T.open}</div>
        <div id="filter-content" class="filter-content collapsed">

            <div class="filter-row">
                <div class="filter-group" id="filter-group-rarity">
                    <label>${C.rarity}:</label>
                    <select id="rarity-filter">
                        <option value="All">${C.filter_all}</option>
                        <option value="Common">Common</option>
                        <option value="Uncommon">Uncommon</option>
                        <option value="Rare">Rare</option>
                    </select>
                </div>

                <div class="filter-group" id="filter-group-medal">
                    <label>${T.medal_label}</label>
                    <select id="medal-filter">
                        <option value="All">${T.medal_all}</option>
                        <option value="Gold">${T.medal_gold}</option>
                        <option value="SilverOrBetter">${T.medal_silver}</option>
                        <option value="BronzeOrBetter">${T.medal_bronze}</option>
                        <option value="None">${T.medal_none}</option>
                    </select>
                </div>
            </div>

            <div class="slider-filter-group" id="filter-group-attention">
                <label>${T.attention_score_label}:</label>
                <div class="slider-container-single" style="width: 250px;">
                    <div id="attention-score-slider" class="slider"></div>
                    <span id="attention-score-value"></span>
                </div>
            </div>

            <div class="slider-filter-group" id="filter-group-atk">
                <label>${T.atk_tendency_label}</label>
                <div class="slider-container">
                    <input type="checkbox" id="atk-tendency-all" checked>
                    <label for="atk-tendency-all" class="checkbox-label">${C.filter_all}</label>
                    <input type="number" id="atk-tendency-min" class="slider-input" step="0.05">
                    <div id="attack-tendency-slider" class="slider"></div>
                    <input type="number" id="atk-tendency-max" class="slider-input" step="0.05">
                </div>
            </div>
            <div class="filter-group" id="filter-group-logic">
                <input type="radio" id="tendency-logic-and" name="tendency-logic" value="and" checked>
                <label for="tendency-logic-and" class="checkbox-label">${T.tendency_condition_and}</label>
                <input type="radio" id="tendency-logic-or" name="tendency-logic" value="or">
                <label for="tendency-logic-or" class="checkbox-label">${T.tendency_condition_or}</label>
            </div>
            <div class="slider-filter-group" id="filter-group-def">
                <label>${T.def_tendency_label}</label>
                <div class="slider-container">
                    <input type="checkbox" id="def-tendency-all" checked>
                    <label for="def-tendency-all" class="checkbox-label">${C.filter_all}</label>
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
        GRAPH_DIV.innerHTML = UI_TEXT.common.no_data;
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

    const aggTitle = UI_TEXT.card_perf.agg_title.replace('{character}', char).replace('{version}', DATA_VERSION);
    const sitTitle = UI_TEXT.card_perf.sit_title.replace('{character}', char).replace('{version}', DATA_VERSION);

    const situationButtons = orderedSituations.map((situation, i) => {
        const visibility = Array(numAggTraces + totalSitTraces).fill(false);
        const startIndex = numAggTraces + (i * numSitTracesPerSituation);
        for (let j = 0; j < numSitTracesPerSituation; j++) { visibility[startIndex + j] = true; }
        const situationLabel = `Act${situation[0]} - ${situation[1]}`;
        return { label: situationLabel, method: "update", args: [{ visible: visibility }, { "title.text": `${sitTitle}: ${situationLabel}` }] };
    });

    const layout = {
        height: 800,
        title: { text: aggTitle, x: 0.05, y: 0.98, xanchor: 'left', yanchor: 'top' },
        xaxis: { range: X_RANGE, title: UI_TEXT.card_perf.graph.xaxis },
        yaxis: { range: Y_RANGE, title: UI_TEXT.card_perf.graph.yaxis, scaleanchor: "x", scaleratio: 1 },
        hovermode: 'closest',
        legend: { orientation: "h", xanchor: "center", yanchor: "top", x: 0.5, y: -0.15 },
        dragmode: 'pan',
        modebar: { orientation: 'v' },
        updatemenus: [
            { type: "buttons", direction: "right", active: 0, x: 0, y: 1.08, xanchor: "left", yanchor: "top", buttons: [
                { label: UI_TEXT.card_perf.view.agg, method: "update", args: [{ visible: aggVisibility }, { "title.text": aggTitle, "updatemenus[1].visible": false }] },
                { label: UI_TEXT.card_perf.view.sit, method: "update", args: [{ visible: sitVisibilityInitial }, { "title.text": `${sitTitle}: ${`Act${orderedSituations[0][0]} - ${orderedSituations[0][1]}` || ''}`, "updatemenus[1].visible": true }] }
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

function setupGraphFilters(lang) {
    const filterToggleButton = document.getElementById('filter-toggle-button');
    const filterContent = document.getElementById('filter-content');

    if (filterToggleButton && filterContent) {
        filterToggleButton.addEventListener('click', () => {
            const isCollapsed = filterContent.classList.contains('collapsed');
            if (isCollapsed) {
                filterContent.classList.remove('collapsed');
                filterToggleButton.textContent = UI_TEXT.card_perf.filters.close;
            } else {
                filterContent.classList.add('collapsed');
                filterToggleButton.textContent = UI_TEXT.card_perf.filters.open;
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
            const cardNameCol = (lang === 'ja' ? 'Card_Name' : 'Card_Name_EN');
            const nameKey = (lang === 'ja' ? 'JA' : 'EN');
            const cardLookup = ALL_DATA.lookup_tables.cards;
            const partnerIds = point.customdata.Co_occurrence_Partners || [];
            const partnerNames = partnerIds.map(id => cardLookup[id]?.[nameKey] || id);
            updateVisuals(point.customdata[cardNameCol], partnerNames);
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
                const cardNameCol = (LANG === 'ja') ? 'Card_Name' : 'Card_Name_EN';
                const nameKey = (LANG === 'ja') ? 'JA' : 'EN';
                const cardLookup = ALL_DATA.lookup_tables.cards;
                const partnerIds = pointData.Co_occurrence_Partners || [];
                const partnerNames = partnerIds.map(id => cardLookup[id]?.[nameKey] || id);
                updateVisuals(pointData[cardNameCol], partnerNames);

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

    const M = UI_TEXT.card_perf.metrics;

    if (isAggView) {
        turnPlotData = sourceData.Turn_Deviation_Situational_Values || [];
        hpPlotData = sourceData.HP_Deviation_Situational_Values || [];
        turnScalingParams = undefined;
        hpScalingParams = undefined;
        turnHighlight = sourceData.Weighted_Avg_Turn_Deviation;
        hpHighlight = sourceData.Weighted_Avg_HP_Deviation;

        perfHtml = `
            <div>${M.attack_perf}: ${safeToFixed(sourceData.Weighted_Avg_Turn_Deviation, 2)}</div>
            <div id="dist-plot-turn" class="dist-plot-container"></div>
            <div>${M.defense_perf}: ${safeToFixed(sourceData.Weighted_Avg_HP_Deviation, 2)}</div>
            <div id="dist-plot-hp" class="dist-plot-container"></div>
            <hr style='margin:5px 0;'>
            <div class="tooltip-row">
                <span>${M.atk_tendency}:</span>
                <span>${formatTendency(sourceData.Turn_Tendency, 0.25, -0.8)}${star(sourceData.Turn_Tendency)}</span>
            </div>
            <div class="tooltip-row">
                <span>${M.def_tendency}:</span>
                <span>${formatTendency(sourceData.HP_Tendency, 0.25, -1.0)}${star(sourceData.HP_Tendency)}</span>
            </div>
        `;
    } else {
        const S = UI_TEXT.card_perf.situation;
        perfHtml = `
            <div>${S.attack_perf}: ${safeToFixed(d.Turn_Deviation, 2)}</div>
            <div>${S.defense_perf}: ${safeToFixed(d.HP_Deviation, 2)}</div>
        `;
    }

    let adoptionHtml = '';
    if (isAggView) {
         adoptionHtml = `
            <hr style='margin: 8px 0;'>
            <div class="tooltip-row"><span>${M.adoption_rate}:</span><span>${safeToPercent(sourceData.Adoption_Rate, 1)}%</span></div>
            <div class="tooltip-row"><span>${UI_TEXT.card_perf.filters.attention_score_label}:</span><span>${safeToFixed(sourceData.Attention_Score, 1)}</span></div>
            <div class="tooltip-row"><span>${M.stability}:</span><span>${safeToFixed(sourceData.Stability_Score, 1)}</span></div>
            <hr style='margin: 8px 0;'>
            ${M.avg_copies_when_adopted}: ${safeToFixed(sourceData.Avg_Copies, 2)}<br>
            ${M.avg_upgrade_rate}: ${safeToPercent(sourceData.Avg_Upgrade_Rate, 1)}%
        `;
    } else {
        const S = UI_TEXT.card_perf.situation;
        const V = UI_TEXT.card_perf.view;
        const sitAdoptionRate = (d.Total_Fights_In_Situation > 0)
            ? (d.Fights_With / d.Total_Fights_In_Situation)
            : null;

         adoptionHtml = `
            <hr style='margin: 8px 0;'>
            <b>${V.sit} Stats:</b><br>
            <div class="tooltip-row">
                <span>${S.adoption_rate}:</span>
                <span>${safeToPercent(sitAdoptionRate, 1)}% (${d.Fights_With || 0}回)</span>
            </div>
            <hr style='margin: 8px 0;'>
            <b>${V.agg} Stats (参考):</b><br>
            <div class="tooltip-row"><span>${M.adoption_rate}:</span><span>${safeToPercent(sourceData.Adoption_Rate, 1)}%</span></div>
            <div class="tooltip-row"><span>${UI_TEXT.card_perf.filters.attention_score_label}:</span><span>${safeToFixed(sourceData.Attention_Score, 1)}</span></div>
            <div class="tooltip-row"><span>${M.stability}:</span><span>${safeToFixed(sourceData.Stability_Score, 1)}</span></div>
        `;
    }

    const highlightCol = (lang === 'ja') ? 'Highlights_JA_Hover' : 'Highlights_EN_Hover';
    const highlightsHtml = sourceData[highlightCol] ? `<hr style='margin: 8px 0;'><b>${UI_TEXT.card_perf.highlights.title}: ${sourceData.Medal || ''}</b><br>${sourceData[highlightCol]}` : "";

    let coOccurrenceHtml = '';
    const cardLookup = ALL_DATA.lookup_tables.cards;
    const nameKey = (lang === 'ja') ? 'JA' : 'EN';
    const H = UI_TEXT.card_perf.highlights;

    const createCoOccurrenceHtml = (list) => {
        if (!list || list.length === 0) return '';
        return list.map(item => {
            const cardInfo = cardLookup[item.id] || {};
            const cardName = cardInfo[nameKey] || item.id;
            const synergyMark = item.synergy === true ? ' ★' : '';
            const rate = item.rate != null ? item.rate.toFixed(1) : 'N/A';
            return `${cardName} (${rate}%)${synergyMark}`;
        }).join('<br>');
    };

    if (isAggView) {
        const top20List = sourceData.Top_20_Co_occurrence;
        const hiddenSynergies = sourceData.Hidden_Synergies;

        let htmlParts = [];
        if (top20List && top20List.length > 0) {
            htmlParts.push(`<b>${H.top_20}:</b><br>${createCoOccurrenceHtml(top20List)}`);
        }

        if (hiddenSynergies && hiddenSynergies.length > 0) {
            htmlParts.push(`<br>${H.hidden_synergy_candidates}<br>${createCoOccurrenceHtml(hiddenSynergies)}`);
        }
        coOccurrenceHtml = htmlParts.join('');

    } else {
        const S = UI_TEXT.card_perf.situation;
        const situationalCoOccurrence = d.Situational_Co_occurrence;
        if (situationalCoOccurrence && situationalCoOccurrence.length > 0) {
            coOccurrenceHtml = `<b>${S.top_20}:</b><br>${createCoOccurrenceHtml(situationalCoOccurrence)}`;
        } else {
            coOccurrenceHtml = `<b>${S.top_20}:</b><br><span style="font-size:11px; color:#999;">${UI_TEXT.common.no_data}</span>`;
        }
    }

    const tooltipHtml = `<div class='info-column'><b>${cardName}</b> ${wikiLinkHtml}<br>${UI_TEXT.common.type}: ${sourceData.Type}<br>${UI_TEXT.common.rarity}: ${sourceData.Rarity}<hr style='margin:5px 0;'>${perfHtml}${adoptionHtml}${highlightsHtml}</div><div class='info-column'>${coOccurrenceHtml}</div>`;


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
        if(container) container.innerHTML = `<p style="font-size:10px; color:#999; text-align: center; margin: 20px 0;">${UI_TEXT.common.no_data}</p>`;
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
                type: 'line', x0: highlightRawValue, x1: highlightRawValue, y0: -0.4, y1: 0.4,
                line: { color: 'red', width: 2, dash: 'solid' }, layer: 'above'
            });
        }
    } else {
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
                type: 'line', x0: highlightValue, x1: highlightValue, y0: -0.4, y1: 0.4,
                line: { color: 'red', width: 2, dash: 'solid' }, layer: 'above'
            });
        }
    }

    const layout = {
        height: 60,
        margin: { l: 25, r: 25, b: 25, t: 5 },
        xaxis: xAxisLayout,
        yaxis: { showticklabels: false, showgrid: false },
        showlegend: false,
        paper_bgcolor: 'rgba(0,0,0,0)',
        plot_bgcolor: 'rgba(0,0,0,0)',
        shapes: shapes
    };

    const config = { staticPlot: true, displayModeBar: false };
    Plotly.newPlot(divId, [trace], layout, config);
}


function updateVisuals(hoveredCardName, synergyPartners) {
    if (!GRAPH_DIV || !GRAPH_DIV.layout) return;

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


function createAnalysisReportsHtml(lang) {
    const cardNameCol = (lang === 'ja') ? 'Card_Name' : 'Card_Name_EN';
    const rankableAggData = ALL_DATA.agg_data_full.filter(d => d.Turn_Tendency !== null && d.HP_Tendency !== null);

    if (!rankableAggData || rankableAggData.length === 0) {
        return `<div id='analysis-reports'><p>${UI_TEXT.common.no_data}</p></div>`;
    }

    const attentionRankingHtml = createAttentionRankingHtml(rankableAggData, cardNameCol, lang);
    
    // createSitRankings is not defined and the report was moved to another tab.
    // const act1Rankings = createSitRankings(ALL_DATA.sit_data.filter(d => d.Act === 1), cardNameCol);
    // const act1PerfHtml = createRankedListHtml("act1-performers-report", UI_TEXT.card_list.act1_top_performers_title, UI_TEXT.card_list.act1_top_performers_desc, act1Rankings.topPerformers.slice(0, 20), "Score", ".1f");
    
    const act4Performers = rankableAggData
        .filter(d => d.Turn_Act_4 != null && d.HP_Act_4 != null)
        .map(d => [d[cardNameCol], (d.Turn_Act_4 + d.HP_Act_4)])
        .sort((a, b) => b[1] - a[1]);
    const act4PerfHtml = createRankedListHtml("act4-performers-report", UI_TEXT.card_list.act4_top_performers_title, UI_TEXT.card_list.act4_top_performers_desc, act4Performers.slice(0, 40), "Score", ".1f");

    const tendencyPerfHtml = createTendencyRankingHtml(rankableAggData, cardNameCol);

    return `<div id='analysis-reports'>
                ${attentionRankingHtml}
                ${act4PerfHtml}
                ${tendencyPerfHtml}
            </div>`;
}

function createAttentionRankingHtml(aggData, cardNameCol, lang) {
    const topN = 40;
    const sortedData = [...aggData]
        .filter(d => d.Attention_Score !== null)
        .sort((a, b) => b.Attention_Score - a.Attention_Score)
        .slice(0, topN);

    if (sortedData.length === 0) return '';

    const L = UI_TEXT.card_list;
    const F = UI_TEXT.card_perf.filters;
    const title = L.attention_ranking_title;
    const description = L.attention_ranking_desc;
    const attentionLabel = F.attention_score_label;
    const adoptionLabel = L.adoption_rate_header;
    const performanceLabel = L.performance_header;

    const splitPoint = Math.ceil(sortedData.length / 2);
    const col1Data = sortedData.slice(0, splitPoint);
    const col2Data = sortedData.slice(splitPoint);

    const createLi = (d) => {
        const cardName = d.Medal ? `${d.Medal} ${d[cardNameCol]}` : d[cardNameCol];
        const performance = (d.Weighted_Avg_Turn_Deviation + d.Weighted_Avg_HP_Deviation) / 2;
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

function createTendencyRankingHtml(aggData, cardNameCol) {
    const ADOPTION_RATE_THRESHOLD = 0.05;
    const baseTendencyData = aggData.filter(d => d[cardNameCol] && d.Adoption_Rate >= ADOPTION_RATE_THRESHOLD);
    
    const attackTendencyTop20 = baseTendencyData.filter(d => d.Turn_Tendency != null).sort((a, b) => b.Turn_Tendency - a.Turn_Tendency).slice(0, 20);
    const defenseTendencyTop20 = baseTendencyData.filter(d => d.HP_Tendency != null).sort((a, b) => b.HP_Tendency - a.HP_Tendency).slice(0, 20);

    const L = UI_TEXT.card_list;
    const M = UI_TEXT.card_perf.metrics;

    const createListItems = (data, valueKey, valueLabel) => {
        return data.map(d => {
            const cardName = d[cardNameCol];
            const value = d[valueKey];
            return `<li><strong class="spotlight-card" data-card-name="${cardName}" style="cursor:pointer; background:none; padding:0; display:inline;">${cardName}</strong> (${valueLabel}: ${value.toFixed(2)})</li>`;
        }).join('');
    };

    const attackListHtml = createListItems(attackTendencyTop20, 'Turn_Tendency', M.atk_tendency);
    const defenseListHtml = createListItems(defenseTendencyTop20, 'HP_Tendency', M.def_tendency);

    return `
        <div id="tendency-ranking-report" class="analysis-section">
            <h3>${L.tendency_top_performers_title}</h3>
            <p>${L.tendency_ranking_desc}</p>
            <div style="display: flex; gap: 40px; flex-wrap: wrap;">
                <div style="flex: 1; min-width: 300px;">
                    <h4>${L.attack_tendency_top_10_title}</h4>
                    <ol style="padding-left: 25px; margin-top: 0;">${attackListHtml}</ol>
                </div>
                <div style="flex: 1; min-width: 300px;">
                    <h4>${L.defense_tendency_top_10_title}</h4>
                    <ol style="padding-left: 25px; margin-top: 0;">${defenseListHtml}</ol>
                </div>
            </div>
        </div>
    `;
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

// These functions are no longer used as the reports are moved to card-list.js
// function createUpgradeRankingHtml(...) {}
// function createRemoveRankingHtml(...) {}
// function createSpotlightHtml(...) {}
// function createSitRankings(...) {}