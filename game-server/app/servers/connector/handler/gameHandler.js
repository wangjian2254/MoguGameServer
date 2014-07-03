/**
 * Created by wangjian2254 on 14-6-29.
 */
var roomDao = require('../../../dao/roomDao');
var gameUserDao = require('../../../dao/gameUserDao');
module.exports = function(app) {
    return new Handler(app);
};

var Handler = function(app) {
    this.app = app;
    this.channelService = app.get('channelService');
};

var handler = Handler.prototype;

handler.checkOnLine = function(msg,session,next){
    next(null, {
        route:'checkOnLine',
        code: 200
    });
    return;
}


handler.addRoomList = function(msg, session, next) {
    var self = this;
    var appcode = msg.appcode;//appcode
    var username = msg.username;
    var sessionService = self.app.get('sessionService');
    //第一次登陆
    if( ! sessionService.getByUid(username)) {
        session.bind(username);
        session.set('username', username);
        session.set('room', appcode);
        session.pushAll(function(err) {
            if(err) {
                console.error('set room for session service failed! error is : %j', err.stack);
            }
        });
        session.on('closed', onUserLeave.bind(null, self.app));
    }
    console.log('addRoomList  start');
    roomDao.getRoomByAppcode(msg.appcode,function(err,roominfo){

        if(err){
            console.log(err);
            next(null,{
                route:'addRoomList',
                code: 500,
                error: true,
                message: '游戏房间信息尚未定义。'
            });
            return;
        }else{
            //put user into channel
            gameUserDao.updateGameUser(appcode,msg,function(err0,gameuser){
                if(err0){
                    console.log(err0);
                    next(null,{
                        route:'addRoomList',
                        code: 500,
                        error: true,
                        message: '用户信息缓存错误。'
                    });
                }else{
                    self.app.rpc.chat.roomMemberRemote.add(session, appcode,username,msg, self.app.get('serverId'), true, function(err,gameuser){

                        next(null, {
                            route:'queryRoomList',
                            code:200,
                            roomlist:query(0,18,roominfo,self),
                            start:0
                        });
                    });
                }
            })

        }
    });
}

var query = function(start,limit,roominfo,self){
    var roominfolist = [];
    var item=null;
    var room=null;



    for (var i=start;i<start+limit;i++){
        if(roominfo.roomlist.length<=i+1){
            break;
        }

        item = roominfo.roomlist[i];
        room = {};
        room['roomname'] = item['roomname'];
        room['maxnum'] = item['maxnum'];
        room['appcode'] = item['appcode'];
        room['spaceid'] = item['spaceid'];
        roominfolist.push(room);
    }
    return roominfolist;
}

handler.queryRoomList = function(msg,session,next){
    var self = this;
    var appcode = msg.appcode;//appcode
    var sessionService = self.app.get('sessionService');

    var roominfo = self.app.roominfo[appcode];
    if(!roominfo){
        next(null,{
            route:'queryRoomList',
            code: 500,
            error: true,
            message: '游戏房间信息尚未定义。'
        });
        return;
    }
    var start = msg.start|0;
    var limit = msg.limit|18;

    next(null,{
        route:'queryRoomList',
        code:200,
        roomlist:query(start,limit,roominfo,self),
        start:start
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
    app.rpc.chat.roomMemberRemote.kick(session,  session.get('room'),session.uid, app.get('serverId'), null);
};


handler.quiteRoomList = function(msg,session,next){
    this.app.rpc.chat.roomMemberRemote.kick(session, session.get('room'),session.uid, this.app.get('serverId'), null);
    next(null,{
        code:200
    });
    return;
}


handler.getMembersByRoom = function(msg,session,next){
    this.app.rpc.chat.chatRemote.getRoomMembers(session,msg.roomid,msg.appcode,false,function(err,users){
        if(err){
            next(null,{
                code:500,
                route:'getMembersByRoom',
                message:'获取房间内玩家列表失败'
            });
            return;
        }
        next(null,{
            code:200,
            route:'getMembersByRoom',
            romm:{
                roomid:msg.roomid,
                users:users,
                appcode:msg.appcode
            }
        });
        return;
    })
}