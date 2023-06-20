module.exports = function getGamsIdeViewContainerContent(options) {
  const {
    codiconsUri,
    vueUri,
    webviewToolkitUri
  } = options;

  return `
<head>
<script src="
https://cdn.jsdelivr.net/npm/simple-undo@1.0.2/lib/simple-undo.min.js
"></script>
<script type="importmap">
  {
    "imports": {
      "vue": "https://unpkg.com/vue@3/dist/vue.esm-browser.js",
      "webview-ui-toolkit": "https://cdn.jsdelivr.net/npm/@vscode/webview-ui-toolkit@1.2.2/+esm"
    }
  }
</script>
<link href="${codiconsUri}" rel="stylesheet" />
</head>
<div id="app" class="gams-view">
  <div v-if="!isListing">
    <!-- Use the Webview UI Toolkit components for the top bar -->
    <div style="display: flex; padding-bottom: 5px; background: var(--vscode-editorHoverWidget-background); position: sticky; top: 0px;">
      <vscode-button appearance="icon" aria-label="Back" @click="moveCursor('back')">
        <span class="codicon codicon-chevron-left"></span>
      </vscode-button>
      <vscode-button appearance="icon" aria-label="Forward" @click="moveCursor('forward')">
        <span class="codicon codicon-chevron-right"></span>
      </vscode-button>
      <vscode-button v-if="!locked" appearance="icon" aria-label="Unlock" @click="toggleLock">
        <span class="codicon codicon-unlock"></span>
      </vscode-button>
      <vscode-button v-if="locked" appearance="icon" aria-label="Lock" @click="toggleLock">
        <span class="codicon codicon-lock"></span>
      </vscode-button>
      <vscode-button appearance="icon" aria-label="Play" @click="run">
        <span class="codicon codicon-play"></span>
      </vscode-button>
      <vscode-button appearance="icon" aria-label="Pause" @click="stop">
        <span class="codicon codicon-debug-pause"></span>
      </vscode-button>
      <vscode-text-field v-model="searchString" @input="updateSymbol({name: searchString, fuzzy: true})">
        <span slot="start" placeholder="Search..." class="codicon codicon-search"></span>
        <span slot="end" v-if="searchString" class="codicon codicon-close" @click="searchString = ''"></span>
      </vscode-text-field>
    </div>
    <!-- Use normal HTML elements for the content part -->
      <div v-if="!missingSymbol && !name">
        <h1>Hi 👋</h1>
        <br>
        <span>
          Open a GAMS file, and click on a symbol to get started!
        </span>
      </div>
      <div v-if="missingSymbol">
        <h1>No data</h1>
        <span>The symbol <b>{{ missingSymbol}}</b> is not read by the GAMS compiler.</span>
        <br>
        <br>
        <span>
          If you expect this symbol to be in the reference tree, check your models program flow as well as the GAMS log file for errors!
        </span>
      </div>
      <div v-if="name" slot="content" style="margin-bottom: 40px;">
      <h1>{{name}}</h1>
	  	<div>{{type}}</div>
	  	<div>
	  		<h2 v-if="description">{{description}}</h2>
	  		<div v-if="domain">
	  			<h3>Domain</h3>
	  			<p v-for="(elem,i) in domain" :key="'domain_' + i" @click="updateSymbol({name: elem.name})">{{elem.name}}</p>
	  		</div>
	  		<h3 v-if="declared" @click="jumpToPosition({file: declared.file,line: declared.line,column: declared.column})">Declared in</h3>
	  		<p v-if="declared" @click="jumpToPosition({file: declared.file,line: declared.line,column: declared.column})">{{declared.base}}, {{declared.line}}</p>
	  		<h3 v-if="defined" @click="jumpToPosition({file: defined.file,line: defined.line,column: defined.column})">Defined in</h3>
	  		<p v-if="defined" @click="jumpToPosition({file: defined.file,line: defined.line,column: defined.column})">{{defined.base}}, {{defined.line}}</p>
	  		<div v-if="assigned" class="gams-badge-div">
	  			<h3  @click="assignedShown = !assignedShown">Assigned values in</h3>
          <vscode-badge @click="assignedShown = !assignedShown">
            {{assigned.length}}
          </vscode-badge>
	  		</div>
	  		<div v-if="assigned && assignedShown">
	  			<div transition="expand">
	  				<p v-for="(elem,i) in assigned" :key="'assigned_' + i" @click="jumpToPosition({file: elem.file,line: elem.line, column: elem.column})">{{elem.base}}, {{elem.line}}</p>
	  			</div>
	  		</div>
	  		<div v-if="implAsn" class="gams-badge-div">
	  			<h3 @click="implAsnShown = !implAsnShown">Implicitly assigned values in</h3>
          <vscode-badge @click="implAsnShown = !implAsnShown">
            {{implAsn.length}}
          </vscode-badge>
	  		</div>
	  		<div v-if="implAsn && implAsnShown">
	  			<div transition="expand">
	  				<p v-for="(elem,i) in implAsn" :key="'implAsn_' + i" @click="jumpToPosition({file: elem.file,line: elem.line,column: elem.column})">{{elem.base}}, {{elem.line}}</p>
	  			</div>
	  		</div>
	  		<div v-if="ref" class="gams-badge-div">
	  			<h3 @click="refShown = !refShown">Referenced in</h3>
          <vscode-badge @click="refShown = !refShown">
            {{ref.length}}
          </vscode-badge>
	  		</div>
	  		<div v-if="ref && refShown">
	  			<div transition="expand">
	  				<p v-for="(elem,i) in ref" :key="'ref_' + i" @click="jumpToPosition({file: elem.file,line: elem.line,column: elem.column})">{{elem.base}}, {{elem.line}}</p>
	  			</div>
	  		</div>
	  		<div v-if="control" class="gams-badge-div">
	  			<h3  @click="controlShown = !controlShown">Controlled in</h3>
          <vscode-badge @click="controlShown = !controlShown">
            {{control.length}}
          </vscode-badge>
	  		</div>
	  		<div v-if="control && controlShown">
	  			<div transition="expand">
	  				<p v-for="(elem,i) in control" :key="'expand_' + i" @click="jumpToPosition({file: elem.file,line: elem.line,column: elem.column})">{{elem.base}}, {{elem.line}}</p>
	  			</div>
	  		</div>
	  	</div>
    </div>
  </div>
  <div v-if="isListing">
    <div style="display: flex; padding-bottom: 5px; background: var(--vscode-editorHoverWidget-background); position: sticky; top: 0px; width: 100%;">
      <vscode-text-field v-model="lstSearchEntry" @input="updateLst(lstSearchEntry)" style="width: 100%;">
        <span slot="start" placeholder="Search..." class="codicon codicon-search"></span>
        <span slot="end" v-if="lstSearchEntry" class="codicon codicon-close" @click="lstSearchEntry = '', updateLst('')"></span>
      </vscode-text-field>
    </div>
    <div v-if="lstTree">
			<div v-for="(elem,i) in lstTree" style="margin-top: 5px;">
				<h3 style="font-weight: normal; font-size: 1em; display: inline-block; line-height: 1em; padding-right: 7px; margin-top: 4px; margin-bottom: 4px;" @click="jumpToggle(elem)"> {{elem.type}} </h3>
        <vscode-badge v-if="elem.entries" @click="jumpToggle(elem)">
          {{elem.entries.length}} 
        </vscode-badge>
				<div v-if="elem.entries && elem.open" transition="expand">
					<p v-if="elem.entries" v-for="entry in elem.entries" :key="'entry_' + entry.name + '_' + i + '_' + entry.line" @click="jumpToPosition({file: entry.file, line: entry.line,column: entry.column})">{{entry.name}}, {{entry.line}}</p>
				</div>
			</div>
		</div>
  </div>
</div>
<style>
  .gams-badge-div {
    display: flex;
    align-items: flex-end;
    column-gap: 10px;
    cursor: pointer;
  }

  .expand-transition {
    transition: all .3s ease;
    overflow: hidden;
  }
  /* .expand-enter defines the starting state for entering */
  /* .expand-leave defines the ending state for leaving */
  .expand-enter, .expand-leave {
    height: 0;
    opacity: 0;
  }

  .gams-view p {
  	padding-left: 15px;
  	line-height: 1.5;
    margin-top: 5px;
  	margin-bottom: 0px;
  }

  .gams-view p:hover {
  	text-decoration: underline;
  	cursor: pointer;
  }

  .gams-view h1 {
    margin-bottom: 5px;
  }

  .gams-view h3 {
    display: inline-block;
    padding-right: 7px;
  	margin-top: 20px;
  	margin-bottom: 0px;
  	cursor: pointer;
    -webkit-touch-callout: none;
    -webkit-user-select: none;
    -khtml-user-select: none;
    -moz-user-select: none;
    -ms-user-select: none;
    user-select: none;
  }

  .gams-view h2 {
  	font-style: italic;
  }
</style>
<script type="module">
  const vscode = acquireVsCodeApi();
  import { createApp } from 'vue'
  import { 
    provideVSCodeDesignSystem, 
    vsCodeButton,
    vsCodeBadge,
    vsCodeTextField
  } from "webview-ui-toolkit"
  
  provideVSCodeDesignSystem().register(
    vsCodeButton(), 
    vsCodeTextField(), 
    vsCodeBadge()
  );

  let cursorHistory = {}

  const history = new SimpleUndo({
    maxLength: 10,
    provider: objectSerializer
  })

  function objectSerializer(done) {
    done(JSON.stringify(cursorHistory))
  }

  function objectUnserializer(serialized) {
    cursorHistory = JSON.parse(serialized)
  }

  const app = createApp({
    data() {
      return {
        isListing: false,
        name: undefined,
        nameLo: undefined,
        type: undefined,
        description: undefined,
        domain: undefined,
        declared: undefined,
        defined: undefined,
        assigned: undefined,
        assignedShown: false,
        implAsn: undefined,
        implAsnShown: false,
        superset: false,
        subset: {},
        searchString: '',
        ref: undefined,
        file: undefined,
        refShown: false,
        control: undefined,
        controlShown: false,
        missingSymbol: "",
        historyCursorFile: undefined,
        historyCursorLine: undefined,
        historyCursorColumn: undefined,
        viewShow: false,
        running: false,
        locked: false,
        lstTree: undefined,
        lstTreeOrig: {},
        lstSearchEntry: '',
        viewLoading: false,
        clickedSym: '',
        selectedSolve: 0,
        autoUnfoldListingEntriesTreshold: 10
      }
    },
    mounted: function () {
      window.addEventListener('message', event => {
        const message = event.data; // The JSON data our extension sent
        switch (message.command) {
            case 'showGAMSorListing':
              this.isListing = message.data.isListing;
              break;
            case 'updateListing':
              this.lstTree = message.data.lstTree;
              this.isListing = message.data.isListing;
              this.lstTreeOrig = message.data.lstTree;
              break;
            case 'updateReference':
              const keys = [
                "name",
                "nameLo",
                "type",
                "description",
                "domain",
                "declared",
                "defined",
                "assigned",
                "implAsn",
                "ref",
                "control",
                "subset",
                "superset",
                "symId",
                "historyCursorFile",
                "historyCursorLine",
                "historyCursorColumn"
              ]
              keys.forEach(key => {
                  this[key] = message.data[key];
              })
              this.missingSymbol = "";
              break;
            case 'updateReferenceError':
              this.missingSymbol = message.data.missingSymbol;
              this.historyCursorFile = message.data.historyCursorFile;
              this.historyCursorLine = message.data.historyCursorLine;
              this.historyCursorColumn = message.data.historyCursorColumn;
              this.name = "";
              break;            
        }
      });
      // query extension for current state
      vscode.postMessage({
        command: 'getState',
      });
    },
    methods: {
      moveCursor(dir) {
        if(dir === 'back') {
          history.undo(objectUnserializer)
        } else {
          history.redo(objectUnserializer)
        }
        // update cursor position and or vue symbol
        console.log(cursorHistory)
        if (cursorHistory && cursorHistory.position) {
          this.jumpToPosition({
            file: cursorHistory.position.file, 
            line: cursorHistory.position.line + 1, 
            column: cursorHistory.position.column + 1, 
            saveHistory: false
          })
          this.updateSymbol({name: cursorHistory.name})
        }
      },
      run() {
        this.running = true;
        vscode.postMessage({
          command: 'runGams',
        });
      },
      stop() {
        this.running = false;
        vscode.postMessage({
          command: 'stopGams',
        });
      },
      toggleLock() {
        this.locked = !this.locked;
      },
      updateSymbol(options) {
        const {
          name,
          fuzzy = false,
          saveHistory = true
        } = options;

        if (saveHistory) {
          if (!cursorHistory) cursorHistory = {}

        }
        vscode.postMessage({
          command: 'updateSymbol',
          data: {
            symbol: name,
            fuzzy: fuzzy
          }
        });
      },
      jumpToggle(elem) {
        if (elem.entries) {
          elem.open = !elem.open
        } else {
          this.jumpToPosition({
            file: elem.file, 
            line: Array.isArray(elem.line) ? elem.line[0] : elem.line, 
            column: Array.isArray(elem.column) ? elem.column[0] + 1 : elem.column + 1 
          })
        }
      },
      jumpToPosition(options) {
        const {
          file, 
          line, 
          column, 
          saveHistory = true
        } = options;

        if (saveHistory) {
          if (!cursorHistory) cursorHistory = {}
          cursorHistory.position = {
            file: this.historyCursorFile,
            line: this.historyCursorLine,
            column: this.historyCursorColumn
          }
          cursorHistory.name = this.name
          history.save()
          cursorHistory.position = {
            file: file,
            line: line,
            column: column
          }
          history.save()
        }

        vscode.postMessage({
          command: 'jumpToPosition',
          data: {
            file: file,
            line: line,
            column: column
          }
        });
      },
      updateLst(lstSearchEntry) {        
        if (lstSearchEntry === '') {
          // restore original tree
          this.lstTree = JSON.parse(JSON.stringify(this.lstTreeOrig))
          return
        }
        if (this.lstTree) {
          try {
            this.lstTree = JSON.parse(JSON.stringify(this.lstTreeOrig))
          } catch (e) {
            console.log(e)
          }
          // first remove elements that do not have any child entries
          this.lstTree = this.lstTree.filter(entry => entry.entries && entry.entries.length > 0)
          // fuzzy find search pattern
          this.lstTree = this.lstTree.map(entry => {
            entry.entries = entry.entries.filter(e => {
              return e.name.toLowerCase().includes(lstSearchEntry.toLowerCase())
            })
            if (entry.entries.length < this.autoUnfoldListingEntriesTreshold) {
              entry.open = true
            }
            return entry
          })
          // remove empty containers so only matches are shown
          this.lstTree = this.lstTree.filter(entry => entry.entries.length > 0)
        }
      }
    }
  })
  
  app.config.compilerOptions.isCustomElement = (tag) => tag.includes('vscode');
  app.mount('#app');
  
</script>`
}