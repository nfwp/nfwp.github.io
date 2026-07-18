function renderActTrendTab(lang) {
    const container = document.getElementById('act-trend-tab');
    if (!container) return;

    const T = UI_TEXT.act_trend;
    const C = UI_TEXT.common;

    const trendData = ALL_DATA.act_trend_data;
    const totalRuns = ALL_DATA.route_data.total_runs;
    const totalRunsAll = ALL_DATA.metadata.total_runs_all_characters || 1;
    const globalNodeVisits = ALL_DATA.route_data.global_node_visits || {};

    if (!trendData || !totalRuns || Object.keys(trendData).length === 0) {
        container.innerHTML = `<div class='analysis-section'><p>${C.no_data}</p></div>`;
        return;
    }

    const nodeTypeLabels = UI_TEXT.enemy.combat_types;
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
            { key: 'Add_Card', title: T.actions.add_card, type: 'card' },
            { key: 'Remove_Card', title: T.actions.remove_card, type: 'card' },
            { key: 'Upgrade_Card', title: T.actions.upgrade_card, type: 'card' },
            { key: 'Add_Exhibit', title: T.actions.add_exhibit, type: 'exhibit' }
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
                    categoryBlockHtml += `<p style="color: #999; text-align: center; padding: 20px 0;">${C.no_data}</p>`;
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
                            if (cardType === 'Tool') name = '🧰 ' + name;
                            else if (cardType === 'Misfortune') name = '🌀 ' + name;
                        } else {
                            const exInfo = ALL_DATA.lookup_tables.exhibits[id];
                            let linkedName = exInfo ? (lang === 'ja' ? exInfo.name : exInfo.name_en) : id;
                            linkedName = createWikiLink(linkedName, 'exhibit', lang);
                            const category = exhibitCategoryMap[id];
                            if (category === '光耀') {
                                const manaType = ALL_DATA.lookup_tables.exhibit_mana_map[id];
                                if (manaType) {
                                    const icon = ALL_DATA.lookup_tables.mana_icon_map[manaType];
                                    if (icon) linkedName = `${icon} ${linkedName}`;
                                }
                                name = `<span class="exhibit-name-shining">${linkedName}</span>`;
                            } else if (category === '一般レア') name = `<span style="background-color: #fff3c4; padding: 2px 4px; border-radius: 3px;">${linkedName}</span>`;
                            else if (category === '一般アンコモン') name = `<span style="background-color: #e8f4ff; padding: 2px 4px; border-radius: 3px;">${linkedName}</span>`;
                            else if (category === 'ショップ') name = `🛒 ${linkedName} `;
                            else if (category === 'イベント') name = `✨ ${linkedName}`;
                            else name = linkedName;
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
                    { label: (lang === 'ja' ? 'ショップ' : 'Shop'), key: 'Shop', type: 'node' },
                    { label: (lang === 'ja' ? '└ 削除' : '└ Remove'), key: 'Remove', type: 'shop_detail', indent: true },
                    { label: (lang === 'ja' ? '└ 強化' : '└ Upgrade'), key: 'Upgrade', type: 'shop_detail', indent: true },
                    { label: (lang === 'ja' ? 'スキマ' : 'Gap'), key: 'Gap', type: 'node' },
                    { label: (lang === 'ja' ? '└ 休憩' : '└ Rest'), key: 'Rest', type: 'gap_detail', indent: true },
                    { label: (lang === 'ja' ? '└ 強化' : '└ Upgrade'), key: 'Upgrade', type: 'gap_detail', indent: true },
                    { label: (lang === 'ja' ? 'イベント' : 'Event'), key: 'Adventure', type: 'node' }
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
                let reportContent = (lang === 'ja' ? report_ja : report_en) || '';

                if (reportContent) {
                    // リンクの置換は先に行う
                    reportContent = reportContent.replace(/\[\[(.*?)\]\]/g, (match, name) => {
                        const cardData = Object.values(ALL_DATA.lookup_tables.cards).find(c => c.JA === name || c.EN === name);
                        return cardData ? createWikiLink(lang === 'ja' ? cardData.JA : cardData.EN, 'card', lang) : name;
                    });
                    reportContent = reportContent.replace(/\{\{(.*?)\}\}/g, (match, name) => {
                        const exhibitData = Object.values(ALL_DATA.lookup_tables.exhibits).find(e => e.name === name || e.name_en === name);
                        return exhibitData ? createWikiLink(lang === 'ja' ? exhibitData.name : exhibitData.name_en, 'exhibit', lang) : name;
                    });

                    // 安全なDOM操作のために一時的なコンテナを作成
                    const tempDiv = document.createElement('div');
                    tempDiv.innerHTML = reportContent;

                    // 要望1: エリート分析セクションの背景色
                    const eliteHeader = Array.from(tempDiv.querySelectorAll('h4')).find(h => h.textContent.includes('Act 1 エリート挑戦'));
                    if (eliteHeader) {
                        const tableWrapper = eliteHeader.nextElementSibling;
                        if (tableWrapper && tableWrapper.classList.contains('table-scroll-wrapper')) {
                            const sectionWrapper = document.createElement('div');
                            sectionWrapper.className = 'elite-analysis-section';
                            
                            // h4の前にsectionWrapperを挿入
                            eliteHeader.parentNode.insertBefore(sectionWrapper, eliteHeader);
                            
                            // h4とtableWrapperをsectionWrapperの中に移動
                            sectionWrapper.appendChild(eliteHeader);
                            sectionWrapper.appendChild(tableWrapper);
                        }
                    }

                    // 要望2: ショップセクションの背景色
                    const shopSubColumns = tempDiv.querySelectorAll('.shop-item-sub-column');
                    shopSubColumns.forEach(column => {
                        const h5 = column.querySelector('h5');
                        if (h5) {
                            const text = h5.textContent;
                            if (text.includes('よく購入されるカード')) {
                                column.classList.add('bg-light-red');
                            } else if (text.includes('よく購入される展示品')) {
                                column.classList.add('bg-light-yellow');
                            } else if (text.includes('よく削除されるカード')) {
                                column.classList.add('bg-light-blue');
                            }
                        }
                    });
                    
                    // 変更を反映したHTMLをgridHtmlに追加
                    const reportHtml = `<div class="analysis-section" style="grid-column: 1 / -1; margin-top: 20px; padding: 20px;">${tempDiv.innerHTML}</div>`;
                    gridHtml += reportHtml;
                }
            }
        }
        gridHtml += '</div>';
        contentHtml += `<div id="act-trend-content-${act}" style="display: ${displayStyle};">${gridHtml}</div>`;
    });

    container.innerHTML = `<div class='analysis-section'><h3>${UI_TEXT.tabs.act_trend}</h3><p>${T.desc}</p>${subTabsHtml}${contentHtml}</div>`;

    const act1ReportContainer = container.querySelector('#act-trend-content-1 div[style*="grid-column"]');
    if (act1ReportContainer) {
        const table = act1ReportContainer.querySelector('table');
        if (table) {
            const wrapper = document.createElement('div');
            wrapper.className = 'table-scroll-wrapper';
            table.parentNode.insertBefore(wrapper, table);
            wrapper.appendChild(table);
        }
    }
}

window.switchActTrend = function(act) {
    const container = document.getElementById('act-trend-tab');
    if (!container) return;
    container.querySelectorAll('.filter-btn').forEach(btn => {
        btn.classList.toggle('active', btn.getAttribute('onclick').includes(`'${act}'`));
    });
    container.querySelectorAll('div[id^="act-trend-content-"]').forEach(div => {
        div.style.display = (div.id === `act-trend-content-${act}`) ? 'block' : 'none';
    });
};
