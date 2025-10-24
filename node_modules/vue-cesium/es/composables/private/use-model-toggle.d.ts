import { Ref, ComputedRef } from 'vue';
import { AnyFunction } from 'vue-cesium/es/utils/types';
export declare const useModelToggleProps: {
    modelValue: {
        type: BooleanConstructor;
        default: any;
    };
};
export declare const useModelToggleEmits: string[];
export default function ({ showing, canShow, // optional
hideOnRouteChange, // optional
handleShow, // optional
handleHide, // optional
processOnMount }: {
    showing?: Ref<boolean>;
    canShow?: AnyFunction<boolean>;
    hideOnRouteChange?: ComputedRef<boolean>;
    handleShow?: AnyFunction<void>;
    handleHide?: AnyFunction<void>;
    processOnMount?: boolean;
}): {
    show: (evt: any) => void;
    hide: (evt?: any) => void;
    toggle: (evt: any) => void;
};
