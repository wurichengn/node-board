import {LogicWorker} from "logic-worker";



/**
 * 加入基本功能组件
 * @param {LogicWorker} logic 要加入基本功能的图组件
 */
module.exports = function(logic){
    
    logic.addModule("test:test-many-input",{
        menu:"测试/多输入测试",
        name:"多输入测试",
        inputs:{
            ips:{name:"数值",type:"number"},
            ip:{name:"数值",many:true,type:"number"}
        },
        outputs:{
            trigger:{name:"触发接口",type:"trigger"}
        },
        run:function(vals){
            console.log(vals);
        }
    })

}