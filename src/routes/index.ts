import applyMock from '../core';
import { Router } from 'express';
import path from 'path';
import { Config, StubConfig, StubFile } from '../shapes';
import fs from 'fs-extra';
import yaml from 'js-yaml';

const allFilesAndFolders = (folder: string): string[] => {
    return fs.readdirSync(path.join(process.cwd(), folder));
}

const onlyFolders = (folder: string, arr: string[]): string[] => {
    return arr.filter(item => !fs.lstatSync(path.join(process.cwd(), folder, item)).isFile())
}

const getControlFiles = (folder: string, arr: string[], processConfigs: boolean = true): string[] | StubConfig[] => {
    const stubPath = arr.map((_folder) => path.join(process.cwd(), folder, _folder));
    const controlFiles = arr.map((_folder, index) => path.join(stubPath[index], 'config.yaml'));

    if (!processConfigs) {
        return controlFiles
    }

    const processedFiles: StubConfig[] = [];
    for (const controlFile of controlFiles) {
        const index = controlFiles.indexOf(controlFile);

        // We are going to process it with `js-yaml`
        const controlFileContents = fs.readFileSync(controlFile, 'utf-8');
        processedFiles.push({
            folderName: arr[index],
            controlFile,
            stubPath: stubPath[index],
            value: yaml.load(controlFileContents) as StubFile
        })
    }

    return processedFiles;
}

const startSearch = () => {
    const router = Router();

    const config: Config = global.config;
    const stubsDir = config.core.stubs.dir;

    // doing a folder search
    const foundFolders = onlyFolders(stubsDir, allFilesAndFolders(stubsDir));
    if (config.core.stubs.local !== 'NEVER') {
        const localConfigs: StubConfig[] = getControlFiles(stubsDir, foundFolders) as StubConfig[];

        for (const config of localConfigs) {
            const entryFile = path.join(config.stubPath, (config as any).value.entryFile);

            applyMock(router, config.stubPath, config.value);
        }
    }

    return router;
}

const router = startSearch();
export default router