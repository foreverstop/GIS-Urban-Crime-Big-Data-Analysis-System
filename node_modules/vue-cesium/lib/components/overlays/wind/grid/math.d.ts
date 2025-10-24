/**
 * @param {number} v
 * @param {number} n
 * @returns {number} remainder of floored division, i.e., floor(v / n). Useful for consistent modulo of negative
 *          numbers. See http://en.wikipedia.org/wiki/Modulo_operation.
 */
export declare function floorMod(v: any, n: any): number;
/**
 * Round to closest whole number using banker's rounding. From Java's Math.rint method.
 * @param {number} v
 * @returns {number} the value rounded half even
 */
export declare function rint(v: any): number;
/**
 * Round to the closest multiple using banker's rounding.
 * @param {number} v
 * @param {number} m the multiple
 * @returns {number} the value rounded to the nearest increment of m.
 */
export declare function rintToMultiple(v: any, m: any): number;
/**
 * @param {number} v the value to clamp
 * @param {number} low the range lower bound, inclusive
 * @param {number} high the range upper bound, inclusive
 * @returns {number} the value v clamped to the range [low, high].
 */
export declare function clamp(v: any, low: any, high: any): number;
/**
 * @param {number} v the value to rescale
 * @param {number} lowA the source range lower bound, inclusive
 * @param {number} highA the source range upper bound, inclusive
 * @param {number} lowB the target range lower bound, inclusive
 * @param {number} highB the target range upper bound, inclusive
 * @returns {number} the value v rescaled, but not clamped, to the range [lowB, highB] inclusive
 */
export declare function rescale(v: any, lowA: any, highA: any, lowB: any, highB: any): any;
/**
 * @param {number[]} vec2 [x, y]
 * @returns {number} euclidean length of the 2-d vector
 */
export declare function length(vec2: any): number;
/**
 * @param {number[]} a [ax, ay]
 * @param {number[]} b [bx, by]
 * @returns {number} euclidean distance between two 2-d points
 */
export declare function distance(a: any, b: any): number;
/**
 * @param {number[]} vec2 [x, y]
 * @returns {number} the direction of the 2-d vector on the compass rose in degrees in the range [0, 360).
 */
export declare function toCardinalDegrees(vec2: any): number;
/**
 * Returns the indicatrix of the specified projection at the given point.
 *
 * This method uses finite difference estimates to calculate warping by adding a very small amount (h) to
 * both the longitude and latitude to create two lines. These lines are then projected to pixel space, where
 * they become diagonals of triangles that represent how much the projection warps longitude and latitude at
 * that location.
 *
 * <pre>
 *        (λ, φ+h)                  (xλ, yλ)
 *           .                         .
 *           |               ==>        \
 *           |                           \   __. (xφ, yφ)
 *    (λ, φ) .____. (λ+h, φ)       (x, y) .--
 * </pre>
 *
 * See:
 *     Map Projections: A Working Manual, Snyder, John P: pubs.er.usgs.gov/publication/pp1395
 *     gis.stackexchange.com/questions/5068/how-to-create-an-accurate-tissot-indicatrix
 *     www.jasondavies.com/maps/tissot
 *
 * @param {Function} project the projection function(λ, φ) -> [x, y]
 * @param {number} λ geographic coord lon
 * @param {number} φ geographic coord lat
 * @param {number} x corresponding screen coord x
 * @param {number} y corresponding screen coord y
 * @returns {number[]} array of scaled derivatives [dx/dλ, dy/dλ, dx/dφ, dy/dφ]
 */
export declare function indicatrix(project: any, λ: any, φ: any, x: any, y: any): number[];
/**
 * Converts the argument to a number, including special cases for fractions:
 *     0.25  -> 0.25
 *     "1/4" -> 0.25
 *     [1,4] -> 0.25
 *     ".25" -> 0.25
 *
 * @param x any object. When an array, then interpreted as the fraction: a[0] / a[1]. When a string containing
 *        a slash, the value is first converted to an array by splitting on "/".
 * @returns {number} the specified argument converted to a number.
 */
export declare function decimalize(x: any): number;
export declare function mulvec2(vec: any, c: any): number[];
