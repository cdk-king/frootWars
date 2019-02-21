(function(){
    var lastTime = 0;
    var vendors = ["ms","moz","webkit","0"];
    for(var x = 0;x<vendors.length && !window.requestAnimationFrame;x++){
        window.requestAnimationFrame = window[vendors[x]+"RequestAnimationFrame"];
        window.cancelAnimationFrame = window[vendors[x]+"CancelRequestAnimationFrame"] || window[vendors[x]+"CannelAnimationFrame"];
    }
    if(!window.requestAnimationFrame){
        window.requestAnimationFrame = function(callback,element){
            var currTime = new Date().getTime();
            var timeToCall = Math.max(0,16-(currTime-lastTime));
            var id = window.setTimeout(function(){
                callback(currTime+timeToCall);
            },timeToCall);
            lastTime = currTime+timeToCall;
            return id;
        };
    }
    if(!window.cancelAnimationFrame){
        window.cancelAnimationFrame = function(id){
            clearTimeout(id);
        }
    }
}());

window.addEventListener("load", function() {
    game.init();
});
var game = {
    //开始初始化对象，预先加载资源，并显示开始画面
    init:function(){
        //初始化对象
        levels.init();
        loader.init();
        mouse.init();
        
        //隐藏所有游戏图层，显示开始画面
        game.hideScreens();
        game.showScreen("gamestartscreen");
        game.canvas = document.getElementById("gamecanvas");
        game.context = game.canvas.getContext("2d");
        //loader.loadSound("Neptune");
    },
    hideScreens: function() {
        var screens = document.getElementsByClassName("gamelayer");
        for (let i = screens.length - 1; i >= 0; i--) {
            var screen = screens[i];
            screen.style.display = "none";
        }
    },
    hideScreen: function(id) {
        var screen = document.getElementById(id);

        screen.style.display = "none";
    },
    showScreen: function(id) {
        var screen = document.getElementById(id);

        screen.style.display = "block";
    },
    showLevelScreen:function(){
        game.hideScreens();
        game.showScreen("levelselectscreen");
    },
    //游戏阶段
    mode:"intro",
    //弹弓的x和y的坐标
    slingshotX:140,
    slingshotY:280,
    start:function(){
        game.hideScreens();
        //显示游戏画布和得分
        game.showScreen("gamecanvas");
        game.showScreen("scorescreen");
        game.mode = "intro";
        game.offsetLeft = 0;
        game.ended = false;
        game.animationFrame = window.requestAnimationFrame(game.animate,game.canvas);
    },
    //画面最大平移速度，单位为像素每帧
    maxSpeed:3,
    //画面最大和最小平移范围
    minOffset:0,
    maxOffset:300,
    //画面当前平移位置
    offsetLeft:0,
    //游戏得分
    score:0,
    //画面中心移动到newCenter
    panTo:function(newCenter){
        var df = newCenter-game.offsetLeft-game.canvas.width/4;
        if(Math.abs(df)>0 && game.offsetLeft <= game.maxOffset && game.offsetLeft >= game.minOffset){
            var deltaX = Math.round(df/2);
            if(deltaX && Math.abs(deltaX) > game.maxSpeed){
                //Math.sign() 函数返回一个数字的符号, 指示数字是正数，负数还是零。
                deltaX = game.maxSpeed * Math.abs(deltaX)/(deltaX);
            }
            game.offsetLeft += deltaX;
        }else{
            return true;
        }
        if(game.offsetLeft<game.minOffset){
            game.offsetLeft = game.minOffset;
            return true;
        }
        else if(game.offsetLeft>game.maxOffset){
            game.offsetLeft = game.maxOffset;
            return true;
        }
        return false;
    },
    handlePanning:function(){
        //移动函数，使画面向右平移
        //game.offsetLeft++;
        if(game.mode == "intro"){
            if(game.panTo(700)){
                game.mode = "load-next-hero";
            }
        }
        if(game.mode == "wait-for-firing"){
            if(mouse.dragging){
                game.panTo(mouse.x+game.offsetLeft);
            }else{
                //弹弓位置
                game.panTo(game.slingshotX);
            }
        }
        if(game.mode == "load-next-hero"){
            //待完成
            //检查是否有坏蛋，如果没有，结束关卡
            //检查是否有英雄，如果没有，结束关卡
            //填装英雄，设置状态到wait-for-firing
            game.mode = "wait-for-firing";
        }
        if(game.mode == "firing"){
            game.panTo(game.slingshotX);
        }
        if(game.mode == "fired"){
            //待完成
            //视野移动到英雄
        }
    },
    animate:function(){
        //移动背景
        game.handlePanning();
        //使角色移动
        //使用视差滚动绘制背景
        game.context.drawImage(game.currentLevel.backgroundImage,game.offsetLeft/4,0,640,480,0,0,640,480);
        game.context.drawImage(game.currentLevel.foregroundImage,game.offsetLeft,0,640,480,0,0,640,480);
        //绘制弹弓
        game.context.drawImage(game.slingshotImage,game.slingshotX-game.offsetLeft,game.slingshotY);
        game.context.drawImage(game.slingshotFrontImage,game.slingshotX-game.offsetLeft,game.slingshotY);
        if(!game.ended){
            game.animationFrame = window.requestAnimationFrame(game.animate,game.canvas);
        }
    }

}
var levels = {
    //关卡数据
    data:[
        {
            //第一关
            foreground:"desert-foreground",
            background:"clouds-background",
            entities:[]
        },
        {
            //第二关
            foreground:"desert-foreground",
            background:"clouds-background",
            entities:[]
        }
    ],
    //初始化关卡选择画面
    init:function(){
        var levelSelectScreen = document.getElementById("levelselectscreen");
        var buttonClickHandler = function() {
            game.hideScreen("levelselectscreen");
            levels.load(this.value - 1);
        };
        var html = "";
        for(var i = 0;i<levels.data.length;i++){
            //var level = levels.data[i];
            //html+='<input type="button" value="'+ (i+1) +'">';

            var button = document.createElement("input");
            button.type = "button";
            button.value = (i + 1); // Level labels are 1, 2
            button.addEventListener("click", buttonClickHandler);
            levelSelectScreen.appendChild(button);
        }

    },
    load:function(number){
        game.currentLevel = {
            number:number,
            hero:[]
        };
        game.score = 0;
        document.getElementById("score").innerHTML = "Score: " + game.score;
        var level = levels.data[number];
        //加载背景、前景和弹弓图像
        game.currentLevel.backgroundImage = loader.loadImage("images/backgrounds/" + level.background + ".png");
        game.currentLevel.foregroundImage = loader.loadImage("images/backgrounds/" + level.foreground + ".png");
        game.slingshotImage = loader.loadImage("images/slingshot.png");
        game.slingshotFrontImage = loader.loadImage("images/slingshot-front.png");
        //一旦所有的图像加载完成，就调用game.start()函数
        if(loader.loaded){
            game.start();
        }else{
            loader.onload = game.start();
        }
    }
}
var loader = {
    loaded:true,
    loadedCount:0,//已加载的资源数
    totalCount:0,//需要被加载的资源总数

    init:function(){
        //检查浏览器支持的声音格式
        var mp3Support;
        var oggSupport;
        var audio = document.createElement("audio");
        if(audio.canPlayType){
            //当前canPlayType()方法返回“”、“maybe”、“probably”
            mp3Support = "" != audio.canPlayType("audio/mpeg");
            oggSupport = "" != audio.canPlayType("audio/ogg; codecs=\"vorbis\"");
        }else{
            //audio标签不支持
            mp3Support = false;
            oggSupport = false;
        }
        //检查ogg、mp3，如果都不支持，就将soundFileExtn设置成undefined
        loader.soundFileExtn = mp3Support?".mp3":oggSupport?".ogg":undefined;
    },
    loadImage:function(url){
        this.totalCount++;
        this.loaded = false;
        game.showScreen("loadingscreen");
        var image = new Image();
        image.src = url;
        image.onload = loader.itemLoaded;
        return image;
    },
    soundFileExtn:".mp3",
    loadSound:function(url){
        this.totalCount++;
        this.loaded = false;
        game.showScreen("loadingscreen");
        var audio = new Audio();
        audio.src = url +loader.soundFileExtn;
        audio.addEventListener("canplaythrough",loader.itemLoaded,false);
        return audio;
    },
    itemLoaded:function(ev){
        // 加载此项目后，停止侦听其事件类型（加载或canPlayThrough）
        ev.target.removeEventListener(ev.type, loader.itemLoaded, false);
        loader.loadedCount++;
        document.getElementById("loadingmessage").innerHTML = "Loaded " + loader.loadedCount + " of " + loader.totalCount;
        if(loader.loadedCount == loader.totalCount){
            //loader完成了资源加载
            loader.loaded = true;
            //隐藏加载页面
            game.hideScreen("loadingscreen");
            //如果loader.onload事件有响应函数，调用
            if(loader.onload){
                loader.onload();
                loader.onload = undefined;
            }
        }
    }
}

var mouse = {
    X:0,
    y:0,
    down:false,
    init:function(){
        var canvas = document.getElementById("gamecanvas");

        canvas.addEventListener("mousemove", mouse.mousemovehandler, false);
        canvas.addEventListener("mousedown", mouse.mousedownhandler, false);
        canvas.addEventListener("mouseup", mouse.mouseuphandler, false);
        canvas.addEventListener("mouseout", mouse.mouseuphandler, false);
    },
    mousemovehandler:function(ev){
        //getBoundingClientRect用于获取某个元素相对于视窗的位置集合。集合中有top, right, bottom, left等属性。
        var offset =  game.canvas.getBoundingClientRect();
        mouse.x = ev.clientX - offset.left;
        mouse.y = ev.clientY - offset.top;
        if (mouse.down) {
            mouse.dragging = true;
        }
        //阻止元素发生默认的行为
        ev.preventDefault();
    },
    mousedownhandler:function(ev){
        mouse.down = true;
        mouse.downX = mouse.x;
        mouse.downY = mouse.y;
        //ev.originalEvent.preventDefault();
        ev.preventDefault();
    },
    mouseuphandler:function(ev){
        mouse.down = false;
        mouse.dragging = false;
        ev.preventDefault();
    }
}

var entities = {
    definitions:{
        //形状、生命值、宽、高、半径、密度、摩擦、回弹
        "glass":{
            fullHealth:100,
            density:2.4,
            friction:0.4,
            restitution:0.15,
        },
        "wood":{
            fullHealth:500,
            density:0.7,
            friction:0.4,
            restitution:0.4,
        },
        "dirt":{
            density:3.0,
            friction:1.5,
            restitution:0.4,
        },
        "burger":{
            shape:"circle",
            fullHealth:40,
            radius:25,
            density:1,
            friction:0.5,
            restitution:0.4,
        },
        "sodacan":{
            shape:"rectangle",
            fullHealth:80,
            width:40,
            height:60,
            density:1,
            friction:0.5,
            restitution:0.7,
        },
        "fries":{
            shape:"rectangle",
            fullHealth:50,
            width:40,
            height:50,
            density:1,
            friction:0.5,
            restitution:0.6,
        },
        "apple":{
            shape:"circle",
            radius:25,
            density:1.5,
            friction:0.5,
            restitution:0.4,
        },
        "orange":{
            shape:"circle",
            radius:25,
            density:1.5,
            friction:0.5,
            restitution:0.4,
        },
        "strawberry":{
            shape:"circle",
            radius:15,
            density:2.0,
            friction:0.5,
            restitution:0.4,
        }
    },
    //以物体作为参数，创建一个Box2D物体，并加入世界
    create:function(entity){

    },
    //以物体、物体的位置和角度为参数，在游戏画面中绘制物体
    draw:function(entity,position,angle){

    }
}