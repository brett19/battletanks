var primus = null;
function startConn() {
  var onMap = {};

  primus = Primus.connect('/', {
    parser: {
      encoder: function(data, fn) { fn(undefined, data); },
      decoder: function(data, fn) { fn(undefined, data); },
      library: ''
    }
  });

  primus.nemit = function(cmd, args) {
    var data = encodePacket(cmd, args);

    if (packetHist) {
      packetHist.log(data.length);
    }

    this.write(data);
  };

  primus._nemit = function(cmd, args) {
    var handlers = onMap[cmd];
    if (handlers) {
      for (var i = 0; i < handlers.length; ++i) {
        handlers[i](args);
      }
    }
  };

  primus.non = function(cmd, handler) {
    if (!onMap[cmd]) {
      onMap[cmd] = [];
    }
    onMap[cmd].push(handler);
  };

  primus.on('open', function open() {
    log('connected');
    start();
  });
  primus.on('data', function(data) {
    if (packetHist) {
      packetHist.log(data.length);
    }

    var _data = decodePacket(data);
    primus._nemit(_data[0], _data[1]);
  });
  primus.on('error', function error(err) {
    log('error : ', err);
  });
  primus.on('end', function error() {
    log('disconnected');
  });
}