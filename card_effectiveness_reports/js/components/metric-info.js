// metric-info.js — ③-E (M-6) 計算方法ポップアップ
//   指標名の横に ⓘ を置き、クリックで
//     ① 一言定義  ② 計算式 (目の前のデータの実数値を代入)  ③ 注意  ④ 使い方タブへのリンク
//   を表示する。文言は locales/{ja,en}.json の metric_info セクション。
//
//   使い方:
//     MI.icon('draft', { w: 109, n: 122, pct: '89.3%' })   // 実数値つき
//     MI.icon('adopt')                                      // 定義のみ (計算式は「算出不可」)
//     MI.decorate(root, { '採用率': 'final' })                // 静的 HTML の th を後付け装飾
//
//   クリックは capture 段階で処理するため、th のソートや tr の選択には伝播しない。

(function () {
    'use strict';
    if (window.MI) return;

    const ESC = { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' };
    function esc(s) { return String(s == null ? '' : s).replace(/[&<>"']/g, (c) => ESC[c]); }
    // **bold** のみ許可 (それ以外の HTML はエスケープされる)
    function rich(s) {
        return esc(s).replace(/\*\*([^*]+)\*\*/g, '<b>$1</b>');
    }

    function info() {
        return (typeof UI_TEXT !== 'undefined' && UI_TEXT && UI_TEXT.metric_info) ? UI_TEXT.metric_info : {};
    }
    function T(key, fallback) {
        const v = info()[key];
        return (v == null) ? (fallback == null ? '' : fallback) : v;
    }
    function defOf(id) { return (window.METRIC_DEFS || {})[id] || null; }

    // ===== アイコン HTML =====
    function icon(id, ctx) {
        const def = defOf(id);
        if (!def || !def.anchor) {
            if (window.console) console.warn('[metric-info] unknown metric id: ' + id);
            return '';
        }
        let attr = '';
        if (ctx && typeof ctx === 'object') {
            try { attr = ' data-mc="' + encodeURIComponent(JSON.stringify(ctx)) + '"'; } catch (e) { /* 循環参照などは無視 */ }
        }
        const label = T('aria', '計算方法を表示');
        return '<button type="button" class="mi-i" data-mi="' + esc(id) + '"' + attr +
            ' aria-label="' + esc(label) + '" aria-expanded="false">i</button>';
    }

    // ===== 計算式の実数値埋め込み =====
    function fill(tpl, ctx) {
        let missing = false;
        const out = String(tpl).replace(/\{(\w+)\}/g, function (m, k) {
            if (ctx && ctx[k] != null && ctx[k] !== '') return esc(ctx[k]);
            missing = true;
            return m;
        });
        return missing ? null : out;
    }

    // ===== ポップアップ本体 =====
    let pop = null, curBtn = null;

    function build(id, ctx) {
        const def = defOf(id) || {};
        const name = T(id + '_name', id);
        const d = T(id + '_def');
        const tpl = T(id + '_f');
        const note = T(id + '_note');
        const calc = (tpl && ctx) ? fill(tpl, ctx) : null;

        let h = '<div class="mi-pop" role="dialog" aria-label="' + esc(name) + '">' +
            '<div class="mi-head"><b>' + esc(name) + '</b>' +
            '<button type="button" class="mi-x" aria-label="' + esc(T('close', '閉じる')) + '">×</button></div>' +
            '<div class="mi-body">';
        if (d) h += '<p class="mi-def">' + rich(d) + '</p>';
        if (calc) {
            h += '<div class="mi-calc"><span class="mi-tag">' + esc(T('calc_hdr', '計算')) + '</span>' +
                '<span>' + rich(calc) + '</span></div>';
        } else if (tpl && ctx) {
            h += '<div class="mi-calc mi-nocalc"><span class="mi-tag">' + esc(T('calc_hdr', '計算')) + '</span>' +
                '<span>' + esc(T('no_calc', 'この表示では計算できません')) + '</span></div>';
        }
        if (note) h += '<p class="mi-note"><b>' + esc(T('note_hdr', '注意')) + ':</b> ' + rich(note) + '</p>';
        h += '</div>';
        if (def.anchor) {
            h += '<div class="mi-foot"><a href="#" class="mi-more">' +
                esc(T('more', '使い方タブで詳しく')) + ' →</a></div>';
        }
        h += '</div>';
        return h;
    }

    function place(btn, el) {
        const r = btn.getBoundingClientRect();
        el.style.visibility = 'hidden';
        el.style.left = '0px';
        el.style.top = '0px';
        document.body.appendChild(el);
        const w = el.offsetWidth, h = el.offsetHeight;
        const vw = window.innerWidth, vh = window.innerHeight;
        let x = r.left + r.width / 2 - w / 2;
        x = Math.max(8, Math.min(x, vw - w - 8));
        let y = r.bottom + 8;
        if (y + h > vh - 8) {
            const above = r.top - h - 8;
            y = (above >= 8) ? above : Math.max(8, vh - h - 8);
        }
        // アンカーが画面外 (スクロール外) の場合でもはみ出さないように最終クランプ
        y = Math.max(8, Math.min(y, Math.max(8, vh - h - 8)));
        el.style.left = x + 'px';
        el.style.top = y + 'px';
        el.style.visibility = 'visible';
    }

    function open(btn) {
        close();
        const id = btn.getAttribute('data-mi');
        let ctx = null;
        const mc = btn.getAttribute('data-mc');
        if (mc) { try { ctx = JSON.parse(decodeURIComponent(mc)); } catch (e) { ctx = null; } }

        const tmp = document.createElement('div');
        tmp.innerHTML = build(id, ctx);
        const el = tmp.firstElementChild;
        if (!el) return;
        place(btn, el);
        pop = el;
        curBtn = btn;
        btn.setAttribute('aria-expanded', 'true');

        const x = el.querySelector('.mi-x');
        if (x) x.addEventListener('click', function (e) { e.preventDefault(); close(true); });
        const more = el.querySelector('.mi-more');
        if (more) more.addEventListener('click', function (e) {
            e.preventDefault();
            const anchor = (defOf(id) || {}).anchor;
            close();
            if (anchor && typeof jumpToManualSection === 'function') jumpToManualSection(anchor);
        });
    }

    function close(returnFocus) {
        if (!pop) return;
        const b = curBtn;
        const p = pop;
        pop = null;
        curBtn = null;
        p.remove();
        if (b) {
            b.setAttribute('aria-expanded', 'false');
            if (returnFocus) { try { b.focus({ preventScroll: true }); } catch (e) { b.focus(); } }
        }
    }

    // ===== 静的テーブルの後付け装飾 =====
    //   map: { 'ヘッダー文字列': 'metric_id' } (前後の空白・連続空白は正規化して比較)
    function norm(s) { return String(s || '').replace(/\s+/g, ' ').trim(); }
    function decorate(root, map) {
        if (!root || !map) return;
        root.querySelectorAll('th').forEach(function (th) {
            if (th.querySelector('.mi-i')) return;
            const id = map[norm(th.textContent)];
            if (!id || !defOf(id)) return;
            th.insertAdjacentHTML('beforeend', icon(id));
        });
    }

    // ===== イベント (1 回だけ登録) =====
    document.addEventListener('click', function (e) {
        const b = e.target && e.target.closest ? e.target.closest('.mi-i') : null;
        if (b) {
            e.preventDefault();
            e.stopPropagation();
            if (pop && curBtn === b) { close(); } else { open(b); }
            return;
        }
        if (pop && !(e.target.closest && e.target.closest('.mi-pop'))) close();
    }, true);

    document.addEventListener('keydown', function (e) {
        if (!pop) return;
        if (e.key === 'Escape' || e.key === 'Esc') {
            e.stopPropagation();
            close(true);
        }
    }, true);

    window.addEventListener('resize', function () { close(); });
    window.addEventListener('scroll', function () { close(); }, true);

    window.MI = {
        icon: icon,
        decorate: decorate,
        close: close,
        open: open,
        // 表示用フォーマッタ (呼び出し側の書式ゆれを防ぐ)
        pct: function (v, dec) { return (v == null || !isFinite(v)) ? null : (Math.round(v * Math.pow(10, dec == null ? 1 : dec)) / Math.pow(10, dec == null ? 1 : dec)) + '%'; },
        num: function (v, dec) {
            if (v == null || !isFinite(v)) return null;
            const d = dec == null ? 0 : dec;
            const n = Math.round(v * Math.pow(10, d)) / Math.pow(10, d);
            return n.toLocaleString((typeof LANG !== 'undefined' && LANG === 'en') ? 'en-US' : 'ja-JP', { minimumFractionDigits: d, maximumFractionDigits: d });
        }
    };
})();
