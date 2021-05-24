import { LogicNode } from "./logic-node";

var Camera = require("lcg-camera");

/**
 * 图运行逻辑组件
 */
export var LogicWorker = function(){
    /**数据类型表 */
    this.types = {};
    /**组件定义表 */
    this.modules = {};

    /**@type {{[index:string]: LogicNode}} 节点表 */
    this.nodes = {};

    /**@type {{[index:string]:{sendMessage:(type:string,vals)=>{}}}} 侦听节点各种消息的组 */
    this.messages = {};

    /**
     * 发送一个消息
     * @param {string} type 消息类型
     * @param {*} vals 消息数据
     */
    this.triggerMessage = function(type,vals){
        for(var i in this.messages){
            this.messages[i].sendMessage("logic-" + type,vals);
        }
    }

    /**
     * 添加一个组件定义
     * @param {string} key 标识组件的唯一编号
     * @param {LogicWorker.ModuleType} data 组件的完整处理逻辑
     */
    this.addModule = function(key,data){
        if(typeof key != "string")
            return console.warn("组件唯一ID必须为字符串");
        if(this.modules[key])
            return console.warn("已经存在["+key+"]组件");
        //绑定组件
        this.modules[key] = data;
    }

    /**
     * 添加一个节点
     * @param {string} type 节点的组件类型
     * @param {*} info `可选`初始化参数
     */
    this.addNode = function(type,info){
        var node = new LogicNode(this,type,info);
        this.nodes[node.attr.uid] = node;
        this.triggerMessage("add-node",function(){});
    }
}


/**组件类型定义 */
LogicWorker.ModuleType = {
    /**@type {string} 组件的菜单路径，使用`/`分割子项，如`基本/文件/选择本地文件` */
    menu:"",
    /**@type {string} 组件名称，默认在查看组件时显示的组件名称，名称可以被动态覆盖 */
    name:""
};