const jsonc = require('jsonc');
//const { Parser, transforms: { unwind } } = require('json2csv');

module.exports = function(vscode, paths){
  execute(vscode, paths);
}

function execute(vscode, paths){
    /*if (document.fileName.indexOf(".api") > 0) {
        //const text = document.getText();
        console.log('api Report ' + document.fileName);
      }*/
      let uri = vscode.window.activeTextEditor.document.uri;
      let text = vscode.window.activeTextEditor.document.getText();

      let jsonAPIContent = jsonc.parse(text);
      
      //const fields = ["name", "method", "refEcIds"];
      //const transforms = [unwind({ paths: ["refEcIds"] })];
      //const json2csvParser = new Parser({ fields, transforms });

      //const header = '"Method", "URL", "Name"';

      var fileContent = ""; //header + "\n";
      for(const urlApi in jsonAPIContent){
        let row = jsonAPIContent[urlApi];
        
        let strRow = '"' + row.method + '","' + urlApi + '","' + row.name + '",' + row.refEcIds;
        //console.log(strRow); 
        fileContent += strRow + "\n";
      }

      console.log(fileContent);
      console.log(" TODO: turn this into a file. ");
}
