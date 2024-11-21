#!/usr/bin/env node

import { Command } from 'commander';
import chalk from 'chalk';
import degit from 'degit';
import ora from 'ora';
import fs from 'fs';
import path from 'path';
import readline from 'readline';

const program = new Command();

const isDirectoryEmpty = (dir) => {
  return fs.existsSync(dir) && fs.readdirSync(dir).length === 0;
};

const confirmPrompt = (question) =>
  new Promise((resolve) => {
    const rl = readline.createInterface({
      input: process.stdin,
      output: process.stdout,
    });
    rl.question(question, (answer) => {
      rl.close();
      resolve(answer.trim().toLowerCase() === 'y');
    });
  });

const resolveProjectPath = (baseDir, projectName) => {
  return path.isAbsolute(projectName)
    ? projectName
    : path.resolve(baseDir, projectName);
};

program
  .name('next-boil')
  .description('A CLI to bootstrap your Next.js starter pack')
  .version('0.1.1')
  .argument('[project-name]', 'Name of the project directory', 'next-app')
  .option('-f, --force', 'Force creation even if directory exists and is not empty')
  .option('-t, --template <url>', 'Custom template repository URL', 'https://github.com/boddhi9/next-template')
  .option('-b, --base-dir <path>', 'Base directory for project creation', process.cwd())
  .option('--debug', 'Show detailed error stack for debugging')
  .action(async (projectName, options) => {
    const { force, template, debug, baseDir } = options;
    const projectPath = resolveProjectPath(baseDir, projectName);
    const { red, yellow, green, cyan, bold } = chalk;
    const spinner = ora();
    let retries = 3;

    try {
      if (!/^[a-zA-Z0-9-_]+$/.test(projectName)) {
        console.error(red(`Error: Invalid project name "${projectName}". Only letters, numbers, dashes, and underscores are allowed.`));
        process.exit(1);
      }

      if (fs.existsSync(projectPath)) {
        if (!force) {
          if (!isDirectoryEmpty(projectPath)) {
            console.error(
              red(
                `Error: Directory ${bold(projectName)} already exists and is not empty. Use the --force flag to override.`
              )
            );
            process.exit(1);
          }
        } else {
          const confirm = await confirmPrompt(
            yellow(
              `Warning: Force mode will delete files in the directory "${projectName}". Continue? (y/N): `
            )
          );
          if (!confirm) {
            console.log(red('Operation aborted.'));
            process.exit(1);
          }
        }
      } else {
        fs.mkdirSync(projectPath, { recursive: true });
      }

      const cloneRepo = async () => {
        while (retries > 0) {
          try {
            spinner.start(`Cloning template from ${cyan(template)}...`);
            const emitter = degit(template, { cache: false, force: true });
            await emitter.clone(projectPath);
            spinner.succeed(`Repository cloned into ${bold(projectPath)}.`);
            return;
          } catch (err) {
            retries -= 1;
            spinner.fail(`Clone failed. Retries left: ${retries}`);
            if (retries === 0) throw err;
          }
        }
      };

      await cloneRepo();

      console.log(green(`\nProject setup completed successfully!`));
      console.log(cyan(`\nNext steps:`));
      console.log(yellow(`  cd ${projectName}`));
      console.log(yellow(`  npm install`));
      console.log(yellow(`  npm run dev`));
    } catch (err) {
      spinner.fail(red('Project setup failed.'));
      if (debug) {
        console.error(red(err.stack || err.message));
      } else {
        console.error(red(`Error: ${err.message}`));
      }
      process.exit(1);
    }
  });

program.addHelpText(
  'after',
  `
Examples:
  $ next-boil my-next-app
  $ next-boil my-next-app --force
  $ next-boil my-next-app --template https://github.com/user/custom-template
  $ next-boil my-next-app --base-dir ~/projects
`
);

if (!process.argv.slice(2).length) {
  program.help();
}

program.parse(process.argv);
