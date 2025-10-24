<!-- OSMMap.vue -->
<template>
  <div class="map-container">
    <l-map
      ref="map"
      v-model:zoom="zoom"
      :center="center"
      :maxBounds="maxBounds"
      :minZoom="minZoom"
      style="height: 100%; width: 100%;"
      @ready="onMapReady"
    >
      <l-tile-layer
        url="https://tiles.stadiamaps.com/tiles/alidade_smooth_dark/{z}/{x}/{y}{r}.png"
        layer-type="base"
        name="Stadia Alidade Smooth Dark"
        attribution='&copy; <a href="https://stadiamaps.com/" target="_blank">Stadia Maps</a> &copy; <a href="https://openmaptiles.org/" target="_blank">OpenMapTiles</a> &copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
      ></l-tile-layer>

      <l-marker v-for="crime in crimeMarkers" :key="crime.id" :lat-lng="crime.coordinates">
        <l-popup>
          <div>
            <strong>{{ crime.name }}</strong><br>
            状态: {{ crime.status }}<br>
            详情: {{ crime.details }}
          </div>
        </l-popup>
        <l-tooltip>{{ crime.name }}</l-tooltip>
      </l-marker>

    </l-map>
  </div>
</template>

<script>
import "leaflet/dist/leaflet.css";
// import "leaflet-draw/dist/leaflet.draw.css"; // 我们将通过 CSS 重新定义样式，或重度覆盖
import L from "leaflet";
import "leaflet-draw"; // 导入 leaflet-draw JS

import { LMap, LTileLayer, LMarker, LPopup, LTooltip } from "@vue-leaflet/vue-leaflet";

// Washington D.C. Bounds (approximate)
const dcBounds = [
  [38.791644, -77.119766], // Southwest
  [39.022000, -76.909393]   // Northeast
];

export default {
  name: 'OSMMap',
  components: {
    LMap,
    LTileLayer,
    LMarker,
    LPopup,
    LTooltip,
  },
  props: {
    crimeMarkers: {
      type: Array,
      default: () => []
    }
  },
  data() {
    return {
      zoom: 12,
      center: [38.9072, -77.0369], // Washington D.C.
      maxBounds: L.latLngBounds(dcBounds[0], dcBounds[1]), // Restrict map to DC
      minZoom: 11, // Minimum zoom level to keep DC in view
      mapInstance: null,
      drawnItems: null, // Layer group for drawn items
    };
  },
  emits: ['area-selected'], // Declare emitted event
  methods: {
    onMapReady(mapObject) {
      this.mapInstance = mapObject;
      this.initLeafletDraw();
      this.customizeLeafletElements(); // 新增：自定义 Leaflet 元素样式
    },
    initLeafletDraw() {
      if (!this.mapInstance) return;

      this.drawnItems = new L.FeatureGroup();
      this.mapInstance.addLayer(this.drawnItems);

      // 定义数字主题颜色，与 CSS 变量保持一致
      const digitalPrimaryColor = '#00FFFF'; // 亮青色
      // const digitalGlowColor = 'rgba(0, 255, 255, 0.8)'; // 用于发光效果
      // const digitalPanelBg = 'rgba(10, 24, 56, 0.7)'; // 用于面板背景

      const drawControl = new L.Control.Draw({
        edit: {
          featureGroup: this.drawnItems,
          remove: true // 允许移除已绘制图形
        },
        draw: {
          polygon: {
            allowIntersection: false,
            drawError: {
              color: '#FFD700', // 警告颜色：金黄色
              message: '<strong>警告！</strong> 绘制区域超出允许范围或与其他图形交叉！'
            },
            shapeOptions: {
              color: digitalPrimaryColor, // 绘制时的青色边框
              fillColor: 'rgba(0, 255, 255, 0.2)', // 浅青色填充
              weight: 3, // 更粗的线条
              opacity: 1,
              fillOpacity: 0.3,
              dashArray: '5, 5', // 虚线
              pane: 'markerPane' // 有助于 z-index
            },
          },
          polyline: false,
          rectangle: {
            shapeOptions: {
              color: digitalPrimaryColor, // 绘制时的青色边框
              fillColor: 'rgba(0, 255, 255, 0.2)', // 浅青色填充
              weight: 3,
              opacity: 1,
              fillOpacity: 0.3,
              dashArray: '5, 5'
            }
          },
          circle: false,
          marker: false,
          circlemarker: false,
        }
      });
      this.mapInstance.addControl(drawControl);

      this.mapInstance.on(L.Draw.Event.CREATED, (event) => {
        const layer = event.layer;
        this.drawnItems.clearLayers(); // 清除之前的绘图
        this.drawnItems.addLayer(layer);

        // 绘制完成后，更改样式为实线并增加填充不透明度
        layer.setStyle({
          color: digitalPrimaryColor,
          fillColor: 'rgba(0, 255, 255, 0.4)', // 略微不透明的填充
          weight: 3,
          opacity: 1,
          fillOpacity: 0.4,
          dashArray: '', // 实线
        });

        const geoJson = layer.toGeoJSON();
        const bounds = layer.getBounds();

        if (bounds) {
          geoJson.bbox = [
            bounds.getWest(),
            bounds.getSouth(),
            bounds.getEast(),
            bounds.getNorth()
          ];
        }

        console.log("Shape drawn (GeoJSON with bbox):", geoJson);

        if (this.isLayerWithinDC(layer)) {
            this.$emit('area-selected', geoJson);
        } else {
            alert("选定区域超出了华盛顿DC范围，请重新选择。");
            this.drawnItems.clearLayers(); // 移除无效绘图
            this.$emit('area-selected', null); // 清除选区时也通知父组件
        }
      });

      this.mapInstance.on(L.Draw.Event.EDITED, (event) => {
        event.layers.eachLayer(layer => {
          const geoJson = layer.toGeoJSON();
          const bounds = layer.getBounds();

          if (bounds) {
            geoJson.bbox = [
              bounds.getWest(),
              bounds.getSouth(),
              bounds.getEast(),
              bounds.getNorth()
            ];
          }

          console.log("Shape edited (GeoJSON with bbox):", geoJson);

            if (this.isLayerWithinDC(layer)) {
                this.$emit('area-selected', geoJson);
            } else {
                alert("编辑后的区域超出了华盛顿DC范围。请调整或删除。");
            }
        });
      });

      this.mapInstance.on(L.Draw.Event.DELETED, () => {
          console.log("Shape deleted");
          this.$emit('area-selected', null); // 通知父组件选区已清除
      });
    },
    // 新增方法：自定义 Leaflet 默认元素样式
    customizeLeafletElements() {
        // 定义主题颜色
        const digitalPrimaryColor = '#00FFFF'; // 亮青色
        const digitalTextColor = '#A0B0D0'; // 浅灰色文字
        const digitalPanelBg = 'rgba(10, 24, 56, 0.9)'; // 用于弹窗/工具提示的深色半透明背景

        // --- 自定义默认 Marker 图标 ---
        // 删除 Leaflet 默认图标的 URL 修复，这样可以避免一些 CDN 问题或使用自定义图标
        delete L.Icon.Default.prototype._getIconUrl;

        // 设置 Leaflet 默认图标，指向本地资源。
        // 如果你需要自定义颜色的 Marker，通常会引入 'leaflet-color-markers' 库
        // 或者使用 SVG data URI 来创建自定义颜色的 Marker。
        // 示例：使用 leaflet-color-markers 中的青色图标（需要安装该库）
        // import 'leaflet-color-markers/dist/leaflet-color-markers.css';
        // import 'leaflet-color-markers/dist/leaflet-color-markers.min.js'; // 假设你导入了 js
        // L.Marker.prototype.options.icon = new L.Icon.Default({ iconUrl: 'https://raw.githubusercontent.com/pointhi/leaflet-color-markers/master/img/marker-icon-2x-cyan.png' });
        // 或者简单地指向本地默认图标（如果你的项目正确配置了 asset loaders）
        L.Icon.Default.mergeOptions({
            iconRetinaUrl: require('leaflet/dist/images/marker-icon-2x.png'),
            iconUrl: require('leaflet/dist/images/marker-icon.png'),
            shadowUrl: require('leaflet/dist/images/marker-shadow.png'),
        });


        // --- 自定义 L.Popup (弹窗) ---
        L.Popup.prototype.options.className = 'digital-popup';
        L.Popup.prototype.options.closeButton = true; // 保留关闭按钮

        // --- 自定义 L.Tooltip (工具提示) ---
        L.Tooltip.prototype.options.className = 'digital-tooltip';
    },
    isLayerWithinDC(layer) {
      if (!layer) return false;
      const layerBounds = layer.getBounds ? layer.getBounds() : null;
      if (layerBounds) {
          // 检查图层边界是否完全包含在 DC 的最大边界内
          return this.maxBounds.contains(layerBounds);
      }
      return true; // 简单检查的备用方案
    }
  },
  mounted() {
    // onMapReady 会处理地图初始化后的操作
  }
};
</script>

<style scoped>
/* 定义你的全局主题变量，如果它们不在共享文件中，可以放在这里 */
:root {
  --digital-bg-color: #0A1838; /* 深蓝背景 */
  --digital-primary-color: #00FFFF; /* 亮青色 */
  --digital-secondary-color: #007BFF; /* 亮蓝色 */
  --digital-text-color: #A0B0D0; /* 浅灰色文字 */
  --digital-border-color: #00FFFF; /* 边框颜色 (亮青色) */
  --digital-glow-color: #00FFFF; /* 发光颜色 */
  --digital-panel-bg: rgba(10, 24, 56, 0.7); /* 面板背景 (半透明深蓝) */
}

.map-container {
  height: 400px;
  width: 100%;
  border: 1px solid var(--digital-border-color); /* 青色边框 */
  box-shadow: 0 0 15px var(--digital-glow-color); /* 地图周围的强烈发光 */
  background-color: var(--digital-bg-color); /* 地图容器的背景色 */
  overflow: hidden; /* 确保发光不溢出 */
  position: relative; /* 为内部元素的定位做准备 */
  border-radius: 8px; /* 与面板圆角匹配 */
  flex-shrink: 0; /* 防止在 flex 容器中被压缩 */
}

/* 如果你使用原始 OSM 图层并应用 CSS 滤镜来使其变暗，请取消以下注释 */
/*
.dark-map-tiles {
  filter: brightness(0.6) invert(1) hue-rotate(180deg) saturate(2);
  mix-blend-mode: hard-light;
}
*/

/* --- Leaflet 地图控件和 UI 元素 --- */

/* 通用 Leaflet 容器调整 */
.leaflet-container {
  background-color: var(--digital-bg-color); /* 地图背景色 */
  color: var(--digital-text-color); /* 地图元素的文字颜色 */
}

/* 缩放控件 */
.leaflet-control-zoom-in,
.leaflet-control-zoom-out {
  background-color: var(--digital-panel-bg) !important; /* 半透明面板背景 */
  color: var(--digital-primary-color) !important; /* 青色文字 */
  border: 1px solid var(--digital-border-color) !important; /* 青色边框 */
  border-radius: 4px !important;
  font-weight: bold;
  font-size: 1.2em !important;
  line-height: 28px !important; /* 调整以使图标居中 */
  text-align: center;
  transition: all 0.2s ease;
  box-shadow: 0 0 5px rgba(0, 255, 255, 0.5); /* 柔和发光 */
}

.leaflet-control-zoom-in:hover,
.leaflet-control-zoom-out:hover {
  background-color: rgba(0, 255, 255, 0.15) !important; /* 悬停时更亮的透明青色 */
  color: #00E5E5 !important; /* 悬停时更亮的青色 */
  box-shadow: 0 0 10px rgba(0, 255, 255, 0.8) !important; /* 更强发光 */
}

.leaflet-control-zoom-out {
  margin-top: 5px !important;
}

/* 归属信息文字 */
.leaflet-control-attribution a {
  color: var(--digital-text-color) !important;
  opacity: 0.7;
}
.leaflet-control-attribution a:hover {
  color: var(--digital-primary-color) !important;
  opacity: 1;
}
.leaflet-control-attribution {
  background-color: rgba(0, 0, 0, 0.5) !important; /* 更深的透明背景 */
  color: var(--digital-text-color) !important;
  padding: 2px 6px !important;
  border-radius: 4px;
}

/* --- Leaflet 弹窗和工具提示 --- */

/* 自定义弹窗样式 */
.digital-popup .leaflet-popup-content-wrapper {
  background-color: var(--digital-panel-bg); /* 半透明深蓝 */
  color: var(--digital-text-color); /* 浅灰色文字 */
  border-radius: 8px;
  box-shadow: 0 0 15px rgba(0, 255, 255, 0.6); /* 青色发光 */
  padding: 15px;
  border: 1px solid var(--digital-border-color); /* 青色边框 */
}

.digital-popup .leaflet-popup-content {
  margin: 0;
  font-size: 0.95em;
  line-height: 1.5;
}

/* 弹窗小三角（尖角） */
.digital-popup .leaflet-popup-tip {
  background-color: var(--digital-panel-bg); /* 匹配弹窗主体背景 */
  /* Leaflet 的尖角是 SVG，box-shadow 不能直接作用，但我们可以给其容器加滤镜 */
}
.digital-popup .leaflet-popup-tip-container {
    filter: drop-shadow(0 0 8px rgba(0, 255, 255, 0.6)); /* 对整个尖角容器应用发光滤镜 */
}

.digital-popup .leaflet-popup-close-button {
  color: var(--digital-primary-color); /* 青色关闭按钮 */
  font-size: 1.5em;
  padding: 0 5px 0 0;
  transition: color 0.2s ease;
}
.digital-popup .leaflet-popup-close-button:hover {
  color: #00E5E5; /* 悬停时更亮的青色 */
}

/* 自定义工具提示样式 */
.digital-tooltip.leaflet-tooltip {
  background-color: rgba(10, 24, 56, 0.8); /* 更深、更不透明的背景 */
  color: var(--digital-primary-color); /* 工具提示的青色文字 */
  border: 1px solid var(--digital-border-color); /* 青色边框 */
  border-radius: 5px;
  box-shadow: 0 0 10px rgba(0, 255, 255, 0.7); /* 更强发光 */
  font-weight: bold;
  padding: 6px 10px;
  pointer-events: none; /* 工具提示不应阻挡地图交互 */
}

/* 确保工具提示的尖角颜色与主体匹配 */
.digital-tooltip.leaflet-tooltip.leaflet-tooltip-bottom:before,
.digital-tooltip.leaflet-tooltip.leaflet-tooltip-top:before,
.digital-tooltip.leaflet-tooltip.leaflet-tooltip-left:before,
.digital-tooltip.leaflet-tooltip.leaflet-tooltip-right:before {
    background-color: rgba(10, 24, 56, 0.8); /* 匹配工具提示主体背景 */
    filter: drop-shadow(0 0 5px rgba(0, 255, 255, 0.6)); /* 给尖角添加发光 */
}

/* --- Leaflet Draw 绘图控件 --- */

/* 主绘图控制条 */
.leaflet-draw-toolbar,
.leaflet-draw-actions {
  background-color: var(--digital-panel-bg) !important; /* 半透明深蓝 */
  border: 1px solid var(--digital-border-color) !important; /* 青色边框 */
  border-radius: 8px !important;
  box-shadow: 0 0 15px rgba(0, 255, 255, 0.7) !important; /* 强烈发光 */
  padding: 5px !important;
  opacity: 0.95;
}

/* 单个绘图按钮 */
.leaflet-draw-toolbar a {
  background-color: transparent !important;
  color: var(--digital-primary-color) !important; /* 青色图标 */
  text-shadow: 0 0 5px rgba(0, 255, 255, 0.6); /* 图标发光 */
  border: none !important;
  border-radius: 4px;
  margin: 2px;
  transition: all 0.2s ease;
}

.leaflet-draw-toolbar a:hover,
.leaflet-draw-toolbar a.leaflet-draw-draw-shape-enabled { /* 悬停/激活按钮 */
  background-color: rgba(0, 255, 255, 0.1) !important; /* 浅透明青色 */
  color: #00E5E5 !important; /* 更亮的青色 */
  box-shadow: 0 0 8px rgba(0, 255, 255, 0.9) !important; /* 悬停/激活时更强发光 */
}

/* 绘图工具条提示文字 (例如 "绘制多边形") */
.leaflet-draw-tooltip {
  background-color: rgba(10, 24, 56, 0.9) !important; /* 深透明背景 */
  color: var(--digital-primary-color) !important; /* 青色文字 */
  border: 1px solid var(--digital-border-color) !important; /* 青色边框 */
  box-shadow: 0 0 10px rgba(0, 255, 255, 0.7) !important; /* 强烈发光 */
  border-radius: 5px !important;
  font-size: 0.9em !important;
  padding: 5px 10px !important;
  pointer-events: none; /* 工具提示不应阻挡地图交互 */
}

/* 编辑和删除按钮 */
.leaflet-edit-toolbar a {
  background-color: transparent !important;
  color: var(--digital-primary-color) !important;
  text-shadow: 0 0 5px rgba(0, 255, 255, 0.6);
  border: none !important;
  border-radius: 4px;
  margin: 2px;
  transition: all 0.2s ease;
}

.leaflet-edit-toolbar a:hover,
.leaflet-edit-toolbar a.leaflet-edit-edit-enabled,
.leaflet-edit-toolbar a.leaflet-edit-remove-enabled {
  background-color: rgba(0, 255, 255, 0.1) !important;
  color: #00E5E5 !important;
  box-shadow: 0 0 8px rgba(0, 255, 255, 0.9) !important;
}

/* 编辑句柄 (多边形上的拖动点) */
.leaflet-marker-icon.leaflet-div-icon.leaflet-editing-icon {
  background-color: var(--digital-primary-color) !important; /* 青色句柄 */
  border: 2px solid var(--digital-bg-color) !important; /* 深蓝边框 */
  border-radius: 50% !important;
  box-shadow: 0 0 10px rgba(0, 255, 255, 0.8) !important; /* 强烈发光 */
  width: 10px !important; /* 调整大小 */
  height: 10px !important;
  margin-left: -5px !important; /* 居中 */
  margin-top: -5px !important;
  cursor: grab !important;
}

/* 绘图辅助线 */
.leaflet-draw-guide-dash {
  border-color: var(--digital-primary-color) !important; /* 青色虚线 */
  border-top-width: 2px !important;
  border-top-style: dashed !important;
  opacity: 0.7 !important;
}

/* 编辑/删除的上下文菜单 (如果使用) */
.leaflet-popup.leaflet-draw-actions-bottom .leaflet-popup-content-wrapper {
  background-color: var(--digital-panel-bg) !important;
  color: var(--digital-text-color) !important;
  border: 1px solid var(--digital-border-color) !important;
  box-shadow: 0 0 15px rgba(0, 255, 255, 0.7) !important;
}
.leaflet-popup.leaflet-draw-actions-bottom .leaflet-draw-actions a {
  color: var(--digital-primary-color) !important;
}
.leaflet-popup.leaflet-draw-actions-bottom .leaflet-draw-actions a:hover {
  background-color: rgba(0, 255, 255, 0.1) !important;
  color: #00E5E5 !important;
}

/* 媒体查询：移动端适配 */
@media (max-width: 768px) {
  .map-container {
    height: 300px; /* 调整小屏幕高度 */
  }

  .leaflet-control-zoom-in,
  .leaflet-control-zoom-out {
    font-size: 1em !important;
    line-height: 24px !important;
    width: 28px !important;
    height: 28px !important;
  }

  .leaflet-draw-toolbar,
  .leaflet-draw-actions {
    padding: 3px !important;
  }
  .leaflet-draw-toolbar a {
    font-size: 1.1em;
  }
}
</style>