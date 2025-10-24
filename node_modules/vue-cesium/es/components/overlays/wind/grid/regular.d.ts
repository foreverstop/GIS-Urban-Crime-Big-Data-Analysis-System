/**
 * Creates a regular geographic grid. Each axis defines the "start" value in degrees, "delta" degrees between
 * ticks, and the "size" (number of ticks from the origin, inclusive). Positive deltas move eastward/northward. This
 * example creates a full 1° x 1° grid covering the earth starting at the south pole:
 *
 *     λaxis: {start: 0, delta: 1, size: 360}    where λ in the range [0, 359]
 *     φaxis: {start: -90, delta: 1, size: 181}  where φ in the range [-90, 90]
 *
 * A grid maps from [λ, φ] coordinates to grid point indices.
 *
 * @param λaxis longitude axis
 * @param φaxis latitude axis
 * @returns {*}
 */
export declare function regularGrid(λaxis: any, φaxis: any): {
    dimensions: () => {
        width: number;
        height: number;
    };
    isCylindrical: () => boolean;
    forEach: (cb: any, start: any) => any;
    closest: (λ: any, φ: any) => number;
    closest4: (λ: any, φ: any) => number[];
};
