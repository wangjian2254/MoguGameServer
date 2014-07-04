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
    if(channel.getMembers().length>=6){
        cb({msg:"房间已经满员，无法加入。"},null);
        return;
    }
    gameUserDao.getUserByAppcode(appcode,username,function(err,gameuser){
        if(err){
            cb({msg:"获取用户信息错误。"},null);
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

        self.get(roomid, appcode,flag,cb);
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


ChatRemote.prototype.uploadEndPoint = function(roomid,username,appcode,content, cb) {
    if(!this.app.get('gameroom')[roomid]){
        this.app.get('gameroom')[roomid]={};
    }
    this.app.get('gameroom')[roomid][username]=content;
    cb();
};



ChatRemote.prototype.getEndPoint = function(roomid,username,appcode, cb) {
    if(!this.app.get('gameroom')[roomid]){
        cb({});
    }else{
        cb(this.app.get('gameroom')[roomid]);
    }

};

ChatRemote.prototype.cleanPoint = function(roomid,username,appcode, cb) {
    this.app.get('gameroom')[roomid]={};
    cb();
};