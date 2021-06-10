import { LogicWorker,LogicNode } from "logic-worker";

var lcg = require("lcg");
var React = require("react");
var LcgReact = require("lcg-react");
var MapUIMenu = require("./map-ui-menu.js");
import {MapUINode} from "./map-ui-node.js";
//初始化全局事件消息
var LcgEvent = require("lcg-events");
LcgEvent();

/**节点编辑器界面 */
export class MapUI extends LcgReact.define({},{
    /**视图偏移x */
    x:0,
    /**视图偏移y */
    y:0,
    /**@type {string} 当前聚焦的输出类型 null则为无 */
    outType:null
}){
    async init(){
        var self = this;

        /**构造线条 */
        var buildLine = this.buildLine = function(p1,p2){
            var c = {x:(p2.x + p1.x) / 2,y:(p2.y + p1.y) / 2};
            return "M"+p1.x+","+p1.y+" Q"+(p1.x + 40)+","+p1.y+","+c.x+","+c.y+" T"+p2.x+","+p2.y;
        }

        /**构造临时线条 */
        var getLines = function(){
            var re = [];
            for(var i in self.logic.nodes){
                var node = self.logic.nodes[i];
                if(node.state.line)
                    re.push(<path key={i} className="top-line" d={buildLine(node.state.line[0],node.state.line[1])}></path>);
            }
            return re;
        }

        /**构造关联线条 */
        var getLinks = function(){
            var re = [];
            for(var i in self.logic.nodes){
                var node = self.logic.nodes[i];
                var n1 = self.nodeModules[node.attr.uid];
                if(n1 == null)
                    continue;
                //循环创建连接线
                for(var j in node.attr.links){
                    if(node.state.inputs[j].many){
                        //多输入
                        for(var k in node.attr.links[j]){
                            /**@type {LogicWorker.LinkType} */
                            var link = node.attr.links[j][k];
                            var n2 = self.nodeModules[link.uid];
                            if(n2 == null)
                                continue;
                            var key = n1.node.attr.uid + ":" + n2.node.attr.uid + ":" + j + ":" + link.key + ":" + k;
                            re.push(<MapUILink index={k} key={key} map={self} nodeIn={n1} keyIn={j} nodeOut={n2} keyOut={link.key}></MapUILink>);
                        }
                    }else{
                        //单输入
                        /**@type {LogicWorker.LinkType} */
                        var link = node.attr.links[j];
                        var n2 = self.nodeModules[link.uid];
                        if(n2 == null)
                            continue;
                        var key = n1.node.attr.uid + ":" + n2.node.attr.uid + ":" + j + ":" + link.key;
                        re.push(<MapUILink key={key} map={self} nodeIn={n1} keyIn={j} nodeOut={n2} keyOut={link.key}></MapUILink>);
                    }
                }
            }
            return re;
        }

        /**@type {{[index:string]:MapUINode}} 节点组件表 */
        this.nodeModules = {};

        //结构定义
        this.$dom(function(){
            var nodes = [];
            if(self.logic){
                for(var i in self.logic.nodes)
                    nodes.push(<MapUINode key={i} map={self} node={self.logic.nodes[i]}></MapUINode>);
            }

            return <div>
                <svg lid="svg" width="8000" height="8000">
                    <g>
                        <g style={{transform:"translate("+self.state.x+"px,"+self.state.y+"px)"}}>
                            <g>{getLines()}</g>
                            <g>{getLinks()}</g>
                        </g>
                    </g>
                </svg>
                <div style={{marginLeft:self.state.x - 8000 + "px",marginTop:self.state.y - 8000 + "px"}} className="layout" lid="layout">{nodes}</div>
            </div>;
        });

        //样式
        this.css({
            "width":"100%",
            "height":"100%",
            "position":"relative",
            "background-color":"#fafafa",
            "background-image":"linear-gradient(#ddd 0%,#ddd 5%,rgba(0,0,0,0) 6%),linear-gradient(90deg,#ddd 0%,#ddd 5%,rgba(0,0,0,0) 6%)",
            "background-size":"20px 20px",
            "user-select":"none",
            "overflow":"hidden",
            ">svg":{
                "position":"absolute",
                "left":"50%",
                "top":"50%",
                "margin-left":"-4000px",
                "margin-top":"-4000px",
                "pointer-events":"none",
                ">g":{
                    "transform":"translate(4000px,4000px)",
                    " .top-line":{
                        "stroke":"#ff7e18",
                        "stroke-width":"2",
                        "fill":"none"
                    },
                    " .trans-line":{
                        "stroke":"rgba(0,0,0,0)",
                        "stroke-width":"10",
                        "fill":"none",
                        "pointer-events":"all"
                    },
                    "cursor":"pointer"
                }
            },
            ">.layout":{
                "position":"absolute",
                "left":"50%",
                "top":"50%",
                "width":"0px",
                "height":"0px"
            }
        });

        /**@type {LogicWorker} 逻辑执行处理器*/
        this.logic = this.props.logic || new LogicWorker();
        this.logic.messages["map-ui"] = this;

        /**组件菜单 */
        this.moduleMenu = {"变量":{}};
        var lastModuleKeys = [];
        var lastTypeKeys = [];

        /**
         * 添加一个组件菜单项
         * @param {string} path 菜单路径
         * @param {string} key 组件的唯一标识符
         */
        var addModuleMenu = function(path,key){
            path = path.split("/");
            var target = self.moduleMenu;
            for(var i = 0;i < path.length - 1;i++){
                target[path[i]] = target[path[i]] || {};
                target = target[path[i]];
            }
            target[path[i]] = key;
        }

        /**
         * 更新菜单项
         */
        var updateMenu = function(){
            var keys = Object.keys(self.logic.modules);
            var keyst = Object.keys(self.logic.types);
            if(JSON.stringify(lastModuleKeys) == JSON.stringify(keys) && JSON.stringify(lastTypeKeys) == JSON.stringify(keyst))
                return;
            lastModuleKeys = keys;
            lastTypeKeys = keyst;
            //更新组件菜单
            for(var i in self.logic.modules){
                if(self.logic.modules[i].menu)
                    addModuleMenu(self.logic.modules[i].menu,i);
            }
            //更新类型菜单
            for(var i in self.logic.types){
                var type = self.logic.types[i];
                //如果支持表单
                if(type.name)
                    addModuleMenu("变量/" + type.name,"$$type/" + i);
            }
        }

        //右键菜单
        this.on("contextmenu",function(e){
            e.preventDefault();
            if(e.target != self._proxy)
                return;
            updateMenu();
            self.baseMenu.show(e,self.moduleMenu);
        });

        /**
         * 在图内部发送消息
         * @param {string} msg 消息类型
         * @param {*} vals 消息内容
         */
        this.trigger = function(msg,vals){
            lcg.triggerDom(msg,vals,self._proxy);
        }

        /**
         * 鼠标坐标变换为视图坐标
         * @param {{x:number,y:number}} pos 鼠标坐标
         * @returns {{x:number,y:number}} 视图坐标
         */
        this.mouse2view = function(pos){
            var box = self.ids["layout"].getBoundingClientRect();
            return {x:pos.x - box.left - 8000,y:pos.y - box.top - 8000};
        }

        /**
         * 显示关联右键菜单
         * @param {*} data 
         */
        this.showLinkMenu = function(pos,data){
            self.linkMenu.show(pos,{"删除":"#delete"},data);
        }

        /**
         * 显示节点菜单
         * @param {{x:number,y:number}} pos 
         * @param {MapUINode} data 
         */
        this.showNodeMenu = function(pos,data){
            self.nodeMenu.show(pos,{"删除":"#delete"},data);
        }


        
        /**@type {MapUIMenu} 基本右键菜单 */
        this.baseMenu = (await MapUIMenu.new({callback:function(e){
            //如果是变量
            if(e.value.substr(0,7) == "$$type/"){
                var type = e.value.substr(7);
                var info = self.mouse2view({x:e.e.x,y:e.e.y});
                info.var_type = type;
                info.title = "变量 - " + self.logic.types[type].name;
                self.logic.addNode("base/tools/easy-var",info);
                return;
            }
            //如果是组件
            self.logic.addNode(e.value,self.mouse2view({x:e.e.x,y:e.e.y}));
        }})).module;


        /**@type {MapUIMenu} 连接线右键菜单 */
        this.linkMenu = (await MapUIMenu.new({callback:function(e){
            /**@type {MapUINode} */
            var nodeIn = e.target.nodeIn;
            nodeIn.node.setLink(e.target.keyIn,null,e.target.index);
        }})).module;


        /**@type {MapUIMenu} 节点菜单 */
        this.nodeMenu = (await MapUIMenu.new({callback:function(e){
            //移除节点
            self.logic.removeNode(e.target.node.attr.uid);
        }})).module;


        //侦听逻辑处理消息
        this.message({
            "logic-add-node":function(){self.$r();},
            "logic-remove-node":function(){self.$r();},
            "logic-node-update-state":function(){self.$r();},
            "logic-node-update-attr":function(){self.$r();},
            "logic-load-data":function(){
                self.$r();
                setTimeout(function(){
                    self.$r();
                });
            }
        });


        //移动画布
        !function(){
            var isd = false;
            var sx,sy,mx,my;

            self.on("mousewheel",function(e){
                e.preventDefault();
                self.setState({
                    x:self.state.x - e.deltaX,
                    y:self.state.y - e.deltaY
                });
            });

            self.on("mousedown",function(e){
                if(e.button != 1)
                    return;
                isd = true;
                sx = self.state.x;
                sy = self.state.y;
                mx = e.x;
                my = e.y;
            });

            self.message("mousemove",function(e){
                if(!isd)
                    return;
                self.setState({
                    x:sx + e.x - mx,
                    y:sy + e.y - my
                })
            });

            self.message("mouseup",function(e){
                if(!isd)
                    return;
                isd = false;
            });
        }();


        //每秒进行重绘
        var cd = 0;
        this.message("dt",function(){
            cd--;
            if(cd > 0)
                return;
            cd = 50;
            self.$r();
        });


        //粘贴处理
        this.on("paste",function(e){
            if(e.clipboardData == null || e.clipboardData.items == null)
                return;
            for(var i = 0;i < e.clipboardData.items.length;i++){
                var item = e.clipboardData.items[i];
                if(item.kind == "string")
                    item.getAsString(function(vals){
                        self.sendMessage("paste-data",{kind:this.kind,type:this.type,data:vals});
                    }.bind({kind:item.kind,type:item.type}));
                if(item.kind == "file")
                    self.sendMessage("paste-data",{kind:item.kind,type:item.type,data:item.getAsFile()});
            }
        });
    }
}


/**关联组件 */
class MapUILink extends LcgReact.define({
    /**@type {MapUI} map实例 */
    map:null,
    /**@type {MapUINode} 数据输入节点 */
    nodeIn:null,
    /**@type {string} 数据输入对应的key */
    keyIn:null,
    /**@type {MapUINode} 数据输出节点 */
    nodeOut:null,
    /**@type {string} 数据输出对应的key */
    keyOut:null,
    /**@type {number} 对应的输入下标，多输入时存在 */
    index:null
}){
    init(){
        var self = this;
        var {map,nodeIn,nodeOut,keyIn,keyOut} = this.props;

        if(self.props.index != null)
            keyIn = keyIn + "##" + self.props.index;

        //节点结构
        this.$dom(function(){
            return <g>
                <path className="trans-line" d={map.buildLine(nodeOut.outputModules[keyOut].getPointPos(),nodeIn.inputModules[keyIn].getPointPos())}></path>
                <path className="top-line" d={map.buildLine(nodeOut.outputModules[keyOut].getPointPos(),nodeIn.inputModules[keyIn].getPointPos())}></path>
            </g>;
        });

        //右键菜单
        this.on("contextmenu",function(e){
            map.showLinkMenu(e,self.props);
        });
    }
}