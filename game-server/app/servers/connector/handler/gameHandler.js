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

function hasOnline(msg,session,next,app){
    var sessionService = app.get('sessionService');
    if(!sessionService.getByUid(msg.username)) {
        next(null, {
            route:'disconnect',
            code: 404
        });
        return true;
    }else if(!session.uid){
        next(null, {
            route:'disconnect',
            message:'登录异常，请重新登录',
            code: 404
        });
        return true;
    }
    return false;
}

handler.checkOnLine = function(msg,session,next){
    if(hasOnline(msg,session,next,this.app)){
        return;
    }
    next(null, {
        route:'checkOnLine',
        code: 200
    });
    return;
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
    var self = this;
    var roomid = msg.roomid;
    var appcode = msg.appcode;
    var username = msg.username;

    var sessionService = self.app.get('sessionService');
    if(!session.uid&&sessionService.getByUid(username)){
        sessionService.kickByUid(username);
    }
    //第一次登陆
    if( ! sessionService.getByUid(username)) {
        session.bind(username);
        session.set('username', username);

        session.on('closed', onUserLeave.bind(null, self.app));
    }
    session.set('room', appcode);
    session.set('roomid', roomid);
    session.pushAll(function(err) {
        if(err) {
            console.error('set room for session service failed! error is : %j', err.stack);
        }
    });

    if(this.app.get('gameroomstatus')[msg.roomid]=="playing"){
        next(null,{
            code:500,
            route:'addRoom',
            message:"房间正在游戏中，无法进入。"
        });
        return;
    }

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
        next(null, {
            code:500,
            message:"房间已经满员，无法加入。",
            route:'addRoom'
        });
        return;
    }

    gameUserDao.getUserByAppcode(appcode,username,function(err,gameuser){
        if(err){
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



handler.addRoomList = function(msg, session, next) {
    console.log('0');
    this.app.game[msg.appcode]=true;
    var self = this;
    var appcode = msg.appcode;//appcode
    var username = msg.username;
    var sessionService = self.app.get('sessionService');
    if(!session.uid&&sessionService.getByUid(username)){
        sessionService.kick(username);
    }
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
                    if( !! channel && channel.getMembers().indexOf(username)==-1) {
                        channel.add(username, self.app.get('serverId'));
                    }
                    next(null, {
                        route:'queryRoomList',
                        code:200,
                        roomlist:query(0,18,roominfo,self.app,username),
                        roomcount:roominfo.roomlist.length,
                        start:0
                    });
                }
            });
        }
    });
};

var query = function(start,limit,roominfo,app,username){
    var roominfolist = [];
    var item=null;
    var room=null;


    if(!app.roomlisten[username]){
        app.roomlisten[username]=[];
    }

    for (var i=start;i<start+limit;i++){
        if(roominfo.roomlist.length<i+1){
            break;
        }

        item = roominfo.roomlist[i];
        room = {};
        room['roomname'] = item['roomname'];
        room['maxnum'] = item['maxnum'];
        room['roomid'] = item['spaceid'];
        roominfolist.push(room);

        if(app.roomlisten[username].indexOf(room['roomid'])==-1){
            app.roomlisten[username].push(room['roomid']);
        }

    }
    return roominfolist;
}

handler.queryRoomList = function(msg,session,next){
    if(hasOnline(msg,session,next,this.app)){
        return;
    }
    var self = this;
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
                roomlist:query(start,limit,roominfo,self.app,msg.username),
                roomcount:roominfo.roomlist.length,
                start:start
            });
            return;
        }
    });


}

handler.quickGame = function(msg,session,next){
    if(hasOnline(msg,session,next,this.app)){
        return;
    }
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
    if( !! channel2) {
        channel2.leave(session.uid,  app.get('serverId'));
    }
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
                user: session.uid,
                roomid:roomid
            };
            channel2.pushMessage(param2);
        }

        if(app.get('gameroom')[session.get('roomid')]&& typeof  app.get('gameroom')[session.get('roomid')][session.uid]){
            try{
                delete app.get('gameroom')[session.get('roomid')][session.uid]
            }catch (err){
                console.error(err);
            }

            if(app.get('gameroomstatus')[session.get('roomid')]=='full'){
                app.get('gameroomstatus')[session.get('roomid')]='stop';
            }
        }
    }
    try{
        delete app.roomlisten[session.uid];
        if(app.get('alluser')[appcode]){
            delete app.get('alluser')[appcode][session.uid];
        }

    }catch (err){
        console.error(err);
    }
};


handler.quiteRoomList = function(msg,session,next){
    if(hasOnline(msg,session,next,this.app)){
        return;
    }
//    this.app.rpc.chat.roomMemberRemote.kick(session, msg.appcode,session.uid, this.app.get('serverId'), null);
    var channel = this.channelService.getChannel(msg.appcode, false);
    // leave channel
    if( !! channel) {
        channel.leave(session.uid, this.app.get('serverId'));
    }

    delete this.app.roomlisten[session.uid];

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

handler.addRoomListener = function(msg,session,next){
    if(hasOnline(msg,session,next,this.app)){
        return;
    }
    if(!this.app.roomlisten[msg.username]||this.app.roomlisten[msg.username].length==0){
        var channel = this.channelService.getChannel(msg.appcode, true);
        if( !! channel&&channel.getMembers().indexOf(msg.username)==-1) {
            channel.add(msg.username, this.app.get('serverId'));
        }
    }

    this.app.roomlisten[msg.username]=msg.roomids;

    next(null,{
        code:200,
        route:'addRoomListener'
    });
    return;
}


handler.getMembersByRoom = function(msg,session,next){
    if(hasOnline(msg,session,next,this.app)){
        return;
    }
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
    if(hasOnline(msg,session,next,this.app)){
        return;
    }
    var self = this;
    var members = self.channelService.getChannel(msg.roomid, true).getMembers();
    var f=true;
    for(var i=0;i<members.length;i++){
        if(members[i]==session.uid){
            f=false;
            break;
        }
    }

    if(f){
        console.log("501:"+msg.username);
        console.log("501:"+session.uid);
        console.log(members);
        if(members.length>0){
            console.log(members[0]);
        }
        next(null,{
            code:501,
            roomid:msg.roomid,
            route:'getRoomInfoByRoomId'
        });
        return;
    }
    var room=self.app.roominfo[msg.roomid];
    if(room){
        gameUserDao.queryGameUsersByUsernames(msg.appcode,members,function(err,users){
            if(err){
                next(null,{
                    code:500,
                    route:'getMembersByRoom',
                    message:'获取房间内玩家列表失败'
                });
                return;
            }else{

                room['users']=users;
                next(null,{
                    code:200,
                    route:'getRoomInfoByRoomId',
                    room:room
                });


            }
        });
    }else{
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
                room = {};
                for (var i=0;i<roominfo.roomlist.length;i++){
                    if(roominfo.roomlist[i]['spaceid']==msg.roomid){
                        item = roominfo.roomlist[i];

                        room['roomname'] = item['roomname'];
                        room['maxnum'] = item['maxnum'];
                        room['roomid'] = item['spaceid'];
                        self.app.roominfo[msg.roomid]=room;
                        break;
                    }
                }
                if(room){
                    gameUserDao.queryGameUsersByUsernames(msg.appcode,members,function(err,users){
                        if(err){
                            next(null,{
                                code:500,
                                route:'getMembersByRoom',
                                message:'获取房间内玩家列表失败'
                            });
                            return;
                        }else{

                            room['users']=users;
                            next(null,{
                                code:200,
                                route:'getRoomInfoByRoomId',
                                room:room
                            });


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
    }


};