/**
 * Created by wangjian2254 on 14-6-29.
 */
module.exports = function(app) {
    return new Handler(app);
};

var Handler = function(app) {
    this.app = app;
    this.channelService = app.get('channelService');
};

var handler = Handler.prototype;



handler.addRoomList = function(msg, session, next) {
    var self = this;
    var appcode = msg.appcode;//appcode
    var username = msg.username;
    var sessionService = self.app.get('sessionService');
    //duplicate log in
    if( !! sessionService.getByUid(username)) {
        next(null, {
            code: 500,
            error: true
        });
        return;
    }
    var roominfo = self.app.roominfo[msg.appcode];
    if(!roominfo){
        next(null,{
            code: 500,
            error: true,
            message: '游戏房间信息尚未定义。'
        });
        return;
    }
    console.log(msg);

    session.bind(username);
    session.set('username', username);
    session.set('room', appcode);
    session.push('room', function(err) {
        if(err) {
            console.error('set room for session service failed! error is : %j', err.stack);
        }
    });
    session.on('closed', onUserLeave.bind(null, self.app));

    //put user into channel
    self.app.rpc.chat.roommemberRemote.add(session, username,appcode,msg.userinfo, self.app.get('serverId'), appcode, true, function(){

        next(null, {
            code:200,
            roomlist:query(0,18,roominfo,self),
            start:0
        });
    });

}

var query = function(start,limit,roominfo,self){
    var roominfolist = [];
    var item=null;
    var room=null;
    var channel=null;
    var users = null;
    var user = null;
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
        room['headlist'] = [];
        room['nicknamelist'] = [];
        room['userlist'] = [];
        room['ranklist'] = [];
        room['pointlist'] = [];
        channel = self.channelService.getChannel(room.appcode, false);
        if(!!channel){
            channel.getMembers();
            if( !! channel) {
                users = channel.getMembers();
            }
            for(var i = 0; i < users.length; i++) {
                users[i] = self.app.get('alluser')[appcode][users[i]];
            }
            room['users']=users;
            for(var i = 0; i < users.length; i++) {
                user = users[i];
                room['headlist'].push(user.head);
                room['nicknamelist'].push(user.nickname);
                room['userlist'].push(user.username);
                room['ranklist'].push(user.rank);
                room['pointlist'].push(user.point);
            }
        }
        roominfolist.push(room);
    }
    return roominfolist;
}

handler.queryRoomList = function(msg,session,next){
    var self = this;
    var appcode = msg.appcode;//appcode
    var sessionService = self.app.get('sessionService');
    //duplicate log in
    if( !! sessionService.getByUid(username)) {
        next(null, {
            code: 500,
            error: true
        });
        return;
    }
    var roominfo = self.app.roominfo[appcode];
    if(!roominfo){
        next(null,{
            code: 500,
            error: true,
            message: '游戏房间信息尚未定义。'
        });
        return;
    }
    var start = msg.start|0;
    var limit = msg.limit|18;

    next(null,{
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
    app.rpc.chat.roommemberRemote.kick(session, session.uid,session.get('room'), app.get('serverId'), session.get('room'), null);
};


handler.quiteRoomList = function(msg,session,next){
    this.app.rpc.chat.roommemberRemote.kick(session, session.uid,session.get('room'), this.app.get('serverId'), session.get('room'), null);
    next(null,{
        code:200
    });
    return;
}