import fs from 'fs';
import path from 'path';
import vm from 'vm';
import { createRequire } from 'module';

const targetFile = path.join(process.cwd(), 'dist/apps/background/src/index.js');
const scriptText = fs.readFileSync(targetFile, 'utf-8');
const script = new vm.Script(scriptText);
console.log('file:///' + path.posix.join(process.cwd().replaceAll('\\', '/'), 'dist/apps/background/src/index.js'));
console.log(import.meta.url);
const module = {
    exports: {},
};
const context = {
    require: createRequire('file:///' + path.posix.join(process.cwd().replaceAll('\\', '/'), 'dist/apps/background/src/index.js')),
    module,
    exports: module.exports,
    console,
};
vm.createContext(context);
try {
    script.runInContext(context, {
        displayErrors: true,
    });
    console.log(context.exports, context.module);
} catch(err) {
    console.error(err);
}