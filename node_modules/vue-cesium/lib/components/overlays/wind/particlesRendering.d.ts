declare class ParticlesRendering {
    textures: any;
    framebuffers: any;
    primitives: any;
    constructor(context: any, data: any, particleSystemOptions: any, viewerParameters: any, particlesComputing: any);
    createRenderingTextures(context: any, data: any): void;
    createRenderingFramebuffers(context: any): void;
    createSegmentsGeometry(particleSystemOptions: any): Cesium.Geometry;
    createRenderingPrimitives(context: any, particleSystemOptions: any, viewerParameters: any, particlesComputing: any): void;
}
export default ParticlesRendering;
