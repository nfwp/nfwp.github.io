function renderEnemyAnalysisTab(char, lang) {
    const container = document.getElementById('enemy-analysis-tab');
    if (!container) return;

    const isMobile = window.innerWidth <= 768;

    const T = UI_TEXT.enemy;
    const C = UI_TEXT.common;

    const enemyData = ALL_DATA.enemy_data;
    if (!enemyData || enemyData.length === 0) {
        container.innerHTML = `<div class='analysis-section'><h3>${T.title}</h3><p>${C.no_data}</p></div>`;
        return;
    }

    const allChars = [...new Set(enemyData.map(d => d.Character))].sort();
    const dropdownHtml = `
        <div style="margin-bottom: 15px;">
            <label for="char-select-enemy-analysis" style="margin-right: 10px;"><b>${C.character}:</b></label>
            <select id="char-select-enemy-analysis" onchange="switchEnemyAnalysisCharacter(this.value)">
                ${allChars.map(c => `<option value="${c}"${c === char ? ' selected' : ''}>${c}</option>`).join('')}
            </select>
        </div>`;

    // --- NEW: チェックボックスのHTMLを追加 ---
    const columnToggleHtml = `
        <div class="column-toggle-container" style="margin-bottom: 15px; padding: 10px; background-color: #f9f9f9; border: 1px solid #ddd; border-radius: 4px;">
            <h4 style="margin-top: 0; margin-bottom: 8px;">${T.toggle_title || '表示項目'}</h4>
            <div class="toggle-options" style="display: flex; flex-wrap: wrap; gap: 15px;">
                <label><input type="checkbox" class="enemy-column-toggle" data-col="avg-turns" checked> ${T.table.avg_t}</label>
                <label><input type="checkbox" class="enemy-column-toggle" data-col="hp-loss" checked> ${T.table.hp}</label>
                <label><input type="checkbox" class="enemy-column-toggle" data-col="p-change" checked> ${T.table.p}</label>
            </div>
        </div>
    `;

    let allTablesHtml = '';
    allChars.forEach(charOption => {
        const enemyDfChar = enemyData.filter(d => d.Character === charOption);
        const displayStyle = charOption === char ? 'block' : 'none';
        const tableId = `enemy-analysis-table-${charOption}`;

        let headers;
        if (isMobile) {
            headers = `
                <th class="col-act">${T.table.act}</th>
                <th class="col-name">${T.table.name}</th>
                <th class="col-encounters">${T.table.encounters}</th>
                <th>${T.table.item_header || '項目'}</th>
                <th>${T.table.value_header || '各種変化'}</th>
            `;
        } else {
            // PC版: ヘッダーにクラスを追加
            headers = `
                <th class="col-act" onclick="sortTable('${tableId}', 0, 'numeric')">${T.table.act}</th>
                <th class="col-name" onclick="sortTable('${tableId}', 1, 'string')">${T.table.name}</th>
                <th class="col-encounters" onclick="sortTable('${tableId}', 2, 'numeric')">${T.table.encounters}</th>
                <th class="col-stats col-avg-turns" onclick="sortTable('${tableId}', 3, 'numeric')">${T.table.avg_t}</th>
                <th class="col-stats col-hp-loss" onclick="sortTable('${tableId}', 4, 'numeric')">${T.table.hp}</th>
                <th class="col-stats col-p-change" onclick="sortTable('${tableId}', 5, 'numeric')">${T.table.p}</th>`;
        }

        const typeOrderMap = { 'Enemy': 0, 'EliteEnemy': 1, 'Boss': 2 };
        const sortedData = enemyDfChar.sort((a, b) => a.Act - b.Act || (typeOrderMap[a.Type] - typeOrderMap[b.Type]) || a.MinLevel - b.MinLevel);

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
        });

        const rows = sortedData.map(row => {
            const nameCol = (lang === 'ja') ? 'EnemyName_JA' : 'EnemyName_EN';
            const trClass = row.Type === 'EliteEnemy' ? 'elite-enemy' : row.Type === 'Boss' ? 'boss-enemy' : '';

            const createQuartileText = (boxplotData, isHpLoss = false) => {
                if (!boxplotData || boxplotData.q1 == null || boxplotData.median == null || boxplotData.q3 == null) return '';
                let q1 = boxplotData.q1, median = boxplotData.median, q3 = boxplotData.q3;
                if (isHpLoss) {
                    [q1, median, q3] = [-boxplotData.q3, -boxplotData.median, -boxplotData.q1];
                }
                return ` <span class="quartile-text">[${q1.toFixed(1)} , ${median.toFixed(1)} , ${q3.toFixed(1)}]</span>`;
            };
            const turnsQuartileText = createQuartileText(row.TurnsBoxplot);
            const hpQuartileText = createQuartileText(row.HpLossBoxplot, true);
            const pChangeQuartileText = createQuartileText(row.PChangeBoxplot);

            const turnsBoxplotHtml = createInlineBoxplotHtml(row.TurnsBoxplot, row.TurnsBoxplot?.min, row.TurnsBoxplot?.max);
            const hpLossBoxplotHtml = createInlineBoxplotHtml(row.HpLossBoxplot, row.HpLossBoxplot?.min, row.HpLossBoxplot?.max, true);
            const pChangeBoxplotHtml = createInlineBoxplotHtml(row.PChangeBoxplot, row.PChangeBoxplot?.min, row.PChangeBoxplot?.max);

            const statsForAct = actStats[row.Act] || {};
            const hpColor = getColorForValue(row.Avg_HP_Loss, statsForAct.hp_loss_min, statsForAct.hp_loss_max, false);
            const pColor = getColorForValue(row.Avg_P_Change, statsForAct.p_change_min, statsForAct.p_change_max, true);

            if (isMobile) {
                // モバイル版: rowspanを廃止し、各行にクラスを付与
                const row1 = `
                    <tr class="${trClass} row-avg-turns">
                        <td>${row.Act}</td>
                        <td>${row[nameCol]}</td>
                        <td>${row.Encounters}</td>
                        <td>${T.table.avg_t}</td>
                        <td>${(row.Avg_Turns || 0).toFixed(1)}${turnsQuartileText}${turnsBoxplotHtml}</td>
                    </tr>`;
                const row2 = `
                    <tr class="${trClass} row-hp-loss">
                        <td></td><td></td><td></td>
                        <td>${T.table.hp}</td>
                        <td style="background-color: ${hpColor};">${(-(row.Avg_HP_Loss || 0)).toFixed(1)}${hpQuartileText}${hpLossBoxplotHtml}</td>
                    </tr>`;
                const row3 = `
                    <tr class="${trClass} row-p-change">
                        <td></td><td></td><td></td>
                        <td>${T.table.p}</td>
                        <td style="background-color: ${pColor};">${(row.Avg_P_Change || 0).toFixed(1)}${pChangeQuartileText}${pChangeBoxplotHtml}</td>
                    </tr>`;
                return row1 + row2 + row3;
            } else {
                // PC版: 各セルにクラスを付与
                return `
                    <tr class="${trClass}">
                        <td>${row.Act}</td>
                        <td>${row[nameCol]}</td>
                        <td>${row.Encounters}</td>
                        <td class="col-avg-turns">${(row.Avg_Turns || 0).toFixed(1)}${turnsQuartileText}${turnsBoxplotHtml}</td>
                        <td class="col-hp-loss" style="background-color: ${hpColor};">${(-(row.Avg_HP_Loss || 0)).toFixed(1)}${hpQuartileText}${hpLossBoxplotHtml}</td>
                        <td class="col-p-change" style="background-color: ${pColor};">${(row.Avg_P_Change || 0).toFixed(1)}${pChangeQuartileText}${pChangeBoxplotHtml}</td>
                    </tr>`;
            }
        }).join('');

        allTablesHtml += `
            <div id="enemy-table-${charOption}" class="enemy-analysis-char-table" style="display: ${displayStyle};">
                <div id="enemy-analysis-table-wrapper-${charOption}" class="enemy-table-wrapper">
                    <table id="${tableId}" class="sortable-table">
                        <thead><tr>${headers}</tr></thead>
                        <tbody>${rows}</tbody>
                    </table>
                </div>
            </div>`;
    });

    // --- MODIFIED: チェックボックスのHTMLを挿入 ---
    container.innerHTML = `<div class='analysis-section'><h3>${T.title}</h3><p class="analysis-note">${T.note || ''}</p>${dropdownHtml}${columnToggleHtml}${allTablesHtml}</div>`;

    // --- NEW: イベントリスナーを設定 ---
    const analysisSection = container.querySelector('.analysis-section');
    if (analysisSection) {
        analysisSection.addEventListener('change', (event) => {
            const checkbox = event.target;
            if (checkbox.classList.contains('enemy-column-toggle')) {
                const colName = checkbox.dataset.col;
                const charTable = checkbox.closest('.analysis-section').querySelector('.enemy-analysis-char-table');
                if (charTable) {
                    charTable.classList.toggle(`hide-${colName}`, !checkbox.checked);
                }
            }
        });
    }
}