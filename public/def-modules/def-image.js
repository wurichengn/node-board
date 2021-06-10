import {LogicWorker,LogicNode} from "logic-worker";
var Tools = require("../tools");
var React = require("react");


/**
 * 加入基本功能组件
 * @param {LogicWorker} logic 要加入基本功能的图组件
 */
 module.exports = function(logic){

    logic.addModule("image:file-to-img",{
        menu:"图像/工具/选择图像文件",
        name:"选择图像文件",
        inputs:{
            "file":{name:"文件",type:"file"}
        },
        outputs:{
            "image":{name:"图像",type:"image"}
        },
        autoRun:true,
        init:function(){
            if(this.attr.importFile)
                this.state.forms["file"] = this.attr.importFile;
            if(this.attr.base64)
                this.imgInfo = {type:"url",data:this.attr.base64};
        },
        save:function(){
            this.attr.base64 = this.imgInfo.data;
        },
        run:async function(vals){
            var self = this;
			//如果没有变化则直接返回
			if((self.file == null || vals.file == self.file) && self.imgInfo != null)
				return {image:await Tools.easyTexture(self,self.imgInfo)};
			//如果图片为空则直接报错
			if(vals.file == null)
				throw new Error("没有选择文件");
			//如果不是图片文件则直接报错
			if(vals.file.type.substr(0,5) != "image")
				throw new Error("载入的不是图片文件");
			//文件过大则报错
			if(vals.file.size > 1024 * 1024 * 40)
				throw new Error("载入的文件大于40M载入上限");
			//写入file缓存
			self.file = vals.file;
			return new Promise(function(next,err){
				//载入dataURL
				var reader = new FileReader();
				reader.onload = async function(){
                    self.imgInfo = {type:"url",data:this.result};
                    next({image:await Tools.easyTexture(self,self.imgInfo)});
				}
				//开始载入文件
				reader.readAsDataURL(vals.file);
			});
        }
    });

    logic.addModule("image:image-preview",{
        menu:"图像/工具/图像预览工具",
        name:"图像预览工具",
        infoRender:function(){
            return <canvas lid="canvas" style={{maxWidth:"100%",border:"1px solid #ddd"}} />;
        },
        inputs:{
            img:{name:"图像",type:"image",follow:true}
        },
        outputs:{
            trigger:{name:"触发器",type:"trigger"}
        },
        run:async function(vals){
            if(this.UI == null)
                return;
            await Tools.image2Canvas(vals.img,this.UI.ids["canvas"]);
        }
    });


    logic.addModule("image:create-text",{
        menu:"图像/生成器/产生文字图片",
        name:"产生文字图片",
        inputs:{
            "text":{name:"字符串",type:"string"},
            "font_size":{name:"字号",type:"number",min:1,max:600}
        },
        outputs:{
            "img":{name:"图像",type:"image"}
        },
        //初始化
		init:function(){
			this.canvas = document.createElement("canvas");
            this.canvas.width = this.canvas.height = 1;
			this.ctx = this.canvas.getContext("2d");
            this.texture = Tools.gpu.createElementTexture(this.canvas);
		},
		//渲染时执行  必须要有，需要返回运行结果，可以异步处理。
		run:async function(vals){
            /**@type {CanvasRenderingContext2D} */
			var ctx = this.ctx;
			var tex = vals.text;
			//设置字体  italic斜体 bold粗体
			var font = "bold " + vals.font_size + "px 微软雅黑";
			//计算宽度
			ctx.font = font;
			var box = ctx.measureText(tex);
            var left = Math.max(box.actualBoundingBoxLeft,0);
			//根据宽度设置画布大小
			this.canvas.width = Math.floor(box.actualBoundingBoxRight - left) + 4;
			this.canvas.height = box.actualBoundingBoxAscent + box.actualBoundingBoxDescent + 4;
			//绘制文字
			ctx.font = font;
			//ctx.fillStyle = vals.font_color;
			ctx.fillText(tex,-left + 2,box.actualBoundingBoxAscent + 2);
            this.texture.updateData(this.canvas);
			//输出图层1
			return {
				"img":{
					data:this.texture,
					type:"texture",
					width:this.canvas.width,
					height:this.canvas.height
				}
			};
		}
    });





    logic.addModule("image:filter-mix-color",{
        menu:"图像/滤镜/颜色叠加",
        name:"颜色叠加",
        inputs:{
            image:{type:"image",name:"图像"},
            type:{type:"select",options:{"1":"颜色叠加","2":"渐变叠加","3":"图案叠加"},name:"类型",default:"1",ban_link:true}
        },
        outputs:{
            image:{type:"image",name:"图像"}
        },
        updateForms:function(){
            var self = this;
            if(this.lastType != this.state.forms["type"]){
                self.lastType = this.state.forms["type"];
                delete this.state.inputs["color"];
                delete this.state.inputs["gradient"];
                if(this.state.forms["type"] == "1")
                    this.state.inputs["color"] = {type:"color",name:"颜色"};
                if(this.state.forms["type"] == "2")
                    this.state.inputs["color"] = {type:"gradient",name:"渐变"};
            }
        },
        run:function(vals){
            var image = new Tools.DisplayObject(vals.image);
            this.filter = this.filter || new Tools.Filter(`#include base;
            uniform sampler2D u_tex_data;
            uniform vec4 u_color;
            out vec4 color;
            void main(){
                float a = texture(u_tex_data,vUV).a;
                color = vec4(vec3(1,1,1),a);
            }
            `);
            this.filter.shader.setUniforms({
                u_color:Tools.color2Vec4(vals.color || "#000")
            });
            image.addUniqueFilter(this.filter);
            //返回贴图
            return {image:image}
        }
    });


    logic.addModule("image:image-canvas",{
        menu:"图像/画布",
        name:"画布",
        inputs:{
            width:{name:"宽度",default:256,type:"number",max:2048},
            height:{name:"高度",default:256,type:"number",max:2048},
            objs:{name:"可视对象",many:true,type:"image"}
        },
        outputs:{
            image:{name:"图像",type:"image"}
        },
        run:async function(vals){
            /**@type {Tools.ImageCanvas} */
            this.canvas = this.canvas || new Tools.ImageCanvas();
            
            //渲染场景
            this.canvas.setSize(vals.width,vals.height);
            var re = await this.canvas.draw(vals.objs);

            return {
                image:{
                    type:"texture",
                    data:re.fbi,
                    width:vals.width,
                    height:vals.height
                }
            }
        }
    });

 }