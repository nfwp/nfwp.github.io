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
