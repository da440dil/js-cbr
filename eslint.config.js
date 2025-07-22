const eslint = require('@eslint/js');
const tseslint = require('typescript-eslint');

module.exports = tseslint.config(
	{
		ignores: ['lib']
	},
	{
		files: ['src/**/*.ts'],
		extends: [eslint.configs.recommended, tseslint.configs.recommended],
		languageOptions: {
			parserOptions: {
				project: ['tsconfig.json'],
				tsconfigRootDir: __dirname
			}
		},
		rules: {
			semi: 'error',
			quotes: ['error', 'single'],
			'no-throw-literal': 'error',
			'no-unused-expressions': 'error',
			'@typescript-eslint/explicit-member-accessibility': [
				'error',
				{ overrides: { accessors: 'off', constructors: 'off' } }
			],
			'@typescript-eslint/naming-convention': [
				'error',
				{ selector: 'class', format: ['PascalCase'] },
				{ selector: 'function', format: ['camelCase'] },
				{ selector: 'variable', format: ['PascalCase', 'camelCase', 'UPPER_CASE'] }
			],
			'@typescript-eslint/unbound-method': ['error', { ignoreStatic: true }],
			'@typescript-eslint/no-var-requires': 'off'
		}
	}
);
