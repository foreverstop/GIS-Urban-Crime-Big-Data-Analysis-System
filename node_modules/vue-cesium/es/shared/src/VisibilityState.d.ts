declare class VisibilityState {
    states: any;
    count: number;
    constructor();
    hidePrimitiveCollection(primitiveCollection: Cesium.PrimitiveCollection): void;
    restorePrimitiveCollection(primitiveCollection: Cesium.PrimitiveCollection): void;
    hide(scene: Cesium.Scene): void;
    restore(scene: Cesium.Scene): void;
}
export default VisibilityState;
