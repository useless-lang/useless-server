import { ContractNode } from "./parser";
import { ABIEntry } from "./abi";
export interface CompilationResult {
    bytecode: string;
    abi: ABIEntry[];
}
export declare function emit(ast: ContractNode[]): CompilationResult;
