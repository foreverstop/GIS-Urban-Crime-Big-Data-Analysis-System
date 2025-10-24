declare module 'cesium-heatmap' {
  import * as Cesium from 'cesium';

  export class HeatmapImageryProvider {
    constructor(options: any); // 根据实际的构造函数参数定义
    update(options: any): void;   // 根据实际的方法定义
    destroy(): void;  // 根据实际的方法定义
    // 你可能还需要声明其他属性和方法
  }
}

// types/turf.d.ts
declare module '@turf/helpers';

declare module '@/assets/neighbourhood/areas.geojson' {
  const value: any; // 你可以根据你的 GeoJSON 结构定义更具体的类型
  export default value;
}