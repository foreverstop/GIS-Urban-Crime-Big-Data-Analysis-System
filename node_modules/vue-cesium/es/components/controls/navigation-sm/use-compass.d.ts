import type { VcComponentInternalInstance } from 'vue-cesium/es/utils/types';
import type { VcTooltipRef } from 'vue-cesium/es/components/ui';
export default function (props: any, { emit }: {
    emit: any;
}, vcInstance: VcComponentInternalInstance): {
    heading: import("vue").Ref<number>;
    handleDoubleClick: (e: any) => boolean;
    handleMouseDown: (e: Event) => boolean;
    handleMouseUp: (event: any) => void;
    onTooltipBeforeShow: (e: any) => void;
    viewerChange: () => void;
    load: (viewer: Cesium.Viewer, el: any) => Promise<boolean>;
    unload: () => Promise<boolean>;
    tiltbarLeft: import("vue").Ref<number>;
    tiltbarTop: import("vue").Ref<number>;
    tooltipRef: import("vue").Ref<VcTooltipRef>;
};
