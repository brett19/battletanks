function PosSoundManager() {
  this.listenerPos = {x: 0, y: 0};
  this.sounds = [];
}

PosSoundManager.prototype.setPosition = function(x, y) {
  this.listenerPos.x = x;
  this.listenerPos.y = y;

  for (var i = 0; i < this.sounds; ++i) {
    this.sounds[i].volume = this.calcVolume(this.sounds[i].x, this.sounds[i].y);
  }
};

PosSoundManager.prototype.removeSound = function(sound) {
  var soundIdx = this.sounds.indexOf(sound);
  if (soundIdx >= 0) {
    this.sounds.splice(soundIdx, 1);
  }
};

PosSoundManager.prototype.calcVolume = function(x, y) {
  var minDist = 30;
  var maxDist = 750;

  var dX = x - this.listenerPos.x;
  var dY = y - this.listenerPos.y;
  var dist = Math.sqrt(dX*dX + dY*dY);

  var volume = (dist - minDist) / (maxDist - minDist);
  if (volume < 0.0) {
    return 1.0;
  } else if (volume > 1.0) {
    return 0.0;
  } else {
    return 1.0 - volume;
  }
};

PosSoundManager.prototype.play = function(opts) {
  return;

  var self = this;

  var sound = createjs.Sound.play(opts.name);
  sound.x = opts.x !== undefined ? opts.x : this.listenerPos.x;
  sound.y = opts.y !== undefined ? opts.y : this.listenerPos.y;
  sound.volume = this.calcVolume(sound.x, sound.y);
  sound.addEventListener("loop", function() {
    self.removeSound(sound);
  });
  this.sounds.push(sound);
};

var soundMgr = new PosSoundManager();