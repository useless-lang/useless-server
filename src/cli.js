#!/usr/bin/env node

const { compile } = require('./compiler');
const path = require('path');
const packageJson = require('../package.json');

const args = process.argv.slice(2);

function showHelp() {
    console.log(`
Useless Lang Compiler

Usage:
  uselessc <command> [options]

Commands:
  compile <input.useless> [output.bin]    Compile a .useless file to EVM bytecode

Options:
  -h, --help                              Show this help message
  -v, --version                           Show version number

Examples:
  uselessc compile counter.useless        Compile counter.useless to counter.bin
  uselessc compile counter.useless out.bin  Compile to a custom output file
    `);
}

function showVersion() {
    console.log(`uselessc v${packageJson.version}`);
}

if (args.length === 0 || args[0] === '--help' || args[0] === '-h') {
    showHelp();
    process.exit(0);
} else if (args[0] === '--version' || args[0] === '-v') {
    showVersion();
    process.exit(0);
} else if (args[0] === 'compile') {
    if (args.length < 2) {
        console.error('Error: Missing input file. Usage: uselessc compile <input.useless> [output.bin]');
        showHelp();
        process.exit(1);
    }

    const inputPath = path.resolve(args[1]);
    const outputPath = args[2] ? path.resolve(args[2]) : inputPath.replace('.useless', '.bin');

    try {
        const bytecode = compile(inputPath, outputPath);
        console.log(`Compiled to EVM bytecode: ${outputPath}`);
    } catch (error) {
        console.error(`Error: ${error.message}`);
        process.exit(1);
    }
} else {
    console.error(`Error: Unknown command "${args[0]}".`);
    showHelp();
    process.exit(1);
}