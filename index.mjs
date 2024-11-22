#!/usr/bin/env node

import { Command } from 'commander';
import chalk from 'chalk';
import degit from 'degit';
import ora from 'ora';
import fs from 'fs/promises';
import path from 'path';
import { fileURLToPath } from 'url';
import { createInterface } from 'readline';
import { execSync } from 'child_process';

const __filename = fileURLToPath(import.meta.url);

const program = new Command();
const spinner = ora();

const isDirectoryEmpty = async (dir) => {
  try {
    const files = await fs.readdir(dir);
    return files.length === 0;
  } catch (error) {
    return false;
  }
};

const confirmPrompt = (question) =>
  new Promise((resolve) => {
    const rl = createInterface({
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

const cloneRepo = async (template, projectPath, retries = 3) => {
  while (retries > 0) {
    try {
      spinner.start(`Cloning template from ${chalk.cyan(template)}...`);
      const emitter = degit(template, { cache: false, force: true });
      await emitter.clone(projectPath);
      spinner.succeed(`Repository cloned into ${chalk.bold(projectPath)}.`);
      return true;
    } catch (err) {
      retries -= 1;
      spinner.fail(`Clone failed. Retries left: ${retries}`);
      if (retries === 0) {
        console.error(chalk.red('Failed to clone the repository. Please check the template URL or your internet connection.'));
        throw err;
      }
    }
  }
};

const initializeGit = (projectPath) => {
  try {
    console.log(chalk.blue('Initializing git repository...'));
    execSync('git init', { cwd: projectPath, stdio: 'inherit' });
    console.log(chalk.green('Git repository initialized successfully.'));
    return true;
  } catch (error) {
    console.error(chalk.yellow('Failed to initialize git repository.'));
    console.error(chalk.red(`Error: ${error.message}`));
    return false;
  }
};

const installDependencies = (projectPath, packageManager) => {
  try {
    spinner.start(`Installing dependencies using ${packageManager}...`);
    execSync(`${packageManager} install`, { cwd: projectPath, stdio: 'inherit' });
    spinner.succeed('Dependencies installed successfully.');
    return true;
  } catch (error) {
    spinner.fail(chalk.red(`Failed to install dependencies: ${error.message}`));
    return false;
  }
};

program
  .name('next-boil')
  .description('A CLI to bootstrap your Next.js starter pack')
  .version('0.2.0')
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
      if (!/^[a-zA-Z0-9-_]+$/.test(projectName)) {
        throw new Error(`Invalid project name "${projectName}". Only letters, numbers, dashes, and underscores are allowed.`);
      }

      if (await fs.access(projectPath).then(() => true).catch(() => false)) {
        if (!force && !(await isDirectoryEmpty(projectPath))) {
          throw new Error(`Directory ${chalk.bold(projectName)} already exists and is not empty. Use the --force flag to override.`);
        }
        if (force) {
          const confirm = await confirmPrompt(
            chalk.yellow(`Warning: Force mode will delete files in the directory "${projectName}". Continue? (y/N): `)
          );
          if (!confirm) {
            console.log(chalk.red('Operation aborted.'));
            process.exit(1);
          }
        }
      } else {
        await fs.mkdir(projectPath, { recursive: true });
      }

      const cloneSuccess = await cloneRepo(template, projectPath);
      if (!cloneSuccess) {
        console.error(chalk.red('Project setup incomplete due to cloning failure.'));
        process.exit(1);
      }

      const gitInitialized = git && initializeGit(projectPath);
      if (git && !gitInitialized) {
        console.warn(chalk.yellow('Git initialization failed. You may need to initialize git manually.'));
      }

      const dependenciesInstalled = installDependencies(projectPath, packageManager);
      if (!dependenciesInstalled) {
        console.log(chalk.red('Project setup incomplete due to dependency installation failure.'));
        process.exit(1);
      }

      console.log(chalk.green(`\nProject setup completed successfully!`));
      console.log(chalk.cyan(`\nNext steps:`));
      console.log(chalk.yellow(`  cd ${projectName}`));
      console.log(chalk.yellow(`  ${packageManager} run dev`));
    } catch (err) {
      spinner.fail(chalk.red('Project setup failed.'));
      if (debug) {
        console.error(chalk.red(err.stack || err.message));
      } else {
        console.error(chalk.red(`Error: ${err.message}`));
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
  $ next-boil my-next-app --package-manager yarn
  $ next-boil my-next-app --no-git
`
);

if (!process.argv.slice(2).length) {
  program.help();
}

program.parse(process.argv);
