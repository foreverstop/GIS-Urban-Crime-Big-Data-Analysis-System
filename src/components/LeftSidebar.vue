<!-- LeftSidebar.vue -->
<template>
  <div class="left-sidebar"> <h3 class="menu-title">功能操作面板</h3>
    <div class="menu-list-scroll-container"> <div class="menu-section">
        <h4 class="menu-section-header-interactive">
          <i class="fas fa-database"></i> 数据准备与筛选
        </h4>
        <div class="form-group">
          <label for="start-year">起始年份:</label>
          <input type="number" id="start-year" v-model.number="dataProcessing.startYear" placeholder="例如: 2014">
        </div>
        <div class="form-group">
          <label for="end-year">结束年份:</label>
          <input type="number" id="end-year" v-model.number="dataProcessing.endYear" placeholder="例如: 2025">
        </div>
        <div class="form-group">
          <label class="checkbox-label">
            <input type="checkbox" v-model="dataProcessing.filterSpecificOffenses">
            筛选特定案件类型?
          </label>
          <small v-if="!dataProcessing.filterSpecificOffenses">后续操作将基于选定年份范围内的所有案件类型数据。</small>
        </div>
        <div class="form-group" v-if="dataProcessing.filterSpecificOffenses">
          <label for="offense-types">选择案件类型 (可多选):</label>
          <select id="offense-types" v-model="dataProcessing.selectedOffenses" multiple class="multi-select-offense">
            <option v-for="offense in dataProcessing.availableOffenses" :key="offense.id" :value="offense.id">
              {{ offense.name }}
            </option>
          </select>
          <small v-if="dataProcessing.filterSpecificOffenses && dataProcessing.selectedOffenses.length === 0">请至少选择一种案件类型，或取消勾选上方的“筛选特定案件类型”以使用所有类型。</small>
        </div>
        <div class="form-group">
          <button @click="prepareFilteredData" :disabled="loading.prepareData" class="action-button">
            <i :class="loading.prepareData ? 'fas fa-spinner fa-spin' : 'fas fa-cogs'"></i>
            {{ loading.prepareData ? '准备中...' : '准备筛选后数据' }}
          </button>
          <small>此操作将请求后端根据上方选择的年份和案件类型，从主数据源中筛选并准备数据子集，供后续模型训练等步骤使用。</small>
        </div>
        <div v-if="messages.prepareData" :class="['message', messages.prepareData.type]">
          {{ messages.prepareData.text }}
        </div>
      </div>

      <div class="menu-section">
        <h4 class="menu-section-header-interactive">
          <i class="fas fa-brain"></i> 模型训练 (ARIMA)
        </h4>
        <small>请确保已点击上方“准备筛选后数据”按钮。模型将基于该步骤准备的数据进行训练。</small>
        <div class="form-group">
          <label for="resample-freq">数据聚合频率:</label>
          <select id="resample-freq" v-model="modelTraining.resampleFreq">
            <option value="D">每日 (D)</option>
            <option value="W">每周 (W)</option>
            <option value="M">每月 (M)</option>
            <option value="ME">每月最后一日 (ME)</option>
            <option value="QE">每季度最后一日 (QE)</option>
            <option value="YE">每年最后一日 (YE)</option>
          </select>
        </div>
        <div class="form-group">
          <label for="arima-p">ARIMA p (AR阶数):</label>
          <input type="number" id="arima-p" v-model.number="modelTraining.arimaOrder.p" min="0">
        </div>
        <div class="form-group">
          <label for="arima-d">ARIMA d (差分阶数):</label>
          <input type="number" id="arima-d" v-model.number="modelTraining.arimaOrder.d" min="0">
        </div>
        <div class="form-group">
          <label for="arima-q">ARIMA q (MA阶数):</label>
          <input type="number" id="arima-q" v-model.number="modelTraining.arimaOrder.q" min="0">
        </div>
        <div class="form-group">
          <label for="model-filename-train">模型文件名 (保存时):</label>
          <input type="text" id="model-filename-train" v-model="modelTraining.modelFilename" placeholder="例如: arima_ME_theft_2020_2022.joblib">
          <small>建议文件名包含频率、案件类型和年份。若留空，后端将使用默认名。</small>
        </div>
        <div class="form-group">
          <button @click="trainModel" :disabled="loading.trainModel" class="action-button">
            <i :class="loading.trainModel ? 'fas fa-spinner fa-spin' : 'fas fa-dumbbell'"></i>
            {{ loading.trainModel ? '训练中...' : '开始训练模型' }}
          </button>
        </div>
        <div v-if="messages.trainModel" :class="['message', messages.trainModel.type]">
          {{ messages.trainModel.text }}
        </div>
        <div v-if="modelTraining.summary" class="model-summary">
          <h5>模型摘要 (部分):</h5>
          <pre>{{ modelTraining.summary }}</pre>
        </div>
      </div>

      <div class="menu-section">
        <h4 class="menu-section-header-interactive">
          <i class="fas fa-chart-line"></i> 犯罪数量预测
        </h4>
        <div class="form-group">
          <label for="prediction-steps">预测未来期数:</label>
          <input type="number" id="prediction-steps" v-model.number="prediction.steps" placeholder="例如: 12" min="1">
        </div>
        <div class="form-group">
          <label for="model-filename-predict">使用模型文件名:</label>
          <input type="text" id="model-filename-predict" v-model="prediction.modelFilename" placeholder="例如: arima_ME_theft_2020_2022.joblib">
           <small>若刚训练完模型，此处通常会自动填充。</small>
        </div>
        <div class="form-group">
          <label for="prediction-confidence">置信水平 (%):</label>
          <select id="prediction-confidence" v-model.number="prediction.confidenceLevel">
            <option :value="90">90%</option>
            <option :value="95">95%</option>
            <option :value="99">99%</option>
          </select>
          <small>选择预测的置信区间水平 (需要后端支持)。</small>
        </div>
        <div class="form-group">
          <button @click="getPrediction" :disabled="loading.predict" class="action-button">
            <i :class="loading.predict ? 'fas fa-spinner fa-spin' : 'fas fa-bullseye'"></i>
            {{ loading.predict ? '预测中...' : '获取预测结果' }}
          </button>
        </div>
        <div v-if="messages.predict" :class="['message', messages.predict.type]">
          {{ messages.predict.text }}
        </div>
        <div v-if="prediction.results.length > 0" class="prediction-results">
          <h5>预测结果 (点估计):</h5>
          <ul>
            <li v-for="(item, index) in prediction.results" :key="index">
              {{ item.timestamp }}: {{ item.value.toFixed(2) }}
              <span v-if="item.lower && item.upper" style="font-size: 0.9em; color: #bdc3c7;">
                (区间: {{ item.lower.toFixed(2) }} - {{ item.upper.toFixed(2) }})
              </span>
            </li>
          </ul>
        </div>
      </div>

       <div class="menu-section">
        <h4 class="menu-section-header-interactive">
          <i class="fas fa-table"></i> 查看已准备数据 (供参考)
        </h4>
        <small>查看基于上方“数据准备与筛选”部分选择的年份和案件类型，从主数据源筛选后的数据样本（未聚合）。</small>
        <div class="form-group">
          <label for="data-limit">加载记录数上限:</label>
          <input type="number" id="data-limit" v-model.number="viewData.limit" placeholder="默认20条" min="1">
        </div>
        <div class="form-group">
          <button @click="fetchProcessedDataSample" :disabled="loading.fetchData" class="action-button">
            <i :class="loading.fetchData ? 'fas fa-spinner fa-spin' : 'fas fa-search'"></i>
            {{ loading.fetchData ? '加载中...' : '加载筛选后数据样本' }}
          </button>
        </div>
        <div v-if="messages.fetchData" :class="['message', messages.fetchData.type]">
          {{ messages.fetchData.text }}
        </div>
      </div>
    </div>
  </div>
</template>

<script>
import axios from 'axios';
const API_BASE_URL = 'http://127.0.0.1:5000/api';

export default {
  name: 'LeftSidebar',
  data() {
    return {
      dataProcessing: {
        startYear: new Date().getFullYear() - 4,
        endYear: new Date().getFullYear() - 1,
        filterSpecificOffenses: false,
        selectedOffenses: [],
        availableOffenses: [
          { id: 'THEFT/OTHER', name: '盗窃/其他' }, { id: 'HOMICIDE', name: '凶杀' },
          { id: 'ASSAULT', name: '攻击' }, { id: 'BURGLARY', name: '入室盗窃' },
          { id: 'MOTOR VEHICLE THEFT', name: '机动车盗窃' }, { id: 'ROBBERY', name: '抢劫' },
          { id: 'CRIMINAL DAMAGE', name: '刑事毁坏' }, { id: 'WEAPONS VIOLATION', name: '武器违规' },
        ],
        appliedFilters: null,
      },
      modelTraining: {
        resampleFreq: 'ME',
        arimaOrder: { p: 5, d: 1, q: 0 },
        modelFilename: '',
        summary: '',
        appliedTrainingFilters: null,
      },
      prediction: {
        steps: 12,
        modelFilename: '',
        confidenceLevel: 95, // 新增：置信水平
        results: [], // 将包含 {timestamp, value, lower, upper}
      },
      viewData: { limit: 20, },
      loading: { prepareData: false, trainModel: false, predict: false, fetchData: false, },
      messages: { prepareData: null, trainModel: null, predict: null, fetchData: null, },
    };
  },
  methods: {
    setResultMessage(key, type, text, duration = 7000) {
      this.messages[key] = { type, text };
      setTimeout(() => {
        if (this.messages[key] && this.messages[key].text === text) {
             this.messages[key] = null;
        }
      }, duration);
    },
    async prepareFilteredData() {
      // ... (内容与之前基本一致)
      if (!this.dataProcessing.startYear || !this.dataProcessing.endYear) {
        this.setResultMessage('prepareData', 'error', '请输入起始和结束年份。');
        return;
      }
      if (this.dataProcessing.startYear > this.dataProcessing.endYear) {
        this.setResultMessage('prepareData', 'error', '起始年份不能大于结束年份。');
        return;
      }
      let offensesToProcess = null;
      if (this.dataProcessing.filterSpecificOffenses) {
        if (this.dataProcessing.selectedOffenses.length > 0) {
          offensesToProcess = this.dataProcessing.selectedOffenses;
        } else {
          this.setResultMessage('prepareData', 'error', '已勾选“筛选特定案件类型”，但您尚未选择任何具体的案件类型。请选择类型或取消勾选。');
          return;
        }
      }
      this.loading.prepareData = true;
      this.messages.prepareData = null;
      const currentFilters = {
        startYear: this.dataProcessing.startYear,
        endYear: this.dataProcessing.endYear,
        offenses: offensesToProcess,
        filterSpecificOffenses: this.dataProcessing.filterSpecificOffenses
      };
      try {
        const payload = {
          start_year: currentFilters.startYear,
          end_year: currentFilters.endYear,
          offenses: currentFilters.offenses,
        };
        const response = await axios.post(`${API_BASE_URL}/prepare-filtered-data`, payload);
        this.setResultMessage('prepareData', 'success', response.data.message || '数据筛选与准备成功！后续操作将使用此结果。');
        this.dataProcessing.appliedFilters = currentFilters;
        this.$emit('data-filters-applied', {
            message: response.data.message,
            details: response.data.data,
            filters: currentFilters
        });
      } catch (error) {
        const errorMsg = error.response?.data?.message || error.message || '数据准备失败。';
        this.setResultMessage('prepareData', 'error', `准备失败: ${errorMsg}`);
        console.error("数据准备错误 (/api/prepare-filtered-data):", error.response || error);
        this.dataProcessing.appliedFilters = null;
      } finally {
        this.loading.prepareData = false;
      }
    },
    async trainModel() {
      // ... (内容与之前基本一致)
      if (!this.dataProcessing.appliedFilters) {
        this.setResultMessage('trainModel', 'error', '请先成功执行“准备筛选后数据”步骤。');
        return;
      }
     if (!this.modelTraining.modelFilename || this.modelTraining.modelFilename.trim() === '') {
        this.setResultMessage('trainModel', 'error', '请输入模型文件名 (例如: arima_model.joblib)。');
        return;
      }
      this.loading.trainModel = true;
      this.messages.trainModel = null;
      this.modelTraining.summary = '';
      const filtersForTraining = this.dataProcessing.appliedFilters;
      const payload = {
        resample_freq: this.modelTraining.resampleFreq,
        arima_order: [
          this.modelTraining.arimaOrder.p,
          this.modelTraining.arimaOrder.d,
          this.modelTraining.arimaOrder.q
        ],
        model_filename: this.modelTraining.modelFilename || null,
        start_year: filtersForTraining.startYear,
        end_year: filtersForTraining.endYear,
        offenses: filtersForTraining.offenses,
      };
      try {
        const response = await axios.post(`${API_BASE_URL}/train-model`, payload);
        this.setResultMessage('trainModel', 'success', response.data.message || '模型训练成功！');
        let trainedModelFilename = this.modelTraining.modelFilename;
        if (response.data.data) {
            if (response.data.data.model_summary_preview) {
                 this.modelTraining.summary = response.data.data.model_summary_preview;
            }
            if (response.data.data.model_filename_used) {
                trainedModelFilename = response.data.data.model_filename_used;
                this.modelTraining.modelFilename = trainedModelFilename;
                this.prediction.modelFilename = trainedModelFilename;
            }
        }
        this.modelTraining.appliedTrainingFilters = {
            ...filtersForTraining,
            resampleFreq: this.modelTraining.resampleFreq
        };
        this.$emit('model-trained', {
            message: response.data.message,
            modelFilename: trainedModelFilename,
            summary: this.modelTraining.summary,
            trainingFilters: this.modelTraining.appliedTrainingFilters
        });
      } catch (error) {
        const errorMsg = error.response?.data?.message || error.message || '模型训练失败。';
        this.setResultMessage('trainModel', 'error', `训练失败: ${errorMsg}`);
        console.error("模型训练错误 (/api/train-model):", error.response || error);
        this.modelTraining.appliedTrainingFilters = null;
      } finally {
        this.loading.trainModel = false;
      }
    },
    async getPrediction() {
      if (!this.prediction.steps || this.prediction.steps <= 0) {
        this.setResultMessage('predict', 'error', '请输入有效的预测期数 (大于0)。');
        return;
      }
      if (!this.prediction.modelFilename) {
        this.setResultMessage('predict', 'error', '请输入要用于预测的模型文件名。');
        return;
      }
      this.loading.predict = true;
      this.messages.predict = null;
      this.prediction.results = [];

      try {
        const payload = {
          steps: this.prediction.steps,
          model_filename: this.prediction.modelFilename,
          confidence_level: this.prediction.confidenceLevel, // **优化：直接发送百分比值**
        };
        console.log("发送预测请求, Payload:", payload); // 用于调试

        const response = await axios.post(`${API_BASE_URL}/predict`, payload);
        this.setResultMessage('predict', 'success', response.data.message || '预测成功！');

        let formattedPredictions = [];
        if (response.data && response.data.data && response.data.data.predictions) {
          const predictionsData = response.data.data.predictions;

          if (Array.isArray(predictionsData)) {
             formattedPredictions = predictionsData.map(p => ({
                timestamp: p.timestamp, // 为 ECharts 保留 ISO 字符串格式
                value: p.value,
                lower: p.lower_ci, // 后端应使用 'lower_ci' 和 'upper_ci'
                upper: p.upper_ci,
             }));
          } else {
             this.setResultMessage('predict', 'warning', '预测请求成功，但未返回有效的预测数据结构 (非数组)。');
          }
        } else {
            this.setResultMessage('predict', 'warning', '预测请求成功，但未返回有效的预测数据。');
        }
        this.prediction.results = formattedPredictions;

        const actualDataParamsForChart = this.modelTraining.appliedTrainingFilters || this.dataProcessing.appliedFilters;
        let resampleFreqForChart = this.modelTraining.resampleFreq; // 默认为当前训练的频率
        if (this.modelTraining.appliedTrainingFilters) {
            resampleFreqForChart = this.modelTraining.appliedTrainingFilters.resampleFreq;
        } else if (this.dataProcessing.appliedFilters){
            // 如果还没有训练模型，但数据已准备好，我们需要一个重采样频率用于实际数据。
            // 然而，预测依赖于已训练的模型，该模型具有一个重采样频率。
            // 让我们假设 modelTraining.resampleFreq 是与加载的模型或上次训练尝试相关联的那个。
        }


        if (!actualDataParamsForChart) {
             this.setResultMessage('predict', 'warning', '预测完成，但获取对应历史数据的参数不完整，图表可能缺少实际数据对比。');
        }

        this.$emit('prediction-retrieved', {
            message: response.data.message,
            predictions: this.prediction.results,
            modelUsed: this.prediction.modelFilename,
            steps: this.prediction.steps,
            actualDataParams: actualDataParamsForChart ? {
                start_year: actualDataParamsForChart.startYear,
                end_year: actualDataParamsForChart.endYear,
                offenses: actualDataParamsForChart.offenses,
                resample_freq: resampleFreqForChart // 确保这是用于模型的频率
            } : null
        });
      } catch (error) {
        const errorMsg = error.response?.data?.message || error.message || '获取预测失败。';
        this.setResultMessage('predict', 'error', `预测失败: ${errorMsg}`);
        console.error("预测错误 (/api/predict):", error.response || error);
      } finally {
        this.loading.predict = false;
      }
    },
    async fetchProcessedDataSample() {
      // ... (内容与之前基本一致)
      this.loading.fetchData = true;
      this.messages.fetchData = null;
      const currentFiltersForSample = {
        startYear: this.dataProcessing.startYear,
        endYear: this.dataProcessing.endYear,
        offenses: this.dataProcessing.filterSpecificOffenses ?
                  (this.dataProcessing.selectedOffenses.length > 0 ? this.dataProcessing.selectedOffenses : null)
                  : null,
      };
      if (this.dataProcessing.filterSpecificOffenses && !currentFiltersForSample.offenses) {
          this.setResultMessage('fetchData', 'error', '已勾选“筛选特定案件类型”，但未选择任何类型。请选择或取消勾选。');
          this.loading.fetchData = false;
          return;
      }
      if (!currentFiltersForSample.startYear || !currentFiltersForSample.endYear) {
        this.setResultMessage('fetchData', 'error', '请输入起始和结束年份以查看数据样本。');
        this.loading.fetchData = false;
        return;
      }
      try {
        const params = {
            start_year: currentFiltersForSample.startYear,
            end_year: currentFiltersForSample.endYear,
            limit: (this.viewData.limit > 0 ? this.viewData.limit : 20),
        };
        if (currentFiltersForSample.offenses && currentFiltersForSample.offenses.length > 0) {
            params.offenses = currentFiltersForSample.offenses;
        }
        const response = await axios.get(`${API_BASE_URL}/get-processed-data-sample`, { params });
        this.setResultMessage('fetchData', 'success', response.data.message || '已处理数据样本加载成功!');
        this.$emit('processed-data-sample-retrieved', {
            sampleData: response.data.data?.sample_data || [],
            totalMatchingRecords: response.data.data?.total_matching_records || 0,
            filtersApplied: response.data.data?.filters_applied || params,
            tempFilenameUsed: response.data.data?.temp_filename_used || ''
        });
      } catch (error) {
        const errorMsg = error.response?.data?.message || error.message || '加载已处理数据样本失败。';
        this.setResultMessage('fetchData', 'error', `加载失败: ${errorMsg}`);
        console.error("加载已处理数据样本错误 (/api/get-processed-data-sample):", error.response || error);
      } finally {
        this.loading.fetchData = false;
      }
    }
  },
  watch: {
    'dataProcessing.startYear'() { this.modelTraining.appliedTrainingFilters = null; this.dataProcessing.appliedFilters = null;},
    'dataProcessing.endYear'() { this.modelTraining.appliedTrainingFilters = null; this.dataProcessing.appliedFilters = null;},
    'dataProcessing.selectedOffenses': {
        handler() { this.modelTraining.appliedTrainingFilters = null; this.dataProcessing.appliedFilters = null;},
        deep: true
    },
    'dataProcessing.filterSpecificOffenses'() { this.modelTraining.appliedTrainingFilters = null; this.dataProcessing.appliedFilters = null;},
     // 新增: 监听聚合频率变化并发出事件
     'modelTraining.resampleFreq'(newFreq) {
      this.$emit('resample-freq-updated', newFreq);
    }
  }
};
</script>

<style scoped>
/* 全局变量和基本样式，覆盖 Element Plus 默认样式 */
:root {
  --digital-bg-color: #0A1838;
  /* 深蓝背景 */
  --digital-primary-color: #00FFFF;
  /* 亮青色 */
  --digital-secondary-color: #007BFF;
  /* 亮蓝色（可用于强调色） */
  --digital-text-color: #A0B0D0;
  /* 浅灰色文字 */
  --digital-border-color: #00FFFF;
  /* 边框颜色 */
  --digital-glow-color: #00FFFF;
  /* 发光颜色 */
  --digital-panel-bg: rgba(10, 24, 56, 0.7);
  /* 面板背景透明度 */
  --header-height: 80px;
  /* 头部高度 */
}

/* 侧边栏容器 */
.left-sidebar {
  width: 330px; /* 或您希望的宽度 */
  background-color: var(--digital-panel-bg); /* 使用半透明面板背景 */
  color: var(--digital-text-color); /* 使用浅灰色文字 */
  padding-top: 20px; /* 顶部留白给标题 */
  padding-bottom: 20px; /* 底部留白 */
  height: 100%; /* 关键：使其高度充满父容器 main-content-wrapper */
  display: flex;
  flex-direction: column;
  border-right: 1px solid var(--digital-border-color); /* 亮青色边框 */
  box-shadow: 2px 0 15px rgba(0, 255, 255, 0.3); /* 侧边栏右侧发光 */
  flex-shrink: 0; /* 防止侧边栏在空间不足时被压缩 */
  overflow: hidden; /* 根元素隐藏溢出，让内部容器滚动 */
}

/* 菜单标题 */
.menu-title {
  font-size: 1.6em; /* 稍微大一点 */
  font-weight: bold;
  text-align: center;
  margin-bottom: 20px; /* 增加底部间距 */
  color: var(--digital-primary-color); /* 亮青色 */
  text-shadow: 0 0 8px rgba(0, 255, 255, 0.8); /* 发光效果 */
  padding: 0 20px;
  flex-shrink: 0;
}

/* 滚动容器 */
.menu-list-scroll-container {
  overflow-y: auto;
  overflow-x: hidden;
  flex-grow: 1;
  padding-left: 20px;
  padding-right: 20px;
}

/* 滚动条美化 (Webkit 浏览器) */
.menu-list-scroll-container::-webkit-scrollbar {
  width: 8px;
}
.menu-list-scroll-container::-webkit-scrollbar-track {
  background: rgba(0, 255, 255, 0.1); /* 半透明亮青色背景 */
  border-radius: 4px;
}
.menu-list-scroll-container::-webkit-scrollbar-thumb {
  background-color: var(--digital-primary-color); /* 亮青色滑块 */
  border-radius: 4px;
  border: 2px solid var(--digital-bg-color); /* 深蓝边框 */
}
.menu-list-scroll-container::-webkit-scrollbar-thumb:hover {
  background-color: #00E5E5; /* 悬停时更亮的青色 */
}

/* 菜单部分标题（可交互） */
.menu-section-header-interactive {
  font-size: 1.2em; /* 稍微大一点 */
  font-weight: bold;
  color: var(--digital-primary-color); /* 亮青色 */
  padding: 12px 0;
  margin-top: 15px; /* 增加顶部间距 */
  border-bottom: 1px solid rgba(0, 255, 255, 0.2); /* 半透明亮青色边框 */
  border-top: 1px solid rgba(0, 255, 255, 0.2); /* 半透明亮青色边框 */
  display: flex;
  align-items: center;
  text-shadow: 0 0 5px rgba(0, 255, 255, 0.5); /* 轻微发光 */
  cursor: pointer; /* 表示可交互 */
  transition: all 0.2s ease-in-out;
}
.menu-section-header-interactive i {
  margin-right: 10px;
  color: var(--digital-secondary-color); /* 亮蓝色图标 */
}
.menu-section-header-interactive:hover {
  color: #00E5E5; /* 悬停时更亮的青色 */
  text-shadow: 0 0 10px rgba(0, 255, 255, 0.8); /* 悬停时更强发光 */
}


.menu-list-scroll-container > .menu-section:first-child .menu-section-header-interactive {
  margin-top: 0;
  border-top: none;
}
.menu-list-scroll-container > .menu-section > small {
  display: block;
  font-size: 0.85em; /* 稍微大一点 */
  color: var(--digital-text-color); /* 浅灰色文字 */
  padding: 8px 0 10px 0;
  line-height: 1.4;
  opacity: 0.8; /* 降低一点透明度 */
}


.menu-section {
  padding-bottom: 15px;
}
.menu-section:not(:last-child) {
  margin-bottom: 10px;
}


/* 表单组 */
.form-group {
  margin-bottom: 18px; /* 增加间距 */
}

.form-group label {
  display: block;
  margin-bottom: 8px; /* 增加间距 */
  font-weight: bold; /* 加粗 */
  font-size: 0.95em; /* 稍微大一点 */
  color: var(--digital-primary-color); /* 亮青色 */
  text-shadow: 0 0 3px rgba(0, 255, 255, 0.3); /* 轻微发光 */
}
.form-group label.checkbox-label {
  display: flex;
  align-items: center;
  color: var(--digital-text-color); /* 浅灰色文字 */
  font-size: 0.95em;
  font-weight: normal;
  cursor: pointer;
}
.form-group label.checkbox-label input[type="checkbox"] {
  margin-right: 8px;
  accent-color: var(--digital-primary-color); /* 亮青色选中效果 */
  transform: scale(1.2); /* 稍微放大 */
  transition: transform 0.2s ease;
}
.form-group label.checkbox-label input[type="checkbox"]:hover {
    transform: scale(1.3);
}


/* 输入框和选择器 */
.form-group input[type="number"],
.form-group input[type="text"],
.form-group select {
  width: 100%;
  padding: 10px;
  box-sizing: border-box;
  background-color: rgba(0, 255, 255, 0.05); /* 轻微透明亮青色背景 */
  color: var(--digital-text-color); /* 浅灰色文字 */
  border: 1px solid rgba(0, 255, 255, 0.4); /* 半透明亮青色边框 */
  border-radius: 6px; /* 稍微大一点的圆角 */
  font-size: 0.95em;
  box-shadow: inset 0 0 8px rgba(0, 255, 255, 0.2); /* 内发光 */
  transition: border-color 0.3s ease, box-shadow 0.3s ease;
}

.form-group select.multi-select-offense {
    height: 120px;
    overflow-y: auto;
}


.form-group input::placeholder {
  color: rgba(160, 176, 208, 0.6); /* 占位符颜色 */
}

.form-group input:focus,
.form-group select:focus {
  border-color: var(--digital-primary-color); /* 亮青色边框 */
  outline: 0;
  box-shadow: inset 0 0 15px rgba(0, 255, 255, 0.6), 0 0 10px rgba(0, 255, 255, 0.4); /* 更强的发光效果 */
}

/* 动作按钮 */
.action-button {
  width: 100%;
  padding: 12px 15px; /* 增加垂直内边距 */
  background-color: var(--digital-primary-color); /* 亮青色背景 */
  color: var(--digital-bg-color); /* 深蓝文字 */
  border: none;
  border-radius: 8px; /* 更大的圆角 */
  cursor: pointer;
  font-size: 1.1em; /* 稍微大一点 */
  font-weight: bold;
  transition: background-color 0.3s ease, box-shadow 0.3s ease, transform 0.1s ease;
  box-shadow: 0 0 15px rgba(0, 255, 255, 0.6); /* 强烈发光 */
  display: flex;
  align-items: center;
  justify-content: center;
}
.action-button i {
  margin-right: 8px;
  color: var(--digital-bg-color); /* 图标颜色与文字颜色一致 */
}

.action-button:hover:not(:disabled) {
  background-color: #00E5E5; /* 悬停时更亮的青色 */
  box-shadow: 0 0 25px rgba(0, 255, 255, 0.9), 0 0 5px rgba(255, 255, 0, 0.5); /* 悬停时更强发光，带点黄色辅光 */
  transform: translateY(-2px);
}
.action-button:active:not(:disabled) {
    transform: translateY(0px);
}


.action-button:disabled {
  background-color: rgba(0, 255, 255, 0.1); /* 禁用时半透明亮青色背景 */
  color: rgba(160, 176, 208, 0.5); /* 禁用时文字颜色更浅 */
  border: 1px solid rgba(0, 255, 255, 0.2);
  box-shadow: none; /* 禁用时移除发光 */
  cursor: not-allowed;
}
.form-group small {
  font-size: 0.85em;
  color: var(--digital-text-color);
  opacity: 0.7;
  display: block;
  margin-top: 5px;
  line-height: 1.3;
}

/* 消息提示框 */
.message {
  padding: 12px 15px; /* 增加内边距 */
  margin-top: 15px; /* 增加间距 */
  border-radius: 6px; /* 更大的圆角 */
  font-size: 0.95em; /* 稍微大一点 */
  word-wrap: break-word;
  color: #fff;
  border-left-width: 5px; /* 更宽的左侧边框 */
  border-left-style: solid;
  box-shadow: 0 0 10px rgba(0, 255, 255, 0.4); /* 通用发光效果 */
}

.message.success {
  background-color: rgba(39, 174, 96, 0.7); /* 更透明 */
  border-left-color: #2ecc71;
  box-shadow: 0 0 10px rgba(46, 204, 113, 0.6); /* 绿色发光 */
}

.message.error {
  background-color: rgba(192, 57, 43, 0.7); /* 更透明 */
  border-left-color: #e74c3c;
  box-shadow: 0 0 10px rgba(231, 76, 60, 0.6); /* 红色发光 */
}
.message.warning {
  background-color: rgba(243, 156, 18, 0.7); /* 更透明 */
  border-left-color: #f1c40f;
  box-shadow: 0 0 10px rgba(241, 196, 15, 0.6); /* 黄色发光 */
}

/* 预测结果和模型总结 */
.prediction-results h5, .model-summary h5 {
  margin-top: 20px; /* 增加顶部间距 */
  margin-bottom: 10px;
  color: var(--digital-primary-color); /* 亮青色 */
  font-size: 1.1em; /* 稍微大一点 */
  text-shadow: 0 0 5px rgba(0, 255, 255, 0.5); /* 轻微发光 */
}

.prediction-results ul {
  list-style-type: none;
  padding-left: 0;
  font-size: 0.9em; /* 稍微大一点 */
  max-height: 180px;
  overflow-y: auto;
  background-color: rgba(10, 24, 56, 0.5); /* 更透明的深蓝背景 */
  border: 1px solid rgba(0, 255, 255, 0.3); /* 半透明亮青色边框 */
  padding: 12px; /* 增加内边距 */
  border-radius: 6px; /* 更大圆角 */
  color: var(--digital-text-color); /* 浅灰色文字 */
  box-shadow: inset 0 0 8px rgba(0, 255, 255, 0.1); /* 内发光 */
}
.prediction-results li {
  padding: 8px 2px; /* 增加内边距 */
  border-bottom: 1px dashed rgba(0, 255, 255, 0.15); /* 更柔和的虚线 */
}
.prediction-results li:last-child {
  border-bottom: none;
}

.model-summary pre {
  background-color: rgba(10, 24, 56, 0.5); /* 更透明的深蓝背景 */
  padding: 12px; /* 增加内边距 */
  border-radius: 6px; /* 更大圆角 */
  white-space: pre-wrap;
  word-break: break-all;
  max-height: 200px;
  overflow-y: auto;
  color: var(--digital-text-color); /* 浅灰色文字 */
  font-size: 0.85em; /* 稍微大一点 */
  border: 1px solid rgba(0, 255, 255, 0.3); /* 半透明亮青色边框 */
  line-height: 1.4;
  box-shadow: inset 0 0 8px rgba(0, 255, 255, 0.1); /* 内发光 */
}

/* 响应式布局调整 */
@media (max-width: 768px) {
  .left-sidebar {
    width: 100%;
    height: auto; /* 自动高度 */
    border-right: none;
    border-bottom: 1px solid var(--digital-border-color); /* 底部边框 */
    box-shadow: 0 2px 15px rgba(0, 255, 255, 0.3); /* 底部发光 */
  }

  .menu-list-scroll-container {
    padding-left: 15px;
    padding-right: 15px;
    max-height: 300px; /* 在小屏幕上限制高度，避免占据过多空间 */
  }

  .menu-title {
    font-size: 1.4em;
    margin-bottom: 15px;
  }

  .form-group {
    margin-bottom: 15px;
  }

  .message {
    padding: 10px 12px;
    margin-top: 10px;
  }
}
</style>