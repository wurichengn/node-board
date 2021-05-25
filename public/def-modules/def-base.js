import {LogicWorker} from "logic-worker";

/**
 * 加入基本功能组件
 * @param {LogicWorker} logic 要加入基本功能的图组件
 */
module.exports = function(logic){

    //文件选择器
    logic.addModule("base/file/file-select",{
        menu:"基础/文件/选择本地文件",
        name:"文件选择器",
        outputs:{
            "file":{name:"文件",type:"file"}
        },
        init(){
            console.log(this);
        }
    });

    //文件解析为字符
    logic.addModule("base/file/file-to-string",{
        menu:"基础/文件/解析文件为字符串",
        name:"解析文件为字符串",
        inputs:{
            "file":{name:"文件",type:"file"},
            "file2":{type:"file2"}
        },
        init(){
            console.log(this);
        }
    });
}