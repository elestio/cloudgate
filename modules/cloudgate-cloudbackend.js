var FormData = require('form-data');
const axios = require('axios');
const apiDB = require('./api-db');
const apiFS = require('./api-fs')
const appConfig = require (process.env.APPCONFIG_PATH)
var APIUrl = 'https://api.appdrag.com/CloudBackend.aspx';
var beginPipeline = process.hrtime();

var config = {
  headers: {
    'Content-Type': 'application/x-www-form-urlencoded',
  },
  transformResponse: (res) => {
    // Do your own parsing here if needed ie JSON.parse(res);
    return res;
  },
}
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
    return new Promise((resolve, reject) => {
        apiFS.WriteTextFile(filekey, content);
        const nanoSeconds = process.hrtime(beginPipeline).reduce((sec, nano) => sec * 1e9 + nano);
        var durationMS = (nanoSeconds/1000000);

        resolve({
            status: 200,
            content: JSON.stringify({
                status: 'OK'
            }), 
            headers:{
                "Content-Type": "application/json;charset=utf-8;",
                "processTime": durationMS
            }
        });
  });
}


exports.fileBinaryWrite = function (filekey, content) {
  return new Promise((resolve, reject) => {
    apiFS.WriteBinaryFile(filekey, content);
    const nanoSeconds = process.hrtime(beginPipeline).reduce((sec, nano) => sec * 1e9 + nano);
    var durationMS = (nanoSeconds/1000000);

    resolve({
        status: 200,
        content: JSON.stringify({
            status: 'OK'
        }), 
        headers:{
            "Content-Type": "application/json;charset=utf-8;",
            "processTime": durationMS
        }
    });
  });
}

exports.fileDelete = function (filekey) {
  return new Promise((resolve, reject) => {
    apiFS.FileDelete(filekey);
    const nanoSeconds = process.hrtime(beginPipeline).reduce((sec, nano) => sec * 1e9 + nano);
    var durationMS = (nanoSeconds/1000000);

    resolve({
        status: 200,
        content: JSON.stringify({
            status: 'OK'
        }), 
        headers:{
            "Content-Type": "application/json;charset=utf-8;",
            "processTime": durationMS
        }
    });
  });
}

exports.fileRename = function (filekey, destkey) {
  return new Promise((resolve, reject) => {
    apiFS.FileRename(filekey, destkey);
    const nanoSeconds = process.hrtime(beginPipeline).reduce((sec, nano) => sec * 1e9 + nano);
    var durationMS = (nanoSeconds/1000000);

    resolve({
        status: 200,
        content: JSON.stringify({
            status: 'OK'
        }), 
        headers:{
            "Content-Type": "application/json;charset=utf-8;",
            "processTime": durationMS
        }
    });
  });
}

exports.fileCopy = function (filekey, destkey) {
    return new Promise((resolve, reject) => {
        apiFS.FileCopy(filekey, destkey);
        const nanoSeconds = process.hrtime(beginPipeline).reduce((sec, nano) => sec * 1e9 + nano);
        var durationMS = (nanoSeconds/1000000);

        resolve({
            status: 200,
            content: JSON.stringify({
                status: 'OK'
            }), 
            headers:{
                "Content-Type": "application/json;charset=utf-8;",
                "processTime": durationMS
            }
        });
  });
}

exports.fileSaveUploaded = function(filekey, destkey) {
    //TODO: filesaveuploaded form data thingy
}


exports.directoryCreate = function (directoryName) {
  return new Promise((resolve, reject) => {
        apiFS.DirectoryCreate(directoryName);
        const nanoSeconds = process.hrtime(beginPipeline).reduce((sec, nano) => sec * 1e9 + nano);
        var durationMS = (nanoSeconds/1000000);
        resolve({
            status: 200,
            content: JSON.stringify({
                status: 'OK',
            }), 
            headers:{
                "Content-Type": "application/json;charset=utf-8;",
                "processTime": durationMS
            }
        });
  });
}

exports.directoryList = function (directoryName) {
  return new Promise((resolve, reject) => {
    let list = apiFS.DirectoryList(directoryName);
    const nanoSeconds = process.hrtime(beginPipeline).reduce((sec, nano) => sec * 1e9 + nano);
    var durationMS = (nanoSeconds/1000000);
    resolve({
        status: 200,
        content: JSON.stringify({
            status: 'OK',
            payload: list
        }), 
        headers:{
            "Content-Type": "application/json;charset=utf-8;",
            "processTime": durationMS
        }
    });
  });
}

exports.directoryRename = function (directoryName, destDirectory) {
  return new Promise((resolve, reject) => {
    apiFS.DirectoryRename(directoryName, destDirectory);
    const nanoSeconds = process.hrtime(beginPipeline).reduce((sec, nano) => sec * 1e9 + nano);
    var durationMS = (nanoSeconds/1000000);
    resolve({
        status: 200,
        content: JSON.stringify({
            status: 'OK',
        }), 
        headers:{
            "Content-Type": "application/json;charset=utf-8;",
            "processTime": durationMS
        }
    });
  });
}

exports.directoryDelete = function (directoryName) {
  return new Promise((resolve, reject) => {
    apiFS.DirectoryDelete(directoryName);
    const nanoSeconds = process.hrtime(beginPipeline).reduce((sec, nano) => sec * 1e9 + nano);
    var durationMS = (nanoSeconds/1000000);
    resolve({
        status: 200,
        content: JSON.stringify({
            status: 'OK',
        }), 
        headers:{
            "Content-Type": "application/json;charset=utf-8;",
            "processTime": durationMS
        }
    });
  });
}

exports.sendEmailAdvanced = function (from, sender, to, cc, bcc, subject, content, attachments, isHtml, replyTo) {
  return new Promise((resolve, reject) => {
    //TODO:
  });
}


exports.sendEmail = function (from, sender, to, subject, content, isHtml) {
  return new Promise((resolve, reject) => {
    //TODO:
  });
}

exports.downloadRemoteFile = function (url, filekey) {
  return new Promise((resolve, reject) => {
    //TODO:
  });
}

exports.sqlSelect = function (query) {
 return new Promise(async (resolve, reject) => {
    var rows = await apiDB.ExecuteQuery(appConfig, query)
    const nanoSeconds = process.hrtime(beginPipeline).reduce((sec, nano) => sec * 1e9 + nano);
    var durationMS = (nanoSeconds/1000000);

    resolve({
        status: 200,
        content: JSON.stringify(rows), 
        headers:{
            "Content-Type": "application/json;charset=utf-8;",
            "processTime": durationMS
        }
    });
  });
}

exports.sqlExecuteRawQuery = function (query) {
  return new Promise(async (resolve, reject) => {
    var rows = await apiDB.ExecuteQuery(appConfig, query)
    
    const nanoSeconds = process.hrtime(beginPipeline).reduce((sec, nano) => sec * 1e9 + nano);
    var durationMS = (nanoSeconds/1000000);

    resolve({
        status: 200,
        content: JSON.stringify(rows), 
        headers:{
            "Content-Type": "application/json;charset=utf-8;",
            "processTime": durationMS
        }
    });
  });
}