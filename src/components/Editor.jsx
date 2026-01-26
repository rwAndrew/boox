import React, { useState, useRef, useEffect, useLayoutEffect } from 'react';
import './Editor.css';

const TEMPLATE_SIZE = { w: 1080, h: 1350 };

const Editor = ({ templateType, onBack }) => {
    const templateSrc = templateType === 'breaking' ? '/BREAKING_NEWS.png' : '/Quotes.png';

    // Core State (In Canvas Pixels)
    const [bgImage, setBgImage] = useState(null);
    const [bgPosition, setBgPosition] = useState({ x: 0, y: 0, scale: 1 });
    const [texts, setTexts] = useState([]);

    // UI State
    const [previewScale, setPreviewScale] = useState(0.5);
    const containerRef = useRef(null);
    const viewportRef = useRef(null);
    const isDragging = useRef(false);
    const lastPos = useRef({ x: 0, y: 0 });

    // Initialize Default Text
    useEffect(() => {
        if (templateType === 'breaking') {
            setTexts([
                { id: 1, text: "在此輸入標題...", x: 540, y: 1120, fontSize: 80, align: 'center' }
            ]);
        } else {
            setTexts([
                { id: 1, text: "在這裡輸入名言...", x: 540, y: 560, fontSize: 70, align: 'center' }
            ]);
        }
    }, [templateType]);

    // Auto-scale preview to fit screen
    useLayoutEffect(() => {
        const updateScale = () => {
            if (!containerRef.current) return;
            const container = containerRef.current;
            const availableW = container.clientWidth - 40;
            const availableH = container.clientHeight - 40;

            const scaleW = availableW / TEMPLATE_SIZE.w;
            const scaleH = availableH / TEMPLATE_SIZE.h;

            setPreviewScale(Math.min(scaleW, scaleH, 1));
        };

        const timer = setTimeout(updateScale, 100);
        window.addEventListener('resize', updateScale);
        return () => {
            window.removeEventListener('resize', updateScale);
            clearTimeout(timer);
        };
    }, []);

    // Image Upload
    const handleImageUpload = (e) => {
        const file = e.target.files[0];
        if (file) {
            const url = URL.createObjectURL(file);
            const img = new Image();
            img.onload = () => {
                // Auto center and cover
                const scale = Math.max(TEMPLATE_SIZE.w / img.width, TEMPLATE_SIZE.h / img.height);
                setBgImage(url);
                setBgPosition({ x: 0, y: 0, scale: scale });
            };
            img.src = url;
        }
    };

    // Unified Drag & Zoom Logic
    const lastTouchDistance = useRef(null);

    const handleStart = (cx, cy, touchCount = 1, distance = null) => {
        isDragging.current = true;
        lastPos.current = { x: cx, y: cy };
        lastTouchDistance.current = distance;
    };

    const handleMove = (cx, cy, touchCount = 1, distance = null) => {
        if (!isDragging.current || !bgImage) return;

        // Handle Zoom (Pinch)
        if (touchCount === 2 && distance && lastTouchDistance.current) {
            const zoomFactor = distance / lastTouchDistance.current;
            setBgPosition(prev => ({
                ...prev,
                scale: Math.max(0.05, Math.min(20, prev.scale * zoomFactor))
            }));
            lastTouchDistance.current = distance;
            return;
        }

        // Handle Drag
        const dx = (cx - lastPos.current.x) / previewScale;
        const dy = (cy - lastPos.current.y) / previewScale;

        lastPos.current = { x: cx, y: cy };

        setBgPosition(prev => ({
            ...prev,
            x: prev.x + dx,
            y: prev.y + dy
        }));
    };

    const handleEnd = () => {
        isDragging.current = false;
        lastTouchDistance.current = null;
    };

    // Touch Event Mapping
    const getTouchInfo = (e) => {
        const touches = e.touches;
        if (touches.length >= 2) {
            const dx = touches[0].clientX - touches[1].clientX;
            const dy = touches[0].clientY - touches[1].clientY;
            const distance = Math.sqrt(dx * dx + dy * dy);
            const centerX = (touches[0].clientX + touches[1].clientX) / 2;
            const centerY = (touches[0].clientY + touches[1].clientY) / 2;
            return { x: centerX, y: centerY, count: 2, distance };
        } else if (touches.length === 1) {
            return { x: touches[0].clientX, y: touches[0].clientY, count: 1, distance: null };
        }
        return null;
    };

    const onTouchStart = (e) => {
        // Prevent default only if not interacting with controls
        if (e.target.closest('.canvas-viewport')) {
            const info = getTouchInfo(e);
            if (info) handleStart(info.x, info.y, info.count, info.distance);
        }
    };

    const onTouchMove = (e) => {
        if (isDragging.current) {
            if (e.cancelable) e.preventDefault(); // CRITICAL for mobile drag
            const info = getTouchInfo(e);
            if (info) handleMove(info.x, info.y, info.count, info.distance);
        }
    };

    const fileInputRef = useRef(null);

    const wrapText = (ctx, text, x, y, maxWidth, lineHeight) => {
        const paragraphs = text.split('\n');
        let currentY = y;

        paragraphs.forEach(paragraph => {
            let line = '';
            for (let n = 0; n < paragraph.length; n++) {
                let testLine = line + paragraph[n];
                let metrics = ctx.measureText(testLine);
                let testWidth = metrics.width;
                if (testWidth > maxWidth && n > 0) {
                    ctx.fillText(line, x, currentY);
                    line = paragraph[n];
                    currentY += lineHeight;
                } else {
                    line = testLine;
                }
            }
            ctx.fillText(line, x, currentY);
            currentY += lineHeight;
        });
    };

    const handleDownload = async () => {
        const canvas = document.createElement('canvas');
        canvas.width = TEMPLATE_SIZE.w;
        canvas.height = TEMPLATE_SIZE.h;
        const ctx = canvas.getContext('2d');

        // Fill background black first
        ctx.fillStyle = "#000";
        ctx.fillRect(0, 0, canvas.width, canvas.height);

        // 1. Bg Image
        if (bgImage) {
            const img = new Image();
            img.src = bgImage;
            await new Promise((resolve) => {
                img.onload = resolve;
                img.onerror = resolve; // Continue anyway if it fails
            });

            ctx.save();
            ctx.translate(TEMPLATE_SIZE.w / 2 + bgPosition.x, TEMPLATE_SIZE.h / 2 + bgPosition.y);
            ctx.scale(bgPosition.scale, bgPosition.scale);
            ctx.drawImage(img, -img.width / 2, -img.height / 2);
            ctx.restore();
        }

        // 2. Template Overlay
        const tpl = new Image();
        tpl.src = templateSrc;
        await new Promise(r => tpl.onload = r);
        // Draw template slightly larger to avoid gaps
        ctx.drawImage(tpl, -1, -1, TEMPLATE_SIZE.w + 2, TEMPLATE_SIZE.h + 2);

        // 3. Texts
        texts.forEach(t => {
            ctx.save();
            ctx.fillStyle = "white";
            // Ensure font is bold and high res
            ctx.font = `bold ${t.fontSize}px 'SourceHanSansTC', sans-serif`;
            ctx.textAlign = t.align;
            ctx.textBaseline = 'top';

            // Add shadow to match CSS (optional, but makes it look better)
            ctx.shadowColor = 'rgba(0,0,0,0.8)';
            ctx.shadowBlur = 15;
            ctx.shadowOffsetY = 4;

            let drawX = t.x;
            if (t.align === 'center') drawX = 540;
            else if (t.align === 'right') drawX = 1080 * 0.95; // Reasonable margin
            else if (t.align === 'left') drawX = 1080 * 0.05;

            const maxWidth = TEMPLATE_SIZE.w * (t.align === 'center' ? 0.9 : 0.85);
            const lineHeight = t.fontSize * 1.25;

            wrapText(ctx, t.text, drawX, t.y, maxWidth, lineHeight);
            ctx.restore();
        });

        const link = document.createElement('a');
        link.download = `f1-news-${templateType}-${Date.now()}.jpg`;
        link.href = canvas.toDataURL('image/jpeg', 0.92); // Slightly lower to keep file sizes sane but high quality
        link.click();
    };

    return (
        <div className="editor-container" onTouchMove={onTouchMove}>
            {/* Top Area: Canvas Preview */}
            <div className="editor-canvas-area" ref={containerRef}>
                <div
                    className="canvas-viewport"
                    ref={viewportRef}
                    style={{
                        width: TEMPLATE_SIZE.w,
                        height: TEMPLATE_SIZE.h,
                        transform: `scale(${previewScale})`,
                        transformOrigin: 'center center',
                        position: 'absolute'
                    }}
                    onMouseDown={(e) => handleStart(e.clientX, e.clientY)}
                    onMouseMove={(e) => {
                        if (isDragging.current) {
                            handleMove(e.clientX, e.clientY);
                        }
                    }}
                    onMouseUp={handleEnd}
                    onMouseLeave={handleEnd}
                    onTouchStart={onTouchStart}
                    onTouchEnd={handleEnd}
                >
                    {/* Image Layer */}
                    <div className="layer-bg">
                        {bgImage && (
                            <img
                                src={bgImage}
                                style={{
                                    position: 'absolute',
                                    left: '50%', top: '50%',
                                    transform: `translate(-50%, -50%) translate(${bgPosition.x}px, ${bgPosition.y}px) scale(${bgPosition.scale})`,
                                    maxWidth: 'none',
                                    maxHeight: 'none'
                                }}
                                draggable={false}
                            />
                        )}
                    </div>

                    {/* Template Layer */}
                    <img src={templateSrc} className="layer-template" draggable={false} />

                    {/* Text Layers */}
                    {texts.map(t => (
                        <div
                            key={t.id}
                            className="layer-text"
                            style={{
                                left: t.align === 'center' ? '50%' : t.align === 'left' ? '5%' : '95%',
                                top: t.y,
                                fontSize: t.fontSize,
                                textAlign: t.align,
                                transform: t.align === 'center' ? 'translateX(-50%)' :
                                    t.align === 'right' ? 'translateX(-100%)' : 'none',
                                width: t.align === 'center' ? '90%' : '85%',
                                position: 'absolute',
                                whiteSpace: 'pre-wrap',
                                wordBreak: 'break-word',
                                lineHeight: 1.25
                            }}
                        >
                            {t.text}
                        </div>
                    ))}
                </div>
            </div>

            {/* Bottom/Sidebar Controls */}
            <div className="editor-sidebar-wrapper">
                <div className="editor-sidebar">
                    <div className="sidebar-header">
                        <button className="back-btn" onClick={onBack}>&larr; 返回</button>
                        <h3>編輯內容</h3>
                    </div>

                    <div className="control-group">
                        <div className="group-header">
                            <label>背景圖片</label>
                        </div>
                        <button className="glass-btn primary" onClick={() => fileInputRef.current.click()}>
                            <span>📁 上傳圖片</span>
                        </button>
                        <input type="file" hidden ref={fileInputRef} onChange={handleImageUpload} accept="image/*" />

                        <div className="slider-group">
                            <div className="label-wrapper">
                                <label>圖片縮放</label>
                                <span className="value-label">{Math.round(bgPosition.scale * 100)}%</span>
                            </div>
                            <input
                                type="range"
                                min="0.05"
                                max="3"
                                step="0.01"
                                value={bgPosition.scale}
                                onChange={e => setBgPosition({ ...bgPosition, scale: parseFloat(e.target.value) })}
                            />
                        </div>
                    </div>

                    <div className="control-group">
                        <div className="group-header">
                            <label>文字圖層</label>
                            <button className="add-text-btn" onClick={() => setTexts([...texts, { id: Date.now(), text: "新文字", x: 540, y: 540, fontSize: 60, align: 'center' }])}>
                                + 新增
                            </button>
                        </div>

                        {texts.map(t => (
                            <div key={t.id} className="text-card-control">
                                <div className="text-card-row">
                                    <textarea
                                        placeholder="在此輸入文字..."
                                        value={t.text}
                                        onChange={e => setTexts(texts.map(tx => tx.id === t.id ? { ...tx, text: e.target.value } : tx))}
                                    />
                                    <button className="icon-btn delete" onClick={() => setTexts(texts.filter(tx => tx.id !== t.id))}>
                                        ✕
                                    </button>
                                </div>

                                <div className="text-card-sliders">
                                    <div className="slider-item">
                                        <div className="label-wrapper">
                                            <label>大小</label>
                                            <input
                                                type="number"
                                                value={t.fontSize}
                                                onChange={e => setTexts(texts.map(tx => tx.id === t.id ? { ...tx, fontSize: parseInt(e.target.value) || 0 } : tx))}
                                            />
                                        </div>
                                        <input
                                            type="range" min="10" max="300" value={t.fontSize}
                                            onChange={e => setTexts(texts.map(tx => tx.id === t.id ? { ...tx, fontSize: parseInt(e.target.value) } : tx))}
                                        />
                                    </div>
                                    <div className="slider-item">
                                        <div className="label-wrapper">
                                            <label>位置 (Y)</label>
                                            <input
                                                type="number"
                                                value={t.y}
                                                onChange={e => setTexts(texts.map(tx => tx.id === t.id ? { ...tx, y: parseInt(e.target.value) || 0 } : tx))}
                                            />
                                        </div>
                                        <input
                                            type="range" min="0" max={TEMPLATE_SIZE.h} value={t.y}
                                            onChange={e => setTexts(texts.map(tx => tx.id === t.id ? { ...tx, y: parseInt(e.target.value) } : tx))}
                                        />
                                    </div>
                                </div>

                                <div className="align-segmented">
                                    <button className={t.align === 'left' ? 'active' : ''} onClick={() => setTexts(texts.map(tx => tx.id === t.id ? { ...tx, align: 'left' } : tx))}>左</button>
                                    <button className={t.align === 'center' ? 'active' : ''} onClick={() => setTexts(texts.map(tx => tx.id === t.id ? { ...tx, align: 'center' } : tx))}>中</button>
                                    <button className={t.align === 'right' ? 'active' : ''} onClick={() => setTexts(texts.map(tx => tx.id === t.id ? { ...tx, align: 'right' } : tx))}>右</button>
                                </div>
                            </div>
                        ))}
                    </div>
                </div>

                <div className="sidebar-footer">
                    <button className="download-fab" onClick={handleDownload}>
                        <span className="icon">⬇️</span> 下載高品質 JPG
                    </button>
                </div>
            </div>
        </div>
    );
};

export default Editor;
