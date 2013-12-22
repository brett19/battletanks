// TODO: If you run into a crate on the server, but not the client.  We need to sync this somehow...

function Crate(world, opts, VisClass) {
  if (opts.state) {
    opts.x = opts.state.pos.x;
    opts.y = opts.state.pos.y;
  }

  this.oid = opts.oid;

  this.world = world;
  this.physWorld = world.physWorld;
  this.view = null;

  this.physBall = Physics.body('crate', {
    x: opts.x,
    y: opts.y,
    radius: 15,
    fixed: true
  });

  var self = this;
  this.physBall.collisionHandler = function() {
    world.explodeCrate(self);
    return false;
  };

  this.physWorld.add(this.physBall);

  if (VisClass) {
    this.view = new VisClass(this, opts);
  }

  this.update(0);
}

Crate.prototype.remove = function() {
  this.physWorld.remove(this.physBall);

  if (this.view) {
    this.view.remove();
  }
};

Crate.prototype.update = function(dt) {
  if (this.view) {
    this.view.update();
  }
};

Crate.prototype.getPosition = function() {
  var ballState = this.physBall.state;
  return { x: ballState.pos.get(0), y: ballState.pos.get(1) };
};

Crate.prototype.getNetInfo = function() {
  var state = {};
  state.pos = this.getPosition();;
  return state;
};

if (typeof module !== 'undefined') {
  module.exports = Crate;
}
