import React from 'react';

export const IndonesiaFlag = ({ className = "w-6 h-4" }: { className?: string }) => (
    <svg className={className} viewBox="0 0 3 2" xmlns="http://www.w3.org/2000/svg">
        <rect width="3" height="1" fill="#FF0000" />
        <rect y="1" width="3" height="1" fill="#FFFFFF" />
    </svg>
);

export const USFlag = ({ className = "w-6 h-4" }: { className?: string }) => (
    <svg className={className} viewBox="0 0 7410 3900" xmlns="http://www.w3.org/2000/svg">
        <rect width="7410" height="3900" fill="#b22234" />
        <path d="M0,450H7410m0,600H0m0,600H7410m0,600H0m0,600H7410m0,600H0" stroke="#fff" strokeWidth="300" />
        <rect width="2964" height="2100" fill="#3c3b6e" />
        <g fill="#fff">
            <g id="s18">
                <g id="s9">
                    <g id="s5">
                        <g id="s4">
                            <path id="s" d="M247,90 317.534230,307.082039 132.873218,172.917961H361.126782L176.465770,307.082039z" />
                            <use href="#s" y="420" />
                            <use href="#s" y="840" />
                            <use href="#s" y="1260" />
                        </g>
                        <use href="#s" y="1680" />
                    </g>
                    <use href="#s4" x="247" y="210" />
                </g>
                <use href="#s9" x="494" />
            </g>
            <use href="#s18" x="988" />
            <use href="#s9" x="1976" />
            <use href="#s5" x="2470" />
        </g>
    </svg>
);

export const UKFlag = ({ className = "w-6 h-4" }: { className?: string }) => (
    <svg className={className} viewBox="0 0 60 30" xmlns="http://www.w3.org/2000/svg">
        <clipPath id="uk-s">
            <path d="M0,0 v30 h60 v-30 z" />
        </clipPath>
        <clipPath id="uk-t">
            <path d="M30,15 h30 v15 z v15 h-30 z h-30 v-15 z v-15 h30 z" />
        </clipPath>
        <g clipPath="url(#uk-s)">
            <path d="M0,0 v30 h60 v-30 z" fill="#012169" />
            <path d="M0,0 L60,30 M60,0 L0,30" stroke="#fff" strokeWidth="6" />
            <path d="M0,0 L60,30 M60,0 L0,30" clipPath="url(#uk-t)" stroke="#C8102E" strokeWidth="4" />
            <path d="M30,0 v30 M0,15 h60" stroke="#fff" strokeWidth="10" />
            <path d="M30,0 v30 M0,15 h60" stroke="#C8102E" strokeWidth="6" />
        </g>
    </svg>
);
