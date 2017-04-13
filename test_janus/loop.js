#!/usr/bin/env node

var path = require('path')
var child_proc = require('child_process');
var program = require('commander');

var roleType = 1;
var Qps = 512;//kbps
var beginClientID = 2000;
var serverAddr = '127.0.0.1';
var Loop_Num=1;
var Step = 0;

var execPath = path.resolve("/Users/yanyandong/.nvm/versions/node/v6.9.4/bin/node")
function Run(clientid){
    console.log("begin exec : "+clientid);
	//child_proc.execFile('/Users/yanyandong/.nvm/versions/node/v6.9.4/bin/node',["connect_janus.js","-s","10.0.1.189","-t","2","-c","4000"], function(error, stdout, stderr){
     //    if(error){
     //        throw error;
     //    }
     //    console.log(stdout);
    // });
    var time = 1000/(Qps * 1000/ 8 / 800);

    var cmd = ["connect_janus.js",
                "-s",serverAddr,
                "-t",roleType.toString(),
                "-c",clientid.toString(),
                "-d",time.toString()
                ];
    connect_exe = child_proc.spawn('/Users/yanyandong/.nvm/versions/node/v6.9.4/bin/node',cmd);
    // connect_exe.stdout.on('data',function (data) {
    //     console.log('stdout:' + data);
    // });
    connect_exe.stderr.on('data',function (data) {
        console.log('stderr:' + data);
    });
    connect_exe.on('close',function (code) {
        console.log('child process exite');
    });
}
function loop(){
    program
        .version("0.1.0")
        .option("-t, --type <n>", 'type', parseInt)
        .option('-c, --clientid <n>','client id', parseInt)
        .option('-s, --server [value]','server info')
        .option('-d, --time <n>','send data time', parseInt)
        .option('-q, --qps <n>','send bytes once', parseInt)
        .option('-n, --number <n>','client number', parseInt)
        .option('-p, --step <n>', "step value", parseInt)
        .parse(process.argv);
    console.log("parse command line:");
    if(program.type){
        //role = parseInt(program.type);
        roleType = program.type;
        console.log('input type '+ roleType);
    }
    if(program.qps){
        Qps = program.qps;
        console.log('input qps '+ Qps);
    }
    if(program.clientid){
        beginClientID = program.clientid; //parseInt(program.clientid);
        console.log("input begin client id "+beginClientID);
    }
    if(program.server){
        serverAddr =  program.server;
        console.log("input server ip "+ serverAddr);
    }
    if(program.number){
        Loop_Num = program.number;
        console.log("input number "+Loop_Num);
    }
    if(program.step){
        Step = program.step;
        console.log("input step "+Step);
    }

    for(var i = 0;i<Loop_Num;i++){
        var Node_path = "/Users/yanyandong/.nvm/versions/node/v6.9.4/bin/node"
        var clientid = beginClientID + i*Step;
        (function (index) {
            setTimeout(function() {
                Run(index);
            }, 500*i);
        })(clientid);
        
    }
}
loop();

