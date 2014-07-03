/**
 * Created by wangjian2254 on 14-6-29.
 */
module.exports = function(app) {
    return new RoomMemberRemote(app);
};

var RoomMemberRemote = function(app) {
    this.app = app;
    this.channelService = app.get('channelService');
};

/**
 * Add user into chat channel.
 *
 * @param {String} uid unique id for user
 * @param {String} sid server id
 * @param {String} name channel name
 * @param {boolean} flag channel parameter
 *
 */
RoomMemberRemote.prototype.add = function(appcode,username,userinfo, sid, flag, cb) {
    var channel = this.channelService.getChannel(appcode, flag);
//    var param = {
//        route: 'onAdd',
//        user: username
//    };
//    channel.pushMessage(param);

    if( !! channel) {
        channel.add(username, sid);
    }
    if(!this.app.get('alluser')[appcode]){
        this.app.get('alluser')[appcode]={};
    }
    this.app.get('alluser')[appcode][username]=userinfo;
    cb();

//    cb(this.get(name, flag));
};

/**
 * Get user from chat channel.
 *
 * @param {Object} opts parameters for request
 * @param {String} name channel name
 * @param {boolean} flag channel parameter
 * @return {Array} users uids in channel
 *
 */
RoomMemberRemote.prototype.get = function(appcode, flag) {
    var users = [];
    var channel = this.channelService.getChannel(appcode, flag);
    if( !! channel) {
        users = channel.getMembers();
    }
    for(var i = 0; i < users.length; i++) {
        users[i] = this.app.get('alluser')[appcode][users[i]];
    }
    return users;
};

RoomMemberRemote.prototype.changeRoomInfo = function(appcode,changed,roomid,username,userinfo,sid,flag){
    var channel = this.channelService.getChannel(appcode, flag);
    var param = {
        route: 'memberChanged',
        changed:changed,
        user: username,
        roomid:roomid,
        userinfo: userinfo
    };
    channel.pushMessage(param);
}

/**
 * Kick user out chat channel.
 *
 * @param {String} uid unique id for user
 * @param {String} sid server id
 * @param {String} name channel name
 *
 */
RoomMemberRemote.prototype.kick = function(appcode,username, sid, cb) {
    var channel = this.channelService.getChannel(appcode, false);
    // leave channel
    if( !! channel) {
        channel.leave(username, sid);
    }
    try{
        delete this.app.get('alluser')[appcode][username];
    }catch (err){

    }

//    var username = uid.split('*')[0];
//    var param = {
//        route: 'onLeave',
//        user: username
//    };
//    channel.pushMessage(param);
    cb();
};
