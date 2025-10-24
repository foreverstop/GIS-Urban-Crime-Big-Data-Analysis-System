export declare function hSlot(slot: any, otherwise?: any): any;
export declare function hUniqueSlot(slot: any, otherwise: any): any;
/**
 * Source definitely exists,
 * so it's merged with the possible slot
 */
export declare function hMergeSlot(slot: any, source: any): any;
/**
 * Merge with possible slot,
 * even if source might not exist
 */
export declare function hMergeSlotSafely(slot: any, source: any): any;
export declare function hDir(tag: any, data: any, children?: any, key?: any, condition?: any, getDirsFn?: any): import("vue").VNode<import("vue").RendererNode, import("vue").RendererElement, {
    [key: string]: any;
}>;
