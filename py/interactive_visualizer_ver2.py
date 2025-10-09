# interactive_visualizer_ver2.py

import os
import sys
import time
import pandas as pd
import json
from urllib.parse import quote
import re
import numpy as np
from collections import defaultdict

try:
    import data_processor2
    import analyze_lbol_logs_mod2 as cfg
except ImportError as e:
    print(f"FATAL ERROR: Could not import '{e.name}'. Please ensure all required .py files are in the same directory.")
    sys.exit(1)


def generate_json_data(dashboard_data, output_dir):
    """
    キャラクターごと、言語ごとに分析データをJSONファイルとして出力する。
    """
    print("\n--- Generating JSON Data Files ---")
    json_output_dir = os.path.join(output_dir, "data")
    os.makedirs(json_output_dir, exist_ok=True)

    # --- データフレームの展開 ---
    agg_df = dashboard_data["aggregated_df"]
    sit_df = dashboard_data["situational_df"]
    exhibits_df = dashboard_data["exhibits_df"]
    route_event_data = dashboard_data["route_event_data"]
    enemy_encounter_df = dashboard_data["enemy_encounter_summary_df"]

    card_name_map = {v.get('JA', k): v.get('EN', v.get('JA', k)) for k, v in cfg.cards_dict.items()}

    def stringify_tuple_keys(data_dict):
        if not isinstance(data_dict, dict):
            return data_dict
        return {"-".join(map(str, k)): v for k, v in data_dict.items()}

    def convert_numpy_types(o):
        if isinstance(o, np.integer):
            return int(o)
        if isinstance(o, np.floating):
            return float(o)
        if isinstance(o, np.ndarray):
            return o.tolist()
        raise TypeError(f'Object of type {o.__class__.__name__} is not JSON serializable')

    all_characters = sorted(agg_df['Character'].unique())
    for char in all_characters:
        print(f"  - Processing data for {char}...")

        # 1. まず、キャラクターの全集計データと状況別データを準備
        df_agg_char_full = agg_df[agg_df['Character'] == char].copy()
        df_sit_char = sit_df[sit_df['Character'] == char].copy()

        # 2. 英語名カラムを追加
        df_agg_char_full['Card_Name_EN'] = df_agg_char_full['Card_Name'].map(card_name_map).fillna(
            df_agg_char_full['Card_Name'])
        df_sit_char['Card_Name_EN'] = df_sit_char['Card_Name'].map(card_name_map).fillna(df_sit_char['Card_Name'])

        df_sit_char['Situation'] = "Act " + df_sit_char['Act'].astype(str) + " - " + df_sit_char['Combat_Type']

        # 3. 全集計データに対して、ハイライト、共起、メダルなどのリッチな情報を計算
        highlight_map_ja, highlight_map_en = {}, {}
        for card_name, group in df_sit_char.groupby('Card_Name'):
            highlight_situations_for_hover = group[
                ((group['Turn_Deviation'] > 60.0) | (group['HP_Deviation'] > 60.0)) |
                ((group['Turn_Deviation'] > 55.0) & (group['HP_Deviation'] > 55.0)) |
                ((group['Turn_Deviation'] + group['HP_Deviation']) >= 110.0)
                ].copy()
            if not highlight_situations_for_hover.empty:
                highlight_situations_for_hover['Combat_Sort_Key'] = highlight_situations_for_hover['Combat_Type'].map(
                    {'Enemy': 0, 'EliteEnemy': 1, 'Boss': 2})
                highlight_situations_sorted = highlight_situations_for_hover.sort_values(by=['Act', 'Combat_Sort_Key'])
                highlight_map_ja[card_name] = "<br>".join(
                    [f"{row['Situation']} (攻:{row['Turn_Deviation']:.1f},防:{row['HP_Deviation']:.1f})" for _, row in
                     highlight_situations_sorted.iterrows()])
                highlight_map_en[card_name] = "<br>".join(
                    [f"{row['Situation']} (Atk:{row['Turn_Deviation']:.1f},Def:{row['HP_Deviation']:.1f})" for _, row in
                     highlight_situations_sorted.iterrows()])

        df_agg_char_full['Highlights_JA_Hover'] = df_agg_char_full['Card_Name'].map(highlight_map_ja).fillna('')
        df_agg_char_full['Highlights_EN_Hover'] = df_agg_char_full['Card_Name'].map(highlight_map_en).fillna('')

        if 'Top_20_Co_occurrence' in df_agg_char_full.columns:
            df_agg_char_full['Top_20_Co_occurrence_EN'] = df_agg_char_full['Top_20_Co_occurrence'].apply(
                lambda s: "<br>".join([
                    f"{card_name_map.get(l.split(' (')[0], l.split(' (')[0])} ({l.split(' (', 1)[1]}" if ' (' in l else l
                    for l in s.split('<br>')]) if isinstance(s, str) and s else "")

        def parse_co_occurrence(html_string):
            return [re.split(r'\s\(', line)[0] for line in html_string.split('<br>')][:10] if isinstance(html_string,
                                                                                                         str) and html_string else []

        df_agg_char_full['Co_occurrence_Partners'] = df_agg_char_full['Top_20_Co_occurrence'].apply(parse_co_occurrence)
        df_agg_char_full['Co_occurrence_Partners_EN'] = df_agg_char_full.get('Top_20_Co_occurrence_EN',
                                                                             pd.Series(dtype=str)).apply(
            parse_co_occurrence)

        def get_medal(highlight_count, thresholds):
            if highlight_count >= thresholds['gold']: return "🥇"
            if highlight_count >= thresholds['silver']: return "🥈"
            if highlight_count >= thresholds['bronze']: return "🥉"
            return ""

        df_agg_char_full['Highlight_Count'] = df_agg_char_full['Highlights_JA_Hover'].apply(lambda s: sum(
            2 if "Act 3 - Boss" in l else 3 if "Act 4 - Boss" in l else 1 for l in s.split('<br>')) if s else 0)
        if not df_agg_char_full.empty and df_agg_char_full['Highlight_Count'].max() > 0:
            medal_thresholds = {k: df_agg_char_full['Highlight_Count'].quantile(v) for k, v in
                                {'gold': 0.95, 'silver': 0.85, 'bronze': 0.70}.items()}
            medal_thresholds = {k: max(v, 1) for k, v in medal_thresholds.items()}
        else:
            medal_thresholds = {'gold': 999, 'silver': 999, 'bronze': 999}
        df_agg_char_full['Medal'] = df_agg_char_full['Highlight_Count'].apply(lambda x: get_medal(x, medal_thresholds))

        # 4. 状況別データに、共通情報をマージ（軽量化のため、一部のみ）
        columns_to_add_from_agg = ['Card_Name', 'Adoption_Rate', 'Avg_Copies', 'Avg_Upgrade_Rate', 'Medal']
        existing_cols_to_merge = [col for col in columns_to_add_from_agg if col in df_agg_char_full.columns]
        if existing_cols_to_merge:
            agg_info_to_merge = df_agg_char_full[existing_cols_to_merge].drop_duplicates(subset=['Card_Name'])
            df_sit_char = pd.merge(df_sit_char, agg_info_to_merge, on='Card_Name', how='left')

        # 5. 最後に、グラフ表示用に集計データをフィルタリング
        df_agg_char_for_graph = df_agg_char_full[
            (df_agg_char_full['Total_Fights_With'] >= 50) &
            (df_agg_char_full['Standard_Deviation'] >= 0.01) &
            (df_agg_char_full['Standard_Deviation'] <= 15.0)
            ].copy()

        # 6. JSON化の準備
        df_agg_char_safe = df_agg_char_for_graph.replace({np.nan: None})
        df_agg_char_full_safe = df_agg_char_full.replace({np.nan: None})  # 全データも安全に変換
        df_sit_char_safe = df_sit_char.replace({np.nan: None})
        exhibits_df_char_safe = exhibits_df[exhibits_df['Character'] == char].replace({np.nan: None})
        enemy_encounter_df_safe = enemy_encounter_df.replace({np.nan: None})

        # --- ルート・イベントデータの処理 ---
        node_selection_data = stringify_tuple_keys(route_event_data['node_selection'].get(char, {}))

        # event_actions の中のカードIDを正規化する
        raw_event_actions = route_event_data['event_actions'].get(char, {})
        normalized_event_actions = defaultdict(lambda: defaultdict(list))

        for node_key, event_map in raw_event_actions.items():
            for event_key, items in event_map.items():
                for item_id, count in items:
                    if "Card" in event_key:
                        normalized_id = cfg.normalize_card_id(item_id)
                        # 既存のアイテムを探してカウントを更新、なければ追加
                        found = False
                        for i, (existing_id, existing_count) in enumerate(normalized_event_actions[node_key][event_key]):
                            if existing_id == normalized_id:
                                normalized_event_actions[node_key][event_key][i] = (normalized_id, existing_count + count)
                                found = True
                                break
                        if not found:
                            normalized_event_actions[node_key][event_key].append((normalized_id, count))
                    else:
                        normalized_event_actions[node_key][event_key].append((item_id, count))

        event_actions_data = stringify_tuple_keys(normalized_event_actions)
        node_details_data = stringify_tuple_keys(route_event_data['node_details'].get(char, {}))

        combined_data = {
            #"agg_data": df_agg_char_full.to_dict(orient='records'), # ★★★ フィルタリング前の全集計データを渡す
            "agg_data_for_graph": df_agg_char_safe.to_dict(orient='records'),  # グラフ描画用のフィルタリング済みデータ
            "agg_data_full": df_agg_char_full_safe.to_dict(orient='records'),  # JSのルックアップ用の全データ
            "sit_data": df_sit_char_safe.to_dict(orient='records'),

            "exhibit_data": exhibits_df_char_safe.to_dict(orient='records'),
            "route_data": {
                'node_selection': node_selection_data,
                'event_actions': event_actions_data,
                'node_details': node_details_data,
                'total_runs': route_event_data['total_runs'].get(char, 1)
            },
            "enemy_data": enemy_encounter_df_safe.to_dict(orient='records'),
            "all_available_characters": all_characters,
            "metadata": {
                "character": char,
                "ordered_situations": sorted(df_sit_char['Situation'].unique(), key=lambda s: (
                    int(s.split(' ')[1]), {'Enemy': 0, 'EliteEnemy': 1, 'Boss': 2}.get(s.split(' - ')[1], 99))),
                "version": ", ".join(
                    cfg.CHARACTER_CONFIG.get(char.replace('A', '').replace('B', ''), {}).get('Version', []))
            },
            "lookup_tables": {
                "cards": cfg.cards_dict,
                "exhibits": cfg.exhibits_dict,
                "exhibit_mana_map": cfg.EXHIBIT_MANA_MAP,
                "mana_icon_map": cfg.MANA_ICON_MAP
            }
        }

        json_filename = f"{char}_data.json"
        output_path = os.path.join(json_output_dir, json_filename)
        with open(output_path, 'w', encoding='utf-8') as f:
            json.dump(combined_data, f, ensure_ascii=False, indent=None, separators=(',', ':'),
                      default=convert_numpy_types)
        print(f"    -> SUCCESS: Saved data to {output_path}")


if __name__ == '__main__':
    start = time.perf_counter()
    print("Step 1: Fetching and processing all dashboard data...")
    dashboard_data = data_processor2.get_processed_card_data()
    if dashboard_data:
        output_dir = os.path.join(cfg.MAIN_DIR, "card_effectiveness_reports")
        generate_json_data(dashboard_data, output_dir)
    else:
        print("\nNo data to visualize.")
    end = time.perf_counter()
    print(f"\nTotal execution time: {(end - start):.2f} seconds")