const qs = require('querystring');
const cheerio = require('cheerio');


 

var open = false;

module.exports = async (params, content, connection, db) => {

    /*
    if (!open){
        await connection.connect();
        open = true;
    }
    */

    if ( content == null ){
        return content;
    }

    var finalContent = content;
    
    if ( content.indexOf('meta name="datasource"') > -1 )
    {
        const $ = cheerio.load(content);
        var funcName = $("meta[name='datasource']").attr("datasource-function");
        var datasourceID= $("meta[name='datasource']").attr("datasource-id");

        //console.log(funcName + " - " + datasourceID);

        if (funcName == "/getTeam") {
            var id = qs.parse(params).id;
            //console.log("id: " + id);

            var SQL = "SELECT * FROM Team WHERE id = '" + id.replace(/\'/g, "''") + "'";
            var rows = await ExecuteQuery(db, connection, SQL);

            if ( rows == null){
                //empty rows after executeQuery
                console.log("empty rows after executeQuery on getTeam");
                return content;
            }

            //console.log(rows);
            //return rows;

            var curRow = rows[0];
            for (var key in curRow){
                var varToReplace = "[DS" + datasourceID + "=" + key + "]";
                var varValue = curRow[key];
                //console.log(varToReplace + " - " + varValue);
                finalContent = finalContent.replace(varToReplace, varValue);
                finalContent = finalContent.replace(varToReplace, varValue);
                finalContent = finalContent.replace(varToReplace, varValue);
                finalContent = finalContent.replace(varToReplace, varValue);
                finalContent = finalContent.replace(varToReplace, varValue);
                finalContent = finalContent.replace(varToReplace, varValue);
            } 
            return finalContent;
        }
        else if (funcName == "/getReferencesDetails") {
            var id = qs.parse(params).id;
            //console.log("id: " + id);



            var SQL = "SELECT * FROM ReferencesDetails WHERE id = '" + id.replace(/\'/g, "''") + "'";
            var rows = await ExecuteQuery(db, connection, SQL);
            //var rows = [];

            if ( rows == null){
                //empty rows after executeQuery
                console.log("empty rows after executeQuery on getReferencesDetails");
                return content;
            }

            var curRow = rows[0];
            for (var key in curRow){
                var varToReplace = "[DS" + datasourceID + "=" + key + "]";
                var varValue = curRow[key];
                if ( varValue == null ) { varValue = ""; }
                //console.log(varToReplace + " - " + varValue);

                if ( finalContent != null && varToReplace != null) {
                    finalContent = finalContent.replace(varToReplace, varValue);
                }
                
            } 
            return finalContent;
        }
        else if (funcName == "/getRefs") {
            
            var SQL = "SELECT * FROM ReferencesDetails";
            var rows = await ExecuteQuery(db, connection, SQL);
            //var rows = [];

            if ( rows == null){
                //empty rows after executeQuery
                console.log("empty rows after executeQuery on getReferencesDetails");
                return content;
            }

            var templateItem = $(".datasource-repeat[datasource-id='" + datasourceID + "']");
            var templateItemSource = $.html(templateItem);
            
            
            var allGeneratedRows = "";
            for (var i = 0; i < rows.length; i++){

                var genRow = templateItemSource + "";

                var curRow = rows[i];
                for (var key in curRow){
                    var varToReplace = "[DS" + datasourceID + "=" + key + "]";
                    var varValue = curRow[key];
                    if ( varValue == null ) { varValue = ""; }
                    genRow = genRow.replace(varToReplace, varValue);
                } 

                allGeneratedRows += genRow + "\r\n";
            }

            templateItem.after(allGeneratedRows);
            templateItem.remove();
            

            return $.html();
        }
        else {
            return content;
        }

        
    }
    else
    {
        return content;
    }
    
}


function ExecuteQuery(db, connection, SQL)
{
    return new Promise( function(resolve , reject ){
        
        //MYSQL
        connection.query(SQL, function (error, results, fields) {
            if (error) {
                console.log(error);
            }
            resolve(results);
        });
        
        //SQLITE
        //resolve(db.prepare(SQL).all());
        
    });
}


