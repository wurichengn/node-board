import { GPUWorker } from "gpu-worker";
import { FBI } from "gpu-worker/gpu-fbi";
import { gpu } from "./tool-image"
var Tools = require("./index.js");
var THREE = require("three");
var transScr = new THREE.Scene();
var transPar = new THREE.Object3D();
var transObj = new THREE.Object3D();
transPar.add(transObj);
transScr.add(transPar);



export var ImageCanvas = function(){

    /**@type {FBI[]} 用来渲染内容的帧缓冲区*/
    var fbis = [];
    fbis.push(gpu.createFrameBuffer({size:{x:1,y:1},layers:["RGBA"]}));
    fbis.push(gpu.createFrameBuffer({size:{x:1,y:1},layers:["RGBA"]}));

    /**@type {FBI} 当前画布数据缓冲区 */
    var fbi_data;
    /**@type {FBI} 要绘制的目标缓冲区 */
    var fbi_target;

    //绘制普通图片
    var drawImage = async function(img){
        transObj.scale.x = img.width / fbis[0].width;
        transObj.scale.y = img.height / fbis[0].height;
        transObj.updateWorldMatrix(true,true);
        var mt4 = new THREE.Matrix4();
        mt4.getInverse(transObj.matrixWorld);
        gpu.renderShader(shader_layer,{
            u_tex_data:fbi_data,
            u_tex_layer:img.data,
            u_layer_mat:mt4.elements
        },fbi_target,{finish:true});
    }

    /**清空缓冲区 */
    var clearFBI = function(){
        gpu.renderShader(clear_shader,{},fbis[0]);
        gpu.renderShader(clear_shader,{},fbis[1]);
    }

    /**
     * 设置尺寸
     * @param {number} width 
     * @param {number} height 
     */
    this.setSize = function(width,height){
        fbis[0].resize(width,height);
        fbis[1].resize(width,height);
    }


    /**
     * 绘制全部内容
     * @param {[]} objs 要绘制的子节点表
     */
    this.draw = async function(objs){
        //初始化贴图
        initCache();
        //清空缓冲区
        clearFBI();
        //循环绘制子对象
        for(var i in objs){
            //初始化缓冲区
            if(i % 2 == 0){
                fbi_data = fbis[0];
                fbi_target = fbis[1];
            }else{
                fbi_data = fbis[1];
                fbi_target = fbis[0];
            }
            //绘制图像
            var obj = objs[i];
            await drawImage(obj);
        }

        return {
            fbi:fbi_target
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
    vec2 image_uv = ((u_layer_mat * vec4(vUV * 2.0 - 1.0,0,1)).xy + 1.0) / 2.0;
    if(image_uv.x < 0.0 || image_uv.y < 0.0 || image_uv.x > 1.0 || image_uv.y > 1.0)
        return;
    vec4 image = texture(u_tex_layer,image_uv);
    color = color * (1.0 - image.a) + image;
}
`);


/**清空着色器 */
var clear_shader = gpu.createShader(`#include base;
out vec4 color;
void main(){
    color = vec4(0,0,0,0);
}
`);