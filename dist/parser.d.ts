export interface ASTNode {
    type: string;
}
export interface ContractNode extends ASTNode {
    type: "contract";
    name: string;
    body: DeclarationNode[];
}
export type DeclarationNode = VariableDeclNode | FunctionDeclNode | StructDeclNode;
export interface VariableDeclNode extends ASTNode {
    type: "variableDecl";
    name: string;
    varType: TypeNode;
    value: ExpressionNode;
}
export interface FunctionDeclNode extends ASTNode {
    type: "functionDecl";
    name: string;
    params: ParamNode[];
    payable: boolean;
    returnType: TypeNode;
    body: StatementNode[];
}
export interface StructDeclNode extends ASTNode {
    type: "structDecl";
    name: string;
    fields: StructFieldNode[];
}
export interface StructFieldNode {
    name: string;
    type: TypeNode;
}
export interface ParamNode {
    name: string;
    type: TypeNode;
}
export interface TypeNode {
    type: "primitive" | "arrayType" | "mapType" | "unionType" | "namedType";
    value?: string;
    elementType?: TypeNode;
    keyType?: TypeNode;
    valueType?: TypeNode;
    types?: TypeNode[];
    size?: number;
}
export interface ExpressionNode extends ASTNode {
    type: "number" | "string" | "identifier" | "binaryOp" | "newMap" | "global";
    value?: number | string;
    operator?: string;
    left?: ExpressionNode;
    right?: ExpressionNode;
    mapType?: TypeNode;
}
export interface StatementNode extends ASTNode {
    type: "return" | "variableDecl" | "expression" | "if" | "for" | "revert";
    expression?: ExpressionNode;
    declaration?: VariableDeclNode;
    condition?: ExpressionNode;
    body?: StatementNode[];
    init?: VariableDeclNode;
    update?: ExpressionNode;
    message?: ExpressionNode;
}
export declare function parse(source: string): ContractNode[];
