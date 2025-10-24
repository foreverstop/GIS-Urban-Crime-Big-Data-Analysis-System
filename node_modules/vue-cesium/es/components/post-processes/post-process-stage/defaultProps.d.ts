import { PropType } from 'vue';
declare const defaultProps: {
    name: StringConstructor;
    scissorRectangle: {
        type: PropType<import("../../../utils/types").VcBoundingRectangle>;
        watcherOptions: {
            cesiumObjectBuilder: typeof import("../../../utils/cesium-helpers").makeBoundingRectangle;
        };
    };
    clearColor: {
        type: PropType<import("../../../utils/types").VcColor>;
        watcherOptions: {
            cesiumObjectBuilder: typeof import("../../../utils/cesium-helpers").makeColor;
        };
    };
    fragmentShader: StringConstructor;
    uniforms: ObjectConstructor;
    textureScale: {
        type: NumberConstructor;
        default: number;
    };
    forcePowerOfTwo: {
        type: BooleanConstructor;
        default: boolean;
    };
    sampleMode: PropType<number>;
    pixelFormat: PropType<Cesium.PixelFormat>;
    pixelDatatype: PropType<Cesium.PixelDatatype>;
};
export default defaultProps;
