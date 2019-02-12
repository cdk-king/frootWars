window.addEventListener("load", function() {
    game.init();
});
var game = {
    //开始初始化对象，预先加载资源，并显示开始画面
    init:function(){
        //隐藏所有游戏图层，显示开始画面
        game.hideScreens();
        game.showScreen("gamestartscreen");
        game.canvas = document.getElementById("gamecanvas");
        game.context = game.canvas.getContext("2d");
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
        
    }
}