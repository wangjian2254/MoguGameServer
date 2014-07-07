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
        var cache_data=self.app.get('gameroom');
        for(var p in cache_data){
            if(!cache_data[p]['cache_time']){
                cache_data[p]['cache_time']=1;
            }else if(cache_data[p]['cache_time']<3){
                cache_data[p]['cache_time']+=1;
            }else{
                delete cache_data[p];
                console.log(p);
            }
        }
        cache_data = self.app.get('alluser');
        for(var p in cache_data){
            if(!cache_data[p]['cache_time']){
                cache_data[p]['cache_time']=1;
            }else if(cache_data[p]['cache_time']<3){
                cache_data[p]['cache_time']+=1;
            }else{
                delete cache_data[p];
                console.log(p);
            }
        }


    };

    this.timerId = setInterval(timerfun,this.interval);

    process.nextTick(cb);
}

SyncRoomInfo.prototype.afterStart = function(cb){

    process.nextTick(cb);
}

SyncRoomInfo.prototype.stop = function(force, cb){
    clearInterval(this.timerId);
    process.nextTick(cb);
}