const { getBabelPreset } = require('@builder/babel-config');

module.exports = () => {
    return getBabelPreset({
        env: {
            targets: {
                node: 'current'
            },
            modules: 'commonjs'
        },
        typescript: true
    });
}