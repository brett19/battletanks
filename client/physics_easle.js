Physics.renderer('easlejs', function(parent) {
  var myStage = null;
  var myItems = [];
  var shapeCache = [];

  function drawShape(g, geom) {
    g.clear();
    g.beginStroke("rgba(255,255,0,0.3)");
    g.beginFill('rgba(255,255,0,0.1)');
    if (geom.radius) {
      g.drawCircle(0, 0, geom.radius);
      g.moveTo(0, 0);
      g.lineTo(geom.radius, 0);
    } else {
      g.moveTo(geom.vertices[0].get(0), geom.vertices[0].get(1));
      for (var i = 1; i < geom.vertices.length; ++i) {
        var v = geom.vertices[i];
        g.lineTo(v.get(0), v.get(1));
      }
    }
  }

  function newShape(geom) {
    var shape = null;
    if (shapeCache.length > 0) {
      shape = shapeCache.pop();
    } else {
      shape = new createjs.Shape();
    }
    shape.visible = false;
    myStage.addChild(shape);
    drawShape(shape.graphics, geom);
    return shape;
  }
  function releaseShape(shape) {
    myStage.removeChild(shape);
    shapeCache.push(shape);
  }

  return {
    init: function(options) {
      parent.init.call(this, options);
      myStage = options.stage;
    },
    createView: function(geom) {
      var obj = {};
      obj.geom = geom;
      obj.shape = newShape(obj.geom);
      obj.lastSeen = 0;
      myItems.push(obj);
      return obj;
    },
    beforeRender: function() {
      var newMyItems = [];
      for (var i = 0; i < myItems.length; ++i) {
        if (myItems[i].lastSeen >= 30) {
          releaseShape(myItems[i].shape);
          myItems[i].shape = null;
        } else {
          myItems[i].shape.visible = false;
          myItems[i].lastSeen++;
          newMyItems.push(myItems[i]);
        }
      }
      myItems = newMyItems;
    },
    drawMeta: function(meta) {
    },
    drawBody: function(body, view) {
      if (!view.shape) {
        view.shape = newShape(view.geom);
      }
      view.lastSeen = 0;

      view.shape.visible = true;
      view.shape.x = body.state.pos.get(0);
      view.shape.y = body.state.pos.get(1);
      view.shape.rotation = body.state.angular.pos;
    }
  };
});