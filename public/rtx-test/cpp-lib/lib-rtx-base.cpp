#include base;
#include random;

//顶点信息
struct Vertex{
    //顶点坐标
    vec3 pos;
    //顶点法向
    vec3 normal;
	//平面法向，用于偏移
	vec3 plan_normal;
    //顶点uv
    vec2 uv;
};

//命中信息
struct HitInfo{
    //遍历中是否命中过
    bool mit;
    //单次命中判断
    bool hit;
    //命中的物体表面信息
	Vertex vertex;
    //命中的物体表面材质
	int matId;
};

//光线结构体
struct Ray{
    vec3 pos;
    vec3 dir;
    //颜色
    vec4 color;
    //光照颜色
    vec4 light_color;
    float length;
	HitInfo info;
};

//圆周率
const float PI = 3.14159265357;
//最小命中距离
const float LENGTH_MIN = 0.0001;
//最远命中距离
const float LENGTH_MAX = 99999999999999999999999999999999999999.0;

//反正弦函数
float atan2(float y, float x){
	if(x > 0.0){
		return atan(y/x);
	}
	else if(x < 0.0){
		if(y >= 0.0){
			return atan(y/x) + PI;
		}else{
			return atan(y/x) - PI;
		}
	}
	else{// x==0
		return sign(y) * PI / 2.0;
	}
}

//根据法向获取球体UV
vec2 Sphere2UV(vec3 normal) {
	vec2 uv;
	float phi = atan2(normal.z, normal.x);
	float theta = asin(normal.y);
	uv[0] = 1.0 - (phi + PI) / (2.0 * PI);
	uv[1] = (theta + PI/2.0) / PI;
	return uv;
}


//命中球体
void RayIn_Sphere(inout HitInfo hinfo,inout Ray ray,in vec3 center,in float radius){
	hinfo.hit = false;

	vec3 oc = ray.pos - center;
	float a = dot(ray.dir, ray.dir);
	float b = dot(oc, ray.dir);
	float c = dot(oc, oc) - radius * radius;
	float discriminant = b * b - a * c;

	if (discriminant <= 0.0)
		return;

	float t = (-b - sqrt(discriminant)) / a;
	if (t > ray.length || t < LENGTH_MIN) {
		t = (-b + sqrt(discriminant)) / a;
		if (t > ray.length || t < LENGTH_MIN)
			return;
	}
	
	ray.length = t;

    //命中
	hinfo.hit = true;
	hinfo.vertex.pos = ray.pos + t * ray.dir;
	hinfo.vertex.normal = hinfo.vertex.plan_normal = (hinfo.vertex.pos - center) / radius;
	hinfo.vertex.uv = Sphere2UV(hinfo.vertex.normal);
	hinfo.matId = 1;
}


//求光线与三角面交点
vec4 Intersect_RayTri(vec3 e, vec3 d, vec3 a, vec3 b, vec3 c){
	mat3 equation_A = mat3(vec3(a-b), vec3(a-c), d);

	//平行
	if (abs(determinant(equation_A)) < 0.00001)
		return vec4(0);

	vec3 equation_b = a - e;
	vec3 equation_X = inverse(equation_A) * equation_b;
	float alpha = 1.0 - equation_X[0] - equation_X[1];
	return vec4(alpha, equation_X);
}


//计算交点表面数据
void Vertex_Interpolate(vec3 abg,Vertex A,Vertex B,Vertex C,out Vertex vert){
	vert.uv[0] = dot(abg, vec3(A.uv[0], B.uv[0], C.uv[0]));
	vert.uv[1] = dot(abg, vec3(A.uv[1], B.uv[1], C.uv[1]));
	vert.pos = abg[0] * A.pos + abg[1] * B.pos + abg[2] * C.pos;
	vert.normal = vert.plan_normal = normalize(cross(A.pos - B.pos,C.pos - B.pos));
	//vert.normal = abg[0] * A.normal + abg[1] * B.normal + abg[2] * C.normal;
}


//命中三角形
void RayIn_Triangle(inout HitInfo hinfo,inout Ray ray,in Vertex A,in Vertex B,in Vertex C){
	vec4 abgt = Intersect_RayTri(ray.pos, ray.dir, A.pos, B.pos, C.pos);
	if (abgt == vec4(0) ||
		any(lessThan(abgt,vec4(0,0,0,LENGTH_MIN))) ||
		any(greaterThan(abgt,vec4(1,1,1,ray.length))))
		return;

	hinfo.hit = true;
	Vertex_Interpolate(abgt.xyz, A, B, C, hinfo.vertex);
    hinfo.matId = 0;
	ray.length = abgt[3];
}



//三维向量根据四维矩阵进行变换
vec3 Vec3ApplyMat4(vec3 v3,mat4 m4) {
    float x = v3.x;
    float y = v3.y;
    float z = v3.z;

    float w = 1.0 / ( m4[0][3] * x + m4[1][3] * y + m4[2][3] * z + m4[3][3] );

    v3.x = ( m4[0][0] * x + m4[1][0] * y + m4[2][0] * z + m4[3][0] ) * w;
    v3.y = ( m4[0][1] * x + m4[1][1] * y + m4[2][1] * z + m4[3][1] ) * w;
    v3.z = ( m4[0][2] * x + m4[1][2] * y + m4[2][2] * z + m4[3][2] ) * w;

    return v3;
}

//通过相机矩阵和平面坐标产生光线，此时输出的dir并非单位向量
Ray CameraMat2Ray(mat4 cmat,vec2 pos){
	pos = pos + u_rand_seed.xy / u_view_size * 2.0;
    Ray re;
    re.pos = Vec3ApplyMat4(vec3(pos,-1),cmat);
    re.dir = Vec3ApplyMat4(vec3(pos,1),cmat) - re.pos;
    return re;
}