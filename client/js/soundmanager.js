function PosSoundManager() {
  this.listenerPos = {x: 0, y: 0};
  this.sounds = [];
}

PosSoundManager.prototype.setPosition = function(x, y) {
  this.listenerPos.x = x;
  this.listenerPos.y = y;

  for (var i = 0; i < this.sounds.length; ++i) {
    this.sounds[i].volume = this.calcVolume(
        this.sounds[i].x, this.sounds[i].y,
        this.sounds[i].vx, this.sounds[i].vy,
        this.sounds[i].freqSize) * this.sounds[i].baseVolume;
  }
};

PosSoundManager.prototype.removeSound = function(sound) {
  var soundIdx = this.sounds.indexOf(sound);
  if (soundIdx >= 0) {
    this.sounds.splice(soundIdx, 1);
  }
};

PosSoundManager.prototype.calcVolume = function(x, y, vx, vy, f) {
  return 0;

  var minDist = 30;
  var maxDist = 1000;

  var pX = x;
  var pY = y;

  // TODO: Coriolis Effect!
  /*
  if (vx !== undefined && vy !== undefined && f !== undefined) {
    pX += vx * f;
    pY += vy * f;
  }
  */

  var dX = Math.abs(pX - this.listenerPos.x);
  var dY = Math.abs(pY - this.listenerPos.y);
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
  var self = this;

  var sound = createjs.Sound.play(opts.name, {
    loop: (opts.loop !== true ? 0 : -1),
    volume: 0
  });
  sound.x = opts.x !== undefined ? opts.x : this.listenerPos.x;
  sound.y = opts.y !== undefined ? opts.y : this.listenerPos.y;
  sound.vx = opts.vx;
  sound.vy = opts.vy;
  sound.f = opts.f;
  sound.baseVolume = opts.volume !== undefined ? opts.volume : 1;
  sound.volume = this.calcVolume(sound.x, sound.y, sound.vx, sound.vy,
      sound.f) * sound.baseVolume;
  if (opts.loop !== true) {
    sound.addEventListener("complete", function() {
      self.removeSound(sound);
    });
  }
  this.sounds.push(sound);

  return sound;
};

var soundMgr = new PosSoundManager();
