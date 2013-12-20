function timestamp() {
  var curDate = new Date();
  return curDate.getHours() + ':' + curDate.getMinutes() +
    ':' + curDate.getSeconds();
}

function log() {
  var entry = '<li>';
  entry += '[' + timestamp() + '] ';
  for (var i = 0; i < arguments.length; ++i) {
    if (i > 0) entry += ' ';

    if (arguments[i] === null) {
      entry += 'null';
    } else if (arguments[i] === undefined) {
      entry += 'undefined';
    } else if (arguments[i] instanceof Object) {
      entry += JSON.stringify(arguments[i], null, 1);
    } else {
      entry += arguments[i];
    }
  }
  entry += '</li>';
  $('#logs').prepend(entry);
}
