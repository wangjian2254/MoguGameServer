/**
 * Created by wangjian2254 on 14-7-2.
 */
var Room = function(opts) {
    this.appcode = opts.appcode;
    this.roomlist = opts.roomlist;
    if(opts.timeline){
        this.timeline = opts.timeline;
    }
};

/**
 * Expose 'Entity' constructor
 */

module.exports = Room;

