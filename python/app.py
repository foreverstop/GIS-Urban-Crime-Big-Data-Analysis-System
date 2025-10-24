""" # app.py
from flask import Flask, request, jsonify
from flask_cors import CORS
import os
import traceback
import pandas as pd
import numpy as np

from logging_config import logger
import qingxi
import xunlian

app = Flask(__name__)
CORS(app, resources={r"/api/*": {"origins": "http://localhost:5173"}})

BASE_DIR = os.path.dirname(os.path.abspath(__file__))
MASTER_CSV_PATH = os.path.join(BASE_DIR, 'processed_data', 'master_crime_data_2014-2024.csv')
TEMP_DATA_DIR = os.path.join(BASE_DIR, 'processed_data', 'temp_training_data')
MODEL_STORAGE_DIRECTORY = os.path.join(BASE_DIR, 'trained_models')

os.makedirs(TEMP_DATA_DIR, exist_ok=True)
os.makedirs(MODEL_STORAGE_DIRECTORY, exist_ok=True)

TIME_COLUMN_NAME = qingxi.TIME_COLUMN_NAME
OFFENSE_COLUMN_NAME = qingxi.OFFENSE_COLUMN_NAME
DEFAULT_MODEL_FILENAME = xunlian.DEFAULT_MODEL_FILENAME

def make_error_response(message, status_code, error_details=None, data=None):
    response_payload = {"status": "error", "message": message}
    if error_details:
        response_payload["details"] = str(error_details)
    if data:
        response_payload["data"] = data
    logger.error(f"API 错误: {message} | 详细信息: {error_details} | 状态码: {status_code}")
    return jsonify(response_payload), status_code

def make_success_response(message, data=None, status_code=200):
    response_payload = {"status": "success", "message": message}
    if data is not None:
        response_payload["data"] = data
    logger.info(f"API 成功: {message} | 状态码: {status_code}")
    return jsonify(response_payload), status_code

@app.route('/api/status', methods=['GET'])
def status():
    logger.info("API 状态检查请求。")
    master_exists = os.path.exists(MASTER_CSV_PATH)
    status_message = "API 正在运行。"
    if not master_exists:
        status_message += f" 警告: 主数据文件 ({MASTER_CSV_PATH}) 未找到。请运行初始数据处理脚本 (qingxi.py)。"
        logger.warning(f"状态检查期间未找到主数据文件 {MASTER_CSV_PATH}。")
    return make_success_response(status_message, {"master_data_found": master_exists})

@app.route('/api/prepare-filtered-data', methods=['POST'])
def prepare_filtered_data_endpoint():
    logger.info("收到请求: 从主 CSV 准备已筛选数据")
    data = request.get_json()
    if not data:
        return make_error_response("请求体不能为空。", 400)

    start_year = data.get('start_year')
    end_year = data.get('end_year')
    offenses = data.get('offenses')

    if not all(isinstance(year, int) for year in [start_year, end_year]):
        return make_error_response("start_year 和 end_year 必须是整数。", 400)
    if start_year > end_year:
        return make_error_response("start_year 不能大于 end_year。", 400)

    if offenses is None or (isinstance(offenses, list) and not offenses):
        offenses_for_filename = ["ALL"]
    elif isinstance(offenses, list) and offenses and offenses[0] is None:
        offenses_for_filename = ["ALL"]
    else:
        offenses_for_filename = offenses

    try:
        temp_file_path, message, num_records = qingxi.filter_master_data_to_temp_csv(
            master_csv_path=MASTER_CSV_PATH,
            temp_training_data_dir=TEMP_DATA_DIR,
            start_year=start_year,
            end_year=end_year,
            offenses=offenses
        )

        if temp_file_path:
            return make_success_response(
                message,
                {
                    "temp_filename_generated": os.path.basename(temp_file_path),
                    "num_records_prepared": num_records,
                    "filters_applied": {"start_year": start_year, "end_year": end_year, "offenses": offenses}
                }
            )
        else:
            status_code = 404 if "未找到" in message and "主CSV文件" in message else 500
            if "没有匹配的数据" in message: status_code = 404
            return make_error_response(message, status_code)

    except Exception as e:
        logger.error(f"/api/prepare-filtered-data 出错: {traceback.format_exc()}")
        return make_error_response("准备已筛选数据时服务器出错。", 500, error_details=str(e))

@app.route('/api/get-processed-data-sample', methods=['GET'])
def get_processed_data_sample_endpoint():
    logger.info("收到请求: 获取已处理数据样本")
    try:
        start_year = request.args.get('start_year', type=int)
        end_year = request.args.get('end_year', type=int)
        offenses_raw = request.args.getlist('offenses')
        limit = request.args.get('limit', default=20, type=int)

        if start_year is None or end_year is None:
            return make_error_response("start_year 和 end_year 查询参数是必需的，并且必须是整数。", 400)

        if not offenses_raw or offenses_raw == [None] or offenses_raw == [''] or offenses_raw == ['null']:
            offenses_for_filter = None
        else:
            offenses_for_filter = [str(o) for o in offenses_raw if o and o.upper() != "ALL"]
            if not offenses_for_filter: offenses_for_filter = None

        temp_file_path, filter_message, num_total_records = qingxi.filter_master_data_to_temp_csv(
            master_csv_path=MASTER_CSV_PATH,
            temp_training_data_dir=TEMP_DATA_DIR,
            start_year=start_year,
            end_year=end_year,
            offenses=offenses_for_filter
        )

        if not temp_file_path:
            status_code = 404 if "未找到" in filter_message else 500
            if "没有匹配的数据" in filter_message: status_code = 404
            return make_error_response(filter_message, status_code)

        df_sample = pd.read_csv(temp_file_path)
        sample_data = df_sample.head(limit).to_dict(orient='records')

        success_msg = f"成功加载数据样本 ({len(sample_data)} 条记录显示)。总匹配记录数: {num_total_records}。"
        return make_success_response(success_msg, {
            "sample_data": sample_data,
            "total_matching_records": num_total_records,
            "temp_filename_used": os.path.basename(temp_file_path),
            "filters_applied": {"start_year": start_year, "end_year": end_year, "offenses": offenses_raw, "limit": limit}
        })

    except Exception as e:
        logger.error(f"/api/get-processed-data-sample 出错: {traceback.format_exc()}")
        return make_error_response("获取数据样本时服务器出错。", 500, error_details=str(e))

@app.route('/api/train-model', methods=['POST'])
def train_model_endpoint():
    logger.info("收到请求: 训练模型")
    data = request.get_json()
    if not data:
        return make_error_response("请求体不能为空。", 400)

    start_year = data.get('start_year')
    end_year = data.get('end_year')
    offenses = data.get('offenses')
    resample_freq = data.get('resample_freq')
    arima_order_list = data.get('arima_order')
    model_filename_req = data.get('model_filename', DEFAULT_MODEL_FILENAME)

    if not all([isinstance(year, int) for year in [start_year, end_year]]) or \
       not resample_freq or not isinstance(arima_order_list, list) or len(arima_order_list) != 3:
        return make_error_response("缺少或无效的参数: start_year, end_year, resample_freq, 或 arima_order。", 400)

    try:
        arima_order_tuple = tuple(map(int, arima_order_list))
    except ValueError:
        return make_error_response("ARIMA 阶数分量 (p,d,q) 必须是整数。", 400)

    if not model_filename_req.endswith(".joblib"):
        model_filename_req += ".joblib"

    if offenses is None or (isinstance(offenses, list) and not offenses):
        offenses_for_filename = ["ALL"]
    elif isinstance(offenses, list) and offenses and offenses[0] is None:
        offenses_for_filename = ["ALL"]
    else:
        offenses_for_filename = offenses

    expected_temp_filename = qingxi.generate_temp_filtered_data_filename(
        start_year, end_year, offenses_for_filename, suffix="for_processing"
    )
    path_to_filtered_data = os.path.join(TEMP_DATA_DIR, expected_temp_filename)

    if not os.path.exists(path_to_filtered_data):
        msg = (f"未找到已筛选的数据文件 '{expected_temp_filename}'。 "
               f"请确保首先使用匹配的条件 '准备已筛选数据'。")
        logger.error(msg)
        return make_error_response(msg, 404, data={"expected_temp_file": expected_temp_filename})

    try:
        logger.info(f"从以下位置加载时间序列数据: {path_to_filtered_data}")
        time_series_data = xunlian.load_and_prepare_data(
            file_path=path_to_filtered_data,
            time_column=TIME_COLUMN_NAME,
            resample_freq=resample_freq
        )

        if time_series_data is None or time_series_data.empty:
            return make_error_response(f"无法从 '{expected_temp_filename}' 加载或准备时间序列。结果序列为空。", 500)

        logger.info(f"使用阶数 {arima_order_tuple} 训练 ARIMA 模型，文件名: {model_filename_req}")
        trained_model = xunlian.train_arima_model(
            ts_data=time_series_data,
            order=arima_order_tuple,
            model_filename=model_filename_req,
            model_save_dir=MODEL_STORAGE_DIRECTORY
        )

        if trained_model is None:
            return make_error_response("模型训练失败。请检查服务器日志以获取详细信息。", 500)

        full_model_path = os.path.join(MODEL_STORAGE_DIRECTORY, model_filename_req)
        summary_preview = "模型摘要不可用。"
        if hasattr(trained_model, 'summary'):
            try:
                summary_preview = str(trained_model.summary())
                if len(summary_preview) > 2000: summary_preview = summary_preview[:2000] + "\n... (摘要已截断)"
            except Exception as e:
                logger.warning(f"无法检索模型摘要: {e}")

        return make_success_response(
            f"模型 '{model_filename_req}' 训练成功。",
            {
                "model_filename_used": model_filename_req,
                "model_path_on_server": full_model_path,
                "model_summary_preview": summary_preview,
                "training_data_source": expected_temp_filename,
                "time_series_length": len(time_series_data)
            }
        )
    except Exception as e:
        logger.error(f"模型训练期间出错: {traceback.format_exc()}")
        return make_error_response("模型训练期间服务器出错。", 500, error_details=str(e))

@app.route('/api/get-actual-aggregated-data', methods=['GET'])
def get_actual_aggregated_data_endpoint():
    logger.info("收到请求: 获取图表的实际聚合数据")
    try:
        start_year = request.args.get('start_year', type=int)
        end_year = request.args.get('end_year', type=int)
        offenses_raw = request.args.getlist('offenses')
        resample_freq = request.args.get('resample_freq')

        if not all([isinstance(year, int) for year in [start_year, end_year]]) or not resample_freq:
            return make_error_response("start_year, end_year (整数) 和 resample_freq (字符串) 是必需的。", 400)

        if not offenses_raw or offenses_raw == [None] or offenses_raw == [''] or offenses_raw == ['null']:
            offenses_for_filename = ["ALL"]
            actual_offenses_for_filter = None
        else:
            temp_offenses = [str(o).upper() for o in offenses_raw if o and str(o).upper() != "ALL"]
            if not temp_offenses:
                offenses_for_filename = ["ALL"]
                actual_offenses_for_filter = None
            else:
                offenses_for_filename = sorted(list(set(temp_offenses)))
                actual_offenses_for_filter = offenses_for_filename

        temp_filtered_filename = qingxi.generate_temp_filtered_data_filename(
            start_year, end_year, offenses_for_filename, suffix="for_processing"
        )
        path_to_unaggregated_data = os.path.join(TEMP_DATA_DIR, temp_filtered_filename)

        if not os.path.exists(path_to_unaggregated_data):
            logger.info(f"未找到已筛选的数据文件 '{temp_filtered_filename}'。尝试为其生成以进行聚合...")
            temp_file_path_generated, msg, num_records = qingxi.filter_master_data_to_temp_csv(
                master_csv_path=MASTER_CSV_PATH,
                temp_training_data_dir=TEMP_DATA_DIR,
                start_year=start_year,
                end_year=end_year,
                offenses=actual_offenses_for_filter
            )
            if not temp_file_path_generated:
                return make_error_response(f"无法生成必要的已筛选数据 '{temp_filtered_filename}': {msg}", 500)
            path_to_unaggregated_data = temp_file_path_generated

        logger.info(f"从 '{path_to_unaggregated_data}' 以频率 '{resample_freq}' 聚合数据。")
        aggregated_data = xunlian.aggregate_series_from_file(
            filepath=path_to_unaggregated_data,
            date_column=TIME_COLUMN_NAME,
            resample_freq=resample_freq
        )

        if aggregated_data:
            return make_success_response("已检索实际聚合历史数据。", aggregated_data)
        else:
            return make_error_response(f"无法从 '{temp_filtered_filename}' 聚合数据。", 500)

    except Exception as e:
        logger.error(f"/api/get-actual-aggregated-data 出错: {traceback.format_exc()}")
        return make_error_response("获取实际聚合数据时服务器出错。", 500, error_details=str(e))

# MODIFIED /api/predict endpoint
@app.route('/api/predict', methods=['POST'])
def predict_endpoint():
    logger.info("收到请求: 预测")
    data = request.get_json()
    if not data:
        return make_error_response("请求体不能为空。", 400)

    steps = data.get('steps')
    model_filename = data.get('model_filename', DEFAULT_MODEL_FILENAME)
    confidence_level_percentage = data.get('confidence_level', 95) # 期望前端发送例如 90, 95, 99

    if not isinstance(steps, int) or steps <= 0:
        return make_error_response("'steps' 必须是正整数。", 400)
    if not model_filename or not isinstance(model_filename, str):
        return make_error_response("'model_filename' 必须是有效的字符串。", 400)
    if not isinstance(confidence_level_percentage, (int, float)) or not (0 < confidence_level_percentage < 100):
        return make_error_response("'confidence_level' 必须是 (0, 100) 范围内的数字。", 400)

    alpha = 1.0 - (confidence_level_percentage / 100.0) # 将百分比转换为 alpha值

    if not model_filename.endswith(".joblib"): model_filename += ".joblib"

    try:
        logger.info(f"从 '{MODEL_STORAGE_DIRECTORY}' 加载模型 '{model_filename}' 进行预测。")
        loaded_model = xunlian.load_arima_model(
            model_filename=model_filename,
            model_save_dir=MODEL_STORAGE_DIRECTORY
        )

        if loaded_model is None:
            return make_error_response(f"未找到模型 '{model_filename}' 或加载失败。", 404)

        predictions_series, lower_ci_series, upper_ci_series = xunlian.predict_with_model(
            loaded_model,
            steps=steps,
            alpha=alpha # 传递 alpha
        )

        if predictions_series is None: # 如果预测失败，所有系列都将是 None
            return make_error_response("预测失败或未返回结果。", 500)

        results_list = []
        # 假设 predict_with_model 总是返回 pd.Series (如果成功)
        if isinstance(predictions_series, pd.Series):
            timestamps_iso = [ts.isoformat() for ts in predictions_series.index.to_list()]
            values_pred = predictions_series.values.tolist()
            # 确保置信区间系列也存在且与预测系列长度一致
            values_lower = lower_ci_series.values.tolist() if isinstance(lower_ci_series, pd.Series) else [None] * len(values_pred)
            values_upper = upper_ci_series.values.tolist() if isinstance(upper_ci_series, pd.Series) else [None] * len(values_pred)

            for i in range(len(timestamps_iso)):
                results_list.append({
                    "timestamp": timestamps_iso[i],
                    "value": values_pred[i],
                    "lower_ci": values_lower[i], # 新增置信区间下限
                    "upper_ci": values_upper[i]  # 新增置信区间上限
                })
        # 如果 predict_with_model 可能返回 NumPy 数组 (尽管当前实现似乎总是 Series 或 None)
        elif isinstance(predictions_series, np.ndarray):
            logger.warning("预测返回了一个没有原生时间戳的 NumPy 数组。将使用占位符时间戳。")
            timestamps_placeholder = [f"预测点_{i+1}" for i in range(len(predictions_series))]
            values_pred = predictions_series.tolist()
            values_lower = lower_ci_series.tolist() if isinstance(lower_ci_series, np.ndarray) else [None] * len(values_pred)
            values_upper = upper_ci_series.tolist() if isinstance(upper_ci_series, np.ndarray) else [None] * len(values_pred)

            for i in range(len(timestamps_placeholder)):
                 results_list.append({
                    "timestamp": timestamps_placeholder[i],
                    "value": values_pred[i],
                    "lower_ci": values_lower[i],
                    "upper_ci": values_upper[i]
                })
        else:
            return make_error_response("预测结果格式意外。", 500)


        return make_success_response(
            f"使用模型 '{model_filename}' 成功生成 {steps} 个预测步长 (置信水平: {confidence_level_percentage}%)。",
            {"predictions": results_list, "model_used": model_filename} # "predictions" 结构已更新
        )
    except FileNotFoundError:
        return make_error_response(f"在 {MODEL_STORAGE_DIRECTORY} 中未找到模型文件 '{model_filename}'。", 404)
    except Exception as e:
        logger.error(f"预测期间出错: {traceback.format_exc()}")
        return make_error_response("预测期间服务器出错。", 500, error_details=str(e))

# NEW /api/get-area-aggregated-data endpoint
@app.route('/api/get-area-aggregated-data', methods=['POST'])
def get_area_aggregated_data_endpoint():
    logger.info("收到请求: 根据地理区域聚合数据")
    data = request.get_json()
    if not data:
        return make_error_response("请求体不能为空。", 400)

    geojson_feature = data.get('geojson') # 期望是一个 GeoJSON Feature 对象，包含 bbox
    bounds_str = data.get('bounds') # 或者是一个 "minLng,minLat,maxLng,maxLat" 格式的字符串
    start_date_str = data.get('start_date') # 'YYYY-MM-DD'
    end_date_str = data.get('end_date')     # 'YYYY-MM-DD'
    offenses_req = data.get('offenses')     # 案件类型列表或 null/"ALL"
    resample_freq = data.get('resample_freq', 'ME') # 默认为 'ME' (月末)

    # 验证和解析边界
    min_lon, min_lat, max_lon, max_lat = None, None, None, None
    if geojson_feature and isinstance(geojson_feature, dict) and 'bbox' in geojson_feature:
        bbox = geojson_feature.get('bbox')
        if isinstance(bbox, list) and len(bbox) == 4:
            min_lon, min_lat, max_lon, max_lat = bbox[0], bbox[1], bbox[2], bbox[3]
        else:
            return make_error_response("GeoJSON 'bbox' 格式无效。应为 [minLng, minLat, maxLng, maxLat]。", 400)
    elif bounds_str and isinstance(bounds_str, str):
        try:
            coords = [float(c.strip()) for c in bounds_str.split(',')]
            if len(coords) == 4:
                min_lon, min_lat, max_lon, max_lat = coords[0], coords[1], coords[2], coords[3]
            else:
                raise ValueError
        except ValueError:
            return make_error_response("'bounds' 字符串格式无效。应为 'minLng,minLat,maxLng,maxLat'。", 400)
    else:
        return make_error_response("必须提供 'geojson' (含 bbox) 或 'bounds' 参数。", 400)

    if not all(isinstance(coord, (int, float)) for coord in [min_lon, min_lat, max_lon, max_lat]):
         return make_error_response("边界坐标必须是数字。", 400)


    # 验证日期
    if not start_date_str or not end_date_str:
        return make_error_response("'start_date' 和 'end_date' 是必需的 (YYYY-MM-DD)。", 400)
    try:
        start_date = pd.to_datetime(start_date_str)
        end_date = pd.to_datetime(end_date_str)
        if start_date > end_date:
            return make_error_response("start_date 不能晚于 end_date。", 400)
    except ValueError:
        return make_error_response("日期格式无效。请使用 YYYY-MM-DD。", 400)

    # 规范化 offenses
    if offenses_req is None or (isinstance(offenses_req, list) and not offenses_req) or \
       (isinstance(offenses_req, list) and offenses_req == [None]) or \
       (isinstance(offenses_req, list) and offenses_req == ["ALL"]):
        filter_offenses_list = None # 表示所有案件类型
    elif isinstance(offenses_req, list):
        filter_offenses_list = [str(o).upper() for o in offenses_req if o] # 转换为大写字符串并过滤空值
        if not filter_offenses_list: # 如果过滤后为空列表
            filter_offenses_list = None
    else:
        return make_error_response("'offenses' 应该是列表或 null。", 400)

    try:
        if not os.path.exists(MASTER_CSV_PATH):
            return make_error_response(f"主数据文件 '{MASTER_CSV_PATH}' 未找到。", 500)

        df_master = pd.read_csv(MASTER_CSV_PATH)
        logger.info(f"从主数据文件加载了 {len(df_master)} 条记录。")

        # 确保关键列存在
        required_cols = [TIME_COLUMN_NAME, OFFENSE_COLUMN_NAME, 'latitude', 'longitude']
        for col in required_cols:
            if col not in df_master.columns:
                return make_error_response(f"主数据文件中缺少必需的列: '{col}'。", 500)

        # 转换时间列并处理错误
        df_master[TIME_COLUMN_NAME] = pd.to_datetime(df_master[TIME_COLUMN_NAME], errors='coerce')
        df_master.dropna(subset=[TIME_COLUMN_NAME, 'latitude', 'longitude'], inplace=True) # 删除无效日期或坐标的行

        # 1. 按地理边界筛选
        df_filtered = df_master[
            (df_master['longitude'] >= min_lon) & (df_master['longitude'] <= max_lon) &
            (df_master['latitude'] >= min_lat) & (df_master['latitude'] <= max_lat)
        ].copy()
        logger.info(f"地理筛选后剩余 {len(df_filtered)} 条记录。")

        if df_filtered.empty:
            return make_success_response("在指定区域和时间内没有找到匹配的数据。", {"timestamps": [], "values": []})

        # 2. 按时间范围筛选 (包含 end_date 当天)
        df_filtered = df_filtered[
            (df_filtered[TIME_COLUMN_NAME] >= start_date) &
            (df_filtered[TIME_COLUMN_NAME] < (end_date + pd.Timedelta(days=1))) # 小于结束日期的后一天
        ]
        logger.info(f"时间筛选后剩余 {len(df_filtered)} 条记录。")

        if df_filtered.empty:
            return make_success_response("在指定区域和时间内没有找到匹配的数据。", {"timestamps": [], "values": []})

        # 3. 按案件类型筛选
        if filter_offenses_list: # 如果不是所有类型
            # 确保 OFFENSE_COLUMN_NAME 列是字符串类型以进行不区分大小写的比较
            df_filtered = df_filtered[df_filtered[OFFENSE_COLUMN_NAME].astype(str).str.upper().isin(filter_offenses_list)]
            logger.info(f"案件类型筛选后 ({filter_offenses_list}) 剩余 {len(df_filtered)} 条记录。")
            if df_filtered.empty:
                 return make_success_response(f"在指定区域、时间和案件类型 ({offenses_req}) 下没有找到匹配的数据。", {"timestamps": [], "values": []})


        # 4. 按指定频率聚合
        df_filtered.set_index(TIME_COLUMN_NAME, inplace=True)
        df_filtered.sort_index(inplace=True)
        aggregated_series = df_filtered.resample(resample_freq).size().fillna(0.0)

        timestamps_iso = [ts.isoformat() for ts in aggregated_series.index.to_list()]
        values_agg = aggregated_series.values.tolist()

        return make_success_response(
            f"已成功聚合区域数据。聚合记录数: {len(values_agg)}",
            {"timestamps": timestamps_iso, "values": values_agg, "filters_applied": {
                "bounds": [min_lon, min_lat, max_lon, max_lat],
                "start_date": start_date_str,
                "end_date": end_date_str,
                "offenses": offenses_req or "ALL",
                "resample_freq": resample_freq
            }}
        )

    except Exception as e:
        logger.error(f"/api/get-area-aggregated-data 出错: {traceback.format_exc()}")
        return make_error_response("聚合区域数据时服务器出错。", 500, error_details=str(e))


if __name__ == '__main__':
    logger.info(f"Flask 应用程序启动中...")
    # ... (您的启动日志)
    if not os.path.exists(MASTER_CSV_PATH):
        logger.critical(f"!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!")
        logger.critical(f"主数据文件 '{MASTER_CSV_PATH}' 未找到。")
        logger.critical(f"请首先运行 'qingxi.py' 脚本以生成主数据文件。")
        logger.critical(f"没有它，应用程序可能无法正常运行。")
        logger.critical(f"!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!")
    app.run(debug=True, host='0.0.0.0', port=5000)

 """



import os
import io
import zipfile
import json
import traceback # 导入 traceback 用于更详细的错误日志

# 确保在导入依赖地理空间库之前设置 PROJ_LIB
import pyproj
os.environ['PROJ_LIB'] = pyproj.datadir.get_data_dir()

# 其他 Flask 和地理空间库的导入
from flask import Flask, request, jsonify, send_file
from flask_cors import CORS
import fiona
import geopandas as gpd
from shapely.geometry import Point, mapping
import pandas as pd # 用于热点分析和时间序列
from libpysal.weights import DistanceBand # 用于热点分析
from esda.getisord import G_Local # 用于热点分析
import numpy as np # 用于热点分析

# 导入您自己的模块
from logging_config import logger
import qingxi
import xunlian

app = Flask(__name__)
# 统一 CORS 配置，指向前端地址
CORS(app, resources={r"/*": {"origins": "http://localhost:5173"}})

# --- 全局配置和初始化 ---
# 统一 BASE_DIR 的定义，确保它指向 app.py 所在的 src/python 目录
BASE_DIR = os.path.dirname(os.path.abspath(__file__))

# 数据处理和模型训练相关的路径
MASTER_CSV_PATH = os.path.join(BASE_DIR, 'processed_data', 'master_crime_data_2014-2024.csv')
TEMP_DATA_DIR = os.path.join(BASE_DIR, 'processed_data', 'temp_training_data')
MODEL_STORAGE_DIRECTORY = os.path.join(BASE_DIR, 'trained_models')

# 确保必要的目录存在
os.makedirs(TEMP_DATA_DIR, exist_ok=True)
os.makedirs(MODEL_STORAGE_DIRECTORY, exist_ok=True)

# 时间序列分析相关的配置
TIME_COLUMN_NAME = qingxi.TIME_COLUMN_NAME
OFFENSE_COLUMN_NAME = qingxi.OFFENSE_COLUMN_NAME
DEFAULT_MODEL_FILENAME = xunlian.DEFAULT_MODEL_FILENAME

# Shapefile 下载的临时文件夹
SHP_TEMP_DIR = os.path.join(os.getcwd(), 'temp_shp_downloads') # 使用当前工作目录作为基础，确保可写
os.makedirs(SHP_TEMP_DIR, exist_ok=True)

# 热点分析的社区边界数据
COMMUNITY_BOUNDARIES_FILENAME = 'Neighborhood_Clusters.json'
# 确保 COMMUNITY_BOUNDARIES_PATH 相对于 BASE_DIR 正确
# 假设 Neighborhood_Clusters.json 也在 src/python 目录下
COMMUNITY_BOUNDARIES_PATH = os.path.join(BASE_DIR, COMMUNITY_BOUNDARIES_FILENAME)
community_gdf = None # 用于存储加载的社区地理数据框

# 热点分析的目标投影坐标系
TARGET_CRS = "EPSG:3857" # Web Mercator

# --- 辅助函数：统一的错误和成功响应 ---
def make_error_response(message, status_code, error_details=None, data=None):
    response_payload = {"status": "error", "message": message}
    if error_details:
        response_payload["details"] = str(error_details)
    if data:
        response_payload["data"] = data
    logger.error(f"API 错误: {message} | 详细信息: {error_details} | 状态码: {status_code}")
    return jsonify(response_payload), status_code

def make_success_response(message, data=None, status_code=200):
    response_payload = {"status": "success", "message": message}
    if data is not None:
        response_payload["data"] = data
    logger.info(f"API 成功: {message} | 状态码: {status_code}")
    return jsonify(response_payload), status_code

# --- 应用程序启动时加载社区边界数据 (保持原样，因为它处理了路径和CRS) ---
# 这个块必须在 app.py 初始化之后，并且在任何使用 community_gdf 的路由之前执行
try:
    if os.path.exists(COMMUNITY_BOUNDARIES_PATH):
        community_gdf = gpd.read_file(COMMUNITY_BOUNDARIES_PATH)
        print(f"原始社区边界 GeoJSON '{COMMUNITY_BOUNDARIES_PATH}' 加载成功！")
        print(f"原始 community_gdf CRS: {community_gdf.crs}")

        # 检查并统一 community_gdf 的 CRS 到目标投影 CRS
        if community_gdf.crs is None:
            print("警告: 社区边界 GeoJSON 未明确指定 CRS，尝试假设为 EPSG:4326 进行初始设置。")
            community_gdf = community_gdf.set_crs("EPSG:4326", allow_override=True)
        
        if community_gdf.crs != TARGET_CRS:
            try:
                community_gdf = community_gdf.to_crs(TARGET_CRS)
                print(f"社区边界数据已成功投影到 {TARGET_CRS}。")
            except Exception as e:
                print(f"警告: 社区边界数据投影到 {TARGET_CRS} 失败: {e}")
                print("将继续使用其原始CRS，这可能导致空间操作问题。")
        
        print(f"加载并处理后的 community_gdf CRS: {community_gdf.crs}")

        # --- 创建一个用于前端显示的名称列 'name_for_display' ---
        community_gdf['name_for_display'] = community_gdf.index.astype(str)
        if 'NAME' in community_gdf.columns:
            community_gdf['name_for_display'] = np.where(
                community_gdf['NAME'].notna(), 
                community_gdf['NAME'].astype(str), 
                community_gdf['name_for_display']
            )
        if 'NBH_NAMES' in community_gdf.columns: # 检查是否有NBH_NAMES列
            condition_for_nbh = (community_gdf['name_for_display'] == community_gdf.index.astype(str)) & community_gdf['NBH_NAMES'].notna()
            community_gdf['name_for_display'] = np.where(
                condition_for_nbh, 
                community_gdf['NBH_NAMES'].astype(str), 
                community_gdf['name_for_display']
            )
        community_gdf['name_for_display'] = community_gdf['name_for_display'].astype(str)

        # 检查并过滤无效几何体（在 Gi* 分析前也会做，但提前处理更好）
        initial_invalid_geoms = (~community_gdf.geometry.is_valid).sum()
        initial_empty_geoms = community_gdf.geometry.is_empty.sum()
        community_gdf = community_gdf[community_gdf.geometry.is_valid]
        community_gdf = community_gdf[~community_gdf.geometry.is_empty]
        if initial_invalid_geoms > 0 or initial_empty_geoms > 0:
            print(f"已移除 {initial_invalid_geoms} 个无效几何体和 {initial_empty_geoms} 个空几何体。")
        print(f"加载并处理后社区边界数量: {len(community_gdf)}")

    else:
        print(f"错误: 社区边界文件 '{COMMUNITY_BOUNDARIES_PATH}' 不存在。请检查路径或文件位置。")
except Exception as e:
    print(f"加载或处理社区边界 GeoJSON 文件失败: {e}")
    traceback.print_exc()
    community_gdf = None
# --- 社区边界加载结束 ---


# --- API 路由 (按逻辑分组) ---

# --- 通用状态检查 ---
@app.route('/api/status', methods=['GET'])
def status():
    logger.info("API 状态检查请求。")
    master_exists = os.path.exists(MASTER_CSV_PATH)
    status_message = "API 正在运行。"
    if not master_exists:
        status_message += f" 警告: 主数据文件 ({MASTER_CSV_PATH}) 未找到。请运行初始数据处理脚本 (qingxi.py)。"
        logger.warning(f"状态检查期间未找到主数据文件 {MASTER_CSV_PATH}。")
    # 额外检查 community_gdf 状态
    if community_gdf is None or community_gdf.empty:
        status_message += " 警告: 社区边界数据未加载或为空，热点分析功能可能无法使用。"
        logger.warning("状态检查期间社区边界数据未加载或为空。")
    return make_success_response(status_message, {"master_data_found": master_exists, "community_boundaries_loaded": (community_gdf is not None and not community_gdf.empty)})

# --- 数据处理与时间序列分析相关接口 ---
@app.route('/api/prepare-filtered-data', methods=['POST'])
def prepare_filtered_data_endpoint():
    logger.info("收到请求: 从主 CSV 准备已筛选数据")
    data = request.get_json()
    if not data:
        return make_error_response("请求体不能为空。", 400)

    start_year = data.get('start_year')
    end_year = data.get('end_year')
    offenses = data.get('offenses')

    if not all(isinstance(year, int) for year in [start_year, end_year]):
        return make_error_response("start_year 和 end_year 必须是整数。", 400)
    if start_year > end_year:
        return make_error_response("start_year 不能大于 end_year。", 400)

    if offenses is None or (isinstance(offenses, list) and not offenses):
        offenses_for_filename = ["ALL"]
    elif isinstance(offenses, list) and offenses and offenses[0] is None:
        offenses_for_filename = ["ALL"]
    else:
        offenses_for_filename = offenses

    try:
        temp_file_path, message, num_records = qingxi.filter_master_data_to_temp_csv(
            master_csv_path=MASTER_CSV_PATH,
            temp_training_data_dir=TEMP_DATA_DIR,
            start_year=start_year,
            end_year=end_year,
            offenses=offenses
        )

        if temp_file_path:
            return make_success_response(
                message,
                {
                    "temp_filename_generated": os.path.basename(temp_file_path),
                    "num_records_prepared": num_records,
                    "filters_applied": {"start_year": start_year, "end_year": end_year, "offenses": offenses}
                }
            )
        else:
            status_code = 404 if "未找到" in message and "主CSV文件" in message else 500
            if "没有匹配的数据" in message: status_code = 404
            return make_error_response(message, status_code)

    except Exception as e:
        logger.error(f"/api/prepare-filtered-data 出错: {traceback.format_exc()}")
        return make_error_response("准备已筛选数据时服务器出错。", 500, error_details=str(e))

@app.route('/api/get-processed-data-sample', methods=['GET'])
def get_processed_data_sample_endpoint():
    logger.info("收到请求: 获取已处理数据样本")
    try:
        start_year = request.args.get('start_year', type=int)
        end_year = request.args.get('end_year', type=int)
        offenses_raw = request.args.getlist('offenses')
        limit = request.args.get('limit', default=20, type=int)

        if start_year is None or end_year is None:
            return make_error_response("start_year 和 end_year 查询参数是必需的，并且必须是整数。", 400)

        if not offenses_raw or offenses_raw == [None] or offenses_raw == [''] or offenses_raw == ['null']:
            offenses_for_filter = None
        else:
            offenses_for_filter = [str(o) for o in offenses_raw if o and o.upper() != "ALL"]
            if not offenses_for_filter: offenses_for_filter = None

        temp_file_path, filter_message, num_total_records = qingxi.filter_master_data_to_temp_csv(
            master_csv_path=MASTER_CSV_PATH,
            temp_training_data_dir=TEMP_DATA_DIR,
            start_year=start_year,
            end_year=end_year,
            offenses=offenses_for_filter
        )

        if not temp_file_path:
            status_code = 404 if "未找到" in filter_message else 500
            if "没有匹配的数据" in filter_message: status_code = 404
            return make_error_response(filter_message, status_code)

        df_sample = pd.read_csv(temp_file_path)
        sample_data = df_sample.head(limit).to_dict(orient='records')

        success_msg = f"成功加载数据样本 ({len(sample_data)} 条记录显示)。总匹配记录数: {num_total_records}。"
        return make_success_response(success_msg, {
            "sample_data": sample_data,
            "total_matching_records": num_total_records,
            "temp_filename_used": os.path.basename(temp_file_path),
            "filters_applied": {"start_year": start_year, "end_year": end_year, "offenses": offenses_raw, "limit": limit}
        })

    except Exception as e:
        logger.error(f"/api/get-processed-data-sample 出错: {traceback.format_exc()}")
        return make_error_response("获取数据样本时服务器出错。", 500, error_details=str(e))

@app.route('/api/train-model', methods=['POST'])
def train_model_endpoint():
    logger.info("收到请求: 训练模型")
    data = request.get_json()
    if not data:
        return make_error_response("请求体不能为空。", 400)

    start_year = data.get('start_year')
    end_year = data.get('end_year')
    offenses = data.get('offenses')
    resample_freq = data.get('resample_freq')
    arima_order_list = data.get('arima_order')
    model_filename_req = data.get('model_filename', DEFAULT_MODEL_FILENAME)

    if not all([isinstance(year, int) for year in [start_year, end_year]]) or \
       not resample_freq or not isinstance(arima_order_list, list) or len(arima_order_list) != 3:
        return make_error_response("缺少或无效的参数: start_year, end_year, resample_freq, 或 arima_order。", 400)

    try:
        arima_order_tuple = tuple(map(int, arima_order_list))
    except ValueError:
        return make_error_response("ARIMA 阶数分量 (p,d,q) 必须是整数。", 400)

    if not model_filename_req.endswith(".joblib"):
        model_filename_req += ".joblib"

    if offenses is None or (isinstance(offenses, list) and not offenses):
        offenses_for_filename = ["ALL"]
    elif isinstance(offenses, list) and offenses and offenses[0] is None:
        offenses_for_filename = ["ALL"]
    else:
        offenses_for_filename = offenses

    expected_temp_filename = qingxi.generate_temp_filtered_data_filename(
        start_year, end_year, offenses_for_filename, suffix="for_processing"
    )
    path_to_filtered_data = os.path.join(TEMP_DATA_DIR, expected_temp_filename)

    if not os.path.exists(path_to_filtered_data):
        msg = (f"未找到已筛选的数据文件 '{expected_temp_filename}'。 "
               f"请确保首先使用匹配的条件 '准备已筛选数据'。")
        logger.error(msg)
        return make_error_response(msg, 404, data={"expected_temp_file": expected_temp_filename})

    try:
        logger.info(f"从以下位置加载时间序列数据: {path_to_filtered_data}")
        time_series_data = xunlian.load_and_prepare_data(
            file_path=path_to_filtered_data,
            time_column=TIME_COLUMN_NAME,
            resample_freq=resample_freq
        )

        if time_series_data is None or time_series_data.empty:
            return make_error_response(f"无法从 '{expected_temp_filename}' 加载或准备时间序列。结果序列为空。", 500)

        logger.info(f"使用阶数 {arima_order_tuple} 训练 ARIMA 模型，文件名: {model_filename_req}")
        trained_model = xunlian.train_arima_model(
            ts_data=time_series_data,
            order=arima_order_tuple,
            model_filename=model_filename_req,
            model_save_dir=MODEL_STORAGE_DIRECTORY
        )

        if trained_model is None:
            return make_error_response("模型训练失败。请检查服务器日志以获取详细信息。", 500)

        full_model_path = os.path.join(MODEL_STORAGE_DIRECTORY, model_filename_req)
        summary_preview = "模型摘要不可用。"
        if hasattr(trained_model, 'summary'):
            try:
                summary_preview = str(trained_model.summary())
                if len(summary_preview) > 2000: summary_preview = summary_preview[:2000] + "\n... (摘要已截断)"
            except Exception as e:
                logger.warning(f"无法检索模型摘要: {e}")

        return make_success_response(
            f"模型 '{model_filename_req}' 训练成功。",
            {
                "model_filename_used": model_filename_req,
                "model_path_on_server": full_model_path,
                "model_summary_preview": summary_preview,
                "training_data_source": expected_temp_filename,
                "time_series_length": len(time_series_data)
            }
        )
    except Exception as e:
        logger.error(f"模型训练期间出错: {traceback.format_exc()}")
        return make_error_response("模型训练期间服务器出错。", 500, error_details=str(e))

@app.route('/api/get-actual-aggregated-data', methods=['GET'])
def get_actual_aggregated_data_endpoint():
    logger.info("收到请求: 获取图表的实际聚合数据")
    try:
        start_year = request.args.get('start_year', type=int)
        end_year = request.args.get('end_year', type=int)
        offenses_raw = request.args.getlist('offenses')
        resample_freq = request.args.get('resample_freq')

        if not all([isinstance(year, int) for year in [start_year, end_year]]) or not resample_freq:
            return make_error_response("start_year, end_year (整数) 和 resample_freq (字符串) 是必需的。", 400)

        if not offenses_raw or offenses_raw == [None] or offenses_raw == [''] or offenses_raw == ['null']:
            offenses_for_filename = ["ALL"]
            actual_offenses_for_filter = None
        else:
            temp_offenses = [str(o).upper() for o in offenses_raw if o and str(o).upper() != "ALL"]
            if not temp_offenses:
                offenses_for_filename = ["ALL"]
                actual_offenses_for_filter = None
            else:
                offenses_for_filename = sorted(list(set(temp_offenses)))
                actual_offenses_for_filter = offenses_for_filename

        temp_filtered_filename = qingxi.generate_temp_filtered_data_filename(
            start_year, end_year, offenses_for_filename, suffix="for_processing"
        )
        path_to_unaggregated_data = os.path.join(TEMP_DATA_DIR, temp_filtered_filename)

        if not os.path.exists(path_to_unaggregated_data):
            logger.info(f"未找到已筛选的数据文件 '{temp_filtered_filename}'。尝试为其生成以进行聚合...")
            temp_file_path_generated, msg, num_records = qingxi.filter_master_data_to_temp_csv(
                master_csv_path=MASTER_CSV_PATH,
                temp_training_data_dir=TEMP_DATA_DIR,
                start_year=start_year,
                end_year=end_year,
                offenses=actual_offenses_for_filter
            )
            if not temp_file_path_generated:
                return make_error_response(f"无法生成必要的已筛选数据 '{temp_filtered_filename}': {msg}", 500)
            path_to_unaggregated_data = temp_file_path_generated

        logger.info(f"从 '{path_to_unaggregated_data}' 以频率 '{resample_freq}' 聚合数据。")
        aggregated_data = xunlian.aggregate_series_from_file(
            filepath=path_to_unaggregated_data,
            date_column=TIME_COLUMN_NAME,
            resample_freq=resample_freq
        )

        if aggregated_data:
            return make_success_response("已检索实际聚合历史数据。", aggregated_data)
        else:
            return make_error_response(f"无法从 '{temp_filtered_filename}' 聚合数据。", 500)

    except Exception as e:
        logger.error(f"/api/get-actual-aggregated-data 出错: {traceback.format_exc()}")
        return make_error_response("获取实际聚合数据时服务器出错。", 500, error_details=str(e))

# MODIFIED /api/predict endpoint
@app.route('/api/predict', methods=['POST'])
def predict_endpoint():
    logger.info("收到请求: 预测")
    data = request.get_json()
    if not data:
        return make_error_response("请求体不能为空。", 400)

    steps = data.get('steps')
    model_filename = data.get('model_filename', DEFAULT_MODEL_FILENAME)
    confidence_level_percentage = data.get('confidence_level', 95) # 期望前端发送例如 90, 95, 99

    if not isinstance(steps, int) or steps <= 0:
        return make_error_response("'steps' 必须是正整数。", 400)
    if not model_filename or not isinstance(model_filename, str):
        return make_error_response("'model_filename' 必须是有效的字符串。", 400)
    if not isinstance(confidence_level_percentage, (int, float)) or not (0 < confidence_level_percentage < 100):
        return make_error_response("'confidence_level' 必须是 (0, 100) 范围内的数字。", 400)

    alpha = 1.0 - (confidence_level_percentage / 100.0) # 将百分比转换为 alpha值

    if not model_filename.endswith(".joblib"): model_filename += ".joblib"

    try:
        logger.info(f"从 '{MODEL_STORAGE_DIRECTORY}' 加载模型 '{model_filename}' 进行预测。")
        loaded_model = xunlian.load_arima_model(
            model_filename=model_filename,
            model_save_dir=MODEL_STORAGE_DIRECTORY
        )

        if loaded_model is None:
            return make_error_response(f"未找到模型 '{model_filename}' 或加载失败。", 404)

        predictions_series, lower_ci_series, upper_ci_series = xunlian.predict_with_model(
            loaded_model,
            steps=steps,
            alpha=alpha # 传递 alpha
        )

        if predictions_series is None: # 如果预测失败，所有系列都将是 None
            return make_error_response("预测失败或未返回结果。", 500)

        results_list = []
        # 假设 predict_with_model 总是返回 pd.Series (如果成功)
        if isinstance(predictions_series, pd.Series):
            timestamps_iso = [ts.isoformat() for ts in predictions_series.index.to_list()]
            values_pred = predictions_series.values.tolist()
            # 确保置信区间系列也存在且与预测系列长度一致
            values_lower = lower_ci_series.values.tolist() if isinstance(lower_ci_series, pd.Series) else [None] * len(values_pred)
            values_upper = upper_ci_series.values.tolist() if isinstance(upper_ci_series, pd.Series) else [None] * len(values_pred)

            for i in range(len(timestamps_iso)):
                results_list.append({
                    "timestamp": timestamps_iso[i],
                    "value": values_pred[i],
                    "lower_ci": values_lower[i], # 新增置信区间下限
                    "upper_ci": values_upper[i]  # 新增置信区间上限
                })
        # 如果 predict_with_model 可能返回 NumPy 数组 (尽管当前实现似乎总是 Series 或 None)
        elif isinstance(predictions_series, np.ndarray):
            logger.warning("预测返回了一个没有原生时间戳的 NumPy 数组。将使用占位符时间戳。")
            timestamps_placeholder = [f"预测点_{i+1}" for i in range(len(predictions_series))]
            values_pred = predictions_series.tolist()
            values_lower = lower_ci_series.tolist() if isinstance(lower_ci_series, np.ndarray) else [None] * len(values_pred)
            values_upper = upper_ci_series.tolist() if isinstance(upper_ci_series, np.ndarray) else [None] * len(values_pred)

            for i in range(len(timestamps_placeholder)):
                    results_list.append({
                        "timestamp": timestamps_placeholder[i],
                        "value": values_pred[i],
                        "lower_ci": values_lower[i],
                        "upper_ci": values_upper[i]
                    })
        else:
            return make_error_response("预测结果格式意外。", 500)


        return make_success_response(
            f"使用模型 '{model_filename}' 成功生成 {steps} 个预测步长 (置信水平: {confidence_level_percentage}%)。",
            {"predictions": results_list, "model_used": model_filename} # "predictions" 结构已更新
        )
    except FileNotFoundError:
        return make_error_response(f"在 {MODEL_STORAGE_DIRECTORY} 中未找到模型文件 '{model_filename}'。", 404)
    except Exception as e:
        logger.error(f"预测期间出错: {traceback.format_exc()}")
        return make_error_response("预测期间服务器出错。", 500, error_details=str(e))

# NEW /api/get-area-aggregated-data endpoint
@app.route('/api/get-area-aggregated-data', methods=['POST'])
def get_area_aggregated_data_endpoint():
    logger.info("收到请求: 根据地理区域聚合数据")
    data = request.get_json()
    if not data:
        return make_error_response("请求体不能为空。", 400)

    geojson_feature = data.get('geojson') # 期望是一个 GeoJSON Feature 对象，包含 bbox
    bounds_str = data.get('bounds') # 或者是一个 "minLng,minLat,maxLng,maxLat" 格式的字符串
    start_date_str = data.get('start_date') # 'YYYY-MM-DD'
    end_date_str = data.get('end_date')     # 'YYYY-MM-DD'
    offenses_req = data.get('offenses')      # 案件类型列表或 null/"ALL"
    resample_freq = data.get('resample_freq', 'ME') # 默认为 'ME' (月末)

    # 验证和解析边界
    min_lon, min_lat, max_lon, max_lat = None, None, None, None
    if geojson_feature and isinstance(geojson_feature, dict) and 'bbox' in geojson_feature:
        bbox = geojson_feature.get('bbox')
        if isinstance(bbox, list) and len(bbox) == 4:
            min_lon, min_lat, max_lon, max_lat = bbox[0], bbox[1], bbox[2], bbox[3]
        else:
            return make_error_response("GeoJSON 'bbox' 格式无效。应为 [minLng, minLat, maxLng, maxLat]。", 400)
    elif bounds_str and isinstance(bounds_str, str):
        try:
            coords = [float(c.strip()) for c in bounds_str.split(',')]
            if len(coords) == 4:
                min_lon, min_lat, max_lon, max_lat = coords[0], coords[1], coords[2], coords[3]
            else:
                raise ValueError
        except ValueError:
            return make_error_response("'bounds' 字符串格式无效。应为 'minLng,minLat,maxLng,maxLat'。", 400)
    else:
        return make_error_response("必须提供 'geojson' (含 bbox) 或 'bounds' 参数。", 400)

    if not all(isinstance(coord, (int, float)) for coord in [min_lon, min_lat, max_lon, max_lat]):
          return make_error_response("边界坐标必须是数字。", 400)


    # 验证日期
    if not start_date_str or not end_date_str:
        return make_error_response("'start_date' 和 'end_date' 是必需的 (YYYY-MM-DD)。", 400)
    try:
        start_date = pd.to_datetime(start_date_str)
        end_date = pd.to_datetime(end_date_str)
        if start_date > end_date:
            return make_error_response("start_date 不能晚于 end_date。", 400)
    except ValueError:
        return make_error_response("日期格式无效。请使用YYYY-MM-DD。", 400)

    # 规范化 offenses
    if offenses_req is None or (isinstance(offenses_req, list) and not offenses_req) or \
       (isinstance(offenses_req, list) and offenses_req == [None]) or \
       (isinstance(offenses_req, list) and offenses_req == ["ALL"]):
        filter_offenses_list = None # 表示所有案件类型
    elif isinstance(offenses_req, list):
        filter_offenses_list = [str(o).upper() for o in offenses_req if o] # 转换为大写字符串并过滤空值
        if not filter_offenses_list: # 如果过滤后为空列表
            filter_offenses_list = None
    else:
        return make_error_response("'offenses' 应该是列表或 null。", 400)

    try:
        if not os.path.exists(MASTER_CSV_PATH):
            return make_error_response(f"主数据文件 '{MASTER_CSV_PATH}' 未找到。", 500)

        df_master = pd.read_csv(MASTER_CSV_PATH)
        logger.info(f"从主数据文件加载了 {len(df_master)} 条记录。")

        # 确保关键列存在
        required_cols = [TIME_COLUMN_NAME, OFFENSE_COLUMN_NAME, 'latitude', 'longitude']
        for col in required_cols:
            if col not in df_master.columns:
                return make_error_response(f"主数据文件中缺少必需的列: '{col}'。", 500)

        # 转换时间列并处理错误
        df_master[TIME_COLUMN_NAME] = pd.to_datetime(df_master[TIME_COLUMN_NAME], errors='coerce')
        df_master.dropna(subset=[TIME_COLUMN_NAME, 'latitude', 'longitude'], inplace=True) # 删除无效日期或坐标的行

        # 1. 按地理边界筛选
        df_filtered = df_master[
            (df_master['longitude'] >= min_lon) & (df_master['longitude'] <= max_lon) &
            (df_master['latitude'] >= min_lat) & (df_master['latitude'] <= max_lat)
        ].copy()
        logger.info(f"地理筛选后剩余 {len(df_filtered)} 条记录。")

        if df_filtered.empty:
            return make_success_response("在指定区域和时间内没有找到匹配的数据。", {"timestamps": [], "values": []})

        # 2. 按时间范围筛选 (包含 end_date 当天)
        df_filtered = df_filtered[
            (df_filtered[TIME_COLUMN_NAME] >= start_date) &
            (df_filtered[TIME_COLUMN_NAME] < (end_date + pd.Timedelta(days=1))) # 小于结束日期的后一天
        ]
        logger.info(f"时间筛选后剩余 {len(df_filtered)} 条记录。")

        if df_filtered.empty:
            return make_success_response("在指定区域和时间内没有找到匹配的数据。", {"timestamps": [], "values": []})

        # 3. 按案件类型筛选
        if filter_offenses_list: # 如果不是所有类型
            # 确保 OFFENSE_COLUMN_NAME 列是字符串类型以进行不区分大小写的比较
            df_filtered = df_filtered[df_filtered[OFFENSE_COLUMN_NAME].astype(str).str.upper().isin(filter_offenses_list)]
            logger.info(f"案件类型筛选后 ({filter_offenses_list}) 剩余 {len(df_filtered)} 条记录。")
            if df_filtered.empty:
                    return make_success_response(f"在指定区域、时间和案件类型 ({offenses_req}) 下没有找到匹配的数据。", {"timestamps": [], "values": []})


        # 4. 按指定频率聚合
        df_filtered.set_index(TIME_COLUMN_NAME, inplace=True)
        df_filtered.sort_index(inplace=True)
        aggregated_series = df_filtered.resample(resample_freq).size().fillna(0.0)

        timestamps_iso = [ts.isoformat() for ts in aggregated_series.index.to_list()]
        values_agg = aggregated_series.values.tolist()

        return make_success_response(
            f"已成功聚合区域数据。聚合记录数: {len(values_agg)}",
            {"timestamps": timestamps_iso, "values": values_agg, "filters_applied": {
                "bounds": [min_lon, min_lat, max_lon, max_lat],
                "start_date": start_date_str,
                "end_date": end_date_str,
                "offenses": offenses_req or "ALL",
                "resample_freq": resample_freq
            }}
        )

    except Exception as e:
        logger.error(f"/api/get-area-aggregated-data 出错: {traceback.format_exc()}")
        return make_error_response("聚合区域数据时服务器出错。", 500, error_details=str(e))

# --- Shapefile 下载接口 ---
@app.route('/generate_shp', methods=['POST'])
def generate_shp():
    data = request.json
    if not data or 'features' not in data:
        return make_error_response("Invalid GeoJSON data provided.", 400)

    features_to_process = data['features']
    filename_base = data.get('filename', 'crime_data') # 获取前端传入的文件名基础
    print(f"Received request to generate SHP for {len(features_to_process)} features.")
    logger.info(f"Received request to generate SHP for {len(features_to_process)} features.")

    # 定义Shapefile的结构 (schema)
    schema = {
        'geometry': 'Point', # 假设你的数据是点数据
        'properties': {} # 先初始化为空，然后动态填充
    }

    if features_to_process:
        first_feature_props = features_to_process[0]['properties']
        for key, value in first_feature_props.items():
            if isinstance(value, str):
                schema['properties'][key] = 'str:255' # 默认字符串长度，可根据实际数据调整
            elif isinstance(value, int):
                schema['properties'][key] = 'int'
            elif isinstance(value, float):
                schema['properties'][key] = 'float'
            else:
                schema['properties'][key] = 'str:255' # 默认转换为字符串，并指定长度

        print("Inferred schema properties:", schema['properties'])
        logger.info(f"Inferred SHP schema properties: {schema['properties']}")
    else:
        schema['properties'] = {
            'ID': 'str:20',
            'Name': 'str:255'
        }
        print("No features provided, using default minimal schema.")
        logger.warning("No features provided for SHP generation, using default minimal schema.")


    zip_buffer = io.BytesIO()

    try:
        shp_base_name = filename_base
        # Fiona 在写入文件时需要一个实际的路径，不能直接写入 BytesIO
        # 所以先写入临时文件，再打包成zip
        temp_shp_dir = os.path.join(SHP_TEMP_DIR, shp_base_name + "_temp")
        os.makedirs(temp_shp_dir, exist_ok=True)
        
        shp_file_path = os.path.join(temp_shp_dir, shp_base_name + '.shp')

        with fiona.open(
            shp_file_path,
            'w',
            driver='ESRI Shapefile',
            crs='EPSG:4326', # WGS84 坐标系
            schema=schema,
            encoding='utf-8' # 使用UTF-8编码，支持中文属性
        ) as collection:
            for feature in features_to_process:
                if feature['geometry']['type'] == 'Point':
                    point = Point(feature['geometry']['coordinates'])
                    properties = {}
                    for prop_name, prop_type_str in schema['properties'].items():
                        prop_value = feature['properties'].get(prop_name)
                        target_type = prop_type_str.split(':')[0]

                        if prop_value is None:
                            if target_type == 'str':
                                properties[prop_name] = ''
                            elif target_type in ['int', 'float']:
                                properties[prop_name] = 0
                            else:
                                properties[prop_name] = None
                        else:
                            try:
                                if target_type == 'str':
                                    properties[prop_name] = str(prop_value)
                                elif target_type == 'int':
                                    properties[prop_name] = int(prop_value)
                                elif target_type == 'float':
                                    properties[prop_name] = float(prop_value)
                                else:
                                    properties[prop_name] = prop_value
                            except (ValueError, TypeError):
                                logger.warning(f"Warning: Could not convert property '{prop_name}' value '{prop_value}' to type '{target_type}'. Setting to default/empty.")
                                if target_type == 'str':
                                    properties[prop_name] = str(prop_value) if prop_value is not None else ''
                                else:
                                    properties[prop_name] = None

                    collection.write({
                        'geometry': mapping(point),
                        'properties': properties
                    })
                else:
                    logger.warning(f"Skipping non-Point geometry: {feature['geometry']['type']} for feature with properties: {feature['properties'].get('OFFENSE', 'N/A')}")
                    print(f"Skipping non-Point geometry: {feature['geometry']['type']} for feature with properties: {feature['properties'].get('OFFENSE', 'N/A')}")

        # 将生成的Shapefile及其辅助文件打包成zip
        with zipfile.ZipFile(zip_buffer, 'w', zipfile.ZIP_DEFLATED) as zf:
            for file_name in os.listdir(temp_shp_dir):
                file_path = os.path.join(temp_shp_dir, file_name)
                zf.write(file_path, file_name) # 将文件添加到zip的根目录

        zip_buffer.seek(0)

        # 清理临时文件
        for file_name in os.listdir(temp_shp_dir):
            os.remove(os.path.join(temp_shp_dir, file_name))
        os.rmdir(temp_shp_dir) # 移除临时目录
        
        logger.info(f"Successfully generated and zipped {filename_base}.zip")
        return send_file(
            zip_buffer,
            mimetype='application/zip',
            as_attachment=True,
            download_name=f"{filename_base}.zip"
        )

    except Exception as e:
        logger.error(f"Error generating SHP: {e}\n{traceback.format_exc()}") # 使用 logger 记录错误
        for file_name in os.listdir(SHP_TEMP_DIR): # 尝试清理可能遗留的文件
            if file_name.startswith(shp_base_name):
                try:
                    os.remove(os.path.join(SHP_TEMP_DIR, file_name))
                except OSError as clean_error:
                    logger.error(f"Error cleaning up temp file {file_name}: {clean_error}")

        return make_error_response(f"Failed to generate SHP file: {str(e)}", 500, error_details=traceback.format_exc())

# --- 热点分析接口 ---
@app.route('/api/hotspot-analysis', methods=['POST'])
def hotspot_analysis():
    data = request.get_json()
    crime_data_points = data.get('crimeData')

    if not crime_data_points:
        return make_error_response("未提供犯罪数据。请确保前端发送了正确的犯罪数据。", 400)

    points = [Point(d['longitude'], d['latitude']) for d in crime_data_points]
    crime_gdf = gpd.GeoDataFrame(
        [{'longitude': d['longitude'], 'latitude': d['latitude'], 'offenseType': d['offenseType']}
            for d in crime_data_points
        ],
        geometry=points,
        crs="EPSG:4326" # 犯罪点原始 CRS
    )
    logger.info(f"接收到 {len(crime_gdf)} 个犯罪点。")
    logger.info(f"犯罪点 GeoDataFrame CRS: {crime_gdf.crs}")

    if community_gdf is None or community_gdf.empty:
        logger.error("后端未加载有效的社区边界数据，无法进行热点分析。")
        return make_error_response("后端未加载有效的社区边界数据，无法进行热点分析。请检查后端配置和文件是否存在。", 500)

    analysis_gdf = community_gdf.copy()
    logger.info(f"用于分析的社区边界 GeoDataFrame CRS (已投影到 {TARGET_CRS}): {analysis_gdf.crs}")
    logger.info(f"用于分析的社区边界数量: {len(analysis_gdf)}")

    analysis_gdf['temp_analysis_id'] = analysis_gdf.index

    crime_gdf_proj_for_sjoin = None
    try:
        if crime_gdf.crs != TARGET_CRS:
            crime_gdf_proj_for_sjoin = crime_gdf.to_crs(TARGET_CRS)
            logger.info(f"犯罪点数据已投影到 {TARGET_CRS} 进行 sjoin。")
        else:
            crime_gdf_proj_for_sjoin = crime_gdf.copy()
    except Exception as e:
        logger.error(f"犯罪点数据投影失败: {e}\n{traceback.format_exc()}")
        return make_error_response("犯罪点数据投影失败，无法进行热点分析。", 500, error_details=traceback.format_exc())

    analysis_gdf_for_sjoin = analysis_gdf.copy()

    logger.info(f"准备进行空间连接的社区边界 CRS: {analysis_gdf_for_sjoin.crs}")
    logger.info(f"准备进行空间连接的犯罪点 CRS: {crime_gdf_proj_for_sjoin.crs}")

    logger.info("开始执行 gpd.sjoin...")
    try:
        # 确保参与 sjoin 的 GeoDataFrame 有有效的几何体
        analysis_gdf_for_sjoin = analysis_gdf_for_sjoin[analysis_gdf_for_sjoin.geometry.is_valid & ~analysis_gdf_for_sjoin.geometry.is_empty]
        crime_gdf_proj_for_sjoin = crime_gdf_proj_for_sjoin[crime_gdf_proj_for_sjoin.geometry.is_valid & ~crime_gdf_proj_for_sjoin.geometry.is_empty]

        if analysis_gdf_for_sjoin.empty:
            return make_error_response("空间连接前社区边界数据为空或无效，无法进行热点分析。", 400)
        if crime_gdf_proj_for_sjoin.empty:
            logger.warning("空间连接前犯罪点数据为空或无效。这将导致所有社区犯罪计数为0。")
            # return make_success_response("没有有效的犯罪点数据进行空间连接。所有社区犯罪数量将为0。", data={'features': []}) # 也可以直接返回空结果或0
            
        community_crime_counts_with_temp_id = gpd.sjoin(
            analysis_gdf_for_sjoin, # 使用过滤后的边界
            crime_gdf_proj_for_sjoin, # 使用过滤后的犯罪点
            how="left",
            predicate='intersects'
        )
        logger.info(f"gpd.sjoin 完成。结果 GeoDataFrame 形状: {community_crime_counts_with_temp_id.shape}")
        # logger.debug(f"sjoin 结果前5行 (检查 index_right 是否非空):\n{community_crime_counts_with_temp_id[['temp_analysis_id', 'index_right']].head()}") # 调试用

        # 计算每个社区的犯罪数量
        # 这里需要注意，sjoin后如果一个区域有多个犯罪点，会复制该区域的行
        # 所以 size() 是正确的，它会计算每个temp_analysis_id出现的次数
        grouped_counts = community_crime_counts_with_temp_id.groupby('temp_analysis_id').size().rename('crime_count_temp')
        logger.info(f"分组计数完成。共有 {len(grouped_counts)} 个社区有匹配的犯罪点。")
        # logger.debug(f"分组计数前5行:\n{grouped_counts.head()}") # 调试用

        # 将计数合并回原始的 analysis_gdf
        analysis_gdf = analysis_gdf.merge(grouped_counts, left_on='temp_analysis_id', right_index=True, how='left')
        analysis_gdf['crime_count'] = analysis_gdf['crime_count_temp'].fillna(0).astype(int)

        analysis_gdf = analysis_gdf.drop(columns=['temp_analysis_id', 'crime_count_temp'])
        logger.info(f"犯罪数量统计完成。总犯罪数量: {analysis_gdf['crime_count'].sum()}")
        # logger.debug(f"前5个社区的犯罪数量:\n{analysis_gdf[['name_for_display', 'crime_count']].head()}") # 调试用

    except Exception as e:
        logger.error(f"空间连接 (sjoin) 或犯罪计数失败: {e}\n{traceback.format_exc()}")
        return make_error_response(f"空间连接或犯罪计数失败: {e}", 500, error_details=traceback.format_exc())

    initial_analysis_count = len(analysis_gdf)
    analysis_gdf = analysis_gdf[analysis_gdf.geometry.is_valid]
    analysis_gdf = analysis_gdf[~analysis_gdf.geometry.is_empty]
    if len(analysis_gdf) < initial_analysis_count:
        logger.info(f"再次过滤，移除了 {initial_analysis_count - len(analysis_gdf)} 个无效/空几何体。")
    
    if analysis_gdf.empty:
        logger.error("处理后的地理区域数据为空，无法进行热点分析。")
        return make_error_response("处理后的地理区域数据为空，无法进行热点分析。请检查数据完整性或GeoJSON文件。", 400)

    if analysis_gdf.crs != TARGET_CRS:
        logger.warning(f"analysis_gdf CRS 在 Gi* 计算前变为 {analysis_gdf.crs}，应为 {TARGET_CRS}。正在重新投影。")
        try:
            analysis_gdf = analysis_gdf.to_crs(TARGET_CRS)
        except Exception as e:
            logger.error(f"Gi* 计算前重新投影 analysis_gdf 失败: {e}\n{traceback.format_exc()}")
            return make_error_response("最终数据投影失败，无法进行热点分析。", 500, error_details=traceback.format_exc())

    centroids_proj = analysis_gdf.geometry.centroid

    input_max_distance = data.get('maxDistance')
    max_distance = 0

    if input_max_distance is not None and input_max_distance > 0:
        max_distance = float(input_max_distance)
        logger.info(f"前端传入的 max_distance (米): {max_distance:.2f}")
    else:
        if len(centroids_proj) > 1:
            distances = []
            # 抽样计算距离，避免大数据量下的性能问题
            sample_size = min(200, len(centroids_proj))
            sample_indices = np.random.choice(len(centroids_proj), sample_size, replace=False)
            
            # 使用列表推导式提高效率
            distances = [
                centroids_proj.iloc[i].distance(centroids_proj.iloc[j])
                for i in sample_indices
                for j in sample_indices
                if i != j
            ]
            
            if distances:
                max_distance = np.percentile(distances, 50) * 0.4
                logger.info(f"动态计算的 max_distance (米): {max_distance:.2f}")
            else:
                max_distance = 5000 # 默认值
                logger.warning("未能计算有效距离，使用默认 max_distance=5000米。")
        else:
            logger.error("只有一个地理区域，无法进行热点分析。Gi* 需要多个区域进行比较。")
            return make_error_response("只有一个地理区域，无法进行热点分析。Gi* 需要多个区域进行比较。", 400)
    
    if max_distance <= 0:
        max_distance = 5000
        logger.warning(f"计算出的 max_distance 非正，强制设置为默认值 5000米。")

    logger.info(f"使用 max_distance={max_distance:.2f} 米创建空间权重矩阵...")
    try:
        W = DistanceBand.from_dataframe(analysis_gdf, threshold=max_distance, binary=True)
        W.transform = 'R'
        logger.info("空间权重矩阵创建完成。")
    except Exception as e:
        logger.error(f"创建空间权重矩阵失败: {e}\n{traceback.format_exc()}")
        return make_error_response(f"创建空间权重矩阵失败: {e}", 500, error_details=traceback.format_exc())

    # 检查并移除孤立区域（没有邻居的区域）
    isolated_indices_original_df_index = [analysis_gdf.index[i] for i, n in W.cardinalities.items() if n == 0]
    
    if isolated_indices_original_df_index:
        removed_names = analysis_gdf.loc[isolated_indices_original_df_index, 'name_for_display'].tolist()
        logger.warning(f"以下 {len(isolated_indices_original_df_index)} 个区域没有邻居，将被移除: {', '.join(removed_names)}")

        analysis_gdf = analysis_gdf.loc[~analysis_gdf.index.isin(isolated_indices_original_df_index)]
        
        if len(analysis_gdf) > 1: # 移除孤立点后，确保仍有足够数据进行分析
            try:
                W = DistanceBand.from_dataframe(analysis_gdf, threshold=max_distance, binary=True)
                W.transform = 'R'
                logger.info(f"已移除孤立区域，并重新创建了空间权重矩阵。剩余 {len(analysis_gdf)} 个区域。")
            except Exception as e:
                logger.error(f"移除孤立区域后重新创建空间权重矩阵失败: {e}\n{traceback.format_exc()}")
                return make_error_response(f"移除孤立区域后重新创建空间权重矩阵失败: {e}", 500, error_details=traceback.format_exc())
        else:
            logger.error("移除孤立点后，剩余区域不足以进行热点分析。")
            return make_error_response("移除孤立点后，剩余区域不足以进行热点分析。 Gi* 需要至少两个区域。", 400)
        
    if analysis_gdf.empty:
        logger.error("所有区域都被认定为孤立点或数据无效。热点分析无法执行。")
        return make_error_response("所有区域都被认定为孤立点或数据无效。热点分析无法执行。", 400)

    if 'crime_count' not in analysis_gdf.columns:
        logger.error("地理区域数据中缺少 'crime_count' 列，无法进行热点分析。")
        return make_error_response("地理区域数据中缺少 'crime_count' 列，无法进行热点分析。", 500)
    
    z = analysis_gdf['crime_count'].values.astype(float)
    logger.info(f"用于 Gi* 分析的犯罪数量 (z) 数组前5个: {z[:5]}")
    logger.info(f"z 数组总和: {z.sum()}")

    # 检查所有值是否都相同，Gi* 分析需要差异
    if np.all(z == z[0]):
        logger.warning("所有区域的犯罪数量相同，无法进行热点分析（Gi* 需要变量差异）。")
        # Gi* 无法计算，可以返回一个特殊的状态或所有p_value为1
        # 但为了避免前端解析错误，这里直接返回错误
        return make_success_response("所有区域的犯罪数量相同，无法进行热点分析。请检查数据。", 
                                     data=output_gdf[['geometry', 'gi_star', 'p_value', 'name']].to_json(),
                                     status_code=200)

    try:
        gi_star = G_Local(z, W, star=True)
        logger.info("Getis-Ord Gi* 计算完成。")
    except Exception as e:
        logger.error(f"执行 Getis-Ord Gi* 计算失败: {e}\n{traceback.format_exc()}")
        return make_error_response(f"执行热点分析计算失败: {e}", 500, error_details=traceback.format_exc())

    analysis_gdf['gi_star'] = gi_star.Gs
    analysis_gdf['p_value'] = gi_star.p_sim
    logger.info("Gi* 值和 P 值已添加到 GeoDataFrame。")
    # logger.debug(f"前5个社区的犯罪数量、Gi* 和 P 值:\n{analysis_gdf[['name_for_display', 'crime_count', 'gi_star', 'p_value']].head()}") # 调试用

    output_gdf = analysis_gdf.copy()
    
    if output_gdf.crs != "EPSG:4326":
        try:
            output_gdf = output_gdf.to_crs(epsg=4326)
            logger.info("结果 GeoDataFrame 已重新投影到 EPSG:4326 用于前端显示。")
        except Exception as e:
            logger.error(f"结果 GeoDataFrame 投影到 EPSG:4326 失败: {e}\n{traceback.format_exc()}")
            return make_error_response("结果数据投影失败，无法返回给前端。", 500, error_details=traceback.format_exc())

    # 精简输出列，只包含前端所需的数据
    output_gdf = output_gdf[['geometry', 'gi_star', 'p_value', 'name_for_display']] 
    output_gdf.rename(columns={'name_for_display': 'name'}, inplace=True)

    logger.info("GeoJSON 数据准备完毕，返回给前端。")
    # 使用 make_success_response 封装 GeoJSON 响应
    # 注意：gpd.GeoDataFrame.to_json() 返回的是字符串，jsonify 会再次对其进行解析。
    # 更好的做法是让 jsonify 直接处理 GeoDataFrame 的字典表示（通过 .__geo_interface__ 或 to_dict('records')）
    # 但由于您的前端直接期望 to_json() 的输出，我们可以直接返回字符串，但确保 Content-Type 正确。
    # Flask jsonify 会自动设置 Content-Type 为 application/json，所以直接传递 to_json() 的结果字符串即可。
    return jsonify(json.loads(output_gdf.to_json())), 200 # 再次解析，确保返回的是Python字典而不是原始字符串

# --- 主运行块 ---
if __name__ == '__main__':
    logger.info(f"Flask 应用程序启动中...")
    # 检查主数据文件是否存在
    if not os.path.exists(MASTER_CSV_PATH):
        logger.critical(f"!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!")
        logger.critical(f"主数据文件 '{MASTER_CSV_PATH}' 未找到。")
        logger.critical(f"请首先运行 'qingxi.py' 脚本以生成主数据文件。")
        logger.critical(f"没有它，应用程序可能无法正常运行。")
        logger.critical(f"!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!")
    # 检查社区边界文件是否加载
    if community_gdf is None or community_gdf.empty:
        logger.critical(f"!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!")
        logger.critical(f"社区边界文件 '{COMMUNITY_BOUNDARIES_PATH}' 未加载或为空。")
        logger.critical(f"热点分析功能可能无法正常使用。")
        logger.critical(f"!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!")

    # 确保 CORS 头部在所有路由中都正确设置
    app.run(debug=True, host='0.0.0.0', port=5000)