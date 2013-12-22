if (typeof require === 'function') {
  Physics = require('./physicsjs-full-0.5.3.min');
}

Physics.body('crate', 'circle', function(parent) {
  return {
    init: function(options) {
      parent.init.call(this, options);
    }
  };
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
