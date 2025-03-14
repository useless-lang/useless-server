declare class Contract {
    constructor();
}

declare function contract<T extends Contract>(name: string, definition: T): void;

declare global {
    const contract: typeof contract;
    type uint256 = number; // Alias for now
}