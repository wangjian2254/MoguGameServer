var pomelo = require('pomelo');
var routeUtil = require('./app/util/routeUtil');
/**
 * Init app for client.
 */

var app = pomelo.createApp();
app.set('name', 'mogu-gameserver');
//todo: 用户信息 和 房间列表信息 需要使用 memcache 框架来完成，保证内存中数据一致性。（也可以使用数据库，前期可以使用数据库，后期改为memcache）
app.set('alluser',{},true);
//app.set('roominfo',{},true);
app.set('gameroom',{},true);

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

var syncRommInfo = require('./app/components/syncRoomInfo');
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
            closeTimeout : 60,
            heartbeatTimeout : 60,
            heartbeatInterval : 25
        });
    app.load(syncRommInfo,{interval:1000*60*10});
});
//app.configure('production|development', 'gate', function(){
//    app.set('connectorConfig',
//        {
//            connector : pomelo.connectors.hybridconnector,
//            useProtobuf : true
//        });
//});
app.configure('production|development', 'gate', function(){
    var dbclient = require('./app/dao/mysql/mysql').init(app);
    app.set('dbclient', dbclient);
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
app.configure('production|development', function() {
    var dbclient = require('./app/dao/mysql/mysql').init(app);
    app.set('dbclient', dbclient);
    // route configures
    app.route('chat', routeUtil.chat);

    // filter configures
    app.filter(pomelo.timeout());
});

// start app
app.start();

process.on('uncaughtException', function(err) {
    console.error(' Caught exception: ' + err.stack);
});