/**
 * instructions to publish code are
 * 1. Run `tsc`
 * 2. Run `node task -c copyAssets`
 * 3. Run `cd dist`
 * 4. Run `npm publish --access=public`
 * 
 * Alternative, as a single command, run
 * `tsc && node task -c copyAssets && cd dist && npm publish --access=public`
 * 
 * 
 * To build for dev and watch for changes, run
 * `node task -c devBuild`
 * */

/**
 * To unpublish a version, use the following command format. x.x.x is version number:
 * `npm unpublish @pamlight/admin@x.x.x`
 */

const argv = require('minimist')(process.argv.slice(2));
const fs = require('fs-extra');
let exec = require('mz/child_process').exec;

switch (argv['c']) {
    case 'copyAssets': {
        fs.copy('./package.json', './dist/package.json');

        return fs.copy('./README.md', './dist/README.md');
    }

    case 'devBuild': {
        buildSDKToServer();

        fs.watch('./src', { recursive: true }, () => {
            buildSDKToServer();
        });

        break;
    }

    default: {
        throw new Error('Invalid task selected');
    }
}

async function buildSDKToServer() {
    console.log('New build and changes.');
    await exec('npm run build');

    fs.copySync('./dist', '../pamlight-server/node_modules/@pamlight/admin');
    console.log('Changes copied over...');
}
