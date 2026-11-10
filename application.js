const metadata = require('./metadata');
const createModuleHelp = require('./module');
const path = require('path');
const notifications = require('./notifications');
const fs = require('fs');
const _ = require('lodash');
const markdown = require('./markdown');
const fsStuff = require('./fs-stuff'); 
const chalk = require('chalk');

module.exports = function createApplicationHelp(app, workingPath, outputPath) {
    process.chdir(path.join(workingPath, app.name));
    _.assignIn(app, metadata.parseXML('Application.config'));
    var moduleNames = metadata.scanFor('Module.config');
    
    app.modules = [];
    var appOutputPath = path.join(outputPath, `${app.name}`);
    fsStuff.rimraf(appOutputPath);
    fs.mkdirSync(appOutputPath);
    moduleNames.forEach(moduleName => {
        if (!fs.existsSync(appOutputPath + '\\Modules')) 
            fs.mkdirSync(appOutputPath + '\\Modules');

        mod = { name: moduleName, appName: app.name };
        if (createModuleHelp(mod, path.join(workingPath, app.name), appOutputPath)) {
            app.modules.push(mod);
        }
    });
    if (!metadata.defined(app.localize)) {
        app.localize = `${app.name} Application`;
    }
    if (app.modules.length > 0) {
        console.log(chalk.bold(`${app.name.toUpperCase()} Modules :`));
        createHelpFile(appOutputPath, app);
        console.log(moduleNames);
        return true;
    } else {
        fsStuff.rimraf(appOutputPath);
    }
    return false;
}

//=============================================================================
function createHelpFile(appOutputPath, app) {
    var content = `[H3]${app.localize}\nHere the **${app.localize}** modules:\n\n`;

    var gridContent = [["**Module name / folder**", 
                        "**Description**"]];
    app.modules.forEach(module => {
        gridContent.push([`[LINK ${module.appName}-${module.name} ${module.name}]`, markdown.adjust(module.localize)]);
        
    });
    content += markdown.gridRender(gridContent, { forceTableNewLines : true });

    app.modules.forEach(module => {
        content += `[INCLUDE Modules/${module.name}_tables.sam]\n`;
    });
    
    try {
        fs.writeFileSync(path.join(appOutputPath, `${app.name}_modules.sam`), content);
    } catch (err) {
        notifications.error(err);
    }
}

