// 直接加载官方完整版 SVGO 浏览器模块
import { optimize, VERSION } from './svgo.browser.js';
/**
 * 将单个 SVG path 的 d 字符串全部转换为绝对坐标（大写指令）
 */
function pathToAbsolute(d) {
    const tokens = d.match(/[a-zA-Z]|[-+]?(?:\d*\.\d+|\d+\.?)(?:[eE][-+]?\d+)?/g);
    if (!tokens) return d;

    let i = 0;
    let cmd = '';
    let x = 0, y = 0;       // 当前点绝对坐标
    let startX = 0, startY = 0; // 当前子路径起点（用于 Z 闭合）
    const out = [];

    const nextNum = () => parseFloat(tokens[i++]);
    const fmt = (n) => Number(n.toFixed(4)); // 防止浮点精度漂移，后续 SVGO 会再按 floatPrecision 截断

    while (i < tokens.length) {
        if (/^[a-zA-Z]$/.test(tokens[i])) {
            cmd = tokens[i++];
        } else {
            // 处理省略指令符的隐式重复坐标（M 后的隐式坐标按 L/l 处理）
            if (cmd === 'M') cmd = 'L';
            else if (cmd === 'm') cmd = 'l';
        }

        const isRel = cmd === cmd.toLowerCase();
        const upper = cmd.toUpperCase();

        switch (upper) {
            case 'M': {
                const nx = nextNum() + (isRel ? x : 0);
                const ny = nextNum() + (isRel ? y : 0);
                x = startX = nx;
                y = startY = ny;
                out.push(`M${fmt(x)} ${fmt(y)}`);
                break;
            }
            case 'L': {
                const nx = nextNum() + (isRel ? x : 0);
                const ny = nextNum() + (isRel ? y : 0);
                x = nx; y = ny;
                out.push(`L${fmt(x)} ${fmt(y)}`);
                break;
            }
            case 'H': {
                const nx = nextNum() + (isRel ? x : 0);
                x = nx;
                // out.push(`H${fmt(x)}`);
                out.push(`L${fmt(x)} ${fmt(y)}`);
                break;
            }
            case 'V': {
                const ny = nextNum() + (isRel ? y : 0);
                y = ny;
                // out.push(`V${fmt(y)}`);
                out.push(`L${fmt(x)} ${fmt(y)}`);
                break;
            }
            case 'C': {
                const x1 = nextNum() + (isRel ? x : 0);
                const y1 = nextNum() + (isRel ? y : 0);
                const x2 = nextNum() + (isRel ? x : 0);
                const y2 = nextNum() + (isRel ? y : 0);
                const nx = nextNum() + (isRel ? x : 0);
                const ny = nextNum() + (isRel ? y : 0);
                x = nx; y = ny;
                out.push(`C${fmt(x1)} ${fmt(y1)} ${fmt(x2)} ${fmt(y2)} ${fmt(x)} ${fmt(y)}`);
                break;
            }
            case 'S': {
                const x2 = nextNum() + (isRel ? x : 0);
                const y2 = nextNum() + (isRel ? y : 0);
                const nx = nextNum() + (isRel ? x : 0);
                const ny = nextNum() + (isRel ? y : 0);
                x = nx; y = ny;
                out.push(`S${fmt(x2)} ${fmt(y2)} ${fmt(x)} ${fmt(y)}`);
                break;
            }
            case 'Q': {
                const x1 = nextNum() + (isRel ? x : 0);
                const y1 = nextNum() + (isRel ? y : 0);
                const nx = nextNum() + (isRel ? x : 0);
                const ny = nextNum() + (isRel ? y : 0);
                x = nx; y = ny;
                out.push(`Q${fmt(x1)} ${fmt(y1)} ${fmt(x)} ${fmt(y)}`);
                break;
            }
            case 'T': {
                const nx = nextNum() + (isRel ? x : 0);
                const ny = nextNum() + (isRel ? y : 0);
                x = nx; y = ny;
                out.push(`T${fmt(x)} ${fmt(y)}`);
                break;
            }
            case 'A': {
                const rx = nextNum();
                const ry = nextNum();
                const rot = nextNum();
                const largeArc = nextNum();
                const sweep = nextNum();
                const nx = nextNum() + (isRel ? x : 0);
                const ny = nextNum() + (isRel ? y : 0);
                x = nx; y = ny;
                out.push(`A${fmt(rx)} ${fmt(ry)} ${fmt(rot)} ${largeArc} ${sweep} ${fmt(x)} ${fmt(y)}`);
                break;
            }
            case 'Z': {
                x = startX;
                y = startY;
                out.push('Z');
                break;
            }
        }
    }

    return out.join('');
}

// 自定义 SVGO 插件：在所有优化完成后，将 path 强制转为绝对坐标
const forceAbsolutePathPlugin = {
    name: 'forceAbsolutePath',
    fn: () => ({
        element: {
            enter: (node) => {
                if (node.name === 'path' && node.attributes.d) {
                    node.attributes.d = pathToAbsolute(node.attributes.d);
                }
            },
        },
    }),
};
const cleanPathUselessAttrs = {
    name: 'cleanPathUselessAttrs',
    fn: () => ({
        element: {
            enter: (node) => {
                if (node.name !== 'path') return;

                for (const attrName of Object.keys(node.attributes)) {
                    if (
                        attrName.startsWith('font') ||
                        attrName.startsWith('paint') ||
                        attrName === 'letter-spacing' ||
                        attrName === 'word-spacing' ||
                        attrName === 'text-anchor'
                    ) {
                        delete node.attributes[attrName];
                    }
                }
            },
        },
    }),
};


const statusEl = document.getElementById('engineStatus');
statusEl.innerHTML = `SVGO v${VERSION} 引擎就绪`;
statusEl.innerHTML += '<a href="https://github.com/svg/svgo" target="_blank"><img width="20" src="github.svg"></img></a>';
statusEl.classList.add('ready');

const inputCode = document.getElementById('inputCode');
const outputCode = document.getElementById('outputCode');
const previewBox = document.getElementById('previewBox');
const dropZone = document.getElementById('dropZone');
const fileInput = document.getElementById('fileInput');

var currentTab = 'code';
var uploadedFiles = [];
var svg_source = '';
var svg_output = '';
var svg_view = {};
var filename = '';
function runSvgo(rawSvg) {
    if (!rawSvg || !rawSvg.trim()) return '';
    const floatPrecision = Number(document.getElementById('optPrecision').value);
    const multipass = document.getElementById('optMultipass').checked;
    const mergePaths = document.getElementById('optMergePaths').checked;
    const removeFill = document.getElementById('optRemoveFill').checked;
    const removeStyle = document.getElementById('optRemoveStyle').checked;
    const absolutePath = document.getElementById('optAbsolutePath').checked;
    const shapToPath = document.getElementById('optShapToPath').checked;
    const cleanIds = document.getElementById('optClenIds').checked;
    //optShapToPath
    const plugins = [
        {
            name: 'preset-default',
            params: {
                overrides: {
                    cleanupNumericValues: { floatPrecision },
                    convertPathData: {
                        floatPrecision,
                        smartCollapse: false,
                        lineShorthands: true,
                    },
                    convertTransform: { floatPrecision },
                    mergePaths: mergePaths ? { force: true, floatPrecision } : false,
                    inlineStyles: { onlyMatchedOnce: false },
                    //转换形状为路径
                    convertShapeToPath: shapToPath ? {
                        floatPrecision,
                        convertArcs: true,
                        convertEllipses: true,
                        convertCircles: true,
                        convertLines: true,
                        convertRects: true,
                    } : false,
                    cleanupIds: cleanIds,

                }
            }
        },

        // 将 width/height 转为 viewBox 进一步精简
        'removeDimensions',
        'convertStyleToAttrs',
        'collapseGroups',
        'moveGroupAttrsToElems',
        // 'moveElemsAttrsToGroup',
        'removeStyleElement',
        cleanPathUselessAttrs,
    ];

    if (removeFill) {
        plugins.push({
            name: 'removeAttrs',
            params: { attrs: 'fill' }
        });
    }
    if (removeStyle) {
        plugins.push({
            name: 'removeAttrs',
            params: { attrs: 'style' }
        });
    }

    if (absolutePath) {
        plugins.push(forceAbsolutePathPlugin);
    }

    try {
        const result = optimize(rawSvg, { multipass, plugins });
        return result.data;
    } catch (err) {
        return `/* SVG 解析失败: ${err.message} */`;
    }
}

function buildSprites(files) {
    const symbols = files.map((file, idx) => {
        const optimized = runSvgo(file.content);
        const doc = new DOMParser().parseFromString(optimized, 'image/svg+xml');
        const svg = doc.querySelector('svg');
        if (!svg) return '';
        const id = file.name.replace(/\.svg$/i, '') || `icon-${idx}`;
        const viewBox = svg.getAttribute('viewBox') || '0 0 24 24';
        return `<symbol id="${id}" viewBox="${viewBox}">${svg.innerHTML}</symbol>`;
    }).join('');
    return `<svg xmlns="http://www.w3.org/2000/svg" style="display:none">${symbols}</svg>`;
}

function svgToCssUrl(svg) {
    const encoded = svg
        .replace(/"/g, "'")
        .replace(/%/g, '%25')
        .replace(/#/g, '%23')
        .replace(/{/g, '%7B')
        .replace(/}/g, '%7D')
        .replace(/</g, '%3C')
        .replace(/>/g, '%3E');
    return `url("data:image/svg+xml,${encoded}")`;
}
function formatViewBox(bbox) {
    if (!bbox) return null;
    const round = (num) => Number(Number(num).toFixed(2));
    const x = round(bbox.x ?? 0);
    const y = round(bbox.y ?? 0);
    const width = round(bbox.width);
    const height = round(bbox.height);

    if (!(width > 0) || !(height > 0)) return null;
    return `${x} ${y} ${width} ${height}`;
}
function process() {
    const isSprite = document.getElementById('optMergeSprite').checked && uploadedFiles.length > 0;
    const raw = inputCode.value;
    svg_source = raw;
    svg_view = getSvgContentBBox(raw);

    // 1. 仅当缺少 viewBox 时，通过 getSvgContentBBox 计算并写入
    const hasViewBox = /<svg\b[^>]*\bviewBox\s*=/i.test(raw);
    if (!hasViewBox) {
        const viewBox = formatViewBox(svg_view);
        if (viewBox) {
            svg_source = raw.replace(
                /<svg\b([^>]*)>/i,
                (_, attrs) => `<svg${attrs} viewBox="${viewBox}">`
            );
        }
    }

    const compressed = isSprite ? buildSprites(uploadedFiles) : runSvgo(svg_source);

    const origBytes = new Blob([svg_source]).size;
    const compBytes = new Blob([compressed]).size;
    const saved = origBytes - compBytes;
    const ratio = origBytes > 0 ? ((saved / origBytes) * 100).toFixed(1) : 0;

    //字节转为K字节
    const origBytesK = (origBytes / 1024).toFixed(1);
    const compBytesK = (compBytes / 1024).toFixed(1);
    const savedK = (saved / 1024).toFixed(1);

    document.getElementById('origSize').textContent = `原始大小: ${origBytesK} KB`;
    document.getElementById('compSize').innerHTML = origBytes > 0
        ? `压缩后: ${compBytesK} KB <span class="highlight">(节省 ${savedK} KB / ${ratio}%)</span>`
        : `压缩后: 0 B`;

    if (currentTab === 'preview') {
        outputCode.classList.add('hidden');
        previewBox.classList.remove('hidden');
        previewBox.innerHTML = compressed;
    } else {
        previewBox.classList.add('hidden');
        outputCode.classList.remove('hidden');
        if (currentTab === 'code') {
            outputCode.value = compressed;
        } else if (currentTab === 'base64') {
            outputCode.value = compressed ? `data:image/svg+xml;base64,${btoa(unescape(encodeURIComponent(compressed)))}` : '';
        } else if (currentTab === 'css') {
            outputCode.value = compressed ? svgToCssUrl(compressed) : '';
        }
    }
    svg_output = compressed;

}

// 事件监听
inputCode.addEventListener('input', () => { uploadedFiles = []; process(); });
document.querySelectorAll('.options input, .options select').forEach(el => el.addEventListener('change', process));

document.querySelectorAll('.tab-btn').forEach(btn => {
    btn.addEventListener('click', () => {
        document.querySelectorAll('.tab-btn').forEach(b => b.classList.remove('active'));
        btn.classList.add('active');
        currentTab = btn.dataset.tab;
        process();
    });
});

// dropZone.addEventListener('dragover', e => { e.preventDefault(); dropZone.classList.add('dragover'); });
// dropZone.addEventListener('dragleave', () => dropZone.classList.remove('dragover'));
// dropZone.addEventListener('drop', e => {
//     e.preventDefault();
//     dropZone.classList.remove('dragover');
//     handleFiles(e.dataTransfer.files);
// });
const workspace = document.querySelector('.container');
workspace.addEventListener('dragover', e => {
    e.preventDefault(); dropZone.classList.add('dragover');
});
workspace.addEventListener('dragleave', () => dropZone.classList.remove('dragover'));
workspace.addEventListener('drop', e => {
    e.preventDefault();
    dropZone.classList.remove('dragover');
    handleFiles(e.dataTransfer.files);
});

document.getElementById('uploadBtn').addEventListener('click', () => fileInput.click());
fileInput.addEventListener('change', e => handleFiles(e.target.files));

async function handleFiles(fileList) {
    const svgFiles = Array.from(fileList).filter(f => f.name.endsWith('.svg'));
    if (!svgFiles.length) return;
    uploadedFiles = await Promise.all(svgFiles.map(async f => ({
        name: f.name,
        content: await f.text()
    })));
    dropZone.innerHTML = uploadedFiles.map(f => f.name).join(', ');
    inputCode.value = uploadedFiles.map(f => f.content).join('\n\n');
    filename = uploadedFiles[0].name.slice(0, -4);
    if (uploadedFiles.length > 1) {
        filename += `_等${uploadedFiles.length}个文件`;
        document.getElementById('optMergeSprite').checked = true;
    }
    process();
    document.getElementById('convertBtn').disabled = false;
}

document.getElementById('copyBtn').addEventListener('click', () => {
    navigator.clipboard.writeText(outputCode.value);
    const btn = document.getElementById('copyBtn');
    btn.textContent = '已复制 ✓';
    setTimeout(() => btn.textContent = '复制结果', 1500);
});

document.getElementById('downloadBtn').addEventListener('click', () => {
    const content = currentTab === 'code' ? outputCode.value : runSvgo(inputCode.value);
    if (!content) return;
    const blob = new Blob([content], { type: 'image/svg+xml' });
    const a = document.createElement('a');
    a.href = URL.createObjectURL(blob);
    a.download = `${filename}_optimized.svg`;
    a.click();
});
//===============================================================================================



/* ================= SVG 转换导出（弹窗） ================= */
document.getElementById('convertBtn').addEventListener('click', () => openConvertModal('png'));
document.getElementById('convertModalClose').addEventListener('click', closeConvertModal);
document.getElementById('convertCancelBtn').addEventListener('click', closeConvertModal);

const convertModal = document.getElementById('convertModal');
const convertPreviewCanvas = document.getElementById('convertPreviewCanvas');
const convertFormat = document.getElementById('convertFormat');
const convertWidth = document.getElementById('convertWidth');
const convertHeight = document.getElementById('convertHeight');
const convertLockRatio = document.getElementById('convertLockRatio');
const convertNote = document.getElementById('convertNote');
const convertSizeNote = document.getElementById('convertSizeNote');
const convertConfirmBtn = document.getElementById('convertConfirmBtn');
const convertResetBtn = document.getElementById('convertResetBtn');
const ICO_MAX_SIZE = 256;
const RASTER_MAX_SIZE = 4096;
var convertPreviewTimer = null;
var CANVAS = null;
function openConvertModal(format = 'png') {
    convertFormat.value = format;
    convertWidth.value = Math.max(100, Math.round(svg_view.width));
    convertHeight.value = Math.max(100, Math.round(svg_view.height));

    if (format === 'ico') {
        const size = Math.min(ICO_MAX_SIZE, convertWidth.value);
        convertWidth.value = size;
        convertHeight.value = size;
    }

    convertModal.classList.remove('hidden');
    updateConvertNote();
    renderConvertPreview();
}

function closeConvertModal() {
    convertModal.classList.add('hidden');
}



function readSizeInput(value) {
    const num = Math.round(Number(value));
    return Number.isFinite(num) && num > 0 ? num : 1;
}

function clampConvertSize(value, format) {
    const max = format === 'ico' ? ICO_MAX_SIZE : RASTER_MAX_SIZE;
    return Math.min(max, readSizeInput(value));
}

/**
 * 将 SVG 按指定尺寸绘制到 Canvas
 * @param {string} svgString - SVG 代码
 * @param {number} width - 输出宽度
 * @param {number} height - 输出高度
 * @param {string|null} background - 背景色（JPG 需要白底）
 * @returns {Promise<HTMLCanvasElement>}
 */
async function renderSvgToCanvas(svgString, width, height, format = 'png') {
    // 1. 确保 SVG 根节点带有明确的宽高，否则部分浏览器 Canvas 绘制时可能尺寸异常
    const parser = new DOMParser();
    const doc = parser.parseFromString(svgString, 'image/svg+xml');
    const svgEl = doc.querySelector('svg');
    if (!svgEl) {
        throw new Error('无效的 SVG 代码');
    }

    svgEl.setAttribute('width', width);
    svgEl.setAttribute('height', height);
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
    canvas.width = width;
    canvas.height = height;
    const ctx = canvas.getContext('2d');

    // JPG 不支持透明，必须填充白色背景
    if (format === 'jpeg') {
        ctx.fillStyle = '#ffffff';
        ctx.fillRect(0, 0, width, height);
    }

    ctx.drawImage(img, 0, 0, width, height);
    URL.revokeObjectURL(url);

    //返回 Canvas 下载大小
    const mimeType = format === 'jpeg' ? 'image/jpeg' : 'image/png';
    canvas.toBlob((blob) => {
        const blob_size = (blob.size / 1024).toFixed(1);
        convertSizeNote.textContent = ` ${blob_size} KB`;
    }, mimeType, 0.92);
    // console.log(size);

    return canvas;
}

function getConvertSize() {
    const format = convertFormat.value;
    return {
        format,
        width: clampConvertSize(convertWidth.value, format),
        height: clampConvertSize(convertHeight.value, format)
    };
}

function updateConvertNote() {
    const { format, width, height } = getConvertSize();
    const tips = [
        `原始尺寸 ${Math.round(svg_view.width)} × ${Math.round(svg_view.height)}`,
        `输出 ${width} × ${height}px`
    ];
    if (format === 'ico') tips.push('ICO 单帧最大 256 × 256，超出会自动缩小');
    if (format === 'jpeg') tips.push('JPG 不支持透明背景，已自动填充白色');
    convertNote.textContent = tips.join(' · ');
}

async function renderConvertPreview() {
    const { format, width, height } = getConvertSize();
    CANVAS = await renderSvgToCanvas(svg_output, width, height, format);
    convertPreviewCanvas.width = width;
    convertPreviewCanvas.height = height;
    convertPreviewCanvas.getContext('2d').drawImage(CANVAS, 0, 0);
}

function scheduleConvertPreview() {
    clearTimeout(convertPreviewTimer);
    convertPreviewTimer = setTimeout(renderConvertPreview, 120);
}


async function confirmConvert() {
    // 4. 导出与下载
    const { format, width, height } = getConvertSize();

    if (format === 'ico') {
        // 限制 ICO 单个图像最大尺寸为 256x256（ICO 规范限制，256 在头信息中记为 0）
        const icoBlob = await canvasToIcoBlob(CANVAS);
        triggerDownload(icoBlob, `${filename}-${width}x${height}.ico`);
    } else {
        const mimeType = format === 'jpeg' ? 'image/jpeg' : 'image/png';
        CANVAS.toBlob((blob) => {
            triggerDownload(blob, `${filename}-${width}x${height}.${format === 'jpeg' ? 'jpg' : 'png'}`);
        }, mimeType, 0.92);
    }
}

convertModal.addEventListener('click', (e) => {
    if (e.target === convertModal) closeConvertModal();
});
document.addEventListener('keydown', (e) => {
    if (e.key === 'Escape' && !convertModal.classList.contains('hidden')) closeConvertModal();
});
convertConfirmBtn.addEventListener('click', confirmConvert);
convertResetBtn.addEventListener('click', () => {
    convertWidth.value = Math.round(svg_view.width);
    convertHeight.value = Math.round(svg_view.height);
    convertLockRatio.checked = true;
    updateConvertNote();
    scheduleConvertPreview();
});

convertFormat.addEventListener('change', () => {
    if (convertFormat.value === 'ico') {
        const w = readSizeInput(convertWidth.value);
        const h = readSizeInput(convertHeight.value);
        var size = Math.max(w, h);
        size = size > ICO_MAX_SIZE ? ICO_MAX_SIZE : size;
        convertLockRatio.checked = true;
        convertLockRatio.disabled = true;
        convertWidth.value = size;
        convertHeight.value = size;
    } else {
        convertLockRatio.disabled = false;
    }
    updateConvertNote();
    scheduleConvertPreview();
});

convertWidth.addEventListener('input', () => {
    const w = Number(convertWidth.value);
    if (convertFormat.value === 'ico') {
        convertWidth.value = Math.min(w, ICO_MAX_SIZE);
    }
    if (convertLockRatio.checked) {
        if (Number.isFinite(w) && w > 0) {
            convertHeight.value = convertPreviewCanvas.height * convertWidth.value / convertPreviewCanvas.width;
        }
    }
    updateConvertNote();
    scheduleConvertPreview();
});

convertHeight.addEventListener('input', () => {
    const h = Number(convertHeight.value);
    if (convertFormat.value === 'ico') {
        convertHeight.value = Math.min(h, ICO_MAX_SIZE);
    }
    if (convertLockRatio.checked) {
        if (Number.isFinite(h) && h > 0) {
            convertWidth.value = convertPreviewCanvas.width * convertHeight.value / convertPreviewCanvas.height;
        }
    }
    updateConvertNote();
    scheduleConvertPreview();
});
// 锁定比例时，自动调整高度或宽度
// convertLockRatio.addEventListener('change', () => {
//     convertRatio = 1;
// });



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