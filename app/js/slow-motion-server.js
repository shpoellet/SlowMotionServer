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

// function (req, res) {
//   res.writeHead(200, {'Content-Type': 'text/html'});
//   res.write('Hello World!');
//   res.end();
// }



function downloadFile(req, res)
{

  console.log("request")
  console.log(req.headers);
  var filePath = path.basename(req.url);
  var file =  fs.createWriteStream(filePath);


  req.pipe(file);
  req.on('end', function(){
      res.writeHead(200, {'Content-Type': 'text/html'});
      res.write('Hello World!');
      res.end();
      console.log("done")
  })
}



http.createServer(downloadFile).listen(3000);
