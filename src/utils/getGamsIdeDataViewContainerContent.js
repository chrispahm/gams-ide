module.exports = function getGamsIdeDataViewContainerContent(options) {
  const { webviewToolkitUri, codiconsUri, isDataParsingEnabled } = options;

  return `
  <!DOCTYPE html>
  <html lang="en">
  <head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>GAMS IDE DATA VIEW</title>
    <link rel="stylesheet" href="${codiconsUri}">
    <script type="importmap">
      {
        "imports": {
          "webview-ui-toolkit": "https://cdn.jsdelivr.net/npm/@vscode/webview-ui-toolkit@1.2.2/+esm"
        }
      }
    </script>
  </head>
  <style>
    .dropdown-container {
      box-sizing: border-box;
      display: flex;
      align-items: center;
      background-color: var(--background);
      justify-content: flex-start;
      column-gap: 10px;
      position: fixed;
      right: 10px;
    }
    
    .dropdown-container label {
      display: block;
      color: var(--vscode-foreground);
      cursor: pointer;
      font-size: var(--vscode-font-size);
      line-height: normal;
      margin-bottom: 2px;
    }

    .link {
      color: var(--vscode-textLink-foreground);
      cursor: pointer;
    }
    .link:hover {
      text-decoration: underline;
    }

    #loading-container {
      display: inline-flex;
      flex-wrap: nowrap;
      align-items: center;
      column-gap: 15px;
      position: fixed;
      top: 15px;
      left: 20px;
    }

    .loading {
      display: inline-block;
      width: 20px;
      height: 20px;
      border: 3px solid var(--background);
      border-radius: 50%;
      border-top-color: var(--vscode-foreground);
      animation: spin 1s ease-in-out infinite;
      -webkit-animation: spin 1s ease-in-out infinite;
    }
    
    @keyframes spin {
      to { -webkit-transform: rotate(360deg); }
    }
    @-webkit-keyframes spin {
      to { -webkit-transform: rotate(360deg); }
    }
  </style>
  <body>
    <div id="loading-container"><div class="loading"></div><div>Loading...</div></div>
    <div class="dropdown-container">
      <label for="my-dropdown">Selected solve statement:</label>  
      <vscode-dropdown id="gams-symbols-dropdown">
      </vscode-dropdown>
    </div>
    <pre id="gams-symbols-content" style="padding: 40px 0px;">
      ${ !isDataParsingEnabled ? "GAMS Data parsing is disabled. <a class='link' onclick='enableDataParsing()'>Click here to enable it.</a>" : "No data to show. Click on a symbol to get started!" }
    </pre>
  </body>
  <script type="module">
    const vscode = acquireVsCodeApi();
    import { 
      provideVSCodeDesignSystem, 
      vsCodeDropdown,
      vsCodeOption,
    } from "webview-ui-toolkit"

    provideVSCodeDesignSystem().register(
      vsCodeDropdown(), 
      vsCodeOption()
    );
    let currentSolve = "";
    let solves = [];
    let data = {};

    const dropdown = document.getElementById('gams-symbols-dropdown');
    const content = document.getElementById('gams-symbols-content');
    const loadingContainer = document.getElementById('loading-container');

    window.enableDataParsing = function() {
      vscode.postMessage({
        command: 'enableDataParsing'
      });
    }
    // Handle messages sent from the extension to the webview
    window.addEventListener('message', event => {
      const message = event.data; // The json data that the extension sent
      switch (message.command) {
        case 'startedDataParsing':
          loadingContainer.innerHTML = '<div class="loading"></div>Loading...</div>';
          break;
        case 'finishedDataParsing':
          loadingContainer.innerHTML = '';
          break;
        case 'isDataParsingEnabled':
          if (message.data.isDataParsingEnabled) {
            content.innerHTML = "No data to show. Click on a symbol to get started!";
          } else {
            content.innerHTML = "Symbol parsing is disabled. <a class='link' onclick='enableDataParsing()'>Click here to enable it.</a>";
          }
          break;
        case 'updateSymbolError':
          // delete all options of the dropdown
          while (dropdown.firstChild) {
            dropdown.removeChild(dropdown.firstChild);
          }
          if (!message.data.solves || message.data.solves.length === 0) {
            content.innerHTML = \`<b>No solve statement found.</b> At least one solve statement is required for symbol parsing.\`
          } else {
            // show error message
            content.innerHTML = \`No data available for symbol <b>\${message.data.symbol}</b>.<br>If you expect this symbol to be available, check for compilation errors and program flow.\`
          }
        case 'updateSolveData':
          // delete all options of the dropdown
          while (dropdown.firstChild) {
            dropdown.removeChild(dropdown.firstChild);
          }
          if (!message.data.solves || message.data.solves.length === 0) {
            content.innerHTML = \`<b>No solve statement found.</b> At least one solve statement is required for symbol parsing.\`
            return;
          }
          if (!message.data.data) {
            content.innerHTML = \`No data available for symbol <b>\${message.data.symbol}</b>.<br>If you expect this symbol to be available, check for compilation errors and program flow.\`
            return;
          }
          // update local data
          solves = message.data.solves;
          data = message.data.data;
          // add new options
          let didSelectYet = false;
          message.data.solves?.forEach((solve, i) => {
            const option = document.createElement('vscode-option');
            // add click event listener
            option.addEventListener('click', () => {
              // update local data
              currentSolve = solve;
              // deselect all options
              dropdown.querySelectorAll('vscode-option').forEach((option) => {
                option.setAttribute('selected', false)
              });
              // select current option
              option.setAttribute('selected', true)
              // update content
              content.innerHTML = message.data.data?.["line_" + solve.line] || "No data available for this solve statement.";
            });
            // set option selected or not
            if (currentSolve.model === solve.model && currentSolve.line === solve.line) {
              option.selected = true;
              didSelectYet = true;
            }
            if (!didSelectYet && i === message.data.solves?.length - 1) {
              option.selected = true;
              currentSolve = solve;
              didSelectYet = true;
            }
            option.innerHTML = \`\${solve.model}, l. \${solve.line}\`;
            dropdown.appendChild(option);
          });
          // update dropdown and content
          content.innerHTML = message.data.data?.["line_" + currentSolve.line];
          break;
      }
    });
  </script>
  </html>
  `;
};