define([], function() {

function BucketStats(interval, bucketCount) {
  this.interval = interval;
  this.bucketCount = bucketCount;
  this.buckets = [];
  this.start = Math.floor(this.curTime() / this.interval) * this.interval;
}
BucketStats.prototype.curTime = function() {
  return (new Date()).getTime();
};
BucketStats.prototype.curBucket = function() {
  var bucketNum = Math.floor((this.curTime() - this.start) / this.interval);
  while (bucketNum >= this.bucketCount) {
    var oldBucket = this.buckets.shift();
    oldBucket.value = 0;
    oldBucket.count = 0;
    this.buckets.push(oldBucket);
    this.start += this.interval;
    bucketNum--;
  }
  while (bucketNum >= this.buckets.length) {
    this.buckets.push({
      value: 0,
      count: 0
    });
  }
  return this.buckets[bucketNum];
};
BucketStats.prototype.log = function(value) {
  var bucket = this.curBucket();
  bucket.value += value;
  bucket.count++;
};

return BucketStats;
});