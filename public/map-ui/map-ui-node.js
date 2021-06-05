var React = require("react");
var LcgReact = require("lcg-react");
import { LogicNode,LogicWorker } from "logic-worker";
import { MapUI } from "./map-ui";
var lcg = require("lcg");


export class MapUINode extends LcgReact.define({
    /**@type {MapUI} 节点所属map */
    map:null,
    /**@type {LogicNode} 节点UI对应的逻辑节点 */
    node:null
}){
    init(){
        var self = this;
        /**节点所属的map实例 */
        var map = this.map = this.props.map;
        /**节点所属的逻辑实例 */
        var node = this.node = this.props.node;
        //加入到消息队列
        node.messages["map-ui-node"] = this;
        node.messages["map-ui"] = map;

        //设置node关联UI
        node.UI = this;

        //设置组件映射表
        map.nodeModules[node.attr.uid] = this;

        /**@type {{[index:string]:MapUIInput}} 输入UI组件实例表 */
        this.inputModules = {};
        /**@type {{[index:string]:MapUIOutput}} 输出UI组件实例表 */
        this.outputModules = {};

        /**记录输出下标组 */
        var lastOutKeys = [];
        /**记录输入下标组 */
        var lastInKeys = [];

        //节点内容
        this.$dom(function(){
            //定位
            var style = {
                left:node.attr.x + 8000 + "px",
                top:node.attr.y + 8000 + "px",
                minWidth:node.attr.width + "px"
            };

            //构造输入
            var inputs = [];
            for(var i in node.state.inputs){
                inputs.push(<MapUIInput key={i} id={i} node={self} conf={node.state.inputs[i]}></MapUIInput>)
            }

            //构造输出
            var outputs = [];
            for(var i in node.state.outputs){
                outputs.push(<MapUIOutput key={i} id={i} node={self} conf={node.state.outputs[i]}></MapUIOutput>)
            }

            //清空输入输出缓存
            if(JSON.stringify(Object.keys(node.state.inputs)) == JSON.stringify(lastInKeys)){
                lastInKeys = Object.keys(node.state.inputs);
                self.inputModules = {};
            }
            if(JSON.stringify(Object.keys(node.state.outputs)) == JSON.stringify(lastOutKeys)){
                lastOutKeys = Object.keys(node.state.outputs);
                self.outputModules = {};
            }

            //扩展节点
            var infoNode = null;
            if(node.infoRender)
                infoNode = node.infoRender(self);

            //节点样式
            var nodeStyle = "";
            if(node.state.running == 1)
                nodeStyle = "node-ready";
            if(node.state.running == 2)
                nodeStyle = "node-running";
            if(node.state.running == 3)
                nodeStyle = "node-error";

            return <div className={nodeStyle} style={style} title={node.state.errorInfo}>
                <div className="title" lid="title">{node.attr.title}</div>
                <div className="info">{infoNode}</div>
                <div>{inputs}</div>
                <div>{outputs}</div>
                <div className="floor">
                    <div lid="resize" className="resize"></div>
                </div>
            </div>;
        });

        //样式
        this.css({
            "position":"absolute",
            "min-width":"120px",
            "background-color":"#eee",
            "border-radius":"3px",
            "border":"1px solid #777",
            ">.title":{
                "cursor":"pointer",
                "background-color":"#d7d7d7",
                "height":"28px",
                "overflow":"hidden",
                "line-height":"28px",
                "text-align":"center",
                "border-radius":"3px 3px 0px 0px"
            },
            ">.floor":{
                "height":"8px",
                "background-color":"#d7d7d7",
                "border-radius":"0px 0px 3px 3px",
                "position":"relative",
                ">.resize":{
                    "background-color":"#bbb",
                    "position":"absolute",
                    "right":"0px",
                    "top":"0px",
                    "height":"100%",
                    "width":"10px",
                    "cursor":"e-resize"
                }
            },
            ".node-ready":{
                "border-color":"#438bf5",
                "box-shadow":"0px 0px 3px 1px #438bf5"
            },
            ".node-running":{
                "border-color":"#15d36a",
                "box-shadow":"0px 0px 3px 1px #15d36a"
            },
            ".node-error":{
                "border-color":"#ff0000",
                "box-shadow":"0px 0px 3px 1px #ff0000"
            }
        });

        //标题拖动处理
        this.message("dom-ready",function(){
            var isd = false;
            var sx,sy,mx,my;
            
            //鼠标按下
            lcg.domEvent(self.ids["title"],"mousedown",function(e){
                isd = true;
                sx = node.attr.x;
                sy = node.attr.y;
                mx = e.x;
                my = e.y;
            });

            //鼠标移动
            self.message("mousemove",function(e){
                if(!isd)
                    return;
                //更新属性
                node.setAttr({
                    x:sx + e.x - mx,
                    y:sy + e.y - my
                });
            });

            //鼠标放开
            self.message("mouseup",function(){
                if(!isd)
                    return;
                isd = false;
            });
        });

        //大小拖动处理
        this.message("dom-ready",function(){
            var isd = false;
            var sx,mx;
            
            //鼠标按下
            lcg.domEvent(self.ids["resize"],"mousedown",function(e){
                isd = true;
                sx = Math.floor(self._proxy.offsetWidth);
                mx = e.x;
            });

            //鼠标移动
            self.message("mousemove",function(e){
                if(!isd)
                    return;
                //更新属性
                node.setAttr({
                    width:Math.max(120,e.x - mx + sx)
                });
            });

            //鼠标放开
            self.message("mouseup",function(){
                if(!isd)
                    return;
                isd = false;
            });
        });

        //节点消息侦听
        this.message({
            "logic-node-run-ready":function(){self.$r();},
            "logic-node-run-end":function(){self.$r();},
            "logic-node-run-start":function(){self.$r();}
        });
        
        //初始化组件扩展
        if(node.uiInit)
            node.uiInit(this);

        this.message("dom-ready",function(){
            //标题右键菜单
            lcg.domEvent(self.ids["title"],"contextmenu",function(e){
                map.showNodeMenu(e,self);
            });
        });
    }
}



/**节点输入UI组件 */
export class MapUIInput extends LcgReact.define({
    /**@type {MapUINode} 输出所属的节点组件 */
    node:null,
    /**@type {string} 输出的节点下标 */
    id:null,
    /**@type {LogicWorker.InputType} 输出节点的参数 */
    conf:null
}){
    init(){
        var self = this;
        var id = this.id = this.props.id;
        var node = this.node = this.props.node;
        var conf = this.conf = this.props.conf;

        //组件结构
        this.$dom(function(){
            //输入key绑定
            node.inputModules[id] = self;

            //输入名
            var name = self.props.conf.name || id;

            //是否有关联项
            var contentOpacity = 1;
            if(node.node.attr.links[id])
                contentOpacity = 0.5;

            //输入表单构造
            var type = node.node.worker.getType(self.props.conf.type);
            var vdom;
            if(!self.props.conf.ban_form && type.formRender){
                vdom = type.formRender({
                    module:self,
                    key:id,
                    name:name,
                    conf:self.props.conf,
                    node,
                    value:node.node.state.forms[id]
                });
            }
            if(vdom)
                vdom = <div className="form" style={{opacity:contentOpacity}}>{vdom}</div>;

            //输入点是否高亮
            var pointClass = "point";
            if(node.map.logic.canTypeAtoB(node.map.state.outType,self.props.conf.type))
                pointClass += " active";

            //是否显示连接点
            var pointDisplay = "";
            if(self.props.conf.ban_link)
                pointDisplay = "none";

            return <div>
                {vdom || <div className="content" style={{opacity:contentOpacity}}>{self.props.conf.name || id}</div>}
                <div className={pointClass} lid="point" title={"类型：" + type.name} style={{display:pointDisplay}}></div>
            </div>;
        });

        //组件样式
        this.css({
            "position":"relative",
            "min-height":"26px",
            ">.form":{
                "min-height":"100%",
                "text-align":"center",
                "position":"relative"
            },
            ">.content":{
                "text-align":"left",
                "line-height":"26px",
                "padding-left":"10px"
            },
            ">.point":{
                "position":"absolute",
                "height":"12px",
                "width":"12px",
                "border-radius":"100%",
                "left":"-7px",
                "top":"7px",
                "background-color":"#ccc",
                "border":"1px solid #777",
                "cursor":"pointer",
                ".active":{
                    "background-color":"#ff8b2f"
                }
            }
        });

        /**写入表单值 */
        this.setValue = function(val){
            node.node.setState({
                forms:{[id]:val}
            });
        }

        /**
         * 获取输入点坐标
         * @returns {{x:number,y:number}}
         */
         this.getPointPos = function(){
            var pos = lcg.getDomOffset(self.ids["point"],node._proxy);
            pos.x += node.node.attr.x + 7;
            pos.y += node.node.attr.y + 7;
            return pos;
        }

        //真实节点初始化完成
        this.message("dom-ready",function(){
            self.ids["point"].$$__map_input_module = self;
        })
    }
}




/**节点输出UI组件 */
export class MapUIOutput extends LcgReact.define({
    /**@type {MapUINode} 输出所属的节点组件 */
    node:null,
    /**@type {string} 输出的节点下标 */
    id:null,
    /**@type {LogicWorker.OutputType} 输出节点的参数 */
    conf:null
}){
    init(){
        var self = this;
        var id = this.id = this.props.id;
        var node = this.node = this.props.node;

        //组件结构
        this.$dom(function(){
            //输出key绑定
            node.outputModules[id] = this;

            var type = node.node.worker.getType(self.props.conf.type);

            return <div>
                <div className="content">{this.props.conf.name || id}</div>
                <div className="point" lid="point" title={"类型：" + type.name}></div>
            </div>;
        });

        //组件样式
        this.css({
            "position":"relative",
            "min-height":"26px",
            ">.content":{
                "text-align":"right",
                "line-height":"26px",
                "padding-right":"10px"
            },
            ">.point":{
                "position":"absolute",
                "height":"12px",
                "width":"12px",
                "border-radius":"100%",
                "right":"-7px",
                "top":"7px",
                "background-color":"#ccc",
                "border":"1px solid #777",
                "cursor":"pointer",
                ":hover":{
                    "background-color":"#ff8b2f"
                }
            }
        });

        /**
         * 获取输出点坐标
         * @returns {{x:number,y:number}}
         */
        this.getPointPos = function(){
            var pos = lcg.getDomOffset(self.ids["point"],node._proxy);
            pos.x += node.node.attr.x + 7;
            pos.y += node.node.attr.y + 7;
            return pos;
        }

        //输出关联
        this.message("dom-ready",function(){
            var isd = false;
            var p1,p2;

            //鼠标按下
            lcg.domEvent(self.ids["point"],"mousedown",function(e){
                isd = true;
                p1 = self.getPointPos();
                p2 = p1;
                node.map.setState({outType:self.props.conf.type});
            });

            //鼠标移动
            self.message("mousemove",function(e){
                if(!isd)
                    return;
                p2 = node.map.mouse2view(e);
                node.node.setState({
                    line:[p1,p2]
                })
            });

            //鼠标放开
            self.message("mouseup",function(e){
                if(!isd)
                    return;
                isd = false;
                if(e.target.$$__map_input_module){
                    /**@type {MapUIInput} */
                    var input = e.target.$$__map_input_module;
                    input.node.node.setLink(input.id,{uid:node.node.attr.uid,key:id});
                }
                node.map.setState({outType:null});
                node.node.setState({line:null});
            });
        });
    }
}