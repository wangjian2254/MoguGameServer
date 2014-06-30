/**
 * Created by wangjian2254 on 14-6-28.
 */
var fs = require('fs');
var roominfofile = require('../util/downloadRoomInfo');
module.exports = function(app,opts){
    return new SyncRoomInfo(app,opts);
}

var DEFAULT_INTERVAL = 3000;

var SyncRoomInfo = function(app, opts){
    this.app = app;
    this.interval = opts.interval | DEFAULT_INTERVAL;
    this.timerId = null;
}

SyncRoomInfo.name = '__DownloadRoomInfo__';

SyncRoomInfo.prototype.start = function(cb){
    //检测信息是否是最新的
    var self = this;
    var timerfun = function(){

        var s = roominfofile.getRoomJsonStat();

        if(!s){
            roominfofile.downloadRoomJsonInfo(function(data,stat){
                self.app.roominfo=data;
                self.app.roominfo['timeline']= stat.mtime;
                console.log('roominfo inited');
                console.log(stat.mtime);
            });
            console.log('download info');
        }else{
            console.log(s.mtime);
            if(!self.app.roominfo||self.app.roominfo.timeline< s.mtime){
                self.app.roominfo = roominfofile.getRoomJsonData();
                self.app.roominfo['timeline']= s.mtime;
                console.log('roominfo changed');
            }
        }

    };
    console.log('start');
    timerfun();
    this.timerId = setInterval(timerfun,this.interval);

    process.nextTick(cb);
}

SyncRoomInfo.prototype.afterStart = function(cb){
    console.log("after");

    process.nextTick(cb);
}

SyncRoomInfo.prototype.stop = function(force, cb){
    console.log("stop");
    clearInterval(this.timerId);
    process.nextTick(cb);
}