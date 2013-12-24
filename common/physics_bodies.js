if (typeof define !== 'function') { var define = require('amdefine')(module) }

define(['./physicsjs-full-0.5.3.min'], function(Physics) {

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

});