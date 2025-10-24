<script setup lang="ts">
import { ref, onMounted, onUnmounted, nextTick, watch, triggerRef, onBeforeUnmount } from 'vue'; // 引入 nextTick
import { useRouter } from 'vue-router';
import { useAuthStore } from '@/store/auth';
import * as Cesium from 'cesium';
import 'cesium/Build/Cesium/Widgets/widgets.css';
import { ElDatePicker, ElCheckboxGroup, ElCheckbox } from 'element-plus';
import 'element-plus/dist/index.css';
import { ElTable, ElTableColumn, ElPagination } from 'element-plus';
import * as echarts from 'echarts'; // 导入 ECharts
import { ElDialog, ElInputNumber } from 'element-plus';
import 'element-plus/dist/index.css';
import 'element-plus/theme-chalk/el-dialog.css';
import 'element-plus/theme-chalk/el-input-number.css';
import type { FeatureCollection } from 'geojson';
import communityBoundariesGeojson from '@/assets/neighbourhood/Neighborhood_Clusters.json'; // 修改导入路径和文件名

import crimeData from '@/assets/Crime_Incidents_in_2025.json';

const authStore = useAuthStore();
const router = useRouter();

interface UserInfo {
  account: string;
  email: string;
}

const userInfo = ref<UserInfo>({
  account: '加载中...',
  email: ''
});

const timeSeriesExpanded = ref(true);

const dataAnalysisExpanded = ref(true);

const viewer = ref<Cesium.Viewer | null>(null);
const crimeEntities = ref<Cesium.Entity[]>([]);

const allCrimeTableData = ref<any[]>([]);
const crimeTableData = ref<any[]>([]);
const pageSize = ref(10);
const currentPage = ref(1);
const totalPages = ref(0);

const showTimeRangePicker = ref(false);
const startTime = ref<Date | null>(null);
const endTime = ref<Date | null>(null);
const selectedTimeRangeText = ref('');
const filteredByTimeData = ref<any[]>([]);

const showCrimeTypeSelector = ref(false);
const selectedCrimeTypes = ref<string[]>([]);
const availableCrimeTypes = ref<string[]>([]);

const dailyCrimeChart = ref<echarts.EChartsType | null>(null); // ECharts 实例
const crimeTypeChart = ref<echarts.EChartsType | null>(null); // ECharts 实例
const showStatistics = ref(false); // 控制统计图表显示
const stackedAreaChart = ref<echarts.EChartsType | null>(null);

const finalFilteredData = ref<any[]>([]); // 确保你已经定义了这个 ref 并且在 loadTimeSeriesStats 中赋值

const isHeatmapVisible = ref(false);
const heatmapInstances = ref<any[]>([]);
const heatmapOptions = ref({
  radius: 20,
  blur: 0.9,
  maxOpacity: 1.0,
  minOpacity: 0.05,
  gradient: [
    { key: 0.0, color: 'blue' },
    { key: 0.2, color: 'lightblue' },
    { key: 0.4, color: 'lime' },
    { key: 0.6, color: 'yellow' },
    { key: 0.8, color: 'orange' },
    { key: 1.0, color: 'red' }
  ]
});

const heatmapExpanded = ref(true); // 控制热力图菜单的展开

const dialogVisible = ref(false);

const communityBoundaries = ref<FeatureCollection | null>(null);
const communityEntities = ref<Cesium.Entity[]>([]); // <-- 新增：用于存储社区实体
const isCommunityLayerVisible = ref(false); // <-- 新增：跟踪社区图层可见性

const showStatsModal = ref(false);
const totalCrimesCounted = ref(0); // 新增：用于显示总犯罪数量
let myChart: echarts.ECharts | null = null; // 用于存储 ECharts 实例

const currentChartType = ref('bar'); // <-- 新增：默认显示柱状图

// 用于存储图表所需的数据，以便在切换类型时重复使用
const chartData = ref<{ names: string[]; counts: number[]; pieData: { value: number; name: string }[] }>({
  names: [],
  counts: [],
  pieData: []
});

// 用于存储社区原始颜色的 Map
const originalCommunityColors = new Map<string, Cesium.Color>();
const currentThematicMapColors = new Map<string, Cesium.Color>(); // 用于存储当前专题图的颜色，以便还原
// 新增：用于图例显示的最大犯罪数量，现在是响应式的
const maxCrimes = ref(0); // <--- 在这里声明 maxCrimes 为 ref
const isThematicLegendVisible = ref(false); // 控制图例的显示/隐藏

// --- 新增热点分析相关的 ref ---
const hotspotAnalysisExpanded = ref(true); // 控制热点分析菜单展开
const isHotspotLayerVisible = ref(false); // 跟踪热点图层可见性
const hotspotEntities = ref<Cesium.Entity[]>([]); // 存储热点分析生成的实体
const isHotspotLegendVisible = ref<boolean>(false); // 控制热点分析图例显示

const handleLogout = async () => {
  try {
    await authStore.logout();
    router.push({ name: 'login' });
  } catch (error) {
    console.error('登出失败:', error);
  }
};

const fetchUserInfo = async () => {
  try {
    const info = await authStore.getUserInfo();
    console.log('用户数据:', info);
    userInfo.value = {
      account: info.account,
      email: info.email
    };
  } catch (error) {
    console.error('获取用户信息失败:', error);
    router.push({ name: 'login' });
  }
};

const toggleTimeSeries = () => {
  timeSeriesExpanded.value = !timeSeriesExpanded.value;
};

// 切换热力图可见性 (用于菜单控制)
const toggleHeatmap = () => {
  heatmapExpanded.value = !heatmapExpanded.value;
};

// --- 新增热点分析菜单的展开/折叠方法 ---
const toggleHotspotAnalysis = () => {
  hotspotAnalysisExpanded.value = !hotspotAnalysisExpanded.value;
};

const toggleDataAnalysis = () => {
  dataAnalysisExpanded.value = !dataAnalysisExpanded.value; // 更新展开状态
};

/* const analyzeGDPCrime = () => {
  console.log('分析犯罪与 GDP');
  // 在这里实现你的犯罪与 GDP 分析逻辑
};

const analyzeCrimePopulation = () => {
  console.log('分析犯罪与人口');
  // 在这里实现你的犯罪与人口分析逻辑
};
 */

const loadTimeSeriesInput = () => {
  showTimeRangePicker.value = true;
};

const handleTimeRangeConfirm = () => {
  if (startTime.value && endTime.value) {
    const startDate = new Date(startTime.value);
    const endDate = new Date(endTime.value);
    selectedTimeRangeText.value = `${formatDate(startDate)} 至 ${formatDate(endDate)}`;
    showTimeRangePicker.value = false;
    filterCrimeDataByDate(startDate, endDate);
  } else {
    alert('请选择起始和结束时间');
  }
};

const filterCrimeDataByDate = (startDate: Date, endDate: Date) => {
  filteredByTimeData.value = crimeData.features.filter((item: any) => {
    const reportDate = new Date(item.properties.REPORT_DAT);
    return reportDate >= startDate && reportDate <= endDate;
  });
  selectedCrimeTypes.value = [];
  showStatistics.value = false; // 隐藏统计图表
};

const handleTimeRangeCancel = () => {
  showTimeRangePicker.value = false;
  startTime.value = null;
  endTime.value = null;
  selectedTimeRangeText.value = '';
  filteredByTimeData.value = [];
  selectedCrimeTypes.value = [];
  showStatistics.value = false; // 隐藏统计图表
};

const formatDate = (date: Date): string => {
  const year = date.getFullYear();
  const month = (date.getMonth() + 1).toString().padStart(2, '0');
  const day = date.getDate().toString().padStart(2, '0');
  return `${year}-${month}-${day}`;
};

const addCrimeDataToMap = (data: any[]) => {
  crimeEntities.value.forEach(entity => {
    viewer.value?.entities.remove(entity);
  });
  crimeEntities.value = [];

  data.forEach(item => {
    const longitude = item.geometry.coordinates[0];
    const latitude = item.geometry.coordinates[1];

    // 构建描述字符串，只包含重要信息
    let description = '<h3>犯罪事件详情</h3>';
    description += `<p><strong>案件控制号 (CCN):</strong> ${item.properties.CCN ?? 'N/A'}</p>`;
    description += `<p><strong>犯罪类型 (OFFENSE):</strong> ${item.properties.OFFENSE ?? 'N/A'}</p>`;
    description += `<p><strong>案发街区 (BLOCK):</strong> ${item.properties.BLOCK ?? 'N/A'}</p>`;
    description += `<p><strong>所在社区 (NEIGHBORHOOD):</strong> ${item.properties.NEIGHBORHO ?? 'N/A'}</p>`;
    description += `<p><strong>经度:</strong> ${longitude.toFixed(6) ?? 'N/A'}</p>`; // 格式化经度，保留小数
    description += `<p><strong>纬度:</strong> ${latitude.toFixed(6) ?? 'N/A'}</p>`; // 格式化纬度，保留小数
    description += `<p><strong>案发开始日期 (START_DATE):</strong> ${item.properties.START_DATE ?? 'N/A'}</p>`;
    description += `<p><strong>作案方法 (METHOD):</strong> ${item.properties.METHOD ?? 'N/A'}</p>`;

    const entity = viewer.value?.entities.add({
      position: Cesium.Cartesian3.fromDegrees(longitude, latitude, 10),
      point: new Cesium.PointGraphics({
        pixelSize: 5,
        color: Cesium.Color.RED,
        outlineColor: Cesium.Color.WHITE,
        outlineWidth: 1,
        pickable: true,
      }),
      properties: {
        isCrimePoint: true, // 确保这个标识存在
        ...item.properties, // 仍然将所有原始属性复制过来，以防将来需要
      },
      description: description, // 这里存储的就是我们精心挑选的 HTML 字符串
    });

    if (entity) {
      crimeEntities.value.push(entity);
    }
  });
};
const handleSizeChange = (val: number) => {
  pageSize.value = val;
  currentPage.value = 1;
  updateTableData();
};

const handleCurrentChange = (val: number) => {
  currentPage.value = val;
  updateTableData();
};

const loadTimeSeriesStats = () => {
  let filteredData = [...filteredByTimeData.value];

  if (selectedCrimeTypes.value.length > 0) {
    filteredData = filteredByTimeData.value.filter((item: any) =>
      selectedCrimeTypes.value.includes(item.properties.OFFENSE)
    );
  }

  finalFilteredData.value = filteredData;

  console.log('显示与可视化筛选后的犯罪数据:', finalFilteredData.value);
  addCrimeDataToMap(finalFilteredData.value);
  allCrimeTableData.value = finalFilteredData.value.map(item => item.properties);
  currentPage.value = 1;
  totalPages.value = Math.ceil(allCrimeTableData.value.length / pageSize.value);
  updateTableData();
  showStatistics.value = false;
  nextTick(() => {
    generateCrimeStatistics(finalFilteredData.value);
  });
  alert(`已选择 ${finalFilteredData.value.length} 条符合条件的犯罪记录，已在地图上显示并在下方显示数据表格（分页显示）`);
};
const updateTableData = () => {
  const startIndex = (currentPage.value - 1) * pageSize.value;
  const endIndex = startIndex + pageSize.value;
  crimeTableData.value = allCrimeTableData.value.slice(startIndex, endIndex);
};

const loadTimeSeriesCrimeType = () => {
  console.log('加载犯罪类型选择');
  showCrimeTypeSelector.value = true;
};

const handleCrimeTypeSelection = (values: string[]) => {
  console.log('选中的犯罪类型:', values);
  selectedCrimeTypes.value = values;
};

const loadTimeSeriesTrend = () => {
  console.log('加载犯罪数据统计');
  if (filteredByTimeData.value.length > 0) {
    showStatistics.value = true;
    nextTick(() => { // 在 DOM 更新后执行
      generateCrimeStatistics(filteredByTimeData.value);
    });
  } else {
    alert('请先选择时间范围并筛选数据。');
  }
};

//导出为 CSV 文件
const exportToCsv = () => {
  if (allCrimeTableData.value.length === 0) {
    alert("没有数据可以导出！");
    return;
  }

  // 获得数据的表头
  const headers = Object.keys(allCrimeTableData.value[0]);

  // 格式化表头为 CSV 格式，处理逗号和引号
  const csvHeaders = headers.map(header => {
    // csv 格式要求所有字段都用双引号包裹
    return `"${header.replace(/"/g, '""')}"`;
  }).join(',');

  // 把数据转换成 CSV 格式
  const csvRows = allCrimeTableData.value.map(row => {
    return headers.map(header => {
      const value = row[header] === null || row[header] === undefined ? '' : String(row[header]);
      // csv 格式要求所有字段都用双引号包裹
      return `"${value.replace(/"/g, '""')}"`;
    }).join(',');
  });

  // 组合表头和数据
  const csvString = [csvHeaders, ...csvRows].join('\n');

  // 创建 Blob 对象并下载
  const blob = new Blob([csvString], { type: 'text/csv;charset=utf-8;' });

  // 创建隐藏的下载链接并点击
  const link = document.createElement('a');
  link.href = URL.createObjectURL(blob);
  link.setAttribute('download', 'crime_data.csv'); // 下载文件名  
  document.body.appendChild(link); // 下载前添加到 body 中
  link.click(); // 点击下载
  document.body.removeChild(link); // 下载完成后移除
  URL.revokeObjectURL(link.href); // 释放 URL 对象
};

const generateCrimeStatistics = (data: any[]) => {
  // 准备每日犯罪数据
  const dailyCounts: { [key: string]: number } = {};
  data.forEach((item) => {
    const date = formatDate(new Date(item.properties.REPORT_DAT));
    dailyCounts[date] = (dailyCounts[date] || 0) + 1;
  });
  const dailyDates = Object.keys(dailyCounts).sort();
  const dailyValues = dailyDates.map((date) => dailyCounts[date]);

  // 准备犯罪类型数据
  const typeCounts: { [key: string]: number } = {};
  data.forEach((item) => {
    const type = item.properties.OFFENSE;
    typeCounts[type] = (typeCounts[type] || 0) + 1;
  });
  const typeData = Object.keys(typeCounts).map((type) => ({
    name: type,
    value: typeCounts[type],
  }));

  // 准备堆叠面积图数据
  const stackedAreaData: { [date: string]: { [type: string]: number } } = {};
  const allCrimeTypes = [...new Set(data.map(item => item.properties.OFFENSE))];

  data.forEach((item) => {
    const date = formatDate(new Date(item.properties.REPORT_DAT));
    const type = item.properties.OFFENSE;
    if (!stackedAreaData[date]) {
      stackedAreaData[date] = {};
    }
    stackedAreaData[date][type] = (stackedAreaData[date][type] || 0) + 1;
  });

  const stackedSeriesData = allCrimeTypes.map(type => ({
    name: type,
    type: 'line',
    stack: 'Total',
    areaStyle: {},
    data: dailyDates.map(date => stackedAreaData[date]?.[type] || 0),
  }));


  // 初始化和渲染每日犯罪柱状图
  const dailyChartContainer = document.getElementById('daily-crime-chart');
  if (dailyChartContainer) {
    dailyCrimeChart.value = echarts.init(dailyChartContainer);
    const dailyOptions = {
      title: {
        text: '每日犯罪数量统计',
        left: 'center',
        textStyle: {
          color: '#00FFFF', // 标题颜色
          fontSize: 20,
          textShadowColor: 'rgba(0, 255, 255, 0.5)', // 添加发光
          textShadowBlur: 5
        },
      },
      legend: {
        bottom: 10,
        orient: 'horizontal',
        data: ['犯罪数量', '犯罪数量 (折线图)'],
        textStyle: { // 图例文字颜色
          color: '#A0B0D0'
        }
      },
      grid: { // 增加网格边距，让图表更清晰
        left: '3%',
        right: '4%',
        bottom: '15%', // 为图例留出空间
        containLabel: true
      },
      xAxis: {
        type: 'category',
        data: dailyDates,
        name: '日期',
        axisLine: { // 坐标轴线
          lineStyle: {
            color: 'rgba(0, 255, 255, 0.4)'
          }
        },
        axisLabel: { // 刻度标签
          color: '#A0B0D0'
        },
        splitLine: { // 网格线
          lineStyle: {
            color: 'rgba(0, 255, 255, 0.1)',
            type: 'dashed'
          }
        },
        nameTextStyle: { // 坐标轴名称样式
          color: '#00FFFF'
        },
        nameLocation: 'middle', // 确保名称在轴线的中间（默认值，但明确写出）
        axisTick: { show: false }, // 不显示刻度线
      },
      yAxis: {
        type: 'value',
        name: '犯罪数量',
        axisLine: {
          lineStyle: {
            color: 'rgba(0, 255, 255, 0.4)'
          }
        },
        axisLabel: {
          color: '#A0B0D0'
        },
        splitLine: {
          lineStyle: {
            color: 'rgba(0, 255, 255, 0.1)',
            type: 'dashed'
          }
        },
        nameTextStyle: {
          color: '#00FFFF'
        },
      },
      series: [
        {
          name: '犯罪数量',
          data: dailyValues,
          type: 'bar',
          itemStyle: {
            color: new echarts.graphic.LinearGradient( // 柱状图渐变色
              0, 0, 0, 1,
              [
                { offset: 0, color: '#00FFFF' }, // 亮青色顶部
                { offset: 1, color: 'rgba(0, 255, 255, 0.3)' } // 渐变到底部
              ]
            ),
            borderRadius: [5, 5, 0, 0] // 顶部圆角
          },
          emphasis: { // 鼠标悬停高亮
            itemStyle: {
              color: new echarts.graphic.LinearGradient(
                0, 0, 0, 1,
                [
                  { offset: 0, color: '#00FFFF' },
                  { offset: 1, color: '#00BFFF' }
                ]
              ),
              shadowBlur: 10,
              shadowOffsetX: 0,
              shadowColor: 'rgba(0, 255, 255, 0.8)'
            }
          },
        },
        {
          name: '犯罪数量 (折线图)',
          data: dailyValues,
          type: 'line',
          symbol: 'circle', // 圆形点
          symbolSize: 8, // 点大小
          lineStyle: {
            color: '#FFA500', // 橙色线条
            width: 2,
            shadowColor: 'rgba(255, 165, 0, 0.5)', // 发光效果
            shadowBlur: 5
          },
          itemStyle: {
            color: '#FFA500', // 点的颜色
            borderColor: '#FFF', // 点的边框色
            borderWidth: 1 // 点的边框宽度
          },
          emphasis: {
            itemStyle: {
              borderColor: '#00FFFF', // 悬停时点的边框色
              borderWidth: 2,
              shadowBlur: 10,
              shadowOffsetX: 0,
              shadowColor: 'rgba(0, 255, 255, 0.8)'
            }
          },
          smooth: true // 平滑曲线
        },
      ],
      tooltip: {
        trigger: 'axis', // 修改为 'axis' 更适合柱状图+折线图
        backgroundColor: 'rgba(10, 24, 56, 0.9)', // 半透明深蓝背景
        borderColor: '#00FFFF', // 亮青色边框
        borderWidth: 1,
        textStyle: {
          color: '#E0F0FF' // 浅白文字
        },
        axisPointer: {
          type: 'shadow',
          lineStyle: {
            color: '#00FFFF', // 指示线颜色
            type: 'dashed'
          }
        },
        formatter: (params: any) => {
          let res = `${params[0].name}<br/>`;
          params.forEach((item: any) => {
            res += `${item.marker} ${item.seriesName}: <strong>${item.value}</strong><br/>`;
          });
          return res;
        },
      },
      // *** 添加 toolbox ***
      toolbox: {
        show: true,
        orient: 'horizontal',
        right: 20,
        top: 10,
        iconStyle: {
          borderColor: '#00FFFF' // 工具箱图标边框颜色
        },
        emphasis: { // 鼠标悬停时的图标样式
          iconStyle: {
            borderColor: '#FFA500', // 悬停时图标颜色变橙色
            shadowBlur: 5,
            shadowColor: 'rgba(255, 165, 0, 0.5)'
          }
        },
        feature: {
          saveAsImage: { // 保存为图片
            show: true,
            title: '保存为图片',
            backgroundColor: 'rgba(10, 24, 56, 0.9)', // 下载图片时的背景色
            pixelRatio: 2 // 导出图片的分辨率倍数，提高清晰度
          },
          dataView: { // 数据视图
            show: true,
            title: '数据视图',
            readOnly: true, // 只读
            backgroundColor: 'rgba(10, 24, 56, 0.9)',
            textareaColor: 'rgba(10, 24, 56, 0.9)',
            textColor: '#E0F0FF',
            buttonColor: '#00FFFF',
            buttonTextColor: '#0A1838'
          },
          magicType: { // 切换图表类型
            show: true,
            title: {
              line: '切换为折线图',
              bar: '切换为柱状图'
            },
            type: ['line', 'bar']
          },
          restore: { // 还原
            show: true,
            title: '还原'
          }
        }
      }
    };
    dailyCrimeChart.value.setOption(dailyOptions);
  }


  // 初始化和渲染犯罪类型饼状图
  const typeChartContainer = document.getElementById('crime-type-chart');
  if (typeChartContainer) {
    crimeTypeChart.value = echarts.init(typeChartContainer);
    const typeOptions = {
      title: {
        text: '犯罪类型比例',
        left: 'center',
        textStyle: {
          color: '#00FFFF', // 标题颜色
          fontSize: 20,
          textShadowColor: 'rgba(0, 255, 255, 0.5)',
          textShadowBlur: 5
        },
      },
      legend: {
        bottom: -20,
        orient: 'horizontal',
        left: 'center', // 可以将图例居中显示
        textStyle: { // 图例文字颜色
          color: '#A0B0D0',
        }
      },
      tooltip: {
        trigger: 'item',
        backgroundColor: 'rgba(10, 24, 56, 0.9)',
        borderColor: '#00FFFF',
        textStyle: {
          color: '#E0F0FF'
        },
        formatter: '{a} <br/>{b} : {c} ({d}%)',
      },
      series: [
        {
          name: '犯罪类型',
          type: 'pie',
          radius: '55%',
          center: ['50%', '50%'],
          data: typeData.sort((a, b) => b.value - a.value),
          label: {
            show: true,
            color: '#A0B0D0' // 饼图外部标签文字颜色
          },
          // 如果希望在饼图内部的引导线显示文字
          labelLine: {
            lineStyle: {
              color: '#A0B0D0' // 引导线颜色
            }
          },
          emphasis: {
            itemStyle: {
              shadowBlur: 10,
              shadowOffsetX: 0,
              shadowColor: 'rgba(0, 0, 0, 0.5)',
            },
          },
        },
      ],
      // *** 添加 toolbox ***
      toolbox: {
        show: true,
        orient: 'horizontal',
        right: 20,
        top: 10,
        iconStyle: {
          borderColor: '#00FFFF' // 工具箱图标边框颜色
        },
        emphasis: {
          iconStyle: {
            borderColor: '#FFA500',
            shadowBlur: 5,
            shadowColor: 'rgba(255, 165, 0, 0.5)'
          }
        },
        feature: {
          saveAsImage: {
            show: true,
            title: '保存为图片',
            backgroundColor: 'rgba(10, 24, 56, 0.9)',
            pixelRatio: 2
          },
          dataView: {
            show: true,
            title: '数据视图',
            readOnly: true,
            backgroundColor: 'rgba(10, 24, 56, 0.9)',
            textareaColor: 'rgba(10, 24, 56, 0.9)',
            textColor: '#E0F0FF',
            buttonColor: '#00FFFF',
            buttonTextColor: '#0A1838'
          },
          restore: {
            show: true,
            title: '还原'
          }
        }
      }
    };
    crimeTypeChart.value.setOption(typeOptions);

    // 添加 ResizeObserver 监听
    const typeResizeObserver = new ResizeObserver(() => {
      crimeTypeChart.value?.resize();
    });
    typeResizeObserver.observe(typeChartContainer);
    onUnmounted(() => {
      typeResizeObserver.disconnect(); // 在组件卸载时断开监听
    });
  }

  // 初始化和渲染堆叠面积图
  const stackedAreaChartContainer = document.getElementById('stacked-area-chart');
  if (stackedAreaChartContainer) {
    stackedAreaChart.value = echarts.init(stackedAreaChartContainer);
    const stackedAreaOptions = {
      title: {
        text: '各犯罪类型数量统计',
        left: 'center',
        textStyle: {
          color: '#00FFFF', // 标题颜色
          fontSize: 20,
          textShadowColor: 'rgba(0, 255, 255, 0.5)',
          textShadowBlur: 5
        },
      },
      legend: {
        bottom: 'bottom',
        orient: 'horizontal',
        data: allCrimeTypes,
        textStyle: { // 添加或修改 textStyle
          fontSize: 10,// 设置图例文字的字号为 10 (可以尝试更小的值)
          color: '#A0B0D0'
        }
      },
      tooltip: {
        trigger: 'item', // 修改为 'item'
        formatter: (params: any) => {
          return `${params.name}<br/>${params.seriesName}: ${params.value}`;
        },
        axisPointer: {
          type: 'cross',
          label: {
            backgroundColor: '#6a7985'
          }
        }
      },
      // *** 添加 toolbox ***
      toolbox: {
        show: true,
        orient: 'horizontal',
        right: 20,
        top: 10,
        iconStyle: {
          borderColor: '#00FFFF'
        },
        emphasis: {
          iconStyle: {
            borderColor: '#FFA500',
            shadowBlur: 5,
            shadowColor: 'rgba(255, 165, 0, 0.5)'
          }
        },
        feature: {
          saveAsImage: {
            show: true,
            title: '保存为图片',
            backgroundColor: 'rgba(10, 24, 56, 0.9)',
            pixelRatio: 2
          },
          dataView: {
            show: true,
            title: '数据视图',
            readOnly: true,
            backgroundColor: 'rgba(10, 24, 56, 0.9)',
            textareaColor: 'rgba(10, 24, 56, 0.9)',
            textColor: '#E0F0FF',
            buttonColor: '#00FFFF',
            buttonTextColor: '#0A1838'
          },
          magicType: {
            show: true,
            title: {
              line: '切换为折线图',
              bar: '切换为柱状图',
              stack: '切换为堆叠',
              tiled: '切换为平铺'
            },
            type: ['line', 'bar', 'stack', 'tiled']
          },
          restore: {
            show: true,
            title: '还原'
          }
        }
      },
      xAxis: {
        type: 'category',
        boundaryGap: false,
        data: dailyDates,
        name: '日期',
      },
      yAxis: {
        type: 'value',
        name: '犯罪数量',
      },
      series: stackedSeriesData,
    };
    stackedAreaChart.value.setOption(stackedAreaOptions);
    // 添加 ResizeObserver (如果需要)
    const stackedAreaResizeObserver = new ResizeObserver(() => {
      stackedAreaChart.value?.resize();
    });
    stackedAreaResizeObserver.observe(stackedAreaChartContainer);
    onUnmounted(() => {
      stackedAreaResizeObserver.disconnect();
    });
  }
};

// 生成热力图函数
const generateHeatmap = () => {
  if (!viewer.value || !(window as any).CesiumHeatmap) {
    console.error('Cesium Viewer 或 CesiumHeatmap 未初始化。');
    alert('Cesium Viewer 或热力图插件未正确加载。');
    return;
  }

  if (finalFilteredData.value.length === 0) {
    alert('请先选择时间范围和/或犯罪类型并点击“显示与可视化”。');
    return;
  }

  // 定义热力图的 bounds (使用你数据的经纬度范围)
  let west = Infinity;
  let east = -Infinity;
  let south = Infinity;
  let north = -Infinity;

  finalFilteredData.value.forEach((item: any) => {
    const longitude = item.geometry.coordinates[0];
    const latitude = item.geometry.coordinates[1];
    west = Math.min(west, longitude);
    east = Math.max(east, longitude);
    south = Math.min(south, latitude);
    north = Math.max(north, latitude);
  });

  const bounds = { west, east, south, north };
  console.log('热力图 bounds:', bounds);

  // 转换数据格式为插件期望的格式
  const heatmapData = finalFilteredData.value.map((item: any) => ({
    x: item.geometry.coordinates[0],
    y: item.geometry.coordinates[1],
    value: 1, // 使用权重 1
  }));

  // 将数组形式的 gradient 转换回对象形式
  const gradientObject: { [key: number]: string } = {};
  heatmapOptions.value.gradient.forEach(stop => {
    gradientObject[stop.key] = stop.color;
  });

  const heatmapOptionsDebug = {
    radius: heatmapOptions.value.radius,
    blur: heatmapOptions.value.blur,
    minOpacity: heatmapOptions.value.minOpacity,
    maxOpacity: heatmapOptions.value.maxOpacity,
    gradient: gradientObject // 使用转换后的 gradient 对象
  };

  console.log('热力图配置:', heatmapOptionsDebug);

  try {
    // 创建热力图实例时传入 bounds 和 options，但不传入 data
    const heatmapInstance = (window as any).CesiumHeatmap.create(viewer.value, bounds, heatmapOptionsDebug);
    heatmapInstances.value.push(heatmapInstance); // 将新的实例添加到数组中
    console.log('热力图实例:', heatmapInstance);

    // 使用 setWGS84Data 方法设置数据
    const valueMin = 0; // 根据你的数据调整
    const valueMax = 1; // 根据你的数据调整
    heatmapInstance.setWGS84Data(valueMin, valueMax, heatmapData);
    console.log('热力图数据已设置');

    isHeatmapVisible.value = true;
    alert(`已基于 ${finalFilteredData.value.length} 条犯罪记录生成热力图 (使用 CesiumHeatmap.js)。`);

    // 调整视图到热力图范围
    viewer.value.camera.flyTo({
      destination: Cesium.Rectangle.fromDegrees(bounds.west, bounds.south, bounds.east, bounds.north),
      duration: 1, // 可选的飞行持续时间
    });

  } catch (error: any) {
    console.error('生成热力图失败:', error);
    alert(`生成热力图时发生错误: ${error.message}`);
  }
};

// 调整热力图参数函数
const adjustHeatmap = (newOptions: any) => {
  if (!(window as any).CesiumHeatmap || !viewer.value || heatmapInstances.value.length === 0) {
    alert('请先生成热力图。');
    return;
  }
  heatmapInstances.value.forEach(instance => {
    instance.update(newOptions);
  });
  alert('所有热力图参数已调整。');
};
// 移除热力图函数
const removeHeatmap = () => {
  if (!(window as any).CesiumHeatmap || !viewer.value || heatmapInstances.value.length === 0) {
    return;
  }
  heatmapInstances.value.forEach(instance => {
    instance.show(false); // 或者 instance.destroy()，取决于 CesiumHeatmap.js 的 API
  });
  heatmapInstances.value = []; // 清空实例数组
  isHeatmapVisible.value = false;
  alert('所有热力图已移除。');
};

const applyHeatmapOptions = () => {
  console.log('点击确定');
  dialogVisible.value = false;
  triggerRef(heatmapOptions);
  if (isHeatmapVisible.value && heatmapInstances.value.length > 0) {
    adjustHeatmap({ ...heatmapOptions.value });
  } else {
    alert('请先生成热力图。');
  }
  nextTick(() => {
    // 尝试强制更新组件
    // if (this.$forceUpdate) { // Vue 2
    //   this.$forceUpdate();
    // }
  });
};

const handleCancelDialog = () => {
  console.log('点击取消');
  dialogVisible.value = false;
  nextTick(() => {
    // 尝试强制更新组件
    // if (this.$forceUpdate) { // Vue 2
    //   this.$forceUpdate();
    // }
  });
};

// 监听 heatmapOptions 的变化并自动调整所有热力图
watch(heatmapOptions, (newOptions) => {
  if (isHeatmapVisible.value && heatmapInstances.value.length > 0) {
    adjustHeatmap(newOptions);
  }
}, { deep: true });

//犯罪社区图层显示
const analyzeCrimeCommunity = async () => {
  console.log('点击了“社区图层显示”'); // 将"犯罪与社区"改为"社区图层显示"更准确

  if (isCommunityLayerVisible.value) {
    // 如果图层当前可见，则清除它
    console.log('清除社区图层');
    communityEntities.value.forEach(entity => {
      viewer.value?.entities.remove(entity);
    });
    communityEntities.value = [];
    isCommunityLayerVisible.value = false;
    isThematicLegendVisible.value = false; // 关闭社区图层时隐藏图例
    alert('社区图层已关闭。');
    return; // 清除后直接返回
  }

  // 如果图层当前不可见，则加载并显示它
  console.log('显示社区图层');
  try {
    if (!communityBoundariesGeojson) {
      console.error('社区边界 GeoJSON 数据未加载。');
      alert('社区边界数据加载失败。');
      return;
    }
    communityBoundaries.value = communityBoundariesGeojson as FeatureCollection;
    console.log('社区边界数据 (GeoJSON) 加载完成:', communityBoundaries.value);

    if (viewer.value && communityBoundaries.value && communityBoundaries.value.type === 'FeatureCollection' && communityBoundaries.value.features) {
      communityEntities.value = [];

      communityBoundaries.value.features.forEach(feature => {

        const communityName = feature.properties!.NAME;

        let coordinates: number[][] = [];
        let hierarchy: Cesium.PolygonHierarchy | Cesium.Cartesian3[] | undefined;

        if (feature.geometry && feature.geometry.type === 'Polygon' && feature.geometry.coordinates && feature.geometry.coordinates.length > 0) {
          coordinates = feature.geometry.coordinates[0];
          // CRS84 是经纬度，所以要用 fromDegreesArray
          hierarchy = new Cesium.PolygonHierarchy(Cesium.Cartesian3.fromDegreesArray(coordinates.flat()));
        } else if (feature.geometry && feature.geometry.type === 'MultiPolygon' && feature.geometry.coordinates) {
          hierarchy = feature.geometry.coordinates.map(polygonCoordinates => {
            return new Cesium.PolygonHierarchy(Cesium.Cartesian3.fromDegreesArray(polygonCoordinates[0].flat()));
          });
        }

        if (hierarchy) {
          const randomColor = Cesium.Color.fromRandom({ alpha: 0.5 });
          const entity = viewer.value!.entities.add({
            name: `Community ${communityName}`,
            polygon: {
              hierarchy: hierarchy as any,
              material: randomColor,
              outline: true,
              outlineColor: Cesium.Color.BLACK,
              pickable: true,
            },

            properties: {
              isCommunityBoundary: true, // 关键标识
              communityName: communityName, // 存储主名称
              NBH_NAMES: feature.properties!.NBH_NAMES, // 存储 NBH_NAMES 原始值
              NAME: feature.properties!.NAME, // 存储 NAME 原始值
            },
          });
          if (entity) {
            communityEntities.value.push(entity);
          }
        } else {
          console.warn(`跳过社区 ${communityName}: 无效或不支持的几何类型`);
        }
      });

      alert('社区图层已显示。');
      isCommunityLayerVisible.value = true;

      // 视图调整部分（保持不变，因为它已经在使用 fromDegrees 处理经纬度）
      // if (communityBoundaries.value.features.length > 0 && viewer.value) {
      //   const cartesianArray: Cesium.Cartesian3[] = [];
      //   communityBoundaries.value.features.forEach(feature => {
      //     function processCoordinates(coords: any) {
      //       if (typeof coords[0] === 'number') {
      //         cartesianArray.push(Cesium.Cartesian3.fromDegrees(coords[0], coords[1]));
      //       } else {
      //         coords.forEach(processCoordinates);
      //       }
      //     }
      //     if (feature.geometry?.coordinates) {
      //       processCoordinates(feature.geometry.coordinates);
      //     }
      //   });

      //   if (cartesianArray.length > 0) {
      //     const boundingSphere = Cesium.BoundingSphere.fromPoints(cartesianArray);
      //     viewer.value.camera.flyToBoundingSphere(boundingSphere, { duration: 3 });
      //   }
      // }

    } else {
      alert('Cesium viewer 未初始化或社区边界 GeoJSON 数据加载失败或格式不正确。');
    }

  } catch (error) {
    console.error('加载社区 GeoJSON 文件失败:', error);
    alert('加载社区数据失败。');
  }
};

//统计社区犯罪数量
const countCrimesPerCommunity = () => {
  console.log('开始统计社区犯罪数量...');

  if (crimeEntities.value.length === 0) {
    alert('当前没有加载犯罪数据，请先加载犯罪数据。');
    console.warn('没有犯罪实体可供统计。');
    return;
  }

  const communityCrimeCounts = new Map<string, number>();
  totalCrimesCounted.value = 0;

  crimeEntities.value.forEach(entity => {
    const neighborhoodProperty = entity.properties?.NEIGHBORHO; // <-- 请根据你的犯罪数据字段调整这里！

    if (neighborhoodProperty) {
      const neighborhoodName = neighborhoodProperty.getValue();
      if (typeof neighborhoodName === 'string' && neighborhoodName.trim() !== '') {
        communityCrimeCounts.set(neighborhoodName, (communityCrimeCounts.get(neighborhoodName) || 0) + 1);
        totalCrimesCounted.value++;
      } else {
        console.warn('发现一个犯罪实体没有有效的社区名称:', entity.properties);
      }
    } else {
      console.warn('发现一个犯罪实体没有 NEIGHBORHO 属性:', entity.properties);
    }
  });

  if (communityCrimeCounts.size === 0) {
    alert('未能统计到任何社区的犯罪数据，请检查数据。');
    console.warn('没有社区犯罪数据可用于图表。');
    return;
  }

  const sortedCounts = Array.from(communityCrimeCounts.entries()).sort((a, b) => b[1] - a[1]);

  // 存储图表数据
  chartData.value.names = sortedCounts.map(item => item[0]);
  chartData.value.counts = sortedCounts.map(item => item[1]);
  chartData.value.pieData = sortedCounts.map(item => ({ value: item[1], name: item[0] }));


  showStatsModal.value = true;

  // 使用 nextTick 确保 DOM 元素已经渲染完成
  nextTick(() => {
    renderChart(); // 首次渲染图表
  });
};

// 新增：渲染图表的函数，根据 currentChartType 渲染
const renderChart = () => {
  const chartDom = document.getElementById('communityCrimeChart');
  if (!chartDom) {
    console.error('未找到 chartDom 元素');
    return;
  }

  if (myChart) {
    myChart.dispose(); // 销毁旧实例
  }
  myChart = echarts.init(chartDom); // 初始化新实例

  let option: echarts.EChartsOption;

  if (currentChartType.value === 'bar') {
    option = {
      backgroundColor: 'transparent',
      title: {
        text: '社区犯罪数量分布 (柱状图)',
        left: 'center',
        textStyle: {
          color: '#00FFFF', // 标题颜色：亮青色
          fontSize: 20, // 标题字号：更大
          textShadowColor: 'rgba(0, 255, 255, 0.5)', // 标题发光效果
          textShadowBlur: 5
        },
      },
      // *** 新增: 工具箱配置 ***
      toolbox: {
        show: true,
        feature: {
          magicType: { show: true, type: ['line', 'bar'], title: { line: '切换为折线图', bar: '切换为柱状图' }, iconStyle: { borderColor: '#00FFFF' }, emphasis: { iconStyle: { color: '#FFA500' } } }, // 可以保留或移除
          restore: { show: true, title: '还原', iconStyle: { borderColor: '#00FFFF' }, emphasis: { iconStyle: { color: '#FFA500' } } },
          saveAsImage: {
            show: true,
            title: '保存为图片',
            type: 'png', // 默认保存为 PNG，可以改为 'jpeg'
            name: '社区犯罪统计_柱状图', // 保存图片的文件名
            pixelRatio: 2, // 导出图片的分辨率，提高图片质量
            backgroundColor: 'rgba(10, 24, 56, 0.9)'
          }
        },
        right: '5%', // 工具箱位置
        top: '5%' // 工具箱位置
      },
      tooltip: {
        trigger: 'axis',
        axisPointer: {
          type: 'shadow'
        },
        backgroundColor: 'rgba(10, 24, 56, 0.9)', // 提示框背景色：半透明深蓝
        borderColor: '#00FFFF', // 提示框边框：亮青色
        borderWidth: 1,
        textStyle: {
          color: '#E0F0FF' // 提示框文字颜色：浅白
        },
        formatter: '{b}<br/>犯罪数量: {c} 起'
      },
      grid: {
        left: '3%',
        right: '4%',
        bottom: '3%',
        containLabel: true
      },
      xAxis: {
        type: 'value',
        name: '犯罪数量',
        axisLabel: {
          formatter: '{value} 起',
          color: '#A0B0D0' // 坐标轴标签颜色
        },
        axisLine: {
          lineStyle: {
            color: 'rgba(0, 255, 255, 0.4)' // 坐标轴线颜色
          }
        },
        splitLine: {
          lineStyle: {
            color: 'rgba(0, 255, 255, 0.1)', // 网格线颜色：更淡的虚线
            type: 'dashed'
          }
        },
        nameTextStyle: {
          color: '#00FFFF', // 坐标轴名称颜色
          padding: [0, 0, -10, 0] // 微调名称位置，避免遮挡
        }
      },
      yAxis: {
        type: 'category',
        data: chartData.value.names,
        name: '社区名称',
        axisLabel: {
          color: '#A0B0D0', // 坐标轴标签颜色
          interval: 0, // 确保所有标签都显示
        },
        axisLine: {
          lineStyle: {
            color: 'rgba(0, 255, 255, 0.4)' // 坐标轴线颜色
          }
        },
        nameTextStyle: {
          color: '#00FFFF', // 坐标轴名称颜色
          padding: [0, 0, 0, 10] // 微调名称位置
        },
      },
      series: [
        {
          name: '犯罪数量',
          type: 'bar',
          data: chartData.value.counts,
          itemStyle: {
            borderRadius: [0, 5, 5, 0], // 柱子右侧圆角
            color: new echarts.graphic.LinearGradient(
              0, 0, 1, 0, // 水平渐变
              [
                { offset: 0, color: 'rgba(0, 255, 255, 0.3)' }, // 浅色渐变
                { offset: 1, color: '#00FFFF' } // 亮青色
              ]
            ),
            shadowBlur: 10, // 柱子阴影
            shadowOffsetX: 0,
            shadowOffsetY: 0,
            shadowColor: 'rgba(0, 255, 255, 0.5)'
          },
          emphasis: {
            itemStyle: {
              shadowBlur: 10,
              shadowOffsetX: 0,
              shadowColor: 'rgba(0, 255, 255, 0.8)' // 更亮的发光
            }
          }
        }
      ],
      dataZoom: [
        {
          type: 'inside',
          yAxisIndex: 0,
          startValue: Math.max(0, chartData.value.names.length - 15),
          endValue: chartData.value.names.length - 1
        },
        {
          type: 'slider',
          yAxisIndex: 0,
          startValue: Math.max(0, chartData.value.names.length - 15),
          endValue: chartData.value.names.length - 1,
          right: '5%',
          width: 15,
          handleSize: '80%',
          showDetail: false
        }
      ]
    };
  } else if (currentChartType.value === 'pie') {
    option = {
      title: {
        text: '社区犯罪数量分布 (饼图)',
        //subtext: `总计: ${totalCrimesCounted.value} 起`,
        left: 'center',
        textStyle: {
          color: '#00FFFF',
          fontSize: 20,
          textShadowColor: 'rgba(0, 255, 255, 0.5)',
          textShadowBlur: 5
        },
        subtextStyle: {
          color: '#A0B0D0', // 副标题颜色
          fontSize: 14
        }
      },
      // *** 新增: 工具箱配置 ***
      toolbox: {
        show: true,
        iconStyle: {
          borderColor: '#00FFFF'
        },
        emphasis: {
          iconStyle: {
            borderColor: '#FFA500',
            shadowBlur: 5,
            shadowColor: 'rgba(255, 165, 0, 0.5)'
          }
        },
        feature: {
          restore: {
            show: true,
            title: '还原',
            iconStyle: { borderColor: '#00FFFF' },
            emphasis: { iconStyle: { borderColor: '#FFA500' } }
          },
          saveAsImage: {
            show: true,
            title: '保存为图片',
            type: 'png', // 默认保存为 PNG，可以改为 'jpeg'
            name: '社区犯罪统计_饼图', // 保存图片的文件名
            pixelRatio: 2, // 导出图片的分辨率，提高图片质量
            backgroundColor: 'rgba(10, 24, 56, 0.9)' // 导出图片时的背景色
          }
        },
        right: '5%', // 工具箱位置
        top: '5%' // 工具箱位置
      },
      tooltip: {
        trigger: 'item',
        backgroundColor: 'rgba(10, 24, 56, 0.9)', // 提示框背景色：半透明深蓝
        borderColor: '#00FFFF', // 提示框边框：亮青色
        borderWidth: 1,
        textStyle: {
          color: '#E0F0FF' // 提示框文字颜色：浅白
        },
        formatter: '{b}<br/>犯罪数量: {c} ({d}%)' // 显示名称、数量和百分比
      },
      legend: {
        orient: 'vertical',
        left: 'left',
        data: chartData.value.names,
        maxHeight: 200,
        type: 'scroll',
        textStyle: {
          color: '#A0B0D0' // 图例文字颜色
        },
        pageTextStyle: { color: '#A0B0D0' }, // 翻页箭头文字颜色
        pageIconColor: '#00FFFF', // 翻页箭头图标颜色
        pageIconInactiveColor: '#A0B0D0',
        pageIconSize: 15,
        itemGap: 10 // 图例项之间的间距
      },
      series: [
        {
          name: '犯罪数量',
          type: 'pie',
          radius: ['30%', '80%'], // 内外半径，形成环形图
          center: ['60%', '50%'], // 调整饼图位置，为左侧图例留出空间
          data: chartData.value.pieData,
          roseType: 'area', // 玫瑰图效果
          itemStyle: { // 扇区样式
              borderColor: 'rgba(10, 24, 56, 0.8)', // 扇区之间的边框，与背景色接近
              borderWidth: 1,
              shadowBlur: 10,
              shadowOffsetX: 0,
              shadowColor: 'rgba(0, 255, 255, 0.2)' // 扇区阴影
          },
          emphasis: {
            itemStyle: {
              shadowBlur: 20, // 悬停时更大的阴影
              shadowOffsetX: 0,
              shadowColor: 'rgba(0, 255, 255, 0.8)' // 更亮的发光
            }
          },
          label: {
            show: true,
            position: 'outside', // 标签显示在外部
            formatter: '{b|{b}}\n{d|{d}%}', // 使用富文本样式
            rich: { // 富文本定义
              b: {
                color: '#A0B0D0', // 社区名称颜色
                fontSize: 12,
                lineHeight: 18
              },
              d: {
                color: '#00FFFF', // 百分比颜色
                fontSize: 14,
                fontWeight: 'bold',
                lineHeight: 18
              }
            }
          },
          labelLine: {
            show: true,
            length: 15, // 引导线第一段长度
            length2: 25, // 引导线第二段长度
            lineStyle: {
              color: 'rgba(0, 255, 255, 0.6)' // 引导线颜色
            }
          }
        }
      ],
      // 饼图的颜色通过调色板来自动分配，这里提供一组数字大屏常用的颜色
      color: [
        '#00FFFF', '#FFA500', '#00BFFF', '#FF6347', '#ADFF2F',
        '#FFD700', '#8A2BE2', '#32CD32', '#FF4500', '#48D1CC',
      ]
    };
  }

  myChart.setOption(option!); // 使用 non-null 断言
  if (myChart) {
    window.removeEventListener('resize', myChart.resize); // 移除旧的监听
    window.addEventListener('resize', () => { // 添加新的监听
      myChart!.resize();
    });
  }
};

// 监听 currentChartType 的变化，重新渲染图表
watch(currentChartType, () => {
  if (showStatsModal.value) { // 只有在模态框显示时才重新渲染
    nextTick(() => {
      renderChart();
    });
  }
});

// 新增：制作社区犯罪数量专题地图
const createCommunityThematicMap = () => {
  console.log('开始制作社区犯罪数量专题地图...');

  if (!viewer.value) {
    alert('地图加载失败，请刷新页面重试。');
    return;
  }

  // 1. 确保社区边界图层已加载并可见
  if (!isCommunityLayerVisible.value || communityEntities.value.length === 0) {
    alert('请先点击“社区图层显示”来加载社区边界。');
    return;
  }

  // 2. 统计每个社区的犯罪数量
  const communityCrimeCounts = new Map<string, number>();
  //let maxCrimes = 0;

  console.log('正在遍历犯罪实体进行统计...');
  crimeEntities.value.forEach(entity => {
    const neighborhoodProperty = entity.properties?.NEIGHBORHO;
    if (neighborhoodProperty) {
      const neighborhoodName = neighborhoodProperty.getValue();
      if (typeof neighborhoodName === 'string' && neighborhoodName.trim() !== '') {
        const currentCount = (communityCrimeCounts.get(neighborhoodName) || 0) + 1;
        communityCrimeCounts.set(neighborhoodName, currentCount);
        if (currentCount > maxCrimes.value) {
          maxCrimes.value = currentCount;
        }
      } else {
        console.warn('发现一个犯罪实体没有有效的社区名称 (NEIGHBORHO):', entity.properties);
      }
    } else {
      console.warn('发现一个犯罪实体没有 NEIGHBORHO 属性:', entity.properties);
    }
  });

  // *** 在这里添加日志 ***
  console.log('统计结果 - communityCrimeCounts:', communityCrimeCounts);
  console.log('最大犯罪数量 - maxCrimes:', maxCrimes.value);

  if (communityCrimeCounts.size === 0) {
    alert('未能统计到任何社区的犯罪数据，无法制作专题图。');
    console.warn('没有社区犯罪数据可用于专题图。');
    return;
  }

  // 3. 定义颜色渐变函数
  const getColorForCrimeCount = (count: number): Cesium.Color => {
    if (maxCrimes.value === 0) return Cesium.Color.GRAY.withAlpha(0.6); // 如果没有犯罪数据，显示灰色

    // 定义5个颜色等级的阈值
    // 这些阈值需要根据你实际的最大犯罪数量 (maxCrimes) 和数据分布进行调整
    // 当前 maxCrimes 是 178。我们可以按大致百分比来分。
    // 例如：0-20%, 20-40%, 40-60%, 60-80%, 80-100%

    const threshold1 = maxCrimes.value * 0.1; // 0-10% (很低)
    const threshold2 = maxCrimes.value * 0.3; // 10-30% (低)
    const threshold3 = maxCrimes.value * 0.5; // 30-50% (中)
    const threshold4 = maxCrimes.value * 0.75; // 50-75% (高)
    // 大于 75% 就是很高

    // 定义5个等级对应的颜色 (从浅绿到深红)
    const alpha = 0.7; // 统一透明度，可以调整
    if (count <= threshold1) {
      return Cesium.Color.LIGHTGREEN.withAlpha(alpha); // 等级 1: 很低
    } else if (count <= threshold2) {
      return Cesium.Color.YELLOWGREEN.withAlpha(alpha); // 等级 2: 低
    } else if (count <= threshold3) {
      return Cesium.Color.YELLOW.withAlpha(alpha);      // 等级 3: 中
    } else if (count <= threshold4) {
      return Cesium.Color.ORANGE.withAlpha(alpha);      // 等级 4: 高
    } else {
      return Cesium.Color.RED.withAlpha(alpha);         // 等级 5: 很高
    }
  };

  // 4. 应用专题图颜色并保存原始颜色
  communityEntities.value.forEach(entity => {
    const communityName = entity.properties?.communityName?.getValue(); // 使用之前存储的 communityName
    if (communityName && entity.polygon) {
      const crimeCount = communityCrimeCounts.get(communityName) || 0;
      const newColor = getColorForCrimeCount(crimeCount);

      // *** 在这里添加日志 ***
      console.log(`处理社区: ${communityName}, 犯罪数量: ${crimeCount}, 颜色比例: ${crimeCount / maxCrimes.value}`);

      if (!originalCommunityColors.has(communityName) && entity.polygon.material instanceof Cesium.ColorMaterialProperty) {
        originalCommunityColors.set(communityName, entity.polygon.material.color?.getValue() || Cesium.Color.BLUE.withAlpha(0.5));
      } else if (!originalCommunityColors.has(communityName)) {
        originalCommunityColors.set(communityName, Cesium.Color.BLUE.withAlpha(0.5));
      }

      entity.polygon.material = newColor;
      currentThematicMapColors.set(communityName, newColor);
    }
  });

  alert('社区犯罪数量专题地图已制作完成！颜色越红表示犯罪数量越多。');
  isThematicLegendVisible.value = true; // 制作专题图后显示图例
  console.log('点击“社区图层显示”可关闭并恢复图层。');
};

// 在组件卸载前销毁 ECharts 实例，防止内存泄漏
onBeforeUnmount(() => {
  if (myChart) {
    myChart.dispose();
    myChart = null;
  }
});

// --- 犯罪热点分析相关方法 ---
// 执行热点分析的函数
const performHotspotAnalysis = async () => {
  console.log('执行犯罪热点分析...');

  if (finalFilteredData.value.length === 0) {
    alert('请先选择时间范围和/或犯罪类型并点击“显示与可视化”以加载数据。');
    return;
  }

  // 1. **数据准备：发送给后端的数据**
  const crimeLocations = finalFilteredData.value.map(item => ({
    latitude: item.geometry.coordinates[1],
    longitude: item.geometry.coordinates[0],
    offenseType: item.properties.OFFENSE,
    reportDate: item.properties.REPORT_DAT
  }));

  if (crimeLocations.length === 0) {
    alert('没有符合条件的犯罪数据用于热点分析。');
    return;
  }

  // 2. **调用后端接口**
  try {
    const response = await fetch('http://localhost:5000/api/hotspot-analysis', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        crimeData: crimeLocations,
      })
    });

    if (!response.ok) {
      const errorText = await response.text();
      throw new Error(`后端错误: ${response.status} - ${errorText}`);
    }

    // --- 核心修复在这里：正确解析后端返回的 GeoJSON 字符串 ---
    // 后端返回的是一个 JSON 字符串，内容是 GeoJSON。
    // response.json() 会将其解析成一个 JavaScript 字符串。
    // 因此，需要再次 JSON.parse() 来得到 GeoJSON 对象。
    const hotspotGeoJson: FeatureCollection = await response.json();
    // --- 核心修复结束 ---

    console.log('热点分析结果 GeoJSON (已解析):', hotspotGeoJson);
    console.log('hotspotGeoJson 的类型:', typeof hotspotGeoJson); // 验证是否为 object
    console.log('hotspotGeoJson 是否有 features 属性:', hotspotGeoJson.features); // 验证 features 是否存在

    if (!viewer.value) {
      alert('Cesium Viewer 未初始化。');
      return;
    }

    // 清除旧的热点图层
    clearHotspotLayer();

    // 3. **可视化热点结果**
    hotspotGeoJson.features.forEach(feature => {
      const giStar = feature.properties?.gi_star;
      const pValue = feature.properties?.p_value;
      // 优先使用后端返回的 'name' 字段，如果没有再尝试 'NAME' 或默认值
      const featureName = feature.properties?.name || feature.properties?.NAME || '未知区域';

      if (giStar === undefined || pValue === undefined) {
        console.warn(`区域 ${featureName} 缺少 gi_star 或 p_value，跳过渲染。`, feature.properties);
        return;
      }

      // 根据 Gi* 值和 P 值获取颜色
      const color = getHotspotColor(giStar, pValue);

      let polygonHierarchy: Cesium.PolygonHierarchy | undefined;
      // 用于存储多边形轮廓点，将处理所有内外环
      const allOutlinePositions: Cesium.Cartesian3[] = [];

      if (feature.geometry) {
        if (feature.geometry.type === 'Polygon' && feature.geometry.coordinates && feature.geometry.coordinates.length > 0) {
          const outerRing = feature.geometry.coordinates[0];
          polygonHierarchy = new Cesium.PolygonHierarchy(Cesium.Cartesian3.fromDegreesArray(outerRing.flat()));

          // 添加外环到轮廓点列表
          const outerRingPositions = Cesium.Cartesian3.fromDegreesArray(outerRing.flat());
          if (outerRingPositions.length > 0) {
            allOutlinePositions.push(...outerRingPositions);
            // 闭合轮廓
            if (!outerRingPositions[0].equals(outerRingPositions[outerRingPositions.length - 1])) {
              allOutlinePositions.push(outerRingPositions[0]);
            }
          }

          // 处理孔洞 (内环)
          const holes = feature.geometry.coordinates.slice(1);
          if (holes.length > 0) {
            if (!polygonHierarchy.holes) {
              polygonHierarchy.holes = []; // 确保 holes 数组存在
            }
            holes.forEach((holeCoords: any) => {
              const holePositions = Cesium.Cartesian3.fromDegreesArray(holeCoords.flat());
              polygonHierarchy!.holes!.push(new Cesium.PolygonHierarchy(holePositions));

              // 添加内环到轮廓点列表
              if (holePositions.length > 0) {
                allOutlinePositions.push(...holePositions);
                if (!holePositions[0].equals(holePositions[holePositions.length - 1])) {
                  allOutlinePositions.push(holePositions[0]);
                }
              }
            });
          }

        } else if (feature.geometry.type === 'MultiPolygon' && feature.geometry.coordinates && feature.geometry.coordinates.length > 0) {
          // 对于 MultiPolygon，通常最好的做法是创建多个 Polygon 实体，
          // 但这里我们为了简化，只将第一个 Polygon 作为主要的填充，并绘制所有部分的轮廓。
          // 如果你的 GeoJSON MultiPolygon 包含多个不相连的部分，
          // 并且你希望所有部分都被填充，则需要为每个部分创建一个单独的 Cesium Polygon entity。

          // 仅使用 MultiPolygon 的第一个子多边形来创建主填充实体
          const firstPolygonCoords = feature.geometry.coordinates[0];
          if (firstPolygonCoords && firstPolygonCoords.length > 0) {
            const outerRing = firstPolygonCoords[0];
            polygonHierarchy = new Cesium.PolygonHierarchy(Cesium.Cartesian3.fromDegreesArray(outerRing.flat()));

            const holes = firstPolygonCoords.slice(1);
            if (holes.length > 0) {
              if (!polygonHierarchy.holes) {
                polygonHierarchy.holes = [];
              }
              holes.forEach((holeCoords: any) => {
                const holePositions = Cesium.Cartesian3.fromDegreesArray(holeCoords.flat());
                polygonHierarchy!.holes!.push(new Cesium.PolygonHierarchy(holePositions));
              });
            }
          }

          // 遍历 MultiPolygon 的所有部分，提取所有边界线
          feature.geometry.coordinates.forEach((polygonPartCoords: any) => {
            polygonPartCoords.forEach((ringCoords: any) => { // ringCoords 可能是外环或内环
              const ringPositions = Cesium.Cartesian3.fromDegreesArray(ringCoords.flat());
              if (ringPositions.length > 0) {
                allOutlinePositions.push(...ringPositions);
                if (!ringPositions[0].equals(ringPositions[ringPositions.length - 1])) {
                  allOutlinePositions.push(ringPositions[0]); // 闭合每个环的轮廓
                }
              }
            });
          });
        }
      }


      if (polygonHierarchy) {
        const entity = viewer.value!.entities.add({
          name: `热点区域: ${featureName}`,
          polygon: {
            hierarchy: polygonHierarchy,
            material: color.withAlpha(0.6), // 半透明填充
            // 不再使用 polygon.outline，因为它在渲染上有限制
            pickable: true,
          },
          properties: {
            isHotspotArea: true,
            name: featureName,
            gi_star: giStar,
            p_value: pValue
          },
          description: `<h3>热点分析结果</h3>
                                <p><strong>区域:</strong> ${featureName}</p>
                                <p><strong>Gi* 值:</strong> ${giStar.toFixed(4)}</p>
                                <p><strong>P 值:</strong> ${pValue.toFixed(4)}</p>
                                <p><strong>置信度:</strong> ${getConfidenceLevel(giStar, pValue)}</p>`
        });
        if (entity) {
          hotspotEntities.value.push(entity);
        }

        // --- 关键修改：添加单独的 Polyline 来绘制边界 ---
        // 确保有足够的点来绘制线
        if (allOutlinePositions.length > 1) {
          const outlineEntity = viewer.value!.entities.add({
            polyline: {
              positions: allOutlinePositions,
              width: 2.0, // 可以设置更明显的线宽，例如 2.0 或 3.0
              material: Cesium.Color.BLACK, // 边界颜色设置为黑色
              clampToGround: true // 确保线贴地
            },
            // 关联到主多边形实体，便于后续统一清除
            properties: { isHotspotOutline: true, parentHotspotName: featureName } // 使用 name_for_display 或 featureName 作为关联ID
          });
          if (outlineEntity) {
            hotspotEntities.value.push(outlineEntity); // 将轮廓实体也加入管理列表
          }
        }

      } else {
        console.warn(`跳过热点区域 ${featureName}: 无效或不支持的几何类型`);
      }
    });

    isHotspotLayerVisible.value = true;
    isHotspotLegendVisible.value = true; // 显示图例
    alert(`已成功执行犯罪热点分析，在地图上显示 ${hotspotEntities.value.length} 个区域。`);

    // 飞到热点区域的中心
    if (hotspotEntities.value.length > 0) {
      const boundingSpheres: Cesium.BoundingSphere[] = [];
      hotspotEntities.value.forEach(entity => {
        // 仅考虑具有 Polygon 的实体来计算边界球
        if (entity.polygon?.hierarchy) {
          const hierarchies = Array.isArray(entity.polygon.hierarchy) ? entity.polygon.hierarchy : [entity.polygon.hierarchy];
          hierarchies.forEach((h: any) => {
            // 确保 positions 是有效的 Cesium.Cartesian3 数组
            const positions = h.getValue(Cesium.JulianDate.now()).positions;
            if (positions && positions.length > 0) {
              boundingSpheres.push(Cesium.BoundingSphere.fromPoints(positions));
            }
          });
        }
      });

      if (boundingSpheres.length > 0) {
        const unionBoundingSphere = Cesium.BoundingSphere.fromBoundingSpheres(boundingSpheres);
        viewer.value.camera.flyToBoundingSphere(unionBoundingSphere, {
          duration: 2,
          offset: new Cesium.HeadingPitchRange(
            Cesium.Math.toRadians(0), // Heading
            Cesium.Math.toRadians(-90), // Pitch (looking straight down)
            unionBoundingSphere.radius * 2 // Adjust zoom level
          )
        });
      }
    }

  } catch (error: any) {
    console.error('执行热点分析失败:', error);
    alert(`热点分析失败: ${error.message}`);
  }
};


// 根据 Gi* 值和 P 值获取颜色
const getHotspotColor = (giStar: number, pValue: number): Cesium.Color => {
  // 显著性水平 (alpha)
  const alpha_90 = 0.10; // 对应 P < 0.10
  const alpha_95 = 0.05; // 对应 P < 0.05
  const alpha_99 = 0.01; // 对应 P < 0.01

  // Gi* 越大是热点（高值聚集），越小是冷点（低值聚集）。
  // P 值越小，统计显著性越高。

  if (pValue < alpha_99) { // 99% 置信度显著
    if (giStar > 0) {
      return Cesium.Color.fromCssColorString('#FF0000'); // 红色 - 高度热点 (深红)
    } else {
      return Cesium.Color.fromCssColorString('#0000FF'); // 蓝色 - 高度冷点 (深蓝)
    }
  } else if (pValue < alpha_95) { // 95% 置信度显著
    if (giStar > 0) {
      return Cesium.Color.fromCssColorString('#FFA07A'); // 亮橙色 - 中度热点 (浅红)
    } else {
      return Cesium.Color.fromCssColorString('#6495ED'); // 矢车菊蓝 - 中度冷点 (浅蓝)
    }
  } else if (pValue < alpha_90) { // 90% 置信度显著
    if (giStar > 0) {
      return Cesium.Color.fromCssColorString('#FFD700'); // 金色 - 潜在热点 (很浅的黄色/橙色)
    } else {
      return Cesium.Color.fromCssColorString('#87CEEB'); // 天蓝色 - 潜在冷点 (很浅的蓝色)
    }
  } else {
    return Cesium.Color.fromCssColorString('#CCCCCC'); // 灰色 - 不显著
  }
};

// 获取置信度描述
const getConfidenceLevel = (giStar: number, pValue: number): string => {
  const alpha_90 = 0.1;
  const alpha_95 = 0.05;
  const alpha_99 = 0.01;

  if (pValue < alpha_99) {
    return giStar > 0 ? '99% 置信度热点' : '99% 置信度冷点';
  } else if (pValue < alpha_95) {
    return giStar > 0 ? '95% 置信度热点' : '95% 置信度冷点';
  } else if (pValue < alpha_90) {
    return giStar > 0 ? '90% 置信度热点' : '90% 置信度冷点';
  } else {
    return '不显著';
  }
};

// 清除热点图层
const clearHotspotLayer = () => {
  if (!viewer.value) return;
  hotspotEntities.value.forEach(entity => {
    viewer.value?.entities.remove(entity);
  });
  hotspotEntities.value = [];
  isHotspotLayerVisible.value = false;
  isHotspotLegendVisible.value = false; // 隐藏图例
  alert('犯罪热点图层已清除。');
};



const initCesium = () => {
  const mapContainer = document.getElementById('analysis-map');
  if (mapContainer) {
    (window as any).CESIUM_BASE_URL = 'public/Cesium/';

    Cesium.Ion.defaultAccessToken = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJqdGkiOiIxMTVjYmE4Mi0zYmUxLTQ4MTctYjcwYy1hMjZjODFmYzdlN2MiLCJpZCI6MjY3MDYzLCJpYXQiOjE3NDcxMDMwOTR9.AxeSFGumpQDsbioh40lVCzpjyMV18xCTGMndff2Apmc';
    viewer.value = new Cesium.Viewer(mapContainer, {
      shouldAnimate: true,
      selectionIndicator: false,
    });

    // viewer.value.imageryLayers.addImageryProvider(new Cesium.OpenStreetMapImageryProvider({
    //   url: 'https://tile.openstreetmap.org/'
    // }));

    viewer.value.camera.flyTo({
      destination: Cesium.Cartesian3.fromDegrees(-77.0369, 38.8951, 20000.0),
      orientation: {
        heading: Cesium.Math.toRadians(0.0),
        pitch: Cesium.Math.toRadians(-90.0),
        roll: 0.0
      }
    });
  }
};

onMounted(() => {
  fetchUserInfo();
  initCesium();
  console.log('加载的犯罪数据:', crimeData);
  const allTypes = crimeData.features.map((item: any) => item.properties.OFFENSE);
  availableCrimeTypes.value = [...new Set(allTypes)];

  if (viewer.value) {
    const handler = new Cesium.ScreenSpaceEventHandler(viewer.value.canvas);

    handler.setInputAction(async (click: { position: Cesium.Cartesian2 }) => {
      if (viewer.value) {
        const pickedObject = viewer.value.scene.pick(click.position);
        console.log('Picked Object:', pickedObject); // 调试用

        // 确保拾取到实体，并且该实体有 id 和 properties 属性
        if (pickedObject && pickedObject.id && pickedObject.id.properties) {

          const entity = pickedObject.id;
          const entityProperties = entity.properties;

          // --- 优先判断是否是社区边界 ---
          if (entityProperties.isCommunityBoundary?.getValue() === true) {
            console.log('--- 社区实体被点击 ---');
            const communityProperties = entityProperties;

            const nbhNames = communityProperties.NBH_NAMES?.getValue() ?? 'N/A';
            const name = communityProperties.NAME?.getValue() ?? 'N/A';


            let description = `<h3>社区信息</h3>`;
            description += `<p>社区名称: <strong>${nbhNames}</strong></p>`;
            description += `<p>社区ID: <strong>${name}</strong></p>`; // NAME 可能是集群名称

            // 如果你的社区实体在专题图模式下有犯罪数量属性，也可以在这里显示
            if (communityProperties.crime_count) {
              description += `<p>犯罪数量: <strong>${communityProperties.crime_count.getValue()}</strong></p>`;
            }

            viewer.value.selectedEntity = entity; // 使用已定义的 entity
            entity.description = description;      // 使用已定义的 entity
          }

          // --- 其次判断是否是热点分析区域 ---
          else if (entityProperties.isHotspotArea?.getValue() === true) {
            console.log('--- 热点分析区域被点击 ---');
            const hotspotProperties = entityProperties;

            const name = hotspotProperties.name?.getValue() ?? 'N/A';
            const giStar = hotspotProperties.gi_star?.getValue();
            const pValue = hotspotProperties.p_value?.getValue();

            let description = `<h3>热点分析结果</h3>`;
            description += `<p>区域: <strong>${name}</strong></p>`;
            if (giStar !== undefined && pValue !== undefined) {
              description += `<p>Gi* 值: <strong>${giStar.toFixed(4)}</strong></p>`;
              description += `<p>P 值: <strong>${pValue.toFixed(4)}</strong></p>`;
              // 调用之前定义的 getConfidenceLevel 函数来获取置信度描述
              description += `<p>置信度: <strong>${getConfidenceLevel(giStar, pValue)}</strong></p>`;
            } else {
              description += `<p>详细统计数据不可用。</p>`;
            }

            viewer.value.selectedEntity = entity;
            entity.description = description;
          }

          // --- 其次判断是否是犯罪点 ---
          else if (entityProperties.isCrimePoint?.getValue() === true) {
            console.log('--- 犯罪点被点击 ---');
            viewer.value.selectedEntity = entity; // 使用已定义的 entity
            // 犯罪点的 description 已经在 addCrimeDataToMap 中设置，此处无需再次赋值
          }
          // --- 如果都不是已知类型，则取消选中 ---
          else {
            console.log('点击了实体，但不是社区也不是犯罪点。');
            viewer.value.selectedEntity = undefined;
          }
        }
        // --- 如果没有拾取到实体，则取消选中 ---
        else {
          console.log('未拾取到实体或拾取到非实体对象 (如地球)。');
          viewer.value.selectedEntity = undefined;
        }
      }
    }, Cesium.ScreenSpaceEventType.LEFT_CLICK);

    onUnmounted(() => {
      handler.destroy();
    });
  }
});

onUnmounted(() => {
  if (viewer.value) {
    viewer.value.destroy();
  }
  if (dailyCrimeChart.value) {
    dailyCrimeChart.value.dispose();
  }
  if (crimeTypeChart.value) {
    crimeTypeChart.value.dispose();
  }
  if (stackedAreaChart.value) {
    stackedAreaChart.value.dispose();
  }
});
</script>

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
          <router-link to="/data-analysis" class="nav-item active" active-class="active">数据分析</router-link>
          <router-link to="/crime-prediction" class="nav-item" active-class="active">犯罪预测</router-link>
          <router-link to="/rental-recommendation" class="nav-item" active-class="active">租房推荐</router-link>
          <router-link to="/contact" class="nav-item" active-class="active">联系我们</router-link>
        </nav>

        <div class="user-area">
          <div class="welcome-message">
            <i class="welcome-icon">👋</i> <span>欢迎{{ userInfo.account }}</span>
          </div>
          <button @click="handleLogout" class="logout-btn">登出</button>
        </div>
      </div>
    </header>

    <main class="adaptive-main data-analysis-main">
      <div class="analysis-content-wrapper">
        <aside class="analysis-sidebar">
          <h3>功能</h3>
          <div class="menu-item">
            <div class="menu-header" @click="toggleTimeSeries">
              <i class="arrow" :class="{ 'expanded': timeSeriesExpanded }"></i> <i class="icon">⏱️</i> 时间序列分析
            </div>
            <div class="menu-sub-items" v-show="timeSeriesExpanded">
              <div class="sub-item" @click="loadTimeSeriesInput"><i class="icon">📍</i> 选择时间范围</div>
              <div class="sub-item" @click="loadTimeSeriesCrimeType"><i class="icon">📌</i> 犯罪类型选择</div>
              <div class="sub-item" @click="loadTimeSeriesStats"><i class="icon">📊</i> 显示与可视化</div>
              <div class="sub-item" @click="loadTimeSeriesTrend"><i class="icon">📈</i> 犯罪数据统计</div>
            </div>
          </div>

          <div class="menu-item">
            <div class="menu-header" @click="toggleHeatmap">
              <i class="arrow" :class="{ 'expanded': heatmapExpanded }"></i> <i class="icon">🌍</i> 犯罪热力图
            </div>
            <div class="menu-sub-items" v-show="heatmapExpanded">
              <div class="sub-item" @click="generateHeatmap"><i class="icon">🗺️</i> 热力图生成</div>
              <div class="sub-item" @click="removeHeatmap"><i class="icon">🗑️</i> 移除热力图</div>
              <div class="sub-item" @click="dialogVisible = true"><i class="icon">⚙️</i> 热力图调整</div>
            </div>
          </div>

          <div class="menu-item">
            <div class="menu-header" @click="toggleDataAnalysis">
              <i class="arrow" :class="{ 'expanded': dataAnalysisExpanded }"></i> <i class="icon">📊</i> 数据关联分析
            </div>
            <div class="menu-sub-items" v-show="dataAnalysisExpanded">
              <div class="sub-item" @click="analyzeCrimeCommunity"><i class="icon">🏡</i> 社区图层显示</div>
              <div class="sub-item" @click="countCrimesPerCommunity"><i class="icon">📊</i> 社区犯罪统计</div>
              <div class="sub-item" @click="createCommunityThematicMap"><i class="icon">🗺️</i> 社区专题地图</div>
              <!-- <div class="sub-item" @click="analyzeGDPCrime"><i class="icon">💰</i> 犯罪与 GDP</div>
              <div class="sub-item" @click="analyzeCrimePopulation"><i class="icon">👤</i> 犯罪与人口</div> -->
            </div>
          </div>

          <div class="menu-item">
            <div class="menu-header" @click="toggleHotspotAnalysis">
              <i class="arrow" :class="{ 'expanded': hotspotAnalysisExpanded }"></i> <i class="icon">🔥</i> 犯罪热点分析
            </div>
            <div class="menu-sub-items" v-show="hotspotAnalysisExpanded">
              <div class="sub-item" @click="performHotspotAnalysis"><i class="icon">✨</i> 执行热点分析</div>
              <div class="sub-item" @click="clearHotspotLayer"><i class="icon">🧹</i> 清除热点图层</div>
            </div>
          </div>
        </aside>
        <div class="analysis-map-container">
          <div id="analysis-map"></div>
          <div v-if="showTimeRangePicker" class="time-range-picker">
            <h3>选择时间范围</h3>
            <el-date-picker v-model="startTime!" type="date" placeholder="起始日期" format="YYYY-MM-DD"
              value-format="YYYY-MM-DD" />
            <el-date-picker v-model="endTime!" type="date" placeholder="结束日期" format="YYYY-MM-DD"
              value-format="YYYY-MM-DD" />
            <button @click="handleTimeRangeConfirm">确定</button>
            <button @click="handleTimeRangeCancel">取消</button>
          </div>

          <div v-if="showCrimeTypeSelector" class="crime-type-selector">
            <h3>选择犯罪类型</h3>
            <el-checkbox-group v-model="selectedCrimeTypes" @change="handleCrimeTypeSelection">
              <el-checkbox v-for="type in availableCrimeTypes" :key="type" :label="type">{{ type }}</el-checkbox>
            </el-checkbox-group>
            <div class="selector-actions">
              <el-button class="custom-button cancel-button" @click="showCrimeTypeSelector = false">取消</el-button>
              <el-button class="custom-button confirm-button" type="primary"
                @click="showCrimeTypeSelector = false">确定</el-button>
            </div>
          </div>

          <div v-if="selectedTimeRangeText" class="selected-time-range">
            当前选择：{{ selectedTimeRangeText }}
          </div>

          <div v-if="isThematicLegendVisible" class="thematic-legend">
            <h3>犯罪数量图例</h3>
            <div class="legend-item">
              <span class="legend-color" style="background-color: rgba(144, 238, 144, 0.7);"></span>
              <span class="legend-label">很低 (≤ {{ (maxCrimes * 0.1).toFixed(0) }} 起)</span>
            </div>
            <div class="legend-item">
              <span class="legend-color" style="background-color: rgba(173, 255, 47, 0.7);"></span>
              <span class="legend-label">低 ({{ ((maxCrimes * 0.1) + 1).toFixed(0) }} - {{ (maxCrimes * 0.3).toFixed(0)
              }}
                起)</span>
            </div>
            <div class="legend-item">
              <span class="legend-color" style="background-color: rgba(255, 255, 0, 0.7);"></span>
              <span class="legend-label">中 ({{ ((maxCrimes * 0.3) + 1).toFixed(0) }} - {{ (maxCrimes * 0.5).toFixed(0)
              }}
                起)</span>
            </div>
            <div class="legend-item">
              <span class="legend-color" style="background-color: rgba(255, 165, 0, 0.7);"></span>
              <span class="legend-label">高 ({{ ((maxCrimes * 0.5) + 1).toFixed(0) }} - {{ (maxCrimes * 0.75).toFixed(0)
              }}
                起)</span>
            </div>
            <div class="legend-item">
              <span class="legend-color" style="background-color: rgba(255, 0, 0, 0.7);"></span>
              <span class="legend-label">很高 (> {{ (maxCrimes * 0.75).toFixed(0) }} 起)</span>
            </div>
            <div class="legend-item">
              <span class="legend-color" style="background-color: rgba(128, 128, 128, 0.6);"></span>
              <span class="legend-label">无犯罪数据</span>
            </div>
          </div>
        </div>

        <div v-if="isHotspotLegendVisible" class="hotspot-legend-container">
          <h4>犯罪热点/冷点图例</h4>
          <ul>
            <li><span class="legend-color high-hotspot"></span> 高度热点 (99% 置信度)</li>
            <li><span class="legend-color mid-hotspot"></span> 中度热点 (95% 置信度)</li>
            <li><span class="legend-color low-hotspot"></span> 潜在热点 (90% 置信度)</li>
            <li><span class="legend-color not-significant"></span> 不显著</li>
            <li><span class="legend-color low-coldspot"></span> 潜在冷点 (90% 置信度)</li>
            <li><span class="legend-color mid-coldspot"></span> 中度冷点 (95% 置信度)</li>
            <li><span class="legend-color high-coldspot"></span> 高度冷点 (99% 置信度)</li>
          </ul>
        </div>

        <el-dialog v-model="dialogVisible" title="热力图调整" width="400px">
          <template #default>
            <div class="adjust-box">
              <div>半径: <el-input-number v-model="heatmapOptions.radius" :min="1" :max="200"></el-input-number></div>
              <div>模糊: <el-input-number v-model="heatmapOptions.blur" :min="0" :max="1" :step="0.05"></el-input-number>
              </div>
              <div>最小透明度: <el-input-number v-model="heatmapOptions.minOpacity" :min="0" :max="1"
                  :step="0.05"></el-input-number></div>
              <div>最大透明度: <el-input-number v-model="heatmapOptions.maxOpacity" :min="0" :max="1"
                  :step="0.05"></el-input-number></div>
            </div>
          </template>
          <template #footer>
            <span class="dialog-footer">
              <el-button class="custom-button cancel-button" @click="handleCancelDialog">取消</el-button>
              <el-button class="custom-button confirm-button" type="primary" @click="applyHeatmapOptions">确定</el-button>
            </span>
          </template>
        </el-dialog>
      </div>

      <div v-if="showStatistics" class="statistics-container">
        <h3>犯罪数据统计</h3>
        <div class="charts-row">
          <div id="daily-crime-chart" style="width: 33%; height: 350px;"></div>
          <div id="crime-type-chart" style="width: 33%; height: 350px;"></div>
          <div id="stacked-area-chart" style="width: 33%; height: 350px;"></div>
        </div>
      </div>

      <div v-if="showStatsModal" class="modal-overlay">
        <div class="modal-content">
          <div class="modal-header">
            <h2>社区犯罪数量统计</h2>
            <div class="chart-type-buttons">
              <button @click="currentChartType = 'bar'" :class="{ 'active': currentChartType === 'bar' }">柱状图</button>
              <button @click="currentChartType = 'pie'" :class="{ 'active': currentChartType === 'pie' }">饼图</button>
            </div>
            <button @click="showStatsModal = false" class="close-button">&times;</button>
          </div>
          <div class="modal-body">
            <div id="communityCrimeChart" style="width: 100%; height: 400px;"></div>
            <p v-if="totalCrimesCounted > 0" style="text-align: right; margin-top: 10px;">
              总共统计到 <strong>{{ totalCrimesCounted }}</strong> 起犯罪事件。
            </p>
          </div>
        </div>
      </div>

      <div v-if="allCrimeTableData.length > 0 && !showStatistics" class="data-table-section">
        <div class="data-table-header">
          <h3>筛选结果数据</h3>
          <button @click="exportToCsv" class="export-btn">导出为CSV</button>
        </div>
        <el-table :data="crimeTableData" style="width: 100%">
          <el-table-column v-for="key in Object.keys(allCrimeTableData[0])" :key="key" :prop="key" :label="key" />
        </el-table>

        <el-pagination v-model:currentPage="currentPage" :page-size="pageSize"
          :page-sizes="[5, 10, 20, allCrimeTableData.length]" :small="false" :total="allCrimeTableData.length"
          layout="total, sizes, prev, pager, next, jumper" @size-change="handleSizeChange"
          @current-change="handleCurrentChange" style="margin-top: 15px; display: flex; justify-content: center;" />
      </div>

      <div class="data-table-container"
        v-else-if="selectedTimeRangeText && (selectedCrimeTypes.length > 0 || filteredByTimeData.length > 0) && allCrimeTableData.length === 0 && !showStatistics">
        <p>当前筛选条件下没有犯罪数据。</p>
      </div>
      <div class="data-table-container"
        v-else-if="selectedTimeRangeText && selectedCrimeTypes.length === 0 && filteredByTimeData.length === 0 && !showStatistics">
        <p>请先选择时间范围。</p>
      </div>
      <div class="data-table-container"
        v-else-if="!selectedTimeRangeText && selectedCrimeTypes.length > 0 && filteredByTimeData.length === 0 && !showStatistics">
        <p>请先选择时间范围。</p>
      </div>
      <div class="data-table-container"
        v-else-if="!selectedTimeRangeText && selectedCrimeTypes.length === 0 && filteredByTimeData.length === 0 && !showStatistics">
        <p>请先选择时间范围。</p>
      </div>
    </main>

    <footer class="adaptive-footer">
      <p>©2025 Security Guards 城市犯罪大数据时空分析与预测系统</p>
    </footer>
  </div>
</template>

<style scoped>
/* 全局变量和基本样式 */
/* 注意：这里保留了 :root，但其中定义的变量将不再被本文件中的后续样式引用 */
:root {
  --digital-bg-color: #0A1838;
  --digital-primary-color: #00FFFF;
  --digital-secondary-color: #007BFF;
  --digital-text-color: #A0B0D0;
  --digital-border-color: #00FFFF;
  --digital-glow-color: #00FFFF;
  --digital-panel-bg: rgba(10, 24, 56, 1);
  --header-height: 80px;
  /* 明确定义头部高度，与 CrimeMapView 保持一致 */
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
  min-height: 100vh;
  display: flex;
  flex-direction: column;
  overflow-x: hidden;
  background-color: var(--digital-bg-color);
  /* 全局深蓝背景 */
  color: var(--digital-text-color);
  /* 全局文字颜色 */
  font-family: 'Segoe UI', Arial, sans-serif;
  position: relative;
}

/* --- CrimeMapView.vue 风格的导航栏样式 START --- */
/* adaptive-header 对应 CrimeMapView.vue 的 .screen-header */
.adaptive-header {
  height: var(--header-height);
  /* 使用定义的头部高度 */
  background: linear-gradient(to right, rgba(0, 255, 255, 0.1), rgba(0, 255, 255, 0.05), rgba(0, 255, 255, 0.1));
  border-bottom: 1px solid rgba(0, 255, 255, 0.3);
  box-shadow: 0 0 15px rgba(0, 255, 255, 0.4);
  position: relative;
  z-index: 10;
  flex-shrink: 0;
  /* 防止头部被压缩 */

  /* 以下是适应现有 .nav-wrapper 结构的样式 */
  display: flex;
  /* 让 nav-wrapper 的子元素在头部内居中和分散 */
  align-items: center;
  justify-content: space-between;
  padding: 0 30px;
  /* 与 CrimeMapView.vue 的 padding 保持一致 */
}

/* nav-wrapper 在此模式下将不再直接定义布局，其子元素将由 .adaptive-header 控制 */
/* 所以 .nav-wrapper 的大部分样式可以移除或简化 */
.nav-wrapper {
  width: 100%;
  /* 保持宽度 */
  display: flex;
  /* 确保内部元素仍能灵活布局 */
  justify-content: space-between;
  /* 子元素分散对齐 */
  align-items: center;
  /* 垂直居中 */
}

/* logo-area 对应 CrimeMapView.vue 的 .header-left */
.logo-area {
  display: flex;
  align-items: center;
  gap: 15px;
  /* 与 CrimeMapView.vue 的 gap 保持一致 */
  flex-shrink: 0;
  /* 防止被压缩 */
}

/* logo-img 对应 CrimeMapView.vue 的 .header-logo */
.logo-img {
  height: 50px;
  /* 与 CrimeMapView.vue 的 height 保持一致 */
  width: auto;
  filter: drop-shadow(0 0 5px var(--digital-primary-color));
}

/* logo-text 对应 CrimeMapView.vue 的 .header-title */
.logo-text {
  font-size: 24px;
  /* 与 CrimeMapView.vue 的 font-size 保持一致 */
  font-weight: bold;
  color: var(--digital-primary-color);
  text-shadow: 0 0 8px rgba(0, 255, 255, 0.8);
  letter-spacing: 2px;
  white-space: nowrap;
  /* 防止标题换行 */
}

/* adaptive-nav 对应 CrimeMapView.vue 的 .header-center (用于主系统标题) */
/* 假设 adaptive-nav 仍然是导航链接，则将其放置在中间，并调整样式以适应CrimeMapView的简洁头部 */
.adaptive-nav {
  flex-grow: 1;
  /* 占据中间剩余空间 */
  display: flex;
  justify-content: center;
  /* 导航项居中 */
  align-items: center;
  gap: 20px;
  /* 导航项间距 */
  margin: 0;
  /* 移除之前可能有的 margin */
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
  position: relative;
  /* 用于可能的底部边框 */
  background-color: rgba(0, 255, 255, 0.05);
  /* 非激活状态下的半透明背景 */
  border: 1px solid rgba(0, 255, 255, 0.2);
  /* 非激活状态下的边框 */
  box-shadow: 0 0 5px rgba(0, 255, 255, 0.1);
  /* 非激活状态下的轻微阴影 */
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
  box-shadow: 0 0 10px rgba(0, 255, 255, 0.8);
  /* 激活时保持发光效果 */
}

/* user-area 对应 CrimeMapView.vue 的 .header-right */
.user-area {
  display: flex;
  align-items: center;
  gap: 15px;
  /* 与 CrimeMapView.vue 的 gap 保持一致 */
  flex-shrink: 0;
}

/* welcome-message 对应 CrimeMapView.vue 的 .user-info-display */
.welcome-message {
  display: flex;
  align-items: center;
  gap: 10px;
  /* 与 CrimeMapView.vue 的 gap 保持一致 */
  color: var(--digital-text-color);
  font-size: 1rem;
  /* 与 CrimeMapView.vue 的 font-size 保持一致 */
  white-space: nowrap;
  /* 防止换行 */
  margin-right: 0;
  /* 移除原来的 margin-right */
}

/* welcome-icon 对应 CrimeMapView.vue 的 .digital-welcome-icon */
.welcome-icon {
  font-size: 1.1em;
  /* 移除动画 */
  color: var(--digital-primary-color);
}

/* logout-btn 对应 CrimeMapView.vue 的 .logout-btn-digital */
.logout-btn {
  padding: 8px 15px;
  /* 与 CrimeMapView.vue 的 padding 保持一致 */
  font-size: 0.9rem;
  /* 与 CrimeMapView.vue 的 font-size 保持一致 */
  border-radius: 5px;
  /* 与 CrimeMapView.vue 的 border-radius 保持一致 */
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

/* 移除挥手动画 @keyframes wave */
/* @keyframes wave {
  0%,
  100% {
    transform: rotate(0deg);
  }
  25% {
    transform: rotate(15deg);
  }
  75% {
    transform: rotate(-15deg);
  }
} */
/* --- CrimeMapView.vue 风格的导航栏样式 END --- */


/* 主内容区域 */
.adaptive-main {
  flex: 1;
  width: 100%;
  padding: 2rem;
  /* 这里的 min-height 需要考虑头部高度，现在头部是 80px */
  min-height: calc(100vh - var(--header-height) - 80px);
  /* 减去头部和底部的高度 */
  display: flex;
  align-items: flex-start;
  background-color: var(--digital-bg-color);
  /* 深蓝背景 */
}

.content-section {
  width: 100%;
  max-width: 1200px;
  margin: 0 auto;
  text-align: left;
  padding: 2rem 1rem;
}

.system-title {
  font-size: 2.2rem;
  color: var(--digital-primary-color);
  /* 亮青色 */
  margin-bottom: 1.5rem;
  line-height: 1.3;
  text-align: left;
  text-shadow: 0 0 8px rgba(0, 255, 255, 0.8);
  letter-spacing: 1px;
}

.system-subtitle {
  font-size: 1.3rem;
  color: var(--digital-text-color);
  /* 浅灰色 */
  margin-bottom: 3rem;
  text-align: left;
}

/* 底部样式 */
.adaptive-footer {
  width: 100%;
  background: linear-gradient(to right, rgba(0, 255, 255, 0.05), rgba(0, 255, 255, 0.1), rgba(0, 255, 255, 0.05));
  border-top: 1px solid rgba(0, 255, 255, 0.3);
  color: rgba(160, 176, 208, 0.7);
  /* 浅灰色带透明度 */
  text-align: center;
  padding: 1.5rem;
  font-size: 0.9rem;
  flex-shrink: 0;
  box-shadow: 0 0 15px rgba(0, 255, 255, 0.4);
}

/* 数据分析页面特定的样式 */
.data-analysis-main {
  flex-direction: column;
  align-items: stretch;
  padding: 2rem;
  gap: 1.5rem;
}

.analysis-content-wrapper {
  display: flex;
  gap: 2rem;
  flex-grow: 1;
  position: relative;
}

/* 侧边栏 */
.analysis-sidebar {
  width: 250px;
  background-color: var(--digital-panel-bg);
  padding: 1.5rem;
  border-radius: 8px;
  border: 1px solid var(--digital-primary-color);
  box-shadow: 0 0 15px rgba(0, 255, 255, 0.3);
  flex-shrink: 0;
  overflow-y: auto;
  max-height: 730px;
  /* 调整侧边栏最大高度 */
}

.analysis-sidebar h3 {
  font-size: 1.2rem;
  margin-bottom: 1rem;
  color: var(--digital-primary-color);
  font-weight: bold;
  padding-left: 0.3rem;
  text-shadow: 0 0 5px rgba(0, 255, 255, 0.6);
}

.menu-item {
  margin-bottom: 1rem;
}

.menu-header {
  display: flex;
  align-items: center;
  padding: 0.8rem 1rem;
  border-radius: 4px;
  background-color: rgba(0, 255, 255, 0.05);
  color: var(--digital-text-color);
  font-size: 1rem;
  cursor: pointer;
  transition: all 0.2s ease;
  border: 1px solid rgba(0, 255, 255, 0.2);
  box-shadow: 0 0 5px rgba(0, 255, 255, 0.1);
}

.menu-header:hover {
  background-color: rgba(0, 255, 255, 0.15);
  color: var(--digital-primary-color);
  box-shadow: 0 0 10px rgba(0, 255, 255, 0.4);
}

.menu-header .arrow {
  width: 0.8rem;
  height: 0.8rem;
  margin-right: 0.5rem;
  border-left: 0.2rem solid var(--digital-text-color);
  border-bottom: 0.2rem solid var(--digital-text-color);
  transform: rotate(-45deg);
  transition: transform 0.2s ease;
}

.menu-header:hover .arrow {
  border-left-color: var(--digital-primary-color);
  border-bottom-color: var(--digital-primary-color);
}

.menu-header .arrow.expanded {
  transform: rotate(45deg);
}

.menu-header .icon {
  margin-right: 0.5rem;
  color: var(--digital-primary-color);
}

.menu-sub-items {
  padding-left: 1.5rem;
  margin-top: 0.5rem;
  border-left: 1px dashed rgba(0, 255, 255, 0.2);
}

.sub-item {
  padding: 0.6rem 0.8rem;
  border-radius: 4px;
  color: var(--digital-text-color);
  font-size: 0.9rem;
  cursor: pointer;
  transition: all 0.2s ease;
}

.sub-item:hover {
  background-color: rgba(0, 255, 255, 0.1);
  color: var(--digital-primary-color);
  box-shadow: 0 0 5px rgba(0, 255, 255, 0.3);
}

.sub-item .icon {
  margin-right: 0.5rem;
  color: var(--digital-primary-color);
}

/* 分析内容区域 */
.analysis-content {
  flex-grow: 1;
  background-color: var(--digital-panel-bg);
  padding: 2rem;
  border-radius: 8px;
  border: 1px solid var(--digital-primary-color);
  box-shadow: 0 0 15px rgba(0, 255, 255, 0.3);
  overflow: hidden;
}

.analysis-content .system-title {
  text-align: left;
  font-size: 1.8rem;
  margin-bottom: 1rem;
  color: var(--digital-primary-color);
  text-shadow: 0 0 8px rgba(0, 255, 255, 0.8);
}

.analysis-content .system-subtitle {
  text-align: left;
  font-size: 1rem;
  color: var(--digital-text-color);
  margin-bottom: 1.5rem;
}

#analysis-result-container {
  margin-top: 1.5rem;
}

/* 地图容器 */
.analysis-map-container {
  flex-grow: 1;
  background-color: var(--digital-panel-bg);
  border-radius: 8px;
  border: 1px solid var(--digital-primary-color);
  box-shadow: 0 0 15px rgba(0, 255, 255, 0.3);
  overflow: hidden;
  display: flex;
  flex-direction: column;
  height: 731.33px;
  position: relative;
}

#analysis-map {
  width: 100%;
  height: 100%;
  background-color: var(--digital-bg-color);
}

/* 时间范围选择器样式 (Element Plus 组件) */
.time-range-picker {
  position: absolute;
  top: 50%;
  left: 50%;
  transform: translate(-50%, -50%);
  background-color: var(--digital-panel-bg);
  padding: 20px;
  border-radius: 8px;
  border: 1px solid var(--digital-primary-color);
  box-shadow: 0 0 15px rgba(0, 255, 255, 0.5);
  z-index: 100;
  display: flex;
  flex-direction: column;
  gap: 10px;
  color: var(--digital-text-color);
}

.time-range-picker h3 {
  margin-bottom: 15px;
  text-align: center;
  color: var(--digital-primary-color);
  text-shadow: 0 0 5px rgba(0, 255, 255, 0.6);
}

.time-range-picker .el-button {
  padding: 8px 15px;
  border: none;
  border-radius: 4px;
  cursor: pointer;
  transition: all 0.3s ease;
  font-weight: bold;
}

.time-range-picker .el-button:first-of-type {
  background-color: var(--digital-primary-color);
  color: var(--digital-bg-color);
  box-shadow: 0 0 8px rgba(0, 255, 255, 0.5);
}

.time-range-picker .el-button:first-of-type:hover {
  background-color: #00E5E5;
  box-shadow: 0 0 15px rgba(0, 255, 255, 0.8);
  transform: translateY(-2px);
}

.time-range-picker .el-button:last-of-type {
  background-color: #FF4500;
  color: white;
  box-shadow: 0 0 8px rgba(255, 69, 0, 0.5);
}

.time-range-picker .el-button:last-of-type:hover {
  background-color: #FF6347;
  box-shadow: 0 0 15px rgba(255, 69, 0, 0.8);
  transform: translateY(-2px);
}

.selected-time-range {
  margin-top: 10px;
  font-size: 0.9rem;
  color: var(--digital-text-color);
  text-align: center;
}

/* 数据表格容器样式 */
.data-table-container {
  margin-top: 20px;
  padding: 15px;
  background-color: var(--digital-panel-bg);
  border: 1px solid var(--digital-primary-color);
  border-radius: 8px;
  box-shadow: 0 0 15px rgba(0, 255, 255, 0.3);
  overflow-x: auto;
  width: 100%;
  display: flex;
  flex-direction: column;
  align-items: stretch;
  color: var(--digital-text-color);
}

.data-table-container h3 {
  font-size: 1.2rem;
  margin-bottom: 10px;
  color: var(--digital-primary-color);
  text-shadow: 0 0 5px rgba(0, 255, 255, 0.6);
}

.data-table-section {
  margin-top: 20px;
  background-color: rgba(10, 24, 56, 0.5);
  padding: 20px;
  border-radius: 8px;
  border: 1px solid rgba(0, 255, 255, 0.2);
  box-shadow: inset 0 0 10px rgba(0, 255, 255, 0.2);
}

.data-table-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 15px;
}

.data-table-header h3 {
  margin: 0;
  font-size: 1.2em;
  color: var(--digital-primary-color);
  text-shadow: 0 0 5px rgba(0, 255, 255, 0.6);
}

.export-btn {
  background-color: var(--digital-primary-color);
  color: var(--digital-bg-color);
  border: 1px solid var(--digital-primary-color);
  padding: 8px 15px;
  border-radius: 4px;
  cursor: pointer;
  font-size: 0.9em;
  transition: all 0.3s ease;
  box-shadow: 0 0 8px rgba(0, 255, 255, 0.5);
  font-weight: bold;
}

.export-btn:hover {
  background-color: #00E5E5;
  border-color: #00E5E5;
  box-shadow: 0 0 15px rgba(0, 255, 255, 0.8);
  transform: translateY(-2px);
}

:deep(.el-table) {
  --el-table-bg-color: transparent !important;
  /* 表格背景透明 */
  --el-table-text-color: var(--digital-text-color) !important;
  /* 表格文字颜色 */
  --el-table-header-bg-color: rgba(0, 255, 255, 0.1) !important;
  /* 表头背景 */
  --el-table-header-text-color: var(--digital-primary-color) !important;
  /* 表头文字颜色 */
  --el-table-row-hover-bg-color: rgba(0, 255, 255, 0.05) !important;
  /* 行悬停背景 */
  --el-table-border-color: rgba(0, 255, 255, 0.2) !important;
  /* 表格边框颜色 */
  --el-table-border: 1px solid var(--el-table-border-color) !important;
  /* 表格整体边框 */

  border-radius: 8px;
  /* 整体圆角 */
  overflow: hidden;
  /* 确保圆角生效 */
  box-shadow: inset 0 0 10px rgba(0, 255, 255, 0.2);
  /* 内发光 */
}

/* 表格的外部边框 */
:deep(.el-table__inner-wrapper) {
  border: none !important;
  /* 移除 Element Plus 默认的内部边框 */
}

/* 表头行样式 */
:deep(.el-table thead) {
  color: var(--el-table-header-text-color) !important;
  font-weight: bold !important;
}

:deep(.el-table th.el-table__cell) {
  background-color: var(--el-table-header-bg-color) !important;
  border-bottom: 1px solid var(--el-table-border-color) !important;
  /* 表头底部边框 */
  border-right: 1px solid rgba(0, 255, 255, 0.1) !important;
  /* 列分隔线 */
  color: var(--el-table-header-text-color) !important;
  font-size: 1em !important;
  text-align: center !important;
  /* 表头文字居中 */
  box-shadow: none !important;
  /* 移除默认阴影 */
}

/* 表格行样式 */
:deep(.el-table tr) {
  background-color: transparent !important;
  transition: background-color 0.2s ease;
}

:deep(.el-table tr:hover) {
  background-color: var(--el-table-row-hover-bg-color) !important;
}

/* 单元格样式 */
:deep(.el-table td.el-table__cell) {
  border-bottom: 1px solid var(--el-table-border-color) !important;
  /* 单元格底部边框 */
  border-right: 1px solid rgba(0, 255, 255, 0.1) !important;
  /* 列分隔线 */
  color: var(--el-table-text-color) !important;
  text-align: center !important;
  /* 单元格文字居中 */
}

/* 移除最后一列和最后一行的右边和下边框 */
:deep(.el-table th.el-table__cell:last-child),
:deep(.el-table td.el-table__cell:last-child) {
  border-right: none !important;
}

:deep(.el-table__body-wrapper tbody tr:last-child td.el-table__cell) {
  border-bottom: none !important;
}

/* Element Plus 分页 (el-pagination) 样式覆盖 */
.el-pagination {
  --el-pagination-bg-color: transparent !important;
  /* 背景透明 */
  --el-pagination-text-color: var(--digital-text-color) !important;
  /* 文字颜色 */
  --el-pagination-button-bg-color: rgba(0, 255, 255, 0.1) !important;
  /* 按钮背景 */
  --el-pagination-button-color: var(--digital-primary-color) !important;
  /* 按钮文字颜色 */
  --el-pagination-hover-color: var(--digital-primary-color) !important;
  /* 悬停颜色 */
  --el-pagination-active-color: var(--digital-bg-color) !important;
  /* 激活文字颜色 */
  --el-pagination-active-bg-color: var(--digital-primary-color) !important;
  /* 激活背景颜色 */
  --el-pagination-border-color: rgba(0, 255, 255, 0.4) !important;
  /* 边框颜色 */

  margin-top: 25px !important;
  /* 增加与表格的间距 */
  padding: 10px 20px;
  background-color: rgba(10, 24, 56, 0.7);
  /* 半透明背景 */
  border-radius: 8px;
  border: 1px solid rgba(0, 255, 255, 0.3);
  box-shadow: 0 0 10px rgba(0, 255, 255, 0.3);
  /* 发光效果 */
}

/* 分页按钮样式 */
:deep(.el-pagination button),
:deep(.el-pagination .btn-prev),
:deep(.el-pagination .btn-next) {
  background-color: var(--el-pagination-button-bg-color) !important;
  color: var(--el-pagination-button-color) !important;
  border: 1px solid var(--el-pagination-border-color) !important;
  border-radius: 4px !important;
  transition: all 0.2s ease !important;
}

:deep(.el-pagination button:hover),
:deep(.el-pagination .btn-prev:hover),
:deep(.el-pagination .btn-next:hover) {
  background-color: rgba(0, 255, 255, 0.2) !important;
  color: var(--el-pagination-hover-color) !important;
  box-shadow: 0 0 8px rgba(0, 255, 255, 0.4) !important;
}

/* 页码样式 */
:deep(.el-pager li) {
  background-color: var(--el-pagination-button-bg-color) !important;
  color: var(--el-pagination-button-color) !important;
  border: 1px solid var(--el-pagination-border-color) !important;
  border-radius: 4px !important;
  margin: 0 4px !important;
  transition: all 0.2s ease !important;
}

:deep(.el-pager li:hover) {
  background-color: rgba(0, 255, 255, 0.2) !important;
  color: var(--el-pagination-hover-color) !important;
  box-shadow: 0 0 8px rgba(0, 255, 255, 0.4) !important;
}

/* 激活页码 */
:deep(.el-pager li.is-active) {
  background-color: var(--el-pagination-active-bg-color) !important;
  color: var(--el-pagination-active-color) !important;
  border-color: var(--el-pagination-active-bg-color) !important;
  box-shadow: 0 0 10px var(--digital-primary-color) !important;
  /* 激活时发光 */
}

/* 页数输入框 */
:deep(.el-pagination__sizes .el-input__wrapper),
:deep(.el-pagination__jump .el-input__wrapper) {
  background-color: rgba(0, 0, 0, 0.4) !important;
  border: 1px solid rgba(0, 255, 255, 0.4) !important;
  box-shadow: inset 0 0 5px rgba(0, 255, 255, 0.1) !important;
  border-radius: 4px !important;
}

:deep(.el-pagination__sizes .el-input__inner),
:deep(.el-pagination__jump .el-input__inner) {
  color: var(--digital-text-color) !important;
}

:deep(.el-pagination__sizes .el-input.is-focus .el-input__wrapper),
:deep(.el-pagination__sizes .el-input__wrapper:hover),
:deep(.el-pagination__jump .el-input.is-focus .el-input__wrapper),
:deep(.el-pagination__jump .el-input__wrapper:hover) {
  border-color: var(--digital-primary-color) !important;
  box-shadow: 0 0 8px rgba(0, 255, 255, 0.5) !important;
}


/* 分页信息文本 */
:deep(.el-pagination__total),
:deep(.el-pagination__jump) {
  color: var(--digital-text-color) !important;
}

/* 犯罪类型选择器 */
.crime-type-selector {
  position: absolute;
  top: 50%;
  left: 50%;
  transform: translate(-50%, -50%);
  background-color: var(--digital-panel-bg);
  padding: 20px;
  border-radius: 8px;
  border: 1px solid var(--digital-primary-color);
  box-shadow: 0 0 15px rgba(0, 255, 255, 0.5);
  z-index: 110;
  display: flex;
  flex-direction: column;
  gap: 15px;
  width: 350px;
  max-height: 500px;
  overflow-y: auto;
  color: var(--digital-text-color);
}

.crime-type-selector h3 {
  font-size: 1.2rem;
  /* 稍微大一点，更显眼 */
  margin-bottom: 20px;
  /* 增加底部间距 */
  color: var(--digital-primary-color);
  text-align: center;
  text-shadow: 0 0 8px rgba(0, 255, 255, 0.8);
  /* 更强的发光效果 */
  border-bottom: 1px solid rgba(0, 255, 255, 0.3);
  /* 添加底部边框 */
  padding-bottom: 10px;
  /* 边框与文字的间距 */
}

/* 复选框组容器 */
.crime-type-selector .el-checkbox-group {
  margin-bottom: 20px;
  /* 增加与按钮的间距 */
  padding: 0 10px;
  /* 左右内边距，让内容不那么贴边 */
}

/* 单个复选框项 */
.crime-type-selector .el-checkbox {
  margin-right: 0;
  /* 确保不产生额外右边距 */
  display: flex;
  /* 让勾选框和文本对齐 */
  align-items: center;
  padding: 8px 0;
  /* 增加上下内边距 */
  transition: all 0.2s ease;
}

.crime-type-selector .el-checkbox:hover {
  background-color: rgba(0, 255, 255, 0.08);
  /* 悬停背景 */
  border-radius: 4px;
}

.crime-type-selector .el-checkbox {
  margin-right: 0;
  color: var(--digital-text-color);
}

/* Element Plus Checkbox 勾选框样式覆盖 */
:deep(.el-checkbox__input.is-checked .el-checkbox__inner) {
  background-color: var(--digital-primary-color) !important;
  border-color: var(--digital-primary-color) !important;
}

:deep(.el-checkbox__inner) {
  border-color: rgba(0, 255, 255, 0.4) !important;
  background-color: rgba(0, 255, 255, 0.05) !important;
}

:deep(.el-checkbox__inner:hover) {
  border-color: var(--digital-primary-color) !important;
}

:deep(.el-checkbox__label) {
  color: var(--digital-text-color) !important;
  font-size: 1rem !important;
  /* 统一字体大小 */
  padding-left: 8px;
  /* 文本与勾选框的间距 */
}


.crime-type-selector .selector-actions {
  display: flex;
  justify-content: flex-end;
  gap: 15px;
}

.crime-type-selector .selector-actions .el-button {
  padding: 8px 15px;
  border: none;
  border-radius: 4px;
  cursor: pointer;
  transition: all 0.3s ease;
  font-weight: bold;
}

.crime-type-selector .selector-actions .el-button:first-of-type {
  background-color: rgba(0, 255, 255, 0.1);
  color: var(--digital-primary-color);
  border: 1px solid rgba(0, 255, 255, 0.4);
}

.crime-type-selector .selector-actions .el-button:first-of-type:hover {
  background-color: rgba(0, 255, 255, 0.2);
  box-shadow: 0 0 10px rgba(0, 255, 255, 0.6);
}

.crime-type-selector .selector-actions .el-button:last-of-type {
  background-color: var(--digital-primary-color);
  color: var(--digital-bg-color);
  border: 1px solid var(--digital-primary-color);
  box-shadow: 0 0 8px rgba(0, 255, 255, 0.5);
}

.crime-type-selector .selector-actions .el-button:last-of-type:hover {
  background-color: #00E5E5;
  box-shadow: 0 0 15px rgba(0, 255, 255, 0.8);
  transform: translateY(-2px);
}


/* 统计图表容器样式 */
.statistics-container {
  margin-top: 20px;
  padding: 20px;
  background-color: var(--digital-panel-bg);
  border: 1px solid var(--digital-primary-color);
  border-radius: 8px;
  box-shadow: 0 0 15px rgba(0, 255, 255, 0.3);
  color: var(--digital-text-color);
}

.statistics-container h3 {
  font-size: 1.5rem;
  margin-bottom: 20px;
  color: var(--digital-primary-color);
  text-align: center;
  text-shadow: 0 0 8px rgba(0, 255, 255, 0.8);
}

.charts-row {
  display: flex;
  flex-direction: row;
  justify-content: space-between;
  align-items: stretch;
  gap: 20px;
}

/* ECharts 图表容器样式 */
#daily-crime-chart,
#crime-type-chart,
#stacked-area-chart {
  width: 33%;
  height: 350px;
  border: 1px solid rgba(0, 255, 255, 0.2);
  border-radius: 6px;
  background-color: rgba(0, 0, 0, 0.4);
  box-shadow: inset 0 0 10px rgba(0, 255, 255, 0.2);
  transition: all 0.3s ease;
  flex-shrink: 0;
}

#daily-crime-chart:hover,
#crime-type-chart:hover,
#stacked-area-chart:hover {
  box-shadow: inset 0 0 15px rgba(0, 255, 255, 0.4), 0 0 15px rgba(0, 255, 255, 0.2);
}


/* 热力图调整样式 */

/* 热力图调整对话框样式覆盖 */
:deep(.el-dialog) {
  background-color: var(--digital-panel-bg) !important;
  /* 对话框背景色 */
  border: 1px solid var(--digital-primary-color) !important;
  /* 边框 */
  box-shadow: 0 0 20px rgba(0, 255, 255, 0.6) !important;
  /* 强烈的发光效果 */
  border-radius: 10px !important;
  /* 更圆润的边角 */
  overflow: hidden;
  /* 确保内容在圆角内 */
}

/* 对话框头部 (标题) */
:deep(.el-dialog__header) {
  background-color: rgba(0, 255, 255, 0.1) !important;
  /* 头部背景 */
  border-bottom: 1px solid rgba(0, 255, 255, 0.3) !important;
  /* 底部边框 */
  padding: 15px 20px !important;
  /* 内边距 */
  position: relative;
  /* 用于关闭按钮的定位 */
}

/* 对话框标题文字 */
:deep(.el-dialog__title) {
  color: var(--digital-primary-color) !important;
  /* 标题文字颜色 */
  font-size: 1.3rem !important;
  text-shadow: 0 0 8px rgba(0, 255, 255, 0.8) !important;
  /* 标题发光 */
  font-weight: bold !important;
}

/* 对话框关闭按钮 */
:deep(.el-dialog__headerbtn) {
  top: 15px !important;
  right: 20px !important;
  font-size: 1.2rem !important;
}

:deep(.el-dialog__headerbtn .el-icon) {
  color: var(--digital-primary-color) !important;
  /* 关闭按钮图标颜色 */
  transition: transform 0.3s ease;
}

:deep(.el-dialog__headerbtn:hover .el-icon) {
  color: #00E5E5 !important;
  /* 悬停时颜色变亮 */
  transform: rotate(90deg);
  /* 悬停时旋转效果 */
}

/* 对话框内容区域 */
:deep(.el-dialog__body) {
  padding: 20px !important;
  /* 内容区内边距 */
  color: var(--digital-text-color) !important;
  /* 文本颜色 */
}

/* adjust-box 容器样式 */
.adjust-box {
  display: flex;
  flex-direction: column;
  gap: 15px;
  /* 间距 */
  font-size: 1.1rem;
  /* 字体大小 */
  color: var(--digital-text-color);
  /* 文本颜色 */
}

.adjust-box>div {
  display: flex;
  align-items: center;
  justify-content: space-between;
  /* 文本和输入框之间留白 */
  padding: 8px 0;
  border-bottom: 1px solid rgba(0, 255, 255, 0.1);
  /* 分隔线 */
}

.adjust-box>div:last-child {
  border-bottom: none;
  /* 最后一个不显示分隔线 */
}


/* el-input-number 组件样式覆盖 */
:deep(.el-input-number) {
  width: 150px !important;
  /* 设置输入框宽度 */
}

/* 输入框包装器 */
:deep(.el-input-number .el-input__wrapper) {
  background-color: rgba(0, 0, 0, 0.4) !important;
  /* 输入框背景，半透明黑色 */
  border: 1px solid rgba(0, 255, 255, 0.4) !important;
  /* 输入框边框 */
  box-shadow: inset 0 0 5px rgba(0, 255, 255, 0.1) !important;
  /* 内发光 */
  border-radius: 4px !important;
}

/* 输入框内部的文本 */
:deep(.el-input-number .el-input__inner) {
  color: var(--digital-text-color) !important;
  /* 输入文字颜色 */
  text-align: center !important;
  /* 文字居中 */
}

/* 输入框按钮容器 */
:deep(.el-input-number__controls) {
  background-color: transparent !important;
  /* 按钮容器背景透明 */
  border: none !important;
}

/* 增减按钮 */
:deep(.el-input-number__increase),
:deep(.el-input-number__decrease) {
  background-color: rgba(0, 255, 255, 0.1) !important;
  /* 按钮背景 */
  color: var(--digital-primary-color) !important;
  /* 按钮图标颜色 */
  border: 1px solid rgba(0, 255, 255, 0.3) !important;
  /* 按钮边框 */
  border-radius: 4px !important;
  /* 按钮圆角 */
  width: 30px !important;
  /* 按钮宽度 */
  height: auto !important;
  /* 高度自适应 */
  display: flex;
  align-items: center;
  justify-content: center;
  transition: all 0.2s ease;
}

/* 按钮图标 */
:deep(.el-input-number__increase .el-icon),
:deep(.el-input-number__decrease .el-icon) {
  font-size: 1.1em !important;
}

/* 按钮悬停效果 */
:deep(.el-input-number__increase:hover),
:deep(.el-input-number__decrease:hover) {
  background-color: rgba(0, 255, 255, 0.2) !important;
  color: #00E5E5 !important;
  box-shadow: 0 0 8px rgba(0, 255, 255, 0.4) !important;
  transform: translateY(-1px);
  /* 略微上浮效果 */
}

/* 禁用状态的按钮 */
:deep(.el-input-number.is-controls-right .el-input-number__decrease.is-disabled),
:deep(.el-input-number.is-controls-right .el-input-number__increase.is-disabled) {
  opacity: 0.5;
  cursor: not-allowed;
  box-shadow: none !important;
  transform: none !important;
}

/* 对话框底部按钮区域 */
.dialog-footer {
  display: flex;
  justify-content: flex-end;
  gap: 15px;
  /* 按钮之间的间距 */
  padding: 15px 20px !important;
  border-top: 1px solid rgba(0, 255, 255, 0.3) !important;
  /* 顶部边框 */
  background-color: rgba(10, 24, 56, 0.7) !important;
  /* 底部背景 */
}

.custom-button {
  padding: 0.6rem 1.2rem;
  border-radius: 4px;
  font-size: 0.9rem;
  cursor: pointer;
  transition: all 0.2s ease;
  font-weight: bold;
}

.cancel-button {
  background-color: rgba(0, 255, 255, 0.1);
  color: var(--digital-primary-color);
  border: 1px solid rgba(0, 255, 255, 0.4);
  box-shadow: 0 0 5px rgba(0, 255, 255, 0.2);
}

.cancel-button:hover {
  background-color: rgba(0, 255, 255, 0.2);
  box-shadow: 0 0 10px rgba(0, 255, 255, 0.6);
  transform: translateY(-2px);
}

.confirm-button {
  background-color: var(--digital-primary-color);
  color: var(--digital-bg-color);
  border: 1px solid var(--digital-primary-color);
  box-shadow: 0 0 8px rgba(0, 255, 255, 0.5);
}

.confirm-button:hover {
  background-color: #00E5E5;
  border-color: #00E5E5;
  box-shadow: 0 0 15px rgba(0, 255, 255, 0.8);
  transform: translateY(-2px);
}

/* 模态框背景遮罩 */
.modal-overlay {
  position: fixed;
  top: 0;
  left: 0;
  width: 100%;
  height: 100%;
  background-color: rgba(0, 0, 0, 0.7);
  display: flex;
  justify-content: center;
  align-items: center;
  z-index: 1000;
}

/* 模态框内容区域 */
.modal-content {
  background-color: var(--digital-panel-bg);
  padding: 25px;
  border-radius: 10px;
  border: 1px solid var(--digital-primary-color);
  box-shadow: 0 0 20px rgba(0, 255, 255, 0.5);
  width: 90%;
  max-width: 700px;
  max-height: 90%;
  overflow-y: auto;
  color: var(--digital-text-color);
}

/* 确保 ECharts 容器有明确的尺寸 */
#communityCrimeChart {
  width: 100%;
  height: 400px;
  margin-top: 15px;
  background-color: rgba(0, 0, 0, 0.4);
  border-radius: 6px;
  box-shadow: inset 0 0 10px rgba(0, 255, 255, 0.2);
}

.modal-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 15px;
  border-bottom: 1px solid rgba(0, 255, 255, 0.3);
  padding-bottom: 10px;
}

.modal-header h2 {
  margin: 0;
  font-size: 1.5em;
  color: var(--digital-primary-color);
  flex-grow: 1;
  text-shadow: 0 0 5px rgba(0, 255, 255, 0.6);
}

.chart-type-buttons {
  margin-left: 20px;
  display: flex;
  gap: 8px;
}

.chart-type-buttons button {
  padding: 8px 15px;
  border: 1px solid var(--digital-primary-color);
  border-radius: 4px;
  background-color: rgba(0, 255, 255, 0.1);
  color: var(--digital-primary-color);
  cursor: pointer;
  font-size: 0.9em;
  transition: all 0.3s ease;
  font-weight: bold;
  box-shadow: 0 0 5px rgba(0, 255, 255, 0.2);
}

.chart-type-buttons button:hover {
  background-color: rgba(0, 255, 255, 0.2);
  box-shadow: 0 0 10px rgba(0, 255, 255, 0.6);
  transform: translateY(-1px);
}

.chart-type-buttons button.active {
  background-color: var(--digital-primary-color);
  color: var(--digital-bg-color);
  border-color: var(--digital-primary-color);
  box-shadow: 0 0 10px var(--digital-primary-color);
}

.close-button {
  background: none;
  border: none;
  font-size: 1.8em;
  cursor: pointer;
  color: var(--digital-text-color);
  padding: 0 5px;
  margin-left: 15px;
  transition: all 0.3s ease;
}

.close-button:hover {
  color: var(--digital-primary-color);
  transform: scale(1.1);
}

/* 专题图例样式 */
.thematic-legend {
  position: absolute;
  bottom: 20px;
  right: 20px;
  background-color: rgba(10, 24, 56, 0.9);
  padding: 15px;
  border-radius: 8px;
  border: 1px solid var(--digital-primary-color);
  box-shadow: 0 0 15px rgba(0, 255, 255, 0.3);
  font-size: 14px;
  color: var(--digital-text-color);
  z-index: 1000;
  width: 200px;
}

.thematic-legend h3 {
  margin-top: 0;
  margin-bottom: 10px;
  font-size: 16px;
  color: var(--digital-primary-color);
  border-bottom: 1px solid rgba(0, 255, 255, 0.2);
  padding-bottom: 5px;
  text-shadow: 0 0 5px rgba(0, 255, 255, 0.6);
}

.thematic-legend .legend-item {
  display: flex;
  align-items: center;
  margin-bottom: 8px;
}

.thematic-legend .legend-color {
  width: 20px;
  height: 20px;
  border-radius: 4px;
  margin-right: 10px;
  border: 1px solid rgba(0, 255, 255, 0.2);
  flex-shrink: 0;
}

.thematic-legend .legend-label {
  line-height: 20px;
  word-break: break-word;
}

/* 热点分析图例 */
.hotspot-legend-container {
  position: absolute;
  bottom: 20px;
  right: 20px;
  background-color: rgba(10, 24, 56, 0.9);
  padding: 10px 15px;
  border-radius: 8px;
  border: 1px solid var(--digital-primary-color);
  box-shadow: 0 0 15px rgba(0, 255, 255, 0.3);
  z-index: 100;
  color: var(--digital-text-color);
}

.hotspot-legend-container h4 {
  margin-top: 0;
  margin-bottom: 10px;
  color: var(--digital-primary-color);
  font-size: 1.1em;
  text-align: center;
  text-shadow: 0 0 5px rgba(0, 255, 255, 0.6);
}

.hotspot-legend-container ul {
  list-style: none;
  padding: 0;
  margin: 0;
}

.hotspot-legend-container li {
  display: flex;
  align-items: center;
  margin-bottom: 5px;
  font-size: 0.9em;
  color: var(--digital-text-color);
}

.legend-color {
  width: 20px;
  height: 12px;
  margin-right: 8px;
  border: 1px solid rgba(0, 255, 255, 0.2);
  border-radius: 3px;
}

/* 热点颜色 - 调整为更鲜明，与数字大屏风格匹配 */
.high-hotspot {
  background-color: #FF0000;
  box-shadow: 0 0 5px #FF0000;
}

.mid-hotspot {
  background-color: #FF7F50;
  box-shadow: 0 0 5px #FF7F50;
}

.low-hotspot {
  background-color: #FFD700;
  box-shadow: 0 0 5px #FFD700;
}

.not-significant {
  background-color: #6C7A89;
  box-shadow: 0 0 5px #6C7A89;
}

.low-coldspot {
  background-color: #00BFFF;
  box-shadow: 0 0 5px #00BFFF;
}

.mid-coldspot {
  background-color: #1E90FF;
  box-shadow: 0 0 5px #1E90FF;
}

.high-coldspot {
  background-color: #0000FF;
  box-shadow: 0 0 5px #0000FF;
}

/* 分隔线 */
.separator {
  border: 0;
  border-top: 1px dashed rgba(0, 255, 255, 0.2);
  margin: 10px 0;
}

/* --- 响应式设计 (媒体查询) --- */
@media (max-width: 1600px) {
  .adaptive-nav {
    gap: 15px;
  }

  .nav-item {
    font-size: 1rem;
    padding: 0.4rem 0.9rem;
  }

  .logo-text {
    font-size: 20px;
  }

  .logo-img {
    height: 45px;
  }

  .welcome-message {
    font-size: 0.95rem;
  }

  .logout-btn {
    font-size: 0.85rem;
    padding: 7px 14px;
  }

  .system-title {
    font-size: 2rem;
  }
}

@media (max-width: 1200px) {
  .adaptive-header {
    height: auto;
    flex-direction: column;
    padding: 15px 20px;
    gap: 15px;
  }

  .nav-wrapper {
    flex-direction: column;
    gap: 15px;
    padding: 0;
  }

  .logo-area,
  .user-area {
    width: 100%;
    justify-content: center;
    gap: 10px;
  }

  .adaptive-nav {
    flex-grow: 0;
    width: 100%;
    margin: 0.5rem 0;
    justify-content: center;
  }

  .nav-item {
    font-size: 0.95rem;
    padding: 0.4rem 0.8rem;
  }

  .adaptive-main {
    flex-direction: column;
    padding: 1.5rem;
    gap: 1.5rem;
  }

  .analysis-content-wrapper {
    flex-direction: column;
    gap: 1.5rem;
  }

  .analysis-sidebar {
    width: 100%;
    max-width: none;
    max-height: none;
    height: auto;
    min-height: 300px;
    padding: 15px;
  }

  .analysis-content,
  .analysis-map-container {
    width: 100%;
    height: auto;
    min-height: 400px;
    padding: 15px;
  }

  .charts-row {
    flex-direction: column;
    gap: 1.5rem;
  }

  #daily-crime-chart,
  #crime-type-chart,
  #stacked-area-chart {
    width: 100%;
    height: 300px;
  }

  .thematic-legend,
  .hotspot-legend-container {
    position: static;
    margin-top: 20px;
    width: 100%;
    right: auto;
    bottom: auto;
  }
}

@media (max-width: 768px) {
  .logo-text {
    font-size: 18px;
  }

  .logo-img {
    height: 40px;
  }

  .welcome-message,
  .logout-btn {
    font-size: 0.8rem;
    padding: 6px 12px;
  }

  .system-title {
    font-size: 1.6rem;
  }

  .system-subtitle {
    font-size: 1rem;
  }

  .analysis-content h3,
  .data-table-container h3,
  .statistics-container h3 {
    font-size: 1.2rem;
  }

  .modal-content {
    padding: 15px;
  }

  .modal-header h2 {
    font-size: 1.3em;
  }

  .chart-type-buttons button {
    padding: 6px 10px;
    font-size: 0.8em;
  }
}

@media (max-width: 480px) {
  .logo-img {
    height: 32px;
  }

  .logo-text {
    font-size: 16px;
  }

  .adaptive-main {
    padding: 0.5rem;
  }

  .analysis-sidebar,
  .analysis-content,
  .analysis-map-container,
  .data-table-container,
  .statistics-container {
    padding: 10px;
  }

  .crime-type-selector,
  .time-range-picker {
    width: 98%;
    padding: 10px;
  }

  .modal-content {
    width: 98%;
  }

  .nav-item {
    padding: 0.3rem 0.6rem;
    font-size: 0.8rem;
  }
}


/* Element Plus 日期选择器样式覆盖 */

/* 主要输入框样式 */
:deep(.el-date-editor.el-input) {
  --el-input-bg-color: rgba(10, 24, 56, 0.7) !important;
  /* 输入框背景，与面板背景一致 */
  --el-input-border-color: rgba(0, 255, 255, 0.4) !important;
  /* 输入框边框颜色 */
  --el-input-text-color: var(--digital-text-color) !important;
  /* 输入框文字颜色 */
  --el-input-placeholder-color: #5c7b9f !important;
  /* 占位符颜色 */
  box-shadow: 0 0 5px rgba(0, 255, 255, 0.2) inset !important;
  /* 输入框内发光 */
  border-radius: 4px !important;
}

:deep(.el-date-editor.el-input__wrapper) {
  background-color: var(--el-input-bg-color) !important;
  border: 1px solid var(--el-input-border-color) !important;
  box-shadow: var(--el-input-box-shadow) !important;
}

:deep(.el-date-editor.el-input.is-focus .el-input__wrapper),
:deep(.el-date-editor.el-input__wrapper:hover) {
  border-color: var(--digital-primary-color) !important;
  box-shadow: 0 0 8px rgba(0, 255, 255, 0.5) !important;
  /* 聚焦/悬停时的发光 */
}

:deep(.el-input__inner) {
  color: var(--digital-text-color) !important;
  /* 确保输入框内的文字颜色 */
}

/* 日期选择器面板（弹出的日历部分） */
:deep(.el-picker__popper) {
  background-color: var(--digital-bg-color) !important;
  /* 面板背景 */
  border: 1px solid var(--digital-border-color) !important;
  /* 面板边框 */
  box-shadow: 0 0 15px var(--digital-glow-color) !important;
  /* 面板发光 */
  border-radius: 8px !important;
  color: var(--digital-text-color) !important;
  /* 默认文字颜色 */
}

/* 头部导航（年月选择） */
:deep(.el-date-picker__header) {
  border-bottom: 1px solid rgba(0, 255, 255, 0.2) !important;
  padding: 10px 12px !important;
}

:deep(.el-date-picker__header-label) {
  color: var(--digital-primary-color) !important;
  /* 年月标题颜色 */
  font-weight: bold !important;
}

:deep(.el-date-picker__prev-btn),
:deep(.el-date-picker__next-btn) {
  color: var(--digital-primary-color) !important;
  /* 前后翻页按钮颜色 */
}

/* 周几的头部 */
:deep(.el-date-picker__header-title) {
  color: var(--digital-text-color) !important;
}

/* 日期单元格 */
:deep(.el-date-table td.available) {
  color: var(--digital-text-color) !important;
  /* 可选日期文字颜色 */
}

/* 当前日期 */
:deep(.el-date-table td.current:not(.disabled) .cell) {
  background-color: rgba(0, 255, 255, 0.2) !important;
  /* 当前日期背景 */
  color: var(--digital-primary-color) !important;
  /* 当前日期文字颜色 */
  border-radius: 4px !important;
}

/* 选中日期 */
:deep(.el-date-table td.today .cell),
:deep(.el-date-table td.active .cell) {
  /* active 是 Element Plus 选中日期自带的类名 */
  background-color: var(--digital-primary-color) !important;
  /* 选中日期背景 */
  color: var(--digital-bg-color) !important;
  /* 选中日期文字颜色 */
  border-radius: 4px !important;
  font-weight: bold !important;
}

/* 悬停日期 */
:deep(.el-date-table td.available:hover .cell) {
  background-color: rgba(0, 255, 255, 0.1) !important;
  /* 悬停背景 */
  color: var(--digital-primary-color) !important;
  /* 悬停文字颜色 */
  border-radius: 4px !important;
}

/* 禁用日期 */
:deep(.el-date-table td.disabled .cell) {
  color: rgba(160, 176, 208, 0.4) !important;
  /* 禁用日期颜色 */
  background-color: transparent !important;
}

/* 月份/年份选择器中的单元格 */
:deep(.el-month-table td.available),
:deep(.el-year-table td.available) {
  color: var(--digital-text-color) !important;
}

:deep(.el-month-table td.current .cell),
:deep(.el-year-table td.current .cell) {
  background-color: rgba(0, 255, 255, 0.2) !important;
  color: var(--digital-primary-color) !important;
}

:deep(.el-month-table td.active .cell),
:deep(.el-year-table td.active .cell) {
  background-color: var(--digital-primary-color) !important;
  color: var(--digital-bg-color) !important;
}

:deep(.el-month-table td.available:hover .cell),
:deep(.el-year-table td.available:hover .cell) {
  background-color: rgba(0, 255, 255, 0.1) !important;
  color: var(--digital-primary-color) !important;
}

/* 清除图标和箭头图标 */
:deep(.el-input__suffix-inner .el-icon) {
  color: var(--digital-primary-color) !important;
}

/* 输入框的清除按钮（如果有） */
:deep(.el-input__clear) {
  color: var(--digital-primary-color) !important;
}

/* 范围选择器的分隔符 */
:deep(.el-range-editor .el-range-separator) {
  color: var(--digital-text-color) !important;
}


/* 确保 time-range-picker 里的按钮样式也是统一的 */
.time-range-picker button {
  background-color: var(--digital-primary-color);
  color: var(--digital-bg-color);
  border: 1px solid var(--digital-primary-color);
  padding: 8px 15px;
  border-radius: 4px;
  cursor: pointer;
  font-size: 0.9em;
  transition: all 0.3s ease;
  box-shadow: 0 0 8px rgba(0, 255, 255, 0.5);
  font-weight: bold;
}

.time-range-picker button:hover {
  background-color: #00E5E5;
  border-color: #00E5E5;
  box-shadow: 0 0 15px rgba(0, 255, 255, 0.8);
  transform: translateY(-2px);
}

.time-range-picker button:first-of-type {
  /* 确认按钮 */
  background-color: var(--digital-primary-color);
  color: var(--digital-bg-color);
  border: 1px solid var(--digital-primary-color);
  box-shadow: 0 0 8px rgba(0, 255, 255, 0.5);
}

.time-range-picker button:last-of-type {
  /* 取消按钮 */
  background-color: rgba(0, 255, 255, 0.1);
  /* 浅一点的背景 */
  color: var(--digital-primary-color);
  /* 亮青色文字 */
  border: 1px solid rgba(0, 255, 255, 0.4);
  box-shadow: 0 0 5px rgba(0, 255, 255, 0.2);
}

.time-range-picker button:last-of-type:hover {
  background-color: rgba(0, 255, 255, 0.2);
  box-shadow: 0 0 10px rgba(0, 255, 255, 0.6);
  transform: translateY(-2px);
}
</style>