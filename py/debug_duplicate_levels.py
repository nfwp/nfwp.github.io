# debug_duplicate_levels.py

import time

try:
    import analyze_lbol_logs_mod2 as cfg
except ImportError:
    print("エラー: 'analyze_lbol_logs_mod2.py' が見つかりません。同じディレクトリに配置してください。")
    exit()


def find_duplicate_level_runs():
    """
    1回のランの中で、同じ(Act, Level)の組み合わせが複数回出現するランを特定する。
    """
    print("--- Searching for runs with duplicate level entries ---")

    # data_processor2.py と同じフィルタリング条件を適用
    anomaly_run_count = 0
    HP_GAIN_THRESHOLD = 100
    POWER_GAIN_THRESHOLD = 500
    MONEY_GAIN_THRESHOLD = 900

    # ストリーミングで全ランを処理
    for run_id, run_data in cfg.stream_json_runs(cfg.ALL_RUN_JSON):
        # --- data_processor2.py と同じ基本的なフィルタリング ---
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
        stations = run_data.get('Stations', [])
        if not stations: continue

        # --- data_processor2.py と同じ異常値除外処理 ---
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
        # --- フィルタリングここまで ---

        # このランの中で既に通過したレベルを記録するセット
        seen_levels_in_run = set()

        # このランの全マスをチェック
        for station in stations:
            act = station.get('Node', {}).get('Act')
            level = station.get('Node', {}).get('Level')

            if act is not None and level is not None:
                node_key = (act, level)

                # もし既にこのレベルを通過済みなら、問題のランとしてIDを出力
                if node_key in seen_levels_in_run:
                    print(f"--- Duplicate Level Found! ---")
                    print(f"Run ID: {run_id}")
                    print(f"Duplicate (Act, Level): {node_key}")
                    print("--------------------------\n")
                else:
                    # 初めて通過するレベルならセットに追加
                    seen_levels_in_run.add(node_key)

    print(f"--- Search Complete ---")
    print(f"(Skipped {anomaly_run_count} runs due to anomalous stat gains during search)")


if __name__ == '__main__':
    start = time.perf_counter()
    find_duplicate_level_runs()
    end = time.perf_counter()
    print(f"\nTotal execution time: {(end - start):.2f} seconds")
