import{s,Z as i,$ as u,a0 as c,a1 as l,a2 as d,a3 as f,a4 as m,a5 as h,a6 as A,a7 as g,a8 as P,d as v,u as y,j as C,y as w,a9 as _,aa as b,ab as E,ac as R}from"./chunks/framework.18d5c1a4.js";import{t as D}from"./chunks/theme.da709ac1.js";function p(e){if(e.extends){const a=p(e.extends);return{...a,...e,async enhanceApp(t){a.enhanceApp&&await a.enhanceApp(t),e.enhanceApp&&await e.enhanceApp(t)}}}return e}const o=p(D),j=v({name:"VitePressApp",setup(){const{site:e}=y();return C(()=>{w(()=>{document.documentElement.lang=e.value.lang,document.documentElement.dir=e.value.dir})}),_(),b(),E(),o.setup&&o.setup(),()=>R(o.Layout)}});async function O(){const e=T(),a=S();a.provide(u,e);const t=c(e.route);return a.provide(l,t),a.component("Content",d),a.component("ClientOnly",f),Object.defineProperties(a.config.globalProperties,{$frontmatter:{get(){return t.frontmatter.value}},$params:{get(){return t.page.value.params}}}),o.enhanceApp&&await o.enhanceApp({app:a,router:e,siteData:m}),{app:a,router:e,data:t}}function S(){return h(j)}function T(){let e=s,a;return A(t=>{let n=g(t),r=null;return n&&(e&&(a=n),(e||a===n)&&(n=n.replace(/\.js$/,".lean.js")),r=P(()=>import(n),[])),s&&(e=!1),r},o.NotFound)}s&&O().then(({app:e,router:a,data:t})=>{a.go().then(()=>{i(a.route,t.site),e.mount("#app")})});export{O as createApp};
