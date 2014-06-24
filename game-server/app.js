var pomelo = require('pomelo');
var routeUtil = require('./app/util/routeUtil');
/**
 * Init app for client.
 */
var app = pomelo.createApp();
app.set('name', 'chatofpomelo-websocket');

// app configuration
//app.configure('production|development', 'connector', function(){
//    app.set('connectorConfig',
//        {
//            connector : pomelo.connectors.sioconnector,
//            heartbeat : 3,
//            useDict : true,
//            useProtobuf : true
//        });
//});
app.configure('production|development', 'connector', function(){
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
//app.configure('production|development', 'gate', function(){
//    app.set('connectorConfig',
//        {
//            connector : pomelo.connectors.sioconnector,
//            useProtobuf : true
//        });
//});
app.configure('production|development', 'gate', function(){
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