/**
 * Created by wangjian2254 on 14-6-29.
 */
var gameUserDao = require('../../../dao/gameUserDao');
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
    var self = this;
    console.log("RoomMemberRemote add");
    gameUserDao.updateGameUser(appcode,userinfo,function(err,gameuser){
        if(err){
            cb(err,null);
            return;
        }
        var channel = self.channelService.getChannel(appcode, flag);
        if( !! channel) {
            channel.add(username, sid);
        }
        cb(null,gameuser);
    });
};



RoomMemberRemote.prototype.changeRoomInfo = function(appcode,changed,roomid,username,userinfo,sid,flag,cb){
    var channel = this.channelService.getChannel(appcode, flag);
    var param = {
        code:200,
        route: 'memberChanged',
        changed:changed,
        user: username,
        roomid:roomid,
        userinfo: userinfo
    };
    channel.pushMessage(param);
    cb();
}



RoomMemberRemote.prototype.changeRoomStatus = function(appcode,status,roomid,username,sid,flag,cb){
    var channel = this.channelService.getChannel(appcode, flag);
    var param = {
        code:200,
        route: 'roomStatusChanged',
        status:status,
        roomid:roomid
    };
    if(channel){
        channel.pushMessage(param);
    }
    cb();
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
    cb();
};
