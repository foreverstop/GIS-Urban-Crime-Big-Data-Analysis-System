import type { VcComponentInternalInstance } from 'vue-cesium/es/utils/types';
import type { SetupContext } from 'vue';
import type { ProviderEmits } from 'vue-cesium/es/utils/emits';
export default function (props: any, ctx: SetupContext<ProviderEmits>, vcInstance: VcComponentInternalInstance): {
    transformProps: <T>(props: T, childProps?: any) => T;
    unwatchFns: import("vue").WatchStopHandle[];
    setPropsWatcher: (register: any) => void;
};
