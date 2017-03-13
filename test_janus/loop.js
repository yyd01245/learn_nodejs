#!/usr/bin/env node
/*
#===============================================================================
#
#          FILE:  loop.sh
# 
#         USAGE:  ./loop.sh 
# 
#   DESCRIPTION:  loop node js
# 
#       OPTIONS:  ---
#  REQUIREMENTS:  ---
#          BUGS:  ---
#         NOTES:  ---
#        AUTHOR: Lai Chen (A program fan), lchen@grandstream.com or (chenlai19891007@163.com)
#       COMPANY: Grandstream
#       CREATED: 2017/02/21 19时18分45秒 CST
#      REVISION:  ---
#===============================================================================
*/
var path = require('path')
var child_proc = require('child_process');
var Loop_Num=40;
var execPath = path.resolve("/Users/yanyandong/.nvm/versions/node/v6.9.4/bin/node")
function Run(){
    console.log("begin exec");
	child_proc.execFile('/Users/yanyandong/.nvm/versions/node/v6.9.4/bin/node',["connect_janus.js"], function(error, stdout, stderr){
    if(error){
        throw error;
    }
    console.log(stdout);
});
}

var i = 0;
for(i = 0;i<Loop_Num;i++){
	var Node_path = "/Users/yanyandong/.nvm/versions/node/v6.9.4/bin/node"

	
    setTimeout(function() {
        Run();
    }, 500*i);
	console.log("loop time ",i);
}
