<template>
  <div class="adaptive-container">
    <header class="adaptive-header">
      <div class="nav-wrapper">
        <div class="logo-area">
          <img src="@/assets/logo.png" alt="Security Logo" class="logo-img">
          <span class="logo-text">城市犯罪大数据时空分析与预测系统</span>
        </div>
        <nav class="adaptive-nav">
          <router-link to="/" class="nav-item" active-class="active">首页</router-link>
          <router-link to="/crime-map" class="nav-item" active-class="active">犯罪地图</router-link>
          <router-link to="/data-analysis" class="nav-item" active-class="active">数据分析</router-link>
          <router-link to="/crime-prediction" class="nav-item" active-class="active">犯罪预测</router-link>
          <router-link to="/rental-recommendation" class="nav-item" active-class="active">租房推荐</router-link>
          <router-link to="/contact" class="nav-item" active-class="active">联系我们</router-link>
        </nav>
        <div class="user-area">
          <div class="welcome-message">
            <i class="welcome-icon">👋</i>
            <span>欢迎 {{ userInfo.account }}</span>
          </div>
          <button @click="handleLogout" class="logout-btn">登出</button>
        </div>
      </div>
    </header>

    <main class="adaptive-main">
      <div class="main-content-wrapper">
        <LeftSidebar
          @data-filters-applied="handleDataFiltersApplied"
          @model-trained="handleModelTrained"
          @prediction-retrieved="handlePredictionRetrieved"
          @processed-data-sample-retrieved="handleProcessedDataSampleRetrieved"
          @resample-freq-updated="handleResampleFreqUpdated"   
        />
        <div class="content-area">
          <OSMMap
            :crimeMarkers="processedDataForMap"
            @area-selected="handleMapAreaSelected"
          />
          <PredictionCharts
            :predictionResponse="predictionDataForChart"
            :actualHistoricalData="actualHistoricalDataForChart"
            :mapSelectedAreaData="mapSelectedCrimeData"
            :isLoadingChartData="isLoadingChartData"
            :isLoadingMapSelectedData="isLoadingMapSelectedData"
          />
        </div>
      </div>
    </main>

    <footer class="adaptive-footer">
      <p>©{{ new Date().getFullYear() }} Security Guards 城市犯罪大数据时空分析与预测系统</p>
    </footer>
  </div>
</template>

<script>
import axios from 'axios';
import LeftSidebar from './LeftSidebar.vue';
import OSMMap from './OSMMap.vue';
import PredictionCharts from './PredictionCharts.vue';

const API_BASE_URL = 'http://127.0.0.1:5000/api';

export default {
  name: 'CrimePrediction',
  components: {
    LeftSidebar,
    OSMMap,
    PredictionCharts
  },
  data() {
    return {
      userInfo: {
        account: '管理员'
      },
      predictionDataForChart: null,
      actualHistoricalDataForChart: null,
      processedDataForMap: [],
      mapSelectedCrimeData: null, // 保持 null 初始化，让子组件的 computed property 处理
      isLoadingChartData: false,
      isLoadingMapSelectedData: false,
      currentDataFilters: null, 
      currentGlobalResampleFreq: 'ME', 
    };
  },
  methods: {
    handleLogout() {
      console.log('执行登出操作');
      alert("登出功能尚未实现。");
    },

    handleResampleFreqUpdated(newFreq) { 
      this.currentGlobalResampleFreq = newFreq;
      console.log('全局聚合频率已更新:', newFreq);
    },

    handleDataFiltersApplied(eventPayload) {
      console.log('数据筛选条件已应用 (CrimePrediction):', eventPayload);
      this.currentDataFilters = eventPayload.filters; 
      if (eventPayload.filters) {
          const params = {
              start_year: eventPayload.filters.startYear,
              end_year: eventPayload.filters.endYear,
              offenses: eventPayload.filters.offenses,
              resample_freq: this.currentGlobalResampleFreq, 
          };
          this.fetchActualAggregatedData(params, 'data_filter_applied');
      }
    },

    handleModelTrained(eventPayload) {
      console.log('模型已训练 (CrimePrediction):', eventPayload);
      this.currentDataFilters = eventPayload.trainingFilters; 
      if (eventPayload.trainingFilters && eventPayload.trainingFilters.resampleFreq) {
        this.currentGlobalResampleFreq = eventPayload.trainingFilters.resampleFreq; 
      }
      if (eventPayload.trainingFilters) {
        this.fetchActualAggregatedData(eventPayload.trainingFilters, 'model_trained');
      }
    },

    handlePredictionRetrieved(eventPayload) {
      console.log('预测结果已获取 (CrimePrediction):', eventPayload);
      this.predictionDataForChart = {
          predictions: eventPayload.predictions,
          modelUsed: eventPayload.modelUsed,
          steps: eventPayload.steps,
      };
      if (eventPayload.actualDataParams) {
        const paramsForActualData = {
            ...eventPayload.actualDataParams,
            resample_freq: eventPayload.actualDataParams.resample_freq || this.currentGlobalResampleFreq
        };
        this.fetchActualAggregatedData(paramsForActualData, 'prediction_retrieved');
      } else {
        this.actualHistoricalDataForChart = null;
      }
    },

    handleProcessedDataSampleRetrieved(eventPayload) {
        console.log('已处理数据样本已获取 (CrimePrediction):', eventPayload);
        const rawSampleData = eventPayload.sampleData || [];
        this.processedDataForMap = rawSampleData.map(item => {
          const lat = parseFloat(item.LATITUDE || item.lat || item.Y);
          const lng = parseFloat(item.LONGITUDE || item.lon || item.lng || item.X);
          if (isNaN(lat) || isNaN(lng)) return null;
          return {
            id: item.REPORT_ID || item.ID || item.id || `crime-${Date.now()}-${Math.random()}`,
            name: item.OFFENSE_TYPE || item.OFFENSE || '案件信息',
            status: item.STATUS_DESC || item.STATUS || '未知',
            details: item.DETAILS_TEXT || `原始数据ID: ${item.REPORT_ID || item.ID || item.id || 'N/A'}`,
            coordinates: [lat, lng]
          };
        }).filter(item => item !== null);
        console.log('转换后用于地图的数据:', this.processedDataForMap);
    },

    async fetchActualAggregatedData(params, source = 'unknown') {
      if (!params || params.start_year == null || params.end_year == null || !params.resample_freq) {
        console.warn(`获取实际聚合数据中止：缺少必要参数。来源: ${source}, 参数:`, params);
        this.actualHistoricalDataForChart = null;
        this.isLoadingChartData = false;
        return;
      }
      this.isLoadingChartData = true;
      this.actualHistoricalDataForChart = null; 
      try {
        const queryParams = {
            start_year: params.start_year,
            end_year: params.end_year,
            resample_freq: params.resample_freq,
        };
        if (params.offenses && Array.isArray(params.offenses) && params.offenses.length > 0) {
            queryParams.offenses = params.offenses;
        }
        const response = await axios.get(`${API_BASE_URL}/get-actual-aggregated-data`, { params: queryParams });
        if (response.data && response.data.status === 'success' && response.data.data) {
          const timestamps = response.data.data.timestamps || [];
          const values = response.data.data.values || [];
          if (timestamps.length === values.length) {
            this.actualHistoricalDataForChart = timestamps.map((ts, index) => ({
              timestamp: ts,
              value: values[index]
            }));
          } else { this.actualHistoricalDataForChart = []; }
        } else { this.actualHistoricalDataForChart = []; }
      } catch (error) {
        console.error(`获取实际聚合数据失败 (${source}):`, error);
        this.actualHistoricalDataForChart = [];
      } finally {
        this.isLoadingChartData = false;
      }
    },

    async handleMapAreaSelected(areaGeoJson) {
      console.log('地图选定区域 (CrimePrediction):', areaGeoJson);
      this.isLoadingMapSelectedData = true;
      this.mapSelectedCrimeData = null; // 清除旧数据

      if (!areaGeoJson) {
        this.isLoadingMapSelectedData = false;
        console.log('地图选区已清除，不请求数据。');
        return;
      }

      const filtersForMap = this.currentDataFilters;

      if (!filtersForMap) {
        alert('请先在左侧面板“数据准备与筛选”或“模型训练”部分应用筛选条件，再选择地图区域。');
        this.isLoadingMapSelectedData = false;
        return;
      }

      const resampleFreqForMap = this.currentGlobalResampleFreq; 

      const API_URL_AREA_DATA = `${API_BASE_URL}/get-area-aggregated-data`;
      try {
        const payload = {
          geojson: areaGeoJson, 
          start_date: `${filtersForMap.startYear}-01-01`, 
          end_date: `${filtersForMap.endYear}-12-31`,   
          offenses: filtersForMap.offenses || null,
          resample_freq: resampleFreqForMap,
        };

        console.log("请求地图选区数据，Payload:", payload); 

        const response = await axios.post(API_URL_AREA_DATA, payload);

        if (response.data && response.data.status === 'success' && response.data.data) {
          const timestamps = response.data.data.timestamps || [];
          const values = response.data.data.values || [];
          if (timestamps.length === values.length) {
            this.mapSelectedCrimeData = timestamps.map((ts, index) => ({
              timestamp: ts, 
              value: values[index]
            }));
            console.log("成功获取并处理了地图选区数据:", this.mapSelectedCrimeData);
          } else {
            console.error('地图选区数据格式错误：时间戳与值的数量不匹配。服务器原始数据:', response.data.data);
            this.mapSelectedCrimeData = [];
            alert('获取地图选区数据成功，但数据格式似乎不正确。');
          }
        } else {
          const errorMsg = response.data.message || '服务器返回了无效的响应结构。';
          console.error('获取地图选区数据失败:', errorMsg, '服务器响应:', response.data);
          this.mapSelectedCrimeData = [];
          alert(`获取地图选区数据失败: ${errorMsg}`);
        }
      } catch (error) {
        const errorMsg = error.response?.data?.message || error.message || '网络错误或服务器无响应。';
        console.error('调用获取地图选定区域数据API失败:', error.response || error);
        this.mapSelectedCrimeData = [];
        alert(`获取地图选定区域数据时发生错误: ${errorMsg}`);
      } finally {
        this.isLoadingMapSelectedData = false;
      }
    },
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

/* 重置所有元素的边距和内边距 */
* {
  margin: 0;
  padding: 0;
  box-sizing: border-box;
}

/* 整体容器 */
.adaptive-container {
  width: 100vw;
  height: 100vh; /* 确保沾满视窗高度 */
  display: flex;
  flex-direction: column;
  overflow: hidden; /* 根容器overflow hidden，内部滚动 */
  background-color: var(--digital-bg-color); /* 使用全局深蓝背景 */
  color: var(--digital-text-color); /* 使用全局文字颜色 */
  font-family: 'Segoe UI', Arial, sans-serif;
  position: relative;
}

/* 头部样式 - 与数据分析页面保持一致 */
.adaptive-header {
  height: var(--header-height);
  background: linear-gradient(to right, rgba(0, 255, 255, 0.1), rgba(0, 255, 255, 0.05), rgba(0, 255, 255, 0.1));
  border-bottom: 1px solid rgba(0, 255, 255, 0.3);
  box-shadow: 0 0 15px rgba(0, 255, 255, 0.4);
  position: relative;
  z-index: 10;
  flex-shrink: 0;
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 0 30px;
}

.nav-wrapper {
  width: 100%;
  display: flex;
  justify-content: space-between;
  align-items: center;
}

.logo-area {
  display: flex;
  align-items: center;
  gap: 15px; /* 与数据分析页面保持一致 */
  flex-shrink: 0;
}

.logo-img {
  height: 50px; /* 与数据分析页面保持一致 */
  width: auto;
  filter: drop-shadow(0 0 5px var(--digital-primary-color));
}

.logo-text {
  font-size: 24px; /* 与数据分析页面保持一致 */
  font-weight: bold;
  color: var(--digital-primary-color);
  text-shadow: 0 0 8px rgba(0, 255, 255, 0.8);
  letter-spacing: 2px;
  white-space: nowrap;
}

.adaptive-nav {
  flex-grow: 1;
  display: flex;
  justify-content: center;
  align-items: center;
  gap: 20px; /* 导航项间距 */
  margin: 0;
}

.nav-item {
  color: var(--digital-text-color);
  font-size: 1.1rem;
  padding: 8px 15px;
  border-radius: 5px;
  transition: all 0.3s ease;
  font-weight: bold;
  white-space: nowrap;
  text-align: center;
  position: relative;
  background-color: rgba(0, 255, 255, 0.05);
  border: 1px solid rgba(0, 255, 255, 0.2);
  box-shadow: 0 0 5px rgba(0, 255, 255, 0.1);
}

.nav-item:hover {
  background-color: rgba(0, 255, 255, 0.15);
  color: var(--digital-primary-color);
  box-shadow: 0 0 10px rgba(0, 255, 255, 0.6);
  transform: translateY(-2px);
}

.nav-item.active {
  background-color: var(--digital-primary-color);
  color: var(--digital-bg-color);
  box-shadow: 0 0 15px var(--digital-glow-color);
  box-shadow: 0 0 10px rgba(0, 255, 255, 0.8);
}

.user-area {
  display: flex;
  align-items: center;
  gap: 15px; /* 与数据分析页面保持一致 */
  flex-shrink: 0;
}

.welcome-message {
  display: flex;
  align-items: center;
  gap: 10px; /* 与数据分析页面保持一致 */
  color: var(--digital-text-color);
  font-size: 1rem; /* 与数据分析页面保持一致 */
  white-space: nowrap;
  margin-right: 0;
}

.welcome-icon {
  font-size: 1.1em;
  color: var(--digital-primary-color);
  /* 移除动画，保持简洁 */
}

/* 登出按钮样式 - 与数据分析页面保持一致 */
.logout-btn {
  padding: 8px 15px; /* 使用与数据分析页面一致的 padding */
  font-size: 0.9rem;
  border-radius: 5px;
  cursor: pointer;
  background-color: rgba(0, 255, 255, 0.2);
  color: var(--digital-primary-color);
  border: 1px solid rgba(0, 255, 255, 0.4);
  box-shadow: 0 0 5px rgba(0, 255, 255, 0.2);
  transition: all 0.3s ease;
  font-weight: bold;
}

.logout-btn:hover {
  background-color: var(--digital-primary-color);
  color: var(--digital-bg-color);
  box-shadow: 0 0 15px var(--digital-primary-color);
  transform: translateY(-2px);
}

/* 主要内容区域 */
.adaptive-main {
  flex: 1; /* 占据剩余空间 */
  width: 100%;
  display: flex; /* 使用flex布局来排列LeftSidebar和content-area */
  overflow: hidden; /* 防止adaptive-main自身出现滚动条 */
  background-color: var(--digital-bg-color); /* 使用全局深蓝背景 */
}

/* 页脚样式 - 与数据分析页面保持一致 */
.adaptive-footer {
  width: 100%;
  background: linear-gradient(to right, rgba(0, 255, 255, 0.1), rgba(0, 255, 255, 0.05), rgba(0, 255, 255, 0.1)); /* 与header保持一致 */
  color: rgba(0, 255, 255, 0.6); /* 半透明亮青色 */
  text-align: center;
  padding: 1.5rem;
  font-size: 0.9rem;
  flex-shrink: 0; /* Footer不压缩 */
  border-top: 1px solid rgba(0, 255, 255, 0.3);
  box-shadow: 0 0 15px rgba(0, 255, 255, 0.4);
}

.main-content-wrapper {
  display: flex;
  flex-grow: 1;
  width: 100%;
  height: 100%; /* 确保wrapper填满adaptive-main的高度 */
  overflow: hidden; /* 防止wrapper出现滚动条 */
}

.content-area {
  flex-grow: 1; /* 右侧内容区占据剩余空间 */
  padding: 20px;
  display: flex;
  flex-direction: column;
  gap: 20px;
  overflow-y: auto; /* 内容区自己滚动 */
  height: 100%; /* 确保content-area填满其分配的空间 */
  /* 为内容区域添加数字大屏风格的背景、边框和阴影 */
  background-color: var(--digital-panel-bg); /* 半透明深蓝面板背景 */
  border: 1px solid var(--digital-border-color); /* 亮青色边框 */
  border-radius: 8px; /* 圆角 */
  box-shadow: 0 0 20px rgba(0, 255, 255, 0.6); /* 强烈发光效果 */
}

/* 通量数据预测页面独有的内容样式（如果存在） */
/* 假设通量页面会有一些标题、图表容器、表单等 */

h1, h2, h3, h4, h5, h6 {
  color: var(--digital-primary-color); /* 标题颜色使用亮青色 */
  text-shadow: 0 0 8px rgba(0, 255, 255, 0.8); /* 标题发光 */
  margin-bottom: 15px;
}

p {
  color: var(--digital-text-color); /* 段落文字颜色 */
  line-height: 1.6;
}

/* 假设图表容器的通用样式 */
.chart-panel {
  background-color: rgba(0, 0, 0, 0.3); /* 更透明的背景 */
  border: 1px solid rgba(0, 255, 255, 0.15);
  border-radius: 6px;
  box-shadow: inset 0 0 8px rgba(0, 255, 255, 0.1);
  padding: 20px;
  margin-bottom: 20px;
  transition: all 0.3s ease;
}

.chart-panel:hover {
  box-shadow: inset 0 0 15px rgba(0, 255, 255, 0.4), 0 0 15px rgba(0, 255, 255, 0.2); /* 悬浮发光 */
}

/* 假设会有一些输入框、选择器等控件 */
.input-group, .select-group {
  margin-bottom: 15px;
}

label {
  display: block;
  color: var(--digital-primary-color);
  font-weight: bold;
  margin-bottom: 8px;
  text-shadow: 0 0 3px rgba(0, 255, 255, 0.3);
}

input[type="text"], input[type="number"], select, textarea {
  width: 100%;
  padding: 0.9rem;
  background-color: rgba(0, 255, 255, 0.05);
  border: 1px solid rgba(0, 255, 255, 0.4);
  border-radius: 6px;
  font-size: 1rem;
  color: var(--digital-text-color);
  box-shadow: inset 0 0 8px rgba(0, 255, 255, 0.2);
  transition: border-color 0.3s ease, box-shadow 0.3s ease;
}

input[type="text"]:focus, input[type="number"]:focus, select:focus, textarea:focus {
  outline: none;
  border-color: var(--digital-primary-color);
  box-shadow: inset 0 0 15px rgba(0, 255, 255, 0.6), 0 0 10px rgba(0, 255, 255, 0.4);
}

textarea {
  resize: vertical;
  min-height: 100px;
}

/* 按钮样式（通用，如果不是Element Plus按钮） */
.action-button {
  background-color: var(--digital-primary-color);
  color: var(--digital-bg-color);
  padding: 1rem 2rem;
  border: none;
  border-radius: 8px;
  cursor: pointer;
  font-size: 1.2rem;
  font-weight: bold;
  transition: background-color 0.3s ease, box-shadow 0.3s ease;
  box-shadow: 0 0 15px rgba(0, 255, 255, 0.6);
}

.action-button:hover {
  background-color: #00E5E5;
  box-shadow: 0 0 25px rgba(0, 255, 255, 0.9), 0 0 5px rgba(255, 255, 0, 0.5);
  transform: translateY(-2px);
}

/* 响应式布局调整 */
@media (max-width: 768px) {
  .adaptive-header {
    flex-direction: column;
    height: auto;
    padding: 10px;
    gap: 10px;
  }

  .logo-area {
    width: 100%;
    justify-content: center;
    margin-bottom: 10px;
  }

  .adaptive-nav {
    flex-direction: column;
    gap: 10px;
  }

  .nav-item {
    width: 100%;
  }

  .user-area {
    margin-top: 10px;
    width: 100%;
    justify-content: space-around;
  }

  .content-area {
    padding: 15px;
    gap: 15px;
  }

  .chart-panel {
    padding: 15px;
  }
}
</style>