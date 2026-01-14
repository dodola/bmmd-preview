#!/usr/bin/env node

/**
 * 性能测试脚本
 * 测试扩展的性能指标
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

function formatSize(bytes) {
  if (bytes < 1024)
    return `${bytes} B`
  if (bytes < 1024 * 1024)
    return `${(bytes / 1024).toFixed(2)} KB`
  return `${(bytes / (1024 * 1024)).toFixed(2)} MB`
}

// 获取文件大小
function getFileSize(filePath) {
  try {
    const stats = fs.statSync(filePath)
    return stats.size
  }
  catch {
    return 0
  }
}

// 获取目录大小
function getDirectorySize(dirPath) {
  let totalSize = 0

  function traverse(dir) {
    const files = fs.readdirSync(dir)

    for (const file of files) {
      const filePath = path.join(dir, file)
      const stats = fs.statSync(filePath)

      if (stats.isDirectory()) {
        traverse(filePath)
      }
      else {
        totalSize += stats.size
      }
    }
  }

  if (fs.existsSync(dirPath)) {
    traverse(dirPath)
  }

  return totalSize
}

// 分析打包体积
function analyzePackageSize() {
  log('分析打包体积...', 'blue')
  log('', 'reset')

  const distPath = path.join(rootDir, 'dist')
  const extensionPath = path.join(distPath, 'extension.js')

  if (!fs.existsSync(distPath)) {
    log('✗ dist 目录不存在，请先运行 pnpm run build', 'red')
    return false
  }

  const distSize = getDirectorySize(distPath)
  const extensionSize = getFileSize(extensionPath)

  log(`总体积: ${formatSize(distSize)}`, 'blue')
  log(`主文件: ${formatSize(extensionSize)}`, 'blue')

  // 性能基准
  const maxDistSize = 5 * 1024 * 1024 // 5MB
  const maxExtensionSize = 2 * 1024 * 1024 // 2MB

  if (distSize > maxDistSize) {
    log(`⚠ 警告: dist 目录体积超过 ${formatSize(maxDistSize)}`, 'yellow')
  }
  else {
    log(`✓ dist 目录体积符合预期`, 'green')
  }

  if (extensionSize > maxExtensionSize) {
    log(`⚠ 警告: 主文件体积超过 ${formatSize(maxExtensionSize)}`, 'yellow')
  }
  else {
    log(`✓ 主文件体积符合预期`, 'green')
  }

  log('', 'reset')
  return true
}

// 分析依赖
function analyzeDependencies() {
  log('分析依赖...', 'blue')
  log('', 'reset')

  const packageJsonPath = path.join(rootDir, 'package.json')
  const packageJson = JSON.parse(fs.readFileSync(packageJsonPath, 'utf-8'))

  const deps = packageJson.dependencies || {}
  const devDeps = packageJson.devDependencies || {}

  log(`生产依赖: ${Object.keys(deps).length} 个`, 'blue')
  log(`开发依赖: ${Object.keys(devDeps).length} 个`, 'blue')

  // 检查是否有不必要的依赖
  const heavyDeps = ['lodash', 'moment', 'axios']
  const foundHeavyDeps = []

  for (const dep of heavyDeps) {
    if (deps[dep]) {
      foundHeavyDeps.push(dep)
    }
  }

  if (foundHeavyDeps.length > 0) {
    log(`⚠ 警告: 发现较重的依赖: ${foundHeavyDeps.join(', ')}`, 'yellow')
    log('  建议考虑使用更轻量的替代方案', 'yellow')
  }
  else {
    log('✓ 依赖选择合理', 'green')
  }

  log('', 'reset')
}

// 检查 VSIX 文件
function checkVsixFile() {
  log('检查 VSIX 文件...', 'blue')
  log('', 'reset')

  const vsixFiles = fs.readdirSync(rootDir).filter(file => file.endsWith('.vsix'))

  if (vsixFiles.length === 0) {
    log('未找到 .vsix 文件，请先运行 pnpm run package', 'yellow')
    return false
  }

  const vsixFile = vsixFiles[0]
  const vsixPath = path.join(rootDir, vsixFile)
  const vsixSize = getFileSize(vsixPath)

  log(`文件: ${vsixFile}`, 'blue')
  log(`大小: ${formatSize(vsixSize)}`, 'blue')

  // 性能基准
  const maxVsixSize = 10 * 1024 * 1024 // 10MB

  if (vsixSize > maxVsixSize) {
    log(`⚠ 警告: VSIX 文件体积超过 ${formatSize(maxVsixSize)}`, 'yellow')
    log('  建议优化打包配置或移除不必要的文件', 'yellow')
  }
  else {
    log(`✓ VSIX 文件体积符合预期`, 'green')
  }

  log('', 'reset')
  return true
}

// 生成性能报告
function generateReport() {
  log('生成性能报告...', 'blue')
  log('', 'reset')

  const report = {
    timestamp: new Date().toISOString(),
    dist: {
      size: getDirectorySize(path.join(rootDir, 'dist')),
      extensionSize: getFileSize(path.join(rootDir, 'dist', 'extension.js')),
    },
    vsix: null,
  }

  const vsixFiles = fs.readdirSync(rootDir).filter(file => file.endsWith('.vsix'))
  if (vsixFiles.length > 0) {
    const vsixFile = vsixFiles[0]
    report.vsix = {
      file: vsixFile,
      size: getFileSize(path.join(rootDir, vsixFile)),
    }
  }

  const reportPath = path.join(rootDir, 'performance-report.json')
  fs.writeFileSync(reportPath, JSON.stringify(report, null, 2))

  log(`✓ 报告已保存到: ${reportPath}`, 'green')
  log('', 'reset')
}

// 主流程
async function main() {
  log('开始性能测试...', 'blue')
  log('', 'reset')

  analyzePackageSize()
  analyzeDependencies()
  checkVsixFile()
  generateReport()

  log('性能测试完成! 🎉', 'green')
}

main().catch((error) => {
  log(`性能测试出错: ${error.message}`, 'red')
  process.exit(1)
})
