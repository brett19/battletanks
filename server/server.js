require('universes')({
  workers: 1,
  httpPort: 8080,
  couchbase: {
    host: 'localhost:8091',
    bucket: 'default',
    password: ''
  }
}, function(app) {

  var log = app.logger;
  var UniCore = app.Core;
  var UniRooms = app.Rooms;

  var UniPrimus = require('./universes_proto');
  var Physics = require('./../common/physics');
  var Tank = require('./../common/tank');
  var Projectile = require('./../common/projectile');
  var Crate = require('./../common/crate');
  var DropPlane = require('./../common/dropplane');
  var GameWorld = require('./../common/gameworld');


  function physHrTime() {
    var t = process.hrtime();
    return (t[0] * 1000) + (t[1] / 1000000);
  }

  var gameWorld = new GameWorld({});

  var world = gameWorld.physWorld;
  var netRenderer = Physics.renderer('netrender');
  world.add( netRenderer );

  var uniqueOid = 1;
  function genOid() {
    return uniqueOid++;
  }

  function newDropPlane() {
    var borderSize = 50;
    var mapWidth = 1000;
    var mapHeight = 500;

    var startX = -400;
    var startY = borderSize + (Math.random() * (mapHeight-borderSize*2));
    var endX = mapWidth + 400;
    var endY = borderSize + (Math.random() * (mapHeight-borderSize*2));
    var dropX = borderSize + (Math.random() * (mapWidth-borderSize*2));
    var angle = Math.atan2(endY-startY, endX-startX) * (180/Math.PI);

    var plane = gameWorld.createDropPlane({
      oid: genOid(),
      x: startX,
      y: startY,
      angle: angle,
      endPos: endX,
      dropPos: dropX
    });

    var mainRoom = rooms.findRoom('main');
    if (mainRoom) {
      mainRoom.nemit('addplane', {
        oid: plane.oid,
        state: plane.getNetInfo()
      });
    }

    return plane;
  }


  gameWorld.on('plane:dropCrate', function(x, y) {
    var crate = gameWorld.createCrate({
      oid: genOid(),
      x: x - 60,
      y: y
    });

    var mainRoom = rooms.findRoom('main');
    if (mainRoom) {
      mainRoom.nemit('dropcrate', {
        oid: crate.oid,
        state: crate.getNetInfo()
      });
    }

    return crate;
  });

  setInterval(function() {
    var crateCount = 0;
    for (var i = 0; i < gameWorld.objects.length; ++i) {
      if (gameWorld.objects[i] instanceof Crate) {
        crateCount++;
      } else if (gameWorld.objects[i] instanceof DropPlane) {
        crateCount++;
      }
    }
    if (crateCount < 20) {
      newDropPlane();
    }
  }, 400);


  var physListeners = [];

  setInterval(function() {
    var time = physHrTime();
    if (world){
      gameWorld.step(time);

      world.render();

      var draws = netRenderer.flush();

      var objs = [];
      for (var i = 0; i < gameWorld.objects.length; ++i) {
        var pos = gameWorld.objects[i].getPosition();
        objs.push(pos);
      }

      for (var i = 0; i < physListeners.length; ++i) {
        var listener = physListeners[i];
        if (!listener) {
          console.log('Missing Listener!');
        }
        listener.nemit('phys/debugDraw', draws);
        listener.nemit('world/debugDraw', objs);
      }
    }
  }, 1000 / 60);

  var ws = new UniPrimus(app);
  var rooms = new UniRooms(app);

  app.static('/logos', './logos');
  app.static('/client', __dirname + '/../client');
  app.static('/common', __dirname + '/../common');

  app.non('join', function(client, args) {
    client.name = args.name;

    client.x = args.x;
    client.y = args.y;

    var room = rooms.findRoom('main');
    if (!room) {
      rooms.createRoom('main', client);
    } else {
      room.addClient(client);
    }

    client.nemit('joined');
  });

  rooms.on('clientJoined', function(room, client) {
    log.debug('rooms:clientJoined', room.uuid, client.uuid);

    var tank = gameWorld.createTank({
      oid: genOid(),
      name: client.name,
      x: client.x,
      y: client.y
    });
    client.tank = tank;

    // Send my addplayer to everyone except me
    room.nemit(client, 'addtank', {
      oid: tank.oid,
      name: tank.name,
      state: tank.getNetInfo()
    });

    for (var i = 0; i < gameWorld.objects.length; ++i) {
      var obj = gameWorld.objects[i];

      if (obj === client.tank) {
        continue;
      }

      if (obj instanceof Tank) {
        client.nemit('addtank', {
          oid: obj.oid,
          name: obj.name,
          state: obj.getNetInfo()
        });
      } else if (obj instanceof Projectile) {
        client.nemit('addproj', {
          state: obj.getNetInfo()
        });
      } else if (obj instanceof Crate) {
        client.nemit('addcrate', {
          oid: obj.oid,
          state: obj.getNetInfo()
        });
      } else if (obj instanceof DropPlane) {
        client.nemit('addplane', {
          oid: obj.oid,
          state: obj.getNetInfo()
        });
      }
    }

    /*
    if (client.socket.address.ip === '127.0.0.1') {
      physListeners.push(client);
      client.nemit('phys/debugDraw', netRenderer.shapeStream());
    }
    */
  });
  rooms.on('clientLeft', function(room, client) {
    log.debug('rooms:clientLeft', room.uuid, client.uuid);

    var tank = client.tank;
    if (tank) {
      gameWorld.removeObject(tank);
      client.tank = null;

      room.nemit('deltank', {
        oid: tank.oid
      });
    }

    var listenerIdx = physListeners.indexOf(client);
    if (listenerIdx >= 0) {
      physListeners.splice(listenerIdx, 1);
    }
  });

  rooms.non('move', function(room, client, cmd, args) {
    var tank = client.tank;
    if (!tank) {
      return;
    }

    tank.updateByNetInfo(args, true);

    args.oid = tank.oid;
    room.nemit(client, cmd, args);
  });
  rooms.non('fire', function(room, client, cmd, args) {
    var proj = gameWorld.createProjectile({
      x: args.x,
      y: args.y,
      angle: args.angle
    });

    room.nemit(client, 'addproj', {state: proj.getNetInfo()});
  });
  rooms.non('health', function(room, client, cmd, args) {
    args.oid = client.tank.oid;
    room.nemit(client, cmd, args);
  });

  app.on('ready', function() {
    log.info('Server Ready (', app.httpPort, ',', app.selfPort, ')');
  });
  app.start();

});
