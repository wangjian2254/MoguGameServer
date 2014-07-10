/**
 * Created by wangjian2254 on 14-6-28.
 */
var fs = require('fs');
var gameUserDao = require('../dao/gameUserDao');
module.exports = function(app,opts){
    return new SyncRoomMembers(app,opts);
}

var DEFAULT_INTERVAL = 1000;

var SyncRoomMembers = function(app, opts){
    this.app = app;
    this.interval = opts.interval | DEFAULT_INTERVAL;
    this.timerId = null;
}

SyncRoomMembers.name = '__SyncRoomMembers__';

SyncRoomMembers.prototype.start = function(cb){
    //检测信息是否是最新的
    var self = this;
    this.channelService = this.app.get('channelService');
    var timerfun = function(){
        console.log(self.app.game);
        for(var appcode in self.app.game){
            var channel = self.channelService.getChannel(appcode, false);
            var sid= self.app.get('serverId')
            if( !! channel && channel.getMembers().length>0) {
                var ulist = [];
                var roomlist=[];
                for(var username in self.app.roomlisten){
                    for(var i=0;i<self.app.roomlisten[username].length;i++){
                        var roomid=self.app.roomlisten[username][i];
                        var roomchannel = self.channelService.getChannel(roomid,false);
                        if(roomchannel&&roomchannel.getMembers().length>0){
                            var status = self.app.get('gameroomstatus')[roomid];
                            if(!status){
                                status='stop';
                            }
                            var room={
                                status:status,
                                    roomid:roomid,
                                    users:roomchannel.getMembers()
                            }
                            roomlist.push(room);
                            ulist.pushAll(roomchannel.getMembers());
                        }
                    }
                    if(ulist.length>0){
                        gameUserDao.queryGameUsersByUsernames(appcode,ulist,function(err,users){
                            if(err){
                                self.app.roomlisten[username]={};
                                console.error("查询用户集错误："+JSON.stringify(ulist));

                            }else{
                                var param={
                                    code:200,
                                    route:'getMembersByRoom',
                                    appcode:appcode,
                                    users:users,
                                    rooms:roomlist
                                };
                                self.app.roomlisten[username]={};
                                self.channelService.pushMessageByUids(param,[{uid:username,sid:sid}]);
                            }
                        });
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