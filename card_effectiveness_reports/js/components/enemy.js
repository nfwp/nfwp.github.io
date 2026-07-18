function renderEnemyAnalysisTab(char, lang) {
    const container = document.getElementById('enemy-analysis-tab');
    if (!container) return;

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

    let allTablesHtml = '';
    allChars.forEach(charOption => {
        const enemyDfChar = enemyData.filter(d => d.Character === charOption);
        const displayStyle = charOption === char ? 'block' : 'none';
        const tableId = `enemy-analysis-table-${charOption}`;

        const headers = `
            <th class="col-act" onclick="sortTable('${tableId}', 0, 'numeric')">${T.table.act}</th>
            <th class="col-name" onclick="sortTable('${tableId}', 1, 'string')">${T.table.name}</th>
            <th class="col-encounters" onclick="sortTable('${tableId}', 2, 'numeric')">${T.table.encounters}</th>
            <th class="col-stats" onclick="sortTable('${tableId}', 3, 'numeric')">${T.table.avg_t}</th>
            <th class="col-stats" onclick="sortTable('${tableId}', 4, 'numeric')">${T.table.hp}</th>
            <th class="col-stats" onclick="sortTable('${tableId}', 5, 'numeric')">${T.table.p}</th>`;

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

    container.innerHTML = `<div class='analysis-section'><h3>${T.title}</h3>${dropdownHtml}${allTablesHtml}</div>`;
}

function switchEnemyAnalysisCharacter(selectedChar) {
    document.querySelectorAll('.enemy-analysis-char-table').forEach(table => table.style.display = 'none');
    const tableToShow = document.getElementById(`enemy-table-${selectedChar}`);
    if (tableToShow) tableToShow.style.display = 'block';
}
