import { VcComponentInternalInstance } from 'vue-cesium/es/utils/types';
import { WatchStopHandle } from 'vue';
export default function (props: any, ctx: any, vcInstance: VcComponentInternalInstance): {
    transformProps: <T>(props: T, childProps?: any) => T;
    unwatchFns: WatchStopHandle[];
    setPropsWatcher: (register: any) => void;
};
