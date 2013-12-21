var stage = null;
var world = null;

var grpGame = null;
var lyrMapT = null;
var lyrMapB = null;
var lyrChars = null;
var lyrProjs = null;
var lyrNames = null;
var lyrDebug = null;

var packetHist = new BucketStats(1000, 60);
var fpsHist = new BucketStats(1000, 60);


var oPlayers = [];
var mProjs = [];

var maxHealth = 100;
var maxAmmo = 30;


createjs.Sound.registerSound("tank-firing.mp3", "tankFiring");
createjs.Sound.registerSound("explosion.mp3", "explosion");




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







function addProjectile(opts) {
  var proj = new Projectile(world, opts, ProjectileVis);
  mProjs.push(proj);

  soundMgr.play({
    name: 'tankFiring',
    x: opts.x,
    y: opts.y
  })

  return proj;
}

function boomProjectile(proj) {
  var projPosition = proj.getPosition();

  triggerHit(projPosition.x, projPosition.y);

  removeProjectile(proj);
}

function removeProjectile(proj) {
  proj.remove();

  var projIdx = mProjs.indexOf(proj);
  if (projIdx >= 0) {
    mProjs.splice(projIdx, 1);
  }
}



function fireProjectile() {
  if (myChar.ammo <= 0) {
    return;
  }
  myChar.ammo--;

  var fireInfo = myChar.getFireInfo();
  addProjectile(fireInfo);

  primus.nemit('fire', {
    x: fireInfo.x,
    y: fireInfo.y,
    angle: fireInfo.angle
  });
}

function start() {
  setup();

  primus.non('phys/debugDraw', function(args) {
    netDrawer.draw(args);
  });

  primus.non('addplayer', function(args) {
    var tank = new Tank(world, args, TankVis);
    oPlayers.push(tank);
  });

  primus.non('delplayer', function(args) {
    for (var i = 0; i < oPlayers.length; ++i) {
      if (oPlayers[i].uuid === args.uuid) {
        var obj = oPlayers.splice(i, 1);
        obj[0].remove();
        break;
      }
    }
  });

  primus.non('health', function(args) {
    for (var i = 0; i < oPlayers.length; ++i) {
      if (oPlayers[i].uuid == args.uuid) {
        var obj = oPlayers[i];
        obj.setHealth(args.health);
        break;
      }
    }
  });

  primus.non('move', function(args) {
    for (var i = 0; i < oPlayers.length; ++i) {
      if (oPlayers[i].uuid == args.uuid) {
        var obj = oPlayers[i];

        if (args.pos !== undefined) {
          obj.setDRPosition(args.pos.x, args.pos.y);
        }
        if (args.moveVel !== undefined) {
          obj.setMoveVel(args.moveVel);
        }
        if (args.angle !== undefined) {
          obj.setDRAngle(args.angle);
        }
        if (args.turnVel !== undefined) {
          obj.setTurnVel(args.turnVel);
        }
        if (args.tangle !== undefined) {
          obj.setTAngleTarget(args.tangle);
        }
        break;
      }
    }
  });

  primus.non('fire', function(args) {
    addProjectile(args);
  });

  var myPosition = myChar.getPosition();
  primus.nemit('join', {
    name: myChar.name,
    x: myPosition.x,
    y: myPosition.y,
    color: myChar.color
  });

  oPlayers = [];
}

var lastUpdate = {
  pos: {x: 0, y: 0},
  moveVel: 0,
  turnVel: 0,
  angle: 0,
  tangle: 0
};
var lastUpd = (new Date()).getTime();
function netUpdate() {
  var curTime = (new Date()).getTime();
  if (curTime - lastUpd < 100) {
    return;
  }
  lastUpd = curTime;

  var newUpdate = {};
  var sendUpd = false;

  var myPos = myChar.getPosition();
  if (true) {// if (Math.abs(lastUpdate.pos.x-myPos.x) >= 0.1 || Math.abs(lastUpdate.pos.y-myPos.y) >= 0.1) {
    newUpdate.pos = myPos;
    lastUpdate.pos = newUpdate.pos;
    sendUpd = true;
  }

  var myMoveVel = myChar.getMoveVel();
  if (true) {// if (Math.abs(lastUpdate.moveVel-myMoveVel) >= 0.1) {
    newUpdate.moveVel = myMoveVel;
    lastUpdate.moveVel = newUpdate.moveVel;
    sendUpd = true;
  }

  var myAngle = myChar.getAngle();
  if (true) {// if (Math.abs(lastUpdate.angle-myAngle) >= 0.1) {
    newUpdate.angle = myAngle;
    lastUpdate.angle = newUpdate.angle;
    sendUpd = true;
  }

  var myTurnVel = myChar.getTurnVel();
  if (true) {// if (Math.abs(lastUpdate.turnVel-myTurnVel) >= 0.1) {
    newUpdate.turnVel = myTurnVel;
    lastUpdate.turnVel = newUpdate.turnVel;
    sendUpd = true;
  }

  var myTAngle = myChar.getTAngleTarget();
  if (true) {// if (Math.abs(lastUpdate.tangle-myTAngle) >= 0.1) {
    newUpdate.tangle = myTAngle;
    lastUpdate.tangle = newUpdate.tangle;
    sendUpd = true;
  }

  if (sendUpd) {
    primus.nemit('move', newUpdate);
  }
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

var data = {
  images: ["explosion_strip10.png"],
  framerate: 7,
  frames: {width:58, height:56},
  animations: {
    boom:[0,9]
  }
};
var spriteSheet = new createjs.SpriteSheet(data);

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


function triggerHit(x, y) {
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

function tickChars(dt) {
  myChar.update(dt);
  for (var i = 0; i < oPlayers.length; ++i) {
    oPlayers[i].update(dt);
  }
}

function tickProjs(dt) {
  for (var i = 0; i < mProjs.length; ++i) {
    mProjs[i].update(dt);
  }
}

var netRenderer = null;
function setupWorld() {
  world = Physics({
    timestep: 1000 / 200
  });

  netRenderer = Physics.renderer('netrender');
  world.add( netRenderer );

  //world.add( Physics.renderer('easlejs', {stage:grpGame}) );
  world.add( Physics.behavior('custom-collisions') );
  world.add( Physics.behavior('sweep-prune') );
  world.add( Physics.behavior('custom-responder') );

  var borderLeft = Physics.body('convex-polygon', {
    // place the center of the square at (0, 0)
    x: -viewBorder/2,
    y: mapHeight/2,
    fixed: true,
    vertices: [
      {x:-viewBorder, y:-viewBorder},
      {x:0, y: 0},
      {x:0, y: mapHeight},
      {x:-viewBorder, y: mapHeight+viewBorder}
    ]
  });
  world.add(borderLeft);

  var borderRight = Physics.body('convex-polygon', {
    // place the center of the square at (0, 0)
    x: mapWidth+viewBorder/2,
    y: mapHeight/2,
    fixed: true,
    vertices: [
      {x:viewBorder, y: -viewBorder},
      {x:0, y:0},
      {x:0, y: mapHeight},
      {x:viewBorder, y: mapHeight+viewBorder}
    ]
  });
  world.add(borderRight);

  var borderTop = Physics.body('convex-polygon', {
    // place the center of the square at (0, 0)
    x: mapWidth/2,
    y: -viewBorder/2,
    fixed: true,
    vertices: [
      {x:-viewBorder, y:-viewBorder},
      {x:mapWidth+viewBorder, y: -viewBorder},
      {x:mapWidth, y: 0},
      {x:0, y: 0}
    ]
  });
  world.add(borderTop);

  var borderTop = Physics.body('convex-polygon', {
    // place the center of the square at (0, 0)
    x: mapWidth/2,
    y: mapHeight+viewBorder/2,
    fixed: true,
    vertices: [
      {x:-viewBorder, y:mapHeight+viewBorder},
      {x:mapWidth+viewBorder, y: mapHeight+viewBorder},
      {x:mapWidth, y: mapHeight},
      {x:0, y: mapHeight}
    ]
  });
  world.add(borderTop);
}

var mapHeight = 3000;
var mapWidth = 3000;
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

var localDrawer = new NetRenderDrawer({
  fillColor: 'rgba(255,255,0,0.1)',
  strokeColor: 'rgba(255,255,0,0.3)'
});
var netDrawer = new NetRenderDrawer({
  fillColor: 'rgba(0,0,255,0.1)',
  strokeColor: 'rgba(0,0,255,0.3)'
});

function tick(e) {
  fpsHist.log(1);

  tickInput(e.delta);

  tickChars(e.delta);
  tickProjs(e.delta);

  world.step(e.time);

  netbpsGraph.update();
  netppsGraph.update();
  fpsGraph.update();

  netUpdate();
  if (world.renderer()) {
    world.render();

    var drawData = netRenderer.flush();
    localDrawer.draw(drawData);
  }
  stage.update();

  var myPosition = myChar.getPosition();
  soundMgr.setPosition(myPosition.x, myPosition.y);

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

  lyrMapB = new createjs.Container();
  lyrChars = new createjs.Container();
  lyrProjs = new createjs.Container();
  lyrMapT = new createjs.Container();
  lyrNames = new createjs.Container();
  lyrDebug = new createjs.Container();

  grpGame.addChild(lyrMapB);
  grpGame.addChild(lyrChars);
  grpGame.addChild(lyrProjs);
  grpGame.addChild(lyrMapT);
  grpGame.addChild(lyrNames);
  grpGame.addChild(lyrDebug);

  var graphX = viewportW - 10 - 300;
  var graphY = viewportH + 10 - (60+10)*3;
  netbpsGraph = new BucketStatsGraph(stage, packetHist, 'line', 'total',
      'Network I/O (bytes/sec)', graphX, graphY+(60+4)*0, 300, 60, 250);
  netppsGraph = new BucketStatsGraph(stage, packetHist, 'bar', 'count',
      'Network I/O (packets/sec)', graphX, graphY+(60+4)*1, 300, 60, 5);
  fpsGraph = new BucketStatsGraph(stage, fpsHist, 'line', 'total',
    'FPS', graphX, graphY+(60+4)*2, 300, 60, 20);

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

  myChar = new Tank(world, myCharOpts, TankVis);

  createjs.Ticker.addEventListener("tick", tick);
  createjs.Ticker.setFPS(30);
}

$(document).ready(function() {
  stage = new createjs.Stage("game");
  startConn();
});
