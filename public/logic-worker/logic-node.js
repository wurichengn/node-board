import { MapUINode } from "map-ui";
import { LogicWorker } from "./logic-worker";
var lcg = require("lcg");

/**
 * 节点处理逻辑
 * @param {LogicWorker} worker 节点所属的worker
 * @param {string} key 节点的组件唯一标识符
 * @param {*} saveInfo 节点的初始化属性
 * @param {boolean} correct 如果为false，则组件实例化结束后不会立即矫正数据
 */
export var LogicNode = function(worker,key,saveInfo,correct = false){
    var self = this;
    this.worker = worker;
    /**节点对应的组件原型 */
    this.module = worker.modules[key];

    /**@type {MapUINode} 逻辑节点对应的拓扑图UI实例，在没有运行在图中时为空 */
    this.UI = null;

    /**节点的属性信息，存放必要信息，保存时会存下来，有额外的要保存内容也可以写入到该对象中 */
    var attr = this.attr = {
        /**@type {string} 节点的组件类型 */
        type:key,
        /**组件当前显示的标题 */
        title:this.module.name,
        /**横坐标 */
        x:0,
        /**纵坐标 */
        y:0,
        /**节点的宽度 */
        width:120,
        /**唯一编号 */
        uid:lcg.UUID(),
        /**@type {{[index:string]:(LogicWorker.LinkType)}} 输入的关联内容 */
        links:{},
        /**保存的表单数据，运行时不会改变，仅保存和读取时使用 */
        forms:{},
        /**多输入项的长度 */
        manyNums:{}
    };

    //写入保存的内容
    for(var i in saveInfo)
        this.attr[i] = saveInfo[i];

    /**节点的状态信息，存放可以根据参数或者逻辑动态生成的数据，保存时不会记录 */
    var state = this.state = {
        /**@type {number} 运行状态 0未运行 1等待依赖中 2运行中 3运行错误 */
        running:false,
        /**@type {string} 运行的错误信息，运行错误时出现 */
        errorInfo:null,
        /**@type {{[index:string]:LogicWorker.InputType}} 输入表 */
        inputs:this.module.inputs || {},
        /**@type {{[index:string]:LogicWorker.OutputType}} 输出表 */
        outputs:this.module.outputs || {},
        /**@type {{x:number,y:number}[2]} 显示用连线组，临时显示用 */
        line:null,
        /**表单表，存放从组件输入得到的参数 */
        forms:attr.forms || {},
        /**参数表 */
        args:{},
        /**输出表 */
        values:{},
        /**@type 全局输入表 */
        globalInput:[],
        /**@type 全局输出表 */
        globalOutput:[]
    }

    /**矫正属性内容 */
    this.correctData = function(){
        //去掉无效连接
        for(var i in self.attr.links){
            if(self.attr.links[i] == null){
                delete self.attr.links[i];
                continue;
            }
            if(self.state.inputs[i] == null){
                delete self.attr.links[i];
                continue;
            }
            if(self.state.inputs[i].many){
                for(var j in self.attr.links[i]){
                    if(j >= self.attr.manyNums[i] || self.attr.links[i][j] == null || worker.nodes[self.attr.links[i][j].uid] == null)
                        delete self.attr.links[i][j];
                }
            }else{
                if(worker.nodes[self.attr.links[i].uid] == null)
                    delete self.attr.links[i];
            }
        }

        //表单内容默认参数填写
        for(var i in self.state.inputs){
            if(self.state.inputs[i].many){
                if(!lcg.isObject(self.state.forms[i]))
                    self.state.forms[i] = {};
                for(var j = 0;j < self.attr.manyNums[i];j++){
                    if(self.state.inputs[i].default != null && self.state.forms[i][j] == null)
                        self.state.forms[i][j] = self.state.inputs[i].default;
                }
            }else{
                if(self.state.inputs[i].default != null && self.state.forms[i] == null)
                    self.state.forms[i] = self.state.inputs[i].default;
            }
        }

        //清空参数
        this.state.args = {};

        //从表单更新参数
        for(var i in this.state.forms){
            if(this.state.inputs[i] == null){
                delete this.state.forms[i];
                continue;
            }
            if(this.state.inputs[i].many)
                this.state.args[i] = {...this.state.forms[i]};
            else
                this.state.args[i] = this.state.forms[i];
        }

        //多输入参数预处理
        for(var i in this.state.inputs){
            if(this.state.inputs[i].many)
                this.state.args[i] = this.state.args[i] || {};
        }
        
        //从关联关系更新参数
        for(var i in this.attr.links){
            if(self.state.inputs[i].many){
                for(var j in self.attr.links[i]){
                    var node = worker.nodes[this.attr.links[i][j].uid];
                    this.state.args[i][j] = worker.checkTypeValue(node.state.values[this.attr.links[i][j].key],self.state.inputs[i]);
                }
            }else{
                var node = worker.nodes[this.attr.links[i].uid];
                this.state.args[i] = worker.checkTypeValue(node.state.values[this.attr.links[i].key],self.state.inputs[i]);
            }
        }

        //默认参数写入
        for(var i in this.state.inputs){
            if(self.state.inputs[i].many){
                for(var j = 0;j < self.attr.manyNums[i];j++){
                    if(this.state.args[i][j] == null && this.state.inputs[i].default != null)
                        this.state.args[i][j] = this.state.inputs[i].default;
                }
            }else{
                if(this.state.args[i] == null && this.state.inputs[i].default != null)
                    this.state.args[i] = this.state.inputs[i].default;
            }
        }

        //转换多输入参数为数组
        for(var i in this.state.inputs){
            if(this.state.inputs[i].many){
                var list = [];
                for(var j = 0;j < self.attr.manyNums[i];j++)
                    list.push(this.state.args[i][j])
                this.state.args[i] = list;
            }
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
     * @param {attr} attr 要写入的新状态
     */
     this.setAttr = function(attr){
        for(var i in attr)
            this.attr[i] = attr[i];
        this.triggerMessage("update-attr");
        this.correctData();
    }

    /**
     * 写入state，会进行潜遍历覆盖，所以层级下的内容并非增量覆盖
     * @param {state} state 要写入的新状态
     */
    this.setState = function(state){
        for(var i in state){
            //forms单独处理
            if(i == "forms"){
                for(var j in state[i]){
                    if(this.state.inputs[j] && this.state.inputs[j].many){
                        for(var k in state[i][j])
                            this.state[i][j][k] = worker.checkTypeValue(state[i][j][k],self.state.inputs[j]);
                    }else
                        this.state[i][j] = worker.checkTypeValue(state[i][j],self.state.inputs[j]);
                }
                updateArgs();
                if(self.updateForms)
                    self.updateForms();
                continue;
            }
            //直接写入
            this.state[i] = state[i];
        }
        this.triggerMessage("update-state");
        this.correctData();
    }

    /**
     * 设置一个关联关系
     * @param {string} key 要设置的输入key
     * @param {LogicWorker.LinkType} link 关联内容
     * @param {number} index 要关联的下标，多输入时生效
     */
    this.setLink = function(key,link,index){
        if(link != null && !worker.canTypeAtoB(worker.nodes[link.uid].state.outputs[link.key].type,self.state.inputs[key].type))
            return;
        if(self.state.inputs[key].many){
            //多输入处理
            if(this.attr.links[key] == null || this.attr.links[key].uid)
                this.attr.links[key] = {};
            this.attr.links[key][index] = link;
        }else
            this.attr.links[key] = link;
        this.triggerMessage("update-attr");
        this.correctData();
        updateArgs();
    }


    /**
     * 获取节点要保存的数据
     * @returns 保存的数据
     */
    this.$save = function(){
        //记录表单数据
        for(var i in this.state.forms)
            this.attr.forms[i] = this.state.forms[i];
        //独立的保存数据处理
        if(this.save)
            this.save();
        return this.attr;
    }



    //============实际工作流程============

    /**
     * 让组件主动执行一次逻辑，通过runOnce执行的话组件的所有依赖组件都会尝试执行
     */
    this.runOnce = async function(task,followKey){
        //根节点预先进行依赖传递
        if(task == null)
            this.updateFollow();

        //初始化任务记录
        task = task || {
            /**运行完毕的节点UID */
            endNode:{}
        };

        //如果该节点运行过
        if(task.endNode[this.attr.uid])
            return;
        task.endNode[this.attr.uid] = true;

        //节点准备完毕
        this.state.running = 1;
        this.state.errorInfo = null;
        self.triggerMessage("run-ready");

        //运行一个节点
        var runNode = async function(node){
            if(!node.needUpdate())
                return;
            await node.runOnce(task);
        }

        //处理所有的依赖
        for(var i in this.attr.links){
            if(self.state.inputs[i].many){
                for(var j in this.attr.links[i])
                    await runNode(worker.nodes[this.attr.links[i][j].uid]);
            }else{
                await runNode(worker.nodes[this.attr.links[i].uid]);
            }
        }

        //重新处理参数依赖
        this.correctData();

        //节点开始运行
        this.state.running = 2;
        self.triggerMessage("run-start");

        //错误捕获
        try{
            //运行节点
            if(this.run && typeof this.run == "function"){
                var re = await this.run(this.state.args,followKey);
                if(typeof re == "object"){
                    for(var i in re)
                        this.state.values[i] = re[i];
                }
            }

            //节点运行完毕
            this.state.running = 0;
            this.triggerMessage("run-end");
        }catch(e){
            console.error(e);
            this.state.running = 3
            this.state.errorInfo = e.stack;
            this.triggerMessage("run-end");
        }

        //对于存在依赖关联的组件主动运行
        for(var i in worker.nodes){
            var node = worker.nodes[i];
            for(var j in node.attr.links){
                var link = node.attr.links[j];
                if(link.uid == this.attr.uid && node.state.inputs[j].follow)
                    await node.runOnce(task,j);
            }
        }
    }

    /**是否依赖更新 */
    var followUpdate = false;
    /**
     * 默认的更新判断，如果上级任何依赖有更新或者该组件参数更新则更新
     * @returns {boolean}
     */
    this.$needUpdate = function(){
        return followUpdate;
    }

    /**运行前执行，更新依赖树，不需要手动运行 */
    this.updateFollow = function(task){
        //初始化任务记录
        task = task || {
            /**运行完毕的节点UID */
            endNode:{},
            /**发起运行的节点 */
            runNode:self
        };

        //如果该节点运行过
        if(task.endNode[this.attr.uid])
            return;
        task.endNode[this.attr.uid] = true;

        //默认置否
        followUpdate = false;

        //更新一个节点
        var updateNode = function(node){
            //处理依赖
            node.updateFollow(task);
            //使用needUpdate进行判断
            if(!node.needUpdate())
                return;
            
            //依赖需要更新则自身也需要更新
            followUpdate = true;
        }

        //处理所有的依赖
        for(var i in this.attr.links){
            if(self.state.inputs[i].many){
                for(var j in this.attr.links[i])
                    updateNode(worker.nodes[this.attr.links[i][j].uid]);
            }else{
                updateNode(worker.nodes[this.attr.links[i].uid]);
            }
        }

        //如果有依赖型参数变化
        if(argsNeedUpdate){
            followUpdate = true;
            if(task.runNode != self)
                argsNeedUpdate = false;
        }

        return followUpdate;
    }

    /**是否有依赖变化 */
    var argsNeedUpdate = true;

    /**参数或者结构被更新 */
    var updateArgs = self.updateArgs = function(){
        argsNeedUpdate = true;
        if(self.autoRun)
            self.runOnce();
    }

    /**
     * 返回当前是否需要更新，如果返回false，被依赖请求时不会运行，该节点所依赖的组件也不会运行
     * @returns {boolean}
     */
    this.needUpdate = this.module.needUpdate || function(){
        return self.$needUpdate();
    }





    //默认使用函数中的扩展
    this.run = this.module.run;
    this.uiInit = this.module.uiInit;
    this.infoRender = this.module.infoRender;
    this.autoRun = this.module.autoRun;
    this.save = this.module.save;
    this.updateForms = this.module.updateForms;

    //初始化逻辑扩展
    if(this.module.init)
        this.module.init.call(this);

    //如果自动矫正
    if(correct == true){
        this.correctData();
    }
    
    //首次参数更新回调
    if(this.updateForms)
        this.updateForms();

}