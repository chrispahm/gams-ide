export interface ViewContainerContentOptions {
  codiconsUri: any; // URI converted to webview form (string-like)
  vueUri: any;
  webviewToolkitUri: any;
}
export default function getGamsIdeViewContainerContent(options: ViewContainerContentOptions) {
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
<div id="app" class="gams-view" style="display: flex; flex-direction: column; min-height: 100vh;">
  <div v-if="showOnboarding" style="padding: 12px 4px;">
    <!-- NAVIGATION BAR -->
    <div v-if="onboardingState?.step !== 'complete'" style="display: flex; align-items: center; margin-bottom: 8px;">
      <vscode-button appearance="icon" aria-label="Back" @click="onboardingBack()" :disabled="onboardingHistory.length === 0" style="opacity: onboardingHistory.length === 0 ? 0.3 : 1;">
        <span class="codicon codicon-chevron-left"></span>
      </vscode-button>
      <span style="flex: 1;"></span>
    </div>
    <!-- WELCOME STEP -->
    <div v-if="onboardingState?.step === 'welcome'">
      <h1 style="font-size: 1.3em; margin-bottom: 8px;">Welcome to GAMS IDE</h1>
      <p style="line-height: 1.6; opacity: 0.85; margin-bottom: 8px;">
        GAMS IDE brings the General Algebraic Modeling System into VS Code — with syntax highlighting, symbol navigation, one-click model execution, data inspection, and AI-powered assistance.
      </p>
      <p style="line-height: 1.6; opacity: 0.85; margin-bottom: 16px;">
        This quick setup will configure your workspace so you can run and compile GAMS models directly from the editor. It only takes a minute.
      </p>
      <vscode-button @click="onboardingAction('startSetup')" style="width: 100%; margin-bottom: 8px;">
        Start Project Setup
      </vscode-button>
      <vscode-button appearance="secondary" @click="onboardingAction('skipOnboarding')" style="width: 100%;">
        Skip for Now
      </vscode-button>
    </div>

    <!-- CAPRI DETECTED -->
    <div v-if="onboardingState?.step === 'capri-options'">
      <h1 style="font-size: 1.2em; margin-bottom: 8px;">CAPRI Project Detected</h1>
      <p style="line-height: 1.6; opacity: 0.85; margin-bottom: 4px;">
        We found a <code>default.ini</code> and an XML task definition file in your workspace. These files tell GAMS IDE how to build and run your CAPRI model, including paths, solver settings, and scenario configuration.
      </p>
      <p v-if="onboardingState.detectedSettings?.currentTask" style="opacity: 0.7; font-size: 0.9em; margin-bottom: 16px;">
        Current task: <b>{{ onboardingState.detectedSettings.currentTask }}</b>
      </p>

      <div style="display: flex; flex-direction: column; gap: 8px;">
        <vscode-button @click="onboardingAction('selectDefaultCapri')" style="width: 100%;">
          Use Default CAPRI Settings
        </vscode-button>
        <vscode-button appearance="secondary" @click="onboardingAction('selectCustomPaths')" style="width: 100%;">
          Use Custom .ini / .xml Files
        </vscode-button>
        <vscode-button appearance="secondary" @click="onboardingAction('startManualSetup')" style="width: 100%;">
          Set Up Manually
        </vscode-button>
      </div>
    </div>

    <!-- NO CAPRI FILES -->
    <div v-if="onboardingState?.step === 'non-capri-options'">
      <h1 style="font-size: 1.2em; margin-bottom: 8px;">Project Setup</h1>
      <p style="line-height: 1.6; opacity: 0.85; margin-bottom: 16px;">
        What type of GAMS project are you working with? CAPRI, CGEBOX, and FarmDyn projects use <code>.ini</code> and <code>.xml</code> configuration files that GAMS IDE can read automatically. Other GAMS projects will be set up with a simple step-by-step wizard.
      </p>

      <div style="display: flex; flex-direction: column; gap: 8px;">
        <vscode-button @click="onboardingAction('selectCapriProject')" style="width: 100%;">
          CAPRI / CGEBOX / FarmDyn
        </vscode-button>
        <vscode-button appearance="secondary" @click="onboardingAction('startManualSetup')" style="width: 100%;">
          Other GAMS Project
        </vscode-button>
        <vscode-button appearance="secondary" @click="onboardingAction('skipOnboarding')" style="width: 100%;">
          Skip for Now
        </vscode-button>
      </div>
    </div>

    <!-- CAPRI SUB-OPTIONS (when no files detected) -->
    <div v-if="onboardingState?.step === 'capri-sub-options'">
      <h1 style="font-size: 1.2em; margin-bottom: 8px;">CAPRI / CGEBOX / FarmDyn</h1>
      <p style="line-height: 1.6; opacity: 0.85; margin-bottom: 16px;">
        These projects use an <code>.ini</code> file (runtime settings like paths and solver options) and an <code>.xml</code> file (task and scenario definitions). You can browse for these files now, or skip ahead and configure each setting by hand.
      </p>
      <div style="display: flex; flex-direction: column; gap: 8px;">
        <vscode-button @click="onboardingAction('selectCustomPaths')" style="width: 100%;">
          Browse for .ini and .xml Files
        </vscode-button>
        <vscode-button appearance="secondary" @click="onboardingAction('startManualSetup')" style="width: 100%;">
          Set Up Manually Instead
        </vscode-button>
      </div>
    </div>

    <!-- CUSTOM PATHS (for .ini/.xml) -->
    <div v-if="onboardingState?.step === 'custom-paths'">
      <h1 style="font-size: 1.2em; margin-bottom: 8px;">Custom Configuration Files</h1>
      <p style="line-height: 1.6; opacity: 0.85; margin-bottom: 12px; padding-left: 0;">
        Point GAMS IDE to your project's configuration files. The <code>.ini</code> file contains runtime settings (paths, solver, options) and the <code>.xml</code> file defines available tasks and scenarios.
      </p>

      <label style="display: block; margin-bottom: 4px; opacity: 0.85;">.ini File</label>
      <div style="display: flex; gap: 4px; margin-bottom: 12px;">
        <vscode-text-field v-model="customIniPath" placeholder="Path to .ini file" style="flex: 1;"></vscode-text-field>
        <vscode-button appearance="icon" @click="onboardingAction('browseIni')">
          <span class="codicon codicon-folder-opened"></span>
        </vscode-button>
      </div>

      <label style="display: block; margin-bottom: 4px; opacity: 0.85;">.xml File</label>
      <div style="display: flex; gap: 4px; margin-bottom: 16px;">
        <vscode-text-field v-model="customXmlPath" placeholder="Path to .xml file" style="flex: 1;"></vscode-text-field>
        <vscode-button appearance="icon" @click="onboardingAction('browseXml')">
          <span class="codicon codicon-folder-opened"></span>
        </vscode-button>
      </div>

      <vscode-button @click="onboardingAction('applyCustomPaths', { ini: customIniPath, xml: customXmlPath })" style="width: 100%;">
        Apply
      </vscode-button>
    </div>

    <!-- MANUAL SETUP STEPS -->
    <div v-if="onboardingState?.step === 'manual-setup'">
      <div style="display: flex; align-items: center; margin-bottom: 12px;">
        <h1 style="font-size: 1.2em; margin: 0; flex: 1;">Manual Setup</h1>
        <span style="opacity: 0.6; font-size: 0.85em;">{{ manualStepLabel }}</span>
      </div>

      <!-- GAMS Executable -->
      <div v-if="onboardingState.manualStep === 'gams-executable'">
        <label style="display: block; margin-bottom: 4px; opacity: 0.85;">GAMS Executable</label>
        <p style="font-size: 0.85em; opacity: 0.7; margin-bottom: 8px; padding-left: 0;">Path to the GAMS executable on your system (e.g. <code>gams</code> or <code>gams.exe</code>). GAMS IDE needs this to run and compile your models. If a GAMS installation was detected, it is shown as the placeholder below.</p>
        <div style="display: flex; gap: 4px; margin-bottom: 8px;">
          <vscode-text-field v-model="manualGamsExe" :placeholder="onboardingState.detectedGamsPath || 'Path to gams'" style="flex: 1;"></vscode-text-field>
          <vscode-button appearance="icon" @click="onboardingAction('browseGamsExe')">
            <span class="codicon codicon-folder-opened"></span>
          </vscode-button>
        </div>
        <div style="display: flex; gap: 8px;">
          <vscode-button @click="onboardingAction('setGamsExecutable', { value: manualGamsExe || onboardingState.detectedGamsPath })" style="flex: 1;">
            Confirm
          </vscode-button>
          <vscode-button appearance="secondary" @click="onboardingAction('skipStep', { currentStep: 'gams-executable' })" style="flex: 1;">
            Skip
          </vscode-button>
        </div>
      </div>

      <!-- Main GMS File -->
      <div v-if="onboardingState.manualStep === 'main-file'">
        <label style="display: block; margin-bottom: 4px; opacity: 0.85;">Main GAMS File</label>
        <p style="font-size: 0.85em; opacity: 0.7; margin-bottom: 8px; padding-left: 0;">The entry-point <code>.gms</code> file that GAMS executes when you run your model. In multi-file projects this is typically the top-level file that includes all others.</p>
        <div v-if="onboardingState.gamsFiles?.length" style="max-height: 200px; overflow-y: auto; margin-bottom: 8px;">
          <p v-for="f in onboardingState.gamsFiles" :key="f"
             @click="onboardingAction('setMainFile', { value: f })"
             style="cursor: pointer; padding: 4px 8px; margin: 2px 0; border-radius: 3px;">
            {{ f }}
          </p>
        </div>
        <vscode-button appearance="secondary" @click="onboardingAction('skipStep', { currentStep: 'main-file' })" style="width: 100%;">
          Skip
        </vscode-button>
      </div>

      <!-- Scratch Directory -->
      <div v-if="onboardingState.manualStep === 'scratch-dir'">
        <label style="display: block; margin-bottom: 4px; opacity: 0.85;">Scratch Directory</label>
        <p style="font-size: 0.85em; opacity: 0.7; margin-bottom: 8px; padding-left: 0;">A temporary working directory where GAMS stores intermediate files during execution. For best performance, place it on a fast local disk (SSD). Leave empty to use the default location.</p>
        <div style="display: flex; gap: 4px; margin-bottom: 8px;">
          <vscode-text-field v-model="manualScratchDir" placeholder="Leave empty for default" style="flex: 1;"></vscode-text-field>
          <vscode-button appearance="icon" @click="onboardingAction('browseScratchDir')">
            <span class="codicon codicon-folder-opened"></span>
          </vscode-button>
        </div>
        <div style="display: flex; gap: 8px;">
          <vscode-button @click="onboardingAction('setScratchDir', { value: manualScratchDir })" style="flex: 1;">
            Confirm
          </vscode-button>
          <vscode-button appearance="secondary" @click="onboardingAction('skipStep', { currentStep: 'scratch-dir' })" style="flex: 1;">
            Skip
          </vscode-button>
        </div>
      </div>

      <!-- Execution Arguments -->
      <div v-if="onboardingState.manualStep === 'exec-args'">
        <label style="display: block; margin-bottom: 4px; opacity: 0.85;">Execution Arguments</label>
        <p style="font-size: 0.85em; opacity: 0.7; margin-bottom: 8px; padding-left: 0;">Extra command-line arguments passed to GAMS when you run a model (e.g. <code>lp=cplex</code>, <code>mip=gurobi</code>). These are appended after the built-in arguments. Leave empty if you don't need any.</p>
        <vscode-text-field v-model="manualExecArgs" placeholder="e.g. --myOption=value" style="width: 100%; margin-bottom: 8px;"></vscode-text-field>
        <div style="display: flex; gap: 8px;">
          <vscode-button @click="onboardingAction('setExecArgs', { value: manualExecArgs })" style="flex: 1;">
            Confirm
          </vscode-button>
          <vscode-button appearance="secondary" @click="onboardingAction('skipStep', { currentStep: 'exec-args' })" style="flex: 1;">
            Skip
          </vscode-button>
        </div>
      </div>

      <!-- Compilation Arguments -->
      <div v-if="onboardingState.manualStep === 'compile-args'">
        <label style="display: block; margin-bottom: 4px; opacity: 0.85;">Compilation Arguments</label>
        <p style="font-size: 0.85em; opacity: 0.7; margin-bottom: 8px; padding-left: 0;">Extra command-line arguments passed to GAMS when you compile. Compilation checks your code for errors and builds the symbol reference tree used for navigation and data inspection — without actually solving. Leave empty if you don't need any.</p>
        <vscode-text-field v-model="manualCompileArgs" placeholder="e.g. --myOption=value" style="width: 100%; margin-bottom: 8px;"></vscode-text-field>
        <div style="display: flex; gap: 8px;">
          <vscode-button @click="onboardingAction('setCompileArgs', { value: manualCompileArgs })" style="flex: 1;">
            Confirm
          </vscode-button>
          <vscode-button appearance="secondary" @click="onboardingAction('skipStep', { currentStep: 'compile-args' })" style="flex: 1;">
            Skip
          </vscode-button>
        </div>
      </div>

      <!-- Compile on Save -->
      <div v-if="onboardingState.manualStep === 'compile-on-save'">
        <label style="display: block; margin-bottom: 4px; opacity: 0.85;">Compile on Save</label>
        <p style="font-size: 0.85em; opacity: 0.7; margin-bottom: 8px; padding-left: 0;">When enabled, GAMS IDE compiles your model every time you save a file. This keeps error markers and symbol references up to date as you work. If your model takes a long time to compile, you may want to disable this and trigger compilation manually via the "GAMS: Check errors" command (Ctrl+Shift+P).</p>
        <div style="display: flex; gap: 8px;">
          <vscode-button @click="onboardingAction('setCompileOnSave', { value: true })" style="flex: 1;">
            Enable (Recommended)
          </vscode-button>
          <vscode-button appearance="secondary" @click="onboardingAction('setCompileOnSave', { value: false })" style="flex: 1;">
            Disable
          </vscode-button>
        </div>
      </div>
    </div>

    <!-- COMPLETE -->
    <div v-if="onboardingState?.step === 'complete'">
      <h1 style="font-size: 1.2em; margin-bottom: 8px;">Setup Complete</h1>
      <p style="line-height: 1.6; opacity: 0.85; margin-bottom: 8px; padding-left: 0;">
        Your workspace is configured and ready to go. Run models with the play button in the sidebar, compile with Ctrl+Shift+B, and click any symbol in a <code>.gms</code> file to explore its references.
      </p>
      <p style="line-height: 1.6; opacity: 0.85; margin-bottom: 8px; padding-left: 0;">
        There are more options to explore in the <span class="gams-link" @click="openSettings">VS Code settings</span> and in the <span class="gams-link" @click="openDocs">official documentation</span>.
      </p>
      <p style="line-height: 1.6; opacity: 0.85; margin-bottom: 16px; padding-left: 0;">
        To change these settings later, open the command palette (Ctrl+Shift+P) and search for "GAMS: Project Setup".
      </p>
      <div v-if="onboardingState.summary" style="padding: 10px; border-radius: 4px; background: var(--vscode-textBlockQuote-background); margin-bottom: 16px;">
        <p v-for="(val, key) in onboardingState.summary" :key="key" style="font-size: 0.9em; margin: 4px 0; padding-left: 0;">
          <b>{{ key }}:</b> {{ val }}
        </p>
      </div>

      <!-- Compile status -->
      <div v-if="onboardingCompileStatus === 'compiling'" style="display: flex; align-items: center; gap: 8px; padding: 10px; border-radius: 4px; background: var(--vscode-textBlockQuote-background); margin-bottom: 16px;">
        <span class="codicon codicon-loading codicon-modifier-spin"></span>
        <span style="opacity: 0.85;">Compiling your model...</span>
      </div>
      <div v-if="onboardingCompileStatus === 'success'" style="display: flex; align-items: center; gap: 8px; padding: 10px; border-radius: 4px; background: var(--vscode-textBlockQuote-background); margin-bottom: 16px;">
        <span class="codicon codicon-check" style="color: var(--vscode-testing-iconPassed);"></span>
        <span style="opacity: 0.85;">Your model compiles successfully — you're good to go!</span>
      </div>
      <div v-if="onboardingCompileStatus === 'error'" style="display: flex; align-items: center; gap: 8px; padding: 10px; border-radius: 4px; background: var(--vscode-textBlockQuote-background); margin-bottom: 16px;">
        <span class="codicon codicon-warning" style="color: var(--vscode-testing-iconFailed);"></span>
        <span style="opacity: 0.85;">Compilation found errors — is this expected? Check the Problems panel for details.</span>
      </div>

      <vscode-button @click="onboardingAction('completeOnboarding')" style="width: 100%;">
        Done
      </vscode-button>
    </div>
  </div>
  <div v-if="!isListing && !showOnboarding" style="flex: 1; overflow-y: auto; min-height: 0;">
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
      <vscode-text-field v-model="searchString" @input="updateSymbol({name: searchString, fuzzy: true})" @input="updateSymbol({name: searchString, fuzzy: true})">
        <span slot="start" placeholder="Search..." class="codicon codicon-search"></span>
        <span slot="end" v-if="searchString" class="codicon codicon-close" @click="searchString = ''"></span>
      </vscode-text-field>
    </div>
    <!-- Use normal HTML elements for the content part -->
      <div v-if="!missingSymbol && !name">
        <div style="padding: 8px 0;">
          <h1 style="font-size: 1.2em; margin-bottom: 12px;">GAMS References</h1>
          <p style="padding-left: 0; line-height: 1.6; opacity: 0.85;">
            Click on any symbol in a <code>.gms</code> file to explore its declarations, definitions, and references across your model.
          </p>
          <div style="margin-top: 16px; padding: 10px; border-radius: 4px; background: var(--vscode-textBlockQuote-background);">
            <p style="padding-left: 0; margin: 0; font-size: 0.9em; opacity: 0.7;">
              <span class="codicon codicon-lightbulb" style="margin-right: 4px;"></span>
              <b>Tip:</b> Use the search field above to find symbols by name, or press <code>Alt+X</code> to follow include paths.
            </p>
          </div>
        </div>
      </div>
      <div v-if="missingSymbol">
        <h1>No data</h1>
        <span>The symbol <b>{{ missingSymbol}}</b> is not read by the GAMS compiler.</span>
        <br>
        <br>
        <span>
          If you expect this symbol to be in the reference tree, check your models program flow as well as the GAMS log file for errors!
        </span>
        <br>
        <span>
          Also note that at least one solve statement is required for symbols to appear.
        </span>
      </div>
      <div v-if="name" slot="content" class="gams-interactive" style="margin-bottom: 40px;">
      <span v-html="functionHTML"></span>
      <h1>{{name}}</h1>
	  	<div>{{type}}</div>
	  	<div>
	  		<h2 v-if="description">{{description}}</h2>
	  		<div v-if="domain">
	  			<h3>Domain</h3>
	  			<p v-for="(elem,i) in domain" :key="'domain_' + i" @click="updateSymbol({name: elem.name})">{{elem.name}}</p>
	  		</div>
        <div v-if="subsets" class="gams-badge-div">
	  			<h3 @click="subsetsShown = !subsetsShown">Subsets</h3>
          <vscode-badge @click="subsetsShown = !subsetsShown">
            {{subsets.length}}
          </vscode-badge>
	  		</div>
        <div v-if="subsets && subsetsShown">
          <div transition="expand">
	  				<p v-for="(subset,i) in subsets" :key="'subsets_' + i" @click="updateSymbol({name: subset.name})">{{subset.name}}</p>
	  			</div>
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
	  		<div v-if="$data['impl-asn']" class="gams-badge-div">
	  			<h3 @click="$data['impl-asnShown'] = !$data['impl-asnShown']">Implicitly assigned values in</h3>
          <vscode-badge @click="$data['impl-asnShown'] = !$data['impl-asnShown']">
            {{$data['impl-asn'].length}}
          </vscode-badge>
	  		</div>
	  		<div v-if="$data['impl-asn'] && $data['impl-asnShown']">
	  			<div transition="expand">
	  				<p v-for="(elem,i) in $data['impl-asn']" :key="'impl-asn_' + i" @click="jumpToPosition({file: elem.file,line: elem.line,column: elem.column})">{{elem.base}}, {{elem.line}}</p>
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
  <div v-if="isListing && !showOnboarding" style="flex: 1; overflow-y: auto; min-height: 0;">
    <div style="display: flex; padding-bottom: 5px; background: var(--vscode-editorHoverWidget-background); position: sticky; top: 0px; width: 100%;">
      <vscode-text-field v-model="lstSearchEntry" @input="updateLst(lstSearchEntry)" style="width: 100%;">
        <span slot="start" placeholder="Search..." class="codicon codicon-search"></span>
        <span slot="end" v-if="lstSearchEntry" class="codicon codicon-close" @click="lstSearchEntry = '', updateLst('')"></span>
      </vscode-text-field>
    </div>
    <div v-if="lstTree" class="gams-interactive">
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
  <!-- Settings section - always visible when not in onboarding, pinned to bottom -->
  <div v-if="!showOnboarding" style="flex-shrink: 0; border-top: 1px solid var(--vscode-widget-border, rgba(128,128,128,0.2)); padding: 8px 4px 20px 4px;">
    <div @click="settingsCollapsed = !settingsCollapsed" style="display: flex; align-items: center; gap: 6px; cursor: pointer; user-select: none; padding: 4px 0;">
      <span :class="'codicon codicon-chevron-' + (settingsCollapsed ? 'right' : 'down')" style="opacity: 0.7; font-size: 0.8em;"></span>
      <span class="codicon codicon-settings-gear" style="opacity: 0.7;"></span>
      <span style="font-weight: 600; font-size: 0.9em;">Settings</span>
    </div>

    <div v-if="!settingsCollapsed" style="margin-top: 8px;">
      <!-- Compile on Save toggle -->
      <label style="display: flex; align-items: center; gap: 8px; margin-bottom: 10px; cursor: pointer; font-size: 0.9em;">
        <input type="checkbox" :checked="compileOnSave" @change="toggleCompileOnSave" />
        Compile on Save
      </label>

      <!-- GAMS Command Preview -->
      <div v-if="gamsCommandPreview" @click="openSettingsJson" style="cursor: pointer; padding: 8px; border-radius: 4px; background: var(--vscode-textBlockQuote-background); margin-bottom: 10px; font-family: var(--vscode-editor-font-family, monospace); font-size: 0.8em; word-break: break-all; line-height: 1.4;" title="Click to open settings">
        <span style="opacity: 0.6; font-size: 0.85em; display: block; margin-bottom: 4px;">Run command:</span>
        {{ gamsCommandPreview }}
      </div>

      <!-- Links -->
      <div style="display: flex; gap: 16px; font-size: 0.85em;">
        <span class="gams-link" @click="openSettings" style="display: flex; align-items: center; gap: 4px;">
          <span class="codicon codicon-settings"></span> Settings
        </span>
        <span class="gams-link" @click="openDocs" style="display: flex; align-items: center; gap: 4px;">
          <span class="codicon codicon-book"></span> Docs
        </span>
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

  .gams-view .gams-interactive p:hover {
  	text-decoration: underline;
  	cursor: pointer;
  }

  .gams-link {
    color: var(--vscode-textLink-foreground);
    cursor: pointer;
  }
  .gams-link:hover {
    text-decoration: underline;
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
        subsetsShown: false,
        declared: undefined,
        defined: undefined,
        assigned: undefined,
        assignedShown: false,
        "impl-asn": undefined,
        "impl-asnShown": false,
        superset: false,
        isSubset: false,
        subsets: [],
        searchString: '',
        ref: undefined,
        file: undefined,
        refShown: false,
        control: undefined,
        controlShown: false,
        missingSymbol: "",
        quotedElement: "",
        functionName: "",
        functionDomain: "",
        domainIndex: "",
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
        autoUnfoldListingEntriesTreshold: 10,
        showOnboarding: false,
        onboardingState: null,
        onboardingHistory: [],
        customIniPath: '',
        customXmlPath: '',
        manualGamsExe: '',
        manualScratchDir: '',
        manualExecArgs: '',
        manualCompileArgs: '',
        onboardingCompileStatus: null,
        compileOnSave: true,
        gamsCommandPreview: '',
        settingsCollapsed: false,
      }
    },
    computed: {
      manualStepLabel() {
        const steps = { 'gams-executable': '1/6', 'main-file': '2/6', 'scratch-dir': '3/6', 'exec-args': '4/6', 'compile-args': '5/6', 'compile-on-save': '6/6' };
        return steps[this.onboardingState?.manualStep] || '';
      },
      functionHTML() {
        /*
        if (this.functionName) {
        
          let html = '<span style="font-style: italic;" @click="updateSymbol("' + this.functionName + '")>' + this.functionName + '</span>' + '('
          this.functionDomain.forEach((elem, i) => {
            if (i > 0) html += ', '
            if (i === this.functionDomainIndex) {
              html += '<span @click="updateSymbol("' + elem + '")><b>' + elem + '</b></span>'
            } else {
              html += '<span @click="updateSymbol("' + elem + '")>' + elem + '</span>'
            }
          });
          html += ')'
          return html;
        */
        if (this.quotedElement) {
          return '<span>Element "</span><span style="font-style: italic;">' + this.quotedElement + '</span><span>" from set</span>'
        } else {
          return '<br>'
        }
      }
    },
    mounted: function () {
      window.addEventListener('message', event => {
        const message = event.data; // The JSON data our extension sent
        switch (message.command) {
            case 'showGAMSorListing':
              if (this.showOnboarding) return;
              this.isListing = message.data.isListing;
              break;
            case 'updateListing':
              if (this.showOnboarding) return;
              this.lstTree = message.data.lstTree;
              this.isListing = message.data.isListing;
              this.lstTreeOrig = message.data.lstTree;
              break;
            case 'updateReference':
              if (this.locked || this.showOnboarding) return;
              const keys = [
                "name",
                "nameLo",
                "type",
                "description",
                "domain",
                "declared",
                "defined",
                "assigned",
                "impl-asn",
                "ref",
                "control",
                "subsets",
                "isSubset",
                "superset",
                "symId",
                "quotedElement",
                "functionName",
                "functionDomain",
                "functionDomainIndex",
                "historyCursorFile",
                "historyCursorLine",
                "historyCursorColumn"
              ]
              keys.forEach(key => {
                  this[key] = message.data[key];
              })
              this.missingSymbol = "";
              break;
            case 'showOnboarding':
              this.showOnboarding = true;
              this.onboardingHistory = [];
              this.onboardingState = message.data;
              break;
            case 'updateOnboarding':
              if (this.onboardingState) {
                this.onboardingHistory.push(JSON.parse(JSON.stringify(this.onboardingState)));
              }
              this.onboardingState = message.data;
              if (message.data?.detectedIniPath) {
                this.customIniPath = message.data.detectedIniPath;
              }
              if (message.data?.detectedXmlPath) {
                this.customXmlPath = message.data.detectedXmlPath;
              }
              if (message.data?.detectedGamsPath) {
                this.manualGamsExe = message.data.detectedGamsPath;
              }
              if (message.data?.currentSettings?.scratchDirectory) {
                this.manualScratchDir = message.data.currentSettings.scratchDirectory;
              }
              break;
            case 'updateOnboardingInPlace':
              // Update state without pushing to history (for browse results)
              this.onboardingState = message.data;
              if (message.data?.detectedIniPath) {
                this.customIniPath = message.data.detectedIniPath;
              }
              if (message.data?.detectedXmlPath) {
                this.customXmlPath = message.data.detectedXmlPath;
              }
              if (message.data?.detectedGamsPath) {
                this.manualGamsExe = message.data.detectedGamsPath;
              }
              if (message.data?.currentSettings?.scratchDirectory) {
                this.manualScratchDir = message.data.currentSettings.scratchDirectory;
              }
              break;
            case 'hideOnboarding':
              this.showOnboarding = false;
              this.onboardingCompileStatus = null;
              break;
            case 'onboardingCompileStatus':
              this.onboardingCompileStatus = message.data;
              break;
            case 'onboardingCompileResult':
              this.onboardingCompileStatus = message.data.success ? 'success' : 'error';
              break;
            case 'updateSettings':
              if (message.data.compileOnSave !== undefined) {
                this.compileOnSave = message.data.compileOnSave;
              }
              if (message.data.gamsCommandPreview !== undefined) {
                this.gamsCommandPreview = message.data.gamsCommandPreview;
              }
              break;
            case 'updateReferenceError':
              if (this.showOnboarding) return;
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
        // return early if locked
        if (this.locked) return;

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
      onboardingBack() {
        if (this.onboardingHistory.length > 0) {
          this.onboardingState = this.onboardingHistory.pop();
        }
      },
      onboardingAction(action, data = {}) {
        vscode.postMessage({
          command: 'onboardingAction',
          data: { action, ...data }
        });
      },
      toggleCompileOnSave() {
        this.compileOnSave = !this.compileOnSave;
        vscode.postMessage({
          command: 'toggleCompileOnSave',
          data: { value: this.compileOnSave }
        });
      },
      openSettings() {
        vscode.postMessage({ command: 'openSettings' });
      },
      openSettingsJson() {
        vscode.postMessage({ command: 'openSettingsJson' });
      },
      openDocs() {
        vscode.postMessage({ command: 'openDocs' });
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
            console.error("gams view error (vue) parsing lst", e)
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
  
</script>`;
};