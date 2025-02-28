"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.emit = emit;
const abi_1 = require("./abi");
function emit(ast) {
    const runtimeBytecode = [];
    const labels = new Map();
    let pc = 0;
    let storageSlot = 0;
    // Collect labels for function jump targets
    for (const contract of ast) {
        for (const decl of contract.body) {
            if (decl.type === "functionDecl") {
                labels.set(decl.name, pc);
                pc += 10; // Rough estimate for function size
            }
        }
    }
    // Generate runtime bytecode
    for (const contract of ast) {
        for (const decl of contract.body) {
            if (decl.type === "variableDecl") {
                emitExpression(decl.value, runtimeBytecode, []);
                runtimeBytecode.push(`60 ${storageSlot.toString(16).padStart(2, "0")} 55`); // PUSH1 slot, SSTORE
                storageSlot++;
                pc += 3;
            }
            else if (decl.type === "functionDecl") {
                runtimeBytecode.push(`5b`); // JUMPDEST
                labels.set(decl.name, pc); // Update precise label position
                pc++;
                for (const stmt of decl.body) {
                    emitStatement(stmt, runtimeBytecode, labels, decl.params, storageSlot);
                    pc += runtimeBytecode[runtimeBytecode.length - 1].split(" ").length;
                }
            }
        }
    }
    // Function dispatcher (simplified)
    const dispatcher = [
        "60 00 35", // CALLDATALOAD 0 (function signature)
        ...ast[0].body
            .filter((d) => d.type === "functionDecl")
            .map((d) => {
            const sig = keccak256(d.name).slice(0, 8); // Simplified hash
            return `60 ${sig} 14 57 ${d.name}`; // PUSH1 sig, EQ, JUMPI
        }),
        "fd", // REVERT if no match
    ];
    runtimeBytecode.unshift(...dispatcher);
    pc += dispatcher.length;
    // Resolve jumps
    const resolvedRuntime = runtimeBytecode
        .map((line) => {
        if (line.includes("57")) { // JUMPI
            const parts = line.split(" ");
            const label = parts[parts.length - 1];
            if (labels.has(label)) {
                const offset = labels.get(label);
                return `${parts.slice(0, -1).join(" ")} 60 ${offset.toString(16).padStart(2, "0")} 57`;
            }
        }
        return line;
    })
        .join(" ")
        .replace(/\s+/g, "");
    // Deployment wrapper
    const runtimeHex = resolvedRuntime;
    const runtimeLength = (runtimeHex.length / 2).toString(16).padStart(4, "0");
    const deployBytecode = [
        `61 ${runtimeLength}`, // PUSH2 runtime length
        "60 0a", // PUSH1 offset (after this code)
        "60 00", // PUSH1 0 (memory dest)
        "39", // CODECOPY
        "60 00", // PUSH1 0 (return dest)
        `61 ${runtimeLength}`, // PUSH2 runtime length
        "f3", // RETURN
    ].join("") + runtimeHex;
    return {
        bytecode: "0x" + deployBytecode,
        abi: (0, abi_1.generateABI)(ast)
    };
}
function emitExpression(expr, bytecode, params) {
    switch (expr.type) {
        case "number":
            bytecode.push(`60 ${expr.value.toString(16).padStart(2, "0")}`); // PUSH1
            break;
        case "string":
            const hex = Buffer.from(String(expr.value)).toString("hex");
            bytecode.push(`6${hex.length.toString(16)} ${hex} 60 20 52`); // PUSH, MSTORE
            break;
        case "identifier":
            const paramIdx = params.findIndex(p => p.name === expr.value);
            if (paramIdx >= 0) {
                bytecode.push(`60 ${(paramIdx * 32 + 4).toString(16).padStart(2, "0")} 35`); // CALLDATALOAD (offset by sig)
            }
            else {
                bytecode.push(`60 ${params.length.toString(16).padStart(2, "0")} 54`); // SLOAD (simplified)
            }
            break;
        case "binaryOp":
            emitExpression(expr.left, bytecode, params);
            emitExpression(expr.right, bytecode, params);
            if (expr.operator === "+")
                bytecode.push("01"); // ADD
            if (expr.operator === "<")
                bytecode.push("10"); // LT
            break;
        case "newMap":
            bytecode.push("60 00"); // Placeholder
            break;
        case "global":
            switch (expr.value) {
                case "msg.sender":
                    bytecode.push("33");
                    break; // CALLER
                case "msg.value":
                    bytecode.push("34");
                    break; // CALLVALUE
                case "block.number":
                    bytecode.push("43");
                    break; // NUMBER
            }
            break;
    }
}
function emitStatement(stmt, bytecode, labels, params, storageSlot) {
    let localStorageSlot = storageSlot;
    switch (stmt.type) {
        case "variableDecl":
            emitExpression(stmt.declaration.value, bytecode, params);
            bytecode.push(`60 ${localStorageSlot.toString(16).padStart(2, "0")} 55`); // SSTORE
            localStorageSlot++;
            break;
        case "return":
            emitExpression(stmt.expression, bytecode, params);
            bytecode.push("60 00 60 20 52 60 20 60 00 f3"); // MSTORE, RETURN
            break;
        case "expression":
            emitExpression(stmt.expression, bytecode, params);
            break;
        case "if":
            emitExpression(stmt.condition, bytecode, params);
            const ifLabel = `if_${labels.size}`;
            labels.set(ifLabel, bytecode.length + 2);
            bytecode.push(`57 ${ifLabel}`); // JUMPI
            stmt.body.forEach(s => localStorageSlot = emitStatement(s, bytecode, labels, params, localStorageSlot));
            bytecode.push("5b"); // JUMPDEST
            break;
        case "for":
            localStorageSlot = emitStatement(stmt.init, bytecode, labels, params, localStorageSlot);
            const loopStart = `loop_${labels.size}`;
            labels.set(loopStart, bytecode.length);
            bytecode.push("5b"); // JUMPDEST
            emitExpression(stmt.condition, bytecode, params);
            const loopEnd = `end_${labels.size}`;
            labels.set(loopEnd, bytecode.length + 10); // Estimate
            bytecode.push(`57 ${loopEnd}`); // JUMPI
            stmt.body.forEach(s => localStorageSlot = emitStatement(s, bytecode, labels, params, localStorageSlot));
            emitExpression(stmt.update, bytecode, params);
            bytecode.push(`60 ${labels.get(loopStart).toString(16).padStart(2, "0")} 56`); // JUMP
            bytecode.push("5b"); // JUMPDEST
            break;
        case "revert":
            emitExpression(stmt.message, bytecode, params);
            bytecode.push("fd"); // REVERT
            break;
    }
    return localStorageSlot; // Return updated slot for tracking
}
// Simplified keccak256 for function signatures
function keccak256(str) {
    return require("crypto").createHash("sha256").update(str).digest("hex").slice(0, 8);
}
//# sourceMappingURL=emmiter.js.map