// --- グローバル変数 ---
let ALL_DATA = {};
let ADVENTURE_EVENTS_DATA = {}; // ★追加: イベント分析データを保持
let UI_TEXT = {};
let LANG = 'ja';
let CURRENT_CHAR = 'CirnoA';
let allRunsData = [];
let allCards = new Set();
let allExhibits = new Set();


// --- Run Finder の状態管理 ---
let lastFoundRuns = [];
let currentSortKey = 'run_id';
let currentSortOrder = 'desc';

let attentionSlider = null;
let AGG_MAP = new Map();
let ALL_RUN_DETAILS = [];
let ALL_DECK_TIMELINES = {};
let DATA_VERSION = '';
let ITEM_MASTER_LOOKUP = {};
let STATION_MAP_GLOBAL = {}; // ★追加: グローバルスコープに移動

let GRAPH_DIV = null;
let routeNodeHoverTimer = null;
