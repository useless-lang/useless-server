import { ContractNode } from "./parser";
export declare class TypeError extends Error {
}
export declare function typeCheck(ast: ContractNode[]): void;
