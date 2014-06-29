/**
 * Created by wangjian2254 on 14-6-29.
 */
module.exports = function(app) {
    return new RoomMember(app);
};

var RoomMember = function(app) {
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
RoomMember.prototype.add = function(username,appcode,userinfo, sid, name, flag, cb) {
    var channel = this.channelService.getChannel(name, flag);
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
RoomMember.prototype.get = function(appcode,name, flag) {
    var users = [];
    var channel = this.channelService.getChannel(name, flag);
    if( !! channel) {
        users = channel.getMembers();
    }
    for(var i = 0; i < users.length; i++) {
        users[i] = this.app.get('alluser')[appcode][users[i]];
    }
    return users;
};

/**
 * Kick user out chat channel.
 *
 * @param {String} uid unique id for user
 * @param {String} sid server id
 * @param {String} name channel name
 *
 */
RoomMember.prototype.kick = function(username,appcode, sid, name, cb) {
    var channel = this.channelService.getChannel(name, false);
    // leave channel
    if( !! channel) {
        channel.leave(username, sid);
    }
    delete this.app.get('alluser')[appcode][username];
//    var username = uid.split('*')[0];
//    var param = {
//        route: 'onLeave',
//        user: username
//    };
//    channel.pushMessage(param);
    cb();
};
