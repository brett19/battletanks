define([
  '../../common/physics',
  '../../common/gameworld',
  '../bucketstats',
  '../connmanager',
  '../netrenderdrawer',
  '../debugdrawer',
  '../bucketstatsgraph',
  '../soundmanager',
  'jquery',
  'createjs'
], function(
  Physics,
  GameWorld,
  BucketStats,
  startConn
){
  var primus = null;
  var stage = null;
  var world = null;

  var grpGame = null;
  var lyrMapT = null;
  var lyrMapB = null;
  var lyrChars = null;
  var lyrProjs = null;
  var lyrItems = null;
  var lyrPlanes = null;
  var lyrChutes = null;
  var lyrNames = null;
  var lyrDebug = null;
  var lyrDebugX = null;

  var packetHist = new BucketStats(1000, 60);
  var fpsHist = new BucketStats(1000, 60);

  var maxHealth = 100;
  var maxAmmo = 30;

  createjs.Sound.registerSound("tank-firing.mp3", "tankFiring");
  createjs.Sound.registerSound("explosion.mp3", "explosion");
  createjs.Sound.registerSound("plane_engine.mp3", "planeengine");

  createjs.Sound.setVolume(0.10);

  var data = {
    images: ["explosion_strip10.png"],
    framerate: 27,
    frames: {width:58, height:56},
    animations: {
      boom:[0,9]
    }
  };
  var spriteSheet = new createjs.SpriteSheet(data);

  var dataCP = {
    images: ["cratePop.png"],
    framerate: 18,
    frames: {width:230, height:203},
    animations: {
      boom:[0,7]
    }
  };
  var cratePopSheet = new createjs.SpriteSheet(dataCP);

  var dataChute = {
    images: ["chute.png"],
    framerate: 10,
    frames: {width:52, height:56},
    animations: {
      boom:[0,5]
    }
  };
  var chuteSheet = new createjs.SpriteSheet(dataChute);

  function TankVis(obj, opts) {
    this.obj = obj;
    this.name = opts.name;

    this.holder = new createjs.Container();
    lyrChars.addChild(this.holder);

    this.shell = new createjs.Bitmap('tank2b.png');
    this.shell.regX = 24;
    this.shell.regY = 20;
    this.holder.addChild(this.shell);

    this.turret = new createjs.Bitmap('tank2c.png');
    this.turret.regX = 9;
    this.turret.regY = 7;
    this.turret.x = 11;
    this.turret.y = 0;
    this.holder.addChild(this.turret);

    this.namePlate = new createjs.Container();
    lyrNames.addChild(this.namePlate);

    var text = new createjs.Text(opts.name, "10px Verdana", "#ffffff");
    text.x = 0;
    text.y = -56;
    text.textAlign = 'center';
    this.namePlate.addChild(text);

    var bar = new createjs.Shape();
    bar.x = 0;
    bar.y = -42;
    this.namePlate.addChild(bar);
    this.healthBar = bar;

    this.update();
  }

  TankVis.prototype.remove = function() {
    lyrChars.removeChild(this.holder);
    lyrNames.removeChild(this.namePlate);
  };

  TankVis.prototype.update = function() {
    var objPosition = this.obj.getPosition();
    this.holder.x = objPosition.x;
    this.holder.y = objPosition.y;
    this.holder.rotation = this.obj.getAngle();
    this.turret.rotation = this.obj.getTAngle();

    this.namePlate.x = objPosition.x;
    this.namePlate.y = objPosition.y;

    var barGfx = this.healthBar.graphics;
    var healthWidth = this.obj.getHealth() / 100 * 50;
    barGfx.clear();
    barGfx.beginFill('rgba(255,100,100,1)');
    barGfx.drawRect(-25, 0, healthWidth, 7);
    barGfx.endFill();
    barGfx.beginStroke("rgba(255,0,0,1)");
    barGfx.drawRect(-25, 0, 50, 7);
    barGfx.endStroke();
  };


  function ProjectileVis(obj, opts) {
    this.obj = obj;

    this.img = new createjs.Bitmap('attack.png');
    this.img.regX = 8;
    this.img.regY = 2;
    lyrProjs.addChild(this.img);
  }

  ProjectileVis.prototype.remove = function() {
    lyrProjs.removeChild(this.img);
  };

  ProjectileVis.prototype.update = function() {
    var objPosition = this.obj.getPosition();
    this.img.x = objPosition.x;
    this.img.y = objPosition.y;
    this.img.rotation = this.obj.getAngle();
  };



  function CrateVis(obj, opts) {
    this.obj = obj;

    var objPos = this.obj.getPosition();

    this.img = new createjs.Bitmap('crate.png');
    this.img.regX = 17;
    this.img.regY = 16;
    this.img.x = objPos.x;
    this.img.y = objPos.y;
    lyrItems.addChild(this.img);

    if (opts.isDrop) {
      var self = this;

      //this.img.visible = false;

      this.dropImg = new createjs.Sprite(chuteSheet, "boom");
      this.dropImg.regX = 23;
      this.dropImg.regY = 24;
      this.dropImg.x = objPos.x;
      this.dropImg.y = objPos.y;
      this.dropImg.on('animationend', function() {
        lyrChutes.removeChild(self.dropImg);
        self.dropImg = null;
        self.img.visible = true;
      });
      lyrChutes.addChild(this.dropImg);
    }
  }

  CrateVis.prototype.remove = function() {
    lyrItems.removeChild(this.img);
    if (this.dropImg) {
      lyrChutes.removeChild(this.dropImg);
    }
  };

  CrateVis.prototype.update = function() {

  };


  function DropPlaneVis(obj, opts) {
    this.obj = obj;

    this.img = new createjs.Bitmap('enemy_plane_4.png');
    this.img.regX = 97;
    this.img.regY = 71;
    lyrPlanes.addChild(this.img);

    var angleRad = obj.getAngle() / (180/Math.PI);
    var objPos = this.obj.getPosition();
    this.sound = soundMgr.play({
      name: 'planeengine',
      volume: 1.0,
      loop: true,
      x: objPos.x,
      y: objPos.y,
      vx: Math.cos(angleRad),
      vy: Math.sin(angleRad),
      f: 170
    });
  }

  DropPlaneVis.prototype.remove = function() {
    lyrPlanes.removeChild(this.img);
    soundMgr.removeSound(this.sound);
  };

  DropPlaneVis.prototype.update = function() {
    var objPos = this.obj.getPosition();
    this.img.x = objPos.x;
    this.img.y = objPos.y;
    this.img.rotation = this.obj.getAngle();

    this.sound.x = objPos.x;
    this.sound.y = objPos.y;
  };






  function fireProjectile() {
    if (myChar.ammo <= 0) {
      return;
    }
    myChar.ammo--;

    var fireInfo = myChar.getFireInfo();
    gameWorld.createProjectile(fireInfo, ProjectileVis);

    primus.nemit('fire', {
      x: fireInfo.x,
      y: fireInfo.y,
      angle: fireInfo.angle
    });
  }

  function start() {

    var myPosition = myChar.getPosition();
    primus.nemit('join', {
      name: myChar.name,
      x: myPosition.x,
      y: myPosition.y,
      color: myChar.color
    });
  }

  var lastUpd = (new Date()).getTime();
  function netUpdate() {
    var curTime = (new Date()).getTime();
    if (curTime - lastUpd < 100) {
      return;
    }
    lastUpd = curTime;

    var newUpdate = myChar.getNetInfo();
    primus.nemit('move', newUpdate);
  }


  var myKeys = {};
  var myMouse = {x:0, y:0};

  var KEY_W = 87;
  var KEY_S = 83;
  var KEY_A = 65;
  var KEY_D = 68;

  var KEY_UP = 38
  var KEY_DOWN = 40
  var KEY_LEFT = 37
  var KEY_RIGHT = 39

  function tickInput(dt) {
    if (myKeys[KEY_LEFT] && !myKeys[KEY_RIGHT]) {
      myChar.setTurnDir(-1);//turnMag);
    } else if (myKeys[KEY_RIGHT] && !myKeys[KEY_LEFT]) {
      myChar.setTurnDir(+1);//turnMag);
    } else {
      myChar.setTurnDir(0);
    }

    if (myKeys[KEY_UP]) {
      myChar.setMoveDir(+1);
    } else if (myKeys[KEY_DOWN]) {
      myChar.setMoveDir(-1);
    } else {
      myChar.setMoveDir(0);
    }

    var localMouse = grpGame.globalToLocal(myMouse.x, myMouse.y);
    var charPos = myChar.getPosition();
    var charAngle = myChar.getAngle();

    var mouseAngle = Math.atan2(localMouse.y-charPos.y, localMouse.x-charPos.x) * (180/Math.PI);
    myChar.setTAngleTarget(mouseAngle - charAngle);
  }

  function checkDamage(x, y, info) {
    var startRange = 20*20;
    var endRange = 55*55;

    var infoPos = info.getPosition();

    var dX = Math.abs(x - infoPos.x);
    var dY = Math.abs(y - infoPos.y);
    var distSq = dX*dX + dY*dY;

    if (distSq >= endRange) {
      return;
    }

    var damageMag = (distSq - startRange) / (endRange - startRange);
    myChar.health -= damageMag * 20;
    if (myChar.health < 0) {
      myChar.health = 0;
    }

    primus.nemit('health', {
      health: myChar.health
    });
  }

  function explodeCrate(x, y) {
    var animx = new createjs.Sprite(cratePopSheet, "boom");
    animx.regX = 119;
    animx.regY = 96;
    animx.x = x;
    animx.y = y;
    animx.on('animationend', function() {
      lyrItems.removeChild(animx);
    });
    lyrItems.addChild(animx);
  }

  function explodeProjectile(x, y) {
    checkDamage(x, y, myChar);

    var anim = new createjs.Sprite(spriteSheet, "boom");
    anim.regX = 58 / 2;
    anim.regY = 56 / 2;
    anim.x = x;
    anim.y = y;
    anim.on('animationend', function() {
      lyrProjs.removeChild(anim);
    });
    lyrProjs.addChild(anim);

    soundMgr.play({
      name: 'explosion',
      x: x,
      y: y
    });
  }

  var gameWorld = null;
  var netRenderer = null;
  function setupWorld() {
    gameWorld = new GameWorld({});

    world = gameWorld.physWorld;

    gameWorld.on('projectile:explode', explodeProjectile);
    gameWorld.on('crate:explode', explodeCrate);

    netRenderer = Physics.renderer('netrender');
    world.add( netRenderer );
  }

  var viewportW = 1200;
  var viewportH = 600;
  var viewBorder = 40;

  function adjustViewport() {
    var tankPos = myChar.getPosition();
    var tankV = grpGame.localToGlobal(tankPos.x, tankPos.y);

    var scrollX = viewportW / 3;
    var scrollY = viewportH / 3;

    if (tankV.x < scrollX) {
      grpGame.x += scrollX - tankV.x;
    }
    if (tankV.y < scrollY) {
      grpGame.y += scrollY - tankV.y;
    }
    if (tankV.x >= viewportW-scrollX) {
      grpGame.x += (viewportW-scrollX) - tankV.x;
    }
    if (tankV.y >= viewportH-scrollY) {
      grpGame.y += (viewportH-scrollY) - tankV.y;
    }

    if (grpGame.x > viewBorder) {
      grpGame.x = viewBorder;
    }
    if (grpGame.y > viewBorder) {
      grpGame.y = viewBorder;
    }
    if (grpGame.x < -3000 + viewportW - viewBorder) {
      grpGame.x = -3000 + viewportW - viewBorder;
    }
    if (grpGame.y < -3000 + viewportH - viewBorder) {
      grpGame.y = -3000 + viewportH - viewBorder;
    }
  }

  var myChar = null;
  var netbpsGraph = null;
  var netppsGraph = null;
  var fpsGraph = null;

  var localDrawer = null;
  var netDrawer = null;
  var objDrawer = null;
  var sndDrawer = null;


  function drawDebugs() {
    netbpsGraph.update();
    netppsGraph.update();
    fpsGraph.update();

    localDrawer.draw(netRenderer.flush());

    var sndObjs = [];
    for (var i = 0; i < soundMgr.sounds.length; ++i) {
      var sound = soundMgr.sounds[i];
      sndObjs.push({x:sound.x, y:sound.y});
    }
    var lstObjs = [];
    lstObjs.push({x:soundMgr.listenerPos.x, y:soundMgr.listenerPos.y});
    sndDrawer.draw(sndObjs, lstObjs);
  }

  function tick(e) {
    fpsHist.log(1);

    tickInput(e.delta);

    gameWorld.step(e.time);

    netUpdate();
    if (world.renderer()) {
      world.render();
    }
    stage.update(e);

    var myPosition = myChar.getPosition();
    soundMgr.setPosition(myPosition.x, myPosition.y);

    drawDebugs();

    adjustViewport();

    if (myChar.health !== lastHealth) {
      var healthPer = myChar.health / maxHealth * 100;
      $('#health > div').css('width', healthPer + '%');
      $('#health > div').text(Math.ceil(myChar.health) + ' / ' + maxHealth);
      lastHealth = myChar.health;
    }

    if (myChar.ammo !== lastAmmo) {
      var ammoPer = myChar.ammo / maxAmmo * 100;
      $('#ammo > div').css('width', ammoPer + '%');
      $('#ammo > div').text(myChar.ammo + ' / ' + maxAmmo);
      lastAmmo = myChar.ammo;
    }
  }

  var lastHealth = -1;
  var lastAmmo = -1;

  function translateKey(k) {
    if (k === KEY_A) {
      return KEY_LEFT;
    } else if (k === KEY_D) {
      return KEY_RIGHT;
    } else if (k === KEY_W) {
      return KEY_UP;
    } else if (k === KEY_S) {
      return KEY_DOWN;
    } else {
      return k;
    }
  }

  var captureKeys = [KEY_W,KEY_A,KEY_S,KEY_D,KEY_UP,KEY_LEFT,KEY_DOWN,KEY_RIGHT];
  function setup() {
    $(document).mousemove(function(e) {
      var offset = $('#game').offset();
      myMouse.x = e.pageX - offset.left;
      myMouse.y = e.pageY - offset.top;
      e.preventDefault();
    });
    $(document).keydown(function(e) {
      myKeys[translateKey(e.which)] = true;
      if (captureKeys.indexOf(e.which) >= 0) {
        e.preventDefault();
      }
    });
    $(document).keyup(function(e) {
      myKeys[translateKey(e.which)] = false;
      if (captureKeys.indexOf(e.which) >= 0) {
        e.preventDefault();
      }
    });
    $(document).mousedown(function(e) {
      var offset = $('#game').offset();
      var fireX = e.pageX - offset.left;
      var fireY = e.pageY - offset.top;
      fireProjectile(fireX, fireY);
      e.preventDefault();
    });

    grpGame = new createjs.Container();
    stage.addChild(grpGame);

    grpGame.scaleX = 0.5;
    grpGame.scaleY = 0.5;

    lyrMapB = new createjs.Container();
    lyrItems = new createjs.Container();
    lyrChars = new createjs.Container();
    lyrProjs = new createjs.Container();
    lyrMapT = new createjs.Container();
    lyrChutes = new createjs.Container();
    lyrPlanes = new createjs.Container();
    lyrNames = new createjs.Container();
    lyrDebug = new createjs.Container();
    lyrDebugX = new createjs.Container();

    grpGame.addChild(lyrMapB);
    grpGame.addChild(lyrItems);
    grpGame.addChild(lyrChars);
    grpGame.addChild(lyrProjs);
    grpGame.addChild(lyrMapT);
    grpGame.addChild(lyrChutes);
    grpGame.addChild(lyrPlanes);
    grpGame.addChild(lyrNames);
    grpGame.addChild(lyrDebug);
    grpGame.addChild(lyrDebugX);

    var graphX = viewportW - 10 - 300;
    var graphY = viewportH + 10 - (60+10)*3;
    netbpsGraph = new BucketStatsGraph(stage, packetHist, 'line', 'total',
      'Network I/O (bytes/sec)', graphX, graphY+(60+4)*0, 300, 60, 250);
    netppsGraph = new BucketStatsGraph(stage, packetHist, 'bar', 'count',
      'Network I/O (packets/sec)', graphX, graphY+(60+4)*1, 300, 60, 5);
    fpsGraph = new BucketStatsGraph(stage, fpsHist, 'line', 'total',
      'FPS', graphX, graphY+(60+4)*2, 300, 60, 20);

    localDrawer = new NetRenderDrawer({
      layer: lyrDebug,
      fillColor: 'rgba(0,255,255,0.1)',
      strokeColor: 'rgba(0,255,255,0.3)'
    });
    netDrawer = new NetRenderDrawer({
      layer: lyrDebug,
      fillColor: 'rgba(0,0,255,0.1)',
      strokeColor: 'rgba(0,0,255,0.3)'
    });

    objDrawer = new DebugDrawer({
      layer: lyrDebugX,
      fillColor: 'rgba(255,0,0,0.4)',
      strokeColor: 'rgba(255,0,0,0.6)',
      radius: 8
    });
    sndDrawer = new DebugDrawer({
      layer: lyrDebugX,
      fillColor: 'rgba(0,0,255,0.4)',
      strokeColor: 'rgba(0,0,255,0.6)',
      radius: 4
    });

    var mapT = new createjs.Bitmap('mapTop.png');
    lyrMapT.addChild(mapT);

    var mapB = new createjs.Bitmap('mapBottom.png');
    lyrMapB.addChild(mapB);

    setupWorld();

    var userName = window.location.hash.substr(1);
    var myCharOpts = {
      name: userName,
      x: parseInt(Math.random() * 400 + 100),
      y: parseInt(Math.random() * 400 + 100),
      angle: 0,
      tangle: 0
    };

    myChar = gameWorld.createTank(myCharOpts, TankVis);

    createjs.Ticker.addEventListener("tick", tick);
    createjs.Ticker.setFPS(30);
  }

  $(document).ready(function() {
    stage = new createjs.Stage("game");
    viewportW = stage.canvas.width;
    viewportH = stage.canvas.height;

    setup();

    primus = startConn(start);

    primus.non('phys/debugDraw', function(args) {
      netDrawer.draw(args);
    });
    primus.non('world/debugDraw', function(args) {
      objDrawer.draw(args);
    });

    primus.non('addtank', function(args) {
      gameWorld.createTank(args, TankVis);
    });

    primus.non('deltank', function(args) {
      var tank = gameWorld.getByOid(args.oid);
      console.log(args, tank);
      if (tank) {
        gameWorld.removeObject(tank);
      }
    });

    primus.non('addproj', function(args) {
      gameWorld.createProjectile(args, ProjectileVis);
    });

    primus.non('dropcrate', function(args) {
      args.isDrop = true;
      gameWorld.createCrate(args, CrateVis);
    });

    primus.non('addcrate', function(args) {
      gameWorld.createCrate(args, CrateVis);
    });

    primus.non('delcrate', function(args) {

    });

    primus.non('addplane', function(args) {
      gameWorld.createDropPlane(args, DropPlaneVis);
    });

    primus.non('health', function(args) {
      var tank = gameWorld.getByOid(args.oid);
      if (tank) {
        tank.setHealth(args.health);
      }
    });

    primus.non('move', function(args) {
      var tank = gameWorld.getByOid(args.oid);
      if (tank) {
        tank.updateByNetInfo(args, false);
      }
    });
  });


  return {
    run: function() {
      //start();
    }
  };
});