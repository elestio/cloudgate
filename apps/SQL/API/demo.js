exports.handler = async (event, context, callback) => {
    
    var beginPipeline = process.hrtime();

    var apiDB = context.apiDB;
    var rows = await apiDB.ExecuteQuery(context.appConfig, "SELECT * FROM ReferencesDetails LIMIT 1")
    
    const nanoSeconds = process.hrtime(beginPipeline).reduce((sec, nano) => sec * 1e9 + nano);
    var durationMS = (nanoSeconds/1000000);

    callback(null, {
        status: 200,
        content: JSON.stringify(rows), 
        headers:{
            "Content-Type": "application/json;charset=utf-8;",
            "processTime": durationMS
        }
    });

};