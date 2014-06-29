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
ChatRemote.prototype.add = function(username,appcode, sid, name, flag, cb) {
	var channel = this.channelService.getChannel(name, flag);
	var param = {
		route: 'onAdd',
		user: username,
        roomid:name,
        userinfo: this.app.get('alluser')[appcode][username]
	};
	channel.pushMessage(param);

    var roomlistchannel = this.channelService.getChannel(appcode,flag);
    roomlistchannel.pushMessage(param);

	if( !! channel) {
		channel.add(username, sid);
	}

	cb(this.get(name, flag));
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
ChatRemote.prototype.get = function(name, flag) {
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
ChatRemote.prototype.kick = function(username,appcode, sid, name, cb) {
	var channel = this.channelService.getChannel(name, false);
	// leave channel
	if( !! channel) {
		channel.leave(username, sid);
	}
	var param = {
		route: 'onLeave',
        roomid:name,
		user: username
	};
	channel.pushMessage(param);
    var roomlistchannel = this.channelService.getChannel(appcode,flag);
    roomlistchannel.pushMessage(param);
	cb();
};
