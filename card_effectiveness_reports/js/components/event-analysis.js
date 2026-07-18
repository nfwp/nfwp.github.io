function renderEventAnalysisTab() {
    const container = document.getElementById('event-analysis-tab');
    if (!container) return;

    const T = UI_TEXT.tabs.event_analysis;
    const C = UI_TEXT.common;
    const A = UI_TEXT.event_analysis;

    const charData = ADVENTURE_EVENTS_DATA[CURRENT_CHAR];
    const title = UI_TEXT.tabs.event_analysis;
    const description = A.desc;

    if (!charData || charData.length === 0) {
        container.innerHTML = `<div class='analysis-section'><h3>${title}</h3><p>${C.no_data}</p></div>`;
        return;
    }

    const getItemName = (itemId, itemType) => {
        const lookup = (itemType === 'card') ? ALL_DATA.lookup_tables.cards : ALL_DATA.lookup_tables.exhibits;
        const nameKey = (itemType === 'card') ? (LANG === 'ja' ? 'JA' : 'EN') : (LANG === 'ja' ? 'name' : 'name_en');
        return lookup[itemId]?.[nameKey] || itemId;
    };

    const formatResourceChange = (res) => {
        let parts = [];
        const createHtml = (iconName, value, altText) => {
            const sign = value > 0 ? '+' : '';
            return `
                <span class="resource-change-item">
                    <img src="./img/station/${iconName}.avif" srcset="./img/station/${iconName}@2x.avif 2x" class="resource-icon" alt="${altText}">
                    <span class="resource-value">${sign}${value.toFixed(1)}</span>
                </span>`;
        };
        if (Math.abs(res.hp) > 0.05) parts.push(createHtml('Hp1', res.hp, 'HP'));
        if (Math.abs(res.power) > 0.05) parts.push(createHtml('Power', res.power, 'Power'));
        if (Math.abs(res.money) > 0.05) parts.push(createHtml('Money', res.money, 'Money'));
        return parts.length > 0 ? parts.join('') : C.no_change;
    };

    const formatItemList = (items, itemType) => {
        if (!items || items.length === 0) return C.no_change;
        return items.map(item => {
            const name = getItemName(item.id, itemType);
            const countLabel = LANG === 'ja' ? '回' : (item.count === 1 ? ' time' : ' times');
            const link = createWikiLink(name, itemType, LANG);
            return `<span>${link} (${item.count}${countLabel})</span>`;
        }).join(', ');
    };

    const eventsHtml = charData.map(event => {
        const eventName = LANG === 'ja' ? event.eventNameJA : event.eventNameEN;
        const encounterCountLabel = LANG === 'ja' ? '回' : (event.encounterCount === 1 ? ' time' : ' times');
        const vsAllRunsLabel = LANG === 'ja' ? '対 全ラン' : 'vs. All Runs';
        const imgSrc = `./img/events/${event.eventId}.avif`;
        const imgSrcset = `./img/events/${event.eventId}@2x.avif 2x`;

        const choicesHtml = event.choices.map(choice => {
            const choiceIndexLabel = choice.choiceIndex === 'N/A' ? C.no_choice_label : `${C.choice_label_prefix}${choice.choiceIndex}`;
            const choiceCountLabel = LANG === 'ja' ? '回' : (choice.count === 1 ? ' time' : ' times');

            return `
                <div class="event-choice-details">
                    <h4>${choiceIndexLabel} (${choice.count}${choiceCountLabel}, ${choice.rate.toFixed(1)}%)</h4>
                    <ul>
                        <li><strong>${A.avg_resource_label}:</strong> ${formatResourceChange(choice.avgResourceChange)}</li>
                        <li><strong>${A.actions.card_add} Top10:</strong> ${formatItemList(choice.cardsAdded, 'card')}</li>
                        <li><strong>${A.actions.card_rem} Top10:</strong> ${formatItemList(choice.cardsRemoved, 'card')}</li>
                        <li><strong>${A.actions.card_upg} Top10:</strong> ${formatItemList(choice.cardsUpgraded, 'card')}</li>
                        <li><strong>${A.actions.exh_add} Top10:</strong> ${formatItemList(choice.exhibitsAdded, 'exhibit')}</li>
                        <li><strong>${A.actions.exh_rem} Top10:</strong> ${formatItemList(choice.exhibitsRemoved, 'exhibit')}</li>
                    </ul>
                </div>`;
        }).join('');

        return `
            <div class="accordion-item">
                <button class="accordion-header">
                    <img src="${imgSrc}" srcset="${imgSrcset}" class="event-icon" alt="" onerror="this.style.display='none'">
                    <span class="accordion-title">${eventName}</span>
                    <span class="accordion-stats">${event.encounterCount}${encounterCountLabel} (${vsAllRunsLabel} ${event.encounterRate.toFixed(1)}%)</span>
                    <span class="accordion-icon">▼</span>
                </button>
                <div class="accordion-content">${choicesHtml}</div>
            </div>`;
    }).join('');

    container.innerHTML = `
        <div class='analysis-section'>
            <h3>${title}</h3>
            <p>${description}</p>
            <div class="accordion-container">${eventsHtml}</div>
        </div>`;

    container.querySelectorAll('.accordion-header').forEach(header => {
        header.addEventListener('click', () => {
            header.parentElement.classList.toggle('active');
        });
    });
}
