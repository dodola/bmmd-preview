import { defineConfig } from 'tsup'

export default defineConfig({
  entry: ['src/extension.ts'],
  format: ['cjs'],
  target: 'node18',
  outDir: 'dist',
  clean: true,
  sourcemap: true,
  external: ['vscode'], // 排除 vscode
  noExternal: [/.*/], // 打包所有其他依赖
  platform: 'node',
  splitting: false,
  treeshake: false,
  minify: false,
  dts: false,
  esbuildOptions(options) {
    // 确保 vscode 被排除
    options.external = ['vscode']
  },
})
