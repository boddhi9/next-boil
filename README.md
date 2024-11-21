# next-boil

**next-boil** is a CLI tool to bootstrap your Next.js starter pack with ease. Clone a pre-configured template, customize it with options, and start your Next.js journey in seconds.

## Features

- **Next.js 15**
- **Tailwind CSS 3**
- **shadcn-ui**
- **TypeScript**
- **ESLint**
- **Prettier**
- **Jest**
- **Absolute Imports**

## Installation

Install globally via npm:

```bash
npm install -g next-boil
```

or

```bash
npx next-boil my-next-app
```

## Usage

### Basic Usage

Run the CLI with a project name:

```bash
next-boil my-next-app
```

This will:
- Create a directory named `my-next-app`
- Clone the default template from the repository
- Set up your project ready for development

### Options

| Option                  | Description                                      |
|-------------------------|--------------------------------------------------|
| `-t, --template <url>`  | Specify a custom template repository URL         |
| `-f, --force`           | Force overwrite existing non-empty directories   |
| `--debug`               | Show detailed error stack for debugging purposes |

### Examples

1. Bootstrap with the default template:

   ```bash
   next-boil my-next-app
   ```

2. Use a custom template:

   ```bash
   next-boil my-next-app --template https://github.com/user/my-template
   ```

3. Force overwrite an existing directory:

   ```bash
   next-boil my-next-app --force
   ```

4. Debug issues with verbose error messages:

   ```bash
   next-boil my-next-app --debug
   ```

### No Arguments?

Running `next-boil` without arguments displays the help menu:

```bash
next-boil
```

## Next Steps

Once your project is set up, navigate to the project directory and start development:

```bash
cd my-next-app
npm install
npm run dev
```

## License

This project is licensed under the [MIT License](LICENSE).