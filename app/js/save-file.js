const fs = require('fs');


var path = 'settings.sls';


exports.saveToFile = function(data){
  var buf = Buffer.alloc(612);

  buf.write(data[0], 0, 200);
  buf.write(data[1], 200, 200);
  buf.write(data[2], 400, 200);
  buf.writeFloatLE(data[3], 600)
  buf.writeFloatLE(data[4], 604)
  buf.writeFloatLE(data[5], 608)

  fs.open(path, 'w', function(err, fd) {
      if (err) {
          Console.log('Could not open save file');
      }

      fs.write(fd, buf, 0, buf.length, null, function(err) {
        if (err) {
          Console.log('Error writing to file');
        }
        fs.close(fd, function() {
            console.log('wrote the file successfully');
        });
      });
  });
}

exports.loadFromFile = function(callback){

  var buf = Buffer.alloc(612);

  var returnData = [];

  fs.open(path, 'r', function(err, fd) {
    if (err) {
      console.log("Could not open Save file for reading")
    }
    else{

    fs.read(fd, buf, 0, buf.length, null, function(err) {
      if (err) {console.log("Error reading file")}
      else{

        returnData[0] = buf.toString('utf8', 0, 200);
        returnData[1] = buf.toString('utf8', 200, 200);
        returnData[2] = buf.toString('utf8', 400, 200);
        returnData[3] = buf.readFloatLE(600);
        returnData[4] = buf.readFloatLE(604);
        returnData[5] = buf.readFloatLE(608);


    }

      fs.close(fd, function() {
        console.log('read the file successfully');
        callback(returnData);
      });
    });
  }
})
}
