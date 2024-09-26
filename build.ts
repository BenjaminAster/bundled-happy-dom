
/*
node --experimental-strip-types build.ts
*/

import * as FS from "node:fs/promises";
import * as Path from "node:path";

import { Open } from "unzipper";

import { build } from "esbuild";
import {
	createProgram, parseConfigFileTextToJson, createCompilerHost,
	ScriptTarget, ModuleKind, ModuleResolutionKind,
} from "typescript";


await FS.rm("src", { recursive: true, force: true });
await FS.mkdir("src");

const zipBuffer = Buffer.from(await (await fetch(
	`https://github.com/capricorn86/happy-dom/archive/refs/heads/master.zip`
)).arrayBuffer());

const dir = await Open.buffer(zipBuffer);

const rootPath = "happy-dom-master/packages/happy-dom/src/";

for (const entry of dir.files) {
	if (!entry.path.startsWith(rootPath)) continue;
	const path = Path.join("src", entry.path.slice(rootPath.length));
	if (entry.type === "Directory") {
		await FS.mkdir(path, { recursive: true });
	} else {
		await FS.writeFile(path, await entry.buffer());
	}
}

const tsconfig = parseConfigFileTextToJson(
	"tsconfig.json",
	await (await fetch(
		`https://raw.githubusercontent.com/capricorn86/happy-dom/master/packages/happy-dom/tsconfig.json`
	)).text()
).config;

await FS.rm("dist", { recursive: true, force: true });
await FS.mkdir("dist");

tsconfig.compilerOptions.target = "ESNext";
tsconfig.compilerOptions.module = "NodeNext";
tsconfig.compilerOptions.moduleResolution = "NodeNext";

await build({
	entryPoints: [
		{
			in: "src/index.ts",
			out: "bundle",
		},
	],
	bundle: true,
	outdir: "dist",
	platform: "node",
	packages: "external",
	format: "esm",
	sourcemap: "linked",
	absWorkingDir: import.meta.dirname,
	tsconfigRaw: tsconfig,
});

tsconfig.compilerOptions.target = ScriptTarget.ESNext;
tsconfig.compilerOptions.module = ModuleKind.NodeNext;
tsconfig.compilerOptions.moduleResolution = ModuleResolutionKind.NodeNext;

tsconfig.compilerOptions.emitDeclarationOnly = true;
tsconfig.compilerOptions.declaration = true;
tsconfig.compilerOptions.declarationMap = false;

await FS.rm("lib", { recursive: true, force: true });
await FS.mkdir("lib");

const program = createProgram({
	rootNames: ["src/index.ts"],
	options: tsconfig.compilerOptions,
});

program.emit();
