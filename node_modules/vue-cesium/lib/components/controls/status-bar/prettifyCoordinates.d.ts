/**
 * Turns the longitude / latitude in degrees into a human readable pretty strings.
 *
 * @param {Number} longitude The longitude to format.
 * @param {Number} latitude The latitude to format.
 * @param {Object} options Object with the following properties:
 * @param {Number} options.height The height.
 * @param {Number} options.errorBar The error +/- for the height.
 * @param {Number} options.digits The number of digits to fix the lat / lon to.
 */
declare function prettifyCoordinates(longitude: any, latitude: any, options: any): {
    latitude: string;
    longitude: string;
    elevation: string;
};
export default prettifyCoordinates;
