
module.exports = (content) => {

    var finalContent = content;    

    var appPath = "//s3-eu-west-1.amazonaws.com/dev.appdrag.com/p24-fbd675/";
    finalContent = finalContent.replace(new RegExp( appPath, 'g' ), "");

    finalContent = finalContent.replace(new RegExp( "//cf.appdrag.com/", 'g' ), "//1e64.net/");
    finalContent = finalContent.replace(new RegExp( "//s3-eu-west-1.amazonaws.com/dev.appdrag.com/", 'g' ), "//1e64.net/");
    
    return finalContent;
}

