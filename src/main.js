const { EditorUI } = require("editor-ui");
var Defs = require("def-modules");
const { MapUI } = require("map-ui");


//初始化一个节点编辑面板
!async function(){
    var map = await MapUI.new();
    window.map = map.module;
    Defs.base(map.module.logic);
    //map.module.logic.addNode("base/file/file-select");
    //map.module.logic.addNode("base/file/file-to-string");
    document.body.appendChild(map);

    //存储内容
    window.save = function(){
        localStorage["save"] = JSON.stringify(map.module.logic.save());
    }

    //保存内容
    if(localStorage["save"])
        map.module.logic.load(JSON.parse(localStorage["save"]));
}();