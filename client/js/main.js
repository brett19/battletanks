require.config({
  paths: {
    jquery: 'jquery-1.10.2.min',
    createjs: 'createjs-2013.12.12.min'
  },
  baseUrl: '/client/js/',
  urlArgs : "v="+new Date().getTime()
});

require(['app'], function(App){
  App.run();
});