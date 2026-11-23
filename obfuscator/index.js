(function () {
  const $ = (id) => document.getElementById(id);
  const input = $('input');
  const output = $('output');
  const status = $('status');
  const btnObfuscate = $('btnObfuscate');
  const btnText = $('btnText');
  const btnCopy = $('btnCopy');
  const btnDownload = $('btnDownload');
  const toastEl = $('toast');

  // ---------- tabs ----------
  document.querySelectorAll('.tab').forEach(tab => {
    tab.addEventListener('click', () => {
      document.querySelectorAll('.tab').forEach(t => t.classList.remove('active'));
      document.querySelectorAll('.panel').forEach(p => p.classList.remove('active'));
      tab.classList.add('active');
      $('panel-' + tab.dataset.tab).classList.add('active');
    });
  });

  // ---------- option groups collapse ----------
  document.querySelectorAll('.option-group-title').forEach(title => {
    title.addEventListener('click', () => {
      title.parentElement.classList.toggle('collapsed');
    });
  });

  // ---------- range value display ----------
  ['stringArrayThreshold', 'controlFlowFlatteningThreshold', 'deadCodeInjectionThreshold'].forEach(name => {
    const el = $('opt-' + name);
    const val = $('val-' + name);
    el.addEventListener('input', () => { val.textContent = el.value; });
  });

  // ---------- presets ----------
  const presets = {
    default: {
      compact: true,
      simplify: true,
      identifierNamesGenerator: 'mangled',
      renameGlobals: false,
      target: 'node',
      stringArray: true,
      stringArrayEncoding: 'base64',
      stringArrayThreshold: 0.75,
      stringArrayRotate: true,
      stringArrayShuffle: true,
      splitStrings: false,
      splitStringsChunkLength: 10,
      controlFlowFlattening: false,
      controlFlowFlatteningThreshold: 0.75,
      deadCodeInjection: false,
      deadCodeInjectionThreshold: 0.4,
      numbersToExpressions: false,
      transformObjectKeys: false,
      unicodeEscapeSequence: false,
      selfDefending: false,
      debugProtection: false,
      disableConsoleOutput: false
    },
    low: {
      compact: true,
      simplify: true,
      identifierNamesGenerator: 'mangled',
      renameGlobals: false,
      target: 'node',
      stringArray: true,
      stringArrayEncoding: 'none',
      stringArrayThreshold: 0.75,
      stringArrayRotate: true,
      stringArrayShuffle: true,
      splitStrings: false,
      splitStringsChunkLength: 10,
      controlFlowFlattening: false,
      controlFlowFlatteningThreshold: 0.75,
      deadCodeInjection: false,
      deadCodeInjectionThreshold: 0.4,
      numbersToExpressions: false,
      transformObjectKeys: false,
      unicodeEscapeSequence: false,
      selfDefending: false,
      debugProtection: false,
      disableConsoleOutput: false
    },
    medium: {
      compact: true,
      simplify: true,
      identifierNamesGenerator: 'mangled-shuffled',
      renameGlobals: false,
      target: 'node',
      stringArray: true,
      stringArrayEncoding: 'base64',
      stringArrayThreshold: 0.75,
      stringArrayRotate: true,
      stringArrayShuffle: true,
      splitStrings: true,
      splitStringsChunkLength: 10,
      controlFlowFlattening: true,
      controlFlowFlatteningThreshold: 0.75,
      deadCodeInjection: true,
      deadCodeInjectionThreshold: 0.4,
      numbersToExpressions: true,
      transformObjectKeys: true,
      unicodeEscapeSequence: false,
      selfDefending: true,
      debugProtection: false,
      disableConsoleOutput: true
    },
    high: {
      compact: true,
      simplify: true,
      identifierNamesGenerator: 'hexadecimal',
      renameGlobals: false,
      target: 'node',
      stringArray: true,
      stringArrayEncoding: 'rc4',
      stringArrayThreshold: 1,
      stringArrayRotate: true,
      stringArrayShuffle: true,
      splitStrings: true,
      splitStringsChunkLength: 5,
      controlFlowFlattening: true,
      controlFlowFlatteningThreshold: 1,
      deadCodeInjection: true,
      deadCodeInjectionThreshold: 1,
      numbersToExpressions: true,
      transformObjectKeys: true,
      unicodeEscapeSequence: false,
      selfDefending: true,
      debugProtection: true,
      disableConsoleOutput: true
    }
  };

  function applyPreset(name) {
    const p = presets[name];
    if (!p) return;
    Object.keys(p).forEach(key => {
      const el = $('opt-' + key);
      if (!el) return;
      if (el.type === 'checkbox') el.checked = !!p[key];
      else el.value = p[key];
    });
    // update range labels
    ['stringArrayThreshold', 'controlFlowFlatteningThreshold', 'deadCodeInjectionThreshold'].forEach(n => {
      const v = $('val-' + n);
      if (v) v.textContent = $('opt-' + n).value;
    });
    document.querySelectorAll('.preset').forEach(b => {
      b.classList.toggle('active', b.dataset.preset === name);
    });
  }

  document.querySelectorAll('.preset').forEach(btn => {
    btn.addEventListener('click', () => applyPreset(btn.dataset.preset));
  });

  $('btnResetOpts').addEventListener('click', () => applyPreset('default'));

  // ---------- collect options ----------
  function getOptions() {
    const encoding = $('opt-stringArrayEncoding').value;
    return {
      compact: $('opt-compact').checked,
      simplify: $('opt-simplify').checked,
      identifierNamesGenerator: $('opt-identifierNamesGenerator').value,
      renameGlobals: $('opt-renameGlobals').checked,
      target: $('opt-target').value,
      stringArray: $('opt-stringArray').checked,
      stringArrayEncoding: encoding === 'none' ? [] : [encoding],
      stringArrayThreshold: parseFloat($('opt-stringArrayThreshold').value),
      stringArrayRotate: $('opt-stringArrayRotate').checked,
      stringArrayShuffle: $('opt-stringArrayShuffle').checked,
      splitStrings: $('opt-splitStrings').checked,
      splitStringsChunkLength: parseInt($('opt-splitStringsChunkLength').value, 10) || 10,
      controlFlowFlattening: $('opt-controlFlowFlattening').checked,
      controlFlowFlatteningThreshold: parseFloat($('opt-controlFlowFlatteningThreshold').value),
      deadCodeInjection: $('opt-deadCodeInjection').checked,
      deadCodeInjectionThreshold: parseFloat($('opt-deadCodeInjectionThreshold').value),
      numbersToExpressions: $('opt-numbersToExpressions').checked,
      transformObjectKeys: $('opt-transformObjectKeys').checked,
      unicodeEscapeSequence: $('opt-unicodeEscapeSequence').checked,
      selfDefending: $('opt-selfDefending').checked,
      debugProtection: $('opt-debugProtection').checked,
      disableConsoleOutput: $('opt-disableConsoleOutput').checked,
      log: false
    };
  }

  // ---------- toast ----------
  let toastTimer;
  function toast(msg) {
    toastEl.textContent = msg;
    toastEl.classList.add('show');
    clearTimeout(toastTimer);
    toastTimer = setTimeout(() => toastEl.classList.remove('show'), 2200);
  }

  // ---------- main actions ----------
  function setBusy(busy) {
    btnObfuscate.disabled = busy;
    btnText.innerHTML = busy ? '<span class="spinner"></span> 处理中…' : '混淆';
  }

  btnObfuscate.addEventListener('click', () => {
    const code = input.value.trim();
    if (!code) {
      status.textContent = '请先输入代码';
      status.className = 'status err';
      return;
    }
    if (typeof JavaScriptObfuscator === 'undefined') {
      status.textContent = '混淆库加载失败，请检查网络或改用本地文件';
      status.className = 'status err';
      return;
    }

    setBusy(true);
    status.textContent = '正在混淆…';
    status.className = 'status';

    // 让 UI 先更新
    setTimeout(() => {
      try {
        const t0 = performance.now();
        const result = JavaScriptObfuscator.obfuscate(code, getOptions());
        const out = result.getObfuscatedCode();
        const t1 = performance.now();

        output.value = out;
        btnCopy.disabled = false;
        btnDownload.disabled = false;

        // 自动切到结果页
        document.querySelector('.tab[data-tab="output"]').click();

        const ratio = ((out.length / code.length) * 100).toFixed(0);
        status.textContent = `完成 · ${(t1 - t0).toFixed(0)} ms · 体积 ${ratio}%`;
        status.className = 'status ok';
        toast('混淆完成');
      } catch (err) {
        console.error(err);
        status.textContent = '错误: ' + (err.message || err);
        status.className = 'status err';
        toast('混淆失败');
      } finally {
        setBusy(false);
      }
    }, 30);
  });

  btnCopy.addEventListener('click', async () => {
    try {
      await navigator.clipboard.writeText(output.value);
      toast('已复制到剪贴板');
    } catch {
      output.select();
      document.execCommand('copy');
      toast('已复制');
    }
  });

  btnDownload.addEventListener('click', () => {
    const blob = new Blob([output.value], { type: 'application/javascript' });
    const a = document.createElement('a');
    a.href = URL.createObjectURL(blob);
    a.download = 'obfuscated.js';
    a.click();
    URL.revokeObjectURL(a.href);
    toast('已开始下载');
  });

  $('btnClear').addEventListener('click', () => {
    input.value = '';
    output.value = '';
    btnCopy.disabled = true;
    btnDownload.disabled = true;
    status.textContent = '已清空';
    status.className = 'status';
    document.querySelector('.tab[data-tab="input"]').click();
  });

  $('btnLoadExample').addEventListener('click', () => {
    input.value = `// 示例代码
function greet(name) {
  const message = 'Hello, ' + name + '!';
  console.log(message);
  return message;
}

const config = {
  apiUrl: 'https://api.example.com/v1',
  timeout: 5000,
  retries: 3
};

function fetchUser(id) {
  return fetch(config.apiUrl + '/users/' + id, {
    method: 'GET',
    headers: { 'Content-Type': 'application/json' }
  });
}

greet('World');
document.getElementById('status').textContent = 'Loaded successfully';
`;
    document.querySelector('.tab[data-tab="input"]').click();
    toast('已加载示例');
  });

  // 初始应用 default 预设
  applyPreset('default');
})();
