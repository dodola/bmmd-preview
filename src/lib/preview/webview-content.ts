import type * as vscode from 'vscode'

/**
 * 生成 Webview HTML 内容
 * 
 * @param webview Webview 实例
 * @param extensionUri 扩展根目录 URI
 * @returns HTML 字符串
 */
export function getWebviewContent(
  webview: vscode.Webview,
  extensionUri: vscode.Uri,
): string {
  // 生成 nonce 用于 CSP
  const nonce = getNonce()

  return `<!DOCTYPE html>
<html lang="zh-CN">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <meta http-equiv="Content-Security-Policy" content="default-src 'none'; style-src ${webview.cspSource} 'unsafe-inline'; script-src 'nonce-${nonce}'; img-src ${webview.cspSource} https: data:;">
  <title>bm.md 预览</title>
  <style nonce="${nonce}">
    * {
      box-sizing: border-box;
      margin: 0;
      padding: 0;
    }

    html, body {
      width: 100%;
      height: 100%;
      overflow: hidden;
    }

    body {
      font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Oxygen, Ubuntu, Cantarell, sans-serif;
      background-color: var(--vscode-editor-background);
      color: var(--vscode-editor-foreground);
    }

    #toolbar {
      position: sticky;
      top: 0;
      left: 0;
      right: 0;
      background-color: var(--vscode-editor-background);
      border-bottom: 1px solid var(--vscode-panel-border);
      padding: 8px 12px;
      display: flex;
      gap: 12px;
      align-items: center;
      z-index: 1000;
      box-shadow: 0 2px 4px rgba(0, 0, 0, 0.1);
    }

    #toolbar label {
      font-size: 12px;
      color: var(--vscode-foreground);
      margin-right: 4px;
    }

    #toolbar select {
      background-color: var(--vscode-dropdown-background);
      color: var(--vscode-dropdown-foreground);
      border: 1px solid var(--vscode-dropdown-border);
      padding: 4px 8px;
      border-radius: 2px;
      font-size: 12px;
      cursor: pointer;
      outline: none;
    }

    #toolbar select:hover {
      background-color: var(--vscode-dropdown-listBackground);
    }

    #toolbar select:focus {
      border-color: var(--vscode-focusBorder);
    }

    .toolbar-group {
      display: flex;
      align-items: center;
      gap: 4px;
    }

    #container {
      width: 100%;
      height: 100%;
      overflow-y: auto;
      overflow-x: hidden;
      padding: 20px;
    }

    #preview {
      max-width: 900px;
      margin: 0 auto;
      background-color: var(--vscode-editor-background);
    }

    #loading {
      display: flex;
      align-items: center;
      justify-content: center;
      height: 100%;
      font-size: 14px;
      color: var(--vscode-descriptionForeground);
    }

    #error {
      display: none;
      padding: 20px;
      margin: 20px;
      background-color: var(--vscode-inputValidation-errorBackground);
      border: 1px solid var(--vscode-inputValidation-errorBorder);
      border-radius: 4px;
      color: var(--vscode-inputValidation-errorForeground);
    }

    #error.visible {
      display: block;
    }

    #error-title {
      font-weight: bold;
      margin-bottom: 8px;
    }

    #error-message {
      font-family: 'Courier New', monospace;
      font-size: 12px;
      white-space: pre-wrap;
      word-break: break-word;
    }

    /* 隐藏加载状态 */
    body.loaded #loading {
      display: none;
    }

    /* 滚动条样式 */
    #container::-webkit-scrollbar {
      width: 10px;
    }

    #container::-webkit-scrollbar-track {
      background: var(--vscode-scrollbarSlider-background);
    }

    #container::-webkit-scrollbar-thumb {
      background: var(--vscode-scrollbarSlider-hoverBackground);
      border-radius: 5px;
    }

    #container::-webkit-scrollbar-thumb:hover {
      background: var(--vscode-scrollbarSlider-activeBackground);
    }
  </style>
</head>
<body>
  <div id="toolbar">
    <div class="toolbar-group">
      <label for="markdown-style-select">样式:</label>
      <select id="markdown-style-select">
        <option value="ayu-light">Ayu Light</option>
        <option value="bauhaus">Bauhaus</option>
        <option value="blueprint">Blueprint</option>
        <option value="botanical">Botanical</option>
        <option value="green-simple">Green Simple</option>
        <option value="maximalism">Maximalism</option>
        <option value="neo-brutalism">Neo-Brutalism</option>
        <option value="newsprint">Newsprint</option>
        <option value="organic">Organic</option>
        <option value="playful-geometric">Playful Geometric</option>
        <option value="professional">Professional</option>
        <option value="retro">Retro</option>
        <option value="sketch">Sketch</option>
        <option value="terminal">Terminal</option>
      </select>
    </div>
    <div class="toolbar-group">
      <label for="code-theme-select">代码主题:</label>
      <select id="code-theme-select">
        <option value="andromeeda">Andromeeda 🌙</option>
        <option value="aurora-x">Aurora X 🌙</option>
        <option value="catppuccin-latte">Catppuccin Latte ☀️</option>
        <option value="catppuccin-mocha">Catppuccin Mocha 🌙</option>
        <option value="github-dark">GitHub Dark 🌙</option>
        <option value="github-light">GitHub Light ☀️</option>
        <option value="kimbie-dark">Kimbie Dark 🌙</option>
        <option value="kimbie-light">Kimbie Light ☀️</option>
        <option value="min-dark">Min Dark 🌙</option>
        <option value="min-light">Min Light ☀️</option>
        <option value="nord">Nord 🌙</option>
        <option value="one-dark-pro">One Dark Pro 🌙</option>
        <option value="rose-pine-dawn">Rosé Pine Dawn ☀️</option>
        <option value="vitesse-dark">Vitesse Dark 🌙</option>
      </select>
    </div>
  </div>
  <div id="container">
    <div id="loading">正在加载预览...</div>
    <div id="error">
      <div id="error-title">渲染错误</div>
      <div id="error-message"></div>
    </div>
    <div id="preview"></div>
  </div>

  <script nonce="${nonce}">
    (function() {
      const vscode = acquireVsCodeApi();
      const container = document.getElementById('container');
      const preview = document.getElementById('preview');
      const errorElement = document.getElementById('error');
      const errorMessage = document.getElementById('error-message');
      const markdownStyleSelect = document.getElementById('markdown-style-select');
      const codeThemeSelect = document.getElementById('code-theme-select');

      // 监听样式选择变化
      markdownStyleSelect.addEventListener('change', () => {
        const style = markdownStyleSelect.value;
        vscode.postMessage({
          type: 'changeMarkdownStyle',
          style: style
        });
      });

      // 监听代码主题选择变化
      codeThemeSelect.addEventListener('change', () => {
        const theme = codeThemeSelect.value;
        vscode.postMessage({
          type: 'changeCodeTheme',
          theme: theme
        });
      });

      // 监听来自扩展的消息
      window.addEventListener('message', event => {
        const message = event.data;

        switch (message.type) {
          case 'update':
            handleUpdate(message.html);
            break;

          case 'error':
            handleError(message.message);
            break;

          case 'scrollFromEditor':
            handleScrollFromEditor(message.percent, message.line);
            break;

          case 'config':
            handleConfig(message.markdownStyle, message.codeTheme);
            break;

          default:
            console.warn('未知的消息类型:', message.type);
        }
      });

      /**
       * 处理配置消息
       */
      function handleConfig(markdownStyle, codeTheme) {
        // 设置下拉框的选中值
        markdownStyleSelect.value = markdownStyle;
        codeThemeSelect.value = codeTheme;
      }

      /**
       * 处理预览更新（使用增量 DOM 更新）
       */
      function handleUpdate(html) {
        try {
          // 隐藏错误提示
          errorElement.classList.remove('visible');

          // 记录开始时间（用于性能监控）
          const startTime = performance.now();

          // 使用增量 DOM 更新而不是完全替换
          updatePreviewContent(html);

          // 计算渲染时间
          const renderTime = performance.now() - startTime;
          
          // 如果渲染时间超过 200ms，记录警告
          if (renderTime > 200) {
            console.warn(\`预览渲染耗时 \${renderTime.toFixed(2)}ms，超过 200ms 阈值\`);
          }

          // 标记为已加载
          document.body.classList.add('loaded');

          // 为预览内容中的链接添加点击处理
          attachLinkHandlers();
        } catch (error) {
          handleError('更新预览失败: ' + error.message);
        }
      }

      /**
       * 使用增量更新策略更新预览内容
       * 
       * 对于小的变化，使用 morphdom 进行增量更新
       * 对于大的变化，直接替换 innerHTML
       */
      function updatePreviewContent(html) {
        // 创建临时容器来解析新的 HTML
        const temp = document.createElement('div');
        temp.innerHTML = html;

        // 如果预览容器为空，直接设置内容
        if (!preview.firstChild) {
          preview.innerHTML = html;
          return;
        }

        // 计算变化程度（简单启发式：比较 HTML 长度）
        const oldLength = preview.innerHTML.length;
        const newLength = html.length;
        const lengthDiff = Math.abs(newLength - oldLength);
        const changeRatio = lengthDiff / Math.max(oldLength, newLength);

        // 如果变化超过 50%，直接替换（更快）
        if (changeRatio > 0.5) {
          preview.innerHTML = html;
          return;
        }

        // 否则使用增量更新（morphdom 算法的简化版本）
        morphDom(preview, temp);
      }

      /**
       * 简化的 morphdom 实现
       * 
       * 递归比较和更新 DOM 树，只修改变化的部分
       */
      function morphDom(fromNode, toNode) {
        // 如果节点类型不同，直接替换
        if (fromNode.nodeType !== toNode.nodeType) {
          fromNode.parentNode?.replaceChild(toNode.cloneNode(true), fromNode);
          return;
        }

        // 处理文本节点
        if (fromNode.nodeType === Node.TEXT_NODE) {
          if (fromNode.nodeValue !== toNode.nodeValue) {
            fromNode.nodeValue = toNode.nodeValue;
          }
          return;
        }

        // 处理元素节点
        if (fromNode.nodeType === Node.ELEMENT_NODE) {
          // 更新属性
          const fromAttrs = fromNode.attributes;
          const toAttrs = toNode.attributes;

          // 删除旧属性
          for (let i = fromAttrs.length - 1; i >= 0; i--) {
            const attr = fromAttrs[i];
            if (!toNode.hasAttribute(attr.name)) {
              fromNode.removeAttribute(attr.name);
            }
          }

          // 添加或更新新属性
          for (let i = 0; i < toAttrs.length; i++) {
            const attr = toAttrs[i];
            if (fromNode.getAttribute(attr.name) !== attr.value) {
              fromNode.setAttribute(attr.name, attr.value);
            }
          }

          // 递归处理子节点
          const fromChildren = Array.from(fromNode.childNodes);
          const toChildren = Array.from(toNode.childNodes);

          // 简化策略：如果子节点数量差异很大，直接替换
          if (Math.abs(fromChildren.length - toChildren.length) > 10) {
            fromNode.innerHTML = toNode.innerHTML;
            return;
          }

          // 更新现有子节点
          const minLength = Math.min(fromChildren.length, toChildren.length);
          for (let i = 0; i < minLength; i++) {
            morphDom(fromChildren[i], toChildren[i]);
          }

          // 添加新子节点
          for (let i = minLength; i < toChildren.length; i++) {
            fromNode.appendChild(toChildren[i].cloneNode(true));
          }

          // 删除多余的子节点
          for (let i = fromChildren.length - 1; i >= minLength; i--) {
            fromNode.removeChild(fromChildren[i]);
          }
        }
      }

      /**
       * 处理错误
       */
      function handleError(message) {
        errorMessage.textContent = message;
        errorElement.classList.add('visible');
        document.body.classList.add('loaded');
      }

      /**
       * 为链接添加点击处理
       */
      function attachLinkHandlers() {
        const links = preview.querySelectorAll('a[href]');
        links.forEach(link => {
          link.addEventListener('click', event => {
            const href = link.getAttribute('href');
            
            // 如果是外部链接，在浏览器中打开
            if (href && (href.startsWith('http://') || href.startsWith('https://'))) {
              event.preventDefault();
              vscode.postMessage({
                type: 'openExternal',
                url: href
              });
            }
          });
        });
      }

      /**
       * 监听滚动事件（用于滚动同步）
       */
      let scrollTimeout;
      let isScrollingFromEditor = false;

      container.addEventListener('scroll', () => {
        // 如果是从编辑器触发的滚动，忽略
        if (isScrollingFromEditor) {
          return;
        }

        // 防抖处理
        if (scrollTimeout) {
          clearTimeout(scrollTimeout);
        }

        scrollTimeout = setTimeout(() => {
          // 计算当前滚动位置
          const scrollTop = container.scrollTop;
          const scrollHeight = container.scrollHeight;
          const clientHeight = container.clientHeight;
          
          // 计算滚动百分比
          const maxScroll = scrollHeight - clientHeight;
          const scrollPercent = maxScroll > 0 ? scrollTop / maxScroll : 0;

          // 发送滚动事件到扩展
          vscode.postMessage({
            type: 'scroll',
            percent: scrollPercent
          });
        }, 100);
      });

      /**
       * 处理从编辑器触发的滚动
       */
      function handleScrollFromEditor(percent, line) {
        // 标记为从编辑器触发的滚动
        isScrollingFromEditor = true;

        // 计算目标滚动位置
        const scrollHeight = container.scrollHeight;
        const clientHeight = container.clientHeight;
        const maxScroll = scrollHeight - clientHeight;
        const targetScroll = percent * maxScroll;

        // 滚动到目标位置
        container.scrollTop = targetScroll;

        // 延迟重置标记，避免循环触发
        setTimeout(() => {
          isScrollingFromEditor = false;
        }, 150);
      }

      // 通知扩展 Webview 已准备好
      vscode.postMessage({ type: 'ready' });
    })();
  </script>
</body>
</html>`
}

/**
 * 生成随机 nonce 字符串
 * 
 * @returns nonce 字符串
 */
function getNonce(): string {
  let text = ''
  const possible = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789'
  for (let i = 0; i < 32; i++) {
    text += possible.charAt(Math.floor(Math.random() * possible.length))
  }
  return text
}
