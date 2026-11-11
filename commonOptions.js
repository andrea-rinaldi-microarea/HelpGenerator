const commandLineArgs = require('command-line-args');
const optionDefinitions = [
                              { name: 'input', type: String, defaultValue: "" },
                              { name: 'output', type: String, defaultValue: "" }
                          ];
const options  = commandLineArgs(optionDefinitions);
module.exports = options;