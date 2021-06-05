var THREE = require("three");



/**
 * 将threejs Geometry对象打包为表面数据
 * @param {THREE.Geometry} geometry 
 */
export var BuildThreeGeometry = function(geometry){
    console.log(geometry);
    geometry.computeFaceNormals();

    var vertices = new Float32Array(geometry.vertices.length * 6);
    var faces = new Int16Array(geometry.faces.length * 3);

    for(var i in geometry.faces){
        var off = i * 3;
        
        geometry.vertices[geometry.faces[i].a]._normal = geometry.faces[i].normal;//geometry.faces[i].vertexNormals[0];
        geometry.vertices[geometry.faces[i].b]._normal = geometry.faces[i].normal;//geometry.faces[i].vertexNormals[1];
        geometry.vertices[geometry.faces[i].c]._normal = geometry.faces[i].normal;//geometry.faces[i].vertexNormals[2];
        faces[off + 0] = geometry.faces[i].a;
        faces[off + 1] = geometry.faces[i].b;
        faces[off + 2] = geometry.faces[i].c;
    }

    for(var i in geometry.vertices){
        var off = i * 6;
        vertices[off + 0] = geometry.vertices[i].x;
        vertices[off + 1] = geometry.vertices[i].y;
        vertices[off + 2] = geometry.vertices[i].z;

        vertices[off + 3] = geometry.vertices[i]._normal.x;
        vertices[off + 4] = geometry.vertices[i]._normal.y;
        vertices[off + 5] = geometry.vertices[i]._normal.z;
    }

    return {vertices,faces};
}