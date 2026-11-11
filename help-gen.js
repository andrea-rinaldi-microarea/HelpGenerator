const options       = require("./commonOptions");
const notifications = require('./notifications');
const fs = require('fs');

notifications.info('WELCOME TO THE MAGOCLOUD HELP PAGES GENERATOR!');

if (options.input == "" || options.output == "") 
{
    notifications.error("Usage: helpgen --input <input path> --output <output path>");
}

if (!fs.existsSync(options.output)) {
    notifications.error(`The output path ${options.output} does not exists.`)
}


