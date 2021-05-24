var React = require("react");
var LcgReact = require("lcg-react");
import {MapUI} from 'map-ui';
//引入基础样式扩展
require("lcg-style");

/**编辑器整体界面 */
export class EditorUI extends LcgReact{
    /**@type {MapUI} 图组件实例*/
    map;

    init(){
        var self = this;
        //结构定义
        this.$dom(function(){
            return <div>
                <div></div>
                <div className="right">
                    <div></div>
                    <div><MapUI lid="map-ui"></MapUI></div>
                </div>
            </div>;
        });

        //样式
        this.css({
            "width":"100%",
            "height":"100%",
            "ui-layout":["h",1,1],
            ">.right":{
                "ui-layout":["v",1,1]
            }
        });

        //节点准备完成
        this.message("dom-ready",function(){
            self.map = self.ids["map-ui"].module;
        });
    }
}