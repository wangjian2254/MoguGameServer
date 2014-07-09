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

        session.on('closed', onUserLeave.bind(null, self.app));
    }
    session.set('room', appcode);
    session.pushAll(function(err) {
        if(err) {
            console.error('set room for session service failed! error is : %j', err.stack);
        }
    });
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
                    var channel = self.channelService.getChannel(appcode, true);
                    if( !! channel) {
                        channel.add(username, self.app.get('serverId'));
                    }
                    next(null, {
                        route:'queryRoomList',
                        code:200,
                        roomlist:query(0,18,roominfo),
                        roomcount:roominfo.roomlist.length,
                        start:0
                    });
                }
            });
        }
    });
};

var query = function(start,limit,roominfo){
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
        room['roomid'] = item['spaceid'];
        roominfolist.push(room);
    }
    return roominfolist;
}

handler.queryRoomList = function(msg,session,next){
    roomDao.getRoomByAppcode(msg.appcode,function(err,roominfo) {

        if (err) {
            console.log(err);
            next(null, {
                route: 'queryRoomList',
                code: 500,
                error: true,
                message: '游戏房间信息尚未定义。'
            });
            return;
        } else {
            var start = msg.start|0;
            var limit = msg.limit|18;

            next(null,{
                route:'queryRoomList',
                code:200,
                roomlist:query(start,limit,roominfo),
                roomcount:roominfo.roomlist.length,
                start:start
            });
            return;
        }
    });


}

handler.quickGame = function(msg,session,next){
    var self = this;
    roomDao.getRoomByAppcode(msg.appcode,function(err,roominfo) {

        if (err) {
            console.log(err);
            next(null, {
                route: 'quickGame',
                code: 500,
                error: true,
                message: '游戏房间信息尚未定义。'
            });
            return;
        } else {
            for(var i=roominfo.roomlist.length-1;i>=0;i--){
                if(!self.app.get('gameroomstatus')[roominfo.roomlist[i]['spaceid']]||self.app.get('gameroomstatus')[roominfo.roomlist[i]['spaceid']]!='stop'){
                    next(null,{
                        route:'quickGame',
                        code:200,
                        roomid:roominfo.roomlist[i]['spaceid']
                    });
                    return;
                }
            }
            next(null,{
                route:'quickGame',
                code:200,
                roomid:roominfo.roomlist[roominfo.roomlist.length]['spaceid']
            });
            return;
        }
    });
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
    var appcode = session.get('room');
    var channel2 = app.get('channelService').getChannel(appcode, false);
    // leave channel

    if(session.get('roomid')) {
        var roomid=session.get('roomid');
        var channel = app.get('channelService').getChannel(roomid, false);
        // leave channel
        if( !! channel) {
            channel.leave(session.uid, app.get('serverId'));
            var param = {
                code:200,
                route: 'onLeave',
                roomid:roomid,
                user: session.uid
            };
            channel.pushMessage(param);
        }

        if(!!channel2){
            var param2 = {
                code:200,
                route: 'memberChanged',
                changed:'out',
                user: username,
                roomid:roomid
            };
            channel2.pushMessage(param2);
        }

        if(app.get('gameroom')[session.get('roomid')]&& typeof  app.get('gameroom')[session.get('roomid')][session.uid]){
            delete app.get('gameroom')[session.get('roomid')][session.uid]
            if(app.get('gameroomstatus')[session.get('roomid')]=='full'){
                app.get('gameroomstatus')[session.get('roomid')]='stop';
            }
        }
    }
    if( !! channel2) {
        channel2.leave(session.uid,  app.get('serverId'));
    }
    try{
        delete app.get('alluser')[appcode][session.uid];
    }catch (err){

    }


};


handler.quiteRoomList = function(msg,session,next){
//    this.app.rpc.chat.roomMemberRemote.kick(session, msg.appcode,session.uid, this.app.get('serverId'), null);
    var channel = this.channelService.getChannel(msg.appcode, false);
    // leave channel
    if( !! channel) {
        channel.leave(session.uid, app.get('serverId'));
    }
    try{
        delete this.app.get('alluser')[msg.appcode][session.uid];
    }catch (err){

    }
    next(null,{
        code:200,
        route:'quiteRoomList'
    });
    return;
}


handler.getMembersByRoom = function(msg,session,next){
    var status = this.app.get('gameroomstatus')[msg.roomid];
    var channel = this.channelService.getChannel(msg.roomid, false);
    if(!status){
        status='stop';
    }
    if( !! channel) {
        gameUserDao.queryGameUsersByUsernames(msg.appcode,channel.getMembers(),function(err,users){
            if(err){
                next(null,{
                    code:500,
                    route:'getMembersByRoom',
                    message:'获取房间内玩家列表失败'
                });
                return;
            }else{
                next(null,{
                    code:200,
                    route:'getMembersByRoom',
                    room:{
                        status:status,
                        roomid:msg.roomid,
                        users:users,
                        appcode:msg.appcode
                    }
                });
            }
        });
    }else{
        next(null,{
            code:200,
            route:'getMembersByRoom',
            room:{
                status:status,
                roomid:msg.roomid,
                users:[],
                appcode:msg.appcode
            }
        });
    }

//    this.app.rpc.chat.chatRemote.getRoomMembers(session,msg.roomid,msg.appcode,false,function(err,users){
//        if(err){
//            next(null,{
//                code:500,
//                route:'getMembersByRoom',
//                message:'获取房间内玩家列表失败'
//            });
//            return;
//        }
//        if(!status){
//            status='stop';
//        }
//        next(null,{
//            code:200,
//            route:'getMembersByRoom',
//            room:{
//                status:status,
//                roomid:msg.roomid,
//                users:users,
//                appcode:msg.appcode
//            }
//        });
//        return;
//    })
};


handler.getRoomInfoByRoomId = function(msg,session,next){
    var self = this;
    roomDao.getRoomByAppcode(msg.appcode,function(err,roominfo) {

        if (err) {
            console.log(err);
            next(null, {
                route: 'getRoomInfoByRoomId',
                code: 500,
                error: true,
                message: '游戏房间信息尚未定义。'
            });
            return;
        } else {
            var room = {};
            for (var i=0;i<roominfo.roomlist.length;i++){
                if(roominfo.roomlist[i]['spaceid']==msg.roomid){
                    item = roominfo.roomlist[i];

                    room['roomname'] = item['roomname'];
                    room['maxnum'] = item['maxnum'];
                    room['roomid'] = item['spaceid'];
                    break;
                }
            }
            if(room){
                gameUserDao.queryGameUsersByUsernames(msg.appcode,channel.getMembers(),function(err,users){
                    if(err){
                        next(null,{
                            code:500,
                            route:'getMembersByRoom',
                            message:'获取房间内玩家列表失败'
                        });
                        return;
                    }else{
                        var f=true;
                        for(var u in users){
                            if(u.username==session.uid){
                                f=false;
                                break;
                            }
                        }
                        if(!f){
                            next(null,{
                                code:501,
                                route:'getRoomInfoByRoomId'
                            });
                        }else{
                            room['users']=users;
                            next(null,{
                                code:200,
                                route:'getRoomInfoByRoomId',
                                room:room
                            });
                        }

                    }
                });
            }else{
                next(null,{
                    code:500,
                    route:'getRoomInfoByRoomId',
                    message:'房间已经不存在'
                });
                return;
            }

        }
    });

};