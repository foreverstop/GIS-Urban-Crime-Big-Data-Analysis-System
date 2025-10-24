declare class CustomPrimitive {
    commandType: string;
    geometry: any;
    attributeLocations: any;
    primitiveType: any;
    uniformMap: any;
    vertexShaderSource: any;
    fragmentShaderSource: any;
    rawRenderState: any;
    framebuffer: any;
    outputTexture: any;
    autoClear: any;
    preExecute: any;
    show: boolean;
    commandToExecute: any;
    clearCommand: any;
    constructor(options: any);
    createCommand(context: any): any;
    setGeometry(context: any, geometry: any): void;
    update(frameState: any): void;
    isDestroyed(): boolean;
    destroy(): void;
}
export default CustomPrimitive;
