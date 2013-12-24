function DebugDrawer(opts) {
  this.layer = opts.layer;
  this.fillColor = opts.fillColor;
  this.strokeColor = opts.strokeColor;
  this.radius = opts.radius;

  this.debugRObjs = [];
  this.debugRVisObjs = [];
  this.debugSObjs = [];
  this.debugSVisObjs = [];
}

DebugDrawer.prototype._drawRShape = function(g) {
  g.clear();
  g.beginStroke('rgba(255,0,0,0.6)');
  g.beginFill('rgba(255,0,0,0.4)');
  g.drawCircle(0, 0, this.radius);
  g.moveTo(0, 0);
};

DebugDrawer.prototype._drawSShape = function(g) {
  g.clear();
  g.beginStroke('rgba(255,0,0,0.6)');
  g.beginFill('rgba(255,0,0,0.4)');
  g.drawRect(-this.radius, -this.radius, this.radius*2, this.radius*2);
  g.moveTo(0, 0);
};


DebugDrawer.prototype._renderRObject = function(x, y) {
  var shape = null;
  if (this.debugRObjs.length > 0) {
    shape = this.debugRObjs.pop();
  } else {
    shape = new createjs.Shape();
    this._drawRShape(shape.graphics);
    this.layer.addChild(shape);
  }

  shape.visible = true;
  shape.x = x;
  shape.y = y;
  this.debugRVisObjs.push(shape);
};

DebugDrawer.prototype._renderSObject = function(x, y) {
  var shape = null;
  if (this.debugSObjs.length > 0) {
    shape = this.debugSObjs.pop();
  } else {
    shape = new createjs.Shape();
    this._drawSShape(shape.graphics);
    this.layer.addChild(shape);
  }

  shape.visible = true;
  shape.x = x;
  shape.y = y;
  this.debugSVisObjs.push(shape);
};

DebugDrawer.prototype._resetShapes = function() {
  for (var i = 0; i < this.debugRVisObjs.length; ++i) {
    var ii = this.debugRVisObjs.length - 1 - i;
    this.debugRVisObjs[ii].visible = false;
    this.debugRObjs.push(this.debugRVisObjs[ii]);
  }
  this.debugRVisObjs = [];

  for (var i = 0; i < this.debugSVisObjs.length; ++i) {
    var ii = this.debugSVisObjs.length - 1 - i;
    this.debugSVisObjs[ii].visible = false;
    this.debugSObjs.push(this.debugSVisObjs[ii]);
  }
  this.debugSVisObjs = [];
};

DebugDrawer.prototype.draw = function(robjs, sobjs) {
  this._resetShapes();
  if (robjs) {
    for (var i = 0; i < robjs.length; ++i) {
      this._renderRObject(robjs[i].x, robjs[i].y);
    }
  }
  if (sobjs) {
    for (var j = 0; j < sobjs.length; ++j) {
      this._renderSObject(sobjs[j].x, sobjs[j].y);
    }
  }
};
