// deck-diagnosis.js — P-28 デッキ診断 (類似ラン検索) タブ
// ★自動生成ファイル: make_deck_diagnosis_component.py が deck_diagnosis_test.py から生成
//   直接編集せず、deck_diagnosis_test.py を修正して再生成すること。
//
// データ: data/deck_diagnosis_data.json (パイプライン Step 3.6 / deck_diagnosis_data.py が生成)
//   初回タブ表示時に遅延ロードし、window.__ddInit() で初期化する。
//   ラン検索の 🔍 からは window.ddPrefillFromRun(char, runId, cards, exhibits) でプレフィル+自動診断。
//   i18n: LANG==='en' のとき locales/en.json の deck_diagnosis セクションを参照 (DDT/DDTF/LOC/cardName/exhName)。

// ===== i18n ヘルパ (LANG === 'en' のとき locales/en.json の deck_diagnosis セクションを参照) =====
// ja は翻訳キーを持たないため、常に第2引数の日本語原文にフォールバックする。
function isEN() { return (typeof LANG !== 'undefined') && LANG === 'en'; }
function DDT(key, ja) {
    if (!isEN()) return ja;
    const en = (typeof UI_TEXT !== 'undefined' && UI_TEXT.deck_diagnosis) ? UI_TEXT.deck_diagnosis[key] : undefined;
    if (en === undefined || en === null) { console.warn('[deck-diagnosis] missing EN translation: ' + key); return ja; }
    return en;
}
function DDTF(key, ja, subs) {
    const s = String(DDT(key, ja));
    if (subs == null) return s;
    if (typeof subs === 'string' || typeof subs === 'number') subs = { v: subs };
    return s.replace(/\{(\w+)\}/g, (m, k) => (subs[k] !== undefined) ? subs[k] : m);
}
function LOC(obj, section) {
    if (!isEN()) return obj;
    const en = (typeof UI_TEXT !== 'undefined' && UI_TEXT.deck_diagnosis) ? UI_TEXT.deck_diagnosis[section] : null;
    if (!en) { console.warn('[deck-diagnosis] missing EN section: ' + section); return obj; }
    const out = Array.isArray(obj) ? [] : {};
    for (const k in obj) out[k] = (en[k] !== undefined) ? en[k] : obj[k];
    return out;
}
function cardName(c, fallback) { if (!c) return fallback || ''; return isEN() ? (c.en || c.ja || fallback || '') : (c.ja || c.en || fallback || ''); }
function exhName(info, fallback) { if (!info) return fallback || ''; return isEN() ? (info.en || info.ja || fallback || '') : (info.ja || info.en || fallback || ''); }
function enemyName(info) { if (!info || !info.length) return ''; return isEN() ? (info[1] || info[0] || '') : (info[0] || info[1] || ''); }

function renderDeckDiagnosisTab() {
    const tabContent = document.getElementById('deck-diagnosis-tab');
    if (!tabContent || tabContent.innerHTML.trim() !== '') return;
    tabContent.innerHTML = `<div class="dd-loading" id="dd-loading">${DDT('loading','類似ラン検索データを読み込み中... (deck_diagnosis_data.json 約4MB)')}</div>` + getDDTabHtml();
    ensureDeckDiagnosisData();
}

let __ddDataPromise = null;
function ensureDeckDiagnosisData() {
    if (!__ddDataPromise) {
        __ddDataPromise = fetch(`data/deck_diagnosis_data.json?v=${DATA_VERSION}`)
            .then((res) => { if (!res.ok) throw new Error('HTTP ' + res.status); return res.json(); })
            .then((data) => {
                window.DIAG_DATA = data;
                const ld = document.getElementById('dd-loading');
                if (ld) ld.remove();
                window.__ddInit();
                return data;
            })
            .catch((err) => {
                const ld = document.getElementById('dd-loading');
                if (ld) ld.textContent = DDT('load_error','類似ラン検索データの読み込みに失敗しました: ') + err.message;
                __ddDataPromise = null;   // 再試行可能にする
                throw err;
            });
    }
    return __ddDataPromise;
}

// v2 split (2026-11-23): 統計外ラン (ns) は別ファイル (deck_diagnosis_data_ns.json) に分割した。
// 「統計外を含める」ON 時にだけ遅延ロードし、D.runs にマージする (母集団 +35% 分の初回転送を削減)。
let __ddNsPromise = null;
function ensureDeckDiagnosisNsData() {
    if (__ddNsPromise) return __ddNsPromise;
    __ddNsPromise = fetch(`data/deck_diagnosis_data_ns.json?v=${DATA_VERSION}`)
        .then((res) => { if (!res.ok) throw new Error('HTTP ' + res.status); return res.json(); })
        .then((nsData) => {
            if (!D) throw new Error('main data not loaded');
            const have = new Set(D.runs.map(r => r.id));
            for (const r of (nsData.runs || [])) {
                if (!have.has(r.id)) D.runs.push(r);
            }
            return D.runs.length;
        })
        .catch((err) => { __ddNsPromise = null; throw err; });
    return __ddNsPromise;
}

// ラン検索の 🔍 アイコンから呼ばれる: そのランの最終デッキ+展示品を入力して自動診断
window.ddPrefillFromRun = async function (character, runId, cards, exhibits) {
    try { switchTab('deck-diagnosis-tab'); } catch (e) { /* タブ切替失敗時はそのまま */ }
    await ensureDeckDiagnosisData();
    state.char = (D.chars && D.chars.includes(character)) ? character : state.char;
    state.deck.clear();
    state.exh.clear();
    state.pins.clear();
    state.exhPins.clear();
    const counts = {};
    for (const cid of (cards || [])) counts[cid] = (counts[cid] || 0) + 1;
    for (const cid in counts) state.deck.set(cid, counts[cid]);
    for (const eid of (exhibits || [])) state.exh.add(eid);
    renderCharButtons();
    renderDeck();
    runDiagnosis();
};

// --- ③-F: ログビューアの URL / プレイID からデッキを自動入力 ---
//   プレイID の形式: 2026-09-15T07-40-09Z_Marisa_A_MarisaB_L7_TrueEnd (deck_diagnosis_data.json の runs[].id と一致)
function __ddParseRunId(text) {
    let s = String(text || '').trim();
    if (!s) return '';
    if (/^https?:\/\//i.test(s)) {
        try { s = new URL(s).pathname; } catch (e) { /* URL 解析失敗時はそのまま */ }
    }
    const segs = String(s).split('/').filter(Boolean);
    if (segs.length) s = segs[segs.length - 1];
    s = s.replace(/[?#].*$/, '').trim();
    const m = s.match(/(\d{4}-\d{2}-\d{2}T\d{2}-\d{2}-\d{2}Z_\S+)/);
    return m ? m[1] : s;
}
async function __loadRunFromInput() {
    const inp = $('#runurl-input');
    const msg = $('#runurl-msg');
    const show = (t, ok) => { if (msg) { msg.textContent = t; msg.style.color = ok ? '#2e7d32' : '#c62828'; } };
    show('', true);
    const runId = __ddParseRunId(inp ? inp.value : '');
    if (!runId) { show(DDT('url_empty','プレイID またはログ URL を貼り付けてください。'), false); return; }
    try { await ensureDeckDiagnosisData(); } catch (e) { show(DDT('url_load_err','統計データの読み込みに失敗しました。時間をおいて再試行してください。'), false); return; }
    let run = D.runs.find(r => r.id === runId) || D.runs.find(r => r.id.toLowerCase() === runId.toLowerCase());
    if (!run && !D.__nsMerged) {
        // v2 split: ns ランは別ファイル — 見つからなければロードして再検索する
        try { await ensureDeckDiagnosisNsData(); D.__nsMerged = true; }
        catch (e) { /* 読み込み失敗時は見つからない扱い */ }
        run = D.runs.find(r => r.id === runId) || D.runs.find(r => r.id.toLowerCase() === runId.toLowerCase());
    }
    if (!run) { show(DDT('url_not_found','このプレイID は統計データに見つかりません (統計対象外のラン・バージョン違い、または ID が違います)。'), false); return; }
    if (run.ns) {
        // ns ランを読み込んだ場合は統計外トグルを自動 ON (診断結果に含まれるようにする)
        const cb = document.getElementById('opt-ns');
        if (cb && !cb.checked) cb.checked = true;
    }
    const cards = [];
    for (const [cid, n] of Object.entries(decodeDeck(run.deck))) for (let i = 0; i < n; i++) cards.push(cid);
    const exhibits = decodeExh(run.exh);
    window.ddPrefillFromRun(run.ch, run.id, cards, exhibits);
    show(DDTF('url_loaded','読み込みました: {id}{ns}', { id: run.id, ns: run.ns ? DDT('url_tag_ns',' (統計外ラン)') : '' }), true);
    if (inp) inp.value = '';
}

// DD_TAB_HTML は DDT() を含むため、テンプレートリテラルの評価をレンダリング時まで遅らせる
//   (スクリプトロード時は LANG/UI_TEXT が未確定 → JA が凍結してしまう)
let __ddTabHtmlCache = null;
function getDDTabHtml() {
    if (__ddTabHtmlCache === null) __ddTabHtmlCache = `
<div class="analysis-section">
<h3>${DDT('title','類似ラン検索')} <span class="dd-beta-badge">${DDT('beta_badge','テスト機能 (β)')}</span></h3>
<p class="analysis-note">${DDT('note','⚠️ 類似度はカード所持ベースの Jaccard 係数 (比較対象 = 各ランの<b>最終デッキ</b>)。統計的推定ではないため「似たデッキの人たちの結果」は相関であって因果ではありません。意思決定の参考としてご利用ください。')}<br>
<span id="meta-line" class="muted"></span></p>
</div>

<div class="panel">
<h2>${DDT('h_deck_input','① デッキを入力')}</h2>
<div class="row" style="margin-bottom:10px;">
    <b>${DDT('lbl_char','キャラ:')}</b> <span id="char-buttons" class="row"></span>
</div>
<div class="row" style="margin-bottom:10px;">
    <input id="deck-input" list="card-datalist" placeholder="${DDT('ph_card','カード名を入力 (日本語/英語名) → 追加ボタン または Enter')}">
    <button class="opt-btn" id="btn-add-card">${DDT('btn_add','追加')}</button>
    <datalist id="card-datalist"></datalist>
    <button class="opt-btn" id="btn-starter">${DDT('btn_starter','初期デッキを読み込む')}</button>
    <button class="opt-btn" id="btn-clear">${DDT('btn_clear','クリア')}</button>
</div>
<div class="row" style="margin-top:8px; flex-wrap:wrap; align-items:center; gap:6px;">
    <b>${DDT('lbl_from_url','ログURLから入力:')}</b>
    <input id="runurl-input" placeholder="${DDT('ph_runurl','ログビューアの URL または プレイID を貼り付け → 読み込み (統計登録ランのみ)')}" style="flex:1; min-width:240px; padding:6px 8px; border:1px solid var(--line); border-radius:6px;">
    <button class="opt-btn" id="btn-load-run">${DDT('btn_load_run','読み込み')}</button>
    <span id="runurl-msg" class="muted" style="flex-basis:100%;"></span>
</div>
<div id="deck-chips"></div>
<div class="row" style="margin-top:8px; margin-bottom:6px;">
    <b>${DDT('lbl_exh','展示品:')}</b>
    <input id="exh-input" list="exh-datalist" placeholder="${DDT('ph_exh','展示品名を入力 (任意・カウントは無視)')}" style="width:300px; padding:6px 8px; border:1px solid var(--line); border-radius:6px;">
    <button class="opt-btn" id="btn-add-exh">${DDT('btn_add','追加')}</button>
    <datalist id="exh-datalist"></datalist>
    <label><input type="checkbox" id="opt-exh" checked> ${DDT('opt_exh','展示品も類似度計算に含める')}</label>
</div>
<div id="exh-chips"></div>
<div id="deck-summary" style="margin-top:8px;"></div>
</div>

<div class="panel">
<h2>${DDT('h_conditions','② 診断条件')}</h2>
<div class="row">
    <label><input type="checkbox" id="opt-ns"> ${DDT('opt_ns','統計外ラン (ns) も含める')}</label>
    <label><input type="checkbox" id="opt-no-starter" checked> ${DDT('opt_no_starter','初期カードを類似度計算から除外')}</label>
    <label>${DDT('lbl_metric','類似度:')}
        <select id="opt-metric">
            <option value="j" selected>${DDT('opt_metric_j','Jaccard (デッキ全体の重なり)')}</option>
            <option value="c">${DDT('opt_metric_c','包含率 (あなたのデッキの再現率)')}</option>
        </select>
    </label>
    <label>${DDT('lbl_pool','母集団:')}
        <select id="opt-pool">
            <option value="top100" selected>${DDT('pool_top100','類似度 上位100ラン')}</option>
            <option value="top30">${DDT('pool_top30','類似度 上位30ラン')}</option>
            <option value="top300">${DDT('pool_top300','類似度 上位300ラン')}</option>
            <option value="th0.4">${DDT('pool_th40','類似度 ≥ 40%')}</option>
            <option value="th0.3">${DDT('pool_th30','類似度 ≥ 30%')}</option>
        </select>
    </label>
    <button id="diag-btn">🔍 ${DDT('btn_diag','診断実行')}</button>
</div>
<div class="row" style="margin-top:8px;">
    <b>${DDT('lbl_mana','最終マナ基盤:')}</b> <span id="mana-filters" class="mana-filters"></span> <span class="muted">${DDT('mana_any','未指定 = 条件なし')}</span>
</div>
<div class="row" style="margin-top:6px;">
    <button class="opt-btn" id="dd-share-btn">${DDT('dd_share','🔗 共有リンクをコピー')}</button>
    <button class="opt-btn" id="dd-reset-btn">${DDT('dd_reset','↺ 条件リセット')}</button>
</div>
<p class="muted" style="margin-top:8px;">
${DDT('metric_note','類似度はどちらも「カードの所持」ベース (コピー数は無視)。<b>Jaccard</b> = 双方のデッキ全体の重なり率 (デッキが大きいほど一致しにくい)。<b>包含率</b> = あなたのデッキが各ランの最終デッキにどれだけ含まれるか (デッキが小さいほど高くなり、初期デッキ+1枚のような入力でも判定しやすい)。しきい値指定の母集団は選択中の方式で判定します。<br>展示品を入力した場合、チェックONならカードと展示品を1つの集合にプールして類似度を計算します (展示品がビルドの型を強く反映するため、判定精度が上がります)。<br>📌 を付けたカード・展示品は<strong>必ず含める</strong>扱いになります — 類似度計算に常に含まれ (初期カード除外の対象外)、さらに📌をすべて所持しているランだけを母集団候補にします。')}
</p>
</div>

<div class="panel" id="dd-history-panel">
<h2>${DDT('h_history','🕘 診断履歴')}</h2>
<div id="dd-history-body"></div>
<p style="text-align:right; margin:4px 0 0;"><button type="button" class="opt-btn" id="dd-history-clear">${DDT('hist_clear','履歴をクリア')}</button></p>
</div>

<div id="results-anchor"></div>

<div class="panel result-block">
<h2>${DDT('h_pool_summary','③ 母集団サマリー')}</h2>
<div id="pool-summary"></div>
<div id="pool-detail"></div>
<div class="stat-cards" id="stat-cards"></div>
</div>

<div class="panel result-block">
<h2>${DDT('h_seg','④ 区間成績 (類似ラン集団の平均)')}</h2>
<div id="seg-table"></div>
</div>

<div class="panel result-block">
<h2>${DDT('h_enemy','⑤ 個別敵の成績 (類似ラン集団での遭遇・戦績)')}</h2>
<div id="enemy-table"></div>
</div>

<div class="panel result-block">
<h2>${DDT('h_route','⑥ ルート傾向 (マス種別の選択比率)')}</h2>
<div id="route-table"></div>
</div>

<div class="panel result-block">
<h2>${DDT('h_reinforce','⑦ 類似ランでよく使われるカード Top30 (✓ = あなたのデッキにも入っている)')}</h2>
<div id="reinforce-table"></div>
<h2>${DDT('h_rare','⑧ 珍しいカード (類似ランでほとんど使われていない・✓ = あなたのデッキにも入っている)')}</h2>
<div id="rare-table"></div>
<h2>${DDT('h_exh_cand','⑨ 展示品候補 (類似ランでよく採用される展示品)')}</h2>
<div class="row" style="margin-bottom:6px;">
    <label>${DDT('lbl_filter','分類:')}
        <select id="exh-filter">
            <option value="all" selected>${DDT('f_all','全部')}</option>
            <option value="shining">${DDT('f_shining','光耀のみ')}</option>
            <option value="normal">${DDT('f_normal','一般 (非光耀)')}</option>
            <option value="shop">${DDT('f_shop','ショップ系')}</option>
            <option value="event">${DDT('f_event','イベント系')}</option>
            <option value="other">${DDT('f_other','その他 (報酬・隙間等)')}</option>
        </select>
    </label>
    <label>${DDT('lbl_cols','列数:')}
        <select id="exh-cols">
            <option value="2" selected>${DDT('cols_2','2カラム')}</option>
            <option value="4">${DDT('cols_4','4カラム')}</option>
        </select>
    </label>
</div>
<div id="exh-grid" class="exh-grid"></div>
</div>

<div class="panel result-block">
<h2>${DDT('h_runs','⑩ 類似ラン一覧 (類似度順・上位30)')}</h2>
<div id="runs-table"></div>
</div>
`;
    return __ddTabHtmlCache;
}

// ===== 以下、deck_diagnosis_test.py の APP_JS から自動変換 =====
const TYPE_JA = {"Attack": "攻撃", "Defense": "防御", "Skill": "スキル", "Ability": "能力", "Friend": "フレンド", "Tool": "道具", "Misfortune": "不幸", "Unknown": "その他"};
const KIND_JA = {"e": "通常敵", "x": "エリート", "b": "ボス", "s": "特殊イベント"};
const STAGE_JA = ["Act1 序盤", "Act1 中盤", "Act1 終盤", "Act2 序盤", "Act2 中盤", "Act2 終盤", "Act3 序盤", "Act3 中盤", "Act3 終盤"];
const NODE_JA = {"E": "通常敵", "X": "エリート", "A": "イベント", "G": "隙間", "S": "ショップ"};

'use strict';
// データは遅延ロード (data/deck_diagnosis_data.json)。__ddInit で初期化される。
let D = null;
let CARD_ID_BY_NAME = null;
let EXH_ID_BY_NAME = null;
let TYPE_LOC = null, KIND_LOC = null, STAGE_LOC = null, NODE_LOC = null;   // 言語別ラベル (__ddInit で設定)
const GH_LOGS = 'https://lbol-logs.github.io/';
const $ = (sel) => document.querySelector(sel);

function __buildCardIndex() {
    const m = new Map();
    for (const cid of D.cardIds) {
        const c = D.cards[cid];
        if (!c) continue;
        m.set(c.ja.toLowerCase(), cid);
        m.set(c.en.toLowerCase(), cid);
    }
    return m;
}

function __buildExhIndex() {
    const m = new Map();
    for (const eid of D.exhIds) {
        const e = D.exhInfo[eid];
        if (!e) continue;
        m.set(e.ja.toLowerCase(), eid);
        m.set(e.en.toLowerCase(), eid);
    }
    return m;
}

const state = { char: 'CirnoA', deck: new Map(), exh: new Set(), pins: new Set(), exhPins: new Set() };   // deck: cardId -> count / exh: 展示品ID集合 / pins・exhPins: 📌必須指定

function cardLabel(cid) { const c = D.cards[cid]; return c ? cardName(c, cid) : cid; }
function typeBadge(ty) { const t = TYPE_LOC[ty] || ty; return `<span class="badge b-${ty}">${t}</span>`; }
function deckSize() { let n = 0; for (const v of state.deck.values()) n += v; return n; }

// 終了時マナ基盤の表示 (⑩ 一覧): PC=カラーアイコン / モバイル=色ドット+個数のコンパクト表記
const MANA_DOT_COLORS = { W: '#eab308', U: '#3b82f6', B: '#a855f7', R: '#ef4444', G: '#22c55e', P: 'rainbow', C: '#94a3b8', A: '#cbd5e1' };
function manaIconsHtml(m) {
    if (!m) return '-';
    if (window.innerWidth <= 768) {
        const counts = {};
        for (const ch of m) counts[ch] = (counts[ch] || 0) + 1;
        let out = '';
        for (const ch of ['W', 'U', 'B', 'R', 'G', 'P', 'C', 'A']) {
            if (!counts[ch]) continue;
            const bg = ch === 'P'
                ? 'background:linear-gradient(135deg,#f87171,#fbbf24,#4ade80,#60a5fa,#c084fc);'
                : `background:${MANA_DOT_COLORS[ch] || '#94a3b8'};`;
            out += `<span class="mg"><span class="mdot" style="${bg}"></span>${counts[ch]}</span>`;
        }
        return out ? `<span class="mana-icons">${out}</span>` : '-';
    }
    let out = '';
    for (const ch of m) out += D.manaIcons[ch] || ch;
    return `<span class="mana-emoji">${out}</span>`;
}

// 展示品の装飾 (アイコン+名前HTML) — ⑨ 一覧と⑩ 詳細/ホバーで共用
function exhDecor(info) {
    let icon = '🏺 ', nameHtml = exhName(info, '');
    if (info.ra === 'Shining') {
        icon = info.manaIcon ? info.manaIcon + ' ' : '';
        nameHtml = `<span class="exhibit-name-shining">${exhName(info, '')}</span>`;
    } else if (info.src === 'shop') {
        icon = '🛒 ';
    } else if (info.src === 'event') {
        icon = '✨ ';
    } else if (info.ra === 'Rare') {
        nameHtml = `<span class="exhibit-name-rare">${exhName(info, '')}</span>`;
    } else if (info.ra === 'Uncommon') {
        nameHtml = `<span class="exhibit-name-uncommon">${exhName(info, '')}</span>`;
    }
    return { icon, nameHtml };
}

function renderCharButtons() {
    const wrap = $('#char-buttons');
    wrap.innerHTML = '';
    for (const ch of D.chars) {
        const b = document.createElement('button');
        b.className = 'char-btn' + (ch === state.char ? ' active' : '');
        b.textContent = ch;
        b.onclick = () => { state.char = ch; renderCharButtons(); renderDeckSummary(); };
        wrap.appendChild(b);
    }
}

function addCard(cid) {
    if (!cid) return;
    state.deck.set(cid, (state.deck.get(cid) || 0) + 1);
    renderDeck();
}

function removeOne(cid) {
    const n = state.deck.get(cid) || 0;
    if (n <= 1) { state.deck.delete(cid); state.pins.delete(cid); } else state.deck.set(cid, n - 1);
    renderDeck();
}

function addChipCard(cid) {
    state.deck.set(cid, (state.deck.get(cid) || 0) + 1);
    renderDeck();
}

function renderDeck() {
    const wrap = $('#deck-chips');
    wrap.innerHTML = '';
    const ids = [...state.deck.keys()].sort((a, b) => cardLabel(a).localeCompare(cardLabel(b), 'ja'));
    for (const cid of ids) {
        const n = state.deck.get(cid);
        const c = D.cards[cid] || {};
        const chip = document.createElement('span');
        chip.className = 'chip' + (state.pins.has(cid) ? ' pinned' : '');
        // ▼▼ 旧UI (2026-11-15・すぐ戻せるよう保持) ▼▼
        // chip.innerHTML = `${state.pins.has(cid) ? '<span class="pin-mark">📌</span>' : ''}${typeBadge(c.ty || 'Unknown')} ${cardName(c, cid)} ×${n}
        //     <button title="${DDT('btn_pin','ピン (必ず含める)')}" data-a="pin">📌</button><button title="+1" data-a="inc">＋</button><button title="-1" data-a="dec">－</button><button title="${DDT('btn_del','削除')}" data-a="del">✕</button>`;
        // ▲▲ 旧UI ここまで ▲▲
        chip.innerHTML = `<button class="pin-btn" title="${DDT('btn_pin_card','ピン (この枚数以上を必須に)')}" data-a="pin">📌</button>${typeBadge(c.ty || 'Unknown')} <b>${cardName(c, cid)}</b> <b class="cnt">×${n}</b>
            <span class="chip-ops"><button data-a="dec">－</button><button data-a="inc">＋</button><button class="del-btn" title="${DDT('btn_del','削除')}" data-a="del">✕</button></span>`;
        chip.querySelector('[data-a=pin]').onclick = () => { if (state.pins.has(cid)) state.pins.delete(cid); else state.pins.add(cid); renderDeck(); };
        chip.querySelector('[data-a=inc]').onclick = () => { state.deck.set(cid, n + 1); renderDeck(); };
        chip.querySelector('[data-a=dec]').onclick = () => removeOne(cid);
        chip.querySelector('[data-a=del]').onclick = () => { state.deck.delete(cid); state.pins.delete(cid); renderDeck(); };
        wrap.appendChild(chip);
    }
    renderExhChips();
    renderDeckSummary();
}

function renderExhChips() {
    const wrap = $('#exh-chips');
    if (!wrap) return;
    wrap.innerHTML = '';
    for (const eid of [...state.exh].sort((a, b) => {
        const ea = D.exhInfo[a] || { ja: a, en: a }, eb = D.exhInfo[b] || { ja: b, en: b };
        return exhName(ea, a).localeCompare(exhName(eb, b), 'ja');
    })) {
        const info = D.exhInfo[eid] || { ja: eid, en: eid, ra: '' };
        const chip = document.createElement('span');
        chip.className = 'chip' + (state.exhPins.has(eid) ? ' pinned' : '');
        // ▼▼ 旧UI (2026-11-15・すぐ戻せるよう保持) ▼▼
        // chip.innerHTML = `${state.exhPins.has(eid) ? '<span class="pin-mark">📌</span>' : ''}🏺 ${exhName(info, eid)} <button title="${DDT('btn_pin','ピン (必ず含める)')}" data-a="pin">📌</button><button title="${DDT('btn_del','削除')}" data-a="del">✕</button>`;
        // ▲▲ 旧UI ここまで ▲▲
        chip.innerHTML = `<button class="pin-btn" title="${DDT('btn_pin','ピン (必ず含める)')}" data-a="pin">📌</button>🏺 <b>${exhName(info, eid)}</b>
            <span class="chip-ops"><button class="del-btn" title="${DDT('btn_del','削除')}" data-a="del">✕</button></span>`;
        chip.querySelector('[data-a=pin]').onclick = () => { if (state.exhPins.has(eid)) state.exhPins.delete(eid); else state.exhPins.add(eid); renderDeck(); };
        chip.querySelector('[data-a=del]').onclick = () => { state.exh.delete(eid); state.exhPins.delete(eid); renderDeck(); };
        wrap.appendChild(chip);
    }
}

function renderDeckSummary() {
    const starters = new Set(D.starters[state.char] || []);
    let size = 0; const types = {}; const colors = {};
    for (const [cid, n] of state.deck) {
        size += n;
        const c = D.cards[cid] || {};
        types[c.ty || 'Unknown'] = (types[c.ty || 'Unknown'] || 0) + n;
        for (const col of (c.co || '')) colors[col] = (colors[col] || 0) + n;
    }
    const tStr = Object.entries(types).map(([k, v]) => `${TYPE_LOC[k] || k}${v}`).join(' / ') || '-';
    const cStr = Object.entries(colors).map(([k, v]) => `${k}${v}`).join(' / ') || '-';
    $('#deck-summary').innerHTML = DDTF('deck_summary', `<b>合計 {size} 枚</b>{exh} <span class="muted">({char} / 初期カード以外 {nonstarter} 枚)</span><br>
         <span class="muted">種類: {types} ｜ 色: {colors}</span>`, {
        size: size,
        exh: state.exh.size ? DDTF('exh_points',' ＋ 🏺 {n} 点', { n: state.exh.size }) : '',
        char: state.char,
        nonstarter: [...state.deck.keys()].filter(id => !starters.has(id)).reduce((s, id) => s + state.deck.get(id), 0),
        types: tStr, colors: cStr,
    });
}

function loadStarterDeck() {
    state.deck.clear();
    for (const cid of (D.starters[state.char] || [])) state.deck.set(cid, (state.deck.get(cid) || 0) + 1);
    renderDeck();
}

// --- デコードヘルパ ---
function decodeDeck(str) { const o = {}; if (!str) return o; for (const part of str.split(',')) { const [i, c] = part.split(':'); o[D.cardIds[+i]] = +c; } return o; }
function decodeExh(str) { return str ? str.split(',').map(i => D.exhIds[+i]) : []; }
// 敵集計: "codeIdx:fights,rounds和,ΔHp和;..." -> [{i, f, r, d}]
function decodeEnemies(str) {
    if (!str) return [];
    return str.split(';').map(part => {
        const [i, rest] = part.split(':');
        const [f, r, d] = rest.split(',');
        return { i: +i, f: +f, r: +r, d: +d };
    });
}
function presence(deckObj, exclude) { const s = new Set(); for (const id in deckObj) { if (!exclude || !exclude.has(id)) s.add(id); } return s; }

// --- 条件の直列化・復元・共有 (URLハッシュ #dd= / localStorage dd_last_condition_v1) ---
function ddSerializeCondition() {
    const mana = {};
    document.querySelectorAll('#mana-filters input').forEach(inp => { const v = +inp.value || 0; if (v > 0) mana[inp.dataset.m] = v; });
    return {
        v: 1, ch: state.char,
        deck: [...state.deck.entries()], exh: [...state.exh], pins: [...state.pins], exhPins: [...state.exhPins],
        ns: $('#opt-ns').checked, ex: $('#opt-exh').checked, noSt: $('#opt-no-starter').checked,
        metric: $('#opt-metric').value, pool: $('#opt-pool').value, mana
    };
}
function ddApplyCondition(cond) {
    if (!cond || typeof cond !== 'object') return false;
    if (cond.ch && D.chars.includes(cond.ch)) state.char = cond.ch;
    state.deck = new Map(cond.deck || []);
    state.exh = new Set(cond.exh || []);
    state.pins = new Set(cond.pins || []);
    state.exhPins = new Set(cond.exhPins || []);
    $('#opt-ns').checked = !!cond.ns;
    $('#opt-exh').checked = cond.ex !== false;
    $('#opt-no-starter').checked = cond.noSt !== false;
    $('#opt-metric').value = ['j', 'c'].includes(cond.metric) ? cond.metric : 'j';
    $('#opt-pool').value = cond.pool || 'top100';
    document.querySelectorAll('#mana-filters input').forEach(inp => { inp.value = (cond.mana && cond.mana[inp.dataset.m]) || 0; });
    renderCharButtons();
    renderDeck();
    return true;
}

// --- ③-G: 条件の共有フォーマット (短縮) ---
//   新: 位置ベースのコンパクト形式 ?dd=2~<ch>~<deck>~<exh>~<pins>~<exhPins>~<flags>~<metric>~<pool>~<mana>
//       (カード/展示品 ID は [A-Za-z0-9_] のみなので URL にそのまま乗る。枚数は id*3)
//   旧: JSON + encodeURIComponent (#dd=%7B...) も引き続き読める
function ddEncodeCompact(cond) {
    if (!cond || typeof cond !== 'object') return '';
    const f = (cond.ns ? '1' : '0') + (cond.ex === false ? '0' : '1') + (cond.noSt === false ? '0' : '1');
    return ['2', cond.ch || '',
        (cond.deck || []).map(pair => pair[0] + (pair[1] > 1 ? '*' + pair[1] : '')).join(','),
        (cond.exh || []).join(','),
        (cond.pins || []).join(','),
        (cond.exhPins || []).join(','),
        f, cond.metric || 'j', cond.pool || 'top100',
        Object.entries(cond.mana || {}).map(kv => kv[0] + kv[1]).join(',')
    ].join('~');
}
function ddDecodeCompact(s) {
    if (typeof s !== 'string' || s.slice(0, 2) !== '2~') return null;
    const p = s.split('~');
    if (p.length < 10) return null;
    const num = (str) => { const n = parseInt(str, 10); return isNaN(n) ? 0 : n; };
    const ids = (str) => (str ? str.split(',').filter(x => /^\w+$/.test(x)) : []);
    const deck = [];
    if (p[2]) {
        for (const tok of p[2].split(',')) {
            const m = tok.match(/^(\w+)\*(\d+)$/);
            if (m) deck.push([m[1], num(m[2])]);
            else if (/^\w+$/.test(tok)) deck.push([tok, 1]);
        }
    }
    const f = (p[6] || '000').padEnd(3, '0');
    const mana = {};
    if (p[9]) {
        for (const tok of p[9].split(',')) {
            const m = tok.match(/^([A-Z])(\d+)$/);
            if (m) mana[m[1]] = num(m[2]);
        }
    }
    return {
        v: 2, ch: p[1] || '',
        deck,
        exh: ids(p[3]), pins: ids(p[4]), exhPins: ids(p[5]),
        ns: f[0] === '1', ex: f[1] !== '0', noSt: f[2] !== '0',
        metric: (p[7] === 'c') ? 'c' : 'j',
        pool: p[8] || 'top100',
        mana
    };
}
function ddParseSharedCondition(str) {
    if (!str) return null;
    let s = String(str).trim();
    try { s = decodeURIComponent(s); } catch (e) { /* そのまま */ }
    if (s.charCodeAt(0) === 123) {
        try { return JSON.parse(s); } catch (e) { return null; }
    }
    return ddDecodeCompact(s);
}

// --- ③-H: 診断履歴 (ラン検索の検索履歴と同じ考え方 / 最大 20 件) ---
const DD_HISTORY_KEY = 'dd_history_v1';
function ddLoadHistory() {
    try { return JSON.parse(localStorage.getItem(DD_HISTORY_KEY) || '[]') || []; } catch (e) { return []; }
}
function ddSaveHistory(list) {
    try { localStorage.setItem(DD_HISTORY_KEY, JSON.stringify(list.slice(0, 20))); } catch (e) { /* 無視 */ }
}
function ddRecordHistory(cond) {
    try {
        if (!cond || !cond.deck || !cond.deck.length) return;
        const key = ddEncodeCompact(cond);
        const list = ddLoadHistory().filter(h => h.k !== key);   // 同一条件は先頭へ差し替え
        list.unshift({ t: Date.now(), k: key, cond });
        ddSaveHistory(list);
        ddRenderHistory();
    } catch (e) { /* 無視 */ }
}
function ddHistoryLabel(cond) {
    const deckN = (cond.deck || []).length;
    const deckTotal = (cond.deck || []).reduce((s, pair) => s + (pair[1] || 1), 0);
    const parts = [cond.ch || ''];
    parts.push(DDTF('hist_cards', 'カード{a}種({b}枚)', { a: deckN, b: deckTotal }));
    if ((cond.exh || []).length) parts.push(DDTF('hist_exh', '展示{a}', { a: cond.exh.length }));
    const pinC = (cond.pins || []).length, pinE = (cond.exhPins || []).length;
    if (pinC && pinE) parts.push(DDTF('hist_pins_both', '📌カード{a}・展示{b}', { a: pinC, b: pinE }));
    else if (pinC) parts.push(DDTF('hist_pins', '📌{a}', { a: pinC }));
    else if (pinE) parts.push(DDTF('hist_pins_exh', '📌展示{a}', { a: pinE }));
    if (cond.ns) parts.push(DDT('hist_ns', '統計外含'));
    parts.push((cond.metric === 'c') ? DDT('hist_metric_c', '包含率') : DDT('hist_metric_j', 'Jaccard'));
    return parts.filter(Boolean).join(' ／ ');
}
// 履歴の詳細 (セクション配列) — ホバー (title) と展開表示 (HTML) の両方で使う
function ddHistorySections(cond) {
    const secs = [];
    if (!cond) return secs;
    const sep = isEN() ? ', ' : '、';
    const deckN = (cond.deck || []).length;
    const deckTotal = (cond.deck || []).reduce((s, pair) => s + (pair[1] || 1), 0);
    secs.push({ hd: DDTF('hist_cards', 'カード{a}種({b}枚)', { a: deckN, b: deckTotal }),
        bd: (cond.deck || []).map(pair => cardName(D.cards[pair[0]], pair[0]) + (pair[1] > 1 ? '×' + pair[1] : '')).join(sep) });
    if ((cond.exh || []).length) {
        secs.push({ hd: DDTF('hist_exh', '展示{a}', { a: cond.exh.length }),
            bd: cond.exh.map(eid => exhName(D.exhInfo[eid], eid)).join(sep) });
    }
    if ((cond.pins || []).length) {
        secs.push({ hd: DDT('hist_pins_card_hdr', '📌 必須カード (デッキと同じ枚数以上)'),
            bd: cond.pins.map(cid => cardName(D.cards[cid], cid)).join(sep) });
    }
    if ((cond.exhPins || []).length) {
        secs.push({ hd: DDT('hist_pins_exh_hdr', '📌 必須展示品'),
            bd: cond.exhPins.map(eid => exhName(D.exhInfo[eid], eid)).join(sep) });
    }
    const manaKeys = Object.keys(cond.mana || {}).filter(k => cond.mana[k] > 0);
    if (manaKeys.length) {
        secs.push({ hd: DDT('lbl_mana', '最終マナ基盤:'),
            bd: manaKeys.map(k => ((D.manaIcons && D.manaIcons[k]) || k) + '≥' + cond.mana[k]).join('  ') });
    }
    const opts = [];
    if (cond.ns) opts.push(DDT('hist_ns', '統計外含'));
    if (cond.ex === false) opts.push(DDT('hist_ex_off', '展示品は類似度に含めない'));
    if (cond.noSt === false) opts.push(DDT('hist_st_incl', '初期カードも比較に含める'));
    opts.push((cond.metric === 'c') ? DDT('hist_metric_c', '包含率') : DDT('hist_metric_j', 'Jaccard'));
    opts.push(ddPoolLabel(cond.pool));
    secs.push({ hd: DDT('hist_opts_hdr', '条件'), bd: opts.join(' ／ ') });
    return secs;
}
function ddPoolLabel(pool) {
    const map = { 'top100': DDT('pool_top100','類似度 上位100ラン'), 'top30': DDT('pool_top30','類似度 上位30ラン'), 'top300': DDT('pool_top300','類似度 上位300ラン'), 'th0.4': DDT('pool_th40','類似度 ≥ 40%'), 'th0.3': DDT('pool_th30','類似度 ≥ 30%') };
    return map[pool] || (pool || 'top100');
}
function ddHistoryDetailText(cond) {
    const secs = ddHistorySections(cond);
    if (!secs.length) return DDT('hist_rerun_tip', 'クリックでこの条件を再実行');
    return secs.map(s => s.hd + '\n' + s.bd).join('\n') + '\n' + DDT('hist_rerun_tip', 'クリックでこの条件を再実行');
}
function ddEscHtml(s) {
    return String(s == null ? '' : s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
}
function ddHistoryDetailHtml(cond) {
    const secs = ddHistorySections(cond);
    if (!secs.length) return '';
    return secs.map(s => '<div class="dd-hist-hd">' + ddEscHtml(s.hd) + '</div><div class="dd-hist-ln">' + ddEscHtml(s.bd) + '</div>').join('');
}
function ddHistoryToggleDetail(btn) {
    const t = btn.getAttribute('data-hdet');
    const block = btn.closest('.dd-hist-block');
    const detail = block ? block.querySelector('.dd-hist-detail') : null;
    if (!detail) return;
    if (detail.style.display !== 'none') {
        detail.style.display = 'none';
        btn.textContent = '▾';
        btn.classList.remove('open');
        return;
    }
    const h = ddLoadHistory().find(x => String(x.t) === String(t));
    detail.innerHTML = (h && h.cond) ? ddHistoryDetailHtml(h.cond) : '';
    detail.style.display = 'block';
    btn.textContent = '▴';
    btn.classList.add('open');
}
function ddRenderHistory() {
    const body = document.getElementById('dd-history-body');
    if (!body) return;
    const list = ddLoadHistory();
    if (!list.length) {
        body.innerHTML = '<p class="muted" style="margin:4px 0;">' + DDT('hist_none','履歴はまだありません (診断実行で追加されます)') + '</p>';
        return;
    }
    const fmtT = (t) => { const d = new Date(t); const p2 = (n) => String(n).padStart(2, '0'); return p2(d.getMonth() + 1) + '/' + p2(d.getDate()) + ' ' + p2(d.getHours()) + ':' + p2(d.getMinutes()); };
    body.innerHTML = list.map((h) =>
        '<div class="dd-hist-block">' +
        '<div class="dd-hist-row">' +
        '<button type="button" class="dd-hist-main" data-hrun="' + h.t + '" title="' + ddEscHtml(ddHistoryDetailText(h.cond)).replace(/\n/g, '&#10;') + '">' +
        '<span class="dd-hist-date">' + fmtT(h.t) + '</span>' +
        '<span class="dd-hist-label">' + ddHistoryLabel(h.cond) + '</span>' +
        '</button>' +
        '<button type="button" class="dd-hist-toggle" data-hdet="' + h.t + '" title="' + DDT('hist_detail_tip', '詳細を表示 / 閉じる') + '">▾</button>' +
        '<button type="button" class="dd-hist-del" data-hdel="' + h.t + '" title="' + DDT('hist_delete','削除') + '">🗑</button>' +
        '</div>' +
        '<div class="dd-hist-detail" style="display:none;"></div>' +
        '</div>'
    ).join('');
}
function ddRestoreHistory(t) {
    const h = ddLoadHistory().find(x => x.t === t);
    if (!h || !h.cond) return;
    ddApplyCondition(h.cond);
    runDiagnosis();
    const resEl = document.getElementById('results-anchor');
    if (resEl) resEl.scrollIntoView({ behavior: 'smooth', block: 'start' });
}
let _ddHistDelTimer = null;
function ddHistoryDeleteTap(cell, t) {
    if (cell.classList.contains('armed')) {
        if (_ddHistDelTimer) { clearTimeout(_ddHistDelTimer); _ddHistDelTimer = null; }
        ddSaveHistory(ddLoadHistory().filter(h => h.t !== Number(t)));
        ddRenderHistory();
        return;
    }
    document.querySelectorAll('#dd-history-body .dd-hist-del.armed').forEach(el => { el.classList.remove('armed'); el.textContent = '🗑'; });
    cell.classList.add('armed');
    cell.textContent = DDT('hist_delete_confirm','削除?');
    if (_ddHistDelTimer) clearTimeout(_ddHistDelTimer);
    _ddHistDelTimer = setTimeout(() => { cell.classList.remove('armed'); cell.textContent = '🗑'; }, 3000);
}
function ddPersistCondition() {
    const cond = ddSerializeCondition();
    try { localStorage.setItem('dd_last_condition_v1', JSON.stringify(cond)); } catch (e) {}
    // ③-G: アドレスバーには条件を乗せない (短く保つ)。共有は共有ボタンの短縮リンクから。
    //   共有リンク (?dd=) で開いた場合も、診断後にアドレスバーから外す
    try {
        const ddq2 = new URLSearchParams(location.search);
        ddq2.delete('dd');
        const ddqs = ddq2.toString();
        history.replaceState(null, '', location.pathname + (ddqs ? '?' + ddqs : ''));
    } catch (e) {}
    return cond;
}

// Jaccard: 全体の重なり率 / 包含率 (overlap coefficient): 小さい方の集合にどれだけ含まれるか
function similarity(a, b) {
    if (a.size === 0 || b.size === 0) return { j: 0, c: 0 };
    let inter = 0;
    for (const x of a) if (b.has(x)) inter++;
    return {
        j: inter / (a.size + b.size - inter),
        c: inter / Math.min(a.size, b.size),
    };
}

// --- メイン計算 ---
async function runDiagnosis() {
    if (state.deck.size === 0) { alert(DDT('err_need_card','カードを1枚以上追加してください。')); return; }
    const includeNs = $('#opt-ns').checked;
    if (includeNs && !D.__nsMerged) {
        // v2 split: 統計外ランは別ファイルのため、ON 時にここでロードしてマージする
        try { await ensureDeckDiagnosisNsData(); D.__nsMerged = true; }
        catch (e) { /* 読み込み失敗時は統計登録ランのみで継続 */ }
    }
    const excludeStarters = $('#opt-no-starter').checked;
    const poolMode = $('#opt-pool').value;
    const metric = $('#opt-metric').value;   // 'j' = Jaccard / 'c' = 包含率

    const starters = new Set(D.starters[state.char] || []);
    const userAll = presence(Object.fromEntries(state.deck), null);
    const userExh = new Set(state.exh);
    const includeExh = $('#opt-exh').checked;
    // 📌 ピン留めした項目は「初期カードを除外」の対象外で必ず比較に含める
    const userCmpBase = new Set(userAll);
    if (excludeStarters) {
        for (const id of [...userCmpBase]) if (starters.has(id) && !state.pins.has(id)) userCmpBase.delete(id);
    }
    // 展示品チェックON時はカードと展示品を1つの集合にプールして類似度を計算
    const userCmp = new Set([...userCmpBase, ...(includeExh ? userExh : []), ...state.exhPins]);
    if (userCmp.size === 0) { alert(DDT('err_empty_cmp','初期カード以外のカードを追加してください (類似度の計算対象が空です)。')); return; }
    ddPersistCondition();   // 条件を localStorage + URLハッシュ (#dd=) に保存 (共有可能にする)
    ddRecordHistory(ddSerializeCondition());   // ③-H: 診断履歴に追加
    // 📌 ピン留め項目をすべて所持しているランだけを母集団候補にする
    const pinCards = [...state.pins];
    const pinExhs = [...state.exhPins];
    // マナ基盤フィルタ (指定色が終了時の BaseMana に N 個以上含まれるランのみ)
    const manaMin = {};
    document.querySelectorAll('#mana-filters input').forEach(inp => {
        const v = +inp.value || 0;
        if (v > 0) manaMin[inp.dataset.m] = v;
    });
    const manaFilterOn = Object.keys(manaMin).length > 0;

    const scored = [];
    for (const r of D.runs) {
        if (r.ch !== state.char) continue;
        if (r.ns && !includeNs) continue;
        if (manaFilterOn) {
            const mb = r.m;
            if (!mb) continue;   // マナ基盤不明のランは条件判定できないため除外
            let ok = true;
            for (const mc in manaMin) {
                if (mb.split(mc).length - 1 < manaMin[mc]) { ok = false; break; }
            }
            if (!ok) continue;
        }
        const dk = decodeDeck(r.deck);
        const runExh = decodeExh(r.exh);
        // 📌 ピン留めカードは「ピン時のデッキ枚数以上」所持しているランのみ (展示品は所持のみ)
        const pinOk = (cid) => (dk[cid] || 0) >= Math.max(1, state.deck.get(cid) || 1);
        if (pinCards.some(cid => !pinOk(cid)) || pinExhs.some(eid => !runExh.includes(eid))) continue;
        // ピン留めされた初期カードは除外対象からも外す (ユーザー側と対称にする)
        const exclSet = (excludeStarters && pinCards.length)
            ? new Set([...starters].filter(id => !state.pins.has(id))) : starters;
        const cardSet = excludeStarters ? presence(dk, exclSet) : presence(dk, null);
        const cmpSet = includeExh ? new Set([...cardSet, ...runExh]) : cardSet;
        const { j, c } = similarity(userCmp, cmpSet);
        scored.push({ r, dk, j, c });
    }
    // 選択方式を主キー、もう片方をタイブレークに使用
    scored.sort(metric === 'j'
        ? (a, b) => (b.j - a.j) || (b.c - a.c)
        : (a, b) => (b.c - a.c) || (b.j - a.j));

    const mOf = (p) => metric === 'j' ? p.j : p.c;
    // 類似度0% (交差ゼロ) のランは母集団から除外する (J=0 ⇔ 包含率も0)
    const positive = scored.filter(x => x.j > 0);
    let pool;
    if (poolMode.startsWith('top')) {
        const n = +poolMode.slice(3);
        pool = positive.slice(0, n);
    } else {
        const th = +poolMode.slice(2);
        pool = positive.filter(x => mOf(x) >= th);
    }
    // 候補全ランの95%以上に含まれるカード (= 全滅系的に必ず入手するカード) を補強候補から除外
    const ubiq = new Set();
    if (scored.length) {
        const cc = {};
        for (const p of scored) for (const cid in p.dk) cc[cid] = (cc[cid] || 0) + 1;
        for (const cid in cc) if (cc[cid] / scored.length >= 0.95) ubiq.add(cid);
    }

    // 候補全ランの95%以上に含まれる展示品も除外
    const exhUbiq = new Set();
    if (scored.length) {
        const ec = {};
        for (const p of scored) for (const eid of decodeExh(p.r.exh)) ec[eid] = (ec[eid] || 0) + 1;
        for (const eid in ec) if (ec[eid] / scored.length >= 0.95) exhUbiq.add(eid);
    }

    renderResults(scored, pool, userAll, starters, ubiq, metric, userExh, exhUbiq);
    document.querySelectorAll('.result-block').forEach(el => el.style.display = 'block');
    $('#results-anchor').scrollIntoView({ behavior: 'smooth' });
}

function fmt(n, digits = 1) { return (typeof n === 'number' && isFinite(n)) ? n.toFixed(digits) : '-'; }

function renderResults(scored, pool, userAll, starters, ubiq, metric, userExh, exhUbiq) {
    const N = pool.length;
    const METRIC_JA = { j: 'Jaccard', c: DDT('metric_c','包含率') };
    // 📌 必須条件の可視化 (展示品ピンは「初期展示品など全ラン所持」だと候補数が変わらないため状態を見せる)
    const pinNames = [...state.pins].map(id => `${(D.cards[id] || {}).ja || id}×${Math.max(1, state.deck.get(id) || 1)}`)
        .concat([...state.exhPins].map(eid => (D.exhInfo[eid] || {}).ja || eid));
    const pinsHtml = pinNames.length
        ? ` <span class="pin-badge" title="${pinNames.join(', ')}">📌 ${pinNames.length}</span>` : '';
    $('#pool-summary').innerHTML = DDTF('pool_summary', `
        <p><b>母集団: {n} ラン</b> (候補 {cand} ラン中 / {char}{ns}{pins})
        <span class="muted">${DDT('metric_label','類似度方式')}: <span class="dd-metric-ref">{metric}</span> ／ ${DDT('best_label','最高値')} {best}% ／ ${DDT('sim_zero','類似度0%のランは除外')}</span></p>`, {
        n: N, cand: scored.length, char: state.char,
        ns: $('#opt-ns').checked ? DDT('ns_suffix',' + 統計外') : '',
        pins: pinsHtml,
        metric: METRIC_JA[metric],
        best: fmt(scored.length ? (metric === 'j' ? scored[0].j : scored[0].c) * 100 : 0, 1),
    });
    // ③-E: 類似度方式の ⓘ を DOM 側で差し込む (en は locales のテンプレートを使うため)
    const mrefEl = $('#pool-summary').querySelector('.dd-metric-ref');
    if (mrefEl && window.MI) mrefEl.insertAdjacentHTML('afterend', MI.icon(metric === 'j' ? 'jaccard' : 'coverage'));

    // --- サマリー stat cards ---
    const sizes = pool.map(p => Object.values(p.dk).reduce((a, b) => a + b, 0));
    const withT = pool.filter(p => p.r.T);
    const turns = withT.map(p => Object.values(p.r.T).reduce((a, t) => a + t[0], 0));
    const lifes = pool.filter(p => p.r.L != null).map(p => p.r.L);
    const spells = pool.filter(p => p.r.S != null).map(p => p.r.S);
    const nsIn = pool.filter(p => p.r.ns).length;
    const mean = (a) => a.length ? a.reduce((x, y) => x + y, 0) / a.length : null;
    const med = (a) => { if (!a.length) return null; const s = [...a].sort((x, y) => x - y); const m = Math.floor(s.length / 2); return s.length % 2 ? s[m] : (s[m - 1] + s[m]) / 2; };
    $('#stat-cards').innerHTML = [
        [DDT('st_population','母集団ラン数'), N],
        [DDT('st_ns','統計外ラン'), nsIn],
        [DDT('st_deck_size','平均デッキ枚数'), fmt(mean(sizes))],
        [DDT('st_turns_med','総ターン 中央値'), med(turns) === null ? '-' : Math.round(med(turns))],
        [DDT('st_l','平均総被弾 (L)'), fmt(mean(lifes))],
        [DDT('st_spells','平均スペル回数'), fmt(mean(spells))],
    ].map(([k, v]) => `<div class="stat-card"><div class="v">${v}</div><div class="k">${k}</div></div>`).join('');

    // --- 母集団サマリー詳細: デッキ枚数の IQR グラフ + カード種別の平均枚数 ---
    const qs = (a, q) => { if (!a.length) return null; const s = [...a].sort((x, y) => x - y); const pos = (s.length - 1) * q; const b = Math.floor(pos); return s[b + 1] != null ? s[b] + (pos - b) * (s[b + 1] - s[b]) : s[b]; };
    const szMin = Math.min(...sizes), szMax = Math.max(...sizes);
    const szQ1 = qs(sizes, .25), szQ2 = qs(sizes, .5), szQ3 = qs(sizes, .75);
    const pctN = (v) => (v - szMin) / ((szMax - szMin) || 1) * 100;
    const pct = (v) => pctN(v).toFixed(1);
    const tyAgg = {};
    for (const p of pool) for (const cid in p.dk) {
        const ty = (D.cards[cid] || {}).ty || 'Unknown';
        tyAgg[ty] = (tyAgg[ty] || 0) + p.dk[cid];
    }
    $('#pool-detail').innerHTML = `
        <div class="pool-detail-row"><b>${DDT('iqr_title','デッキ枚数の分布 (IQR):')}</b>
            <div class="iqr-plot">
                <div class="iqr-whisk" style="left:${pct(szMin)}%; width:${(pctN(szMax) - pctN(szMin)).toFixed(1)}%;"></div>
                <div class="iqr-box" style="left:${pct(szQ1)}%; width:${(pctN(szQ3) - pctN(szQ1)).toFixed(1)}%;"></div>
                <div class="iqr-med" style="left:${pct(szQ2)}%;"></div>
            </div>
            <span class="muted">${DDT('iqr_min','最小')} ${szMin} ／ Q1 ${fmt(szQ1)} ／ ${DDT('iqr_med','中央値')} ${fmt(szQ2)} ／ Q3 ${fmt(szQ3)} ／ ${DDT('iqr_max','最大')} ${szMax}</span></div>
        <div class="pool-detail-row"><b>${DDT('avg_by_type','カード種別の平均枚数:')}</b>
            ${Object.entries(tyAgg).sort((a, b) => b[1] - a[1]).map(([ty, n]) => `${typeBadge(ty)} ${fmt(n / N)}`).join(' <span class="muted">・</span> ')}</div>`;

    // --- 区間成績テーブル ---
    const segAgg = {};
    for (const p of pool) {
        if (!p.r.T) continue;
        for (const k in p.r.T) {
            const [t, f, l] = p.r.T[k];
            if (!f) continue;
            (segAgg[k] = segAgg[k] || []).push({ tpf: t / f, lpf: l / f });
        }
    }
    let segRows = '';
    const keys = Object.keys(segAgg).sort((a, b) => (+a[0] - +b[0]) || (a[1] < b[1] ? -1 : 1));
    for (const k of keys) {
        const list = segAgg[k];
        if (list.length < 3) continue;
        const act = k[0], kind = k[1];
        const tpf = mean(list.map(x => x.tpf));
        const lpf = mean(list.map(x => x.lpf));
        segRows += `<tr><td>Act${act} ${KIND_LOC[kind] || kind}</td><td>${fmt(tpf)}</td><td>${fmt(lpf)}</td><td>${list.length}</td></tr>`;
    }
    $('#seg-table').innerHTML = segRows
        ? `<table class="tbl"><thead><tr><th>${DDT('seg_col_segment','区間')}</th><th>${DDT('seg_col_tpf','平均ターン/戦闘')}${MI.icon('tpf')}</th><th>${DDT('seg_col_lpf','平均ライフ損失/戦闘')}${MI.icon('lpf')}</th><th>${DDT('seg_col_sample','サンプル')}</th></tr></thead><tbody>${segRows}</tbody></table>
           ${DDT('seg_note','<p class="muted">ライフ損失は純損失 (回復分で負値になり得ます)。サンプル3ラン未満の区間は省略。</p>')}`
        : DDT('seg_none','<p class="muted">戦績データのあるランがありません。</p>');

    // --- 個別敵の成績 (遭遇率・平均ターン/平均ライフ損失) ---
    const eAgg = {};
    for (const p of pool) {
        for (const e of decodeEnemies(p.r.en)) {
            const a = eAgg[e.i] || (eAgg[e.i] = { i: e.i, runs: 0, f: 0, r: 0, d: 0 });
            a.runs++; a.f += e.f; a.r += e.r; a.d += e.d;
        }
    }
    const enemyRows = Object.values(eAgg);
    // ソート値: chrono = 登場順 (Act → 種別 e<x<b<s → MinLevel・敵別戦績タブと同一の時系列順)
    const KIND_RANK = { e: 0, x: 1, b: 2, s: 3 };
    const eVal = (a, k) => {
        if (k === 'chrono') {
            const info = D.enemies[a.i] || [0, 0, 'e', 99, 999];
            return (info[3] != null ? info[3] : 99) * 1000000 + (KIND_RANK[info[2]] != null ? KIND_RANK[info[2]] : 9) * 1000 + (info[4] != null ? info[4] : 999);
        }
        return k === 'rate' ? a.runs : k === 'tpf' ? a.r / (a.f || 1) : k === 'lpf' ? a.d / (a.f || 1) : a[k];
    };
    const KIND_BADGE = { e: 'bk-e', x: 'bk-x', b: 'bk-b', s: 'bk-s' };
    const eSort = { key: 'chrono', dir: 1 };   // 既定: 時系列 (Act1 通常敵 → … → Act4 ボス)
    const renderEnemy = () => {
        if (!$('#enemy-body')) return;   // 敵データ無し (本文なし) の場合は何もしない
        const chAvgAll = (D.enemyAvg && D.enemyAvg[state.char]) || {};   // キャラ全ランでの敵別平均 [ターン/戦, ライフ損失/戦]
        const rows = [...enemyRows].sort((a, b) =>
            ((eVal(a, eSort.key) - eVal(b, eSort.key)) * eSort.dir) || (b.runs - a.runs));
        $('#enemy-body').innerHTML = rows.map(a => {
            const info = D.enemies[a.i] || [a.i, a.i, 'e', 99, 999];
            const meta = (info[3] != null && info[3] < 99) ? `<span class="en-muted">Act${info[3]}${(info[4] != null && info[4] < 999) ? ' Lv' + info[4] : ''} ・ </span>` : '';
            const avg = chAvgAll[a.i];
            const tAvg = avg ? ` <span class="en-muted">(${fmt(avg[0])})</span>` : '';
            const lAvg = avg ? ` <span class="en-muted">(${fmt(avg[1])})</span>` : '';
            return `<tr><td>${meta}<span class="badge ${KIND_BADGE[info[2]] || 'bk-e'}">${KIND_LOC[info[2]] || info[2]}</span>${enemyName(info)}</td>
                <td>${Math.round(a.runs / N * 100)}%</td><td>${a.f}</td>
                <td>${fmt(a.r / (a.f || 1))}${tAvg}</td><td>${fmt(a.d / (a.f || 1))}${lAvg}</td></tr>`;
        }).join('');
        document.querySelectorAll('#enemy-table th.sortable').forEach(th => {
            th.classList.toggle('sorted-asc', th.dataset.k === eSort.key && eSort.dir === 1);
            th.classList.toggle('sorted-desc', th.dataset.k === eSort.key && eSort.dir === -1);
        });
    };
    $('#enemy-table').innerHTML = enemyRows.length
        ? `<table class="tbl"><thead><tr><th class="sortable" data-k="chrono">${DDT('enemy_col_name','敵 (登場順)')}</th>
           <th class="sortable" data-k="rate">${DDT('enemy_col_rate','遭遇ラン率')}${MI.icon('encrate')}</th><th class="sortable" data-k="f">${DDT('enemy_col_f','総戦闘数')}</th>
           <th class="sortable" data-k="tpf">${DDT('enemy_col_tpf','平均ターン/戦')}${MI.icon('tpf')}</th><th class="sortable" data-k="lpf">${DDT('enemy_col_lpf','平均ライフ損失/戦')}${MI.icon('lpf')}</th>
           </tr></thead><tbody id="enemy-body"></tbody></table>
           ${DDT('enemy_note','<p class="muted">既定は登場順 (Act → 種別 → Lv)。列見出しクリックで並び替え (もう一度クリックで昇順/降順反転、「敵」列クリックで登場順に戻る)。ライフ損失は純損失 (回復超過で負値)。平均ターン/平均ライフ損失の<b>括弧内はこのキャラの全ランでの平均</b> (敵別戦績ベース)。</p>')}`
        : DDT('enemy_none','<p class="muted">戦闘データのあるランがありません。</p>');
    // ※ ハンドラは thead 再構築後にバインドする (innerHTML で th が作り直されるため)
    document.querySelectorAll('#enemy-table th.sortable').forEach(th => {
        th.onclick = () => {
            if (eSort.key === th.dataset.k) { eSort.dir = -eSort.dir; }
            else { eSort.key = th.dataset.k; eSort.dir = (th.dataset.k === 'chrono') ? 1 : -1; }
            renderEnemy();
        };
    });
    renderEnemy();

    // --- ルート傾向 ---
    const routeAgg = Array.from({ length: 9 }, () => ({ E: 0, X: 0, A: 0, G: 0, S: 0 }));
    for (const p of pool) {
        const slots = (p.r.route || '').split(';');
        slots.forEach((slot, i) => {
            if (!routeAgg[i]) return;
            const re = /([EGSAX])(\d+)/g; let m;
            while ((m = re.exec(slot)) !== null) routeAgg[i][m[1]]++;
        });
    }
    let routeHtml = '';
    for (let i = 0; i < 9; i++) {
        const agg = routeAgg[i];
        const total = Object.values(agg).reduce((a, b) => a + b, 0);
        let segs = ''; let left = 0;
        for (const code of ['E', 'X', 'A', 'G', 'S']) {
            if (!agg[code]) continue;
            const pct = agg[code] / total * 100;
            segs += `<div class="bar-seg seg-${code}" style="left:${left}%;width:${pct}%"></div>`;
            left += pct;
        }
        routeHtml += `<tr><td>${STAGE_LOC[i]}</td><td><div class="bar-wrap">${segs}</div></td><td class="muted">${
            Object.entries(agg).filter(([, v]) => v).map(([k, v]) => `${NODE_LOC[k]} ${Math.round(v / total * 100)}%`).join(' / ') || '-'}</td></tr>`;
    }
    $('#route-table').innerHTML = `<table class="tbl"><thead><tr><th>${DDT('route_col_stage','ステージ')}</th><th>${DDT('route_col_rate','選択比率')}</th><th>${DDT('route_col_detail','内訳')}</th></tr></thead><tbody>${routeHtml}</tbody></table>
        <div class="legend"><span class="lg-E">${DDT('lg_E','通常敵')}</span><span class="lg-X">${DDT('lg_X','エリート')}</span><span class="lg-A">${DDT('lg_A','イベント')}</span><span class="lg-G">${DDT('lg_G','隙間')}</span><span class="lg-S">${DDT('lg_S','ショップ')}</span></div>`;

    // --- 補強候補 / 珍しいカード ---
    const cnt = {}; let exhCnt = {};
    for (const p of pool) {
        for (const cid in p.dk) cnt[cid] = (cnt[cid] || 0) + 1;
        for (const eid of decodeExh(p.r.exh)) exhCnt[eid] = (exhCnt[eid] || 0) + 1;
    }
    const rate = (id) => (cnt[id] || 0) / N;
    const userOwned = new Set(userAll);
    // 初期カードと初期の立ち退き命令 (小精霊) 以外は、候補ランの 95%+ でも補強候補に表示する (2026-11-15)
    const reinforce = Object.keys(cnt)
        .filter(id => !starters.has(id) && id !== 'Zhukeling')
        .sort((a, b) => rate(b) - rate(a))
        .slice(0, 30)
        .map(id => {
            const c = D.cards[id] || {};
            const avgCopies = (() => { let s = 0, n = 0; for (const p of pool) if (p.dk[id]) { s += p.dk[id]; n++; } return n ? s / n : 0; })();
            const owned = userOwned.has(id) ? ' <span class="hit-item">✓</span>' : '';
            return `<tr><td>${typeBadge(c.ty || 'Unknown')}${cardName(c, id)}${owned}</td><td>${Math.round(rate(id) * 100)}%</td><td>${fmt(avgCopies)}</td><td class="muted">${c.ra || ''}</td></tr>`;
        });
    $('#reinforce-table').innerHTML = reinforce.length
        ? `<table class="tbl"><thead><tr><th>${DDT('col_card','カード')}</th><th>${DDT('reinforce_col_rate','採用ラン比率')}</th><th>${DDT('reinforce_col_avg','採用時平均枚数')}</th><th>${DDT('col_rarity','レアリティ')}</th></tr></thead><tbody>${reinforce.join('')}</tbody></table>
           ${DDT('reinforce_note','<p class="muted">初期カードと初期の立ち退き命令 (小精霊) は除外しています。それ以外は採用率が高くても表示します。<span class="hit-item">✓</span> = あなたのデッキにも入っているカード。</p>')}`
        : DDT('none','<p class="muted">該当なし。</p>');

    // 類似ラン集団でほとんど使われていないカード (母集団全体が対象。✓ = あなたのデッキにも入っている)
    const rare = Object.keys(cnt)
        .filter(id => !starters.has(id))
        .sort((a, b) => rate(a) - rate(b))
        .slice(0, 6)
        .map(id => {
            const c = D.cards[id] || {};
            const owned = userOwned.has(id) ? ' <span class="hit-item">✓</span>' : '';
            return `<tr><td>${typeBadge(c.ty || 'Unknown')}${cardName(c, id)}${owned}</td><td>${Math.round(rate(id) * 100)}%</td></tr>`;
        });
    $('#rare-table').innerHTML = rare.length
        ? `<table class="tbl"><thead><tr><th>${DDT('col_card','カード')}</th><th>${DDT('rare_col_rate','類似ランでの採用率')}</th></tr></thead><tbody>${rare.join('')}</tbody></table>
           ${DDT('rare_note','<p class="muted">類似ランでほとんど使われていないカード。<span class="hit-item">✓</span> = あなたのデッキにも入っている (外し候補の可能性・意思決定はご自身で)。</p>')}`
        : DDT('none','<p class="muted">該当なし。</p>');

    // --- 展示品候補 (ユーザー入力済み・ほぼ全ラン所持の展示品は除外 / 分類フィルタ+カラム切替) ---
    const exhClassOf = (eid) => {
        const info = D.exhInfo[eid] || {};
        if (info.ra === 'Shining') return 'shining';
        const src = info.src || 'other';
        if (src === 'shop') return 'shop';
        if (src === 'event') return 'event';
        return 'other';
    };
    function renderExh() {
        const f = $('#exh-filter').value;
        const cells = Object.entries(exhCnt)
            .filter(([eid]) => !(userExh && userExh.has(eid)) && !(exhUbiq && exhUbiq.has(eid)))
            .filter(([eid]) => {
                if (f === 'all') return true;
                const cl = exhClassOf(eid);
                return f === 'normal' ? cl !== 'shining' : cl === f;
            })
            .sort((a, b) => b[1] - a[1]).slice(0, 40)
            .map(([eid, c]) => {
                const info = D.exhInfo[eid] || { ja: eid, en: eid, ra: '', src: '' };
                const dec = exhDecor(info);   // 展示品タブと同じ表記 (光耀=マナアイコン / 🛒 / ✨ / 色付き名前)
                return `<div class="exh-cell">${dec.icon}${dec.nameHtml} <span class="en-muted">${info.ra ? ' ・ ' + info.ra : ''}</span><br><span class="muted">${DDT('adopt','採用')} <b>${Math.round(c / N * 100)}%</b></span></div>`;
            });
        const grid = $('#exh-grid');
        grid.style.gridTemplateColumns = $('#exh-cols').value === '4' ? 'repeat(4, 1fr)' : 'repeat(2, 1fr)';
        grid.innerHTML = cells.length ? cells.join('') : DDT('none','<p class="muted">該当なし。</p>');
    }
    $('#exh-filter').onchange = renderExh;
    $('#exh-cols').onchange = renderExh;
    renderExh();

    // --- 類似ラン一覧 ---
    // ハイライト付きデッキ/展示品HTML (展開行とホバーツールチップで共用)
    const deckHtmlFor = (p) => Object.entries(p.dk).sort((a, b) => b[1] - a[1]).map(([cid, n]) => {
        const name = (D.cards[cid] ? cardName(D.cards[cid], cid) : cid) + (n > 1 ? '×' + n : '');
        if (state.pins.has(cid)) return `<span class="hit-pin">${name}</span>`;   // 📌必須条件に一致 (赤字)
        return state.deck.has(cid) ? `<span class="hit-item">${name}</span>` : name;
    }).join(DDT('sep','、'));
    const exhHtmlFor = (r) => decodeExh(r.exh).map(eid => {
        const info = D.exhInfo[eid];
        if (!info) return eid;
        const dec = exhDecor(info);
        const html = dec.icon + dec.nameHtml;
        if (state.exhPins.has(eid)) return `<span class="hit-pin">${html}</span>`;   // 📌必須条件に一致 (赤字)
        return state.exh.has(eid) ? `<span class="hit-item">${html}</span>` : html;
    }).join(DDT('sep','、'));
    let rows = '';
    pool.slice(0, 30).forEach((p, i) => {
        const r = p.r;
        const totalT = r.T ? Object.values(r.T).reduce((a, t) => a + t[0], 0) : null;
        const deckHtml = deckHtmlFor(p);
        const exhHtml = exhHtmlFor(r);
        const v3 = (r.ver || '').split('.').slice(0, 3).join('.');
        const gh = GH_LOGS + v3 + '/' + encodeURIComponent(r.id) + '/';
        const shortId = (r.id || '').slice(0, 10) + '…' + (r.end || '');
        rows += `<tr class="run-row" data-i="${i}">
            <td><a class="run-id-link" href="${gh}" target="_blank" rel="noopener" title="${r.id}"><span class="pid-clip">${shortId}</span></a></td>
            <td class="col-mana">${manaIconsHtml(r.m)}</td>
            <td>${r.pl || ''}</td><td>${r.ver || ''}</td><td><b>${fmt(p.j * 100, 1)}%</b></td><td>${fmt(p.c * 100, 1)}%</td>
            <td>${Object.values(p.dk).reduce((a, b) => a + b, 0)}</td>
            <td>${totalT === null ? '-' : totalT}</td><td>${r.L != null ? r.L : '-'}</td><td>${r.S != null ? r.S : '-'}</td>
            <td>${r.ns ? '<span class="badge b-Misfortune">ns</span>' : ''}</td></tr>
            <tr class="detail-row" style="display:none"><td colspan="11" style="text-align:left"><b>${DDT('final_deck','最終デッキ:')}</b> ${deckHtml || '-'}<br><b>${DDT('exhibits','展示品:')}</b> ${exhHtml || '-'}</td></tr>`;
    });
    $('#runs-table').innerHTML = rows
        ? `<table class="tbl"><thead><tr><th>${DDT('col_play_id','プレイID (ログビューア)')}</th><th>${DDT('col_mana','最終マナ基盤')}</th><th>${DDT('col_player','プレイヤー')}</th><th>${DDT('col_ver','Ver')}</th><th>${DDT('col_sim','類似度(J)')}</th><th>${DDT('col_contain','包含率')}</th><th>${DDT('col_count','枚数')}</th><th>${DDT('col_turns','総ターン')}</th><th>${DDT('col_l','被弾')}</th><th>${DDT('col_spells','スペル')}</th><th></th></tr></thead><tbody>${rows}</tbody></table>
           ${DDT('runs_note','<p class="muted">プレイIDにマウスを合わせると最終デッキ・展示品をホバー表示 (<span class="hit-item">太字</span> = あなたのデッキにもあるカード/展示品)。クリックで公開ログビューア (lbol-logs.github.io) を開きます。行クリックでも展開表示できます。</p>')}`
        : DDT('runs_none','<p class="muted">類似ランがありません。デッキを減らす/変えると候補が出ることがあります。</p>');

    document.querySelectorAll('#runs-table tr.run-row').forEach(tr => {
        tr.addEventListener('click', (e) => {
            if (e.target.closest('a')) return;   // リンククリックは詳細トグルしない
            const det = tr.nextElementSibling;
            if (det) det.style.display = (det.style.display === 'none') ? 'table-row' : 'none';
        });
    });

    // --- ホバーツールチップ (title属性は太字表現ができないため HTML ポップアップを使用) ---
    if (window.__runTip) window.__runTip.remove();
    const tip = document.createElement('div');
    tip.className = 'run-tip';
    tip.style.display = 'none';
    // スコープCSS (.run-tip / .hit-item) を効かせるためタブ内に配置 (単独テスト版は body 直下)
    (document.getElementById('deck-diagnosis-tab') || document.body).appendChild(tip);
    window.__runTip = tip;
    pool.slice(0, 30).forEach((p, i) => {
        const tr = document.querySelector(`#runs-table tr.run-row[data-i="${i}"]`);
        const link = tr ? tr.querySelector('a.run-id-link') : null;
        if (!link) return;
        link.addEventListener('mouseenter', () => {
            tip.innerHTML = `<b>${DDT('final_deck','最終デッキ:')}</b> ${deckHtmlFor(p)}<br><b>${DDT('final_mana','最終マナ基盤:')}</b> ${manaIconsHtml(p.r.m)}<br><b>${DDT('exhibits','展示品:')}</b> ${exhHtmlFor(p.r)}`;
            tip.style.display = 'block';
            const rect = link.getBoundingClientRect();
            tip.style.left = Math.max(8, Math.min(rect.left + window.scrollX, window.innerWidth - 460)) + 'px';
            tip.style.top = (rect.bottom + window.scrollY + 6) + 'px';
        });
        link.addEventListener('mouseleave', () => { tip.style.display = 'none'; });
    });
}

window.__ddInit = () => {
    D = window.DIAG_DATA;
    CARD_ID_BY_NAME = __buildCardIndex();
    EXH_ID_BY_NAME = __buildExhIndex();
    TYPE_LOC = LOC(TYPE_JA, 'type');
    KIND_LOC = LOC(KIND_JA, 'kind');
    STAGE_LOC = LOC(STAGE_JA, 'stage');
    NODE_LOC = LOC(NODE_JA, 'node');
    // アクティブなキャラ (?char=) を初期選択にする (2026-11-15)
    if (typeof CURRENT_CHAR !== 'undefined' && CURRENT_CHAR && D.chars && D.chars.includes(CURRENT_CHAR)) state.char = CURRENT_CHAR;
    renderCharButtons();
    // マナ基盤フィルタ UI (終了時 BaseMana の色別「N 個以上」条件)
    const MANA_NAME_JA = { W: '白', U: '青', B: '黒', R: '赤', G: '緑', P: '虹', C: '無色', A: '任意' };
    const mf = $('#mana-filters');
    if (mf && D.manaIcons) {
        mf.innerHTML = ['W', 'U', 'B', 'R', 'G', 'P', 'C', 'A'].filter(c => D.manaIcons[c]).map(c =>
            `<label class="mana-cond" title="${DDT('mn_' + c, MANA_NAME_JA[c] || c)}">${D.manaIcons[c]}≥<input type="number" min="0" max="9" value="0" data-m="${c}"></label>`).join('');
    }
    const dl = $('#card-datalist');
    const opts = [];
    for (const cid of D.cardIds) {
        const c = D.cards[cid];
        const nm = isEN() ? (c.en || c.ja) : (c.ja || c.en);
        if (nm) opts.push(`<option value="${nm}">`);
    }
    dl.innerHTML = opts.join('');
    const resolveCard = () => {
        const v = $('#deck-input').value.trim().toLowerCase();
        if (!v) return;
        let cid = CARD_ID_BY_NAME.get(v);
        if (!cid) {  // 部分一致フォールバック
            for (const [name, id] of CARD_ID_BY_NAME) { if (name.includes(v)) { cid = id; break; } }
        }
        if (cid) { addCard(cid); $('#deck-input').value = ''; }
        else alert(DDTF('err_card_not_found','「{v}」というカードが見つかりません (日本語名/英語名で入力してください)。', v));
    };
    $('#btn-add-card').onclick = resolveCard;
    $('#deck-input').addEventListener('keydown', (e) => {
        if (e.key !== 'Enter') return;
        e.preventDefault();
        resolveCard();
    });
    // 展示品 datalist + 入力
    const edl = $('#exh-datalist');
    if (edl) {
        edl.innerHTML = D.exhIds.filter(eid => D.exhInfo[eid] && D.exhInfo[eid].ja)
            .map(eid => `<option value="${exhName(D.exhInfo[eid], eid)}">`).join('');
        const resolveExh = () => {
            const v = $('#exh-input').value.trim().toLowerCase();
            if (!v) return;
            let eid = EXH_ID_BY_NAME.get(v);
            if (!eid) {
                for (const [name, id] of EXH_ID_BY_NAME) { if (name.includes(v)) { eid = id; break; } }
            }
            if (eid) { state.exh.add(eid); $('#exh-input').value = ''; renderDeck(); }
            else alert(DDTF('err_exh_not_found','「{v}」という展示品が見つかりません (日本語名/英語名で入力してください)。', v));
        };
        $('#btn-add-exh').onclick = resolveExh;
        $('#exh-input').addEventListener('keydown', (e) => {
            if (e.key !== 'Enter') return;
            e.preventDefault();
            resolveExh();
        });
    }
    $('#btn-starter').onclick = loadStarterDeck;
    $('#btn-clear').onclick = () => { state.deck.clear(); state.exh.clear(); state.pins.clear(); state.exhPins.clear(); renderDeck(); };
    // ③-F: ログ URL からの読み込み
    if ($('#runurl-input')) {
        $('#btn-load-run').onclick = __loadRunFromInput;
        $('#runurl-input').addEventListener('keydown', (e) => { if (e.key === 'Enter') { e.preventDefault(); __loadRunFromInput(); } });
    }
    $('#diag-btn').onclick = runDiagnosis;
    // ③-H: 診断履歴パネル (クリック = 再実行 / 🗑 = 2 段階削除 / クリア)
    ddRenderHistory();
    const dhp = document.getElementById('dd-history-body');
    if (dhp) dhp.addEventListener('click', (e) => {
        const det = e.target.closest('[data-hdet]');
        if (det) { ddHistoryToggleDetail(det); return; }
        const del = e.target.closest('[data-hdel]');
        if (del) { ddHistoryDeleteTap(del, del.getAttribute('data-hdel')); return; }
        const row = e.target.closest('[data-hrun]');
        if (row) ddRestoreHistory(parseFloat(row.getAttribute('data-hrun')));
    });
    const dhc = document.getElementById('dd-history-clear');
    if (dhc) dhc.onclick = () => { ddSaveHistory([]); ddRenderHistory(); };
    renderDeck();
    // v2 split: ns 未ロード時でも母集団表示が崩れないよう、生成側が付与した nsCount を使う
    const ddStatN = D.runs.filter(r => !r.ns).length;
    const ddNsN = (typeof D.nsCount === 'number') ? D.nsCount : D.runs.filter(r => r.ns).length;
    $('#meta-line').textContent = DDTF('meta_line', '母集団: {total} ラン (統計 {stat} + 統計外 {ns}) ／ データ生成: {gen} ／ レポート生成: {rep}', {
        total: ddStatN + ddNsN,
        stat: ddStatN,
        ns: ddNsN,
        gen: D.dataGeneratedAt, rep: D.generatedAt,
    });

    // --- 条件の保存・共有・リセット (URLハッシュ #dd= / localStorage) ---
    $('#dd-share-btn').onclick = () => {
        const cond = ddPersistCondition();
        const compact = ddEncodeCompact(cond);
        const longUrl = location.origin + location.pathname + '?dd=' + compact;
        const fail = () => alert(DDT('dd_share_manual','クリップボードにコピーできませんでした。もう一度お試しください。'));
        const copyLong = () => {
            if (navigator.clipboard && navigator.clipboard.writeText) {
                navigator.clipboard.writeText(longUrl).then(() => alert(DDT('dd_copied','共有リンクをコピーしました。')), fail);
            } else fail();
        };
        // ③-G2: 短縮は lbolShortenUrl (結果キャッシュ + is.gd → v.gd → spoo.me) に統一。
        //   is.gd は IP あたり 200 件/時の制限があるため、キャッシュとフォールバックで回避。
        //   全プロバイダ失敗時は条件付き URL (?dd=...) をそのままコピー
        const shortenP = (typeof lbolShortenUrl === 'function') ? lbolShortenUrl(longUrl) : Promise.resolve(null);
        shortenP.then(short => {
            if (!short || !(navigator.clipboard && navigator.clipboard.writeText)) return copyLong();
            return navigator.clipboard.writeText(short)
                .then(() => alert(DDT('dd_copied_short','短縮リンクをコピーしました。')))
                .catch(copyLong);
        }).catch(copyLong);
    };
    $('#dd-reset-btn').onclick = () => {
        state.deck.clear(); state.exh.clear(); state.pins.clear(); state.exhPins.clear();
        $('#opt-ns').checked = false; $('#opt-exh').checked = true; $('#opt-no-starter').checked = true;
        $('#opt-metric').value = 'j'; $('#opt-pool').value = 'top100';
        document.querySelectorAll('#mana-filters input').forEach(inp => { inp.value = 0; });
        try { localStorage.removeItem('dd_last_condition_v1'); } catch (e) {}
        try { history.replaceState(null, '', location.pathname + location.search); } catch (e) {}
        renderCharButtons();
        renderDeck();
    };
    // 条件の復元: 共有リンク (?dd= 新形式 / 旧 #dd=) を最優先で自動診断 / 無ければ localStorage から復元 (自動診断はしない)
    //   ③-G: アドレスバー自体には条件を乗せない。共有は共有ボタンから
    let ddRestored = false;
    try {
        const ddq = new URLSearchParams(location.search);
        if (ddq.has('dd')) {
            const cond = ddParseSharedCondition(ddq.get('dd'));
            ddRestored = ddApplyCondition(cond);
            if (ddRestored) runDiagnosis();
        }
    } catch (e) { /* 壊れたパラメータは無視 */ }
    if (!ddRestored && location.hash.startsWith('#dd=')) {
        try {
            const cond = ddParseSharedCondition(location.hash.slice(4).split('&')[0]);
            ddRestored = ddApplyCondition(cond);
            if (ddRestored) runDiagnosis();
        } catch (e) { /* 壊れたハッシュは無視 */ }
    }
    if (!ddRestored) {
        try {
            const saved = JSON.parse(localStorage.getItem('dd_last_condition_v1') || 'null');
            if (saved) ddApplyCondition(saved);
        } catch (e) { /* 壊れた保存値は無視 */ }
    }
    // 他タブ (展示品/カード一覧) から 📌 が追加されたときに条件を再適用 (P-50/P-52)
    window.addEventListener('dd-condition-updated', () => {
        try {
            const cond = JSON.parse(localStorage.getItem('dd_last_condition_v1') || 'null');
            if (cond) ddApplyCondition(cond);
        } catch (e) { /* 無視 */ }
    });
};