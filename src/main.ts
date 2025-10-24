import { createApp } from 'vue'
import { createPinia } from 'pinia'
import './style.css'
import App from './App.vue'
import { library } from '@fortawesome/fontawesome-svg-core'
import { faUser, faLock } from '@fortawesome/free-solid-svg-icons'
import { FontAwesomeIcon } from '@fortawesome/vue-fontawesome'
import router from './router' // 现在应该能正确识别类型了
import 'element-plus/dist/index.css';
import 'leaflet/dist/leaflet.css';

// 导入 ECharts 核心模块、图表类型、组件和渲染器
import * as echarts from 'echarts/core';
import {
    BarChart,
    LineChart
    // 在这里添加您项目中实际用到的其他图表类型，例如：
    // PieChart,
    // ScatterChart,
} from 'echarts/charts';
import {
    TitleComponent,
    TooltipComponent,
    GridComponent,
    LegendComponent,
    // 在这里添加您项目中实际用到的其他 ECharts 组件，例如：
    // ToolboxComponent,
    // DataZoomComponent,
} from 'echarts/components';
import { CanvasRenderer } from 'echarts/renderers'; // 或者 SVGRenderer

// 注册 ECharts 模块
echarts.use([
    TitleComponent,
    TooltipComponent,
    GridComponent,
    LegendComponent,
    BarChart,
    LineChart,
    CanvasRenderer // 或者 SVGRenderer
    // 如果上面引入了其他图表或组件，也需要在这里注册
    // PieChart,
    // ScatterChart,
    // ToolboxComponent,
    // DataZoomComponent,
]);



library.add(faUser, faLock)

const app = createApp(App)
app.component('FontAwesomeIcon', FontAwesomeIcon)
app.use(createPinia())
app.use(router)
app.mount('#app')