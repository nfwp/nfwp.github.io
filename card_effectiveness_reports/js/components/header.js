function renderGlobalHeader() {
    const container = document.getElementById('global-header');
    if (!container) return;
    const allChars = ALL_DATA.all_available_characters || [];

    const options = allChars.map(char =>
        `<option value="${char}" ${char === CURRENT_CHAR ? 'selected' : ''}>${char}</option>`
    ).join('');

    const switcherHtml = `
        <div class="character-switcher">
            <label for="char-select-global">${UI_TEXT.main.char_select_label || 'Character:'}</label>
            <select id="char-select-global">${options}</select>
        </div>
    `;

    container.innerHTML = switcherHtml;
    container.querySelector('select').addEventListener('change', (e) => {
        const newChar = e.target.value;
        const currentParams = new URLSearchParams(window.location.search);
        currentParams.set('char', newChar);
        window.location.search = currentParams.toString();
    });

    const mobileContainer = document.getElementById('global-header-mobile');
    if (mobileContainer) {
        mobileContainer.innerHTML = switcherHtml;
        const mobileSelect = mobileContainer.querySelector('select');
        if (mobileSelect) {
            mobileSelect.id = 'char-select-mobile';
            mobileContainer.querySelector('label').setAttribute('for', 'char-select-mobile');
            mobileSelect.addEventListener('change', (e) => {
                const newChar = e.target.value;
                const currentParams = new URLSearchParams(window.location.search);
                currentParams.set('char', newChar);
                window.location.search = currentParams.toString();
            });
        }
    }
}

// この関数は script.dev.js に移動し、不要になった
// async function setupUiText(lang) { ... }

function setupNavigation() {
    const tabsConfig = [
        { id: 'card-performance-tab', key: 'card_perf', emoji: '📊' },
        { id: 'exhibit-analysis-tab', key: 'exhibit', emoji: '🏺' },
        { id: 'route-event-tab', key: 'route', emoji: '🗺️' },
        { id: 'enemy-analysis-tab', key: 'enemy_analysis', emoji: '⚔️' },
        { id: 'event-analysis-tab', key: 'event_analysis', emoji: '❓' },
        { id: 'act-trend-tab', key: 'act_trend', emoji: '📈' },
        { id: 'card-list-tab', key: 'card_list', emoji: '🎴' },
        { id: 'run-finder-tab', key: 'run_finder', emoji: '🔍' }
    ];

    const tabButtonsContainer = document.getElementById('tab-buttons');
    const mobileTabSelector = document.getElementById('mobile-tab-selector');

    if (tabButtonsContainer) tabButtonsContainer.innerHTML = '';
    if (mobileTabSelector) mobileTabSelector.innerHTML = '';

    tabsConfig.forEach(tabConfig => {
        const label = UI_TEXT.tabs[tabConfig.key];
        if (!label || (tabConfig.id === 'run-finder-tab' && ALL_RUN_DETAILS.length === 0)) {
            return;
        }

        const fullLabel = `${tabConfig.emoji} ${label}`;

        if (tabButtonsContainer) {
            const button = document.createElement('button');
            button.className = 'tab-button';
            button.textContent = fullLabel;
            button.dataset.tabId = tabConfig.id;
            button.addEventListener('click', () => switchTab(tabConfig.id));
            tabButtonsContainer.appendChild(button);
        }

        if (mobileTabSelector) {
            const option = document.createElement('option');
            option.value = tabConfig.id;
            option.textContent = fullLabel;
            mobileTabSelector.appendChild(option);
        }
    });

    if (mobileTabSelector) {
        mobileTabSelector.addEventListener('change', (e) => {
            switchTab(e.target.value);
        });
    }

    // メインタイトルを設定
    const mainTitleEl = document.getElementById('main-title');
    if (mainTitleEl) {
        mainTitleEl.textContent = `${CURRENT_CHAR} - ${UI_TEXT.main.title} (Ver: ${DATA_VERSION})`;
    }
}
