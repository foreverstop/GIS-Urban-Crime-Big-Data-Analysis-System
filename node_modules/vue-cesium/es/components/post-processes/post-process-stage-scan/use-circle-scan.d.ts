import { VcViewerProvider } from 'vue-cesium/es/utils/types';
export default function ($services: VcViewerProvider): {
    webgl: (options: any) => {
        shaderSource: string;
        uniforms: {
            u_scanCenterEC: () => Cesium.Cartesian4;
            u_scanPlaneNormalEC: () => Cesium.Cartesian3;
            u_radius: () => number;
            u_scanColor: any;
        };
    };
};
