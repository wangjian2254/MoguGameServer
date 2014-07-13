var pomelo = require('pomelo');
//var routeUtil = require('./app/util/routeUtil');
/**
 * Init app for client.
 */

var app = pomelo.createApp();
app.set('name', 'mogu-gameserver');

// app configuration
//app.configure('production|development', 'connector', function(){
//    app.set('connectorConfig',
//        {
//            connector : pomelo.connectors.hybridconnector,
//            heartbeat : 3,
//            useDict : true,
//            useProtobuf : true
//        });
//});

var syncRommMembers = require('./app/components/syncRoomMembers');
app.loadConfig('mysql', app.getBase() + '/../shared/config/mysql.json');

app.configure('production|development', 'connector', function(){
    var dbclient = require('./app/dao/mysql/mysql').init(app);
    app.set('dbclient', dbclient);
    app.set('connectorConfig',
        {
            connector : pomelo.connectors.sioconnector,
            //websocket, htmlfile, xhr-polling, jsonp-polling, flashsocket
            transports : ['websocket'],
            heartbeats : true,
            closeTimeout : 40,
            heartbeatTimeout : 40,
            heartbeatInterval : 25
        });

    app.set('alluser',{},true);
    app.set('roominfo',{},true);
    app.set('roomlisten',{},true);
    app.set('game',{},true);
    app.set('gameroom',{},true);
    app.set('gameroompoint',{},true);
    app.set('gameroomstatus',{},true);
    app.load(syncRommMembers,{interval:2000*1});
});
//app.configure('production|development', 'gate', function(){
//    app.set('connectorConfig',
//        {
//            connector : pomelo.connectors.hybridconnector,
//            useProtobuf : true
//        });
//});
app.configure('production|development', 'gate', function(){
//    var dbclient = require('./app/dao/mysql/mysql').init(app);
//    app.set('dbclient', dbclient);
    app.set('connectorConfig',
        {
            connector : pomelo.connectors.sioconnector,
            //websocket, htmlfile, xhr-polling, jsonp-polling, flashsocket
            transports : ['websocket'],
            heartbeats : true,
            closeTimeout : 60,
            heartbeatTimeout : 60,
            heartbeatInterval : 25
        });
});

// app configure
//app.configure('production|development', function() {
//    var dbclient = require('./app/dao/mysql/mysql').init(app);
//    app.set('dbclient', dbclient);
//    // route configures
//    app.route('chat', routeUtil.chat);
//
//    // filter configures
//    app.filter(pomelo.timeout());
//    app.load(syncRommInfo,{interval:1000*60*10});
//});

// start app
app.start();

process.on('uncaughtException', function(err) {
    console.error(' Caught exception: ' + err.stack);
});