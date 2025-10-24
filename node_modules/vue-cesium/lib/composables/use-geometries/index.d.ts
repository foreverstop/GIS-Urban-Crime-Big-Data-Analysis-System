import { VcComponentInternalInstance } from 'vue-cesium/es/utils/types';
export default function (props: any, ctx: any, vcInstance: VcComponentInternalInstance): {
    transformProps: <T>(props: T, childProps?: any) => T;
    unwatchFns: import("vue").WatchStopHandle[];
    setPropsWatcher: (register: any) => void;
};
