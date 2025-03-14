"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.TypeError = void 0;
exports.typeCheck = typeCheck;
class TypeError extends Error {
}
exports.TypeError = TypeError;
function typeCheck(ast) {
    const symbolTable = new Map();
    const structTable = new Map();
    for (const contract of ast) {
        for (const decl of contract.body) {
            if (decl.type === "structDecl") {
                structTable.set(decl.name, decl.fields.map((f) => f.type));
            }
            else if (decl.type === "variableDecl") {
                checkVariableDecl(decl, symbolTable);
            }
            else if (decl.type === "functionDecl") {
                checkFunctionDecl(decl, symbolTable, structTable);
            }
        }
    }
}
function checkVariableDecl(decl, symbols) {
    const inferredType = inferType(decl.value, symbols);
    if (!typesEqual(decl.varType, inferredType)) {
        throw new TypeError(`Type mismatch in ${decl.name}: expected ${typeToString(decl.varType)}, got ${typeToString(inferredType)}`);
    }
    symbols.set(decl.name, decl.varType);
}
function checkFunctionDecl(decl, symbols, structs) {
    const localSymbols = new Map(symbols);
    for (const param of decl.params) {
        localSymbols.set(param.name, param.type);
    }
    let usesMsgValue = false;
    for (const stmt of decl.body) {
        switch (stmt.type) {
            case "variableDecl":
                checkVariableDecl(stmt.declaration, localSymbols);
                break;
            case "return":
                const returnType = inferType(stmt.expression, localSymbols);
                if (!typesEqual(returnType, decl.returnType)) {
                    throw new TypeError(`Return type mismatch in ${decl.name}: expected ${typeToString(decl.returnType)}, got ${typeToString(returnType)}`);
                }
                break;
            case "if":
                if (!typesEqual(inferType(stmt.condition, localSymbols), { type: "primitive", value: "boolean" })) {
                    throw new TypeError(`If condition must be boolean`);
                }
                stmt.body.forEach(s => checkStatement(s, localSymbols, structs));
                break;
            case "for":
                checkVariableDecl(stmt.init, localSymbols);
                if (!typesEqual(inferType(stmt.condition, localSymbols), { type: "primitive", value: "boolean" })) {
                    throw new TypeError(`For condition must be boolean`);
                }
                inferType(stmt.update, localSymbols);
                stmt.body.forEach(s => checkStatement(s, localSymbols, structs));
                break;
            case "revert":
                if (!typesEqual(inferType(stmt.message, localSymbols), { type: "primitive", value: "string" })) {
                    throw new TypeError(`Revert message must be string`);
                }
                break;
            case "expression":
                inferType(stmt.expression, localSymbols);
                break;
        }
        if (stmtContainsMsgValue(stmt))
            usesMsgValue = true;
    }
    if (!decl.payable && usesMsgValue) {
        throw new TypeError(`Function ${decl.name} uses msg.value but is not payable`);
    }
}
function stmtContainsMsgValue(stmt) {
    if (stmt.type === "expression" || stmt.type === "return") {
        return exprContainsMsgValue(stmt.expression);
    }
    else if (stmt.type === "if") {
        return exprContainsMsgValue(stmt.condition) || stmt.body.some(stmtContainsMsgValue);
    }
    else if (stmt.type === "for") {
        return exprContainsMsgValue(stmt.condition) || exprContainsMsgValue(stmt.update) || stmt.body.some(stmtContainsMsgValue);
    }
    return false;
}
function exprContainsMsgValue(expr) {
    if (expr.type === "global" && expr.value === "msg.value")
        return true;
    if (expr.type === "binaryOp")
        return exprContainsMsgValue(expr.left) || exprContainsMsgValue(expr.right);
    return false;
}
function checkStatement(stmt, symbols, structs) {
    if (stmt.type === "variableDecl")
        checkVariableDecl(stmt.declaration, symbols);
    else if (stmt.type === "if" || stmt.type === "for")
        checkFunctionDecl({ type: "functionDecl", name: "", params: [], payable: false, returnType: { type: "primitive", value: "void" }, body: [stmt] }, symbols, structs);
    else if (stmt.type === "return" || stmt.type === "expression")
        inferType(stmt.expression, symbols);
    else if (stmt.type === "revert")
        inferType(stmt.message, symbols);
}
function inferType(expr, symbols) {
    switch (expr.type) {
        case "number": return { type: "primitive", value: "number" };
        case "string": return { type: "primitive", value: "string" };
        case "identifier": return symbols.get(expr.value) || { type: "primitive", value: "number" };
        case "binaryOp":
            const leftType = inferType(expr.left, symbols);
            const rightType = inferType(expr.right, symbols);
            if (!typesEqual(leftType, rightType))
                throw new TypeError(`Operator ${expr.operator} mismatch: ${typeToString(leftType)} vs ${typeToString(rightType)}`);
            if (expr.operator === "+")
                return leftType;
            if (expr.operator === "<")
                return { type: "primitive", value: "boolean" };
            break;
        case "newMap": return expr.mapType;
        case "global":
            switch (expr.value) {
                case "msg.sender": return { type: "primitive", value: "string" };
                case "msg.value":
                case "block.number": return { type: "primitive", value: "number" };
            }
    }
    throw new Error(`Unknown expression type: ${expr.type}`);
}
function typesEqual(t1, t2) {
    if (t1.type !== t2.type)
        return false;
    switch (t1.type) {
        case "primitive": return t1.value === t2.value;
        case "arrayType": return typesEqual(t1.elementType, t2.elementType) && t1.size === t2.size;
        case "mapType": return typesEqual(t1.keyType, t2.keyType) && typesEqual(t1.valueType, t2.valueType);
        case "unionType": return t1.types.length === t2.types.length && t1.types.every((t, i) => typesEqual(t, t2.types[i]));
        case "namedType": return t1.value === t2.value;
    }
}
function typeToString(t) {
    switch (t.type) {
        case "primitive": return t.value;
        case "arrayType": return `${typeToString(t.elementType)}[${t.size}]`;
        case "mapType": return `Map<${typeToString(t.keyType)},${typeToString(t.valueType)}>`;
        case "unionType": return t.types.map(typeToString).join(" | ");
        case "namedType": return t.value;
    }
}
//# sourceMappingURL=typechecker.js.map