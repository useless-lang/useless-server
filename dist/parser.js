"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.parse = parse;
const nearley_1 = __importDefault(require("nearley"));
const grammar = require("./grammar.js");
function parse(source) {
    const parser = new nearley_1.default.Parser(nearley_1.default.Grammar.fromCompiled(grammar));
    try {
        parser.feed(source);
        const results = parser.results;
        if (!results.length) {
            throw new Error("No valid parse found");
        }
        if (results.length > 1) {
            throw new Error("Ambiguous grammar: multiple parses possible");
        }
        return results[0];
    }
    catch (e) {
        const state = typeof parser.current === 'number' ? { line: 1, col: 1 } : parser.current || { line: 1, col: 1 };
        const message = e instanceof Error ? e.message : String(e);
        throw new Error(`${message} at line ${state.line}, column ${state.col}`);
    }
}
//# sourceMappingURL=parser.js.map