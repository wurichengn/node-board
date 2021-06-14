import { MapUI } from "map-ui";
import {LogicWorker} from "logic-worker";
import { image2Canvas } from "../tools";
var Defs = require("def-modules");
var lcg = require("lcg");
require("lcg-style");

var LcgReact = require("lcg-react");
var React = require("react");

window.window.__glsl_pack_debug = true;

export class ImageEditor extends LcgReact.define({},{
    /**是否显示结构图 */
    mapShow:false,
    /**当前图像的宽度 */
    width:300,
    /**当前图像的高度 */
    height:150,
    /**当前画布缩放 */
    scale:1,
    /**输入表 */
    inputList:[],
    /**输入的值记录 */
    inputValues:{}
}){
    init(){
        var self = this;

        /**@type {MapUI} UI的图组件实例 */
        this.map;
        /**@type {LogicWorker} UI的逻辑组件实例 */
        this.logic;

        //节点准备完成
        this.message("dom-ready",function(){
            self.map = self.ids["map"].module;
            self.logic = self.map.logic;
            //初始化组件
            Defs.base(self.logic);
            Defs.image(self.logic);
            self.ids["canvas"].getContext("2d");
            //载入内容
            if(localStorage["save"])
                self.logic.load(JSON.parse(localStorage["save"]));
            //开始运行
            step();
        });

        //初始化dom
        this.$dom(function(){
            
            //是否显示图
            var className = "";
            if(self.state.mapShow)
                className = "show-map";

            //显示视图按钮
            var viewButton = <button className="ant-btn" onClick={function(){self.setState({mapShow:true})}}>显示逻辑图</button>;
            if(self.state.mapShow)
                viewButton = <button className="ant-btn" onClick={function(){self.setState({mapShow:false})}}>隐藏逻辑图</button>;

            var argsList = [];
            for(var i in self.state.inputList){
                var info = self.state.inputList[i];
                argsList.push(<EditorArgs par={self} key={i + ":" + info.type} name={info.name} id={info.key} type={info.type}></EditorArgs>);
            }

            return <div className={className}>
                <div className="editor">
                    <div className="menu">
                        <button className="ant-btn" onClick={function(){save()}}>保存</button>
                        {viewButton}
                    </div>
                    <div className="panle">
                        <div className="args">{argsList}</div>
                        <div className="view" lid="view">
                            <div>
                                <canvas lid="canvas" style={{left:-self.state.width / 2 + "px",top:-self.state.height / 2 + "px",transform:"scale3d(" + self.state.scale + "," + self.state.scale + ",1)"}} lid="canvas"></canvas>
                            </div>
                        </div>
                    </div>
                </div>
                <div className="map">
                    <MapUI lid="map"></MapUI>
                </div>
            </div>;
        });

        //样式
        this.css({
            "width":"100%",
            "height":"100%",
            ">div":{
                "height":"100%"
            },
            ">.map":{
                "display":"none"
            },
            ".show-map":{
                ">div":{
                    "height":"50%"
                },
                ">.map":{
                    "display":"block"
                }
            },
            ">.editor":{
                "overflow":"hidden",
                ">.menu":{
                    "height":"40px",
                    "ui-center":">*",
                    "text-align":"left",
                    "border-bottom":"1px solid #ddd",
                    "background-color":"#f6f6f6",
                    ">button":{
                        "margin":"0px 8px"
                    }
                },
                ">.panle":{
                    "height":"calc(100% - 40px)",
                    "ui-layout":["250px",1],
                    ">.view":{
                        "overflow":"hidden",
                        "background-color":"#ccc",
                        "border-left":"1px solid #aaa",
                        "position":"relative",
                        ">div":{
                            "position":"absolute",
                            "left":"50%",
                            "top":"50%",
                            ">canvas":{
                                "position":"absolute"
                            }
                        }
                    }
                }
            }
        });

        //粘贴功能
        lcg.on("paste-data",function(data){
            if(data.kind == "file" && data.type.substr(0,6) == "image/"){
                self.logic.addNode("image:file-to-img",{importFile:data.data});
            }
        });

        //存储内容
        var save = function(){
            var data = JSON.stringify(self.logic.save());
            localStorage["save"] = data;
            console.log(data);
        }

        //频繁运行内容
        var step = async function(){
            try{
                if(self.logic){
                    self.setState({inputList:self.logic.getGlobalInputs()});
                }
            }catch(e){console.error(e);}
            //运行内容
            try{
                if(self.logic){
                    var data = await self.logic.run("image",self.state.inputValues);
                    if(data.image && data.image.data){
                        await image2Canvas(data.image,self.ids["canvas"]);
                        self.setState({width:self.ids["canvas"].width,height:self.ids["canvas"].height});
                    }
                }
            }catch(e){
                console.error(e);
            }
            //每秒刷新两次
            setTimeout(step,20);
        }

        
        this.message("dom-ready",function(){
            //滚轮缩放
            lcg.domEvent(self.ids["view"],"mousewheel",function(e){
                if(e.deltaY > 0)
                    self.setState({scale:self.state.scale * 0.95});
                if(e.deltaY < 0)
                    self.setState({scale:self.state.scale / 0.95});
            });
        });

    }
}




class EditorArgs extends LcgReact.define({
    /**@type {ImageEditor} 所属的编辑器实例 */
    par:null,
    /**@type {string} 组件的名称 */
    name:null,
    /**@type {string} 组件所属的key */
    id:null,
    /**@type {string} 数据类型 */
    type:null
}){
    init(){
        var self = this;

        var inputChange = function(e){
            self.props.par.state.inputValues[self.props.id] = e.target.value;
        }

        //初始化dom
        this.$dom(function(){
            var ip = <input className="ant-input" type="text" onChange={inputChange} value={self.props.par.state.inputValues[self.props.id]} />;
            if(self.props.type == "number")
                ip = <input className="ant-input" type="number" onChange={inputChange} value={self.props.par.state.inputValues[self.props.id]} />;
            if(self.props.type == "color")
                ip = <input className="ant-input" type="color" onChange={inputChange} value={self.props.par.state.inputValues[self.props.id]} />;

            return <div>
                <div className="title">{self.props.name}</div>
                <div>{ip}</div>
            </div>;
        });

        this.css({
            "padding":"4px 8px"
        });
    }
}