// UUID 生成器：IIFE 经典脚本，兼容 file:// 直开，无 ES 模块依赖
(function () {
  const $ = (id) => document.getElementById(id);
  const countEl = $('count');
  const uppercaseEl = $('uppercase');
  const noHyphenEl = $('noHyphen');
  const resultEl = $('result');
  const statusEl = $('status');
  const infoEl = $('info');
  const copiedEl = $('copiedValue');
  const toastEl = $('toast');

  let currentList = [];

  // RFC 4122 UUID v4
  function uuidv4() {
    if (typeof crypto !== 'undefined' && typeof crypto.randomUUID === 'function') {
      return crypto.randomUUID();
    }
    const bytes = new Uint8Array(16);
    if (typeof crypto !== 'undefined' && crypto.getRandomValues) {
      crypto.getRandomValues(bytes);
    } else {
      for (let i = 0; i < 16; i++) bytes[i] = Math.floor(Math.random() * 256);
    }
    bytes[6] = (bytes[6] & 0x0f) | 0x40; // version 4
    bytes[8] = (bytes[8] & 0x3f) | 0x80; // variant 10
    const hex = [...bytes].map((b) => b.toString(16).padStart(2, '0')).join('');
    return (
      hex.slice(0, 8) + '-' +
      hex.slice(8, 12) + '-' +
      hex.slice(12, 16) + '-' +
      hex.slice(16, 20) + '-' +
      hex.slice(20)
    );
  }

  function formatUuid(id) {
    let s = id;
    if (noHyphenEl.checked) s = s.replace(/-/g, '');
    if (uppercaseEl.checked) s = s.toUpperCase();
    else s = s.toLowerCase();
    return s;
  }

  // 结果框高度随内容自适应（受 CSS 的 min-height / max-height 约束）
  function syncResultHeight() {
    resultEl.style.height = 'auto';
    const styles = getComputedStyle(resultEl);
    const min = parseFloat(styles.minHeight) || 0;
    const max = parseFloat(styles.maxHeight) || Infinity;
    resultEl.style.height = Math.min(Math.max(resultEl.scrollHeight, min), max) + 'px';
  }

  function toast(msg) {
    toastEl.textContent = msg;
    toastEl.classList.add('show');
    clearTimeout(toast._t);
    toast._t = setTimeout(() => toastEl.classList.remove('show'), 2000);
  }

  function showCopied(value) {
    copiedEl.textContent = value;
    copiedEl.classList.add('has-value');
  }

  function generate() {
    let n = parseInt(countEl.value, 10);
    if (isNaN(n) || n < 1) n = 1;
    if (n > 1000) n = 1000;
    countEl.value = n;

    currentList = [];
    for (let i = 0; i < n; i++) {
      currentList.push(formatUuid(uuidv4()));
    }
    resultEl.value = currentList.join('\n');
    statusEl.textContent = '已生成 ' + n + ' 个';
    infoEl.textContent = uppercaseEl.checked ? '大写' : '小写';
    if (noHyphenEl.checked) infoEl.textContent += ' · 无连字符';
    else infoEl.textContent += ' · 标准格式';
    syncResultHeight();
  }

  async function copyText(text) {
    try {
      await navigator.clipboard.writeText(text);
      return true;
    } catch {
      // 非安全上下文或权限受限时的回退方案
      const ta = document.createElement('textarea');
      ta.value = text;
      ta.style.position = 'fixed';
      ta.style.left = '-9999px';
      document.body.appendChild(ta);
      ta.select();
      try {
        document.execCommand('copy');
        return true;
      } catch {
        return false;
      } finally {
        document.body.removeChild(ta);
      }
    }
  }

  $('btnGenerate').addEventListener('click', generate);

  $('btnRandomCopy').addEventListener('click', async () => {
    if (!currentList.length) {
      generate();
    }
    const one = currentList[Math.floor(Math.random() * currentList.length)];
    if (await copyText(one)) {
      showCopied(one);
      toast('已复制: ' + one);
    } else {
      toast('复制失败，请手动选择');
    }
  });

  // 选项变化时重新生成，使结果与选项保持一致
  function reformat() {
    if (!currentList.length) return;
    generate();
  }
  uppercaseEl.addEventListener('change', reformat);
  noHyphenEl.addEventListener('change', reformat);

  window.addEventListener('resize', syncResultHeight);

  // 首次自动生成
  generate();
})();
