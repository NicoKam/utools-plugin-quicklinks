import antfu from '@antfu/eslint-config';

export default antfu(
  {
    type: 'app',
    typescript: true,
    react: true,
    stylistic: true,
    formatters: {
      css: true,
      html: true,
      markdown: 'prettier',
    },

    ignores: [
      'dist/',
      'build/',
      'node_modules/',
      '*.d.ts',
      'AGENTS.md',
      'public/preload/command-template.cjs',
      'public/preload/location.cjs',
    ],
  },

  {
    rules: {
      'react-dom/no-unknown-property': 'warn',
      'ts/ban-ts-comment': 'warn',
      'no-console': 'warn',
      'style/indent': ['error', 2, { SwitchCase: 1 }],
      'style/comma-dangle': ['error', 'always-multiline'],
      'style/semi': ['error', 'always'],
      'style/member-delimiter-style': ['error', {
        multiline: {
          delimiter: 'semi',
          requireLast: true,
        },
        singleline: {
          delimiter: 'semi',
          requireLast: false,
        },
      }],
      'style/brace-style': ['error', '1tbs'],
      'ts/explicit-function-return-type': 'off',
      'ts/no-dynamic-delete': 'off',
      'ts/no-explicit-any': 'off',
      'react/react-in-jsx-scope': 'off',
      'unicorn/prefer-dom-node-text-content': 'off',
      'react-refresh/only-export-components': 'warn',
      'antfu/top-level-function': 'off',
    },
  },
);
