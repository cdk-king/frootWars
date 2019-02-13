window.addEventListener("load", function() {
    game.init();
});
var game = {
    //开始初始化对象，预先加载资源，并显示开始画面
    init:function(){
        //初始化对象
        levels.init();
        loader.init();
        
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