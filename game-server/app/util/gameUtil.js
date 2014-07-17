/**
 * Created by WangJian on 2014/7/16.
 */

module.exports.hasOnline=function(msg,session,next,app){
    var sessionService = app.get('sessionService');
    if(!sessionService.getByUid(msg.username)) {
        next(null, {
            route:'disconnect',
            code: 404
        });
        return true;
    }else if(!session.uid){
        next(null, {
            route:'disconnect',
            message:'登录异常，请重新登录',
            code: 404
        });
        return true;
    }
    return false;
}

module.exports.quiteRoom=function(msg,session,oldroomid,app,channelService){
    var channel2 = channelService.getChannel(msg.appcode, false);
    var channel = channelService.getChannel(oldroomid, false);
    // leave channel
    if( !! channel) {
        channel.leave(msg.username, app.get('serverId'));
        var param = {
            code:200,
            route: 'onLeave',
            roomid:oldroomid,
            user: session.uid
        };
        channel.pushMessage(param);
    }

    if(!!channel2){
        var param2 = {
            code:200,
            route: 'memberChanged',
            changed:'out',
            user: session.uid,
            roomid:oldroomid
        };
        channel2.pushMessage(param2);
    }
    if(app.get('gameroom')[oldroomid]&& typeof  app.get('gameroom')[oldroomid][session.uid] == "undefined"){
        delete app.get('gameroom')[oldroomid][session.uid];
    }
    if(channel.getMembers().length<6&&channel2){
        var s='stop';
        for(var i=0;i<channel.getMembers().length;i++){
            if(app.gameuserstatus[channel.getMembers()[i]]=='playing'){
                s='playing';
                break;
            }
        }
        var param = {
            code:200,
            route: 'roomStatusChanged',
            status:s,
            roomid:oldroomid
        };
        channel2.pushMessage(param);
    }
}