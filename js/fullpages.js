// =======================================================
// fullpages.js — Full Screen SPA Views (Shop, Wardrobe, Profile)
// AntWar RPG
// =======================================================

import { t, getCurrentLang } from './i18n.js';
import { playSound } from './audio.js';
import { animatePageIn, animatePageOut, createRipple } from './animations.js';
import { loadUIRegistry, renderBottomNav, getLabel, asset } from './ui-registry.js';

let activePage = null;
let currentWardrobeTab = 'wardrobe'; // 'wardrobe' | 'bag'
let activeBagCategory = 'all';
let activeShopCategory = 'all'; // 'all' | 'coins' | 'diamonds' | 'items' | 'wardrobe' | 'chests'

/**
 * Open a full page view by its name ('shop', 'wardrobe', 'profile')
 */
export async function openFullPage(pageName) {
    const pageId = `fullpage-${pageName}`;
    const pageEl = document.getElementById(pageId);
    if (!pageEl) return;

    // سلوك التبديل (Toggle): إذا كانت الصفحة مفتوحة حالياً، يتم إغلاقها والعودة للرئيسية!
    if (activePage === pageName) {
        closeFullPage(pageName);
        return;
    }

    playSound('pop');

    // Close any previous active page before opening the new one
    if (activePage && activePage !== pageName) {
        const prevEl = document.getElementById(`fullpage-${activePage}`);
        if (prevEl) {
            prevEl.classList.remove('active');
            prevEl.style.display = 'none';
        }
    }

    // Render content for this page
    if (pageName === 'shop') {
        await renderShopContent();
    } else if (pageName === 'wardrobe') {
        await renderWardrobeContent();
    } else if (pageName === 'profile') {
        await renderProfileContent();
    } else if (pageName === 'chat') {
        renderChatContent();
    }

    animatePageIn(pageEl);
    activePage = pageName;
    document.body.classList.add('fullpage-open');

    // إظهار زر الرجوع الرئيسي في الـ HUD وإخفاء زر الإعدادات
    const homeBackBtn = document.getElementById('global-hud-back-btn');
    const settingsBtn = document.getElementById('open-settings-btn');
    if (homeBackBtn) {
        homeBackBtn.classList.remove('hidden');
        homeBackBtn.classList.add('flex');
    }
    if (settingsBtn) {
        settingsBtn.classList.add('hidden');
    }
}

/**
 * Close currently open full page view
 */
export function closeFullPage(pageName) {
    const targetName = pageName || activePage;
    if (!targetName) return;

    const pageId = `fullpage-${targetName}`;
    const pageEl = document.getElementById(pageId);
    if (!pageEl) return;

    playSound('close');
    animatePageOut(pageEl, () => {
        if (activePage === targetName) activePage = null;
        if (!activePage) {
            document.body.classList.remove('fullpage-open');
            const homeBackBtn = document.getElementById('global-hud-back-btn');
            const settingsBtn = document.getElementById('open-settings-btn');
            if (homeBackBtn) {
                homeBackBtn.classList.add('hidden');
                homeBackBtn.classList.remove('flex');
            }
            if (settingsBtn) {
                settingsBtn.classList.remove('hidden');
            }
        }
    });
}

/**
 * Setup listeners for full page back buttons, tabs, and bottom nav
 */
export async function initFullPages() {
    const registry = await loadUIRegistry();
    renderBottomNav(document.getElementById('mobile-bottom-nav'));
    // Back buttons
    document.querySelectorAll('[data-close-page]').forEach(btn => {
        btn.addEventListener('click', (e) => {
            createRipple(e, btn);
            const targetPageId = btn.getAttribute('data-close-page');
            const pageName = targetPageId.replace('fullpage-', '');
            closeFullPage(pageName);
        });
    });

    // Wardrobe / Bag top tabs toggle
    document.querySelectorAll('.wardrobe-tab-btn').forEach(btn => {
        btn.addEventListener('click', (e) => {
            createRipple(e, btn);
            playSound('click');
            const tab = btn.getAttribute('data-wtab');
            if (!tab || tab === currentWardrobeTab) return;

            currentWardrobeTab = tab;
            document.querySelectorAll('.wardrobe-tab-btn').forEach(b => {
                const bTab = b.getAttribute('data-wtab');
                if (bTab === tab) {
                    b.classList.add('active');
                    b.classList.remove('text-white/70');
                } else {
                    b.classList.remove('active');
                    b.classList.add('text-white/70');
                }
            });

            renderWardrobeContent();
        });
    });

    // Global HUD Home Back button (الزر الفخم بالـ HUD للرجوع للرئيسية في كل الصفحات)
    const globalBackBtn = document.getElementById('global-hud-back-btn');
    if (globalBackBtn) {
        globalBackBtn.addEventListener('click', (e) => {
            createRipple(e, globalBackBtn);
            playSound('close');
            if (activePage) closeFullPage(activePage);
            // Reset active state in bottom nav
            document.querySelectorAll('#mobile-bottom-nav .bnav-item').forEach(b => b.classList.remove('active'));
            document.getElementById('bnav-home')?.classList.add('active');
        });
    }

    // Mobile Bottom Nav items handling (تصليح شامل ومباشر لتبديل الصفحات في الهاتف)
    document.querySelectorAll('#mobile-bottom-nav .bnav-item').forEach(btn => {
        btn.addEventListener('click', (e) => {
            createRipple(e, btn);
            const action = btn.getAttribute('data-action');
            if (!action) return;

            document.querySelectorAll('#mobile-bottom-nav .bnav-item').forEach(b => b.classList.remove('active'));
            btn.classList.add('active');

            if (action === 'home') {
                // إغلاق أي صفحة كاملة فوراً وبشكل إجباري
                document.querySelectorAll('.full-page-view').forEach(p => {
                    p.classList.remove('active');
                    p.style.display = 'none';
                });
                activePage = null;
                document.body.classList.remove('fullpage-open');

                // إغلاق كافة النوافذ المنبثقة والقوائم المنبثقة إجبارياً
                if (window.closeAllModals) {
                    window.closeAllModals();
                } else {
                    document.querySelectorAll('.wood-modal-backdrop.active').forEach(m => m.classList.remove('active'));
                }

                // إخفاء الشريط الجانبي المنبثق وأوفيرلاي الأفاتار
                document.getElementById('desktop-chat-popup-sidebar')?.classList.add('hidden');
                document.getElementById('avatar-picker-overlay')?.remove();

                // استعادة الـ HUD للشاشة الرئيسية
                const homeBackBtn = document.getElementById('global-hud-back-btn');
                const settingsBtn = document.getElementById('open-settings-btn');
                if (homeBackBtn) {
                    homeBackBtn.classList.add('hidden');
                    homeBackBtn.classList.remove('flex');
                }
                if (settingsBtn) {
                    settingsBtn.classList.remove('hidden');
                }

                playSound('close');
            } else if (action.startsWith('page:')) {
                const pageName = action.split(':')[1];
                if (activePage === pageName) {
                    closeFullPage(pageName);
                    document.querySelectorAll('#mobile-bottom-nav .bnav-item').forEach(b => b.classList.remove('active'));
                    document.getElementById('bnav-home')?.classList.add('active');
                } else {
                    openFullPage(pageName);
                }
            } else if (action.startsWith('modal:')) {
                const modalName = action.split(':')[1];
                if (window.openModal) window.openModal(modalName);
            }
        });
    });

    // Re-render active page on language switch
    window.addEventListener('languageChanged', () => {
        if (activePage === 'shop') renderShopContent();
        else if (activePage === 'wardrobe') renderWardrobeContent();
        else if (activePage === 'profile') renderProfileContent();
        else if (activePage === 'chat') renderChatContent();
    });

    // Leaderboard dock header click -> opens leaderboard rank modal
    const rankHeader = document.getElementById('leaderboard-dock-header');
    if (rankHeader) {
        rankHeader.addEventListener('click', (e) => {
            createRipple(e, rankHeader);
            playSound('click');
            if (window.openModal) window.openModal('rank');
        });
    }

    const fullRankBtn = document.getElementById('dock-open-full-rank-btn');
    if (fullRankBtn) {
        fullRankBtn.addEventListener('click', (e) => {
            e.stopPropagation();
            createRipple(e, fullRankBtn);
            playSound('click');
            if (window.openModal) window.openModal('rank');
        });
    }

    // Leaderboard dock row click -> inspect player profile
    document.querySelectorAll('#leaderboard-dock-list .rank-item-row').forEach(row => {
        row.addEventListener('click', (e) => {
            createRipple(e, row);
            playSound('pop');
            const pName = row.getAttribute('data-player') || 'محارب النمل';
            const pAv = row.getAttribute('data-avatar') || 'img/ant1.png';
            if (window.inspectPlayerProfile) {
                window.inspectPlayerProfile(pName, pAv);
            } else if (window.openModal) {
                window.openModal('player-profile');
            }
        });
    });

    // Desktop Friends Dock -> Click to chat or inspect
    document.querySelectorAll('#desktop-friends-list .friend-dock-row').forEach(row => {
        row.addEventListener('click', (e) => {
            createRipple(e, row);
            playSound('chat');
            const isWide = window.innerWidth >= 1024;
            if (isWide) {
                const popup = document.getElementById('desktop-chat-popup-sidebar');
                if (popup) popup.classList.remove('hidden');
            } else {
                openFullPage('chat');
            }
        });
    });

    // Close desktop chat popup sidebar
    document.getElementById('close-desktop-chat-popup-btn')?.addEventListener('click', () => {
        playSound('close');
        document.getElementById('desktop-chat-popup-sidebar')?.classList.add('hidden');
    });

    // Desktop popup chat send
    const sendPopupBtn = document.getElementById('desktop-popup-chat-send');
    const inputPopup = document.getElementById('desktop-popup-chat-input');
    const msgStream = document.getElementById('desktop-popup-chat-messages');

    function sendDesktopPopupMsg() {
        const text = inputPopup?.value?.trim();
        if (!text || !msgStream) return;
        playSound('chat');
        const bubble = document.createElement('div');
        bubble.className = 'flex gap-2 items-end self-end flex-row-reverse max-w-[85%]';
        bubble.innerHTML = `
            <img src="img/ant1.png" class="w-6 h-6 rounded-full border border-[#BC4526] object-cover">
            <div class="text-left">
                <span class="text-[9px] text-[#FFD875] font-black">أنت</span>
                <div class="chat-bubble-mine text-xs font-bold">${text}</div>
            </div>
        `;
        msgStream.appendChild(bubble);
        msgStream.scrollTop = msgStream.scrollHeight;
        inputPopup.value = '';
    }

    sendPopupBtn?.addEventListener('click', sendDesktopPopupMsg);
    inputPopup?.addEventListener('keydown', (e) => { if (e.key === 'Enter') sendDesktopPopupMsg(); });
}

/**
 * Render Shop content from data/shop-items.json
 * Features: Categories filter (all, coins, diamonds, items, wardrobe, chests),
 * img/frame-item.png styling for all items, persistent item-name-top, and description.
 */
async function renderShopContent() {
    const container = document.getElementById('fullpage-shop-content');
    if (!container) return;

    try {
        const resp = await fetch('data/shop-items.json');
        const data = await resp.json();
        const isAr = getCurrentLang() === 'ar';

        // Load translation for localized item names / descriptions if referenced by itemId
        let itemsTranslation = {};
        try {
            const transFile = isAr ? 'language/ar/translation.json' : 'language/en/translation.json';
            const transResp = await fetch(transFile);
            const transData = await transResp.json();
            itemsTranslation = transData.items || {};
        } catch (err) {
            console.warn('Failed to load item translations for shop:', err);
        }

        const filteredItems = activeShopCategory === 'all'
            ? data.items
            : data.items.filter(item => item.category === activeShopCategory);

        let html = `
            <div class="flex flex-col gap-5 w-full pb-10">
                <!-- شريط مميز في أعلى المتجر -->
                <div class="relative w-full rounded-2xl overflow-hidden p-5 border-2 c-border-primary bg-gradient-to-r from-amber-950/80 via-black/80 to-amber-950/80 flex flex-col md:flex-row items-center justify-between shadow-2xl">
                    <div class="flex items-center gap-4">
                        <img src="img/RoyalPass.png" class="w-16 h-16 object-contain animate-pulse">
                        <div>
                            <h3 class="text-xl md:text-2xl font-black text-[#ffd875]">${isAr ? 'عروض المستعمرة الملكية الكبرى' : 'Grand Colony Special Deals'}</h3>
                            <p class="text-xs md:text-sm c-text-gold-80 font-bold">${isAr ? 'احصل على مكافآت إضافية ومضاعفة عند شحن العملات والعناصر اليوم!' : 'Get double bonus coins, diamonds and items on every purchase!'}</p>
                        </div>
                    </div>
                </div>

                <!-- شريط تصفية فئات المتجر (أموال، ماس، عناصر، ملابس، صناديق عشوائية) -->
                <div class="flex items-center gap-2 flex-wrap bg-black/60 p-2.5 rounded-2xl border-2 c-border-primary">
                    ${data.categories.map(cat => `
                        <button class="shop-filter-btn px-3 py-1.5 rounded-xl text-xs font-black transition-all cursor-pointer flex items-center gap-1.5 ${activeShopCategory === cat.id ? 'active bg-gradient-to-r from-amber-500 to-yellow-400 text-black shadow-lg scale-105' : 'text-white/80 bg-black/50 border c-border-primary hover:text-white'}" data-scat="${cat.id}">
                            <img src="${asset(cat.icon)}" class="w-4 h-4 object-contain" alt="">
                            <span>${t(cat.labelKey || `shop.categories.${cat.id}`)}</span>
                        </button>
                    `).join('')}
                </div>

                <!-- شبكة المنتجات بتصميم img/frame-item.png المكبر -->
                <div class="items-showcase-grid w-full">
        `;

        filteredItems.forEach(item => {
            let name = item.nameKey ? t(item.nameKey) : '';
            let desc = item.descriptionKey ? t(item.descriptionKey) : '';

            // If item links to inventory by numeric itemId, load localized strings
            if (item.itemId && itemsTranslation[item.itemId]) {
                name = itemsTranslation[item.itemId].name || name;
                desc = itemsTranslation[item.itemId].description || desc;
            }

            html += `
                <div class="item-card-wrapper shop-item-card group cursor-pointer" data-id="${item.id}">
                    <div class="item-slot-frame">
                        <img src="img/frame-item.png" class="absolute inset-0 w-full h-full object-contain pointer-events-none drop-shadow-md">
                        <span class="item-name-top block">${name || t('shop.defaultItem')}</span>
                        <div class="item-content">
                            <img src="${asset(item.icon)}" class="item-graphic group-hover:scale-110 transition-transform duration-200" alt="${name}">
                        </div>
                        ${item.bonus ? `
                            <span class="absolute top-0 left-20 bg-red-600 text-white font-black text-[9px] px-1.5 py-0.5 rounded-full shadow border border-white/40 z-20">
                                ${item.bonus}
                            </span>
                        ` : ''}
                        <span class="absolute bottom-0 left-15 bg-black/85 text-[#ffd875] border c-border-primary rounded-md text-[9px] font-black px-1.5 py-0.5 z-20 shadow">
                            ${item.amount || 'x1'}
                        </span>
                    </div>

                    <p class="item-short-desc block min-h-[32px]">${desc || t('shop.defaultDescription')}</p>

                    <button class="btn-wood-empty w-[clamp(100px,12vw,130px)] mt-1 shop-buy-action-btn" data-price="${item.price}" data-id="${item.id}" data-category="${item.category}" data-name="${name}">
                        <img src="img/Empty-button.png" class="btn-bg-art" alt="Buy">
                        <span class="btn-inner-content text-[#ffd875] font-black text-xs whitespace-nowrap">${item.price}</span>
                    </button>
                </div>
            `;
        });

        html += `
                </div>
            </div>
        `;

        container.innerHTML = html;

        // ربط أزرار التصفية
        container.querySelectorAll('.shop-filter-btn').forEach(btn => {
            btn.addEventListener('click', (e) => {
                createRipple(e, btn);
                playSound('click');
                activeShopCategory = btn.getAttribute('data-scat') || 'all';
                renderShopContent();
            });
        });

        // Buy button clicks
        container.querySelectorAll('.shop-buy-action-btn').forEach(btn => {
            btn.addEventListener('click', (e) => {
                createRipple(e, btn);
                playSound('reward');
                const cat = btn.getAttribute('data-category');
                const itemName = btn.getAttribute('data-name');
                if (cat === 'coins') {
                    const goldEl = document.getElementById('player-gold-count');
                    if (goldEl) {
                        let current = parseInt(goldEl.textContent.replace(/,/g, '')) || 12450;
                        goldEl.textContent = (current + 5000).toLocaleString();
                    }
                } else if (cat === 'diamonds') {
                    const gemEl = document.getElementById('player-gems-count');
                    if (gemEl) {
                        let current = parseInt(gemEl.textContent.replace(/,/g, '')) || 350;
                        gemEl.textContent = (current + 200).toLocaleString();
                    }
                }
                if (window.showToast) {
                    window.showToast(isAr ? `تم شراء [${itemName}] بنجاح!` : `[${itemName}] purchased successfully!`, 'success');
                }
            });
        });
    } catch (e) {
        console.error('Failed to render shop:', e);
    }
}

/**
 * Render Wardrobe & Bag content
 */
async function renderWardrobeContent() {
    const container = document.getElementById('fullpage-wardrobe-content');
    if (!container) return;

    const isAr = getCurrentLang() === 'ar';

    try {
        const resp = await fetch('data/inventory-items.json');
        const data = await resp.json();

        // Load item localized strings from translation file
        let itemsTranslation = {};
        try {
            const transFile = isAr ? 'language/ar/translation.json' : 'language/en/translation.json';
            const transResp = await fetch(transFile);
            const transData = await transResp.json();
            itemsTranslation = transData.items || {};
        } catch (err) {
            console.warn('Failed to load item translations for wardrobe:', err);
        }

        // Attach localized name and description to items using numeric ID
        const enrichItems = (items) => items.map(item => {
            const trans = itemsTranslation[item.id] || {};
            return {
                ...item,
                name: trans.name || t(item.nameKey || `items.${item.id}.name`),
                nameAr: trans.name || t(item.nameKey || `items.${item.id}.name`),
                description: trans.description || t(item.descriptionKey || `items.${item.id}.description`),
                descriptionAr: trans.description || t(item.descriptionKey || `items.${item.id}.description`),
                stats: t(item.statsKey || `items.${item.id}.stats`)
            };
        });

        const wardrobeList = enrichItems(data.wardrobe || []);
        const bagList = enrichItems(data.bag || []);

        if (currentWardrobeTab === 'wardrobe') {
            renderWardrobeTabView(container, wardrobeList, isAr);
        } else {
            renderBagTabView(container, bagList, isAr);
        }
    } catch (e) {
        console.error('Failed to load inventory data:', e);
    }
}

/**
 * Render the Wardrobe Tab with 2D Ant Interactive Preview & Frame-item Cards
 */
function renderWardrobeTabView(container, wardrobeItems, isAr) {
    const activeOutfit = wardrobeItems[0] || {
        id: 'ant-warrior-gold',
        nameKey: 'items.1001.name',
        descriptionKey: 'items.1001.description',
        icon: 'ant1.png',
        rarity: 'legendary',
        statsKey: 'items.1001.stats'
    };

    const initialName = activeOutfit.name || t(activeOutfit.nameKey);
    const initialDesc = activeOutfit.description || t(activeOutfit.descriptionKey);

    let html = `
        <div class="w-full flex items-center justify-between gap-3 bg-black/60 p-2 rounded-2xl border-2 c-border-primary mb-2">
            <div class="flex items-center gap-2">
                <button class="wardrobe-content-tab-btn px-4 py-1.5 rounded-xl text-xs font-black transition-all cursor-pointer ${currentWardrobeTab === 'wardrobe' ? 'active bg-gradient-to-r from-amber-500 to-yellow-400 text-black shadow-lg' : 'text-white/80 bg-black/50 border c-border-primary hover:text-white'}" data-wtab="wardrobe">
                    👗 دولاب الملابس
                </button>
                <button class="wardrobe-content-tab-btn px-4 py-1.5 rounded-xl text-xs font-black transition-all cursor-pointer ${currentWardrobeTab === 'bag' ? 'active bg-gradient-to-r from-amber-500 to-yellow-400 text-black shadow-lg' : 'text-white/80 bg-black/50 border c-border-primary hover:text-white'}" data-wtab="bag">
                    🎒 الحقيبة والمخزن
                </button>
            </div>
            <span class="text-xs font-black text-[#ffd875]">خزانة ودولاب المحارب</span>
        </div>
        <div class="flex flex-col lg:flex-row gap-6 w-full pb-8 items-start">
            <!-- 1. المعاينة الحية والتفاعلية للنملة 2D -->
            <div class="w-full lg:w-[360px] bg-black/60 border-2 c-border-primary rounded-2xl p-6 flex flex-col items-center justify-center text-center shadow-2xl relative flex-shrink-0">
                <div class="ant-avatar-interactive-stage mb-3">
                    <img id="wardrobe-preview-avatar" src="${activeOutfit.icon}" class="ant-base-layer" alt="Ant Character">
                </div>

                <h3 id="wardrobe-preview-name" class="text-xl font-black text-[#ffd875] mb-1 drop-shadow">${initialName}</h3>
                
                <div class="flex items-center gap-2 mb-2">
                    <span id="wardrobe-preview-rarity" class="text-[10px] text-[#FFD875] font-extrabold c-bg-burgundy px-2.5 py-0.5 rounded-full border c-border-primary uppercase">
                        ${activeOutfit.rarity}
                    </span>
                    <span id="wardrobe-preview-stats" class="text-[11px] text-[#37AA49] font-black">
                        ${activeOutfit.stats}
                    </span>
                </div>

                <p id="wardrobe-preview-desc" class="text-[11px] c-text-gold-70 text-center max-w-[260px] mb-4">
                    ${initialDesc}
                </p>

                <!-- خانات العتاد المجهز أسفل المعاينة -->
                <div class="equip-slots-bar mb-4">
                    <div class="equip-slot-chip" title="${t('wardrobe.slots.head')}">
                        <img src="img/Coin.png" class="equip-slot-icon" alt="Head">
                        <span class="equip-slot-label">${isAr ? 'الرأس' : 'Head'}</span>
                    </div>
                    <div class="equip-slot-chip border-[#BC4526]" title="${t('wardrobe.slots.body')}">
                        <img id="slot-body-icon" src="${activeOutfit.icon}" class="equip-slot-icon" alt="Body">
                        <span class="equip-slot-label text-[#ffd875]">${isAr ? 'الدرع' : 'Armor'}</span>
                    </div>
                    <div class="equip-slot-chip" title="${t('wardrobe.slots.special')}">
                        <img src="img/Task.png" class="equip-slot-icon" alt="Special">
                        <span class="equip-slot-label">${t('wardrobe.tool')}</span>
                    </div>
                </div>

                <button id="wardrobe-equip-active-btn" class="btn-wood-empty w-[180px]" data-img="${activeOutfit.icon}" data-name="${initialName}">
                    <img src="img/Empty-button.png" class="btn-bg-art" alt="Equip">
                    <span class="btn-inner-content text-[#ffd875] font-black text-sm">${t('actions.equipForColony')}</span>
                </button>
            </div>

            <!-- 2. شبكة الأزياء المتاحة بتصميم فريم العنصر المخصص img/frame-item.png -->
            <div class="w-full flex-1 flex flex-col gap-4">
                <div class="flex items-center justify-between border-b c-border-primary pb-2">
                    <h4 class="text-base font-black text-white/95">${t('wardrobe.available')}</h4>
                    <span class="text-xs c-text-gold-80 font-bold">${wardrobeItems.length} ${t('wardrobe.exclusiveSets')}</span>
                </div>

                <div class="items-showcase-grid">
    `;

    wardrobeItems.forEach(item => {
        const name = item.name || t(item.nameKey || `items.${item.id}.name`);
        const desc = item.description || t(item.descriptionKey || `items.${item.id}.description`);

        html += `
            <div class="item-card-wrapper wardrobe-item-card cursor-pointer group" 
                 data-id="${item.id}" 
                 data-img="${item.icon}" 
                 data-name="${name}" 
                 data-rarity="${item.rarity}" 
                 data-stats="${item.stats}" 
                 data-desc="${desc}">
                
                <div class="item-slot-frame">
                    <img src="img/frame-item.png" class="absolute inset-0 w-full h-full object-contain pointer-events-none drop-shadow-md">
                    <span class="item-name-top">${name}</span>
                    <div class="item-content">
                        <img src="${asset(item.icon)}" class="item-graphic group-hover:scale-110 transition-transform duration-200" alt="${name}">
                    </div>
                </div>

                <p class="item-short-desc">${desc}</p>

                <button class="btn-wood-empty w-[clamp(90px,11vw,115px)] mt-1 pointer-events-none">
                    <img src="img/Empty-button.png" class="btn-bg-art">
                    <span class="btn-inner-content text-[#ffd875] font-black text-[10px]">${t('ui.preview')}</span>
                </button>
            </div>
        `;
    });

    html += `
                </div>
            </div>
        </div>
    `;

    container.innerHTML = html;

    // Handle selecting outfit from card
    container.querySelectorAll('.wardrobe-item-card').forEach(card => {
        card.addEventListener('click', () => {
            playSound('click');
            const img = card.getAttribute('data-img');
            const name = card.getAttribute('data-name');
            const rarity = card.getAttribute('data-rarity');
            const stats = card.getAttribute('data-stats');
            const desc = card.getAttribute('data-desc');

            const previewImg = document.getElementById('wardrobe-preview-avatar');
            const previewName = document.getElementById('wardrobe-preview-name');
            const previewRarity = document.getElementById('wardrobe-preview-rarity');
            const previewStats = document.getElementById('wardrobe-preview-stats');
            const previewDesc = document.getElementById('wardrobe-preview-desc');
            const equipBtn = document.getElementById('wardrobe-equip-active-btn');
            const slotBodyIcon = document.getElementById('slot-body-icon');

            if (previewImg) {
                previewImg.src = img;
                previewImg.classList.add('animate-pulse');
                setTimeout(() => previewImg.classList.remove('animate-pulse'), 300);
            }
            if (previewName) previewName.textContent = name;
            if (previewRarity) previewRarity.textContent = rarity;
            if (previewStats) previewStats.textContent = stats;
            if (previewDesc) previewDesc.textContent = desc;
            if (slotBodyIcon) slotBodyIcon.src = img;

            if (equipBtn) {
                equipBtn.setAttribute('data-img', img);
                equipBtn.setAttribute('data-name', name);
            }
        });
    });

    // Handle wardrobe tab toggle clicks inside content
    container.querySelectorAll('.wardrobe-content-tab-btn').forEach(btn => {
        btn.addEventListener('click', (e) => {
            createRipple(e, btn);
            playSound('click');
            const tab = btn.getAttribute('data-wtab');
            if (!tab || tab === currentWardrobeTab) return;
            currentWardrobeTab = tab;
            renderWardrobeContent();
        });
    });

    // Equip button action
    const equipBtn = document.getElementById('wardrobe-equip-active-btn');
    if (equipBtn) {
        equipBtn.addEventListener('click', (e) => {
            createRipple(e, equipBtn);
            playSound('reward');

            const img = equipBtn.getAttribute('data-img');
            const name = equipBtn.getAttribute('data-name');

            const hudAvatar = document.getElementById('avatar-image');
            if (hudAvatar && img) hudAvatar.src = img;

            const bnavAvatar = document.getElementById('bnav-avatar-img');
            if (bnavAvatar && img) bnavAvatar.src = img;

            if (window.showToast) {
                window.showToast(isAr ? `تم تجهيز ${name} بنجاح لقيادة النمل!` : `${name} equipped successfully!`, 'success');
            }
        });
    }
}

/**
 * Render the Bag / Vault Tab with Categories & Use Actions
 */
function renderBagTabView(container, bagItems, isAr) {
    const filteredItems = activeBagCategory === 'all' 
        ? bagItems 
        : bagItems.filter(item => item.category === activeBagCategory);

    let html = `
        <div class="w-full flex items-center justify-between gap-3 bg-black/60 p-2 rounded-2xl border-2 c-border-primary mb-2">
            <div class="flex items-center gap-2">
                <button class="wardrobe-content-tab-btn px-4 py-1.5 rounded-xl text-xs font-black transition-all cursor-pointer ${currentWardrobeTab === 'wardrobe' ? 'active bg-gradient-to-r from-amber-500 to-yellow-400 text-black shadow-lg' : 'text-white/80 bg-black/50 border c-border-primary hover:text-white'}" data-wtab="wardrobe">
                    👗 دولاب الملابس
                </button>
                <button class="wardrobe-content-tab-btn px-4 py-1.5 rounded-xl text-xs font-black transition-all cursor-pointer ${currentWardrobeTab === 'bag' ? 'active bg-gradient-to-r from-amber-500 to-yellow-400 text-black shadow-lg' : 'text-white/80 bg-black/50 border c-border-primary hover:text-white'}" data-wtab="bag">
                    🎒 الحقيبة والمخزن
                </button>
            </div>
            <span class="text-xs font-black text-[#ffd875]">حقيبة ومستودع المستعمرة</span>
        </div>
        <div class="flex flex-col gap-6 w-full pb-8">
            <!-- رأس المخزن وشريط التصنيفات -->
            <div class="flex flex-col md:flex-row items-center justify-between gap-4 bg-black/60 border-2 c-border-primary rounded-2xl p-4 shadow-xl">
                <div class="flex items-center gap-3">
                    <img src="img/bag.png" class="w-12 h-12 object-contain drop-shadow">
                    <div>
                        <h3 class="text-lg font-black text-[#ffd875]">${isAr ? 'حقيبة ومستودع المستعمرة الملكية' : 'Royal Colony Bag & Vault'}</h3>
                        <p class="text-xs text-[#FFD875]/75">${t('inventory.capacity', { used: 4, total: 50 })}</p>
                    </div>
                </div>

                <div class="flex items-center gap-2 flex-wrap">
                    <button class="bag-filter-btn ${activeBagCategory === 'all' ? 'active' : ''}" data-cat="all">
                        ${t('ui.all')}
                    </button>
                    <button class="bag-filter-btn ${activeBagCategory === 'consumable' ? 'active' : ''}" data-cat="consumable">
                        ${t('inventory.categories.consumable')}
                    </button>
                    <button class="bag-filter-btn ${activeBagCategory === 'material' ? 'active' : ''}" data-cat="material">
                        ${t('inventory.categories.material')}
                    </button>
                    <button class="bag-filter-btn ${activeBagCategory === 'special' ? 'active' : ''}" data-cat="special">
                        ${t('inventory.categories.special')}
                    </button>
                </div>
            </div>

            <!-- شبكة عناصر الحقيبة داخل فريمات img/frame-item.png الفاخرة -->
            <div class="items-showcase-grid">
    `;

    filteredItems.forEach(item => {
        const name = item.name || t(item.nameKey || `items.${item.id}.name`);
        const desc = item.description || t(item.descriptionKey || `items.${item.id}.description`);

        html += `
            <div class="item-card-wrapper bag-item-card" data-id="${item.id}" data-name="${name}">
                <div class="item-slot-frame">
                    <img src="img/frame-item.png" class="absolute inset-0 w-full h-full object-contain pointer-events-none drop-shadow-md">
                    <span class="item-name-top">${name}</span>
                    <div class="item-content">
                        <img src="${asset(item.icon)}" class="item-graphic" alt="${name}">
                    </div>
                    <span class="absolute bottom-2.5 right-2.5 bg-black/85 text-[#ffd875] border c-border-primary rounded-md text-[9px] font-black px-1.5 py-0.5 z-20 shadow">
                        x${item.quantity}
                    </span>
                </div>

                <p class="item-short-desc">${desc}</p>

                <button class="btn-wood-empty w-[clamp(90px,11vw,115px)] mt-1 bag-item-use-btn" data-id="${item.id}" data-name="${name}">
                    <img src="img/Empty-button.png" class="btn-bg-art">
                    <span class="btn-inner-content text-[#ffd875] font-black text-[10px]">${t('actions.use')}</span>
                </button>
            </div>
        `;
    });

    html += `
            </div>
        </div>
    `;

    container.innerHTML = html;

    // Filter clicks
    container.querySelectorAll('.bag-filter-btn').forEach(btn => {
        btn.addEventListener('click', (e) => {
            createRipple(e, btn);
            playSound('click');
            activeBagCategory = btn.getAttribute('data-cat') || 'all';
            renderWardrobeContent();
        });
    });

    // Use item clicks
    container.querySelectorAll('.bag-item-use-btn').forEach(btn => {
        btn.addEventListener('click', (e) => {
            e.stopPropagation();
            createRipple(e, btn);
            playSound('reward');
            const name = btn.getAttribute('data-name');
            if (window.showToast) {
                window.showToast(isAr ? `تم استخدام [${name}] بنجاح في المستعمرة!` : `[${name}] used successfully!`, 'success');
            }
        });
    });

    // Handle wardrobe tab toggle clicks inside bag view
    container.querySelectorAll('.wardrobe-content-tab-btn').forEach(btn => {
        btn.addEventListener('click', (e) => {
            createRipple(e, btn);
            playSound('click');
            const tab = btn.getAttribute('data-wtab');
            if (!tab || tab === currentWardrobeTab) return;
            currentWardrobeTab = tab;
            renderWardrobeContent();
        });
    });
}

/**
 * Render Profile content — direct inline editing, avatar picker overlay
 */
async function renderProfileContent() {
    const container = document.getElementById('fullpage-profile-content');
    if (!container) return;

    const isAr = getCurrentLang() === 'ar';

    // مكتبة شخصيات كرتونية مميزة للأفاتار (Cartoon Insect Adventurers)
    const AVATARS = [
        { src: 'img/ant1.png', label: isAr ? 'نملة القائد الكلاسيكية' : 'Ant Commander' },
        { src: 'img/ant2.png', label: isAr ? 'محارب النمل السريع' : 'Ant Warrior' },
        { src: 'img/beetle.png', label: isAr ? 'الخنفساء الفولاذية' : 'Steel Beetle' },
        { src: 'https://api.dicebear.com/7.x/adventurer/svg?seed=AntScout&skinColor=f2d3b1', label: isAr ? 'نملة الكشافة الشجاعة' : 'Ant Scout' },
        { src: 'https://api.dicebear.com/7.x/adventurer/svg?seed=TitanBeetle&skinColor=ecad80', label: isAr ? 'فارس الدروع الصلب' : 'Armor Knight' },
        { src: 'https://api.dicebear.com/7.x/adventurer/svg?seed=RoyalHornet&skinColor=d08b5b', label: isAr ? 'الحارس الملكي' : 'Royal Guard' },
        { src: 'https://api.dicebear.com/7.x/adventurer/svg?seed=Grasshopper&skinColor=ae5d29', label: isAr ? 'صياد الحشرات السريع' : 'Scout Ranger' },
        { src: 'https://api.dicebear.com/7.x/adventurer/svg?seed=DesertAnt&skinColor=614335', label: isAr ? 'محارب الرمال الحمراء' : 'Desert Fighter' },
        { src: 'https://api.dicebear.com/7.x/adventurer/svg?seed=IronChitin&skinColor=92593a', label: isAr ? 'مقاتل الكايتين العظيم' : 'Grand Warrior' },
        { src: 'https://api.dicebear.com/7.x/adventurer/svg?seed=EmperorAnt&skinColor=f2d3b1', label: isAr ? 'إمبراطور المستعمرة الأعظم' : 'Emperor of the Nest', locked: true, requiredLevel: 60 }
    ];

    const currentAvatarSrc = document.getElementById('avatar-image')?.src?.split('/').pop() || 'img/ant1.png';
    let selectedAvatarSrc = currentAvatarSrc;
    const playerName = document.getElementById('player-name-text')?.textContent || 'Ant Commander';
    const playerLevel = 18;
    const playerCP = '14,850';

    container.innerHTML = `
        <div class="flex flex-col lg:flex-row gap-6 w-full pb-8 items-start">

            <!-- === العمود الأيسر: الأفاتار والتعديل المباشر === -->
            <div class="w-full lg:w-[340px] flex-shrink-0 flex flex-col gap-4">

                <!-- بطاقة الأفاتار -->
                <div class="bg-black/60 border-2 c-border-primary rounded-2xl p-5 flex flex-col items-center text-center shadow-2xl">
                    <div class="relative mb-4">
                        <div class="w-32 h-32 relative flex items-center justify-center">
                            <img id="profile-avatar-display" src="${currentAvatarSrc}"
                                 class="w-[70%] h-[70%] rounded-full object-cover absolute"
                                 alt="Avatar">
                            <img src="img/frame.png" class="absolute inset-0 w-full h-full pointer-events-none">
                        </div>
                        <button id="change-avatar-btn" class="absolute bottom-0 right-0 w-8 h-8 rounded-full bg-[#BC4526] hover:bg-[#7E2025] text-white border-2 border-[#FFD875] flex items-center justify-center shadow-lg transition-transform hover:scale-110 cursor-pointer" title="${isAr ? 'تغيير الأفاتار' : 'Change Avatar'}">
                            <i class="fa-solid fa-camera text-xs"></i>
                        </button>
                    </div>

                    <div class="text-[#FFD875] text-xs font-black mb-1">Lvl ${playerLevel} · CP ${playerCP}</div>

                    <!-- تعديل الاسم مباشرة -->
                    <div class="w-full flex flex-col gap-1 text-right">
                        <label class="text-[10px] text-[#FFD875] font-black">${isAr ? 'اسم القائد (قابل للتعديل)' : 'Commander Name'}</label>
                        <input id="profile-name-input" type="text" value="${playerName}"
                               class="profile-edit-field text-center"
                               maxlength="20" placeholder="${isAr ? 'أدخل اسمك' : 'Enter name'}">
                    </div>

                    <button id="save-profile-btn" class="btn-wood-empty w-full max-w-[220px] mx-auto mt-3 h-[42px] relative cursor-pointer">
                        <img src="img/Empty-button.png" class="btn-bg-art" alt="Save">
                        <span class="btn-inner-content text-[#FFD875] font-black text-sm"><i class="fa-solid fa-check mr-1"></i>${isAr ? 'حفظ التغييرات' : 'Save Changes'}</span>
                    </button>
                </div>

                <!-- بطاقة الإحصائيات الرئيسية -->
                <div class="bg-black/60 border-2 c-border-primary rounded-2xl p-4">
                    <h4 class="text-xs font-black text-[#ffd875] mb-3 border-b c-border-primary pb-1">${isAr ? 'إحصائيات المعارك' : 'Battle Stats'}</h4>
                    <div class="grid grid-cols-3 gap-2">
                        <div class="profile-stat-chip">
                            <span class="profile-stat-val">412</span>
                            <span class="profile-stat-label">${isAr ? 'معارك' : 'Matches'}</span>
                        </div>
                        <div class="profile-stat-chip">
                            <span class="profile-stat-val text-[#37AA49]">68%</span>
                            <span class="profile-stat-label">${isAr ? 'فوز' : 'Win Rate'}</span>
                        </div>
                        <div class="profile-stat-chip">
                            <span class="profile-stat-val text-red-400">KDA 3.2</span>
                            <span class="profile-stat-label">KDA</span>
                        </div>
                        <div class="profile-stat-chip">
                            <span class="profile-stat-val text-white">#42</span>
                            <span class="profile-stat-label">${isAr ? 'الترتيب' : 'Rank'}</span>
                        </div>
                        <div class="profile-stat-chip">
                            <span class="profile-stat-val">Season 4</span>
                            <span class="profile-stat-label">${isAr ? 'الموسم' : 'Season'}</span>
                        </div>
                        <div class="profile-stat-chip">
                            <span class="profile-stat-val text-[#FFD875]">T-18</span>
                            <span class="profile-stat-label">${isAr ? 'الباس' : 'Pass'}</span>
                        </div>
                    </div>
                </div>
            </div>

            <!-- === العمود الأيمن: الأوسمة وسجل المعارك والتفاصيل === -->
            <div class="w-full flex-1 flex flex-col gap-4">

                <!-- الأوسمة والإنجازات -->
                <div class="bg-black/60 border-2 c-border-primary rounded-2xl p-4">
                    <h4 class="text-sm font-black text-[#ffd875] mb-3 flex items-center gap-2">
                        <span>🏅</span> ${isAr ? 'أوسمة الشرف والإنجازات' : 'Honor Badges & Achievements'}
                    </h4>
                    <div class="flex flex-wrap gap-2">
                        <span class="c-bg-burgundy border c-border-primary px-3 py-1 rounded-full text-xs font-bold text-[#FFD875]">👑 ${isAr ? 'سيد المستعمرة' : 'Colony Master'}</span>
                        <span class="c-bg-burgundy border c-border-primary px-3 py-1 rounded-full text-xs font-bold text-[#FFD875]">⚡ ${isAr ? 'سريع الغارات' : 'Blitz Striker'}</span>
                        <span class="c-bg-burgundy border c-border-primary px-3 py-1 rounded-full text-xs font-bold text-[#FFD875]">🛡️ ${isAr ? 'حامي الملكة' : 'Queen Guardian'}</span>
                        <span class="c-bg-crimson border border-[#7E2025]/40 px-3 py-1 rounded-full text-xs font-bold text-[#FFD875]">🔮 ${isAr ? 'الغازي العظيم' : 'Grand Invader'}</span>
                        <span class="bg-red-900/60 border border-red-400/40 px-3 py-1 rounded-full text-xs font-bold text-red-200">🔥 ${isAr ? 'لا يُهزم' : 'Undefeated'}</span>
                    </div>
                </div>

                <!-- تفاصيل اللاعب -->
                <div class="bg-black/60 border-2 c-border-primary rounded-2xl p-4">
                    <h4 class="text-sm font-black text-[#ffd875] mb-3 flex items-center gap-2">
                        <span>📋</span> ${isAr ? 'تفاصيل اللاعب' : 'Player Details'}
                    </h4>
                    <div class="grid grid-cols-1 sm:grid-cols-2 gap-3">
                        <div class="flex items-center justify-between bg-black/40 p-2.5 rounded-lg border c-border-primary">
                            <span class="text-xs c-text-gold-70 font-bold">${isAr ? 'رقم الحساب' : 'Account ID'}</span>
                            <span class="text-xs font-black text-white">#123456</span>
                        </div>
                        <div class="flex items-center justify-between bg-black/40 p-2.5 rounded-lg border c-border-primary">
                            <span class="text-xs c-text-gold-70 font-bold">${isAr ? 'المستوى' : 'Level'}</span>
                            <span class="text-xs font-black text-[#ffd875]">Lvl ${playerLevel}</span>
                        </div>
                        <div class="flex items-center justify-between bg-black/40 p-2.5 rounded-lg border c-border-primary">
                            <span class="text-xs c-text-gold-70 font-bold">${isAr ? 'القوة القتالية' : 'Combat Power'}</span>
                            <span class="text-xs font-black text-red-400">${playerCP} CP</span>
                        </div>
                        <div class="flex items-center justify-between bg-black/40 p-2.5 rounded-lg border c-border-primary">
                            <span class="text-xs c-text-gold-70 font-bold">${isAr ? 'تاريخ الانضمام' : 'Joined'}</span>
                            <span class="text-xs font-black text-white">Jan 2025</span>
                        </div>
                        <div class="flex items-center justify-between bg-black/40 p-2.5 rounded-lg border c-border-primary">
                            <span class="text-xs c-text-gold-70 font-bold">${isAr ? 'المستعمرة' : 'Colony'}</span>
                            <span class="text-xs font-black text-[#37AA49]">${isAr ? 'مستعمرة الصحراء' : 'Desert Colony'}</span>
                        </div>
                        <div class="flex items-center justify-between bg-black/40 p-2.5 rounded-lg border c-border-primary">
                            <span class="text-xs c-text-gold-70 font-bold">${isAr ? 'الوضع' : 'Status'}</span>
                            <span class="flex items-center gap-1 text-xs font-black text-[#37AA49]"><span class="w-2 h-2 rounded-full bg-[#37AA49] animate-pulse inline-block"></span>${isAr ? 'متصل' : 'Online'}</span>
                        </div>
                    </div>
                </div>

                <!-- سجل آخر المعارك -->
                <div class="bg-black/60 border-2 c-border-primary rounded-2xl p-4">
                    <h4 class="text-sm font-black text-[#ffd875] mb-3 flex items-center gap-2">
                        <span>⚔️</span> ${isAr ? 'سجل آخر المعارك' : 'Recent Match History'}
                    </h4>
                    <div class="flex flex-col gap-2">
                        <div class="flex items-center justify-between c-bg-burgundy border c-border-green p-2.5 rounded-lg text-xs">
                            <span class="text-[#37AA49] font-black">🏆 ${isAr ? 'انتصار' : 'VICTORY'} <span class="text-[10px] text-[#37AA49]/70">(+32 CP)</span></span>
                            <span class="text-white/70">Team Deathmatch</span>
                            <span class="text-white/50">12m ${isAr ? 'مضت' : 'ago'}</span>
                        </div>
                        <div class="flex items-center justify-between bg-red-950/40 border border-red-500/40 p-2.5 rounded-lg text-xs">
                            <span class="text-red-400 font-black">💀 ${isAr ? 'هزيمة' : 'DEFEAT'} <span class="text-[10px] text-red-300/70">(-15 CP)</span></span>
                            <span class="text-white/70">Colony Siege</span>
                            <span class="text-white/50">1h ${isAr ? 'مضت' : 'ago'}</span>
                        </div>
                        <div class="flex items-center justify-between c-bg-burgundy border c-border-green p-2.5 rounded-lg text-xs">
                            <span class="text-[#37AA49] font-black">🏆 ${isAr ? 'انتصار' : 'VICTORY'} <span class="text-[10px] text-[#37AA49]/70">(+28 CP)</span></span>
                            <span class="text-white/70">Battle Royale</span>
                            <span class="text-white/50">3h ${isAr ? 'مضت' : 'ago'}</span>
                        </div>
                        <div class="flex items-center justify-between c-bg-burgundy border c-border-primary p-2.5 rounded-lg text-xs">
                            <span class="text-[#FFD875] font-black">🤝 ${isAr ? 'تعادل' : 'DRAW'} <span class="text-[10px] c-text-gold-70">(+5 CP)</span></span>
                            <span class="text-white/70">Resource War</span>
                            <span class="text-white/50">5h ${isAr ? 'مضت' : 'ago'}</span>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    `;

    // Save name button
    const saveBtn = container.querySelector('#save-profile-btn');
    const nameInput = container.querySelector('#profile-name-input');
    if (saveBtn && nameInput) {
        saveBtn.addEventListener('click', (e) => {
            createRipple(e, saveBtn);
            playSound('reward');
            const newName = nameInput.value.trim() || playerName;
            const nameEl = document.getElementById('player-name-text');
            if (nameEl) nameEl.textContent = newName;
            if (window.showToast) {
                window.showToast(isAr ? 'تم حفظ البيانات بنجاح!' : 'Profile saved!', 'success');
            }
        });
    }

    // Change avatar button — opens overlay
    const changeAvatarBtn = container.querySelector('#change-avatar-btn');
    if (changeAvatarBtn) {
        changeAvatarBtn.addEventListener('click', () => {
            playSound('pop');
            showAvatarPickerOverlay(AVATARS, selectedAvatarSrc, isAr, (chosenSrc) => {
                selectedAvatarSrc = chosenSrc;
                const display = document.getElementById('profile-avatar-display');
                if (display) display.src = chosenSrc;
                const hudAvatar = document.getElementById('avatar-image');
                if (hudAvatar) hudAvatar.src = chosenSrc;
            });
        });
    }
}

/**
 * Show the avatar picker overlay (10 avatars, last one locked Lvl 60)
 */
function showAvatarPickerOverlay(avatars, currentSrc, isAr, onSelect) {
    const overlay = document.createElement('div');
    overlay.className = 'avatar-overlay';
    overlay.id = 'avatar-picker-overlay';

    const avatarCards = avatars.map((av, idx) => {
        const isLocked = av.locked && true;
        const isSelected = av.src === currentSrc && idx === avatars.findIndex(a => a.src === currentSrc);
        return `
            <div class="avatar-choice-card ${isSelected ? 'selected' : ''} ${isLocked ? 'locked' : ''}"
                 data-src="${av.src}" data-idx="${idx}" data-locked="${isLocked ? '1' : '0'}"
                 title="${av.label}${isLocked ? ` (${isAr ? 'مقفول - الوصول للمستوى 60' : 'Locked - Reach Level 60'})` : ''}">
                <img src="${av.src}" alt="${av.label}">
            </div>
        `;
    }).join('');

    overlay.innerHTML = `
        <div class="avatar-overlay-box">
            <img src="img/box-white.png" class="box-art" alt="">
            <div class="avatar-overlay-cavity">
                <div class="flex items-center justify-between w-full px-2 pb-1 border-b c-border-primary">
                    <h3 class="text-sm font-black text-[#FFD875] flex items-center gap-1.5"><i class="fa-solid fa-masks-theater"></i>${isAr ? 'اختر شخصيتك الكرتونية' : 'Choose Cartoon Hero'}</h3>
                    <button id="close-avatar-overlay" class="btn-press cursor-pointer">
                        <img src="img/X.png" alt="Close" class="w-6 h-6 drop-shadow">
                    </button>
                </div>
                <div class="grid grid-cols-2 gap-3 w-full max-h-[360px] overflow-y-auto modal-scrollbar p-1">
                    ${avatarCards}
                </div>
                <p class="text-[10px] c-text-gold-80 text-center font-bold mt-1">
                    <i class="fa-solid fa-lock mr-1"></i>${isAr ? 'الأفاتار الأخير مقفول حتى المستوى 60' : 'Final Avatar unlocks at Level 60'}
                </p>
            </div>
        </div>
    `;

    document.body.appendChild(overlay);

    // Close button
    overlay.querySelector('#close-avatar-overlay').addEventListener('click', () => {
        playSound('close');
        overlay.remove();
    });
    overlay.addEventListener('click', (e) => {
        if (e.target === overlay) { playSound('close'); overlay.remove(); }
    });

    // Avatar selection
    overlay.querySelectorAll('.avatar-choice-card').forEach(card => {
        card.addEventListener('click', () => {
            if (card.getAttribute('data-locked') === '1') {
                playSound('alert');
                if (window.showToast) window.showToast(isAr ? '🔒 هذا الأفاتار مقفول حتى المستوى 60!' : '🔒 Locked until Level 60!', 'alert');
                return;
            }
            playSound('equip');
            overlay.querySelectorAll('.avatar-choice-card').forEach(c => c.classList.remove('selected'));
            card.classList.add('selected');
            onSelect(card.getAttribute('data-src'));
            setTimeout(() => { playSound('save'); overlay.remove(); }, 250);
        });
    });
}

/**
 * Render Chat & Friends full page content
 * Vertical tabs on desktop, horizontal tabs on mobile
 */
function renderChatContent() {
    const container = document.getElementById('fullpage-chat-content');
    if (!container) return;

    const isAr = getCurrentLang() === 'ar';

    // Tab definitions
    const TABS = [
        { id: 'friends',  icon: '👥', labelAr: 'الأصدقاء',       labelEn: 'Friends' },
        { id: 'global',   icon: '🌍', labelAr: 'الدردشة العالمية', labelEn: 'Global Chat' },
        { id: 'recent',   icon: '💬', labelAr: 'سجل الدردشات',    labelEn: 'Recent Chats' },
        { id: 'blocked',  icon: '🚫', labelAr: 'المحظورين',       labelEn: 'Blocked' },
    ];

    // Sample data
    const FRIENDS_DATA = [
        { id: 'f1', name: 'إمبراطور النمل',   avatar: 'img/ant1.png',    isOnline: true,  status: 'In Game',   level: 58 },
        { id: 'f2', name: 'صائد العقارب',     avatar: 'img/beetle.png',  isOnline: true,  status: 'Online',    level: 52 },
        { id: 'f3', name: 'درع الكايتين',     avatar: 'img/ant2.png',    isOnline: false, status: 'Offline',   level: 48 },
        { id: 'f4', name: 'كشافة الرعد',      avatar: 'img/ant1.png',    isOnline: true,  status: 'In Lobby',  level: 44 },
        { id: 'f5', name: 'حامي الملكة',      avatar: 'img/beetle.png',  isOnline: false, status: 'Offline',   level: 39 },
    ];

    const GLOBAL_MSGS = [
        { sender: 'إمبراطور النمل', avatar: 'img/ant1.png',   text: 'من يريد لعب معركة الفرق؟', time: '14:32' },
        { sender: 'صائد العقارب',   avatar: 'img/beetle.png', text: 'أنا جاهز! انتظرني في اللوبي.', time: '14:33' },
        { sender: 'Ant Commander',  avatar: 'img/ant1.png',   text: 'أنا معكم! هيا بنا.', time: '14:35', isMe: true },
        { sender: 'درع الكايتين',   avatar: 'img/ant2.png',   text: 'ما رأيكم في خريطة الصحراء؟', time: '14:36' },
    ];

    const DIRECT_MSGS = {
        'f1': [
            { sender: 'إمبراطور النمل', avatar: 'img/ant1.png', text: 'مرحباً يا قائد! كيف المعارك اليوم؟', time: '12:10' },
            { sender: 'Ant Commander',  avatar: 'img/ant1.png', text: 'ممتازة! فزنا بـ 5 جولات متتالية 🔥', time: '12:12', isMe: true },
        ],
        'f2': [
            { sender: 'صائد العقارب', avatar: 'img/beetle.png', text: 'هل تريد اللعب معاً؟', time: '09:00' },
        ],
    };

    const BLOCKED_DATA = [
        { name: 'لاعب مزعج', avatar: 'img/ant2.png', reason: 'إزعاج متكرر', date: '2025-08-01' },
    ];

    let activeTab = 'friends';
    let whisperTarget = null;

    const buildVerticalTabs = () => TABS.map(tab => `
        <button class="chat-tab-btn-v ${tab.id === activeTab ? 'active' : ''}" data-ctab="${tab.id}">
            <span>${tab.icon}</span>
            <span>${isAr ? tab.labelAr : tab.labelEn}</span>
            ${tab.id === 'friends' ? `<span class="chat-tab-badge">${FRIENDS_DATA.filter(f => f.isOnline).length}</span>` : ''}
        </button>
    `).join('');

    const buildHorizontalTabs = () => TABS.map(tab => `
        <button class="chat-tab-btn-h ${tab.id === activeTab ? 'active' : ''}" data-ctab="${tab.id}">
            <span>${tab.icon}</span>
            <span>${isAr ? tab.labelAr : tab.labelEn}</span>
        </button>
    `).join('');

    container.innerHTML = `
        <!-- أفقي (هاتف) -->
        <div class="chat-top-tabs-h" id="chat-top-tabs">${buildHorizontalTabs()}</div>

        <div class="chat-page-layout">
            <!-- رأسي (كمبيوتر) -->
            <div class="chat-sidebar-tabs" id="chat-sidebar-tabs">${buildVerticalTabs()}</div>

            <!-- المحتوى -->
            <div class="chat-main-area" id="chat-tab-content"></div>
        </div>
    `;

    function renderTabContent() {
        const content = document.getElementById('chat-tab-content');
        if (!content) return;

        if (activeTab === 'friends') {
            renderFriendsPanel(content);
        } else if (activeTab === 'global') {
            renderGlobalChat(content);
        } else if (activeTab === 'recent') {
            renderRecentChats(content);
        } else if (activeTab === 'blocked') {
            renderBlockedPanel(content);
        }
    }

    function setActiveTab(tabId) {
        activeTab = tabId;
        whisperTarget = null;
        // Update buttons
        document.querySelectorAll('.chat-tab-btn-v, .chat-tab-btn-h').forEach(btn => {
            btn.classList.toggle('active', btn.getAttribute('data-ctab') === tabId);
        });
        renderTabContent();
    }

    // Tab click bindings
    container.addEventListener('click', (e) => {
        const tabBtn = e.target.closest('[data-ctab]');
        if (tabBtn) {
            playSound('click');
            setActiveTab(tabBtn.getAttribute('data-ctab'));
        }
    });

    function renderFriendsPanel(content) {
        let html = `
            <div class="text-[#ffd875] font-black text-sm mb-3 flex items-center gap-2">
                <span>👥</span> ${isAr ? 'قائمة الأصدقاء' : 'Friends List'}
                <span class="chat-tab-badge">${FRIENDS_DATA.filter(f => f.isOnline).length} ${isAr ? 'متصل' : 'online'}</span>
            </div>
            <div class="flex flex-col gap-2 overflow-y-auto flex-1 modal-scrollbar">
        `;

        FRIENDS_DATA.forEach(f => {
            const dotColor = !f.isOnline ? 'bg-gray-500' : f.status === 'In Game' ? 'bg-[#7E2025]' : 'bg-[#37AA49]';
            html += `
                <div class="friend-card-row" data-friend-id="${f.id}">
                    <div class="flex items-center gap-3">
                        <div class="relative flex-shrink-0">
                            <img src="${f.avatar}" class="w-11 h-11 rounded-full border-2 c-border-primary object-cover">
                            <span class="absolute bottom-0 right-0 w-3 h-3 rounded-full ${dotColor} border-2 border-black"></span>
                        </div>
                        <div class="flex flex-col">
                            <span class="text-white font-black text-sm">${f.name}</span>
                            <span class="c-text-gold-70 text-xs font-bold">${f.status} · Lvl ${f.level}</span>
                        </div>
                    </div>
                    <button class="btn-wood-empty w-[90px] h-[34px] friend-chat-btn" data-friend-id="${f.id}">
                        <img src="img/Empty-button.png" class="btn-bg-art">
                        <span class="btn-inner-content text-[#ffd875] font-black text-[10px]">💬 ${isAr ? 'دردشة' : 'Chat'}</span>
                    </button>
                </div>
            `;
        });

        html += `</div>`;
        content.innerHTML = html;

        // Friend chat click — open direct whisper
        content.querySelectorAll('.friend-chat-btn').forEach(btn => {
            btn.addEventListener('click', (e) => {
                e.stopPropagation();
                createRipple(e, btn);
                playSound('chat');
                const fid = btn.getAttribute('data-friend-id');
                whisperTarget = FRIENDS_DATA.find(f => f.id === fid);
                renderDirectChat(content, whisperTarget, DIRECT_MSGS[fid] || []);
            });
        });
    }

    function renderDirectChat(content, friend, msgs) {
        content.innerHTML = `
            <div class="flex items-center gap-3 mb-3 pb-2 border-b c-border-primary">
                <button id="chat-back-to-friends" class="btn-press text-[#FFD875] text-lg font-black cursor-pointer">◀</button>
                <img src="${friend.avatar}" class="w-9 h-9 rounded-full border border-[#BC4526] object-cover">
                <div>
                    <span class="text-white font-black text-sm">${friend.name}</span>
                    <div class="text-xs text-[#37AA49] font-bold flex items-center gap-1">
                        <span class="w-2 h-2 rounded-full ${friend.isOnline ? 'bg-[#37AA49]' : 'bg-gray-500'} inline-block"></span>
                        ${friend.status}
                    </div>
                </div>
            </div>
            <div id="direct-msgs-container" class="flex-1 flex flex-col gap-3 overflow-y-auto modal-scrollbar p-2 bg-black/40 rounded-xl border c-border-primary min-h-0"></div>
            <div class="flex items-center gap-2 mt-3 flex-shrink-0">
                <div class="text-bg-box flex-1 h-[40px] px-3 rounded-lg">
                    <input id="direct-chat-input" type="text" placeholder="${isAr ? 'اكتب رسالتك...' : 'Type a message...'}"
                           class="w-full h-full bg-transparent text-white font-bold text-xs outline-none placeholder-amber-200/40">
                </div>
                <button id="direct-send-btn" class="btn-wood-empty w-[80px] h-[40px]">
                    <img src="img/Empty-button.png" class="btn-bg-art">
                    <span class="btn-inner-content text-[#ffd875] font-black text-xs">${isAr ? 'إرسال' : 'Send'}</span>
                </button>
            </div>
        `;

        const msgsContainer = document.getElementById('direct-msgs-container');
        function renderDirectMsgs(msgs) {
            msgsContainer.innerHTML = msgs.length === 0
                ? `<span class="text-white/50 text-xs text-center py-8">${isAr ? 'لا رسائل بعد. ابدأ المحادثة! 👋' : 'No messages yet. Say hello! 👋'}</span>`
                : msgs.map(m => `
                    <div class="flex gap-2 items-end ${m.isMe ? 'flex-row-reverse self-end' : 'self-start'} max-w-[80%]">
                        <img src="${m.avatar}" class="w-7 h-7 rounded-full border border-[#BC4526] object-cover flex-shrink-0">
                        <div class="flex flex-col ${m.isMe ? 'items-end' : 'items-start'}">
                            <span class="text-[9px] c-text-gold-70 px-1 mb-0.5">${m.sender} · ${m.time}</span>
                            <div class="${m.isMe ? 'chat-bubble-mine' : 'chat-bubble-other'}">${m.text}</div>
                        </div>
                    </div>
                `).join('');
            msgsContainer.scrollTop = msgsContainer.scrollHeight;
        }

        let localMsgs = [...msgs];
        renderDirectMsgs(localMsgs);

        content.querySelector('#chat-back-to-friends').addEventListener('click', () => {
            playSound('close');
            renderFriendsPanel(content);
        });

        function sendDirect() {
            const inp = document.getElementById('direct-chat-input');
            const text = inp?.value?.trim();
            if (!text) return;
            const now = new Date();
            localMsgs.push({
                sender: 'Ant Commander', avatar: 'img/ant1.png', isMe: true, text,
                time: `${String(now.getHours()).padStart(2,'0')}:${String(now.getMinutes()).padStart(2,'0')}`
            });
            inp.value = '';
            playSound('chat');
            renderDirectMsgs(localMsgs);
        }

        document.getElementById('direct-send-btn')?.addEventListener('click', (e) => { createRipple(e, e.currentTarget); sendDirect(); });
        document.getElementById('direct-chat-input')?.addEventListener('keydown', (e) => { if (e.key === 'Enter') sendDirect(); });
    }

    function renderGlobalChat(content) {
        let localGlobalMsgs = [...GLOBAL_MSGS];

        content.innerHTML = `
            <div class="text-[#ffd875] font-black text-sm mb-3 flex items-center gap-2">
                <span>🌍</span> ${isAr ? 'الدردشة العالمية' : 'Global Realm Chat'}
                <span class="text-[#37AA49] text-xs font-bold">● ${isAr ? 'متصل' : 'Online'}</span>
            </div>
            <div id="global-msgs-container" class="flex-1 flex flex-col gap-3 overflow-y-auto modal-scrollbar p-2 bg-black/40 rounded-xl border c-border-primary min-h-0"></div>
            <div class="flex items-center gap-2 mt-3 flex-shrink-0">
                <div class="text-bg-box flex-1 h-[40px] px-3 rounded-lg">
                    <input id="global-chat-input" type="text" placeholder="${isAr ? 'راسل العالم...' : 'Message the realm...'}"
                           class="w-full h-full bg-transparent text-white font-bold text-xs outline-none placeholder-amber-200/40">
                </div>
                <button id="global-send-btn" class="btn-wood-empty w-[80px] h-[40px]">
                    <img src="img/Empty-button.png" class="btn-bg-art">
                    <span class="btn-inner-content text-[#ffd875] font-black text-xs">${isAr ? 'إرسال' : 'Send'}</span>
                </button>
            </div>
        `;

        const msgsContainer = document.getElementById('global-msgs-container');
        function renderGlobal(msgs) {
            msgsContainer.innerHTML = msgs.map(m => `
                <div class="flex gap-2 items-end ${m.isMe ? 'flex-row-reverse self-end' : 'self-start'} max-w-[80%]">
                    <img src="${m.avatar}" class="w-7 h-7 rounded-full border border-[#BC4526] object-cover flex-shrink-0">
                    <div class="flex flex-col ${m.isMe ? 'items-end' : 'items-start'}">
                        <span class="text-[9px] c-text-gold-70 px-1 mb-0.5">${m.sender} · ${m.time}</span>
                        <div class="${m.isMe ? 'chat-bubble-mine' : 'chat-bubble-other'}">${m.text}</div>
                    </div>
                </div>
            `).join('');
            msgsContainer.scrollTop = msgsContainer.scrollHeight;
        }
        renderGlobal(localGlobalMsgs);

        function sendGlobal() {
            const inp = document.getElementById('global-chat-input');
            const text = inp?.value?.trim();
            if (!text) return;
            const now = new Date();
            localGlobalMsgs.push({
                sender: 'Ant Commander', avatar: 'img/ant1.png', isMe: true, text,
                time: `${String(now.getHours()).padStart(2,'0')}:${String(now.getMinutes()).padStart(2,'0')}`
            });
            inp.value = '';
            playSound('chat');
            renderGlobal(localGlobalMsgs);
        }

        document.getElementById('global-send-btn')?.addEventListener('click', (e) => { createRipple(e, e.currentTarget); sendGlobal(); });
        document.getElementById('global-chat-input')?.addEventListener('keydown', (e) => { if (e.key === 'Enter') sendGlobal(); });
    }

    function renderRecentChats(content) {
        const recentFriends = FRIENDS_DATA.filter(f => DIRECT_MSGS[f.id]);
        content.innerHTML = `
            <div class="text-[#ffd875] font-black text-sm mb-3 flex items-center gap-2">
                <span>💬</span> ${isAr ? 'سجل الدردشات السابقة' : 'Recent Conversations'}
            </div>
            <div class="flex flex-col gap-2 overflow-y-auto flex-1 modal-scrollbar">
                ${recentFriends.length === 0 ? `<span class="text-white/50 text-xs py-8 text-center">${isAr ? 'لا محادثات سابقة.' : 'No recent chats.'}</span>` :
                recentFriends.map(f => {
                    const msgs = DIRECT_MSGS[f.id] || [];
                    const lastMsg = msgs.length > 0 ? msgs[msgs.length - 1] : null;
                    return `
                        <div class="friend-card-row recent-friend-btn" data-friend-id="${f.id}">
                            <div class="flex items-center gap-3 min-w-0">
                                <img src="${f.avatar}" class="w-11 h-11 rounded-full border-2 c-border-primary object-cover flex-shrink-0">
                                <div class="flex flex-col min-w-0">
                                    <span class="text-white font-black text-sm">${f.name}</span>
                                    <span class="text-[#FFD875]/60 text-xs truncate max-w-[200px]">${lastMsg ? lastMsg.text : '...'}</span>
                                </div>
                            </div>
                            <span class="text-white/40 text-xs flex-shrink-0">${lastMsg ? lastMsg.time : ''}</span>
                        </div>
                    `;
                }).join('')}
            </div>
        `;

        content.querySelectorAll('.recent-friend-btn').forEach(card => {
            card.addEventListener('click', () => {
                playSound('chat');
                const fid = card.getAttribute('data-friend-id');
                const friend = FRIENDS_DATA.find(f => f.id === fid);
                if (friend) renderDirectChat(content, friend, DIRECT_MSGS[fid] || []);
            });
        });
    }

    function renderBlockedPanel(content) {
        let localBlocked = [...BLOCKED_DATA];
        function rebuildBlocked() {
            content.innerHTML = `
                <div class="text-[#ffd875] font-black text-sm mb-3 flex items-center gap-2">
                    <span>🚫</span> ${isAr ? 'قائمة المحظورين' : 'Blocked Players'}
                    <span class="chat-tab-badge">${localBlocked.length}</span>
                </div>
                <div class="flex flex-col gap-2 overflow-y-auto flex-1 modal-scrollbar">
                    ${localBlocked.length === 0
                        ? `<span class="text-white/50 text-xs py-8 text-center">${isAr ? 'لا يوجد لاعبون محظورون.' : 'No blocked players.'}</span>`
                        : localBlocked.map((b, idx) => `
                            <div class="friend-card-row">
                                <div class="flex items-center gap-3">
                                    <img src="${b.avatar}" class="w-11 h-11 rounded-full border-2 border-red-700 object-cover filter grayscale">
                                    <div class="flex flex-col">
                                        <span class="text-white font-black text-sm">${b.name}</span>
                                        <span class="text-red-300/80 text-xs">${isAr ? 'السبب:' : 'Reason:'} ${b.reason}</span>
                                        <span class="text-white/40 text-[9px]">${b.date}</span>
                                    </div>
                                </div>
                                <button class="btn-wood-empty w-[90px] h-[34px] unblock-btn" data-idx="${idx}">
                                    <img src="img/Empty-button.png" class="btn-bg-art">
                                    <span class="btn-inner-content text-[#37AA49] font-black text-[10px]">${isAr ? 'إلغاء الحجب' : 'Unblock'}</span>
                                </button>
                            </div>
                        `).join('')}
                </div>
            `;
            content.querySelectorAll('.unblock-btn').forEach(btn => {
                btn.addEventListener('click', (e) => {
                    e.stopPropagation();
                    createRipple(e, btn);
                    playSound('pop');
                    const idx = parseInt(btn.getAttribute('data-idx'));
                    localBlocked.splice(idx, 1);
                    rebuildBlocked();
                    if (window.showToast) window.showToast(isAr ? 'تم إلغاء الحجب!' : 'Player unblocked!', 'success');
                });
            });
        }
        rebuildBlocked();
    }

    // Initial render
    renderTabContent();
}


