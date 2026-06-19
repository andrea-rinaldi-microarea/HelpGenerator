const error = require('./error');
const path = require('path');
const fs = require('fs');
const glob = require('glob');
const xml2js = require('xml2js');
const _ = require('lodash');

module.exports =  {

    //-----------------------------------------------------------------------------
    scanFor(markerFile) {
        var folders = [];
        glob.sync(path.join('*', markerFile), { nocase: true }).forEach(folder => {
            folders.push(path.dirname(folder));
        });
        return folders;
    },

    //-----------------------------------------------------------------------------
    parseXML(filename) {
        const parser = new xml2js.Parser({ mergeAttrs: true, explicitArray: false, explicitRoot: false, charkey: 'content' });
    
        let xmlContent = fs.readFileSync(filename, "utf8");
        
        var JSONMetadata = null;
        
        parser.parseString(xmlContent, (err, result) => {
            if(err === null) {
                JSONMetadata = result;
            }
            else {
                error(err);
            }
        });

        return JSONMetadata;
    },

    //-----------------------------------------------------------------------------
    defined(object) {
        return (typeof object != 'undefined' && object != null);
    },

    // the Mago's metadata array in the XML are transformed in JS objects with a single propoerty which is an array
    // <Fields>
    //   <Column Name="AccTpl" ></Column>
    //   <Column Name="PostingDate"></Column>
    // </Fields>
    // Fields {
    //     Column : [
    //         {Name="AccTpl"},
    //         {Name="PostingDate"}
    //     ]
    // }
    //-----------------------------------------------------------------------------
    isArray(object) {
        if (typeof object !== 'object') return false;
        var ar = _.keys(object);
        return ar.length == 1 && Array.isArray(object[ar[0]]);
    },

    // normalizes a Mago metadata node (missing, single child, or array) into a real array
    asArray(value) {
        if (typeof value === 'undefined' || value === null || value === '') return [];
        return Array.isArray(value) ? value : [value];
    },

    //-----------------------------------------------------------------------------
    objectName(namespace) {
        var segments = namespace.split('.');
        return segments.length > 0 ? segments[segments.length - 1] : "";
    },

    appName(namespace) {
        var segments = namespace.split('.');
        return segments.length == 4 ? segments[0] : 
                segments.length == 5 ? segments[1] : "";
    },

    dashed(namespace) {
        return namespace.replace(/\./g,"-");
    },

    // return a namespace without type and library
    // typical namespace: Type.App.Module.Library.Object
    compact(namespace) {
        var segments = namespace.split('.');
        if (segments.length == 5) { // start with type, i.e.: Table, Document, etc.
            return `${segments[1]}.${segments[2]}.${segments[4]}`;
        } else if (segments.length == 4) { // no trailing type
            return `${segments[0]}.${segments[1]}.${segments[3]}`;
        } else {
            return namespace; // unknown structure
        }
    }
}
