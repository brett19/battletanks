var log = require('universes').logger;
var UniApp = require('universes').App;
var UniCore = require('universes').Core;
var UniRooms = require('universes').Rooms;
var Physics = require('./physics');
var Tank = require('./common/tank');
var Projectile = require('./common/projectile');
var UniPrimus = require('./universes_proto');

function physHrTime() {
  var t = process.hrtime();
  return (t[0] * 1000) + (t[1] / 1000000);
}

var world = Physics({
  timestep: 1000 / 200
});

var netRenderer = Physics.renderer('netrender');
world.add( netRenderer );

world.add( Physics.behavior('custom-collisions') );
world.add( Physics.behavior('sweep-prune') );
world.add( Physics.behavior('custom-responder') );

var physListeners = [];

var lastTime = null;
setInterval(function() {
  var time = physHrTime();
  var dt = 0;
  if (lastTime !== null) {
    dt = time - lastTime;
  }
  lastTime = time;

  if (world){
    world.step( time );
    world.render();
    var draws = netRenderer.flush();

    var mainRoom = rooms.findRoom('main');
    if (mainRoom) {
      for (var i = 0; i < mainRoom.clients.length; ++i) {
        var client = mainRoom.clients[i];
        if (client.tank) {
          client.tank.update(dt);
        }
      }

      for (var i = 0; i < physListeners.length; ++i) {
        physListeners[i].nemit('phys/debugDraw', draws);
      }
    }
  }
}, 1000 / 60);

var options = {
  couchbase: {
    host: 'localhost:8091',
    bucket: 'default',
    password: ''
  },
  httpPort: 8080
};

var app = new UniApp(options);
var ws = new UniPrimus(app);
var rooms = new UniRooms(app);

app.static('/logos', './logos');
app.static('/client', __dirname + '/client');
app.static('/client/common', __dirname + '/common');

app.non('join', function(client, args) {
  client.name = args.name;
  client.color = args.color;
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

  // Send my addplayer to everyone except me
  room.nemit(client, 'addplayer', {
    uuid: client.uuid,
    name: client.name,
    x: client.x,
    y: client.y
  });

  var tank = new Tank(world, {
    uuid: client.uuid,
    name: client.name,
    x: client.x,
    y: client.y
  });
  client.tank = tank;

  for (var i = 0; i < room.clients.length; ++i) {
    var oclient = room.clients[i];

    // Don't update me about myself
    if (oclient === client) {
      continue;
    }

    // Tell this client about another
    client.nemit('addplayer', {
      uuid: oclient.uuid,
      name: oclient.name,
      color: oclient.color,
      x: oclient.x,
      y: oclient.y
    });
  }

  if (client.socket.address.ip === '127.0.0.1') {
    physListeners.push(client);
    client.nemit('phys/debugDraw', netRenderer.shapeStream());
  }
});
rooms.on('clientLeft', function(room, client) {
  log.debug('rooms:clientLeft', room.uuid, client.uuid);

  if (client.tank) {
    client.tank.remove();
    client.tank = null;
  }

  room.nemit('delplayer', {
    uuid: client.uuid
  });

  var listenerIdx = physListeners.indexOf(client);
  if (listenerIdx >= 0) {
    physListeners.splice(listenerIdx, 1);
  }
});

rooms.non('moveTo', function(room, client, cmd, args) {
  client.x = args.x;
  client.y = args.y;

  room.nemit(client, 'moveTo', {
    uuid: client.uuid,
    x: client.x,
    y: client.y
  });
});

rooms.non('move', function(room, client, cmd, args) {
  args.uuid = client.uuid;

  var obj = client.tank;
  if (args.pos !== undefined) {
    obj.setDRPosition(args.pos.x, args.pos.y);
  }
  if (args.moveVel !== undefined) {
    obj.setMoveVel(args.moveVel);
  }
  if (args.angle !== undefined) {
    obj.setDRAngle(args.angle);
  }
  if (args.turnVel !== undefined) {
    obj.setTurnVel(args.turnVel);
  }
  if (args.tangle !== undefined) {
    obj.setTAngleTarget(args.tangle);
  }

  room.nemit(client, cmd, args);
});
rooms.non('fire', function(room, client, cmd, args) {
  args.uuid = client.uuid;
  args.projUuid = UniCore.uuid();
  room.nemit(client, cmd, args);
});
rooms.non('health', function(room, client, cmd, args) {
  args.uuid = client.uuid;
  room.nemit(client, cmd, args);
});

app.on('ready', function() {
  log.info('Server Ready');
});
app.start();
