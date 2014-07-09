/**
 * Created by wangjian2254 on 14-6-28.
 */
var fs = require('fs');
var gameUserDao = require('../../../dao/gameUserDao');
module.exports = function(app,opts){
    return new SyncRoomMembers(app,opts);
}

var DEFAULT_INTERVAL = 1000;

var SyncRoomMembers = function(app, opts){
    this.app = app;
    this.channelService = app.get('channelService');
    this.interval = opts.interval | DEFAULT_INTERVAL;
    this.timerId = null;
}

SyncRoomMembers.name = '__SyncRoomMembers__';

SyncRoomMembers.prototype.start = function(cb){
    //检测信息是否是最新的
    var self = this;
    var timerfun = function(){
        for(var appcode in self.app.game){
            var channel = self.channelService.getChannel(appcode, false);
            if( !! channel && channel.getMembers().length>0) {
                var ulist = [];
                for(var roomid in self.app.roomlisten){

                    ulist = [];
                    for (var username in self.app.roomlisten[roomid]){
                        ulist.push(username);
                    }
                    if(ulist.length>0){
                        var roomchannel = self.channelService.getChannel(roomid,false);
                        var status = self.app.get('gameroomstatus')[roomid];
                        if(!status){
                            status='stop';
                        }
                        var param={
                            code:200,
                            route:'getMembersByRoom',
                            room:{
                                status:status,
                                roomid:roomid,
                                users:[],
                                appcode:appcode
                            }
                        };
                        if(!!roomchannel&&roomchannel.getMembers().length>0){
                            gameUserDao.queryGameUsersByUsernames(appcode,roomchannel.getMembers(),function(err,users){
                                if(err){
                                    self.app.roomlisten[roomid]={};
                                    channel.pushMessageByUids(param,ulist);

                                }else{
                                    param.users=users;
                                    self.app.roomlisten[roomid]={};
                                    channel.pushMessageByUids(param,ulist);
                                }
                            });
                        }else{
                            self.app.roomlisten[roomid]={};
                            channel.pushMessageByUids(param,ulist);
                        }
                    }

                }
            }
        }
    };

    this.timerId = setInterval(timerfun,this.interval);

    process.nextTick(cb);
}

SyncRoomMembers.prototype.afterStart = function(cb){

    process.nextTick(cb);
}

SyncRoomMembers.prototype.stop = function(force, cb){
    clearInterval(this.timerId);
    process.nextTick(cb);
}