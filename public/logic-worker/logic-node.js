import { LogicWorker } from "./logic-worker";
var lcg = require("lcg");

/**
 * 节点处理逻辑
 * @param {LogicWorker} worker 节点所属的worker
 * @param {string} key 节点的组件唯一标识符
 * @param {*} attr 节点的初始化属性
 */
export var LogicNode = function(worker,key,attr){
    var self = this;
    
    /**节点对应的组件原型 */
    this.module = worker.modules[key];

    /**节点的属性信息，存放必要信息，保存时会存下来 */
    var attrs = this.attr = {
        /**组件当前显示的标题 */
        title:this.module.name,
        /**横坐标 */
        x:0,
        /**纵坐标 */
        y:0,
        /**唯一编号 */
        uid:lcg.UUID(),
        /**@type {{[index:string]:(LogicWorker.LinkType | LogicWorker.LinkType[])}} 输入的关联内容 */
        links:{}
    };

    /**节点的状态信息，存放可以根据参数或者逻辑动态生成的数据，保存时不会记录 */
    var state = this.state = {
        /**@type {{[index:string]:LogicWorker.InputType}} 输入表 */
        inputs:this.module.inputs || {},
        /**@type {{[index:string]:LogicWorker.OutputType}} 输出表 */
        outputs:this.module.outputs || {},
        /**@type {{x:number,y:number}[2]} 显示用连线组，临时显示用 */
        line:null
    }

    /**矫正属性内容 */
    var correctData = function(){
        //去掉空连接
        for(var i in self.attr.links){
            if(self.attr.links[i] == null)
                delete self.attr.links[i];
        }
    }

    /**@type {{[index:string]:{sendMessage:(type:string,vals)=>{}}}} 侦听节点各种消息的组 */
    this.messages = {};

    /**
     * 发送一个消息
     * @param {string} type 消息类型
     * @param {*} vals 消息数据
     */
    this.triggerMessage = function(type,vals){
        for(var i in this.messages){
            this.messages[i].sendMessage("logic-node-" + type,vals);
        }
    }

    /**
     * 写入state，会进行潜遍历覆盖，所以层级下的内容并非增量覆盖
     * @param {attrs} attr 要写入的新状态
     */
     this.setAttr = function(attr){
        for(var i in attr){
            //links单独处理
            if(i == "links"){
                for(var j in attr[i])
                    this.attr[i][j] = attr[i][j];
                continue;
            }
            //直接写入
            this.attr[i] = attr[i];
        }
        this.triggerMessage("update-attr");
        correctData();
    }

    /**
     * 写入state，会进行潜遍历覆盖，所以层级下的内容并非增量覆盖
     * @param {state} state 要写入的新状态
     */
    this.setState = function(state){
        for(var i in state)
            this.state[i] = state[i];
        this.triggerMessage("update-state");
        correctData();
    }

    /**
     * 设置一个关联关系
     * @param {string} key 要设置的输入key
     * @param {LogicWorker.LinkType} link 关联内容
     */
    this.setLink = function(key,link){
        if(link != null && !worker.canTypeAtoB(worker.nodes[link.uid].state.outputs[link.key].type,self.state.inputs[key].type))
            return;
        this.attr.links[key] = link;
        this.triggerMessage("update-attr");
        correctData();
    }



    //============实际工作流程============

    /**
     * 让组件主动执行一次逻辑，通过runOnce执行的话组件的所有依赖组件都会尝试执行
     */
    this.runOnce = async function(task){
        //初始化任务记录
        task = task || {};
        //处理所有的依赖
        for(var i in this.attr.links){
            var node = this.attr.links
        }
    }

    /**参数是否改变 */
    this.argsIsUpdate = function(){
        return true;
    }

    /**
     * 返回当前是否需要更新，如果返回false，被依赖请求时不会运行
     * @returns {boolean}
     */
    this.needUpdate = this.module.needUpdate || function(){
        return self.argsIsUpdate();
    }






    //初始化逻辑扩展
    if(this.module.init)
        this.module.init.call(this);
}