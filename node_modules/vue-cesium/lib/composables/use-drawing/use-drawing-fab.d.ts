import type { VcFabProps } from 'vue-cesium/es/components/ui';
import { VcDrawingActionInstance } from 'vue-cesium/es/utils/drawing-types';
import { VcActionTooltipProps, VcComponentInternalInstance } from 'vue-cesium/es/utils/types';
import { VNode, ComputedRef } from 'vue';
export default function (props: any, ctx: any, instance: VcComponentInternalInstance, drawingActionInstances: ComputedRef<Array<VcDrawingActionInstance>>, mainFabOpts: VcFabProps & VcActionTooltipProps, clearActionOpts: VcActionTooltipProps, cmpName: string): {
    renderContent: () => VNode<import("vue").RendererNode, import("vue").RendererElement, {
        [key: string]: any;
    }> | VNode<import("vue").RendererNode, import("vue").RendererElement, {
        [key: string]: any;
    }>[];
};
