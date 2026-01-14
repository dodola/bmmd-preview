#!/usr/bin/env node

/**
 * VSCode 扩展打包脚本
 * 使用 vsce 打包扩展，并优化打包体积
 */

import { execSync } from 'node:child_process'
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

function exec(command, options = {}) {
  try {
    return execSync(command, {
      cwd: rootDir,
      stdio: 'inherit',
      ...options,
    })
  }
  catch (error) {
    log(`执行命令失败: ${command}`, 'red')
    throw error
  }
}

// 检查必要文件
function checkRequiredFiles() {
  log('检查必要文件...', 'blue')

  const requiredFiles = [
    'package.json',
    'README.md',
    'LICENSE',
    'dist/extension.js',
  ]

  const missingFiles = []

  for (const file of requiredFiles) {
    const filePath = path.join(rootDir, file)
    if (!fs.existsSync(filePath)) {
      missingFiles.push(file)
    }
  }

  if (missingFiles.length > 0) {
    log(`缺少必要文件: ${missingFiles.join(', ')}`, 'red')
    return false
  }

  log('✓ 所有必要文件存在', 'green')
  return true
}

// 检查图标文件
function checkIcon() {
  const iconPath = path.join(rootDir, 'icon.png')
  if (!fs.existsSync(iconPath)) {
    log('⚠ 警告: 缺少 icon.png 文件', 'yellow')
    log('  建议添加 128x128 的扩展图标', 'yellow')
    return false
  }

  log('✓ 图标文件存在', 'green')
  return true
}

// 获取打包体积信息
function getPackageSize() {
  const distPath = path.join(rootDir, 'dist')
  if (!fs.existsSync(distPath)) {
    return 0
  }

  let totalSize = 0

  function getDirectorySize(dirPath) {
    const files = fs.readdirSync(dirPath)

    for (const file of files) {
      const filePath = path.join(dirPath, file)
      const stats = fs.statSync(filePath)

      if (stats.isDirectory()) {
        getDirectorySize(filePath)
      }
      else {
        totalSize += stats.size
      }
    }
  }

  getDirectorySize(distPath)
  return totalSize
}

function formatSize(bytes) {
  if (bytes < 1024)
    return `${bytes} B`
  if (bytes < 1024 * 1024)
    return `${(bytes / 1024).toFixed(2)} KB`
  return `${(bytes / (1024 * 1024)).toFixed(2)} MB`
}

// 主流程
async function main() {
  log('开始打包 VSCode 扩展...', 'blue')
  log('', 'reset')

  // 1. 检查必要文件
  if (!checkRequiredFiles()) {
    log('打包失败: 缺少必要文件', 'red')
    process.exit(1)
  }

  // 2. 检查图标
  checkIcon()

  log('', 'reset')

  // 3. 清理旧的打包文件
  log('清理旧的打包文件...', 'blue')
  const vsixFiles = fs.readdirSync(rootDir).filter(file => file.endsWith('.vsix'))
  for (const file of vsixFiles) {
    fs.unlinkSync(path.join(rootDir, file))
    log(`✓ 删除 ${file}`, 'green')
  }

  log('', 'reset')

  // 4. 运行构建
  log('运行构建...', 'blue')
  exec('pnpm run build')

  log('', 'reset')

  // 5. 显示打包体积
  const distSize = getPackageSize()
  log(`构建产物大小: ${formatSize(distSize)}`, 'blue')

  log('', 'reset')

  // 6. 运行 vsce package
  log('使用 vsce 打包扩展...', 'blue')

  const packageJson = JSON.parse(
    fs.readFileSync(path.join(rootDir, 'package.json'), 'utf-8'),
  )

  const version = packageJson.version
  const name = packageJson.name

  exec('pnpm vsce package --no-dependencies')

  log('', 'reset')

  // 7. 显示打包结果
  const vsixFile = `${name}-${version}.vsix`
  const vsixPath = path.join(rootDir, vsixFile)

  if (fs.existsSync(vsixPath)) {
    const vsixSize = fs.statSync(vsixPath).size
    log('✓ 打包成功!', 'green')
    log(`  文件: ${vsixFile}`, 'green')
    log(`  大小: ${formatSize(vsixSize)}`, 'green')
    log(`  路径: ${vsixPath}`, 'green')
  }
  else {
    log('✗ 打包失败: 未找到 .vsix 文件', 'red')
    process.exit(1)
  }

  log('', 'reset')
  log('打包完成! 🎉', 'green')
}

main().catch((error) => {
  log(`打包过程出错: ${error.message}`, 'red')
  process.exit(1)
})
