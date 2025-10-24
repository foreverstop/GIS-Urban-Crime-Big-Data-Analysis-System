import type { VcComponentInternalInstance, VcViewerProvider } from 'vue-cesium/es/utils/types';
import type { VcTooltipRef } from 'vue-cesium/es/components/ui';
export default function (props: any, { emit }: {
    emit: any;
}, vcInstance: VcComponentInternalInstance, $services: VcViewerProvider): {
    handleZoomInMouseDown: (e: any) => void;
    handleZoomOutMouseDown: (event: any) => void;
    handleZoomBarScrollMouseDown: (event: any) => void;
    load: (el: any) => boolean;
    unload: () => boolean;
    zoombarTop: import("vue").Ref<number>;
    zoomInTooltipRef: import("vue").Ref<VcTooltipRef>;
    zoomOutTooltipRef: import("vue").Ref<VcTooltipRef>;
    zoomBarTooltipRef: import("vue").Ref<VcTooltipRef>;
    onTooltipBeforeShow: (e: any) => void;
};
