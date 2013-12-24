
function NetRenderDrawer(opts) {
  this.layer = opts.layer;
  this.fillColor = opts.fillColor;
  this.strokeColor = opts.strokeColor;

  this.shapes = {};
  this.shapeCache = [];
}

NetRenderDrawer.prototype._drawShape = function(g, geom) {
  g.clear();
  g.beginStroke(this.strokeColor);
  g.beginFill(this.fillColor);
  if (geom.radius) {
    g.drawCircle(0, 0, geom.radius);
    g.moveTo(0, 0);
    g.lineTo(geom.radius, 0);
  } else {
    g.moveTo(geom.vertices[0].x, geom.vertices[0].y);
    for (var i = 1; i < geom.vertices.length; ++i) {
      var v = geom.vertices[i];
      g.lineTo(v.x, v.y);
    }
  }
}

NetRenderDrawer.prototype.newShape = function(shapeId, geom) {
  var shape = null;
  if (this.shapeCache.length > 0) {
    shape = this.shapeCache.pop();
  } else {
    shape = new createjs.Shape();
  }
  shape.visible = false;
  this.layer.addChild(shape);
  this._drawShape(shape.graphics, geom);

  this.shapes[shapeId] = shape;
};

NetRenderDrawer.prototype.releaseShape = function(shapeId) {
  var shape = this.shapes[shapeId];
  this.layer.removeChild(shape);
  this.shapeCache.push(shape);
  delete this.shapes[shapeId];
};

NetRenderDrawer.prototype.beforeRender = function() {
  for (var i in this.shapes) {
    if (this.shapes.hasOwnProperty(i)) {
      this.shapes[i].visible = false;
    }
  }
};

NetRenderDrawer.prototype.drawBody = function(shapeId, x, y, angle) {
  var shape = this.shapes[shapeId];
  shape.visible = true;
  shape.x = x;
  shape.y = y;
  shape.rotation = angle;
};

NetRenderDrawer.prototype.draw = function(data) {
  for (var i = 0; i < data.length; ++i) {
    if (data[i][0] === 'newShape') {
      this.newShape(data[i][1], data[i][2]);
    } else if (data[i][0] === 'releaseShape') {
      this.releaseShape(data[i][1]);
    } else if (data[i][0] === 'beforeRender') {
      this.beforeRender();
    } else if (data[i][0] === 'drawBody') {
      this.drawBody(data[i][1], data[i][2], data[i][3], data[i][4])
    }
  }
};
