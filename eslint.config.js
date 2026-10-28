import eslint from '@eslint/js';
import tseslint from 'typescript-eslint';
import globals from 'globals';
export default tseslint.config({ignores:['dist/**','node_modules/**','src/api/voice.generated.ts']},eslint.configs.recommended,...tseslint.configs.recommended,{files:['**/*.{ts,tsx,js,mjs}'],languageOptions:{globals:{...globals.browser,...globals.node}}});
