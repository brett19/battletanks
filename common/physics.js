if (typeof define !== 'function') { var define = require('amdefine')(module) }

define([
  './physicsjs-full-0.5.3.min',
  './physics_netrender.js',
  './physics_collisions.js',
  './physics_responder.js',
  './physics_bodies.js',
], function(Physics) {
  return Physics;
})