if (typeof require === 'function') {
  bops = require('./bops');
}

function encodePacket(cmd, args) {
  var buf = null;
  var i = 0;

  if (cmd === 'move') {
    if (args.oid !== undefined) {
      buf = bops.create(1 + 28);
    } else {
      buf = bops.create(1 + 24);
    }

    bops.writeInt8(buf, 1, i);
    bops.writeFloatBE(buf, args.pos.x, 1+0);
    bops.writeFloatBE(buf, args.pos.y, 1+4);
    bops.writeFloatBE(buf, args.moveVel, 1+8);
    bops.writeFloatBE(buf, args.turnVel, 1+12);
    bops.writeFloatBE(buf, args.angle, 1+16);
    bops.writeFloatBE(buf, args.tangle, 1+20);

    if (args.oid !== undefined) {
      bops.writeInt32BE(buf, args.oid, 1+24);
    }
  } else {
    var cmdBuf = bops.from(cmd);

    if (args === null || args === undefined) {
      buf = bops.create(1 + 1 + cmdBuf.length + 4);

      bops.writeInt8(buf, 0, i); i += 1;
      bops.writeInt8(buf, cmdBuf.length, i); i += 1;
      bops.copy(cmdBuf, buf, i); i += cmdBuf.length;
      bops.writeInt32BE(buf, 0, i);
    } else {
      var strArgs = JSON.stringify(args);
      var argsBuf = bops.from(strArgs);

      buf = bops.create(1 + 1 + cmdBuf.length + 4 + argsBuf.length);
      bops.writeInt8(buf, 0, i); i += 1;
      bops.writeInt8(buf, cmdBuf.length, i); i += 1;
      bops.copy(cmdBuf, buf, i); i += cmdBuf.length;
      bops.writeInt32BE(buf, argsBuf.length, i); i += 4;
      bops.copy(argsBuf, buf, i);
    }
  }

  return bops.to(buf, 'base64');
}

function decodePacket(data) {
  var buf = bops.from(data, 'base64');
  var i = 0;

  var cmdId = bops.readInt8(buf, i); i += 1;
  if (cmdId === 0) {
    var cmdLength = bops.readInt8(buf, i); i += 1;
    var cmdBuf = bops.subarray(buf, i, i + cmdLength); i += cmdLength;
    var cmdStr = bops.to(cmdBuf);

    var argsLength = bops.readInt32BE(buf, i); i += 4;
    if (argsLength > 0) {
      var argsBuf = bops.subarray(buf, i, i + argsLength);
      var argsStr = bops.to(argsBuf);

      return [cmdStr, JSON.parse(argsStr)];
    } else {
      return [cmdStr, null];
    }
  } else if (cmdId === 1) {

    return ['move', {
      pos: {
        x: bops.readFloatBE(buf, 1+0),
        y: bops.readFloatBE(buf, 1+4)
      },
      moveVel: bops.readFloatBE(buf, 1+8),
      turnVel: bops.readFloatBE(buf, 1+12),
      angle: bops.readFloatBE(buf, 1+16),
      tangle: bops.readFloatBE(buf, 1+20),
      oid: buf.length > (1+24) ? bops.readInt32BE(buf, 1+24) : undefined
    }];
  } else {
    throw new Error('invalid command number');
  }
}

if (typeof module !== 'undefined') {
  module.exports.encodePacket = encodePacket;
  module.exports.decodePacket = decodePacket;
}
