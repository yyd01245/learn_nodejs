
var net = require('net');

var PORT = 4000;
var HOST = '0.0.0.0'

net.createServer(function(sock){
	console.log("connect:" + sock.remoteAddress + ":" + sock.remotePort);
	sock.on("data",function(data){
		console.log('data: ' + sock.remoteAddress + ":" + data);
		var bin_data = new ArrayBuffer(5);
		for(var i=0;i<5;++i){

			bin_data[i] = i;
		}
//		var ab = str2ab(data);
//		ab[5] = 0x02;
//		var senddata = ab2str(ab);
		sock.write(data);
		//sock.write(senddata);
	});
	sock.on('close',function(data){
		console.log('closed: ' + sock.remoteAddress + " " + sock.remotePort);
	});
}).listen(PORT,HOST);

console.log('server listening on ' + HOST + ":" + PORT);

function ab2str(buf) {
  return String.fromCharCode.apply(null, new Uint16Array(buf));
}

function str2ab(str) {
  var buf = new ArrayBuffer(str.length*2); // 2 bytes for each char
  var bufView = new Uint16Array(buf);
  for (var i=0, strLen=str.length; i<strLen; i++) {
    bufView[i] = str.charCodeAt(i);
  }
  return buf;
}

//var client = new net.Socket();
/*
client.connect(PORT,HOST,function() {
	console.log('connect to :' + HOST + ":" + PORT);
//	client.write();
});
*/
