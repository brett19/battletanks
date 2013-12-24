if (typeof define !== 'function') { var define = require('amdefine')(module) }
define(['./physics'], function(Physics) {

function Projectile(world, opts, VisClass) {
  if (opts.state) {
    opts.x = opts.state.pos.x;
    opts.y = opts.state.pos.y;
    opts.angle = opts.state.angle;
  }

  this.oid = opts.oid;

  this.world = world;
  this.physWorld = world.physWorld;
  this.view = null;
  this.fireTime = (new Date()).getTime();
  this.speed = 0.3;

  this.physBall = Physics.body('projectile', {
    x: opts.x,
    y: opts.y,
    angle: opts.angle,
    radius: 4
  });

  var angleRad = opts.angle / (180/Math.PI);
  this.physBall.state.vel = Physics.vector(
    Math.cos(angleRad) * this.speed,
    Math.sin(angleRad) * this.speed
  );

  var self = this;
  this.physBall.collisionHandler = function() {
    world.explodeProjectile(self);
    return false;
  };

  this.physWorld.add(this.physBall);

  if (VisClass) {
    this.view = new VisClass(this, opts);
  }

  this.update(0);
}

Projectile.prototype.remove = function() {
  this.physWorld.remove(this.physBall);

  if (this.view) {
    this.view.remove();
  }
};

Projectile.prototype.update = function(dt) {
  // TODO: THIS IS NOT SAFE
  //         boomProjectile calls removeProjectile which modifies mProjs which
  //         is looped in order to call this update function itself.
  var curTime = (new Date()).getTime();
  if (curTime - this.fireTime >= 2000) {
    this.world.explodeProjectile(this);
  }

  if (this.view) {
    this.view.update();
  }
};

Projectile.prototype.getPosition = function() {
  var ballState = this.physBall.state;
  return { x: ballState.pos.get(0), y: ballState.pos.get(1) };
};

Projectile.prototype.getAngle = function() {
  var ballState = this.physBall.state;
  return ballState.angular.pos;
};

Projectile.prototype.getNetInfo = function() {
  var state = {};
  state.pos = this.getPosition();;
  state.angle = this.getAngle();
  return state;
};

return Projectile;
});
