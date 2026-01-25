import React, { useState, useRef, useEffect } from 'react';
import './Editor.css';

const TEMPLATE_SIZE = { w: 1080, h: 1350 };

const Editor = ({ templateType, onBack }) => {
    // Assets
    const templateSrc = templateType === 'breaking' ? '/BREAKING_NEWS.png' : '/Quotes.png';

    // State
    const [bgImage, setBgImage] = useState(null); // URL
    const [bgPosition, setBgPosition] = useState({ x: 0, y: 0, scale: 1 });
    const [texts, setTexts] = useState([]); // Array of { id, text, x, y, fontSize, ... }
    const [activeTextId, setActiveTextId] = useState(null);

    // Refs
    const containerRef = useRef(null);
    const fileInputRef = useRef(null);
    const isDragging = useRef(false);
    const lastPos = useRef({ x: 0, y: 0 });

    // Init
    useEffect(() => {
        // Add default text
        setTexts([
            { id: 1, text: "在此輸入標題...", x: 540, y: 1150, fontSize: 80, align: 'center' }
        ]);
    }, []);

    // Handlers - Image Upload
    const handleImageUpload = (e) => {
        const file = e.target.files[0];
        if (file) {
            const url = URL.createObjectURL(file);
            setBgImage(url);
            setBgPosition({ x: 0, y: 0, scale: 1 }); // Reset pos
        }
    };

    // Handlers - Background Dragging (Unified Mouse & Touch)
    const handleStart = (clientX, clientY) => {
        isDragging.current = true;
        lastPos.current = { x: clientX, y: clientY };
    };

    const handleMove = (clientX, clientY) => {
        if (!isDragging.current || !bgImage) return;
        const dx = clientX - lastPos.current.x;
        const dy = clientY - lastPos.current.y;
        lastPos.current = { x: clientX, y: clientY };

        setBgPosition(prev => ({
            ...prev,
            x: prev.x + dx,
            y: prev.y + dy
        }));
    };

    const handleEnd = () => {
        isDragging.current = false;
    };

    // Mouse Events
    const onMouseDown = (e) => {
        if (e.target.closest('.text-layer')) return;
        handleStart(e.clientX, e.clientY);
    };
    const onMouseMove = (e) => handleMove(e.clientX, e.clientY);
    const onMouseUp = () => handleEnd();

    // Touch Events
    const onTouchStart = (e) => {
        const touch = e.touches[0];
        handleStart(touch.clientX, touch.clientY);
    };
    const onTouchMove = (e) => {
        const touch = e.touches[0];
        handleMove(touch.clientX, touch.clientY);
    };
    const onTouchEnd = () => handleEnd();

    // Renderer
    const handleDownload = async () => {
        const canvas = document.createElement('canvas');
        canvas.width = TEMPLATE_SIZE.w;
        canvas.height = TEMPLATE_SIZE.h;
        const ctx = canvas.getContext('2d');

        // 1. Draw Background
        if (bgImage) {
            const img = new Image();
            img.src = bgImage;
            await new Promise(r => img.onload = r);

            // Calculate scaled dimensions
            const sw = img.width * bgPosition.scale;
            const sh = img.height * bgPosition.scale;

            // We implement "cover" style centering logic or just raw x/y
            // Here we map screen pixels to canvas pixels roughly if we wanted 1:1, 
            // but since screen preview is scaled down, we need to handle that ratio.
            // SIMPLIFICATION: We assume the preview is "What you see is what you get" 
            // but creating a perfect WYSIWYG editor with zooming is complex.
            // ALTERNATIVE: Use the screen coordinates directly if we scale properly.

            // Better approach for efficiency: 
            // Just draw exactly what the offsets say, assuming 1 screen px = 1 canvas px (if container was 1080px).
            // But container is smaller. So we need the ratio.

            // Get scale factor from DOM
            const containerRect = containerRef.current.getBoundingClientRect();
            const displayScale = containerRect.width / TEMPLATE_SIZE.w; // e.g. 0.5 if shown at 540px

            // Back-calculate: The user moved X pixels on screen. In canvas world that is X / displayScale.
            // Wait, `bgPosition` is in screen pixels? Yes.
            // So real offset = bgPosition.x / displayScale ? 
            // Let's refine the drag logic to be "Project Coords" based later.
            // For now, let's just make it work.

            // Let's assume bgPosition IS in Canvas Coordinates for simplicity? No, user drags pixels.
            // Let's Convert:
            const realX = bgPosition.x / displayScale;
            const realY = bgPosition.y / displayScale;
            const realScale = bgPosition.scale; // This is a relative scale on the image itself

            // Draw centered? Standard drawImage
            // We want the image center to be at canvas center + offset?
            // Simplified: Just draw top-left at x,y?

            // Let's use the simplest transform: 
            // Canvas Center + Offset

            ctx.save();
            ctx.translate(TEMPLATE_SIZE.w / 2 + realX, TEMPLATE_SIZE.h / 2 + realY);
            ctx.scale(realScale, realScale);
            ctx.drawImage(img, -img.width / 2, -img.height / 2);
            ctx.restore();
        } else {
            ctx.fillStyle = "#111";
            ctx.fillRect(0, 0, canvas.width, canvas.height);
        }

        // 2. Draw Template
        const tpl = new Image();
        tpl.src = templateSrc;
        await new Promise(r => tpl.onload = r);
        ctx.drawImage(tpl, 0, 0, TEMPLATE_SIZE.w, TEMPLATE_SIZE.h);

        // 3. Draw Text
        // TODO: Advanced text rendering
        texts.forEach(t => {
            ctx.fillStyle = "white";
            ctx.font = `bold ${t.fontSize}px 'SourceHanSansTC', sans-serif`; // Use the loaded Chinese font
            ctx.textAlign = t.align;
            ctx.fillText(t.text, t.x, t.y);
        });

        // Save
        const link = document.createElement('a');
        link.download = 'f1-news-output.jpg';
        link.href = canvas.toDataURL('image/jpeg', 0.95);
        link.click();
    };

    return (
        <div className="editor-container fade-in">
            <div className="editor-sidebar">
                <button onClick={onBack}>&larr; 返回 (Back)</button>
                <div className="control-group">
                    <h3>背景圖片 (Background)</h3>
                    <button className="primary-btn" onClick={() => fileInputRef.current.click()}>
                        上傳圖片 (Upload)
                    </button>
                    <input
                        type="file"
                        hidden
                        ref={fileInputRef}
                        onChange={handleImageUpload}
                        accept="image/*"
                    />
                    <div className="slider-group">
                        <div className="label-wrapper">
                            <label>圖片縮放 (Scale)</label>
                            <input
                                type="number"
                                className="precision-input"
                                value={bgPosition.scale}
                                step="0.05"
                                min="0.1"
                                max="10"
                                onChange={(e) => setBgPosition({ ...bgPosition, scale: parseFloat(e.target.value) || 0 })}
                            />
                        </div>
                        <input
                            type="range"
                            min="0.1"
                            max="3"
                            step="0.01"
                            value={bgPosition.scale}
                            onChange={(e) => setBgPosition({ ...bgPosition, scale: parseFloat(e.target.value) })}
                        />
                    </div>
                </div>

                <div className="control-group">
                    <h3>文字編輯 (Text)</h3>
                    {texts.map(t => (
                        <div key={t.id} className="text-control">
                            <div className="text-header">
                                <textarea
                                    value={t.text}
                                    onChange={(e) => {
                                        const val = e.target.value;
                                        setTexts(texts.map(tx => tx.id === t.id ? { ...tx, text: val } : tx));
                                    }}
                                />
                                <button
                                    className="delete-btn"
                                    title="刪除文字"
                                    onClick={() => setTexts(texts.filter(tx => tx.id !== t.id))}
                                >
                                    🗑️
                                </button>
                            </div>

                            <div className="size-control">
                                <div className="label-wrapper">
                                    <label>大小 (Size)</label>
                                    <input
                                        type="number"
                                        className="precision-input"
                                        value={t.fontSize}
                                        onChange={(e) => {
                                            const val = parseInt(e.target.value) || 0;
                                            setTexts(texts.map(tx => tx.id === t.id ? { ...tx, fontSize: val } : tx));
                                        }}
                                    />
                                </div>
                                <input
                                    type="range"
                                    min="20"
                                    max="300"
                                    value={t.fontSize}
                                    onChange={(e) => {
                                        const val = parseInt(e.target.value);
                                        setTexts(texts.map(tx => tx.id === t.id ? { ...tx, fontSize: val } : tx));
                                    }}
                                />
                            </div>

                            <div className="size-control">
                                <div className="label-wrapper">
                                    <label>垂直位置 (Y)</label>
                                    <input
                                        type="number"
                                        className="precision-input"
                                        value={Math.round(t.y)}
                                        onChange={(e) => {
                                            const val = parseInt(e.target.value) || 0;
                                            setTexts(texts.map(tx => tx.id === t.id ? { ...tx, y: val } : tx));
                                        }}
                                    />
                                </div>
                                <input
                                    type="range"
                                    min="0"
                                    max="2000"
                                    value={t.y}
                                    onChange={(e) => {
                                        const val = parseInt(e.target.value);
                                        setTexts(texts.map(tx => tx.id === t.id ? { ...tx, y: val } : tx));
                                    }}
                                />
                            </div>

                            <div className="align-control">
                                <button title="靠左" onClick={() => setTexts(texts.map(tx => tx.id === t.id ? { ...tx, align: 'left' } : tx))}>左</button>
                                <button title="置中" onClick={() => setTexts(texts.map(tx => tx.id === t.id ? { ...tx, align: 'center' } : tx))}>中</button>
                                <button title="靠右" onClick={() => setTexts(texts.map(tx => tx.id === t.id ? { ...tx, align: 'right' } : tx))}>右</button>
                                <button
                                    className="btn-center"
                                    title="畫面水平置中"
                                    onClick={() => setTexts(texts.map(tx => tx.id === t.id ? { ...tx, x: 540 } : tx))}
                                >
                                    🎯 水平置中
                                </button>
                            </div>
                        </div>
                    ))}
                    <button onClick={() => setTexts([...texts, { id: Date.now(), text: "新文字", x: 540, y: 600, fontSize: 60, align: 'center' }])}>
                        + 新增文字
                    </button>
                </div>

                <button className="download-btn" onClick={handleDownload}>
                    下載 JPG (Download)
                </button>
            </div>

            <div className="editor-canvas-area">
                {/* Render Viewport */}
                <div
                    className="canvas-viewport"
                    ref={containerRef}
                    style={{ width: 540, height: 675 }} // 50% scale representation
                    onMouseDown={onMouseDown}
                    onMouseMove={onMouseMove}
                    onMouseUp={onMouseUp}
                    onMouseLeave={onMouseUp}
                    onTouchStart={onTouchStart}
                    onTouchMove={onTouchMove}
                    onTouchEnd={onTouchEnd}
                >
                    {/* Background Layer */}
                    <div className="layer-bg">
                        {bgImage && <img
                            src={bgImage}
                            style={{
                                position: 'absolute',
                                left: '50%',
                                top: '50%',
                                transform: `translate(-50%, -50%) translate(${bgPosition.x}px, ${bgPosition.y}px) scale(${bgPosition.scale})`,
                                maxWidth: 'none',
                                maxHeight: 'none'
                            }}
                            draggable={false}
                        />}
                    </div>

                    {/* Template Layer */}
                    <img src={templateSrc} className="layer-template" draggable={false} />

                    {/* Text Layer */}
                    {texts.map(t => (
                        <div
                            key={t.id}
                            className="layer-text"
                            style={{
                                left: t.x / 2,
                                top: t.y / 2,
                                fontSize: t.fontSize / 2,
                                textAlign: t.align,
                                transform: t.align === 'center' ? 'translateX(-50%)' :
                                    t.align === 'right' ? 'translateX(-100%)' : 'none',
                                whiteSpace: 'pre-wrap',
                                width: t.align === 'center' ? '90%' : 'auto' // Give space for centering wrapping
                            }}
                        >
                            {t.text}
                        </div>
                    ))}
                </div>
            </div>
        </div>
    );
};

export default Editor;
