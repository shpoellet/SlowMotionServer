var exec = require('child_process').exec;
var ffmpeg = require('ffmpeg-static');
var fs = require('fs');
var http = require('http');
var path = require('path');
var events = require('events').EventEmitter;
var EventEmitter = new events.EventEmitter();
const {ipcMain} = require('electron');
// var SaveFile = require('./save-file.js')

var Window;

var introSrcPath = 'Not Set';
var exitSrcPath = 'Not Set';
var musicSrcPath = 'Not Set';

var introOriginal ='';
var exitOriginal ='';
var musicOriginal ='';

var introSet = false;
var exitSet = false;
var musicSet = false;

var introConverting = false;
var exitConverting = false;
var musicConverting = false;

var exportPath = 'export/';
var exportName = 'GBPAC_Slow_Motion_';

var delayTime = 1;
var durationTime = 0.5;
var stretchLength = 10;

// function saveData(){
//   var data = [];
//   data[0] = introOriginal;
//   console.log(data[0])
//   data[1] = exitOriginal;
//   data[2] = musicOriginal;
//   data[3] = delayTime;
//   data[4] = durationTime;
//   data[5] = stretchLength;
//   SaveFile.saveToFile(data);
// }
//
// function applySavedData(saveData){
//   console.log('Applying settings from file')
//   setIntroVideo(saveData[0]);
//   console.log(saveData[0])
//   console.log(saveData[1])
//   console.log(saveData[2])
//   // setExitVideo(saveData[1]);
//   // setMusic(saveData[2]);
//   delayTime = saveData[3];
//   durationTime = saveData[4];
//   stretchLength = saveData[5];
//   pushSettingsToGui();
//
// }


function setIntroVideo(fileSrc){
  introSet = false;
  introConverting = true;
  introSrcPath = 'Converting';
  Window.webContents.send('setIntroFile', 'Converting: ' + fileSrc);
  guiLog('Converting Intro Video');
  convertToMP4(fileSrc, 'intermediate/ends/intro.mp4', null, null, null, function(err, src, dst){
    if(err){
      console.log("Failed to convert intro to mp4");
      introSet=false;
      introConverting=false;
      introSrcPath = 'Not Set';
      Window.webContents.send('setIntroFile', 'Conversion Failed');
      guiLog('Convert Intro Video Failed');
    }
    else{
      convertToStream(dst, 'intermediate/ends/intro.ts', function(err, src, dst){
        if(err){
          console.log("Failed to convert intro to stream");
          introSet=false;
          introConverting=false;
          introSrcPath = 'Not Set';
          Window.webContents.send('setIntroFile', 'Conversion Failed');
          guiLog('Convert Intro Video Failed');
        }
        else{
          console.log("Intro conversion complete");
          introSet=true;
          introConverting=false;
          introSrcPath = dst;
          introOriginal = fileSrc;
          Window.webContents.send('setIntroFile', fileSrc);
          // saveData()
          guiLog('Convert Intro Video Complete');
        }
      });
    }
  });
}

function setExitVideo(fileSrc){
  exitSet = false;
  exitConverting = true;
  exitSrcPath = 'Converting';
  guiLog('Converting Exit Video');
  Window.webContents.send('setExitFile', 'Converting: ' + fileSrc);
  convertToMP4(fileSrc, 'intermediate/ends/exit.mp4', null, null, null, function(err, src, dst){
    if(err){
      console.log("Failed to convert exit to mp4");
      exitSet=false;
      exitConverting=false;
      exitSrcPath = 'Not Set'
      Window.webContents.send('setExitFile', 'Conversion Failed');
      guiLog('Convert Exit Video Failed');
    }
    else{
      convertToStream(dst, 'intermediate/ends/exit.ts', function(err, src, dst){
        if(err){
          console.log("Failed to convert exit to stream");
          exitSet=false;
          exitConverting=false;
          exitSrcPath = 'Not Set'
          Window.webContents.send('setExitFile', 'Conversion Failed');
          guiLog('Convert Exit Video Failed');
        }
        else{
          console.log("Exit conversion complete");
          exitSet=true;
          exitConverting=false;
          exitSrcPath = dst;
          exitOriginal = fileSrc;
          Window.webContents.send('setExitFile', fileSrc);
          // saveData()
          guiLog('Convert Exit Video Complete');
        }
      });
    }
  });
}

function setMusic(fileSrc){
  musicSet = false;
  musicConverting = true;
  musicSrcPath = 'Converting';
  guiLog('Converting Music');
  Window.webContents.send('setMusicFile', 'Converting: ' + fileSrc);
  convertToMP4(fileSrc, 'intermediate/music.WAV', null, null, null, function(err, src, dst){
    if(err){
      console.log("Failed to convert music to WAV");
      musicSet=false;
      musicConverting=false;
      musicSrcPath = 'Not Set'
      Window.webContents.send('setMusicFile', 'Conversion Failed');
      guiLog('Convert Music Failed');
    }
    else{
      console.log("Music conversion complete");
      musicSet = true;
      musicConverting = false;
      musicSrcPath = dst;
      musicOriginal = fileSrc;
      Window.webContents.send('setMusicFile', fileSrc);
      // saveData()
      guiLog('Convert Music Complete');
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

function replaceAudio(srcName, callback){
  cmd = 'ffmpeg -y -i intermediate/' + srcName + '_assembeled.mp4 -i ' + musicSrcPath + ' -c:v copy -map 0:v:0 -map 1:a:0 -shortest ' + exportPath + exportName + srcName + '.mp4';
  exec(cmd, function(error, stdout, stderr){
    if(error){
      console.log('Replace Audio failed: ' + error);
    }
    callback && callback(error);
  })
}

function convertToWAV(src, dst, callback){
  var cmd = ffmpeg.path + ' -y -i ' + src + ' -c:a pcm_s16le ' + dst;
  exec(cmd, function(error, stdout, stderr){
    if(error){
      console.log('Convert to WAV failed: ' + error);
    }
    callback && callback(error, src, dst);
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
  guiLog('Video Processing Started: '+srcName);
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
          replaceAudio(srcName, function(err){
            if(err){

            }
            else{
              console.log(srcName + ': Processing Complete');
              guiLog('Video Processing Complete: ' + srcName);
            }
          })
        }
      });
    }

    if(failed){
      clearInterval(pTick);
      console.log('video conversion failed')
      guiLog('Video Conversion Failed: ' + srcName);
    }

  }

  var pTick = setInterval(processTick, 100);

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
    guiLog('Incoming File: ' + path.basename(req.url));
    var filePath = 'src/'+path.basename(req.url);
    var file =  fs.createWriteStream(filePath);

    req.pipe(file);
    req.on('end', function(){
        res.end();
        console.log("Download Complete")
        guiLog('Received File: ' + path.basename(req.url));
        EventEmitter.emit('newFile', req.url);
        if(introSet & exitSet){
          if(musicSet){
            processSlowVideo(filePath, 1, 0.5, 10);
          }
          else{
            Window.webContents.send('alert', 'Music not set.');
            guiLog('Could not process video: Music not set');
          }
        }
        else{
          Window.webContents.send('alert', 'Intro or Exit video not set.');
          guiLog('Could not process video: Intro or Exit video not set')
        }
    })
  }
  else{
    // not a connect or a video file so close the response and ignore it
    res.end();
  }
}

function pushSettingsToGui(){
  Window.webContents.send('setIntroFile', introSrcPath);
  Window.webContents.send('setExitFile', exitSrcPath);
  Window.webContents.send('setMusicFile', musicSrcPath);
  Window.webContents.send('setTimes', delayTime, durationTime, stretchLength);
}


function guiLog(value){
  Window.webContents.send('log', value);
}

exports.init = function(item){
  Window = item;
  http.createServer(processRequest).listen(3000);
  pushSettingsToGui();
  // SaveFile.loadFromFile(applySavedData)
  setIntroVideo('src/slowMoStart.mp4');
  setExitVideo('src/slowMoExit.mp4');
  setMusic('src/slowMoMusic.mp3');
  guiLog('Server Started')
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

ipcMain.on('musicFile', function(event, item){
  if(!musicConverting){
    setMusic(item);
  }
  else{
    Window.webContents.send('alert', 'Music Conversion alrady in process please wait.');
  }
})

ipcMain.on('setTimes', function(event, inDelay, inDur, inStretch){
  console.log('Times Set')
  delayTime = inDelay;
  durationTime = inDur;
  stretchLength = inStretch;
  Window.webContents.send('setTimes', delayTime, durationTime, stretchLength);
  // saveData()
  guiLog('Times Set');
})

ipcMain.on('serverSettingsOpen', function(event){
  pushSettingsToGui();
})
