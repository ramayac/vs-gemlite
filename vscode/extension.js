const vscode = require("vscode");

const os = require("os");
const paths = require("path");
const { relative } = require("path");
const {
  Uri,
  Range,
  Position,
  DocumentLink,
  DocumentLinkProvider,
  commands,
  languages,
  workspace,
  window,
} = vscode;

const apicsvreport	= require("..\\commands\\apicsvreport");

exports.activate = async function activate(context) {

  function expandPathHome(path) {
    if (path.slice(0, 1) == "~") {
      return paths.join(os.homedir(), path.slice(1, path.length));
    } else {
      return path;
    }
  }

  function regexpSubstitute(text, matches) {
    return text.replace(/\$(\d+)/g, (_, p1) => matches[parseInt(p1, 10)]);
  }


  //TODO: move this logic to separate files and refactor the code
  //const linkPattern = /("([^"]+?\.case)"|[^\s]+?\.case)/g;

  const linkPatternCaseRef = /("actionClass"[ :]*"(.*)")/g;
  const linkPatternRefUIRef = /("refUITemplateId"[ :]*"(.*)")/g;

  //Shame on me, these are hacks: 
  const linkPatternApiRef = /      "(\w+)"/g;
  const linkPatternPageRef = /    "(\w+)"[^:]/g; 

  // A file can describe it's own links via this pattern, e.g.
  //   [/\(MLG-\d+\)/ -> https://mediciventures.atlassian.net/browse/$0]
  //const externalLinkPatterns = /\[\/([^\/]+)\/\s*->\s*(https?:\/\/[^\]]+)\]/g;

  const linkProvider = {
    provideDocumentLinks: async function (document, token) {
      let relativeRoot;
      if (document.uri.scheme === "file") {
        relativeRoot = paths.dirname(document.uri.fsPath);
      } else {
        relativeRoot = null;
      }

      const text = document.getText();
      let match;

      /*const externalPatterns = [];
      while ((match = externalLinkPatterns.exec(text))) {
        externalPatterns.push({ regexp: match[1], link: match[2] });
      }*/
      const results = [];

      // Find links to JS files in a "Case Document" 
      if (document.fileName.indexOf(".case") > 0) {
        while ((match = linkPatternCaseRef.exec(text))) {

          let matched = match[2];

          //TODO: this should be configurable
          if (matched == undefined || matched == "" || matched.indexOf("telus.gem.engine") > 0) {
            continue;
          }

          const linkEnd = document.positionAt(linkPatternCaseRef.lastIndex);
          const linkStart = linkEnd.translate({
            characterDelta: -matched.length - 2,
          });

          const range = new Range(linkStart, linkEnd);

          const linkPath = expandPathHome(matched ? matched : match[1]);
          let linkTarget;
          if (paths.isAbsolute(linkPath)) {
            linkTarget = linkPath;
          } else if (relativeRoot) {

            let jsFolder = "..\\js\\" + linkPath + ".js";
            linkTarget = paths.resolve(relativeRoot, jsFolder);

          } else {
            // Can't add the link if it isn't absolute, and we
            // don't have a relative dir path to work with
            continue;
          }
          const fileUri = Uri.file(linkTarget);
          const docLink = new DocumentLink(range, fileUri);
          results.push(docLink);
        }
      }


      // Find links to .case files in "API Document"
      if (document.fileName.indexOf(".api") > 0) {
        while ((match = linkPatternApiRef.exec(text))) {
          let matched = match[1];

          //TODO: this should be configurable
          if (matched == undefined || matched == "" || matched.indexOf("telus.gem.engine") > 0) {
            continue;
          }

          const linkEnd = document.positionAt(linkPatternApiRef.lastIndex);
          const linkStart = linkEnd.translate({
            characterDelta: -matched.length -1,
          });

          const range = new Range(linkStart, linkEnd);

          const linkPath = expandPathHome(matched);
          let linkTarget;

          let caseFolder = "..\\case\\" + linkPath + ".case";
          linkTarget = paths.resolve(relativeRoot, caseFolder);

          const fileUri = Uri.file(linkTarget);
          const docLink = new DocumentLink(range, fileUri);
          results.push(docLink);
        }
      }

      // Find links to .page files in "API Document"
      if (document.fileName.indexOf(".page") > 0) {
        while ((match = linkPatternPageRef.exec(text))) {
          let matched = match[1];

          //TODO: this should be configurable
          if (matched == undefined || matched == "") {
            continue;
          }

          const linkStart = document.positionAt(linkPatternPageRef.lastIndex - matched.length - 2 );
          const linkEnd = linkStart.translate({
            characterDelta: matched.length,
          });

          const range = new Range(linkStart, linkEnd);

          const linkPath = expandPathHome(matched);
          let linkTarget;

          let caseFolder = "..\\case\\" + linkPath + ".case";
          
          //console.log(caseFolder);
          linkTarget = paths.resolve(relativeRoot, caseFolder);

          const fileUri = Uri.file(linkTarget);
          const docLink = new DocumentLink(range, fileUri);
          results.push(docLink);
        }

        while ((match = linkPatternRefUIRef.exec(text))) {
          let matched = match[2];

          //TODO: this should be configurable
          if (matched == undefined || matched == "" || matched.indexOf("global") > 0) {
            continue;
          }

          const linkStart = document.positionAt(linkPatternRefUIRef.lastIndex - matched.length -1 );
          const linkEnd = linkStart.translate({
            characterDelta: matched.length,
          });

          const range = new Range(linkStart, linkEnd);
          const linkPath = expandPathHome(matched);
          let linkTarget;

          let caseFolder = "..\\ui\\" + linkPath + ".vm";
          
          //console.log(caseFolder);
          linkTarget = paths.resolve(relativeRoot, caseFolder);

          const fileUri = Uri.file(linkTarget);
          const docLink = new DocumentLink(range, fileUri);
          results.push(docLink);
        }

      }

      /*while ((match = linkPatternCaseRef.exec(text))) {
        const linkEnd = document.positionAt(linkPatternCaseRef.lastIndex);
        const linkStart = linkEnd.translate({
          characterDelta: -match[2].length - 2,
        });

        const range = new Range(linkStart, linkEnd);

        const linkPath = expandPathHome(match[2] ? match[2] : match[1]);
        let linkTarget;
        if (paths.isAbsolute(linkPath)) {
          linkTarget = linkPath;
        } else if (relativeRoot) {
          let jsFolder = "..\\js\\" + linkPath + ".js";
          linkTarget = paths.resolve(relativeRoot, jsFolder);
          //linkTarget = paths.resolve(relativeRoot, linkPath);
        } else {
          // Can't add the link if it isn't absolute, and we
          // don't have a relative dir path to work with
          continue;
        }
        const fileUri = Uri.file(linkTarget);
        const docLink = new DocumentLink(range, fileUri);
        results.push(docLink);
      }*/

      // Find customized external links in this document
      /*for (pattern of externalPatterns) {
        const RE = new RegExp(pattern.regexp, "g");
        while ((match = RE.exec(text))) {
          const linkEnd = document.positionAt(RE.lastIndex);
          const linkStart = linkEnd.translate({
            characterDelta: -match[0].length,
          });
          const range = new Range(linkStart, linkEnd);
          const uri = Uri.parse(regexpSubstitute(pattern.link, match));
          const docLink = new DocumentLink(range, uri);
          results.push(docLink);
        }
      }*/

      return results;
    }
  };

  context.subscriptions.push(
    languages.registerDocumentLinkProvider({ language: "gemlite" }, linkProvider)
  );

  context.subscriptions.push(
    vscode.commands.registerCommand('gemlite.apiReport', function(){
      console.log("apicsvreport call");
      apicsvreport(vscode, paths);
    })
  );


};
