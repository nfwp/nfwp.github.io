/**
 * アイテム名からWikiへのリンクHTMLを生成する
 * @param {string} itemName - カード名または展示品名
 * @param {string} itemType - 'card' または 'exhibit' (現在は未使用)
 * @param {string} lang - 'ja' または 'en'
 * @returns {string} - aタグのHTML文字列
 */
function createWikiLink(itemName, itemType, lang) {
    if (!itemName) {
        return ""; // アイテム名がなければ空文字を返す
    }
    const nameStr = String(itemName);

    let url;

    if (lang === 'ja') {
        // 日本語Wikiはページ名をそのままURLエンコードする
        url = `https://wikiwiki.jp/tohokoyoya/${encodeURIComponent(nameStr)}`;
    } else {
        // 英語Wikiはスペースをアンダースコアに置換する（URLエンコードは不要）
        const encodedName = nameStr.replace(/ /g, '_');
        url = `https://lbol.miraheze.org/wiki/${encodedName}`;
    }

    // セキュリティ対策のrel属性と、スタイリング用のclassを追加
    return `<a href="${url}" target="_blank" rel="noopener noreferrer" class="wiki-link">${nameStr}</a>`;
}

function getColorForValue(value, v_min, v_max, reverse_color = false) {
    if (v_min === v_max) return 'rgba(255, 255, 255, 0)';
    let norm_val = (value - v_min) / (v_max - v_min);
    norm_val = Math.max(0, Math.min(1, norm_val));
    if (reverse_color) norm_val = 1 - norm_val;
    let r, g;
    if (norm_val < 0.5) {
        r = Math.round(255 * (norm_val * 2));
        g = 255;
    } else {
        r = 255;
        g = Math.round(255 * (1 - (norm_val - 0.5) * 2));
    }
    return `rgba(${r}, ${g}, 0, 0.4)`;
}

function createInlineBoxplotHtml(boxplot_data, scale_min, scale_max, is_negative = false) {
    if (!boxplot_data) return "";
    let { min: b_min, q1, median, q3, max: b_max, mean } = boxplot_data;

    let calc_b_min, calc_q1, calc_median, calc_q3, calc_b_max, calc_mean;
    let calc_scale_min, calc_scale_max;

    if (is_negative) {
        [calc_b_min, calc_q1, calc_median, calc_q3, calc_b_max, calc_mean] = [-b_max, -q3, -median, -q1, -b_min, -mean];
        [calc_scale_min, calc_scale_max] = [-scale_max, -scale_min];
    } else {
        [calc_b_min, calc_q1, calc_median, calc_q3, calc_b_max, calc_mean] = [b_min, q1, median, q3, b_max, mean];
        [calc_scale_min, calc_scale_max] = [scale_min, scale_max];
    }

    const data_range = calc_scale_max - calc_scale_min;
    if (data_range <= 0) return "";

    const to_percent = (val) => {
        const clipped_val = Math.max(calc_scale_min, Math.min(calc_scale_max, val));
        return (clipped_val - calc_scale_min) / data_range * 100;
    };

    const [p_min, q1_pos, median_pos, q3_pos, p_max, mean_pos] =
        [calc_b_min, calc_q1, calc_median, calc_q3, calc_b_max, calc_mean].map(to_percent);

    const box_left = q1_pos, box_width = q3_pos - q1_pos;
    const w1_left = p_min, w1_width = q1_pos - p_min;
    const w2_left = q3_pos, w2_width = p_max - q3_pos;


    // 翻訳テキストを取得するためのオブジェクト（UI_TEXTはグローバル変数です）
    const labels = {
        min: UI_TEXT.boxplot_min || '最小',
        q1: UI_TEXT.boxplot_q1 || '25%',
        median: UI_TEXT.boxplot_median || '中央',
        q3: UI_TEXT.boxplot_q3 || '75%',
        max: UI_TEXT.boxplot_max || '最大',
        mean: UI_TEXT.boxplot_mean || '平均'
    };

    // 翻訳テキストを使ってツールチップ文字列を組み立てる
    const tooltip = is_negative
        ? `${labels.min}: ${(-b_max).toFixed(1)}, ${labels.q1}: ${(-q3).toFixed(1)}, ${labels.median}: ${(-median).toFixed(1)}, ${labels.q3}: ${(-q1).toFixed(1)}, ${labels.max}: ${(-b_min).toFixed(1)}, ${labels.mean}: ${(-mean).toFixed(1)}`
        : `${labels.min}: ${b_min.toFixed(1)}, ${labels.q1}: ${q1.toFixed(1)}, ${labels.median}: ${median.toFixed(1)}, ${labels.q3}: ${q3.toFixed(1)}, ${labels.max}: ${b_max.toFixed(1)}, ${labels.mean}: ${mean.toFixed(1)}`;


    const label_start = is_negative ? (-scale_max).toFixed(0) : scale_min.toFixed(0);
    const label_end = is_negative ? (-scale_min).toFixed(0) : scale_max.toFixed(0);

    return `<div class="inline-boxplot" title="${tooltip}">
        <div class="inline-boxplot-chart">
            <div class="inline-boxplot-whisker" style="left: ${w1_left}%; width: ${w1_width}%;"></div>
            <div class="inline-boxplot-box" style="left: ${box_left}%; width: ${box_width}%;"></div>
            <div class="inline-boxplot-whisker" style="left: ${w2_left}%; width: ${w2_width}%;"></div>
            <div class="inline-boxplot-median" style="left: ${median_pos}%;"></div>
            <div class="inline-boxplot-mean" style="left: ${mean_pos}%;"></div>
        </div>
        <div class="inline-boxplot-labels">
            <span>${label_start}</span>
            <span>${label_end}</span>
        </div>
    </div>`;
}

function sortTable(tableId, columnIndex, type) {
    const table = document.getElementById(tableId);
    if (!table) return;
    const tbody = table.querySelector('tbody');
    const rows = Array.from(tbody.querySelectorAll('tr'));
    const header = table.querySelector(`th:nth-child(${columnIndex + 1})`);
    if (!header) return;
    const isAsc = !header.classList.contains('sorted-asc');
    table.querySelectorAll('th').forEach(th => th.classList.remove('sorted-asc', 'sorted-desc'));
    header.classList.toggle('sorted-asc', isAsc);
    header.classList.toggle('sorted-desc', !isAsc);
    rows.sort((a, b) => {
        let valA = a.cells[columnIndex].textContent.trim();
        let valB = b.cells[columnIndex].textContent.trim();
        if (type === 'numeric') {
            const numA = parseFloat(valA.replace(/[()]/g, '')) || 0;
            const numB = parseFloat(valB.replace(/[()]/g, '')) || 0;
            return isAsc ? numA - numB : numB - numA;
        }
        return isAsc ? valA.localeCompare(valB, undefined, {numeric: true}) : valB.localeCompare(valA, undefined, {numeric: true});
    });
    rows.forEach(row => tbody.appendChild(row));
}

// --- 共通: トースト / 類似ラン検索への 📌 投入 / ラン検索の新タブ起動 (P-50/P-52, 2026-11-16) ---
function lbolToast(message) {
    let host = document.getElementById('lbol-toast-host');
    if (!host) {
        host = document.createElement('div');
        host.id = 'lbol-toast-host';
        document.body.appendChild(host);
    }
    const t = document.createElement('div');
    t.className = 'lbol-toast';
    t.textContent = message;
    host.appendChild(t);
    setTimeout(() => t.classList.add('show'), 10);
    setTimeout(() => { t.classList.remove('show'); setTimeout(() => t.remove(), 300); }, 3500);
}

// 類似ラン検索 (P-28) の共有条件に 📌 を追加して通知する (ページ遷移しない)
// kind: 'exhibit' | 'card' / id: 展示品ID or カードID / label: 表示名 / message: トースト文言
function ddPinShared(kind, id, label, message) {
    try {
        const cur = (typeof CURRENT_CHAR !== 'undefined') ? CURRENT_CHAR : 'CirnoA';
        let cond = null;
        try { cond = JSON.parse(localStorage.getItem('dd_last_condition_v1') || 'null'); } catch (e) {}
        if (!cond || cond.ch !== cur) {
            cond = { v: 1, ch: cur, deck: [], exh: [], pins: [], exhPins: [],
                     ns: false, ex: true, noSt: true, metric: 'j', pool: 'top100', mana: {} };
        }
        if (kind === 'exhibit') {
            if (!cond.exh.includes(id)) cond.exh.push(id);
            if (!cond.exhPins.includes(id)) cond.exhPins.push(id);
        } else {
            if (!cond.deck.some(entry => entry[0] === id)) cond.deck.push([id, 1]);
            if (!cond.pins.includes(id)) cond.pins.push(id);
        }
        localStorage.setItem('dd_last_condition_v1', JSON.stringify(cond));
        window.dispatchEvent(new CustomEvent('dd-condition-updated'));
        lbolToast(message || ('\ud83d\udccc ' + (label || '')));
    } catch (e) { console.warn('ddPinShared failed:', e); }
}

// --- 共有リンクの短縮ヘルパ (③-G2) ---
//   is.gd は IP あたり 200 件/時の制限があり、同じ条件を再短縮するとすぐ制限に当たる。
//   → 1) 結果を localStorage にキャッシュして再利用  2) is.gd → v.gd → spoo.me の順で試行
//     (v.gd は is.gd 同一運営・spoo.me は別運営で制限も別。前回成功プロバイダを優先)
const LBOLE_SHORT_CACHE_KEY = 'shorturl_cache_v1';
const LBOLE_SHORT_PROVIDER_KEY = 'shorturl_provider_v1';

function lbolShortCacheLoad() {
    try { return JSON.parse(localStorage.getItem(LBOLE_SHORT_CACHE_KEY) || '{}') || {}; } catch (e) { return {}; }
}

function lbolShortCacheSave(longUrl, shortUrl) {
    try {
        const c = lbolShortCacheLoad();
        c[longUrl] = shortUrl;
        const keys = Object.keys(c);
        while (keys.length > 100) delete c[keys.shift()];   // 上限 100 件 (古いものから削除)
        localStorage.setItem(LBOLE_SHORT_CACHE_KEY, JSON.stringify(c));
    } catch (e) { /* キャッシュ失敗は無視 */ }
}

// 成功時 Promise<string> / 全プロバイダ失敗時 Promise<null>
function lbolShortenUrl(longUrl, timeoutMs) {
    const cached = lbolShortCacheLoad()[longUrl];
    if (cached) return Promise.resolve(cached);
    let lastProvider = null;
    try { lastProvider = localStorage.getItem(LBOLE_SHORT_PROVIDER_KEY); } catch (e) {}
    const withTimeout = (p, ms) => Promise.race([
        p,
        new Promise((_, rej) => setTimeout(() => rej(new Error('timeout')), ms || 6000)),
    ]);
    const viaIsGd = (host) => async () => {
        const r = await fetch('https://' + host + '/create.php?format=json&url=' + encodeURIComponent(longUrl));
        if (!r.ok) throw new Error('HTTP ' + r.status);
        const j = await r.json();
        if (!j.shorturl) throw new Error('no shorturl');
        return j.shorturl;
    };
    const viaSpoo = async () => {
        const r = await fetch('https://spoo.me/', {
            method: 'POST',
            headers: { 'Content-Type': 'application/x-www-form-urlencoded', 'Accept': 'application/json' },
            body: 'url=' + encodeURIComponent(longUrl),
        });
        if (!r.ok) throw new Error('HTTP ' + r.status);
        const j = await r.json();
        if (!j.short_url) throw new Error('no short_url');
        return String(j.short_url).replace(/^http:\/\//i, 'https://');
    };
    let chain;
    if (lastProvider === 'spoo.me') chain = [['spoo.me', viaSpoo], ['is.gd', viaIsGd('is.gd')], ['v.gd', viaIsGd('v.gd')]];
    else if (lastProvider === 'v.gd') chain = [['v.gd', viaIsGd('v.gd')], ['is.gd', viaIsGd('is.gd')], ['spoo.me', viaSpoo]];
    else chain = [['is.gd', viaIsGd('is.gd')], ['v.gd', viaIsGd('v.gd')], ['spoo.me', viaSpoo]];
    let idx = 0;
    const attempt = () => {
        if (idx >= chain.length) return Promise.resolve(null);
        const entry = chain[idx++];
        const name = entry[0], fn = entry[1];
        return withTimeout(fn()).then((short) => {
            try { localStorage.setItem(LBOLE_SHORT_PROVIDER_KEY, name); } catch (e) {}
            lbolShortCacheSave(longUrl, short);
            return short;
        }).catch(() => attempt());
    };
    return attempt();
}

// ラン検索を新しいブラウザタブで開く (条件をURLに埋め込み、自動検索される)
// ③-G: 条件が長くなる場合は localStorage 経由 (?rfq=<key>) にして URL を短く保つ。
//   同一ブラウザ内の「持ち運び」用。他ブラウザに渡す共有はラン検索タブの 🔗 共有リンク (is.gd) を使う。
//   しきい値以下の短い条件は従来どおり URL に直接埋め込む (他ブラウザでも開ける)。
function openRunFinderSearch(params) {
    const p = new URLSearchParams(params || {});
    p.set('search', 'true');
    let url = window.location.origin + window.location.pathname + '?' + p.toString();
    if (url.length > 300) {
        try {
            const key = 'rfq' + Date.now().toString(36) + Math.floor(Math.random() * 36).toString(36);
            localStorage.setItem(key, p.toString());
            url = window.location.origin + window.location.pathname + '?rfq=' + key + '&search=true';
            // 受け渡しキーの掃除 (古いものから最大 20 件まで)
            try {
                const keys = [];
                for (let i = 0; i < localStorage.length; i++) {
                    const k = localStorage.key(i);
                    if (k && k.indexOf('rfq') === 0) keys.push(k);
                }
                keys.sort();
                while (keys.length > 20) localStorage.removeItem(keys.shift());
            } catch (e) { /* 掃除失敗は無視 */ }
        } catch (e) { /* localStorage 失敗時は長い URL のまま開く */ }
    }
    window.open(url, '_blank');
}
