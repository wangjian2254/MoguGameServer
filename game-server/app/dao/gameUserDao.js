//var logger = require('pomelo-logger').getLogger(__filename);
var pomelo = require('pomelo');
var GameUser = require('./gameUser');
var utils = require('../util/utils');

var request = require('request');
var gameUserDao = module.exports;
var sqldata = require('../../../shared/config/sqldata.json')

var settings = require('../../config/settings.json')

/**
 * Query GameUser
 *
 * @param {String} appcode Game pagecode
 * @param {String} username User username
 * @param {function} cb Call back function
 */
gameUserDao.getUserByAppcode = function(appcode,username, cb) {
	var args = [appcode,username];
	
	pomelo.app.get('dbclient').insert(sqldata.queryuser, args, function(err, res) {
		if (err) {
//			logger.error('create bag for roomDao failed! ' + err.stack);
			utils.invokeCallback(cb, err, null);
		} else {
            if (res && res.length === 1) {
                var result = res[0];
                var gameUser = new GameUser(result);
                gameUser.appcode = appcode
                cb(null, gameUser);
            } else {
                utils.invokeCallback(cb, err, null);
            }
		}
	});
};

/**
 * Update or Insert GameUser
 * @param {String} appcode Game pagecode
 * @param {Object} gameuser GameUser
 * @param {function} cb Call back function
 */
gameUserDao.updateGameUser = function(appcode,gameuser, cb) {
    this.getUserByAppcode(appcode,gameuser.username,function(err,user){
        if(err){
            var args = [appcode, gameuser.username,gameuser.nickname,gameuser.point,gameuser.rank, new Date().getTime()];

            pomelo.app.get('dbclient').insert(sqldata.createuser, args, function(err, res) {
                if (err) {
                    utils.invokeCallback(cb, err, null);
                } else {
                    utils.invokeCallback(cb, null, gameuser);
                }
            });
        }else{
            if(user.nickname==gameuser.nickname&&user.point==gameuser.point&&user.rank==gameuser.rank){
                utils.invokeCallback(cb, null, gameuser);
            }else{
                var args = [appcode,gameuser.nickname,gameuser.point,gameuser.rank, new Date().getTime(),gameuser.username];
                pomelo.app.get('dbclient').insert(sqldata.updateuser, args, function(err, res) {
                    if (err) {
                        utils.invokeCallback(cb, err, null);
                    } else {
                        utils.invokeCallback(cb, null, gameuser);
                    }
                });
            }
        }
    })
};



