var path = require("path");
var webpack = require("webpack");

//所有编译的文件
var filess = {
    //主文件
    "main":{
        file:"build.js",
        src:"./src/main.js"
    },
    "test":{
        file:"test.js",
        src:"./src/test.js"
    }
};

//目标文件
var files = {};

//目前开启的文件
var opens = [
    "main",
    //"test"
];

//去掉未开启的内容
for(var i in opens){
    files[opens[i]] = filess[opens[i]];
}

//入口文件映射表
var inFiles = {
    //框架文件载入
    //vendor: ["three","axios","pako","whatwg-fetch","pngjs","sequelize"]
};
//测试文件映射表
var testFiles = {};
for(var i in files){
    inFiles[i] = files[i].src;
    testFiles["/" + files[i].file] = true;
}

//filename映射函数
var func = function(chunkData){
    if(chunkData.chunk.name == "vendor")
        return "vendor.js";
    return files[chunkData.chunk.name].file;
}

//filename测试函数
func.test = function(path){
    if(path.indexOf(".html") > 0)
        return true;
}

var funcType = function(path){
    console.log("===========================",path);
    //if(path.indexOf("lcg-tool") >= 0)
    //    return "commonjs2";
    return null;
}


//======默认配置文件======
var cfg = {
    //环境模式
    mode:"development",
    mode:"production",
    //入口文件
    entry: async function(){
        return inFiles;
    },
    //第三方库打包
    optimization: {
      splitChunks: {
        chunks: 'all',
        minSize: 30000,
        maxSize: 0,
        minChunks: 1,
        maxAsyncRequests: 5,
        maxInitialRequests: 3,
        automaticNameDelimiter: '~',
        cacheGroups: {
          vendors: {
            test: /[\\/]node_modules[\\/]/,
            priority: 10,
            name:"vendor",
            filename:"[name].js"
            //reuseExistingChunk:true
          },
          tools: {
            test: /[\\/]public[\\/](board|cache|config|face|global|image-server|labels|loader|maths|modules|renders|store|tag-loader|tools|views|workers)/,
            priority: 10,
            name:"tools",
            filename:"[name].js"
            //reuseExistingChunk:true
          }
        }
      }
    },
    //文件输出路径
    output: {
        path: path.join(__dirname, "build"),
        filename:func,
        //libraryTarget:"commonjs2"
    },
    //载入模块
    module: {
        rules: [
            {
                test: /\.less$/,
                use: ['style-loader', 'css-loader', 'less-loader']
            },
            {test: /\.cpp$/i,use: 'raw-loader'},
            {
                test: /\.worker\.js$/,
                use: {
                    loader: 'worker-loader',
                    options:{ inline: true }
                }
            },
            //lcg模块文件载入
            {
                test:  /\.(js|jsx)$/,
                exclude: /node_modules/,
                use:{
                    loader:"babel-loader",
                    options:{
                        cacheDirectory:true,
                        presets: ["react","es2015","stage-2","es2017"],
                        plugins:[
                            "transform-runtime",
                            "transform-remove-strict-mode",
                            "transform-decorators-legacy"
                        ]
                    }
                }
            }
        ]
    },
    //服务器设置
    devServer: {
        hot:false,
        contentBase: path.join(__dirname, "build"),
        port:13806,
        lazy:true
    },
    //开发环境
    devtool:"eval",
    //解析
    resolve:{
        // 要解析的文件的扩展名
        extensions: [".js", ".jsx", ".json"],
        // alias: {
        //     '@': path.resolve(__dirname, 'public'),
        // },
        modules:[
            path.resolve(__dirname, "public"),
            //framework项目绝对路径
            path.resolve(__dirname, "../framework"),
            path.resolve(__dirname, "node_modules"),
            "node_modules"
        ]
    }
    //生产测试环境
    //devtool:"source-map"
};


//开放给外部
module.exports = {
    init:function(vals){
        for(var i in vals)
            cfg[i] = vals[i];
        return cfg;
    }
};