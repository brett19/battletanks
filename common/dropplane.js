// TODO: If you run into a crate on the server, but not the client.  We need to sync this somehow...

if (typeof define !== 'function') { var define = require('amdefine')(module) }
define([], function() {

function DropPlane(world, opts, VisClass) {
  if (opts.state) {
    opts.x = opts.state.pos.x;
    opts.y = opts.state.pos.y;
    opts.angle = opts.state.angle;
  }

  this.oid = opts.oid;

  this.world = world;
  this.view = null;

  this.pos = {
    x: opts.x,
    y: opts.y
  };
  this.angle = opts.angle;
  this.endPos = opts.endPos;
  this.dropPos = opts.dropPos;

  if (VisClass) {
    this.view = new VisClass(this, opts);
  }

  this.update(0);
}

DropPlane.prototype.remove = function() {
  if (this.view) {
    this.view.remove();
  }
};

var planeSpeed = 100;
DropPlane.prototype.update = function(dt) {
  var angleRad = this.angle / (180/Math.PI);
  var speedMag = dt * (planeSpeed / 1000);

  this.pos.x += Math.cos(angleRad) * speedMag;
  this.pos.y += Math.sin(angleRad) * speedMag;

  if (this.dropPos && this.pos.x >= this.dropPos) {
    this.world.planeDrop(this);
    this.dropPos = 0;
  }
  if (this.endPos && this.pos.x >= this.endPos) {
    this.world.planeComplete(this);
  }

  if (this.view) {
    this.view.update();
  }
};

DropPlane.prototype.getPosition = function() {
  return this.pos;
};

DropPlane.prototype.getAngle = function() {
  return this.angle;
};

DropPlane.prototype.getNetInfo = function() {
  var state = {};
  state.pos = this.getPosition();
  state.angle = this.getAngle();
  return state;
};

return DropPlane;
});