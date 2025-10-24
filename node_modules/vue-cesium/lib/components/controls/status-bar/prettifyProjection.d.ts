/**
 * Turns the longitude / latitude in degrees into a human readable pretty UTM zone representation.
 */
declare function prettifyProjection(longitude: any, latitude: any, proj4Projection: any, proj4longlat: any, projectionUnits: any): {
    utmZone: string;
    north: any;
    east: any;
};
export default prettifyProjection;
