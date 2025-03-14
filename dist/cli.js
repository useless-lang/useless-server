#!/usr/bin/env node
"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const commander_1 = require("commander");
const fs_1 = require("fs");
const parser_1 = require("./parser");
const typechecker_1 = require("./typechecker");
const emmiter_1 = require("./emmiter");
commander_1.program
    .version("1.0.2")
    .description("Useless Language Compiler - A TypeScript-like language for EVM smart contracts");
commander_1.program
    .command("compile <file>")
    .description("Compile a Useless contract to EVM bytecode and ABI")
    .option("-o, --output <path>", "Output bytecode to a file")
    .option("-a, --abi <path>", "Output ABI to a file")
    .action((file, options) => {
    try {
        // Read the source file
        const source = (0, fs_1.readFileSync)(file, "utf-8");
        // Parse, type check, and emit
        const ast = (0, parser_1.parse)(source);
        (0, typechecker_1.typeCheck)(ast);
        const result = (0, emmiter_1.emit)(ast);
        // Output bytecode
        if (options.output) {
            (0, fs_1.writeFileSync)(options.output, result.bytecode);
            console.log(`Bytecode written to ${options.output}`);
        }
        else {
            console.log("Bytecode:", result.bytecode);
        }
        // Output ABI
        if (options.abi) {
            (0, fs_1.writeFileSync)(options.abi, JSON.stringify(result.abi, null, 2));
            console.log(`ABI written to ${options.abi}`);
        }
        else {
            console.log("ABI:", JSON.stringify(result.abi, null, 2));
        }
    }
    catch (e) {
        const error = e instanceof Error ? e.message : String(e);
        console.error(`Compilation failed: ${error}`);
        process.exit(1);
    }
});
commander_1.program.parse(process.argv);
// Show help if no arguments provided
if (!process.argv.slice(2).length) {
    commander_1.program.outputHelp();
}
//# sourceMappingURL=cli.js.map