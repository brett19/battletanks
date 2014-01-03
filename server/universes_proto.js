var core = require('universes')().Core;
var util = require('util');
var events = require('events');
var WebSocketServer = require('ws').Server;
var proto = require('./../common/protocol');

function _Client(socket) {
  this.socket = socket;
  this.uuid = core.uuid();
}
util.inherits(_Client, events.EventEmitter);

_Client.prototype.nemit = function(cmd, args) {
  var data = proto.encodePacket(cmd, args);
  this.socket.send(data);
};

function WebSockets(app) {
  this.app = app;

  var wss = new WebSocketServer({server: app.server});

  var self = this;
  wss.on('connection', function(ws) {
    var client = new _Client(ws);

    ws.on('message', function(_data) {
      var data = null;
      try {
        data = proto.decodePacket(_data);
      } catch (e) {
        //console.info('websocket error : ', e.toString());
        ws.close();
        return;
      }

      client.emit('packet', data[0], data[1]);
      self.app._nemit(client, data[0], data[1]);
    });

    ws.on('close', function() {
      client.emit('left');
      self.app.emit('clientLeft', client);
    });

    self.app.emit('clientJoined', client);
  });

  this.server = wss;
}

module.exports = WebSockets;
