import type { VcCesiumObject } from 'vue-cesium/es/utils/types';
declare class Feature {
    id: string;
    cesiumObject: VcCesiumObject;
    pickedFeature: any;
    name: any;
    description: any;
    properties: any;
    data: any;
    imageryLayer: Cesium.ImageryLayer;
    position: Cesium.Cartesian3;
    coords: any;
    windowPosition: Cesium.Cartesian2;
    constructor(options: any);
    static getBoundingSphere(cesiumObject: any, viewer: Cesium.Viewer): any;
    static fromPickedFeature(cesiumObject: any, pickedFeature: any, viewer: any, screenPosition: any): Feature;
    static fromImageryLayerFeature(imageryFeature: any, viewer: Cesium.Viewer): Feature;
}
export default Feature;
