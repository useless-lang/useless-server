"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.generateABI = generateABI;
function generateABI(ast) {
    const abi = [];
    for (const contract of ast) {
        for (const decl of contract.body) {
            if (decl.type === "functionDecl") {
                const entry = {
                    type: "function",
                    name: decl.name,
                    inputs: decl.params.map((p) => ({ name: p.name, type: typeToABI(p.type) })),
                    outputs: decl.returnType.type !== "primitive" || decl.returnType.value !== "void" ? [{ name: "", type: typeToABI(decl.returnType) }] : [],
                    stateMutability: decl.payable ? "payable" : (decl.body.some(stmtModifiesState) ? "nonpayable" : "view")
                };
                abi.push(entry);
            }
        }
    }
    return abi;
}
function typeToABI(type) {
    switch (type.type) {
        case "primitive":
            if (type.value === "number")
                return "uint256";
            if (type.value === "string")
                return "address"; // Simplified
            if (type.value === "boolean")
                return "bool";
            return type.value;
        case "arrayType": return `${typeToABI(type.elementType)}[${type.size}]`;
        case "mapType": throw new Error("Maps not supported in ABI");
        case "unionType": throw new Error("Unions not supported in ABI");
        case "namedType": return type.value; // Structs need separate handling
    }
}
function stmtModifiesState(stmt) {
    return stmt.type === "variableDecl" || (stmt.type === "for" && stmt.body.some(stmtModifiesState)) || (stmt.type === "if" && stmt.body.some(stmtModifiesState));
}
//# sourceMappingURL=abi.js.map