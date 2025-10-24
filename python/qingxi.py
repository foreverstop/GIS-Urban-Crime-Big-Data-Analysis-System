import pandas as pd
import os
import json
import uuid
from logging_config import logger
from typing import Union # <--- ADDED THIS LINE

# 一致的列名
TIME_COLUMN_NAME = '发生时间' # 在 preprocess_crime_data 中重命名 'START_DATE' 后的名称
OFFENSE_COLUMN_NAME = 'OFFENSE'

def load_and_combine_yearly_data(data_folder_path: str, start_year: int, end_year: int) -> pd.DataFrame:
    """
    加载并合并年度犯罪数据 GeoJSON 文件，并提取经纬度信息。
    （此函数与您提供的代码相比没有更改，假设其按预期工作）
    """
    logger.info(f"开始加载数据: 文件夹='{data_folder_path}', 年份范围={start_year}-{end_year}")

    if not os.path.isdir(data_folder_path):
        logger.error(f"数据文件夹未找到: {data_folder_path}")
        raise FileNotFoundError(f"数据文件夹不存在: {data_folder_path}")

    if start_year > end_year:
        logger.error(f"无效的年份范围: 开始年份 {start_year} 大于结束年份 {end_year}。")
        raise ValueError(f"开始年份 ({start_year}) 不能大于结束年份 ({end_year})。")

    all_records = []
    for year in range(start_year, end_year + 1):
        file_name = f'Crime_Incidents_in_{year}.json'
        file_path = os.path.join(data_folder_path, file_name)

        if not os.path.exists(file_path):
            logger.warning(f"年份 {year} 的数据文件未找到: {file_path}。跳过此年份。")
            continue

        try:
            logger.debug(f"正在从 {file_path} 加载年份 {year} 的数据...")
            with open(file_path, 'r', encoding='utf-8') as f:
                data_json = json.load(f)

            features = data_json.get('features', [])
            if not features:
                logger.warning(f"在文件 {file_path} (年份 {year}) 中未找到 'features'。")
                continue

            count_for_year = 0
            for feature in features:
                record = feature.get('properties', {})

                geometry = feature.get('geometry', {})
                if geometry and isinstance(geometry, dict) and geometry.get('type') == 'Point':
                    coordinates = geometry.get('coordinates')
                    if coordinates and isinstance(coordinates, list) and len(coordinates) == 2:
                        record['longitude'] = coordinates[0]
                        record['latitude'] = coordinates[1]
                    else:
                        logger.debug(f"文件 {file_path} 中 feature 的 geometry.coordinates 格式不正确或缺失。")
                else:
                    logger.debug(f"文件 {file_path} 中 feature 的 geometry 不是有效的 Point 类型或缺失。")

                all_records.append(record)
                count_for_year += 1
            logger.info(f"成功从 {file_path} 为年份 {year} 加载了 {count_for_year} 条记录 (尝试提取经纬度)。")

        except json.JSONDecodeError as e:
            logger.error(f"解码文件 {file_path} (年份 {year}) 的 JSON 时出错: {e}", exc_info=True)
        except Exception as e:
            logger.error(f"处理文件 {file_path} (年份 {year}) 时发生意外错误: {e}", exc_info=True)

    if not all_records:
        logger.warning(f"在路径 {data_folder_path} 的 {start_year}-{end_year} 年份范围内未加载到任何记录。")
        return pd.DataFrame()

    try:
        combined_df = pd.DataFrame(all_records)
        logger.info(f"数据加载和合并完成。总共加载记录数: {len(combined_df)}。")
        return combined_df
    except Exception as e:
        logger.error(f"从加载的记录创建 DataFrame 失败: {e}", exc_info=True)
        return pd.DataFrame()


def preprocess_crime_data(combined_df: pd.DataFrame) -> pd.DataFrame:
    """
    预处理合并后的犯罪数据，使用 START_DATE 作为主要时间，
    筛选指定年份范围 (默认2014-2024)，并保留经纬度等指定列。
    (此函数与您提供的代码相比没有更改，假设其正确生成 '发生时间' 和 'OFFENSE' 列)
    """
    logger.info(f"开始为包含 {len(combined_df)} 条记录的 DataFrame 进行预处理 (使用 START_DATE)。")

    if combined_df.empty:
        logger.warning("输入的 DataFrame 为空。跳过预处理。")
        return pd.DataFrame()

    required_date_col = 'START_DATE' # 此列将重命名为 TIME_COLUMN_NAME
    # OFFENSE_COLUMN_NAME 是 'OFFENSE'

    if required_date_col not in combined_df.columns:
        logger.error(f"DataFrame 中未找到关键日期列 '{required_date_col}'。")
        raise ValueError(f"缺少必要的日期列: {required_date_col}")
    if OFFENSE_COLUMN_NAME not in combined_df.columns: # 使用全局常量
        logger.error(f"DataFrame 中未找到关键犯罪描述列 '{OFFENSE_COLUMN_NAME}'。")
        raise ValueError(f"缺少必要的犯罪描述列: {OFFENSE_COLUMN_NAME}")

    logger.debug(f"使用 '{required_date_col}' 作为日期列，'{OFFENSE_COLUMN_NAME}' 作为犯罪描述列。")
    processed_df = combined_df.copy()
    processed_df.rename(columns={required_date_col: TIME_COLUMN_NAME}, inplace=True) # 重命名为 '发生时间'
    logger.debug(f"已将列 '{required_date_col}' 重命名为 '{TIME_COLUMN_NAME}'。")

    try:
        processed_df[TIME_COLUMN_NAME] = pd.to_datetime(processed_df[TIME_COLUMN_NAME], errors='coerce')
        logger.debug(f"已将 '{TIME_COLUMN_NAME}' 列转换为 datetime 对象。")
    except Exception as e:
        logger.error(f"将 '{TIME_COLUMN_NAME}' 转换为 datetime 时出错: {e}", exc_info=True)
        raise ValueError(f"将 '{TIME_COLUMN_NAME}' 列转换为 datetime 对象失败。") from e

    original_rows_before_dropna = len(processed_df)
    processed_df.dropna(subset=[TIME_COLUMN_NAME, OFFENSE_COLUMN_NAME], inplace=True)
    rows_dropped_na = original_rows_before_dropna - len(processed_df)
    if rows_dropped_na > 0:
        logger.info(f"因 '{TIME_COLUMN_NAME}' 或 '{OFFENSE_COLUMN_NAME}' 列数据缺失，已删除 {rows_dropped_na} 行。")

    if processed_df.empty:
        logger.warning("删除包含缺失关键数据的行后，DataFrame 为空。")
        return pd.DataFrame()

    # 根据您原始脚本的输出文件名筛选 2014-2024 年的数据
    # 如果主数据应包含 2025 年，请在此处将 2024 更改为 2025。
    min_year_filter = 2014
    max_year_filter = 2024
    original_rows_before_filter = len(processed_df)
    processed_df = processed_df[
        (processed_df[TIME_COLUMN_NAME].dt.year >= min_year_filter) &
        (processed_df[TIME_COLUMN_NAME].dt.year <= max_year_filter)
    ]
    rows_filtered_by_year = original_rows_before_filter - len(processed_df)
    if rows_filtered_by_year > 0:
        logger.info(f"根据年份范围 ({min_year_filter}-{max_year_filter}) 筛选，已移除 {rows_filtered_by_year} 行。")

    logger.info(f"筛选{min_year_filter}-{max_year_filter}年份后，剩余 {len(processed_df)} 条记录。")

    if processed_df.empty:
        logger.warning(f"按年份 ({min_year_filter}-{max_year_filter}) 筛选后，DataFrame 为空。")
        return pd.DataFrame()

    columns_to_keep_candidates = [
        TIME_COLUMN_NAME,
        OFFENSE_COLUMN_NAME,
        'latitude', 'longitude', 'CCN', 'SHIFT', 'METHOD', 'BLOCK', 'WARD',
    ]
    final_columns = [col for col in columns_to_keep_candidates if col in processed_df.columns]
    missing_desired_cols = set(columns_to_keep_candidates) - set(final_columns)
    if missing_desired_cols:
        logger.warning(f"以下期望保留的列在DataFrame中未找到，将不会被包含: {sorted(list(missing_desired_cols))}")

    try:
        processed_df = processed_df[final_columns]
        logger.debug(f"已筛选并保留列: {final_columns}。")
    except KeyError as e:
        logger.error(f"选择最终列 {final_columns} 失败。错误: {e}", exc_info=True)
        raise ValueError(f"无法选择最终列。错误: {e}") from e

    if TIME_COLUMN_NAME in processed_df.columns:
      processed_df.sort_values(by=TIME_COLUMN_NAME, inplace=True)
      logger.debug(f"DataFrame 已按 '{TIME_COLUMN_NAME}' 排序。")
    else:
      logger.warning(f"'{TIME_COLUMN_NAME}' 列不在最终保留的列中，无法按其排序。")

    logger.info(f"预处理完成。最终 DataFrame 包含 {len(processed_df)} 条记录和 {len(processed_df.columns)} 列。")
    return processed_df

def generate_temp_filtered_data_filename(start_year: int, end_year: int, offenses: list = None, suffix: str = "filtered") -> str:
    """根据筛选条件生成一个标准化的临时文件名。"""
    offense_str_list = []
    if offenses and isinstance(offenses, list) and offenses[0] is not None and offenses[0].upper() != "ALL":
        # 创建一个对文件名安全且唯一的案件类型字符串
        # 确保 offenses 是字符串，并处理列表中可能的 None 值（如果不是按 "ALL" 筛选）
        safe_offenses = [str(o).upper().replace('/', '_').replace(' ', '_') for o in offenses if o]
        offense_str_list = sorted(list(set(safe_offenses))) # 使用 set 保证唯一性

    offense_filename_part = "_".join(offense_str_list) if offense_str_list else "ALL_TYPES"
    # 限制案件类型部分的长度，以避免文件名过长
    offense_filename_part = offense_filename_part[:50]

    # 如果所有其他参数都相同，但触发了新的“处理”操作，则添加一个短的唯一哈希值以区分文件。
    # 但是，为了查找，确定性名称更好。
    # 目前，我们依赖参数来实现确定性。如果前端总是在“train”或“get_actual”之前调用“process”，则此方法有效。
    # unique_hash = uuid.uuid4().hex[:8]
    # return f"temp_{suffix}_{start_year}_{end_year}_{offense_filename_part}_{unique_hash}.csv"
    return f"temp_{suffix}_{start_year}_{end_year}_{offense_filename_part}.csv"

def filter_master_data_to_temp_csv(
    master_csv_path: str,
    temp_training_data_dir: str,
    start_year: int,
    end_year: int,
    offenses: list = None # 期望一个字符串列表，或者 None/空列表表示所有类型，或者 ["ALL"]
) -> tuple[Union[str, None], str, int]: # <--- MODIFIED THIS LINE
    """
    从主CSV文件加载数据，根据年份和案件类型筛选，
    并将结果保存到一个新的临时CSV文件中。
    返回 (临时文件的路径 | None, 消息, 记录数).
    """
    if not os.path.exists(master_csv_path):
        msg = f"主CSV文件未找到: {master_csv_path}"
        logger.error(msg)
        return None, msg, 0

    try:
        df_master = pd.read_csv(master_csv_path)
        logger.info(f"从 '{master_csv_path}' 加载了 {len(df_master)} 条主数据记录。")

        if TIME_COLUMN_NAME not in df_master.columns:
            msg = f"主CSV中未找到日期列 '{TIME_COLUMN_NAME}'。"
            logger.error(msg)
            return None, msg, 0
        df_master[TIME_COLUMN_NAME] = pd.to_datetime(df_master[TIME_COLUMN_NAME], errors='coerce')
        df_master.dropna(subset=[TIME_COLUMN_NAME], inplace=True)

        # 1. 按年份筛选
        df_filtered = df_master[
            (df_master[TIME_COLUMN_NAME].dt.year >= start_year) &
            (df_master[TIME_COLUMN_NAME].dt.year <= end_year)
        ].copy() # 使用 .copy() 以避免稍后的 SettingWithCopyWarning
        logger.info(f"按年份 ({start_year}-{end_year}) 筛选后剩余: {len(df_filtered)} 条记录。")

        # 2. 按案件类型筛选
        # offenses: None 或空列表表示给定年份的所有类型。
        # offenses: ["ALL"] 也表示所有类型。
        # offenses: ["Type1", "Type2"] 表示按这些类型筛选。
        process_offenses = False
        if offenses and isinstance(offenses, list) and offenses[0] is not None:
            if isinstance(offenses[0], str) and offenses[0].upper() != "ALL":
                process_offenses = True
            elif len(offenses) > 1 : # 例如 [Type1, Type2] vs 只有 [ALL] 或 [None]
                    process_offenses = True


        if process_offenses:
            if OFFENSE_COLUMN_NAME not in df_filtered.columns:
                msg = f"主CSV中未找到案件类型列 '{OFFENSE_COLUMN_NAME}'，无法按案件类型筛选。"
                logger.error(msg)
                return None, msg, 0

            # 确保比较不区分大小写且类型为字符串
            # 如果未选择特定案件类型，前端可能会发送 [null]，视为 "ALL"
            valid_offenses = [str(o).upper() for o in offenses if o] # 过滤掉 None 并转换为大写字符串

            if valid_offenses: # 仅当存在实际要筛选的案件类型时才继续
                df_filtered = df_filtered[df_filtered[OFFENSE_COLUMN_NAME].astype(str).str.upper().isin(valid_offenses)]
                logger.info(f"按案件类型 ({', '.join(valid_offenses)}) 筛选后剩余: {len(df_filtered)} 条记录。")
            else:
                logger.info("提供的案件类型列表解析后为空，视为选择所有类型。")


        if df_filtered.empty:
            msg = f"筛选条件 {start_year}-{end_year}, 案件类型: {offenses if offenses else 'ALL'} 没有匹配的数据。"
            logger.warning(msg)
            return None, msg, 0

        os.makedirs(temp_training_data_dir, exist_ok=True)

        temp_filename = generate_temp_filtered_data_filename(start_year, end_year, offenses if process_offenses else ["ALL"], suffix="for_processing")
        temp_file_path = os.path.join(temp_training_data_dir, temp_filename)

        df_filtered.to_csv(temp_file_path, index=False, encoding='utf-8')
        num_records = len(df_filtered)
        msg = f"数据已根据您的选择筛选完毕，共 {num_records} 条记录。临时文件: {temp_filename}"
        logger.info(msg)

        return temp_file_path, msg, num_records

    except Exception as e:
        logger.error(f"从主CSV筛选数据时出错: {e}", exc_info=True)
        return None, f"处理数据时发生服务器内部错误: {str(e)}", 0


if __name__ == '__main__':
    RAW_DATA_FOLDER = 'raw_data' # 相对于此脚本的位置
    # 此输出路径应与 app.py 期望的 MASTER_CSV_PATH 一致
    OUTPUT_MASTER_CSV = os.path.join('processed_data', 'master_crime_data_2014-2024.csv')

    LOAD_START_YEAR = 2014
    LOAD_END_YEAR = 2025 # preprocess_crime_data 默认筛选 2014-2024 的数据

    logger.info("--- 开始执行主数据处理脚本 (qingxi.py) ---")
    output_dir = os.path.dirname(OUTPUT_MASTER_CSV)
    if output_dir and not os.path.exists(output_dir):
        try:
            os.makedirs(output_dir)
            logger.info(f"已创建输出目录: {output_dir}")
        except OSError as e:
            logger.error(f"创建输出目录 {output_dir} 失败: {e}", exc_info=True)
            exit()

    if RAW_DATA_FOLDER == 'path/to/your/yearly_json_files': # 默认占位符检查
        logger.error("错误：请在脚本中修改 'RAW_DATA_FOLDER' 为您实际的原始数据文件夹路径！")
    else:
        try:
            combined_df = load_and_combine_yearly_data(
                data_folder_path=RAW_DATA_FOLDER,
                start_year=LOAD_START_YEAR,
                end_year=LOAD_END_YEAR
            )
            if not combined_df.empty:
                logger.info(f"成功加载并合并了 {len(combined_df)} 条记录。开始预处理...")
                processed_df = preprocess_crime_data(combined_df)
                if not processed_df.empty:
                    logger.info(f"预处理完成，得到 {len(processed_df)} 条有效记录。准备保存到 CSV...")
                    try:
                        processed_df.to_csv(OUTPUT_MASTER_CSV, index=False, encoding='utf-8')
                        logger.info(f"主犯罪数据已成功保存到: {OUTPUT_MASTER_CSV}")
                    except Exception as e:
                        logger.error(f"保存主 CSV 文件到 {OUTPUT_MASTER_CSV} 失败: {e}", exc_info=True)
                else:
                    logger.warning("预处理后的 DataFrame 为空。没有数据被保存到主 CSV 文件。")
            else:
                logger.warning("初始数据加载和合并后 DataFrame 为空。没有数据进行预处理或保存。")
        except FileNotFoundError as e:
            logger.error(f"文件未找到错误: {e}. 请确保 RAW_DATA_FOLDER 设置正确。")
        except ValueError as e:
            logger.error(f"值错误: {e}. 请检查函数参数或数据内容。")
        except Exception as e:
            logger.error(f"执行主数据处理脚本时发生未知错误: {e}", exc_info=True)
    logger.info("--- 主数据处理脚本 (qingxi.py) 执行完毕 ---")