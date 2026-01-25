import React from 'react';
import './Landing.css';

const Landing = ({ onSelect }) => {
    return (
        <div className="landing-container fade-in">
            <h1 className="landing-title">選擇模板</h1>
            <p className="landing-subtitle">快速開始您的 F1 新聞創作</p>

            <div className="cards-wrapper">
                <div
                    className="card"
                    onClick={() => onSelect('breaking')}
                >
                    <div className="card-image-wrapper">
                        <img src="/BREAKING_NEWS.png" alt="Breaking News" className="card-preview" />
                    </div>
                    <div className="card-content">
                        <h2>新聞快訊</h2>
                        <p>一鍵生成專業賽況報導</p>
                    </div>
                </div>

                <div
                    className="card"
                    onClick={() => onSelect('quotes')}
                >
                    <div className="card-image-wrapper">
                        <img src="/Quotes.png" alt="Quotes" className="card-preview" />
                    </div>
                    <div className="card-content">
                        <h2>車手語錄</h2>
                        <p>賽後反應與深度訪談呈現</p>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default Landing;
