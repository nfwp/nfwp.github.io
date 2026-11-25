// metric-defs.js — ③-E (M-6) 計算方法ポップアップ: 指標メタデータ
//   文言は locales/{ja,en}.json の metric_info セクションに置く
//   (キー: <id>_name / <id>_def / <id>_f (計算式テンプレート) / <id>_note)
//   anchor = 「使い方タブで詳しく」のジャンプ先 (manual_{lang}.html の section id)
//
//   計算式テンプレートの {xxx} は MI.icon(id, {xxx: 値}) で渡した実数値に置換される。
//   値が足りない場合は「この表示では計算できません」を出す。
//   **...** は太字として描画される。

window.METRIC_DEFS = {
    // ===== カード総選挙 =====
    prate:    { anchor: 'sec-cardelection' },   // Pレート
    deci:     { anchor: 'sec-cardelection' },   // D回数
    draft:    { anchor: 'sec-cardelection' },   // ドラフト勝率
    offers:   { anchor: 'sec-cardelection' },   // 提示回数
    availn:   { anchor: 'sec-cardelection' },   // 選択可能提示n
    pickrate: { anchor: 'sec-cardelection' },   // ピック率
    adopt:    { anchor: 'sec-cardelection' },   // 実質採用率
    final:    { anchor: 'sec-cardelection' },   // 最終採用率
    score:    { anchor: 'sec-cardelection' },   // 合成Pスコア
    avg:      { anchor: 'sec-cardelection' },   // 平均枚数 / 採用時平均枚数
    pct2:     { anchor: 'sec-cardelection' },   // 2枚以上率
    fpk:      { anchor: 'sec-cardelection' },   // 初回ピック率
    au:       { anchor: 'sec-cardelection' },   // 平均強化率
    flow:     { anchor: 'sec-cardelection' },   // 提示フロー
    actpick:  { anchor: 'sec-cardelection' },   // Act別ピック率

    // ===== カード性能 / カード一覧 =====
    atk:      { anchor: 'sec-hover' },          // 攻撃性能
    defperf:  { anchor: 'sec-hover' },          // 防御性能
    perf:     { anchor: 'sec-filters' },        // 性能 (攻撃性能 + 防御性能)
    stab:     { anchor: 'sec-hover' },          // 安定度
    gap:      { anchor: 'sec-hover' },          // 採用ギャップ係数
    sample:   { anchor: 'sec-cardlist' },       // サンプルラン

    // ===== 類似ラン検索 =====
    jaccard:  { anchor: 'sec-dd' },             // 類似度 (Jaccard)
    coverage: { anchor: 'sec-dd' },             // 類似度 (包含率)
    tpf:      { anchor: 'sec-dd' },             // 平均ターン/戦闘
    lpf:      { anchor: 'sec-dd' },             // 平均ライフ損失/戦闘
    encrate:  { anchor: 'sec-dd' },             // 遭遇ラン率

    // ===== Act別トレンド =====
    sustain:  { anchor: 'sec-acttrend' }        // 継戦能力
};
