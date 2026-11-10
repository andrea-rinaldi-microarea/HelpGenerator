#!/usr/bin/env node
const notifications = require('./notifications');
const chalk = require('chalk');
const _ = require('lodash');
const path = require('path');
const fs = require('fs');
const metadata = require('./metadata');
const createAppHelp = require('./application');
const fsStuff = require('./fs-stuff'); 
const searchRecursiveFileByName = require('./searchFile');

const assets = path.join(path.dirname(require.main.filename), 'assets');

console.log(chalk.bold(chalk.cyan('WELCOME TO THE MAGOCLOUD HELP PAGES GENERATOR!\n')));

var workingPath = null;
const cmdArgs = process.argv.slice(2);

fsStuff.rimraf(cmdArgs[0]);
fs.mkdirSync(cmdArgs[0]);

fsStuff.rimraf("C:\\helpgenoutput");
fs.mkdirSync("C:\\helpgenoutput");

if (cmdArgs.length < 1) {
    notifications.error("Usage: helpgen <output> [input path]\nAt least the output path must be specified.");
}
var outputPath = cmdArgs[0];
if (!fs.existsSync(outputPath)) {
    notifications.error(`The output path ${outputPath} does not exists.`)
}

if (cmdArgs.length < 2) {
    workingPath = process.cwd();
} else {
    workingPath = cmdArgs[1];
}

var splittedPath = (workingPath).toLowerCase().split("\\").filter((element) => element !== "")
var applicationsDir = splittedPath[splittedPath.length - 1]
var standardDir = splittedPath[splittedPath.length - 2]

if(standardDir != "standard" || applicationsDir != "applications")
   notifications.error("Usage: helpgen <output> [input path]\n'input path' argument or current folder must be inside the 'Standard' folder of a TaskBuilder Application\ne.g.: <your instance>\\Standard\\Applications\\<your app>");

process.chdir(workingPath);
var appNames = metadata.scanFor('Application.config');
console.log(chalk.bold('APPLICATIONS :'));
console.log(appNames);

console.log(chalk.bold(chalk.cyan('\n...GENERATION STARTED...')));

console.log(chalk.bold(chalk.cyan('\n...CHECK FOR ENUMERATIONS...')));

var enumsFileLs = searchRecursiveFileByName(workingPath, 'Enums.xml');

metadata.allApplicationsEnumLs = []

for(let i = 0; i < enumsFileLs.length; i ++) {
    var splittedPath = enumsFileLs[i].split("\\");
    var xmlContent = metadata.parseXML(enumsFileLs[i]);

    if(xmlContent.tag != undefined) {
        if(!metadata.isArray(xmlContent)) {
            var tmpContent = JSON.parse(JSON.stringify(xmlContent)).tag
            xmlContent = { tag : [] };
            xmlContent.tag.push(tmpContent) 
        }

        var appName = splittedPath[splittedPath.findIndex((element) => element == 'Applications') + 1]
        var moduleName = splittedPath[splittedPath.findIndex((element) => element == 'Applications') + 2];
            
        for(let i = 0;i < xmlContent.tag.length; i ++ ){
            metadata.allApplicationsEnumLs.push({
                name : xmlContent.tag[i].name,
                value : xmlContent.tag[i].value,
                nameSpace : appName + "." + moduleName + "." + xmlContent.tag[i].value
            })
        }
    }                       
}

console.log(chalk.bold(chalk.cyan('\n...ENUMERATIONS ELABORATED SUCCESSFULLY...')));

console.log(chalk.bold(chalk.cyan('\n...CHECK FOR DOCUMENTS...')));

var docFileLs = searchRecursiveFileByName(workingPath, 'DocumentObjects.xml');

metadata.allApplicationsDocLs = []

for(let i = 0; i < docFileLs.length; i ++) {
    var splittedPath = docFileLs[i].split("\\");
    var xmlContent = metadata.parseXML(docFileLs[i]);

    var xmlContent = metadata.parseXML(docFileLs[i]);

    if(xmlContent.documents != undefined) {
        if(!metadata.isArray(xmlContent)) {
            var tmpContent = JSON.parse(JSON.stringify(xmlContent)).documents.document
            if(Array.isArray(tmpContent)) {
                xmlContent = { documents : tmpContent };
            } else {
                xmlContent = { documents : [] };
                xmlContent.documents.push(tmpContent)
            }
        }

        var appName = splittedPath[splittedPath.findIndex((element) => element == 'Applications') + 1]
        var moduleName = splittedPath[splittedPath.findIndex((element) => element == 'Applications') + 2];
    
        for(let i = 0;i < xmlContent.documents.length; i ++ ) {

            if(xmlContent.documents[i] == undefined)
               continue;

            if(xmlContent.documents[i].viewmodes == undefined || xmlContent.documents[i].viewmodes.mode[0] == undefined || xmlContent.documents[i].viewmodes.mode[0].type == undefined) {
                var nameOfDoc = xmlContent.documents[i].namespace.split('.')
                var pathOfFile = path.join(appName,moduleName,'ModuleObjects', nameOfDoc[nameOfDoc.length - 1], 'Description', 'Dbts.xml')

                if (fs.existsSync(pathOfFile)) {
                    var xmlContentSection = metadata.parseXML(pathOfFile);

                    if(xmlContentSection.master == undefined || xmlContentSection.master.table == undefined || xmlContentSection.master.table.namespace == undefined) 
                       continue; 

                    var splittedTableNamespace = xmlContentSection.master.table.namespace.split(".")
                    xmlContentSection.master.table.namespace = splittedTableNamespace.join('.');

                    var lsTablesTmp = [xmlContentSection.master.table.content]

                    if(xmlContentSection.master.slaves != undefined) {
                        if(xmlContentSection.master.slaves.slave != undefined) {
                            if(!Array.isArray(xmlContentSection.master.slaves.slave)) {
                                var tmpSlave = JSON.parse(JSON.stringify(xmlContentSection.master.slaves.slave))
                                xmlContentSection.master.slaves.slave = []
                                xmlContentSection.master.slaves.slave.push(tmpSlave) 
                            }

                            for(let i = 0; i < xmlContentSection.master.slaves.slave.length; i ++) {
                                if(xmlContentSection.master.slaves.slave[i].table != undefined)
                                lsTablesTmp.push(xmlContentSection.master.slaves.slave[i].table.content)
                            }
                        }
                        
                        if(xmlContentSection.master.slaves.slavebuffered != undefined) {
                            if(!Array.isArray(xmlContentSection.master.slaves.slavebuffered)) {
                                var tmpSlave = JSON.parse(JSON.stringify(xmlContentSection.master.slaves.slavebuffered))
                                xmlContentSection.master.slaves.slavebuffered = []
                                xmlContentSection.master.slaves.slavebuffered.push(tmpSlave) 
                            }
    
                            for(let i = 0; i < xmlContentSection.master.slaves.slavebuffered.length; i ++) {
                                lsTablesTmp.push(xmlContentSection.master.slaves.slavebuffered[i].table.content)
                            }
                        }
                    }

                    metadata.allApplicationsDocLs.push({
                        lsTables : lsTablesTmp,
                        documentLink : `[LINK document-${metadata.dashed(xmlContent.documents[i].namespace)} ${xmlContentSection.master.namespace}]`
                    })
                }
            }
        }
    }
}

console.log(chalk.bold(chalk.cyan('\n...DOCUMENTS ELABORATED SUCCESSFULLY...')));

console.log(chalk.bold(chalk.cyan('\n...APPLICATION GENERATION STARTED...\n')));

apps = [];
appNames.forEach(appName => {
    //if(appName != 'ERP') return
    app = {name: appName};
    if (createAppHelp(app, workingPath, outputPath)) {
        apps.push(app);
    }
});

copyAsset('BusinessObjects.sam', assets, outputPath, function(content) {
    apps.forEach(app => {
        content += `[INCLUDE ${app.name}/${app.name}_modules.sam]\n` 
    });
    return content;
});

console.log(chalk.bold(chalk.cyan('\n...COPYING MAGO STYLE FILES...\n')));

fs.cp(path.join(path.dirname(require.main.filename), '_mago_styles'), path.join(outputPath,'_mago_styles'), { recursive: true }, (err) => {
    if (err) {
      console.error(err);
    }
  });

console.log(chalk.bold(chalk.cyan('\n...GENERATION COMPLETED!')));

//=============================================================================
function copyAsset(assetName, source, destination, process = null) {
    try {
        if (process == null) {
            fs.copyFileSync(path.join(source,assetName), path.join(destination,assetName));
        } else {
            var content = fs.readFileSync(path.join(source,assetName), "utf8");
            var result = process(content);
            fs.writeFileSync(path.join(destination,assetName), result);
        }
    } catch (err) {
        notifications.error(err);
    }
}
