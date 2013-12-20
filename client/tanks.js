function timestamp() {
  var curdate = new Date();
  return curdate.getHours() + ':' + curdate.getMinutes() +
    ':' + curdate.getSeconds();
}

function log() {
  var entry = '<li>';
  entry += '[' + timestamp() + '] ';
  for (var i = 0; i < arguments.length; ++i) {
    if (i > 0) entry += ' ';

    if (arguments[i] === null) {
      entry += 'null';
    } else if (arguments[i] === undefined) {
      entry += 'undefined';
    } else if (arguments[i] instanceof Object) {
      entry += JSON.stringify(arguments[i], null, 1);
    } else {
      entry += arguments[i];
    }
  }
  entry += '</li>';
  $('#logs').prepend(entry);
}

var primus = null;
function startConn() {
  primus = Primus.connect('/', { });
  primus.cmd = function(cmd, args) {
    var obj = [cmd, args];
    if (packetHist) {
      var jsonObj = JSON.stringify(obj);
      packetHist.log(40 + jsonObj.length);
    }
    this.write(obj);
  }

  primus.on('open', function open() {
    log('connected');
    start();
  });
  primus.on('data', function(data) {
    if (packetHist) {
      var jsonObj = JSON.stringify(data);
      packetHist.log(40 + jsonObj.length);
    }

    handleCmd(data[0], data[1]);
  });
  primus.on('error', function error(err) {
    log('error : ', err);
  });
  primus.on('end', function error() {
    log('disconnected');
  });
}


function BucketStats(interval, bucketCount) {
  this.interval = interval;
  this.bucketCount = bucketCount;
  this.buckets = [];
  this.start = Math.floor(this.curTime() / this.interval) * this.interval;
}
BucketStats.prototype.curTime = function() {
  return (new Date()).getTime();
};
BucketStats.prototype.curBucket = function() {
  var bucketNum = Math.floor((this.curTime() - this.start) / this.interval);
  while (bucketNum >= this.bucketCount) {
    var oldBucket = this.buckets.shift();
    oldBucket.value = 0;
    oldBucket.count = 0;
    this.buckets.push(oldBucket);
    this.start += this.interval;
    bucketNum--;
  }
  while (bucketNum >= this.buckets.length) {
    this.buckets.push({
      value: 0,
      count: 0
    });
  }
  return this.buckets[bucketNum];
};
BucketStats.prototype.log = function(value) {
  var bucket = this.curBucket();
  bucket.value += value;
  bucket.count++;
};

function BucketStatsGraph(stats, type, mode, name, x, y, w, h, tick) {
  this.stats = stats;

  this.width = w;
  this.height = h;
  this.type = type;
  if (mode === 'average') {
    this.bucketFn = function(b) {
      return b.value / b.count;
    }
  } else if (mode === 'total') {
    this.bucketFn = function(b) {
      return b.value;
    }
  } else if (mode === 'count') {
    this.bucketFn = function(b) {
      return b.count;
    }
  } else {
    throw new Error('Invalid Mode : ' + mode);
  }

  this.maxValue = 10;
  this.tick = tick;
  this.divLines = 4;

  this.holder = new createjs.Container();
  this.holder.x = x;
  this.holder.y = y;
  stage.addChild(this.holder);

  this.graph = new createjs.Shape();
  this.graph.x = 0;
  this.graph.y = 0;
  this.holder.addChild(this.graph);

  this.title = new createjs.Text(name, "11px Verdana", "#ffffff");
  this.title.x = this.width - 3;
  this.title.y = this.height - 3;
  this.title.textAlign = 'right';
  this.title.textBaseline = 'bottom';
  this.holder.addChild(this.title);

  this.maxTxt = new createjs.Text('', "9px Verdana", "#ffffff");
  this.maxTxt.x = 3;
  this.maxTxt.y = 2;
  this.maxTxt.textAlign = 'left';
  this.maxTxt.textBaseline = 'top';
  this.holder.addChild(this.maxTxt);

  this.minTxt = new createjs.Text('', "9px Verdana", "#ffffff");
  this.minTxt.x = 3;
  this.minTxt.y = this.height - 3;
  this.minTxt.textAlign = 'left';
  this.minTxt.textBaseline = 'bottom';
  this.holder.addChild(this.minTxt);
}

BucketStatsGraph.prototype.update = function() {
  // Force bucket update
  this.stats.curBucket();

  // Calculate new maximums
  for (var i = 0; i < this.stats.buckets.length; ++i) {
    var val = this.bucketFn(this.stats.buckets[i]);
    if (val > this.maxValue) {
      this.maxValue = val;
    }
  }
  this.maxValue = Math.ceil(this.maxValue / this.tick) * this.tick;

  // Update Labels
  this.minTxt.text = 0;
  this.maxTxt.text = this.maxValue;

  // Draw Graph
  var gfx = this.graph.graphics;
  var valMag = 1 / this.maxValue * this.height;

  gfx.clear();
  gfx.beginStroke('rgba(0,0,255,0.8)');
  gfx.beginFill('rgba(0,0,255,0.1');
  gfx.drawRect(0, 0, this.width, this.height);
  gfx.endFill();
  gfx.endStroke();

  gfx.beginStroke('rgba(0,0,255,0.4)');
  for (var i = 1; i < this.divLines; ++i) {
    gfx.moveTo(0, this.height/this.divLines*i);
    gfx.lineTo(this.width, this.height/this.divLines*i);
  }
  gfx.endStroke();

  if (this.type === 'bar') {
    var barWidth = this.width / (this.stats.bucketCount - 1);

    gfx.beginStroke('rgba(0,0,255,0.6)');
    gfx.beginFill('rgba(0,0,255,0.4)');
    gfx.moveTo(this.width, this.height);
    for (var i = 1; i < this.stats.buckets.length; ++i) {
      var bucketIdx = this.stats.buckets.length - 1 - i;
      var barIdx = this.stats.bucketCount - 1 - i;
      var bucket = this.stats.buckets[bucketIdx];
      var val = this.bucketFn(bucket);

      gfx.lineTo((barIdx+1) * barWidth, this.height - (val * valMag));
      gfx.lineTo((barIdx+0) * barWidth, this.height - (val * valMag));
      gfx.lineTo((barIdx+0) * barWidth, this.height);
    }
    gfx.lineTo(0, this.height);
    gfx.lineTo(this.width, this.height);
    gfx.endFill();
    gfx.endStroke();
  } else {
    var gapWidth = this.width / (this.stats.bucketCount-2);

    gfx.beginStroke('rgba(0,0,255,0.9)');
    for (var i = 1; i < this.stats.buckets.length; ++i) {
      var bucketIdx = this.stats.buckets.length - 1 - i;
      var barIdx = this.stats.bucketCount - 1 - i;
      var bucket = this.stats.buckets[bucketIdx];
      var val = this.bucketFn(bucket);

      if (i === 0) {
        gfx.moveTo(this.width, this.height - (val * valMag));
      } else {
        gfx.lineTo(barIdx * gapWidth, this.height - (val * valMag));
      }
    }
    gfx.endStroke();
  }
};


var stage = null;
var world = null;

var grpGame = null;
var lyrMapT = null;
var lyrMapB = null;
var lyrChars = null;
var lyrProjs = null;
var lyrNames = null;

var packetHist = new BucketStats(1000, 60);
var fpsHist = new BucketStats(1000, 60);


var oPlayers = [];
var mProjs = [];

var maxHealth = 100;
var maxAmmo = 30;

var startInfo = window.location.hash.split('#');
var myChar = {
  name: startInfo[1],
  color: '#' + startInfo[2],
  x: parseInt(Math.random() * 400 + 30),
  y: parseInt(Math.random() * 400 + 30),
  angle: 0,
  tangle: 0,
  health: 100,
  ammo: 30
};


createjs.Sound.registerSound("tank-firing.mp3", "tankFiring");
createjs.Sound.registerSound("explosion.mp3", "explosion");



function GameWorld() {
  this.physWorld = null;
}



var turnMag = 0.2;
var speedMag = 0.2 * 2;
var tspeedClamp = 180;

function Tank(world, opts, VisClass) {
  this.physWorld = world;
  this.view = null;
  this.moveVel = 0;
  this.turnVel = 0;
  this.tangle = 0;
  this.tangleTarget = 0;

  this.drX = 0;
  this.drY = 0;
  this.drAngle = 0;

  var physBody = Physics.body('tankBody', {
    x: opts.x,
    y: opts.y,
    radius: 24,
    restitution: 0
  });
  this.physWorld.add(physBody);
  this.physBody = physBody;

  var physTurret = Physics.body('tankTurret', {
    fixed: true,
    vertices: [
      {x: 0, y: 0},
      {x: 42, y: 0},
      {x: 42, y: 8},
      {x: 0, y: 8}
    ]
  });
  this.physWorld.add(physTurret);
  this.physTurret = physTurret;

  if (VisClass) {
    this.view = new VisClass(this, opts);
  }

  this.update(0);
}

Tank.prototype.remove = function() {
  this.physWorld.remove(this.physTurret);
  this.physWorld.remove(this.physBody);

  if (this.view) {
    this.view.remove();
  }
}

Tank.prototype.update = function(dt) {
  var bodyState = this.physBody.state;

  // Apply Dead Reckoning
  var drm = 0.2;
  if (Math.abs(this.drX) >= 0.1 || Math.abs(this.drY) >= 0.1) {
    bodyState.pos.add(this.drX*drm, this.drY*drm);
    bodyState.old.pos.add(this.drX*drm, this.drY*drm);
    this.drX -= this.drX * drm;
    this.drY -= this.drY * drm;
  }
  if (Math.abs(this.drAngle) >= 0.1) {
    bodyState.angular.pos += this.drAngle * drm;
    bodyState.old.angular.pos += this.drAngle * drm;
    this.drAngle -= this.drAngle * drm;
  }

  if (dt > 0) {
    // Apply TAngle Velocity
    var scaledTSpeedClamp = tspeedClamp * (dt/1000);
    var tangleDelta = this.tangleTarget - this.tangle;
    while (tangleDelta >= 180) {
      tangleDelta -= 360;
    }
    while (tangleDelta < -180) {
      tangleDelta += 360;
    }
    if (tangleDelta < -scaledTSpeedClamp) {
      this.tangle -= scaledTSpeedClamp;
    } else if (tangleDelta > scaledTSpeedClamp) {
      this.tangle += scaledTSpeedClamp;
    } else {
      this.tangle += tangleDelta;
    }
  }

  if (this.turnVel) {
    bodyState.angular.vel = this.turnVel;
  } else {
    bodyState.angular.vel = 0;
  }

  if (this.moveVel) {
    var angleRad = bodyState.angular.pos * (Math.PI/180);
    bodyState.vel.set(
      Math.cos(angleRad)*this.moveVel,
      Math.sin(angleRad)*this.moveVel);
  } else {
    bodyState.vel.set(0, 0);
  }

  var bodyAngleRad = bodyState.angular.pos / (180/Math.PI);
  var turretAngleRad = bodyAngleRad + (this.tangle / (180/Math.PI));

  var tX = bodyState.pos.get(0);
  var tY = bodyState.pos.get(1);
  tX += Math.cos(bodyAngleRad) * 11;
  tY += Math.sin(bodyAngleRad) * 11;
  tX += Math.cos(turretAngleRad) * 26;
  tY += Math.sin(turretAngleRad) * 26;

  this.physTurret.state.pos.set(tX, tY);
  this.physTurret.state.angular.pos = bodyState.angular.pos + this.tangle;

  if (this.view) {
    this.view.update();
  }
};

Tank.prototype.getPosition = function() {
  var bodyState = this.physBody.state;
  return { x:bodyState.pos.get(0), y: bodyState.pos.get(1) };
};

Tank.prototype.getAngle = function() {
  var bodyState = this.physBody.state;
  return bodyState.angular.pos;
};

Tank.prototype.getTAngle = function() {
  return this.tangle;
};

Tank.prototype.getTurnVel = function() {
  return this.turnVel;
};
Tank.prototype.setTurnVel = function(val) {
  this.turnVel = val;
}

Tank.prototype.getMoveVel = function() {
  return this.moveVel;
};
Tank.prototype.setMoveVel = function(val) {
  this.moveVel = val;
};

Tank.prototype.getTAngleTarget = function() {
  return this.tangleTarget;
}
Tank.prototype.setTAngleTarget = function(val) {
  this.tangleTarget = val;
};

Tank.prototype.setTurnDir = function(val) {
  this.turnVel = val * turnMag;
};
Tank.prototype.setMoveDir = function(val) {
  this.moveVel = val * speedMag;
};

Tank.prototype.setDRPosition = function(x, y) {
  var bodyState = this.physBody.state;
  this.drX = x - bodyState.pos.get(0);
  this.drY = y - bodyState.pos.get(1);
};

Tank.prototype.setDRAngle = function(val) {
  var bodyState = this.physBody.state;
  this.drAngle = val - bodyState.angular.pos;
};

Tank.prototype.getFireInfo = function() {
  var bodyState = this.physBody.state;
  var bodyAngleRad = bodyState.angular.pos / (180/Math.PI);
  var turretAngleRad = bodyAngleRad + (this.tangle / (180/Math.PI));

  var tX = bodyState.pos.get(0);
  var tY = bodyState.pos.get(1);
  tX += Math.cos(bodyAngleRad) * 11;
  tY += Math.sin(bodyAngleRad) * 11;
  tX += Math.cos(turretAngleRad) * 52;
  tY += Math.sin(turretAngleRad) * 52;

  return {
    x: tX,
    y: tY,
    angle: bodyState.angular.pos + this.tangle
  };
};




function TankVis(obj, opts) {
  this.obj = obj;

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
  var barGfx = bar.graphics;
  barGfx.beginFill('rgba(255,100,100,1)');
  barGfx.drawRect(-25, 0, 50, 7);
  barGfx.endFill();
  barGfx.beginStroke("rgba(255,0,0,1)");
  barGfx.drawRect(-25, 0, 50, 7);
  barGfx.endStroke();
  this.namePlate.addChild(bar);

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
};





function createProj(obj) {
  var proj = new createjs.Bitmap('attack.png');
  proj.regX = 8;
  proj.regY = 2;

  lyrProjs.addChild(proj);
  obj.proj = proj;

  var phys = Physics.body('projectile', {
    x: obj.originX,
    y: obj.originY,
    angle: obj.angle * (180/Math.PI),
    radius: 4
  });
  phys.state.vel = Physics.vector(
    Math.cos(obj.angle) * 0.3,
    Math.sin(obj.angle) * 0.3
  );
  phys.obj = obj;
  obj.phys = phys;
  world.add(phys);

  obj.stime = (new Date()).getTime();

  updateProj(obj);

  createSound('tankFiring', obj.originX, obj.originY);
}

function updateProj(proj) {
  var projX = proj.phys.state.pos.get(0);
  var projY = proj.phys.state.pos.get(1);

  proj.proj.x = projX;
  proj.proj.y = projY;
  proj.proj.rotation = proj.phys.state.angular.pos;

  var curtime = (new Date()).getTime();
  if (curtime - proj.stime > 1500) {
    triggerHit(proj.proj.x, proj.proj.y);
    return false;
  }

  var clearDist = -40;
  if (projX < -clearDist || projY < -clearDist || projX >= 3000+clearDist || projY >= 3000+clearDist) {
    return false
  }
  return true;
}

function removeProj(obj, remove) {
  lyrProjs.removeChild(obj.proj);
  world.remove(obj.phys);

  if (remove) {
    var projIdx = mProjs.indexOf(obj);
    mProjs.splice(projIdx, 1);
  }
}

function fireToward() {
  if (myChar.ammo <= 0) {
    return;
  }

  var fireInfo = myChar.tobj.getFireInfo();

  var obj = {};
  obj.originX = fireInfo.x;
  obj.originY = fireInfo.y;
  obj.angle = fireInfo.angle / (180/Math.PI);

  createProj(obj);
  mProjs.push(obj);

  primus.cmd('fire', {
    originX: obj.originX,
    originY: obj.originY,
    angle: obj.angle
  });

  myChar.ammo--;
}

function start() {
  primus.cmd('join', {
    name: myChar.name,
    x: myChar.x,
    y: myChar.y,
    color: myChar.color
  });

  oPlayers = [];
}

var lastUpdate = {
  x: 0,
  y: 0,

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

  var myPos = myChar.tobj.getPosition();
  if (Math.abs(lastUpdate.x-myPos.x) >= 0.5 || Math.abs(lastUpdate.y-myPos.y) >= 0.5) {
    newUpdate.x = myPos.x;
    newUpdate.y = myPos.y;
    lastUpdate.x = myPos.x;
    lastUpdate.y = myPos.y;
    sendUpd = true;
  }

  var myMoveVel = myChar.tobj.getMoveVel();
  if (Math.abs(lastUpdate.moveVel-myMoveVel) >= 0.1) {
    newUpdate.moveVel = myMoveVel;
    lastUpdate.moveVel = myMoveVel;
    sendUpd = true;
  }

  var myAngle = myChar.tobj.getAngle();
  if (Math.abs(lastUpdate.angle-myAngle) >= 0.1) {
    newUpdate.angle = myAngle;
    lastUpdate.angle = myAngle;
    sendUpd = true;
  }

  var myTurnVel = myChar.tobj.getTurnVel();
  if (Math.abs(lastUpdate.turnVel-myTurnVel) >= 0.1) {
    newUpdate.turnVel = myTurnVel;
    lastUpdate.turnVel = myTurnVel;
    sendUpd = true;
  }

  var myTAngle = myChar.tobj.getTAngleTarget();
  if (Math.abs(lastUpdate.tangle-myTAngle) >= 0.01) {
    newUpdate.tangle = myTAngle;
    lastUpdate.tangle = myTAngle;
    sendUpd = true;
  }

  if (sendUpd) {
    primus.cmd('move', newUpdate);
  }
}

function handleCmd(cmd, data) {
  if (cmd === 'addplayer') {

    data.tobj = new Tank(world, data, TankVis);
    oPlayers.push(data);

  } else if (cmd === 'delplayer') {
    for (var i = 0; i < oPlayers.length; ++i) {
      if (oPlayers[i].uuid === data.uuid) {
        var obj = oPlayers.splice(i, 1);
        obj[0].tobj.remove();
        break;
      }
    }
  } else if (cmd === 'move') {
    for (var i = 0; i < oPlayers.length; ++i) {
      if (oPlayers[i].uuid == data.uuid) {
        var obj = oPlayers[i].tobj;

        if (data.x !== undefined && data.y !== undefined) {
          obj.setDRPosition(data.x, data.y);
        }
        if (data.moveVel !== undefined) {
          obj.setMoveVel(data.moveVel);
        }
        if (data.angle !== undefined) {
          obj.setDRAngle(data.angle);
        }
        if (data.turnVel !== undefined) {
          obj.setTurnVel(data.turnVel);
        }
        if (data.tangle !== undefined) {
          obj.setTAngleTarget(data.tangle);
        }
      }
    }
  } else if (cmd === 'fire') {
    log('data : ', data);
    createProj(data);
    mProjs.push(data);
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
    myChar.tobj.setTurnDir(-1);//turnMag);
  } else if (myKeys[KEY_RIGHT] && !myKeys[KEY_LEFT]) {
    myChar.tobj.setTurnDir(+1);//turnMag);
  } else {
    myChar.tobj.setTurnDir(0);
  }

  if (myKeys[KEY_UP]) {
    myChar.tobj.setMoveDir(+1);
  } else if (myKeys[KEY_DOWN]) {
    myChar.tobj.setMoveDir(-1);
  } else {
    myChar.tobj.setMoveDir(0);
  }

  var localMouse = grpGame.globalToLocal(myMouse.x, myMouse.y);
  var charPos = myChar.tobj.getPosition();
  var charAngle = myChar.tobj.getAngle();

  var mouseAngle = Math.atan2(localMouse.y-charPos.y, localMouse.x-charPos.x) * (180/Math.PI);
  myChar.tobj.setTAngleTarget(mouseAngle - charAngle);
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
  var startRange = 20;
  var endRange = 55;

  var infoPos = info.tobj.getPosition();

  var dX = Math.abs(x - infoPos.x);
  var dY = Math.abs(y - infoPos.y);
  var dist = Math.sqrt(dX*dX + dY*dY);

  if (dist < startRange || dist >= endRange) {
    return;
  }

  var damageMag = (dist - startRange) / (endRange - startRange);
  myChar.health -= damageMag * 20;

  if (myChar.health < 0) {
    myChar.health = 0;
  }
}

var listenDistMin = 400;
var listenDistMax = 1400;
var playingSounds = [];
function createSound(name, x, y) {
  return;

  var sound = createjs.Sound.play(name);
  sound.x = x;
  sound.y = y;
  updateSound(sound);
  sound.addEventListener("loop", function() {
    var sndIdx = playingSounds.indexOf(sound);
    if (sndIdx >= 0) {
      playingSounds.splice(sndIdx, 1);
    }
  });
  playingSounds.push(sound);
}
setTimeout(function() {
  for (var i = 0; i < playingSounds.length; ++i) {
    updateSound(playingSounds[i]);
  }
}, 500);
function updateSound(sound) {
  var playerPos = myChar.tobj.getPosition();
  var dX = playerPos.x - sound.x;
  var dY = playerPos.y - sound.y;
  var dist = Math.sqrt(dX*dX+dY*dY);

  var volume = (dist-listenDistMin) / (listenDistMax-listenDistMin);
  if (volume < 0) {
    volume = 0;
  } else if (volume > 1.0) {
    volume = 1;
  }
  sound.volume = 1 - volume;
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

  createSound('explosion', x, y);
}

function checkProj(proj) {
  return false;
}

function tickProjs() {
  var newMProjs = [];
  for (var i = 0; i < mProjs.length; ++i) {
    if (!updateProj(mProjs[i])) {
      removeProj(mProjs[i]);
    } else {
      newMProjs.push(mProjs[i]);
    }
  }
  mProjs = newMProjs;
}

var fenceB = null;

function addFence(x, y) {
  //234 363 38


  var fence = new createjs.Bitmap('tree.png');
  fence.x = 500;
  fence.y = 200;
  lyrMapT.addChild(fence);

  var square = Physics.body('circle', {
    // place the center of the square at (0, 0)
    x: 562,
    y: 250,
    radius: 26,
    fixed: true
  });
  world.add(square);
}

function normVal(val) {
  var mult = 1 / (Math.abs(val.x) + Math.abs(val.y));
  return {x: val.x*mult, y: val.y*mult};
}

var myRender = null;
function setupWorld() {
  world = Physics({
    timestep: 1000 / 200
  });

  Physics.body('projectile', 'circle', function(parent) {
    return {
      init: function(options) {
        parent.init.call(this, options);
      }
    };
  });

  Physics.body('tankBody', 'circle', function(parent) {
    return {
      init: function(options) {
        parent.init.call(this, options);
      }
    };
  });

  Physics.body('tankTurret', 'convex-polygon', function(parent) {
    return {
      init: function(options) {
        parent.init.call(this, options);
      }
    };
  });

  //world.add( Physics.renderer('easlejs', {stage:stage}) );
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
  var tankPos = myChar.tobj.getPosition();
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

var netbpsGraph = null;
var netppsGraph = null;
var fpsGraph = null;

function tick(e) {
  fpsHist.log(1);

  tickInput(e.delta);

  world.step(e.time);

  myChar.tobj.update(e.delta);
  for (var i = 0; i < oPlayers.length; ++i) {
    oPlayers[i].tobj.update(e.delta);
  }

  tickProjs();

  netbpsGraph.update();
  netppsGraph.update();
  fpsGraph.update();

  netUpdate();
  if (world.renderer()) {
    world.render();
  }
  stage.update();

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
    fireToward(fireX, fireY);
    e.preventDefault();
  });

  grpGame = new createjs.Container();
  stage.addChild(grpGame);

  lyrMapB = new createjs.Container();
  lyrChars = new createjs.Container();
  lyrProjs = new createjs.Container();
  lyrMapT = new createjs.Container();
  lyrNames = new createjs.Container();

  grpGame.addChild(lyrMapB);
  grpGame.addChild(lyrChars);
  grpGame.addChild(lyrProjs);
  grpGame.addChild(lyrMapT);
  grpGame.addChild(lyrNames);

  var graphX = viewportW - 10 - 300;
  var graphY = viewportH + 10 - (60+10)*3;
  netbpsGraph = new BucketStatsGraph(packetHist, 'line', 'total',
      'Network I/O (bytes/sec)', graphX, graphY+(60+4)*0, 300, 60, 250);
  netppsGraph = new BucketStatsGraph(packetHist, 'bar', 'count',
      'Network I/O (packets/sec)', graphX, graphY+(60+4)*1, 300, 60, 5);
  fpsGraph = new BucketStatsGraph(fpsHist, 'line', 'total',
    'FPS', graphX, graphY+(60+4)*2, 300, 60, 20);

  var mapT = new createjs.Bitmap('mapTop.png');
  mapT.x = 0;
  mapT.y = 0;
  lyrMapT.addChild(mapT);

  var mapB = new createjs.Bitmap('mapBottom.png');
  mapB.x = 0;
  mapB.y = 0;
  lyrMapB.addChild(mapB);

  setupWorld();

  myChar.tobj = new Tank(world, myChar, TankVis);

  addFence(200, 200);

  createjs.Ticker.addEventListener("tick", tick);
  createjs.Ticker.setFPS(30);
}

$(document).ready(function() {
  stage = new createjs.Stage("game");
  setup();
  startConn();
});