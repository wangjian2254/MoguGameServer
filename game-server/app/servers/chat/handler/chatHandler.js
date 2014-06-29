var chatRemote = require('../remote/chatRemote');

module.exports = function(app) {
	return new Handler(app);
};

var Handler = function(app) {
	this.app = app;
};

var handler = Handler.prototype;

/**
 * Send messages to users
 *
 * @param {Object} msg message from client
 * @param {Object} session
 * @param  {Function} next next stemp callback
 *
 */
handler.send = function(msg, session, next) {
	var roomid = msg.roomid;
	var username = session.uid;
	var channelService = this.app.get('channelService');
	var param = {
		msg: msg.content,
		from: username,
		target: msg.target
	};
	channel = channelService.getChannel(roomid, false);

	//the target is all users
	if(msg.target == '*') {
		channel.pushMessage('onChat', param);
	}
	//the target is specific user
	else {
		var tusername = msg.target;
		var tsid = channel.getMember(tusername)['sid'];
		channelService.pushMessageByUids('onChat', param, [{
			uid: tusername,
			sid: tsid
		}]);
	}
	next(null, {
		route: msg.route
	});
};


/**
 * upload result point
 *
 * @param {Object} msg message from client
 * @param {Object} session
 * @param  {Function} next next stemp callback
 *
 */
handler.uploadPoint = function(msg, session, next) {
    var roomid = session.get('roomid');
    var username = session.uid;
    if(!this.app.get('gameroom')[roomid]){
        this.app.get('gameroom')[roomid]={};
    }
    this.app.get('gameroom')[roomid][username]=msg.content;
    next(null, {
        route: msg.route
    });
};


/**
 * clean result point
 *
 * @param {Object} msg message from client
 * @param {Object} session
 * @param  {Function} next next stemp callback
 *
 */
handler.cleanPoint = function(msg, session, next) {
    var roomid = session.get('roomid');
    var username = session.uid;
    this.app.get('gameroom')[roomid]={};
    next(null, {
        route: msg.route
    });
};