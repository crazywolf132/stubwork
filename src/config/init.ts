import path from 'path';
import fs from 'fs-extra';
import yaml from 'js-yaml';

import { Config } from '../shapes';

const configFile = fs.readFileSync(path.join(process.cwd(), 'config.yaml'), 'utf8');
const config: Config = yaml.load(configFile) as Config;

global.config = config;