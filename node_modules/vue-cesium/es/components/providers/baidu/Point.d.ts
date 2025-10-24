declare class Point {
    lat: number;
    lng: number;
    constructor(lng: any, lat: any);
    equals(other: any): boolean;
    static isInRange: (pt: any) => boolean;
}
export default Point;
