const { EditorUI } = require("editor-ui");
var Defs = require("def-modules");


//初始化一个节点编辑面板
!async function(){
    var editor = await EditorUI.new();
    Defs.base(editor.module.map.logic);
    document.body.appendChild(editor);
}();