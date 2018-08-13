const {ipcRenderer} = require('electron');
const dialog = require('electron').remote.dialog


//local functions
function closeSettingsPanes(){
  var panes = document.getElementsByClassName('settings_pane');
  for(var i=0; i<panes.length; i++){
    panes[i].style.display = 'none'
  }
}

function showAlert(msg){
  document.getElementById('alert_message').innerHTML = msg;
  document.getElementById('alert_pane').style.display = 'block';
}

//Settings Page
ipcRenderer.on('alert', function(event, value){
  showAlert(value);
})

ipcRenderer.on('updateTimes', function(event, value){
  document.getElementById('delay_time').value = value[0];
  document.getElementById('duration_time').value = value[1];
  document.getElementById('stretch_length').value = value[2];
})

ipcRenderer.on('setIntroFile', function(event, value){
  document.getElementById('intro_file_name').innerHTML = value;
})

ipcRenderer.on('setExitFile', function(event, value){
  document.getElementById('exit_file_name').innerHTML = value;
})

//------------------------------------------------------------------------
//Mouse Clicks


// Alert Page
document.getElementById("alert_button").onmousedown = function(){
  document.getElementById('alert_pane').style.display = 'none';
}

//Server Settings Page
document.getElementById("Server_status").onmousedown = function(){
  ipcRenderer.send('serverSettingsOpen');
  closeSettingsPanes();
  document.getElementById('server_settings_pane').style.display = 'block';
}

document.getElementById("server_close_button").onclick = function(){
  document.getElementById('server_settings_pane').style.display = 'none';
}

document.getElementById("select_intro_button").onclick = function(){
  dialog.showOpenDialog(function (fileNames) {
    if(fileNames === undefined) {
      showAlert('No File Selected');
    }
    else {
      ipcRenderer.send("inputFile", fileNames[0]);
    }
  });
}

document.getElementById("select_exit_button").onclick = function(){
  dialog.showOpenDialog(function (fileNames) {
    if(fileNames === undefined) {
      showAlert('No File Selected');
    }
    else {
      ipcRenderer.send("exitFile", fileNames[0]);
    }
  });
}

document.getElementById("save_time_button").onclick = function(){
    // var i;
  // var input;
  // var validInput = true;
  // var ip = [0, 0, 0, 0];
  // for(i=0; i<4; i++){
  //   input = parseInt(document.getElementById('IP_pivot_'+i).value);
  //   if(input>=0 & input<256){
  //     ip[i] = input;
  //   }
  //   else{
  //     document.getElementById('IP_pivot_'+i).value = '';
  //     validInput = false;
  //   }
  // }
  //
  // if(validInput){
  //   ipcRenderer.send('setPivotIP', ip);
  // }
}
