#!/usr/bin/env node

import { Command } from 'commander';
import chalk from 'chalk';
import inquirer from 'inquirer';
import ora from 'ora';
import boxen from 'boxen';
import fs from 'fs/promises';
import path from 'path';
import degit from 'degit';
import { execSync } from 'child_process';

const program = new Command();
const spinner = ora();
const { red, green, yellow, blue, cyan, gray, bold } = chalk;

const logger = {
  info: (msg) => console.log(blue(msg)),
  success: (msg) => console.log(green(msg)),
  warn: (msg) => console.warn(yellow(msg)),
  error: (msg) => console.error(red(msg)),
  debug: (msg) => console.log(gray(`[DEBUG] ${msg}`)),
};

const showWelcomeMessage = () => {
  console.log(
    chalk.blackBright.bold(`
  ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
  ✨  Welcome to ${chalk.blueBright('next-boil')} - Your Next.js Launchpad! ✨
  ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
  `)
  );
};

const validatePackageManager = (manager) => {
  const validManagers = ['npm', 'yarn', 'pnpm'];
  if (!validManagers.includes(manager)) {
    throw new Error(`Invalid package manager "${manager}". Use one of: ${validManagers.join(', ')}`);
  }
};

const isDirectoryEmpty = async (dir) => {
  try {
    const files = await fs.readdir(dir);
    return files.length === 0;
  } catch {
    return false;
  }
};

const validateInputs = async ({ projectName, template, packageManager, baseDir }) => {
  if (!/^[a-zA-Z0-9-_]+$/.test(projectName)) {
    throw new Error(`Invalid project name "${projectName}". Only letters, numbers, dashes, and underscores are allowed.`);
  }

  try {
    validatePackageManager(packageManager);
  } catch (error) {
    throw new Error(error.message);
  }

  const urlRegex = /^(https?:\/\/[^\s]+)$/;
  if (!urlRegex.test(template)) {
    throw new Error(`Invalid template URL: "${template}". Provide a valid URL.`);
  }

  try {
    await fs.access(baseDir);
  } catch {
    throw new Error(`Base directory "${baseDir}" does not exist.`);
  }
};

const confirmPrompt = (question) =>
  inquirer
    .prompt([{ type: 'confirm', name: 'confirmed', message: question, default: false }])
    .then((answers) => answers.confirmed);

const resolveProjectPath = (baseDir, projectName) =>
  path.isAbsolute(projectName) ? projectName : path.resolve(baseDir, projectName);

const cloneRepo = async (template, projectPath, retries = 3) => {
  while (retries > 0) {
    try {
      spinner.start(`Cloning template from ${cyan(template)}...`);
      const emitter = degit(template, { cache: false, force: true });
      await emitter.clone(projectPath);
      spinner.succeed(`Repository cloned into ${bold(projectPath)}.`);
      return true;
    } catch (err) {
      retries -= 1;
      spinner.fail(`Clone failed. Retries left: ${retries}`);
      if (retries === 0) {
        logger.error('Failed to clone the repository. Check the template URL or your internet connection.');
        throw err;
      }
    }
  }
};

const initializeGit = (projectPath) => {
  try {
    logger.info('Initializing git repository...');
    execSync('git init', { cwd: projectPath, stdio: 'inherit' });
    logger.success('Git repository initialized successfully.');
    return true;
  } catch (error) {
    logger.warn('Git initialization failed. You may need to initialize git manually.');
    return false;
  }
};

const installDependencies = (projectPath, packageManager) => {
  validatePackageManager(packageManager);

  try {
    spinner.start(`Installing dependencies using ${packageManager}...`);
    execSync(`${packageManager} install`, { cwd: projectPath, stdio: 'inherit' });
    spinner.succeed('Dependencies installed successfully.');
    return true;
  } catch (error) {
    spinner.fail(red(`Failed to install dependencies: ${error.message}`));
    return false;
  }
};

program
  .name('next-boil')
  .version('0.1.4')
  .argument('[project-name]', 'Name of the project directory', 'next-app')
  .option('-f, --force', 'Force creation even if directory exists and is not empty')
  .option('-t, --template <url>', 'Custom template repository URL', 'https://github.com/boddhi9/next-template')
  .option('-b, --base-dir <path>', 'Base directory for project creation', process.cwd())
  .option('-p, --package-manager <npm|yarn|pnpm>', 'Package manager to use', 'npm')
  .option('--no-git', 'Skip git initialization')
  .option('--debug', 'Show detailed error stack for debugging')
  .action(async (projectName, options) => {
    const { force, template, debug, baseDir, packageManager, git } = options;
    const projectPath = resolveProjectPath(baseDir, projectName);

    try {
      showWelcomeMessage();

      await validateInputs({ projectName, template, packageManager, baseDir });

      if (!/^[a-zA-Z0-9-_]+$/.test(projectName)) {
        throw new Error(`Invalid project name "${projectName}". Only letters, numbers, dashes, and underscores are allowed.`);
      }

      if (await fs.access(projectPath).then(() => true).catch(() => false)) {
        if (!force && !(await isDirectoryEmpty(projectPath))) {
          throw new Error(`Directory "${projectName}" already exists and is not empty. Use the --force flag to override.`);
        }
        if (force) {
          const confirm = await confirmPrompt(
            `Warning: Force mode will delete files in "${projectName}". Continue?`
          );
          if (!confirm) {
            logger.error('Operation aborted.');
            process.exit(1);
          }
        }
      } else {
        await fs.mkdir(projectPath, { recursive: true });
      }

      await cloneRepo(template, projectPath);
      if (git) initializeGit(projectPath);

      const dependenciesInstalled = installDependencies(projectPath, packageManager);
      if (!dependenciesInstalled) {
        logger.error('Project setup incomplete due to dependency installation failure.');
        process.exit(1);
      }

      const summary = `
        ${bold('Setup Summary:')}
        ${cyan('----------------------------------------')}
        Project Name: ${bold(projectName)}
        Template: ${bold(template)}
        Package Manager: ${bold(packageManager)}
        ${cyan('----------------------------------------')}
      `;

      console.log(boxen(summary, { padding: 1, borderColor: 'green', align: 'center' }));

      logger.success('Project setup completed successfully!');
      logger.info('Next steps:');
      logger.info(`  cd ${bold(projectName)}`);
      logger.info(`  ${bold(`${packageManager} run dev`)}`);
    } catch (err) {
      spinner.fail('Project setup failed.');
      if (debug) {
        logger.error(err.stack || err.message);
      } else {
        logger.error(err.message);
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
  $ next-boil my-next-app -p yarn my-next-app
  $ next-boil my-next-app --no-git
`
);

if (!process.argv.slice(2).length) {
  program.help();
}

program.parse(process.argv);
