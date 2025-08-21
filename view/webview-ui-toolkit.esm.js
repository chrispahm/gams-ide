/**
 * Bundled by jsDelivr using Rollup v2.74.1 and Terser v5.15.1.
 * Original file: /npm/@vscode/webview-ui-toolkit@1.2.2/dist/index.js
 *
 * Do NOT use SRI with dynamically generated files! More information: https://www.jsdelivr.com/using-sri-with-dynamic-files
 */
import{DesignSystem as t,DesignToken as e,display as o,badgeTemplate as r,Badge as n,focusVisible as i,disabledCursor as a,buttonTemplate as c,Button as l,checkboxTemplate as s,Checkbox as d,DataGrid as b,dataGridTemplate as p,DataGridRow as h,dataGridRowTemplate as u,DataGridCell as g,dataGridCellTemplate as f,dividerTemplate as $,Divider as x,selectTemplate as m,Select as v,anchorTemplate as k,Anchor as w,listboxOptionTemplate as y,ListboxOption as D,tabsTemplate as C,tabTemplate as z,tabPanelTemplate as A,Tabs as B,TabsOrientation as N,Tab as F,TabPanel as S,progressRingTemplate as T,BaseProgress as G,radioGroupTemplate as R,RadioGroup as O,radioTemplate as I,Radio as L,textAreaTemplate as P,TextArea as _,textFieldTemplate as j,TextField as M}from"/npm/@microsoft/fast-foundation@2.48.0/+esm";export{DataGridCellTypes,DataGridRowTypes,DividerRole,SelectPosition as DropdownPosition,GenerateHeaderOptions,TextAreaResize,TextFieldType}from"/npm/@microsoft/fast-foundation@2.48.0/+esm";import{css as H,attr as q}from"/npm/@microsoft/fast-element@1.11.0/+esm";import{__decorate as E}from"/npm/tslib@2.5.0/+esm";export{Orientation as RadioGroupOrientation}from"/npm/@microsoft/fast-web-utilities/+esm";function U(e){return t.getOrCreate(e).withPrefix("vscode")}function V(t){const e=getComputedStyle(document.body),o=document.querySelector("body");if(o){const r=o.getAttribute("data-vscode-theme-kind");for(const[n,i]of t){let t=e.getPropertyValue(n).toString();if("vscode-high-contrast"===r)0===t.length&&i.name.includes("background")&&(t="transparent"),"button-icon-hover-background"===i.name&&(t="transparent");else if("vscode-high-contrast-light"===r){if(0===t.length&&i.name.includes("background"))switch(i.name){case"button-primary-hover-background":t="#0F4A85";break;case"button-secondary-hover-background":case"button-icon-hover-background":t="transparent"}}else"contrast-active-border"===i.name&&(t="transparent");i.setValueFor(o,t)}}}const W=new Map;let J=!1;function K(t,o){const r=e.create(t);if(o){if(o.includes("--fake-vscode-token")){o=`${o}-${"id"+Math.random().toString(16).slice(2)}`}W.set(o,r)}return J||(!function(t){window.addEventListener("load",(()=>{new MutationObserver((()=>{V(t)})).observe(document.body,{attributes:!0,attributeFilter:["class"]}),V(t)}))}(W),J=!0),r}const Q=K("background","--vscode-editor-background").withDefault("#1e1e1e"),X=K("border-width").withDefault(1),Y=K("contrast-active-border","--vscode-contrastActiveBorder").withDefault("#f38518");K("contrast-border","--vscode-contrastBorder").withDefault("#6fc3df");const Z=K("corner-radius").withDefault(0),tt=K("design-unit").withDefault(4),et=K("disabled-opacity").withDefault(.4),ot=K("focus-border","--vscode-focusBorder").withDefault("#007fd4"),rt=K("font-family","--vscode-font-family").withDefault("-apple-system, BlinkMacSystemFont, Segoe UI, Roboto, Helvetica, Arial, sans-serif, Apple Color Emoji, Segoe UI Emoji, Segoe UI Symbol");K("font-weight","--vscode-font-weight").withDefault("400");const nt=K("foreground","--vscode-foreground").withDefault("#cccccc"),it=K("input-height").withDefault("26"),at=K("input-min-width").withDefault("100px"),ct=K("type-ramp-base-font-size","--vscode-font-size").withDefault("13px"),lt=K("type-ramp-base-line-height").withDefault("normal"),st=K("type-ramp-minus1-font-size").withDefault("11px"),dt=K("type-ramp-minus1-line-height").withDefault("16px");K("type-ramp-minus2-font-size").withDefault("9px"),K("type-ramp-minus2-line-height").withDefault("16px"),K("type-ramp-plus1-font-size").withDefault("16px"),K("type-ramp-plus1-line-height").withDefault("24px");const bt=K("scrollbarWidth").withDefault("10px"),pt=K("scrollbarHeight").withDefault("10px"),ht=K("scrollbar-slider-background","--vscode-scrollbarSlider-background").withDefault("#79797966"),ut=K("scrollbar-slider-hover-background","--vscode-scrollbarSlider-hoverBackground").withDefault("#646464b3"),gt=K("scrollbar-slider-active-background","--vscode-scrollbarSlider-activeBackground").withDefault("#bfbfbf66"),ft=K("badge-background","--vscode-badge-background").withDefault("#4d4d4d"),$t=K("badge-foreground","--vscode-badge-foreground").withDefault("#ffffff"),xt=K("button-border","--vscode-button-border").withDefault("transparent"),mt=K("button-icon-background").withDefault("transparent"),vt=K("button-icon-corner-radius").withDefault("5px"),kt=K("button-icon-outline-offset").withDefault(0),wt=K("button-icon-hover-background","--fake-vscode-token").withDefault("rgba(90, 93, 94, 0.31)"),yt=K("button-icon-padding").withDefault("3px"),Dt=K("button-primary-background","--vscode-button-background").withDefault("#0e639c"),Ct=K("button-primary-foreground","--vscode-button-foreground").withDefault("#ffffff"),zt=K("button-primary-hover-background","--vscode-button-hoverBackground").withDefault("#1177bb"),At=K("button-secondary-background","--vscode-button-secondaryBackground").withDefault("#3a3d41"),Bt=K("button-secondary-foreground","--vscode-button-secondaryForeground").withDefault("#ffffff"),Nt=K("button-secondary-hover-background","--vscode-button-secondaryHoverBackground").withDefault("#45494e"),Ft=K("button-padding-horizontal").withDefault("11px"),St=K("button-padding-vertical").withDefault("4px"),Tt=K("checkbox-background","--vscode-checkbox-background").withDefault("#3c3c3c"),Gt=K("checkbox-border","--vscode-checkbox-border").withDefault("#3c3c3c"),Rt=K("checkbox-corner-radius").withDefault(3);K("checkbox-foreground","--vscode-checkbox-foreground").withDefault("#f0f0f0");const Ot=K("list-active-selection-background","--vscode-list-activeSelectionBackground").withDefault("#094771"),It=K("list-active-selection-foreground","--vscode-list-activeSelectionForeground").withDefault("#ffffff"),Lt=K("list-hover-background","--vscode-list-hoverBackground").withDefault("#2a2d2e"),Pt=K("divider-background","--vscode-settings-dropdownListBorder").withDefault("#454545"),_t=K("dropdown-background","--vscode-dropdown-background").withDefault("#3c3c3c"),jt=K("dropdown-border","--vscode-dropdown-border").withDefault("#3c3c3c");K("dropdown-foreground","--vscode-dropdown-foreground").withDefault("#f0f0f0");const Mt=K("dropdown-list-max-height").withDefault("200px"),Ht=K("input-background","--vscode-input-background").withDefault("#3c3c3c"),qt=K("input-foreground","--vscode-input-foreground").withDefault("#cccccc");K("input-placeholder-foreground","--vscode-input-placeholderForeground").withDefault("#cccccc");const Et=K("link-active-foreground","--vscode-textLink-activeForeground").withDefault("#3794ff"),Ut=K("link-foreground","--vscode-textLink-foreground").withDefault("#3794ff"),Vt=K("progress-background","--vscode-progressBar-background").withDefault("#0e70c0"),Wt=K("panel-tab-active-border","--vscode-panelTitle-activeBorder").withDefault("#e7e7e7"),Jt=K("panel-tab-active-foreground","--vscode-panelTitle-activeForeground").withDefault("#e7e7e7"),Kt=K("panel-tab-foreground","--vscode-panelTitle-inactiveForeground").withDefault("#e7e7e799");K("panel-view-background","--vscode-panel-background").withDefault("#1e1e1e"),K("panel-view-border","--vscode-panel-border").withDefault("#80808059");const Qt=K("tag-corner-radius").withDefault("2px");class Xt extends n{connectedCallback(){super.connectedCallback(),this.circular||(this.circular=!0)}}const Yt=Xt.compose({baseName:"badge",template:r,styles:(t,e)=>H`
	${o("inline-block")} :host {
		box-sizing: border-box;
		font-family: ${rt};
		font-size: ${st};
		line-height: ${dt};
		text-align: center;
	}
	.control {
		align-items: center;
		background-color: ${ft};
		border: calc(${X} * 1px) solid ${xt};
		border-radius: 11px;
		box-sizing: border-box;
		color: ${$t};
		display: flex;
		height: calc(${tt} * 4px);
		justify-content: center;
		min-width: calc(${tt} * 4px + 2px);
		min-height: calc(${tt} * 4px + 2px);
		padding: 3px 6px;
	}
`}),Zt=H`
	${o("inline-flex")} :host {
		outline: none;
		font-family: ${rt};
		font-size: ${ct};
		line-height: ${lt};
		color: ${Ct};
		background: ${Dt};
		border-radius: 2px;
		fill: currentColor;
		cursor: pointer;
	}
	.control {
		background: transparent;
		height: inherit;
		flex-grow: 1;
		box-sizing: border-box;
		display: inline-flex;
		justify-content: center;
		align-items: center;
		padding: ${St} ${Ft};
		white-space: wrap;
		outline: none;
		text-decoration: none;
		border: calc(${X} * 1px) solid ${xt};
		color: inherit;
		border-radius: inherit;
		fill: inherit;
		cursor: inherit;
		font-family: inherit;
	}
	:host(:hover) {
		background: ${zt};
	}
	:host(:active) {
		background: ${Dt};
	}
	.control:${i} {
		outline: calc(${X} * 1px) solid ${ot};
		outline-offset: calc(${X} * 2px);
	}
	.control::-moz-focus-inner {
		border: 0;
	}
	:host([disabled]) {
		opacity: ${et};
		background: ${Dt};
		cursor: ${a};
	}
	.content {
		display: flex;
	}
	.start {
		display: flex;
	}
	::slotted(svg),
	::slotted(span) {
		width: calc(${tt} * 4px);
		height: calc(${tt} * 4px);
	}
	.start {
		margin-inline-end: 8px;
	}
`,te=H`
	:host([appearance='primary']) {
		background: ${Dt};
		color: ${Ct};
	}
	:host([appearance='primary']:hover) {
		background: ${zt};
	}
	:host([appearance='primary']:active) .control:active {
		background: ${Dt};
	}
	:host([appearance='primary']) .control:${i} {
		outline: calc(${X} * 1px) solid ${ot};
		outline-offset: calc(${X} * 2px);
	}
	:host([appearance='primary'][disabled]) {
		background: ${Dt};
	}
`,ee=H`
	:host([appearance='secondary']) {
		background: ${At};
		color: ${Bt};
	}
	:host([appearance='secondary']:hover) {
		background: ${Nt};
	}
	:host([appearance='secondary']:active) .control:active {
		background: ${At};
	}
	:host([appearance='secondary']) .control:${i} {
		outline: calc(${X} * 1px) solid ${ot};
		outline-offset: calc(${X} * 2px);
	}
	:host([appearance='secondary'][disabled]) {
		background: ${At};
	}
`,oe=H`
	:host([appearance='icon']) {
		background: ${mt};
		border-radius: ${vt};
		color: ${nt};
	}
	:host([appearance='icon']:hover) {
		background: ${wt};
		outline: 1px dotted ${Y};
		outline-offset: -1px;
	}
	:host([appearance='icon']) .control {
		padding: ${yt};
		border: none;
	}
	:host([appearance='icon']:active) .control:active {
		background: ${wt};
	}
	:host([appearance='icon']) .control:${i} {
		outline: calc(${X} * 1px) solid ${ot};
		outline-offset: ${kt};
	}
	:host([appearance='icon'][disabled]) {
		background: ${mt};
	}
`;class re extends l{connectedCallback(){if(super.connectedCallback(),!this.appearance){const t=this.getAttribute("appearance");this.appearance=t}}attributeChangedCallback(t,e,o){if("appearance"===t&&"icon"===o){this.getAttribute("aria-label")||(this.ariaLabel="Icon Button")}"aria-label"===t&&(this.ariaLabel=o),"disabled"===t&&(this.disabled=null!==o)}}E([q],re.prototype,"appearance",void 0);const ne=re.compose({baseName:"button",template:c,styles:(t,e)=>H`
	${Zt}
	${te}
	${ee}
	${oe}
`,shadowOptions:{delegatesFocus:!0}});class ie extends d{connectedCallback(){super.connectedCallback(),this.textContent?this.setAttribute("aria-label",this.textContent):this.setAttribute("aria-label","Checkbox")}}const ae=ie.compose({baseName:"checkbox",template:s,styles:(t,e)=>H`
	${o("inline-flex")} :host {
		align-items: center;
		outline: none;
		margin: calc(${tt} * 1px) 0;
		user-select: none;
		font-size: ${ct};
		line-height: ${lt};
	}
	.control {
		position: relative;
		width: calc(${tt} * 4px + 2px);
		height: calc(${tt} * 4px + 2px);
		box-sizing: border-box;
		border-radius: calc(${Rt} * 1px);
		border: calc(${X} * 1px) solid ${Gt};
		background: ${Tt};
		outline: none;
		cursor: pointer;
	}
	.label {
		font-family: ${rt};
		color: ${nt};
		padding-inline-start: calc(${tt} * 2px + 2px);
		margin-inline-end: calc(${tt} * 2px + 2px);
		cursor: pointer;
	}
	.label__hidden {
		display: none;
		visibility: hidden;
	}
	.checked-indicator {
		width: 100%;
		height: 100%;
		display: block;
		fill: ${nt};
		opacity: 0;
		pointer-events: none;
	}
	.indeterminate-indicator {
		border-radius: 2px;
		background: ${nt};
		position: absolute;
		top: 50%;
		left: 50%;
		width: 50%;
		height: 50%;
		transform: translate(-50%, -50%);
		opacity: 0;
	}
	:host(:enabled) .control:hover {
		background: ${Tt};
		border-color: ${Gt};
	}
	:host(:enabled) .control:active {
		background: ${Tt};
		border-color: ${ot};
	}
	:host(:${i}) .control {
		border: calc(${X} * 1px) solid ${ot};
	}
	:host(.disabled) .label,
	:host(.readonly) .label,
	:host(.readonly) .control,
	:host(.disabled) .control {
		cursor: ${a};
	}
	:host(.checked:not(.indeterminate)) .checked-indicator,
	:host(.indeterminate) .indeterminate-indicator {
		opacity: 1;
	}
	:host(.disabled) {
		opacity: ${et};
	}
`,checkedIndicator:'\n\t\t<svg \n\t\t\tpart="checked-indicator"\n\t\t\tclass="checked-indicator"\n\t\t\twidth="16" \n\t\t\theight="16" \n\t\t\tviewBox="0 0 16 16" \n\t\t\txmlns="http://www.w3.org/2000/svg" \n\t\t\tfill="currentColor"\n\t\t>\n\t\t\t<path \n\t\t\t\tfill-rule="evenodd" \n\t\t\t\tclip-rule="evenodd" \n\t\t\t\td="M14.431 3.323l-8.47 10-.79-.036-3.35-4.77.818-.574 2.978 4.24 8.051-9.506.764.646z"\n\t\t\t/>\n\t\t</svg>\n\t',indeterminateIndicator:'\n\t\t<div part="indeterminate-indicator" class="indeterminate-indicator"></div>\n\t'});class ce extends b{connectedCallback(){super.connectedCallback();this.getAttribute("aria-label")||this.setAttribute("aria-label","Data Grid")}}const le=ce.compose({baseName:"data-grid",baseClass:b,template:p,styles:(t,e)=>H`
	:host {
		display: flex;
		position: relative;
		flex-direction: column;
		width: 100%;
	}
`});class se extends h{}const de=se.compose({baseName:"data-grid-row",baseClass:h,template:u,styles:(t,e)=>H`
	:host {
		display: grid;
		padding: calc((${tt} / 4) * 1px) 0;
		box-sizing: border-box;
		width: 100%;
		background: transparent;
	}
	:host(.header) {
	}
	:host(.sticky-header) {
		background: ${Q};
		position: sticky;
		top: 0;
	}
	:host(:hover) {
		background: ${Lt};
		outline: 1px dotted ${Y};
		outline-offset: -1px;
	}
`});class be extends g{}const pe=be.compose({baseName:"data-grid-cell",baseClass:g,template:f,styles:(t,e)=>H`
	:host {
		padding: calc(${tt} * 1px) calc(${tt} * 3px);
		color: ${nt};
		opacity: 1;
		box-sizing: border-box;
		font-family: ${rt};
		font-size: ${ct};
		line-height: ${lt};
		font-weight: 400;
		border: solid calc(${X} * 1px) transparent;
		border-radius: calc(${Z} * 1px);
		white-space: wrap;
		overflow-wrap: anywhere;
	}
	:host(.column-header) {
		font-weight: 600;
	}
	:host(:${i}),
	:host(:focus),
	:host(:active) {
		background: ${Ot};
		border: solid calc(${X} * 1px) ${ot};
		color: ${It};
		outline: none;
	}
	:host(:${i}) ::slotted(*),
	:host(:focus) ::slotted(*),
	:host(:active) ::slotted(*) {
		color: ${It} !important;
	}
`});class he extends x{}const ue=he.compose({baseName:"divider",template:$,styles:(t,e)=>H`
	${o("block")} :host {
		border: none;
		border-top: calc(${X} * 1px) solid ${Pt};
		box-sizing: content-box;
		height: 0;
		margin: calc(${tt} * 1px) 0;
		width: 100%;
	}
`});class ge extends v{}const fe=ge.compose({baseName:"dropdown",template:m,styles:(t,e)=>H`
	${o("inline-flex")} :host {
		background: ${_t};
		box-sizing: border-box;
		color: ${nt};
		contain: contents;
		font-family: ${rt};
		height: calc(${it} * 1px);
		position: relative;
		user-select: none;
		min-width: ${at};
		outline: none;
		vertical-align: top;
	}
	.control {
		align-items: center;
		box-sizing: border-box;
		border: calc(${X} * 1px) solid ${jt};
		border-radius: calc(${Z} * 1px);
		cursor: pointer;
		display: flex;
		font-family: inherit;
		font-size: ${ct};
		line-height: ${lt};
		min-height: 100%;
		padding: 2px 6px 2px 8px;
		width: 100%;
	}
	.listbox {
		background: ${_t};
		border: calc(${X} * 1px) solid ${ot};
		border-radius: calc(${Z} * 1px);
		box-sizing: border-box;
		display: inline-flex;
		flex-direction: column;
		left: 0;
		max-height: ${Mt};
		padding: 0 0 calc(${tt} * 1px) 0;
		overflow-y: auto;
		position: absolute;
		width: 100%;
		z-index: 1;
	}
	.listbox[hidden] {
		display: none;
	}
	:host(:${i}) .control {
		border-color: ${ot};
	}
	:host(:not([disabled]):hover) {
		background: ${_t};
		border-color: ${jt};
	}
	:host(:${i}) ::slotted([aria-selected="true"][role="option"]:not([disabled])) {
		background: ${Ot};
		border: calc(${X} * 1px) solid ${ot};
		color: ${It};
	}
	:host([disabled]) {
		cursor: ${a};
		opacity: ${et};
	}
	:host([disabled]) .control {
		cursor: ${a};
		user-select: none;
	}
	:host([disabled]:hover) {
		background: ${_t};
		color: ${nt};
		fill: currentcolor;
	}
	:host(:not([disabled])) .control:active {
		border-color: ${ot};
	}
	:host(:empty) .listbox {
		display: none;
	}
	:host([open]) .control {
		border-color: ${ot};
	}
	:host([open][position='above']) .listbox,
	:host([open][position='below']) .control {
		border-bottom-left-radius: 0;
		border-bottom-right-radius: 0;
	}
	:host([open][position='above']) .control,
	:host([open][position='below']) .listbox {
		border-top-left-radius: 0;
		border-top-right-radius: 0;
	}
	:host([open][position='above']) .listbox {
		bottom: calc(${it} * 1px);
	}
	:host([open][position='below']) .listbox {
		top: calc(${it} * 1px);
	}
	.selected-value {
		flex: 1 1 auto;
		font-family: inherit;
		overflow: hidden;
		text-align: start;
		text-overflow: ellipsis;
		white-space: nowrap;
	}
	.indicator {
		flex: 0 0 auto;
		margin-inline-start: 1em;
	}
	slot[name='listbox'] {
		display: none;
		width: 100%;
	}
	:host([open]) slot[name='listbox'] {
		display: flex;
		position: absolute;
	}
	.end {
		margin-inline-start: auto;
	}
	.start,
	.end,
	.indicator,
	.select-indicator,
	::slotted(svg),
	::slotted(span) {
		fill: currentcolor;
		height: 1em;
		min-height: calc(${tt} * 4px);
		min-width: calc(${tt} * 4px);
		width: 1em;
	}
	::slotted([role='option']),
	::slotted(option) {
		flex: 0 0 auto;
	}
`,indicator:'\n\t\t<svg \n\t\t\tclass="select-indicator"\n\t\t\tpart="select-indicator"\n\t\t\twidth="16" \n\t\t\theight="16" \n\t\t\tviewBox="0 0 16 16" \n\t\t\txmlns="http://www.w3.org/2000/svg" \n\t\t\tfill="currentColor"\n\t\t>\n\t\t\t<path \n\t\t\t\tfill-rule="evenodd" \n\t\t\t\tclip-rule="evenodd" \n\t\t\t\td="M7.976 10.072l4.357-4.357.62.618L8.284 11h-.618L3 6.333l.619-.618 4.357 4.357z"\n\t\t\t/>\n\t\t</svg>\n\t'});class $e extends w{}const xe=$e.compose({baseName:"link",template:k,styles:(t,e)=>H`
	${o("inline-flex")} :host {
		background: transparent;
		box-sizing: border-box;
		color: ${Ut};
		cursor: pointer;
		fill: currentcolor;
		font-family: ${rt};
		font-size: ${ct};
		line-height: ${lt};
		outline: none;
	}
	.control {
		background: transparent;
		border: calc(${X} * 1px) solid transparent;
		border-radius: calc(${Z} * 1px);
		box-sizing: border-box;
		color: inherit;
		cursor: inherit;
		fill: inherit;
		font-family: inherit;
		height: inherit;
		padding: 0;
		outline: none;
		text-decoration: none;
		word-break: break-word;
	}
	.control::-moz-focus-inner {
		border: 0;
	}
	:host(:hover) {
		color: ${Et};
	}
	:host(:hover) .content {
		text-decoration: underline;
	}
	:host(:active) {
		background: transparent;
		color: ${Et};
	}
	:host(:${i}) .control,
	:host(:focus) .control {
		border: calc(${X} * 1px) solid ${ot};
	}
`,shadowOptions:{delegatesFocus:!0}});class me extends D{connectedCallback(){super.connectedCallback(),this.textContent?this.setAttribute("aria-label",this.textContent):this.setAttribute("aria-label","Option")}}const ve=me.compose({baseName:"option",template:y,styles:(t,e)=>H`
	${o("inline-flex")} :host {
		font-family: var(--body-font);
		border-radius: ${Z};
		border: calc(${X} * 1px) solid transparent;
		box-sizing: border-box;
		color: ${nt};
		cursor: pointer;
		fill: currentcolor;
		font-size: ${ct};
		line-height: ${lt};
		margin: 0;
		outline: none;
		overflow: hidden;
		padding: 0 calc((${tt} / 2) * 1px)
			calc((${tt} / 4) * 1px);
		user-select: none;
		white-space: nowrap;
	}
	:host(:${i}) {
		border-color: ${ot};
		background: ${Ot};
		color: ${nt};
	}
	:host([aria-selected='true']) {
		background: ${Ot};
		border: calc(${X} * 1px) solid ${ot};
		color: ${It};
	}
	:host(:active) {
		background: ${Ot};
		color: ${It};
	}
	:host(:not([aria-selected='true']):hover) {
		background: ${Ot};
		border: calc(${X} * 1px) solid ${ot};
		color: ${It};
	}
	:host(:not([aria-selected='true']):active) {
		background: ${Ot};
		color: ${nt};
	}
	:host([disabled]) {
		cursor: ${a};
		opacity: ${et};
	}
	:host([disabled]:hover) {
		background-color: inherit;
	}
	.content {
		grid-column-start: 2;
		justify-self: start;
		overflow: hidden;
		text-overflow: ellipsis;
	}
`});class ke extends B{connectedCallback(){super.connectedCallback(),this.orientation&&(this.orientation=N.horizontal);this.getAttribute("aria-label")||this.setAttribute("aria-label","Panels")}}const we=ke.compose({baseName:"panels",template:C,styles:(t,e)=>H`
	${o("grid")} :host {
		box-sizing: border-box;
		font-family: ${rt};
		font-size: ${ct};
		line-height: ${lt};
		color: ${nt};
		grid-template-columns: auto 1fr auto;
		grid-template-rows: auto 1fr;
		overflow-x: auto;
	}
	.tablist {
		display: grid;
		grid-template-rows: auto auto;
		grid-template-columns: auto;
		column-gap: calc(${tt} * 8px);
		position: relative;
		width: max-content;
		align-self: end;
		padding: calc(${tt} * 1px) calc(${tt} * 1px) 0;
		box-sizing: border-box;
	}
	.start,
	.end {
		align-self: center;
	}
	.activeIndicator {
		grid-row: 2;
		grid-column: 1;
		width: 100%;
		height: calc((${tt} / 4) * 1px);
		justify-self: center;
		background: ${Jt};
		margin: 0;
		border-radius: calc(${Z} * 1px);
	}
	.activeIndicatorTransition {
		transition: transform 0.01s linear;
	}
	.tabpanel {
		grid-row: 2;
		grid-column-start: 1;
		grid-column-end: 4;
		position: relative;
	}
`});class ye extends F{connectedCallback(){super.connectedCallback(),this.disabled&&(this.disabled=!1),this.textContent&&this.setAttribute("aria-label",this.textContent)}}const De=ye.compose({baseName:"panel-tab",template:z,styles:(t,e)=>H`
	${o("inline-flex")} :host {
		box-sizing: border-box;
		font-family: ${rt};
		font-size: ${ct};
		line-height: ${lt};
		height: calc(${tt} * 7px);
		padding: calc(${tt} * 1px) 0;
		color: ${Kt};
		fill: currentcolor;
		border-radius: calc(${Z} * 1px);
		border: solid calc(${X} * 1px) transparent;
		align-items: center;
		justify-content: center;
		grid-row: 1;
		cursor: pointer;
	}
	:host(:hover) {
		color: ${Jt};
		fill: currentcolor;
	}
	:host(:active) {
		color: ${Jt};
		fill: currentcolor;
	}
	:host([aria-selected='true']) {
		background: transparent;
		color: ${Jt};
		fill: currentcolor;
	}
	:host([aria-selected='true']:hover) {
		background: transparent;
		color: ${Jt};
		fill: currentcolor;
	}
	:host([aria-selected='true']:active) {
		background: transparent;
		color: ${Jt};
		fill: currentcolor;
	}
	:host(:${i}) {
		outline: none;
		border: solid calc(${X} * 1px) ${Wt};
	}
	:host(:focus) {
		outline: none;
	}
	::slotted(vscode-badge) {
		margin-inline-start: calc(${tt} * 2px);
	}
`});class Ce extends S{}const ze=Ce.compose({baseName:"panel-view",template:A,styles:(t,e)=>H`
	${o("flex")} :host {
		color: inherit;
		background-color: transparent;
		border: solid calc(${X} * 1px) transparent;
		box-sizing: border-box;
		font-size: ${ct};
		line-height: ${lt};
		padding: 10px calc((${tt} + 2) * 1px);
	}
`});class Ae extends G{connectedCallback(){super.connectedCallback(),this.paused&&(this.paused=!1),this.setAttribute("aria-label","Loading"),this.setAttribute("aria-live","assertive"),this.setAttribute("role","alert")}attributeChangedCallback(t,e,o){"value"===t&&this.removeAttribute("value")}}const Be=Ae.compose({baseName:"progress-ring",template:T,styles:(t,e)=>H`
	${o("flex")} :host {
		align-items: center;
		outline: none;
		height: calc(${tt} * 7px);
		width: calc(${tt} * 7px);
		margin: 0;
	}
	.progress {
		height: 100%;
		width: 100%;
	}
	.background {
		fill: none;
		stroke: transparent;
		stroke-width: calc(${tt} / 2 * 1px);
	}
	.indeterminate-indicator-1 {
		fill: none;
		stroke: ${Vt};
		stroke-width: calc(${tt} / 2 * 1px);
		stroke-linecap: square;
		transform-origin: 50% 50%;
		transform: rotate(-90deg);
		transition: all 0.2s ease-in-out;
		animation: spin-infinite 2s linear infinite;
	}
	@keyframes spin-infinite {
		0% {
			stroke-dasharray: 0.01px 43.97px;
			transform: rotate(0deg);
		}
		50% {
			stroke-dasharray: 21.99px 21.99px;
			transform: rotate(450deg);
		}
		100% {
			stroke-dasharray: 0.01px 43.97px;
			transform: rotate(1080deg);
		}
	}
`,indeterminateIndicator:'\n\t\t<svg class="progress" part="progress" viewBox="0 0 16 16">\n\t\t\t<circle\n\t\t\t\tclass="background"\n\t\t\t\tpart="background"\n\t\t\t\tcx="8px"\n\t\t\t\tcy="8px"\n\t\t\t\tr="7px"\n\t\t\t></circle>\n\t\t\t<circle\n\t\t\t\tclass="indeterminate-indicator-1"\n\t\t\t\tpart="indeterminate-indicator-1"\n\t\t\t\tcx="8px"\n\t\t\t\tcy="8px"\n\t\t\t\tr="7px"\n\t\t\t></circle>\n\t\t</svg>\n\t'});class Ne extends O{connectedCallback(){super.connectedCallback();const t=this.querySelector("label");if(t){const e="radio-group-"+Math.random().toString(16).slice(2);t.setAttribute("id",e),this.setAttribute("aria-labelledby",e)}}}const Fe=Ne.compose({baseName:"radio-group",template:R,styles:(t,e)=>H`
	${o("flex")} :host {
		align-items: flex-start;
		margin: calc(${tt} * 1px) 0;
		flex-direction: column;
	}
	.positioning-region {
		display: flex;
		flex-wrap: wrap;
	}
	:host([orientation='vertical']) .positioning-region {
		flex-direction: column;
	}
	:host([orientation='horizontal']) .positioning-region {
		flex-direction: row;
	}
	::slotted([slot='label']) {
		color: ${nt};
		font-size: ${ct};
		margin: calc(${tt} * 1px) 0;
	}
`});class Se extends L{connectedCallback(){super.connectedCallback(),this.textContent?this.setAttribute("aria-label",this.textContent):this.setAttribute("aria-label","Radio")}}const Te=Se.compose({baseName:"radio",template:I,styles:(t,e)=>H`
	${o("inline-flex")} :host {
		align-items: center;
		flex-direction: row;
		font-size: ${ct};
		line-height: ${lt};
		margin: calc(${tt} * 1px) 0;
		outline: none;
		position: relative;
		transition: all 0.2s ease-in-out;
		user-select: none;
	}
	.control {
		background: ${Tt};
		border-radius: 999px;
		border: calc(${X} * 1px) solid ${Gt};
		box-sizing: border-box;
		cursor: pointer;
		height: calc(${tt} * 4px);
		position: relative;
		outline: none;
		width: calc(${tt} * 4px);
	}
	.label {
		color: ${nt};
		cursor: pointer;
		font-family: ${rt};
		margin-inline-end: calc(${tt} * 2px + 2px);
		padding-inline-start: calc(${tt} * 2px + 2px);
	}
	.label__hidden {
		display: none;
		visibility: hidden;
	}
	.control,
	.checked-indicator {
		flex-shrink: 0;
	}
	.checked-indicator {
		background: ${nt};
		border-radius: 999px;
		display: inline-block;
		inset: calc(${tt} * 1px);
		opacity: 0;
		pointer-events: none;
		position: absolute;
	}
	:host(:not([disabled])) .control:hover {
		background: ${Tt};
		border-color: ${Gt};
	}
	:host(:not([disabled])) .control:active {
		background: ${Tt};
		border-color: ${ot};
	}
	:host(:${i}) .control {
		border: calc(${X} * 1px) solid ${ot};
	}
	:host([aria-checked='true']) .control {
		background: ${Tt};
		border: calc(${X} * 1px) solid ${Gt};
	}
	:host([aria-checked='true']:not([disabled])) .control:hover {
		background: ${Tt};
		border: calc(${X} * 1px) solid ${Gt};
	}
	:host([aria-checked='true']:not([disabled])) .control:active {
		background: ${Tt};
		border: calc(${X} * 1px) solid ${ot};
	}
	:host([aria-checked="true"]:${i}:not([disabled])) .control {
		border: calc(${X} * 1px) solid ${ot};
	}
	:host([disabled]) .label,
	:host([readonly]) .label,
	:host([readonly]) .control,
	:host([disabled]) .control {
		cursor: ${a};
	}
	:host([aria-checked='true']) .checked-indicator {
		opacity: 1;
	}
	:host([disabled]) {
		opacity: ${et};
	}
`,checkedIndicator:'\n\t\t<div part="checked-indicator" class="checked-indicator"></div>\n\t'});class Ge extends n{connectedCallback(){super.connectedCallback(),this.circular&&(this.circular=!1)}}const Re=Ge.compose({baseName:"tag",template:r,styles:(t,e)=>H`
	${o("inline-block")} :host {
		box-sizing: border-box;
		font-family: ${rt};
		font-size: ${st};
		line-height: ${dt};
	}
	.control {
		background-color: ${ft};
		border: calc(${X} * 1px) solid ${xt};
		border-radius: ${Qt};
		color: ${$t};
		padding: calc(${tt} * 0.5px) calc(${tt} * 1px);
		text-transform: uppercase;
	}
`});class Oe extends _{connectedCallback(){super.connectedCallback(),this.textContent?this.setAttribute("aria-label",this.textContent):this.setAttribute("aria-label","Text area")}}const Ie=Oe.compose({baseName:"text-area",template:P,styles:(t,e)=>H`
	${o("inline-block")} :host {
		font-family: ${rt};
		outline: none;
		user-select: none;
	}
	.control {
		box-sizing: border-box;
		position: relative;
		color: ${qt};
		background: ${Ht};
		border-radius: calc(${Z} * 1px);
		border: calc(${X} * 1px) solid ${jt};
		font: inherit;
		font-size: ${ct};
		line-height: ${lt};
		padding: calc(${tt} * 2px + 1px);
		width: 100%;
		min-width: ${at};
		resize: none;
	}
	.control:hover:enabled {
		background: ${Ht};
		border-color: ${jt};
	}
	.control:active:enabled {
		background: ${Ht};
		border-color: ${ot};
	}
	.control:hover,
	.control:${i},
	.control:disabled,
	.control:active {
		outline: none;
	}
	.control::-webkit-scrollbar {
		width: ${bt};
		height: ${pt};
	}
	.control::-webkit-scrollbar-corner {
		background: ${Ht};
	}
	.control::-webkit-scrollbar-thumb {
		background: ${ht};
	}
	.control::-webkit-scrollbar-thumb:hover {
		background: ${ut};
	}
	.control::-webkit-scrollbar-thumb:active {
		background: ${gt};
	}
	:host(:focus-within:not([disabled])) .control {
		border-color: ${ot};
	}
	:host([resize='both']) .control {
		resize: both;
	}
	:host([resize='horizontal']) .control {
		resize: horizontal;
	}
	:host([resize='vertical']) .control {
		resize: vertical;
	}
	.label {
		display: block;
		color: ${nt};
		cursor: pointer;
		font-size: ${ct};
		line-height: ${lt};
		margin-bottom: 2px;
	}
	.label__hidden {
		display: none;
		visibility: hidden;
	}
	:host([disabled]) .label,
	:host([readonly]) .label,
	:host([readonly]) .control,
	:host([disabled]) .control {
		cursor: ${a};
	}
	:host([disabled]) {
		opacity: ${et};
	}
	:host([disabled]) .control {
		border-color: ${jt};
	}
`,shadowOptions:{delegatesFocus:!0}});class Le extends M{connectedCallback(){super.connectedCallback(),this.textContent?this.setAttribute("aria-label",this.textContent):this.setAttribute("aria-label","Text field")}}const Pe=Le.compose({baseName:"text-field",template:j,styles:(t,e)=>H`
	${o("inline-block")} :host {
		font-family: ${rt};
		outline: none;
		user-select: none;
	}
	.root {
		box-sizing: border-box;
		position: relative;
		display: flex;
		flex-direction: row;
		color: ${qt};
		background: ${Ht};
		border-radius: calc(${Z} * 1px);
		border: calc(${X} * 1px) solid ${jt};
		height: calc(${it} * 1px);
		min-width: ${at};
	}
	.control {
		-webkit-appearance: none;
		font: inherit;
		background: transparent;
		border: 0;
		color: inherit;
		height: calc(100% - (${tt} * 1px));
		width: 100%;
		margin-top: auto;
		margin-bottom: auto;
		border: none;
		padding: 0 calc(${tt} * 2px + 1px);
		font-size: ${ct};
		line-height: ${lt};
	}
	.control:hover,
	.control:${i},
	.control:disabled,
	.control:active {
		outline: none;
	}
	.label {
		display: block;
		color: ${nt};
		cursor: pointer;
		font-size: ${ct};
		line-height: ${lt};
		margin-bottom: 2px;
	}
	.label__hidden {
		display: none;
		visibility: hidden;
	}
	.start,
	.end {
		display: flex;
		margin: auto;
		fill: currentcolor;
	}
	::slotted(svg),
	::slotted(span) {
		width: calc(${tt} * 4px);
		height: calc(${tt} * 4px);
	}
	.start {
		margin-inline-start: calc(${tt} * 2px);
	}
	.end {
		margin-inline-end: calc(${tt} * 2px);
	}
	:host(:hover:not([disabled])) .root {
		background: ${Ht};
		border-color: ${jt};
	}
	:host(:active:not([disabled])) .root {
		background: ${Ht};
		border-color: ${ot};
	}
	:host(:focus-within:not([disabled])) .root {
		border-color: ${ot};
	}
	:host([disabled]) .label,
	:host([readonly]) .label,
	:host([readonly]) .control,
	:host([disabled]) .control {
		cursor: ${a};
	}
	:host([disabled]) {
		opacity: ${et};
	}
	:host([disabled]) .control {
		border-color: ${jt};
	}
`,shadowOptions:{delegatesFocus:!0}}),_e={vsCodeBadge:Yt,vsCodeButton:ne,vsCodeCheckbox:ae,vsCodeDataGrid:le,vsCodeDataGridCell:pe,vsCodeDataGridRow:de,vsCodeDivider:ue,vsCodeDropdown:fe,vsCodeLink:xe,vsCodeOption:ve,vsCodePanels:we,vsCodePanelTab:De,vsCodePanelView:ze,vsCodeProgressRing:Be,vsCodeRadioGroup:Fe,vsCodeRadio:Te,vsCodeTag:Re,vsCodeTextArea:Ie,vsCodeTextField:Pe,register(t,...e){if(t)for(const o in this)"register"!==o&&this[o]().register(t,...e)}};export{Xt as Badge,re as Button,ie as Checkbox,ce as DataGrid,be as DataGridCell,se as DataGridRow,he as Divider,ge as Dropdown,$e as Link,me as Option,ye as PanelTab,Ce as PanelView,ke as Panels,Ae as ProgressRing,Se as Radio,Ne as RadioGroup,Ge as Tag,Oe as TextArea,Le as TextField,_e as allComponents,U as provideVSCodeDesignSystem,Yt as vsCodeBadge,ne as vsCodeButton,ae as vsCodeCheckbox,le as vsCodeDataGrid,pe as vsCodeDataGridCell,de as vsCodeDataGridRow,ue as vsCodeDivider,fe as vsCodeDropdown,xe as vsCodeLink,ve as vsCodeOption,De as vsCodePanelTab,ze as vsCodePanelView,we as vsCodePanels,Be as vsCodeProgressRing,Te as vsCodeRadio,Fe as vsCodeRadioGroup,Re as vsCodeTag,Ie as vsCodeTextArea,Pe as vsCodeTextField};export default null;
//# sourceMappingURL=/sm/3b6ac388555bcd743cb2ec4a33159b2b32375bed87b115bb72deee26c3e5ab2d.map