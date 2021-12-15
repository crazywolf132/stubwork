const pathToRegexp = require('path-to-regexp');

function decodeParam(val) {
    if (typeof val !== 'string' || val.length === 0) {
        return val;
    }

    try {
        return decodeURIComponent(val);
    } catch (err) {
        if (err instanceof URIError) {
            err.message = `Failed to decode param ' ${val} '`;
            // @ts-expect-error
            err.status = 400;
            // @ts-expect-error
            err.statusCode = 400;
        }
        throw err;
    }
}

function matchPath(req, mockConfig) {
    const { method: reqMethod } = req;

    // compatible with http server
    const reqPath = req?._parsedUrl?.pathname || req.path || req.url;
    for (let m = 0; m < mockConfig.length; m++) {
        const mock = mockConfig[m];
        const { path: mockPath, method: mockMethod } = mock;
        const keys = [];
        const regexp = pathToRegexp(mockPath, keys);
        
        if (mockMethod.toLowerCase() === reqMethod.toLowerCase()) {
            const match = regexp.exec(reqPath);
            if (match) {
                const params = {};
                for (let i = 1; i < match.length; i++) {
                    const key = keys[i - 1];
                    const prop = key.name;
                    const val = decodeParam(match[i]);
                    if (val !== undefined || !Object.prototype.hasOwnProperty.call(params, prop)) {
                        params[prop] = val;
                    }
                }
                req.params = params;
                return mock;
            }
        }
    }
}

module.exports = matchPath;