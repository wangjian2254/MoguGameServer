module.exports = function(app) {
	return new Handler(app);
};

var Handler = function(app) {
		this.app = app;
};

var handler = Handler.prototype;

/**
 * New client entry chat server.
 *
 * @param  {Object}   msg     request message
 * @param  {Object}   session current session object
 * @param  {Function} next    next stemp callback
 * @return {Void}
 */
handler.enter = function(msg, session, next) {
	var self = this;
	var roomid = msg.roomid;
    var appcode = msg.appcode;
	var username = msg.username
	var sessionService = self.app.get('sessionService');

	//duplicate log in
	if( !! sessionService.getByUid(username)) {
		next(null, {
			code: 500,
			error: true
		});
		return;
	}

	session.bind(username);
    session.set('username', username);
	session.set('roomid', roomid);
	session.push('roomid', function(err) {
		if(err) {
			console.error('set roomid for session service failed! error is : %j', err.stack);
		}
	});
	session.on('closed', onUserLeave.bind(null, self.app));

	//put user into channel
	self.app.rpc.chat.chatRemote.add(session, username,appcode, self.app.get('serverId'), roomid, true, function(users){
		next(null, {
			users:users
		});
	});
};

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
	app.rpc.chat.chatRemote.kick(session, session.uid,session.get('room'), app.get('serverId'), session.get('roomid'), null);
};
