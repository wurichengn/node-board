import { LogicWorker } from "logic-worker/logic-worker.js";

var React = require("react");
var LcgReact = require("lcg-react");
var MapUIMenu = require("./map-ui-menu.js");

/**节点编辑器界面 */
export class MapUI extends LcgReact{
    async init(){
        var self = this;
        //结构定义
        this.$dom(function(){
            return <div>
                <div className="bg"></div>
                <svg lid="svg" width="8000" height="8000">
                    <g lid="g"></g>
                </svg>
                <div className="layout" lid="layout"></div>
            </div>;
        });

        //样式
        this.css({
            "width":"100%",
            "height":"100%",
            "position":"relative",
            ">svg":{
                "position":"absolute",
                "left":"50%",
                "top":"50%",
                "margin-left":"-4000px",
                "margin-top":"-4000px"
            }
        });

        /**@type {LogicWorker} 逻辑执行处理器*/
        this.logic = this.props.logic || new LogicWorker();
        this.logic.messages["map-ui"] = this;

        /**组件菜单 */
        this.moduleMenu = {};
        var lastModuleKeys = [];

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
            if(JSON.stringify(lastModuleKeys) == JSON.stringify(keys))
                return;
            lastModuleKeys = keys;
            for(var i in self.logic.modules){
                if(self.logic.modules[i].menu)
                    addModuleMenu(self.logic.modules[i].menu,i);
            }
        }

        //右键菜单
        this.on("contextmenu",function(e){
            updateMenu();
            baseMenu.show(e,self.moduleMenu);
            e.preventDefault();
        });

        //基本右键菜单
        var baseMenu = (await MapUIMenu.new({callback:function(e){
            self.logic.addNode();
        }})).module;

        //侦听逻辑处理消息
        this.message({"logic-add-node":function(){
            console.log("add-node");
            self.$r();
        }});
    }
}