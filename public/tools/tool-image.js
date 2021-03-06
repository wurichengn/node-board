import { GPUWorker } from "gpu-worker";
var lcg = require("lcg");

/**全局公用gpu实例 */
export var gpu = new GPUWorker();
var globalCanvas = document.createElement("canvas");
globalCanvas.getContext("2d");

//图像转换可以输入的类型有
//canvas  img   texture   data-url   image-data   url   video
//可以输出的类型有
//canvas  img   texture   data-url   image-data

//======类型说明======
//canvas       输入可以是任意canvas，输出时必须是上下文为2d的canvas  可以传入canvas参数来主动绘制
//img          输入输出img类型标签   可以传入img参数来主动绘制
//texture      输入输出中心上下文产生的webgl贴图  可以传入texture参数来接收贴图数据  也可以传入gl来决定要绘制的上下文
//data-url     输入输出data-url字符串
//image-data   输入输出ImageData对象
//url          输入网络地址
//video        输入video类型标签


/**图像数据类型 */
var imageType = {
    /**@type {string} 图像的类型，可以是canvas、img、texture、data-url、image-data、url、video */
    type:"",
    /**@type {*} 根据类型决定数据内容 */
    data:null,
    /**@type {number} 图像宽度 */
    width:0,
    /**@type {number} 图像高度 */
    height:0
};

/**
 * 输出图像为canvas,上下文为2d
 * @param {imageType} image 输入的图像
 * @param {HTMLCanvasElement} canvas 如果要输出到已存在的canvas上则需要传递目标canvas
 * @returns {imageType}
 */
export var image2Canvas = async function(image,canvasIn){
    var canvas = canvasIn || document.createElement("canvas");
	var ctx = canvas.getContext("2d");

	//根据img标签绘制
	var drawImg = function(img){
		canvas.width = img.width;
		canvas.height = img.height;
		ctx.drawImage(img,0,0);
		return {
			data:canvas,
			type:"canvas",
			width:img.width,
			height:img.height
		};
	}

    //如果是canvas
	if(image.type == "canvas"){
		if(canvasIn == null)
			return {data:image.data,type:"canvas",width:image.data.width,height:image.data.height};
		else
			return drawImg(image.data);
	}

    //如果是img
	if(image.type == "img")
        return drawImg(image.data);

    //如果是url
	if(image.type == "data-url" || image.type == "url"){
		var img = await image2Img(image);
		return drawImg(img);
	}

    //如果是贴图
    if(image.type == "texture"){
        image.data.gpu.renderTexture(image.data,{x:image.width,y:image.height});
        return drawImg(image.data.gpu.canvas);
    }
}


/**
 * 输出图像为img标签
 * @param {imageType} image 输入的图像
 * @param {HTMLCanvasElement} canvas 如果要输出到已存在的img标签上则需要传递目标img标签
 * @returns {imageType}
 */
export var image2Img = async function(image,imgIn){
    var img = imgIn || new Image();

	//根据url生成img
	var loadImg = function(url){
		return new Promise(function(next){
			img.src = url;
			img.onload = function(){
				next({
					data:img,
					type:"img",
					width:img.width,
					height:img.height
				});
			}
		});
	}

	//如果是图像
	if(image.type == "img"){
		if(imgIn == null)
			return {data:image.data,type:"img",width:image.data.width,height:image.data.height};
		else
			return loadImg(image.data.src);
	}

	//如果是url
	if(image.type == "data-url" || image.type == "url")
		return await loadImg(image.data);

    //如果是贴图
    if(image.type == "texture")
        image = await image2Canvas(image,globalCanvas);

	//如果是canvas
	if(image.type == "canvas")
		return await loadImg(image.data.toDataURL());
}

/**
 * 输出图像为base64字符串
 * @param {imageType} image 输入的图像
 * @returns {imageType}
 */
export var image2DataURL = async function(image){

    //如果是canvas
    if(image.type == "canvas")
        return image.data.toDataURL();
    else
        return image2Canvas(image,globalCanvas).data.toDataURL();
}


/**
 * 输出位GPUWorker贴图
 * @param {imageType} image 输入的图像
 * @param {GPUWorker.ElementTexture} texture 要写入的目标贴图
 * @param {GPUWorker} g 要生成贴图的目标gpu
 * @returns {imageType}
 */
export var image2Texture = async function(image,texture,g){
    g = g || gpu;

    //如果是相同上下文贴图
    if(image.type == "texture" && g == image.data.gpu)
        return {...image};
    
    //初始化贴图
    texture = texture || g.createElementTexture();

    //如果是url
    if(image.type == "data-url" || image.type == "url")
        image = await image2Img(image);

    //如果是节点
    if(image.type == "img" || image.type == "canvas"){
        texture.updateData(image.data);
        return {type:"texture",width:image.data.width,height:image.data.height,data:texture};
    }
}

/**简单的快速转换贴图 */
export var easyTexture = async function(module,img){
	module.texture = module.texture || gpu.createElementTexture();
	return await image2Texture(img,module.texture);
}



export var color2Vec4 = function(color){
	color = lcg.easycolor(color);
	return [color.r / 255,color.g / 255,color.b / 255,color.a];
}

/**
 * 渐变字符串生成渐变数组
 * @param {string} gradient 
 * @param {number} count
 */
export var gradient2Data = function(gradient,count = 100){
	var str = gradient;
	str = str.substr(str.indexOf(",") + 1);
	var cs = str.split(/%,|%\)/);
	var colors = [];
	for(var i in cs){
		var kz = cs[i].replace(/^\s+/,"").split(" ");
		if(kz.length < 2)
			continue;
		colors.push([Number(kz[kz.length - 1]) / 100]);
		kz.splice(kz.length - 1,1);
		colors[colors.length - 1].push(lcg.easycolor(kz.join(" ")));
	}
	
	colors.sort(function(a,b){
		return a[0] - b[0];
	});

	console.log(colors);

	var re = [];
	for(var i = 0;i < count;i++){
		var bl = i / count;
		var pushEnd = false;
		for(var j in colors){
			j = Number(j);
			var cn = colors[j];
			var cd = colors[j + 1] || colors[j];
			if(bl >= cn[0] && bl <= cd[0]){
				var bl = (bl - cn[0]) / (cd[0] - cn[0]);
				re.push([(cn[1].r * (1 - bl) + cd[1].r * bl) / 255,
						(cn[1].g * (1 - bl) + cd[1].g * bl) / 255,
						(cn[1].b * (1 - bl) + cd[1].b * bl) / 255,
						(cn[1].a * (1 - bl) + cd[1].a * bl)]);
				pushEnd = true;
				break;
			}
		}
		if(!pushEnd)
			re.push([cd[1].r / 255,cd[1].g / 255,cd[1].b / 255,cd[1].a]);
	}

	var buffer = new Uint8Array(count * 4);
	for(var i in re){
		var idx = i * 4;
		buffer[idx + 0] = re[i][0] * 255;
		buffer[idx + 1] = re[i][1] * 255;
		buffer[idx + 2] = re[i][2] * 255;
		buffer[idx + 3] = re[i][3] * 255;
	}
	return buffer;
}