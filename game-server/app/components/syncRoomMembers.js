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
    // 前提 一个用户同时只能玩儿 一个游戏。
    var self = this;
    this.channelService = this.app.get('channelService');
    var timerfun = function(){
        try{
            for(var appcode in self.app.game){
                var channel = self.channelService.getChannel(appcode, false);
                var sid= self.app.get('serverId');
                var roommap={};
                if( !! channel && channel.getMembers().length>0) {

                    for(var username in self.app.roomlisten){
                        var ulist = [];
                        var roomlist=[];
                        for(var i=0;i<self.app.roomlisten[username].length;i++){
                            var roomid=self.app.roomlisten[username][i];
                            if(roommap[roomid]){
                                roomlist.push(roommap[roomid]);
                                continue;
                            }
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
                                roommap[roomid]=room;
                                roomlist.push(room);
                                for(var u in roomchannel.getMembers()){
                                    ulist.push(roomchannel.getMembers()[u]);
                                }
                            }else{
                                var room={
                                    status:'stop',
                                    roomid:roomid,
                                    users:[]
                                }
                                roommap[roomid]=room;
                                roomlist.push(room);
                            }
                        }
                        self.app.roomlisten[username]=[];
                        if(ulist.length>0){
                            gameUserDao.queryGameUsersByUsernames(appcode,ulist,function(err,users){
                                if(err){

                                    console.error("查询用户集错误："+JSON.stringify(ulist));

                                }else{
                                    var param={
                                        code:200,
                                        route:'getMembersByRoom',
                                        appcode:appcode,
                                        users:users,
                                        rooms:roomlist
                                    };
                                    self.channelService.pushMessageByUids(param,[{uid:username,sid:sid}]);
                                    console.log('成功推送：'+username);
                                }
                            });
                        }

                    }
                }
            }
        }catch (err){
            console.error(err);
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