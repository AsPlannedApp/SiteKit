#!/usr/bin/env node

const subcommand = process.argv[2];
const flags = new Set(process.argv.slice(3));

const commands = {
    generate: () => import('../src/cli/generate.js'),
    check: () => import('../src/cli/check.js'),
};

if (!subcommand || !commands[subcommand]) {
    console.error(`Usage: sitekit <${Object.keys(commands).join('|')}>`);
    process.exit(1);
}

const mod = await commands[subcommand]();
await mod.run({ force: flags.has('--force') });
