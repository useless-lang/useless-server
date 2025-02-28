import { ContractNode } from "./parser";
export interface ABIEntry {
    type: "function" | "constructor";
    name?: string;
    inputs: {
        name: string;
        type: string;
    }[];
    outputs?: {
        name: string;
        type: string;
    }[];
    stateMutability: "pure" | "view" | "nonpayable" | "payable";
}
export declare function generateABI(ast: ContractNode[]): ABIEntry[];
