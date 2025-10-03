import path from 'node:path';
import fs from 'node:fs/promises';
import { existsSync } from 'node:fs';
import { fileURLToPath } from 'node:url';

const args = process.argv.splice(2);
const isProdMode = args[0] === 'production';
const __dirname = fileURLToPath(new URL(".", import.meta.url));

async function packageCopy() {
    console.log('is production mode:', isProdMode);
    const pkgFile = path.join(__dirname, '../package.bundle.json');
    const pkgStr = await fs.readFile(pkgFile, 'utf-8');
    const pkg = JSON.parse(pkgStr);

    if ( isProdMode ) {
        pkg.page = 'index.html';
        pkg.debug = false;
    }

    // console.log('is production mode:', isProdMode);

    const dist = path.join(__dirname, '../dist');
    if ( !existsSync(dist) ) {
        console.error(`Cannot find dist folder: ${dist}`);
        return;
    }

    const targetFile = path.join(dist, 'package.json');
    await fs.writeFile(targetFile, JSON.stringify(pkg, null, '  '), 'utf-8');

    fs.writeFile(path.join(dist, 'index.js'), '', 'utf8');
    fs.writeFile(path.join(dist, 'README.md'), '', 'utf8');
}


packageCopy();
