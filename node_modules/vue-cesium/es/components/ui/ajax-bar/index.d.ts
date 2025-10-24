import { ComponentPublicInstance } from 'vue';
import type { ExtractPropTypes } from 'vue';
export declare const ajaxBarProps: {
    position: {
        type: StringConstructor;
        default: string;
        validator: (val: any) => boolean;
    };
    size: {
        type: StringConstructor;
        default: string;
    };
    color: StringConstructor;
    skipHijack: BooleanConstructor;
    reverse: BooleanConstructor;
    positioning: {
        type: StringConstructor;
        default: string;
        validator: (val: string) => boolean;
    };
    hijackFilter: FunctionConstructor;
};
declare const _default: import("vue").DefineComponent<{
    position: {
        type: StringConstructor;
        default: string;
        validator: (val: any) => boolean;
    };
    size: {
        type: StringConstructor;
        default: string;
    };
    color: StringConstructor;
    skipHijack: BooleanConstructor;
    reverse: BooleanConstructor;
    positioning: {
        type: StringConstructor;
        default: string;
        validator: (val: string) => boolean;
    };
    hijackFilter: FunctionConstructor;
}, () => import("vue").VNode<import("vue").RendererNode, import("vue").RendererElement, {
    [key: string]: any;
}>, unknown, {}, {}, import("vue").ComponentOptionsMixin, import("vue").ComponentOptionsMixin, ("start" | "stop")[], "start" | "stop", import("vue").VNodeProps & import("vue").AllowedComponentProps & import("vue").ComponentCustomProps, Readonly<ExtractPropTypes<{
    position: {
        type: StringConstructor;
        default: string;
        validator: (val: any) => boolean;
    };
    size: {
        type: StringConstructor;
        default: string;
    };
    color: StringConstructor;
    skipHijack: BooleanConstructor;
    reverse: BooleanConstructor;
    positioning: {
        type: StringConstructor;
        default: string;
        validator: (val: string) => boolean;
    };
    hijackFilter: FunctionConstructor;
}>> & {
    onStop?: (...args: any[]) => any;
    onStart?: (...args: any[]) => any;
}, {
    reverse: boolean;
    positioning: string;
    position: string;
    size: string;
    skipHijack: boolean;
}>;
export default _default;
export interface VcAjaxBarProps {
    /**
     * Position within window of where QAjaxBar should be displayed.
     * Default value: top
     */
    position?: 'top' | 'right' | 'bottom' | 'left';
    /**
     * Size in CSS units, including unit name.
     * Default value: 2px
     */
    size?: string;
    /**
     * Color name for component from the css color.
     */
    color?: string;
    /**
     * Reverse direction of progress.
     */
    reverse?: boolean;
    /**
     * Skip Ajax hijacking (not a reactive prop).
     */
    skipHijack?: boolean;
    /**
     * Specify the positioning of the progress bar.
     */
    positioning?: 'absolute' | 'fixed';
    /**
     * Filter which URL should trigger start() + stop().
     * @param url The URL being triggered
     * @returns Should the URL received as param trigger start() + stop()?
     */
    hijackFilter?: ((url: string) => boolean) | undefined;
    /**
     * Emitted when bar is triggered to appear.
     */
    onStart?: () => void;
    /**
     * Emitted when bar has finished its job.
     */
    onStop?: () => void;
}
export interface VcAjaxBarRef extends ComponentPublicInstance<VcAjaxBarProps> {
    /**
     * Notify bar you are waiting for a new process to finish
     * @param speed Delay (in milliseconds) between progress auto-increments; If delay is 0 then it disables auto-incrementing
     */
    start: (speed?: number) => void;
    /**
     * Manually trigger a bar progress increment
     * @param amount Amount (0 < x <= 100) to increment with
     */
    increment: (amount?: number) => void;
    /**
     * Notify bar that one process you were waiting has finished
     */
    stop: () => void;
}
