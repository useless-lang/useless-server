const fs = require('fs');
const path = require('path');
const acorn = require('acorn');

// EVM opcodes
const OPCODES = {
    PUSH1: '60', PUSH2: '61', PUSH4: '63', PUSH32: '7f',
    ADD: '01', SSTORE: '55', SLOAD: '54', RETURN: 'f3',
    MSTORE: '52', CALLDATASIZE: '36', CALLDATALOAD: '35',
    JUMP: '56', JUMPI: '57', JUMPDEST: '5b', STOP: '00',
    EQ: '14', SHR: '1c'
};

function toHex(n, bytes = 1) {
    return n.toString(16).padStart(bytes * 2, '0');
}

function compile(inputPath, outputPath) {
    const content = fs.readFileSync(inputPath, 'utf8');
    const ast = acorn.parse(content, { ecmaVersion: 2020 });

    let bytecode = '';
    const storage = {}; // Variable -> slot mapping
    let slot = 0;
    const functions = [];

    // Parse AST
    for (const node of ast.body) {
        if (node.type === 'VariableDeclaration' && node.declarations[0].id.name === 'contract') {
            const contractBody = node.declarations[0].init.properties;

            for (const prop of contractBody) {
                if (prop.key.name === 'var') {
                    const varName = prop.value.declarations[0].id.name;
                    storage[varName] = slot++;
                    const initValue = prop.value.declarations[0].init.value;
                    bytecode += OPCODES.PUSH1 + toHex(initValue); // Initial value
                    bytecode += OPCODES.PUSH1 + toHex(storage[varName]); // Slot
                    bytecode += OPCODES.SSTORE; // Store
                } else if (prop.value.type === 'FunctionExpression' && prop.key.name.startsWith('public function')) {
                    functions.push({
                        name: prop.key.name.replace('public function ', ''),
                        body: prop.value.body.body
                    });
                }
            }
        }
    }

    bytecode += OPCODES.CALLDATASIZE;
    bytecode += OPCODES.PUSH1 + '04'; // Selector offset
    bytecode += OPCODES.CALLDATALOAD; // Load selector
    bytecode += OPCODES.PUSH1 + 'e0'; // Shift right 224 bits
    bytecode += OPCODES.SHR;          // Get 4-byte selector

    // Hardcoded selectors (increment=0x371303c0, getCount=0x20965255)
    let pc = bytecode.length / 2;
    functions.forEach((func, i) => {
        const selector = i === 0 ? '371303c0' : '20965255'; // Dummy for now
        bytecode += OPCODES.PUSH4 + selector;
        bytecode += OPCODES.EQ;
        bytecode += OPCODES.PUSH2 + toHex(pc + 20 + i * 50, 2); // Jump target
        bytecode += OPCODES.JUMPI;
    });

    // Function implementations
    functions.forEach((func) => {
        bytecode += OPCODES.JUMPDEST; // Function entry

        for (const stmt of func.body) {
            if (stmt.type === 'ExpressionStatement' && stmt.expression.operator === '+=') {
                bytecode += OPCODES.PUSH1 + toHex(storage[stmt.expression.left.name]); // Slot
                bytecode += OPCODES.SLOAD; // Load count
                bytecode += OPCODES.PUSH1 + toHex(stmt.expression.right.value); // Increment value
                bytecode += OPCODES.ADD; // Add
                bytecode += OPCODES.PUSH1 + toHex(storage[stmt.expression.left.name]); // Slot
                bytecode += OPCODES.SSTORE; // Store
            } else if (stmt.type === 'ReturnStatement') {
                bytecode += OPCODES.PUSH1 + toHex(storage[stmt.argument.name]); // Slot
                bytecode += OPCODES.SLOAD; // Load count
                bytecode += OPCODES.PUSH1 + '20'; // Memory offset
                bytecode += OPCODES.MSTORE; // Store in memory
                bytecode += OPCODES.PUSH1 + '20'; // Return size (32 bytes for uint256)
                bytecode += OPCODES.PUSH1 + '00'; // Return offset
                bytecode += OPCODES.RETURN; // Return
            }
        }
    });

    bytecode += OPCODES.STOP;

    fs.mkdirSync(path.dirname(outputPath), { recursive: true });
    fs.writeFileSync(outputPath, bytecode);
    return bytecode;
}

module.exports = { compile };