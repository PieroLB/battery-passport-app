import tseslint from 'typescript-eslint';
import prettier from 'eslint-config-prettier';

export default tseslint.config(
  { ignores: ['**/node_modules', '**/dist', '**/.output', '**/.nuxt', '**/coverage'] },
  ...tseslint.configs.recommended,
  prettier,
);
