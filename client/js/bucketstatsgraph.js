function BucketStatsGraph(stage, stats, type, mode, name, x, y, w, h, tick) {
  this.stats = stats;

  this.width = w;
  this.height = h;
  this.type = type;
  if (mode === 'average') {
    this.bucketFn = function(b) {
      return b.value / b.count;
    }
  } else if (mode === 'total') {
    this.bucketFn = function(b) {
      return b.value;
    }
  } else if (mode === 'count') {
    this.bucketFn = function(b) {
      return b.count;
    }
  } else {
    throw new Error('Invalid Mode : ' + mode);
  }

  this.maxValue = 10;
  this.tick = tick;
  this.divLines = 4;

  this.holder = new createjs.Container();
  this.holder.x = x;
  this.holder.y = y;
  stage.addChild(this.holder);

  this.graph = new createjs.Shape();
  this.graph.x = 0;
  this.graph.y = 0;
  this.holder.addChild(this.graph);

  this.title = new createjs.Text(name, "11px Verdana", "#ffffff");
  this.title.x = this.width - 3;
  this.title.y = this.height - 3;
  this.title.textAlign = 'right';
  this.title.textBaseline = 'bottom';
  this.holder.addChild(this.title);

  this.maxTxt = new createjs.Text('', "9px Verdana", "#ffffff");
  this.maxTxt.x = 3;
  this.maxTxt.y = 2;
  this.maxTxt.textAlign = 'left';
  this.maxTxt.textBaseline = 'top';
  this.holder.addChild(this.maxTxt);

  this.minTxt = new createjs.Text('', "9px Verdana", "#ffffff");
  this.minTxt.x = 3;
  this.minTxt.y = this.height - 3;
  this.minTxt.textAlign = 'left';
  this.minTxt.textBaseline = 'bottom';
  this.holder.addChild(this.minTxt);
}

BucketStatsGraph.prototype.update = function() {
  // Force bucket update
  this.stats.curBucket();

  // Calculate new maximums
  for (var i = 0; i < this.stats.buckets.length; ++i) {
    var bucketValue = this.bucketFn(this.stats.buckets[i]);
    if (bucketValue > this.maxValue) {
      this.maxValue = bucketValue;
    }
  }
  this.maxValue = Math.ceil(this.maxValue / this.tick) * this.tick;

  // Update Labels
  this.minTxt.text = 0;
  this.maxTxt.text = this.maxValue;

  // Draw Graph
  var gfx = this.graph.graphics;

  gfx.clear();
  gfx.beginStroke('rgba(0,0,255,0.8)');
  gfx.beginFill('rgba(0,0,255,0.1');
  gfx.drawRect(0, 0, this.width, this.height);
  gfx.endFill();
  gfx.endStroke();

  gfx.beginStroke('rgba(0,0,255,0.4)');
  for (var j = 1; j < this.divLines; ++j) {
    gfx.moveTo(0, this.height/this.divLines*j);
    gfx.lineTo(this.width, this.height/this.divLines*j);
  }
  gfx.endStroke();

  if (this.type === 'bar') {
    this.drawBarGraph(gfx);
  } else {
    this.drawLineGraph(gfx);
  }
};

BucketStatsGraph.prototype.drawLineGraph = function(gfx) {
  var valMag = 1 / this.maxValue * this.height;
  var gapWidth = this.width / (this.stats.bucketCount-2);

  gfx.beginStroke('rgba(0,0,255,0.9)');
  for (var i = 1; i < this.stats.buckets.length; ++i) {
    var bucketIdx = this.stats.buckets.length - 1 - i;
    var barIdx = this.stats.bucketCount - 1 - i;
    var bucket = this.stats.buckets[bucketIdx];
    var val = this.bucketFn(bucket);

    if (i === 0) {
      gfx.moveTo(this.width, this.height - (val * valMag));
    } else {
      gfx.lineTo(barIdx * gapWidth, this.height - (val * valMag));
    }
  }
  gfx.endStroke();
};

BucketStatsGraph.prototype.drawBarGraph = function(gfx) {
  var valMag = 1 / this.maxValue * this.height;
  var barWidth = this.width / (this.stats.bucketCount - 1);

  gfx.beginStroke('rgba(0,0,255,0.6)');
  gfx.beginFill('rgba(0,0,255,0.4)');
  gfx.moveTo(this.width, this.height);
  for (var i = 1; i < this.stats.buckets.length; ++i) {
    var bucketIdx = this.stats.buckets.length - 1 - i;
    var barIdx = this.stats.bucketCount - 1 - i;
    var bucket = this.stats.buckets[bucketIdx];
    var val = this.bucketFn(bucket);

    gfx.lineTo((barIdx+1) * barWidth, this.height - (val * valMag));
    gfx.lineTo((barIdx+0) * barWidth, this.height - (val * valMag));
    gfx.lineTo((barIdx+0) * barWidth, this.height);
  }
  gfx.lineTo(0, this.height);
  gfx.lineTo(this.width, this.height);
  gfx.endFill();
  gfx.endStroke();
};
