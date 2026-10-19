// =================================================================
// 使い方 (マニュアル) タブ — コンポーネント
//   - manual/manual_{lang}.html 断片を遅延読み込みして表示
//   - 折りたたみ (<details>) 型 TOC
//   - jumpToManualSection('sec-xxx') でタブ内の該当セクションへ
//     ジャンプ可能 (将来、各タブに置く ⓘ リンクからも使えます)
// =================================================================

let manualLoadedLang = null;   // 既に読み込み済みの言語

function renderManualTab(lang) {
    const container = document.getElementById('manual-tab');
    if (!container) return;

    const mainTitleEl = document.getElementById('main-title');
    if (mainTitleEl) {
        mainTitleEl.textContent =
            (lang === 'ja')
                ? `使い方ガイド (Ver: ${DATA_VERSION || ''})`
                : `How to Use (Ver: ${DATA_VERSION || ''})`;
    }

    // 同じ言語を既に読み込んでいるなら再フェッチしない
    if (manualLoadedLang === lang) return;

    const vParam = (typeof DATA_VERSION !== 'undefined' && DATA_VERSION)
        ? `?v=${DATA_VERSION}` : `?_=${new Date().getTime()}`;
    container.innerHTML = (lang === 'ja') ? '<p style="padding:20px;">読み込み中...</p>' : '<p style="padding:20px;">Loading...</p>';

    fetch(`manual/manual_${lang}.html${vParam}`)
        .then(response => {
            if (!response.ok) throw new Error(`HTTP ${response.status}`);
            return response.text();
        })
        .then(html => {
            container.innerHTML = html;
            manualLoadedLang = lang;
            setupManualInteractions(container);
            loadManualFunnelFragments(container, lang, vParam);
        })
        .catch(error => {
            console.error('Failed to load manual:', error);
            container.innerHTML = (lang === 'ja')
                ? `<p style="padding:20px;">マニュアルの読み込みに失敗しました。 (${error.message})</p>`
                : `<p style="padding:20px;">Failed to load the manual. (${error.message})</p>`;
        });
}

// --- 漏斗表断片 (pipeline_report が毎日生成する funnel_table_{lang}.html) ---
function loadManualFunnelFragments(container, lang, vParam) {
    container.querySelectorAll('div[data-funnel]').forEach(ph => {
        fetch(`manual/funnel_table_${lang}.html${vParam}`)
            .then(response => {
                if (!response.ok) throw new Error(`HTTP ${response.status}`);
                return response.text();
            })
            .then(frag => {
                ph.innerHTML = frag;
            })
            .catch(error => {
                console.warn('Failed to load funnel fragment:', error);
                ph.innerHTML = (lang === 'ja')
                    ? '<p class="manual-note">(キャラ別データ漏斗の表を読み込めませんでした)</p>'
                    : '<p class="manual-note">(Failed to load the funnel table)</p>';
            });
    });
}

// --- 断片読み込み後の動作設定 ---
function setupManualInteractions(container) {
    // 目次 / 文中のリンク (#sec-xxx) をクリック → 該当折りたたみを開いてスクロール
    container.querySelectorAll('a[href^="#sec-"]').forEach(anchor => {
        anchor.addEventListener('click', (e) => {
            e.preventDefault();
            const targetId = anchor.getAttribute('href').slice(1);
            jumpToManualSection(targetId, false); // false: タブ移動済みなので switchTab しない
        });
    });

    // URL ハッシュ (#sec-xxx) があれば開く
    if (window.location.hash && window.location.hash.startsWith('#sec-')) {
        const secId = window.location.hash.slice(1);
        requestAnimationFrame(() => jumpToManualSection(secId, false));
    }
}

/**
 * マニュアル内の指定セクションへジャンプする。
 * 使い方タブが閉じている場合は開いてから移動する。
 * @param {string} secId - セクション ID (例: 'sec-filter')
 * @param {boolean} [switchIfNeeded=true] - 必要なら使い方タブへ切り替えるか
 */
function jumpToManualSection(secId, switchIfNeeded = true) {
    const tabEl = document.getElementById('manual-tab');
    if (!tabEl) return;

    const doJump = () => {
        const el = document.getElementById(secId);
        if (!el) return;
        el.scrollIntoView({ behavior: 'smooth', block: 'start' });
        // 一瞬強調
        el.classList.add('manual-flash');
        setTimeout(() => el.classList.remove('manual-flash'), 1600);
    };

    const isManualVisible = tabEl.style.display !== 'none' && tabEl.innerHTML.trim() !== '';
    if (!isManualVisible && switchIfNeeded) {
        switchTab('manual-tab');
        // レンダリング待ち → 読み込み完了後にスクロール
        const waitForContent = (tries = 0) => {
            if (manualLoadedLang && document.getElementById(secId)) {
                doJump();
            } else if (tries < 30) {
                setTimeout(() => waitForContent(tries + 1), 100);
            }
        };
        waitForContent();
    } else {
        doJump();
    }
}
