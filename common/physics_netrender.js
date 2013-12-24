if (typeof define !== 'function') { var define = require('amdefine')(module) }

define(['./physicsjs-full-0.5.3.min'], function(Physics) {

Physics.renderer('netrender', function(parent) {
  var uniqueId = 1;
  var myItems = [];
  var data = [];
  var activeShapes = [];

  function newShape(geom) {
    var netGeom = {};
    if (geom.radius) {
      netGeom.radius = geom.radius;
    } else {
      netGeom.vertices = [];
      for (var i = 0; i < geom.vertices.length; ++i) {
        var vert = geom.vertices[i];
        netGeom.vertices.push({ x: vert.get(0), y: vert.get(1) });
      }
    }

    var shapeId = uniqueId++;
    activeShapes[shapeId] = netGeom;
    data.push(['newShape', shapeId, netGeom]);
    return shapeId;
  }
  function releaseShape(shapeId) {
    delete activeShapes[shapeId];
    data.push(['releaseShape', shapeId]);
  }

  return {
    init: function(options) {
      parent.init.call(this, options);
    },
    shapeStream: function() {
      var tmpData = [];
      for (var i in activeShapes) {
        if (activeShapes.hasOwnProperty(i)) {
          tmpData.push(['newShape', i, activeShapes[i]]);
        }
      }
      return tmpData;
    },
    flush: function() {
      var dataOut = data;
      data = [];
      return dataOut;
    },
    createView: function(geom) {
      var obj = {};
      obj.geom = geom;
      obj.shapeId = newShape(geom);
      obj.lastSeen = 0;
      myItems.push(obj);
      return obj;
    },
    beforeRender: function() {
      data.push(['beforeRender']);

      var newMyItems = [];
      for (var i = 0; i < myItems.length; ++i) {
        if (myItems[i].lastSeen >= 30) {
          releaseShape(myItems[i].shapeId);
          myItems[i].shapeId = null;
        } else {
          myItems[i].lastSeen++;
          newMyItems.push(myItems[i]);
        }
      }
      myItems = newMyItems;
    },
    drawMeta: function(meta) {
    },
    drawBody: function(body, view) {
      if (!view.shapeId) {
        view.shapeId = newShape(view.geom);
      }
      view.lastSeen = 0;

      data.push([
        'drawBody',
        view.shapeId,
        body.state.pos.get(0),
        body.state.pos.get(1),
        body.state.angular.pos
      ]);
    }
  };
});

});
