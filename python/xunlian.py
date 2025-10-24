import pandas as pd
from statsmodels.tsa.arima.model import ARIMA
from statsmodels.tools.sm_exceptions import ConvergenceWarning, ValueWarning
import joblib
import os
import warnings
import numpy as np
from logging_config import logger
import uuid
from typing import Union # <--- This was already added, good!

# --- 配置常量 ---
# 此路径主要用于此脚本的 __main__ 块
XUNLIAN_DEFAULT_MASTER_DATA_PATH = os.path.join('processed_data', 'master_crime_data_2014-2024.csv')
MODEL_SAVE_DIR = 'trained_models' # app.py 也将使用此目录名
DEFAULT_MODEL_FILENAME = 'arima_crime_model_default.joblib' # app.py 可以将其用作后备
os.makedirs(MODEL_SAVE_DIR, exist_ok=True)

# 一致的列名 (必须与 qingxi.py 输出和 app.py 用法匹配)
TIME_COLUMN_NAME = '发生时间'
OFFENSE_COLUMN_NAME = 'OFFENSE'


def load_and_prepare_data(file_path: str,
                          time_column: str = TIME_COLUMN_NAME, # 使用一致的默认值
                          resample_freq: str = 'ME', # 月末 ('MonthEnd')
                          value_column: str = OFFENSE_COLUMN_NAME) -> pd.Series: # value_column 用于上下文（如果需要），实际使用 .size()
    logger.info(f"开始从 '{file_path}' 加载并准备时间序列数据，时间列: '{time_column}', 重采样频率: {resample_freq}...")
    try:
        df = pd.read_csv(file_path) # parse_dates 在检查列存在后处理
        if df.empty:
            logger.warning(f"文件 '{file_path}' 为空。返回空时间序列。")
            return pd.Series(dtype='float64')

        if time_column not in df.columns:
            logger.error(f"时间列 '{time_column}' 在文件 '{file_path}' 中未找到。返回空时间序列。")
            return pd.Series(dtype='float64')

        df[time_column] = pd.to_datetime(df[time_column], errors='coerce')
        df.dropna(subset=[time_column], inplace=True) # 删除日期转换失败的行

        if df.empty: # 日期转换和 dropna 后再次检查
            logger.warning(f"文件 '{file_path}' 在日期处理后为空。返回空时间序列。")
            return pd.Series(dtype='float64')

        logger.debug(f"从 '{file_path}' 加载完成，共 {len(df)} 条记录。")
        df.set_index(time_column, inplace=True)
        df.sort_index(inplace=True)

        # 通过计算每个周期的记录数来进行聚合
        time_series = df.resample(resample_freq).size()
        time_series = time_series.astype(float).fillna(0.0) # 确保为 float 类型并填充重采样可能产生的 NaN

        if time_series.empty:
            logger.warning(f"数据重采样后时间序列为空。文件: '{file_path}', 频率: {resample_freq}")
        else:
            logger.info(f"数据准备完成，生成时间序列，频率: {resample_freq}，共 {len(time_series)} 个时间点。")
            logger.debug(f"生成的时间序列 (前5条):\n{time_series.head()}")
        return time_series

    except FileNotFoundError:
        logger.error(f"数据文件未找到: {file_path}")
        return pd.Series(dtype='float64')
    except Exception as e:
        logger.error(f"在 '{file_path}' 加载或准备数据时发生错误: {e}", exc_info=True)
        return pd.Series(dtype='float64')

def train_arima_model(ts_data: pd.Series,
                      order: tuple,
                      model_filename: str, # 仅文件名，例如 "my_model.joblib"
                      model_save_dir: str = MODEL_SAVE_DIR) -> Union[ARIMA, None]:
    if ts_data.empty:
        logger.error("输入的时间序列为空，无法训练模型。")
        return None
    if not isinstance(ts_data.index, pd.DatetimeIndex):
        logger.error("时间序列的索引必须是 DatetimeIndex。")
        return None

    # 检查是否有足够的数据点
    min_required_length = sum(order) + order[1] + 5 # 一个启发式规则
    if len(ts_data) < min_required_length:
        logger.error(f"数据点过少 ({len(ts_data)})，不足以稳定地以阶数 {order} 训练ARIMA模型。至少需要约 {min_required_length} 个点。")
        return None

    # 确保 model_save_dir 存在
    os.makedirs(model_save_dir, exist_ok=True)
    full_model_path = os.path.join(model_save_dir, model_filename)

    logger.info(f"开始训练ARIMA模型，阶数: {order}，数据点: {len(ts_data)}。模型将保存至: {full_model_path}")

    try:
        # 如果可能，确保序列设置了频率
        current_freq = ts_data.index.freq
        if current_freq is None:
            inferred_freq = pd.infer_freq(ts_data.index)
            if inferred_freq:
                ts_data = ts_data.asfreq(inferred_freq)
                logger.info(f"时间序列频率未设置，已推断并设置为: {inferred_freq}")
                current_freq = inferred_freq
            else:
                if ts_data.index.has_duplicates: # 如果频率推断失败，检查是否有重复项
                    logger.warning("时间序列索引中存在重复项。可能导致无法推断频率或影响模型。")
                logger.warning("无法推断时间序列频率。模型训练可能失败或结果不准确。请确保数据已正确按频率聚合。")

        # 抑制 ARIMA 拟合过程中的常见警告
        with warnings.catch_warnings():
            warnings.simplefilter('ignore', ConvergenceWarning)
            warnings.simplefilter('ignore', UserWarning) # 捕获 "No frequency information was provided"
            warnings.simplefilter('ignore', FutureWarning)
            warnings.simplefilter('ignore', ValueWarning) # 捕获 "A date index has been provided, but it has no associated frequency"

            model = ARIMA(ts_data, order=order, missing='drop', # 'drop' NaNs（如果还有的话）
                          enforce_stationarity=False, enforce_invertibility=False)
            fitted_model = model.fit()

        logger.info(f"ARIMA模型训练完成。")
        try: # 如果可用，尝试记录摘要
            summary_table1 = str(fitted_model.summary().tables[0])
            summary_table2 = str(fitted_model.summary().tables[1])
            logger.debug(f"模型摘要 (部分):\n{summary_table1}\n{summary_table2}")
        except Exception as summary_ex:
            logger.debug(f"无法获取完整模型摘要: {summary_ex}")


        joblib.dump(fitted_model, full_model_path)
        logger.info(f"模型已成功保存至: {full_model_path}")
        return fitted_model

    except Exception as e:
        logger.error(f"训练ARIMA模型 (阶数={order}, 数据点={len(ts_data)}, 频率={current_freq}) 时发生错误: {e}", exc_info=True)
        return None

def load_arima_model(model_filename: str, model_save_dir: str = MODEL_SAVE_DIR):
    full_model_path = os.path.join(model_save_dir, model_filename)
    logger.info(f"开始从 '{full_model_path}' 加载模型...")
    try:
        if not os.path.exists(full_model_path):
            logger.error(f"模型文件未找到: {full_model_path}")
            return None
        loaded_model = joblib.load(full_model_path)
        logger.info(f"模型 '{full_model_path}' 加载成功。")
        return loaded_model
    except Exception as e:
        logger.error(f"加载模型 '{full_model_path}' 时发生错误: {e}", exc_info=True)
        return None

# MODIFIED predict_with_model
def predict_with_model(fitted_model, steps: int, alpha: float = 0.05): # 新增 alpha 参数
    if fitted_model is None:
        logger.error("模型对象为空，无法进行预测。")
        return None, None, None # 返回三个值
    # 检查模型是否具有 get_forecast 方法 (新版 statsmodels)
    if not hasattr(fitted_model, 'get_forecast'):
        logger.error("提供的模型对象似乎不是一个有效的ARIMA拟合模型 (缺少 get_forecast 方法)。旧版 predict 不直接提供置信区间。")
        return None, None, None # 返回三个值

    logger.info(f"使用模型进行未来 {steps} 步的预测 (置信水平: {1-alpha:.0%})...") # 显示置信水平
    try:
        forecast_results = fitted_model.get_forecast(steps=steps)
        predictions = forecast_results.predicted_mean
        conf_int_df = forecast_results.conf_int(alpha=alpha) # 获取置信区间 DataFrame

        # 确保预测值和置信区间不为负
        predictions[predictions < 0] = 0
        lower_ci = conf_int_df.iloc[:, 0].copy() # 获取置信区间下限
        upper_ci = conf_int_df.iloc[:, 1].copy() # 获取置信区间上限
        lower_ci[lower_ci < 0] = 0
        upper_ci[upper_ci < 0] = 0 # 上限也可能预测为负，尤其是数据稀疏时

        # 确保上限不低于下限 (一个健全性检查)
        upper_ci = np.maximum(upper_ci, lower_ci)

        logger.info(f"成功生成预测结果及置信区间。")
        if isinstance(predictions, pd.Series) and not predictions.empty:
            logger.debug(f"预测均值 (前5条):\n{predictions.head()}")
            logger.debug(f"置信区间下限 (前5条):\n{lower_ci.head()}")
            logger.debug(f"置信区间上限 (前5条):\n{upper_ci.head()}")

        return predictions, lower_ci, upper_ci # 返回预测均值、下限和上限

    except Exception as e:
        logger.error(f"使用模型预测时发生错误: {e}", exc_info=True)
        return None, None, None # 返回三个值

def aggregate_series_from_file(
    filepath: str,
    date_column: str = TIME_COLUMN_NAME,
    resample_freq: str = 'ME' # 月末 ('MonthEnd')
) -> Union[dict, None]: # <--- MODIFIED THIS LINE
    """
    从 CSV 文件加载数据，按时间聚合，并以适合图表的格式返回：
    {"timestamps": [...], "values": [...]}.
    """
    logger.info(f"从文件 '{filepath}' 加载并聚合实际数据，频率: {resample_freq}")
    try:
        if not os.path.exists(filepath):
            logger.error(f"聚合所需的数据文件未找到: {filepath}")
            return None

        df = pd.read_csv(filepath)
        if df.empty:
            logger.warning(f"用于聚合的文件 '{filepath}' 为空。")
            return {"timestamps": [], "values": []}

        if date_column not in df.columns:
            logger.error(f"日期列 '{date_column}' 在文件 '{filepath}' 中未找到。")
            return None

        df[date_column] = pd.to_datetime(df[date_column], errors='coerce')
        df.dropna(subset=[date_column], inplace=True)

        if df.empty: # 日期处理后检查
            logger.warning(f"文件 '{filepath}' 在日期处理后为空 (用于聚合)。")
            return {"timestamps": [], "values": []}

        df.set_index(date_column, inplace=True)
        df.sort_index(inplace=True)

        aggregated_series = df.resample(resample_freq).size()
        aggregated_series = aggregated_series.fillna(0.0) # 填充重采样产生的任何 NaN

        # 准备 JSON 输出
        timestamps = [ts.isoformat() for ts in aggregated_series.index.to_list()]
        values = aggregated_series.values.tolist()

        logger.info(f"成功聚合了 {len(timestamps)} 个时间点的实际数据从 '{filepath}'。")
        return {"timestamps": timestamps, "values": values}

    except Exception as e:
        logger.error(f"聚合文件 '{filepath}' 中的数据时出错: {e}", exc_info=True)
        return None

def evaluate_model(true_values: pd.Series, predictions: pd.Series) -> Union[float, None]:
    # (与您提供的代码相比没有更改，假设其工作正常)
    from sklearn.metrics import mean_squared_error
    if true_values.empty or predictions.empty or len(true_values) != len(predictions):
        logger.error("评估数据无效或长度不匹配。")
        return None
    try:
        rmse = np.sqrt(mean_squared_error(true_values.values, predictions.values))
        logger.info(f"模型评估 RMSE: {rmse:.4f}")
        return rmse
    except Exception as e:
        logger.error(f"评估模型时发生错误: {e}", exc_info=True)
        return None

if __name__ == '__main__':
    logger.info("--- 以测试/训练模式运行 xunlian.py ---")
    logger.info(f"独立测试：尝试从主数据文件 '{XUNLIAN_DEFAULT_MASTER_DATA_PATH}' 加载数据...")

    # 测试 load_and_prepare_data
    crime_series_monthly = load_and_prepare_data(
        file_path=XUNLIAN_DEFAULT_MASTER_DATA_PATH, # 使用此文件中定义的默认路径
        time_column=TIME_COLUMN_NAME,
        resample_freq='ME' # 月末 ('MonthEnd')
    )

    if crime_series_monthly.empty:
        logger.error(f"从 '{XUNLIAN_DEFAULT_MASTER_DATA_PATH}' (月度) 加载和准备数据失败。程序退出。")
        exit(1)
    logger.info(f"月度时间序列数据加载完毕，共 {len(crime_series_monthly)} 个数据点。")

    # 如果数据点足够，则拆分数据进行基本的训练/测试
    num_test_periods = 12
    if len(crime_series_monthly) > num_test_periods * 2:
        train_series = crime_series_monthly[:-num_test_periods]
        test_series = crime_series_monthly[-num_test_periods:]
        logger.info(f"数据已划分为训练集 ({len(train_series)} 点) 和测试集 ({len(test_series)} 点)。")
    else:
        logger.warning("数据点不足以划分训练集和测试集，将使用所有数据进行训练。")
        train_series = crime_series_monthly
        test_series = pd.Series(dtype='float64') # 用于测试的空序列

    arima_order_to_test = (5, 1, 1)
    test_model_filename = (
        f'test_master_arima'
        f'_p{arima_order_to_test[0]}_d{arima_order_to_test[1]}_q{arima_order_to_test[2]}'
        f'_freqME_{uuid.uuid4().hex[:6]}.joblib' # 添加少量哈希以避免重新运行时名称冲突
    )

    logger.info(f"开始为独立测试训练模型，阶数: {arima_order_to_test}, 文件名: {test_model_filename}")
    # 如果与 app.py 的上下文不同，则显式传递 MODEL_SAVE_DIR，或依赖默认值
    trained_model = train_arima_model(
        ts_data=train_series,
        order=arima_order_to_test,
        model_filename=test_model_filename,
        model_save_dir=MODEL_SAVE_DIR # 使用全局常量
    )

    if trained_model:
        logger.info(f"独立测试：模型训练阶段完成。模型保存在: {os.path.join(MODEL_SAVE_DIR, test_model_filename)}")

        if not test_series.empty:
            logger.info(f"独立测试：在测试集 ({len(test_series)} 点) 上进行预测以评估模型...")
            # predict_with_model 返回三个值：predictions, lower_ci, upper_ci
            test_predictions_series, _, _ = predict_with_model(trained_model, steps=len(test_series), alpha=0.05)

            if test_predictions_series is not None and isinstance(test_predictions_series, pd.Series) and len(test_predictions_series) == len(test_series):
                try:
                    # 如果 predict_with_model 返回带有新索引的 Series，则对齐索引以进行正确评估
                    # 注意：predict_with_model 返回的 series 索引应与预测周期匹配，不应直接赋值 test_series.index
                    # 通常，get_forecast 会返回一个带有正确日期索引的 Series
                    # 所以这里的对齐逻辑可能需要根据实际predict_with_model返回的索引情况调整。
                    # 为了安全，我们会确保它们有相同的长度和顺序。
                    # if not test_predictions_series.index.equals(test_series.index):
                    #     test_predictions_series = test_predictions_series.set_axis(test_series.index)
                    # 更好的做法是依赖 statsmodels 的预测索引，确保其与目标日期范围一致。
                    # 如果需要强制对齐，可以这样做，但要小心潜在的时间错位问题。
                    # 这里，我们只是确保在计算 RMSE 时，它们是逐点对应的。
                    evaluate_model(test_series, test_predictions_series)
                except Exception as e:
                    logger.error(f"独立测试：评估测试预测时出错: {e}", exc_info=True)
            elif test_predictions_series is not None:
                logger.warning(f"独立测试：测试预测数量/类型 ({len(test_predictions_series) if hasattr(test_predictions_series, '__len__') else 'N/A'}) 与测试集大小 ({len(test_series)}) 不符，或类型错误，无法评估。")
            else:
                logger.warning("独立测试：未能生成测试集预测。")
        else:
            logger.info("独立测试：测试集为空，跳过评估。")

        # 测试加载和未来预测
        logger.info(f"独立测试：演示加载已保存模型 '{test_model_filename}' 并进行未来预测...")
        loaded_model_for_future = load_arima_model(model_filename=test_model_filename, model_save_dir=MODEL_SAVE_DIR)
        if loaded_model_for_future:
            future_steps = 6
            logger.info(f"独立测试：进行未来 {future_steps} 步的预测。")
            # predict_with_model 返回三个值，这里我们只关注预测值
            future_predictions_series, _, _ = predict_with_model(loaded_model_for_future, steps=future_steps, alpha=0.05)
            if future_predictions_series is not None:
                logger.info(f"独立测试：对未来 {future_steps} 个周期的预测结果:\n{future_predictions_series}")
            else:
                logger.error("独立测试：未能生成未来预测。")
        else:
            logger.error(f"独立测试：加载模型 '{test_model_filename}' 失败，无法进行未来预测演示。")
    else:
        logger.error(f"独立测试：模型训练失败，阶数 {arima_order_to_test}。程序退出。")
        exit(1)

    logger.info("--- xunlian.py 测试/训练模式运行结束 ---")