import { parse } from '@babel/parser';
import traverse from '@babel/traverse';
import fs from 'fs-extra';
import path from 'path';

const parseCode = (code: string) => parse(code, {
    sourceType: 'module',
    plugins: ['jsx', 'typescript', 'decorators-legacy', 'dynamicImport', 'classProperties']
});

const analyzeAST = (code: string, dir: string) => {
    const result: string[] = [];
    const ast = parseCode(code);
    // log(ast);
    const visitor = {
        // const xx = require('./xx');
        CallExpression(nodePath) {
            const { callee, arguments: args } = nodePath.node;
            if (
                callee.type === 'Identifier' &&
                callee.name === 'require' &&
                args.length === 1 &&
                args[0].type === 'StringLiteral'
            ) {
                result.push(args[0].value)
            }
        },
        // import xx from 'xx';
        ImportDeclaration(nodePath) {
            result.push(nodePath.node.source.value);
        },
        // export * from 'xx';
        ExportAllDeclaration(nodePath) {
            const { node } = nodePath;
            if (node.source) {
                result.push(node.source.value);
            }
        },
        // export * as xx from 'xx';
        ExportNamedDeclaration(nodePath) {
            const { node } = nodePath;
            if (node.source) {
                result.push(node.source.value);
            }
        }
    };
    traverse(ast, visitor);
    // only analyze relative path
    return result.filter((module) => /^\./.test(module)).map((modulePath) => path.join(dir, modulePath));
}

const dedupe = (arr: string[]) => {
    if (!Array.isArray(arr)) {
        throw new TypeError('[dedupe]: arr should be an array;');
    }

    // removes dupe keys
    const map = arr.reduce((prev, curr) => ({ ...prev, [curr]: true }), {});
    return Object.keys(map);
}

// require.resolve ts extension
require.extensions['.ts'] = require.extensions['.js'];
const analyzeDependencies = (filePath: string) => {
    const tracedFiles = {};
    const result: any[] = [];

    const trace = (file: string) => {
        if (!tracedFiles[file]) {
            tracedFiles[file] = true;
            const fileContent = String(fs.readFileSync(file));
            const analyzeResult = dedupe(analyzeAST(fileContent, path.dirname(file)));
            result.push(...analyzeResult);
            analyzeResult.forEach((modulePath: string) => {
                // fill path with file extensions
                const fullPath = require.resolve(modulePath);
                // only analyze js|ts files
                if (/\.(js|ts)$/.test(fullPath)) {
                    trace(fullPath);
                }
            });
        }
    }
    trace(require.resolve(filePath));
    return dedupe(result);
}

export default analyzeDependencies