import nx from '@nx/eslint-plugin';
import baseConfig from '../../eslint.config.mjs';

export default [
  ...nx.configs['flat/angular'],
  ...nx.configs['flat/angular-template'],
  ...baseConfig,
  {
    files: ['**/*.ts'],
    rules: {
      '@angular-eslint/directive-selector': [
        'error',
        {
          type: 'attribute',
          prefix: 'app',
          style: 'camelCase',
        },
      ],
      '@angular-eslint/component-selector': [
        'error',
        {
          type: 'element',
          prefix: 'app',
          style: 'kebab-case',
        },
      ],
      // Estilo del proyecto: inyección por constructor (consistente en toda la app).
      // Migrar a inject() es un refactor mecánico pendiente, no un error.
      '@angular-eslint/prefer-inject': 'off',
    },
  },
  {
    files: ['**/*.html'],
    rules: {
      // Estilo del proyecto: directivas estructurales clásicas (*ngIf/*ngFor) usadas de
      // forma consistente. La migración al control flow nuevo (@if/@for) queda como
      // refactor mecánico pendiente (ng g @angular/core:control-flow).
      '@angular-eslint/template/prefer-control-flow': 'off',
      // Accesibilidad pendiente de una pasada dedicada (labels con for/id en los forms).
      '@angular-eslint/template/label-has-associated-control': 'warn',
      '@angular-eslint/template/elements-content': 'warn',
      '@angular-eslint/template/click-events-have-key-events': 'warn',
      '@angular-eslint/template/interactive-supports-focus': 'warn',
    },
  },
];
