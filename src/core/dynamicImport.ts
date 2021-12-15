const fs = require('fs-extra');
const path = require('path');

const fileRequire = (name, stubPath) => require(path.join(stubPath, name));

/**
 * This is our version of `require`... it will replace all the
 * injected functions at run time...
 */
const _require = (stubPath, args, funcs) => {
    const importer = Function('exports', 'module', 'require', ...args);
    const module = {};
    importer({}, module, (name) => fileRequire(name, stubPath), ...funcs);

    // @ts-expect-error
    return 'default' in module?.exports ? module?.exports?.default : module.exports
}

module.exports = (filePath, stubPath, listeners, resolvers) => {
    const bundle = fs.readFileSync(filePath, 'utf-8');
    return _require(stubPath, [...listeners, bundle], [...resolvers]);
}