#!/bin/bash

# 创建一个简单的 128x128 PNG 图标
# 使用 ImageMagick 的 convert 命令

if command -v convert &> /dev/null; then
    # 创建渐变背景和文字
    convert -size 128x128 \
        gradient:'#667eea-#764ba2' \
        -gravity center \
        -pointsize 72 \
        -font DejaVu-Sans-Bold \
        -fill white \
        -annotate +0+0 '#' \
        icon.png
    echo "✓ 图标已创建: icon.png"
else
    echo "⚠ ImageMagick 未安装"
    echo "请使用以下方法之一创建图标:"
    echo "1. 在线转换 icon.svg 到 icon.png"
    echo "2. 安装 ImageMagick: sudo apt-get install imagemagick"
    echo "3. 使用 Inkscape 或其他工具"
fi
