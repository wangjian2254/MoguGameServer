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
    if(!pomelo.app.get('alluser')[appcode]){
        pomelo.app.get('alluser')[appcode]={};
    }
    var gameuser=pomelo.app.get('alluser')[appcode][username];
    if(gameuser){
        console.log("gameuser info on cache");
        utils.invokeCallback(cb, null, gameuser);
        return;
    }
    console.log("gameuser info query db;");
	var args = [username];
	pomelo.app.get('dbclient').insert(sqldata.queryuser.replace(/\?/,appcode.replace(/\./g,'_')), args, function(err, res) {
		if (err) {
//			logger.error('create bag for roomDao failed! ' + err.stack);
			utils.invokeCallback(cb, err, null);
		} else {
            if (res && res.length === 1) {
                var result = res[0];
                var gameUser = new GameUser(result);
                pomelo.app.get('alluser')[appcode][username]=gameUser;
                utils.invokeCallback(cb, err, gameUser);

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
    if(!pomelo.app.get('alluser')[appcode]){
        pomelo.app.get('alluser')[appcode]={};
    }
    var self = this;
    this.getUserByAppcode(appcode,gameuser.username,function(err,user){
        if(err){
            pomelo.app.get('dbclient').insert(sqldata.createtable.replace(/\?/,appcode.replace(/\./g,'_')), null, function(err0, res0) {
                if (err0) {
                    utils.invokeCallback(cb, err0, null);
                }else{
                    self.updateGameUser(appcode,gameuser,function(err5,res5){
                        utils.invokeCallback(cb, err5, res5);
                    })
                }
            });
        }else{
            if(!user){
                var args = [ gameuser.username,gameuser.nickname,gameuser.head,gameuser.point,gameuser.rank, new Date().getTime()];

                pomelo.app.get('dbclient').insert(sqldata.createuser.replace(/\?/,appcode.replace(/\./g,'_')), args, function(err, res) {
                    if (err) {
                        utils.invokeCallback(cb, err, null);
                    } else {
                        pomelo.app.get('alluser')[appcode][gameuser.username]=gameuser;
                        utils.invokeCallback(cb, null, gameuser);
                    }
                });
            }else if((gameuser.timeline&&gameuser.timeline==user.timeline)||(!gameuser.timeline&&user.nickname==gameuser.nickname&&user.head==gameuser.head&&user.point==gameuser.point&&user.rank==gameuser.rank)){
                utils.invokeCallback(cb, null, gameuser);
            }else{
                var args = [gameuser.nickname,gameuser.head,gameuser.point,gameuser.rank, new Date().getTime(),gameuser.username];
                console.log(args);
                pomelo.app.get('dbclient').insert(sqldata.updateuser.replace(/\?/,appcode.replace(/\./g,'_')), args, function(err, res) {
                    if (err) {
                        utils.invokeCallback(cb, err, null);
                    } else {
                        pomelo.app.get('alluser')[appcode][gameuser.username]=gameuser;
                        utils.invokeCallback(cb, null, gameuser);
                    }
                });
            }
        }
    })
};


gameUserDao.queryGameUsersByUsernames = function(appcode,usernames, cb) {
    if(!pomelo.app.get('alluser')[appcode]){
        pomelo.app.get('alluser')[appcode]={};
    }
    var us='';
    var users=[];
    for(var i=0;i<usernames.length;i++){
        if(pomelo.app.get('alluser')[appcode][usernames[i]]){
            users.push(pomelo.app.get('alluser')[appcode][usernames[i]]);
        }else{
            us+="'"+usernames[i]+"',";
        }
    }
    if(us.length==0){
        utils.invokeCallback(cb, null, users);
        return;
    }

    pomelo.app.get('dbclient').insert(sqldata.queryuserbynames.replace(/\?/,appcode.replace(/\./g,'_'))+us.substring(0,us.length-1)+")", null, function(err, res) {
        if (err) {
            utils.invokeCallback(cb, err, null);
        } else {
            if(res){
                var gameUser=null;
                for(var j=0;j<res.length;j++){
                    gameUser= new GameUser(res[j]);
                    pomelo.app.get('alluser')[appcode][gameUser.username]=gameUser;
                    users.push(gameUser);
                }

            }
            utils.invokeCallback(cb, null, users);

        }
    });

};

gameUserDao.updateGameUserPoint = function(appcode,gameuser, cb) {
    if(!pomelo.app.get('alluser')[appcode]){
        pomelo.app.get('alluser')[appcode]={};
    }
    //updateuserpoint
    var args = [appcode,gameuser.p,gameuser.r, new Date().getTime(),gameuser.u];
    pomelo.app.get('dbclient').insert(sqldata.updateuserpoint.replace(/\?/,appcode.replace(/\./g,'_')), args, function(err, res) {
        if (err) {
            utils.invokeCallback(cb, err, null);
        } else {
            var gu = pomelo.app.get('alluser')[appcode][gameuser.u];
            if(!gu){
                gu = {username:gameuser.u};
            }
            gu.point = gameuser.p;
            gu.rank = gameuser.r;
            gu.timeline = args[3];
            utils.invokeCallback(cb, null, gu);
        }
    });
}
