var exec = require('child_process').exec;
var ffmpeg = require('ffmpeg-static');
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


var cmdStart = ffmpeg.path + ' -i start.mov -f mp4 -vcodec libx264 -acodec aac -s 1280x720 -r 24 -y intro.mp4';
var cmdEnd = ffmpeg.path + ' -i end.mpeg -f mp4 -vcodec libx264 -acodec aac -s 1280x720 -r 24 -y exit.mp4';

exec(cmdStart, function(error, stdout, stderr){
  if(error == null){
    console.log("good run")
  }
  else{
    console.log(error)
  }
})



exec(cmdEnd, function(error, stdout, stderr){
  if(error == null){
    console.log("good run")
  }
  else{
    console.log(error)
  }
})


function convert(filePath){
  // var cmd1 = ffmpeg.path + ' -i '+ filePath + ' -c copy -bsf:v h264_mp4toannexb -f mpegts intermediate1.ts';

  var cmd1 = ffmpeg.path + ' -i ' + filePath + ' -f mp4 -vcodec libx264 -acodec aac -s 1280x720 -r 24 -y out.mp4';
  exec(cmd1, function(error, stdout, stderr){
    if(error == null){
      console.log("good run")
      // var cmd2 = ffmpeg.path + ' -i intro.mp4 -i out.mp4 -i exit.mp4 -filter_complex "[0:v:0][0:a:0][1:v:0][1:a:0][2:v:0][2:a:0]concat=n=3:v=1:a=1[outv][outa]" -map "[outv]" -map "[outa]" output.mp4'
      // exec(cmd1, function(error, stdout, stderr){
      //   if(error == null){
      //     console.log("done")
      //   }
      //   else{
      //     console.log(error)
      //   }
      // })

    }
    else{
      console.log(error)
    }
  })
}


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
        convert(filePath);
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
