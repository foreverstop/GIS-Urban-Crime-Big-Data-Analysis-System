export declare function getFullscreenQuad(): Cesium.Geometry;
export declare function createTexture(options: any, typedArray?: any): any;
export declare function createFramebuffer(context: any, colorTexture: any, depthTexture: any): any;
export declare function createRawRenderState(options: any): any;
export declare function viewRectangleToLonLatRange(viewRectangle: Cesium.Rectangle): {
    lon?: {
        min: number;
        max: number;
    };
    lat?: {
        min: number;
        max: number;
    };
};
