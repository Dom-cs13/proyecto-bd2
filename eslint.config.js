// Reglas de AGENTS.md que hace cumplir el CI: DIP en domain/application y fetch solo en frontend/shared/js/api.
import js from '@eslint/js';
import globals from 'globals';

const drivers = ['pg', 'mongodb', 'firebase-admin', 'mariadb'];

export default [
  { ignores: ['node_modules/', 'coverage/'] },
  js.configs.recommended,
  {
    files: ['**/*.js'],
    languageOptions: { ecmaVersion: 'latest', sourceType: 'module', globals: globals.node },
  },
  {
    // DIP: ni drivers, ni ORMs, ni SQL, ni .collection()/.doc() en el núcleo
    files: ['src/domain/**/*.js', 'src/application/**/*.js'],
    rules: {
      'no-restricted-imports': ['error', {
        paths: [...drivers, 'mongoose', 'sequelize', 'typeorm', '@prisma/client'],
        patterns: drivers.map((d) => `${d}/*`),
      }],
      'no-restricted-syntax': ['error',
        { selector: "CallExpression[callee.property.name=/^(collection|doc)$/]", message: 'DIP: .collection()/.doc() solo en adaptadores.' },
        { selector: 'Literal[value=/^\\s*(SELECT|INSERT|UPDATE|DELETE)\\s/i]', message: 'DIP: SQL solo en adaptadores.' },
        { selector: 'TemplateElement[value.raw=/^\\s*(SELECT|INSERT|UPDATE|DELETE)\\s/i]', message: 'DIP: SQL solo en adaptadores.' },
      ],
    },
  },
  {
    // Sin ORMs ni ODMs en todo el proyecto
    files: ['src/**/*.js'],
    ignores: ['src/domain/**', 'src/application/**'],
    rules: { 'no-restricted-imports': ['error', 'mongoose', 'sequelize', 'typeorm', '@prisma/client'] },
  },
  {
    // El navegador nunca habla con una base y solo frontend/shared/js/api hace fetch
    files: ['frontend/**/*.js'],
    languageOptions: { globals: globals.browser },
    rules: {
      'no-restricted-globals': ['error', { name: 'fetch', message: 'fetch solo en frontend/shared/js/api/.' }],
      'no-restricted-imports': ['error', { paths: drivers, patterns: ['firebase', 'firebase/*'] }],
    },
  },
  {
    files: ['frontend/shared/js/api/**/*.js'],
    rules: { 'no-restricted-globals': 'off' },
  },
];
