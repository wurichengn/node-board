import { MapUINode } from "map-ui/map-ui-node";
import { LogicNode } from "./logic-node";

var Camera = require("lcg-camera");

/**
 * 图运行逻辑组件
 */
export var LogicWorker = function(){
    /**数据类型表 */
    this.types = {};
    /**@type {{[index:string]:LogicWorker.ModuleType}} 组件定义表 */
    this.modules = {};

    /**@type {{[index:string]:LogicNode}} 节点表 */
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


    /**
     * 判断A类型是否可以输出到B类型
     * @param {string} a A类型
     * @param {string} b B类型
     * @returns {boolean} 判断结果
     */
     this.canTypeAtoB = function(a,b){
        if(b == "*" || a == b)
            return true;
        return false;
    }
}



/**逻辑节点输入定义 */
LogicWorker.InputType = {
    /**@type {string} 输入数据的名称 */
    name:"",
    /**@type {string} 输入数据的类型id */
    type:"",
    /**@type {boolean} 是否为多输入 */
    many:false
};

/**逻辑节点输出定义 */
LogicWorker.OutputType = {
    /**@type {string} 输出数据的名称 */
    name:"",
    /**@type {string} 输出数据的类型id */
    type:""
};


/**关联关系定义 */
LogicWorker.LinkType = {
    /**@type {string} 关联的节点的唯一编号 */
    uid:"",
    /**@type {string} 对应的输出下标 */
    key:""
};


/**组件类型定义 */
LogicWorker.ModuleType = {
    /**@type {string} 组件的菜单路径，使用`/`分割子项，如`基本/文件/选择本地文件` */
    menu:"",
    /**@type {string} 组件名称，默认在查看组件时显示的组件名称，名称可以被动态覆盖 */
    name:"",
    /**@type {(this:LogicNode)=>{}} 初始化回调，this为逻辑节点本身 */
    init:null,
    /**@type {(this:MapUINode)=>{}} UI节点初始化回调，this为UI组件实例 */
    uiInit:null,
    /**@type {{[index:string]:LogicWorker.InputType}} 组件接受的参数输入定义 */
    inputs:{},
    /**@type {{[index:string]:LogicWorker.OutputType}} 组件的输出定义 */
    outputs:{},
    /**@type {()=>boolean} 返回当前是否需要更新，如果返回false，被依赖请求时不会运行 */
    needUpdate:null
};