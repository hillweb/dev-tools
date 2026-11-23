/* 站点级 Header 行为：占位工具点击提示 + 同步 Header 实际高度变量 */
(function () {
    var toastEl = null;
    var toastTimer = null;

    function ensureToast() {
        if (toastEl && document.body.contains(toastEl)) {
            return toastEl;
        }
        toastEl = document.createElement('div');
        toastEl.className = 'fh-site-toast';
        toastEl.setAttribute('role', 'status');
        toastEl.setAttribute('aria-live', 'polite');
        document.body.appendChild(toastEl);
        return toastEl;
    }

    function showToast(message) {
        var el = ensureToast();
        el.textContent = message;
        el.classList.add('is-show');
        clearTimeout(toastTimer);
        toastTimer = setTimeout(function () {
            el.classList.remove('is-show');
        }, 2000);
    }

    // 将站点 Header 的实际高度写入 CSS 变量，便于页面按需预留顶部空间
    function syncHeaderHeight() {
        var header = document.querySelector('.fh-site-header');
        if (!header) {
            return;
        }
        document.documentElement.style.setProperty('--fh-site-header-h', header.offsetHeight + 'px');
    }

    document.addEventListener('click', function (event) {
        var target = event.target;
        var link = target && target.closest ? target.closest('.fh-site-nav a[data-fh-placeholder]') : null;
        if (!link) {
            return;
        }
        event.preventDefault();
        showToast('「' + link.textContent.trim() + '」正在迁移中，敬请期待');
    });

    syncHeaderHeight();
    window.addEventListener('resize', syncHeaderHeight);
    window.addEventListener('load', syncHeaderHeight);
})();
