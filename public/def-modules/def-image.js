import {LogicWorker} from "logic-worker";
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
        run:function(vals){
            var self = this;
			//如果没有变化则直接返回
			if(self.file && vals.file == self.file && self.imgInfo != null)
				return {image:self.imgInfo};
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
				reader.onload = function(){
                    self.imgInfo = {type:"url",data:this.result};
                    next({image:self.imgInfo});
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
            return <img lid="img" style={{maxWidth:"100%",border:"1px solid #ddd"}} />;
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
            await Tools.image2Img(vals.img,this.UI.ids["img"]);
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
			this.ctx = this.canvas.getContext("2d");
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
            console.log(box);
            var left = Math.max(box.actualBoundingBoxLeft,0);
			//根据宽度设置画布大小
			this.canvas.width = Math.floor(box.actualBoundingBoxRight - left) + 4;
			this.canvas.height = box.actualBoundingBoxAscent + box.actualBoundingBoxDescent + 4;
			//绘制文字
			ctx.font = font;
			//ctx.fillStyle = vals.font_color;
			ctx.fillText(tex,-left + 2,box.actualBoundingBoxAscent + 2);
			//输出图层1
			return {
				"img":{
					data:this.canvas,
					type:"canvas",
					width:this.canvas.width,
					height:this.canvas.height
				}
			};
		}
    });





    logic.addModule("image:filter-test",{
        menu:"图像/滤镜/测试滤镜",
        name:"测试滤镜",
        inputs:{
            image:{type:"image",name:"图像"}
        },
        outputs:{
            image:{type:"image",name:"图像"}
        },
        run:async function(vals){
            this.tex = this.tex || Tools.gpu.createElementTexture();
            this.fbi = this.fbi || Tools.gpu.createFrameBuffer({layers:["RGBA"]});
            this.shader = this.shader || Tools.gpu.createShader(`#include base;
                uniform sampler2D u_tex;
                out vec4 color;
                void main(){
                    vec4 c = texture(u_tex,vUV);
                    color = c;
                }
            `);
            var img = await Tools.image2Texture(vals.image,this.tex);
            window.gpu = Tools.gpu;
            this.fbi.resize(img.width,img.height);
            //渲染内容
            Tools.gpu.renderShader(this.shader,{u_tex:img.data},this.fbi);
            //返回贴图
            return {image:{
                type:"texture",
                width:img.width,
                height:img.height,
                data:this.fbi.getLayer(0)
            }}
        }
    })

 }