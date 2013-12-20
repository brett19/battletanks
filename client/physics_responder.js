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

        if ((collision.bodyA.name === 'tankBody' ||
          collision.bodyB.name === 'tankBody') &&
          (collision.bodyA.name === 'tankTurret' ||
            collision.bodyB.name === 'tankTurret')) {
          // Ignore Turret vs Tank collisions.
          log('ignore turret tank');
          continue;
        }

        if (collision.bodyA.name === 'projectile' ||
          collision.bodyB.name === 'projectile') {

          var colPoint = Physics.vector().clone(collision.pos).vadd(collision.bodyA.state.pos);
          triggerHit(colPoint.get(0), colPoint.get(1));
          triggerHit(colPoint.get(0), colPoint.get(1));

          if (collision.bodyA.name === 'projectile') {
            removeProj(collision.bodyA.obj, true);
          }
          if (collision.bodyB.name === 'projectile') {
            removeProj(collision.bodyB.obj, true);
          }

          continue;
        }

        filteredCollisions.push(collision);
      }
      data.collisions = filteredCollisions;

      parent.respond.call(this, data);
    }
  };
});