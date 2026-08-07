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

    let catButtons = `<div class="exhibit-filter-group" data-filter-type="category"><b>${C.category}:</b> <button class="filter-btn active" data-value="All" onclick="updateExhibitFilters('All')">${C.filter_all}</button>`;
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

    container.innerHTML = `<div class='analysis-section'><h3>${T.title}</h3>${filterHtml}<table id="exhibit-analysis-table"><thead><tr><th>${T.name}</th><th>${UI_TEXT.card_perf.metrics.adoption_rate}</th></tr></thead><tbody>${tableRows}</tbody></table></div>`;
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
