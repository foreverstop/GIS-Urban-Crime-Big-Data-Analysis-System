export declare const useAnchorProps: {
    target: {
        type: (StringConstructor | BooleanConstructor)[];
        default: boolean;
    };
    noParentEvent: BooleanConstructor;
    contextMenu: BooleanConstructor;
};
export default function ({ showing, avoidEmit, // required for VcPopupProxy (true)
configureAnchorEl }: {
    showing: any;
    avoidEmit: any;
    configureAnchorEl: any;
}): {
    anchorEl: import("vue").Ref<HTMLElement>;
    canShow: (evt: any) => boolean;
    anchorEvents: any;
};
