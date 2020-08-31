exports.handler = async (event, context, callback) => {

    var beginPipeline = process.hrtime();
    var sharedmem = context.sharedmem;

    //console.log(event.url);
    //console.log(event.method);
    //console.log(event.query);
    //console.log(event.headers);
    //console.log(event.body);

    //Do changes on the body (can be based on url, method, query, headers or body)
    var response = event.body;
    response = response.replace(/Google/g, "Zulu");
    response = response.replace("/images/branding/googlelogo/2x/googlelogo_color_272x92dp.png", "https://image.flaticon.com/icons/svg/3306/3306571.svg");
    response = response.replace(/srcset/g, "disabled-srcset");
    
    //Example to inject a script on the page just before closing html tag
    //response = response.replace(/<\/html>/g, "<script src='https://yourdomain.com/inject.js'></script></html>");

    //Advanced dom manipulations with cheerio
    const cheerio = require('cheerio');
    const $ = cheerio.load(response);

    //Change the home page logo
    $("#hplogo").attr("src", "https://image.flaticon.com/icons/svg/3306/3306571.svg");
    $("#hplogo").attr("height", "90px");
    $("#hplogo").attr("srcset", "");

    //Change the result page logo
    $("#logo img").attr("src", "https://image.flaticon.com/icons/svg/3306/3306571.svg");
    $("#logo img").attr("height", "50px");

    //remove confidentiality rules banner
    $("#taw").remove();
    $("#cnsh").remove();

    response = $.html();
       
    const nanoSeconds = process.hrtime(beginPipeline).reduce((sec, nano) => sec * 1e9 + nano);
    var durationMS = (nanoSeconds/1000000);

    var respObj = {
        status: 200,
        content: response, 
        headers: event.headers
    };
    respObj.headers.processTime = durationMS;
    callback(null, respObj);

};
