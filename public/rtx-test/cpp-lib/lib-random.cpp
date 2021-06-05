#include base;

//随机种子
uniform vec4 u_rand_seed;
//当前随机的次数
float rdCnt = 0.0;

//随机函数
float RandXY(float x, float y){
    return fract(cos(x * (12.9898) + y * (4.1414)) * 43758.5453);
}

//根据随机种子随机
float Rand(){
    float a = RandXY(vUV.x, u_rand_seed[0]);
    float b = RandXY(u_rand_seed[1], vUV.y);
    float c = RandXY(rdCnt++, u_rand_seed[2]);
    float d = RandXY(u_rand_seed[3], a);
    float e = RandXY(b, c);
    float f = RandXY(d, e);
    return f;
}

//在球体内部随机取一个三维向量
vec3 RandInSphere(){
    vec3 v3;
    do {
        v3 = vec3(Rand(), Rand(), Rand())*2.0f - 1.0f;
    } while (dot(v3, v3) >= 1.0);
    return v3;
}