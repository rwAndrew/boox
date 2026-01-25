import React from 'react';
import './Landing.css';

const Landing = ({ onSelect }) => {
    return (
        <div className="landing-container fade-in">
            <h1 className="landing-title">選擇模板</h1>
            <div className="cards-wrapper">
                <div
                    className="card"
                    onClick={() => onSelect('breaking')}
                >
                    <div className="card-image-wrapper">
                        <img src="/BREAKING_NEWS.png" alt="Breaking News" className="card-preview" />
                    </div>
                    <div className="card-content">
                        <h2>新聞快訊 (Breaking)</h2>
                        <p>用於突發新聞、緊急賽事更新與官方公告。</p>
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
                        <h2>車手語錄 (Quotes)</h2>
                        <p>用於分享車手訪談、賽後反應與金句引用。</p>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default Landing;
