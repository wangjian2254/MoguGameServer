var gameUserDao = require('../../../dao/gameUserDao');
module.exports = function(app) {
	return new ChatRemote(app);
};

var ChatRemote = function(app) {
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
ChatRemote.prototype.add = function(roomid,username,appcode, sid, flag, cb) {
    var self = this;
    var channel = this.channelService.getChannel(roomid, flag);
    var users = channel.getMembers();
    if(users.indexOf(username)>=0){
        cb(null,null);
        return;
    }
    if(users.length>=6){
        cb({msg:"房间已经满员，无法加入。"},null);
        return;
    }

    gameUserDao.getUserByAppcode(appcode,username,function(err,gameuser){
        if(err){
            cb({msg:"获取用户信息错误。"});
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
        if( !! channel) {
            channel.add(username, sid);
        }

        cb(null,gameuser);
    });
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
ChatRemote.prototype.get = function(name,appcode, flag,cb) {
	var channel = this.channelService.getChannel(name, flag);
	if( !! channel) {
        gameUserDao.queryGameUsersByUsernames(appcode,channel.getMembers(),function(err,users){
            cb(null,users);
        });
	}else{
        cb(null,[]);
    }
};

ChatRemote.prototype.getRoomMembers = function(roomid,appcode,flag,cb){

    this.get(roomid,appcode,flag,cb);
}

/**
 * Kick user out chat channel.
 *
 * @param {String} uid unique id for user
 * @param {String} sid server id
 * @param {String} name channel name
 *
 */
ChatRemote.prototype.kick = function(roomid,username,appcode, sid, cb) {


	var channel = this.channelService.getChannel(roomid, false);
	// leave channel
	if( !! channel) {
		channel.leave(username, sid);
	}
	var param = {
        code:200,
		route: 'onLeave',
        roomid:roomid,
		user: username
	};
	channel.pushMessage(param);


    cb();
};


ChatRemote.prototype.uploadPoint = function(roomid,username,content,sid,cb){
    var channelService = this.app.get('channelService');
    var param = {
        msg: content,
        from: username
    };
    var channel = channelService.getChannel(roomid, false);

    channel.pushMessage('onChat', param);
    cb();
}


ChatRemote.prototype.pushEndPoint = function(roomid,username,endpoint,sid,cb){
    var channelService = this.app.get('channelService');
    var param = {
        roomid: roomid,
        endpoints:endpoint
    };
    var channel = channelService.getChannel(roomid, false);
    if(channel){
        channel.pushMessage('onEndPoint', param);
    }
    //todo: 发送url 链接 推送 结果到gae上。回调函数中通知 用户的游戏状态
    cb();
}


