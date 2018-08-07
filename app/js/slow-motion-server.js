var exec = require('child_process').exec;
var ffmpeg = require('ffmpeg-static');

var cmd1 = ffmpeg.path;

console.log(cmd1)

exec(cmd1, function(error, stdout, stderr){
  if(error == null){
    console.log("good run")
  }
  else{
    console.log(error)
  }
})
