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
    if(this.app.get('gameroomstatus')[msg.roomid]=="playing"){
        next(null,{
            code:500,
            route:'addRoom',
            message:"房间正在游戏中，无法进入。"
        });
        return;
    }
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
	self.app.rpc.chat.chatRemote.add(session, roomid,username,appcode, self.app.get('serverId'), true, function(err,gameuser,usernum){
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
        if(usernum>=6){
            // 未来 可以通过 roomid　的第一个"_"前的数字 来决定房间最大人数。目前暂定为6人。
            self.app.get('gameroomstatus')[msg.roomid]='full';
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
    if(session.get('roomid')&&app.get('gameroom')[session.get('roomid')]&& typeof  app.get('gameroom')[session.get('roomid')][session.uid]){
        delete app.get('gameroom')[session.get('roomid')][session.uid]
        if(app.get('gameroomstatus')[session.get('roomid')]=='full'){
            app.get('gameroomstatus')[session.get('roomid')]='stop';
        }
    }
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
    var gameroom = this.app.get('gameroom');
    if(typeof  gameroom[msg.roomid] == "undefined"){
        gameroom[msg.roomid]={};
    }
    gameroom[msg.roomid][msg.username]=msg.content;
    this.getEndPoint(msg,session,next);
};

handler.getEndPoint = function(msg, session, next) {
    // 如果有人退出了游戏，则新的房主，访问此接口，确保，局分处理完成
    var gameroom = this.app.get('gameroom');
    if(typeof  gameroom[msg.roomid] == "undefined"){

        next(null, {
            code:200,
            route:'replaygame'// 可以开始新游戏了
        });
        return;
    }
    var f=true;
    for(var p in gameroom[msg.roomid]){
        if(gameroom[msg.roomid][p]===null){
            f=false;
            break;
        }
    }
    if(f){
        // 所有人局分都上传完了，就是一局结束了
        this.app.get('gameroomstatus')[msg.roomid]="stop";
        this.app.rpc.chat.roomMemberRemote.changeRoomStatus(session, msg.appcode,"stop",msg.roomid,msg.username, self.app.get('serverId'), false,null);
        //
        this.app.rpc.chat.chatRemote.pushEndPoint(session, msg.roomid, msg.appcode,session.get('username'),gameroom[msg.roomid], this.app.get('serverId'), null);
        next(null, {
            code:200,
            result:gameroom[msg.roomid],
            route:'getEndPoint'
        });
        return;
    }else{
        next(null, {
            code:200,
            route:'getEndPoint'
        });
        return;
    }




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
    for(var i=0;i<msg.members;i++){
        this.app.get('gameroom')[msg.roomid][msg.members[i]]=null;
    }
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


