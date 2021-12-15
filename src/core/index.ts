import path from 'path';
import fs from 'fs-extra';
import assert from 'assert';
import glob from 'glob';
import chokidar from 'chokidar';
import * as bodyParser from 'body-parser';
import multer from 'multer';
import debounce from 'lodash.debounce';

import analyzeDependencies from './analyze';
import { StubFile } from '../shapes';
const matchPath = require('./matchPath');
const fetcher = require('./fetcher');

type IIgnoreFolders = string[];

const debug = require('debug')('stubwork:mock');
const chalk = require('chalk');

const OPTIONAL_METHODS = ['get', 'post', 'put', 'patch', 'delete'];

const winPath = function(path) {
    return path.replace(/\\/g, '/');
}

let error: any | null = null;
const cwd = process.cwd();
const mockDir = winPath(path.join(cwd, 'stubs'));

const getConfig = (rootDir: string, stubPath: string, stubConfig: StubFile, ignore: IIgnoreFolders) => {
    // get mock files
    const mockFiles = glob.sync('stubs/**/*.[jt]s', {
        cwd: rootDir,
        ignore
    }).map(file => path.join(rootDir, file));


    const requireDeps = mockFiles.reduce((prev, curr) => {
        return prev.concat(analyzeDependencies(curr));
    }, []);

    
    const onlySet = Array.from(new Set([...requireDeps, ...mockFiles]));

    // set @babel/register for node's require
    require('@babel/register')({
        presets: [require.resolve('./babelPresetNode')],
        ignore: [/node_modules/],
        only: onlySet,
        extensions: ['.js', '.ts'],
        babelrc: false,
        cache: false
    });

    const mockConfig = {};
    mockFiles.forEach(mockFile => {
        if (fs.existsSync(mockFile)) {
            // disable require cache
            Object.keys(require.cache).forEach(file => {
                const winPathFile = winPath(file);

                if (winPathFile === mockFile || winPathFile.indexOf(mockDir) > -1) {
                    debug(`delete cache ${file}`);
                    delete require.cache[file];
                }
            });

            try {
                // const mockModule = require(mockFile);
                // const mockData = mockModule.default || mockModule || {};
                const mockData = fetcher(mockFile, stubPath, stubConfig);
                Object.assign(mockConfig, mockData);
            } catch (err) {
                console.log(err);
            }
        }
    });
    return mockConfig;
}

const watchFiles = {};
const logWatchFile = (event: string, filePath: string) => {
    // won't log message when initialize
    if (watchFiles[filePath]) {
        console.log(chalk.green(event.toUpperCase()), filePath.replace(cwd, '.'))
    } else {
        watchFiles[filePath] = true;
    }
}

const applyMock = (app, stubPath: string, stubConfig: StubFile, ignore: IIgnoreFolders = []) => {
    try {
        realApplyMock(app, stubPath, stubConfig, ignore);
        error = null
    } catch (e) {
        console.log(e);
        error = e;

        console.log();
        outputError();

        const watcher = chokidar.watch([mockDir], {
            ignored: /node_modules/,
            ignoreInitial: true
        });

        watcher.on('all', (event, path) => {
            logWatchFile(event, path);
            watcher.close();
            applyMock(app, stubPath, stubConfig, ignore);
        });
    }
}

const realApplyMock = (app, stubPath: string, stubConfig: StubFile, ignore: IIgnoreFolders) => {
    let mockConfig = [];

    const parseMockConfig = () => {
        const parsedMockConfig = [];

        const config = getConfig(cwd, stubPath, stubConfig, ignore);
        Object.keys(config).forEach(key => {
            const handler = config[key];
            assert(
                typeof handler === 'function' ||
                typeof handler === 'object' ||
                typeof handler === 'string',
                `mock value of ${key} should be function or object or string, but got ${typeof handler}`
            );

            Array.prototype.push.apply(parsedMockConfig, parseConfig(key, handler));
        });

        return parsedMockConfig;
    }

    mockConfig = parseMockConfig();

    const watcher = chokidar.watch([mockDir], {
        ignored: /node_modules/,
        persistent: true
    });

    // use debounce to avoid to much file change events
    const updateMockConfig = debounce((): void => {
        mockConfig = parseMockConfig();
    }, 300);
    watcher.on('all', (event: string, path: string): void => {
        logWatchFile(event, path);
        updateMockConfig();
    });

    app.use((req, res, next) => {
        const match = mockConfig.length && matchPath(req, mockConfig);
        if (match) {
            debug(`mock matched: [${match.method}] ${match.path}`);
            return match.handler(req, res, next);
        } else {
            return next();
        }
    });
}

const parseConfig = (key: string, handler: any): any => {
    let method = 'get';
    let path = key;

    if (key.indexOf(' ') > -1) {
        const split = key.split(' ');
        method = split[0].toLowerCase();
        path = split[1];

        return [
            {
                method,
                path,
                handler: createHandler(method, path, handler),
                key
            }
        ];
    }

    return OPTIONAL_METHODS.map((method: string) => ({
        method,
        path,
        handler: createHandler(method, path, handler),
        key
    }));
}

const createHandler = (method: string, path: string, handler: any) => (req, res, next) => {
    const bodyParserMethods = OPTIONAL_METHODS.filter(method => method !== 'get');

    const sendData = () => {
        if (typeof handler === 'function') {
            // deal with multi-part/form-data
            // https://github.com/expressjs/multer/blob/master/doc/README.md
            multer().any()(req, res, () => {
                handler(req, res, next);
            });
        } else if (res.json) {
            res.json(handler);
        } else {
            res.setHeader('Content-Type', 'application/json');
            res.end(JSON.stringify(handler));
        }
    }

    if (bodyParserMethods.includes(method)) {
        bodyParser.json({ limit: '5mb', strict: false })(req, res, () => {
            bodyParser.urlencoded({ limit: '5mb', extended: true })(req, res, () => {
                sendData();
            });
        });
    } else {
        sendData();
    }

}

const outputError = () => {
    if (!error) return;

    const filePath = error.message.split(': ')[0];
    const relativeFilePath = filePath.replace(cwd, '.');
    const errors = error.stack
        .split('\n')
        .filter((line: string) => line.trim().indexOf('at ') !== 0)
        .map((line: string) => line.replace(`${filePath}: `, ''));
    errors.splice(1, 0, ['']);

    console.log(chalk.red('Failed to parse mock config.'));
    console.log();
    console.log(`Error in ${relativeFilePath}`);
    console.log(errors.join('\n'));
    console.log();
}

export default applyMock;
