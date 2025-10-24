import { VcViewerProvider, AnyFunction } from 'vue-cesium/es/utils/types';
interface HandlerActions {
    handleMouseClick?: AnyFunction<void>;
    handleMouseDown?: AnyFunction<void>;
    handleMouseUp?: AnyFunction<void>;
    handleMouseMove?: AnyFunction<void>;
    handleDoubleClick?: AnyFunction<void>;
    handleMouseWheel?: AnyFunction<void>;
    handlePinch?: AnyFunction<void>;
}
export default function ($services: VcViewerProvider, { handleMouseClick, handleMouseDown, handleMouseUp, handleMouseMove, handleDoubleClick, handleMouseWheel, handlePinch }: HandlerActions): {
    activate: () => void;
    deactivate: () => void;
    destroy: () => void;
    isActive: import("vue").Ref<boolean>;
};
export {};
