#include rtx-base;
#include random;

//采样贴图
uniform sampler2D u_tex_sample_0;
uniform mat4 u_camera_mat;
uniform sampler2D u_tex_v;
uniform isampler2D u_tex_f;
ivec3 v_size = ivec3(120,1,20);
ivec3 f_size = ivec3(108,1,36);

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

//载入表面数据
ivec3 LoadFace(isampler2D tex,ivec2 size,int idx){
    return texelFetch(tex,ivec2(idx,0),0).xyz;
}

//载入顶点数据
Vertex LoadVertex(sampler2D tex,ivec2 size,int idx){
    idx = idx * 2;
    Vertex v;
    v.pos = texelFetch(tex,ivec2(idx,0),0).xyz;
    v.normal = texelFetch(tex,ivec2(idx + 1,0),0).xyz;
    return v;
}

//命中场景中的物体
HitInfo RayIn_Scenes(inout Ray ray){
    
    //命中信息
    HitInfo info;

    //更新光线最远距离
    ray.length = LENGTH_MAX;
    
    //======对场景中所有物体进行计算======
    RayIn_Sphere(info,ray,vec3(1,0,1),1.0);
    if(info.hit)
        info.mit = true;
	//RayIn_Sphere(info,ray,vec3(0,20,0),19.9);
    //if(info.hit)
    //    info.mit = true;
    //RayIn_Sphere(info,ray,vec3(0,-20,0),19.8);
    //if(info.hit)
    //    info.mit = true;
    
    //命中表面
    Vertex v1;
    Vertex v2;
    Vertex v3;
    v1.pos = vec3(-10,-0.2,-10);
    v2.pos = vec3(10,-0.2,-10);
    v3.pos = vec3(0,-0.2,10);
    v1.normal = vec3(0,1,0);
    v2.normal = vec3(0,1,0);
    v3.normal = vec3(0,1,0);
    RayIn_Triangle(info,ray,v1,v2,v3);
    if(info.hit)
        info.mit = true;

    //循环处理所有表面
    for(int i = 0;i < f_size.z;i++){
        ivec3 face = LoadFace(u_tex_f,f_size.xy,i);
        Vertex v1 = LoadVertex(u_tex_v,v_size.xy,face.x);
        Vertex v2 = LoadVertex(u_tex_v,v_size.xy,face.y);
        Vertex v3 = LoadVertex(u_tex_v,v_size.xy,face.z);
        RayIn_Triangle(info,ray,v1,v2,v3);
        if(info.hit)
            info.mit = true;
    }
    
    //命中任意一个内容则为命中
    info.hit = info.mit;
    if(dot(info.vertex.plan_normal,ray.dir) > 0.0){
        info.vertex.plan_normal = -info.vertex.plan_normal;
        //info.vertex.normal = -info.vertex.normal;
    }

	return info;
}


//开始投射
void Ray_Start(){
    //获取当前光线
    ray = rayCache[rayDeep];

    //命中判断
    HitInfo info = RayIn_Scenes(ray);
    rayCache[rayDeep].info = info;

    //ray.color = vec4(ray.dir,1);
    //rayCache[rayDeep] = ray;
    //return;

    //ray.color = vec4(info.vertex.normal,1);
    //rayCache[rayDeep] = ray;
    //return;


    //如果未命中则返回白色
    if(!info.hit){
        ray.color = vec4(0.7,1,1,1);
        ray.light_color = vec4(0.5,0.5,0.5,1);
        rayCache[rayDeep] = ray;
        rayDeep--;
        return;
    }

    //如果命中物体
    if(rayDeep > 2){
        //次数过多返回黑色
        ray.color = vec4(0,0,0,0);
        ray.light_color = vec4(0,0,0,0);
        rayCache[rayDeep] = ray;
        rayDeep--;
        return;
    }else{
        //漫射采样
        rayDeep++;
        ray.pos = info.vertex.pos + info.vertex.plan_normal * 0.0002;
        //if(info.matId == 0)
            ray.dir = /*info.vertex.plan_normal + */RandInSphere();
        //else
            ray.dir = ray.dir - info.vertex.normal * dot(info.vertex.normal,ray.dir) * 2.0;
        rayCache[rayDeep] = ray;
        //if(info.matId == 1)
        //    deepStart(0,2);
        //else
            deepStart(0,1);
    }
}

float nums = 0.0;

//基础颜色
void Ray_Base(){
    //清空颜色
    rayCache[rayDeep].color = vec4(0,0,0,0);
    //阳光计算
    ray.dir = normalize(vec3(1,1,1) * 100.0 + RandInSphere() * 10.0);
    HitInfo info = RayIn_Scenes(ray);
    if(!info.hit)
        rayCache[rayDeep].color = vec4(0.5,0.5,0.5,0.7);

    //颜色混合
    rayCache[rayDeep].color += rayCache[rayDeep + 1].light_color;
    rayCache[rayDeep].color *= 0.9;
    rayCache[rayDeep].light_color = rayCache[rayDeep].color * 0.4;

    //rayDeep--;
    //反射采样
    rayCache[rayDeep + 1].dir = rayCache[rayDeep].dir - rayCache[rayDeep].info.vertex.normal * dot(rayCache[rayDeep].info.vertex.normal,rayCache[rayDeep].dir) * 2.0;
    rayDeep++;
    deepStart(0,2);
}

//反射
void Ray_Reflex(){
    //if(rayCache[rayDeep].info.matId == 0){
        //rayCache[rayDeep].color = rayCache[rayDeep + 1].color;
        //rayCache[rayDeep].color = vec4(float(rayDeep) / 4.0,0,0,1);
    //}else{
        rayCache[rayDeep].color = rayCache[rayDeep].color * 0.5 + rayCache[rayDeep + 1].color * 0.5;
        //rayCache[rayDeep].light_color = rayCache[rayDeep].light_color * 0.5;
    //}

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
        //如果是漫射计算
        else if(state == 1)
            Ray_Base();
        //如果是反射计算
        else if(state == 2)
            Ray_Reflex();
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