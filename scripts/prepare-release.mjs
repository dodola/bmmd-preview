#!/usr/bin/env node

/**
 * 发布准备脚本
 * 检查发布所需的所有资源和配置
 */

import fs from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'

const __filename = fileURLToPath(import.meta.url)
const __dirname = path.dirname(__filename)
const rootDir = path.resolve(__dirname, '..')

// 颜色输出
const colors = {
  reset: '\x1b[0m',
  green: '\x1b[32m',
  yellow: '\x1b[33m',
  blue: '\x1b[34m',
  red: '\x1b[31m',
}

function log(message, color = 'reset') {
  console.log(`${colors[color]}${message}${colors.reset}`)
}

// 检查必要文件
function checkRequiredFiles() {
  log('检查必要文件...', 'blue')

  const requiredFiles = [
    { path: 'package.json', desc: '扩展配置文件' },
    { path: 'README.md', desc: '说明文档' },
    { path: 'CHANGELOG.md', desc: '更新日志' },
    { path: 'LICENSE', desc: '许可证文件' },
    { path: 'icon.png', desc: '扩展图标 (128x128)', optional: true },
  ]

  let allPassed = true
  const warnings = []

  for (const file of requiredFiles) {
    const filePath = path.join(rootDir, file.path)
    const exists = fs.existsSync(filePath)

    if (exists) {
      log(`  ✓ ${file.desc}`, 'green')
    }
    else if (file.optional) {
      log(`  ⚠ ${file.desc} (可选)`, 'yellow')
      warnings.push(`建议添加 ${file.path}`)
    }
    else {
      log(`  ✗ ${file.desc}`, 'red')
      allPassed = false
    }
  }

  return { passed: allPassed, warnings }
}

// 检查 package.json 配置
function checkPackageJson() {
  log('\n检查 package.json 配置...', 'blue')

  const packageJsonPath = path.join(rootDir, 'package.json')
  const packageJson = JSON.parse(fs.readFileSync(packageJsonPath, 'utf-8'))

  const requiredFields = [
    { field: 'name', desc: '扩展名称' },
    { field: 'displayName', desc: '显示名称' },
    { field: 'description', desc: '描述' },
    { field: 'version', desc: '版本号' },
    { field: 'publisher', desc: '发布者' },
    { field: 'engines', desc: 'VSCode 版本要求' },
    { field: 'categories', desc: '分类' },
    { field: 'keywords', desc: '关键词' },
    { field: 'repository', desc: '仓库地址' },
    { field: 'license', desc: '许可证' },
  ]

  let allPassed = true
  const warnings = []

  for (const { field, desc } of requiredFields) {
    if (packageJson[field]) {
      log(`  ✓ ${desc}: ${JSON.stringify(packageJson[field])}`, 'green')
    }
    else {
      log(`  ✗ 缺少 ${desc} (${field})`, 'red')
      allPassed = false
    }
  }

  // 检查版本号格式
  const versionRegex = /^\d+\.\d+\.\d+$/
  if (!versionRegex.test(packageJson.version)) {
    log('  ⚠ 版本号格式不符合语义化版本规范', 'yellow')
    warnings.push('版本号应该是 x.y.z 格式')
  }

  // 检查图标
  if (packageJson.icon) {
    const iconPath = path.join(rootDir, packageJson.icon)
    if (!fs.existsSync(iconPath)) {
      log(`  ✗ 图标文件不存在: ${packageJson.icon}`, 'red')
      allPassed = false
    }
    else {
      log(`  ✓ 图标文件: ${packageJson.icon}`, 'green')
    }
  }
  else {
    log('  ⚠ 未配置图标', 'yellow')
    warnings.push('建议添加扩展图标 (128x128 PNG)')
  }

  return { passed: allPassed, warnings }
}

// 检查 README 内容
function checkReadme() {
  log('\n检查 README.md 内容...', 'blue')

  const readmePath = path.join(rootDir, 'README.md')
  const readme = fs.readFileSync(readmePath, 'utf-8')

  const requiredSections = [
    { pattern: /##\s+功能特性/i, desc: '功能特性' },
    { pattern: /##\s+安装/i, desc: '安装说明' },
    { pattern: /##\s+使用/i, desc: '使用指南' },
    { pattern: /##\s+配置/i, desc: '配置选项' },
  ]

  let allPassed = true
  const warnings = []

  for (const { pattern, desc } of requiredSections) {
    if (pattern.test(readme)) {
      log(`  ✓ 包含 ${desc} 章节`, 'green')
    }
    else {
      log(`  ⚠ 缺少 ${desc} 章节`, 'yellow')
      warnings.push(`建议添加 ${desc} 章节`)
    }
  }

  // 检查截图
  if (/!\[.*\]\(.*\)/g.test(readme)) {
    log('  ✓ 包含截图或示例图片', 'green')
  }
  else {
    log('  ⚠ 未包含截图', 'yellow')
    warnings.push('建议添加功能截图')
  }

  // 检查字数
  const wordCount = readme.length
  if (wordCount < 500) {
    log(`  ⚠ README 内容较少 (${wordCount} 字符)`, 'yellow')
    warnings.push('建议丰富 README 内容')
  }
  else {
    log(`  ✓ README 内容充实 (${wordCount} 字符)`, 'green')
  }

  return { passed: allPassed, warnings }
}

// 检查 CHANGELOG
function checkChangelog() {
  log('\n检查 CHANGELOG.md...', 'blue')

  const changelogPath = path.join(rootDir, 'CHANGELOG.md')
  const changelog = fs.readFileSync(changelogPath, 'utf-8')

  const packageJsonPath = path.join(rootDir, 'package.json')
  const packageJson = JSON.parse(fs.readFileSync(packageJsonPath, 'utf-8'))
  const version = packageJson.version

  const warnings = []

  // 检查是否包含当前版本
  const versionPattern = new RegExp(`##\\s+\\[?${version.replace(/\./g, '\\.')}\\]?`, 'i')
  if (versionPattern.test(changelog)) {
    log(`  ✓ 包含当前版本 ${version} 的更新日志`, 'green')
  }
  else {
    log(`  ⚠ 未找到版本 ${version} 的更新日志`, 'yellow')
    warnings.push(`建议添加版本 ${version} 的更新内容`)
  }

  // 检查日期
  const datePattern = /\d{4}-\d{2}-\d{2}/
  if (datePattern.test(changelog)) {
    log('  ✓ 包含发布日期', 'green')
  }
  else {
    log('  ⚠ 未包含发布日期', 'yellow')
    warnings.push('建议添加发布日期')
  }

  return { passed: true, warnings }
}

// 检查构建产物
function checkBuildOutput() {
  log('\n检查构建产物...', 'blue')

  const distPath = path.join(rootDir, 'dist')
  const extensionPath = path.join(distPath, 'extension.js')

  let allPassed = true

  if (!fs.existsSync(distPath)) {
    log('  ✗ dist 目录不存在', 'red')
    log('    请运行: pnpm run build', 'yellow')
    allPassed = false
  }
  else if (!fs.existsSync(extensionPath)) {
    log('  ✗ extension.js 不存在', 'red')
    log('    请运行: pnpm run build', 'yellow')
    allPassed = false
  }
  else {
    log('  ✓ 构建产物存在', 'green')

    // 检查文件大小
    const stats = fs.statSync(extensionPath)
    const sizeMB = (stats.size / (1024 * 1024)).toFixed(2)
    log(`  ✓ extension.js 大小: ${sizeMB} MB`, 'green')

    if (stats.size > 5 * 1024 * 1024) {
      log('  ⚠ 文件较大，建议优化', 'yellow')
    }
  }

  return { passed: allPassed, warnings: [] }
}

// 检查测试
function checkTests() {
  log('\n检查测试...', 'blue')

  const warnings = []

  // 查找测试文件
  const testFiles = []

  function findTestFiles(dir) {
    const files = fs.readdirSync(dir)

    for (const file of files) {
      const filePath = path.join(dir, file)
      const stats = fs.statSync(filePath)

      if (stats.isDirectory() && file !== 'node_modules' && file !== 'dist') {
        findTestFiles(filePath)
      }
      else if (file.endsWith('.test.ts') || file.endsWith('.spec.ts')) {
        testFiles.push(filePath)
      }
    }
  }

  const srcPath = path.join(rootDir, 'src')
  if (fs.existsSync(srcPath)) {
    findTestFiles(srcPath)
  }

  if (testFiles.length > 0) {
    log(`  ✓ 找到 ${testFiles.length} 个测试文件`, 'green')
  }
  else {
    log('  ⚠ 未找到测试文件', 'yellow')
    warnings.push('建议添加单元测试')
  }

  return { passed: true, warnings }
}

// 生成发布清单
function generateReleaseChecklist() {
  log('\n生成发布清单...', 'blue')

  const packageJsonPath = path.join(rootDir, 'package.json')
  const packageJson = JSON.parse(fs.readFileSync(packageJsonPath, 'utf-8'))

  const checklist = `# 发布清单 - v${packageJson.version}

## 发布前检查

### 代码质量
- [ ] 所有测试通过 (\`pnpm test\`)
- [ ] 代码检查通过 (\`pnpm run lint\`)
- [ ] 构建成功 (\`pnpm run build\`)
- [ ] 本地测试通过（F5 调试）

### 文档
- [ ] README.md 更新完整
- [ ] CHANGELOG.md 包含当前版本更新内容
- [ ] 添加了功能截图
- [ ] 更新了使用示例

### 配置
- [ ] package.json 版本号正确
- [ ] package.json 所有必填字段完整
- [ ] 图标文件存在 (128x128 PNG)
- [ ] LICENSE 文件存在

### 功能测试
- [ ] 预览功能正常
- [ ] 样式切换正常
- [ ] 代码主题切换正常
- [ ] 平台导出功能正常
- [ ] 图片导出功能正常
- [ ] 自定义 CSS 功能正常
- [ ] 滚动同步功能正常
- [ ] 所有命令可用
- [ ] 快捷键正常工作
- [ ] 配置项生效

### 性能测试
- [ ] 大文件预览性能可接受
- [ ] 内存使用合理
- [ ] CPU 使用合理
- [ ] 无内存泄漏

### 打包
- [ ] 打包成功 (\`pnpm run package\`)
- [ ] .vsix 文件大小合理 (< 10MB)
- [ ] 安装 .vsix 文件测试通过

## 发布步骤

1. **更新版本号**
   \`\`\`bash
   # 修改 package.json 中的 version 字段
   # 遵循语义化版本规范
   \`\`\`

2. **更新 CHANGELOG**
   \`\`\`bash
   # 在 CHANGELOG.md 中添加新版本的更新内容
   # 包括新增功能、修复问题、破坏性变更等
   \`\`\`

3. **运行测试**
   \`\`\`bash
   pnpm test
   pnpm run lint
   \`\`\`

4. **构建和打包**
   \`\`\`bash
   pnpm run build
   pnpm run package
   \`\`\`

5. **本地测试**
   \`\`\`bash
   code --install-extension bmmd-preview-${packageJson.version}.vsix
   # 重启 VSCode 并测试所有功能
   \`\`\`

6. **提交代码**
   \`\`\`bash
   git add .
   git commit -m "chore: release v${packageJson.version}"
   git tag v${packageJson.version}
   git push origin main --tags
   \`\`\`

7. **发布到扩展市场**
   \`\`\`bash
   # 需要先配置 publisher token
   vsce publish
   \`\`\`

8. **发布到 GitHub Releases**
   - 在 GitHub 上创建新的 Release
   - 上传 .vsix 文件
   - 复制 CHANGELOG 内容到 Release Notes

## 发布后

- [ ] 验证扩展市场页面显示正常
- [ ] 测试从市场安装扩展
- [ ] 更新项目文档
- [ ] 通知用户更新

## 回滚计划

如果发现严重问题需要回滚：

1. 从扩展市场下架当前版本
2. 修复问题
3. 发布修复版本
4. 通知用户升级

## 注意事项

- 发布前务必在本地充分测试
- 确保所有文档都是最新的
- 版本号遵循语义化版本规范
- 重大变更需要在 CHANGELOG 中特别说明
- 保持向后兼容性

---

生成时间: ${new Date().toISOString()}
版本: ${packageJson.version}
`

  const checklistPath = path.join(rootDir, 'RELEASE_CHECKLIST.md')
  fs.writeFileSync(checklistPath, checklist)

  log(`  ✓ 发布清单已保存到: RELEASE_CHECKLIST.md`, 'green')

  return { passed: true, warnings: [] }
}

// 主流程
async function main() {
  log('开始检查发布准备...', 'blue')
  log('', 'reset')

  const results = []

  // 运行所有检查
  results.push({ name: '必要文件', ...checkRequiredFiles() })
  results.push({ name: 'package.json', ...checkPackageJson() })
  results.push({ name: 'README.md', ...checkReadme() })
  results.push({ name: 'CHANGELOG.md', ...checkChangelog() })
  results.push({ name: '构建产物', ...checkBuildOutput() })
  results.push({ name: '测试', ...checkTests() })
  results.push({ name: '发布清单', ...generateReleaseChecklist() })

  // 汇总结果
  log('\n检查结果汇总:', 'blue')
  log('', 'reset')

  let allPassed = true
  const allWarnings = []

  for (const result of results) {
    if (result.passed) {
      log(`✓ ${result.name}`, 'green')
    }
    else {
      log(`✗ ${result.name}`, 'red')
      allPassed = false
    }

    if (result.warnings && result.warnings.length > 0) {
      allWarnings.push(...result.warnings)
    }
  }

  // 显示警告
  if (allWarnings.length > 0) {
    log('\n建议改进:', 'yellow')
    for (const warning of allWarnings) {
      log(`  ⚠ ${warning}`, 'yellow')
    }
  }

  log('', 'reset')

  if (allPassed) {
    log('✓ 所有检查通过! 可以开始发布流程', 'green')
    log('  请查看 RELEASE_CHECKLIST.md 了解详细的发布步骤', 'blue')
    return 0
  }
  else {
    log('✗ 部分检查未通过，请修复后再发布', 'red')
    return 1
  }
}

main()
  .then(code => process.exit(code))
  .catch((error) => {
    log(`检查过程出错: ${error.message}`, 'red')
    process.exit(1)
  })
