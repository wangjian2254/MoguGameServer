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

                                for(var j=0;j<roommap[roomid].users.length;j++){
                                    ulist.push(roommap[roomid].users[j]);
                                }

                                continue;
                            }
                            var roomchannel = self.channelService.getChannel(roomid,false);
                            var s='stop';
                            if(roomchannel){
                                var users=roomchannel.getMembers();
                                for(var k=0;k<users.length;k++){
                                    if(self.app.gameuserstatus[users[k]]=='playing'){
                                        s='playing';
                                        break;
                                    }
                                }
                                if(s=='stop'&&users.length==6){
                                    s='full';
                                }
                            }
                            if(roomchannel&&roomchannel.getMembers().length>0){

                                var room={
                                    status:s,
                                    roomid:roomid,
                                    users:roomchannel.getMembers()
                                }
                                roommap[roomid]=room;
                                roomlist.push(room);
                                for(var m=0;m<roommap[roomid].users.length;m++){
                                    ulist.push(roommap[roomid].users[m]);
                                }
                            }else{
                                var room={
                                    status:s,
                                    roomid:roomid,
                                    users:[]
                                }
                                roommap[roomid]=room;
                                roomlist.push(room);
                            }
                        }
                        self.app.roomlisten[username]=[];
                        if(roomlist.length>0) {
                            gameUserDao.queryGameUsersByUsernames(appcode, ulist, function (err, users) {
                                if (err) {

                                    console.error("查询用户集错误：" + JSON.stringify(ulist));

                                } else {
                                    var param = {
                                        code: 200,
                                        route: 'getMembersByRoom',
                                        appcode: appcode,
                                        users: users,
                                        rooms: roomlist
                                    };
                                    self.channelService.pushMessageByUids(param, [
                                        {uid: username, sid: sid}
                                    ]);
                                    console.log('成功推送：' + username);
                                }
                            });
//                        }
                        }
                        delete ulist;
                        delete roomlist;
                    }
                }
                delete roommap;

            }
        }catch (err){
            console.error(err);
            console.log('syncRoomMembers');
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