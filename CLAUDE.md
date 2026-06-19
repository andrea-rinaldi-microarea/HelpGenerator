# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## What this is

`helpgen` is a Node.js CLI that generates SuperSAM (`.sam`) help-page source files documenting MagoCloud/TaskBuilder applications, by reading their XML metadata (`Application.config`, `Module.config`, `EFSchemaObjects.xml`, `DBInfo/*.xml`).

## Commands

- Run: `node main.js <outputPath> [inputPath]` (or `npm run run`, which hardcodes no args — pass args via `node main.js` directly for real use)
  - `outputPath` must already exist on disk.
  - `inputPath` (optional, defaults to `process.cwd()`) must end with `\Standard\Applications` (case-insensitive, Windows path separators) — this is a TaskBuilder application root.
- There is no lint command and no test suite configured (`npm test` intentionally exits with an error placeholder).
- A VS Code launch config exists at [.vscode/launch.json](.vscode/launch.json) with sample args pointing at a local `Standard\Applications` folder — update the paths there for local debugging.

## Architecture

Pipeline, driven from [main.js](main.js):

1. **main.js** — parses CLI args, validates `outputPath` exists and `inputPath` ends in `\Standard\Applications`, `chdir`s into it, then scans for `Application.config` files (one per app) via `metadata.scanFor`. For each app found, calls into `application.js`. Afterward it copies the `assets/Tables.sam` template into the output folder, appending one `[INCLUDE Tables-<App>/<App>.sam]` line per generated app.

2. **[application.js](application.js)** (`createAppHelp`) — for one app: `chdir`s into the app's folder, parses `Application.config`, scans for `Module.config` files (one per module), and delegates each to `module.js`. Creates/wipes an output dir `Tables-<AppName>/` (via `fsStuff.rimraf`) and, if at least one module produced output, writes `<AppName>.sam` containing a grid linking to each module plus `[INCLUDE <Module>.sam]` lines. Returns `false` (and removes the empty output dir) if the app has no documentable modules.

3. **[module.js](module.js)** (`createModuleHelp`) — for one module: parses `Module.config`, then looks for `EFCore/EFSchemaObjects.xml`. If absent, the module is skipped entirely (returns `false`) — this is the gate that determines whether a module has DB-backed tables worth documenting. If present, parses it for `Tables` (normalized via `metadata.asArray` so a module with exactly one table is still documented, not skipped), merges in any per-table overrides from `ModuleObjects/DBInfo/<TableName>.xml` (`mergeDBInfoData` — overrides `localize`, `Reference`, `Document`, and per-column `Reference` via a `SchemaInfo.content` name lookup), then writes `<ModuleName>.sam`: a summary grid of tables followed by one `[H3]` section per table with Base Info / Overview / Fields sub-sections (the Fields grid documents each column's type, mandatory/read-only/default flags, and cross-references via `[LINK]`). Note: a table's `Columns` and DBInfo `Fields` still use the older `isArray` check ([module.js:75](module.js#L75), [module.js:108](module.js#L108), [module.js:156](module.js#L156)), so a table with exactly one column is a known, deliberately out-of-scope limitation — its Fields section renders "N/A" instead of the column.

4. **[metadata.js](metadata.js)** — shared XML/namespace utilities:
   - `scanFor(markerFile)` — globs `*/<markerFile>` (case-insensitive) under the current cwd to discover app/module folders.
   - `parseXML(filename)` — reads & parses an XML file via `xml2js` with `mergeAttrs: true, explicitArray: false, charkey: 'content'`, i.e. attributes become object properties and text content becomes `.content`.
   - `isArray(object)` — Mago's XML→JS convention wraps repeated XML elements (e.g. multiple `<Column>` under `<Fields>`) as `{ Column: [...] }`; this checks for that single-key-with-array shape, since xml2js collapses a *single* child element to a non-array object instead.
   - `asArray(value)` — normalizes a node (missing/`''`, single object, or array) into a real JS array of 0, 1, or N items. Used where a "could be one or many" XML node must be iterated regardless of how many children it had (currently `Tables.Table` in `module.js`), since `isArray` alone can't distinguish "absent" from "exactly one."
   - Namespace helpers (`objectName`, `appName`, `compact`, `dashed`) all parse Mago's dotted namespace convention, which is either 4 segments (`App.Module.Library.Object`) or 5 segments (`Type.App.Module.Library.Object`, e.g. `Table.App.Module.Lib.Object`) — segment count determines parsing, there's no other discriminator.

5. **[markdown.js](markdown.js)** — SuperSAM rendering helpers: `gridRender` builds ASCII pipe-tables sized to content width; `adjust` converts literal newlines/`<br>` into the SuperSAM `[BR]` token; `asCheck` renders booleans as `X`/empty for grid cells.

6. **[fs-stuff.js](fs-stuff.js)** — `mkDirByPathSync` (recursive mkdir, tolerant of `EEXIST`) and `rimraf` (recursive delete) utilities, used to reset each app's output directory before regenerating it.

7. **[error.js](error.js)** — prints a red `Error!` prefixed message via chalk and calls `process.exit(1)`. Used as the uniform failure path throughout (bad args, file I/O errors, XML parse errors).

### Key things to know when changing this code

- **`process.chdir` is used as the navigation mechanism** between app/module folders (`main.js` → app dir in `application.js` → module dir in `module.js`). All relative-path file reads (`Application.config`, `Module.config`, `EFCore/EFSchemaObjects.xml`, `ModuleObjects/DBInfo/*.xml`) depend on the current cwd set by the caller up the chain. Don't assume paths are relative to the original invocation cwd.
- **Output layout**: `<outputPath>/Tables.sam` (root, copied from [assets/Tables.sam](assets/Tables.sam) and extended with per-app includes) + `<outputPath>/Tables-<AppName>/<AppName>.sam` (per-app, includes per-module) + `<outputPath>/Tables-<AppName>/<ModuleName>.sam` (per-module, full table/column docs).
- A module with no `EFCore/EFSchemaObjects.xml`, or an app with zero documentable modules, is silently skipped and its (possibly already-created) output directory is removed — absence of DB metadata is the filter for "does this module/app get documented."
