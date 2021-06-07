import {LogicWorker} from "logic-worker";
var lcg = require("lcg");
var React = require("react");
var Tools = require("rendering-tool");
Tools.Loader.initPacs();

//构建一个基础容器
var BasePanle = function(vals,dom){
    return <div style={{"display":"flex","width":"100%"}}>
        <div style={{flex:1,lineHeight:"25px",textAlign:"left",paddingLeft:"10px",minWidth:"45px"}}>{vals.name}</div>
        <div style={{flex:2}}>{dom}</div>
    </div>;
}


/**
 * 加入基本功能组件
 * @param {LogicWorker} logic 要加入基本功能的图组件
 */
module.exports = function(logic){

    //布尔值
    logic.addType("bool",{name:"布尔值"});

    //数值类型
    logic.addType("number",{
        name:"数值",
        formRender:function(vals){
            var className = "ant-input";
            if(vals.conf.inputType == "range")
                className = "";
            return BasePanle(vals,<input value={vals.value || 0} className={className} style={{height:"22px",margin:"2px 5px",width:"calc(100% - 10px)"}}
                min={vals.conf.min} max={vals.conf.max} step={vals.conf.step || 1} type={vals.conf.inputType || "number"} onChange={function(e){
                vals.module.setValue(e.target.value);
            }}></input>);
        },
        check:function(value,conf){
            var value = Number(value);
            if((value + "") == "NaN")
                value = 0;
            if(conf.max != null && value > conf.max)
                value = conf.max;
            if(conf.min != null && value < conf.min)
                value = conf.min;
            return value;
        }
    });

    //字符串类型
    logic.addType("string",{
        name:"字符串",
        formRender:function(vals){
            return BasePanle(vals,<input value={vals.value || ""} className="ant-input" style={{height:"22px",margin:"2px 5px",width:"calc(100% - 10px)"}} type="text" onChange={function(e){
                vals.module.setValue(e.target.value);
            }}></input>);
        }
    });

    //文件
    logic.addType("file",{
        name:"文件",
        formRender:function(vals){
            return BasePanle(vals,<input style={{margin:"2px 5px",width:"calc(100% - 10px)",minWidth:"100px"}} type="file" onChange={function(e){
                vals.module.setValue(e.target.files[0]);
            }}></input>);
        }
    });

    logic.addType("dicom:study",{name:"检查数据"});
    logic.addType("dicom:series",{name:"序列数据"});
    logic.addType("dicom:image",{name:"影像数据"});
    logic.addType("dicom:tags",{name:"标注集合"});
    logic.addType("dicom:image-voxel",{name:"体素数据-影像"});

    //检查数据载入
    logic.addModule("dicom/pacs-data-loader",{
        menu:"Dicom/从服务器载入数据",
        name:"从服务器载入数据",
        inputs:{
            "server":{type:"string",name:"服务器地址",default:"http://10.2.112.177:8360"},
            "id":{type:"number",name:"数据编号",default:"1"}
        },
        outputs:{
            "datas":{type:"dicom:study",name:"检查数据"},
            "tags":{type:"dicom:tags",name:"AI检测结果"}
        },
        init(){
            this.runOnce();
        },
        infoRender:function(){
            var self = this;
            return <div style={{"width":"250px"}}>
                <button className="ant-btn" style={{"margin":"3px 10px"}} onClick={function(){self.runOnce()}}>载入</button>
                <z>{self.state.errorStr}</z>
            </div>
        },
        needUpdate:function(){return false;},
        async run(args){
            var re = {};
            try{
                this.setState({errorStr:"载入中..."});
                re = await Tools.Loader.loadOne(args.id,null,args.server);
                this.setState({errorStr:"载入成功!"});
            }catch(e){
                this.setState({errorStr:"载入失败!"});
            }
            return re;
        }
    });


    //检查数据载入
    logic.addModule("dicom/pacs-series-loader",{
        menu:"Dicom/从序列载入三维数据",
        name:"从序列载入三维数据",
        inputs:{
            "series":{type:"dicom:series",name:"序列数据"}
        },
        outputs:{
            "voxel":{type:"dicom:image-voxel",name:"三维数据"}
        },
        infoRender:function(){
            var self = this;
            return <div style={{"width":"150px"}}>
                <button className="ant-btn" style={{"margin":"3px 10px"}} onClick={function(){self.runOnce()}}>载入</button>
                <z>{self.state.errorStr}</z>
            </div>
        },
        needUpdate:function(){return false;},
        async run(args){
            var re = {};
            try{
                this.setState({errorStr:"载入中..."});
                re.voxel = await Tools.Loader.loadSeriesPacs(args.series);
                this.setState({errorStr:"载入成功!"});
            }catch(e){
                this.setState({errorStr:"载入失败!"});
            }
            return re;
        }
    });


    //选择序列
    logic.addModule("dicom/study-select-series",{
        menu:"Dicom/从检查中选择序列",
        name:"从检查中选择序列",
        inputs:{
            "study":{name:"检查数据",type:"dicom:study",follow:true},
            "number":{name:"下标",type:"number",follow:true,min:0,max:0,default:0}
        },
        autoRun:true,
        outputs:{
            "series":{name:"序列数据",type:"dicom:series"}
        },
        run(vals){
            //重新设置输入最大值
            this.state.inputs["number"].max = vals.study.series.length - 1;
            return {series:vals.study.series[vals.number]};
        }
    });

    //选择影像
    logic.addModule("dicom/series-select-image",{
        menu:"Dicom/从序列中选择影像",
        name:"从序列中选择影像",
        inputs:{
            "series":{name:"序列数据",type:"dicom:series",follow:true},
            "number":{name:"下标",type:"number",follow:true,min:0,max:0,default:0}
        },
        autoRun:true,
        outputs:{
            "image":{name:"影像数据",type:"dicom:image"}
        },
        run(vals){
            //重新设置输入最大值
            this.state.inputs["number"].max = vals.series.images.length - 1;
            return {image:vals.series.images[vals.number]};
        }
    });


    //渲染影像
    logic.addModule("dicom/render-dicom-image",{
        menu:"Dicom/渲染dicom图像",
        name:"渲染dicom图像",
        inputs:{
            "image":{name:"影像数据",type:"dicom:image",follow:true}
        },
        infoRender:function(){
            return <canvas lid="canvas" width="300" height="300" style={{maxWidth:"300px",maxHeight:"300px",backgroundColor:"#000"}}></canvas>
        },
        run:async function(vals){
            if(this.UI == null)
                return;
            var data = await Tools.Loader.loadImage(vals.image);
            await new Tools.Renders["dicom"]().render(data, vals.image, this.UI.ids["canvas"]);
        }
    });




    //选择影像
    logic.addModule("base/tools/trigger-dt",{
        menu:"基础/工具/频繁触发器",
        name:"频繁触发器",
        inputs:{
            "input":{name:"任意输入",type:"*"}
        },
        init(){
            var self = this;

            var running = false;
            lcg.on("dt",async function(){
                if(running)
                    return;
                running = true;
                await self.runOnce();
                running = false;
            });
        },
    });

    //选择影像
    logic.addModule("base/tools/trigger-button",{
        menu:"基础/工具/按钮触发器",
        name:"按钮触发器",
        infoRender:function(){
            var self = this;
            return <button onClick={function(){self.runOnce()}}>触发</button>;
        },
        inputs:{
            "input":{name:"任意输入",type:"*"}
        }
    });

    //简单变量
    logic.addModule("base/tools/easy-var",{
        name:"变量",
        autoRun:true,
        init(){
            var type = this.worker.types[this.attr.var_type];
            this.setState({
                inputs:{"input":{name:"变量",ban_link:true,type:this.attr.var_type}},
                outputs:{"output":{name:"输出",type:this.attr.var_type}}
            });
        },
        run:function(args){
            return {output:args.input};
        }
    });

    //选择影像
    logic.addModule("base/tools/console-log",{
        menu:"基础/工具/输出到控制台",
        name:"输出到控制台",
        inputs:{
            "input":{name:"任意输入",type:"*",follow:true}
        },
        run(args){
            console.log(args.input);
        }
    });


    //文件选择器
    logic.addModule("base/file/file-select",{
        menu:"基础/文件/选择本地文件",
        name:"文件选择器",
        inputs:{
            "file":{type:"number",follow:true,ban_form:false}
        },
        outputs:{
            "file":{name:"文件",type:"number"}
        },
        /*init:function(){
            this.state.values["file"] = Math.random();
        },
        needUpdate:function(){return false;}*/
        async run(){
            await lcg.delay(2000);
            console.log("worker");
            return {file:Math.random() * 300};
        }
    });

    //文件解析为字符
    logic.addModule("base/file/file-to-string",{
        menu:"基础/文件/解析文件为字符串",
        name:"解析文件为字符串",
        infoRender:function(module){
            return <div style={{padding:"10px"}}>
                <canvas lid="canvas" width={Math.max(1,Math.floor(this.state.args.width))} height={Math.max(1,Math.floor(this.state.args.height))} style={{backgroundColor:"#000"}}></canvas>
            </div>;
        },
        inputs:{
            "width":{type:"number",default:10},
            "height":{type:"number",default:20}
        },
        outputs:{
            "file":{name:"文件",type:"number"}
        },
        init(){
            var self = this;

            var cd = 0;
            lcg.on("dt",async function(){
                cd--;
                if(cd > 0)
                    return;
                cd = 9999999;
                await self.runOnce();
                cd = 60;
            });
        },
        run(args){
            console.log(args);
        }
    });
}