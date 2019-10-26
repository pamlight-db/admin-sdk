/**
 * instructions to publish code are
 * 1. Run `tsc`
 * 2. Run `node task -c copyAssets`
 * 3. Run `cd dist`
 * 4. Run `npm publish --access=public`
 * 
 * Alternative, as a single command, run
 * `tsc && node task -c copyAssets && cd dist && npm publish --access=public`
 * */

const argv = require('minimist')(process.argv.slice(2));
const fs = require('fs-extra');

switch (argv['c']) {
    case 'copyAssets': {
        fs.copy('./package.json', './dist/package.json');

        return fs.copy('./README.md', './dist/README.md');
    }

    default: {
        throw new Error('Invalid task selected');
    }
}
