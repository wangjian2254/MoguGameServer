var settings = require('../../../../config/settings.json');
var request = require('request');
var gameUserDao = require('../../../dao/gameUserDao');
module.exports = function(app) {
	return new Handler(app);
};

var Handler = function(app) {
		this.app = app;
    this.channelService = app.get('channelService');
};

var handler = Handler.prototype;


function hasOnline(msg,session,next,app){
    var sessionService = app.get('sessionService');
    if(!sessionService.getByUid(username)) {
        next(null, {
            route:'disconnect',
            code: 404
        });
        return true;
    }
    return false;
}

/**
 * New client entry chat server.
 *
 * @param  {Object}   msg     request message
 * @param  {Object}   session current session object
 * @param  {Function} next    next stemp callback
 * @return {Void}
 */
handler.addRoom = function(msg, session, next) {
    if(hasOnline(msg,session,next,this.app)){
        return;
    }
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

    var channel = this.channelService.getChannel(roomid, true);
    var users = channel.getMembers();
    if(users.indexOf(username)>=0){
        next(null, {
            code:200,
            route:'addRoom',
            roomid:roomid
        });
        return;
    }
    if(users.length>=6){
        // 未来 可以通过 roomid　的第一个"_"前的数字 来决定房间最大人数。目前暂定为6人。
//        cb({msg:"房间已经满员，无法加入。"},null);
        next(null, {
            code:500,
            message:"房间已经满员，无法加入。",
            route:'addRoom'
        });
        return;
    }

    gameUserDao.getUserByAppcode(appcode,username,function(err,gameuser){
        if(err){
//            cb({msg:"获取用户信息错误。"});
            next(null, {
                code:500,
                message:"获取用户信息错误。",
                route:'addRoom'
            });
            return;
        }

        var param = {
            code:200,
            route: 'onAdd',
            user: username,
            roomid:roomid,
            userinfo: gameuser
        };

        channel.pushMessage(param);
        channel.add(username,  self.app.get('serverId'));
        var sessionService = self.app.get('sessionService');

        session.set('roomid', roomid);
        session.pushAll(function(err) {
            if(err) {
                console.error('set room for session service failed! error is : %j', err.stack);
            }
        });
        delete self.app.roomlisten[username];
        var channel2 = self.channelService.getChannel(appcode, false);
        if(!!channel2){
            var param2 = {
                code:200,
                route: 'memberChanged',
                changed:'in',
                user: username,
                roomid:roomid,
                userinfo: gameuser
            };
            channel2.pushMessage(param2);
        }
        next(null, {
            code:200,
            route:'addRoom',
            roomid:roomid
        });
    });
};


handler.quiteRoom = function(msg,session,next){
    if(hasOnline(msg,session,next,this.app)){
        return;
    }
    if(msg.roomid&&this.app.get('gameroom')[msg.roomid]&& typeof  this.app.get('gameroom')[msg.roomid][session.uid]){
        delete this.app.get('gameroom')[msg.roomid][session.uid]
        if(this.app.get('gameroomstatus')[msg.roomid]=='full'){
            this.app.get('gameroomstatus')[msg.roomid]='stop';
        }
    }
    var channel = this.channelService.getChannel(msg.roomid, false);
    // leave channel
    if( !! channel) {
        channel.leave(msg.username, this.app.get('serverId'));
        var param = {
            code:200,
            route: 'onLeave',
            roomid:msg.roomid,
            user: session.uid
        };
        channel.pushMessage(param);
    }
    var channel2 = this.channelService.getChannel(msg.appcode, false);
    if(!!channel2){
        var param2 = {
            code:200,
            route: 'memberChanged',
            changed:'out',
            user: session.uid,
            roomid:msg.roomid
        };
        channel2.pushMessage(param2);
    }


//    this.app.rpc.chat.chatRemote.kick(session, msg.roomid,session.uid,msg.appcode, this.app.get('serverId'), null);
//    this.app.rpc.chat.roomMemberRemote.changeRoomInfo(session, msg.appcode, 'out',  msg.roomid, session.uid,null, this.app.get('serverId'), false,null);
    next(null,{
        route:'quiteRoom',
        code:200
    });
    return;
}


/**
 * upload result point
 *
 * @param {Object} msg message from client
 * @param {Object} session
 * @param  {Function} next next stemp callback
 *
 */
handler.uploadPoint = function(msg, session, next) {
    if(hasOnline(msg,session,next,this.app)){
        return;
    }
    var param = {
        code:200,
        msg: msg.content,
        from: msg.username
    };
    var channel = this.channelService.getChannel(msg.roomid, true);

    channel.pushMessage('onChat', param);
//    this.app.rpc.chat.chatRemote.uploadPoint(session, msg.roomid,session.get('username'),msg.content, this.app.get('serverId'), null);
    next(null, {
        code:200,
        route:'uploadPoint'
    });
};

handler.uploadEndPoint = function(msg, session, next) {
    if(hasOnline(msg,session,next,this.app)){
        return;
    }
    var gameroom = this.app.get('gameroom');
    if(typeof  gameroom[msg.roomid] == "undefined"){
        gameroom[msg.roomid]={};
    }
    gameroom[msg.roomid][msg.username]=msg.content;
    this.getEndPoint(msg,session,next);
};

handler.getEndPoint = function(msg, session, next) {
    if(hasOnline(msg,session,next,this.app)){
        return;
    }
    // 如果有人退出了游戏，则新的房主，访问此接口，确保，局分处理完成
    var gameroom = this.app.get('gameroom');
    if(typeof  gameroom[msg.roomid] == "undefined"){
        this.app.get('gameroomstatus')[msg.roomid]="stop";
        var channel = this.channelService.getChannel( msg.appcode, false);

        if(channel){
            var param = {
                code:200,
                route: 'roomStatusChanged',
                status:'stop',
                roomid:msg.roomid
            };
            channel.pushMessage(param);
        }

//        this.app.rpc.chat.roomMemberRemote.changeRoomStatus(session, msg.appcode,"stop",msg.roomid, this.app.get('serverId'), false,null);
        next(null, {
            code:200,
            route:'replaygame'// 可以开始新游戏了
        });
        return;
    }
    if(gameroom[msg.roomid][msg.username]==null){
        delete gameroom[msg.roomid][msg.username];
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
        var channel2 = this.channelService.getChannel( msg.appcode, false);

        if(channel2){
            var param = {
                code:200,
                route: 'roomStatusChanged',
                status:'stop',
                roomid:msg.roomid
            };
            channel2.pushMessage(param);
        }

//        this.app.rpc.chat.roomMemberRemote.changeRoomStatus(session, msg.appcode,"stop",msg.roomid, this.app.get('serverId'), false,null);
        //
        var channel = this.channelService.getChannel(msg.roomid, false);
        var postparam={game:msg.appcode};
        var i=0;
        for(var p in gameroom[msg.roomid]){
            postparam['username'+i]=p;
            postparam['point'+i]=gameroom[msg.roomid][p];
            i++;
        }
        postparam['num']=i;
        var users=[];
        request.post(settings.moguuploadpointurl, {form:postparam},function(error,response,body){
            if(!error && response.statusCode == 200){
//                console.log(fs.realpathSync('.'));
                var result = JSON.parse(body);
                if(result.success){
                    for(var i=0;i<result.result.length;i++){
                        gameUserDao.updateGameUserPoint(msg.appcode,result.result[i],function(err,u){
                            if(!err){
                                users.push(u);
                            }
                        });
                    }
                }
            }
            if(!!channel){
                var param = {
                    code:200,
                    roomid: msg.roomid,
                    users:users,
                    endpoints:gameroom[msg.roomid]
                };
                channel.pushMessage('onEndPoint', param);
            }
        });

//        this.app.rpc.chat.chatRemote.pushEndPoint(session, msg.roomid, msg.appcode,session.get('username'),gameroom[msg.roomid], this.app.get('serverId'), null);
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
    if(hasOnline(msg,session,next,this.app)){
        return;
    }
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
    if(hasOnline(msg,session,next,this.app)){
        return;
    }
    this.app.get('gameroomstatus')[msg.roomid]=msg.status;
    var channel = this.channelService.getChannel(msg.appcode, false);

    if(channel){
        var param = {
            code:200,
            route: 'roomStatusChanged',
            status:msg.status,
            roomid:msg.roomid
        };
        channel.pushMessage(param);
    }

//    this.app.rpc.chat.roomMemberRemote.changeRoomStatus(session, msg.appcode,msg.status,msg.roomid, this.app.get('serverId'), false,null);

    next(null, {
        code:200,
        route:'changeRoomStatus'
    });
    return;
}


