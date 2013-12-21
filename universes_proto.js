var core = require('universes').Core;
var util = require('util');
var events = require('events');
var Primus = require('primus');
var proto = require('./common/protocol');

function _Client(socket) {
  this.socket = socket;
  this.uuid = core.uuid();
}
util.inherits(_Client, events.EventEmitter);

_Client.prototype.nemit = function(cmd, args) {
  var data = proto.encodePacket(cmd, args);
  this.socket.write(data);
};

function WebSockets(app) {
  this.app = app;

  var primus = new Primus(app.server, {
    transformer: 'engine.io',
    parser: {
      encoder: function(data, fn) { fn(undefined, data); },
      decoder: function(data, fn) { fn(undefined, data); },
      library: ''
    }
  });

  var self = this;
  primus.on('connection', function (spark) {
    var client = new _Client(spark);
    spark.client = client;

    spark.on('data', function(_data) {
      var data = proto.decodePacket(_data);
      client.emit('packet', data[0], data[1]);
      self.app._nemit(client, data[0], data[1]);
    });
    self.app.emit('clientJoined', client);
  });
  primus.on('disconnection', function (spark) {
    var client = spark.client;
    client.emit('left');
    self.app.emit('clientLeft', client);
  });

  this.server = primus;
}

module.exports = WebSockets;
