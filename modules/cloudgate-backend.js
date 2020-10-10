var FormData = require('form-data');
const axios = require('axios');
const apiDB = require('./api-db');
const apiFS = require('./api-fs')
const appConfig = require(process.env.APPCONFIG_PATH);

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
        var beginPipeline = process.hrtime();
        apiFS.WriteTextFile(filekey, content);
        const nanoSeconds = process.hrtime(beginPipeline).reduce((sec, nano) => sec * 1e9 + nano);
        var durationMS = (nanoSeconds/1000000);

        resolve({
                status: 'OK'
            });
  });
}


exports.fileBinaryWrite = function (filekey, content) {
  return new Promise((resolve, reject) => {
    var beginPipeline = process.hrtime();
    apiFS.WriteBinaryFile(filekey, content);
    const nanoSeconds = process.hrtime(beginPipeline).reduce((sec, nano) => sec * 1e9 + nano);
    var durationMS = (nanoSeconds/1000000);

    resolve({
            status: 'OK'
        });
  });
}

exports.fileDelete = function (filekey) {
  return new Promise((resolve, reject) => {
    var beginPipeline = process.hrtime();
    apiFS.FileDelete(filekey);
    const nanoSeconds = process.hrtime(beginPipeline).reduce((sec, nano) => sec * 1e9 + nano);
    var durationMS = (nanoSeconds/1000000);

    resolve({
            status: 'OK'
        });
  });
}

exports.fileRename = function (filekey, destkey) {
  return new Promise((resolve, reject) => {
    var beginPipeline = process.hrtime();
    apiFS.FileRename(filekey, destkey);
    const nanoSeconds = process.hrtime(beginPipeline).reduce((sec, nano) => sec * 1e9 + nano);
    var durationMS = (nanoSeconds/1000000);

    resolve({
            status: 'OK'
        });
  });
}

exports.fileCopy = function (filekey, destkey) {
    return new Promise((resolve, reject) => {
        var beginPipeline = process.hrtime();
        apiFS.FileCopy(filekey, destkey);
        const nanoSeconds = process.hrtime(beginPipeline).reduce((sec, nano) => sec * 1e9 + nano);
        var durationMS = (nanoSeconds/1000000);

        resolve({
                status: 'OK'
            });
  });
}

exports.fileSaveUploaded = function(filekey, destkey) {
    //TODO: filesaveuploaded form data thingy
}


exports.directoryCreate = function (directoryName) {
  return new Promise((resolve, reject) => {
        apiFS.DirectoryCreate(directoryName);
        resolve({
                status: 'OK',
            }
        );
  });
}

exports.directoryList = function (directoryName) {
  return new Promise((resolve, reject) => {
    let list = apiFS.DirectoryList(directoryName);
    resolve({
            status: 'OK',
            payload: list
        });
  });
}

exports.directoryRename = function (directoryName, destDirectory) {
  return new Promise((resolve, reject) => {
    apiFS.DirectoryRename(directoryName, destDirectory);
    resolve({
            status: 'OK',
        });
  });
}

exports.directoryDelete = function (directoryName) {
  return new Promise((resolve, reject) => {
    apiFS.DirectoryDelete(directoryName);
    resolve({
            status: 'OK',
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
    var rows =  { "Table": await apiDB.ExecuteQuery(appConfig, query) }
    resolve((rows));
  });
}

exports.sqlExecuteRawQuery = function (query) {
  return new Promise(async (resolve, reject) => {
    var rows =  { "Table": await apiDB.ExecuteQuery(appConfig, query) }
    resolve((rows));
  });
}