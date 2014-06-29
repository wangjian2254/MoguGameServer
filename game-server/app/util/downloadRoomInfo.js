/**
 * Created by wangjian2254 on 14-6-28.
 */
var fs = require('fs');
var request = require('request');
var path = fs.realpathSync('.')
//console.log(path);
var filepath = path+'/config/roominfo.json';
module.exports.downloadRoomJsonInfo = function(cb){

        request('http://gamerank.mmggoo.com/RoomJSONFile',function(error,response,body){
            if(!error && response.statusCode == 200){
//                console.log(fs.realpathSync('.'));

                fs.writeFile(filepath,body,function(err){
                    if(!err){
                        cb(require(filepath),fs.statSync(filepath));
                    }

                });
            }
        });

//    var stat = fs.statSync(filepath);
//    console.log(stat);
}

module.exports.getRoomJsonStat = function(){
    try{
        var stat = fs.statSync(filepath);
        return stat;
    }catch (error){
        return null;
    }
}

module.exports.getRoomJsonData=function(){
    var data = require(filepath);
    var roominfo = {};
    for (var i=0;i<data['gamelist'].length;i++){
        roominfo[data['gamelist'][i].appcode]=data['gamelist'][i];
    }
    return roominfo;
}