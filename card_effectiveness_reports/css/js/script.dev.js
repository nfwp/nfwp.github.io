// script.js (完全修正版)

window.addEventListener('DOMContentLoaded', async () => {
    const params = new URLSearchParams(window.location.search);
    const requestedChar = params.get('char') || 'CirnoA';
    LANG = (params.get('lang') || 'ja').toLowerCase();
    const charToLoad = (requestedChar === 'All') ? 'CirnoA' : requestedChar;
    // キャッシュを無効化するためのタイムスタンプを生成
    try {
        const versionResponse = await fetch(`./data/data_version.json?t=${new Date().getTime()}`);
        if (!versionResponse.ok) {
            throw new Error('Failed to load data_version.json. Cannot determine data version.');
        }
        const versionData = await versionResponse.json();
        DATA_VERSION = versionData.version; // グローバル変数に設定
        console.log(`Using data version: ${DATA_VERSION}`);
        // データを並行して読み込む

        const [
            runsResponse,
            timelineResponse,
            charDataResponse,
            adventureEventsResponse,
            lookupDataResponse,
            uiTextResponse // UIテキストの読み込みを追加
        ] = await Promise.all([
            fetch(`./data/run_details.json?v=${DATA_VERSION}`),
            fetch(`./data/run_decks_by_station.json?v=${DATA_VERSION}`),
            fetch(`data/${charToLoad}_data.json?v=${DATA_VERSION}`),
            fetch(`data/adventure_events_data.json?v=${DATA_VERSION}`),
            fetch(`data/lookup_data.json?v=${DATA_VERSION}`),
            fetch(`locales/${LANG}.json?v=${DATA_VERSION}`) // UIテキストをフェッチ
        ]);

        // UIテキストを先に処理
        if (uiTextResponse.ok) {
            UI_TEXT = await uiTextResponse.json();
        } else {
            // UIテキストの読み込みに失敗した場合のフォールバック
            console.error(`Failed to load ${LANG}.json. UI might be broken.`);
            // 最低限のフォールバックUIテキストを設定
            UI_TEXT = { main: { loading_error: "Error: {message}" } };
        }


        if (runsResponse.ok) {
            const runDetailsData = await runsResponse.json();
            ALL_RUN_DETAILS = runDetailsData.runs;
            console.log(`Loaded run_details.json generated at: ${runDetailsData.metadata?.generated_at || 'N/A'}`);
        } else {
            console.error('run_details.json のロードに失敗しました。検索機能は無効になります。');
        }

        if (timelineResponse.ok) {
            const timelineData = await timelineResponse.json();
            // ALL_DECK_TIMELINES はここでは読み込まない。キャッシュ用の空オブジェクトとして初期化。
            ALL_DECK_TIMELINES = {};
            // station_map のみ軽量化されたファイルから取得する
            STATION_MAP_GLOBAL = timelineData.station_map;
            console.log(`Loaded lightweight run_decks_by_station.json generated at: ${timelineData.metadata?.generated_at || 'N/A'}`);
        } else {
            console.error('run_decks_by_station.json のロードに失敗しました。');
        }

        // キャラクターデータのチェック
        if (!charDataResponse.ok) {
            if (requestedChar === 'All') {
                 throw new Error(`Failed to load default data for '${charToLoad}' to handle 'All' characters view.`);
            }
            throw new Error(`Failed to load data for ${charToLoad}`);
        }
        // 共通ルックアップデータのチェック
        if (!lookupDataResponse.ok) {
            throw new Error(`Failed to load common lookup_data.json. Check if the file exists in the /data/ directory.`);
        }

        // JSONに変換
        const charData = await charDataResponse.json();
        const lookupData = await lookupDataResponse.json();

        // データをマージしてグローバル変数に格納
        ALL_DATA = {
            ...charData,
            lookup_tables: lookupData
        };

        // agg_data_full を復元する
        if (ALL_DATA.agg_data_for_graph && ALL_DATA.agg_data_others) {
            console.log("Reconstructing agg_data_full from partial data...");
            ALL_DATA.agg_data_full = ALL_DATA.agg_data_for_graph.concat(ALL_DATA.agg_data_others);
            delete ALL_DATA.agg_data_others;
        } else {
            console.warn("agg_data_others not found. Using existing agg_data_full or agg_data_for_graph.");
            ALL_DATA.agg_data_full = ALL_DATA.agg_data_full || ALL_DATA.agg_data_for_graph;
        }

        // ★追加: イベント分析データの処理
        if (adventureEventsResponse.ok) {
            ADVENTURE_EVENTS_DATA = await adventureEventsResponse.json();
            console.log("Loaded adventure_events_data.json successfully.");
        } else {
            console.error("Failed to load adventure_events_data.json. Event Analysis tab may not work.");
        }

        CURRENT_CHAR = requestedChar;

        if (ALL_DATA.agg_data_full) {
            const cardNameCol = (LANG === 'ja') ? 'Card_Name' : 'Card_Name_EN';
            ALL_DATA.agg_data_full.forEach(d => {
                AGG_MAP.set(d[cardNameCol], d);
            });
        }

    } catch (error) {
        console.error(error);
        // UI_TEXTがロードされていればそれを使う
        const errorMessage = UI_TEXT.main.loading_error.replace('{message}', error.message);
        document.getElementById('loading-overlay').textContent = errorMessage;
        return;
    }

    // setupUiTextは不要になったので削除
    // await setupUiText(LANG);
    renderGlobalHeader();
    setupNavigation();

    if (params.has('search')) {
        switchTab('run-finder-tab', true);
    } else {
        switchTab('card-performance-tab');
    }

    document.getElementById('loading-overlay').style.display = 'none';
    document.getElementById('dashboard-container').style.visibility = 'visible';
});


// =================================================================
// UIコンポーネント描画
// =================================================================

/**
 * 指定されたIDのタブに切り替える（遅延レンダリング対応版）
 * @param {string} tabId - 表示するタブのID
 * @param {boolean} [autoSearch=false] - ラン検索タブの場合に自動検索を実行するか
 */
function switchTab(tabId, autoSearch = false) {
    const tabButtonsContainer = document.getElementById('tab-buttons');
    const mobileTabSelector = document.getElementById('mobile-tab-selector');
    const tabContents = document.querySelectorAll('.tab-content');

    tabContents.forEach(content => {
        content.style.display = 'none';
    });
    if (tabButtonsContainer) {
        tabButtonsContainer.querySelectorAll('.tab-button').forEach(button => {
            button.classList.remove('active');
        });
    }

    const contentToShow = document.getElementById(tabId);
    if (contentToShow) {
        contentToShow.style.display = 'block';

        if (contentToShow.innerHTML.trim() === '') {
            console.log(`Rendering content for tab: ${tabId}`);
            switch (tabId) {
                case 'card-performance-tab':
                    renderCardPerformanceTab(CURRENT_CHAR, LANG);
                    break;
                case 'exhibit-analysis-tab':
                    renderExhibitAnalysisTab(LANG);
                    break;
                case 'route-event-tab':
                    renderRouteEventTab(LANG);
                    break;
                case 'enemy-analysis-tab':
                    renderEnemyAnalysisTab(CURRENT_CHAR, LANG);
                    break;
                // ★追加: イベント分析タブの描画呼び出し
                case 'event-analysis-tab':
                    renderEventAnalysisTab();
                    break;
                case 'act-trend-tab':
                    renderActTrendTab(LANG);
                    break;
                case 'card-list-tab':
                    renderCardListTab(ALL_DATA);
                    break;
                case 'run-finder-tab':
                    renderRunFinderTab();
                    break;
            }
        }

        if (tabId === 'run-finder-tab') {
            const uiPopulated = populateUiFromUrlParams();
            if (autoSearch && uiPopulated) {
                console.log("自動検索を実行します...");
                performAdvancedSearch();
            }
        }

        const graphInTab = contentToShow.querySelector('.plotly-graph-div');
        if (graphInTab) {
            try {
                Plotly.Plots.resize(graphInTab);
            } catch (e) {
                // console.warn("Plotly resize failed, maybe graph not ready.", e);
            }
        }
    }

    if (tabButtonsContainer) {
        const buttonToActivate = tabButtonsContainer.querySelector(`[data-tab-id="${tabId}"]`);
        if (buttonToActivate) {
            buttonToActivate.classList.add('active');
        }
    }

    if (mobileTabSelector) {
        mobileTabSelector.value = tabId;
    }
}
