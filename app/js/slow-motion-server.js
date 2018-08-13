var exec = require('child_process').exec;
var ffmpeg = require('ffmpeg-static');
var fs = require('fs');
var http = require('http');
var path = require('path');
var events = require('events').EventEmitter;
var EventEmitter = new events.EventEmitter();
const {ipcMain} = require('electron');

var Window;

var introSrcPath = null;
var exitSrcPath = null;

var introSet = false;
var exitSet = false;

var introConverting = false;
var exitConverting = false;

function setIntroVideo(fileSrc){
  introSet = false;
  introConverting = true;
  Window.webContents.send('setIntroFile', 'Converting: ' + fileSrc);
  convertToMP4(fileSrc, 'intermediate/ends/intro.mp4', null, null, null, function(err, src, dst){
    if(err){
      console.log("Failed to convert intro to mp4");
      introSet=false;
      introConverting=false;
      Window.webContents.send('setIntroFile', 'Conversion Failed');
    }
    else{
      convertToStream(dst, 'intermediate/ends/intro.ts', function(err, src, dst){
        if(err){
          console.log("Failed to convert intro to stream");
          introSet=false;
          introConverting=false;
          Window.webContents.send('setIntroFile', 'Conversion Failed');
        }
        else{
          console.log("Intro conversion complete");
          introSet=true;
          introConverting=false;
          introSrcPath = dst;
          Window.webContents.send('setIntroFile', fileSrc);
        }
      });
    }
  });
}

function setExitVideo(fileSrc){
  exitSet = false;
  exitConverting = true;
  Window.webContents.send('setExitFile', 'Converting: ' + fileSrc);
  convertToMP4(fileSrc, 'intermediate/ends/exit.mp4', null, null, null, function(err, src, dst){
    if(err){
      console.log("Failed to convert exit to mp4");
      exitSet=false;
      exitConverting=false;
      Window.webContents.send('setExitFile', 'Conversion Failed');
    }
    else{
      convertToStream(dst, 'intermediate/ends/exit.ts', function(err, src, dst){
        if(err){
          console.log("Failed to convert exit to stream");
          exitSet=false;
          exitConverting=false;
          Window.webContents.send('setExitFile', 'Conversion Failed');
        }
        else{
          console.log("Exit conversion complete");
          exitSet=true;
          exitConverting=false;
          exitSrcPath = dst;
          Window.webContents.send('setExitFile', fileSrc);
        }
      });
    }
  });
}




function convertToMP4(src, dst, start, duration, stretch, callback){
  var cmd = ffmpeg.path + ' -y';
  if(start)cmd = cmd + ' -ss ' + start;
  if(duration)cmd = cmd + ' -t ' + duration;
  cmd = cmd + ' -i ' + src + ' -f mp4 -vcodec libx264 -acodec aac -s 1280x720 -r 24 ';
  if(stretch)cmd = cmd + '-filter:v "setpts=' + stretch + '*PTS" ';
  cmd = cmd + dst;
  exec(cmd, function(error, stdout, stderr){
    if(error){
      console.log('Convert to MP4 failed: ' + error);
    }
    callback && callback(error, src, dst);
  })
}

function convertToStream(src, dst, callback){
  var cmd = ffmpeg.path + ' -y -i ' + src + ' -c copy -bsf:v h264_mp4toannexb -f mpegts ' + dst;
  exec(cmd, function(error, stdout, stderr){
    if(error){
      console.log('Convert to stream failed: ' + error);
    }
    callback && callback(error, src, dst);
  })
}

function assembleVideo(srcName, dst, callback){
  console.log(srcName + ': Assembly Started');
  var cmd = 'ffmpeg -y -i "concat:' +
            introSrcPath + //intro video
            '|intermediate/' +srcName + '_chunk0.ts' + //chunk0
            '|intermediate/' +srcName + '_chunk1.ts' + //chunk1
            '|intermediate/' +srcName + '_chunk2.ts' + //chunk2
            '|' + exitSrcPath + '"' + //exit video
            ' -c copy -bsf:a aac_adtstoasc ' + dst;


            // 'intermediate/ends/intro.ts' + //intro video
            // '|intermediate/' +srcName + '_chunk0.ts' + //chunk0
            // '|intermediate/' +srcName + '_chunk1.ts' + //chunk1
            // '|intermediate/' +srcName + '_chunk2.ts' + //chunk2
            // '|intermediate/ends/exit.ts"' + //exit video


  exec(cmd, function(error, stdout, stderr){
    if(error){
      console.log('Assembly failed: ' + error);
    }
    callback && callback(error, dst);
  })

}

////////////////////////////////
//processSlowVideo
////////////////////////////////
//will process the video to slow down the middle and add the into and exit
function processSlowVideo(src, leadTime, slowTime, stretch){
  var chunkStates = ['notReady', 'notReady', 'notReady'];
  var srcName = path.parse(src).name;
  console.log(srcName + ': Start Processing');

  //convert chunk 0
  convertToMP4(src, 'intermediate/'+srcName+'_chunk0.mp4', null, leadTime, null, function(err, src, dst){
    if(err){
      console.log(srcName + ": Chunk 0 to mp4 failed: " + err);
      chunkStates[0] = 'failed';
    }
    else{
      convertToStream(dst, 'intermediate/'+srcName+'_chunk0.ts', function(err, src, dst){
        if(err){
          console.log(srcName + ": Chunk 0 to ts failed: " + err);
          chunkStates[0] = 'failed';
        }
        else{
          console.log(srcName + ": Chunk 0 to Stream complete");
          chunkStates[0] = 'done';
        }
      });
    }
  });

  //convert chunk 1
  convertToMP4(src, 'intermediate/'+srcName+'_chunk1.mp4', leadTime, slowTime, stretch, function(err, src, dst){
    if(err){
      console.log(srcName + ": Chunk 1 to mp4 failed: " + err);
      chunkStates[1] = 'failed';
    }
    else{
      convertToStream(dst, 'intermediate/'+srcName+'_chunk1.ts', function(err, src, dst){
        if(err){
          console.log(srcName + ": Chunk 1 to ts failed: " + err);
          chunkStates[1] = 'failed';
        }
        else{
          console.log(srcName + ": Chunk 1 to Stream complete");
          chunkStates[1] = 'done';
        }
      });
    }
  });

  //convert chunk 2
  convertToMP4(src, 'intermediate/'+srcName+'_chunk2.mp4', leadTime+slowTime, null, null, function(err, src, dst){
    if(err){
      console.log(srcName + ": Chunk 2 to mp4 failed: " + err);
      chunkStates[2] = 'failed';
    }
    else{
      convertToStream(dst, 'intermediate/'+srcName+'_chunk2.ts', function(err, src, dst){
        if(err){
          console.log(srcName + ": Chunk 2 to ts failed: " + err);
          chunkStates[2] = 'failed';
        }
        else{
          console.log(srcName + ": Chunk 2 to Stream complete");
          chunkStates[2] = 'done';
        }
      });
    }
  });

  //funciton that will be looped until the chunks are converted to streams
  function processTick(){
    var ready = true;
    var failed = false;
    for (var i = 0; i < chunkStates.length; i++) {
      if(chunkStates[i] != 'done') ready = false;
      if(chunkStates[i] == 'failed') failed = true;
    }

    if(ready){
      clearInterval(pTick);
      assembleVideo(srcName, 'intermediate/'+srcName+'_assembeled.mp4', function(err, dst){
        if(err){

        }
        else{
          console.log(srcName + ': Assembly Complete');
        }
      });
    }

    if(failed){
      clearInterval(pTick);
      console.log('video conversion failed')
    }

  }

  var pTick = setInterval(processTick, 100);

}

// processSlowVideo('src/00000100.mp4', 1, 0.5, 10);


// convertToMP4('src/start.mp4', 'intermediate/ends/intro.mp4', null, null, null, function(err, src, dst){
//   convertToStream(dst, 'intermediate/ends/intro.mp4', function(err, src2, dst2){
//     console.log('stream done')
//   });
// });
// convertToMP4('src/start.mp4', 'intermediate/ends/intro.mp4', null, 1, null, null);
// convertToMP4('src/start.mp4', 'intermediate/ends/intro.mp4', 1, .5, 10, null);
// convertToMP4('src/start.mp4', 'intermediate/ends/intro.mp4', 1.5, null, null, null);







// var cmdStart = ffmpeg.path + ' -i start.mov -f mp4 -vcodec libx264 -acodec aac -s 1280x720 -r 24 -y intro.mp4';
// var cmdEnd = ffmpeg.path + ' -i end.mpeg -f mp4 -vcodec libx264 -acodec aac -s 1280x720 -r 24 -y exit.mp4';
//
// exec(cmdStart, function(error, stdout, stderr){
//   if(error == null){
//     console.log("good run")
//   }
//   else{
//     console.log(error)
//   }
// })
//
//
//
// exec(cmdEnd, function(error, stdout, stderr){
//   if(error == null){
//     console.log("good run")
//   }
//   else{
//     console.log(error)
//   }
// })


// function convert(filePath){
//   // var cmd1 = ffmpeg.path + ' -i '+ filePath + ' -c copy -bsf:v h264_mp4toannexb -f mpegts intermediate1.ts';
//
//   var cmd1 = ffmpeg.path + ' -i ' + filePath + ' -f mp4 -vcodec libx264 -acodec aac -s 1280x720 -r 24 -y out.mp4';
//   exec(cmd1, function(error, stdout, stderr){
//     if(error == null){
//       console.log("good run")
//       // var cmd2 = ffmpeg.path + ' -i intro.mp4 -i out.mp4 -i exit.mp4 -filter_complex "[0:v:0][0:a:0][1:v:0][1:a:0][2:v:0][2:a:0]concat=n=3:v=1:a=1[outv][outa]" -map "[outv]" -map "[outa]" output.mp4'
//       // exec(cmd1, function(error, stdout, stderr){
//       //   if(error == null){
//       //     console.log("done")
//       //   }
//       //   else{
//       //     console.log(error)
//       //   }
//       // })
//
//     }
//     else{
//       console.log(error)
//     }
//   })
// }


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
    var filePath = 'src/'+path.basename(req.url);
    var file =  fs.createWriteStream(filePath);

    req.pipe(file);
    req.on('end', function(){
        res.end();
        console.log("Download Complete")
        EventEmitter.emit('newFile', req.url);
        if(introSet & exitSet){
          processSlowVideo(filePath, 1, 0.5, 10);
        }
        else{
          Window.webContents.send('alert', 'Intro or Exit video not set.');
        }


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


exports.init = function(item){
  Window = item;
  http.createServer(processRequest).listen(3000);
}


//gui events

ipcMain.on('inputFile', function(event, item){
  if(!introConverting){
    setIntroVideo(item);
  }
  else{
    Window.webContents.send('alert', 'Intro Video Conversion alrady in process please wait.');
  }
})

ipcMain.on('exitFile', function(event, item){
  if(!exitConverting){
    setExitVideo(item);
  }
  else{
    Window.webContents.send('alert', 'Intro Video Conversion alrady in process please wait.');
  }
})
