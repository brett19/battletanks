function PosSoundManager() {
  this.listenerPos = {x: 0, y: 0};
  this.sounds = [];
}

PosSoundManager.prototype.setPosition = function(x, y) {
  this.listenerPos.x = x;
  this.listenerPos.y = y;

  for (var i = 0; i < this.sounds; ++i) {
    this.sounds[i].volume = this.calcVolume(this.sounds[i].x, this.sounds[i].y) * this.sounds[i].baseVolume;
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

  var dX = Math.abs(x - this.listenerPos.x);
  var dY = Math.abs(y - this.listenerPos.y);
  var dist = Math.sqrt(dX*dX + dY*dY);

  if (dist < minDist) {
    return 1.0;
  } else if (dist > maxDist) {
    return 0;
  }

  var scaledDist = (dist - minDist) / (maxDist - minDist);
  return 1.0 - scaledDist;
};

PosSoundManager.prototype.play = function(opts) {
  //return;

  var self = this;

  var sound = createjs.Sound.play(opts.name);
  sound.x = opts.x !== undefined ? opts.x : this.listenerPos.x;
  sound.y = opts.y !== undefined ? opts.y : this.listenerPos.y;
  sound.baseVolume = opts.volume !== undefined ? opts.volume : 1;
  sound.volume = this.calcVolume(sound.x, sound.y) * sound.baseVolume;
  if (!opts.loop) {
    sound.addEventListener("loop", function() {
      self.removeSound(sound);
    });
  }
  this.sounds.push(sound);

  return sound;
};

var soundMgr = new PosSoundManager();