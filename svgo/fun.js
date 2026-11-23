/**
 * 将多个 Canvas 封装为标准 Windows ICO 格式 (内嵌 PNG 帧)
 * @param {HTMLCanvasElement[]} canvases - Canvas 元素数组，建议按尺寸从小到大排列
 * @returns {Promise<Blob>} ICO 格式的 Blob 对象
 */
async function multiCanvasToIcoBlob(canvases) {
    if (!canvases || canvases.length === 0) {
        throw new Error("至少需要一个 Canvas");
    }

    // 1. 并行将所有 Canvas 转换为 PNG Uint8Array
    // 使用 Promise.all 提高性能，避免串行等待
    const pngDataList = await Promise.all(
        canvases.map(async (canvas) => {
            const blob = await new Promise(resolve => canvas.toBlob(resolve, 'image/png'));
            if (!blob) throw new Error("Canvas 转换 Blob 失败");
            const buffer = await blob.arrayBuffer();
            return {
                width: canvas.width,
                height: canvas.height,
                data: new Uint8Array(buffer)
            };
        })
    );

    // 2. 计算文件结构大小
    const imageCount = pngDataList.length;
    const headerSize = 6; // ICONDIR 固定 6 字节
    const entrySize = 16; // 每个 ICONDIRENTRY 固定 16 字节
    const directorySize = headerSize + (imageCount * entrySize);
    console.log(imageCount);

    // 计算总文件大小并预分配 ArrayBuffer
    let totalSize = directorySize;
    pngDataList.forEach(img => {
        totalSize += img.data.length;
    });

    const buffer = new ArrayBuffer(totalSize);
    const view = new DataView(buffer);
    let currentOffset = directorySize; // 当前写入数据的偏移量指针

    // 3. 写入 ICONDIR (文件头)
    view.setUint16(0, 0, true);       // idReserved: 必须为 0
    view.setUint16(2, 1, true);       // idType: 1 为 ICO, 2 为 CUR
    view.setUint16(4, imageCount, true); // idCount: 图像数量

    // 4. 写入 ICONDIRENTRY (目录项) 和 图像数据
    for (let i = 0; i < imageCount; i++) {
        const img = pngDataList[i];
        const entryOffset = headerSize + (i * entrySize);

        // --- 写入目录项 (16 bytes) ---

        // 宽度: 0 表示 256px, 其他表示实际像素
        view.setUint8(entryOffset + 0, img.width >= 256 ? 0 : img.width);

        // 高度: 0 表示 256px, 其他表示实际像素
        view.setUint8(entryOffset + 1, img.height >= 256 ? 0 : img.height);

        view.setUint8(entryOffset + 2, 0);      // bColorCount: 0 (PNG 无调色板)
        view.setUint8(entryOffset + 3, 0);      // bReserved: 保留位

        view.setUint16(entryOffset + 4, 1, true);  // wPlanes: 色彩平面数，固定 1
        view.setUint16(entryOffset + 6, 32, true); // wBitCount: 色深，PNG 通常为 32 (RGBA)

        view.setUint32(entryOffset + 8, img.data.length, true); // dwBytesInRes: 图像数据大小
        view.setUint32(entryOffset + 12, currentOffset, true);  // dwImageOffset: 数据起始偏移量

        // --- 写入图像数据 ---
        // 将 PNG 二进制数据复制到 Buffer 的指定偏移位置
        new Uint8Array(buffer, currentOffset).set(img.data);

        // 更新下一个图像的偏移量
        currentOffset += img.data.length;
    }

    // 5. 返回 Blob
    return new Blob([buffer], { type: 'image/x-icon' });
}


function triggerDownload(blob, filename) {
    const a = document.createElement('a');
    a.href = URL.createObjectURL(blob);
    a.download = filename;
    a.click();
    setTimeout(() => URL.revokeObjectURL(a.href), 1000);
}


/**
 * 获取 SVG 内容的实际几何包围盒（不受 CSS 缩放/transform 影响，返回用户坐标系的 x, y, width, height）
 * @param {string | SVGSVGElement} svgInput
 * @returns {{ x: number, y: number, width: number, height: number } | null}
 */
function getSvgContentBBox(svgInput) {
    const container = document.createElement('div');
    container.style.cssText =
        'position:fixed;left:-9999px;top:-9999px;visibility:hidden;pointer-events:none;';

    let svgEl;
    if (typeof svgInput === 'string') {
        container.innerHTML = svgInput;
        svgEl = container.querySelector('svg');
    } else if (svgInput instanceof SVGElement) {
        svgEl = svgInput.tagName.toLowerCase() === 'svg' ? svgInput.cloneNode(true) : svgInput.closest('svg');
        if (svgEl) container.appendChild(svgEl);
    }

    if (!svgEl) return null;

    document.body.appendChild(container);
    try {
        // 返回 DOMRect 对象：{ x, y, width, height }
        const { x, y, width: w, height: h } = svgEl.getBBox();
        return {
            x: parseFloat(x.toFixed(2)),
            y: parseFloat(y.toFixed(2)),
            width: parseFloat(w.toFixed(2)),
            height: parseFloat(h.toFixed(2))
        };
    } catch (err) {
        // 例如空 SVG 或包含无法计算几何框的节点时可能抛错
        console.warn('getBBox 调用失败:', err);
        return null;
    } finally {
        container.remove();
    }
}



/**
 * 将 SVG 字符串转换为 PNG / JPG / ICO 并触发下载
 * @param {string} svgString - 原始或经过 SVGO 压缩的 SVG 代码
 * @param {'png'|'jpeg'|'ico'} format - 目标格式
 * @param {number} size - 目标尺寸（宽高，如 32, 64, 256, 512）
 */
async function exportSvgToRaster(svgString, format = 'png', size = 256) {
    // 1. 确保 SVG 根节点带有明确的宽高，否则部分浏览器 Canvas 绘制时可能尺寸异常
    const parser = new DOMParser();
    const doc = parser.parseFromString(svgString, 'image/svg+xml');
    const svgEl = doc.querySelector('svg');
    if (!svgEl) throw new Error('无效的 SVG 代码');

    svgEl.setAttribute('width', size);
    svgEl.setAttribute('height', size);
    const finalSvg = new XMLSerializer().serializeToString(svgEl);

    // 2. 创建 Blob 与 Image
    const svgBlob = new Blob([finalSvg], { type: 'image/svg+xml;charset=utf-8' });
    const url = URL.createObjectURL(svgBlob);

    const img = new Image();
    await new Promise((resolve, reject) => {
        img.onload = resolve;
        img.onerror = reject;
        img.src = url;
    });

    // 3. 绘制到 Canvas
    const canvas = document.createElement('canvas');
    canvas.width = size;
    canvas.height = size;
    const ctx = canvas.getContext('2d');

    // JPG 不支持透明，必须填充白色背景
    if (format === 'jpeg') {
        ctx.fillStyle = '#ffffff';
        ctx.fillRect(0, 0, size, size);
    }

    ctx.drawImage(img, 0, 0, size, size);
    URL.revokeObjectURL(url);

    // 4. 导出与下载
    // if (format === 'ico') {
    //     // 限制 ICO 单个图像最大尺寸为 256x256（ICO 规范限制，256 在头信息中记为 0）
    //     const icoBlob = await canvasToIcoBlob(canvas);
    //     triggerDownload(icoBlob, `icon-${size}x${size}.ico`);
    // } else {
    //     const mimeType = format === 'jpeg' ? 'image/jpeg' : 'image/png';
    //     canvas.toBlob((blob) => {
    //         triggerDownload(blob, `image-${size}x${size}.${format === 'jpeg' ? 'jpg' : 'png'}`);
    //     }, mimeType, 0.92);
    // }
}

/**
 * 将 Canvas 封装为标准 Windows ICO 格式 (内嵌 PNG 帧)
 */
async function canvasToIcoBlob(canvas) {
    const pngBlob = await new Promise(resolve => canvas.toBlob(resolve, 'image/png'));
    const pngBuffer = await pngBlob.arrayBuffer();
    const pngBytes = new Uint8Array(pngBuffer);

    // 6 字节 ICONDIR + 16 字节 ICONDIRENTRY = 22 字节文件头
    const header = new ArrayBuffer(22);
    const view = new DataView(header);

    // ICONDIR
    view.setUint16(0, 0, true); // 保留位，必须为 0
    view.setUint16(2, 1, true); // 类型：1 代表 ICO，2 代表 CUR
    view.setUint16(4, 1, true); // 包含的图像数量：1 张

    // ICONDIRENTRY
    const width = canvas.width >= 256 ? 0 : canvas.width;
    const height = canvas.height >= 256 ? 0 : canvas.height;
    view.setUint8(6, width);              // 宽度 (0 表示 256px)
    view.setUint8(7, height);             // 高度 (0 表示 256px)
    view.setUint8(8, 0);                  // 调色板颜色数 (PNG 填 0)
    view.setUint8(9, 0);                  // 保留位
    view.setUint16(10, 1, true);          // 色彩平面数
    view.setUint16(12, 32, true);         // 色深 (32位 RGBA)
    view.setUint32(14, pngBytes.length, true); // 图像数据大小（字节）
    view.setUint32(18, 22, true);         // 图像数据起始偏移量

    return new Blob([header, pngBytes], { type: 'image/x-icon' });
}

function triggerDownload(blob, filename) {
    const a = document.createElement('a');
    a.href = URL.createObjectURL(blob);
    a.download = filename;
    a.click();
    setTimeout(() => URL.revokeObjectURL(a.href), 1000);
}