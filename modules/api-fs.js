const fs = require('fs');

function WriteTextFile(filekey, content) {
    if (!fs.existsSync('public')) {
        fs.mkdirSync('public')
    }
    var fullPath = `./public/${filekey}`;
    var status = fs.writeFile(fullPath, content, (err)=> {
        if (err) {
            return err;
        }
        else {
            //console.log("Written File");
            return "OK";
        }
    });
}

function WriteBinaryFile(filekey, content) {
    if (!fs.existsSync('public')) {
        fs.mkdirSync('public');
    }
    
    var fullPath = `./public/${filekey}`;
    var status = fs.writeFile(fullPath, Buffer.from(content), 'binary',  (err)=> {
        if (err) {
            return err;
        }
        else {
            //console.log("Written File");
            return "OK";
        }
    });
    
}


function FileDelete(filekey) {
    if (fs.existsSync(`public/${filekey}`)) {
        fs.unlinkSync(`public/${filekey}`)
    }
    return;
}

function FileRename(filekey, destkey) {
    if (fs.existsSync(`public/${filekey}`)) {
        fs.renameSync(`public/${filekey}`, `public/${destkey}`)
    }
    return;
}

function FileCopy(filekey, destkey) {
    if (fs.existsSync(`public/${filekey}`)) {
        fs.copyFileSync(`public/${filekey}`, `public/${destkey}`)
    }
    return;
}

function FileSaveUpload(data, destkey) {
    return new Promise( async(resolve, reject) => {
        var resp = await cloudgateBackend.fileBinaryWrite("public/" + destkey, data);
        resolve(resp);
    });
}

function DirectoryCreate(directoryName) {
    if (!fs.existsSync(`public/${directoryName}`)) {
        fs.mkdirSync(`public/${directoryName}`)
    }
    return;
}

function DirectoryList(directoryName) {
    if (fs.existsSync(`public/${directoryName}`)) {
        let filenames = fs.readdirSync(`public/${directoryName}`);
        let finaltab = [];
        filenames.map(file => {
            let fileobj = {
                "label": "",
                "fullPath": "",
                "path": file,
                "isEmpty": true,
                "type": "FILE",
                "lastWriteTime": 0,
                "size": 0
            };
            if (fs.lstatSync(`public/${file}`).isDirectory()) {
                fileobj.type = "DIRECTORY";
                if (fs.readdirSync(`public/${file}`).length !== 0) {
                    fileobj.isEmpty = false;
                }
            }
            finaltab.push(fileobj);
        });
        return finaltab;
    }
    return [];
}

function DirectoryRename(directoryName, destDirectory) {
    if (fs.existsSync(`public/${directoryName}`)) {
        fs.renameSync(`public/${directoryName}`, `public/${destDirectory}`);
    }
    return;
}

function DirectoryDelete(filekey) {
    if (fs.existsSync(`public/${filekey}`)) {
        fs.rmdirSync(`public/${filekey}`, { recursive: true });
        return true;
    }
    return false;
}

module.exports = { WriteTextFile, WriteBinaryFile, FileCopy, 
    FileDelete, FileRename, FileSaveUpload,
    DirectoryCreate, DirectoryDelete, DirectoryList, DirectoryRename }