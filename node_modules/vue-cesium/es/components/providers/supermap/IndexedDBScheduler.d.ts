/**
 * 操作浏览器数据库 IndexedDB 类
 */
declare class IndexedDBScheduler {
    dbname: string;
    db: any;
    version: any;
    cachestatus: any;
    layer: any;
    storageType: string;
    creatingTable: boolean;
    /**
     *
     * @param {Object} options
     */
    constructor(options: any);
    /**
     * 检查对象仓库是否存在。
     * @param {String} storeName 对象仓库（表）名称
     */
    checkObjectStoreExist(storeName: any): any;
    /**
     *  创建 IndexedDB 浏对象仓库，IndexedDB 是浏览器提供的本地数据库
     * @param {String} storeName 对象仓库（表）名称
     * @returns {Promise}
     */
    createObjectStore(storeName: any): Promise<unknown>;
    /**
     * 向对象仓库写入数据记录。
     * @param {String} storeName 对象仓库（表）名称
     * @param {Number} id 主键
     * @param {*} value 值
     * @returns {Promise}
     */
    putElementInDB(storeName: any, id: any, value: any): Promise<unknown>;
    /**
     * 向对象仓库读取数据。
     * @param {String} storeName 对象仓库（表）名称
     * @param {Number} id 主键
     * @returns {Promise}
     */
    getElementFromDB(storeName: any, id: any): Promise<unknown>;
    /**
     * 更新数据。
     * @param {String} storeName
     * @param {Number} id
     * @param {*} value
     * @returns {Promise}
     */
    updateElementInDB(storeName: any, id: any, value: any): Promise<unknown>;
    /**
     * 移除数据。
     * @param {String} storeName
     * @param {Number} id
     * @returns {Promise}
     */
    removeElementFromDB(storeName: any, id: any): Promise<unknown>;
    /**
     *  清空对象仓库
     * @param {String} storeName
     */
    clear(storeName: any): Promise<unknown>;
}
export default IndexedDBScheduler;
