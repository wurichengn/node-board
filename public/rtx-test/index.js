const { GPUWorker } = require("gpu-worker");
var lcg = require("lcg");
var THREE = require("three");
var Build = require("./rtx-build.js");
document.body.style["background-color"] = "#444";


//产生相机矩阵
var s = new THREE.Scene();
var objY = new THREE.Object3D();
var objX = new THREE.Object3D();
var camera = new THREE.PerspectiveCamera(45,256/256,0.1,100);
objY.add(camera);
objX.add(objY);
s.add(objX);
camera.position.x = 5;
camera.lookAt(0,0,0);
camera.updateProjectionMatrix();
camera.updateWorldMatrix(true);
var matCamera = new THREE.Matrix4();
matCamera.multiplyMatrices(camera.matrixWorld,camera.projectionMatrixInverse);


!function(){
    var isd = false;
    var ux,uy;
    window.onmousedown = function(e){
        isd = true;
        ux = e.x;
        uy = e.y;
    }

    window.onmousemove = function(e){
        if(!isd)
            return;
        objX.rotation.y -= (e.x - ux) / 180;
        objY.rotation.z += (e.y - uy) / 180;
        ux = e.x;
        uy = e.y;

        camera.updateProjectionMatrix();
        camera.updateWorldMatrix(true);
        matCamera = new THREE.Matrix4();
        matCamera.multiplyMatrices(camera.matrixWorld,camera.projectionMatrixInverse);
        sampler.clear();
    }

    window.onmouseup = function(e){
        isd = false;
    }

    window.onmousewheel = function(e){
        if(e.deltaY < 0)
            camera.position.x *= 0.9;
        else
            camera.position.x /= 0.9;

        camera.updateProjectionMatrix();
        camera.updateWorldMatrix(true);
        matCamera = new THREE.Matrix4();
        matCamera.multiplyMatrices(camera.matrixWorld,camera.projectionMatrixInverse);
        sampler.clear();
    }
}();




window.window.__glsl_pack_debug = true;

var gpu = new GPUWorker();
gpu.gp.addLib("rtx-base",require("./cpp-lib/lib-rtx-base.cpp").default);
gpu.gp.addLib("random",require("./cpp-lib/lib-random.cpp").default);
gpu.setSize(512,512);

var data = Build.BuildThreeGeometry(new THREE.DodecahedronGeometry());
var u_tex_v = gpu.createDataTexture(data.vertices,{type:"RGB32F",mag:gpu.gl.NEAREST,width:data.vertices.length / 3,height:1});
var u_tex_f = gpu.createDataTexture(data.faces,{type:"RGB16I",mag:gpu.gl.NEAREST,width:data.faces.length / 3,height:1});

document.body.appendChild(gpu.canvas);

var a = document.createElement("a");
document.body.appendChild(a);

var sampler = gpu.createSampler(require("./cpp-lib/demo-gpu-rtx.cpp").default);

var render = function(){
    sampler.sampling({
        u_tex_f,
        u_tex_v,
        u_camera_mat:matCamera.elements,
        u_rand_seed:[Math.random(),Math.random(),Math.random(),Math.random()]
    });
    sampler.render();
    a.innerText = sampler.getNum();
}

render();

lcg.on("dt",function(){
    render();
});
