var React = require("react");
var lcg = require("lcg");
var LcgReact = require("lcg-react");
const { Menu } = require("antd");

class MapUIMenu extends LcgReact.define({
    /**@type {(cfg:{value:string})=>{}} 菜单选中的回调*/
    callback:null
}){
    init(){
        var self = this;

        //当前坐标
        var pos = {x:0,y:0};
        //菜单项
        var menuData = {};
        //是否显示
        var isShow = false;
        var lastTarget = null;

        //组件结构
        this.$dom(function(){
            //样式处理
            var style = {};
            if(!isShow)
                style["display"] = "none";
            style["left"] = pos.x + "px";
            style["top"] = pos.y + "px";

            //构造菜单
            var menus = buildMenu(menuData);

            return <div style={style}>{menus}</div>;
        });

        //样式
        this.css({
            "z-index":1,
            "position":"fixed",
            "border":"1px solid #ddd"
        });

        //构造菜单项
        var buildMenu = function(data,key){
            var list = [];
            for(var i in data){
                if(typeof data[i] == "string")
                    list.push(<Menu.Item value={data[i]}>{i}</Menu.Item>);
                else if(lcg.isArray(data[i]))
                    list.push(<Menu.Item {...data[i][0]}>{i}</Menu.Item>);
                else
                    list.push(buildMenu(data[i],i));
            }
            if(key == null)
                return <Menu onSelect={MenuCallBack}>{list}</Menu>;
            else
                return <Menu.SubMenu title={key}>{list}</Menu.SubMenu>;
        }

        //回调处理
        var MenuCallBack = function(vals){
            isShow = false;
            self.$r();
            if(self.props.callback)
                self.props.callback({...vals,value:vals.item.props.value,target:lastTarget});
        }

        /**
         * 显示菜单
         * @param {{x:number,y:number}} p 要显示菜单的位置
         * @param {*} data 当前的菜单状态
         */
        this.show = function(p,data,target){
            lastTarget = target;
            pos = p;
            menuData = data || menuData;
            isShow = true;
            self.$r();
        }

        //节点准备完毕
        this.message("dom-ready",function(){
            document.body.appendChild(self._proxy);
        });

        //全局点击
        lcg.domEvent(document,"click",function(e){
            if(lcg.isChild(self._proxy,e.target))
                return;
            isShow = false;
            self.$r();
        });
    }
}


module.exports = MapUIMenu;