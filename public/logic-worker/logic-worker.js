import { MapUINode,MapUIInput } from "map-ui";
import { LogicNode } from "./logic-node";

var Camera = require("lcg-camera");

/**
 * 图运行逻辑组件
 */
export var LogicWorker = function(){
    var self = this;
    /**@type {{[index:string]:LogicWorker.TypeType}} 数据类型表 */
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
     * 添加一个类型定义
     * @param {string} key 标识类型的唯一编号
     * @param {LogicWorker.TypeType} data 类型的完整信息
     */
     this.addType = function(key,data){
        if(typeof key != "string")
            return console.warn("类型唯一ID必须为字符串");
        if(this.types[key])
            return console.warn("已经存在["+key+"]类型");
        //绑定组件
        this.types[key] = data;
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
    this.addNode = function(type,info,trigger = true){
        var node = new LogicNode(this,type,info,trigger);
        this.nodes[node.attr.uid] = node;
        if(trigger)
            this.triggerMessage("add-node");
    }


    /**
     * 移除一个节点
     * @param {string} uid 要移除的节点的uid
     */
    this.removeNode = function(uid){
        if(self.nodes[uid])
            delete self.nodes[uid];
        //删除节点后让现有节点进行纠错
        for(var i in self.nodes)
            self.nodes[i].correctData();
        this.triggerMessage("remove-node");
    }


    /**
     * 判断A类型是否可以输出到B类型
     * @param {string} a A类型
     * @param {string} b B类型
     * @returns {boolean} 判断结果
     */
     this.canTypeAtoB = function(a,b){
        if(a == null || b == null)
            return false;
        if(a == "*" || b == "*" || a == b)
            return true;
        return false;
    }


    /**
     * 获取类型数据
     * @param {string} key 类型下标
     * @returns {LogicWorker.TypeType}
     */
    this.getType = function(key){
        return this.types[key] || {name:key};
    }

    /**
     * 对指定类型的数据进行结果验证
     * @param {*} val 要验证的数据
     * @param {LogicWorker.InputType} conf 对应的输入配置
     * @returns {*} 验证处理后的值
     */
    this.checkTypeValue = function(val,conf){
        var type = this.getType(conf.type);
        if(conf.default && val == null)
            val = conf.default;
        if(type.check)
            return type.check(val,conf);
        return val;
    }

    /**
     * 将当前的图结构状态保存
     * @returns {*} 保存的结果
     */
    this.save = function(){
        var re = {nodes:{}};
        for(var i in this.nodes){
            re.nodes[i] = this.nodes[i].$save();
        }
        return re;
    }

    /**
     * 从保存的结果中载入内容
     * @param {*} data 
     */
    this.load = function(data){
        self.nodes = {};
        //添加节点
        for(var i in data.nodes)
            this.addNode(data.nodes[i].type,data.nodes[i],false);
        //矫正节点内容
        for(var i in this.nodes)
            this.nodes[i].correctData();
        this.triggerMessage("load-data");
    }
}



/**逻辑节点输入定义 */
LogicWorker.InputType = {
    /**@type {string} 输入数据的名称 */
    name:"",
    /**@type {string} 输入数据的类型id */
    type:"",
    /**@type {boolean} 是否为多输入，仅在作为关联接口时有效 */
    many:false,
    /**@type {boolean} 输入接口是否跟随，如果为`true`则在输入接口关联的上级组件运行时也会触发该组件的运行，并且运行不会判断needUpdate */
    follow:false,
    /**@type {boolean} 是否禁用表单输入，如果为`true`则参数只能通过关联接入 */
    ban_form:false,
    /**@type {boolean} 是否禁用连接，如果为`true`则该项不能通过连接接收参数 */
    ban_link:false,
    /**参数的默认值，当参数为null时取该值 */
    default:null
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

/**类型表单回调参数定义 */
LogicWorker.TypeFormArgs = {
    /**@type {MapUIInput} 表单对应的输入组件实例 */
    module:null,
    /**@type {LogicNode} 输入所在的节点 */
    node:null,
    /**@type {string} 输入对应的key */
    key:null,
    /**@type {LogicWorker.InputType} 输入的完整参数 */
    conf:null,
    /**@type {string} 输入接口名称 */
    name:"",
    /**当前的值 */
    value:null
};

/**类型定义 */
LogicWorker.TypeType = {
    /**@type {string} 类型名称 */
    name:"",
    /**@type {(args:LogicWorker.TypeFormArgs)=>{}} 产生类型的表单组件，每次渲染时都会调用一次，可以返回虚拟节点或者null，如果返回null则使用默认内容显示 */
    formRender:null,
    /**@type {(value,conf:LogicWorker.InputType)=>{}} 参数验证逻辑，当表单传入值以及读取关联上级的数据时会运行该方法，最终保存的值将变为该值的返回值 */
    check:null
};


/**组件类型定义 */
LogicWorker.ModuleType = {
    /**@type {string} 组件的菜单路径，使用`/`分割子项，如`基本/文件/选择本地文件` */
    menu:"",
    /**@type {string} 组件名称，默认在查看组件时显示的组件名称，名称可以被动态覆盖 */
    name:"",
    /**@type {(this:LogicNode)=>{}} 初始化回调，this为逻辑节点本身 */
    init:null,
    /**@type {(this:LogicNode,module:MapUINode)=>{}} UI节点初始化回调，this为UI组件实例 */
    uiInit:null,
    /**@type {{[index:string]:LogicWorker.InputType}} 组件接受的参数输入定义 */
    inputs:{},
    /**@type {{[index:string]:LogicWorker.OutputType}} 组件的输出定义 */
    outputs:{},
    /**@type {(this:LogicNode)=>boolean} 返回当前是否需要更新，如果返回false，被依赖请求时不会运行 */
    needUpdate:null,
    /**@type {(this:LogicNode,args,followKey:string)=>{}} 组件运行时的处理逻辑，接收当前的输入参数，需要返回一个字典，包含所有的输出内容，支持异步*/
    run:null,
    /**@type {(this:LogicNode,module:MapUINode)=>{}} 图组件渲染时会调用该方法，返回一个虚拟节点用于显示在组件内部进行扩展 */
    infoRender:null,
    /**@type {(this:LogicNode)=>{}} 保存时运行的代码 */
    save:null,
    /**@type {boolean} 是否在参数变化或者关联关系变化时自动运行一次，默认为false，如果为异步函数则不推荐设置该值为true */
    autoRun:false
};