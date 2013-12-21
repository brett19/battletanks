var turnMag = 0.2;
var speedMag = 0.2;
var tspeedClamp = 180;33

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

  // Other Props
  this.uuid = opts.uuid;
  this.name = opts.name;
  this.health = opts.health !== undefined ? opts.health : 100;
  this.ammo = opts.ammo !== undefined ? opts.ammo : 30;

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
};

Tank.prototype.update = function(dt) {
  var bodyState = this.physBody.state;

  // Apply Dead Reckoning
  var drm = 0.4;
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

Tank.prototype.getHealth = function() {
  return this.health;
}
Tank.prototype.setHealth = function(val) {
  this.health = val;
}

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
};

Tank.prototype.getMoveVel = function() {
  return this.moveVel;
};
Tank.prototype.setMoveVel = function(val) {
  this.moveVel = val;
};

Tank.prototype.getTAngleTarget = function() {
  if (this.tangleTarget === undefined) {
    throw new Error();
  }
  return this.tangleTarget;
};
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

if (typeof module !== 'undefined') {
  module.exports = Tank;
}
