if (typeof define !== 'function') { var define = require('amdefine')(module) }

define(['./physicsjs-full-0.5.3.min'], function(Physics) {

Physics.behavior('custom-responder', 'body-impulse-response', function(parent) {
  return {
    init: function(options) {
      parent.init.call(this, options);
    },
    respond: function( data ) {
      var filteredCollisions = [];
      var collisions = data.collisions;

      for (var i = 0; i < collisions.length; ++i) {
        var collision = collisions[i];

        var ignored = false;

        if (collision.bodyA.collisionHandler) {
          if (!collision.bodyA.collisionHandler()) {
            ignored = true;
          }
        }
        if (collision.bodyB.collisionHandler) {
          if (!collision.bodyB.collisionHandler()) {
            ignored = true;
          }
        }

        if (!ignored) {
          filteredCollisions.push(collision);
        }
      }
      data.collisions = filteredCollisions;

      parent.respond.call(this, data);
    }
  };
});

});
