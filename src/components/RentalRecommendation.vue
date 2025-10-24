<script setup lang="ts">
import { useRentalRecommendation } from "./RentalRecommendation"
import { ref, nextTick, onMounted } from 'vue'
import Chart from 'chart.js/auto'
import scores from '@/assets/safety_scores_renumbered.json'

const rows = ref<any[]>([])

const {
  userInfo,
  SecurityExpanded,
  RentingExpanded,
  mapContainer,
  handleLogout,
  toggleSecurity,
  toggleRenting,
  loadRentMarkers,
  resetFilterInputs,
  clearRentalLayer,
  applyFilters,
  filterModalVisible,
  priceMin,
  priceMax,
  ratingMin,
  stayMin,
  stayMax,
  loadSafetyScoreMarkers,
  clearScoreLayer,
} = useRentalRecommendation(openDetailPopup)

const showLargePopup = ref(false)
const selectedListing = ref<any>(null)

function openDetailPopup(id: number) {
  const listing = rows.value.find((r: any) => r.id === id);
  if (!listing) return
  selectedListing.value = listing
  showLargePopup.value = true
  nextTick(() => renderRadarChart(listing))
}

const radarChartInstance = ref<Chart | null>(null)
function renderRadarChart(listing: any) {
  const canvas = document.getElementById('radarChart') as HTMLCanvasElement;
  if (!canvas) return;
  const ctx = canvas.getContext('2d');
  if (!ctx) return;

  // 销毁旧实例
  if (radarChartInstance.value) {
    radarChartInstance.value.destroy();
  }

  const labels = ['评价得分评级', '准确度评分', '卫生评分', '登记入住评分', '沟通评分', '位置评分', '综合得分'];
  const dataValues = [
    listing.review_scores_rating || 0,
    listing.review_scores_accuracy || 0,
    listing.review_scores_cleanliness || 0,
    listing.review_scores_checkin || 0,
    listing.review_scores_communication || 0,
    listing.review_scores_location || 0,
    listing.review_scores_value || 0
  ];

  radarChartInstance.value = new Chart(ctx, {
    type: 'radar',
    data: {
      labels,
      datasets: [{
        label: '七维评分',
        data: dataValues,
        fill: true,
        // Using theme colors for a consistent digital look
        backgroundColor: 'rgba(0, 255, 255, 0.2)', // Light cyan with transparency
        borderColor: '#00FFFF', // Bright cyan
        pointBackgroundColor: '#00FFFF', // Bright cyan
        pointBorderColor: '#fff',
        pointHoverBackgroundColor: '#fff',
        pointHoverBorderColor: '#00FFFF'
      }]
    },
    options: {
      responsive: true,
      maintainAspectRatio: false, // Allow canvas to resize freely
      scales: {
        r: {
          beginAtZero: true,
          min: 0,
          max: 5, // Fixed maximum value to 5 for consistent rating display
          ticks: {
            stepSize: 0.5,
            color: '#A0B0D0', // Text color for ticks
            backdropColor: 'transparent' // Transparent background for tick labels
          },
          grid: {
            color: 'rgba(0, 255, 255, 0.3)' // Grid line color (light cyan with transparency)
          },
          angleLines: {
            color: 'rgba(0, 255, 255, 0.3)' // Angle line color
          },
          pointLabels: {
            color: '#00FFFF', // Label text color (bright cyan)
            font: {
              size: 14 // Adjust font size for readability
            }
          }
        }
      }
    },
  });
}

onMounted(() => {
  rows.value = scores
})

const showExplainPopup = ref(false)

// 打开说明弹窗
function openExplainPopup() {
  showExplainPopup.value = true
}

// 关闭说明弹窗
function closeExplainPopup() {
  showExplainPopup.value = false
}

const showStatsPopup = ref(false)
let statsChartInstance: Chart | null = null
const currentStatsChartType = ref<'bar' | 'line' | 'pie'>('bar');

// 修改 openStatsPopup 函数，在打开时重绘图表以确保类型正确
function openStatsPopup() {
  showStatsPopup.value = true
  nextTick(() => renderStatsChart(currentStatsChartType.value)) // 传入当前图表类型
}

function closeStatsPopup() {
  showStatsPopup.value = false
  // 销毁旧实例
  statsChartInstance?.destroy()
}

// 新增：切换图表类型并重绘的函数
function switchStatsChartType(type: 'bar' | 'line' | 'pie') {
  currentStatsChartType.value = type;
  nextTick(() => renderStatsChart(currentStatsChartType.value));
}
// —— 新增：绘制统计柱状图 —— 
// —— 修改：绘制统计柱状图，现在接受一个类型参数 ——
function renderStatsChart(type: 'bar' | 'line' | 'pie') {
  // 统计各区间数量
  const counts = [0, 0, 0, 0]
  rows.value.forEach(r => {
    const s = r.safety_score as number
    if (s < 10) counts[0]++
    else if (s < 30) counts[1]++
    else if (s < 80) counts[2]++
    else counts[3]++
  })

  const labels = [
    '安全 (<10)',
    '中等 (10–30)',
    '危险 (30–80)',
    '非常危险 (>80)'
  ];

  const canvas = document.getElementById('statsChart') as HTMLCanvasElement | null
  if (!canvas) return
  const ctx = canvas.getContext('2d')
  if (!ctx) return

  // 销毁旧实例
  statsChartInstance?.destroy()

  const dataset = {
    label: '房源数量',
    data: counts,
    // Bar and Pie charts use these colors
    backgroundColor: [
      'rgba(0, 255, 255, 0.6)',   // Safe (Cyan)
      'rgba(0, 123, 255, 0.6)',   // Medium (Blue)
      'rgba(255, 69, 0, 0.6)',    // Dangerous (Orange-Red)
      'rgba(160, 176, 208, 0.6)'  // Very Dangerous (Light Gray)
    ],
    borderColor: [
      '#00FFFF',
      '#007BFF',
      '#FF4500',
      '#A0B0D0'
    ],
    borderWidth: 1
  };

  // Line chart typically only needs one border and background color for the line itself
  const lineDataset = {
    label: '房源数量',
    data: counts,
    fill: false, // Don't fill area under the line
    borderColor: '#00FFFF', // Line color (Cyan)
    backgroundColor: 'rgba(0, 255, 255, 0.2)', // Point background color
    tension: 0.4, // Smoothness of the line
  };


  let options: any = { // Use any for flexibility with chart specific options
    responsive: true,
    maintainAspectRatio: false,
    plugins: {
      legend: {
        labels: {
          color: '#A0B0D0', // Legend label color
          font: {
            size: 14
          }
        }
      }
    }
  };

  if (type === 'bar' || type === 'line') {
    options.scales = {
      y: {
        beginAtZero: true,
        ticks: {
          stepSize: 100,
          color: '#A0B0D0' // Y-axis tick color
        },
        grid: {
          color: 'rgba(0, 255, 255, 0.3)' // Y-axis grid color
        }
      },
      x: {
        ticks: {
          color: '#A0B0D0' // X-axis tick color
        },
        grid: {
          color: 'rgba(0, 255, 255, 0.3)' // X-axis grid color
        }
      }
    };
  } else if (type === 'pie') {
    // Pie chart specific options
    options.scales = {}; // No scales for pie charts
  }

  statsChartInstance = new Chart(ctx, {
    type: type, // Use the passed type
    data: {
      labels: labels,
      datasets: [type === 'line' ? lineDataset : dataset] // Conditionally use lineDataset
    },
    options: options
  });
}

</script>

<template>
  <teleport to="body">
    <transition name="popup">
      <div v-if="showLargePopup" class="popup-overlay">
        <button class="close-btn" @click="showLargePopup = false">×</button>
        <div class="popup-content">
          <h2>{{ selectedListing.name }}</h2>
          <img :src="selectedListing.picture_url" alt="房源图片" style="width: 50%">
          <p><strong>描述：</strong>{{ selectedListing.description }}</p>
          <p><strong>房东：</strong>{{ selectedListing.host_name }}</p>
          <p><strong>评分：</strong>{{ selectedListing.review_scores_rating }}</p>
          <p><strong>危险系数：</strong>{{ selectedListing.safety_score.toFixed(2) }}</p>
          <p><strong>房东简介：</strong>{{ selectedListing.host_about }}</p>

          <!-- 七维雷达图显示区域 -->
          <div class="radar-container">
            <canvas id="radarChart"></canvas>
          </div>
        </div>
      </div>
    </transition>
  </teleport>

  <teleport to="body">
    <transition name="popup">
      <div v-if="showExplainPopup" class="popup-overlay">
        <button class="close-btn2" @click="closeExplainPopup">×</button>
        <div class="popup-content">
          <h2>危险系数计算原理</h2>
          <p>
            仅选取2025年的犯罪事件数据，每个犯罪事件对房源的分数由两部分贡献：
          <ul>
            <li><strong>距离系数</strong>：与犯罪事件距离成反比，距离越近，系数越大；</li>
            <li><strong>类型系数</strong>：当<strong>犯罪事件类型</strong>属于
              “THEFT/OTHER（其它盗窃）”、“THEFT F/AUTO（车辆盗窃）”、“MOTOR VEHICLE THEFT（机动车盗窃）”、“BURGLARY（入室盗窃）”、“ARSON（纵火）”
              则记为 1，否则记为 3。</li>
          </ul>
          <p>
            单个事件贡献 = 距离系数 × 类型系数；<br />
            房源总分 = 周围所有事件贡献之和。
          </p>
          </p>
        </div>
      </div>
    </transition>
  </teleport>

  <teleport to="body">
    <transition name="popup">
      <div v-if="showStatsPopup" class="popup-overlay">
        <button class="close-btn" @click="closeStatsPopup">×</button>
        <div class="popup-content">
          <h2>危险系数分布统计</h2>
          <div class="chart-type-switcher">
            <button
              :class="{ 'active': currentStatsChartType === 'bar' }"
              @click="switchStatsChartType('bar')"
              class="chart-switcher-btn"
            >
              柱状图
            </button>
            <button
              :class="{ 'active': currentStatsChartType === 'line' }"
              @click="switchStatsChartType('line')"
              class="chart-switcher-btn"
            >
              折线图
            </button>
            <button
              :class="{ 'active': currentStatsChartType === 'pie' }"
              @click="switchStatsChartType('pie')"
              class="chart-switcher-btn"
            >
              饼图
            </button>
          </div>
          <canvas id="statsChart" width="800" height="550"></canvas>
        </div>
      </div>
    </transition>
  </teleport>

  <div class="adaptive-container">
    <!-- 自适应导航栏 -->
    <header class="adaptive-header">
      <div class="nav-wrapper">
        <div class="logo-area">
          <!-- 添加的 logo 部分 -->
          <img src="@/assets/logo.png" alt="Security Logo" class="logo-img">
          <span class="logo-text">城市犯罪大数据时空分析与预测系统</span>
        </div>

        <nav class="adaptive-nav">
          <router-link to="/" class="nav-item">首页</router-link>
          <router-link to="/crime-map" class="nav-item">犯罪地图</router-link>
          <router-link to="/data-analysis" class="nav-item">数据分析</router-link>
          <router-link to="/crime-prediction" class="nav-item">犯罪预测</router-link>
          <router-link to="/rental-recommendation" class="nav-item active">租房推荐</router-link>
          <router-link to="/contact" class="nav-item">联系我们</router-link>
        </nav>

        <div class="user-area">
          <div class="welcome-message">
            <i class="welcome-icon">👋</i> <!-- 或使用SVG图标 -->
            <span>欢迎{{ userInfo.account }}</span>
          </div>
          <button @click="handleLogout" class="logout-btn">登出</button>
        </div>
      </div>
    </header>

    <!-- 自适应主内容区 -->
    <main class="adaptive-main">
      <aside class="analysis-sidebar">
        <h3>功能</h3>

        <div class="menu-item">
          <div class="menu-header" @click="toggleRenting">
            <i class="arrow" :class="{ 'expanded': RentingExpanded }"></i> <i class="icon">🏠</i> 租房信息整合
          </div>
          <div class="menu-sub-items" v-show="RentingExpanded">
            <div class="sub-item" @click="loadRentMarkers"><i class="icon">👌</i> 租房数据接入</div>
            <div class="sub-item" @click="filterModalVisible = true"><i class="icon">🔍</i> 租房数据筛选</div>
            <div class="sub-item" @click="clearRentalLayer"><span class="icon">🗑️</span> 清除租房图层</div>
          </div>
        </div>

        <div class="menu-item">
          <div class="menu-header" @click="toggleSecurity">
            <i class="arrow" :class="{ 'expanded': SecurityExpanded }"></i> <i class="icon">⏱️</i> 安全性评分
          </div>
          <div class="menu-sub-items" v-show="SecurityExpanded">
            <div class="sub-item" @click="loadSafetyScoreMarkers(scores)"><i class="icon">📍</i> 评分模型构建</div>
            <div class="sub-item" @click="openExplainPopup"><i class="icon">📌</i> 系数评分说明</div>
            <div class="sub-item" @click="openStatsPopup"><i class="icon">📊</i> 危险系数统计</div>
            <div class="sub-item" @click="clearScoreLayer"><i class="icon">🗑️</i> 清除评分图层</div>
          </div>
        </div>

      </aside>

      <div class="map-area">
        <h3>租房地图</h3>
        <div ref="mapContainer" class="map-container">
        </div>
      </div>

      <transition name="modal-slide">
        <div v-if="filterModalVisible" class="modal-mask">
          <div class="modal">
            <h3 class="modal-title">筛选条件</h3>

            <!-- 小栅格：2 列  label - input -->
            <div class="form-grid">
              <label>价格范围</label>
              <div class="flex gap-x-2">
                <input v-model.number="priceMin" type="number" placeholder="最小金额（美元）" />
                <span>—</span>
                <input v-model.number="priceMax" type="number" placeholder="最大金额（美元）" />
              </div>

              <label>综合评分 ≥</label>
              <input v-model.number="ratingMin" type="number" step="0.1" />

              <label>最短住宿时长 ≥</label>
              <input v-model.number="stayMin" type="number" placeholder="晚" />

              <label>最长住宿时长 ≤</label>
              <input v-model.number="stayMax" type="number" placeholder="晚" />
            </div>

            <div class="btn-row">
              <button class="btn-primary" @click="applyFilters">确认</button>
              <button class="btn-secondary" @click="resetFilterInputs(); applyFilters()">清空筛选</button>
              <button class="btn-secondary" @click="filterModalVisible = false">取消</button>
            </div>
          </div>
        </div>
      </transition>

    </main>

    <!-- 自适应页脚 -->
    <footer class="adaptive-footer">
      <p>©2025 Security Guards 城市犯罪大数据时空分析与预测系统</p>
    </footer>
  </div>
</template>

<style scoped src="./RentalRecommendation.css"></style>