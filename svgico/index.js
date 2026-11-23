// SVG 图标库工具页：页面级配置与轻交互（还原引擎逻辑见 sprites-app.js）
// 纯静态 IIFE 经典脚本，兼容 file:// 直开，无模块依赖
(function () {
  // 引擎数据源开关：置空对象表示内置图标全部来自 icons-data.js（window.FA_ICONS），
  // 引擎不再向 ./sprites/*.svg 发起 XHR 请求
  window.dataSource = {};

  // file:// 直开时 IndexedDB 的 open 请求在部分环境会永久挂起（不回调也不报错），
  // 强制 localforage 使用 localStorage 驱动，保证已导入 Sprites 的读写可靠
  if (window.localforage && window.localforage.LOCALSTORAGE) {
    localforage.setDriver(localforage.LOCALSTORAGE).catch(function () {
      /* 驱动不可用时由引擎的兜底逻辑接管 */
    });
  }

  // 分组展开 / 收起，状态持久化到 localStorage（键名与原版保持一致）
  ['Regular', 'Solid', 'Brands'].forEach(function (key) {
    var section = document.getElementById('section' + key);
    var trigger = document.getElementById('switch' + key);
    if (!section || !trigger) return;

    // 恢复上次会话的收起状态
    if (localStorage['section' + key] === '0') {
      trigger.checked = false;
      section.removeAttribute('open');
    }

    trigger.addEventListener('click', function () {
      if (trigger.checked) {
        section.setAttribute('open', '');
        localStorage['section' + key] = '1';
      } else {
        section.removeAttribute('open');
        localStorage['section' + key] = '0';
      }
    });
  });

  // 弹窗关闭：引擎以 style.display 方式控制弹窗显隐，这里统一接管关闭按钮
  // （覆盖结果弹窗 dialog、重名提示弹窗 dialogAlert）
  document.addEventListener('click', function (event) {
    var target = event.target;
    var closer = target && target.closest ? target.closest('.fh-dialog-close') : null;
    if (!closer) return;
    var dlg = closer.closest('dialog');
    if (dlg) dlg.style.display = 'none';
  });
})();
