import { LogicWorker } from "./logic-worker";
var lcg = require("lcg");

/**
 * 节点处理逻辑
 * @param {LogicWorker} worker 节点所属的worker
 * @param {string} key 节点的组件唯一标识符
 * @param {*} attr 节点的初始化属性
 */
export var LogicNode = function(worker,key,attr){

    /**节点的状态信息，会保存到全局 */
    this.attr = {
        /**横坐标 */
        x:0,
        /**纵坐标 */
        y:0,
        /**唯一编号 */
        uid:lcg.UUID()
    };



}