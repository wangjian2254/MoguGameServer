/**
 * Created by wangjian2254 on 14-7-2.
 */
var GameUser = function(opts) {
    this.username = opts.username;
    this.nickname = opts.nickname;
    this.point = opts.point;
    this.rank = opts.rank;
    if(opts.timeline){
        this.timeline = opts.timeline;
    }
    if(opts.appcode){
        this.appcode = opts.appcode;
    }
};

/**
 * Expose 'Entity' constructor
 */

module.exports = GameUser;

