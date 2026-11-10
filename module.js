const metadata = require('./metadata');
const _ = require('lodash');
const path = require('path');
const fs = require('fs');
const markdown = require('./markdown');
const notifications = require('./notifications');

module.exports = function createModuleHelp(module, workingPath, outputPath) {
    process.chdir(path.join(workingPath, module.name));
    _.assignIn(module, metadata.parseXML('Module.config'));
    if (!metadata.defined(module.localize)) {
        module.localize = "missing module description";
    }
    var dbMetadata = path.join('EFCore', 'EFSchemaObjects.xml');
    if (!fs.existsSync(dbMetadata)) {
        notifications.warning('Module <<' + module.name + '>> of application <<' + module.appName  + '>> has no tables defined')
        return false;
    }
    module.dbObjects = metadata.parseXML(dbMetadata, module.name, outputPath);

    var tables = metadata.defined(module.dbObjects.Tables) ? metadata.asArray(module.dbObjects.Tables.Table) : [];

    if (tables.length > 0) {
        module.dbObjects.Tables = { Table: tables };
    if (metadata.isArray(module.dbObjects.tables)) {
        mergeDBInfoData(module.dbObjects);
        createHelpFile(outputPath, module,workingPath);

        return true;
    }
    return false;
}

//=============================================================================
function createHelpFile(outputPath, module, workingPath) {
    var content = `[H4 ${module.appName}-${module.name}]${module.localize}\n`

    var lsDocs = [];
    var lsEnum = [];
    var lsTables = [];
    var lsMethods = [];

    content += `\n[# fake_h4]Documents\n\n`

    if (fs.existsSync(path.join('ModuleObjects', 'DocumentObjects.xml'))) {
        var xmlContent = metadata.parseXML(path.join('ModuleObjects', 'DocumentObjects.xml'));

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
        
            for(let i = 0;i < xmlContent.documents.length; i ++ ) {

                if(xmlContent.documents[i] == undefined)
                   continue;

                if(xmlContent.documents[i].viewmodes == undefined || xmlContent.documents[i].viewmodes.mode[0] == undefined || xmlContent.documents[i].viewmodes.mode[0].type == undefined) {
                    var theWrapperClass = ''
                    if(xmlContent.documents[i].classhierarchy != undefined) {
                        var hierarchy = xmlContent.documents[i].classhierarchy.split(".")
                        theWrapperClass = hierarchy[hierarchy.length - 1]
                    }

                    var nameOfDoc = xmlContent.documents[i].namespace.split('.')
                    var pathOfFile = path.join('ModuleObjects', nameOfDoc[nameOfDoc.length - 1], 'Description', 'Dbts.xml')

                    var sectionRowLs = [];

                    if (fs.existsSync(pathOfFile)) {
                        var xmlContentSection = metadata.parseXML(pathOfFile);
                        var splittedTableNamespace = xmlContentSection.master.table.namespace.split(".")
                        xmlContentSection.master.table.namespace = splittedTableNamespace.join('.');
                        
                        if(xmlContentSection.master != undefined) {       
                            var rowSection = {
                                type : "M",
                                section : xmlContentSection.master.title,
                                nameSpaceDbt : xmlContentSection.master.namespace,
                                dbTableAndNameSpace : xmlContentSection.master.table,
                                description : ""
                            }

                            sectionRowLs.push(rowSection)

                            if(xmlContentSection.master.slaves != undefined) {
                                if(xmlContentSection.master.slaves.slave != undefined) {
                                    if(!Array.isArray(xmlContentSection.master.slaves.slave)) {
                                        var tmpSlave = JSON.parse(JSON.stringify(xmlContentSection.master.slaves.slave))
                                        xmlContentSection.master.slaves.slave = []
                                        xmlContentSection.master.slaves.slave.push(tmpSlave) 
                                    }
    
                                    for(let i = 0; i < xmlContentSection.master.slaves.slave.length; i ++) {
                                        var rowSection = {
                                            type : "S",
                                            section : xmlContentSection.master.slaves.slave[i].title,
                                            nameSpaceDbt : xmlContentSection.master.slaves.slave[i].namespace,
                                            dbTableAndNameSpace : xmlContentSection.master.slaves.slave[i].table,
                                            description : ""
                                        }
                                        sectionRowLs.push(rowSection)
                                    }
                                }                                

                                if(xmlContentSection.master.slaves.slavebuffered != undefined) {
                                    if(!Array.isArray(xmlContentSection.master.slaves.slavebuffered)) {
                                        var tmpSlave = JSON.parse(JSON.stringify(xmlContentSection.master.slaves.slavebuffered))
                                        xmlContentSection.master.slaves.slavebuffered = []
                                        xmlContentSection.master.slaves.slavebuffered.push(tmpSlave) 
                                    }
    
                                    for(let i = 0; i < xmlContentSection.master.slaves.slavebuffered.length; i ++) {
                                        var rowSection = {
                                            type : "SB",
                                            section : xmlContentSection.master.slaves.slavebuffered[i].title,
                                            nameSpaceDbt : xmlContentSection.master.slaves.slavebuffered[i].namespace,
                                            dbTableAndNameSpace : xmlContentSection.master.slaves.slavebuffered[i].table,
                                            description : ""
                                        }
                                        sectionRowLs.push(rowSection)
                                    }
                                }
                            }

                            var namespaceSplitted = xmlContent.documents[i].namespace.split('.')
                            var theName = namespaceSplitted[namespaceSplitted.length - 1]

                            lsDocs.push({
                                description : xmlContent.documents[i].localize,
                                name : theName,
                                nameSpace : module.appName + "." + module.name + "." + theName.replaceAll(" ","_"),
                                realNameSpace : xmlContent.documents[i].namespace,
                                interfaceClass : xmlContent.documents[i].interfaceclass,
                                classHierarchy : xmlContent.documents[i].classhierarchy != undefined ? xmlContent.documents[i].classhierarchy : '',
                                wrapperClass : theWrapperClass,
                                sections : sectionRowLs 
                            })
                        } 
                    }
                }
            }

            if(lsDocs.length > 0) {
                content += `\nHere the **${module.localize}** documents:\n\n`;

                var gridContent = [["**Document name**","**Description**"]]
                
                lsDocs.forEach(element => {
                        gridContent.push(
                                            [`[LINK document-${metadata.dashed(element.realNameSpace)} ${element.name}]`,element.description]
                                        );
                });
                content += markdown.gridRender(gridContent,{ forceTableNewLines : true });
            } else {
                content += "\n_/There aren't documents for this module yet!/_\n\n"
            }
        } else {
            content += "\n_/There aren't documents for this module yet!/_\n\n"
        }
    } else {
        content += "\n_/There aren't documents for this module yet!/_\n\n"
    }

    content += `\n[# fake_h4]Enumerations\n\n`
    
    if (fs.existsSync(path.join('ModuleObjects', 'Enums.xml'))) {
        var xmlContent = metadata.parseXML(path.join('ModuleObjects', 'Enums.xml'));

        if(xmlContent.tag != undefined){
            content += `\nHere the **${module.localize}** enumerations:\n\n`;

            if(!metadata.isArray(xmlContent)) {
                var tmpContent = JSON.parse(JSON.stringify(xmlContent)).tag
                xmlContent = { tag : [] };
                xmlContent.tag.push(tmpContent)
            }
                
            for(let i = 0;i < xmlContent.tag.length; i ++ ) {
                var contentString = "";

                if(xmlContent.tag[i].content != undefined)
                    contentString = xmlContent.tag[i].content.trim();
        
                lsEnum.push({
                    description : contentString,
                    name : xmlContent.tag[i].name,
                    defaultValue : xmlContent.tag[i].defaultValue,
                    itemLs : Array.from(xmlContent.tag[i].item),
                    value : xmlContent.tag[i].value, 
                    nameSpace : module.appName + "." + module.name + "." + xmlContent.tag[i].value
                })
            }
        
            var gridContent = [["**Enumeration name**", 
                                "**Description**"]];
        
            lsEnum.forEach(element => {
                    gridContent.push(
                                        [`[LINK enum-${metadata.dashed(element.nameSpace)} ${element.name}]`, 
                                        element.description]
                                    );
            });
            content += markdown.gridRender(gridContent,{ forceTableNewLines : true });
         }
         else {
            content += "\n_/There aren't enumerations for this module yet!/_\n\n"
         }
    } else {
        content += "\n_/There aren't enumerations for this module yet!/_\n\n"
    }

    content += `\n[# fake_h4]Tables\n\n`

    content += `\nHere the **${module.localize}** tables:\n\n`;

    var gridContent = [["**Table name**", 
                        "**Description**"]];

    lsTables = JSON.parse(JSON.stringify(module.dbObjects.tables.table));

    

    if(lsTables.length != 0){

        lsTables.forEach(table => {
            if (!metadata.defined(table.localize)) table.localize = "";
                gridContent.push(
                                    [`[LINK table-${metadata.dashed(table.namespace)} ${metadata.objectName(table.namespace)}]`, 
                                    markdown.adjust(table.localize)]
                                );
        });
        content += markdown.gridRender(gridContent,{ forceTableNewLines : true });

    } else {
        content += "\n_/There aren't tables for this module yet!/_\n\n"
    }

    content += `\n[# fake_h4]WebMethods\n\n`

    if (fs.existsSync(path.join('ModuleObjects', 'WebMethods.xml'))) {

        var xmlContent = metadata.parseXML(path.join('ModuleObjects', 'WebMethods.xml'));

        if(xmlContent.functions != undefined) {

            if(typeof xmlContent.functions !== 'string') {

                    if(!metadata.isArray(xmlContent)) {
                        var tmpContent = JSON.parse(JSON.stringify(xmlContent)).functions.function
                        xmlContent = { functions : [] };

                        if(tmpContent.length != 0) {
                            if(tmpContent.length > 1) {
                            xmlContent.functions = tmpContent
                            } else {
                                xmlContent.functions.push(tmpContent)
                            }
                        }
                    }

                    if(xmlContent.functions.length > 0) {
                        content += `\nHere the **${module.localize}** webmethods:\n\n`;
                        
                        var lsMethods = [];
                    
                        for(let i = 0;i < xmlContent.functions.length; i ++) {
                            var contentString = "";

                            if(xmlContent.functions[i].content != undefined)
                                contentString = xmlContent.functions[i].content.trim();

                            var splittedNamespace = xmlContent.functions[i].namespace.split(".")
                            var methodName = splittedNamespace[splittedNamespace.length - 1]

                            var fileInfo = xmlContent.functions[i].sourceInfo.replaceAll('File: ','')

                            var librarySplitted = fileInfo.split('\\')
                    
                            lsMethods.push({
                                descriptionAndReturnValue : contentString,
                                sourceInfo : fileInfo,
                                library : librarySplitted[0] + librarySplitted[1],
                                paramLs : xmlContent.functions[i].param != undefined ? Array.from(xmlContent.functions[i].param) : [],
                                availableInReport : xmlContent.functions[i].report == 'false' ? false : true,
                                namespace : module.appName + "." + module.name + "." + methodName.replaceAll(" ","_"),
                                name : methodName
                            })
                        }
                    
                        var gridContent = [["**WebMethod name**"]];
                    
                        lsMethods.forEach(element => {
                                    gridContent.push(
                                                        [`[LINK webMethod-${metadata.dashed(element.namespace)} ${element.name}]`]
                                                    );
                        });
                        content += markdown.gridRender(gridContent,{ forceTableNewLines : true });
                    } else {
                        content += "\n_/There aren't webMethods for this module yet!/_\n\n"
                    } 

            } else {
                content += "\n_/There aren't webMethods for this module yet!/_\n\n"
            }
        } else {
            content += "\n_/There aren't webMethods for this module yet!/_\n\n"
        }
    } else {
        content += "\n_/There aren't webmethods for this module yet!/_\n\n"
    }
    
    lsDocs.forEach(element => {
        content += createDocDescription(element);
    });

    lsEnum.forEach(element => {
        content += createEnumDescription(element);
    });

    lsTables.forEach(table => {
        var lsFieldsXReferences = [];
        var fileNameRef = path.join(workingPath,module.name,"ModuleObjects","DBInfo",metadata.objectName(table.namespace) + '.xml')

        if(fs.existsSync(fileNameRef))
        {
            var xmlTableRef = metadata.parseXML(fileNameRef);
            if(xmlTableRef != undefined) {

                if(!!xmlTableRef.fields && !!xmlTableRef.fields.column && 
                   !!xmlTableRef.fields && !!xmlTableRef.fields.column)
                {
                    for(let i = 0; i < xmlTableRef.fields.column.length; i ++) {
                        if(xmlTableRef.fields.column[i].Reference != '')
                          lsFieldsXReferences.push({ name : xmlTableRef.fields.column[i].Name, reference : xmlTableRef.fields.column[i].Reference})
                    }
                }
            }
        }

        content += createTableDescription(table,lsFieldsXReferences);
    });

    lsMethods.forEach(element => {
        content += createWebMethodDescription(element);
    })

    try {
        fs.writeFileSync(path.join(outputPath + '\\Modules', `${module.name}_tables.sam`), content);
    } catch (err) {
        notifications.error(err);
    }
}

//=============================================================================
function createWebMethodDescription(method) {
    var content = `[h5 NOINDEX NEWPAGE webMethod-${metadata.dashed(method.namespace)}]${metadata.objectName(method.namespace)}\n`;

    content += "[# fake_h6] Base Info\n\n";

    var gridContent = [
        ["**Namespace**", metadata.objectName(method.namespace)],
        ["**Library**", method.library],
        ["**File of origin**", method.sourceInfo],
        ["**Available in reports**", method.availableInReport ? 'true' : 'false']
    ];

    content += markdown.gridRender(gridContent, { allLines: true });

    var splittedDescriptionAndReturnValue = method.descriptionAndReturnValue.split('\r\n')

    content += "[# fake_h6] Description\n\n";
    content += splittedDescriptionAndReturnValue[0] + '\n'

    if(splittedDescriptionAndReturnValue[1] != undefined) {
        content += "[# fake_h6] Return value\n\n";
        content += splittedDescriptionAndReturnValue[1].replaceAll('Return value: Is', 'The return value is') + '\n'
    }

    content += "[# fake_h6] Parameters\n\n";
    if (method.paramLs.length > 0) {
        gridContent = [["**Name**", 
                        "**Type**", 
                        "**Mode**", 
                         "**Description**"]];

        for(let i = 0; i < method.paramLs.length; i ++) {
            gridContent.push([method.paramLs[i].name,
                            method.paramLs[i].type,
                            method.paramLs[i].mode,
                            method.paramLs[i].localize])
        }
    }

    content += markdown.gridRender(gridContent, { allLines: true });

    return content;
}

//=============================================================================
function createTableDescription(table,lsReferecences) {
    var content = `[h5 NOINDEX NEWPAGE table-${metadata.dashed(table.namespace)}]${metadata.objectName(table.namespace)}\n`;

    content += "[# fake_h6] Base Info\n\n";

    var gridContent = [
        ["**Phisical Name**",           metadata.objectName(table.namespace)],
        ["**Content**",                 markdown.adjust(table.localize)],
        ["**Part of the document**",    partOfDocument(table)]
    ];
    if (metadata.defined(table.reference) && table.reference != '') {
        gridContent.push(
            ["References",          `[LINK ${metadata.dashed(table.reference)} ${table.namespace}]`]
        );
    }
    content += markdown.gridRender(gridContent, { allLines: true });

    content += "[# fake_h6] Overview\n\n";

    if (!metadata.defined(table.documentationinfo)) {
        table.documentationinfo = { content : "", mandatory : false, readonly : false };
    } else {
        if(!metadata.defined(table.documentationinfo.content) )
           table.documentationinfo.content = "";
        if(!metadata.defined(table.documentationinfo.mandatory) )
           table.documentationinfo.mandatory = false;
        if(!metadata.defined(table.documentationinfo.readonly) )
           table.documentationinfo.readonly = false;
    }

    content += `${markdown.adjust(table.documentationinfo.content)}\n`;

    content += "[# fake_h6] Fields\n\n";
    if (metadata.isArray(table.columns)) {
        gridContent = [["**Name**", 
                        "**Type & Len**", 
                        "**M**", 
                        "**R/O**", 
                        "**D**", 
                        "**Description**"]];
        
        if(table.foreignkeys != undefined && table.foreignkeys.foreignkey != undefined && table.foreignkeys.foreignkey.fksegments != undefined)
        {
           var segmentList = table.foreignkeys.foreignkey.fksegments.split(',');
           for (var i = 0; i < segmentList.length; i++)
               segmentList[i] = segmentList[i].trim();
           var objForeignKeys = { externalTable : table.foreignkeys.foreignkey.onns, fields : segmentList}
        }
           
        table.columns.column.forEach(column => {
            if (!metadata.defined(column.documentationinfo)) {
                column.documentationinfo = { content : "", mandatory : false, readonly : false };
            } else {
                if(!metadata.defined(column.documentationinfo.content) )
                   column.documentationinfo.content = "";
                if(!metadata.defined(column.documentationinfo.mandatory) )
                   column.documentationinfo.mandatory = false;
                if(!metadata.defined(column.documentationinfo.readonly) )
                   column.documentationinfo.readonly = false;
            }

            var theExternalTable = "";

            if(objForeignKeys != undefined)
            {
                for(var i = 0; i < objForeignKeys.fields.length; i ++)
                    if(objForeignKeys.fields[i] == column.schemainfo.content) {
                       theExternalTable = objForeignKeys.externalTable
                       break;
                    }
            }

            for(let i = 0; i < lsReferecences.length; i ++) {
                if(theExternalTable == '' && lsReferecences[i].name == column.schemainfo.content && !!lsReferecences[i].reference)
                {
                   theExternalTable = lsReferecences[i].reference
                   break;
                }
            }

            gridContent.push([
                hotlink(column, theExternalTable), 
                columnType(column), 
                markdown.asCheck(column.documentationinfo.mandatory), 
                markdown.asCheck(column.documentationinfo.readonly), 
                defaultValue(column), 
                markdown.adjust(column.documentationinfo.content) 
            ])
        });
        content += markdown.gridRender(gridContent, { allLines: true });
    } else {
        content += "N/A\n";
        console.log(`${table.namespace} has no column defined`);
    }

    return content;
}

//=============================================================================
function createEnumDescription(enumeration) {
    var content = `[h5 NOINDEX NEWPAGE enum-${metadata.dashed(enumeration.nameSpace)}]${enumeration.name}\n`;

    content += "[# fake_h6] Base Info\n\n";

    content += enumeration.description + '\n'

    content += "[# fake_h6] Overview\n\n";

    gridContent = [["**Default**", 
                    "**Element**", 
                    "**Value**", 
                    "**Written as**", 
                    "**Db value**", 
                    "**Description**"]];
        
    if((typeof enumeration.itemLs === 'array')) {
        var tmpList = JSON.parse(JSON.stringify(enumeration.itemLs))
        enumeration.itemLs = [];
        enumeration.itemLs.push(tmpList)
    }

    for(let i = 0; i < enumeration.itemLs.length; i ++) {
        var rowArray = [];
        
        rowArray.push(markdown.asCheck(enumeration.itemLs[i].value == enumeration.defaultValue))
        rowArray.push(enumeration.itemLs[i].name)
        rowArray.push(enumeration.itemLs[i].value)
        rowArray.push(`{${enumeration.value}:${enumeration.itemLs[i].value}}`)
        rowArray.push(enumeration.itemLs[i].stored)
        rowArray.push(enumeration.itemLs[i].description != undefined ? enumeration.itemLs[i].description : "")
        
        gridContent.push(rowArray)
    }

    content += markdown.gridRender(gridContent, { allLines: true });

    return content;
}

//=============================================================================
function createDocDescription(doc) {
    var content = `[h5 NOINDEX NEWPAGE document-${metadata.dashed(doc.realNameSpace)}]${doc.name}\n`;

    content += "[# fake_h6] Base Info\n\n";

    var gridInfo = []
    gridInfo.push(["**NameSpace**",doc.realNameSpace])
    gridInfo.push(["**Description**",doc.description])
    gridInfo.push(["**Wrapper Class**",doc.wrapperClass])
    gridInfo.push(["**ADM Interface Class**",doc.interfaceClass != undefined ? doc.interfaceClass : 'N/A'])

    content += markdown.gridRender(gridInfo, { allLines: true });

    content += "[# fake_h6] Description\n\n"

    content += doc.description + '\n'

    content += "[# fake_h6] Sections\n\n";

    gridContent = [["**Type**", 
                    "**Section**", 
                    "**DBT Namespace**", 
                    "**DB Table**", 
                    "**Description**"]];

    for(let i = 0; i < doc.sections.length; i ++) {
        var rowArray = [];
        
        rowArray.push(doc.sections[i].type)
        rowArray.push(doc.sections[i].section.content)
        rowArray.push(doc.sections[i].nameSpaceDbt)
        rowArray.push(`[LINK table-${metadata.dashed(doc.sections[i].dbTableAndNameSpace.namespace)} ${doc.sections[i].dbTableAndNameSpace.content}]`)
        rowArray.push("")
        
        gridContent.push(rowArray)
    }

    content += markdown.gridRender(gridContent, { allLines: true });

    return content;
}

//=============================================================================
function mergeDBInfoData(dbObjects) {
    dbObjects.tables.table.forEach(table => {
        var dbinfoFName = path.join("ModuleObjects", "DBInfo",  `${metadata.objectName(table.namespace)}.xml`);
        if (!fs.existsSync(dbinfoFName)) {
            return;
        }
        dbInfoData = metadata.parseXML(dbinfoFName);
        if (metadata.defined(dbInfoData.localize)) table.localize = dbInfoData.localize;
        if (metadata.defined(dbInfoData.reference)) table.reference = dbInfoData.reference;
        if (metadata.defined(dbInfoData.document)) table.document = dbInfoData.document;

        if (metadata.isArray(table.columns)) {
            table.columns.column.forEach(column => {
                var colInfo = lookup(column.schemainfo.content, dbInfoData);
                if (metadata.defined(colInfo.reference) && colInfo.reference != "") 
                    column.reference = colInfo.reference;
            });
        }
    });
}

//=============================================================================
function partOfDocument(table) {
    var lsDocs = []
    var splittedTableName = table.namespace.split('.')
    var tableName = splittedTableName[splittedTableName.length - 1]

    for(let i = 0; i < metadata.allApplicationsDocLs.length; i ++) {
        if(metadata.allApplicationsDocLs[i].lsTables.includes(tableName)) {
            lsDocs.push(metadata.allApplicationsDocLs[i].documentLink)
        }
    }

    if(lsDocs.length == 0)
        return "N/A";

    var output="";
    lsDocs.forEach(document => {
            output += `${document}[BR]`;
    })

    return output;

}

//=============================================================================
function columnType(column) {
    if (column.schemainfo.type == "String") {
        return `String ${column.schemainfo.length}`;
    } else if (column.schemainfo.type == "Enum") {
        if(metadata.allApplicationsEnumLs.length > 0) {
            for(let i = 0; i < metadata.allApplicationsEnumLs.length; i ++){
                if(metadata.allApplicationsEnumLs[i].name == column.schemainfo.enumname)
                   return `[LINK enum-${metadata.dashed(metadata.allApplicationsEnumLs[i].nameSpace)} ${column.schemainfo.enumname}]`
            }
        } else {
            return column.schemainfo.enumname;
        }
    }
    return column.schemainfo.type;
}

//=============================================================================
function defaultValue(column) {
    if (column.schemainfo.type == "Date" || column.schemainfo.type == "DateTime" ) {
        if (column.schemainfo.defaultvalue == "1799-12-31T00:00:00") return "empty";
    }
    return column.schemainfo.defaultvalue;
}

//=============================================================================
function lookup(columnName, dbInfo) {
    if (!metadata.isArray(dbInfo.fields)) return {};
    var colInfo = {};
    dbInfo.fields.column.every(column => {
        if (column.name == columnName) {
            colInfo = column;
            return false;
        }
        return true;
    });

    return colInfo;
}

//=============================================================================
function hotlink(column, appName) {
    if(appName != '') {
       var link = `[LINK ${metadata.dashed(appName)} ${column.schemainfo.content}]`
       return link;
    } else {
       return column.schemainfo.content;  
    }
}