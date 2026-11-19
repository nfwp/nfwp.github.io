// --- 展示品タブ (P-53 v4 + P-21 lite: サンプルランは🔍のみ / 採用率の隣に入手内訳列) ---
// ※ 旧実装 (行クリック展開で所持ラン一覧 + 入手情報を表示 / ensureExhAcqData・ensureExhAdevMap・toggleExhDetail) は
//   _backup_p505152/exhibit.p53_pre_samplecol.bak.js に退避
// 入手内訳 (P-21 lite): timelines の add_e × path_summary (マス種別) で入手元を分類する。
//   ソース: run_details (path_summary: decode 後 { 'Act1 Early': [{level, type}, ...] })
//           + {char}_timelines.json (initial.e / changes[].add_e) + station_map (idx → 'act-level')
//   分類: path_summary の type (Enemy/EliteEnemy/Adventure/Shop/Gap) / lv16=ボス /
//         未記録レベル (5/10/15 等) は node_details が単一タイプならそれ (Supply/Trade/Gap 等) / 残り=その他
//         + 初期所持 (initial.e) も 1 バケットとして表示
let EXH_ACQ_CACHE = {};   // { char: { perEx: { exid: { total, by: { type: n } } } } }
let EXH_FILTERS = { category: 'All', mana: 'All' };

function applyExhibitFilters() {
    document.querySelectorAll('#exhibit-analysis-table tbody tr[data-exid]').forEach(row => {
        const catOk = EXH_FILTERS.category === 'All'
            || (EXH_FILTERS.category === '一般' && row.dataset.group === '一般')
            || row.dataset.category === EXH_FILTERS.category;
        const manaOk = EXH_FILTERS.mana === 'All' || row.dataset.mana === EXH_FILTERS.mana;
        row.style.display = (catOk && manaOk) ? '' : 'none';
        // 親行が隠れたら詳細行も閉じる
        const detail = row.nextElementSibling;
        if (detail && detail.classList.contains('exh-detail-row')) detail.style.display = 'none';
        if (!(catOk && manaOk)) {
            row.dataset.open = '';
            const caret = row.querySelector('.exh-caret');
            if (caret) caret.textContent = '▸';
        }
    });
}

function updateExhibitFilters(value, type) {
    type = type || 'category';
    EXH_FILTERS[type] = value;
    document.querySelectorAll(`.exhibit-filter-group[data-filter-type="${type}"] .filter-btn`)
        .forEach(btn => btn.classList.toggle('active', btn.dataset.value === value));
    applyExhibitFilters();
}

// node_details から「act-level に単一タイプしか無いキー」のマップを作る (固定ノード: Supply/Trade/Boss/Gap 等)
function _exhBuildFixedTypeMap() {
    const fixed = {};
    const nd = (ALL_DATA && ALL_DATA.route_data && ALL_DATA.route_data.node_details) || {};
    const byKey = {};
    for (const k in nd) {
        const parts = k.split('-');
        if (parts.length < 3) continue;
        const key = parts[0] + '-' + parts[1];
        (byKey[key] || (byKey[key] = new Set())).add(parts.slice(2).join('-'));
    }
    for (const key in byKey) {
        if (byKey[key].size === 1) fixed[key] = [...byKey[key]][0];
    }
    return fixed;
}

// 入手内訳の集計 (キャラ単位で 1 回)。run_details / timelines はラン検索とキャッシュを共用
function computeExhAcquisition() {
    const char = CURRENT_CHAR;
    if (EXH_ACQ_CACHE[char]) return Promise.resolve(EXH_ACQ_CACHE[char]);
    const ready = (window.ensureRunDetailsLoaded ? window.ensureRunDetailsLoaded() : Promise.resolve())
        .then(() => (typeof loadCharacterTimeline === 'function' ? loadCharacterTimeline(char) : null));
    return ready.then(() => {
        if (EXH_ACQ_CACHE[char]) return EXH_ACQ_CACHE[char];
        const perEx = {};   // { exid: { total, by: { type: n } } }
        const runs = (typeof ALL_RUN_DETAILS !== 'undefined' && ALL_RUN_DETAILS)
            ? ALL_RUN_DETAILS.filter(r => r.character === char) : [];
        const tl = (typeof characterTimelineCache !== 'undefined') ? characterTimelineCache.get(char) : null;
        if (tl && runs.length) {
            // station idx → 'act-level' 逆引き
            const idxToKey = {};
            if (typeof STATION_MAP_GLOBAL !== 'undefined' && STATION_MAP_GLOBAL) {
                for (const k in STATION_MAP_GLOBAL) idxToKey[STATION_MAP_GLOBAL[k]] = k;
            }
            const fixedType = _exhBuildFixedTypeMap();
            for (const run of runs) {
                const tv = tl[run.run_id];
                if (!tv) continue;
                // path_summary (decode 後) から 'act-level' → マス種別
                const typeAt = {};
                const ps = run.path_summary || {};
                for (const k in ps) {
                    const m = /^Act(\d+)/.exec(k);
                    if (!m) continue;
                    for (const nd of (ps[k] || [])) typeAt[m[1] + '-' + nd.level] = nd.type;
                }
                // 初期所持 (最初から持っている展示品)
                for (const exid of ((tv.initial && tv.initial.e) || [])) {
                    const e = perEx[exid] || (perEx[exid] = { total: 0, by: {} });
                    e.total++; e.by.initial = (e.by.initial || 0) + 1;
                }
                // 道中の入手 (add_e) → そのマスの種別で分類
                const changes = tv.changes || {};
                for (const idx in changes) {
                    const addE = changes[idx].add_e || [];
                    if (!addE.length) continue;
                    const key = idxToKey[idx];
                    let ty = 'Other';
                    if (key) {
                        if (typeAt[key]) ty = typeAt[key];
                        else if (fixedType[key]) ty = fixedType[key];
                        else if (parseInt(key.split('-')[1], 10) === 16) ty = 'Boss';
                    }
                    if (ty === 'Entry') ty = 'Other';   // 開始ノードでの add は実質初期所持扱いの端負ケース
                    for (const exid of addE) {
                        const e = perEx[exid] || (perEx[exid] = { total: 0, by: {} });
                        e.total++; e.by[ty] = (e.by[ty] || 0) + 1;
                    }
                }
            }
        }
        EXH_ACQ_CACHE[char] = perEx;
        return perEx;
    }).catch(() => { EXH_ACQ_CACHE[char] = {}; return EXH_ACQ_CACHE[char]; });
}

function _exhAcqLabel(type) {
    const T = UI_TEXT.exhibit || {};
    const keyMap = { Enemy: 'enemy', EliteEnemy: 'elite', Adventure: 'event', Shop: 'shop', Gap: 'gap', Boss: 'boss', Trade: 'trade', Supply: 'supply', Other: 'other', initial: 'initial' };
    return T['ex_acq_' + (keyMap[type] || type)] || type;
}

function exhAcqDetailHtml(perEx, exid) {
    const e = perEx[exid];
    if (!e || !e.total) return `<span class="rf-mana-note">${(UI_TEXT.exhibit || {}).ex_acq_empty || '-'}</span>`;
    const icons = { Enemy: '⚔️', EliteEnemy: '👹', Adventure: '✨', Shop: '🛒', Gap: '🔥', Boss: '🔴', Trade: '🔁', Supply: '📦', initial: '🎁' };
    const colors = { Enemy: '#94a3b8', EliteEnemy: '#a78bfa', Adventure: '#fbbf24', Shop: '#4ade80', Gap: '#fb923c', Boss: '#f87171', Trade: '#f472b6', Supply: '#38bdf8', initial: '#cbd5e1' };
    const order = Object.keys(e.by).sort((a, b) => e.by[b] - e.by[a]);
    // % 表示 (小数 1 桁)
    const segs = order.map(ty => ({ ty, n: e.by[ty], pct: e.by[ty] / e.total * 100 }));
    const bar = `<div style="display:flex;height:10px;width:100%;max-width:320px;border-radius:3px;overflow:hidden;margin:4px 0;background:#f1f5f9;">` +
        segs.map(s => `<span title="${_exhAcqLabel(s.ty)} ${s.pct.toFixed(1)}%" style="width:${s.pct}%;background:${colors[s.ty] || '#d1d5db'};"></span>`).join('') + `</div>`;
    const list = segs.map(s => `${icons[s.ty] || '❔'} ${_exhAcqLabel(s.ty)}: <b>${s.pct.toFixed(1)}%</b> (${s.n})`).join(' ・ ');
    return `${bar}<div style="font-size:.9em;">${list}</div>`;
}

// 行クリック → 入手内訳詳細の開閉 (P-21 lite)
function toggleExhDetailRow(tr) {
    const detail = tr.nextElementSibling;
    if (!detail || !detail.classList.contains('exh-detail-row')) return;
    const open = detail.style.display !== 'none';
    detail.style.display = open ? 'none' : '';
    const caret = tr.querySelector('.exh-caret');
    if (caret) caret.textContent = open ? '▸' : '▾';
    tr.dataset.open = open ? '' : '1';
    if (!open) {
        const box = detail.querySelector('.exh-acq-detail');
        if (box && !box.dataset.filled) {
            box.dataset.filled = '1';
            box.innerHTML = '<span class="rf-mana-note">…</span>';
            computeExhAcquisition().then(perEx => {
                box.innerHTML = exhAcqDetailHtml(perEx, tr.dataset.exid);
            }).catch(() => { box.innerHTML = '-'; });
        }
    }
}

function renderExhibitAnalysisTab(lang) {
    const container = document.getElementById('exhibit-analysis-tab');
    if (!container) return;

    const T = UI_TEXT.exhibit;
    const C = UI_TEXT.common;

    if (!ALL_DATA.exhibit_data) {
        container.innerHTML = `<div class='analysis-section'><h3>${T.title}</h3><p>${C.no_data}</p></div>`;
        return;
    }

    const desiredOrderJa = ['光耀', '一般', '一般レア', '一般アンコモン', '一般コモン', 'ショップ', 'イベント'];
    const categoryMapJaToEn = { '光耀': 'Shining', '一般': 'General', '一般レア': 'Std. Rare', '一般アンコモン': 'Std. Uncommon', '一般コモン': 'Std. Common', 'ショップ': 'Shop', 'イベント': 'Event' };
    const categoriesInData = [...new Set(ALL_DATA.exhibit_data.map(d => d.Display_Category))];
    const categoriesJa = desiredOrderJa.filter(cat => categoriesInData.includes(cat) || (cat === '一般' && categoriesInData.some(c => c.startsWith('一般'))));

    let catButtons = `<div class="exhibit-filter-group" data-filter-type="category"><b>${C.category}:</b> <button class="filter-btn active" data-value="All" onclick="updateExhibitFilters('All', 'category')">${C.filter_all}</button>`;
    categoriesJa.forEach(catJa => {
        const displayName = (lang === 'en') ? categoryMapJaToEn[catJa] || catJa : catJa;
        catButtons += `<button class="filter-btn" data-value="${catJa}" onclick="updateExhibitFilters('${catJa}', 'category')">${displayName}</button>`;
    });
    catButtons += '</div>';

    // マナ色フィルタ (光耀展示品の付与マナ / 無色 C を含む)
    const manaIconMap = ALL_DATA.lookup_tables.mana_icon_map || {};
    let manaButtons = `<button class="filter-btn active" data-value="All" onclick="updateExhibitFilters('All', 'mana')">${C.filter_all}</button>`;
    ['W', 'U', 'B', 'R', 'G', 'P', 'C'].forEach(mc => {
        const icon = manaIconMap[mc] || mc;
        const nm = { W: 'White', U: 'Blue', B: 'Black', R: 'Red', G: 'Green', P: 'Prismatic', C: 'Colorless' }[mc] || mc;
        manaButtons += `<button class="filter-btn" data-value="${mc}" onclick="updateExhibitFilters('${mc}', 'mana')" title="${nm}">${icon}</button>`;
    });
    const manaGroup = `<div class="exhibit-filter-group" data-filter-type="mana"><b>${T.ex_filter_mana}:</b> ${manaButtons}</div>`;

    const filterHtml = `<div class="exhibit-filters">${catButtons}${manaGroup}</div>`;

    const sortedData = ALL_DATA.exhibit_data.slice().sort((a, b) => b.Adoption_Rate - a.Adoption_Rate);
    const findHeader = T.ex_find_col || 'ラン検索';
    const sampleBtnHtml = `<button class="rf-link-btn exh-sample-find" title="${C.tip_find_runs || ''}">🔍</button>`;
    const tableRows = sortedData.map(row => {
        const nameForLink = (lang === 'ja') ? row.JA : row.EN;
        const linkedName = createWikiLink(nameForLink, 'exhibit', lang);
        const rate = row.Adoption_Rate;
        const barWidth = (rate || 0) * 100;
        const category = row.Display_Category;
        const exhibit_id = row.Exhibit_ID;
        const groupAttr = category.startsWith('一般') ? 'data-group="一般"' : '';
        const manaType = ALL_DATA.lookup_tables.exhibit_mana_map[exhibit_id] || '';

        let nameHtml = linkedName;

        if (category === '光耀') {
            if (manaType) {
                const icon = ALL_DATA.lookup_tables.mana_icon_map[manaType];
                if (icon) nameHtml = `${icon} ${linkedName}`;
            }
            nameHtml = `<span class="exhibit-name-shining">${nameHtml}</span>`;
        }
        else if (category === '一般レア') nameHtml = `<span class="exhibit-name-rare">${linkedName}</span>`;
        else if (category === '一般アンコモン') nameHtml = `<span class="exhibit-name-uncommon">${linkedName}</span>`;
        else if (category === 'ショップ') nameHtml = `🛒 ${linkedName}`;
        else if (category === 'イベント') nameHtml = `✨ ${linkedName}`;

        // 行クリックで入手内訳が開く (詳細は共通の遅延集計)
        const caret = `<span class="exh-caret" style="display:inline-block;width:14px;color:#64748b;cursor:pointer;" title="${T.ex_toggle_tip || ''}">▸</span>`;
        const detailRow = `<tr class="exh-detail-row" style="display:none;"><td colspan="3"><div class="exh-acq-detail"></div></td></tr>`;
        // ラン検索セル (🔍のみ)
        const findCell = `<td class="exh-find-cell">${sampleBtnHtml}</td>`;

        return `<tr data-category="${category}" ${groupAttr} data-exid="${exhibit_id}" data-mana="${manaType}" data-dispname="${nameForLink.replace(/"/g, '&quot;')}" style="cursor:pointer;"><td>${caret}${nameHtml}</td><td><div class="exhibit-bar-container"><div class="exhibit-bar" style="width: ${barWidth}%;">${(rate * 100).toFixed(1)}%</div></div></td>${findCell}</tr>` + detailRow;
    }).join('');

    container.innerHTML = `<div class='analysis-section'><h3>${T.title}</h3>${filterHtml}<table id="exhibit-analysis-table"><thead><tr><th>${T.name}</th><th>${UI_TEXT.card_perf.metrics.adoption_rate}</th><th>${findHeader}</th></tr></thead><tbody>${tableRows}</tbody></table></div>`;

    // 🔍 ボタン (委任): その展示品でラン検索 (新タブ) / 行クリック: 入手内訳の開閉
    const tbody = container.querySelector('#exhibit-analysis-table tbody');
    tbody.addEventListener('click', (event) => {
        if (event.target.closest('a')) return;
        const tr = event.target.closest('tr[data-exid]');
        if (!tr) return;
        if (event.target.closest('.rf-link-btn.exh-sample-find')) {
            openRunFinderSearch({ char: CURRENT_CHAR, includeItems: tr.dataset.dispname || tr.dataset.exid });
            return;
        }
        toggleExhDetailRow(tr);
    });
}
