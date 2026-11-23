// card-election.js — P-55 カード総選挙タブ (テスト機能 β)
// データ: data/card_election_data.json (score_gen_all_chars.py が生成)
//   各キャラの L7 TrueEnd ランのみで独立推定 (キャラ間の数値は直接比較不可)。
//   初回タブ表示時に遅延ロードする。
//   i18n: LANG==='en' のとき locales/en.json の card_election セクションを参照 (CET/CETF)。
//   ja は翻訳キーを持たないため、常に第2引数の日本語原文にフォールバックする (deck-diagnosis と同じ方式)。
//
// 用語: Pレート = ピック (ドラフト) を「同じマスで提示された 2 枚の対戦」とみなした Elo レート。
//   ドラフト採用率* = Cards_log Add ベースの実質的な獲得率 (ドラフト・イベント問わず獲得。使用時消滅カード込み)。
//   最終採用率* = ラン終了時にデッキに残っている割合 (カード一覧タブの採用率と同じ)。

// ===== i18n ヘルパ =====
function isCE_EN() { return (typeof LANG !== 'undefined') && LANG === 'en'; }
function CET(key, ja) {
    if (!isCE_EN()) return ja;
    const en = (typeof UI_TEXT !== 'undefined' && UI_TEXT.card_election) ? UI_TEXT.card_election[key] : undefined;
    if (en === undefined || en === null) { console.warn('[card-election] missing EN translation: ' + key); return ja; }
    return en;
}
function CETF(key, ja, subs) {
    const s = String(CET(key, ja));
    if (subs == null) return s;
    if (typeof subs === 'string' || typeof subs === 'number') subs = { v: subs };
    return s.replace(/\{(\w+)\}/g, (m, k) => (subs[k] !== undefined) ? subs[k] : m);
}

// ===== 定数 =====
const CE_GROUPS = () => CET('groups', "攻撃,スキル,防御,能力,道具,状態,仲間,不幸,その他").split(",");
const CE_TYPE_EN = ["Attack", "Skill", "Defense", "Ability", "Tool", "Status", "Friend", "Misfortune"];
const CE_GROUP_COLOR = ["#d9534f", "#4a90d9", "#4caf7d", "#9b59b6", "#e6a23c", "#9a9a9a", "#3aa6a6", "#7a6a5a", "#bbb"];
const CE_RARITY = { "Rare": "レア", "Uncommon": "アンコ", "Common": "コモン" };
const CE_LABEL_EN = { Reimu_A: "Reimu A", Reimu_B: "Reimu B", Marisa_A: "Marisa A", Marisa_B: "Marisa B",
    Sakuya_A: "Sakuya A", Sakuya_B: "Sakuya B", Koishi_A: "Koishi A", Koishi_B: "Koishi B",
    Cirno_A: "Cirno A", Cirno_B: "Cirno B" };

function ceName(nm) { return isCE_EN() ? (nm[1] || nm[0]) : nm[0]; }
function ceRarity(r) { return isCE_EN() ? (r || "") : (CE_RARITY[r] || r || ""); }
function ceTicon(g) {
    return (g >= 0 && g < 8) ? `<img class="ticon" src="img/types/${CE_TYPE_EN[g]}@2x.avif" onerror="this.style.display='none'">` : "";
}
const CE_AVATARS = { Reimu: 1, Marisa: 1, Sakuya: 1, Koishi: 1, Cirno: 1, Alice: 1, Mod: 1 };
function ceAvImg(owner, cls) {
    return CE_AVATARS[owner]
        ? `<img class="${cls || "av"}" src="img/avatars/${owner}.avif" onerror="this.style.display='none'">`
        : "";
}

// ===== タブ描画 =====
function renderCardElectionTab() {
    const tabContent = document.getElementById('card-election-tab');
    if (!tabContent || tabContent.innerHTML.trim() !== '') return;
    tabContent.innerHTML =
        `<div class="ce-loading" id="ce-loading">${CET('loading', 'カード総選挙データを読み込み中... (card_election_data.json 約1.7MB)')}</div>` +
        `<div class="ce-wrap">` +
        `<h3 style="font-size:18px;margin:0 0 4px">${CET('title', 'カード総選挙')} <span class="ce-beta-badge">${CET('beta_badge', 'テスト機能 (β)')}</span></h3>` +
        `<p class="ce-muted" id="ce-meta"></p>` +
        `<p class="ce-muted">${CET('intro', 'A vs B の同時提示を「対戦」とみなしてレート化した <b>Pレート</b> と積み指標から <b>合成Pスコア</b> を算出。')} ` +
        `<a href="#" id="ce-howto-link" class="lnk">${CET('howto_link', '詳細は使い方タブの「カード総選挙」の節へ')}</a></p>` +
        `<div class="ctrls">` +
        `<label>${CET('f_group', 'グループ')} <select id="ce-fGroup"><option value="-1">${CET('f_all', 'すべて')}</option></select></label>` +
        `<label>${CET('f_owner', '所有者')} <select id="ce-fOwner"><option value="">${CET('f_all2', 'すべて')}</option></select></label>` +
        `<label>${CET('f_text', '絞り込み')} <input type="text" id="ce-fText" placeholder="${CET('f_text_ph', 'カード名')}"></label>` +
        `<label>${CET('f_adopt', '最終採用率*下限')} <select id="ce-fAdopt">` +
        `<option value="0">${CET('f_none', 'なし')}</option><option value="1">1%+</option>` +
        `<option value="3">3%+</option><option value="5" selected>5%+</option><option value="10">10%+</option>` +
        `</select></label>` +
        `<label><input type="checkbox" id="ce-fNoElo" checked> ${CET('f_noelo', 'Pレート未算出も表示')}</label>` +
        `<label>${CET('f_y', '縦軸')} <select id="ce-fY"><option value="pct2">${CET('f_pct2', '2枚以上率')}</option><option value="avg">${CET('f_avg', '平均枚数')}</option></select></label>` +
        `</div>` +
        `<div id="ce-scatter-box">` +
        `<div id="ce-scatter"></div>` +
        `<div class="legend" id="ce-legend"></div>` +
        `<div id="ce-tip"></div>` +
        `</div>` +
        `<div id="ce-detail" style="display:none"></div>` +
        `<h2>${CET('tbl_title', 'カード表')} <span id="ce-cnt" class="ce-muted" style="font-weight:normal"></span></h2>` +
        `<div style="overflow:auto; max-height: 640px; border: 1px solid #dfe3ec; border-radius: 8px;">` +
        `<table id="ce-tbl"></table></div>` +
        `</div>`;
    const link = document.getElementById('ce-howto-link');
    if (link) link.addEventListener('click', (ev) => {
        ev.preventDefault();
        if (typeof switchTab === 'function') switchTab('manual-tab');
    });
    ensureCardElectionData();
}

let __ceDataPromise = null;
function ensureCardElectionData() {
    if (!__ceDataPromise) {
        __ceDataPromise = fetch(`data/card_election_data.json?v=${DATA_VERSION}`)
            .then((res) => { if (!res.ok) throw new Error('HTTP ' + res.status); return res.json(); })
            .then((data) => {
                window.CE_DATA = data;
                const ld = document.getElementById('ce-loading');
                if (ld) ld.remove();
                __ceInit();
                return data;
            })
            .catch((err) => {
                const ld = document.getElementById('ce-loading');
                if (ld) ld.textContent = CET('load_error', 'カード総選挙データの読み込みに失敗しました: ') + err.message;
                __ceDataPromise = null;   // 再試行可能にする
            });
    }
    return __ceDataPromise;
}

// ===== 状態 =====
let CE_CUR = null, CE_SEL = null;
let CE_SORT_KEY = 12, CE_SORT_ASC = false;   // 既定: 合成Pスコア降順 (未算出は常に末尾)

function __ceInit() {
    const data = window.CE_DATA;
    if (!data || !data.chars) return;
    // CURRENT_CHAR (例: SakuyaA) → データキー (Sakuya_A)
    const key = Object.keys(data.chars).find(k => k.replace(/_/g, '') === CURRENT_CHAR);
    if (!key) {
        const box = document.querySelector('#card-election-tab .ce-wrap');
        if (box) box.innerHTML = `<p class="ce-muted">${CETF('no_char', '{char} のランデータがありません (対象: L7 TrueEnd の 10 キャラ)。', { char: CURRENT_CHAR })}</p>`;
        return;
    }
    CE_CUR = data.chars[key];
    // メタ表示
    const em = CE_CUR.elo_max != null ? CETF('elo_range', 'Elo {min}〜{max}', { min: CE_CUR.elo_min, max: CE_CUR.elo_max }) : "";
    const label = isCE_EN() ? (CE_LABEL_EN[key] || CE_CUR.label) : CE_CUR.label;
    document.getElementById('ce-meta').innerHTML =
        `<b>${label}</b>${CETF('meta', '・L7 TrueEnd {runs} ラン・Pレート算出 {n} カード {elo}', { runs: CE_CUR.runs, n: CE_CUR.n_bt, elo: em })}`;
    // グループ・所有者の選択肢
    const gs = new Set(), os = new Set();
    for (const r of CE_CUR.cards) { gs.add(CE_CUR.names[r[0]][3]); os.add(CE_CUR.names[r[0]][5]); }
    const G = CE_GROUPS();
    const gsEl = document.getElementById('ce-fGroup');
    gsEl.innerHTML = `<option value="-1">${CET('f_all', 'すべて')}</option>`;
    [...gs].sort((a, b) => a - b).forEach(g => {
        const o = document.createElement("option"); o.value = g; o.textContent = G[g] || g; gsEl.appendChild(o);
    });
    const osEl = document.getElementById('ce-fOwner');
    osEl.innerHTML = `<option value="">${CET('f_all2', 'すべて')}</option>`;
    [...os].sort().forEach(o => {
        const opt = document.createElement("option"); opt.value = o; opt.textContent = o; osEl.appendChild(opt);
    });
    document.getElementById('ce-legend').innerHTML = [...gs].sort((a, b) => a - b).map(g =>
        `<span><span class="sw" style="background:${CE_GROUP_COLOR[g]}"></span>${ceTicon(g)}${G[g]}</span>`).join("");
    for (const id of ["ce-fGroup", "ce-fOwner", "ce-fText", "ce-fAdopt", "ce-fNoElo", "ce-fY"]) {
        const el = document.getElementById(id);
        el.addEventListener(id === "ce-fText" ? "input" : "change", () => ceRender());
    }
    ceRender();
}

// ===== 共通小物 =====
// ミニ箱ひげ図 + 目盛り (30..70)。fixed=false は詳細パネル用 (枠の幅いっぱいに伸縮) / fixed=true はツールチップ用 (固定幅)
function ceMiniBox(v, box, color, W, dark, fixed) {
    W = W || 300;
    const H = 16, pad = 3;
    const x = (val) => pad + (val - 25) / 50 * (W - pad * 2);
    const ns = 'vector-effect="non-scaling-stroke"';
    const tickCol = dark ? "rgba(255,255,255,.55)" : "#b9c0cf";
    let s = `<span class="mboxwrap"${fixed ? ` style="width:${W}px;flex:none"` : ""}>`;
    s += `<svg class="mbox" viewBox="0 0 ${W} ${H}" preserveAspectRatio="none">`;
    if (dark) s += `<line x1="${x(50)}" y1="0" x2="${x(50)}" y2="${H - 4}" stroke="rgba(255,255,255,.35)" stroke-dasharray="2 2" ${ns}/>`;
    else s += `<line x1="${x(50)}" y1="0" x2="${x(50)}" y2="${H - 4}" stroke="#c3c9d6" stroke-dasharray="2 2" ${ns}/>`;
    if (box && !box.some(b => b == null)) {
        const [mn, q1, md, q3, mx] = box;
        s += `<line x1="${x(mn)}" y1="${H / 2}" x2="${x(q1)}" y2="${H / 2}" stroke="${color}" stroke-width="1.2" ${ns}/>`;
        s += `<line x1="${x(q3)}" y1="${H / 2}" x2="${x(mx)}" y2="${H / 2}" stroke="${color}" stroke-width="1.2" ${ns}/>`;
        s += `<rect x="${x(q1)}" y="${H / 2 - 4.5}" width="${(x(q3) - x(q1)).toFixed(1)}" height="9" fill="${color}" fill-opacity="${dark ? 0.5 : 0.22}" stroke="${color}" stroke-width="1" ${ns}/>`;
        s += `<line x1="${x(md)}" y1="${H / 2 - 4.5}" x2="${x(md)}" y2="${H / 2 + 4.5}" stroke="${color}" stroke-width="1.5" ${ns}/>`;
    }
    if (v != null) s += `<line x1="${x(v)}" y1="1" x2="${x(v)}" y2="${H - 4}" stroke="${dark ? "#fff" : "#222"}" stroke-width="1.5" ${ns}/>`;
    for (let tv = 30; tv <= 70; tv += 10) {
        s += `<line x1="${x(tv)}" y1="${H - 4}" x2="${x(tv)}" y2="${H}" stroke="${tickCol}" stroke-width="1" ${ns}/>`;
    }
    s += `</svg>`;
    s += `<span class="mboxticks">` + [30, 40, 50, 60, 70].map(tv => `<span style="left:${(x(tv) / W * 100).toFixed(1)}%">${tv}</span>`).join("") + `</span>`;
    s += `</span>`;
    return s;
}

// ===== カード総選挙データへのアクセス (他タブ: カード一覧/カード性能からも使用) =====
// CURRENT_CHAR (例: SakuyaA) → データキー (Sakuya_A) の char データを返す
function ceGetCharData() {
    const data = window.CE_DATA;
    if (!data || !data.chars) return null;
    const key = Object.keys(data.chars).find(k => k.replace(/_/g, '') === CURRENT_CHAR);
    return key ? data.chars[key] : null;
}
// カード ID → { prate, score } (データにないカードは null)
function ceCardScores(cardId) {
    const cd = ceGetCharData();
    if (!cd) return null;
    const r = cd.cards.find(x => x[0] === cardId);
    if (!r) return null;
    return { prate: (r[1] != null && isFinite(r[1])) ? r[1] : null,
             score: (r[7] != null && isFinite(r[7])) ? r[7] : null };
}

function ceFiltered() {
    const g = +document.getElementById('ce-fGroup').value,
        o = document.getElementById('ce-fOwner').value,
        q = document.getElementById('ce-fText').value.trim().toLowerCase(),
        amin = +document.getElementById('ce-fAdopt').value,
        noElo = document.getElementById('ce-fNoElo').checked;
    return CE_CUR.cards.filter(r => {
        const nm = CE_CUR.names[r[0]];
        if (g >= 0 && nm[3] !== g) return false;
        if (o && nm[5] !== o) return false;
        if (q && !((nm[0] || "").toLowerCase().includes(q) || (nm[1] || "").toLowerCase().includes(q))) return false;
        if (r[4] < amin) return false;
        if (r[1] == null && !noElo) return false;
        return true;
    });
}

// ===== 散布図 =====
const CE_W = 1140, CE_H = 480, CE_M = { l: 52, r: 16, t: 14, b: 34 };
// 軸の表示範囲 = 表示行の min/max から自動決定 (余白 5% + 刻みはキリの良い値)
let CE_XDOM = [650, 1750], CE_YTOP = 100;
function ceNiceStep(raw, cands) { for (const c of cands) if (c >= raw) return c; return cands[cands.length - 1]; }
function ceComputeDomains(rows) {
    const vals = rows.map(r => r[1]).filter(v => v != null && isFinite(v));
    if (vals.length) {
        const lo = Math.min(...vals), hi = Math.max(...vals);
        const pad = Math.max((hi - lo) * 0.05, 12);
        CE_XDOM = [Math.floor((lo - pad) / 50) * 50, Math.ceil((hi + pad) / 50) * 50];
    } else {
        CE_XDOM = [650, 1750];
    }
    const isAvg = document.getElementById('ce-fY').value === "avg";
    const yvals = rows.map(r => isAvg ? r[5] : r[6]).filter(v => v != null && isFinite(v));
    const ymax = yvals.length ? Math.max(...yvals) : (isAvg ? 2.2 : 100);
    const step = isAvg ? ceNiceStep(ymax / 5, [0.1, 0.2, 0.25, 0.5, 1]) : ceNiceStep(ymax / 6, [1, 2, 5, 10, 20, 25]);
    CE_YTOP = Math.max(step, Math.ceil((ymax * 1.04) / step) * step);
    return { isAvg, step };
}
const ceXScale = (v) => CE_M.l + (v - CE_XDOM[0]) / (CE_XDOM[1] - CE_XDOM[0]) * (CE_W - CE_M.l - CE_M.r);
function ceYVal(r) { return document.getElementById('ce-fY').value === "avg" ? r[5] : r[6]; }
const ceYScale = (v) => CE_H - CE_M.b - v / CE_YTOP * (CE_H - CE_M.t - CE_M.b);

function ceRender() {
    const rows = ceFiltered();
    document.getElementById('ce-cnt').textContent = CETF('cnt', '({n} 枚)', { n: rows.length });
    ceDrawScatter(rows);
    ceDrawTable(rows);
    ceDrawDetail();
}

function ceDrawScatter(rows) {
    const { isAvg, step: yStep } = ceComputeDomains(rows);
    const xr = CE_XDOM[1] - CE_XDOM[0];
    const xStep = ceNiceStep(xr / 8, [20, 25, 50, 100, 200, 500]);
    const G = CE_GROUPS();
    let s = `<svg width="100%" viewBox="0 0 ${CE_W} ${CE_H}" style="display:block">`;
    for (let x = Math.ceil(CE_XDOM[0] / xStep) * xStep; x <= CE_XDOM[1] + 1e-9; x += xStep) {
        s += `<line class="grid" x1="${ceXScale(x)}" y1="${CE_M.t}" x2="${ceXScale(x)}" y2="${CE_H - CE_M.b}"/>`;
        s += `<text x="${ceXScale(x)}" y="${CE_H - CE_M.b + 14}" text-anchor="middle">${x}</text>`;
    }
    const fmt = (v) => isAvg ? (Math.round(v * 100) / 100).toString() : v;
    for (let y = 0; y <= CE_YTOP + 1e-9; y += yStep) {
        s += `<line class="grid" x1="${CE_M.l}" y1="${ceYScale(y)}" x2="${CE_W - CE_M.r}" y2="${ceYScale(y)}"/>`;
        s += `<text x="${CE_M.l - 6}" y="${ceYScale(y) + 4}" text-anchor="end">${fmt(y)}${isAvg ? "" : "%"}</text>`;
    }
    s += `<line class="axis" x1="${CE_M.l}" y1="${CE_H - CE_M.b}" x2="${CE_W - CE_M.r}" y2="${CE_H - CE_M.b}"/>`;
    s += `<line class="axis" x1="${CE_M.l}" y1="${CE_M.t}" x2="${CE_M.l}" y2="${CE_H - CE_M.b}"/>`;
    if (1000 >= CE_XDOM[0] && 1000 <= CE_XDOM[1]) {
        s += `<line class="guide" x1="${ceXScale(1000)}" y1="${CE_M.t}" x2="${ceXScale(1000)}" y2="${CE_H - CE_M.b}"/>`;
        s += `<text x="${ceXScale(1000)}" y="${CE_M.t + 10}" text-anchor="middle" fill="#b06">${CET('guide', '平均 1000')}</text>`;
    }
    const sorted = rows.filter(r => r[1] != null && ceYVal(r) != null).sort((a, b) => b[4] - a[4]);
    for (const r of sorted) {
        const nm = CE_CUR.names[r[0]];
        const rad = 2.5 + Math.sqrt(Math.max(r[4], 0)) * 1.15;
        const col = CE_GROUP_COLOR[nm[3]] || "#bbb";
        s += `<circle class="bubble${CE_SEL === r[0] ? " sel" : ""}" data-id="${r[0]}" cx="${ceXScale(r[1])}" cy="${ceYScale(ceYVal(r))}" r="${rad.toFixed(1)}" fill="${col}" fill-opacity="0.75"/>`;
    }
    s += `<text x="${CE_W / 2}" y="${CE_H - 4}" text-anchor="middle">${CET('xaxis', 'Pレート (BT-Elo) →')}</text>`;
    s += `<text x="14" y="${CE_H / 2}" text-anchor="middle" transform="rotate(-90 14 ${CE_H / 2})">${isAvg ? CET('y_avg', '平均枚数') : CET('y_pct2', '2枚以上採用率')} →</text>`;
    s += "</svg>";
    const sc = document.getElementById('ce-scatter');
    sc.innerHTML = s;
    sc.querySelectorAll(".bubble").forEach(c => {
        c.addEventListener("click", () => { CE_SEL = (CE_SEL === c.dataset.id) ? null : c.dataset.id; ceRender(); });
        c.addEventListener("mousemove", (ev) => ceShowTip(ev, c.dataset.id));
        c.addEventListener("mouseleave", () => document.getElementById('ce-tip').style.display = "none");
    });
}

function ceShowTip(ev, id) {
    const r = CE_CUR.cards.find(x => x[0] === id), nm = CE_CUR.names[id];
    const pf = CE_CUR.perf ? CE_CUR.perf[id] : null;
    let html = `<b>${ceName(nm)}</b> <span style="opacity:.8">(${ceTicon(nm[3])}${CE_GROUPS()[nm[3]] || "?"})</span><br>` +
        `${CET('tip_prate', 'Pレート')} ${r[1] != null ? r[1] : "—"} / ${CET('tip_adopt', '実質採用率')} ${r[4]}% / ${CET('tip_pct2', '2枚以上')} ${r[6] != null ? r[6] + "%" : "—"}`;
    // 攻撃/防御性能のミニ箱ひげ図 (暗背景向け)
    if (pf && (pf.atk != null || pf.def != null || (pf.atkB && !pf.atkB.some(v => v == null)))) {
        const bl = (label, val, box, color) =>
            `<div class="prow perfline tipperf"><span>${label}</span><b>${val != null ? val : "—"}</b>${ceMiniBox(val, box, color, 120, false, true)}</div>`;
        html += bl(CET('tip_atk', '攻撃'), pf.atk, pf.atkB, "#ff8a80") + bl(CET('tip_def', '防御'), pf.def, pf.defB, "#82b1ff");
    }
    const tip = document.getElementById('ce-tip');
    tip.innerHTML = html;
    const box = document.getElementById('ce-scatter-box').getBoundingClientRect();
    tip.style.display = "block";
    let x = ev.clientX - box.left + 14, y = ev.clientY - box.top + 10;
    if (x + tip.offsetWidth > box.width - 8) x = ev.clientX - box.left - tip.offsetWidth - 10;
    if (y + tip.offsetHeight > box.height - 8) y = ev.clientY - box.top - tip.offsetHeight - 10;
    tip.style.left = x + "px";
    tip.style.top = y + "px";
}

// ===== 詳細パネル (上段 = 指標表 + 負けた相手 / 下段 = カード性能 + ハイライト) =====
function ceDrawDetail() {
    const el = document.getElementById('ce-detail');
    if (!CE_SEL) { el.style.display = "none"; return; }
    const r = CE_CUR.cards.find(x => x[0] === CE_SEL), nm = CE_CUR.names[CE_SEL];
    el.style.display = "block";
    const G = CE_GROUPS();
    const ownerCell = (nm[5] && nm[5] !== "Neutral") ? (ceAvImg(nm[5]) || (nm[6] || "—")) : (nm[6] || "—");
    const pf = CE_CUR.perf ? CE_CUR.perf[CE_SEL] : null;
    const gapCol = pf && pf.gap != null ? (pf.gap >= 1.2 ? "#2563eb" : pf.gap < 0.8 ? "#dc2626" : "inherit") : "#999";
    // 選択可能提示回数 = 内訳/フロー/Act別と同じ基準 (ショップは実際に買った or 表示所持金で買える)
    const pvPre = (CE_CUR.pick && CE_CUR.pick[CE_SEL]) || null;
    const availN = pvPre ? (pvPre[0] + pvPre[1] + pvPre[2])
        : ((CE_CUR.st && CE_CUR.st[CE_SEL]) ? CE_CUR.st[CE_SEL].reduce((a, x) => a + x[1], 0) : null);
    // --- 上段左: 指標表 (横 4 列)。imp = 太字 + 色背景 (重要項目のみ・セル単位) ---
    const ico = (id, ctx) => (window.MI ? MI.icon(id, ctx) : "");
    const pctStr = (x) => (x == null || !isFinite(x)) ? null : (Math.round(x * 10) / 10) + "%";
    const c = (k, v, imp, mi, miCtx) => `<td class="l${imp ? " imp" : ""}"${imp ? ' style="font-weight:600"' : ""}>${k}${mi ? ico(mi, miCtx) : ""}</td><td class="num${imp ? " imp" : ""}"${imp ? ' style="font-weight:bold"' : ""}>${v}</td>`;
    // ピック率 (マス基準)
    const pvD = (CE_CUR.pick && CE_CUR.pick[CE_SEL]) || null;
    const pickTotal = pvD ? (pvD[0] + pvD[1] + pvD[2]) : null;
    const pickRate = (pvD && pickTotal) ? Math.round(pvD[0] / pickTotal * 1000) / 10 : null;
    // --- ③-E 計算方法ポップアップ用の実数値 ---
    const fpkCtx = (pf && pf.fpk != null) ? { pct: pf.fpk + "%" } : null;
    const availCtx = (availN != null && r[2]) ? { n: availN, t: r[2], pct: pctStr(availN / r[2] * 100) } : null;
    const pickCtx = (pickRate != null) ? { w: pvD[0], l: pvD[1], s: pvD[2], t: pickTotal, pct: pickRate + "%" } : null;
    const draftCtx = (r[3] != null && r[9] > 0) ? { w: Math.round(r[3] / 100 * r[9]), n: r[9], pct: r[3] + "%" } : null;
    const scoreCtx = (r[1] != null && r[7] != null) ? { prate: r[1], pct2: r[6], score: r[7] } : null;
    const avgVal = (pf && pf.ac != null) ? pf.ac : r[5];
    const rowsHtml =
        `<tr>${c(CET('d_prate', 'Pレート (BT-Elo)'), r[1] != null ? r[1] : CET('d_nocalc', '未算出 (同時提示なし)'), 1, 'prate', r[1] != null ? { v: r[1] } : null)}` +
        `${c(CET('perf_fpk', '初回ピック率'), pf && pf.fpk != null ? pf.fpk + "%" : "—", 1, 'fpk', fpkCtx)}</tr>` +
        `<tr>${c(CET('d_deci', 'D回数 (対戦数)'), r[9] > 0 ? r[9] : "—", 1, 'deci', r[9] > 0 ? { n: r[9] } : null)}` +
        `${c(CET('d_n', '提示回数'), r[2] || "—", 0, 'offers', r[2] ? { n: r[2] } : null)}</tr>` +
        `<tr>${c(CET('d_draft', 'ドラフト勝率'), r[3] != null ? r[3] + "%" : "—", 1, 'draft', draftCtx)}` +
        `${c(CET('d_n_avail', 'うち選択可能提示n'), availN != null ? availN : "—", 1, 'availn', availCtx)}</tr>` +
        `<tr>${c(CET('d_score', '合成Pスコア'), r[7] != null ? r[7] : "—", 1, 'score', scoreCtx)}` +
        `${c(CET('d_pick', 'ピック率'), pickRate != null ? pickRate + "%" : "—", 0, 'pickrate', pickCtx)}</tr>` +
        `<tr>${c(CET('perf_ac', '採用時平均枚数'), avgVal != null ? avgVal : "—", 0, 'avg', avgVal != null ? { avg: avgVal } : null)}` +
        `${c(CET('d_adopt', '実質採用率'), r[4] + "%", 0, 'adopt', { pct: r[4] + "%" })}</tr>` +
        `<tr>${c(CET('perf_au', '平均強化率'), pf && pf.au != null ? pf.au + "%" : "—", 0, 'au', (pf && pf.au != null) ? { pct: pf.au + "%" } : null)}` +
        `${c(CET('d_final', '最終採用率'), r[8] != null ? r[8] + "%" : "—", 1, 'final', r[8] != null ? { pct: r[8] + "%" } : null)}</tr>`;
    const statsHtml = `<div style="flex:1.25;min-width:340px"><table><tbody>${rowsHtml}</tbody></table></div>`;
    // --- 上段右: よく負けた相手 Top5 (クリックでそのカードに選択切替) ---
    const lost = (CE_CUR.lost && CE_CUR.lost[CE_SEL]) ? CE_CUR.lost[CE_SEL] : null;
    const lostnMap = (CE_CUR.lostn && CE_CUR.lostn[CE_SEL]) || null;
    let lostHtml = `<div class="ce-muted" style="font-size:12px">${CET('lost_none', 'データなし')}</div>`;
    if (lost && lost.length) {
        lostHtml = `<p style="margin:0 0 2px"><b>${CETF('lost_top', 'よく負けた相手 Top{n}', { n: lost.length })}</b> <span class="ce-muted">(${CET('lost_note', '同時提示で相手が選ばれたマス数・カード名クリックで切替・🔗 で敗北マスのログへ (最大 10 件)')}</span></p>` +
            `<ol style="margin:2px 0 0 20px;padding:0">` +
            lost.map(([oid, n]) => {
                const on = CE_CUR.names[oid] || [oid];
                // 敗北マスのチップは Act·Level 順に並べる (データ順はマス探索順でランダムに見えるため)
                const lst = ((lostnMap && lostnMap[oid]) || []).slice()
                    .sort((p, q) => (p[1] - q[1]) || ((p[2] != null ? p[2] : 999) - (q[2] != null ? q[2] : 999)));
                const chips = lst.map(([ri, a, lv]) => {
                    const rv = (CE_CUR.rids && CE_CUR.rids[ri]) || ["", ""];
                    const url = `https://lbol-logs.github.io/${rv[1]}/${rv[0]}?a=${a}` + (lv != null ? `&l=${lv}` : "");
                    return `<a class="lchip" href="${url}" target="_blank" rel="noopener" title="${rv[0]} (Act${a}${lv != null ? " Lv" + lv : ""})">A${a}·L${lv != null ? lv : "?"}</a>`;
                }).join("");
                return `<li style="margin:1px 0"><span class="lnk" data-id="${oid}">${ceName(on)}</span> <span class="ce-muted">×${n}</span>` +
                    (chips ? `<div style="margin:2px 0 4px">${chips}</div>` : "") + `</li>`;
            }).join("") + `</ol>`;
    }
    const lostBox = `<div style="flex:1;min-width:250px;border-left:1px solid #e2e5ee;padding-left:14px">${lostHtml}</div>`;
    // --- 下段左: カード性能 / 下段右: ハイライト ---
    const hasGraph = pf && ((pf.atk != null || (pf.atkB && !pf.atkB.some(v => v == null))) ||
                            (pf.def != null || (pf.defB && !pf.defB.some(v => v == null))));
    let perfCol;
    if (!hasGraph) {
        perfCol = `<div class="ce-muted" style="font-size:12px">${CET('perf_insufficient', 'サンプル不足 — 戦闘回数が少なくカード性能のデータがありません')}</div>`;
    } else {
        const perfLine = (label, val, box, color, mi, miCtx) =>
            `<div class="prow perfline"><span>${label}${mi ? ico(mi, miCtx) : ""}</span><b style="min-width:34px;text-align:right">${val != null ? val : "—"}</b>${ceMiniBox(val, box, color, 300)}</div>`;
        perfCol = perfLine(CET('perf_atk', '攻撃性能'), pf.atk, pf.atkB, "#d9534f", 'atk', pf.atk != null ? { v: pf.atk } : null) +
            perfLine(CET('perf_def', '防御性能'), pf.def, pf.defB, "#4a90d9", 'defperf', pf.def != null ? { v: pf.def } : null);
    }
    const hlCol = (pf && (pf.medal || pf.hl))
        ? `<b>${CET('perf_hl', 'ハイライト')}:</b> ${pf.medal || ""}${pf.hl ? "<br>" + pf.hl : ""}`
        : `<div class="ce-muted" style="font-size:12px">${CET('hl_none', 'データなし')}</div>`;
    // --- 2段目: ピック率スタックバー (1 行) + 左 提示フロー表 + 提示マス内訳 / 右 Act別ピック率 (n・色分け) ---
    let pickHtml = "";
    const pv = (CE_CUR.pick && CE_CUR.pick[CE_SEL]) || null;
    if (pv) {
        const [w, l, sk] = pv;
        const total = w + l + sk;
        if (total > 0) {
            const pw = w / total * 100, pl = l / total * 100, ps = sk / total * 100;
            pickHtml =
                `<div style="display:flex;align-items:center;gap:10px;flex-wrap:wrap">` +
                `<span><b>${CET('pick_hdr', 'ピック率')}</b> <b style="font-size:15px">${Math.round(pw)}%</b></span>` +
                `<div class="pstack" style="width:240px" title="${CET('pick_legend', '緑=選ばれた / 赤=負け (別カードが選ばれた) / 灰=見送り')}">` +
                `<span class="pseg psegw" style="width:${pw}%">${Math.round(pw)}%</span>` +
                (pl > 0.5 ? `<span class="pseg psegl" style="width:${pl}%">${pl >= 12 ? Math.round(pl) + "%" : ""}</span>` : "") +
                (ps > 0.5 ? `<span class="pseg psegs" style="width:${ps}%">${ps >= 12 ? Math.round(ps) + "%" : ""}</span>` : "") +
                `</div>` +
                `<span class="ce-muted" style="font-size:11px"><span style="color:#4caf7d">■</span>${CET('pick_l1', '選ばれた')} ${Math.round(pw)}%(${w}) <span style="color:#d9534f">■</span>${CET('pick_l2', '負け')} ${Math.round(pl)}%(${l}) <span style="color:#aab2c0">■</span>${CET('pick_l3', '見送り')} ${Math.round(ps)}%(${sk})</span>` +
                `</div>`;
        }
    }
    // --- 提示フロー表 (ラン内の提示回数 × 保有状態) ---
    const fv = (CE_CUR.flow && CE_CUR.flow[CE_SEL]) || null;
    let flowHtml = "";
    if (fv) {
        const cell = (o, f) => {
            const row = fv.find(x => x[0] === o && x[1] === f);
            if (!row || row[2] === 0) return `<span class="ce-muted">—</span>`;
            const rate = Math.round(row[3] / row[2] * 100);
            return `${rate}% <span class="ce-muted" style="font-size:11px">(${row[3]}/${row[2]})</span>`;
        };
        flowHtml =
            `<b>${CET('flow_hdr', '提示フロー')}</b>${ico('flow')} <span class="ce-muted" style="font-size:11px">(${CET('flow_sub', 'ラン内で何回目の提示か別のピック率')})</span>` +
            `<table class="acttab" style="margin-top:4px">` +
            `<tr><th style="text-align:left">${CET('flow_th1', '提示')}</th><th>${CET('flow_th2', '未保有時ピック率')}</th><th>${CET('flow_th3', '1枚以上保有時')}</th></tr>` +
            `<tr><td class="l" style="text-align:left">${CET('flow_ord1', '1回目')}</td><td class="num">${cell(1, 0)}</td><td class="num"><span class="ce-muted">—</span></td></tr>` +
            `<tr><td class="l" style="text-align:left">${CET('flow_ord2', '2回目')}</td><td class="num">${cell(2, 0)}</td><td class="num">${cell(2, 1)}</td></tr>` +
            `<tr><td class="l" style="text-align:left">${CET('flow_ord3', '3回目以降')}</td><td class="num">${cell(3, 0)}</td><td class="num">${cell(3, 1)}</td></tr>` +
            `</table>`;
    }
    const stList = (CE_CUR.st && CE_CUR.st[CE_SEL]) || null;
    let stHtml = "";
    if (stList) {
        const STJA = { Enemy: '通常戦闘', EliteEnemy: 'エリート', Boss: 'ボス', Shop: 'ショップ', Adventure: 'イベント', Entry: '初期/入口', Gap: '隙間', Trade: '交易', Select: '選択', Supply: '補給' };
        stHtml = `<div style="margin-top:10px"><b>${CET('st_hdr', '提示マス内訳')}:</b><div style="margin-top:3px">` +
            stList.map(([ty, n, pc]) => `<span class="stchip">${STJA[ty] || ty}: ${n}${isCE_EN() ? "" : "回"} (${pc}%)</span>`).join(" ") + `</div></div>`;
    }
    // --- Act別ピック率 (未保有時 / 保有時*・n 併記 + 色分け) ---
    const actsList = (CE_CUR.acts && CE_CUR.acts[CE_SEL]) || null;
    const rateCol = (r) => (r >= 70 ? "#1a7f37" : (r >= 45 ? "#b45309" : "#dc2626"));
    let actsHtml = "";
    if (actsList) {
        const rows2 = actsList.map(([a, off, pick, offO, pickO]) => {
            const nonO = off - offO;
            const rMain = nonO > 0 ? Math.round((pick - pickO) / nonO * 100) : null;
            const rOwn = offO > 0 ? Math.round(pickO / offO * 100) : null;
            const cM = rMain != null ? ` style="color:${rateCol(rMain)};font-weight:600"` : "";
            const cO = rOwn != null ? ` style="color:${rateCol(rOwn)}"` : "";
            return `<tr><td class="l" style="text-align:left">Act${a}</td>` +
                `<td class="num"${cM}>${rMain != null ? rMain + "%" : "—"} <span class="ce-muted" style="font-size:11px">(${rMain != null ? (pick - pickO) + "/" + nonO : ""})</span></td>` +
                `<td class="num"${cO}>${rOwn != null ? rOwn + "%" : "—"} <span class="ce-muted" style="font-size:11px">(${rOwn != null ? pickO + "/" + offO : ""})</span></td></tr>`;
        }).join("");
        actsHtml =
            `<div style="flex:1;min-width:290px;border-left:1px solid #e2e5ee;padding-left:14px">` +
            `<b>${CET('acts_hdr', 'Act別ピック率')}</b>${ico('actpick')} <span class="ce-muted" style="font-size:11px">(${CET('acts_note', 'ピック率 = 未保有時・* = 1枚以上保有時')})</span>` +
            `<table class="acttab" style="margin-top:4px"><tr><th style="text-align:left">Act</th><th>${CET('act_main', 'ピック率 (未保有)')}</th><th>${CET('act_owned', '保有時*')}</th></tr>${rows2}</table></div>`;
    }
    const midHtml = (pickHtml || flowHtml || stHtml || actsHtml)
        ? `<div style="margin-top:10px;padding-top:8px;border-top:1px solid #e2e5ee">` + pickHtml +
          `<div style="display:flex;flex-wrap:wrap;gap:14px;align-items:flex-start;margin-top:10px">` +
          `<div style="flex:1.15;min-width:340px">${flowHtml}${stHtml}</div>` + actsHtml +
          `</div></div>`
        : "";
    // --- 3段目: カード性能 (左) / ハイライト (右) ---
    const bottomHtml =
        (pf ? `<div style="margin-top:10px;padding-top:8px;border-top:1px solid #e2e5ee;display:flex;flex-wrap:wrap;gap:14px;align-items:flex-start">` +
        `<div style="flex:1.25;min-width:340px">` +
        `<div class="ce-muted" style="margin:0 0 4px">${CET('perf_hdr', 'カード性能 (カード性能タブと同様・戦闘偏差値)')}</div>` + perfCol +
        `</div>` +
        `<div style="flex:1;min-width:250px;border-left:1px solid #e2e5ee;padding-left:14px;font-size:12px"><div style="margin-top:0">${hlCol}</div></div>` +
        `</div>` : "");
    el.innerHTML =
        `<b>${ceName(nm)}</b> <span class="ce-muted">(${nm[1] || ""} / ${ceTicon(nm[3])}${G[nm[3]] || "?"} / ${ceRarity(nm[7]) || "?"} / ${CET('d_owner', '所有者')}: ${ownerCell})</span>` +
        `<div style="display:flex;flex-wrap:wrap;gap:14px;align-items:flex-start;margin-top:8px;padding-bottom:8px;border-bottom:1px solid #e2e5ee">` +
        statsHtml + lostBox + `</div>` +
        midHtml + bottomHtml +
        `<p class="ce-muted" style="margin:6px 0 0">${CET('d_note', '散布図・表で選択中。もう一度クリックで解除。')}</p>`;
    el.querySelectorAll(".lnk").forEach(a => a.addEventListener("click", (ev) => {
        ev.stopPropagation();
        CE_SEL = a.dataset.id;
        ceRender();
    }));
}

// ===== 表 =====
const CE_COLS = () => [
    { h: CET('col_name', 'カード名'), l: true }, { h: CET('col_owner', '所有者'), l: true },
    { h: CET('col_type', '種類'), l: true }, { h: CET('col_rarity', 'レアリティ'), l: true },
    { h: CET('col_prate', 'Pレート'), mi: 'prate' }, { h: CET('col_deci', 'D回数'), mi: 'deci' },
    { h: CET('col_draft', 'ドラフト勝率'), mi: 'draft' },
    { h: CET('col_availn', '選択可能提示n'), mi: 'availn' }, { h: CET('col_pick', 'ピック率'), mi: 'pickrate' },
    { h: CET('col_adopt', '実質採用率'), mi: 'adopt' }, { h: CET('col_finaladopt', '最終採用率'), mi: 'final' },
    { h: CET('col_avg', '平均枚数'), mi: 'avg' }, { h: CET('col_score', '合成Pスコア'), mi: 'score' },
    { h: CET('col_pct2', '2枚以上'), mi: 'pct2' },
];
// 各列の値 getter (null = 未算出 → 常に末尾)
function ceGet(i, r) {
    switch (i) {
        case 0: return ceName(CE_CUR.names[r[0]]);
        case 1: return CE_CUR.names[r[0]][5];
        case 2: return CE_CUR.names[r[0]][3];
        case 3: return ceRarity(CE_CUR.names[r[0]][7]);
        case 4: return r[1];
        case 5: return r[9] > 0 ? r[9] : null;                       // D回数 (決定ペア数)
        case 6: return r[3];                                          // ドラフト勝率
        case 7: case 8: {                                             // 選択可能提示n / ピック率
            const pv = CE_CUR.pick ? CE_CUR.pick[r[0]] : null;
            if (!pv) return null;
            const total = pv[0] + pv[1] + pv[2];
            if (!total) return null;
            return (i === 7) ? total : Math.round(pv[0] / total * 1000) / 10;
        }
        case 9: return r[4];                                          // 実質採用率
        case 10: return r[8];                                         // 最終採用率
        case 11: return r[5];                                         // 平均枚数
        case 12: return r[7];                                         // 合成Pスコア
        case 13: return r[6];                                         // 2枚以上
    }
    return null;
}

// ヒートマップ: 階段バンド (低=青 / 高=赤)。center+step×k の帯ごとに同色
function ceHeatBg(v, center, step) {
    if (v == null || !isFinite(v)) return "";
    let b = Math.floor((v - center) / step + 1e-9);
    b = Math.max(-4, Math.min(4, b));
    if (b === 0) return "";
    const lvl = Math.min(Math.abs(b) - 1, 4);
    const a = [0.08, 0.15, 0.24, 0.34, 0.45][lvl];
    const c = b > 0 ? "224,90,78" : "74,127,224";
    return `background:rgba(${c},${a})`;
}
function ceColStats(rows, gi, center) {
    const vals = rows.map(r => ceGet(gi, r)).filter(v => v != null && isFinite(v));
    if (!vals.length) return { center: 0, spread: 1 };
    const c = center != null ? center : vals.reduce((a, b) => a + b, 0) / vals.length;
    const devs = vals.map(v => Math.abs(v - c)).sort((a, b) => a - b);
    const spread = Math.max(devs[Math.floor(devs.length * 0.9)], 1e-9);
    return { center: c, spread };
}

function ceDrawTable(rows) {
    const val = (r) => ceGet(CE_SORT_KEY, r);
    const stW = ceColStats(rows, 6, null);   // ドラフト* の表示行平均
    const sorted = [...rows].sort((a, b) => {
        const va = val(a), vb = val(b);
        if (va == null && vb == null) return 0;
        if (va == null) return 1;          // 未算出は常に末尾
        if (vb == null) return -1;
        if (typeof va === "string" || typeof vb === "string") return String(va).localeCompare(String(vb), "ja") * (CE_SORT_ASC ? 1 : -1);
        return (va - vb) * (CE_SORT_ASC ? 1 : -1);
    });
    const COLS = CE_COLS();
    let html = `<tr>${COLS.map((c, i) => `<th${c.l ? ' class="l"' : ""} data-i="${i}">${c.h}${c.mi && window.MI ? MI.icon(c.mi) : ""}${i === CE_SORT_KEY ? (CE_SORT_ASC ? " ▲" : " ▼") : ""}</th>`).join("")}</tr>`;
    for (const r of sorted) {
        const nm = CE_CUR.names[r[0]];
        const bar2 = r[6] != null ? `<span class="bar" style="width:${(r[6] * 0.6).toFixed(0)}px;background:${CE_GROUP_COLOR[nm[3]]}"></span>` : "";
        // 所有者: キャラ所有 = [アイコン]+名前 / Neutral (共通) = 色マナアイコン
        const ownerCell = (nm[5] && nm[5] !== "Neutral")
            ? `<img class="av" src="img/avatars/${nm[5]}.avif" title="${nm[5]}" onerror="this.style.display='none'"><span class="ownname">${nm[5]}</span>`
            : `<span title="${isCE_EN() ? 'Neutral' : '共通 (Neutral)'}">${nm[6] || "—"}</span>`;
        html += `<tr class="click${CE_SEL === r[0] ? " selrow" : ""}" data-id="${r[0]}">` +
            `<td class="l">${ceName(nm)}</td>` +
            `<td class="l">${ownerCell}</td>` +
            `<td class="l">${ceTicon(nm[3])}</td>` +
            `<td class="l">${ceRarity(nm[7]) || "—"}</td>` +
            `<td class="num" style="${ceHeatBg(r[1], 1000, 100)}">${r[1] != null ? r[1] : "—"}</td>` +
            `<td class="num">${ceGet(5, r) ?? "—"}</td>` +
            `<td class="num" style="${ceHeatBg(r[3], stW.center, 10)}">${r[3] != null ? r[3] + "%" : "—"}</td>` +
            `<td class="num">${ceGet(7, r) ?? "—"}</td>` +
            `<td class="num">${ceGet(8, r) != null ? ceGet(8, r) + "%" : "—"}</td>` +
            `<td class="num">${r[4]}%</td>` +
            `<td class="num">${r[8] != null ? r[8] + "%" : "—"}</td>` +
            `<td class="num">${r[5] != null ? r[5] : "—"}</td>` +
            `<td class="num" style="${ceHeatBg(r[7], 1.0, 0.2)}"><b>${r[7] != null ? r[7] : "—"}</b></td>` +
            `<td class="num">${r[6] != null ? r[6] + "%" : "—"}${bar2}</td></tr>`;
    }
    const tbl = document.getElementById('ce-tbl');
    tbl.innerHTML = html;
    tbl.querySelectorAll("th").forEach(th => th.addEventListener("click", () => {
        const i = +th.dataset.i;
        if (CE_SORT_KEY === i) CE_SORT_ASC = !CE_SORT_ASC; else { CE_SORT_KEY = i; CE_SORT_ASC = i === 0; }
        ceRender();
    }));
    tbl.querySelectorAll("tr.click").forEach(tr => tr.addEventListener("click", () => {
        CE_SEL = (CE_SEL === tr.dataset.id) ? null : tr.dataset.id;
        ceRender();
    }));
}
