const esbuild = require("esbuild");
const fs = require("fs");
const path = require("path");

const production = process.argv.includes('--production');
const watch = process.argv.includes('--watch');

async function main() {
  const ctx = await esbuild.context({
    entryPoints: [
      "src/extension.ts",
      "src/mcp/server.ts"
    ],
    bundle: true,
    format: "cjs",
    minify: production,
    sourcemap: !production,
    sourcesContent: false,
    platform: "node",
    outdir: "out",
    external: ["vscode"],
    logLevel: "info",
    plugins: [
      /* add any plugins if needed */
    ],
  });

  // Copy compile.gms
  const srcCompile = path.join(__dirname, "src/utils/compile.gms");
  const destCompileDir = path.join(__dirname, "out");
  const destCompile = path.join(destCompileDir, "compile.gms");
  
  if (!fs.existsSync(destCompileDir)){
      fs.mkdirSync(destCompileDir, { recursive: true });
  }
  fs.copyFileSync(srcCompile, destCompile);
  console.log("Copied compile.gms to out/compile.gms");

  if (watch) {
    await ctx.watch();
  } else {
    await ctx.rebuild();
    await ctx.dispose();
  }
}

main().catch(e => {
  console.error(e);
  process.exit(1);
});
