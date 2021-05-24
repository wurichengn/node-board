import {LogicWorker} from "logic-worker";

/**
 * 加入基本功能组件
 * @param {LogicWorker} logic 要加入基本功能的图组件
 */
module.exports = function(logic){

    //文件选择器
    logic.addModule("base/file/file-select",{
        menu:"基础/文件/选择本地文件"
    });
}