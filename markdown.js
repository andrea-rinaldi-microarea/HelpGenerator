const _ = require('lodash');
const metadata = require('./metadata');

module.exports =  {
    //=============================================================================
    gridRender(gridContent, options = {}) {
        var render = "";
        render += '[TABLE border=simple] \n'
        render += '|- \n'
        
        if(options.forceTableNewLines) {
            gridContent.forEach((row) => {
                row.forEach((col) => {
                    render += `|< ${col}`;
                });
                render +='\n|-\n';
            });
        } else {
            gridContent.forEach((row, rIdx) => {
                row.forEach((col) => {
                    render += `|< ${col}`;
                });
                render +='\n';
                if (options.allLines || rIdx == 0) {
                    render += '|- \n'
                }
            });
        }

        if (!options.allLines) {
            render += '|- \n'
        }
        render += '[/TABLE] \n'
        return render;
    },

    //=============================================================================
    adjust(content) {
        if (!metadata.defined(content)) return "";
        return content.replace(/\<br\>/gi,"[BR]").replace(/(\r\n|\n|\r)/gm,"[BR]");
    },

    //=============================================================================
    asCheck(flag) {
        return flag ? "X" :"";
    }

}