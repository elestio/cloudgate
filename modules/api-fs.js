const fs = require('fs');

function WriteTextFile(filekey, content) {
    if (!fs.existsSync('public')) {
        fs.mkdirSync('public')
    }
    if (!fs.existsSync('public/uploads')) {
        fs.mkdirSync('public/uploads')
    }
    let isDir = filekey.split('/');
    let filename = isDir.slice(-1)[0];
    console.log(isDir, filename)
    let fullPath = "";
    isDir.map(value => {
        if (fullPath === "") {
            fullPath += value
        } else {
            fullPath += `/${value}`;
        }
        if (value === filename) {
            fs.writeFileSync(`./public/uploads/${fullPath}`, content);
        } else {
            fs.mkdirSync(`./public/uploads/${fullPath}`)
        }
    })
    return;
}

function WriteBinaryFile(filekey, content) {
    if (!fs.existsSync('public')) {
        fs.mkdirSync('public');
    }
    if (!fs.existsSync('public/uploads')) {
        fs.mkdirSync('public/uploads')
    }
    let isDir = filekey.split('/');
    let filename = isDir.slice(-1)[0];
    let fullPath = "";
    isDir.map(value => {
        if (fullPath === "") {
            fullPath += value;
        } else {
            fullPath += `/${value}`;
        }
        if (value === filename) {
            //TODO: deal with binary data
        } else {
            fs.mkdirSync(`./public/uploads/${fullPath}`);
        }
    })
    return;
}


function FileDelete(filekey) {
    if (fs.existsSync(`public/uploads/${filekey}`)) {
        fs.unlinkSync(`public/uploads/${filekey}`)
    }
    return;
}

function FileRename(filekey, destkey) {
    if (fs.existsSync(`public/uploads/${filekey}`)) {
        fs.renameSync(`public/uploads/${filekey}`, `public/uploads/${destkey}`)
    }
    return;
}

function FileCopy(filekey, destkey) {
    if (fs.existsSync(`public/uploads/${filekey}`)) {
        fs.copyFileSync(`public/uploads/${filekey}`, `public/uploads/${destkey}`)
    }
    return;
}

function FileSaveUpload(filekey, destkey) {
    //TODO:
    return;
}

function DirectoryCreate(directoryName) {
    if (!fs.existsSync(`public/uploads/${directoryName}`)) {
        fs.mkdirSync(`public/uploads/${directoryName}`)
    }
    return;
}

function DirectoryList(directoryName) {
    if (fs.existsSync(`public/uploads/${directoryName}`)) {
        let filenames = fs.readdirSync(`public/uploads/${directoryName}`);
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
            if (fs.lstatSync(`public/uploads/${file}`).isDirectory()) {
                fileobj.type = "DIRECTORY";
                if (fs.readdirSync(`public/uploads/${file}`).length !== 0) {
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
    if (fs.existsSync(`public/uploads/${directoryName}`)) {
        fs.renameSync(`public/uploads/${directoryName}`, `public/uploads/${destDirectory}`);
    }
    return;
}

function DirectoryDelete(filekey) {
    if (fs.existsSync(`public/uploads/${filekey}`)) {
        fs.rmdirSync(`public/uploads/${filekey}`, { recursive: true });
        return true;
    }
    return false;
}

module.exports = { WriteTextFile, WriteBinaryFile, FileCopy, 
    FileDelete, FileRename, FileSaveUpload,
    DirectoryCreate, DirectoryDelete, DirectoryList, DirectoryRename }