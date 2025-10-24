import type { DynamicOverlayOpts, VcPosition } from 'vue-cesium/es/utils/types';
declare class DynamicOverlay {
    _sampledPosition: Cesium.SampledPositionProperty;
    _entity: Cesium.Entity;
    _cache: Cesium.JulianDate[];
    _maxCacheSize: number;
    _lastTime: Cesium.JulianDate | undefined;
    _velocityVectorProperty: Cesium.VelocityVectorProperty;
    constructor(options: DynamicOverlayOpts);
    get id(): string;
    set id(id: string);
    set maxCacheSize(maxCacheSize: number);
    get maxCacheSize(): number;
    get position(): Cesium.Cartesian3;
    _removePosition(): void;
    /**
     *
     * @param position
     * @param interval
     * @returns
     */
    addPosition(position: VcPosition, timeOrInterval: string | number | Cesium.JulianDate | Date): Cesium.JulianDate;
}
export default DynamicOverlay;
