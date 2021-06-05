#include rtx-base;
#include random;

//采样贴图
uniform sampler2D u_tex_sample_0;
uniform mat4 u_camera_mat;

//输出颜色
out vec4 out_color;
//本次采样颜色
vec4 color;

//函数递归栈
int logicCache[32];
//当前的递归深度
int logicDeep = 0;
//当前的运行状态  -1运行结束  0开始投射
int logicState = 0;

//添加递归回调
//mit 要运行的目标函数
//state 回调的函数
void deepStart(int mit,int state){
    logicState = mit;
    logicCache[logicDeep] = state;
    logicDeep++;
}

//光线深度池
Ray rayCache[10];
//当前递归深度
int rayDeep = 0;
//当前光线
Ray ray;

//命中场景中的物体
HitInfo RayIn_Scenes(inout Ray ray){
    
    //命中信息
    HitInfo info;

    //更新光线最远距离
    ray.length = LENGTH_MAX;
    
    //======对场景中所有物体进行计算======
    RayIn_Sphere(info,ray,vec3(0,0,0),0.5);
    if(info.hit)
        info.mit = true;
	//RayIn_Sphere(info,ray,vec3(0,20,0),19.9);
    //if(info.hit)
    //    info.mit = true;
    //RayIn_Sphere(info,ray,vec3(0,-20,0),19.8);
    //if(info.hit)
    //    info.mit = true;
    
    Vertex v1;
    Vertex v2;
    Vertex v3;
    v1.pos = vec3(-10,-10,-0.2);
    v2.pos = vec3(10,-10,-0.2);
    v3.pos = vec3(0,10,-0.2);
    v1.normal = vec3(0,0,-1);
    v2.normal = vec3(0,0,-1);
    v3.normal = vec3(0,0,-1);
    RayIn_Triangle(info,ray,v1,v2,v3);
    if(info.hit)
        info.mit = true;
    
    //命中任意一个内容则为命中
    info.hit = info.mit;

	return info;
}


//开始投射
void Ray_Start(){
    //获取当前光线
    ray = rayCache[rayDeep];

    //命中判断
    HitInfo info = RayIn_Scenes(ray);

    //如果未命中则返回白色
    if(!info.hit){
        ray.color = vec4(1,1,1,1);
        ray.light_color = vec4(0.5,0.5,0.5,1);
        rayCache[rayDeep] = ray;
        rayDeep--;
        return;
    }

    //如果命中物体
    if(rayDeep > 7){
        //次数过多返回黑色
        ray.color = vec4(0,0,0,1);
        rayCache[rayDeep] = ray;
        rayDeep--;
        return;
    }else{
        //漫射采样
        rayDeep++;
        ray.pos = info.vertex.pos;
        ray.dir = info.vertex.pos + info.vertex.normal + RandInSphere();
        rayCache[rayDeep] = ray;
        deepStart(0,1);
    }
}

float nums = 0.0;

//投射结束
void Ray_End(){
    //点光源采样
    ray.dir = vec3(1,1,1) * 100.0 + RandInSphere() * 10.0;
    HitInfo info = RayIn_Scenes(ray);

    if(!info.hit)
        rayCache[rayDeep].color += vec4(0.5,0.5,0.5,0.7);

    //颜色混合
    rayCache[rayDeep].color += rayCache[rayDeep + 1].light_color;
    rayCache[rayDeep].color *= 0.9;
    rayCache[rayDeep].light_color = rayCache[rayDeep].color * 0.5;

    //着色结束
    rayDeep--;
}


void main(){

    //光线产生
    ray = CameraMat2Ray(u_camera_mat,vUV * 2.0 - 1.0);
    ray.dir = normalize(ray.dir);
    rayCache[0] = ray;

    //接收状态的局部变量
    int state;
    //======开始递归======
    while(logicDeep >= 0){
        //接收变量
        state = logicState;
        logicState = -1;
        //如果是运行结束
        if(state == -1){
            logicDeep--;
            if(logicDeep >= 0)
                logicState = logicCache[logicDeep];
        }
        //如果是开始投射
        else if(state == 0)
            Ray_Start();
        //如果是结束投射
        else if(state == 1)
            Ray_End();
    }

    //命中判断
    //if(color.a == 0.0)
    color = vec4(rayCache[0].color.xyz,1);
    //color = vec4(float(logicDeep) + 0.0,0,0,1);
    //color = vec4(nums,0,0,1);
    //color = vec4(nums / 10.0,0,0,1);

    //输出颜色
    out_color = texture(u_tex_sample_0,vUV) + color;
}