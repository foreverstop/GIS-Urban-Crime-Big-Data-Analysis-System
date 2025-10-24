<template>
  <div class="charts-display-area">
    <div
      class="nav-arrow prev"
      @click="previousView"
      v-show="currentView === 2"
      title="上一视图"
    >
      &lt;
    </div>

    <div class="charts-content">
      <div v-if="currentView === 1" class="chart-view view-one">
        <div class="chart-wrapper">
          <v-chart
            v-if="!isLoadingChartData && trendChartOptions.series && trendChartOptions.series.length > 0 && trendChartOptions.series[0] && trendChartOptions.series[0].data && trendChartOptions.series[0].data.length > 0"
            class="chart"
            :option="trendChartOptions"
            autoresize
          />
          <p v-else-if="isLoadingChartData" class="loading-text">趋势图数据加载中...</p>
          <p v-else class="loading-text">请先在左侧操作以生成趋势图数据。</p>
        </div>

        <div class="chart-wrapper">
          <v-chart
            v-if="!isLoadingChartData && confidenceChartOptions.series && confidenceChartOptions.series.length > 0 && confidenceChartOptions.series[0].data && confidenceChartOptions.series[0].data.length > 0"
            class="chart"
            :option="confidenceChartOptions"
            autoresize
          />
          <p v-else-if="isLoadingChartData && (!predictionResponse || !predictionResponse.predictions || predictionResponse.predictions.length === 0)" class="loading-text">等待预测数据以生成置信区间图...</p>
          <p v-else-if="isLoadingChartData" class="loading-text">置信区间图数据准备中...</p>
          <p v-else class="loading-text">请进行预测以查看置信区间图。</p>
        </div>
      </div>

      <div v-if="currentView === 2" class="chart-view view-two">
        <div class="chart-wrapper full-width-chart" ref="mapChartWrapper">
          <v-chart
            v-if="canRenderMapSelectedChartInternal" class="chart"
            :option="mapSelectedAreaChartOptions"
            autoresize
            ref="mapSelectedChartRef"
          />
          <p v-if="isLoadingMapSelectedData && currentView === 2" class="loading-text">地图选区数据加载中...</p>
          <p v-else-if="currentView === 2 && !canRenderMapSelectedChartInternal && !isLoadingMapSelectedData" class="loading-text">图表容器准备中或尺寸无效...</p>
          <p v-else-if="currentView === 2 && canRenderMapSelectedChartInternal && !hasValidMapData()" class="loading-text">请在地图上选择区域以查看该区域犯罪趋势。</p>
        </div>
      </div>
    </div>

    <div
      class="nav-arrow next"
      @click="nextView"
      v-show="currentView === 1"
      title="下一视图"
    >
      &gt;
    </div>
  </div>
</template>

<script>
import { use } from 'echarts/core';
import { CanvasRenderer } from 'echarts/renderers';
import { LineChart } from 'echarts/charts';
import {
  TitleComponent,
  TooltipComponent,
  LegendComponent,
  GridComponent,
  DataZoomComponent,
} from 'echarts/components';
import VChart, { THEME_KEY } from 'vue-echarts';
import { provide, computed } from 'vue';

use([
  CanvasRenderer,
  LineChart,
  TitleComponent,
  TooltipComponent,
  LegendComponent,
  GridComponent,
  DataZoomComponent,
]);

export default {
  name: 'PredictionCharts',
  components: { VChart },
  props: {
    predictionResponse: {
      type: Object,
      default: null,
    },
    actualHistoricalData: {
      type: Array,
      default: null,
    },
    mapSelectedAreaData: {
        type: Array,
        default: null,
    },
    isLoadingChartData: Boolean,
    isLoadingMapSelectedData: Boolean,
  },
  data() {
    return {
      currentView: 1,
      canRenderMapSelectedChartInternal: false,
      checkDimensionsInterval: null,
      checkDimensionsRetries: 0,
    };
  },
  setup(props) {
    // We'll define a custom theme object or apply styles directly to options
    // For this digital theme, we'll apply styles directly within the options
    // provide(THEME_KEY, 'light'); // Comment out or remove default light theme

    // Define colors from your CSS variables for consistency
    const digitalPrimaryColor = '#00FFFF'; // Bright Cyan
    const digitalBgColor = '#0A1838'; // Deep Blue
    const digitalTextColor = '#A0B0D0'; // Light Grey
    const digitalBorderColor = 'rgba(0, 255, 255, 0.3)'; // Cyan border for axis/grid

    const formatDateForChart = (isoString) => {
        if (!isoString) return '';
        const date = new Date(isoString);
        if (isNaN(date.getTime())) return isoString;
        return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`;
    };

    const trendChartOptions = computed(() => {
      const actuals = Array.isArray(props.actualHistoricalData) ? props.actualHistoricalData : [];
      const predictions = props.predictionResponse?.predictions || [];
      const allTimestampsEpoch = new Set([...actuals.map(d => new Date(d.timestamp).getTime()), ...predictions.map(d => new Date(d.timestamp).getTime())].filter(t => !isNaN(t)));
      const sortedTimestamps = Array.from(allTimestampsEpoch).sort((a, b) => a - b);
      const labels = sortedTimestamps.map(ts => formatDateForChart(new Date(ts).toISOString()));
      const actualDataSeries = sortedTimestamps.map(ts => { const found = actuals.find(d => new Date(d.timestamp).getTime() === ts); return found ? found.value : null; });
      const predDataSeries = sortedTimestamps.map(ts => { const found = predictions.find(d => new Date(d.timestamp).getTime() === ts); return found ? found.value : null; });

      if (labels.length === 0) {
        return {
          title: {
            text: '犯罪数量趋势 (等待数据)',
            left: 'center',
            textStyle: {
              fontSize: 16,
              color: digitalPrimaryColor, // Digital theme color
              textShadow: '0 0 5px rgba(0, 255, 255, 0.8)' // Glow effect
            }
          },
          series: []
        };
      }
      return {
        backgroundColor: 'transparent', // Transparent background to show wrapper bg
        title: {
          text: '犯罪数量趋势 (实际 vs. 预测)',
          left: 'center',
          textStyle: {
            fontSize: 18, // Slightly larger title
            color: digitalPrimaryColor, // Digital theme color
            textShadow: '0 0 8px rgba(0, 255, 255, 0.8)' // Stronger glow effect
          }
        },
        tooltip: {
          trigger: 'axis',
          valueFormatter: val => val != null ? Number(val).toFixed(2) : '-',
          backgroundColor: 'rgba(10, 24, 56, 0.9)', // Darker, semi-transparent tooltip
          borderColor: digitalPrimaryColor, // Cyan border
          borderWidth: 1,
          textStyle: {
            color: digitalTextColor, // Light grey text
          },
          axisPointer: {
            type: 'line',
            lineStyle: {
                color: digitalPrimaryColor, // Cyan crosshairs
                type: 'dashed'
            }
          }
        },
        legend: {
          data: ['实际数量', '预测数量'],
          top: 30,
          textStyle: {
            color: digitalTextColor // Light grey legend text
          },
          itemWidth: 15, // Icon width
          itemHeight: 15, // Icon height
        },
        grid: {
          left: '5%',
          right: '5%',
          bottom: '15%',
          containLabel: true,
          show: true, // Ensure grid lines are visible
          borderColor: 'transparent', // Hide grid border
          axisLine: {
            lineStyle: {
              color: digitalBorderColor // Cyan axis line
            }
          }
        },
        xAxis: {
          type: 'category',
          boundaryGap: false,
          data: labels,
          axisLine: {
            lineStyle: {
              color: digitalBorderColor // Cyan axis line
            }
          },
          axisLabel: {
            color: digitalTextColor // Light grey labels
          },
          splitLine: {
            show: true,
            lineStyle: {
              color: 'rgba(0, 255, 255, 0.1)' // Very light cyan grid lines
            }
          }
        },
        yAxis: {
          type: 'value',
          name: '数量',
          min: 0,
          axisLabel: {
            formatter: '{value}',
            color: digitalTextColor // Light grey labels
          },
          axisLine: {
            lineStyle: {
              color: digitalBorderColor // Cyan axis line
            }
          },
          splitLine: {
            show: true,
            lineStyle: {
              color: 'rgba(0, 255, 255, 0.1)' // Very light cyan grid lines
            }
          }
        },
        dataZoom: [
          {
            type: 'inside',
            start: 0,
            end: 100,
            handleStyle: {
                color: digitalPrimaryColor // Handle color
            }
          },
          {
            type: 'slider',
            start: 0,
            end: 100,
            bottom: 10,
            backgroundColor: 'rgba(0, 255, 255, 0.05)', // Background of the slider
            fillerColor: 'rgba(0, 255, 255, 0.2)', // Filled area of the slider
            borderColor: 'transparent', // No border for the slider
            textStyle: {
                color: digitalTextColor // Slider text color
            },
            handleStyle: {
                color: digitalPrimaryColor, // Slider handle color
                borderColor: digitalPrimaryColor // Slider handle border
            }
          }
        ],
        series: [
          {
            name: '实际数量',
            type: 'line',
            data: actualDataSeries,
            smooth: true,
            connectNulls: false,
            itemStyle: {
              color: digitalPrimaryColor // Bright Cyan for actuals
            },
            lineStyle: {
              width: 2,
              shadowColor: 'rgba(0, 255, 255, 0.8)', // Glow effect
              shadowBlur: 10
            },
            emphasis: { focus: 'series' }
          },
          {
            name: '预测数量',
            type: 'line',
            data: predDataSeries,
            smooth: true,
            lineStyle: {
              type: 'dashed',
              width: 2,
              color: '#FFD700', // Gold/Yellow for predictions
              shadowColor: 'rgba(255, 215, 0, 0.8)', // Glow effect
              shadowBlur: 10
            },
            connectNulls: false,
            itemStyle: {
              color: '#FFD700' // Gold/Yellow
            },
            emphasis: { focus: 'series' }
          }
        ]
      };
    });

    const confidenceChartOptions = computed(() => {
      const predictionsArray = props.predictionResponse?.predictions || [];
      const historicalArray = Array.isArray(props.actualHistoricalData) ? props.actualHistoricalData : [];
      const numPredictionSteps = props.predictionResponse?.steps || predictionsArray.length;

      if (!predictionsArray.length || numPredictionSteps === 0) {
        return {
          title: {
            text: '预测与置信区间 (等待预测数据)',
            left: 'center',
            textStyle: {
              fontSize: 16,
              color: digitalPrimaryColor, // Digital theme color
              textShadow: '0 0 5px rgba(0, 255, 255, 0.8)' // Glow effect
            }
          },
          series: []
        };
      }

      const hasConfidenceData = predictionsArray.every(p => p.lower != null && p.upper != null);
      const predictionTimestamps = predictionsArray.map(p => formatDateForChart(p.timestamp));
      const predictedValues = predictionsArray.map(p => p.value);
      const lowerCIPoints = hasConfidenceData ? predictionsArray.map(p => p.lower) : null;
      const upperCIPoints = hasConfidenceData ? predictionsArray.map(p => p.upper) : null;

      const sortedHistorical = [...historicalArray].sort((a, b) => new Date(a.timestamp) - new Date(b.timestamp));
      const lastNHistoricalValues = sortedHistorical.slice(-numPredictionSteps).map(h => h.value);
      const historicalComparisonSeriesData = new Array(numPredictionSteps).fill(null);
      const historyStartIndex = Math.max(0, numPredictionSteps - lastNHistoricalValues.length);
      for (let i = 0; i < lastNHistoricalValues.length; i++) { historicalComparisonSeriesData[historyStartIndex + i] = lastNHistoricalValues[i];}

      const series = [
        {
          name: `实际值 (过去${lastNHistoricalValues.length}期)`,
          type: 'line',
          data: historicalComparisonSeriesData,
          smooth: true,
          itemStyle: { color: digitalPrimaryColor }, // Cyan for historical comparison
          lineStyle: {
            width: 2,
            type: 'dotted',
            shadowColor: 'rgba(0, 255, 255, 0.5)', // Glow effect
            shadowBlur: 8
          },
          emphasis: { focus: 'series' }
        },
        {
          name: '预测值',
          type: 'line',
          data: predictedValues,
          smooth: true,
          itemStyle: { color: '#FFD700' }, // Gold/Yellow for predictions
          lineStyle: {
            width: 2,
            shadowColor: 'rgba(255, 215, 0, 0.8)', // Glow effect
            shadowBlur: 10
          },
          emphasis: { focus: 'series' },
          z: 10,
        }
      ];

      if (hasConfidenceData && lowerCIPoints && upperCIPoints) {
        series.push(
          { name: 'CI Lower Helper', type: 'line', data: lowerCIPoints, lineStyle: { opacity: 0 }, symbol: 'none', stack: 'confidence_interval_area', },
          {
            name: '置信区间',
            type: 'line',
            data: upperCIPoints.map((up, i) => (up != null && lowerCIPoints[i] != null) ? (up - lowerCIPoints[i]) : null),
            lineStyle: { opacity: 0 },
            symbol: 'none',
            areaStyle: {
              color: 'rgba(0, 255, 255, 0.1)' // Light cyan fill for CI
            },
            emphasis: { focus: 'series' },
            stack: 'confidence_interval_area',
          }
        );
      }

      const legendData = ['预测值', `实际值 (过去${lastNHistoricalValues.length}期)`];
      if (hasConfidenceData) legendData.push('置信区间');

      return {
        backgroundColor: 'transparent', // Transparent background to show wrapper bg
        title: {
          text: '预测置信区间与历史对比',
          left: 'center',
          textStyle: {
            fontSize: 18,
            color: digitalPrimaryColor,
            textShadow: '0 0 8px rgba(0, 255, 255, 0.8)'
          }
        },
        tooltip: {
          trigger: 'axis',
          formatter: (params) => {
            let res = params[0].name + '<br/>';
            params.forEach(item => {
              if (item.seriesName === 'CI Lower Helper') return;
              if (item.seriesName === '置信区间') {
                const originalIndex = predictionTimestamps.indexOf(item.name);
                if (originalIndex !== -1 && lowerCIPoints && upperCIPoints) {
                  const lowerVal = lowerCIPoints[originalIndex];
                  const upperVal = upperCIPoints[originalIndex] + (lowerCIPoints[originalIndex] || 0) ;
                  const predVal = predictedValues[originalIndex];
                  if (lowerVal != null && upperVal != null) {
                    res += `${item.marker}${item.seriesName}: ${Number(lowerVal).toFixed(2)} - ${Number(upperVal).toFixed(2)} (预测: ${Number(predVal).toFixed(2)})<br/>`;
                  }
                }
              } else {
                res += `${item.marker}${item.seriesName}: ${item.value != null ? Number(item.value).toFixed(2) : '-'}<br/>`;
              }
            });
            return res;
          },
          backgroundColor: 'rgba(10, 24, 56, 0.9)',
          borderColor: digitalPrimaryColor,
          borderWidth: 1,
          textStyle: {
            color: digitalTextColor,
          },
          axisPointer: {
            type: 'line',
            lineStyle: {
                color: digitalPrimaryColor,
                type: 'dashed'
            }
          }
        },
        legend: {
          data: legendData,
          top: 30,
          textStyle: {
            color: digitalTextColor
          },
          itemWidth: 15,
          itemHeight: 15,
        },
        grid: {
          left: '5%',
          right: '5%',
          bottom: '15%',
          containLabel: true,
          show: true,
          borderColor: 'transparent',
          axisLine: {
            lineStyle: {
              color: digitalBorderColor
            }
          }
        },
        xAxis: {
          type: 'category',
          boundaryGap: false,
          data: predictionTimestamps,
          axisLine: {
            lineStyle: {
              color: digitalBorderColor
            }
          },
          axisLabel: {
            color: digitalTextColor
          },
          splitLine: {
            show: true,
            lineStyle: {
              color: 'rgba(0, 255, 255, 0.1)'
            }
          }
        },
        yAxis: {
          type: 'value',
          name: '数量',
          min: 0,
          axisLabel: {
            formatter: '{value}',
            color: digitalTextColor
          },
          axisLine: {
            lineStyle: {
              color: digitalBorderColor
            }
          },
          splitLine: {
            show: true,
            lineStyle: {
              color: 'rgba(0, 255, 255, 0.1)'
            }
          }
        },
        dataZoom: [
          {
            type: 'inside',
            start: 0,
            end: 100,
            handleStyle: {
                color: digitalPrimaryColor
            }
          },
          {
            type: 'slider',
            start: 0,
            end: 100,
            bottom: 10,
            backgroundColor: 'rgba(0, 255, 255, 0.05)',
            fillerColor: 'rgba(0, 255, 255, 0.2)',
            borderColor: 'transparent',
            textStyle: {
                color: digitalTextColor
            },
            handleStyle: {
                color: digitalPrimaryColor,
                borderColor: digitalPrimaryColor
            }
          }
        ],
        series: series,
      };
    });

    const mapSelectedAreaChartOptions = computed(() => {
      const mapDataInput = props.mapSelectedAreaData;
      let data = [];
      if (Array.isArray(mapDataInput)) { data = mapDataInput; }
      else if (mapDataInput && Array.isArray(mapDataInput.timestamps) && Array.isArray(mapDataInput.values)) { data = mapDataInput.timestamps.map((ts, index) => ({ timestamp: ts, value: mapDataInput.values[index] }));}

      if (!data.length) {
        return {
          title: {
            text: '地图选区犯罪趋势 (等待选区)',
            left: 'center',
            textStyle: {
              fontSize: 16,
              color: digitalPrimaryColor, // Digital theme color
              textShadow: '0 0 5px rgba(0, 255, 255, 0.8)' // Glow effect
            }
          },
          series: []
        };
      }

      const labels = data.map(d => formatDateForChart(d.timestamp));
      const values = data.map(d => d.value);

      return {
          backgroundColor: 'transparent', // Transparent background to show wrapper bg
          title: {
              text: '地图选区犯罪趋势',
              left: 'center',
              textStyle: {
                  fontSize: 18,
                  color: digitalPrimaryColor,
                  textShadow: '0 0 8px rgba(0, 255, 255, 0.8)'
              }
          },
          tooltip: {
            trigger: 'axis',
            valueFormatter: val => val != null ? Number(val).toFixed(2) : '-',
            backgroundColor: 'rgba(10, 24, 56, 0.9)',
            borderColor: digitalPrimaryColor,
            borderWidth: 1,
            textStyle: {
              color: digitalTextColor,
            },
            axisPointer: {
                type: 'line',
                lineStyle: {
                    color: digitalPrimaryColor,
                    type: 'dashed'
                }
            }
          },
          legend: {
            data: ['选定区域犯罪数量'],
            top: 30,
            textStyle: {
                color: digitalTextColor
            },
            itemWidth: 15,
            itemHeight: 15,
          },
          grid: {
            left: '5%',
            right: '5%',
            bottom: '15%',
            containLabel: true,
            show: true,
            borderColor: 'transparent',
            axisLine: {
              lineStyle: {
                color: digitalBorderColor
              }
            }
          },
          xAxis: {
              type: 'category',
              boundaryGap: false,
              data: labels,
              axisLine: {
                lineStyle: {
                  color: digitalBorderColor
                }
              },
              axisLabel: {
                color: digitalTextColor
              },
              splitLine: {
                show: true,
                lineStyle: {
                  color: 'rgba(0, 255, 255, 0.1)'
                }
              }
          },
          yAxis: {
              type: 'value',
              name: '数量',
              min: 0,
              axisLabel: {
                formatter: '{value}',
                color: digitalTextColor
              },
              axisLine: {
                lineStyle: {
                  color: digitalBorderColor
                }
              },
              splitLine: {
                show: true,
                lineStyle: {
                  color: 'rgba(0, 255, 255, 0.1)'
                }
              }
          },
          dataZoom: [{
              type: 'inside',
              start: 0,
              end: 100,
              handleStyle: {
                color: digitalPrimaryColor
              }
          }, {
              type: 'slider',
              start: 0,
              end: 100,
              bottom: 10,
              backgroundColor: 'rgba(0, 255, 255, 0.05)',
              fillerColor: 'rgba(0, 255, 255, 0.2)',
              borderColor: 'transparent',
              textStyle: {
                color: digitalTextColor
              },
              handleStyle: {
                color: digitalPrimaryColor,
                borderColor: digitalPrimaryColor
              }
          }],
          series: [
            {
              name: '选定区域犯罪数量',
              type: 'line',
              data: values,
              smooth: true,
              itemStyle: { color: digitalPrimaryColor }, // Cyan for map selected data
              lineStyle: {
                width: 2,
                shadowColor: 'rgba(0, 255, 255, 0.8)', // Glow effect
                shadowBlur: 10
              },
              areaStyle: { color: 'rgba(0, 255, 255, 0.2)' }, // Cyan area fill
              emphasis: { focus: 'series' }
            }
          ]
      };
    });

    return {
        trendChartOptions,
        confidenceChartOptions,
        mapSelectedAreaChartOptions
    };
  },
  watch: {
    currentView(newVal, oldVal) {
      if (newVal === 2) {
        console.log('[PredictionCharts] 视图切换到 2。开始初始化地图选区图表。');
        this.initMapSelectedChart();
      } else if (oldVal === 2 && newVal !== 2) {
        console.log('[PredictionCharts] 离开视图 2。清理地图选区图表状态。');
        this.canRenderMapSelectedChartInternal = false;
        this.clearDimensionCheckInterval();
      }
    },

    isLoadingMapSelectedData(newVal, oldVal) {
      if (this.currentView === 2 && this.canRenderMapSelectedChartInternal && oldVal === true && newVal === false) {
        console.log('[PredictionCharts] 地图选区数据已加载，图表已显示，尝试 resize。');
        this.$nextTick(() => {
          const chartComponent = this.$refs.mapSelectedChartRef;
          if (chartComponent && typeof chartComponent.resize === 'function') {
            chartComponent.resize();
          }
        });
      }
    },

    mapSelectedAreaData: {
      handler() {
        console.log('[PredictionCharts] mapSelectedAreaData 数据变化，图表将自动更新 (如果已渲染)。');
        if (this.currentView === 2 && this.canRenderMapSelectedChartInternal) {
          this.$nextTick(() => {
            const chartComponent = this.$refs.mapSelectedChartRef;
            if (chartComponent && typeof chartComponent.resize === 'function') {
              // chartComponent.resize(); // Usually not needed as ECharts reacts to option changes
            }
          });
        }
      },
      deep: true
    }
  },
  methods: {
    hasValidMapData() {
      const dataInput = this.mapSelectedAreaData;
      if (Array.isArray(dataInput) && dataInput.length > 0) return true;
      if (dataInput && Array.isArray(dataInput.timestamps) && dataInput.values && dataInput.values.length > 0) return true;
      return false;
    },

    initMapSelectedChart() {
      console.log('[PredictionCharts] 调用 initMapSelectedChart。');
      this.canRenderMapSelectedChartInternal = false;
      this.clearDimensionCheckInterval();

      this.$nextTick(() => {
        const chartWrapper = this.$refs.mapChartWrapper;
        if (!chartWrapper) {
          console.error('[PredictionCharts] $nextTick 后 mapChartWrapper ref 未找到。');
          return;
        }

        this.checkDimensionsRetries = 0;

        const attemptRender = () => {
          const width = chartWrapper.clientWidth;
          const height = chartWrapper.clientHeight;
          console.log(`[PredictionCharts] 检查 mapChartWrapper 尺寸: ${width}x${height}, 重试次数: ${this.checkDimensionsRetries}`);

          if (width > 0 && height > 0) {
            console.log('[PredictionCharts] mapChartWrapper 尺寸有效。准备渲染 <v-chart>。');
            this.canRenderMapSelectedChartInternal = true;
            this.clearDimensionCheckInterval();

            this.$nextTick(() => {
              const chartComponent = this.$refs.mapSelectedChartRef;
              if (chartComponent && typeof chartComponent.resize === 'function') {
                console.log('[PredictionCharts] mapSelectedChartRef 已挂载，调用 resize()。');
                chartComponent.resize();
              } else if (this.canRenderMapSelectedChartInternal) {
                console.warn('[PredictionCharts] <v-chart> 渲染后，mapSelectedChartRef 未找到或 resize 方法不可用。');
              }
            });
          } else {
            this.checkDimensionsRetries++;
            if (this.checkDimensionsRetries <= 15) {
              this.checkDimensionsInterval = setTimeout(attemptRender, 100);
            } else {
              console.error('[PredictionCharts] 已达到最大重试次数。mapChartWrapper 尺寸仍然无效。ECharts 可能无法正确初始化。');
              this.clearDimensionCheckInterval();
            }
          }
        };
        attemptRender();
      });
    },

    clearDimensionCheckInterval() {
      if (this.checkDimensionsInterval) {
        clearTimeout(this.checkDimensionsInterval);
        this.checkDimensionsInterval = null;
        console.log('[PredictionCharts] 清除了尺寸检查定时器。');
      }
    },

    nextView() {
      if (this.currentView === 1) {
        this.currentView = 2;
      }
    },

    previousView() {
      if (this.currentView === 2) {
        this.currentView = 1;
      }
    },
  },
  beforeUnmount() {
    this.clearDimensionCheckInterval();
  }
};
</script>

<style scoped>
/* 全局变量和基本样式，覆盖 Element Plus 默认样式 */
:root {
  --digital-bg-color: #0A1838; /* 深蓝背景 */
  --digital-primary-color: #00FFFF; /* 亮青色 */
  --digital-secondary-color: #007BFF; /* 亮蓝色（可用于强调色） */
  --digital-text-color: #A0B0D0; /* 浅灰色文字 */
  --digital-border-color: #00FFFF; /* 边框颜色 */
  --digital-glow-color: #00FFFF; /* 发光颜色 */
  --digital-panel-bg: rgba(10, 24, 56, 0.7); /* 面板背景透明度 */
  --header-height: 80px; /* 头部高度 */
}

.charts-display-area {
  display: flex;
  align-items: center;
  position: relative;
  width: 100%;
  padding: 0 40px;
  box-sizing: border-box;
  /* 图表区域背景通常由父容器 content-area 提供，这里不需要额外背景 */
}

.charts-content {
  flex-grow: 1;
  width: 100%;
  overflow: hidden;
}

/* 导航箭头样式 */
.nav-arrow {
  position: absolute;
  top: 50%;
  transform: translateY(-50%);
  width: 40px; /* 稍微大一点 */
  height: 60px; /* 稍微大一点 */
  background-color: rgba(0, 255, 255, 0.15); /* 半透明亮青色背景 */
  color: var(--digital-primary-color); /* 亮青色箭头 */
  display: flex;
  align-items: center;
  justify-content: center;
  cursor: pointer;
  border-radius: 8px; /* 更大圆角 */
  font-size: 24px; /* 更大字体 */
  font-weight: bold;
  user-select: none;
  transition: all 0.3s ease; /* 更平滑过渡 */
  z-index: 10;
  border: 1px solid rgba(0, 255, 255, 0.4); /* 亮青色边框 */
  box-shadow: 0 0 10px rgba(0, 255, 255, 0.6); /* 强烈发光 */
}

.nav-arrow:hover {
  background-color: rgba(0, 255, 255, 0.3); /* 悬停时更亮 */
  color: #00E5E5; /* 悬停时更亮的青色 */
  box-shadow: 0 0 20px rgba(0, 255, 255, 0.9); /* 悬停时更强发光 */
  transform: translateY(-50%) scale(1.05); /* 悬停时轻微放大 */
}

.nav-arrow.prev {
  left: 5px;
}

.nav-arrow.next {
  right: 5px;
}

.chart-view {
  display: flex;
  width: 100%;
  box-sizing: border-box;
  /* gap 属性将由 view-one 和 view-two 中的父容器控制 */
}

.chart-view.view-one {
  flex-direction: row;
  gap: 20px; /* 图表间距 */
}

.chart-view.view-two {
  flex-direction: column;
  gap: 20px; /* 图表间距 */
}

/* 单个图表容器 */
.chart-wrapper {
  background-color: rgba(0, 0, 0, 0.3); /* 更透明的图表背景 */
  padding: 20px; /* 增加内边距 */
  border-radius: 8px; /* 圆角 */
  border: 1px solid rgba(0, 255, 255, 0.15); /* 半透明亮青色边框 */
  box-shadow: inset 0 0 8px rgba(0, 255, 255, 0.1); /* 内发光效果 */
  height: 350px;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  box-sizing: border-box;
  position: relative;
  transition: all 0.3s ease; /* 添加过渡效果 */
}

.chart-wrapper:hover {
  box-shadow: inset 0 0 15px rgba(0, 255, 255, 0.4), 0 0 15px rgba(0, 255, 255, 0.2); /* 悬浮时更强内发光和外发光 */
  transform: translateY(-2px); /* 悬浮时轻微上浮 */
}

/* 当 v-chart 存在时，它应该填满 wrapper */
.chart-wrapper .chart {
  width: 100%;
  height: 100%;
  position: absolute;
  top: 0;
  left: 0;
  /* 确保图表内容不会被 wrapper 的 padding 挤压 */
  padding: inherit; /* 继承父容器的 padding */
  box-sizing: border-box;
}

.view-one .chart-wrapper {
  flex-basis: calc(50% - 10px); /* 保持 50% 宽度，减去一半的 gap */
  min-width: 300px;
}

.view-two .chart-wrapper {
  width: 100%;
}

/* 加载文本样式 */
.loading-text {
  color: var(--digital-text-color); /* 使用浅灰色文字 */
  text-align: center;
  font-size: 1.1em; /* 稍微大一点 */
  padding: 20px;
  opacity: 0.7; /* 稍微降低透明度 */
}

@media (max-width: 768px) {
  .charts-display-area {
    padding: 0 10px;
  }
  .nav-arrow {
    width: 30px;
    height: 50px;
    font-size: 18px;
  }
  .nav-arrow.prev {
    left: 2px;
  }
  .nav-arrow.next {
    right: 2px;
  }

  .chart-view.view-one {
    flex-direction: column;
    gap: 15px; /* 移动端减小间距 */
  }
  .view-one .chart-wrapper {
    flex-basis: 100%;
    min-width: auto;
    margin-bottom: 0; /* 在 column 布局下由 gap 控制间距 */
  }
}
</style>