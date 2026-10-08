const tsParser = require('@typescript-eslint/parser');
const tsPlugin = require('@typescript-eslint/eslint-plugin');
const angularPlugin = require('@angular-eslint/eslint-plugin');
const angularTemplatePlugin = require('@angular-eslint/eslint-plugin-template');
const angularTemplateParser = require('@angular-eslint/template-parser');

module.exports = [
	{
		ignores: ['dist/**', 'node_modules/**', 'coverage/**']
	},
	{
		files: ['**/*.ts'],
		languageOptions: {
			parser: tsParser,
			parserOptions: {
				project: ['./tsconfig.json'],
				tsconfigRootDir: __dirname,
				sourceType: 'module'
			}
		},
		plugins: {
			'@typescript-eslint': tsPlugin,
			'@angular-eslint': angularPlugin
		},
		rules: {
			'@typescript-eslint/no-explicit-any': 'off',
			'@angular-eslint/component-selector': ['error', { type: 'element', prefix: 'app', style: 'kebab-case' }],
			'@angular-eslint/directive-selector': ['error', { type: 'attribute', prefix: 'app', style: 'camelCase' }]
		}
	},
	{
		// The reusable atom library owns the `sb` prefix.
		files: ['src/app/components/atoms/**/*.ts'],
		rules: {
			'@angular-eslint/component-selector': ['error', { type: 'element', prefix: 'sb', style: 'kebab-case' }],
			'@angular-eslint/directive-selector': ['error', { type: 'attribute', prefix: 'sb', style: 'camelCase' }]
		}
	},
	{
		files: ['**/*.html'],
		languageOptions: {
			parser: angularTemplateParser
		},
		plugins: {
			'@angular-eslint/template': angularTemplatePlugin
		},
		rules: {
			'@angular-eslint/template/banana-in-box': 'error',
			'@angular-eslint/template/no-negated-async': 'error',
			'@angular-eslint/template/prefer-control-flow': 'error',
			'@angular-eslint/template/alt-text': 'error'
		}
	}
];
