//为了方便，将常用对象声明为变量
var b2Vec2 = Box2D.Common.Math.b2Vec2;
var b2BodyDef = Box2D.Dynamics.b2BodyDef;
var b2Body = Box2D.Dynamics.b2Body;
var b2FixtureDef = Box2D.Dynamics.b2FixtureDef;
var b2Fixture = Box2D.Dynamics.b2Fixture;
var b2World = Box2D.Dynamics.b2World;
var b2PolygonShape = Box2D.Collision.Shapes.b2PolygonShape;
var b2CircleShape = Box2D.Collision.Shapes.b2CircleShape;
var b2DebugDraw = Box2D.Dynamics.b2DebugDraw;
var b2RevoluteJointDef = Box2D.Dynamics.Joints.b2RevoluteJointDef;

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


var game = {
    //开始初始化对象，预先加载资源，并显示开始画面
    init:function(){
        //初始化对象
        levels.init();
        loader.init();
        mouse.init();

        //加载所有的音效及背景音乐
        //由Gurdonark创作的“Kindergar”
        //由创意公用授权条款授权http://ccmixter.org/files/gurdonark/26491
        game.backgroundMusic = loader.loadSound("audio/frog");

        game.slingshotReleasedSound = loader.loadSound("audio/released");
        game.bounceSound = loader.loadSound("audio/bounce");
        game.braekSound = {
            "glass":loader.loadSound("audio/glassbreak"),
            "wood":loader.loadSound("audio/woodbreak")
        };
        
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

        game.startBackgroundMusic();

        game.mode = "intro";
        game.offsetLeft = 0;
        game.ended = false;
        game.fps = 0;
        game.lastUpdateTime = new Date().getTime();
        game.animationFrame = window.requestAnimationFrame(game.animate,game.canvas);
    },
    //画面最大平移速度，单位为像素每帧
    maxSpeed:5,
    //画面最大和最小平移范围
    minOffset:0,
    maxOffset:300,
    //画面当前平移位置
    offsetLeft:0,
    //游戏得分
    score:0,
    //画面中心移动到newCenter
    panTo:function(newCenter){
        game.maxOffset = game.currentLevel.backgroundImage.width - game.canvas.width;

        // The current center of the screen is half the screen width from the left offset
        var currentCenter = game.offsetLeft + game.canvas.width / 2;

        if(Math.abs(newCenter - currentCenter) > 0 && game.offsetLeft <= game.maxOffset && game.offsetLeft >= game.minOffset){
            // We will travel half the distance from the newCenter to currentCenter in each tick
            // This will allow easing
            var deltaX = (newCenter - currentCenter) / 2;

            if(deltaX && Math.abs(deltaX) > game.maxSpeed){
                //Math.sign() 函数返回一个数字的符号, 指示数字是正数，负数还是零。
                deltaX = game.maxSpeed * Math.abs(deltaX)/(deltaX);
            }

            // And if we have almost reached the goal, just get to the ending in this turn
            if (Math.abs(deltaX) <= 1) {
                deltaX = (newCenter - currentCenter);
            }

            // Finally add the adjusted deltaX to offsetX so we move the screen by deltaX
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
                if(game.mouseOnCurrentHero()){
                    game.mode = "firing"
                }else{
                    game.panTo(mouse.x+game.offsetLeft);
                }           
            }else{
                //弹弓位置
                game.panTo(game.slingshotX);
                //game.panTo(500);
            }
        }
        if(game.mode == "load-next-hero"){
            game.countHeroesAndVillains();

            //检查是否有坏蛋，如果没有，结束关卡
            if(game.villains.length == 0){
                game.mode = "level-success";
                return;
            }

            //检查是否有英雄，如果没有，结束关卡
            if(game.heros.length == 0){
                game.mode = "level-failure";
                return;
            }

            //加载英雄并设置模式为wait-for-firing
            if(!game.currentHero){
                game.currentHero = game.heros[game.heros.length-1];
                game.currentHero.SetPosition(
                    {
                        x:180/box2d.scale,
                        y:200/box2d.scale
                    }
                );
                game.currentHero.SetLinearVelocity(
                    {
                        x:0,
                        y:0
                    }
                );
                game.currentHero.SetAngularVelocity(0);
                game.currentHero.SetAwake(true);
            }else{
                //等待英雄结束弹跳并进入休眠，接着切换到wait-for-firing阶段
                game.panTo(game.slingshotX);
                
                if(!game.currentHero.IsAwake()){
                    game.mode = "wait-for-firing";
                }
            }
        }
        if(game.mode == "firing"){
            if(mouse.down){
                game.panTo(game.slingshotX);
                game.currentHero.SetPosition(
                    {
                        x:(mouse.x+game.offsetLeft)/box2d.scale,
                        y:mouse.y/box2d.scale
                    }
                );
            }else{
                //松手后
                game.mode = "fired";
                game.slingshotReleasedSound.play();
                var impulseScaleFactor = 0.75;
                var impulse = new b2Vec2((game.slingshotX+35-mouse.x-game.offsetLeft)*impulseScaleFactor,(game.slingshotY+25-mouse.y)*impulseScaleFactor);
                game.currentHero.ApplyImpulse(impulse,game.currentHero.GetWorldCenter());//添加推力

                // Make sure the hero can't keep rolling indefinitely
                game.currentHero.SetAngularDamping(2);
            }
        }
        if(game.mode == "fired"){
            //视野移动到英雄
            var heroX = game.currentHero.GetPosition().x*box2d.scale;
            game.panTo(heroX);
            //直到该英雄停止移动或移除边界
            if(!game.currentHero.IsAwake() || heroX<0 || heroX>game.currentLevel.foregroundImage.width){
                //然后删除旧的英雄
                box2d.world.DestroyBody(game.currentHero);
                game.currentHero = undefined;
                //加载下一个英雄
                game.mode = "load-next-hero";
            }
        }
        if(game.mode == "level-success" || game.mode == "level-failure"){
            if(game.panTo(0)){
                game.ended = true;
                game.showEndingScreen();
            }
        }
    },
    scale: 1,//画面比例
    resize:function(){
        var maxWidth = window.innerWidth;
        var maxHeight = window.innerHeight;
        
        var scale = Math.min(maxWidth / 640, maxHeight / 480);

        var gameContainer = document.getElementById("gamecontainer");
        gameContainer.style.transform = "translate(-50%, -50%) " + "scale(" + scale + ")";

        //根据当前的比例我们可以设置的最大宽度是多少
        var width = Math.max(640, Math.min(1024, maxWidth / scale ));

        // 将此新宽度应用于游戏容器和游戏画布
        gameContainer.style.width = width + "px";
        
        var gameCanvas = document.getElementById("gamecanvas");

        gameCanvas.width = width;
        
        game.scale = scale;

    },
    animate:function(){
        var currentTime = new Date().getTime();
        //移动背景
        game.handlePanning();

        //使角色动起来
        
        var timeStep;
        if(game.lastUpdateTime){
            timeStep = (currentTime-game.lastUpdateTime)/1000;
            box2d.step(timeStep);
        }
        

        //使用视差滚动绘制背景
        game.context.drawImage(game.currentLevel.backgroundImage,game.offsetLeft/4,0,game.canvas.width,game.canvas.height,0,0,game.canvas.width,game.canvas.height);
        game.context.drawImage(game.currentLevel.foregroundImage,game.offsetLeft,0,game.canvas.width,game.canvas.height,0,0,game.canvas.width,game.canvas.height);
        //绘制弹弓
        game.context.drawImage(game.slingshotImage,game.slingshotX-game.offsetLeft,game.slingshotY);

        //绘制所有的物体
        game.drawAllBodies();

        //发射英雄时绘制橡胶带
        if(game.mode == "firing"){
            game.drawSlingshotBand();
        }
        
        //再次绘制弹弓的外侧支架
        game.context.drawImage(game.slingshotFrontImage,game.slingshotX-game.offsetLeft,game.slingshotY);


        //绘制显示mode
        //game.drawDebugMode();
        //显示帧数
        //game.drawDebugFPS();
        //显示中心位置
        //game.drawDebugPosition();

        game.lastUpdateTime = currentTime;
        
        if(!game.ended){
            game.animationFrame = window.requestAnimationFrame(game.animate,game.canvas);
        }
    },
    drawAllBodies:function(){
        box2d.world.DrawDebugData();
        
        //遍历所有的物体，并在游戏画面上绘制他们
        for(var body = box2d.world.GetBodyList();body;body = body.GetNext()){
            var entity = body.GetUserData();

            if(entity){
                var entityX = body.GetPosition().x*box2d.scale;
                if(entityX<0 || entityX>game.currentLevel.foregroundImage.width || (entity.health && entity.health<0)){
                    box2d.world.DestroyBody(body);
                    if(entity.type == "villain"){
                        game.score += entity.calories;
                        document.getElementById("score").innerHTML = "分数: " + game.score;
                    }
                    if(entity.braekSound){
                        entity.braekSound.play();
                    }
                }else{
                    entities.draw(entity,body.GetPosition(),body.GetAngle());
                }  
            }
        }
    },
    countHeroesAndVillains:function(){
        game.heros = [];
        game.villains = [];
        for(var body = box2d.world.GetBodyList();body;body = body.GetNext()){
            var entity = body.GetUserData();
            if(entity){
                if(entity.type == "hero"){
                    game.heros.push(body);
                }else if(entity.type == "villain"){
                    game.villains.push(body);
                }
            }
        }
    },
    mouseOnCurrentHero:function(){
        if(!game.currentHero){
            return false;
        }
        var position = game.currentHero.GetPosition();
        var distanceSquared = Math.pow(position.x*box2d.scale-mouse.x-game.offsetLeft,2) + 
        Math.pow(position.y*box2d.scale-mouse.y,2);
        var radiusSquared = Math.pow(game.currentHero.GetUserData().radius,2);
        return (distanceSquared <= radiusSquared);
    },
    showEndingScreen:function(){
        game.stopBackgroundMusic();
        var playNextLevel = document.getElementById("playnextlevel");
        var endingMessage = document.getElementById("endingmessage");

        if(game.mode == "level-success"){
            if(game.currentLevel.number<levels.data.length-1){
                endingMessage.innerHTML = "关卡完成。做得好！！！！";
                // More levels available. Show the play next level button
                playNextLevel.style.display = "block";
            }else{
                endingMessage.innerHTML = "已通关全部关卡。做得好！！！！";
                // No more levels. Hide the play next level button
                playNextLevel.style.display = "none";
            }
        }else if(game.mode == "level-failure"){
            endingMessage.innerHTML = "失败。再来一次？";
            // Failed level. Hide the play next level button
            playNextLevel.style.display = "none";
        }
        game.showScreen("endingscreen");

        // Stop the background music when the game ends
        //game.stopBackgroundMusic();
    },
    drawSlingshotBand:function(){
        //暗棕色
        game.context.strokeStyle = "rgb(68,31,11)";
        //绘制一条粗线
        game.context.lineWidth = 6;

        //用英雄被拖拽的角度和半径计算英雄的末端，相对于英雄的中心
        var radius = game.currentHero.GetUserData().radius;
        var heroX = game.currentHero.GetPosition().x*box2d.scale;
        var heroY = game.currentHero.GetPosition().y*box2d.scale;
        var angle = Math.atan2(game.slingshotY+25-heroY,game.slingshotX+50-heroX);

        var heroFarEdgeX = heroX - radius * Math.cos(angle);
        var heroFarEdgeY = heroY - radius * Math.sin(angle);

        game.context.beginPath();
        //从弹弓顶端开始绘制（背面）
        game.context.moveTo(game.slingshotX+50-game.offsetLeft,game.slingshotY+25);

        //画到英雄的中心
        game.context.lineTo(heroX-game.offsetLeft,heroY);
        game.context.stroke();

        //再次绘制英雄
        entities.draw(game.currentHero.GetUserData(),game.currentHero.GetPosition(),game.currentHero.GetAngle());

        game.context.beginPath();
        //移动到英雄离弹弓顶部最远的边缘
        game.context.moveTo(heroFarEdgeX-game.offsetLeft,heroFarEdgeY);
        
        //将线画会弹弓（正面）
        game.context.lineTo(game.slingshotX-game.offsetLeft+10,game.slingshotY+30);
        game.context.stroke();

    },
    restartLevel:function(){
        window.cancelAnimationFrame(game.animationFrame);
        game.lastUpdateTime = undefined;
        levels.load(game.currentLevel.number);
    },
    startNextLevel:function(){
        window.cancelAnimationFrame(game.animationFrame);
        game.lastUpdateTime = undefined;
        levels.load(game.currentLevel.number+1);
    },
    drawDebugMode:function(){
        var debugContext = document.getElementById("debugcanvas").getContext("2d");
        debugContext.beginPath();
        debugContext.font = 'bold 25px Arial';
        debugContext.textAlign = 'center';
        debugContext.textBaseline = 'bottom';
        debugContext.fillStyle = '#ccc';
        //debugContext.strokeText("mode:"+game.mode, 150, 100);
        debugContext.fillText("mode:"+game.mode, 150, 50);
    },
    drawDebugPosition:function(){
        var debugContext = document.getElementById("debugcanvas").getContext("2d");
        debugContext.beginPath();
        debugContext.font = 'bold 25px Arial';
        debugContext.textAlign = 'center';
        debugContext.textBaseline = 'bottom';
        debugContext.fillStyle = '#ccc';
        //debugContext.strokeText("mode:"+game.mode, 150, 100);
        debugContext.fillText("positionX:"+Math.round(game.canvas.width/2+game.offsetLeft), 150, 80);
        debugContext.fillText("offsetLeft:"+Math.round(game.offsetLeft), 150, 110);
        debugContext.fillText("width/2:"+game.canvas.width/2, 400, 80);
        debugContext.fillText("scale:"+game.scale.toFixed(2), 400, 110);
    },
    drawDebugFPS:function(){
        var debugContext = document.getElementById("debugcanvas").getContext("2d");
        var currentTime = new Date().getTime();
        
        if(!game.lastFpsUpdateTime){
            game.lastFpsUpdateTime = currentTime;
            game.calculateFps(currentTime);
        }
        if(currentTime - game.lastFpsUpdateTime > 1000) {
            game.calculateFps(currentTime);
            game.lastFpsUpdateTime = currentTime;
            
			//game.fpsElement.innerHTML = game.fps.toFixed(0) + ' fps';
			//console.log(game.fps.toFixed(0));
        }
        debugContext.beginPath();
        debugContext.font = 'bold 25px Arial';
        debugContext.textAlign = 'center';
        debugContext.textBaseline = 'bottom';
        //debugContext.strokeText("fps:"+game.fps.toFixed(0), 450, 100);
        debugContext.fillStyle = '#ccc';
        debugContext.fillText("fps:"+game.fps.toFixed(0), 400, 50);
    },
    calculateFps:function(now) {
		game.fps = 1 / (now - game.lastUpdateTime) * 1000;
		//console.log(now - this.lastAnimationFrameTime);
		
		return game.fps;
    },
    startBackgroundMusic: function() {
        game.backgroundMusic.play();
        game.setBackgroundMusicButton();
    },
    stopBackgroundMusic: function() {
        game.backgroundMusic.pause();
        // Go to the beginning of the song
        game.backgroundMusic.currentTime = 0;

        game.setBackgroundMusicButton();
    },
    toggleBackgroundMusic: function() {
        if (game.backgroundMusic.paused) {
            game.backgroundMusic.play();
        } else {
            game.backgroundMusic.pause();
        }

        game.setBackgroundMusicButton();
    },
    setBackgroundMusicButton: function() {
        var toggleImage = document.getElementById("togglemusic");

        if (game.backgroundMusic.paused) {
            toggleImage.src = "images/icons/nosound.png";
        } else {
            toggleImage.src = "images/icons/sound.png";
        }
    },

}
var levels = {
    //关卡数据
    data:[
        {
            //第一关
            foreground:"desert-foreground",
            background:"clouds-background",
            entities:[
                // 地面
                { type: "ground", name: "dirt", x: 500, y: 440, width: 1000, height: 20, isStatic: true },
                // 弹弓木框架
                { type: "ground", name: "wood", x: 190, y: 390, width: 30, height: 80, isStatic: true },

                { type: "block", name: "wood", x: 520, y: 380, angle: 90, width: 100, height: 25 },
                { type: "block", name: "glass", x: 520, y: 280, angle: 90, width: 100, height: 25 },
                { type: "villain", name: "burger", x: 520, y: 205, calories: 590 },

                { type: "block", name: "wood", x: 620, y: 380, angle: 90, width: 100, height: 25 },
                { type: "block", name: "glass", x: 620, y: 280, angle: 90, width: 100, height: 25 },
                { type: "villain", name: "fries", x: 620, y: 205, calories: 420 },
                
                { type: "hero", name: "orange", x: 80, y: 405 },
                { type: "hero", name: "apple", x: 140, y: 405 },
            ]
        },
        {
            //第二关
            foreground:"desert-foreground",
            background:"clouds-background",
            entities:[
                // 地面
                { type: "ground", name: "dirt", x: 500, y: 440, width: 1000, height: 20, isStatic: true },
                // 弹弓木框架
                { type: "ground", name: "wood", x: 190, y: 390, width: 30, height: 80, isStatic: true },

                { type: "block", name: "wood", x: 850, y: 380, angle: 90, width: 100, height: 25 },
                { type: "block", name: "wood", x: 700, y: 380, angle: 90, width: 100, height: 25 },
                { type: "block", name: "wood", x: 550, y: 380, angle: 90, width: 100, height: 25 },
                { type: "block", name: "glass", x: 625, y: 316, width: 150, height: 25 },
                { type: "block", name: "glass", x: 775, y: 316, width: 150, height: 25 },

                { type: "block", name: "glass", x: 625, y: 252, angle: 90, width: 100, height: 25 },
                { type: "block", name: "glass", x: 775, y: 252, angle: 90, width: 100, height: 25 },
                { type: "block", name: "wood", x: 700, y: 190, width: 150, height: 25 },

                { type: "villain", name: "burger", x: 700, y: 152, calories: 590 },
                { type: "villain", name: "fries", x: 625, y: 405, calories: 420 },
                { type: "villain", name: "sodacan", x: 775, y: 400, calories: 150 },

                { type: "hero", name: "strawberry", x: 30, y: 415 },
                { type: "hero", name: "orange", x: 80, y: 405 },
                { type: "hero", name: "apple", x: 140, y: 405 }
            ]
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
        //关卡加载时，初始化Box2D世界
        box2d.init();

        //声明新的当前关卡对象
        game.currentLevel = {
            number:number,
            hero:[]
        };
        game.score = 0;
        document.getElementById("score").innerHTML = "分数: " + game.score;
        game.currentHero = undefined;
        var level = levels.data[number];

        //加载背景、前景和弹弓图像
        game.currentLevel.backgroundImage = loader.loadImage("images/backgrounds/" + level.background + ".png");
        game.currentLevel.foregroundImage = loader.loadImage("images/backgrounds/" + level.foreground + ".png");
        if(!game.slingshotImage){
            game.slingshotImage = loader.loadImage("images/slingshot.png");
        }
        if(!game.slingshotFrontImage){
            game.slingshotFrontImage = loader.loadImage("images/slingshot-front.png");
        }

        //加载所有物体
        for(var i = level.entities.length-1;i>=0;i--){
            var entity = level.entities[i];
            entities.create(entity);
        }

        //一旦所有的图像加载完成，就调用game.start()函数
        loader.onload = game.start;
        if(loader.loaded){
            //game.start();
        }else{
            //loader.onload = game.start;
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
        //game.hideScreens();
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
        document.getElementById("loadingmessage").innerHTML = "已加载 " + loader.loadedCount + " 共 " + loader.totalCount;
        if(loader.loadedCount == loader.totalCount){
            //loader完成了资源加载
            loader.loaded = true;
            //隐藏加载页面
            
            //game.hideScreen("loadingscreen");
            //如果loader.onload事件有响应函数，调用
            if(loader.onload){
                setTimeout(function(){
                    game.hideScreen("loadingscreen");
                    loader.onload();
                    loader.onload = undefined;
                },500);
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

        // Handle touchmove separately
        canvas.addEventListener("touchmove", mouse.touchmovehandler, false);

        // Reuse mouse handlers for touchstart, touchend, touchcancel
        canvas.addEventListener("touchstart", mouse.mousedownhandler, false);
        canvas.addEventListener("touchend", mouse.mouseuphandler, false);
        canvas.addEventListener("touchcancel", mouse.mouseuphandler, false);
    },
    mousemovehandler:function(ev){
        //getBoundingClientRect用于获取某个元素相对于视窗的位置集合。集合中有top, right, bottom, left等属性。
        var offset =  game.canvas.getBoundingClientRect();

        mouse.x = (ev.clientX - offset.left) / game.scale;
        mouse.y = (ev.clientY - offset.top) / game.scale;
        
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
    },
    touchmovehandler: function(ev) {
        var touch = ev.targetTouches[0];
        var offset = game.canvas.getBoundingClientRect();

        mouse.x = (touch.clientX - offset.left) / game.scale;
        mouse.y = (touch.clientY - offset.top) / game.scale;

        if (mouse.down) {
            mouse.dragging = true;
        }

        ev.preventDefault();
    },
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
            restitution:0.2,
        },
        "burger":{//汉堡
            shape:"circle",
            fullHealth:40,
            radius:25,
            density:1,
            friction:0.5,
            restitution:0.4,
        },
        "sodacan":{//苏打罐
            shape:"rectangle",
            fullHealth:80,
            width:40,
            height:60,
            density:1,
            friction:0.5,
            restitution:0.7,
        },
        "fries":{//薯条
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
        "strawberry":{//草莓
            shape:"circle",
            radius:15,
            density:2.0,
            friction:0.8,
            restitution:0.4,
        }
    },
    //以物体作为参数，创建一个Box2D物体，并加入世界
    create:function(entity){
        var definition = entities.definitions[entity.name];
        if(!definition){
            console.log("没有找到该实体",entity.name);
            return;
        }
        switch(entity.type){
            case "block"://简单的矩形
                entity.health = definition.fullHealth;
                entity.fullHealth = definition.fullHealth;
                entity.shape = "rectangle";
                if(!entity.sprite){
                    entity.sprite = loader.loadImage("images/entities/"+entity.name+".png");
                } 
                entity.braekSound = game.braekSound[entity.name];
                box2d.createRectangle(entity,definition);
                break;
            case "ground"://简单的矩形
                //不可摧毁物体，不必具有生命值
                entity.shape = "rectangle",
                //不会被画出，所以不必具有图像
                box2d.createRectangle(entity,definition);
                break;
            case "hero"://简单的圆
            case "villain"://可以是圆形或者是矩形
                entity.health = definition.fullHealth;
                entity.fullHealth = definition.fullHealth;
                if(!entity.sprite){
                    entity.sprite = loader.loadImage("images/entities/"+entity.name+".png");
                }
                entity.shape = definition.shape;
                entity.bounceSound = game.bounceSound;
                if(definition.shape == "circle"){
                    entity.radius = definition.radius;
                    box2d.createCircle(entity,definition);
                }else if(definition.shape == "rectangle"){
                    entity.width = definition.width;
                    entity.height = definition.height;
                    box2d.createRectangle(entity,definition);
                }
                break;
            default:
                console.log("找不到实体类型",entity.type);
                break;
        }
    },
    //以物体、物体的位置和角度为参数，在游戏画面中绘制物体
    draw:function(entity,position,angle){
        game.context.translate(position.x*box2d.scale-game.offsetLeft,position.y*box2d.scale);
        game.context.rotate(angle);
        switch(entity.type){
            case "block":
                game.context.drawImage(entity.sprite,0,0,
                    entity.sprite.width,entity.sprite.height,
                    -entity.width/2-1,-entity.height/2-1,
                    entity.width+2,entity.height+2);
                break;
            case "villain":
            //后面没有加break语句相当于：if("villain" || "hero")
            case "hero":
                if(entity.shape == "circle"){
                    game.context.drawImage(entity.sprite,0,0,
                        entity.sprite.width,entity.sprite.height,
                        -entity.radius-1,-entity.radius-1,
                        entity.radius*2+2,entity.radius*2+2);
                }else if(entity.shape == "rectangle"){
                    game.context.drawImage(entity.sprite,0,0,
                        entity.sprite.width,entity.sprite.height,
                        -entity.width/2-1,-entity.height/2-1,
                        entity.width+2,entity.height+2);
                }
                break;
            case "ground":
                //什么都不做，我们单独绘制地面和弹弓
                break;
        }
        game.context.rotate(-angle);
        game.context.translate(-position.x*box2d.scale+game.offsetLeft,-position.y*box2d.scale);
    }
}

var box2d = {
    scale:30,
    init:function(){
        //创建Box2d world对象，该对象将完成大部分物理计算
        var gravity = new b2Vec2(0,9.8);//声明重力加速度为9.8m/s^2,方向向下
        var allowSleep = true;//允许静止的物体进入休眠状态，休眠物体不参与物理仿真计算
        box2d.world = new b2World(gravity,allowSleep);

        //设置调试绘图
            var debugContext = document.getElementById("debugcanvas").getContext("2d");
            var debugDraw = new b2DebugDraw();
            //使用canvas绘制环境来绘制调试画面
            debugDraw.SetSprite(debugContext);
            //设置绘图比例
            debugDraw.SetDrawScale(box2d.scale);
            //填充的透明度为0.3
            debugDraw.SetFillAlpha(0.3);
            //线条的宽度为1
            debugDraw.SetLineThickness(1.0);
            //绘制所有的shape和joint
            debugDraw.SetFlags(b2DebugDraw.e_shapeBit | b2DebugDraw.e_jointBit);
            //设置调试绘图模式
            //box2d.world.SetDebugDraw(debugDraw);
        
        var listener = new Box2D.Dynamics.b2ContactListener;
        listener.PostSolve = function(contact,impulse){
            var body1 = contact.GetFixtureA().GetBody();
            var body2 = contact.GetFixtureB().GetBody();
            var entity1 = body1.GetUserData();
            var entity2 = body2.GetUserData();

            var impulseAlongNormal = Math.abs(impulse.normalImpulses[0]);
            //监听器被调用的频率太高，过滤掉非常小的冲击
            //尝试不同的值后，5似乎比较好
            if(impulseAlongNormal>5){
                //如果对象有生命值，用冲击值削弱生命值
                if(entity1.health){
                    entity1.health -= impulseAlongNormal;
                }
                if(entity2.health){
                    entity2.health -= impulseAlongNormal;
                }
                //如果物体具有弹跳音，则播放它
                if(entity1.bounceSound){
                    entity1.bounceSound.play();
                }
                if(entity2.bounceSound){
                    entity2.bounceSound.play();
                }
            }
        }
        box2d.world.SetContactListener(listener);
    },
    createRectangle:function(entity,definition){
        var bodyDef = new b2BodyDef;
        if(entity.isStatic){
            bodyDef.type = b2Body.b2_staticBody;
        }else{
            bodyDef.type = b2Body.b2_dynamicBody;
        }
        bodyDef.position.x = entity.x/box2d.scale;
        bodyDef.position.y = entity.y/box2d.scale;

        if(entity.angle){
            bodyDef.angle = Math.PI*entity.angle/180;
        }

        var fixtureDef = new b2FixtureDef;
        fixtureDef.density = definition.density;
        fixtureDef.friction = definition.friction;
        fixtureDef.restitution = definition.restitution;
        fixtureDef.shape = new b2PolygonShape;
        fixtureDef.shape.SetAsBox(entity.width/2/box2d.scale,entity.height/2/box2d.scale);

        var body = box2d.world.CreateBody(bodyDef);
        body.SetUserData(entity);

        var fixture = body.CreateFixture(fixtureDef);
        return body;

    },
    createCircle:function(entity,definition){
        var bodyDef = new b2BodyDef;
        if(entity.isStatic){
            bodyDef.type = b2Body.b2_staticBody;
        }else{
            bodyDef.type = b2Body.b2_dynamicBody;
        }
        bodyDef.position.x = entity.x/box2d.scale;
        bodyDef.position.y = entity.y/box2d.scale;
        //bodyDef.linearDamping = 0.3;
        //bodyDef.angularDamping = 1;

        if(entity.angle){
            bodyDef.angle = Math.PI*entity.angle/180;
        }

        var fixtureDef = new b2FixtureDef;

        fixtureDef.density = definition.density;
        fixtureDef.friction = definition.friction;
        fixtureDef.restitution = definition.restitution;

        fixtureDef.shape = new b2CircleShape(entity.radius/box2d.scale);

        var body = box2d.world.CreateBody(bodyDef);
        body.SetUserData(entity);

        var fixture = body.CreateFixture(fixtureDef);
        return body; 
    },
    step:function(timeStep){
        //速度迭代数 = 8
        //位置迭代数 = 3
        if(timeStep > 2/60){
            timeStep = 2/60;
        }

        box2d.world.Step(timeStep,8,3);
    }
}

window.addEventListener("load", function() {
    game.resize();
    game.init();
});
window.addEventListener("resize", function() {
    game.resize();
});
//明确声明为不是被动的
document.addEventListener("touchmove", function(ev) {
    ev.preventDefault();
},{ passive: false });