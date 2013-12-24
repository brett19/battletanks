if (typeof define !== 'function') { var define = require('amdefine')(module) }

define([
  './physics',
  './tank',
  './projectile',
  './crate',
  './dropplane'
], function(
  Physics,
  Tank,
  Projectile,
  Crate,
  DropPlane
) {

  var testMap = {
    width: 3000,
    height: 3000,
    objects: [
      // Trees
      {x:58,y:50,r:23},
      {x:402,y:88,r:23},
      {x:235,y:363,r:23},
      {x:628,y:406,r:10},
      {x:160,y:46,r:10},
      {x:69,y:144,r:10},
      {x:160,y:300,r:10},
      {x:365,y:280,r:10},

      // Walls
      {x:667,y:152,w:12,h:308},
      {x:466,y:448,w:201,h:12},
      {x:679,y:210,w:210,h:10},

      // Rivers
      //[{x:402,y:68}, {x:425,y:86}, {x:416,y:111}, {x:386,y:98}, {x:385,y:83}]
    ]
  };

  function GameWorld(opts)
  {
    opts.map = testMap;

    this.eventMap = {};
    this.map = opts.map;
    this.lastTime = 0;
    this.objects = [];

    this.physWorld = Physics({
      timestep: 1000 / 200
    });

    this.physWorld.add( Physics.behavior('custom-collisions') );
    this.physWorld.add( Physics.behavior('sweep-prune') );
    this.physWorld.add( Physics.behavior('custom-responder') );

    this._createBorder();
    this._createObjects();
  }

  GameWorld.prototype.createTank = function(opts, VisClass) {
    var tank = new Tank(this.physWorld, opts, VisClass);
    this.objects.push(tank);
    return tank;
  };

  GameWorld.prototype.createProjectile = function(opts, VisClass) {
    var proj = new Projectile(this, opts, VisClass);
    this.objects.push(proj);
    return proj;
  };

  GameWorld.prototype.createCrate = function(opts, VisClass) {
    var crate = new Crate(this, opts, VisClass);
    this.objects.push(crate);
    return crate;
  };

  GameWorld.prototype.createDropPlane = function(opts, VisClass) {
    var plane = new DropPlane(this, opts, VisClass);
    this.objects.push(plane);
    return plane;
  };

  GameWorld.prototype.explodeProjectile = function(proj) {
    var projPos = proj.getPosition();
    this.emit('projectile:explode', projPos.x, projPos.y);
    this.removeObject(proj);
  };

  GameWorld.prototype.explodeCrate = function(crate) {
    var cratePos = crate.getPosition();
    this.emit('crate:explode', cratePos.x, cratePos.y);
    this.removeObject(crate);
  };

  GameWorld.prototype.planeDrop = function(plane) {
    var planePos = plane.getPosition();
    this.emit('plane:dropCrate', planePos.x, planePos.y);
  };

  GameWorld.prototype.planeComplete = function(plane) {
    this.emit('plane:complete');
    this.removeObject(plane);
  };

  GameWorld.prototype.removeAllObjects = function() {
    for (var i = 0; i < this.objects.length; ++i) {
      this.objects[i].remove();
    }
    this.objects = [];
  };

  GameWorld.prototype.removeObject = function(obj) {
    obj.remove();

    var objectIdx = this.objects.indexOf(obj);
    if (objectIdx >= 0) {
      this.objects.splice(objectIdx, 1);
      return true;
    }
    return false;
  };

  GameWorld.prototype.getByOid = function(oid) {
    for (var i = 0; i < this.objects.length; ++i) {
      if (this.objects[i].oid === oid) {
        return this.objects[i];
      }
    }
    return null;
  };

  GameWorld.prototype.getByUuid = function(uuid) {
    for (var i = 0; i < this.objects.length; ++i) {
      if (this.objects[i].uuid === uuid) {
        return this.objects[i];
      }
    }
    return null;
  };

  GameWorld.prototype._createObjects = function() {
    for (var i = 0; i < this.map.objects.length; ++i) {
      var obj = this.map.objects[i];

      if (Array.isArray(obj)) {
        // Polygon
        var polyCenter = Physics.geometry.getPolygonCentroid(obj)
        var physObj = Physics.body('convex-polygon', {
          x: polyCenter.get(0),
          y: polyCenter.get(1),
          vertices: obj,
          fixed: true
        });
        this.physWorld.add(physObj);

      } else if (obj.r !== undefined) {
        // Circle
        var physObj = Physics.body('circle', {
          x: obj.x,
          y: obj.y,
          radius: obj.r,
          fixed: true
        });
        this.physWorld.add(physObj);

      } else if (obj.w !== undefined && obj.h !== undefined) {
        // Rect
        var physObj = Physics.body('convex-polygon', {
          x: obj.x + (obj.w/2),
          y: obj.y + (obj.h/2),
          vertices: [
            { x: 0, y:0 },
            { x: obj.w, y:0 },
            { x: obj.w, y:obj.h },
            { x: 0, y:obj.h },
          ],
          fixed: true
        });
        this.physWorld.add(physObj);

      } else {
        throw new Error('invalid object definition');
      }
    }
  };

  GameWorld.prototype._createBorder = function() {
    var mapHeight = this.map.height;
    var mapWidth = this.map.width;
    var borderSize = 40;

    var borderLeft = Physics.body('convex-polygon', {
      x: -borderSize/2,
      y: mapHeight/2,
      vertices: [
        {x:-borderSize, y:-borderSize},
        {x:0, y: 0},
        {x:0, y: mapHeight},
        {x:-borderSize, y: mapHeight+borderSize}
      ],
      fixed: true
    });
    this.physWorld.add(borderLeft);

    var borderRight = Physics.body('convex-polygon', {
      x: mapWidth+borderSize/2,
      y: mapHeight/2,
      vertices: [
        {x:borderSize, y: -borderSize},
        {x:0, y:0},
        {x:0, y: mapHeight},
        {x:borderSize, y: mapHeight+borderSize}
      ],
      fixed: true
    });
    this.physWorld.add(borderRight);

    var borderTop = Physics.body('convex-polygon', {
      x: mapWidth/2,
      y: -borderSize/2,
      vertices: [
        {x:-borderSize, y:-borderSize},
        {x:mapWidth+borderSize, y: -borderSize},
        {x:mapWidth, y: 0},
        {x:0, y: 0}
      ],
      fixed: true
    });
    this.physWorld.add(borderTop);

    var borderBottom = Physics.body('convex-polygon', {
      x: mapWidth/2,
      y: mapHeight+borderSize/2,
      vertices: [
        {x:-borderSize, y:mapHeight+borderSize},
        {x:mapWidth+borderSize, y: mapHeight+borderSize},
        {x:mapWidth, y: mapHeight},
        {x:0, y: mapHeight}
      ],
      fixed: true
    });
    this.physWorld.add(borderBottom);
  };

  GameWorld.prototype.step = function(time) {
    this.physWorld.step(time);

    if (this.lastTime > 0) {
      var dt = time - this.lastTime;

      for (var i = 0; i < this.objects.length; ++i) {
        this.objects[i].update(dt);
      }
    }
    this.lastTime = time;
  };

  GameWorld.prototype.on = function(event, handler) {
    if (!this.eventMap[event]) {
      this.eventMap[event] = [];
    }
    this.eventMap[event].push(handler);
  };

  GameWorld.prototype.off = function(event, handler) {
    if (!this.eventMap[event]) {
      return;
    }
    var handlerIdx = this.eventMap[event].indexOf(handler);
    if (handlerIdx >= 0) {
      this.eventMap.eventMap[event].splice(handlerIdx, 1);
    }
  };

  GameWorld.prototype.emit = function(event) {
    if (!this.eventMap[event]) {
      return;
    }
    var nargs = [];
    for (var i = 1; i < arguments.length; ++i) {
      nargs.push(arguments[i]);
    }
    for (var j = 0; j < this.eventMap[event].length; ++j) {
      this.eventMap[event][j].apply(this, nargs);
    }
  };

  return GameWorld;
});