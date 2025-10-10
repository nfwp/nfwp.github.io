# analyze_lbol_logs_mod2.py

import json
import os
import pickle
import subprocess
import gzip
import ijson

# --- 定数定義 ---
# ご自身の環境に合わせてMAIN_DIRのパスを設定してください
# 例: "C:/Users/YourUser/Documents/lbol_analysis"
MAIN_DIR = "T:/run_logs_test_ver2"

LOGS_DIR = os.path.join(MAIN_DIR, "logs")
DATA_DIR = os.path.join(MAIN_DIR, "data")

ALL_RUN_JSON = os.path.join(DATA_DIR, "all_run.gz")
CARDS_PKL = os.path.join(MAIN_DIR, "pkl_files", 'cards.pkl')
EXHIBITS_PKL = os.path.join(MAIN_DIR, "pkl_files", 'exhibits.pkl')
EXHIBIT_CONFIG_TXT = os.path.join(MAIN_DIR, "other_config", "ExhibitConfig.txt")

# --- 敵情報 ---
ENEMY_GROUP_JSON = os.path.join(MAIN_DIR, "assets/configs/1.7.2/enemyGroups.json")
ENEMY_NAME_JSON = os.path.join(MAIN_DIR, "assets/locales/ja/units.json")
ENEMY_NAME_EN_JSON = os.path.join(MAIN_DIR, "assets/locales/en/units.json")

EXHIBITS_DATA_JSON = os.path.join(MAIN_DIR, "assets/configs/1.7.2/exhibits.json")

# --- フィルター設定 ---
REPO_URL = "https://github.com/lbol-logs/logs"
TARGET_PULL_VERSIONS = ["1.6.0", "1.6.1", "1.7.0", '1.7.1', '1.7.2']
SKIP_PLAYER = {'Sophie'}

CHARACTER_CONFIG = {
    'Reimu': {'Version': TARGET_PULL_VERSIONS},
    'Marisa': {'Version': TARGET_PULL_VERSIONS},
    'Sakuya': {'Version': TARGET_PULL_VERSIONS},
    'Cirno': {'Version': TARGET_PULL_VERSIONS},
    'Koishi': {'Version': ["1.6.1", "1.7.0", "1.7.1", "1.7.2"]},
}

# カードIDのエイリアス
CARD_ID_ALIASES = {
    'ShinningPotion': 'ShiningPotion',
}

# ★★★ マナの色とアイコンの対応表を追加 ★★★
MANA_ICON_MAP = {
    'B': '🟣',  # 紫
    'R': '🔴',  # 赤
    'U': '🔵',  # 青
    'W': '🟡',  # 白 (ご要望により黄色アイコン)
    'G': '🟢',  # 緑
    'P': '🌈',  # 虹
    'C': '🔘',  # 無
    'CC': '🔘',  # 無 (2マナ)
    'A': '❓'  # ランダム
}


# --- 共通関数 ---

def normalize_card_id(card_id):
    """古いカードIDや別名のIDを、現在の正しいIDに正規化する。"""
    return CARD_ID_ALIASES.get(card_id, card_id)

def is_gzip_file(file_path):
    """ファイルがgzip形式かどうかを判定"""
    try:
        with open(file_path, 'rb') as f:
            return f.read(2) == b'\x1f\x8b'
    except FileNotFoundError:
        return False

def read_pkl(file_path):
    """pickleファイルを読み込み、辞書データを返す（gzipかどうかを自動判定）"""
    if not os.path.exists(file_path):
        print(f"Error: Pickle file not found at {file_path}")
        return {}
    if is_gzip_file(file_path):
        with gzip.open(file_path, 'rb') as gz_file:
            loaded_dict = pickle.load(gz_file)
    else:
        with open(file_path, "rb") as file:
            loaded_dict = pickle.load(file)
    return loaded_dict

def json_to_dict(file_path):
    """JSONファイルを読み込み、辞書として返す（gzipかどうかを自動判定）"""
    try:
        if not os.path.exists(file_path):
            print(f"Error: JSON file not found at {file_path}")
            return {}
        if is_gzip_file(file_path):
            with gzip.open(file_path, 'rt', encoding="utf-8-sig") as gz_file:
                return json.load(gz_file)
        else:
            with open(file_path, 'r', encoding="utf-8-sig") as json_file:
                return json.load(json_file)
    except (json.JSONDecodeError, FileNotFoundError) as e:
        print(f"Error reading JSON file {file_path}: {e}")
        return {}

def translate_enemy_groups(enemy_groups, ja_names_map, en_names_map):
    """敵グループの辞書内のIDを、日本語と英語の名前に置換する。"""
    def _get_name(enemy_id, name_map):
        name_data = name_map.get(enemy_id)
        if isinstance(name_data, dict):
            return name_data.get('Name', enemy_id)
        elif isinstance(name_data, str):
            return name_data
        else:
            return enemy_id

    translated_groups = {}
    for group_id, enemy_id_list in enemy_groups.items():
        ja_name_list = [_get_name(eid, ja_names_map) for eid in enemy_id_list]
        en_name_list = [_get_name(eid, en_names_map) for eid in enemy_id_list]
        translated_groups[group_id] = {'ja': ja_name_list, 'en': en_name_list}
    return translated_groups

def stream_json_runs(file_path):
    """巨大なgzip圧縮されたJSONファイルをストリーミングで読み込み、1ランずつyieldするジェネレータ。"""
    print("Streaming runs from gzipped JSON file...")
    if not os.path.exists(file_path):
        print(f"Warning: {file_path} not found. Skipping streaming.")
        return
    with gzip.open(file_path, 'rt', encoding="utf-8-sig") as gz_file:
        yield from ijson.kvitems(gz_file, '')

# ★★★ Gitリポジトリを更新する関数を復活 ★★★
def setup_repository():
    """
    lbol-logs/logs リポジトリをクローンまたはプル(更新)します。
    指定されたバージョンのログのみを対象とするスパースチェックアウトを利用して高速化します。
    """
    sparse_checkout_paths = [f"{v}/" for v in TARGET_PULL_VERSIONS]

    try:
        if os.path.exists(os.path.join(LOGS_DIR, '.git')):
            print(f"Updating repository at {LOGS_DIR}...")
            dirs_to_show = ', '.join([f"'{p}'" for p in sparse_checkout_paths])
            print(f"(Focusing on updates in {dirs_to_show} directories...)")

            command = ["git", "-C", LOGS_DIR, "sparse-checkout", "set"] + sparse_checkout_paths
            subprocess.run(command, check=True, capture_output=True, text=True)
            subprocess.run(["git", "-C", LOGS_DIR, "reset", "--hard"], check=True, capture_output=True, text=True)
            subprocess.run(["git", "-C", LOGS_DIR, "pull"], check=True, capture_output=True, text=True)
            print("Repository updated successfully.")
        else:
            print(f"Cloning repository into {LOGS_DIR} using sparse-checkout...")
            dirs_to_show = ', '.join([f"'{p}'" for p in sparse_checkout_paths])
            print(f"(Only {dirs_to_show} will be downloaded, this will be much faster.)")

            subprocess.run(["git", "clone", "--filter=blob:none", "--no-checkout", REPO_URL, LOGS_DIR], check=True, capture_output=True, text=True)
            subprocess.run(["git", "-C", LOGS_DIR, "sparse-checkout", "init", "--cone"], check=True, capture_output=True, text=True)
            command = ["git", "-C", LOGS_DIR, "sparse-checkout", "set"] + sparse_checkout_paths
            subprocess.run(command, check=True, capture_output=True, text=True)
            subprocess.run(["git", "-C", LOGS_DIR, "checkout"], check=True, capture_output=True, text=True)
            print("Clone complete.")

    except subprocess.CalledProcessError as e:
        error_message = e.stderr.strip()
        print(f"--- Git Command Error ---")
        print(f"Failed to setup repository at: {LOGS_DIR}")
        print(f"Command: {' '.join(e.cmd)}")
        print(f"Error Message from Git: {error_message}")
        print("-------------------------")
        print("Please check your internet connection, Git installation, and repository permissions.")
        exit(1)
    except Exception as e:
        print(f"An unexpected error occurred during repository setup: {e}")
        exit(1)


# ★★★ exhibits.json からマナとレアリティの情報を生成する関数 ★★★
def create_exhibit_property_maps(exhibits_json_data):
    """exhibits.jsonからマナ情報とレアリティ情報の辞書を生成する"""
    mana_map = {}
    rarity_map = {}
    if not exhibits_json_data:
        return mana_map, rarity_map
    for exhibit_id, data in exhibits_json_data.items():
        if "BaseMana" in data:
            mana_map[exhibit_id] = data["BaseMana"]
        if "Rarity" in data:
            rarity_map[exhibit_id] = data["Rarity"]
    return mana_map, rarity_map


# --- グローバルスコープで読み込むデータ ---
cards_dict = read_pkl(CARDS_PKL)
exhibits_dict = read_pkl(EXHIBITS_PKL)

# ★★★ exhibits.json からマナとレアリティの情報をロード ★★★
exhibits_data = json_to_dict(EXHIBITS_DATA_JSON)
EXHIBIT_MANA_MAP, EXHIBIT_RARITY_MAP = create_exhibit_property_maps(exhibits_data)


if __name__ == "__main__":
    print("This script is a module for configuration and utility functions.")
    print("To update logs and create the combined log file, run 'create_combined_log.py'.")
    print("To generate interactive reports, run 'interactive_visualizer.py'.")