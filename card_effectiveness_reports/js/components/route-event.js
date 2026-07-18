function renderRouteEventTab(lang) {
    const container = document.getElementById('route-event-tab');
    if (!container) return;

    const T = UI_TEXT.route;
    const E = UI_TEXT.enemy.table;
    const C = UI_TEXT.common;

    const routeData = ALL_DATA.route_data;
    if (!routeData || Object.keys(routeData.node_selection).length === 0) {
        container.innerHTML = `<div class='analysis-section'><h3>${T.title}</h3><p>${C.no_data}</p></div>`;
        return;
    }

    const { node_selection, event_actions, node_details, total_runs } = routeData;

    const node_type_colors = { 'Enemy': '#E57373', 'EliteEnemy': '#C62828', 'Boss': '#B71C1C', 'Shop': '#64B5F6', 'Gap': '#81C784', 'Adventure': '#FFD54F', 'Trade': '#BA68C8', 'Supply': '#FFB0CA', 'Others': '#BDBDBD', 'Entry': '#4DD0E1' };
    const node_type_labels = (lang === 'ja')
        ? { 'Enemy': '戦', 'EliteEnemy': '強', 'Boss': 'ボ', 'Shop': '店', 'Gap': '休', 'Adventure': '？', 'Trade': '交', 'Supply': '補', 'Others': '他', 'Entry': '入' }
        : { 'Enemy': 'E', 'EliteEnemy': 'El', 'Boss': 'B', 'Shop': 'S', 'Gap': 'G', 'Adventure': '?', 'Trade': 'T', 'Supply': 'Su', 'Others': 'O', 'Entry': 'En' };

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
    let detailsPanelHtml = `<div class="route-details-panel" id="route-details-panel-content"><p>${T.placeholder}</p>`;

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
                    const choice_colors = { [T.gap_upgrade]: "#FFB74D", [T.gap_rest]: "#81C784", [T.gap_other]: "#BDBDBD" };
                    const choice_map = { "UpgradeCard": T.gap_upgrade, "DrinkTea": T.gap_rest, "Rest": T.gap_rest };

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
                    if (other_rate > 0) aggregated_choices[T.gap_other] = other_rate;

                    let gradient_parts_bottom = [];
                    let current_pos = 0;
                    for (const choice_name of [T.gap_rest, T.gap_upgrade, T.gap_other]) {
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

            Object.keys(level_data).forEach(node_type => {
                if (node_type === 'total') return;

                const node_full_key = `${act}-${level}-${node_type}`;
                const visit_count = level_data[node_type] || 0;
                const details_id = `details-${node_full_key}`;
                const node_specific_details = node_details[node_full_key] || {};

                let details_content = `<h4>Act ${act} - Level ${level} (${node_type}) - ${T.traversal_count}: (${visit_count} / ${total_runs}) ${(visit_count / total_runs * 100).toFixed(1)}%</h4>`;
                let has_content = false;
                let top_section_html = "";
                let card_grid_content = "";
                let exhibit_grid_content = "";

                if (['Enemy', 'EliteEnemy', 'Boss'].includes(node_type) && node_specific_details.enemies) {
                    has_content = true;
                    const enemy_data = node_specific_details.enemies;
                    const scales = node_specific_details.scales || {};
                    const sorted_enemies = Object.values(enemy_data).sort((a, b) => b.rate - a.rate);

                    let table_html = `<h5>${T.encounter_title}</h5><table class="enemy-stats-table">`;
                    table_html += `<thead><tr><th>${E.metric}</th>${sorted_enemies.map(e => `<th>${e[lang]}</th>`).join('')}</tr></thead><tbody>`;
                    table_html += `<tr><td>${E.rate}</td>${sorted_enemies.map(e => `<td>${(e.rate * 100).toFixed(1)}%</td>`).join('')}</tr>`;
                    table_html += `<tr><td>${E.avg_t}</td>${sorted_enemies.map(e => `<td>${e.avg_turns.toFixed(1)}${createInlineBoxplotHtml(e.turns_boxplot, scales.turns_min, scales.turns_max)}</td>`).join('')}</tr>`;
                    table_html += `<tr><td>${E.hp}</td>${sorted_enemies.map(e => `<td style='background-color:${getColorForValue(e.avg_hp_loss, act_stats[act].hp_min, act_stats[act].hp_max)}'>${(-e.avg_hp_loss).toFixed(1)}${createInlineBoxplotHtml(e.hp_loss_boxplot, scales.hp_loss_min, scales.hp_loss_max, true)}</td>`).join('')}</tr>`;
                    table_html += `<tr><td>${E.p}</td>${sorted_enemies.map(e => `<td style='background-color:${getColorForValue(e.avg_p_change, act_stats[act].p_min, act_stats[act].p_max, true)}'>${e.avg_p_change.toFixed(1)}${createInlineBoxplotHtml(e.p_change_boxplot, scales.p_change_min, scales.p_change_max)}</td>`).join('')}</tr>`;
                    table_html += `<tr><td>${UI_TEXT.run_finder.results.sample_decks_title}</td>`;
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
                else if (node_type === 'Shop' && node_specific_details) {
                    let shop_choices_html = `<h5>${T.choice_rates_title}</h5><ul class="details-list">`;
                    let has_shop_choices = false;
                    if (node_specific_details.remove_card_rate != null) {
                        shop_choices_html += `<li>${T.shop_remove_card}: ${(node_specific_details.remove_card_rate * 100).toFixed(1)}%</li>`;
                        has_shop_choices = true;
                    }
                    if (node_specific_details.upgrade_card_rate != null) {
                        shop_choices_html += `<li>${T.shop_upgrade_card}: ${(node_specific_details.upgrade_card_rate * 100).toFixed(1)}%</li>`;
                        has_shop_choices = true;
                    }
                    shop_choices_html += '</ul>';
                    if (has_shop_choices) {
                        top_section_html = shop_choices_html;
                        has_content = true;
                    }
                }
                else if (node_type === 'Gap' && node_specific_details.choices) {
                    has_content = true;
                    let gap_choices_html = `<h5>${T.choice_rates_title}</h5><ul class="details-list">`;
                    const choice_map = { "UpgradeCard": T.gap_upgrade, "DrinkTea": T.gap_rest, "Rest": T.gap_rest };
                    let aggregated_choices = { [T.gap_rest]: 0, [T.gap_upgrade]: 0, [T.gap_other]: 0 };
                    for (const [choice, stats] of Object.entries(node_specific_details.choices)) {
                        const rate = (stats && typeof stats === 'object') ? (stats.rate || 0) : stats;
                        const mapped = choice_map[choice];
                        if (mapped) aggregated_choices[mapped] += rate;
                        else aggregated_choices[T.gap_other] += rate;
                    }
                    [T.gap_rest, T.gap_upgrade, T.gap_other].forEach(label => {
                        if (aggregated_choices[label] > 0) {
                            gap_choices_html += `<li>${label}: ${(aggregated_choices[label] * 100).toFixed(1)}%</li>`;
                        }
                    });
                    gap_choices_html += '</ul>';
                    top_section_html = gap_choices_html;
                }

                let sampleDecksHtml = '';
                if (node_specific_details.sample_runs && node_specific_details.sample_runs.length > 0) {
                    has_content = true;
                    const listItems = node_specific_details.sample_runs.map((run, index) => {
                        const sv = run.version.split('.').slice(0, 3).join('.');
                        const url = `https://lbol-logs.github.io/${sv}/${run.run_id}/?a=${act}&l=${level}`;
                        return `<li><a href="${url}" target="_blank" title="${run.deck.join(', ')}">${index + 1}</a></li>`;
                    }).join('');
                    sampleDecksHtml = `<div class="details-section"><h5>${UI_TEXT.run_finder.results.sample_decks_title}</h5><ol class="sample-deck-list">${listItems}</ol></div>`;
                }

                const AT = UI_TEXT.act_trend;
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
                            const action_title = AT.actions[`${action_type.toLowerCase()}_${item_type.toLowerCase()}`];
                            const html = `<div><h5>${action_title}</h5><ol>${list_items}</ol></div>`;
                            if (item_type === 'Card') card_grid_content += html;
                            else exhibit_grid_content += html;
                        }
                    });
                });

                if (top_section_html) details_content += `<div class="details-section">${top_section_html}</div>`;
                if (sampleDecksHtml) details_content += sampleDecksHtml;
                if (card_grid_content) details_content += `<div class="details-section"><h5>${AT.sections.card}</h5><div class="details-grid">${card_grid_content}</div></div>`;
                if (exhibit_grid_content) details_content += `<div class="details-section"><h5>${AT.sections.exhibit}</h5><div class="details-grid">${exhibit_grid_content}</div></div>`;

                if (!has_content) details_content += `<p>${C.no_data}</p>`;
                detailsPanelHtml += `<div id="${details_id}" class="node-details">${details_content}</div>`;
            });
        });
        actHtmlSegment += '</div>';
        flowChartHtml += actHtmlSegment;
    }

    flowChartHtml += '</div></div>';
    detailsPanelHtml += '</div>';

    container.innerHTML = `<div class='analysis-section'>
        <h3>${T.title}</h3>
        <p>${T.desc}</p>
        <div class='route-analysis-wrapper'>${flowChartHtml}${detailsPanelHtml}</div>
    </div>`;
}

function startNodeDetailTimer(nodeId) {
    cancelNodeDetailTimer();
    routeNodeHoverTimer = setTimeout(() => {
        showNodeDetails(nodeId);
    }, ROUTE_NODE_HOVER_DELAY);
}

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
