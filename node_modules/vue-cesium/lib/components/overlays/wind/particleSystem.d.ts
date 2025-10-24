import ParticlesComputing from './particlesComputing';
import ParticlesRendering from './particlesRendering';
import { ParticleSystemOptions, VcWindData, ViewerParameters } from './types';
declare class ParticleSystem {
    context: any;
    data: VcWindData;
    particleSystemOptions: ParticleSystemOptions;
    viewerParameters: ViewerParameters;
    particlesComputing: ParticlesComputing;
    particlesRendering: ParticlesRendering;
    constructor(context: any, data: VcWindData, particleSystemOptions: ParticleSystemOptions, viewerParameters: ViewerParameters);
    canvasResize(context: any): void;
    clearFramebuffers(): void;
    refreshParticles(maxParticlesChanged: any): void;
    applyParticleSystemOptions(particleSystemOptions: any): void;
    applyViewerParameters(viewerParameters: any): void;
}
export default ParticleSystem;
