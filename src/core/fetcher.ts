const dynamic = require('./dynamicImport');
const _ = require('lodash');

function getResolver (name) {
    switch (_.camelCase(name)) {
        case "usePerson": return () => (req, res, next) => res.confirm();
        default:
            return null;
    }
}

module.exports = (file, stubPath, stubConfig) => {
    // We are going to go through the `stubConfig`, and get the `middleware` field.

    const listeners = [];
    const resolvers = [];

    const { middleware } = stubConfig;

    middleware.forEach((part) => {
        listeners.push(_.camelCase(`use ${part}`));
        resolvers.push(getResolver(`use ${part}`));

    });

    return dynamic(file, stubPath, listeners, resolvers);
}