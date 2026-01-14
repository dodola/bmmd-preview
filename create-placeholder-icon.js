#!/usr/bin/env node

/**
 * 创建占位图标
 * 这是一个临时图标，实际发布前应该替换为专业设计的图标
 */

import { createCanvas } from 'canvas'
import fs from 'node:fs'

const canvas = createCanvas(128, 128)
const ctx = canvas.getContext('2d')

// 绘制渐变背景
const gradient = ctx.createLinearGradient(0, 0, 128, 128)
gradient.addColorStop(0, '#667eea')
gradient.addColorStop(1, '#764ba2')
ctx.fillStyle = gradient
ctx.fillRect(0, 0, 128, 128)

// 绘制圆角矩形
ctx.fillStyle = 'rgba(255, 255, 255, 0.2)'
ctx.beginPath()
ctx.roundRect(16, 16, 96, 96, 12)
ctx.fill()

// 绘制 Markdown 符号 #
ctx.fillStyle = '#ffffff'
ctx.font = 'bold 72px sans-serif'
ctx.textAlign = 'center'
ctx.textBaseline = 'middle'
ctx.fillText('#', 64, 64)

// 保存为 PNG
const buffer = canvas.toBuffer('image/png')
fs.writeFileSync('icon.png', buffer)

console.log('✓ 占位图标已创建: icon.png')
console.log('⚠ 这是一个临时图标，发布前请替换为专业设计的图标')
