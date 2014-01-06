define([
  '../../common/protocol.js'
], function(
  proto
) {

  function getRelativeUrl(path) {
    var loc = window.location, new_uri;
    if (loc.protocol === "https:") {
      new_uri = "wss:";
    } else {
      new_uri = "ws:";
    }
    new_uri += "//" + loc.host;
    new_uri += loc.pathname + path;
    return new_uri;
  }

  function startConn(start) {
    var onMap = {};

    var conn = new WebSocket(getRelativeUrl('/'));
    conn.binaryType = 'arraybuffer';

    conn.onopen = function() {
      start();
    };

    conn.onmessage = function (msg) {
      //console.log(msg);
      // TODO: Repair this
      //if (packetHist) {
      //  packetHist.log(data.length);
      //}

      var _data = proto.decodePacket(msg.data);
      conn._nemit(_data[0], _data[1]);
    };

    conn.onerror = function (error) {
      console.log('WebSocket Error' + error);
    };

    conn.onclose = function() {
      console.log('WebSocket Closed');
    };

    conn.nemit = function(cmd, args) {
      if (this.readyState !== WebSocket.OPEN) {
        return;
      }

      var data = proto.encodePacket(cmd, args);

      // TODO: Repair this too
      //if (packetHist) {
      //  packetHist.log(data.length);
      //}

      this.send(data);
    };

    conn._nemit = function(cmd, args) {
      var handlers = onMap[cmd];
      if (handlers) {
        for (var i = 0; i < handlers.length; ++i) {
          handlers[i](args);
        }
      }
    };

    conn.non = function(cmd, handler) {
      if (!onMap[cmd]) {
        onMap[cmd] = [];
      }
      onMap[cmd].push(handler);
    };

    return conn;
  }

  return startConn;
});