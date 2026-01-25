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
        setTexts([
            { id: 1, text: "在此輸入標題...", x: 540, y: 1150, fontSize: 80, align: 'center' }
        ]);
    }, []);

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

        updateScale();
        window.addEventListener('resize', updateScale);
        return () => window.removeEventListener('resize', updateScale);
    }, []);

    // Image Upload
    const handleImageUpload = (e) => {
        const file = e.target.files[0];
        if (file) {
            const url = URL.createObjectURL(file);
            setBgImage(url);
            setBgPosition({ x: 0, y: 0, scale: 1 });
        }
    };

    // Unified Drag & Zoom Logic
    const lastTouchDistance = useRef(null);

    const handleStart = (cx, cy, touchCount = 1, distance = null) => {
        if (event?.target?.closest('.precision-input')) return;
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
                scale: Math.max(0.1, Math.min(10, prev.scale * zoomFactor))
            }));
            lastTouchDistance.current = distance;
            // Update lastPos to help prevent "jump" after pinch
            lastPos.current = { x: cx, y: cy };
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
        const info = getTouchInfo(e);
        if (info) handleStart(info.x, info.y, info.count, info.distance);
    };

    const onTouchMove = (e) => {
        const info = getTouchInfo(e);
        if (info) handleMove(info.x, info.y, info.count, info.distance);
    };

    const fileInputRef = useRef(null);

    const handleDownload = async () => {
        const canvas = document.createElement('canvas');
        canvas.width = TEMPLATE_SIZE.w;
        canvas.height = TEMPLATE_SIZE.h;
        const ctx = canvas.getContext('2d');

        // 1. Bg
        if (bgImage) {
            const img = new Image();
            img.src = bgImage;
            await new Promise(r => img.onload = r);
            ctx.save();
            ctx.translate(TEMPLATE_SIZE.w / 2 + bgPosition.x, TEMPLATE_SIZE.h / 2 + bgPosition.y);
            ctx.scale(bgPosition.scale, bgPosition.scale);
            ctx.drawImage(img, -img.width / 2, -img.height / 2);
            ctx.restore();
        } else {
            ctx.fillStyle = "#000";
            ctx.fillRect(0, 0, canvas.width, canvas.height);
        }

        // 2. Template
        const tpl = new Image();
        tpl.src = templateSrc;
        await new Promise(r => tpl.onload = r);
        // Draw template slightly larger (0.5px) to ensure no sub-pixel bleeding at edges
        ctx.drawImage(tpl, -1, -1, TEMPLATE_SIZE.w + 2, TEMPLATE_SIZE.h + 2);

        // 3. Text
        texts.forEach(t => {
            ctx.fillStyle = "white";
            ctx.font = `bold ${t.fontSize}px 'SourceHanSansTC', sans-serif`;
            ctx.textAlign = t.align;
            ctx.textBaseline = 'top';

            let drawX = t.x;
            if (t.align === 'center') drawX = 540; // Force center if requested

            ctx.fillText(t.text, drawX, t.y);
        });

        const link = document.createElement('a');
        link.download = `f1-news-${Date.now()}.jpg`;
        link.href = canvas.toDataURL('image/jpeg', 0.95);
        link.click();
    };

    return (
        <div className="editor-container">
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
                    onMouseMove={(e) => handleMove(e.clientX, e.clientY)}
                    onMouseUp={handleEnd}
                    onMouseLeave={handleEnd}
                    onTouchStart={onTouchStart}
                    onTouchMove={onTouchMove}
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
                                left: t.align === 'center' ? '50%' : t.x,
                                top: t.y,
                                fontSize: t.fontSize,
                                textAlign: t.align,
                                transform: t.align === 'center' ? 'translateX(-50%)' :
                                    t.align === 'right' ? 'translateX(-100%)' : 'none',
                                width: t.align === 'center' ? '90%' : 'auto',
                                position: 'absolute',
                                whiteSpace: 'pre-wrap',
                                wordBreak: 'break-word'
                            }}
                        >
                            {t.text}
                        </div>
                    ))}
                </div>
            </div>

            {/* Bottom Area: Sidebar/Controls */}
            <div className="editor-sidebar">
                <div className="sidebar-header">
                    <button className="back-btn" onClick={onBack}>&larr; 返回</button>
                    <h3>編輯器</h3>
                </div>

                <div className="control-group">
                    <h3>背景圖片 (Background)</h3>
                    <button className="primary-btn" onClick={() => fileInputRef.current.click()}>
                        上傳圖片 (Upload)
                    </button>
                    <input type="file" hidden ref={fileInputRef} onChange={handleImageUpload} accept="image/*" />

                    <div className="slider-group">
                        <div className="label-wrapper">
                            <label>縮放 (Scale)</label>
                            <span className="value-display">{bgPosition.scale.toFixed(2)}</span>
                        </div>
                        <input
                            type="range"
                            min="0.1"
                            max="5"
                            step="0.01"
                            value={bgPosition.scale}
                            onChange={e => setBgPosition({ ...bgPosition, scale: parseFloat(e.target.value) })}
                        />
                    </div>
                </div>

                <div className="control-group">
                    <h3>文字 (Text)</h3>
                    {texts.map(t => (
                        <div key={t.id} className="text-control">
                            <div className="text-header">
                                <textarea
                                    value={t.text}
                                    onChange={e => setTexts(texts.map(tx => tx.id === t.id ? { ...tx, text: e.target.value } : tx))}
                                />
                                <button className="delete-btn" onClick={() => setTexts(texts.filter(tx => tx.id !== t.id))}>🗑️</button>
                            </div>

                            <div className="size-control">
                                <div className="label-wrapper">
                                    <label>大小 (Size)</label>
                                    <input
                                        type="number" className="precision-input" value={t.fontSize}
                                        onChange={e => setTexts(texts.map(tx => tx.id === t.id ? { ...tx, fontSize: parseInt(e.target.value) || 0 } : tx))}
                                    />
                                </div>
                                <input
                                    type="range" min="10" max="300" value={t.fontSize}
                                    onChange={e => setTexts(texts.map(tx => tx.id === t.id ? { ...tx, fontSize: parseInt(e.target.value) } : tx))}
                                />
                            </div>

                            <div className="size-control">
                                <div className="label-wrapper">
                                    <label>位置 (Y)</label>
                                    <input
                                        type="number" className="precision-input" value={t.y}
                                        onChange={e => setTexts(texts.map(tx => tx.id === t.id ? { ...tx, y: parseInt(e.target.value) || 0 } : tx))}
                                    />
                                </div>
                                <input
                                    type="range" min="0" max={TEMPLATE_SIZE.h} value={t.y}
                                    onChange={e => setTexts(texts.map(tx => tx.id === t.id ? { ...tx, y: parseInt(e.target.value) } : tx))}
                                />
                            </div>

                            <div className="align-control">
                                <button className={t.align === 'left' ? 'active' : ''} onClick={() => setTexts(texts.map(tx => tx.id === t.id ? { ...tx, align: 'left' } : tx))}>左</button>
                                <button className={t.align === 'center' ? 'active' : ''} onClick={() => setTexts(texts.map(tx => tx.id === t.id ? { ...tx, align: 'center' } : tx))}>中</button>
                                <button className={t.align === 'right' ? 'active' : ''} onClick={() => setTexts(texts.map(tx => tx.id === t.id ? { ...tx, align: 'right' } : tx))}>右</button>
                            </div>
                        </div>
                    ))}
                    <button className="primary-btn outline" onClick={() => setTexts([...texts, { id: Date.now(), text: "新文字", x: 540, y: 540, fontSize: 60, align: 'center' }])}>
                        + 新增文字
                    </button>
                </div>

                <button className="download-btn" onClick={handleDownload}>
                    下載圖片 (Download)
                </button>
            </div>
        </div>
    );
};

export default Editor;
