import js from '@eslint/js'
import globals from 'globals'
import reactHooks from 'eslint-plugin-react-hooks'
import reactRefresh from 'eslint-plugin-react-refresh'
import tseslint from 'typescript-eslint'
import { defineConfig, globalIgnores } from 'eslint/config'

const rawTailwindColorPattern =
  /(?:^|\s)(?:bg|text|border|ring|outline|decoration|accent|caret|fill|stroke|from|via|to)-(\[[^\]]+\]|(?:slate|gray|zinc|neutral|stone|red|orange|amber|yellow|lime|green|emerald|teal|cyan|sky|blue|indigo|violet|purple|fuchsia|pink|rose|white|black)(?:[-/][^\s"'`}]*)?)(?=\s|$)/

const tokenGuardrail = {
  rules: {
    'no-raw-tailwind-colors': {
      meta: {
        type: 'problem',
        docs: {
          description: 'Disallow arbitrary and palette Tailwind color classes in markup.',
        },
        messages: {
          rawColor:
            'Use semantic design tokens instead of raw Tailwind color classes or arbitrary color values.',
        },
      },
      create(context) {
        function checkString(node, value) {
          if (typeof value === 'string' && rawTailwindColorPattern.test(value)) {
            context.report({ node, messageId: 'rawColor' })
          }
        }

        return {
          Literal(node) {
            checkString(node, node.value)
          },
          TemplateElement(node) {
            checkString(node, node.value.raw)
          },
        }
      },
    },
  },
}

export default defineConfig([
  globalIgnores(['dist', 'node_modules', '.security-test']),
  {
    files: ['**/*.{ts,tsx}'],
    plugins: {
      'reblock-tokens': tokenGuardrail,
    },
    extends: [
      js.configs.recommended,
      tseslint.configs.recommended,
      reactHooks.configs.flat.recommended,
      reactRefresh.configs.vite,
    ],
    languageOptions: {
      globals: globals.browser,
    },
    rules: {
      'reblock-tokens/no-raw-tailwind-colors': 'error',
    },
  },
  {
    files: ['api/**/*.ts'],
    languageOptions: {
      globals: globals.node,
    },
  },
])
