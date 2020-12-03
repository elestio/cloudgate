const fs = require('fs');
var cloudgateBackend = require('./cloudgate-backend');
const appConfig = require (process.env.APPCONFIG_PATH)

var APIKey = "";
var appID = "";

exports.init = function(_APIKey, _appID) {
  APIKey = _APIKey;
  appID = _appID;
}

exports.newslettersInsertContactsIntoLists = function(list, contacts) {
    //TODO:
  return new Promise((resolve, reject) => {
    //TODO:
  });
}

exports.newslettersDeleteList = function(list, contacts) {

  return new Promise((resolve, reject) => {
    //TODO:
  });
}

exports.newslettersGetFailedMail = function(fromDate) {
    //TODO:
  return new Promise((resolve, reject) => {
    //TODO:
  });
}

exports.newslettersDeleteContactsFromLists = function(list, contacts) {
    //TODO:
  return new Promise((resolve, reject) => {
    //TODO:
  });
}

exports.fileTextWrite = function(filekey, content) {
    CreateBaseStorage();
    return new Promise( async (resolve, reject) => {
        
        await cloudgateBackend.WriteTextFile("CloudBackend/uploads/" + filekey, content);
        
        resolve(JSON.stringify({
                status: 'OK'
        }));
  });
}

exports.fileBinaryWrite = function (filekey, content) {
  CreateBaseStorage();
  return new Promise( async(resolve, reject) => {
        
        await cloudgateBackend.WriteBinaryFile("CloudBackend/uploads/" + filekey, content);
    
        resolve(JSON.stringify( { "status": "OK"  } ));
  });
}

exports.fileDelete = function (filekey) {
  CreateBaseStorage();
  return new Promise( async (resolve, reject) => {
        await cloudgateBackend.FileDelete( "CloudBackend/uploads/" + filekey);
   
        resolve(JSON.stringify({
            status: 'OK'
        }));
  });
}

exports.fileRename = function (filekey, destkey) {
    CreateBaseStorage();
  return new Promise( async(resolve, reject) => {
        await cloudgateBackend.FileRename("CloudBackend/uploads/" + filekey, "CloudBackend/uploads/" + destkey);
    
        resolve(JSON.stringify({
            status: 'OK'
        }));
  });
}

exports.fileCopy = function (filekey, destkey) {
    CreateBaseStorage();
    return new Promise( async(resolve, reject) => {
        await cloudgateBackend.FileCopy("CloudBackend/uploads/" + filekey, "CloudBackend/uploads/" + destkey);

        resolve(JSON.stringify({
            status: 'OK'
        }));
    });
}

exports.fileSaveUploaded = function(filekey, destkey) {
    CreateBaseStorage();
    return new Promise( async(resolve, reject) => {
        var sourceFile = filekey; 
        destkey = sourceFile.filename;
        var resp = await cloudgateBackend.fileBinaryWrite("CloudBackend/uploads/" + destkey, sourceFile.data);
        resolve(JSON.stringify(resp));
    });
}


exports.directoryCreate = function (directoryName) {
  return new Promise( async(resolve, reject) => {
            await cloudgateBackend.DirectoryCreate("CloudBackend/uploads/" + directoryName);
        
            resolve(JSON.stringify({
                status: 'OK',
            }));
  });
}

exports.directoryList = function (directoryName) {
  return new Promise( async(resolve, reject) => {
        let list = await cloudgateBackend.DirectoryList("CloudBackend/uploads/" + directoryName);
   
        resolve(JSON.stringify({
            status: 'OK',
            payload: list
        }));
  });
}

exports.directoryRename = function (directoryName, destDirectory) {
  return new Promise( async(resolve, reject) => {
        await cloudgateBackend.DirectoryRename(directoryName, destDirectory);
    
        resolve(JSON.stringify({
            status: 'OK',
        }));
  });
}

exports.directoryDelete = function (directoryName) {
  return new Promise( async(resolve, reject) => {
        await cloudgateBackend.DirectoryDelete(directoryName);
    
        resolve(JSON.stringify({
            status: 'OK',
        }));
  });
}

exports.sendEmailAdvanced = function (from, sender, to, cc, bcc, subject, content, attachments, isHtml, replyTo) {
  return new Promise( async(resolve, reject) => {
    //TODO:
  });
}


exports.sendEmail = function (from, sender, to, subject, content, isHtml) {
  return new Promise(async (resolve, reject) => {

    var resp = await cloudgateBackend.sendEmail(from, sender, to, subject, content, isHtml);
    var finalResp = null;
    try{
        finalResp = JSON.stringify(resp);
    } catch(ex){
        finalResp = resp;
    }

    //console.log(finalResp)

    resolve(finalResp);
  });
}

exports.downloadRemoteFile = function (url, filekey) {
  return new Promise( async(resolve, reject) => {
    //TODO:
  });
}

exports.sqlSelect = function (query) {
 return new Promise(async (resolve, reject) => {
    
    //ensure we don't pass update result if there is a select to emulare appdrag-cloudbackend response mode (update ...; SELECT; should return only the select)
    var data = await cloudgateBackend.sqlSelect(query);
    //resolve(JSON.stringify(data));
    //console.log(data);
    
    if ( data.Table.length == 2 )
    {
        if (data.Table[0].fieldCount != null && data.Table[0].serverStatus != null)
        {
            var newResp = {"Table": data.Table[1]};
            //resolve(JSON.stringify(newResp));
            resolve(newResp);
            return;
        }
    }

    //resolve(JSON.stringify(data));
    resolve(data);
    
  });
}

exports.sqlExecuteRawQuery = function (query) {
  return new Promise(async (resolve, reject) => {
    //resolve(JSON.stringify(await cloudgateBackend.sqlExecuteRawQuery(query)));
    resolve(await cloudgateBackend.sqlExecuteRawQuery(query));
  });
}

function CreateBaseStorage(){
    if (!fs.existsSync('public/CloudBackend')) {
        fs.mkdirSync('public/CloudBackend')
    }
    if (!fs.existsSync('public/CloudBackend/uploads')) {
        fs.mkdirSync('public/CloudBackend/uploads')
    }
}