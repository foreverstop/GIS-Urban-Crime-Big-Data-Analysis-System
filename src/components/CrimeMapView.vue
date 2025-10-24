<script setup lang="ts">
import { ref, watch, onMounted, nextTick } from 'vue';
import { useRouter } from 'vue-router';
import { useAuthStore } from '@/store/auth';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';
import * as echarts from 'echarts';

// 导入 Leaflet.Draw 库
import 'leaflet-draw/dist/leaflet.draw.css';
import 'leaflet-draw';

// 导入 Turf.js 库，用于地理空间分析
import * as turf from '@turf/turf';

// 导入 Element Plus 组件
import { ElSelect, ElOption, ElButton, ElTabs, ElTabPane, ElMessage, ElAlert, ElDialog } from 'element-plus';
import 'element-plus/dist/index.css'; // Element Plus 基础样式

// 导入所有年份的 JSON 文件
import crimeData2014 from '@/assets/Crime_Incidents_in_2014.json';
import crimeData2015 from '@/assets/Crime_Incidents_in_2015.json';
import crimeData2016 from '@/assets/Crime_Incidents_in_2016.json';
import crimeData2017 from '@/assets/Crime_Incidents_in_2017.json';
import crimeData2018 from '@/assets/Crime_Incidents_in_2018.json';
import crimeData2019 from '@/assets/Crime_Incidents_in_2019.json';
import crimeData2020 from '@/assets/Crime_Incidents_in_2020.json';
import crimeData2021 from '@/assets/Crime_Incidents_in_2021.json';
import crimeData2022 from '@/assets/Crime_Incidents_in_2022.json';
import crimeData2023 from '@/assets/Crime_Incidents_in_2023.json';
import crimeData2024 from '@/assets/Crime_Incidents_in_2024.json';

const authStore = useAuthStore();
const router = useRouter();

interface UserInfo {
  account: string;
  email: string;
}

const userInfo = ref<UserInfo>({
  account: authStore.user?.account || '游客',
  email: authStore.user?.email || ''
});

const handleLogout = async () => {
  try {
    await authStore.logout();
    router.push({ name: 'login' });
  } catch (error) {
    console.error('登出失败:', error);
  }
};

// 筛选条件
const selectedYear = ref('');
const selectedMonth = ref('');
const selectedDay = ref('');
const selectedCrimeType = ref('');

// 年份选项（2014 - 2024）
const yearOptions = ref(Array.from({ length: 2024 - 2014 + 1 }, (_, i) => (2014 + i).toString()));
// 月份选项
const monthOptions = ref(['01', '02', '03', '04', '05', '06', '07', '08', '09', '10', '11', '12']);
// 天数选项（需要根据选定的年份和月份动态生成）
const dayOptions = ref<string[]>([]);
//犯罪类型选项
const crimeTypeOptions = ref<string[]>([]);

// 地图实例
const map = ref<L.Map | null>(null);
const mapContainer = ref<HTMLElement | null>(null);
const crimeLayer = ref<L.GeoJSON | null>(null);
const initialMapView = ref<{ center: L.LatLngExpression; zoom: number } | null>(null);

// 存储所有年份的犯罪数据
const allCrimeData = ref<{ [year: string]: any }>({
  '2014': crimeData2014,
  '2015': crimeData2015,
  '2016': crimeData2016,
  '2017': crimeData2017,
  '2018': crimeData2018,
  '2019': crimeData2019,
  '2020': crimeData2020,
  '2021': crimeData2021,
  '2022': crimeData2022,
  '2023': crimeData2023,
  '2024': crimeData2024
});

// === ECharts 标志位 ===
const isEChartsMonthClick = ref(false);

// === 新增 Tab 状态和下载相关变量 ===
const activeTabName = ref('filter');
const downloadFileType = ref('json');
const downloadFileTypes = ref(['json', 'csv', 'shp']);

const downloadScope = ref('time_filtered');
const downloadScopes = ref([
  { label: '当前时间筛选数据', value: 'time_filtered' },
  { label: '地图区域筛选数据', value: 'geo_filtered' },
  { label: '所有犯罪数据', value: 'all' }
]);

// Leaflet.Draw 相关
let drawnItems: L.FeatureGroup | null = null;
let drawControl: L.Control.Draw | null = null;

// === 新增：用于存储地理筛选后的数据和弹窗状态 ===
const geoFilteredCrimeData = ref<any[]>([]);
const currentDisplayedCrimeData = ref<any[]>([]);

// 弹窗相关
const showGeoStatsDialog = ref(false);
const geoStats = ref({
  crimeCount: 0,
  areaSqKm: '0.00',
  crimeTypeData: [] as { name: string; value: number }[]
});
const geoStatsCrimeTypeBarChart = ref<HTMLElement | null>(null);
let geoStatsCrimeTypeBarChartInstance: echarts.ECharts | null = null;

// 监听弹窗显示状态，以正确管理 ECharts 实例
watch(showGeoStatsDialog, (newValue) => {
  if (newValue) {
    // 弹窗打开时，确保 DOM 元素存在，并初始化 ECharts
    nextTick(() => {
      if (geoStatsCrimeTypeBarChart.value) {
        // 如果实例已存在，先销毁它，再重新初始化
        if (geoStatsCrimeTypeBarChartInstance) {
          geoStatsCrimeTypeBarChartInstance.dispose();
          geoStatsCrimeTypeBarChartInstance = null; // 清除引用
        }
        geoStatsCrimeTypeBarChartInstance = echarts.init(geoStatsCrimeTypeBarChart.value);
        updateGeoStatsCrimeTypeChart(); // 更新图表数据
      }
    });
  } else {
    // 弹窗关闭时，销毁 ECharts 实例
    if (geoStatsCrimeTypeBarChartInstance) {
      geoStatsCrimeTypeBarChartInstance.dispose();
      geoStatsCrimeTypeBarChartInstance = null; // 清除引用
    }
  }
});


// 监听年份和月份的变化，更新天数选项
const updateDayOptions = () => {
  console.log('updateDayOptions called', selectedYear.value, selectedMonth.value);
  if (selectedYear.value && selectedMonth.value) {
    const monthIndex = parseInt(selectedMonth.value) - 1;
    const daysInMonth = new Date(parseInt(selectedYear.value), monthIndex + 1, 0).getDate();
    dayOptions.value = Array.from({ length: daysInMonth }, (_, i) => (i + 1).toString().padStart(2, '0'));
    console.log('dayOptions updated:', dayOptions.value);
  } else {
    dayOptions.value = [];
    console.log('dayOptions reset to empty');
  }
};

// 监听年份变化：清除月份、日期、犯罪类型，并更新天数选项
watch(selectedYear, (newYear, oldYear) => {
  if (newYear !== oldYear) {
    selectedMonth.value = '';
    selectedDay.value = '';
    selectedCrimeType.value = '';
    console.log('年份已更改，月份、日期和犯罪类型已清除');
  }
  updateDayOptions();
  // 年份改变时，关闭并清空地理筛选弹窗和数据
  showGeoStatsDialog.value = false;
  geoFilteredCrimeData.value = [];
  // 这里不需要直接销毁 ECharts 实例，因为 watch(showGeoStatsDialog) 会处理
  // if (geoStatsCrimeTypeBarChartInstance) {
  //   geoStatsCrimeTypeBarChartInstance.clear(); // 只是清空数据，不销毁实例
  // }
  // 清除地图上的绘制区域，因为筛选条件变了，绘制区域内的数据也需要重新分析
  if (drawnItems) {
    drawnItems.clearLayers();
  }
});

// 监听月份变化：清除日期、犯罪类型，并更新天数选项
watch(selectedMonth, (newMonth, oldMonth) => {
  if (newMonth !== oldMonth) {
    if (!isEChartsMonthClick.value) {
      selectedDay.value = '';
      selectedCrimeType.value = '';
      console.log('月份已更改（非ECharts触发），日期和犯罪类型已清除');
    } else {
      console.log('月份已更改（ECharts触发），日期和犯罪类型保持不变');
      isEChartsMonthClick.value = false; // 重置标志位
    }
  }
  updateDayOptions();
});

// 监听日期变化：清除犯罪类型
watch(selectedDay, (newDay, oldDay) => {
  if (newDay !== oldDay) {
    selectedCrimeType.value = '';
    console.log('日期已更改，犯罪类型已清除');
  }
});


// 处理筛选提交 (时间筛选)
const applyFilters = () => {
  console.log('筛选条件:', {
    year: selectedYear.value,
    month: selectedMonth.value,
    day: selectedDay.value,
    crimeType: selectedCrimeType.value,
  });

  if (!selectedYear.value || !allCrimeData.value[selectedYear.value]) {
    ElMessage.warning('请至少选择一个年份进行筛选！');
    if (crimeLayer.value) {
      map.value?.removeLayer(crimeLayer.value);
      crimeLayer.value = null;
    }
    currentDisplayedCrimeData.value = [];
    return;
  }

  const selectedData = allCrimeData.value[selectedYear.value];

  // 清除任何现有的地理筛选数据和关闭弹窗
  geoFilteredCrimeData.value = [];
  showGeoStatsDialog.value = false; // 关闭弹窗
  // 这里不需要直接销毁 ECharts 实例，因为 watch(showGeoStatsDialog) 会处理
  // if (geoStatsCrimeTypeBarChartInstance) {
  //   geoStatsCrimeTypeBarChartInstance.clear();
  // }
  // 清除地图上的绘制区域
  if (drawnItems) {
    drawnItems.clearLayers();
  }


  if (crimeLayer.value) {
    map.value?.removeLayer(crimeLayer.value);
    crimeLayer.value = null;
  }

  if (initialMapView.value && map.value) {
    map.value.setView(initialMapView.value.center, initialMapView.value.zoom);
  }

  const filteredFeatures = selectedData.features.filter((feature: any) => {
    if (!feature.properties || !feature.properties.REPORT_DAT || !feature.properties.OFFENSE) {
      return false;
    }

    const reportDate = new Date(feature.properties.REPORT_DAT);
    const featureYear = reportDate.getFullYear().toString();
    const featureMonth = (reportDate.getMonth() + 1).toString().padStart(2, '0');
    const featureDay = reportDate.getDate().toString().padStart(2, '0');
    const offenseType = feature.properties.OFFENSE;

    if (selectedYear.value && featureYear !== selectedYear.value) {
      return false;
    }
    if (selectedMonth.value && featureMonth !== selectedMonth.value) {
      return false;
    }
    if (selectedDay.value && featureDay !== selectedDay.value) {
      return false;
    }
    if (selectedCrimeType.value && offenseType !== selectedCrimeType.value) {
      return false;
    }
    return true;
  });

  currentDisplayedCrimeData.value = filteredFeatures;

  crimeLayer.value = L.geoJSON({ type: 'FeatureCollection', features: filteredFeatures }, {
    pointToLayer: (feature, latlng) => {
      const marker = L.circleMarker(latlng, {
        radius: 6,
        fillColor: '#00FFFF', // 青色发光效果
        color: '#00FFFF', // 边框也用青色
        weight: 1,
        opacity: 0.8,
        fillOpacity: 0.5
      });

      marker.bindTooltip(feature.properties.OFFENSE, {
        className: 'custom-tooltip', // 自定义 tooltip 样式
        permanent: false, // 鼠标悬停才显示
        direction: 'right'
      });

      marker.bindPopup(`
        <b>犯罪类型:</b> ${feature.properties.OFFENSE}<br>
        <b>报告日期:</b> ${feature.properties.REPORT_DAT}<br>
        <b>发生街区:</b> ${feature.properties.BLOCK}<br>
        <b>地区:</b> ${feature.properties.DISTRICT}<br>
        <b>邻里:</b> ${feature.properties.NEIGHBORHO}
        ${feature.properties.BID ? `<br><b>BID:</b> ${feature.properties.BID}` : ''}
      `);

      return marker;
    },
  }).addTo(map.value as L.Map);
  ElMessage.success(`地图已更新，显示 ${filteredFeatures.length} 条数据。`);
};

onMounted(() => {
  if (mapContainer.value) {
    // 设置深色地图底图
    map.value = L.map(mapContainer.value, {
      center: [38.9072, -77.0369],
      zoom: 12,
      //zoomControl: false, // 禁用默认缩放控件
      //attributionControl: false // 禁用默认归因
    });

    initialMapView.value = {
      center: map.value.getCenter(),
      zoom: map.value.getZoom()
    };

    // 使用 Dark Matter 地图或 Stamen Toner Background 模拟深色底图
    L.tileLayer('https://tiles.stadiamaps.com/tiles/alidade_smooth_dark/{z}/{x}/{y}{r}.png', {
      attribution: '&copy; <a href="https://stadiamaps.com/">Stadia Maps</a>, &copy; <a href="https://openmaptiles.org/">OpenMapTiles</a> &copy; <a href="http://openstreetmap.org">OpenStreetMap</a> contributors',
      maxZoom: 20,
      minZoom: 1
    }).addTo(map.value);

    L.control.scale({ imperial: false }).addTo(map.value);

    extractCrimeTypes();

    // === 初始化 Leaflet.Draw ===
    drawnItems = new L.FeatureGroup();
    map.value.addLayer(drawnItems);

    drawControl = new L.Control.Draw({
      edit: {
        featureGroup: drawnItems,
        poly: {
          allowIntersection: false
        },
        polyline: false,
        marker: false,
        circlemarker: false,
        circle: false
      },
      draw: {
        polygon: {
          allowIntersection: false,
          showArea: false,
          metric: true,
          tooltip: {
            start: '点击开始绘制多边形',
            cont: '点击继续绘制',
            end: '点击第一个点完成绘制'
          }
        },
        rectangle: {
          shapeOptions: {
            color: '#f30a0a',
            fillColor: '#f30a0a',
            fillOpacity: 0.5
          },
          showArea: false,
          metric: true,
          tooltip: {
            start: '按住并拖动以绘制矩形'
          }
        },
        polyline: false,
        circle: false,
        circlemarker: false,
        marker: false
      }
    } as any);
    map.value.addControl(drawControl);

    map.value.on(L.Draw.Event.CREATED, (event: any) => {
      const layer = event.layer;
      drawnItems!.clearLayers();
      drawnItems!.addLayer(layer);
      ElMessage.success('区域绘制完成！');
      analyzeDrawnPolygon(layer);
    });

    map.value.on('draw:edited', (_e: any) => {
      if (drawnItems && drawnItems.getLayers().length > 0) {
        analyzeDrawnPolygon(drawnItems.getLayers()[0]);
      }
      ElMessage.success('区域已编辑！');
    });

    map.value.on('draw:deleted', (_e: any) => {
      geoFilteredCrimeData.value = [];
      showGeoStatsDialog.value = false; // 关闭弹窗
      // 这里不需要直接销毁 ECharts 实例，因为 watch(showGeoStatsDialog) 会处理
      // if (geoStatsCrimeTypeBarChartInstance) {
      //     geoStatsCrimeTypeBarChartInstance.clear();
      // }
      applyFilters();
      ElMessage.warning('区域已删除！');
    });
  }
});

const extractCrimeTypes = () => {
  const allTypes = new Set<string>();
  for (const year in allCrimeData.value) {
    allCrimeData.value[year].features.forEach((feature: any) => {
      if (feature.properties && feature.properties.OFFENSE) {
        allTypes.add(feature.properties.OFFENSE);
      }
    });
  }
  crimeTypeOptions.value = Array.from(allTypes).sort();
};

//不同月份的犯罪案件柱状图 (时间筛选)
const monthlyBarChart = ref<HTMLElement | null>(null);
let monthlyBarChartInstance: echarts.ECharts | null = null;

// (此处的 watch 函数与之前版本一致，无需修改)
watch(selectedYear, (newYear) => {
  console.log('ECharts Monthly Chart: Selected Year changed to:', newYear);

  if (newYear && allCrimeData.value[newYear]) {
    const yearData = allCrimeData.value[newYear].features;
    const monthlyCounts: { [key: string]: number } = {};
    monthOptions.value.forEach(month => (monthlyCounts[month] = 0));

    yearData.forEach((item: any) => {
      if (item.properties && item.properties.REPORT_DAT) {
        const reportDate = new Date(item.properties.REPORT_DAT);
        if (!isNaN(reportDate.getTime())) {
          const month = (reportDate.getMonth() + 1).toString().padStart(2, '0');
          if (monthlyCounts.hasOwnProperty(month)) {
            monthlyCounts[month] = (monthlyCounts[month] || 0) + 1;
          }
        }
      }
    });

    const months = monthOptions.value;
    const counts = months.map(month => monthlyCounts[month] || 0);

    if (monthlyBarChart.value) {
      if (!monthlyBarChartInstance) {
        monthlyBarChartInstance = echarts.init(monthlyBarChart.value);
      }
      monthlyBarChartInstance.setOption({
        title: {
          text: `${newYear}年每月犯罪案件数量`,
          textStyle: {
            color: '#00FFFF' // 标题颜色
          },
          left: 'center'
        },
        xAxis: {
          type: 'category',
          data: months,
          axisLabel: {
            color: '#A0B0D0' // X轴刻度标签颜色
          }
        },
        yAxis: {
          type: 'value',
          name: '案件数量',
          nameTextStyle: { // Y轴名称颜色
            color: '#A0B0D0'
          },
          min: 0,
          splitNumber: 6,
          interval: counts.length > 0 && Math.max(...counts) > 0 ? Math.ceil(Math.max(...counts) / 5) : 1,
          axisLabel: {
            formatter: function (value: number) {
              return Math.round(value);
            },
            color: '#A0B0D0' // Y轴刻度标签颜色
          },
          splitLine: { // Y轴分割线颜色
            lineStyle: {
              color: 'rgba(0, 255, 255, 0.1)' // 使用透明度较低的强调色，符合科技感
            }
          }
        },
        series: [{
          type: 'bar',
          data: counts,
          name: '案件数量',
          itemStyle: {
            color: '#00FFFF' // 柱子的颜色
          },
          label: {
            show: true,
            position: 'top',
            color: '#A0B0D0' // 柱子上方显示数据的文字颜色
          }
        }],
        tooltip: {
          trigger: 'item',
          formatter: '{b}: {c}',
          textStyle: { // 提示框文字颜色
            color: '#A0B0D0'
          },
          backgroundColor: 'rgba(10, 24, 56, 0.9)', // 与面板背景一致
          borderColor: '#00FFFF', // 边框颜色
          borderWidth: 1
        },
        toolbox: {
          show: true,
          feature: {
            magicType: {
              type: ['line', 'bar'],
              title: {
                line: '切换为折线图',
                bar: '切换为柱状图'
              }
            },
            restore: { title: '重置' },
            saveAsImage: { title: '保存图片', name: `${newYear}年每月犯罪案件数量` }
          },
          //right: 20,
          iconStyle: { // 工具箱图标颜色
            borderColor: '#00FFFF'
          },
          // 工具箱文本颜色，如果工具箱有文本的话，这里可以设置
          // textStyle: {
          //     color: '#A0B0D0'
          // }
        }
      }, true);

      if (monthlyBarChartInstance) {
        monthlyBarChartInstance.off('click');
        monthlyBarChartInstance.on('click', (params: any) => {
          monthlyBarChartInstance!.dispatchAction({
            type: 'showTip',
            seriesIndex: 0,
            dataIndex: params.dataIndex
          });
          isEChartsMonthClick.value = true;

          selectedMonth.value = months[params.dataIndex];
          selectedCrimeType.value = '';
          console.log(`ECharts Bar Click: selectedMonth updated to ${selectedMonth.value}`);
        });
      }
    }
  } else if (monthlyBarChartInstance) {
    monthlyBarChartInstance.clear();
  }
}, { immediate: true });

//不同犯罪类型饼状图 (时间筛选)
const crimeTypePieChart = ref<HTMLElement | null>(null);
let crimeTypePieChartInstance: echarts.ECharts | null = null;

// (此处的 watch 函数与之前版本一致，无需修改)
watch(() => [selectedYear.value, selectedMonth.value], ([year, month]) => {
  console.log('ECharts Pie Chart: Year:', year, 'Month:', month);

  if (year && month && allCrimeData.value[year]) {
    const yearData = allCrimeData.value[year].features;
    const monthlyData = yearData.filter((item: any) => {
      if (!item.properties || !item.properties.REPORT_DAT) return false;
      const reportDate = new Date(item.properties.REPORT_DAT);
      if (isNaN(reportDate.getTime())) return false;
      const itemMonth = (reportDate.getMonth() + 1).toString().padStart(2, '0');
      return itemMonth === month;
    });

    const crimeTypeCounts: { [key: string]: number } = {};
    monthlyData.forEach((item: any) => {
      if (item.properties && item.properties.OFFENSE) {
        const offense = item.properties.OFFENSE;
        crimeTypeCounts[offense] = (crimeTypeCounts[offense] || 0) + 1;
      }
    });

    const pieData = Object.entries(crimeTypeCounts).map(([name, value]) => ({ name, value }));

    if (crimeTypePieChart.value) {
      if (!crimeTypePieChartInstance) {
        crimeTypePieChartInstance = echarts.init(crimeTypePieChart.value);
      }
      crimeTypePieChartInstance.setOption({
        title: {
          text: `${year}年${month}月犯罪类型分布`,
          textStyle: {
            color: '#00FFFF' // 标题颜色
          },
          left: 'center'
        },
        legend: {
          type: 'scroll',
          orient: 'horizontal',
          bottom: '0%',
          left: 'center',
          padding: [10, 0, 0, 0],
          textStyle: { // 图例文字颜色
            color: '#A0B0D0'
          }
        },
        toolbox: {
          show: true,
          feature: {
            dataView: { readOnly: false, title: '数据视图' },
            restore: { title: '重置' },
            saveAsImage: { title: '保存图片', name: `${year}年${month}月犯罪类型分布` }
          },
          left: 'right',
          top: 'top',
          iconStyle: { // 工具箱图标颜色
            borderColor: '#00FFFF'
          }
        },
        series: [
          {
            name: '犯罪类型',
            type: 'pie',
            radius: '60%',
            center: ['50%', '50%'],
            data: pieData,
            emphasis: { itemStyle: { shadowBlur: 10, shadowOffsetX: 0, shadowColor: 'rgba(0, 0, 0, 0.5)' } },
            label: {
              show: true,
              formatter: '{b}: {d}%',
              color: '#A0B0D0' // 饼图外部标签文字颜色
            },
            // 如果希望在饼图内部的引导线显示文字
            labelLine: {
              lineStyle: {
                color: '#A0B0D0' // 引导线颜色
              }
            },
            // 可以为饼图的扇区设置颜色系列，使其更符合数字大屏风格
            color: [
              '#00FFFF', '#007BFF', '#33FF33', '#FFD700', '#FF4500',
              '#8A2BE2', '#DC143C', '#20B2AA', '#BA55D3', '#FF6347'
            ]
          }
        ],
        tooltip: {
          trigger: 'item',
          formatter: '{a} <br/>{b}: {c} ({d}%)',
          textStyle: { // 提示框文字颜色
            color: '#A0B0D0'
          },
          backgroundColor: 'rgba(10, 24, 56, 0.9)', // 与面板背景一致
          borderColor: '#00FFFF', // 边框颜色
          borderWidth: 1
        }
      }, true);

      if (crimeTypePieChartInstance) {
        crimeTypePieChartInstance.off('click');
        crimeTypePieChartInstance.on('click', (params: any) => {
          crimeTypePieChartInstance!.dispatchAction({
            type: 'showTip',
            seriesIndex: 0,
            dataIndex: params.dataIndex
          });
          selectedCrimeType.value = params.name as string;
          console.log(`ECharts Pie Click: selectedCrimeType updated to ${selectedCrimeType.value}`);
        });
      }
    }
  } else if (crimeTypePieChartInstance) {
    crimeTypePieChartInstance.clear();
  }
}, { immediate: true });

//选择具体日期后的环状图 (时间筛选)
const dailyRingChart = ref<HTMLElement | null>(null);
let dailyRingChartInstance: echarts.ECharts | null = null;

// (此处的 watch 函数与之前版本一致，无需修改)
watch(() => [selectedYear.value, selectedMonth.value, selectedDay.value], ([year, month, day]) => {
  console.log('ECharts Daily Chart: Year:', year, 'Month:', month, 'Day:', day);

  if (year && month && day && allCrimeData.value[year]) {
    const yearData = allCrimeData.value[year].features;
    const dailyData = yearData.filter((item: any) => {
      if (!item.properties || !item.properties.REPORT_DAT) return false;
      const reportDate = new Date(item.properties.REPORT_DAT);
      if (isNaN(reportDate.getTime())) return false;
      const itemMonth = (reportDate.getMonth() + 1).toString().padStart(2, '0');
      const itemDay = reportDate.getDate().toString().padStart(2, '0');
      return itemMonth === month && itemDay === day;
    });

    const crimeTypeCounts: { [key: string]: number } = {};
    dailyData.forEach((item: any) => {
      if (item.properties && item.properties.OFFENSE) {
        const offense = item.properties.OFFENSE;
        crimeTypeCounts[offense] = (crimeTypeCounts[offense] || 0) + 1;
      }
    });

    const pieData = Object.entries(crimeTypeCounts).map(([name, value]) => ({ name, value }));

    if (dailyRingChart.value) {
      if (!dailyRingChartInstance) {
        dailyRingChartInstance = echarts.init(dailyRingChart.value);
      }
      dailyRingChartInstance.setOption({
        title: {
          text: `${year}年${month}月${day}日 犯罪类型分布`,
          textStyle: {
            color: '#00FFFF' // 标题颜色
          },
          left: 'center'
        },
        legend: {
          type: 'scroll',
          orient: 'horizontal',
          bottom: '0%',
          left: 'center',
          padding: [10, 0, 0, 0],
          textStyle: { // 图例文字颜色
            color: '#A0B0D0'
          }
        },
        toolbox: {
          show: true,
          feature: {
            dataView: { readOnly: false, title: '数据视图' },
            restore: { title: '重置' },
            saveAsImage: { title: '保存图片', name: `${year}年${month}月${day}日犯罪类型分布` }
          },
          left: 'right',
          top: 'top',
          iconStyle: { // 工具箱图标颜色
            borderColor: '#00FFFF'
          }
        },
        series: [
          {
            name: '犯罪类型',
            type: 'pie',
            radius: ['40%', '70%'],
            center: ['50%', '50%'],
            avoidLabelOverlap: false,
            label: {
              show: true,
              position: 'outside',
              formatter: '{b}: {d}%',
              color: '#A0B0D0' // 饼图外部标签文字颜色
            },
            emphasis: {
              label: {
                show: true,
                formatter: '{b}\n{d}%',
                fontSize: 16,
                fontWeight: 'bold',
                color: '#00FFFF' // 鼠标悬停时标签颜色可以更亮
              }
            },
            labelLine: {
              show: true,
              lineStyle: {
                color: '#A0B0D0' // 引导线颜色
              }
            },
            data: pieData,
            color: [
              '#00FFFF', '#007BFF', '#33FF33', '#FFD700', '#FF4500',
              '#8A2BE2', '#DC143C', '#20B2AA', '#BA55D3', '#FF6347'
            ]
          }
        ],
        tooltip: {
          trigger: 'item',
          formatter: '{a} <br/>{b}: {c} ({d}%)',
          textStyle: { // 提示框文字颜色
            color: '#A0B0D0'
          },
          backgroundColor: 'rgba(10, 24, 56, 0.9)', // 与面板背景一致
          borderColor: '#00FFFF', // 边框颜色
          borderWidth: 1
        }
      }, true);
      if (dailyRingChartInstance) {
        dailyRingChartInstance.off('click');
        dailyRingChartInstance.on('click', (params: any) => {
          dailyRingChartInstance!.dispatchAction({
            type: 'showTip',
            seriesIndex: 0,
            dataIndex: params.dataIndex
          });
          selectedCrimeType.value = params.name as string;
          console.log(`ECharts Ring Click: selectedCrimeType updated to ${selectedCrimeType.value}`);
        });
      }
    }
  } else if (dailyRingChartInstance) {
    dailyRingChartInstance.clear();
  }
}, { immediate: true });


// --- 修改：绘制多边形后的数据分析与弹窗显示 ---
const analyzeDrawnPolygon = (drawnLayer: L.Layer) => {
  if (!map.value || !selectedYear.value) {
    ElMessage.warning('请先选择年份并确保地图已加载，才能进行区域犯罪数据分析。');
    showGeoStatsDialog.value = false; // 关闭弹窗
    return;
  }

  // 确保当前地图上已经有时间筛选后的数据
  if (currentDisplayedCrimeData.value.length === 0) {
    ElMessage.warning('请先应用时间筛选，再在地图上绘制区域进行分析。');
    showGeoStatsDialog.value = false; // 关闭弹窗
    return;
  }

  const drawnGeoJson = drawnLayer.toGeoJSON();

  // 确保绘制的是多边形或矩形 (Leaflet.Draw 的矩形也是 Polygon 类型)
  if (drawnGeoJson.geometry.type !== 'Polygon') {
    ElMessage.warning('请绘制一个多边形或矩形区域进行分析。');
    showGeoStatsDialog.value = false; // 关闭弹窗
    return;
  }

  const polygon = turf.polygon(drawnGeoJson.geometry.coordinates); // 将绘制的 GeoJSON 转换为 Turf.js 的多边形对象

  const filteredFeaturesInPolygon: any[] = [];
  const featuresNotInPolygon: any[] = []; // 用于存储多边形外部的点

  // 基于当前地图上显示的数据 (currentDisplayedCrimeData.value) 进行二次筛选
  currentDisplayedCrimeData.value.forEach((feature: any) => {
    if (feature.geometry && feature.geometry.coordinates && feature.geometry.type === 'Point') {
      const [lon, lat] = feature.geometry.coordinates;
      const point = turf.point([lon, lat]);

      // 使用 turf.booleanPointInPolygon 进行点在多边形内的判断
      if (turf.booleanPointInPolygon(point, polygon)) {
        filteredFeaturesInPolygon.push(feature);
      } else {
        featuresNotInPolygon.push(feature);
      }
    }
  });

  geoFilteredCrimeData.value = filteredFeaturesInPolygon; // 更新地理筛选数据，供下载使用

  // 移除旧的图层
  if (crimeLayer.value) {
    map.value.removeLayer(crimeLayer.value);
    crimeLayer.value = null;
  }

  // 重新添加图层，区分多边形内部和外部的点
  const geojsonToDisplay = {
    type: 'FeatureCollection',
    features: [
      ...filteredFeaturesInPolygon, // 内部点
      ...featuresNotInPolygon // 外部点
    ]
  };

  crimeLayer.value = L.geoJSON(geojsonToDisplay, {
    pointToLayer: (feature, latlng) => {
      const isInside = filteredFeaturesInPolygon.includes(feature); // 判断是否在多边形内部
      const marker = L.circleMarker(latlng, {
        radius: 5,
        fillColor: isInside ? 'blue' : 'red', // 内部蓝色，外部红色
        color: 'black',
        weight: 1,
        opacity: 1,
        fillOpacity: 0.8
      });

      marker.bindTooltip(feature.properties.OFFENSE);
      marker.bindPopup(`
              <b>犯罪类型:</b> ${feature.properties.OFFENSE}<br>
              <b>报告日期:</b> ${feature.properties.REPORT_DAT}<br>
              <b>发生街区:</b> ${feature.properties.BLOCK}<br>
              <b>地区:</b> ${feature.properties.DISTRICT}<br>
              <b>邻里:</b> ${feature.properties.NEIGHBORHO}
              ${feature.properties.BID ? `<br><b>BID:</b> ${feature.properties.BID}` : ''}
          `);
      return marker;
    },
  }).addTo(map.value as L.Map);

  // === 更新弹窗数据 ===
  geoStats.value.crimeCount = filteredFeaturesInPolygon.length;

  // 计算区域面积 (平方公里)
  const area = turf.area(polygon); // 面积单位为平方米
  geoStats.value.areaSqKm = (area / 1_000_000).toFixed(2); // 转换为平方公里并保留两位小数

  // 统计犯罪类型并排序
  const crimeTypeCounts: { [key: string]: number } = {};
  filteredFeaturesInPolygon.forEach((item: any) => {
    if (item.properties && item.properties.OFFENSE) {
      const offense = item.properties.OFFENSE;
      crimeTypeCounts[offense] = (crimeTypeCounts[offense] || 0) + 1;
    }
  });
  // 转换为数组并按数量降序排序
  geoStats.value.crimeTypeData = Object.entries(crimeTypeCounts)
    .map(([name, value]) => ({ name, value }))
    .sort((a, b) => b.value - a.value);

  // 打开弹窗。watch(showGeoStatsDialog) 会在 newValue 为 true 时处理 ECharts 实例的初始化
  showGeoStatsDialog.value = true;


  if (filteredFeaturesInPolygon.length === 0) {
    ElMessage.info('在绘制区域内没有找到犯罪数据。');
  } else {
    ElMessage.success(`在绘制区域内找到 ${filteredFeaturesInPolygon.length} 条犯罪数据！`);
  }
};


// === 新增：更新弹窗内的犯罪类型排序图表 ===
const updateGeoStatsCrimeTypeChart = () => {
  if (!geoStatsCrimeTypeBarChartInstance) {
    console.warn('ECharts instance for geo stats chart is not initialized.');
    return;
  }

  const data = geoStats.value.crimeTypeData;
  const crimeTypes = data.map(item => item.name);
  const counts = data.map(item => item.value);

  // 调整图表配置以确保在弹窗中显示良好
  geoStatsCrimeTypeBarChartInstance.setOption({
    title: {
      text: '区域内犯罪类型数量排序',
      left: 'center',
      textStyle: {
        fontSize: 20,
        color: '#00FFFF' // 标题颜色改为亮青色
      }
    },
    // ====== 新增：Toolbox 配置 ======
    toolbox: {
      show: true, // 显示工具箱
      feature: {
        dataView: {
          readOnly: false, // 是否可以编辑数据，设置为 false 表示可以查看原始数据，但通常不会让用户在前端编辑
          title: '数据视图', // 工具的名称
          lang: ['数据视图', '关闭', '刷新'], // 数据视图的语言设置
          backgroundColor: '#0A1838', // 数据视图背景色
          textColor: '#A0B0D0', // 数据视图文字颜色
          textareaBorderColor: '#00FFFF', // 文本区域边框颜色
          buttonColor: '#00FFFF', // 按钮颜色
          buttonTextColor: '#0A1838',  // 按钮文字颜色
          iconStyle: {
            borderColor: '#00FFFF' // 图标颜色
          }
        },
        magicType: {
          show: true,
          type: ['line', 'bar'], // 可以切换的图表类型，这里是柱状图和折线图
          title: {
            line: '切换为折线图',
            bar: '切换为柱状图'
          },
          iconStyle: {
            borderColor: '#00FFFF' // 图标颜色
          }
        },
        restore: {
          show: true,
          title: '还原', // 还原到最初状态
          iconStyle: {
            borderColor: '#00FFFF'
          }
        },
        saveAsImage: {
          show: true,
          type: 'png', // 默认保存为 PNG
          title: '保存为图片', // 保存为图片
          name: '犯罪类型统计图', // 保存的文件名
          backgroundColor: '#0A1838', // 导出图片的背景色，确保和整体风格一致
          iconStyle: {
            borderColor: '#00FFFF'
          }
        }
      },
      iconStyle: { // 工具箱所有图标的默认样式
        borderColor: '#A0B0D0', // 默认图标颜色
        borderWidth: 1
      },
      emphasis: { // 鼠标悬停时图标的样式
        iconStyle: {
          borderColor: '#00FFFF' // 悬停时图标颜色
        }
      },
      right: 20, // 调整工具箱位置，使其不遮挡标题
      top: 20
    },
    tooltip: {
      trigger: 'axis',
      axisPointer: { type: 'shadow' },
      backgroundColor: 'rgba(10, 24, 56, 0.9)', // Tooltip 背景，与面板背景一致
      borderColor: '#00FFFF', // Tooltip 边框
      borderWidth: 1,
      textStyle: {
        color: '#A0B0D0' // Tooltip 文字颜色
      }
    },
    grid: {
      left: '3%',
      right: '4%',
      bottom: '3%',
      containLabel: true
    },
    xAxis: {
      type: 'value',
      name: '案件数量',
      nameLocation: 'middle',
      axisLabel: {
        fontSize: 16,
        color: '#A0B0D0' // X轴标签颜色
      },
      nameTextStyle: {
        color: '#A0B0D0' // X轴名称颜色
      },
      splitLine: {
        show: true,
        lineStyle: {
          color: 'rgba(0, 255, 255, 0.1)' // X轴分割线，浅青色
        }
      },
      axisLine: {
        lineStyle: {
          color: 'rgba(0, 255, 255, 0.4)' // X轴轴线颜色
        }
      }
    },
    yAxis: {
      type: 'category',
      data: crimeTypes,
      axisLabel: {
        fontSize: 10,
        interval: 0, // 确保所有标签都显示
        formatter: function (value: string) { // 限制文字长度，防止溢出
          return value.length > 15 ? value.substring(0, 15) + '...' : value;
        },
        color: '#A0B0D0' // Y轴标签颜色
      },
      nameTextStyle: {
        fontSize: 10,
        color: '#A0B0D0' // Y轴名称颜色
      },
      axisLine: {
        lineStyle: {
          color: 'rgba(0, 255, 255, 0.4)' // Y轴轴线颜色
        }
      },
      splitLine: {
        show: false // 通常柱状图的Y轴不需要分割线
      }
    },
    series: [
      {
        name: '案件数量',
        type: 'bar',
        data: counts,
        itemStyle: {
          color: new echarts.graphic.LinearGradient(0, 0, 1, 0, [ // 渐变色调整为亮青色系
            { offset: 0, color: '#00FFFF' },   // 起始亮青色
            { offset: 0.7, color: '#007BFF' },  // 亮蓝色
            { offset: 1, color: '#0056D4' }    // 稍深的蓝色
          ]),
          borderColor: '#00FFFF', // 柱子边框
          borderWidth: 1
        },
        label: {
          show: true,
          position: 'right',
          fontSize: 10,
          color: '#00FFFF' // 标签文字颜色改为亮青色
        },
        emphasis: { // 鼠标悬停时的效果
          itemStyle: {
            color: new echarts.graphic.LinearGradient(0, 0, 1, 0, [
              { offset: 0, color: '#33FFFF' }, // 悬停时更亮的青色
              { offset: 0.7, color: '#33A0FF' },
              { offset: 1, color: '#337DFF' }
            ]),
            shadowBlur: 10,
            shadowOffsetX: 0,
            shadowOffsetY: 0,
            shadowColor: 'rgba(0, 255, 255, 0.5)' // 悬停发光效果
          }
        }
      }
    ]
  }, true);
  // 确保图表在每次数据更新后都能正确调整大小
  geoStatsCrimeTypeBarChartInstance.resize();
};


// === 新增：处理弹窗关闭事件 ===
const handleGeoStatsDialogClosed = () => {
  if (geoStatsCrimeTypeBarChartInstance) {
    geoStatsCrimeTypeBarChartInstance.dispose();
    geoStatsCrimeTypeBarChartInstance = null;
    console.log('已处理地理统计图表');
  }
};

// === 数据下载功能 (与之前版本一致，无需修改) ===
const downloadData = async () => {
  let dataToDownload: any[] = [];
  let filename = '';
  let featuresToDownload: any[] = [];

  if (downloadScope.value === 'time_filtered') {
    if (crimeLayer.value) {
      featuresToDownload = (crimeLayer.value.toGeoJSON() as any).features;
      dataToDownload = featuresToDownload.map(f => f.properties);

      filename = `crime_data_time_filtered_${selectedYear.value || 'all'}`;
      if (selectedMonth.value) {
        filename += `_${selectedMonth.value}`;
      }
      if (selectedDay.value) {
        filename += `_${selectedDay.value}`;
      }
      if (selectedCrimeType.value) {
        const safeCrimeType = selectedCrimeType.value.replace(/[^a-zA-Z0-9_-]/g, '_').replace(/_+/g, '_');
        filename += `_${safeCrimeType}`;
      }
    } else {
      ElMessage.warning('当前没有时间筛选数据可供下载，请先进行时间筛选。');
      return;
    }
  } else if (downloadScope.value === 'geo_filtered') {
    if (drawnItems && drawnItems.getLayers().length > 0 && selectedYear.value) {
      featuresToDownload = geoFilteredCrimeData.value;

      if (featuresToDownload.length === 0) {
        ElMessage.warning('在当前绘制区域内没有找到数据。');
        return;
      }
      dataToDownload = featuresToDownload.map(f => f.properties);
      filename = `crime_data_geo_filtered_${selectedYear.value}`;
    } else {
      ElMessage.warning('请在地图上绘制一个区域并选择年份来筛选数据！');
      return;
    }
  } else if (downloadScope.value === 'all') {
    for (const year in allCrimeData.value) {
      featuresToDownload.push(...allCrimeData.value[year].features);
      dataToDownload.push(...allCrimeData.value[year].features.map((f: any) => f.properties));
    }
    filename = `crime_data_all`;
  }

  if (featuresToDownload.length === 0) {
    ElMessage.warning('没有数据可供下载。');
    return;
  }

  let dataStr: string;
  let mimeType: string;
  let actualFilename = filename;

  if (downloadFileType.value === 'json') {
    dataStr = JSON.stringify(dataToDownload, null, 2);
    mimeType = 'application/json';
    actualFilename += '.json';

    const blob = new Blob([dataStr], { type: mimeType + ';charset=utf-8;' });
    const link = document.createElement('a');
    link.href = URL.createObjectURL(blob);
    link.download = actualFilename;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(link.href);
    ElMessage.success('数据下载成功！');

  } else if (downloadFileType.value === 'csv') {
    const headers = dataToDownload.length > 0 ? Object.keys(dataToDownload[0]) : [];
    const csvRows = [
      headers.join(','),
      ...dataToDownload.map(row => headers.map(header => {
        let value = row[header];
        if (typeof value === 'string' && (value.includes(',') || value.includes('"') || value.includes('\n'))) {
          value = `"${value.replace(/"/g, '""')}"`;
        }
        return value;
      }).join(','))
    ];
    dataStr = csvRows.join('\n');
    mimeType = 'text/csv';
    actualFilename += '.csv';

    const blob = new Blob([dataStr], { type: mimeType + ';charset=utf-8;' });
    const link = document.createElement('a');
    link.href = URL.createObjectURL(blob);
    link.download = actualFilename;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(link.href);
    ElMessage.success('数据下载成功！');

  } else if (downloadFileType.value === 'shp') {
    try {
      ElMessage.info('正在生成SHP文件，请稍候...');
      const response = await fetch('http://localhost:5000/generate_shp', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          features: featuresToDownload,
          filename: filename
        }),
      });

      if (response.ok) {
        const blob = await response.blob();
        const url = window.URL.createObjectURL(blob);
        const link = document.createElement('a');
        link.href = url;
        link.setAttribute('download', `${filename}.zip`);
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
        window.URL.revokeObjectURL(url);
        ElMessage.success('SHP文件下载成功！');
      } else {
        const errorData = await response.json();
        ElMessage.error(`SHP文件生成失败: ${errorData.error || '未知错误'}`);
      }
    } catch (error) {
      console.error('Error fetching SHP:', error);
      ElMessage.error('连接后端服务失败或发生网络错误。请确保后端服务已运行。');
    }
    return;
  } else {
    ElMessage.error('不支持的文件类型。');
    return;
  }
};
// === end 数据下载功能 ===

</script>


<template>
  <div class="digital-screen-container">
    <div class="screen-header">
      <div class="header-left">
        <img src="@/assets/logo.png" alt="Security Logo" class="header-logo">
        <span class="header-title">城市犯罪大数据时空分析与预测系统</span>
      </div>
      <div class="header-center">
        <div class="header-nav-center">
          <router-link to="/" class="nav-item" active-class="active">首页</router-link>
          <router-link to="/crime-map" class="nav-item" active-class="active">犯罪地图</router-link>
          <router-link to="/data-analysis" class="nav-item" active-class="active">数据分析</router-link>
          <router-link to="/crime-prediction" class="nav-item" active-class="active">犯罪预测</router-link>
          <router-link to="/rental-recommendation" class="nav-item" active-class="active">租房推荐</router-link>
          <router-link to="/contact" class="nav-item" active-class="active">联系我们</router-link>
        </div>
        <button class="menu-toggle-digital" aria-label="Toggle navigation">
          <span class="bar"></span>
          <span class="bar"></span>
          <span class="bar"></span>
        </button>
      </div>
      <div class="header-right">
        <div class="user-info-display">
          <span class="welcome-text">欢迎，{{ userInfo.account }}</span>
          <el-button  @click="handleLogout" class="logout-btn-digital">登出</el-button>
        </div>
      </div>
    </div>

    <div class="screen-main-content">
      <div class="left-panel panel-glow">
        <div class="panel-title">数据筛选与下载</div>
        <el-tabs v-model="activeTabName" class="digital-tabs">
          <el-tab-pane label="数据筛选" name="filter">
            <div class="filter-group-digital">
              <label for="year">年份:</label>
              <el-select id="year" v-model="selectedYear" placeholder="请选择年份" clearable class="digital-select">
                <el-option v-for="year in yearOptions" :key="year" :label="year" :value="year">
                </el-option>
              </el-select>
            </div>
            <div class="filter-group-digital">
              <label for="month">月份:</label>
              <el-select id="month" v-model="selectedMonth" placeholder="请选择月份" clearable class="digital-select">
                <el-option v-for="month in monthOptions" :key="month" :label="month + '月'" :value="month">
                </el-option>
              </el-select>
            </div>
            <div class="filter-group-digital">
              <label for="day">日期:</label>
              <el-select id="day" v-model="selectedDay" placeholder="请选择日期" clearable class="digital-select">
                <el-option v-for="day in dayOptions" :key="day" :label="day + '日'" :value="day">
                </el-option>
              </el-select>
            </div>
            <div class="filter-group-digital">
              <label for="crime-type">犯罪类型:</label>
              <el-select id="crime-type" v-model="selectedCrimeType" placeholder="请选择犯罪类型" clearable filterable
                class="digital-select">
                <el-option v-for="type in crimeTypeOptions" :key="type" :label="type" :value="type">
                </el-option>
              </el-select>
            </div>
            <el-button type="primary" @click="applyFilters" class="apply-filters-btn-digital">应用筛选</el-button>
          </el-tab-pane>

          <el-tab-pane label="数据下载" name="download">
            <div class="filter-group-digital">
              <label>下载文件类型:</label>
              <el-select v-model="downloadFileType" placeholder="选择文件类型" class="digital-select">
                <el-option v-for="type in downloadFileTypes" :key="type"
                  :label="type.toUpperCase() + (type === 'shp' ? ' (需要后端支持)' : '')" :value="type">
                </el-option>
              </el-select>
            </div>
            <div class="filter-group-digital">
              <label>下载数据范围:</label>
              <el-select v-model="downloadScope" placeholder="选择数据范围" class="digital-select">
                <el-option v-for="scope in downloadScopes" :key="scope.value" :label="scope.label" :value="scope.value">
                </el-option>
              </el-select>
            </div>
            <el-alert v-if="downloadScope === 'geo_filtered' && (!drawnItems || drawnItems.getLayers().length === 0)"
              title="请在地图上绘制一个区域来启用地理范围下载。" type="info" show-icon :closable="false" class="digital-alert" />
            <el-alert
              v-if="downloadScope === 'geo_filtered' && selectedYear === '' && drawnItems && drawnItems.getLayers().length > 0"
              title="地理范围筛选需要先选择年份！" type="warning" show-icon :closable="false" class="digital-alert" />

            <el-button type="success" @click="downloadData" class="apply-filters-btn-digital"
              :disabled="downloadScope === 'geo_filtered' && (!drawnItems || drawnItems.getLayers().length === 0 || selectedYear === '')">
              下载数据
            </el-button>
          </el-tab-pane>
        </el-tabs>
      </div>

      <el-dialog v-model="showGeoStatsDialog" title="区域犯罪数据统计" width="40%" :close-on-click-modal="false"
        @closed="handleGeoStatsDialogClosed" class="geo-stats-dialog-digital" append-to-body>
        <div class="dialog-body-content">
          <div class="stats-row">
            <span class="stat-label">总犯罪事件数量:</span>
            <span class="stat-value">{{ geoStats.crimeCount }}</span>
          </div>
          <div class="stats-row" v-if="geoStats.areaSqKm !== 'NaN'">
            <span class="stat-label">绘制区域面积:</span>
            <span class="stat-value">{{ geoStats.areaSqKm }} 平方公里</span>
          </div>
          <div ref="geoStatsCrimeTypeBarChart" class="geo-stats-chart"></div>

          <div class="dialog-actions">
            <el-button @click="showGeoStatsDialog = false">关闭</el-button>
          </div>
        </div>
      </el-dialog>

      <div class="map-area-digital panel-glow">
        <div class="panel-title">犯罪事件地理分布</div>
        <div ref="mapContainer" class="map-container-digital">
        </div>
      </div>

      <div class="right-panel panel-glow">
        <div class="panel-title">犯罪事件统计分析</div>
        <div class="charts-row-digital">
          <div ref="monthlyBarChart" class="chart-container-digital"></div>
          <div ref="crimeTypePieChart" class="chart-container-digital"></div>
          <div ref="dailyRingChart" class="chart-container-digital"></div>
        </div>
      </div>
    </div>
  </div>
</template>

<style>
/* 全局变量和基本样式，覆盖 Element Plus 默认样式 */
:root {
  --digital-bg-color: #0A1838;
  /* 深蓝背景 */
  --digital-primary-color: #00FFFF;
  /* 亮青色 */
  --digital-secondary-color: #007BFF;
  /* 亮蓝色 */
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

html,
body,
#app {
  margin: 0;
  padding: 0;
  width: 100%;
  height: 100%;
  /* 移除 overflow: hidden; 允许浏览器在必要时为整个页面显示滚动条 */
  font-family: 'Segoe UI', Arial, sans-serif;
}

/* 覆盖 Element Plus 默认样式 */
.el-select,
.el-input,
.el-button {
  --el-fill-color-blank: var(--digital-panel-bg) !important;
  --el-border-color: rgba(0, 255, 255, 0.4) !important;
  --el-text-color-regular: var(--digital-text-color) !important;
  --el-text-color-placeholder: #5c7b9f !important;
}

.el-select .el-input__wrapper,
.el-input__wrapper {
  background-color: var(--digital-panel-bg) !important;
  box-shadow: 0 0 5px rgba(0, 255, 255, 0.2) inset !important;
  border-radius: 4px !important;
}

.el-select__suffix {
  color: var(--digital-text-color) !important;
}

.el-select .el-input__inner {
  color: var(--digital-text-color) !important;
}

.el-select-dropdown {
  background-color: var(--digital-bg-color) !important;
  border: 1px solid var(--digital-border-color) !important;
  box-shadow: 0 0 10px var(--digital-glow-color) !important;
}

.el-select-dropdown__item {
  color: var(--digital-text-color) !important;
}

.el-select-dropdown__item.hover,
.el-select-dropdown__item.selected {
  background-color: var(--digital-secondary-color) !important;
  color: #FFF !important;
}

.el-button.el-button--primary {
  background-color: var(--digital-primary-color) !important;
  border-color: var(--digital-primary-color) !important;
  color: #0A1838 !important;
  /* 按钮文字为深色 */
  font-weight: bold;
  box-shadow: 0 0 8px var(--digital-glow-color);
  transition: all 0.3s ease;
}

.el-button.el-button--primary:hover {
  background-color: #00E5E5 !important;
  border-color: #00E5E5 !important;
  box-shadow: 0 0 15px var(--digital-glow-color);
  transform: translateY(-2px);
}

.el-button.el-button--success {
  background-color: #00FF00 !important;
  /* 绿色系 */
  border-color: #00FF00 !important;
  color: #0A1838 !important;
  font-weight: bold;
  box-shadow: 0 0 8px rgba(0, 255, 0, 0.5);
  transition: all 0.3s ease;
}

.el-button.el-button--success:hover {
  background-color: #33FF33 !important;
  border-color: #33FF33 !important;
  box-shadow: 0 0 15px rgba(0, 255, 0, 0.8);
  transform: translateY(-2px);
}

.el-button.el-button--danger {
  background-color: #FF4500 !important;
  /* 橙红色系 */
  border-color: #FF4500 !important;
  color: #FFF !important;
  font-weight: bold;
  box-shadow: 0 0 8px rgba(255, 69, 0, 0.5);
  transition: all 0.3s ease;
}

.el-button.el-button--danger:hover {
  background-color: #FF6347 !important;
  border-color: #FF6347 !important;
  box-shadow: 0 0 15px rgba(255, 69, 0, 0.8);
  transform: translateY(-2px);
}


.el-tabs__item {
  color: var(--digital-text-color) !important;
  font-size: 1rem !important;
}

.el-tabs__item.is-active {
  color: var(--digital-primary-color) !important;
  font-weight: bold;
}

.el-tabs__active-bar {
  background-color: var(--digital-primary-color) !important;
  box-shadow: 0 0 8px var(--digital-primary-color);
}

.el-tabs__nav-wrap::after {
  background-color: rgba(0, 255, 255, 0.2) !important;
}

.el-alert {
  background-color: var(--digital-panel-bg) !important;
  color: var(--digital-text-color) !important;
  border: 1px solid var(--digital-border-color) !important;
  box-shadow: 0 0 8px var(--digital-glow-color);
}

.el-alert__title {
  color: var(--digital-text-color) !important;
}

.el-alert__icon {
  color: var(--digital-primary-color) !important;
}

.el-alert.is-light .el-alert__close-btn {
  color: var(--digital-text-color) !important;
}

/* 自定义 Leaflet Popup 和 Tooltip 样式 */
.leaflet-popup-content-wrapper {
  background-color: rgba(10, 24, 56, 0.9) !important;
  /* 弹出框背景 */
  color: var(--digital-text-color) !important;
  border-radius: 8px !important;
  padding: 10px !important;
  box-shadow: 0 0 15px rgba(0, 255, 255, 0.5) !important;
}

.leaflet-popup-tip {
  background-color: rgba(10, 24, 56, 0.9) !important;
}

.leaflet-popup-close-button {
  color: var(--digital-text-color) !important;
}

.custom-popup-content b {
  color: var(--digital-primary-color);
}

.leaflet-tooltip {
  background-color: rgba(10, 24, 56, 0.9) !important;
  color: var(--digital-text-color) !important;
  border: 1px solid var(--digital-border-color) !important;
  border-radius: 4px !important;
  box-shadow: 0 0 10px rgba(0, 255, 255, 0.3);
  padding: 5px 8px !important;
}

.leaflet-tooltip.leaflet-tooltip-right::before {
  border-right-color: rgba(10, 24, 56, 0.9) !important;
}

.leaflet-tooltip.leaflet-tooltip-left::before {
  border-left-color: rgba(10, 24, 56, 0.9) !important;
}

/* Leaflet Draw 控件样式调整 */
/* Leaflet Draw 控件样式调整 - 匹配数字大屏风格 */
.leaflet-draw-toolbar a,
.leaflet-draw-actions a {
  /* 统一背景和边框，使其与缩放按钮一致 */
  border: 1px solid var(--digital-border-color) !important;
  border-radius: 4px !important;
  box-shadow: 0 0 8px var(--digital-glow-color) !important;

  /* 移除任何可能影响图标颜色的滤镜 */
  filter: none !important;
}

/* 悬停效果 */
.leaflet-draw-actions a:hover,
.leaflet-draw-toolbar a:hover {
  background-color: var(--digital-secondary-color) !important;
  color: #FFF !important;
  /* 确保hover时文字或图标颜色与放大缩小按钮一致 */
  box-shadow: 0 0 15px var(--digital-glow-color) !important;
  /* 与放大缩小按钮统一 */
}


/* --- 数字大屏布局样式 --- */
.digital-screen-container {
  display: flex;
  flex-direction: column;
  width: 100vw;
  height: 100vh;
  background-color: var(--digital-bg-color);
  /* 全局深蓝背景 */
  color: var(--digital-text-color);
  overflow: hidden;
  /* 保持大屏容器本身不出现滚动条，让内部内容滚动 */
}

.screen-header {
  height: var(--header-height);
  background: linear-gradient(to right, rgba(0, 255, 255, 0.1), rgba(0, 255, 255, 0.05), rgba(0, 255, 255, 0.1));
  border-bottom: 1px solid rgba(0, 255, 255, 0.3);
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 0 30px;
  box-shadow: 0 0 15px rgba(0, 255, 255, 0.4);
  position: relative;
  z-index: 10;
  /* 确保头部在最上层 */
}

.header-left,
.header-right {
  display: flex;
  align-items: center;
  gap: 15px;
}

.header-logo {
  height: 50px;
  width: auto;
}

.header-title {
  font-size: 24px;
  font-weight: bold;
  color: var(--digital-primary-color);
  text-shadow: 0 0 8px rgba(0, 255, 255, 0.8);
  letter-spacing: 2px;
}

.header-center {
  flex-grow: 1;
  text-align: center;
}

.main-system-title {
  font-size: 38px;
  /* 更大的主标题 */
  color: #FFFFFF;
  /* 白色 */
  text-shadow: 0 0 20px var(--digital-glow-color), 0 0 30px var(--digital-glow-color);
  letter-spacing: 4px;
  font-weight: bold;
}

.user-info-display {
  display: flex;
  align-items: center;
  gap: 10px;
}

.welcome-text {
  font-size: 1rem;
  color: var(--digital-text-color);
}


.screen-main-content {
  flex: 1;
  /* 占据剩余空间 */
  display: flex;
  padding: 20px;
  gap: 20px;
  /* 允许这个容器在垂直方向滚动，如果它的内容超出了可用高度 */
  overflow-y: auto;
  /* 允许垂直滚动 */
  overflow-x: hidden;
  /* 隐藏水平滚动条 */
}

.left-panel {
  width: 300px;
  /* 左侧面板宽度，例如 300px，比之前更小 */
  /* 保持其余样式不变，或者复制原 .left-panel, .right-panel 中的通用样式 */
  display: flex;
  flex-direction: column;
  padding: 20px;
  background-color: var(--digital-panel-bg);
  border: 1px solid var(--digital-border-color);
  border-radius: 8px;
  box-shadow: 0 0 15px rgba(0, 255, 255, 0.3);
  position: relative;
  overflow-y: auto;
  overflow-x: hidden;
}

.right-panel {
  width: 430px;
  /* 右侧面板宽度，例如 450px，比之前更大 */
  /* 保持其余样式不变，或者复制原 .left-panel, .right-panel 中的通用样式 */
  display: flex;
  flex-direction: column;
  padding: 20px;
  background-color: var(--digital-panel-bg);
  border: 1px solid var(--digital-border-color);
  border-radius: 8px;
  box-shadow: 0 0 15px rgba(0, 255, 255, 0.3);
  position: relative;
  overflow-y: auto;
  overflow-x: hidden;
}

.map-area-digital {
  flex: 1;
  /* 地图区域占据中心剩余空间 */
  display: flex;
  flex-direction: column;
  padding: 20px;
  background-color: var(--digital-panel-bg);
  border: 1px solid var(--digital-border-color);
  border-radius: 8px;
  box-shadow: 0 0 15px rgba(0, 255, 255, 0.3);
  position: relative;
  overflow: hidden;
  /* 地图本身通常不滚动 */
}

.panel-title {
  font-size: 1.4rem;
  font-weight: bold;
  color: var(--digital-primary-color);
  text-align: center;
  margin-bottom: 20px;
  padding-bottom: 10px;
  border-bottom: 1px solid rgba(0, 255, 255, 0.2);
  text-shadow: 0 0 5px var(--digital-glow-color);
  position: relative;
}

.panel-title::before,
.panel-title::after {
  content: '';
  position: absolute;
  bottom: -1px;
  width: 30px;
  height: 2px;
  background-color: var(--digital-primary-color);
  box-shadow: 0 0 8px var(--digital-glow-color);
}

.panel-title::before {
  left: 0;
}

.panel-title::after {
  right: 0;
}


.map-container-digital {
  flex: 1;
  min-height: 400px;
  /* 保证地图有最小高度 */
  border-radius: 4px;
  border: 1px solid rgba(0, 255, 255, 0.1);
  box-shadow: inset 0 0 10px rgba(0, 255, 255, 0.2);
  /* 内发光效果 */
  overflow: hidden;
}

.charts-row-digital {
  display: flex;
  flex-direction: column;
  gap: 20px;
  flex: 1;
}

.chart-container-digital {
  flex: 1;
  /* 让图表占据等高空间 */
  min-height: 250px;
  /* 每个图表最小高度 */
  background-color: rgba(0, 0, 0, 0.3);
  /* 透明度更低的图表背景 */
  border: 1px solid rgba(0, 255, 255, 0.15);
  border-radius: 6px;
  box-shadow: inset 0 0 8px rgba(0, 255, 255, 0.1);
  transition: all 0.3s ease;
}

.chart-container-digital:hover {
  box-shadow: inset 0 0 15px rgba(0, 255, 255, 0.4), 0 0 15px rgba(0, 255, 255, 0.2);
  /* 悬浮发光 */
}

/* 筛选组样式 */
.filter-group-digital {
  margin-bottom: 15px;
  display: flex;
  flex-direction: column;
  gap: 8px;
}

.filter-group-digital label {
  font-size: 0.9rem;
  color: var(--digital-primary-color);
  font-weight: bold;
}

.digital-select {
  width: 100%;
}

.apply-filters-btn-digital {
  width: 100%;
  margin-top: 15px;
}

/* Leaflet 地图上的一些默认控件可能需要额外调整样式 */
/* 比如缩放按钮等 */
.leaflet-control-zoom-in,
.leaflet-control-zoom-out {
  /*background-color: var(--digital-panel-bg) !important;*/
  /*color: var(--digital-primary-color) !important;*/
  border: 1px solid var(--digital-border-color) !important;
  border-radius: 4px !important;
  box-shadow: 0 0 8px var(--digital-glow-color) !important;
}

.leaflet-control-zoom-in:hover,
.leaflet-control-zoom-out:hover {
  /*background-color: var(--digital-secondary-color) !important;*/
  color: #FFF !important;
  box-shadow: 0 0 15px var(--digital-glow-color) !important;
}

.leaflet-control-scale-line {
  background-color: rgba(10, 24, 56, 0.8) !important;
  border: 1px solid rgba(0, 255, 255, 0.4) !important;
  color: var(--digital-text-color) !important;
  box-shadow: 0 0 5px rgba(0, 255, 255, 0.2) !important;
}

/* --- 头部和导航栏样式 --- */
.screen-header {
  height: var(--header-height);
  background: linear-gradient(to right, rgba(0, 255, 255, 0.1), rgba(0, 255, 255, 0.05), rgba(0, 255, 255, 0.1));
  border-bottom: 1px solid rgba(0, 255, 255, 0.3);
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 0 30px;
  box-shadow: 0 0 15px rgba(0, 255, 255, 0.4);
  position: relative;
  z-index: 10;
  /* 确保头部在最上层 */
}

.header-left,
.header-right {
  display: flex;
  align-items: center;
  gap: 15px;
}

.header-logo {
  height: 50px;
  width: auto;
  filter: drop-shadow(0 0 5px var(--digital-primary-color));
}

.header-title {
  font-size: 24px;
  font-weight: bold;
  color: var(--digital-primary-color);
  text-shadow: 0 0 8px rgba(0, 255, 255, 0.8);
  letter-spacing: 2px;
  white-space: nowrap;
  /* Prevent title from wrapping */
}

.header-center {
  flex-grow: 1;
  /* 允许中心部分占据可用空间 */
  display: flex;
  /* 为导航项启用 Flexbox 布局 */
  justify-content: center;
  /* 水平居中导航项 */
  align-items: center;
  /* 垂直对齐导航项 */
  gap: 25px;
  /* 调整导航项与潜在的移动端切换按钮之间的间距 */
  position: relative;
  /* 用于移动端导航的绝对定位 */
}

/* 新增：中央导航容器的样式 */
.header-nav-center {
  display: flex;
  /* 导航项水平排列 */
  gap: 25px;
  /* 导航项之间的间距 */
  align-items: center;
  /* 垂直对齐项目 */
}

.nav-item {
  color: var(--digital-text-color);
  font-size: 1.1rem;
  padding: 8px 15px;
  border-radius: 5px;
  transition: all 0.3s ease;
  font-weight: bold;
  white-space: nowrap;
  /* 防止导航项换行 */
  text-align: center;
  /* 确保文本在其框内居中 */
  position: relative; /* 用于可能的底部边框 */
  background-color: rgba(0, 255, 255, 0.05); /* 非激活状态下的半透明背景 */
  border: 1px solid rgba(0, 255, 255, 0.2); /* 非激活状态下的边框 */
  box-shadow: 0 0 5px rgba(0, 255, 255, 0.1); /* 非激活状态下的轻微阴影 */
}

.nav-item:hover {
  background-color: rgba(0, 255, 255, 0.15);
  /* 鼠标悬停时的背景发光效果 */
  color: var(--digital-primary-color);
  box-shadow: 0 0 10px rgba(0, 255, 255, 0.6);
  transform: translateY(-2px);
  /* 轻微上浮效果 */
}

.nav-item.active {
  /* Vue Router 提供的激活类名 */
  background-color: var(--digital-primary-color);
  color: var(--digital-bg-color);
  /* 激活时文本颜色与背景对比 */
  box-shadow: 0 0 15px var(--digital-glow-color);
  box-shadow: 0 0 10px rgba(0, 255, 255, 0.8); /* 激活时保持发光效果 */
}

.user-info-display {
  display: flex;
  align-items: center;
  gap: 10px;
}

.welcome-text {
  font-size: 1rem;
  color: var(--digital-text-color);
}

.logout-btn-digital {
  padding: 8px 15px;
  font-size: 0.9rem;
  border-radius: 5px;
  cursor: pointer;
  /* 调整为符合数字大屏风格的亮青色背景和边框 */
  background-color: rgba(0, 255, 255, 0.2); /* 半透明的亮青色背景 */
  color: var(--digital-primary-color); /* 亮青色文字 */
  border: 1px solid rgba(0, 255, 255, 0.4); /* 亮青色边框 */
  box-shadow: 0 0 5px rgba(0, 255, 255, 0.2); /* 轻微的亮青色阴影 */
  transition: all 0.3s ease;
  font-weight: bold;
}

.logout-btn-digital:hover {
  /* 悬停时的背景、文字和发光效果 */
  background-color: var(--digital-primary-color); /* 悬停时变为实心亮青色 */
  color: var(--digital-bg-color); /* 悬停时文字变为深蓝背景色 */
  box-shadow: 0 0 15px var(--digital-primary-color); /* 悬停时更强的发光 */
  transform: translateY(-2px);
}

/* 移动端菜单按钮（现在位于 header-center 中） */
.menu-toggle-digital {
  display: none;
  /* 在大屏幕上默认隐藏 */
  background: transparent;
  border: none;
  cursor: pointer;
  padding: 10px;
  position: relative;
  /* 用于定位横条 */
  z-index: 11;
  /* 确保按钮可点击 */
}

.menu-toggle-digital .bar {
  display: block;
  width: 28px;
  height: 3px;
  background-color: var(--digital-primary-color);
  margin: 5px 0;
  transition: all 0.3s ease;
  border-radius: 2px;
}

.menu-toggle-digital.active .bar:nth-child(1) {
  transform: translateY(8px) rotate(45deg);
}

.menu-toggle-digital.active .bar:nth-child(2) {
  opacity: 0;
}

.menu-toggle-digital.active .bar:nth-child(3) {
  transform: translateY(-8px) rotate(-45deg);
}


/* --- 响应式设计 (媒体查询) --- */
@media (max-width: 1600px) {

  /* 调整断点以适应导航可见性 */
  .header-nav-center {
    gap: 15px;
    /* 在稍小的屏幕上减小间距 */
  }

  .nav-item {
    font-size: 1rem;
    padding: 6px 12px;
  }

  .header-title {
    font-size: 20px;
    /* 调整标题大小以适应较小屏幕 */
  }
}

/* 新增：区域统计弹窗样式 */
.geo-stats-dialog-digital {
  /* 这些是 Element Plus 内部的 CSS 变量，我们将它们指向硬编码颜色 */
  --el-dialog-bg-color: rgba(10, 24, 56, 0.9) !important;
  --el-dialog-border-color: #00FFFF !important;
  --el-dialog-box-shadow: 0 0 20px #00FFFF !important;

  border-radius: 10px;
  overflow: hidden;
}

.geo-stats-dialog-digital .el-dialog {
  background-color: rgba(10, 24, 56, 0.7) !important;
  border: 1px solid #00FFFF !important;
  border-radius: 10px !important;
  box-shadow: 0 0 20px #00FFFF !important;
}

.geo-stats-dialog-digital .el-dialog__header {
  background: linear-gradient(to right, rgba(0, 255, 255, 0.1), rgba(0, 255, 255, 0.05), rgba(0, 255, 255, 0.1));
  border-bottom: 1px solid rgba(0, 255, 255, 0.3);
  padding: 15px 20px;
  position: relative;
}

.geo-stats-dialog-digital .el-dialog__title {
  color: #00FFFF;
  font-size: 1.3rem;
  font-weight: bold;
  text-shadow: 0 0 5px rgba(0, 255, 255, 0.8);
}

.geo-stats-dialog-digital .el-dialog__headerbtn {
  color: #A0B0D0;
  font-size: 1.2rem;
}

.geo-stats-dialog-digital .el-dialog__headerbtn:hover {
  color: #00FFFF;
}

.geo-stats-dialog-digital .el-dialog__body {
  padding: 20px;
  color: #A0B0D0;
  background-color: transparent !important;
}

.dialog-body-content {
  display: flex;
  flex-direction: column;
  gap: 15px;
}

.stats-row {
  display: flex;
  justify-content: space-between;
  font-size: 1.1rem;
  padding-bottom: 5px;
  border-bottom: 1px dashed rgba(0, 255, 255, 0.1);
}

.stat-label {
  color: #A0B0D0;
  font-weight: bold;
}

.stat-value {
  color: #00FFFF;
}

.geo-stats-chart {
  width: 100%;
  height: 300px;
  margin-top: 15px;
  background-color: rgba(0, 0, 0, 0.2);
  border-radius: 6px;
  box-shadow: inset 0 0 5px rgba(0, 255, 255, 0.1);
}

.geo-stats-chart canvas {
  background-color: transparent !important;
}

.dialog-actions {
  display: flex;
  justify-content: flex-end;
  gap: 10px;
  margin-top: 20px;
}

.el-message {
  background-color: rgba(10, 24, 56, 0.9) !important;
  border: 1px solid #00FFFF !important;
  box-shadow: 0 0 10px #00FFFF !important;
  color: #A0B0D0 !important;
  font-weight: bold; /* 加粗文字 */
}

.el-message.el-message--success {
  background-color: rgba(0, 255, 0, 0.8) !important;
  border-color: rgba(0, 255, 0, 0.8) !important;
  box-shadow: 0 0 10px rgba(0, 255, 0, 0.8) !important;
  color: #FFF !important; /* 成功消息文字改为白色，对比度更高 */
}

.el-message.el-message--warning {
  background-color: rgba(255, 255, 0, 0.8) !important;
  border-color: rgba(255, 255, 0, 0.8) !important;
  box-shadow: 0 0 10px rgba(255, 255, 0, 0.8) !important;
  color: #1c0202 !important; /* 成功消息文字改为白色，对比度更高 */
}

.el-message.el-message--error {
  background-color: rgba(255, 0, 0, 0.8) !important;
  border-color: rgba(255, 0, 0, 0.8) !important;
  box-shadow: 0 0 10px rgba(255, 0, 0, 0.8) !important;
  color: #150101 !important; /* 成功消息文字改为白色，对比度更高 */
}

.el-message__content {
  color: #020814 !important;
}

.el-message__icon {
  color: #00FFFF !important;
  /* 或者根据 success/warning/error 改变 */
}

/* 针对不同类型的图标颜色 */
.el-message.el-message--success .el-message__icon {
  color: #00FF00 !important; /* 成功图标为绿色 */
}
.el-message.el-message--warning .el-message__icon {
  color: #FFFF00 !important; /* 警告图标为黄色 */
}
.el-message.el-message--error .el-message__icon {
  color: #FF0000 !important; /* 错误图标为红色 */
}

@media (max-width: 1200px) {
  .header-nav-center {
    display: none;
    /* 默认在较小屏幕上隐藏导航 */
    flex-direction: column;
    /* 激活时垂直堆叠项目 */
    position: absolute;
    top: var(--header-height);
    /* 定位在头部下方 */
    left: 50%;
    /* 水平居中 */
    transform: translateX(-50%);
    /* 调整以实现完美居中 */
    background-color: rgba(10, 25, 40, 0.98);
    /* 下拉菜单使用更不透明的背景 */
    width: 250px;
    /* 下拉菜单的固定宽度 */
    padding: 15px 0;
    box-shadow: 0 5px 15px rgba(0, 0, 0, 0.5);
    border-radius: 0 0 8px 8px;
    z-index: 9;
    /* 在头部下方但在内容上方 */
    text-align: center;
    max-height: 0;
    /* 默认隐藏 */
    overflow: hidden;
    /* 隐藏溢出内容 */
    transition: max-height 0.4s ease-out;
    /* 平滑过渡 */
  }

  .header-nav-center.active {
    /* 由汉堡菜单切换的类 */
    display: flex;
    /* 显示flex容器 */
    max-height: 400px;
    /* 足够的高度显示所有菜单项 */
  }

  .menu-toggle-digital {
    display: block;
    /* 在较小屏幕上显示汉堡按钮 */
  }

  /* 调整 header-center 布局以适应移动设备 */
  .header-center {
    flex-direction: row;
    /* 保持 header-center 中的元素水平排列 */
    justify-content: flex-end;
    /* 将切换按钮推到右侧 */
    gap: 0;
    /* 菜单隐藏时移除 header-center 中的间距 */
    width: auto;
    /* 允许内容决定宽度 */
  }

  /* 当菜单激活时，它将是绝对定位，不会影响布局流 */

  .screen-main-content {
    flex-direction: column;
    padding: 10px;
    gap: 10px;
    /* 这里已经添加了 overflow-y: auto; */
  }

  .left-panel,
  .right-panel {
    width: auto;
    /* 宽度自动调整以适应容器 */
    max-width: 100%;
    padding: 15px;
    /* 这里已经添加了 overflow-y: auto; */
  }

  .map-area-digital {
    padding: 15px;
  }

  .main-system-title {
    /* 此标题已被移除，但保留以供其他地方参考 */
    font-size: 28px;
    letter-spacing: 2px;
  }

  .header-title {
    font-size: 20px;
  }
}

@media (max-width: 768px) {
  .screen-header {
    flex-direction: column;
    height: auto;
    padding: 10px;
    gap: 10px;
  }

  .header-left {
    width: 100%;
    justify-content: center;
    /* 居中 logo 和标题 */
    margin-bottom: 10px;
    /* 与中心部分的间距 */
  }

  .header-center {
    order: -1;
    /* 将中心内容（包括切换按钮）放置在顶部 */
    width: 100%;
    justify-content: center;
    /* 居中切换按钮 */
  }

  .header-right {
    margin-top: 10px;
    width: 100%;
    /* 确保右侧部分占据全部宽度 */
    justify-content: space-around;
    /* 分布项目 */
  }

  .header-nav-center {
    /* 如有需要，为超小屏幕进行调整 */
    width: 100%;
    /* 下拉菜单全宽 */
    left: 0;
    transform: none;
    /* 不需要水平位移 */
  }
}
</style>