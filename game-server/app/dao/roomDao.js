//var logger = require('pomelo-logger').getLogger(__filename);
var pomelo = require('pomelo');
var Room = require('./room');
var utils = require('../util/utils');

var request = require('request');
var roomDao = module.exports;
var sqldata = require('../../../shared/config/sqldata.json');
//console.log(sqldata);
var settings = require('../../config/settings.json');

/**
 * Create Room
 *
 * @param {Number} playerId Player Id
 * @param {function} cb Call back function
 */
roomDao.getRoomByAppcode = function(appcode, cb) {
    var room=pomelo.app.get('gameroom')[appcode];
    if(room){
        console.log("room info on cache");
        cb(null, room);
        return;
    }
    console.log("room info query db;");
	var self = this;
	var args = [appcode];
	
	pomelo.app.get('dbclient').insert(sqldata.queryroomlist, args, function(err, res) {
		if (err) {
            pomelo.app.get('dbclient').insert(sqldata.creategameroom, null, function(err1, res1) {
                if (err1) {
                    utils.invokeCallback(cb, err, null);
                } else {
                    self.getRoomByAppcode(appcode,function(err3,res3){
                        utils.invokeCallback(cb, err3, res3);
                    });
                }
            });
		} else {
            if (res && res.length === 1) {
                var result = res[0];
                var room = new Room(JSON.parse(result.roominfo));
                room['timeline']=result.timeline;
                pomelo.app.get('gameroom')[appcode]=room;
                cb(null, room);
            } else {
                request(settings.moguurl+'?appcode='+appcode,function(error,response,body){
                    if(!error && response.statusCode == 200){
                        pomelo.app.get('dbclient').insert(sqldata.createtable.replace(/\?/,appcode.replace(/\./g,'_')), null, function(err0, res0) {
                            if (err0) {
                                utils.invokeCallback(cb, err0, null);
                            } else {
                                self.createRoom(appcode,body,function(e,r){
                                    if(e){
                                        utils.invokeCallback(cb, err, null);
                                    }else{
                                        utils.invokeCallback(cb, null, r);
                                    }
                                });

                            }
                        });
                    }else{
                        utils.invokeCallback(cb, err, null);
                    }
                });
            }
		}
	});
};


roomDao.createRoom = function(appcode,roominfo, cb) {
    if(typeof roominfo !== 'string'){
        roominfo = JSON.stringify(items);
    }
    var args = [appcode, roominfo, new Date().getTime()];
//    console.log(args);
    pomelo.app.get('dbclient').insert(sqldata.createroomlist, args, function(err, res) {
        if (err) {
            utils.invokeCallback(cb, err, null);
        } else {
            var room = new Room(JSON.parse(roominfo));
            room['timeline']=args[2];
            pomelo.app.get('gameroom')[appcode]=room;//加入缓存
            utils.invokeCallback(cb, null, room);
        }
    });
};

/**
 * Update bag
 * @param {Object} bag Bag object.
 * @param {function} cb Call back function.
 */
roomDao.update = function(appcode,roominfo, cb) {
    var args = [roominfo, new Date().getTime(),appcode];

    pomelo.app.get('dbclient').insert(sqldata.updateroomlist, args, function(err, res) {
        if (err) {
            utils.invokeCallback(cb, err, null);
        } else {
            var room = new Room(JSON.parse(roominfo));
            room['timeline']=args[1];
            utils.invokeCallback(cb, null, room);
        }
    });
};




