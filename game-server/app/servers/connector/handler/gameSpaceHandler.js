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
    if(!sessionService.getByUid(msg.username)) {
        next(null, {
            route:'disconnect',
            code: 404
        });
        return true;
    }
    return false;
}



handler.quiteRoom = function(msg,session,next){
    if(hasOnline(msg,session,next,this.app)){
        return;
    }

    var channel2 = this.channelService.getChannel(msg.appcode, false);
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
        session.set('roomid',null);
        session.push('roomid');
    }

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
    if(msg.roomid&&this.app.get('gameroom')[msg.roomid]&& typeof  this.app.get('gameroom')[msg.roomid][session.uid] == "undefined"){
        delete this.app.get('gameroom')[msg.roomid][session.uid];

    }
    if(channel.getMembers().length<6&&channel2){
        var s='stop';
        for(var i=0;i<channel.getMembers().length;i++){
            if(this.app.gameuserstatus[channel.getMembers()[i]]=='playing'){
               s='playing';
                break;
            }
        }
        var param = {
            code:200,
            route: 'roomStatusChanged',
            status:s,
            roomid:msg.roomid
        };
        channel2.pushMessage(param);
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
    this.app.gameuserstatus[msg.username]='playing';
    var channel = this.channelService.getChannel(msg.roomid, true);
    var gameroom = this.app.get('gameroompoint');
    if(typeof  gameroom[msg.roomid] == "undefined"){
        gameroom[msg.roomid]={};
    }
    gameroom[msg.roomid][msg.username]=msg.content;
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
    this.app.gameuserstatus[msg.username]='stop';
    // 如果有人退出了游戏，则新的房主，访问此接口，确保，局分处理完成
    var channelGame = this.channelService.getChannel( msg.appcode, false);
    var channelRoom = this.channelService.getChannel( msg.roomid, false);
    var gameroom = this.app.get('gameroom');
    if(typeof  gameroom[msg.roomid] == "undefined"){
        next(null, {
            code:200,
            route:'replaygame'// 可以开始新游戏了
        });
        return;
    }
    if(gameroom[msg.roomid][msg.username]==null){
        gameroom[msg.roomid][msg.username]=this.app.get('gameroompoint')[msg.roomid][msg.username];
    }

    if(channelGame){
        var s='stop';
        if(channelRoom){
            if(channelRoom.getMembers().length<6){
                for(var i=0;i<channelRoom.getMembers().length;i++){
                    if(this.app.gameuserstatus[channelRoom.getMembers()[i]]=='playing'){
                        s='playing';
                        break;
                    }
                }
            }
            if(s=='stop'&&channelRoom.getMembers().length==6){
                s='full';
            }
        }
        var param = {
            code:200,
            route: 'roomStatusChanged',
            status:s,
            roomid:msg.roomid
        };
        channelGame.pushMessage(param);
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


//        this.app.rpc.chat.roomMemberRemote.changeRoomStatus(session, msg.appcode,"stop",msg.roomid, this.app.get('serverId'), false,null);
        //
        var postparam={game:msg.appcode};
        var i=0;
        for(var p in gameroom[msg.roomid]){
            postparam['username'+i]=p;
            postparam['point'+i]=gameroom[msg.roomid][p];
            i++;
        }
        postparam['num']=i;
        var users=[];
        gameroom[msg.roomid]=null;
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
            if(!!channelRoom){
                var param = {
                    code:200,
                    roomid: msg.roomid,
                    users:users,
                    endpoints:gameroom[msg.roomid]
                };
                channelRoom.pushMessage('onEndPoint', param);
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
    delete this.app.get('gameroom')[msg.roomid];
    delete this.app.get('gameroompoint')[msg.roomid];

//    for(var i=0;i<msg.members;i++){
//        this.app.get('gameroom')[msg.roomid][msg.members[i]]=null;
//    }
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
    var channelGame = this.channelService.getChannel(msg.appcode, false);
    var channelRoom = this.channelService.getChannel( msg.roomid, false);
    if(channelGame){
        var param = {
            code:200,
            route: 'roomStatusChanged',
            status:msg.status,
            roomid:msg.roomid
        };
        channelGame.pushMessage(param);

        if(channelRoom){
            for(var i=0;i<channelRoom.getMembers().length;i++){
                this.app.gameuserstatus[channelRoom.getMembers()[i]]==msg.status;
            }
        }

    }

//    this.app.rpc.chat.roomMemberRemote.changeRoomStatus(session, msg.appcode,msg.status,msg.roomid, this.app.get('serverId'), false,null);

    next(null, {
        code:200,
        route:'changeRoomStatus'
    });
    return;
}


