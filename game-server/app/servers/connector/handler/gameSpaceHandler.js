module.exports = function(app) {
	return new Handler(app);
};

var Handler = function(app) {
		this.app = app;
};

var handler = Handler.prototype;

/**
 * New client entry chat server.
 *
 * @param  {Object}   msg     request message
 * @param  {Object}   session current session object
 * @param  {Function} next    next stemp callback
 * @return {Void}
 */
handler.addRoom = function(msg, session, next) {
	var self = this;
	var roomid = msg.roomid;
    var appcode = msg.appcode;
	var username = msg.username
	var sessionService = self.app.get('sessionService');

    //第一次登陆
    if( ! sessionService.getByUid(username)) {
        session.bind(username);
        session.set('username', username);
        session.set('roomid', roomid);
        session.pushAll(function(err) {
            if(err) {
                console.error('set room for session service failed! error is : %j', err.stack);
            }
        });
        session.on('closed', onUserLeave.bind(null, self.app));
    }
	//put user into channel
	self.app.rpc.chat.chatRemote.add(session, roomid,username,appcode, self.app.get('serverId'), true, function(err,gameuser){
        if(err){
            var message='获取房间内玩家列表失败';
            if(typeof err.msg == 'string'){
                message=err.msg;
            }
            next(null,{
                code:500,
                route:'addRoom',
                message:message
            });
            return;
        }

        self.app.rpc.chat.roomMemberRemote.changeRoomInfo(session, appcode,'in',roomid,username,gameuser, self.app.get('serverId'), false,null);
        next(null, {
            code:200,
            route:'addRoom',
            roomid:roomid
		});
	});
};


handler.quiteRoom = function(msg,session,next){
    this.app.rpc.chat.chatRemote.kick(session, msg.roomid,session.get('username'),session.get('room'), this.app.get('serverId'), null);
    this.app.rpc.chat.roomMemberRemote.changeRoomInfo(session, session.get('room'), 'out',  msg.roomid, session.get('username'),null, this.app.get('serverId'), false,null);
    next(null,{
        route:'quiteRoom',
        code:200
    });
    return;
}



/**
 * User log out handler
 *
 * @param {Object} app current application
 * @param {Object} session current session object
 *
 */
var onUserLeave = function(app, session) {
	if(!session || !session.uid) {
		return;
	}
	app.rpc.chat.chatRemote.kick(session, session.get('roomid'),session.uid,session.get('room'), app.get('serverId') , null);
    app.rpc.chat.roomMemberRemote.changeRoomInfo(session, session.get('room'), 'out', session.get('roomid'), session.get('username'),null, app.get('serverId'), false,null);
};



/**
 * upload result point
 *
 * @param {Object} msg message from client
 * @param {Object} session
 * @param  {Function} next next stemp callback
 *
 */
handler.uploadPoint = function(msg, session, next) {
    this.app.rpc.chat.chatRemote.uploadPoint(session, msg.roomid,session.get('username'),msg.content, this.app.get('serverId'), null);
    next(null, {
        code:200,
        route:'uploadPoint'
    });
};

handler.uploadEndPoint = function(msg, session, next) {
    if(!this.app.get('gameroom')[msg.roomid]){
        this.app.get('gameroom')[msg.roomid]={};
    }
    this.app.get('gameroom')[msg.roomid][msg.username]=msg.content;
    next(null, {
        code:200,
        route:'uploadEndPoint'
    });
    return;


};

handler.getEndPoint = function(msg, session, next) {
    var result=null
    if(this.app.get('gameroom')[msg.roomid]){
        result =this.app.get('gameroom')[msg.roomid];
    }
    next(null, {
        code:200,
        route:'getEndPoint',
        endpoints:result
    });
    return;


};

/**
 * clean result point
 *
 * @param {Object} msg message from client
 * @param {Object} session
 * @param  {Function} next next stemp callback
 *
 */

handler.cleanPoint = function(msg, session, next) {
    this.app.get('gameroom')[msg.roomid]={};
    next(null, {
        code:200,
        route:'cleanPoint'
    });
    return;


};


handler.changeRoomStatus = function(msg, session, next){
    this.app.get('gameroomstatus')[msg.roomid]=msg.status;
    this.app.rpc.chat.roomMemberRemote.changeRoomStatus(session, msg.appcode,msg.status,msg.roomid,username, self.app.get('serverId'), false,null);

    next(null, {
        code:200,
        route:'changeRoomStatus'
    });
    return;
}


