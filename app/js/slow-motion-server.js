// var exec = require('child_process').exec;
// var ffmpeg = require('ffmpeg-static');
//
// var cmd1 = ffmpeg.path;
//
// console.log(cmd1)
//
// exec(cmd1, function(error, stdout, stderr){
//   if(error == null){
//     console.log("good run")
//   }
//   else{
//     console.log(error)
//   }
// })

var fs = require('fs');
var http = require('http');
var path = require('path');

var events = require('events').EventEmitter;
var EventEmitter = new events.EventEmitter();



function processRequest(req, res)
{
  if(req.url == '/connect'){
    //this is a connect request
    res.write('connected');
    res.end();
  }
  else if(req.headers['content-type'] && req.headers['content-type']=='video/mp4'){
    //incoming video file
    console.log('Incoming File');
    var filePath = path.basename(req.url);
    var file =  fs.createWriteStream(filePath);

    req.pipe(file);
    req.on('end', function(){
        res.end();
        console.log("Download Complete")
        EventEmitter.emit('newFile', req.url);
    })
  }
  else{
    // not a connect or a video file so close the response and ignore it
    res.end();
  }



  // console.log("request")
  // console.log(req.url)
  // console.log(req.headers);
  // var filePath = path.basename(req.url);
  // var file =  fs.createWriteStream(filePath);
  //
  //
  // req.pipe(file);
  // req.on('end', function(){
  //     // res.writeHead(200, {'Content-Type': 'text/html'});
  //     // res.write('Hello World!');
  //     res.end();
  //     console.log("done")
  // })
}



http.createServer(processRequest).listen(3000);
