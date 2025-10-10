# data_processor2.py

import pandas as pd
import numpy as np
from collections import defaultdict
import time
import re
import os

# --- 共通設定モジュールから定数と関数をインポート ---
try:
    import analyze_lbol_logs_mod2 as cfg
except ImportError:
    print("エラー: 'analyze_lbol_logs_mod2.py' が見つかりません。同じディレクトリに配置してください。")
    exit()


# --- ご指定の設定値 ---
MIN_FIGHT_COUNTS = {'Enemy': 22, 'EliteEnemy': 8, 'Boss': 6}
HP_GAIN_THRESHOLD = 100
POWER_GAIN_THRESHOLD = 500
MONEY_GAIN_THRESHOLD = 900


# --- データ計算関数 ---

def generate_attack_defense_report(all_records_df):
    act_weights = {1: 1.0, 2: 1.2, 3: 1.5, 4: 2.0}
    combat_weights = {'Enemy': 1.0, 'EliteEnemy': 1.5, 'Boss': 2.0}
    card_performance = defaultdict(lambda: {'weighted_turn_scores': [], 'weighted_hp_scores': [], 'weights': []})
    for _, record in all_records_df.iterrows():
        key = (record['Character'], record['Card_Name'])
        act_w = act_weights.get(record['Act'], 1.0)
        combat_w = combat_weights.get(record['Combat_Type'], 1.0)
        final_weight = act_w * combat_w
        card_performance[key]['weighted_turn_scores'].append(record['Turn_Deviation'] * final_weight)
        card_performance[key]['weighted_hp_scores'].append(record['HP_Deviation'] * final_weight)
        card_performance[key]['weights'].append(final_weight)
    report_list = []
    for (char, card_name), data in card_performance.items():
        total_weight = np.sum(data['weights'])
        if total_weight == 0: continue
        weighted_avg_turn = np.sum(data['weighted_turn_scores']) / total_weight
        weighted_avg_hp = np.sum(data['weighted_hp_scores']) / total_weight
        report_list.append({
            'Character': char, 'Card_Name': card_name,
            'Weighted_Avg_Turn_Deviation': weighted_avg_turn,
            'Weighted_Avg_HP_Deviation': weighted_avg_hp,
        })
    return pd.DataFrame(report_list)


def generate_stability_report(all_records_df):
    """
    安定性レポートを生成する。
    Rarity, Type などの静的データを追加する。
    """
    card_performance = defaultdict(lambda: {'scores': [], 'card_id': None})
    for _, record in all_records_df.iterrows():
        key = (record['Character'], record['Card_Name'])
        card_performance[key]['card_id'] = record['Card_ID']
        card_performance[key]['scores'].append(record['Overall_Deviation'])
    report_list = []
    for (char, card_name), data in card_performance.items():
        scores = data['scores']
        std_dev = np.std(scores) if len(scores) > 1 else 0
        stability_score = 100 - std_dev
        card_info = cfg.cards_dict.get(data['card_id'], {})
        report_list.append({
            'Character': char, 'Card_Name': card_name,
            'Stability_Score': stability_score,
            'Standard_Deviation': std_dev,
            'Rarity': card_info.get('Rarity', 'Unknown'),
            'Type': card_info.get('Type', 'Unknown')
        })
    return pd.DataFrame(report_list)


def generate_global_co_occurrence_report(co_occurrence_counts_global, total_fights_unfiltered_global):
    """
    【総合】共起データを集計し、Top20リストを文字列として含むDataFrameを返す
    """
    print("Step 2.5: Generating GLOBAL co-occurrence report...")
    report_list = []
    for char, char_data in co_occurrence_counts_global.items():
        for card_id, co_cards in char_data.items():
            primary_card_name_ja = cfg.cards_dict.get(card_id, {}).get('JA', card_id)
            total_fights = total_fights_unfiltered_global.get(char, {}).get(card_id, 0)
            if total_fights == 0: continue

            sorted_co_cards = sorted(co_cards.items(), key=lambda item: item[1], reverse=True)
            top_20_list = []
            for co_card_id, count in sorted_co_cards[:20]:
                rate = (count / total_fights) * 100
                co_card_name = cfg.cards_dict.get(co_card_id, {}).get('JA', co_card_id)
                top_20_list.append(f"{co_card_name} ({rate:.1f}%)")

            report_list.append({
                'Character': char,
                'Card_Name': primary_card_name_ja,
                'Top_20_Co_occurrence': "<br>".join(top_20_list)
            })
    return pd.DataFrame(report_list)


def parse_exhibit_config(file_path):
    """ExhibitConfig.txtを解析して、展示品のプロパティを抽出する。"""
    if not os.path.exists(file_path):
        print(f"Warning: ExhibitConfig.txt not found at {file_path}. Exhibit categorization will be limited.")
        return {}

    exhibit_properties = {}
    with open(file_path, 'r', encoding='utf-8') as f:
        content = f.read()

    blocks = content.split('------------------------')

    for block in blocks:
        if "ExhibitConfig" not in block:
            continue

        id_match = re.search(r'Id=([a-zA-Z0-9_]+)', block)
        pooled_match = re.search(r'IsPooled=(True|False)', block)
        appearance_match = re.search(r'Appearance=([a-zA-Z]+)', block)
        rarity_match = re.search(r'Rarity=([a-zA-Z]+)', block)

        if id_match:
            exhibit_id = id_match.group(1)
            properties = {
                'IsPooled': pooled_match.group(1) == 'True' if pooled_match else None,
                'Appearance': appearance_match.group(1) if appearance_match else None,
                'Rarity': rarity_match.group(1) if rarity_match else None
            }
            exhibit_properties[exhibit_id] = properties

    return exhibit_properties


# --- メインのデータ処理関数 ---

def get_processed_card_data():
    """
    全てのデータ処理を実行し、分析に必要な全データを格納した辞書を返す。
    """
    print("--- Dashboard Data Processing Start ---")

    def _calculate_boxplot_stats(data):
        if not data or len(data) < 2:
            return None
        try:
            return {
                'min': np.min(data),
                'q1': np.percentile(data, 25),
                'median': np.median(data),
                'q3': np.percentile(data, 75),
                'max': np.max(data),
                'mean': np.mean(data)
            }
        except Exception:
            return None

    # --- Step 0: 敵情報の準備 ---
    enemy_groups = cfg.json_to_dict(cfg.ENEMY_GROUP_JSON)
    ja_enemy_names = cfg.json_to_dict(cfg.ENEMY_NAME_JSON)
    en_enemy_names = cfg.json_to_dict(cfg.ENEMY_NAME_EN_JSON)
    translated_enemy_groups = cfg.translate_enemy_groups(enemy_groups, ja_enemy_names, en_enemy_names)

    # --- Step 1: データ収集用の変数を初期化 ---
    print("\nStep 1: Initializing data structures...")

    all_card_ids = set(cfg.cards_dict.keys())
    analysis_data = defaultdict(lambda: defaultdict(lambda: defaultdict(lambda: defaultdict(lambda: {
        'with_card': {'turn_list': [], 'hp_loss_list': []},
        'without_card': {'turn_list': [], 'hp_loss_list': []}
    }))))

    co_occurrence_counts_global = defaultdict(lambda: defaultdict(lambda: defaultdict(int)))
    total_fights_unfiltered_global = defaultdict(lambda: defaultdict(int))
    co_occurrence_counts_situational = defaultdict(
        lambda: defaultdict(lambda: defaultdict(lambda: defaultdict(lambda: defaultdict(int)))))
    total_fights_unfiltered_situational = defaultdict(
        lambda: defaultdict(lambda: defaultdict(lambda: defaultdict(int))))

    card_adoption_stats = defaultdict(lambda: {'runs_with_card': 0, 'total_copies': 0, 'upgraded_copies': 0})
    exhibit_adoption_stats = defaultdict(lambda: {'runs_with_exhibit': 0})
    node_selection_stats = defaultdict(lambda: defaultdict(lambda: defaultdict(int)))
    event_action_stats = defaultdict(lambda: defaultdict(lambda: defaultdict(lambda: defaultdict(int))))
    total_run_counts = defaultdict(int)
    node_details_stats = defaultdict(lambda: defaultdict(lambda: defaultdict(object)))
    enemy_encounter_raw_data = defaultdict(
        lambda: defaultdict(lambda: defaultdict(lambda: {'turns': [], 'hp_loss': [], 'p_change': []})))
    anomaly_run_count = 0

    # --- Step 2: 全てのランをストリーミング処理してデータを収集 ---
    print("\nStep 2: Streaming all runs and collecting raw data...")
    for run_id, run_data in cfg.stream_json_runs(cfg.ALL_RUN_JSON):
        # 基本的なフィルタリング
        if '_L7_TrueEnd' not in run_id or '_L7_TrueEndFail' in run_id:
            continue
        player_name = run_data.get('Name', '')
        if player_name and any(skip in player_name for skip in cfg.SKIP_PLAYER):
            continue

        char_name = run_data.get('Character')
        if not char_name: continue

        run_version = run_data.get('Version', '')
        allowed_versions = cfg.CHARACTER_CONFIG.get(char_name, {}).get('Version', [])
        if not run_version or not any(ver in run_version for ver in allowed_versions):
            continue

        char_type = char_name + run_data.get('PlayerType', '')
        if not char_type: continue

        stations = run_data.get('Stations', [])
        if not stations: continue

        is_anomalous_run = False
        if stations:
            prev_hp = stations[0].get('Status', {}).get('Hp', 0)
            prev_power = stations[0].get('Status', {}).get('Power', 0)
            prev_money = stations[0].get('Status', {}).get('Money', 0)

            for station in stations:
                current_hp = station.get('Status', {}).get('Hp', 0)
                current_power = station.get('Status', {}).get('Power', 0)
                current_money = station.get('Status', {}).get('Money', 0)

                hp_gain = current_hp - prev_hp
                power_gain = current_power - prev_power
                money_gain = current_money - prev_money

                if (hp_gain >= HP_GAIN_THRESHOLD or
                        power_gain >= POWER_GAIN_THRESHOLD or
                        money_gain >= MONEY_GAIN_THRESHOLD):
                    is_anomalous_run = True
                    break

                prev_hp, prev_power, prev_money = current_hp, current_power, current_money

        if is_anomalous_run:
            anomaly_run_count += 1
            continue

        cards_log = run_data.get('Cards_log', [])
        exhibits_log = run_data.get('Exhibits_log', [])

        total_run_counts[char_type] += 1
        final_deck_card_ids = {cfg.normalize_card_id(c['Id']) for c in run_data['Result'].get('Cards', [])}
        final_exhibit_ids = {e for e in run_data['Result'].get('Exhibits', [])}

        for card_id in final_deck_card_ids:
            card_adoption_stats[(char_type, card_id)]['runs_with_card'] += 1
        for card in run_data['Result'].get('Cards', []):
            norm_id = cfg.normalize_card_id(card['Id'])
            card_adoption_stats[(char_type, norm_id)]['total_copies'] += 1
            if card.get('IsUpgraded'):
                card_adoption_stats[(char_type, norm_id)]['upgraded_copies'] += 1

        for exhibit_id in final_exhibit_ids:
            exhibit_adoption_stats[(char_type, exhibit_id)]['runs_with_exhibit'] += 1

        station_decks = [set() for _ in range(len(stations) + 1)]
        if cards_log:
            for i in range(1, len(stations) + 1):
                station_decks[i] = station_decks[i - 1].copy()
                ops_at_station = [c for c in cards_log if c.get('Station') == i - 1]
                for op in ops_at_station:
                    normalized_id = cfg.normalize_card_id(op['Id'])
                    if op['Type'] == 'Add':
                        station_decks[i].add(normalized_id)
                    elif op['Type'] == 'Remove':
                        station_decks[i].discard(normalized_id)

        hp_before_fight = stations[0].get('Status', {}).get('Hp', 0)
        money_before_event = stations[0].get('Status', {}).get('Money', 0)
        power_before_fight = stations[0].get('Status', {}).get('Power', 0)

        # ★★★ このランの中で既に通過したレベルを記録するセット ★★★
        seen_levels_in_run = set()

        for i, station in enumerate(stations):
            current_hp = station.get('Status', {}).get('Hp', 0)
            current_money = station.get('Status', {}).get('Money', 0)
            current_power = station.get('Status', {}).get('Power', 0)
            station_type = station.get('Type')
            act = station.get('Node', {}).get('Act')
            level = station.get('Node', {}).get('Level')

            if station_type in ['Enemy', 'EliteEnemy', 'Boss'] and act is not None:
                deck_at_fight_start = station_decks[i]
                hp_loss = hp_before_fight - current_hp
                turns = station.get('Data', {}).get('Rounds', 0)
                deck_list = list(deck_at_fight_start)

                enemy_id = station.get('Id')
                if enemy_id:
                    power_change = current_power - power_before_fight
                    enemy_encounter_raw_data[char_type][act][enemy_id]['turns'].append(turns)
                    enemy_encounter_raw_data[char_type][act][enemy_id]['hp_loss'].append(hp_loss)
                    enemy_encounter_raw_data[char_type][act][enemy_id]['p_change'].append(power_change)
                    enemy_encounter_raw_data[char_type][act][enemy_id]['type'] = station_type
                    if 'levels' not in enemy_encounter_raw_data[char_type][act][enemy_id]:
                        enemy_encounter_raw_data[char_type][act][enemy_id]['levels'] = []
                    enemy_encounter_raw_data[char_type][act][enemy_id]['levels'].append(level)

                for card_id in deck_list:
                    total_fights_unfiltered_global[char_type][card_id] += 1
                    total_fights_unfiltered_situational[char_type][act][station_type][card_id] += 1
                for j in range(len(deck_list)):
                    for k in range(j + 1, len(deck_list)):
                        card1, card2 = deck_list[j], deck_list[k]
                        co_occurrence_counts_global[char_type][card1][card2] += 1
                        co_occurrence_counts_global[char_type][card2][card1] += 1
                        co_occurrence_counts_situational[char_type][act][station_type][card1][card2] += 1
                        co_occurrence_counts_situational[char_type][act][station_type][card2][card1] += 1

                for card_id in all_card_ids:
                    data_key = 'with_card' if card_id in deck_at_fight_start else 'without_card'
                    data = analysis_data[char_type][act][station_type][card_id]
                    data[data_key]['turn_list'].append(turns)
                    data[data_key]['hp_loss_list'].append(hp_loss)

            if act is not None and level is not None:
                node_key = (act, level)
                # ★★★ ここから修正: 重複カウントを防止する ★★★
                if node_key not in seen_levels_in_run:
                    node_selection_stats[char_type][node_key][station_type] = node_selection_stats[char_type][node_key].get(
                        station_type, 0) + 1
                    node_selection_stats[char_type][node_key]['total'] = node_selection_stats[char_type][node_key].get(
                        'total', 0) + 1
                    # このレベルを通過済みとしてセットに記録
                    seen_levels_in_run.add(node_key)
                # ★★★ ここまで修正 ★★★

                node_details_key = (act, level, station_type)
                if station_type in ['Enemy', 'EliteEnemy', 'Boss']:
                    enemy_id = station.get('Id')
                    if enemy_id:
                        if 'enemies' not in node_details_stats[char_type].get(node_details_key, {}):
                            node_details_stats[char_type][node_details_key] = {
                                'enemies': defaultdict(lambda: {'turns': [], 'hp_loss': [], 'p_change': []})}

                        enemy_stats = node_details_stats[char_type][node_details_key]['enemies'][enemy_id]
                        enemy_stats['turns'].append(station.get('Data', {}).get('Rounds', 0))
                        enemy_stats['hp_loss'].append(hp_before_fight - current_hp)
                        enemy_stats['p_change'].append(current_power - power_before_fight)

                elif station_type == 'Gap':
                    choice = station.get('Data', {}).get('Choice')
                    if choice:
                        if 'choices' not in node_details_stats[char_type].get(node_details_key, {}):
                            node_details_stats[char_type][node_details_key] = {'choices': defaultdict(int)}
                        node_details_stats[char_type][node_details_key]['choices'][choice] += 1
                elif station_type == 'Shop':
                    if 'money_list' not in node_details_stats[char_type].get(node_details_key, {}):
                        node_details_stats[char_type][node_details_key] = {'money_list': []}
                    node_details_stats[char_type][node_details_key]['money_list'].append(money_before_event)

                    actions_at_station = [a for a in cards_log if a.get('Station') == i]
                    if 'remove_card_runs' not in node_details_stats[char_type][node_details_key]:
                        node_details_stats[char_type][node_details_key]['remove_card_runs'] = 0
                    if any(a.get('Type') == 'Remove' for a in actions_at_station):
                        node_details_stats[char_type][node_details_key]['remove_card_runs'] += 1

                    if 'upgrade_card_runs' not in node_details_stats[char_type][node_details_key]:
                        node_details_stats[char_type][node_details_key]['upgrade_card_runs'] = 0
                    if any(a.get('Type') == 'Upgrade' for a in actions_at_station):
                        node_details_stats[char_type][node_details_key]['upgrade_card_runs'] += 1

            if station_type in ['Shop', 'Gap', 'Adventure', 'Supply', 'Boss', 'Enemy', 'EliteEnemy', 'Trade', 'Entry']:
                if act is not None and level is not None:
                    node_details_key = (act, level, station_type)
                    card_actions_at_station = [a for a in cards_log if a.get('Station') == i]
                    for action in card_actions_at_station:
                        action_type = action.get('Type')
                        if action_type in ['Add', 'Remove', 'Upgrade']:
                            item_id = cfg.normalize_card_id(action.get('Id'))
                            if not item_id: continue
                            event_key = f"{action_type}_Card"
                            event_action_stats[char_type][node_details_key][event_key][item_id] += 1

                    exhibit_actions_at_station = [a for a in exhibits_log if a.get('Station') == i]
                    for action in exhibit_actions_at_station:
                        action_type = action.get('Type')
                        if action_type in ['Add', 'Remove', 'Upgrade']:
                            item_id = action.get('Id')
                            if not item_id: continue
                            event_key = f"{action_type}_Exhibit"
                            event_action_stats[char_type][node_details_key][event_key][item_id] += 1

            hp_before_fight = current_hp
            money_before_event = current_money
            power_before_fight = current_power

    # --- Step 3: パフォーマンススコアの計算 ---
    print("\nStep 3: Calculating performance deviation scores...")
    final_reports_by_char = defaultdict(list)
    for char_type, acts_data in analysis_data.items():
        for act, combat_types_data in acts_data.items():
            for combat_type, cards_data in combat_types_data.items():
                impact_scores = []
                min_count = MIN_FIGHT_COUNTS.get(combat_type, 30)
                for card_id, data in cards_data.items():
                    with_data, without_data = data['with_card'], data['without_card']
                    if len(with_data['turn_list']) < min_count or len(without_data['turn_list']) < min_count:
                        continue
                    turn_impact = np.mean(without_data['turn_list']) - np.mean(with_data['turn_list'])
                    hp_loss_impact = np.mean(without_data['hp_loss_list']) - np.mean(with_data['hp_loss_list'])
                    impact_scores.append({
                        'card_id': card_id, 'turn_impact': turn_impact, 'hp_loss_impact': hp_loss_impact,
                        'fights_with': len(with_data['turn_list']), 'fights_without': len(without_data['turn_list'])
                    })
                if not impact_scores: continue
                df_impact = pd.DataFrame(impact_scores)
                mean_turn_impact, std_turn_impact = df_impact['turn_impact'].mean(), df_impact['turn_impact'].std()
                mean_hp_loss_impact, std_hp_loss_impact = df_impact['hp_loss_impact'].mean(), df_impact[
                    'hp_loss_impact'].std()
                for score in impact_scores:
                    turn_dev = 50 + 10 * (score[
                                              'turn_impact'] - mean_turn_impact) / std_turn_impact if std_turn_impact > 0 else 50
                    hp_loss_dev = 50 + 10 * (score[
                                                 'hp_loss_impact'] - mean_hp_loss_impact) / std_hp_loss_impact if std_hp_loss_impact > 0 else 50
                    final_reports_by_char[char_type].append({
                        'Character': char_type, 'Act': act, 'Combat_Type': combat_type,
                        'Card_ID': score['card_id'],
                        'Card_Name': cfg.cards_dict.get(score['card_id'], {}).get('JA', score['card_id']),
                        'Overall_Deviation': (turn_dev + hp_loss_dev) / 2,
                        'Turn_Deviation': turn_dev, 'HP_Deviation': hp_loss_dev,
                        'Fights_With': score['fights_with']
                    })

    # --- Step 4: 全てのデータを集約してDataFrameを構築 ---
    print("\nStep 4: Aggregating all calculated data...")
    all_final_records = [item for sublist in final_reports_by_char.values() for item in sublist]
    if not all_final_records:
        print("\n--- PROCESSING FINISHED: No card data met the minimum fight count criteria. ---")
        return None

    all_records_df = pd.DataFrame(all_final_records)

    stability_df = generate_stability_report(all_records_df)
    attack_defense_df = generate_attack_defense_report(all_records_df)
    total_fights_df = all_records_df.groupby(['Character', 'Card_Name'])['Fights_With'].sum().reset_index()
    total_fights_df.rename(columns={'Fights_With': 'Total_Fights_With'}, inplace=True)

    def q1(x):
        return x.quantile(0.25)

    def median(x):
        return x.quantile(0.5)

    def q3(x):
        return x.quantile(0.75)

    perf_dist_df = all_records_df.groupby(['Character', 'Card_Name']).agg(
        Turn_Min=('Turn_Deviation', 'min'), Turn_Q1=('Turn_Deviation', q1), Turn_Median=('Turn_Deviation', median),
        Turn_Q3=('Turn_Deviation', q3), Turn_Max=('Turn_Deviation', 'max'), Std_Dev_Turn=('Turn_Deviation', 'std'),
        HP_Min=('HP_Deviation', 'min'), HP_Q1=('HP_Deviation', q1), HP_Median=('HP_Deviation', median),
        HP_Q3=('HP_Deviation', q3), HP_Max=('HP_Deviation', 'max'), Std_Dev_HP=('HP_Deviation', 'std')
    ).reset_index()
    act_perf_df = all_records_df.groupby(['Character', 'Card_Name', 'Act']).agg(
        Act_Turn_Perf=('Turn_Deviation', 'mean'), Act_HP_Perf=('HP_Deviation', 'mean')
    ).reset_index()
    act_turn_pivot = act_perf_df.pivot_table(index=['Character', 'Card_Name'], columns='Act',
                                             values='Act_Turn_Perf').add_prefix('Turn_Act_')
    act_hp_pivot = act_perf_df.pivot_table(index=['Character', 'Card_Name'], columns='Act',
                                           values='Act_HP_Perf').add_prefix('HP_Act_')
    act_performance_df = pd.merge(act_turn_pivot, act_hp_pivot, on=['Character', 'Card_Name'],
                                  how='outer').reset_index()

    co_occurrence_df_global = generate_global_co_occurrence_report(co_occurrence_counts_global,
                                                                   total_fights_unfiltered_global)

    adoption_records = []
    for (char_type, card_id), stats in card_adoption_stats.items():
        total_runs = total_run_counts.get(char_type, 0)
        if total_runs == 0: continue
        adoption_rate = stats['runs_with_card'] / total_runs
        avg_ug_rate = stats['upgraded_copies'] / stats['total_copies'] if stats['total_copies'] > 0 else 0
        avg_copies = stats['total_copies'] / stats['runs_with_card'] if stats['runs_with_card'] > 0 else 0
        adoption_records.append({
            'Character': char_type,
            'Card_ID': card_id,
            'Adoption_Rate': adoption_rate,
            'Avg_Upgrade_Rate': avg_ug_rate,
            'Avg_Copies': avg_copies
        })
    adoption_df = pd.DataFrame(adoption_records)
    card_id_to_name = all_records_df[['Card_ID', 'Card_Name']].drop_duplicates().set_index('Card_ID')
    adoption_df = adoption_df.merge(card_id_to_name, on='Card_ID', how='left')

    aggregated_df = pd.merge(attack_defense_df, stability_df, on=['Character', 'Card_Name'], how='left')
    aggregated_df = pd.merge(aggregated_df, total_fights_df, on=['Character', 'Card_Name'], how='left')
    aggregated_df = pd.merge(aggregated_df, perf_dist_df, on=['Character', 'Card_Name'], how='left')
    aggregated_df = pd.merge(aggregated_df, act_performance_df, on=['Character', 'Card_Name'], how='left')
    aggregated_df = pd.merge(aggregated_df, adoption_df.drop(columns=['Card_ID']), on=['Character', 'Card_Name'],
                             how='left')
    if not co_occurrence_df_global.empty:
        aggregated_df = pd.merge(aggregated_df, co_occurrence_df_global, on=['Character', 'Card_Name'], how='left')

    aggregated_df['Turn_Tendency'] = 3 * (aggregated_df['Weighted_Avg_Turn_Deviation'] - aggregated_df['Turn_Median']) / \
                                     aggregated_df['Std_Dev_Turn'].replace(0, np.nan)
    aggregated_df['HP_Tendency'] = 3 * (aggregated_df['Weighted_Avg_HP_Deviation'] - aggregated_df['HP_Median']) / \
                                   aggregated_df['Std_Dev_HP'].replace(0, np.nan)
    aggregated_df.replace([np.inf, -np.inf], np.nan, inplace=True)
    aggregated_df.fillna(0, inplace=True)

    situational_df = pd.merge(all_records_df, stability_df, on=['Character', 'Card_Name'], how='left')

    def get_situational_co_occurrence(row):
        char, act, combat_type, card_id = row['Character'], row['Act'], row['Combat_Type'], row['Card_ID']
        co_cards = co_occurrence_counts_situational.get(char, {}).get(act, {}).get(combat_type, {}).get(card_id, {})
        total_fights = total_fights_unfiltered_situational.get(char, {}).get(act, {}).get(combat_type, {}).get(card_id,
                                                                                                               0)
        if not co_cards or total_fights == 0: return ""
        sorted_co_cards = sorted(co_cards.items(), key=lambda item: item[1], reverse=True)
        top_20_list = [f"{cfg.cards_dict.get(co_id, {}).get('JA', co_id)} ({(count / total_fights) * 100:.1f}%)" for
                       co_id, count in sorted_co_cards[:20]]
        return "<br>".join(top_20_list)

    situational_df['Top_20_Co_occurrence'] = situational_df.apply(get_situational_co_occurrence, axis=1)

    # --- Step 5: 展示品、ルート、イベント、敵戦闘データの最終処理 ---
    print("\nStep 5: Finalizing dashboard-specific data...")

    exhibit_properties = parse_exhibit_config(cfg.EXHIBIT_CONFIG_TXT)
    all_exhibits = []
    for exhibit_id, details in cfg.exhibits_dict.items():
        if details.get('Category') == 'Treasure':
            continue
        all_exhibits.append({
            'Exhibit_ID': exhibit_id,
            'JA': details.get('JA', exhibit_id),
            'EN': details.get('EN', exhibit_id)
        })

    master_exhibits_df = pd.DataFrame(all_exhibits)
    prop_df = pd.DataFrame.from_dict(exhibit_properties, orient='index').reset_index().rename(
        columns={'index': 'Exhibit_ID'})

    master_exhibits_df = pd.merge(master_exhibits_df, prop_df, on='Exhibit_ID', how='left')

    rarity_from_json = master_exhibits_df['Exhibit_ID'].map(cfg.EXHIBIT_RARITY_MAP)

    if 'Rarity' in master_exhibits_df.columns:
        master_exhibits_df['Rarity'] = rarity_from_json.combine_first(master_exhibits_df['Rarity'])
    else:
        master_exhibits_df['Rarity'] = rarity_from_json

    def get_new_display_category(row):
        rarity = str(row.get('Rarity', '')).capitalize()
        appearance = str(row.get('Appearance', ''))
        is_pooled = row.get('IsPooled')

        if rarity == 'Shining':
            return '光耀'
        if appearance == 'ShopOnly':
            return 'ショップ'
        if is_pooled is False:
            return 'イベント'
        if appearance == 'Anywhere' and is_pooled is True:
            if rarity == 'Rare':
                return '一般レア'
            elif rarity == 'Uncommon':
                return '一般アンコモン'
            elif rarity == 'Common':
                return '一般コモン'
        return 'イベント'

    master_exhibits_df['Display_Category'] = master_exhibits_df.apply(get_new_display_category, axis=1)

    adoption_records = []
    for (char_type, exhibit_id), stats in exhibit_adoption_stats.items():
        total_runs = total_run_counts.get(char_type, 1)
        adoption_records.append({
            'Character': char_type,
            'Exhibit_ID': exhibit_id,
            'Adoption_Rate': stats['runs_with_exhibit'] / total_runs
        })
    adoption_df = pd.DataFrame(adoption_records)

    final_exhibit_list = []
    for char in total_run_counts.keys():
        char_master_df = master_exhibits_df.copy()
        char_master_df['Character'] = char
        char_adoption_df = adoption_df[adoption_df['Character'] == char]
        merged_df = pd.merge(char_master_df, char_adoption_df[['Exhibit_ID', 'Adoption_Rate']], on='Exhibit_ID',
                             how='left')
        merged_df['Adoption_Rate'] = merged_df['Adoption_Rate'].fillna(0)
        final_exhibit_list.append(merged_df)

    exhibits_df = pd.concat(final_exhibit_list, ignore_index=True) if final_exhibit_list else pd.DataFrame()

    event_top10_lists = defaultdict(lambda: defaultdict(dict))
    for char_type, node_events in event_action_stats.items():
        for node_key, event_map in node_events.items():
            processed_node_events = {}
            for event_key, items in event_map.items():
                sorted_items = sorted(items.items(), key=lambda x: x[1], reverse=True)[:10]
                processed_node_events[event_key] = sorted_items
            event_top10_lists[char_type][node_key] = processed_node_events

    act_wide_scales = defaultdict(dict)
    for char, nodes in node_details_stats.items():
        for act_num in range(1, 5):
            act_wide_scales[char][act_num] = {
                'all_turns': [], 'all_hp_loss': [], 'all_p_change': []
            }
        for (act, level, node_type), details in nodes.items():
            if node_type in ['Enemy', 'EliteEnemy', 'Boss']:
                enemy_details = details.get('enemies', {})
                if enemy_details:
                    for enemy_id, stats in enemy_details.items():
                        act_wide_scales[char][act]['all_turns'].extend(stats['turns'])
                        act_wide_scales[char][act]['all_hp_loss'].extend(stats['hp_loss'])
                        act_wide_scales[char][act]['all_p_change'].extend(stats['p_change'])

    for char, acts_data in act_wide_scales.items():
        for act_num, data_lists in acts_data.items():
            all_turns = data_lists['all_turns']
            all_hp_loss = data_lists['all_hp_loss']
            all_p_change = data_lists['all_p_change']

            data_lists['turns_min'] = min(all_turns) if all_turns else 0
            data_lists['turns_max'] = max(all_turns) if all_turns else 1
            data_lists['hp_loss_min'] = min(all_hp_loss) if all_hp_loss else 0
            data_lists['hp_loss_max'] = max(all_hp_loss) if all_hp_loss else 1
            data_lists['p_change_min'] = min(all_p_change) if all_p_change else 0
            data_lists['p_change_max'] = max(all_p_change) if all_p_change else 1
            del data_lists['all_turns'], data_lists['all_hp_loss'], data_lists['all_p_change']

    node_details_processed = defaultdict(dict)
    for char, nodes in node_details_stats.items():
        for (act, level, node_type), details in nodes.items():
            node_key = (act, level, node_type)
            total_visits = node_selection_stats.get(char, {}).get((act, level), {}).get(node_type, 1)
            processed_details = {}
            if node_type in ['Enemy', 'EliteEnemy', 'Boss']:
                enemy_details = details.get('enemies', {})
                if enemy_details:
                    processed_details['enemies'] = {}
                    processed_details['scales'] = act_wide_scales.get(char, {}).get(act, {})

                    for enemy_id, stats in enemy_details.items():
                        enemy_name_ja = " & ".join(translated_enemy_groups.get(enemy_id, {}).get('ja', [enemy_id]))
                        enemy_name_en = " & ".join(translated_enemy_groups.get(enemy_id, {}).get('en', [enemy_id]))
                        count = len(stats['turns'])

                        turns_boxplot = _calculate_boxplot_stats(stats['turns'])
                        hp_loss_boxplot = _calculate_boxplot_stats(stats['hp_loss'])
                        p_change_boxplot = _calculate_boxplot_stats(stats['p_change'])

                        processed_details['enemies'][enemy_id] = {
                            'ja': enemy_name_ja,
                            'en': enemy_name_en,
                            'rate': count / total_visits,
                            'avg_turns': np.mean(stats['turns']) if stats['turns'] else 0,
                            'avg_hp_loss': np.mean(stats['hp_loss']) if stats['hp_loss'] else 0,
                            'avg_p_change': np.mean(stats['p_change']) if stats['p_change'] else 0,
                            'turns_boxplot': turns_boxplot,
                            'hp_loss_boxplot': hp_loss_boxplot,
                            'p_change_boxplot': p_change_boxplot
                        }
            elif node_type == 'Gap':
                choice_details = details.get('choices', {})
                if choice_details:
                    processed_details['choices'] = {}
                    for choice, count in choice_details.items():
                        processed_details['choices'][choice] = {'rate': count / total_visits}
            elif node_type == 'Shop':
                processed_details['remove_card_rate'] = details.get('remove_card_runs', 0) / total_visits
                processed_details['upgrade_card_rate'] = details.get('upgrade_card_runs', 0) / total_visits
                money_list = details.get('money_list', [])
                if money_list:
                    s = pd.Series(money_list)
                    processed_details['money_stats'] = {
                        'mean': s.mean(),
                        'q1': s.quantile(0.25),
                        'q2': s.quantile(0.50),
                        'q3': s.quantile(0.75),
                    }
            node_details_processed[char][node_key] = processed_details

    enemy_summary_records = []
    for char, acts in enemy_encounter_raw_data.items():
        for act, enemies in acts.items():
            for enemy_id, data in enemies.items():
                count = len(data['turns'])
                if count == 0: continue
                enemy_name_ja = " & ".join(translated_enemy_groups.get(enemy_id, {}).get('ja', [enemy_id]))
                enemy_name_en = " & ".join(translated_enemy_groups.get(enemy_id, {}).get('en', [enemy_id]))

                turns_boxplot = _calculate_boxplot_stats(data['turns'])
                hp_loss_boxplot = _calculate_boxplot_stats(data['hp_loss'])
                p_change_boxplot = _calculate_boxplot_stats(data['p_change'])

                enemy_summary_records.append({
                    'Character': char,
                    'Act': act,
                    'EnemyId': enemy_id,
                    'Type': data.get('type', 'Enemy'),
                    'MinLevel': min(data['levels']) if data.get('levels') else 99,
                    'EnemyName_JA': enemy_name_ja,
                    'EnemyName_EN': enemy_name_en,
                    'Encounters': count,
                    'Avg_Turns': np.mean(data['turns']),
                    'Avg_HP_Loss': np.mean(data['hp_loss']),
                    'Avg_P_Change': np.mean(data['p_change']),
                    'TurnsBoxplot': turns_boxplot,
                    'HpLossBoxplot': hp_loss_boxplot,
                    'PChangeBoxplot': p_change_boxplot,
                })
    enemy_encounter_summary_df = pd.DataFrame(enemy_summary_records)

    route_event_data = {
        'node_selection': node_selection_stats,
        'event_actions': event_top10_lists,
        'node_details': node_details_processed,
        'total_runs': total_run_counts
    }

    print(f"\nSkipped {anomaly_run_count} runs due to anomalous stat gains.")
    print("--- Dashboard Data Processing Finished ---")
    return {
        "aggregated_df": aggregated_df,
        "situational_df": situational_df,
        "exhibits_df": exhibits_df,
        "route_event_data": route_event_data,
        "enemy_encounter_summary_df": enemy_encounter_summary_df
    }


# data_processor2.py の一番下の if __name__ == '__main__': ブロックをこれで置き換えてください

if __name__ == '__main__':
    import json
    from pathlib import Path

    print("Running data processor to generate dashboard files for web...")
    start = time.perf_counter()

    # 1. 全キャラクターのデータを一度に生成
    combined_data = get_processed_card_data()

    if not combined_data:
        print("No data was generated. Exiting.")
        exit()

    # 出力先ディレクトリをプロジェクトルートからの相対パスで指定
    output_dir = Path("card_effectiveness_reports/data")
    output_dir.mkdir(parents=True, exist_ok=True)
    print(f"Output directory: {output_dir.resolve()}")

    # 2. 全てのキャラクターのリストを取得
    all_chars = sorted(list(combined_data["aggregated_df"]["Character"].unique()))
    print(f"Found characters: {', '.join(all_chars)}")

    # 3. キャラクターごとにデータを分割してJSONファイルとして保存
    for char in all_chars:
        print(f"  Processing data for {char}...")

        # JavaScriptが期待するデータ構造を構築
        char_dashboard_data = {}

        # --- DataFrameをフィルタリングし、キーの名前を変更して格納 ---
        # agg_data_for_graph と agg_data_full は同じデータでOK
        agg_df_char = combined_data["aggregated_df"][combined_data["aggregated_df"]['Character'] == char]
        char_dashboard_data["agg_data_for_graph"] = agg_df_char.to_dict('records')
        char_dashboard_data["agg_data_full"] = agg_df_char.to_dict('records')

        # situational_df -> sit_data
        sit_df_char = combined_data["situational_df"][combined_data["situational_df"]['Character'] == char]
        char_dashboard_data["sit_data"] = sit_df_char.to_dict('records')

        # exhibits_df -> exhibit_data
        exhibit_df_char = combined_data["exhibits_df"][combined_data["exhibits_df"]['Character'] == char]
        char_dashboard_data["exhibit_data"] = exhibit_df_char.to_dict('records')

        # enemy_encounter_summary_df -> enemy_data
        enemy_df_char = combined_data["enemy_encounter_summary_df"][combined_data["enemy_encounter_summary_df"]['Character'] == char]
        char_dashboard_data["enemy_data"] = enemy_df_char.to_dict('records')

        # --- route_event_data -> route_data ---
        route_data_source = combined_data.get("route_event_data", {})
        char_dashboard_data["route_data"] = {
            'node_selection': route_data_source.get('node_selection', {}).get(char, {}),
            'event_actions': route_data_source.get('event_actions', {}).get(char, {}),
            'node_details': route_data_source.get('node_details', {}).get(char, {}),
            'total_runs': route_data_source.get('total_runs', {}).get(char, 0)
        }

        # --- JavaScriptが必要とする追加情報を生成 ---
        # metadata
        char_dashboard_data["metadata"] = {
            "character": char,
            "version": "2.0", # バージョンはここでハードコードするか、動的に取得
            "ordered_situations": sorted(list(sit_df_char.groupby(['Act', 'Combat_Type']).groups.keys()), key=lambda x: (x[0], x[1]))
        }

        # all_available_characters
        char_dashboard_data["all_available_characters"] = all_chars

        # lookup_tables (カード名や展示品名の参照用)
        char_dashboard_data["lookup_tables"] = {
            "cards": cfg.cards_dict,
            "exhibits": cfg.exhibits_dict,
            "exhibit_mana_map": {
                "YinYangOrb": "YinYang", "Moneybag": "YinYang", "MagicBroom": "Magic",
                "MikoCoin": "Faith", "HakureiAmulet": "Faith", "MoriyaAmulet": "Faith",
                "RedShooter": "Magic", "BlueShooter": "Magic", "GreenShooter": "Magic",
                "GrudgeCannon": "YinYang"
            },
            "mana_icon_map": {
                "YinYang": "☯️", "Magic": "⭐", "Faith": "⛩️"
            }
        }

        # --- ファイルに保存 ---
        output_path = output_dir / f"{char}_data.json"
        with open(output_path, 'w', encoding='utf-8') as f:
            # ファイルサイズ削減のため、インデントなしで保存
            json.dump(char_dashboard_data, f, ensure_ascii=False, separators=(',', ':'))

        print(f"    -> Saved to {output_path}")

    end = time.perf_counter()
    print(f"\nTotal data processing and file generation time: {(end - start):.2f} seconds")

