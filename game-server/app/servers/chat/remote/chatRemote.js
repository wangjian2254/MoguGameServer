var gameUserDao = require('../../../dao/gameUserDao');
var settings = require('../../../../config/settings.json');
var request = require('request');
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
        // 未来 可以通过 roomid　的第一个"_"前的数字 来决定房间最大人数。目前暂定为6人。
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

        if( !! channel) {
            channel.pushMessage(param);
            channel.add(username, sid);
        }

        cb(null,gameuser,channel.getMembers().length);
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
        code:200,
        msg: content,
        from: username
    };
    var channel = channelService.getChannel(roomid, true);

    channel.pushMessage('onChat', param);
    cb();
}


ChatRemote.prototype.pushEndPoint = function(roomid,appcode,username,endpoint,sid,cb){
    var channelService = this.app.get('channelService');
    var channel = channelService.getChannel(roomid, false);
    var postparam={game:appcode};
    var i=0;
    for(var p in endpoint){
        postparam['username'+i]=p;
        postparam['point'+i]=endpoint[p];
        i++;
    }
    postparam['num']=i;
    var users=[];
    request.post(settings.moguuploadpointurl, {form:postparam},function(error,response,body){
        if(!error && response.statusCode == 200){
//                console.log(fs.realpathSync('.'));
            var result = JSON.parse(body);
            if(result.success){
                for(var i=0;i<result.result.length;i++){
                    gameUserDao.updateGameUserPoint(appcode,result.result[i],function(err,u){
                        if(!err){
                            users.push(u);
                        }
                    });
                }
            }
        }
        if(channel){
            var param = {
                code:200,
                roomid: roomid,
                users:users,
                endpoints:endpoint
            };
            channel.pushMessage('onEndPoint', param);
        }
    });
    cb();
};


