import { GPUWorker } from "gpu-worker";
import { FBI } from "gpu-worker/gpu-fbi";
import { gpu } from "./tool-image"
import {DisplayObject,Filter} from "./index.js";
var Tools = require("./index.js");
var THREE = require("three");
var transScr = new THREE.Scene();
var transPar = new THREE.Object3D();
var transObj = new THREE.Object3D();
transPar.add(transObj);
transScr.add(transPar);



export var ImageCanvas = function(){
    var width = 1;
    var height = 1;

    /**图层混合采样器 */
    var layer_looper = gpu.createLooper();
    /**滤镜采样器 */
    var filter_looper = gpu.createLooper();

    //绘制普通图片
    var drawImage = function(img,target){
        target = target || layer_looper;
        transObj.scale.x = img.width / width;
        transObj.scale.y = img.height / height;
        transObj.updateWorldMatrix(true,true);
        var mt4 = new THREE.Matrix4();
        mt4.getInverse(transObj.matrixWorld);
        target.render(shader_layer,{
            u_tex_layer:img.data,
            u_layer_mat:mt4.elements
        });
    }


    //绘制默认的图像
    drawDefaultImg = function(img){
        transPar.position.set(0,0,0);
        transPar.scale.set(1,1,1);
        transPar.rotation.set(0,0,0);
        drawImage(img);
    }

    /**
     * 渲染滤镜
     * @param {DisplayObject} obj 
     */
    var drawFilter = function(obj,uniforms){
        uniforms = uniforms || {};
        filter_looper.clear();
        drawImage(obj.image,filter_looper);
        for(var i in obj.filters)
            filter_looper.render(obj.filters[i].shader,{...uniforms,u_tex_back:layer_looper.fbi_target});
    }

    /**
     * 绘制可视对象
     * @param {DisplayObject} obj 
     */
    var drawObject = function(obj){
        transPar.position.copy(obj.position);
        transPar.scale.copy(obj.scale);
        transPar.rotation.copy(obj.rotation);
        //没有滤镜直接加入图层
        if(obj.filters.length == 0)
            return drawImage(obj.image);
        var mt4 = new THREE.Matrix4();
        mt4.getInverse(transObj.matrixWorld);
        //有滤镜先渲染滤镜
        drawFilter(obj,{u_layer_mat:mt4.elements});
        drawDefaultImg({width:width,height:height,type:"texture",data:filter_looper.fbi_target});
    }

    /**
     * 设置尺寸
     * @param {number} width 
     * @param {number} height 
     */
    this.setSize = function(w,h){
        width = w;
        height = h;
        layer_looper.setSize(width,height);
        filter_looper.setSize(width,height);
    }


    /**
     * 绘制全部内容
     * @param {DisplayObject[]} objs 要绘制的子节点表
     */
    this.draw = async function(objs){
        gpu.clear();
        //清空缓冲区
        layer_looper.clear();
        //循环绘制子对象
        for(var i in objs){
            //绘制图像
            var obj = objs[i];
            if(obj == null)
                continue;
            if(obj.__isDisPlayObject)
                drawObject(obj);
            else
                drawDefaultImg(obj);
        }

        //返回缓冲区
        return {
            fbi:layer_looper.fbi_target
        }
    }
}







/**图层着色器 */
var shader_layer = gpu.createShader(`#include base;
uniform sampler2D u_tex_layer;
uniform sampler2D u_tex_data;
uniform mat4 u_layer_mat;
out vec4 color;

void main(){
    color = texture(u_tex_data,vec2(vUV));
    if(color.a == 0.0)
        color = vec4(0,0,0,0);
    vec2 image_uv = ((u_layer_mat * vec4(vUV * 2.0 - 1.0,0,1)).xy + 1.0) / 2.0;
    if(image_uv.x < 0.0 || image_uv.y < 0.0 || image_uv.x > 1.0 || image_uv.y > 1.0)
        return;
    vec4 image = texture(u_tex_layer,image_uv);
    color = color * (1.0 - image.a) + image;
}
`);