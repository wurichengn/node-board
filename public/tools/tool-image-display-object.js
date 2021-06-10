var THREE = require("three");
var lcg = require("lcg");
import {gpu} from "./index.js";


/**图层显示用对象 */
export var DisplayObject = function(image){
    if(image.__isDisPlayObject)
        return image;
    /**判断显示对象用 */
    this.__isDisPlayObject = true;
    /**对象唯一编号 */
    this.uid = lcg.UUID();

    /**可视对象的显示贴图 */
    this.image = image;

    /**@type {Filter[]} 滤镜列表 */
    this.filters = [];

    /**变换表达用对象 */
    var transObj = new THREE.Object3D();

    /**位移 */
    this.position = transObj.position;
    /**缩放 */
    this.scale = transObj.scale;
    /**旋转 */
    this.rotation = transObj.rotation;

    /**
     * 添加唯一的滤镜
     * @param {Filter} filter 
     */
    this.addUniqueFilter = function(filter){
        for(var i in this.filters)
            if(this.filters[i].uid == filter.uid)
                return;
        this.filters.push(filter);
    }

    /**克隆一个可视对象 */
    this.clone = function(){
        var re = new DisplayObject(this.image);
        re.filters = this.filters.map(obj => obj);
        re.position.copy(this.position);
        re.scale.copy(this.scale);
        re.rotation.copy(this.rotation);
    }
}


/**滤镜 */
export var Filter = function(fs){
    /**对象唯一编号 */
    this.uid = lcg.UUID();

    /**滤镜的渲染器 */
    this.shader = gpu.createShader(fs);
}