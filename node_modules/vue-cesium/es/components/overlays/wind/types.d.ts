import { VcCartesian2 } from 'vue-cesium/es/utils/types';
export interface ParticleSystemOptions {
    maxParticles?: number;
    particleHeight?: number;
    fadeOpacity?: number;
    dropRate?: number;
    dropRateBump?: number;
    speedFactor?: number;
    lineWidth?: number;
}
export interface ViewerParameters {
    latRange: VcCartesian2;
    lonRange: VcCartesian2;
    pixelSize?: number;
}
export interface VcWindData {
    U: {
        array: Array<Float32Array>;
        min: number;
        max: number;
    };
    V: {
        array: Array<Float32Array>;
        min: number;
        max: number;
    };
    dimensions: {
        lon: number;
        lat: number;
        lev: number;
    };
    lat: {
        array: Array<Float32Array>;
        min: number;
        max: number;
        delta?: number;
    };
    lev: {
        array: Array<Float32Array>;
        min: number;
        max: number;
    };
    lon: {
        array: Array<Float32Array>;
        min: number;
        max: number;
        delta?: number;
    };
}
