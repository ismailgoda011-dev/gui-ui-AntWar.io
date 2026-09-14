import { initI18n, setLanguage, t, getCurrentLang, applyTranslations } from './js/i18n.js';
import { startPreloader } from './js/loader.js';
import { initAudio, playSound, startAmbientBgm, setAudioSettings } from './js/audio.js';
import { animateModalOpen, animateModalClose, createRipple } from './js/animations.js';
import { initFullPages, openFullPage, closeFullPage } from './js/fullpages.js';
import { loadUIRegistry, getUIRegistry, renderHeaderDock, renderServerOptions, getDailyRewards, getDailyQuests, getPassTabs, asset } from './js/ui-registry.js';
import { setState } from './js/core/game-state.js';

// Preload critical assets and initialize translations
startPreloader();
const i18nReady = initI18n();
const uiRegistryReady = loadUIRegistry();

document.addEventListener('DOMContentLoaded', async () => {
    await i18nReady;
    await uiRegistryReady;
    const uiRegistry = getUIRegistry();
    window.AntWarI18n = { t, setLanguage, getCurrentLang, applyTranslations };
    renderHeaderDock(document.getElementById('events-quick-dock'));
    renderServerOptions(document.getElementById('server-options-list'));
    window.addEventListener('languageChanged', () => {
        renderHeaderDock(document.getElementById('events-quick-dock'));
        renderServerOptions(document.getElementById('server-options-list'));
        applyTranslations();
        document.querySelectorAll('#mobile-bottom-nav [data-label-key]').forEach(el => { const key = el.getAttribute('data-label-key'); const label = el.querySelector('.bnav-label'); if (label && key) label.textContent = t(key); });
    });
    // Initialize Full Screen Views and Mobile Bottom Nav
    initFullPages();

    // =======================================================
    // 1. نظام الصوتيات والمؤثرات — centralized AudioManager
    // =======================================================
    initAudio({});
    document.addEventListener('click', startAmbientBgm, { once: true });
    document.addEventListener('click', (e) => {
        if (e.target.closest('.btn-press, .btn-wood, .btn-wood-empty, .rpg-unified-btn, .wood-tab-btn, .social-chat-tab-btn, .setting-opt-pill, .btn-compact-wood, .rpg-toggle-pill, .rpg-dropdown-trigger, .avatar-choice-card')) {
            playSound('click');
        }
    });

    // =======================================================
    // 2. محرك النوافذ التفاعلية (Tangible Modal Engine)
    // =======================================================
    const modalRoot = document.getElementById('modal-root');
    let globalTopZIndex = 100;
    const modalInstances = new Map();

    function getModalBox(id, tpl) {
        const isMobile = window.innerWidth <= 640;
        // لغرفة المعركة / اللوبي وإنشاء الغرفة: استخدام img/box-white.png للهواتف و img/box-white-brother.png للشاشات الواسعة
        if (id === 'room-lobby' || id === 'create-room') {
            return isMobile ? 'img/box-white.png' : 'img/box-white-brother.png';
        }
        // في وضع الهاتف لباقي النوافذ: نستخدم img/box-big.png
        if (isMobile) {
            return 'img/box-big.png';
        }
        // في الشاشات العريضة (الكمبيوتر):
        if (tpl.box) return tpl.box;
        if (id === 'royal-pass') return 'img/box-big-Brother.png';
        return 'img/box-big.png';
    }

    function getBoxStyleClass(boxName) {
        if (boxName === 'img/box-white-brother.png') return 'box-white-brother-style';
        if (boxName === 'img/box-white.png') return 'box-white-style';
        if (boxName === 'img/box-big-Brother.png') return 'box-brother-style';
        if (boxName === 'img/box.png') return 'box-leaves-style';
        return 'box-big-style';
    }

    function buildModalDOM(id, tpl) {
        const backdrop = document.createElement('div');
        backdrop.id = `modal-${id}`;
        backdrop.className = 'game-modal-backdrop fixed inset-0 bg-black/60 backdrop-blur-[6px] flex justify-center items-center opacity-0 pointer-events-none transition-all duration-300 p-2 sm:p-4';

        let footerHTML = '';
        if (tpl.footer) {
            footerHTML = `
                <button id="${tpl.footer.id}" class="btn-wood-empty modal-footer-btn" ${tpl.footer.title ? `title="${tpl.footer.title}"` : ''}>
                    <img src="${tpl.footer.img || 'img/Empty-button.png'}" alt="" class="btn-bg-art">
                    <span class="btn-inner-content text-white font-extrabold text-xs sm:text-sm uppercase tracking-wider drop-shadow">
                        ${tpl.footer.title || 'Confirm'}
                    </span>
                </button>
            `;
        }

        const headerIconHTML = tpl.icon ? `<img src="${tpl.icon}" alt="" class="w-6 h-6 sm:w-7 sm:h-7 drop-shadow-md object-contain">` : '';
        const initialBox = getModalBox(id, tpl);
        const boxClass = getBoxStyleClass(initialBox);

        backdrop.innerHTML = `
            <div id="wood-modal-container-${id}" class="wood-modal-container ${tpl.size || ''} ${boxClass} relative flex flex-col items-center">
                <div id="wood-modal-box-${id}" class="wood-modal-box relative w-full">
                    <img id="wood-modal-box-art-${id}" src="${initialBox}" alt="" class="box-art">
                    <div id="wood-modal-cavity-${id}" class="wood-modal-cavity">
                        <div id="wood-modal-header-${id}" class="wood-modal-header">
                            <div class="flex items-center gap-2 select-none min-w-0 flex-1 pr-1">
                                ${headerIconHTML}
                                <span id="modal-title-text-${id}" class="modal-title text-white font-extrabold text-xs sm:text-sm tracking-wider drop-shadow uppercase truncate">${tpl.title}</span>
                            </div>
                            <button id="modal-close-btn-${id}" class="modal-close-btn btn-press p-0 cursor-pointer flex-shrink-0" aria-label="Close">
                                <img src="img/X.png" alt="Close" class="w-6 h-6 sm:w-8 sm:h-8 drop-shadow-md">
                            </button>
                        </div>
                        <div id="wood-modal-body-${id}" class="wood-modal-body modal-scrollbar"></div>
                    </div>
                </div>
                ${footerHTML}
            </div>`;

        backdrop.querySelector('.modal-close-btn').addEventListener('click', () => closeModal(id));
        backdrop.addEventListener('click', (e) => {
            if (e.target === backdrop) closeModal(id);
        });

        modalRoot.appendChild(backdrop);
        return backdrop;
    }

    function openModal(id) {
        const tpl = MODAL_TEMPLATES[id];
        if (!tpl) return;

        let inst = modalInstances.get(id);

        // سلوك التبديل (Toggle): إذا كانت النافذة مفتوحة حالياً، يتم إغلاقها فوراً
        if (inst && inst.classList.contains('active')) {
            closeModal(id);
            return;
        }

        if (!inst) {
            inst = buildModalDOM(id, tpl);
            modalInstances.set(id, inst);
        }

        // تحديث أصل الصندوق وفق نمط العرض الحالي (هاتف أو كمبيوتر)
        const boxArt = inst.querySelector('.box-art');
        const container = inst.querySelector('.wood-modal-container');
        const activeBox = getModalBox(id, tpl);
        if (boxArt && boxArt.getAttribute('src') !== activeBox) {
            boxArt.src = activeBox;
        }
        if (container) {
            container.classList.remove('box-big-style', 'box-brother-style', 'box-leaves-style');
            container.classList.add(getBoxStyleClass(activeBox));
        }

        const body = inst.querySelector('.wood-modal-body');
        if (tpl.body) body.innerHTML = tpl.body();
        if (tpl.mount) tpl.mount(body, inst);

        globalTopZIndex += 2;
        inst.style.zIndex = globalTopZIndex;
        inst.classList.add('active');
        playSound('pop');

        // تطبيق انيميشن GSAP السلس
        if (container) {
            animateModalOpen(container);
        }
    }

    function closeModal(id) {
        const inst = modalInstances.get(id) || document.getElementById(`modal-${id}`);
        if (!inst) return;
        playSound('close');

        const container = inst.querySelector('.wood-modal-container');
        if (container) {
            animateModalClose(container, () => {
                inst.classList.remove('active');
                if (MODAL_TEMPLATES[id] && MODAL_TEMPLATES[id].unmount) {
                    MODAL_TEMPLATES[id].unmount(inst);
                }
            });
        } else {
            inst.classList.remove('active');
            if (MODAL_TEMPLATES[id] && MODAL_TEMPLATES[id].unmount) {
                MODAL_TEMPLATES[id].unmount(inst);
            }
        }
    }

    function closeAllModals() {
        modalInstances.forEach((inst, id) => {
            if (inst && inst.classList.contains('active')) {
                closeModal(id);
            }
        });
        document.querySelectorAll('.wood-modal-backdrop.active').forEach(m => m.classList.remove('active'));
    }
    window.closeAllModals = closeAllModals;

    window.openModal = openModal;
    window.closeModal = closeModal;
    window.closeFullPage = closeFullPage;
    function showToast(message, iconOrType = '') {
        const container = document.getElementById('toast-container');
        if (!container) return;

        const toast = document.createElement('div');
        toast.className = 'rpg-toast';

        let iconHtml = '';
        if (iconOrType) {
            if (typeof iconOrType === 'string' && iconOrType.trim().startsWith('<')) {
                iconHtml = iconOrType;
            } else if (iconOrType === 'success') {
                iconHtml = '<i class="fa-solid fa-circle-check c-text-green"></i>';
            } else if (iconOrType === 'alert' || iconOrType === 'error') {
                iconHtml = '<i class="fa-solid fa-triangle-exclamation c-text-gold"></i>';
            } else if (typeof iconOrType === 'string') {
                iconHtml = `<i class="fa-solid fa-${iconOrType}"></i>`;
            }
        }

        toast.innerHTML = `${iconHtml}<span>${message}</span>`;
        container.appendChild(toast);

        setTimeout(() => {
            toast.classList.add('toast-fadeout');
            setTimeout(() => {
                if (toast.parentNode) {
                    toast.parentNode.removeChild(toast);
                }
            }, 300);
        }, 2500);
    }

    window.showToast = showToast;

    document.addEventListener('keydown', (e) => {
        if (e.key === 'Escape') {
            const active = Array.from(document.querySelectorAll('.game-modal-backdrop.active'));
            if (active.length > 0) {
                active.sort((a, b) => (parseInt(b.style.zIndex) || 0) - (parseInt(a.style.zIndex) || 0));
                closeModal(active[0].id.replace('modal-', ''));
            }
        }
    });

    // =======================================================
    // 3. جزيئات اليراعات والضوء المحيطي (Canvas Fireflies)
    // =======================================================
    const canvas = document.getElementById('ambient-particles-canvas');
    if (canvas) {
        const ctx = canvas.getContext('2d');
        let width = canvas.width = window.innerWidth;
        let height = canvas.height = window.innerHeight;

        window.addEventListener('resize', () => {
            width = canvas.width = window.innerWidth;
            height = canvas.height = window.innerHeight;
        });

        const particles = [];
        for (let i = 0; i < 32; i++) {
            particles.push({
                x: Math.random() * width, y: Math.random() * height,
                radius: Math.random() * 2.5 + 1.2,
                speedX: (Math.random() - 0.5) * 0.4,
                speedY: (Math.random() - 0.5) * 0.4 - 0.2,
                alpha: Math.random() * 0.7 + 0.2,
                alphaChange: (Math.random() - 0.5) * 0.015
            });
        }

        function animateParticles() {
            ctx.clearRect(0, 0, width, height);
            particles.forEach(p => {
                p.x += p.speedX; p.y += p.speedY; p.alpha += p.alphaChange;
                if (p.alpha <= 0.1 || p.alpha >= 0.8) p.alphaChange *= -1;
                if (p.x < 0) p.x = width; if (p.x > width) p.x = 0;
                if (p.y < 0) p.y = height; if (p.y > height) p.y = 0;
                ctx.beginPath();
                ctx.arc(p.x, p.y, p.radius, 0, Math.PI * 2);
                ctx.fillStyle = `rgba(255, 216, 117, ${p.alpha})`;
                ctx.shadowBlur = 10; ctx.shadowColor = '#ffd875';
                ctx.fill();
            });
            requestAnimationFrame(animateParticles);
        }
        animateParticles();
    }

    // =======================================================
    // 4. البارالاكس 3D والتفاعل الصندوقي
    // =======================================================
    const mainBoxWrapper = document.getElementById('main-box-wrapper');
    const mainBoxContainer = document.getElementById('main-box-container');
    if (mainBoxWrapper && mainBoxContainer) {
        mainBoxWrapper.addEventListener('mousemove', (e) => {
            const rect = mainBoxWrapper.getBoundingClientRect();
            const x = e.clientX - rect.left - rect.width / 2;
            const y = e.clientY - rect.top - rect.height / 2;
            mainBoxContainer.style.transform = `rotateX(${((-y / rect.height) * 14).toFixed(2)}deg) rotateY(${((x / rect.width) * 14).toFixed(2)}deg)`;
        });
        mainBoxWrapper.addEventListener('mouseleave', () => {
            mainBoxContainer.style.transform = `rotateX(0deg) rotateY(0deg)`;
        });
    }

    // نسخ الـ ID
    document.addEventListener('click', (e) => {
        const target = e.target.closest('.copyable-id');
        if (!target) return;
        const idToCopy = target.getAttribute('data-id') || target.textContent.replace(/[^0-9]/g, '') || '123456';
        navigator.clipboard.writeText(idToCopy).then(() => {
            target.classList.remove('bump');
            void target.offsetWidth;
            target.classList.add('bump');
            const originalHTML = target.innerHTML;
            target.innerHTML = `<span class="text-[#37AA49] font-bold">Copied!</span>`;
            playSound('click');
            setTimeout(() => { target.innerHTML = originalHTML; }, 1200);
        });
    });

    // =======================================================
    // 5. حزمة الأيقونات الافتراضية عالية النقاء (Safe Clean SVG Icons)
    // =======================================================
    const sampleItemIcons = {
        sword: 'img/icons/sword.svg',
        shield: 'img/icons/shield.svg',
        potion: 'img/icons/potion.svg',
        chest: 'img/icons/chest.svg',
        crown: 'img/icons/crown.svg',
        gem: 'img/icons/gem.svg',
        armor: 'img/icons/armor.svg',
        relic: 'img/icons/relic.svg'
    };

    // مولّد إطار العناصر: العنصر في طبقة علوية z-10 في المنتصف تماماً مع شادو مناسب
    function renderItemSlotHTML(item, extraClass = '') {
        const rarity = item.rarity || 'common';
        const graphic = item.graphic || item.icon || sampleItemIcons.sword;
        const countBadge = item.count ? `<span class="item-badge-count">${item.count}</span>` : '';
        return `
            <div class="item-slot-frame rarity-${rarity} ${extraClass}" title="${item.name || (item.nameKey ? t(item.nameKey) : '')}">
                <img src="img/frame-item.png" class="frame-border-art" alt="">
                <div class="item-content">
                    <img src="${graphic}" class="item-graphic" alt="">
                </div>
                ${countBadge}
            </div>
        `;
    }

    // =======================================================
    // DiceBear أفاتارات الحشرات — نظام الأفاتارات المولدة تلقائياً
    // API: https://api.dicebear.com/9.x/{style}/svg?seed={name}
    // نستخدم نمط "adventurer" مع بذور أسماء حشرات مخصصة للعبة
    // =======================================================
    function getDiceBearUrl(seed, style = 'adventurer') {
        // الأنماط المتاحة: adventurer, bottts-neutral, croodles-neutral, pixel-art
        const encoded = encodeURIComponent(seed || 'ant');
        const bg = 'b45309,92400e,78350f,d97706,fbbf24'; // ألوان ذهبية/بنية تناسب ثيم اللعبة
        return `https://api.dicebear.com/9.x/${style}/svg?seed=${encoded}&backgroundType=gradientLinear&backgroundColor=${bg}`;
    }

    // الأفاتارات الكرتونية للحشرات — DiceBear بذور مخصصة للشخصيات
    const cartoonBugAvatars = [
        { id: 'ant-worker', name: 'Worker Ant (نملة عاملة)', role: 'Collector', src: getDiceBearUrl('WorkerAntColony', 'adventurer') },
        { id: 'ant-soldier', name: 'Soldier Ant (نملة مقاتلة)', role: 'Warrior', src: getDiceBearUrl('SoldierAntWarrior', 'adventurer') },
        { id: 'queen-ant', name: 'Queen Ant (ملكة المستعمرة)', role: 'Commander', src: getDiceBearUrl('QueenAntRoyal', 'adventurer') },
        { id: 'iron-beetle', name: 'Iron Beetle (خنفساء دروع)', role: 'Tank', src: getDiceBearUrl('IronBeetleShield', 'bottts-neutral') },
        { id: 'shadow-spider', name: 'Shadow Spider (عنكبوت الظلال)', role: 'Assassin', src: getDiceBearUrl('ShadowSpiderNight', 'adventurer') },
        { id: 'royal-guard', name: 'Royal Guard (حارس المستعمرة)', role: 'Defender', src: getDiceBearUrl('RoyalGuardAnt', 'adventurer') },
        { id: 'forager-bug', name: 'Forager Bug (حشرة مؤن)', role: 'Scout', src: getDiceBearUrl('ForagerBugScout', 'adventurer') },
        { id: 'elder-sage', name: 'Elder Sage (الحكيم العجوز)', role: 'Mage', src: getDiceBearUrl('ElderSageMage', 'adventurer') }
    ];

    const availableAvatars = cartoonBugAvatars.map(a => a.src);

    let currentGold = 12450;
    let currentGems = 350;
    let userPassLevel = 18;
    let userPassXp = 850;
    const maxPassXp = 1000;

    function updateCurrenciesDisplay() {
        const g = document.getElementById('player-gold-count');
        const m = document.getElementById('player-gems-count');
        if (g) { g.textContent = currentGold.toLocaleString(); g.classList.add('bump'); setTimeout(() => g.classList.remove('bump'), 250); }
        if (m) { m.textContent = currentGems.toLocaleString(); m.classList.add('bump'); setTimeout(() => m.classList.remove('bump'), 250); }
        setState('player.gold', currentGold);
        setState('player.gems', currentGems);
    }

    // الأصدقاء واللاعبين (باستخدام أفتارات DiceBear للحشرات)
    const friendsData = [
        { name: 'Alex Hunter', id: '889123', level: 32, passLvl: 45, score: '18,400', status: 'Online', isOnline: true, isFriend: true, isBlocked: false, avatar: getDiceBearUrl('AlexHunter', 'adventurer'), title: '⚔️ نملة مغوارة', clan: '🐜 جنود النمل', kd: '3.8', winRate: '65%', lastMsg: 'See you in the dungeon arena!', lastTime: '10m ago' },
        { name: 'Sarah Connor', id: '773412', level: 28, passLvl: 30, score: '14,210', status: 'In Game', isOnline: true, isFriend: true, isBlocked: false, avatar: getDiceBearUrl('SarahConnor', 'adventurer'), title: '👑 ملكة التلال', clan: '👑 العائلة الملكية', kd: '4.5', winRate: '72%', lastMsg: 'Claimed the Royal sword 🔥', lastTime: '1h ago' },
        { name: 'DragonSlayer', id: '994155', level: 45, passLvl: 82, score: '29,800', status: 'Online', isOnline: true, isFriend: true, isBlocked: false, avatar: getDiceBearUrl('DragonSlayer', 'adventurer'), title: '🛡️ خنفساء لا تقهر', clan: '🪲 كتيبة الدروع', kd: '5.2', winRate: '80%', lastMsg: 'Need +1 for Endless Run!', lastTime: '2h ago' },
        { name: 'GhostRider', id: '661289', level: 19, passLvl: 14, score: '8,900', status: 'Offline', isOnline: false, isFriend: true, isBlocked: false, avatar: getDiceBearUrl('GhostRider', 'adventurer'), title: '🕷️ صياد العناكب', clan: '🕸️ عش العنكبوت', kd: '2.9', winRate: '54%', lastMsg: 'GG yesterday!', lastTime: '1d ago' },
        { name: 'Valkyrie Queen', id: '552144', level: 24, passLvl: 22, score: '11,350', status: 'Offline', isOnline: false, isFriend: true, isBlocked: false, avatar: getDiceBearUrl('ValkyrieQueen', 'adventurer'), title: '🌾 النملة الذهبية', clan: '🐜 نمل العمل', kd: '3.1', winRate: '58%', lastMsg: 'Check the new Vault items', lastTime: '2d ago' },
        { name: 'ShadowNinja', id: '332110', level: 38, passLvl: 56, score: '22,400', status: 'Online', isOnline: true, isFriend: true, isBlocked: false, avatar: getDiceBearUrl('ShadowNinja', 'adventurer'), title: '⚡ الدبور الصامت', clan: '🐝 الدبابير القاتلة', kd: '4.1', winRate: '68%', lastMsg: 'Let us team up tonight', lastTime: '3h ago' }
    ];

    // قائمة المستخدمين المحظورين
    const blockedUsersData = [
        { id: '109921', name: 'ToxicRage99', level: 14, reason: 'Harassment & Spam', blockedDate: 'Sep 02, 2026', avatar: getDiceBearUrl('ToxicRage99', 'adventurer') },
        { id: '448102', name: 'SpeedHackerX', level: 22, reason: 'Exploiting Arena Glitch', blockedDate: 'Aug 28, 2026', avatar: getDiceBearUrl('SpeedHackerX', 'adventurer') }
    ];

    // سجل الدردشة العامة والخاصة
    const chatDatabase = {
        global: [
            { sender: 'DragonSlayer', avatar: getDiceBearUrl('DragonSlayer', 'adventurer'), text: 'Looking for 2 players for Endless Run! 🪲', time: '12:04' },
            { sender: 'Sarah Connor', avatar: getDiceBearUrl('SarahConnor', 'adventurer'), text: 'Just claimed the Level 30 Pass weapon, it is insane 🔥', time: '12:06' },
            { sender: 'Alex Hunter', avatar: getDiceBearUrl('AlexHunter', 'adventurer'), text: 'Who wants a 1v1 practice match? ⚔️', time: '12:08' }
        ],
        direct: {
            '889123': [
                { sender: 'Alex Hunter', avatar: getDiceBearUrl('AlexHunter', 'adventurer'), text: 'Hey bro, are you ready for the raid?', time: '11:45' },
                { sender: 'Player Name', avatar: getDiceBearUrl('PlayerAntWarrior', 'adventurer'), text: 'Yes, just upgrading my gear in the Vault.', time: '11:48' }
            ],
            '773412': [
                { sender: 'Sarah Connor', avatar: getDiceBearUrl('SarahConnor', 'adventurer'), text: 'Claimed the Royal sword 🔥 it has +30% crit!', time: '10:15' }
            ]
        }
    };

    // خزانة الملابس
    const wardrobeData = [
        { id: 'outfit-1', name: 'Adventurer Cap', rarity: 'common', perk: '+5% Coin Drop', graphic: sampleItemIcons.shield, price: 500 },
        { id: 'outfit-2', name: 'Forest Ranger', rarity: 'rare', perk: '+10% Speed', graphic: sampleItemIcons.sword, price: 1200 },
        { id: 'outfit-3', name: 'Iron Vanguard', rarity: 'epic', perk: '+15% Armor', graphic: sampleItemIcons.armor, price: 2500 },
        { id: 'outfit-4', name: 'Shadow Cloak', rarity: 'legendary', perk: '+25% Stealth', graphic: sampleItemIcons.potion, price: 4000 },
        { id: 'outfit-5', name: 'Golden Champion', rarity: 'legendary', perk: '+30% XP Boost', graphic: sampleItemIcons.chest, price: 8000 }
    ];

    // عناصر الحقيبة والخزنة الخاصة
    const vaultItemsData = [
        { id: 'vault-1', name: 'Excalibur of the Void', type: 'weapon', rarity: 'mythic', graphic: sampleItemIcons.sword, stats: '+180 ATK • +25% Crit Damage', desc: 'A celestial blade forged in the abyss. Shatters enemy defenses.', equipped: true, stashed: false },
        { id: 'vault-2', name: 'Aegis of Immortal Light', type: 'armor', rarity: 'legendary', graphic: sampleItemIcons.shield, stats: '+240 DEF • +15% Health Regen', desc: 'Blessed shield radiating divine energy. Repels dark spells.', equipped: false, stashed: false },
        { id: 'vault-3', name: 'Phoenix Crown of Embers', type: 'armor', rarity: 'legendary', graphic: sampleItemIcons.crown, stats: '+120 DEF • Resurrect once per match', desc: 'Infused with undying embers of the ancient firebird.', equipped: true, stashed: false },
        { id: 'vault-4', name: 'Dragon Heart Relic', type: 'relic', rarity: 'mythic', graphic: sampleItemIcons.relic, stats: '+40% Skill Damage • +300 Mana', desc: 'Pulsing core of an elder wyrm. Grants uncontrollable flame magic.', equipped: false, stashed: true },
        { id: 'vault-5', name: 'Crystal Astral Shard', type: 'relic', rarity: 'epic', graphic: sampleItemIcons.gem, stats: '+15% Move Speed • +50 Energy', desc: 'Fallen meteorite remnant humming with cosmic resonance.', equipped: false, stashed: false },
        { id: 'vault-6', name: 'Vanguard Titan Plate', type: 'armor', rarity: 'epic', graphic: sampleItemIcons.armor, stats: '+190 DEF • +10% Block Rate', desc: 'Heavy dwarven steel capable of enduring catastrophic impacts.', equipped: false, stashed: false }
    ];

    let selectedVaultItem = vaultItemsData[0];

    // الإعدادات المحفوظة
    const savedSettings = {
        musicVol: 70,
        sfxVol: 80,
        musicEnabled: true,
        sfxEnabled: true,
        autoSave: true,
        showFpsPing: true,
        vibration: true,
        graphicQuality: 'Ultra',
        resolution: '1920x1080',
        shadows: 'High',
        fpsCap: '60 FPS',
        antiAliasing: 'MSAA 4x',
        language: 'ar'
    };
    let tempSettings = { ...savedSettings };

    // البروفايل المحفوظ والبيانات المعمقة
    const savedProfile = {
        name: 'Player Ant',
        avatar: getDiceBearUrl('PlayerAntWarrior', 'adventurer'),
        id: '123456',
        passLvl: userPassLevel,
        level: 25,
        xp: 7850,
        maxXp: 10000,
        matches: 142,
        wins: 98,
        losses: 44,
        kills: 412,
        kdRatio: '4.25',
        winRate: '69%',
        combatPower: '18,450',
        clan: '🐜 Royal Ant Colony (مستعمرة النمل الملكي)',
        title: '⚔️ صائد العناكب (Spider Hunter)',
        badges: ['⚔️ بطل المستعمرة', '🏆 فائز موسم 3', '🔥 تحدي الصعود'],
        joinDate: 'Jan 2025'
    };

    try {
        const cached = localStorage.getItem('antwar_profile');
        if (cached) Object.assign(savedProfile, JSON.parse(cached));
    } catch(e) {}

    let tempProfile = { ...savedProfile };
    let selectedOutfit = wardrobeData[0];
    let activeWhisperTarget = null;
    let inspectedPlayer = null; // لفحص بروفايل أي لاعب آخر

    // مزامنة فورية لشريط الهيدر مع الأفاتار المحفوظ
    setTimeout(() => {
        const hudName = document.getElementById('player-name-text');
        const hudAvatar = document.getElementById('avatar-image');
        if (hudName) hudName.textContent = savedProfile.name;
        if (hudAvatar) hudAvatar.src = savedProfile.avatar;
    }, 20);

    // سجل آخر المعارك للملف الشخصي (Recent Match History)
    const recentMatchHistory = [
        { id: 'm1', result: 'Victory 🏆', mode: '⚔️ Classic Arena', map: 'Forest Anthill', score: '3,240', kills: 7, time: '15m ago', isWin: true },
        { id: 'm2', result: 'Victory 🏆', mode: '🔥 Endless Run', map: 'Crystal Cavern', score: '2,890', kills: 5, time: '2h ago', isWin: true },
        { id: 'm3', result: 'Defeat 💀', mode: '⚔️ Classic Arena', map: 'Spider Hollow', score: '1,420', kills: 2, time: '5h ago', isWin: false },
        { id: 'm4', result: 'Victory 🏆', mode: '🔥 Endless Run', map: 'Ancient Tree Stump', score: '3,800', kills: 9, time: '1d ago', isWin: true },
        { id: 'm5', result: 'Victory 🏆', mode: '⚔️ Classic Arena', map: 'Royal Chamber', score: '4,150', kills: 11, time: '2d ago', isWin: true }
    ];

    // قائمة الـ 100 لاعب (أبطال مستعمرة الحشرات)
    const generatedTop100 = [];
    const namePrefixes = ['King', 'Shadow', 'Cyber', 'Night', 'Vortex', 'Solar', 'Titan', 'Apex', 'Dragon', 'Storm'];
    const nameSuffixes = ['Ant', 'Beetle', 'Mantis', 'Hornet', 'Wasp', 'Spider', 'Warrior', 'Knight', 'Slayer', 'Ninja'];

    for (let i = 1; i <= 100; i++) {
        let badge = `#${i}`;
        if (i === 1) badge = '🥇'; else if (i === 2) badge = '🥈'; else if (i === 3) badge = '🥉';
        const score = Math.max(99900 - (i * 850) + Math.floor(Math.random() * 200), 5000);
        const playerName = `${namePrefixes[i % namePrefixes.length]}${nameSuffixes[(i * 3) % nameSuffixes.length]}`;
        generatedTop100.push({
            rank: i, badge: badge,
            name: playerName,
            id: `${Math.floor(100000 + i * 8421 % 899999)}`,
            level: Math.max(100 - Math.floor(i / 1.5), 10),
            passLvl: Math.min(100, Math.max(5, 102 - i)),
            score: score.toLocaleString(),
            isFriend: (i === 1 || i === 4),
            isBlocked: false,
            avatar: getDiceBearUrl(playerName, 'adventurer'), // DiceBear من اسم اللاعب
            title: `⚔️ بطل المستوى ${Math.max(100 - Math.floor(i / 1.5), 10)}`,
            clan: '🐜 مستعمرة الأبطال',
            kd: (3.0 + (100 - i) * 0.03).toFixed(1),
            winRate: `${Math.min(92, 50 + Math.floor((100 - i) * 0.4))}%`,
            matches: Math.max(200 - i * 1.5, 50),
            wins: Math.floor((Math.max(200 - i * 1.5, 50)) * (0.50 + (100 - i) * 0.004)),
            combatPower: `${Math.max(30000 - i * 250, 5000).toLocaleString()} CP`
        });
    }

    // نظام الرسائل والإشعارات
    const notificationsList = [
        { id: 'n1', type: 'gift', title: 'Daily Mystery Box', text: 'You completed your daily login streak! Claim your reward.', reward: { type: 'gold', amount: 1500, claimed: false }, time: '2h ago' },
        { id: 'n2', type: 'social', title: 'Friend Request', text: 'ApexAnt wants to team up with you in Battle Arena.', senderId: '887766', accepted: false, time: '5h ago' },
        { id: 'n3', type: 'gift', title: 'Pass Milestone', text: 'You unlocked Level 18 in Royal Pass Season 4.', reward: { type: 'gem', amount: 50, claimed: false }, time: '1d ago' }
    ];

    // مهام الرويال باس
    const dailyPassQuests = [
        { id: 'dpq1', title: 'Arena Contender', desc: 'Win 2 matches in Battle Arena', progress: 2, max: 2, xp: 80, claimed: false },
        { id: 'dpq2', title: 'Coin Collector', desc: 'Collect 1,500 Gold from any mode', progress: 1200, max: 1500, xp: 60, claimed: false },
        { id: 'dpq3', title: 'Chat Master', desc: 'Send 3 messages in Realm Social Hub', progress: 3, max: 3, xp: 50, claimed: false }
    ];

    const weeklyPassChallenges = [
        { id: 'wpq1', title: 'Dragon Slayer Legend', desc: 'Defeat 60 Boss Monsters in Survival Run', progress: 48, max: 60, xp: 450, claimed: false },
        { id: 'wpq2', title: 'Vault Collector', desc: 'Equip or stash 3 Rare/Legendary items', progress: 3, max: 3, xp: 350, claimed: false },
        { id: 'wpq3', title: 'Guild Conqueror', desc: 'Play 10 matches with registered Friends', progress: 7, max: 10, xp: 400, claimed: false }
    ];

    // مسار مكافآت الرويال باس حتى المستوى 100
    const royalPassTiers = [];
    for (let t = 1; t <= 100; t++) {
        let freeItem = { name: `${t * 150} Coins`, icon: 'img/Coin.png', count: t * 150, rarity: 'common' };
        let premiumItem = { name: `${t * 20} Gems`, icon: 'img/Diamond.png', count: t * 20, rarity: 'rare' };

        if (t % 5 === 0) {
            premiumItem = { name: `Tier ${t} Epic Sword`, graphic: sampleItemIcons.sword, count: 1, rarity: 'epic' };
        }
        if (t % 10 === 0) {
            freeItem = { name: '50 Gems', icon: 'img/Diamond.png', count: 50, rarity: 'rare' };
            premiumItem = { name: `Royal Champion Cape`, graphic: sampleItemIcons.armor, count: 1, rarity: 'legendary' };
        }
        if (t === 100) {
            freeItem = { name: '10,000 Coins', icon: 'img/Coin.png', count: 10000, rarity: 'rare' };
            premiumItem = { name: 'Mythic God Armor', graphic: sampleItemIcons.shield, count: 1, rarity: 'mythic' };
        }

        royalPassTiers.push({
            tier: t,
            unlocked: t <= userPassLevel,
            freeReward: freeItem,
            premiumReward: premiumItem,
            claimed: t <= 15
        });
    }

    // بيانات غرف اللوبي الـ 8 فرق وسعة 4 لاعبين كحد أقصى لكل فريق
    let lobbyTeams = [];

    let currentLobbyState = {
        roomName: 'AntWar Arena #88',
        roomId: '#ROOM-8824',
        mode: 'classic', // classic or endless
        teamCount: 4, // 2 to 8 teams
        isPrivate: false,
        password: '',
        countdown: 60,
        timerInterval: null,
        myTeamId: null, // null means unassigned
        isReady: false
    };

    const allPresetTeams = [
        { id: 1, name: 'الأرجواني', nameEn: 'Magenta', color: '#d946ef', hue: '280deg', locked: false, maxSlots: 4 },
        { id: 2, name: 'البنفسجي', nameEn: 'Violet', color: '#a855f7', hue: '240deg', locked: false, maxSlots: 4 },
        { id: 3, name: 'الأصفر', nameEn: 'Yellow', color: '#eab308', hue: '45deg', locked: false, maxSlots: 4 },
        { id: 4, name: 'السماوي', nameEn: 'Cyan', color: '#06b6d4', hue: '170deg', locked: false, maxSlots: 4 },
        { id: 5, name: 'الأزرق', nameEn: 'Blue', color: '#3b82f6', hue: '200deg', locked: false, maxSlots: 4 },
        { id: 6, name: 'البرتقالي', nameEn: 'Orange', color: '#f97316', hue: '15deg', locked: false, maxSlots: 4 },
        { id: 7, name: 'الأخضر', nameEn: 'Green', color: '#22c55e', hue: '100deg', locked: false, maxSlots: 4 },
        { id: 8, name: 'الأحمر', nameEn: 'Red', color: '#ef4444', hue: '330deg', locked: false, maxSlots: 4 }
    ];

    function resetLobbyTeams(activeCount = 6) {
        const activeNum = Math.max(2, Math.min(8, parseInt(activeCount) || 6));
        currentLobbyState.teamCount = activeNum;
        lobbyTeams = allPresetTeams.map((t, idx) => {
            const isActive = idx < activeNum;
            const initialMembers = [];
            if (isActive && idx === 0) {
                initialMembers.push({ name: 'Alex Hunter', avatar: getDiceBearUrl('AlexHunter', 'adventurer'), isLeader: true, ready: true });
            } else if (isActive && idx === 1) {
                initialMembers.push({ name: 'Sarah Connor', avatar: getDiceBearUrl('SarahConnor', 'adventurer'), isLeader: true, ready: true });
            }
            return {
                ...t,
                active: isActive,
                locked: false,
                members: initialMembers
            };
        });
        currentLobbyState.myTeamId = null;
        currentLobbyState.isReady = false;
    }
    resetLobbyTeams(6);

    // =======================================================
    // 7. سجل التمبلتات والنوافذ المنبثقة
    // =======================================================
    const MODAL_TEMPLATES = {

        // ---------- 1. الإعدادات المتقدمة (Settings) ----------
        // ---------- 1. الإعدادات المتقدمة (Settings) ----------
        settings: {
            title: 'Settings & Controls / الإعدادات', icon: 'img/Settings.png', size: 'size-lg',
            footer: { id: 'save-settings-btn', title: 'حفظ الإعدادات (Save)' },
            body: () => `
                <div class="settings-tab-bar">
                    <button class="wood-tab-btn active" data-stab="toggles" id="settings-tab-toggles"><i class="fa-solid fa-sliders mr-1"></i>خيارات اللعب</button>
                    <button class="wood-tab-btn" data-stab="dropdowns" id="settings-tab-dropdowns"><i class="fa-solid fa-display mr-1"></i>الجرافيكس</button>
                    <button class="wood-tab-btn" data-stab="audio" id="settings-tab-audio"><i class="fa-solid fa-volume-high mr-1"></i>الصوتيات</button>
                </div>

                <!-- تبويب 1: خيارات التبديل -->
                <div id="settings-panel-toggles" class="w-full flex flex-col gap-2">
                    <span class="text-[#ffd875] text-[11px] font-black uppercase text-center mb-0.5">مفاتيح وخيارات اللعب السريعة</span>
                    
                    <div class="rpg-toggle-pill" data-toggle="autoSave">
                        <div class="flex items-center gap-2">
                            <i class="fa-solid fa-floppy-disk text-sm text-[#FFD875]"></i>
                            <span class="text-white text-xs font-bold">الحفظ التلقائي للبيانات (Auto-Save)</span>
                        </div>
                        <img id="toggle-img-autoSave" src="${tempSettings.autoSave ? 'img/enable.png' : 'img/disabled.png'}" class="rpg-toggle-indicator" alt="toggle">
                    </div>

                    <div class="rpg-toggle-pill" data-toggle="showFpsPing">
                        <div class="flex items-center gap-2">
                            <i class="fa-solid fa-chart-simple text-sm text-[#FFD875]"></i>
                            <span class="text-white text-xs font-bold">عرض معدل الإطارات والبينغ (FPS & Ping)</span>
                        </div>
                        <img id="toggle-img-showFpsPing" src="${tempSettings.showFpsPing ? 'img/enable.png' : 'img/disabled.png'}" class="rpg-toggle-indicator" alt="toggle">
                    </div>

                    <div class="rpg-toggle-pill" data-toggle="vibration">
                        <div class="flex items-center gap-2">
                            <i class="fa-solid fa-mobile-screen-button text-sm text-[#FFD875]"></i>
                            <span class="text-white text-xs font-bold">الاهتزاز والتأثيرات الحركية (Screen FX)</span>
                        </div>
                        <img id="toggle-img-vibration" src="${tempSettings.vibration ? 'img/enable.png' : 'img/disabled.png'}" class="rpg-toggle-indicator" alt="toggle">
                    </div>

                    <div class="rpg-toggle-pill" data-toggle="musicEnabled">
                        <div class="flex items-center gap-2">
                            <i class="fa-solid fa-music text-sm text-[#FFD875]"></i>
                            <span class="text-white text-xs font-bold">تشغيل الموسيقى التصويرية (Music)</span>
                        </div>
                        <img id="toggle-img-musicEnabled" src="${tempSettings.musicEnabled ? 'img/enable.png' : 'img/disabled.png'}" class="rpg-toggle-indicator" alt="toggle">
                    </div>

                    <div class="rpg-toggle-pill" data-toggle="sfxEnabled">
                        <div class="flex items-center gap-2">
                            <i class="fa-solid fa-bell text-sm text-[#FFD875]"></i>
                            <span class="text-white text-xs font-bold">المؤثرات الصوتية للأزرار (SFX)</span>
                        </div>
                        <img id="toggle-img-sfxEnabled" src="${tempSettings.sfxEnabled ? 'img/enable.png' : 'img/disabled.png'}" class="rpg-toggle-indicator" alt="toggle">
                    </div>
                </div>

                <!-- تبويب 2: القوائم المنسدلة باستخدام img/arrow-Menu.png و img/option-Menu.png و img/Text BackgroundBox.png -->
                <div id="settings-panel-dropdowns" class="w-full flex flex-col gap-2.5 hidden">
                    <span class="text-[#ffd875] text-[11px] font-black uppercase text-center mb-0.5">القوائم المنسدلة للجودة والعرض (Dropdown Menus)</span>

                    <!-- دروب داون جودة الجرافيكس -->
                    <div class="flex flex-col gap-1 w-full text-left">
                        <label class="text-[#ffd875] text-[10.5px] font-black flex items-center justify-between">
                            <span>جودة الرسوميات (Graphics Preset):</span>
                            <span class="text-[#FFD875] font-bold" id="dropdown-lbl-graphicQuality">${tempSettings.graphicQuality}</span>
                        </label>
                        <div class="rpg-dropdown-wrapper" data-dd="graphicQuality">
                            <button type="button" class="rpg-dropdown-trigger">
                                <span class="text-white text-xs font-black selected-text">${tempSettings.graphicQuality} Preset</span>
                                <img src="img/arrow-Menu.png" class="rpg-dropdown-arrow" alt="arrow">
                            </button>
                            <div class="rpg-dropdown-menu hidden">
                                <div class="rpg-dropdown-option" data-val="Ultra"><span>🔥 Ultra (أقصى دقة)</span></div>
                                <div class="rpg-dropdown-option" data-val="High"><span>✨ High (عالية)</span></div>
                                <div class="rpg-dropdown-option" data-val="Medium"><span>⚡ Medium (متوسطة)</span></div>
                                <div class="rpg-dropdown-option" data-val="Low"><span>🍃 Low (منخفضة للأجهزة الضعيفة)</span></div>
                            </div>
                        </div>
                    </div>

                    <!-- دروب داون الدقة -->
                    <div class="flex flex-col gap-1 w-full text-left">
                        <label class="text-[#ffd875] text-[10.5px] font-black flex items-center justify-between">
                            <span>دقة الشاشة (Resolution):</span>
                            <span class="text-[#FFD875] font-bold" id="dropdown-lbl-resolution">${tempSettings.resolution}</span>
                        </label>
                        <div class="rpg-dropdown-wrapper" data-dd="resolution">
                            <button type="button" class="rpg-dropdown-trigger">
                                <span class="text-white text-xs font-black selected-text">${tempSettings.resolution}</span>
                                <img src="img/arrow-Menu.png" class="rpg-dropdown-arrow" alt="arrow">
                            </button>
                            <div class="rpg-dropdown-menu hidden">
                                <div class="rpg-dropdown-option" data-val="1920x1080"><span>🖥️ 1920x1080 (FHD Standard)</span></div>
                                <div class="rpg-dropdown-option" data-val="2560x1440"><span>💎 2560x1440 (2K QHD)</span></div>
                                <div class="rpg-dropdown-option" data-val="1280x720"><span>📱 1280x720 (HD Mobile)</span></div>
                            </div>
                        </div>
                    </div>

                    <!-- دروب داون الظلال ومعدل الإطارات -->
                    <div class="grid grid-cols-2 gap-2 w-full">
                        <div class="flex flex-col gap-1 text-left">
                            <label class="text-[#ffd875] text-[10px] font-black">الظلال (Shadows):</label>
                            <div class="rpg-dropdown-wrapper" data-dd="shadows">
                                <button type="button" class="rpg-dropdown-trigger">
                                    <span class="text-white text-[11px] font-black selected-text">${tempSettings.shadows}</span>
                                    <img src="img/arrow-Menu.png" class="rpg-dropdown-arrow" alt="arrow">
                                </button>
                                <div class="rpg-dropdown-menu hidden">
                                    <div class="rpg-dropdown-option" data-val="High"><span>High (واقعية)</span></div>
                                    <div class="rpg-dropdown-option" data-val="Medium"><span>Medium (متوازنة)</span></div>
                                    <div class="rpg-dropdown-option" data-val="Low"><span>Low (خفيفة)</span></div>
                                    <div class="rpg-dropdown-option" data-val="Off"><span>Off (إيقاف)</span></div>
                                </div>
                            </div>
                        </div>

                        <div class="flex flex-col gap-1 text-left">
                            <label class="text-[#ffd875] text-[10px] font-black">حد الإطارات (FPS):</label>
                            <div class="rpg-dropdown-wrapper" data-dd="fpsCap">
                                <button type="button" class="rpg-dropdown-trigger">
                                    <span class="text-white text-[11px] font-black selected-text">${tempSettings.fpsCap}</span>
                                    <img src="img/arrow-Menu.png" class="rpg-dropdown-arrow" alt="arrow">
                                </button>
                                <div class="rpg-dropdown-menu hidden">
                                    <div class="rpg-dropdown-option" data-val="60 FPS"><span>60 FPS (سلس)</span></div>
                                    <div class="rpg-dropdown-option" data-val="120 FPS"><span>120 FPS (فائق)</span></div>
                                    <div class="rpg-dropdown-option" data-val="144 FPS"><span>144 FPS (تنافسي)</span></div>
                                    <div class="rpg-dropdown-option" data-val="30 FPS"><span>30 FPS (توفير طاقة)</span></div>
                                </div>
                            </div>
                        </div>
                    </div>

                    <!-- دروب داون لغة اللعبة -->
                    <div class="flex flex-col gap-1 w-full text-left">
                        <label class="text-[#ffd875] text-[10.5px] font-black">اللغة (Game Language):</label>
                        <div class="rpg-dropdown-wrapper" data-dd="language">
                            <button type="button" class="rpg-dropdown-trigger">
                                <span class="text-white text-xs font-black selected-text">${tempSettings.language === 'ar' ? '🇸🇦 العربية (Arabic)' : '🇺🇸 English (US)'}</span>
                                <img src="img/arrow-Menu.png" class="rpg-dropdown-arrow" alt="arrow">
                            </button>
                            <div class="rpg-dropdown-menu hidden">
                                <div class="rpg-dropdown-option" data-val="ar"><span>🇸🇦 العربية (Arabic)</span></div>
                                <div class="rpg-dropdown-option" data-val="en"><span>🇺🇸 English (US)</span></div>
                                <div class="rpg-dropdown-option" data-val="fr"><span>🇫🇷 Français (French)</span></div>
                                <div class="rpg-dropdown-option" data-val="es"><span>🇪🇸 Español (Spanish)</span></div>
                            </div>
                        </div>
                    </div>
                </div>

                <!-- تبويب 3: مستويات الصوت -->
                <div id="settings-panel-audio" class="w-full flex flex-col items-center gap-2 hidden">
                    <div class="setting-group-box flex flex-col items-center">
                        <div class="flex justify-between items-center w-full max-w-[240px] px-1 mb-0.5">
                            <span class="text-[#ffd875] text-xs font-extrabold uppercase">Music Volume</span>
                            <span id="music-level-indicator" class="text-white text-xs font-extrabold">${tempSettings.musicVol}%</span>
                        </div>
                        <div class="wood-slider-wrapper relative flex items-center justify-center">
                            <div class="wood-slider-track relative overflow-hidden flex items-center">
                                <div id="music-progress-fill" class="wood-slider-fill absolute left-0 top-0 bottom-0" style="width:${tempSettings.musicVol}%"></div>
                            </div>
                            <input id="music-range-input" type="range" min="0" max="100" value="${tempSettings.musicVol}" class="wood-range-slider absolute inset-0 w-full h-full cursor-pointer z-20">
                        </div>
                    </div>

                    <div class="setting-group-box flex flex-col items-center">
                        <div class="flex justify-between items-center w-full max-w-[240px] px-1 mb-0.5">
                            <span class="text-[#ffd875] text-xs font-extrabold uppercase">SFX Volume</span>
                            <span id="sfx-level-indicator" class="text-white text-xs font-extrabold">${tempSettings.sfxVol}%</span>
                        </div>
                        <div class="wood-slider-wrapper relative flex items-center justify-center">
                            <div class="wood-slider-track relative overflow-hidden flex items-center">
                                <div id="sfx-progress-fill" class="wood-slider-fill absolute left-0 top-0 bottom-0" style="width:${tempSettings.sfxVol}%"></div>
                            </div>
                            <input id="sfx-range-input" type="range" min="0" max="100" value="${tempSettings.sfxVol}" class="wood-range-slider absolute inset-0 w-full h-full cursor-pointer z-20">
                        </div>
                    </div>
                </div>
            `,
            mount(body, inst) {
                const musicRange = body.querySelector('#music-range-input');
                const musicFill = body.querySelector('#music-progress-fill');
                const musicInd = body.querySelector('#music-level-indicator');
                const sfxRange = body.querySelector('#sfx-range-input');
                const sfxFill = body.querySelector('#sfx-progress-fill');
                const sfxInd = body.querySelector('#sfx-level-indicator');

                const sync = () => {
                    if (musicFill) musicFill.style.width = `${tempSettings.musicVol}%`;
                    if (musicInd) musicInd.textContent = `${tempSettings.musicVol}%`;
                    if (sfxFill) sfxFill.style.width = `${tempSettings.sfxVol}%`;
                    if (sfxInd) sfxInd.textContent = `${tempSettings.sfxVol}%`;
                };
                sync();

                if (musicRange) musicRange.addEventListener('input', (e) => { tempSettings.musicVol = parseInt(e.target.value); sync(); });
                if (sfxRange) sfxRange.addEventListener('input', (e) => { tempSettings.sfxVol = parseInt(e.target.value); sync(); });

                // تبديل المفاتيح والشيك بوكس
                body.querySelectorAll('.rpg-toggle-pill').forEach(pill => {
                    pill.addEventListener('click', () => {
                        const key = pill.getAttribute('data-toggle');
                        tempSettings[key] = !tempSettings[key];
                        const img = pill.querySelector('.rpg-toggle-indicator');
                        if (img) img.src = tempSettings[key] ? 'img/enable.png' : 'img/disabled.png';
                        playSound('toggle');
                    });
                });

                // القوائم المنسدلة (Dropdowns)
                body.querySelectorAll('.rpg-dropdown-wrapper').forEach(wrapper => {
                    const trigger = wrapper.querySelector('.rpg-dropdown-trigger');
                    const menu = wrapper.querySelector('.rpg-dropdown-menu');
                    const selectedText = trigger.querySelector('.selected-text');
                    const ddKey = wrapper.getAttribute('data-dd');

                    trigger.addEventListener('click', (e) => {
                        e.stopPropagation();
                        const wasOpen = !menu.classList.contains('hidden');
                        body.querySelectorAll('.rpg-dropdown-menu').forEach(m => m.classList.add('hidden'));
                        body.querySelectorAll('.rpg-dropdown-wrapper').forEach(w => w.classList.remove('open'));
                        if (!wasOpen) {
                            menu.classList.remove('hidden');
                            wrapper.classList.add('open');
                            playSound('dropdown');
                        }
                    });

                    menu.querySelectorAll('.rpg-dropdown-option').forEach(opt => {
                        opt.addEventListener('click', (e) => {
                            e.stopPropagation();
                            const val = opt.getAttribute('data-val');
                            tempSettings[ddKey] = val;
                            selectedText.textContent = opt.textContent.trim();
                            const lbl = body.querySelector(`#dropdown-lbl-${ddKey}`);
                            if (lbl) lbl.textContent = val;
                            menu.classList.add('hidden');
                            wrapper.classList.remove('open');
                            playSound('click');
                        });
                    });
                });

                // إغلاق أي منيو عند النقر في الخارج
                body.addEventListener('click', () => {
                    body.querySelectorAll('.rpg-dropdown-menu').forEach(m => m.classList.add('hidden'));
                    body.querySelectorAll('.rpg-dropdown-wrapper').forEach(w => w.classList.remove('open'));
                });

                // التبويبات العلوية للإعدادات
                const tabs = body.querySelectorAll('.settings-tab-bar .wood-tab-btn');
                tabs.forEach(t => {
                    t.addEventListener('click', () => {
                        tabs.forEach(tab => tab.classList.remove('active'));
                        t.classList.add('active');
                        const target = t.getAttribute('data-stab');
                        ['toggles', 'dropdowns', 'audio'].forEach(p => {
                            const panel = body.querySelector(`#settings-panel-${p}`);
                            if (panel) {
                                if (p === target) panel.classList.remove('hidden');
                                else panel.classList.add('hidden');
                            }
                        });
                        playSound('click');
                    });
                });

                inst.querySelector('#save-settings-btn').addEventListener('click', () => {
                    Object.assign(savedSettings, tempSettings);
                    try { localStorage.setItem('antwar_settings', JSON.stringify(savedSettings)); } catch(e) {}
                    setAudioSettings(savedSettings);
                    if (savedSettings.language) {
                        setLanguage(savedSettings.language);
                    }
                    closeModal('settings');
                    playSound('save');
                    showToast('تم حفظ كافة إعدادات اللعبة بنجاح!', '<i class="fa-solid fa-gear"></i>');
                });
            }
        },

        // ---------- 2. بروفايل اللاعب المطور (Player Profile with Bug Avatars & Match History) ----------
        profile: {
            title: 'Ant Commander Profile / بروفايل اللاعب', icon: 'img/Rank.png', size: 'size-lg',
            footer: { id: 'save-profile-btn', title: 'حفظ وتحديث (Save Profile)' },
            body: () => `
                <div class="w-full flex flex-col items-center gap-2">
                    <!-- الهيدر الشخصي: الأفاتار المختار في إطار img/frame.png مع معلومات المستوى والرتبة -->
                    <div class="flex items-center gap-3 bg-black/60 p-2.5 rounded-xl border c-border-primary w-full max-w-[440px]">
                        <div class="w-18 h-18 sm:w-20 sm:h-20 relative flex flex-shrink-0 items-center justify-center">
                            <img id="profile-avatar-preview" src="${tempProfile.avatar}" class="w-[72%] h-[72%] rounded-full object-cover absolute drop-shadow-md">
                            <img src="img/frame.png" class="w-full h-full absolute inset-0 pointer-events-none">
                            <span class="absolute -bottom-1 bg-gradient-to-r from-amber-500 to-yellow-400 text-black text-[9px] font-black px-1.5 rounded-full border border-black shadow">👑 Pass ${tempProfile.passLvl}</span>
                        </div>
                        <div class="flex flex-col text-left flex-1 min-w-0">
                            <div class="flex items-center gap-1.5">
                                <span class="text-[#ffd875] text-xs sm:text-sm font-black truncate">${tempProfile.name}</span>
                                <span class="text-[9px] bg-[#66180F] text-[#FFD875] font-bold px-1.5 py-0.5 rounded border c-border-primary">#${tempProfile.id}</span>
                            </div>
                            <span class="text-[#37AA49] text-[10px] font-black truncate mt-0.5">${tempProfile.title}</span>
                            <span class="text-white/60 text-[9px] truncate">${tempProfile.clan}</span>
                            <div class="flex items-center gap-2 mt-1">
                                <span class="text-yellow-300 text-[10px] font-black">⚡ ${tempProfile.combatPower} CP</span>
                                <span class="text-white/40 text-[9px]">|</span>
                                <span class="text-white text-[9px] font-bold">Lvl ${tempProfile.level} (${tempProfile.xp}/${tempProfile.maxXp} XP)</span>
                            </div>
                        </div>
                    </div>

                    <!-- قسم اختيار أفتار كرتوني حشرات -->
                    <div class="w-full flex flex-col items-center gap-1 mt-0.5">
                        <div class="flex items-center justify-between w-full px-1">
                            <span class="text-[#ffd875] text-xs font-black flex items-center gap-1">
                                <span>🐜</span> أفتار الحشرات النمل (DiceBear Bug Avatars):
                            </span>
                            <button id="generate-dicebear-avatar-btn" type="button" class="text-[9px] font-black text-[#FFD875] c-bg-burgundy hover:bg-[#66180F] border c-border-primary px-2 py-0.5 rounded cursor-pointer transition flex items-center gap-1">
                                <span>🎲</span> توليد باسمك
                            </button>
                        </div>
                        <div class="grid grid-cols-4 sm:grid-cols-8 gap-2 p-1.5 bg-black/40 rounded-xl border c-border-primary w-full justify-items-center" id="avatar-choices-grid">
                            ${cartoonBugAvatars.map(av => `
                                <div class="avatar-choice-card ${tempProfile.avatar === av.src ? 'active' : ''}" data-src="${av.src}" title="${av.name} (${av.role})">
                                    <img src="${av.src}" alt="${av.name}">
                                </div>
                            `).join('')}
                        </div>
                    </div>

                    <!-- تعديل الاسم واختيار اللقب -->
                    <div class="grid grid-cols-1 sm:grid-cols-2 gap-2 w-full max-w-[440px]">
                        <div class="flex flex-col text-left gap-0.5">
                            <label class="text-[#ffd875] text-[10px] font-black">تعديل الاسم (Player Name):</label>
                            <div class="text-bg-box w-full px-2">
                                <input id="profile-name-input" type="text" value="${tempProfile.name}" maxlength="16" class="w-full bg-transparent text-white font-game font-black text-xs text-center outline-none">
                            </div>
                        </div>
                        <div class="flex flex-col text-left gap-0.5">
                            <label class="text-[#ffd875] text-[10px] font-black">اللقب القتالي (Active Title):</label>
                            <select id="profile-title-select" class="w-full px-2 py-1.5 rounded bg-black/80 border border-[#BC4526] text-yellow-300 font-bold text-xs outline-none">
                                <option value="⚔️ صائد العناكب (Spider Hunter)" ${tempProfile.title.includes('صائد العناكب') ? 'selected' : ''}>⚔️ صائد العناكب</option>
                                <option value="👑 ملك النمل (Ant Emperor)" ${tempProfile.title.includes('ملك النمل') ? 'selected' : ''}>👑 ملك النمل</option>
                                <option value="🛡️ خنفساء الدروع (Iron Beetle)" ${tempProfile.title.includes('خنفساء الدروع') ? 'selected' : ''}>🛡️ خنفساء الدروع</option>
                                <option value="⚡ الدبور القاتل (Hornet Slayer)" ${tempProfile.title.includes('الدبور القاتل') ? 'selected' : ''}>⚡ الدبور القاتل</option>
                                <option value="🏹 رامي الشباك (Web Weaver)" ${tempProfile.title.includes('رامي الشباك') ? 'selected' : ''}>🏹 رامي الشباك</option>
                            </select>
                        </div>
                    </div>

                    <!-- إحصائيات المعارك المعمقة (K/D, Win Rate, Matches) -->
                    <div class="grid grid-cols-4 gap-1.5 w-full max-w-[440px]">
                        <div class="bg-black/60 border c-border-primary rounded-lg p-1.5 flex flex-col items-center">
                            <span class="text-white/60 text-[8.5px] font-bold uppercase">K/D Ratio</span>
                            <span class="text-yellow-400 font-black text-xs mt-0.5">${tempProfile.kdRatio || '4.25'}</span>
                        </div>
                        <div class="bg-black/60 border c-border-primary rounded-lg p-1.5 flex flex-col items-center">
                            <span class="text-white/60 text-[8.5px] font-bold uppercase">Win Rate</span>
                            <span class="text-[#37AA49] font-black text-xs mt-0.5">${tempProfile.winRate || '69%'}</span>
                        </div>
                        <div class="bg-black/60 border c-border-primary rounded-lg p-1.5 flex flex-col items-center">
                            <span class="text-white/60 text-[8.5px] font-bold uppercase">Victories</span>
                            <span class="text-white font-black text-xs mt-0.5">${tempProfile.wins}</span>
                        </div>
                        <div class="bg-black/60 border c-border-primary rounded-lg p-1.5 flex flex-col items-center">
                            <span class="text-white/60 text-[8.5px] font-bold uppercase">Total Kills</span>
                            <span class="text-red-400 font-black text-xs mt-0.5">${tempProfile.kills}</span>
                        </div>
                    </div>

                    <!-- سجل آخر المعارك المباشرة -->
                    <div class="w-full max-w-[440px] flex flex-col text-left mt-0.5">
                        <span class="text-[#ffd875] text-[10px] font-black mb-1">📜 سجل آخر المعارك (Recent Match History):</span>
                        <div class="flex flex-col gap-1 max-h-[110px] overflow-y-auto modal-scrollbar p-1 bg-black/40 rounded-lg border border-[#BC4526]">
                            ${recentMatchHistory.map(m => `
                                <div class="flex items-center justify-between bg-black/60 p-1.5 rounded border border-white/5 text-[9.5px]">
                                    <div class="flex items-center gap-1.5">
                                        <span class="font-black ${m.isWin ? 'text-[#37AA49]' : 'text-red-400'}">${m.result}</span>
                                        <span class="text-white/80 font-bold">${m.mode}</span>
                                        <span class="text-white/50 text-[8.5px]">(${m.map})</span>
                                    </div>
                                    <div class="flex items-center gap-2">
                                        <span class="text-yellow-300 font-black">${m.score} pts</span>
                                        <span class="text-white/40 text-[8px]">${m.time}</span>
                                    </div>
                                </div>
                            `).join('')}
                        </div>
                    </div>
                </div>`,
            mount(body, inst) {
                // النقر لاختيار أفتار حشرة كرتوني
                body.querySelectorAll('.avatar-choice-card').forEach(card => {
                    card.addEventListener('click', () => {
                        const newAvatar = card.getAttribute('data-src');
                        tempProfile.avatar = newAvatar;
                        body.querySelectorAll('.avatar-choice-card').forEach(c => c.classList.remove('active'));
                        card.classList.add('active');
                        const preview = body.querySelector('#profile-avatar-preview');
                        if (preview) preview.src = newAvatar;
                        playSound('pop');
                    });
                });

                // توليد أفتار DiceBear مخصص باسم اللاعب
                const genBtn = body.querySelector('#generate-dicebear-avatar-btn');
                if (genBtn) {
                    genBtn.addEventListener('click', () => {
                        const nameInp = body.querySelector('#profile-name-input');
                        const customSeed = (nameInp?.value || 'PlayerAnt').trim() + '_' + Math.floor(Math.random() * 999);
                        const newAvatar = getDiceBearUrl(customSeed, 'adventurer');
                        tempProfile.avatar = newAvatar;
                        body.querySelectorAll('.avatar-choice-card').forEach(c => c.classList.remove('active'));
                        const preview = body.querySelector('#profile-avatar-preview');
                        if (preview) preview.src = newAvatar;
                        playSound('pop');
                        showToast('تم توليد أفتار DiceBear جديد باسمك!', '<i class="fa-solid fa-dice"></i>');
                    });
                }

                // حفظ البروفايل
                inst.querySelector('#save-profile-btn').addEventListener('click', () => {
                    const nameInp = body.querySelector('#profile-name-input');
                    const titleSel = body.querySelector('#profile-title-select');
                    if (nameInp && nameInp.value.trim()) tempProfile.name = nameInp.value.trim();
                    if (titleSel) tempProfile.title = titleSel.value;
                    Object.assign(savedProfile, tempProfile);
                    try { localStorage.setItem('antwar_profile', JSON.stringify(savedProfile)); } catch(e) {}
                    
                    const hudName = document.getElementById('player-name-text');
                    const hudAvatar = document.getElementById('avatar-image');
                    if (hudName) hudName.textContent = savedProfile.name;
                    if (hudAvatar) hudAvatar.src = savedProfile.avatar;
                    
                    closeModal('profile');
                    playSound('save');
                    showToast('تم تحديث البروفايل بنجاح!', '<i class="fa-solid fa-crown text-[#FFD875]"></i>');
                });
            }
        },

        // ---------- 2.B. فحص بروفايلات اللاعبين الآخرين (Inspect Player Profile — Full Dossier) ----------
        'player-profile': {
            title: 'Player Dossier / ملف اللاعب', icon: 'img/Rank.png', size: 'size-lg',
            footer: null,
            body: () => {
                const p = inspectedPlayer || {
                    name: 'Alex Hunter', id: '889123', level: 32, avatar: getDiceBearUrl('AlexHunter', 'adventurer'),
                    title: '⚔️ نملة مقاتلة', clan: '🐜 جنود النمل', kd: '3.8', winRate: '65%', score: '18,400',
                    matches: 118, wins: 77, losses: 41, combatPower: '15,200 CP', joinDate: 'Mar 2025',
                    passLvl: 45, badges: ['⚔️ بطل الموسم', '🏆 قاتل التنانين', '🔥 اندفاع'],
                    recentMatches: [
                        { result: 'Victory 🏆', mode: '⚔️ Classic', score: '2,840', kills: 6, time: '30m ago', isWin: true },
                        { result: 'Victory 🏆', mode: '🔥 Endless', score: '3,100', kills: 8, time: '3h ago', isWin: true },
                        { result: 'Defeat 💀', mode: '⚔️ Classic', score: '980', kills: 2, time: '6h ago', isWin: false }
                    ]
                };

                // DiceBear URL مولد تلقائياً من اسم اللاعب
                const avatarSrc = p.avatar || getDiceBearUrl(p.name, 'adventurer');
                const winPct = p.winRate || (p.matches ? `${Math.round((p.wins / p.matches) * 100)}%` : '—');
                const losses = p.losses || (p.matches && p.wins ? p.matches - p.wins : '—');

                return `
                    <div class="w-full flex flex-col gap-2 py-1">

                        <!-- بطاقة الهوية: الأفاتار + الاسم + المستوى -->
                        <div class="flex items-center gap-3 bg-black/60 p-3 rounded-xl border border-[#BC4526]/70">
                            <!-- الأفاتار مع إطار img/frame.png -->
                            <div class="relative w-20 h-20 flex-shrink-0 flex items-center justify-center">
                                <img src="${avatarSrc}" class="w-[74%] h-[74%] rounded-full object-cover absolute"
                                     onerror="this.src='img/ant1.png'" style="filter: drop-shadow(0 4px 10px rgba(0,0,0,0.9));">
                                <img src="img/frame.png" class="w-full h-full absolute inset-0 pointer-events-none object-contain">
                            </div>
                            <!-- بيانات الهوية الأساسية -->
                            <div class="flex flex-col min-w-0 gap-0.5">
                                <span class="text-[#ffd875] text-base font-black truncate">${p.name}</span>
                                <div class="flex items-center gap-1.5 flex-wrap">
                                    <span class="text-white/50 text-[10px]">ID: #${p.id}</span>
                                    <span class="c-bg-burgundy text-[#FFD875] text-[9px] font-black px-1.5 py-0.5 rounded">Lv.${p.level}</span>
                                    <span class="c-bg-crimson text-[#FFD875] text-[9px] font-black px-1.5 py-0.5 rounded">Pass Lv.${p.passLvl || '?'}</span>
                                </div>
                                <span class="text-[#37AA49] text-[11px] font-black">${p.title || 'بطل المستعمرة'}</span>
                                <span class="text-white/60 text-[10px]">${p.clan || 'مستعمرة الأبطال'}</span>
                                <span class="c-text-gold-70 text-[9px]"><i class="fa-solid fa-calendar-days mr-1"></i>عضو منذ: ${p.joinDate || 'N/A'}</span>
                            </div>
                        </div>

                        <!-- الإحصائيات القتالية المفصلة -->
                        <div class="bg-black/50 rounded-xl border c-border-primary p-2.5">
                            <div class="text-[#ffd875] text-[10px] font-black mb-2 uppercase tracking-wider"><i class="fa-solid fa-bolt mr-1"></i>الإحصائيات القتالية</div>
                            <div class="grid grid-cols-3 gap-2 text-center mb-2">
                                <div class="bg-black/50 rounded-lg p-1.5 border border-[#FFD875]/30">
                                    <div class="text-white/50 text-[8px] uppercase">K/D Ratio</div>
                                    <div class="text-[#FFD875] font-black text-sm">${p.kd || '—'}</div>
                                </div>
                                <div class="bg-black/50 rounded-lg p-1.5 border border-[#37AA49]/30">
                                    <div class="text-white/50 text-[8px] uppercase">Win Rate</div>
                                    <div class="text-[#37AA49] font-black text-sm">${winPct}</div>
                                </div>
                                <div class="bg-black/50 rounded-lg p-1.5 border border-white/20">
                                    <div class="text-white/50 text-[8px] uppercase">Score</div>
                                    <div class="text-white font-black text-sm">${p.score || '—'}</div>
                                </div>
                            </div>
                            <div class="grid grid-cols-4 gap-1.5 text-center">
                                <div class="bg-black/40 rounded-lg p-1 border border-white/10">
                                    <div class="text-white/40 text-[7px] uppercase">Matches</div>
                                    <div class="text-white font-black text-xs">${p.matches || '—'}</div>
                                </div>
                                <div class="bg-black/40 rounded-lg p-1 border c-border-green">
                                    <div class="text-white/40 text-[7px] uppercase">Wins</div>
                                    <div class="text-[#37AA49] font-black text-xs">${p.wins || '—'}</div>
                                </div>
                                <div class="bg-black/40 rounded-lg p-1 border c-border-primary">
                                    <div class="text-white/40 text-[7px] uppercase">Losses</div>
                                    <div class="text-[#BC4526] font-black text-xs">${losses}</div>
                                </div>
                                <div class="bg-black/40 rounded-lg p-1 border border-[#FFD875]/30">
                                    <div class="text-white/40 text-[7px] uppercase">CP</div>
                                    <div class="text-[#FFD875] font-black text-xs">${(p.combatPower || '—').replace(' CP', '')}</div>
                                </div>
                            </div>
                        </div>

                        <!-- الشارات والألقاب (Badges) -->
                        ${(p.badges && p.badges.length) ? `
                        <div class="bg-black/50 rounded-xl border c-border-primary p-2.5">
                            <div class="text-[#ffd875] text-[10px] font-black mb-1.5 uppercase tracking-wider"><i class="fa-solid fa-medal mr-1"></i>الشارات والألقاب</div>
                            <div class="flex flex-wrap gap-1.5">
                                ${p.badges.map(b => `
                                    <span class="text-[9px] font-black px-2 py-1 rounded-lg c-bg-burgundy border c-border-primary text-[#FFD875]">${b}</span>
                                `).join('')}
                            </div>
                        </div>` : ''}

                        <!-- سجل آخر المعارك -->
                        ${(p.recentMatches && p.recentMatches.length) ? `
                        <div class="bg-black/50 rounded-xl border c-border-primary p-2.5">
                            <div class="text-[#ffd875] text-[10px] font-black mb-1.5 uppercase tracking-wider"><i class="fa-solid fa-sword mr-1"></i>آخر المعارك</div>
                            <div class="flex flex-col gap-1">
                                ${p.recentMatches.map(m => `
                                    <div class="flex items-center justify-between p-1.5 rounded-lg ${m.isWin ? 'bg-[#37AA49]/20 border c-border-green' : 'bg-[#7E2025]/30 border c-border-primary'}">
                                        <div class="flex items-center gap-2">
                                            <span class="text-[9px] font-black ${m.isWin ? 'text-[#37AA49]' : 'text-[#BC4526]'}">${m.result}</span>
                                            <span class="text-white/50 text-[8px]">${m.mode}</span>
                                        </div>
                                        <div class="flex items-center gap-2">
                                            <span class="text-[#FFD875] text-[8px] font-bold">${m.kills}<i class="fa-solid fa-khanda ml-0.5 text-[7px]"></i></span>
                                            <span class="text-white/40 text-[8px]">${m.time}</span>
                                        </div>
                                    </div>
                                `).join('')}
                            </div>
                        </div>` : ''}

                        <!-- أزرار التفاعل مع اللاعب — img/Empty-button.png -->
                        <div class="grid grid-cols-3 gap-2 w-full mt-1">
                            <button class="btn-wood-empty w-full" id="inspect-whisper-btn">
                                <img src="img/Empty-button.png" class="btn-bg-art">
                                <span class="btn-inner-content text-white font-black text-[10px] flex items-center gap-1"><i class="fa-solid fa-comment"></i><span>همسة</span></span>
                            </button>
                            <button class="btn-wood-empty w-full" id="inspect-friend-btn">
                                <img src="img/Empty-button.png" class="btn-bg-art">
                                <span class="btn-inner-content text-white font-black text-[10px] flex items-center gap-1"><i class="fa-solid fa-user-plus"></i><span>صديق</span></span>
                            </button>
                            <button class="btn-wood-empty w-full" id="inspect-invite-btn">
                                <img src="img/Empty-button.png" class="btn-bg-art">
                                <span class="btn-inner-content text-white font-black text-[10px] flex items-center gap-1"><i class="fa-solid fa-gamepad"></i><span>دعوة</span></span>
                            </button>
                        </div>

                        <!-- أزرار إضافية: إبلاغ + حظر -->
                        <div class="grid grid-cols-2 gap-2 w-full">
                            <button class="btn-wood-empty w-full" id="inspect-report-btn">
                                <img src="img/Empty-button.png" class="btn-bg-art">
                                <span class="btn-inner-content text-white font-black text-[10px] flex items-center gap-1"><i class="fa-solid fa-flag"></i><span>إبلاغ</span></span>
                            </button>
                            <button class="btn-wood-empty w-full" id="inspect-block-btn">
                                <img src="img/Empty-button.png" class="btn-bg-art">
                                <span class="btn-inner-content text-white font-black text-[10px] flex items-center gap-1"><i class="fa-solid fa-ban"></i><span>حظر</span></span>
                            </button>
                        </div>
                    </div>
                `;
            },
            mount(body) {
                body.querySelector('#inspect-whisper-btn')?.addEventListener('click', () => {
                    closeModal('player-profile');
                    openModal('chat');
                    showToast(`بدء محادثة خاصة مع ${inspectedPlayer?.name || 'اللاعب'}`, '<i class="fa-solid fa-comment"></i>');
                });
                body.querySelector('#inspect-friend-btn')?.addEventListener('click', () => {
                    playSound('pop');
                    showToast(`تم إرسال طلب صداقة إلى ${inspectedPlayer?.name || 'اللاعب'}!`, '<i class="fa-solid fa-user-plus"></i>');
                    closeModal('player-profile');
                });
                body.querySelector('#inspect-invite-btn')?.addEventListener('click', () => {
                    playSound('pop');
                    showToast(`تمت دعوة ${inspectedPlayer?.name || 'اللاعب'} إلى الغرفة!`, '<i class="fa-solid fa-gamepad"></i>');
                    closeModal('player-profile');
                });
                body.querySelector('#inspect-report-btn')?.addEventListener('click', () => {
                    playSound('alert');
                    showToast(`تم إرسال إبلاغ عن ${inspectedPlayer?.name || 'اللاعب'}!`, '<i class="fa-solid fa-flag"></i>');
                    closeModal('player-profile');
                });
                body.querySelector('#inspect-block-btn')?.addEventListener('click', () => {
                    playSound('close');
                    showToast(`تم حظر ${inspectedPlayer?.name || 'اللاعب'}!`, '<i class="fa-solid fa-ban"></i>');
                    closeModal('player-profile');
                });
            }
        },

        // ---------- 3. الخطوة الأولى: إعداد وإنشاء الغرفة (Create Room Setup Modal) ----------
        'create-room': {
            title: 'إنشاء غرفة معركة مخصصة', icon: 'img/Create Room.png', size: 'box-white-brother-style',
            footer: null,
            body: () => `
                <div class="w-full max-w-[500px] mx-auto setup-form-constrained flex flex-col items-center justify-between gap-2.5 py-2 px-1 h-full select-none text-right">
                    <!-- عنوان وتوضيح -->
                    <div class="w-full text-center bg-black/40 p-2 rounded-xl border c-border-primary">
                        <span class="text-[#ffd875] text-sm font-black"><i class="fa-solid fa-gamepad mr-1"></i>إعدادات ساحة المعركة المخصصة</span>
                        <p class="text-white/80 text-[10px] mt-0.5 font-bold">حدد اسم الغرفة ونوع القتال وعدد الفرق وكلمة المرور للدخول</p>
                    </div>

                    <!-- إدخال اسم الغرفة -->
                    <div class="w-full flex flex-col gap-1">
                        <label class="text-[#ffd875] text-xs font-black flex items-center gap-1.5 justify-start">
                            <i class="fa-solid fa-tag"></i> اسم الغرفة:
                        </label>
                        <div class="text-bg-box w-full h-[40px] px-3 flex items-center">
                            <input id="setup-room-name-input" type="text" value="عرين النمل الأبطال #92" maxlength="28" 
                                   class="w-full bg-transparent text-white font-bold text-xs outline-none placeholder-[#FFD875]/50">
                        </div>
                    </div>

                    <!-- اختيار نوع المعركة -->
                    <div class="w-full flex flex-col gap-1">
                        <label class="text-[#ffd875] text-xs font-black flex items-center gap-1.5 justify-start">
                            <i class="fa-solid fa-swords"></i> نوع المعركة:
                        </label>
                        <div class="grid grid-cols-2 gap-3 w-full" id="setup-room-mode-group">
                            <button type="button" id="setup-mode-classic-btn" class="btn-wood-empty w-full h-[40px] relative active cursor-pointer">
                                <img src="img/Empty-button.png" class="btn-bg-art" alt="">
                                <span class="btn-inner-content text-[#ffd875] font-black text-xs whitespace-nowrap"><i class="fa-solid fa-sword mr-1"></i>معركة عادية</span>
                            </button>
                            <button type="button" id="setup-mode-endless-btn" class="btn-wood-empty w-full h-[40px] relative cursor-pointer opacity-75 hover:opacity-100">
                                <img src="img/Empty-button.png" class="btn-bg-art" alt="">
                                <span class="btn-inner-content text-white font-black text-xs whitespace-nowrap"><i class="fa-solid fa-infinity mr-1"></i>نمط بلا نهاية</span>
                            </button>
                        </div>
                    </div>

                    <!-- تحديد عدد الفرق -->
                    <div class="w-full flex flex-col gap-1">
                        <div class="flex items-center justify-between">
                            <label class="text-[#ffd875] text-xs font-black flex items-center gap-1.5">
                                <i class="fa-solid fa-users"></i> عدد الفرق (أقل شيء 2):
                            </label>
                            <span class="text-[#37AA49] font-black text-xs" id="selected-teams-label">4 فرق</span>
                        </div>
                        <div class="grid grid-cols-6 gap-1.5 w-full" id="setup-teams-count-grid">
                            ${[2, 3, 4, 5, 6, 8].map(cnt => `
                                <button type="button" class="team-cnt-btn btn-wood-empty h-[34px] relative cursor-pointer ${cnt === 4 ? 'active-team-btn' : 'opacity-80'}" data-count="${cnt}">
                                    <img src="img/Empty-button.png" class="btn-bg-art" alt="">
                                    <span class="btn-inner-content text-xs font-black ${cnt === 4 ? 'text-yellow-300 font-extrabold' : 'text-white'} whitespace-nowrap">${cnt} فرق</span>
                                </button>
                            `).join('')}
                        </div>
                    </div>

                    <!-- خيار غرفة خاصة برقم سري مع img/enable.png / img/disabled.png (لا يمتد بالعرض) -->
                    <div class="w-full flex flex-col gap-1.5 items-start">
                        <div class="rpg-toggle-pill cursor-pointer inline-flex w-fit self-start items-center justify-between p-2 rounded-xl bg-black/40 border c-border-primary" id="setup-private-toggle-row">
                            <div class="flex items-center gap-2">
                                <i class="fa-solid fa-lock text-[#FFD875] text-xs"></i>
                                <span class="text-white text-xs font-bold" id="private-toggle-text">غرفة عامة مفتوحة للجميع</span>
                            </div>
                            <img id="setup-private-toggle-img" src="img/disabled.png" class="w-7 h-7 object-contain cursor-pointer" alt="toggle">
                        </div>

                        <!-- حقل كلمة المرور -->
                        <div id="setup-password-wrapper" class="w-full hidden flex flex-col gap-0.5 text-right">
                            <label class="text-[#FFD875] text-[10px] font-black">كلمة المرور الخاصة:</label>
                            <div class="text-bg-box w-full h-[36px] px-3 flex items-center">
                                <input id="setup-room-password-input" type="password" placeholder="أدخل كلمة المرور..." maxlength="16"
                                       class="w-full bg-transparent text-white font-bold text-xs outline-none placeholder-[#FFD875]/40">
                            </div>
                        </div>
                    </div>

                    <!-- زر إنشاء ودخول اللوبي بـ img/Empty-button.png بخط واحد -->
                    <button id="create-room-confirm-btn" class="btn-wood-empty w-full h-[46px] relative cursor-pointer mt-1 hover:scale-[1.02] transition-transform">
                        <img src="img/Empty-button.png" class="btn-bg-art" alt="Create">
                        <span class="btn-inner-content text-[#FFD875] font-black text-sm whitespace-nowrap"><i class="fa-solid fa-gamepad mr-1"></i> إنشاء الغرفة ودخول اللوبي</span>
                    </button>
                </div>`,
            mount(body) {
                const nameInput = body.querySelector('#setup-room-name-input');
                const classicBtn = body.querySelector('#setup-mode-classic-btn');
                const endlessBtn = body.querySelector('#setup-mode-endless-btn');
                const createBtn = body.querySelector('#create-room-confirm-btn');
                const teamsLabel = body.querySelector('#selected-teams-label');
                const privateRow = body.querySelector('#setup-private-toggle-row');
                const privateImg = body.querySelector('#setup-private-toggle-img');
                const privateText = body.querySelector('#private-toggle-text');
                const pwdWrapper = body.querySelector('#setup-password-wrapper');
                const pwdInput = body.querySelector('#setup-room-password-input');

                let selectedMode = 'classic';
                let selectedTeamCount = 4;
                let isPrivate = false;

                classicBtn.addEventListener('click', () => {
                    selectedMode = 'classic';
                    classicBtn.classList.add('active');
                    endlessBtn.classList.remove('active');
                    playSound('click');
                });

                endlessBtn.addEventListener('click', () => {
                    selectedMode = 'endless';
                    endlessBtn.classList.add('active');
                    classicBtn.classList.remove('active');
                    playSound('click');
                });

                // اختيار عدد الفرق
                body.querySelectorAll('.team-cnt-btn').forEach(btn => {
                    btn.addEventListener('click', () => {
                        body.querySelectorAll('.team-cnt-btn').forEach(b => {
                            b.classList.remove('!bg-gradient-to-r', '!from-amber-500', '!to-yellow-400', '!text-black');
                        });
                        btn.classList.add('!bg-gradient-to-r', '!from-amber-500', '!to-yellow-400', '!text-black');
                        selectedTeamCount = parseInt(btn.getAttribute('data-count')) || 4;
                        teamsLabel.textContent = `${selectedTeamCount} فرق`;
                        playSound('click');
                    });
                });

                // تبديل الغرفة الخاصة
                privateRow.addEventListener('click', () => {
                    isPrivate = !isPrivate;
                    privateImg.src = isPrivate ? 'img/enable.png' : 'img/disabled.png';
                    privateText.innerHTML = isPrivate ? '<i class="fa-solid fa-lock mr-1"></i>غرفة خاصة برقم سري' : 'غرفة عامة مفتوحة للجميع';
                    if (isPrivate) {
                        pwdWrapper.classList.remove('hidden');
                        pwdInput.focus();
                    } else {
                        pwdWrapper.classList.add('hidden');
                    }
                    playSound('toggle');
                });

                createBtn.addEventListener('click', () => {
                    const roomName = (nameInput.value || '').trim() || 'عرين النمل الأبطال';
                    const randomId = '#ROOM-' + Math.floor(1000 + Math.random() * 9000);

                    currentLobbyState.roomName = roomName;
                    currentLobbyState.roomId = randomId;
                    currentLobbyState.mode = selectedMode;
                    currentLobbyState.teamCount = selectedTeamCount;
                    currentLobbyState.isPrivate = isPrivate;
                    currentLobbyState.password = isPrivate ? (pwdInput.value || '1234') : '';
                    currentLobbyState.countdown = 60;
                    resetLobbyTeams(selectedTeamCount);

                    closeModal('create-room');
                    setTimeout(() => {
                        openModal('room-lobby');
                        playSound('fanfare');
                        showToast(`تم إنشاء الغرفة (${roomName}) بنجاح!`, '<i class="fa-solid fa-gamepad"></i>');
                    }, 200);
                });
            }
        },

        // ---------- 3.B. الخطوة الثانية: نفاذة الغرفة واللوبي المخصص (مطابقة تماماً للصورة المرجعية) ----------
        'room-lobby': {
            title: '', 
            icon: '', 
            box: 'img/box-white-brother.png',
            size: 'box-white-brother-style',
            footer: null,
            body: () => `
                <div class="lobby-reference-container flex flex-col h-full justify-between overflow-hidden">
                    <!-- الترويسة العلوية: اسم الغرفة وزر الخروج وأعمدة التفاصيل الأربعة بأيقونات عصرية وخط كبير -->
                    <div class="lobby-reference-header flex-shrink-0">
                        <div class="lobby-ref-title-row flex items-center justify-between px-2">
                            <h2 class="lobby-ref-room-name flex-1 text-center font-black" id="room-lobby-name-display">${currentLobbyState.roomName}</h2>
                          
                        </div>
                        <div class="lobby-ref-meta-row mt-1">
                            <div class="lobby-ref-meta-col">
                                <div class="flex items-center gap-1">
                                    <i class="fa-solid fa-gamepad text-[#FFD875] text-xs"></i>
                                    <span class="lobby-ref-meta-label" data-i18n="lobby.roomType">نوع الغرفة</span>
                                </div>
                                <span class="lobby-ref-meta-val">${currentLobbyState.mode === 'endless' ? 'بلا نهاية' : 'عادي'}</span>
                            </div>
                            <div class="lobby-ref-meta-col">
                                <div class="flex items-center gap-1">
                                    <i class="fa-solid fa-user-group text-[#FFD875] text-xs"></i>
                                    <span class="lobby-ref-meta-label" data-i18n="lobby.teamCount">عدد الفرق</span>
                                </div>
                                <span class="lobby-ref-meta-val">${currentLobbyState.teamCount} فرق</span>
                            </div>
                            <div class="lobby-ref-meta-col">
                                <div class="flex items-center gap-1">
                                    <i class="fa-solid fa-users text-[#FFD875] text-xs"></i>
                                    <span class="lobby-ref-meta-label" data-i18n="lobby.playerCount">عدد اللاعبين</span>
                                </div>
                                <span class="lobby-ref-meta-val" id="room-ref-player-count">1/16</span>
                            </div>
                            <div class="lobby-ref-meta-col">
                                <div class="flex items-center gap-1">
                                    <i class="fa-solid fa-shield-halved text-[#FFD875] text-xs"></i>
                                    <span class="lobby-ref-meta-label" data-i18n="lobby.privacy">عامه او لا</span>
                                </div>
                                <span class="lobby-ref-meta-val">${currentLobbyState.isPrivate ? 'خاصة (رمز)' : 'عامة'}</span>
                            </div>
                        </div>
                    </div>

                    <!-- شبكة الفرق الـ 8 (معزولة بـ scroll مستقل لا يمس الفوتر إطلاقاً) -->
                    <div class="lobby-ref-teams-grid modal-scrollbar flex-1 overflow-y-auto my-1.5" id="lobby-teams-grid"></div>

                    <!-- الشريط السفلي الثابت بالأسفل تماماً خارج الاسكرول: مشاركة الرابط، زر استعد، العداد من 60 لـ 00، وزر الشات -->
                    <div class="lobby-reference-footer flex-shrink-0 mt-auto pt-2 border-t c-border-primary flex items-center justify-between gap-2 sm:gap-4">
                        <!-- زر مشاركة الرابط بـ img/Empty-button.png بخط واحد -->
                        <button id="copy-room-link-btn" class="btn-ref-share-link">
                            <span id="copy-room-link-text" data-i18n="lobby.shareLink">مشاركة الرابط</span>
                        </button>

                        <!-- زر استعد الكبير بـ img/Empty-button.png بخط واحد في المنتصف -->
                        <button id="lobby-ready-action-btn" class="btn-ref-ready-master">
                            <span id="lobby-ready-btn-text" data-i18n="lobby.ready">استعد</span>
                        </button>

                        <div class="flex items-center gap-2 sm:gap-3">
                            <!-- الوقت التنازلي من 60 إلى 00 بخط كبير وواضح -->
                            <div class="lobby-ref-countdown-wrap">
                                <span class="text-xs font-black text-white/90" data-i18n="lobby.countdown">الوقت التنازلي</span>
                                <span id="room-countdown-timer" class="text-[#FFD875] font-black">00:60</span>
                            </div>

                            <!-- زر الدردشة بصورة img/Chat.png -->
                            <button id="lobby-chat-shortcut-btn" class="btn-ref-chat-shortcut cursor-pointer hover:scale-110 active:scale-95 transition-transform p-0 bg-transparent border-none" title="فتح المحادثة">
                                <img src="img/Chat.png" class="w-11 h-11 sm:w-12 sm:h-12 object-contain drop-shadow-[0_4px_8px_rgba(0,0,0,0.8)]" alt="Chat">
                            </button>
                        </div>
                    </div>
                </div>`,
            mount(body) {
                const teamsGrid = body.querySelector('#lobby-teams-grid');
                const timerEl = body.querySelector('#room-countdown-timer');
                const readyBtn = body.querySelector('#lobby-ready-action-btn');
                const readyBtnText = body.querySelector('#lobby-ready-btn-text');
                const shareBtn = body.querySelector('#copy-room-link-btn');
                const shareBtnText = body.querySelector('#copy-room-link-text');
                const chatBtn = body.querySelector('#lobby-chat-shortcut-btn');
                const playerCountEl = body.querySelector('#room-ref-player-count');

                // رسم بطاقات الفرق الـ 8 استناداً إلى الصورة المرجعية img/media_1789280455403.png
                function renderTeams() {
                    teamsGrid.innerHTML = '';
                    let totalPlayers = 0;

                    lobbyTeams.forEach(t => {
                        totalPlayers += t.members.length;
                        const isMyTeam = currentLobbyState.myTeamId === t.id;
                        const myMemberObj = isMyTeam ? t.members.find(m => m.name === savedProfile.name) : null;
                        const amILeader = isMyTeam && myMemberObj && myMemberObj.isLeader;
                        const isFull = t.members.length >= t.maxSlots;

                        const card = document.createElement('div');
                        const isDisabled = !t.active;
                        card.className = `team-sheet-card ${isDisabled ? 'team-disabled-state' : ''} ${isMyTeam ? 'ring-2 ring-[#FFD875] scale-[1.02]' : ''}`;

                        // رأس بطاقة الفريق: الكرة الملونة واسم اللون
                        const orbFilter = `filter: hue-rotate(${t.hue || '0deg'}) drop-shadow(0 0 6px ${t.color});`;
                        let headerHTML = `
                            <div class="team-sheet-head">
                                <img src="img/color-team.png" class="team-sheet-orb" style="${orbFilter}" alt="${t.name}">
                                <span class="team-sheet-color-title" style="color:${t.color};">${t.name}</span>
                                ${amILeader ? `
                                    <button class="team-lock-btn ml-auto text-[9px] bg-black/60 px-1.5 py-0.5 rounded border c-border-gold text-[#FFD875] cursor-pointer hover:bg-black/80 transition" title="قفل أو فتح الفريق">
                                        <i class="fa-solid ${t.locked ? 'fa-lock' : 'fa-lock-open'} text-[10px]"></i>
                                    </button>
                                ` : ''}
                            </div>
                        `;

                        // محتوى الفريق
                        let bodyHTML = '';
                        if (isDisabled) {
                            // فريق معطل وغير مشمول في عدد الفرق: أبيض وأسود مع سلاسل img/lock-list.png
                            bodyHTML = `
                                <div class="team-chains-lock-overlay">
                                    <img src="img/lock-list.png" alt="Locked">
                                </div>
                            `;
                        } else if (t.locked) {
                            // فريق مقفل بواسطة القائد
                            bodyHTML = `
                                <div class="team-leader-lock-overlay relative">
                                    <img src="img/lock-team.png" alt="Team Locked">
                                    ${amILeader ? `
                                        <button class="team-unlock-btn absolute bottom-1 left-1/2 -translate-x-1/2 text-[8px] font-black text-[#FFD875] bg-black/70 px-2 py-0.5 rounded border c-border-gold cursor-pointer hover:bg-black/90 transition z-10">
                                            <i class="fa-solid fa-lock-open text-[9px] mr-1"></i>فك القفل
                                        </button>
                                    ` : ''}
                                </div>
                            `;
                        } else if (t.members.length === 0) {
                            // فريق فارغ متاح: علامة + كبيرة وكلمة join
                            bodyHTML = `
                                <div class="team-sheet-empty-join join-action-trigger">
                                    <span class="join-plus">+</span>
                                    <span class="join-text">انضمام</span>
                                </div>
                            `;
                        } else {
                            // قائمة اللاعبين
                            let rowsHTML = '';
                            t.members.forEach((m, mIdx) => {
                                const isMe = m.name === savedProfile.name;
                                const isCaptain = mIdx === 0 || m.isLeader;
                                const readyIcon = m.ready ? 'img/enable.png' : 'img/disabled.png';
                                rowsHTML += `
                                    <div class="team-player-slot-row cursor-pointer inspect-member-btn" data-player="${m.name}" data-avatar="${m.avatar}">
                                        <img src="${readyIcon}" class="w-3.5 h-3.5 object-contain flex-shrink-0" alt="ready">
                                        <span class="truncate ${isMe ? 'text-[#FFD875] font-black' : 'text-white'}">
                                            ${m.name} <span class="text-[#ffd875] font-black text-[9px]">Lvl 18</span>
                                        </span>
                                        ${isCaptain ? '<span class="ml-auto flex-shrink-0" title="قائد الفريق"><i class="fa-solid fa-crown text-[#FFD875] text-[10px] drop-shadow"></i></span>' : ''}
                                    </div>
                                `;
                            });
                            bodyHTML = `
                                <div class="team-sheet-body">
                                    ${rowsHTML}
                                </div>
                                ${!isFull && !isMyTeam ? `
                                    <div class="mt-auto pt-1 flex justify-center">
                                        <button class="join-action-trigger text-[8.5px] font-black text-[#FFD875] bg-black/60 px-2 py-0.5 rounded border c-border-gold hover:bg-black/80 transition cursor-pointer">
                                            <i class="fa-solid fa-plus mr-0.5"></i> انضمام
                                        </button>
                                    </div>
                                ` : ''}
                                ${isMyTeam ? `
                                    <div class="mt-auto pt-1 flex justify-center">
                                        <button class="leave-team-btn text-[8px] font-bold text-white c-bg-crimson px-1.5 py-0.5 rounded border c-border-primary hover:bg-[#BC4526] transition cursor-pointer">
                                            <i class="fa-solid fa-right-from-bracket mr-0.5"></i> مغادرة
                                        </button>
                                    </div>
                                ` : ''}
                            `;
                        }

                        card.innerHTML = headerHTML + bodyHTML;

                        // معالجات النقر للانضمام
                        card.querySelectorAll('.join-action-trigger').forEach(trigger => {
                            trigger.addEventListener('click', (e) => {
                                e.stopPropagation();
                                if (t.locked) {
                                    showToast('هذا الفريق مقفل من قبل القائد!', '<i class="fa-solid fa-lock"></i>');
                                    return;
                                }
                                if (isFull) {
                                    showToast('هذا الفريق مكتمل بالفعل!', '<i class="fa-solid fa-triangle-exclamation"></i>');
                                    return;
                                }

                                // مغادرة الفريق السابق إن وجد
                                if (currentLobbyState.myTeamId) {
                                    const prevTeam = lobbyTeams.find(item => item.id === currentLobbyState.myTeamId);
                                    if (prevTeam) {
                                        const wasLeader = prevTeam.members.some(m => m.name === savedProfile.name && m.isLeader);
                                        prevTeam.members = prevTeam.members.filter(m => m.name !== savedProfile.name);
                                        if (wasLeader && prevTeam.members.length > 0) {
                                            prevTeam.members[0].isLeader = true;
                                        }
                                    }
                                }

                                const becomesLeader = (t.members.length === 0);
                                t.members.push({
                                    name: savedProfile.name,
                                    avatar: savedProfile.avatar,
                                    isLeader: becomesLeader,
                                    ready: false
                                });

                                currentLobbyState.myTeamId = t.id;
                                currentLobbyState.isReady = false;
                                readyBtn.classList.remove('is-ready');
                                readyBtnText.textContent = 'استعد';

                                playSound('pop');
                                showToast(`انضممت إلى ${t.name}!`, '<i class="fa-solid fa-star"></i>');
                                renderTeams();
                            });
                        });

                        // معالج فك قفل الفريق للقائد (من overlay الفريق المقفل)
                        const unlockBtn = card.querySelector('.team-unlock-btn');
                        if (unlockBtn && amILeader) {
                            unlockBtn.addEventListener('click', (e) => {
                                e.stopPropagation();
                                t.locked = false;
                                playSound('click');
                                showToast('تم فتح الفريق!', '<i class="fa-solid fa-lock-open"></i>');
                                renderTeams();
                            });
                        }

                        // معالج مغادرة الفريق
                        const leaveBtn = card.querySelector('.leave-team-btn');
                        if (leaveBtn) {
                            leaveBtn.addEventListener('click', (e) => {
                                e.stopPropagation();
                                t.members = t.members.filter(m => m.name !== savedProfile.name);
                                if (amILeader && t.members.length > 0) {
                                    t.members[0].isLeader = true;
                                }
                                currentLobbyState.myTeamId = null;
                                currentLobbyState.isReady = false;
                                readyBtn.classList.remove('is-ready');
                                readyBtnText.textContent = 'استعد';
                                playSound('close');
                                showToast('غادرت الفريق!', '<i class="fa-solid fa-right-from-bracket"></i>');
                                renderTeams();
                            });
                        }

                        // قفل / فتح الفريق (toggle)
                        const lockBtn = card.querySelector('.team-lock-btn');
                        if (lockBtn && amILeader) {
                            lockBtn.addEventListener('click', (e) => {
                                e.stopPropagation();
                                t.locked = !t.locked;
                                playSound('click');
                                showToast(t.locked ? 'تم قفل الفريق!' : 'تم فتح الفريق!',
                                    t.locked ? '<i class="fa-solid fa-lock"></i>' : '<i class="fa-solid fa-lock-open"></i>');
                                renderTeams();
                            });
                        }

                        // فحص بروفايل اللاعب
                        card.querySelectorAll('.inspect-member-btn').forEach(slot => {
                            slot.addEventListener('click', (e) => {
                                e.stopPropagation();
                                const pName = slot.getAttribute('data-player');
                                const pAv = slot.getAttribute('data-avatar');
                                inspectedPlayer = {
                                    name: pName,
                                    id: Math.floor(100000 + Math.random() * 900000),
                                    avatar: pAv,
                                    level: 18,
                                    title: 'مقاتل في الغرفة',
                                    clan: 'تحالف الغرفة',
                                    kd: '4.1',
                                    winRate: '68%',
                                    score: '17,800',
                                    matches: 120,
                                    wins: 82,
                                    losses: 38,
                                    combatPower: '16,400 CP',
                                    joinDate: 'Feb 2025',
                                    passLvl: 18,
                                    badges: ['مقاتل اللوبي', 'درع الفريق'],
                                    recentMatches: [
                                        { result: 'Victory', mode: 'Arena', score: '3,100', kills: 6, time: '10m ago', isWin: true },
                                        { result: 'Victory', mode: 'Endless', score: '2,800', kills: 5, time: '1h ago', isWin: true }
                                    ]
                                };
                                openModal('player-profile');
                            });
                        });

                        teamsGrid.appendChild(card);
                    });

                    if (playerCountEl) {
                        playerCountEl.textContent = `${totalPlayers}/16`;
                    }
                }

                // زر الخروج من اللوبي
                const exitBtn = body.querySelector('#room-lobby-exit-btn');
                if (exitBtn) {
                    exitBtn.addEventListener('click', () => {
                        clearInterval(currentLobbyState.timerInterval);
                        closeModal('room-lobby');
                        playSound('close');
                    });
                }

                // زر استعد الكبير
                readyBtn.addEventListener('click', () => {
                    if (!currentLobbyState.myTeamId) {
                        showToast('يجب الانضمام إلى فريق أولاً!', '<i class="fa-solid fa-triangle-exclamation"></i>');
                        return;
                    }

                    currentLobbyState.isReady = !currentLobbyState.isReady;
                    const myTeam = lobbyTeams.find(t => t.id === currentLobbyState.myTeamId);
                    if (myTeam) {
                        const me = myTeam.members.find(m => m.name === savedProfile.name);
                        if (me) me.ready = currentLobbyState.isReady;
                    }

                    if (currentLobbyState.isReady) {
                        readyBtn.classList.add('is-ready');
                        readyBtnText.innerHTML = '<i class="fa-solid fa-check mr-1"></i>مستعد';
                        playSound('reward');
                        showToast('أنت جاهز لبدء المعركة!', '<i class="fa-solid fa-shield-halved"></i>');
                    } else {
                        readyBtn.classList.remove('is-ready');
                        readyBtnText.textContent = 'استعد';
                        playSound('click');
                    }
                    renderTeams();
                });

                // زر مشاركة الرابط
                shareBtn.addEventListener('click', () => {
                    const inviteLink = `https://antwar.game/join?room=${encodeURIComponent(currentLobbyState.roomId)}&mode=${currentLobbyState.mode}`;
                    navigator.clipboard.writeText(inviteLink).then(() => {
                        playSound('save');
                        shareBtnText.innerHTML = '<i class="fa-solid fa-check mr-1"></i>تم النسخ!';
                        showToast('تم نسخ رابط الغرفة بنجاح!', '<i class="fa-solid fa-link"></i>');
                        setTimeout(() => {
                            shareBtnText.textContent = 'مشاركة الرابط';
                        }, 1800);
                    }).catch(() => {
                        prompt('رابط الغرفة المباشر:', inviteLink);
                    });
                });

                // زر الشات
                chatBtn.addEventListener('click', () => {
                    openModal('chat');
                });

                // المؤقت التنازلي: من 60 → 00
                clearInterval(currentLobbyState.timerInterval);
                currentLobbyState.countdown = 60;
                timerEl.textContent = '00:60';
                currentLobbyState.timerInterval = setInterval(() => {
                    if (currentLobbyState.countdown > 0) {
                        currentLobbyState.countdown--;
                        const ss = String(currentLobbyState.countdown).padStart(2, '0');
                        timerEl.textContent = `00:${ss}`;
                    } else {
                        clearInterval(currentLobbyState.timerInterval);
                        timerEl.textContent = '00:00';
                        playSound('fanfare');
                        showToast('بدأت المعركة الآن!', '<i class="fa-solid fa-swords"></i>');
                    }
                }, 1000);

                renderTeams();
            },
            unmount() {
                clearInterval(currentLobbyState.timerInterval);
            }
        },

        // ---------- 4. المكافآت اليومية — data-driven from nav-items.json ----------
        'daily-rewards': {
            title: t('dailyRewards.title'), icon: 'img/Daily-Gifts.png',
            footer: { id: 'claim-daily-btn', title: t('dailyRewards.claim', { day: 1 }) },
            body: () => {
                const rewards = getDailyRewards();
                return `<div class="grid grid-cols-4 gap-2.5 w-full max-w-[340px] py-1">
                    ${rewards.map(r => {
                        const todayClass = r.isToday ? 'scale-105' : 'opacity-70';
                        const ringClass = r.isToday ? 'ring-2 ring-emerald-400 rounded-lg' : '';
                        const amount = r.rewardType === 'mega' ? t(r.bonusKey) : `+${Number(r.amount).toLocaleString()}`;
                        return `<div class="flex flex-col items-center ${todayClass}">
                            <span class="text-[#ffd875] text-[10px] font-black mb-0.5" data-i18n="${r.dayKey}">${t(r.dayKey)}</span>
                            ${renderItemSlotHTML({ ...r, graphic: asset(r.icon) }, `w-14 h-14 ${ringClass}`)}
                            <span class="text-white text-[9px] font-black mt-0.5">${amount}</span>
                        </div>`;
                    }).join('')}
                </div>`;
            },
            mount(body, inst) {
                const rewards = getDailyRewards();
                inst.querySelector('#claim-daily-btn').addEventListener('click', () => {
                    const today = rewards.find(r => r.isToday) || rewards[0];
                    if (today.rewardType === 'gold') currentGold += Number(today.amount);
                    if (today.rewardType === 'gem') currentGems += Number(today.amount);
                    if (today.rewardType === 'mega') { currentGold += Number(today.amount); currentGems += 500; }
                    updateCurrenciesDisplay();
                    playSound('reward');
                    closeModal('daily-rewards');
                });
            }
        },

        // ---------- 5. نظام الرويال باس (Royal Pass Season 4) ----------
        'royal-pass': {
            title: t('royalPass.title'), icon: 'img/RoyalPass.png', size: 'size-xl',
            footer: null,
            body: () => `
                <div class="w-full flex flex-col bg-black/55 p-2.5 rounded-xl border c-border-primary mb-2 gap-2">
                    <div class="flex flex-col sm:flex-row items-center justify-between gap-2">
                        <div class="flex items-center gap-3">
                            <img src="img/RoyalPass.png" class="w-11 h-11 drop-shadow-[0_4px_10px_rgba(255,215,0,0.5)]">
                            <div class="flex flex-col text-left">
                                <div class="flex items-center gap-2">
                                    <span class="text-yellow-300 text-sm font-black">${t('royalPass.seasonName')}</span>
                                    <span class="bg-gradient-to-r from-yellow-400 to-amber-500 text-black text-[10px] font-black px-2 py-0.5 rounded shadow">Tier ${userPassLevel} / 100</span>
                                </div>
                                <span class="text-white/80 text-[10px]">${t('royalPass.endsIn')}</span>
                            </div>
                        </div>
                        <button id="pass-claim-all-btn" class="btn-wood-empty w-36">
                            <img src="img/Empty-button.png" class="btn-bg-art">
                            <span class="btn-inner-content text-yellow-300 font-black text-xs">${t('royalPass.claimAll')}</span>
                        </button>
                    </div>

                    <!-- شريط تقدم المستويات المضيء -->
                    <div class="w-full flex flex-col gap-1 mt-1">
                        <div class="flex justify-between items-center px-1">
                            <span class="text-[#ffd875] text-[10px] font-black">${t('royalPass.progress')}</span>
                            <span class="text-white text-[10px] font-bold" id="pass-xp-counter">${userPassXp} / ${maxPassXp} XP (${Math.round((userPassXp / maxPassXp) * 100)}%)</span>
                        </div>
                        <div class="pass-progress-track">
                            <div class="pass-progress-fill" style="width: ${(userPassXp / maxPassXp) * 100}%"></div>
                        </div>
                    </div>
                </div>

                <div class="flex gap-2 w-full mb-2 flex-shrink-0">
                    ${getPassTabs().map((tab, i) => `<button class="wood-tab-btn ${i === 0 ? 'active' : ''}" data-passtarget="${tab.id}">${t(tab.labelKey, { count: tab.id === 'daily' ? dailyPassQuests.length : weeklyPassChallenges.length })}</button>`).join('')}
                </div>

                <div id="pass-track-view" class="w-full flex flex-col gap-2 pr-1 max-h-[340px] overflow-y-auto modal-scrollbar"></div>
                <div id="pass-daily-view" class="w-full flex-col gap-2 pr-1 max-h-[340px] overflow-y-auto modal-scrollbar hidden"></div>
                <div id="pass-weekly-view" class="w-full flex-col gap-2 pr-1 max-h-[340px] overflow-y-auto modal-scrollbar hidden"></div>`,
            mount(body) {
                const trackView = body.querySelector('#pass-track-view');
                const dailyView = body.querySelector('#pass-daily-view');
                const weeklyView = body.querySelector('#pass-weekly-view');
                const tabs = body.querySelectorAll('.wood-tab-btn');

                function renderTrack() {
                    trackView.innerHTML = '';
                    royalPassTiers.slice(0, 30).forEach(t => {
                        const row = document.createElement('div');
                        row.className = `game-card-row p-2 flex items-center justify-between ${t.tier === userPassLevel ? 'border-yellow-400 bg-[#66180F]/70 ring-1 ring-yellow-400' : ''}`;

                        row.innerHTML = `
                            <div class="flex items-center gap-3">
                                <span class="text-xs font-black text-[#FFD875] w-9">T-${t.tier}</span>
                                <div class="flex flex-col items-center">
                                    <span class="text-[9px] text-gray-300 font-bold">${t('royalPass.free')}</span>
                                    ${renderItemSlotHTML(t.freeReward, 'w-12 h-12')}
                                    <span class="text-[8px] text-white mt-0.5 truncate max-w-[70px]">${t.freeReward.name}</span>
                                </div>
                                <div class="flex flex-col items-center ml-2">
                                    <span class="text-[9px] text-yellow-300 font-bold">${t('royalPass.name')}</span>
                                    ${renderItemSlotHTML(t.premiumReward, 'w-12 h-12')}
                                    <span class="text-[8px] text-yellow-200 mt-0.5 truncate max-w-[80px]">${t.premiumReward.name}</span>
                                </div>
                            </div>
                            <button class="pass-tier-btn btn-wood-empty w-24 ${!t.unlocked || t.claimed ? 'opacity-50 pointer-events-none' : ''}">
                                <img src="img/Empty-button.png" class="btn-bg-art">
                                <span class="btn-inner-content text-white font-black text-[10px]">${t.claimed ? t('ui.claimed') : (t.unlocked ? t('ui.claim') : t('ui.locked'))}</span>
                            </button>
                        `;

                        const claimBtn = row.querySelector('.pass-tier-btn');
                        if (t.unlocked && !t.claimed) {
                            claimBtn.addEventListener('click', () => {
                                t.claimed = true;
                                currentGold += 350;
                                updateCurrenciesDisplay();
                                playSound('reward');
                                renderTrack();
                            });
                        }
                        trackView.appendChild(row);
                    });
                }

                function renderDailyMissions() {
                    dailyView.innerHTML = '';
                    dailyPassQuests.forEach(q => {
                        const isReady = q.progress >= q.max && !q.claimed;
                        const row = document.createElement('div');
                        row.className = 'game-card-row p-2.5 flex items-center justify-between gap-2';
                        row.innerHTML = `
                            <div class="flex flex-col text-left min-w-0 pr-2">
                                <span class="text-[#ffd875] text-xs font-black">${t(q.titleKey)}</span>
                                <span class="text-white text-xs">${t(q.descKey)}</span>
                                <div class="flex items-center gap-2 mt-1.5">
                                    <div class="w-32 h-2.5 bg-black/60 rounded-full overflow-hidden border border-[#BC4526]">
                                        <div class="bg-gradient-to-r from-amber-500 to-yellow-400 h-full" style="width: ${(q.progress / q.max) * 100}%"></div>
                                    </div>
                                    <span class="text-[#ffd875] text-[10px] font-black">${q.progress}/${q.max}</span>
                                    <span class="text-yellow-300 text-[10px] font-black ml-2">+${q.xp} Pass XP</span>
                                </div>
                            </div>
                            <button class="claim-dpq-btn btn-wood-empty w-24 ${!isReady ? 'opacity-50 pointer-events-none' : ''}">
                                <img src="img/Empty-button.png" class="btn-bg-art">
                                <span class="btn-inner-content text-white font-black text-[10px]">${q.claimed ? t('ui.done') : (isReady ? t('ui.claim') : t('ui.pending'))}</span>
                            </button>
                        `;
                        if (isReady) {
                            row.querySelector('.claim-dpq-btn').addEventListener('click', () => {
                                q.claimed = true;
                                userPassXp = Math.min(maxPassXp, userPassXp + q.xp);
                                playSound('reward');
                                renderDailyMissions();
                            });
                        }
                        dailyView.appendChild(row);
                    });
                }

                function renderWeeklyChallenges() {
                    weeklyView.innerHTML = '';
                    weeklyPassChallenges.forEach(q => {
                        const isReady = q.progress >= q.max && !q.claimed;
                        const row = document.createElement('div');
                        row.className = 'game-card-row p-2.5 flex items-center justify-between gap-2';
                        row.innerHTML = `
                            <div class="flex flex-col text-left min-w-0 pr-2">
                                <span class="text-[#ffd875] text-xs font-black">${t(q.titleKey)}</span>
                                <span class="text-white text-xs">${t(q.descKey)}</span>
                                <div class="flex items-center gap-2 mt-1.5">
                                    <div class="w-32 h-2.5 bg-black/60 rounded-full overflow-hidden border border-[#BC4526]">
                                        <div class="bg-gradient-to-r from-purple-500 to-pink-400 h-full" style="width: ${(q.progress / q.max) * 100}%"></div>
                                    </div>
                                    <span class="text-[#ffd875] text-[10px] font-black">${q.progress}/${q.max}</span>
                                    <span class="text-yellow-300 text-[10px] font-black ml-2">+${q.xp} Pass XP</span>
                                </div>
                            </div>
                            <button class="claim-wpq-btn btn-wood-empty w-24 ${!isReady ? 'opacity-50 pointer-events-none' : ''}">
                                <img src="img/Empty-button.png" class="btn-bg-art">
                                <span class="btn-inner-content text-white font-black text-[10px]">${q.claimed ? t('ui.done') : (isReady ? t('ui.claim') : t('ui.pending'))}</span>
                            </button>
                        `;
                        if (isReady) {
                            row.querySelector('.claim-wpq-btn').addEventListener('click', () => {
                                q.claimed = true;
                                userPassXp = Math.min(maxPassXp, userPassXp + q.xp);
                                playSound('reward');
                                renderWeeklyChallenges();
                            });
                        }
                        weeklyView.appendChild(row);
                    });
                }

                tabs.forEach(tab => {
                    tab.addEventListener('click', () => {
                        tabs.forEach(t => t.classList.remove('active'));
                        tab.classList.add('active');
                        const target = tab.getAttribute('data-passtarget');
                        trackView.classList.add('hidden');
                        dailyView.classList.add('hidden');
                        weeklyView.classList.add('hidden');

                        if (target === 'track') trackView.classList.remove('hidden');
                        else if (target === 'daily') dailyView.classList.remove('hidden');
                        else if (target === 'weekly') weeklyView.classList.remove('hidden');
                        playSound('click');
                    });
                });

                body.querySelector('#pass-claim-all-btn').addEventListener('click', () => {
                    royalPassTiers.forEach(t => {
                        if (t.unlocked && !t.claimed) {
                            t.claimed = true;
                            currentGold += 350;
                        }
                    });
                    updateCurrenciesDisplay();
                    playSound('reward');
                    renderTrack();
                });

                renderTrack();
                renderDailyMissions();
                renderWeeklyChallenges();
            }
        },

        // ---------- 6. نافذة الحقيبة الخاصة (Inventory Vault) ----------
        inventory: {
            title: 'Rare Items Vault & Bag', icon: 'img/box.png', size: 'size-xl',
            footer: null,
            body: () => `
                <div class="w-full flex flex-col gap-2">
                    <div class="flex items-center justify-between w-full mb-1 flex-shrink-0 px-1">
                        <div class="flex gap-1.5" id="vault-filter-tabs">
                            <button class="wood-tab-btn active" data-filter="all">All Items</button>
                            <button class="wood-tab-btn" data-filter="weapon">Weapons ⚔️</button>
                            <button class="wood-tab-btn" data-filter="armor">Armor 🛡️</button>
                            <button class="wood-tab-btn" data-filter="relic">Relics 🔮</button>
                        </div>
                        <span class="text-[#FFD875] font-bold text-xs c-bg-burgundy px-2.5 py-1 rounded border c-border-primary">
                            Equipped: <span id="vault-equipped-count" class="text-white">2/4</span>
                        </span>
                    </div>

                    <div class="grid grid-cols-1 md:grid-cols-3 gap-3 w-full items-start">
                        <div id="vault-items-grid" class="md:col-span-2 grid grid-cols-3 sm:grid-cols-4 gap-2.5 max-h-[350px] overflow-y-auto modal-scrollbar p-1"></div>

                        <div id="vault-inspector" class="vault-inspector-card flex flex-col items-center">
                            <div id="inspector-slot-wrap" class="my-2"></div>
                            <span id="inspector-item-name" class="text-white font-black text-sm text-center drop-shadow">Select Item</span>
                            <span id="inspector-item-rarity" class="text-[9px] font-black uppercase px-2 py-0.5 rounded-full my-1">RARITY</span>
                            <p id="inspector-item-desc" class="c-text-gold-70 text-[10px] text-center my-1 leading-snug">Item description will appear here.</p>
                            <div class="w-full bg-black/60 rounded-md p-1.5 border c-border-primary my-1 text-center">
                                <span id="inspector-item-stats" class="text-[#37AA49] text-[10px] font-bold">+0 Stats</span>
                            </div>

                            <div class="flex gap-2 w-full mt-2 justify-center">
                                <button id="equip-item-action-btn" class="vault-action-btn-equip flex-1">Equip</button>
                                <button id="stash-item-action-btn" class="vault-action-btn-stash flex-1">Stash</button>
                            </div>
                        </div>
                    </div>
                </div>`,
            mount(body) {
                const grid = body.querySelector('#vault-items-grid');
                const filterTabs = body.querySelectorAll('#vault-filter-tabs .wood-tab-btn');
                const inspectorWrap = body.querySelector('#inspector-slot-wrap');
                const inspectorName = body.querySelector('#inspector-item-name');
                const inspectorRarity = body.querySelector('#inspector-item-rarity');
                const inspectorDesc = body.querySelector('#inspector-item-desc');
                const inspectorStats = body.querySelector('#inspector-item-stats');
                const equipBtn = body.querySelector('#equip-item-action-btn');
                const stashBtn = body.querySelector('#stash-item-action-btn');
                const equippedCountEl = body.querySelector('#vault-equipped-count');

                let currentFilter = 'all';

                function updateInspector(item) {
                    selectedVaultItem = item;
                    inspectorWrap.innerHTML = renderItemSlotHTML(item, 'w-16 h-16 scale-110');
                    inspectorName.textContent = item.name;
                    inspectorDesc.textContent = item.desc;
                    inspectorStats.textContent = item.stats;

                    inspectorRarity.textContent = item.rarity;
                    inspectorRarity.className = `text-[9px] font-black uppercase px-2 py-0.5 rounded-full my-1 ${
                        item.rarity === 'mythic' ? 'bg-red-600 text-white' :
                        item.rarity === 'legendary' ? 'bg-[#FFD875] text-black' :
                        item.rarity === 'epic' ? 'bg-[#7E2025] text-white' : 'bg-[#BC4526] text-white'
                    }`;

                    equipBtn.textContent = item.equipped ? 'Unequip' : 'Equip';
                    stashBtn.textContent = item.stashed ? 'Unstash' : 'Stash';
                }

                function renderVault() {
                    grid.innerHTML = '';
                    const filtered = vaultItemsData.filter(i => currentFilter === 'all' || i.type === currentFilter);
                    const equippedCount = vaultItemsData.filter(i => i.equipped).length;
                    equippedCountEl.textContent = `${equippedCount}/4`;

                    filtered.forEach(item => {
                        const isSel = item.id === selectedVaultItem.id;
                        const cell = document.createElement('div');
                        cell.className = `game-card-row p-2 flex flex-col items-center cursor-pointer transition-all ${isSel ? 'ring-2 ring-yellow-400 c-bg-burgundy' : ''}`;
                        cell.innerHTML = `
                            ${renderItemSlotHTML(item, 'w-13 h-13 my-1')}
                            <span class="text-white text-[10px] font-black text-center truncate w-full mt-1">${item.name}</span>
                            <div class="flex gap-1 mt-1">
                                ${item.equipped ? '<span class="text-[8px] bg-[#37AA49] text-black font-black px-1 rounded">E</span>' : ''}
                                ${item.stashed ? '<span class="text-[8px] bg-[#7E2025] text-white font-black px-1 rounded">S</span>' : ''}
                            </div>
                        `;

                        cell.addEventListener('click', () => {
                            updateInspector(item);
                            renderVault();
                            playSound('click');
                        });
                        grid.appendChild(cell);
                    });
                }

                equipBtn.addEventListener('click', () => {
                    selectedVaultItem.equipped = !selectedVaultItem.equipped;
                    if (selectedVaultItem.equipped) selectedVaultItem.stashed = false;
                    playSound('equip');
                    updateInspector(selectedVaultItem);
                    renderVault();
                });

                stashBtn.addEventListener('click', () => {
                    selectedVaultItem.stashed = !selectedVaultItem.stashed;
                    if (selectedVaultItem.stashed) selectedVaultItem.equipped = false;
                    playSound('stash');
                    updateInspector(selectedVaultItem);
                    renderVault();
                });

                filterTabs.forEach(t => {
                    t.addEventListener('click', () => {
                        filterTabs.forEach(tab => tab.classList.remove('active'));
                        t.classList.add('active');
                        currentFilter = t.getAttribute('data-filter');
                        renderVault();
                    });
                });

                updateInspector(selectedVaultItem);
                renderVault();
            }
        },

        // ---------- 7. مركز الدردشة الاجتماعية (Social Chat Hub) ----------
        chat: {
            title: 'Social Chat Hub', icon: 'img/friend.png', size: 'size-xl',
            footer: null,
            body: () => `
                <div class="social-chat-hub w-full flex flex-col gap-2">
                    <div class="social-chat-tabs" id="social-chat-tabs-bar">
                        <button class="social-chat-tab-btn ${activeWhisperTarget ? '' : 'active'}" data-tab="global" id="chat-tab-global">
                            <span>🌍</span> Realm Chat
                        </button>
                        <button class="social-chat-tab-btn ${activeWhisperTarget ? 'active' : ''}" data-tab="friends" id="chat-tab-friends">
                            <span>👥</span> الأصدقاء الحاليين <span class="social-chat-tab-badge">${friendsData.filter(f => f.isOnline).length}</span>
                        </button>
                        <button class="social-chat-tab-btn" data-tab="recent" id="chat-tab-recent">
                            <span>💬</span> المحادثات السابقة
                        </button>
                        <button class="social-chat-tab-btn" data-tab="blocked" id="chat-tab-blocked">
                            <span>🚫</span> المحظورين (${blockedUsersData.length})
                        </button>
                    </div>

                    <div id="chat-stream-section" class="w-full flex flex-col">
                        <div class="flex items-center justify-between bg-black/45 px-3 py-1.5 rounded-lg border c-border-primary mb-1">
                            <div class="flex items-center gap-2" id="chat-active-recipient-info">
                                <span class="chat-status-dot ${activeWhisperTarget ? (activeWhisperTarget.isOnline ? 'online' : 'offline') : 'online'}"></span>
                                <span class="text-[#ffd875] text-xs font-black" id="chat-recipient-title">
                                    ${activeWhisperTarget ? `Direct: ${activeWhisperTarget.name}` : 'Global Realm Chat'}
                                </span>
                            </div>
                            <span class="text-[#37AA49] text-[10px] font-bold">● Server Online</span>
                        </div>

                        <div id="chat-messages-container" class="w-full flex flex-col gap-2 p-2.5 bg-black/50 rounded-xl border border-[#BC4526]/70 h-[260px] overflow-y-auto modal-scrollbar"></div>

                        <div class="w-full flex items-center gap-2 mt-2">
                            <div class="text-bg-box flex-1 h-[38px] px-3">
                                <input id="chat-input-field" type="text" placeholder="Type message in Social Chat Hub..." class="w-full bg-transparent text-white font-game font-bold text-xs outline-none placeholder-amber-200/40">
                            </div>
                            <button id="chat-send-btn" class="btn-wood-empty w-24 h-[38px]">
                                <img src="img/Empty-button.png" class="btn-bg-art">
                                <span class="btn-inner-content text-[#ffd875] font-black text-xs">Send</span>
                            </button>
                        </div>
                    </div>

                    <div id="chat-friends-panel" class="w-full flex-col gap-1.5 max-h-[340px] overflow-y-auto modal-scrollbar hidden">
                        <span class="text-[#ffd875] text-xs font-bold px-1">Active Friends (Click to start chat):</span>
                        <div id="chat-friends-list-container" class="flex flex-col gap-1.5 w-full"></div>
                    </div>

                    <div id="chat-recent-panel" class="w-full flex-col gap-1.5 max-h-[340px] overflow-y-auto modal-scrollbar hidden">
                        <span class="text-[#ffd875] text-xs font-bold px-1">Recent Active Conversations:</span>
                        <div id="chat-recent-list-container" class="flex flex-col gap-1.5 w-full"></div>
                    </div>

                    <div id="chat-blocked-panel" class="w-full flex-col gap-1.5 max-h-[340px] overflow-y-auto modal-scrollbar hidden">
                        <span class="text-[#ffd875] text-xs font-bold px-1">Blocked Users List:</span>
                        <div id="chat-blocked-list-container" class="flex flex-col gap-1.5 w-full"></div>
                    </div>
                </div>`,
            mount(body) {
                const streamSection = body.querySelector('#chat-stream-section');
                const friendsPanel = body.querySelector('#chat-friends-panel');
                const recentPanel = body.querySelector('#chat-recent-panel');
                const blockedPanel = body.querySelector('#chat-blocked-panel');
                const msgBox = body.querySelector('#chat-messages-container');
                const inp = body.querySelector('#chat-input-field');
                const sendBtn = body.querySelector('#chat-send-btn');
                const recipientTitle = body.querySelector('#chat-recipient-title');
                const tabs = body.querySelectorAll('.social-chat-tab-btn');

                let currentChannel = activeWhisperTarget ? 'whisper' : 'global';

                function renderMessages() {
                    msgBox.innerHTML = '';
                    let msgs = [];
                    if (currentChannel === 'global') {
                        msgs = chatDatabase.global;
                        recipientTitle.textContent = 'Global Realm Chat';
                    } else if (activeWhisperTarget) {
                        msgs = chatDatabase.direct[activeWhisperTarget.id] || [];
                        recipientTitle.textContent = `Direct: ${activeWhisperTarget.name}`;
                    }

                    if (msgs.length === 0) {
                        msgBox.innerHTML = `<span class="text-white/50 text-xs py-12 text-center">No messages yet in this channel. Say hello! 👋</span>`;
                        return;
                    }

                    msgs.forEach(m => {
                        const isMe = m.sender === savedProfile.name;
                        const row = document.createElement('div');
                        row.className = `flex gap-2 items-end ${isMe ? 'flex-row-reverse self-end' : 'self-start'} max-w-[85%]`;

                        row.innerHTML = `
                            <img src="${m.avatar}" class="w-7 h-7 rounded-full border border-[#BC4526] object-cover flex-shrink-0 drop-shadow">
                            <div class="flex flex-col ${isMe ? 'items-end' : 'items-start'}">
                                <div class="flex items-center gap-1.5 px-1 mb-0.5">
                                    <span class="text-[#ffd875] text-[10px] font-black">${m.sender}</span>
                                    <span class="text-white/50 text-[8px]">${m.time}</span>
                                </div>
                                <div class="${isMe ? 'chat-bubble-user' : 'chat-bubble-other'} text-xs font-bold leading-relaxed">
                                    ${m.text}
                                </div>
                            </div>
                        `;
                        msgBox.appendChild(row);
                    });
                    msgBox.scrollTop = msgBox.scrollHeight;
                }

                function renderFriendsTab() {
                    const list = body.querySelector('#chat-friends-list-container');
                    list.innerHTML = '';
                    friendsData.forEach(f => {
                        const card = document.createElement('div');
                        card.className = 'game-card-row p-2 flex items-center justify-between cursor-pointer hover:scale-[1.01] transition-transform';
                        const dotClass = f.isOnline ? (f.status === 'In Game' ? 'in-game' : 'online') : 'offline';
                        card.innerHTML = `
                            <div class="flex items-center gap-2.5">
                                <div class="relative">
                                    <img src="${f.avatar}" class="w-9 h-9 rounded-full border border-[#BC4526] object-cover">
                                    <span class="chat-status-dot ${dotClass} absolute bottom-0 right-0 border border-black"></span>
                                </div>
                                <div class="flex flex-col text-left">
                                    <div class="flex items-center gap-1.5">
                                        <span class="text-white text-xs font-black">${f.name}</span>
                                        <span class="text-[9px] bg-yellow-400 text-black px-1 rounded font-black">👑 ${f.passLvl}</span>
                                    </div>
                                    <span class="text-[#ffd875] text-[10px] font-bold">#${f.id} • ${f.status}</span>
                                </div>
                            </div>
                            <button class="chat-direct-btn btn-wood-empty w-24">
                                <img src="img/Empty-button.png" class="btn-bg-art">
                                <span class="btn-inner-content text-[#ffd875] font-black text-[10px]">Chat</span>
                            </button>
                        `;

                        card.addEventListener('click', () => {
                            activeWhisperTarget = f;
                            currentChannel = 'whisper';
                            showStream();
                            renderMessages();
                            playSound('chat');
                        });
                        list.appendChild(card);
                    });
                }

                function renderRecentTab() {
                    const list = body.querySelector('#chat-recent-list-container');
                    list.innerHTML = '';
                    friendsData.filter(f => chatDatabase.direct[f.id] || f.lastMsg).forEach(f => {
                        const card = document.createElement('div');
                        card.className = 'game-card-row p-2 flex items-center justify-between cursor-pointer';
                        const lastMsgSnippet = chatDatabase.direct[f.id] && chatDatabase.direct[f.id].length > 0
                            ? chatDatabase.direct[f.id][chatDatabase.direct[f.id].length - 1].text
                            : (f.lastMsg || 'Tap to chat');
                        card.innerHTML = `
                            <div class="flex items-center gap-2.5 min-w-0">
                                <img src="${f.avatar}" class="w-9 h-9 rounded-full border border-[#BC4526] object-cover flex-shrink-0">
                                <div class="flex flex-col text-left min-w-0">
                                    <span class="text-white text-xs font-black truncate">${f.name}</span>
                                    <span class="c-text-gold-80 text-[10px] truncate max-w-[180px]">${lastMsgSnippet}</span>
                                </div>
                            </div>
                            <div class="flex flex-col items-end flex-shrink-0">
                                <span class="text-white/50 text-[9px]">${f.lastTime || 'now'}</span>
                                <span class="text-[9px] bg-[#37AA49] text-black px-1.5 py-0.2 rounded-full font-black mt-1">Active</span>
                            </div>
                        `;
                        card.addEventListener('click', () => {
                            activeWhisperTarget = f;
                            currentChannel = 'whisper';
                            showStream();
                            renderMessages();
                            playSound('chat');
                        });
                        list.appendChild(card);
                    });
                }

                function renderBlockedTab() {
                    const list = body.querySelector('#chat-blocked-list-container');
                    list.innerHTML = '';
                    if (blockedUsersData.length === 0) {
                        list.innerHTML = `<span class="text-white/60 text-xs py-8 text-center font-bold">No blocked players in your list.</span>`;
                        return;
                    }
                    blockedUsersData.forEach(b => {
                        const card = document.createElement('div');
                        card.className = 'game-card-row p-2.5 flex items-center justify-between';
                        card.innerHTML = `
                            <div class="flex items-center gap-2.5">
                                <img src="${b.avatar}" class="w-9 h-9 rounded-full border border-red-700 object-cover filter grayscale">
                                <div class="flex flex-col text-left">
                                    <span class="text-white text-xs font-black">${b.name} <span class="text-red-400 text-[10px]">#${b.id}</span></span>
                                    <span class="text-red-300/80 text-[9px]">Reason: ${b.reason}</span>
                                    <span class="text-white/40 text-[8px]">Blocked: ${b.blockedDate}</span>
                                </div>
                            </div>
                            <button class="unblock-user-btn btn-wood-empty w-24">
                                <img src="img/Empty-button.png" class="btn-bg-art">
                                <span class="btn-inner-content text-[#37AA49] font-black text-[10px]">Unblock</span>
                            </button>
                        `;

                        card.querySelector('.unblock-user-btn').addEventListener('click', (e) => {
                            e.stopPropagation();
                            const idx = blockedUsersData.indexOf(b);
                            if (idx > -1) blockedUsersData.splice(idx, 1);
                            playSound('pop');
                            renderBlockedTab();
                            const bTab = body.querySelector('#chat-tab-blocked');
                            if (bTab) bTab.innerHTML = `<span>🚫</span> المحظورين (${blockedUsersData.length})`;
                        });

                        list.appendChild(card);
                    });
                }

                function showStream() {
                    streamSection.classList.remove('hidden');
                    friendsPanel.classList.add('hidden');
                    recentPanel.classList.add('hidden');
                    blockedPanel.classList.add('hidden');
                }

                tabs.forEach(t => {
                    t.addEventListener('click', () => {
                        tabs.forEach(tab => tab.classList.remove('active'));
                        t.classList.add('active');
                        const target = t.getAttribute('data-tab');

                        if (target === 'global') {
                            activeWhisperTarget = null;
                            currentChannel = 'global';
                            showStream();
                            renderMessages();
                        } else if (target === 'friends') {
                            streamSection.classList.add('hidden');
                            friendsPanel.classList.remove('hidden');
                            recentPanel.classList.add('hidden');
                            blockedPanel.classList.add('hidden');
                            renderFriendsTab();
                        } else if (target === 'recent') {
                            streamSection.classList.add('hidden');
                            friendsPanel.classList.add('hidden');
                            recentPanel.classList.remove('hidden');
                            blockedPanel.classList.add('hidden');
                            renderRecentTab();
                        } else if (target === 'blocked') {
                            streamSection.classList.add('hidden');
                            friendsPanel.classList.add('hidden');
                            recentPanel.classList.add('hidden');
                            blockedPanel.classList.remove('hidden');
                            renderBlockedTab();
                        }
                        playSound('click');
                    });
                });

                function sendMessage() {
                    const text = inp.value.trim();
                    if (!text) return;
                    const now = new Date();
                    const timeStr = `${String(now.getHours()).padStart(2, '0')}:${String(now.getMinutes()).padStart(2, '0')}`;
                    const newMsg = { sender: savedProfile.name, avatar: savedProfile.avatar, text: text, time: timeStr };

                    if (currentChannel === 'global') {
                        chatDatabase.global.push(newMsg);
                    } else if (activeWhisperTarget) {
                        if (!chatDatabase.direct[activeWhisperTarget.id]) chatDatabase.direct[activeWhisperTarget.id] = [];
                        chatDatabase.direct[activeWhisperTarget.id].push(newMsg);
                    }

                    inp.value = '';
                    playSound('chat');
                    renderMessages();
                }

                sendBtn.addEventListener('click', sendMessage);
                inp.addEventListener('keydown', (e) => { if (e.key === 'Enter') sendMessage(); });

                renderMessages();
            }
        },

        // ---------- 8. خزانة الملابس (Wardrobe) ----------
        wardrobe: {
            title: 'Wardrobe & Armory', icon: 'img/Wardrobe.png', size: 'size-lg',
            footer: { id: 'equip-wardrobe-btn', title: 'Equip Selected' },
            body: () => `
                <div class="flex items-center justify-between w-full bg-black/45 p-2 rounded-lg border c-border-primary mb-2 flex-shrink-0">
                    <div class="flex items-center gap-2">
                        <div class="w-12 h-12 relative flex items-center justify-center">
                            <img src="${savedProfile.avatar}" class="w-9 h-9 rounded-full object-cover">
                            <img src="img/frame.png" class="absolute inset-0 w-full h-full pointer-events-none">
                        </div>
                        <div class="flex flex-col text-left">
                            <span id="wardrobe-active-name" class="text-white text-xs font-black">Active: ${selectedOutfit.name}</span>
                            <span id="wardrobe-active-perk" class="text-[#37AA49] text-[10px] font-bold">${selectedOutfit.perk}</span>
                        </div>
                    </div>
                    <span class="text-[#FFD875] font-bold text-xs c-bg-burgundy px-2.5 py-1 rounded border c-border-primary">Custom Gear</span>
                </div>
                <div id="wardrobe-grid" class="w-full grid grid-cols-2 sm:grid-cols-3 gap-3 pr-1 items-start"></div>`,
            mount(body, inst) {
                const grid = body.querySelector('#wardrobe-grid');

                function renderWardrobeGrid() {
                    grid.innerHTML = '';
                    wardrobeData.forEach(item => {
                        const isEquipped = item.id === selectedOutfit.id;
                        const card = document.createElement('div');
                        card.className = `game-card-row p-2.5 flex flex-col items-center cursor-pointer transition-all ${isEquipped ? 'border-[#BC4526] bg-[#66180F]/70 ring-1 ring-amber-400' : ''}`;

                        card.innerHTML = `
                            ${renderItemSlotHTML(item, 'w-16 h-16 my-1')}
                            <span class="text-white text-xs font-black text-center truncate w-full">${item.name}</span>
                            <span class="text-[#37AA49] text-[9px] font-bold mt-0.5">${item.perk}</span>
                            <span class="text-[9px] font-black mt-1 px-3 py-0.5 rounded ${isEquipped ? 'bg-[#FFD875] text-black' : 'bg-black/60 text-[#FFD875]'}">
                                ${isEquipped ? 'Equipped' : 'Select'}
                            </span>`;

                        card.addEventListener('click', () => {
                            selectedOutfit = item;
                            body.querySelector('#wardrobe-active-name').textContent = `Active: ${item.name}`;
                            body.querySelector('#wardrobe-active-perk').textContent = item.perk;
                            renderWardrobeGrid();
                            playSound('equip');
                        });
                        grid.appendChild(card);
                    });
                }
                renderWardrobeGrid();

                inst.querySelector('#equip-wardrobe-btn').addEventListener('click', () => {
                    closeModal('wardrobe');
                    playSound('save');
                });
            }
        },

        // ---------- 9. قائمة الأصدقاء (Friends) ----------
        friends: {
            title: 'Friends List', icon: 'img/friend.png',
            footer: null,
            body: () => `
                <div class="w-full flex justify-center mb-1 px-2">
                    <div class="text-bg-box w-full max-w-[280px] h-[34px] px-3 flex items-center gap-2">
                        <span class="text-[#ffd875] text-xs">🔍</span>
                        <input id="friends-search-input" type="text" placeholder="Search friends by name / #ID..." class="w-full bg-transparent text-white font-game font-bold text-xs outline-none placeholder-amber-200/50">
                    </div>
                </div>
                <div id="friends-list-container" class="w-full flex flex-col items-center gap-1.5 pr-1 max-h-[360px] overflow-y-auto modal-scrollbar"></div>`,
            mount(body) {
                const list = body.querySelector('#friends-list-container');
                const search = body.querySelector('#friends-search-input');

                function renderFriends(query = '') {
                    list.innerHTML = '';
                    const q = query.toLowerCase().trim();
                    const filtered = friendsData.filter(f => f.name.toLowerCase().includes(q) || f.id.includes(q));

                    if (filtered.length === 0) {
                        list.innerHTML = `<span class="text-white/60 text-xs font-bold py-6">No friends found.</span>`;
                        return;
                    }

                    filtered.forEach(friend => {
                        const card = document.createElement('div');
                        card.className = 'game-card-row w-full max-w-[280px] flex items-center justify-between p-2 cursor-pointer flex-shrink-0';
                        card.innerHTML = `
                            <div class="flex items-center gap-2 min-w-0">
                                <img src="${friend.avatar}" class="w-9 h-9 rounded-full border border-[#BC4526] object-cover flex-shrink-0">
                                <div class="flex flex-col text-left min-w-0">
                                    <div class="flex items-center gap-1">
                                        <span class="text-white text-xs font-black drop-shadow truncate">${friend.name}</span>
                                        <span class="text-[9px] bg-yellow-400/90 text-black px-1 rounded font-black">👑 ${friend.passLvl}</span>
                                    </div>
                                    <span class="copyable-id text-[10px] font-black text-[#ffd875] hover:underline" data-id="${friend.id}">#${friend.id}</span>
                                </div>
                            </div>
                            <div class="flex items-center gap-2 flex-shrink-0">
                                <span class="text-[10px] font-bold ${friend.isOnline ? 'text-[#37AA49]' : 'text-gray-400'}">${friend.status}</span>
                                <img src="img/arrow-Menu.png" class="w-5 h-5 -rotate-90 opacity-80">
                            </div>`;
                        card.addEventListener('click', (e) => {
                            if (e.target.closest('.copyable-id')) return;
                            showUserDetail(friend);
                        });
                        list.appendChild(card);
                    });
                }
                renderFriends();
                search.addEventListener('input', (e) => renderFriends(e.target.value));
            }
        },

        // ---------- 10. بروفايل الأشخاص الآخرين (User Detail) ----------
        'user-detail': {
            title: 'Player Info', icon: 'img/friend.png', size: 'size-sm',
            footer: null,
            body: () => `
                <div class="flex items-center justify-center gap-3 w-full my-2">
                    <div class="w-20 h-20 relative flex justify-center items-center drop-shadow-lg flex-shrink-0">
                        <img id="detail-avatar-img" src="" class="w-[72%] h-[72%] rounded-full object-cover absolute">
                        <img src="img/frame.png" class="w-full h-full absolute inset-0 pointer-events-none">
                        <span id="detail-pass-badge" class="absolute -bottom-1 bg-yellow-400 text-black font-black text-[9px] px-1.5 rounded-full border border-black">👑 Pass Lvl 45</span>
                    </div>

                    <div id="stranger-actions-stack" class="flex flex-col gap-1.5">
                        <button id="stranger-chat-action-btn" class="btn-press flex items-center gap-1 c-bg-burgundy hover:bg-[#66180F] border border-[#BC4526]/70 text-[#ffd875] text-[10px] font-black px-2.5 py-1 rounded-md shadow" title="Chat with Player">
                            <span>💬</span> Chat
                        </button>
                        <button id="stranger-block-action-btn" class="btn-press flex items-center gap-1 bg-red-950/80 hover:bg-red-900 border border-red-500/70 text-red-300 text-[10px] font-black px-2.5 py-1 rounded-md shadow" title="Block Player">
                            <span id="block-action-icon">🚫</span> <span id="block-action-label">Block</span>
                        </button>
                        <button id="stranger-report-action-btn" class="btn-press flex items-center gap-1 bg-yellow-950/80 hover:bg-yellow-900 border border-yellow-500/70 text-yellow-300 text-[10px] font-black px-2.5 py-1 rounded-md shadow" title="Report Player">
                            <span>⚠️</span> Report
                        </button>
                    </div>
                </div>

                <span id="detail-player-name" class="text-white font-black text-base drop-shadow">Player</span>
                <span id="detail-player-id" class="copyable-id text-[#ffd875] text-xs font-black hover:underline cursor-pointer">ID: #000000</span>

                <div class="text-bg-box w-full max-w-[260px] flex justify-around items-center px-2 my-1">
                    <span id="detail-player-level" class="text-[#ffd875] text-xs font-bold">Lvl 30</span>
                    <span class="text-[#FFD875]">|</span>
                    <span id="detail-player-score" class="text-white text-xs font-bold">14,250 Score</span>
                </div>
                
                <div id="detail-action-container" class="w-full flex justify-center mt-2"></div>`
        },

        // ---------- 11. لوحة الترتيب العامة (Leaderboard) ----------
        rank: {
            title: 'Top 100 Leaderboard', icon: 'img/Rank.png',
            footer: null,
            body: () => `
                <div id="rank-list-scroll-area" class="w-full flex flex-col items-center gap-1.5 pr-1 max-h-[380px] overflow-y-auto modal-scrollbar"></div>
                <div class="pinned-user-rank-bar">
                    <div class="flex items-center gap-2">
                        <span class="text-lg">🏅</span>
                        <div class="flex flex-col text-left">
                            <div class="flex items-center gap-1">
                                <span class="text-[#ffd875] text-xs font-black">Your Rank: #42</span>
                                <span class="text-[9px] bg-yellow-400 text-black px-1 rounded font-black">👑 ${savedProfile.passLvl}</span>
                            </div>
                            <span class="text-white/80 text-[10px]">Division: Master League</span>
                        </div>
                    </div>
                    <div class="flex flex-col items-end">
                        <span class="text-white text-xs font-black">Score: 8,420</span>
                        <span class="text-[#37AA49] text-[9px] font-bold">Top 5%</span>
                    </div>
                </div>`,
            mount(body) {
                const list = body.querySelector('#rank-list-scroll-area');
                generatedTop100.forEach(player => {
                    const row = document.createElement('div');
                    row.className = 'game-card-row w-full max-w-[280px] flex items-center justify-between p-2 cursor-pointer flex-shrink-0';
                    row.innerHTML = `
                        <div class="flex items-center gap-2 min-w-0">
                            <span class="text-xs font-black w-6 text-center flex-shrink-0 ${player.rank <= 3 ? 'text-base' : 'text-[#ffd875]'}">${player.badge}</span>
                            <img src="${player.avatar}" class="w-8 h-8 rounded-full border border-[#BC4526] object-cover flex-shrink-0">
                            <div class="flex flex-col text-left min-w-0">
                                <div class="flex items-center gap-1">
                                    <span class="text-white text-xs font-black leading-tight truncate">${player.name}</span>
                                    <span class="text-[8px] bg-yellow-400 text-black px-1 rounded font-black">👑 ${player.passLvl}</span>
                                </div>
                                <span class="copyable-id text-[#ffd875] text-[10px] font-bold hover:underline" data-id="${player.id}">#${player.id}</span>
                            </div>
                        </div>
                        <div class="flex flex-col items-end flex-shrink-0">
                            <span class="text-white text-xs font-black">${player.score}</span>
                            <span class="text-[#37AA49] text-[9px] font-bold">Lvl ${player.level}</span>
                        </div>`;
                    row.addEventListener('click', (e) => {
                        if (e.target.closest('.copyable-id')) return;
                        showUserDetail(player);
                    });
                    list.appendChild(row);
                });
            }
        },

        // ---------- 12. صندوق البريد (Mailbox) ----------
        mailbox: {
            title: 'Notifications & Mail', icon: 'img/mail.png', size: 'size-lg',
            footer: null,
            body: () => `
                <div class="flex items-center justify-between w-full mb-2 flex-shrink-0 px-1">
                    <div class="flex gap-1.5">
                        <button class="wood-tab-btn active" data-tab="all">All</button>
                        <button class="wood-tab-btn" data-tab="gift">Gifts</button>
                        <button class="wood-tab-btn" data-tab="social">Social</button>
                    </div>
                    <button id="mail-claim-all-btn" class="btn-press text-[10px] font-black text-[#FFD875] c-bg-burgundy px-2.5 py-1 rounded border c-border-primary hover:border-[#BC4526]">Claim All</button>
                </div>
                <div id="mailbox-notifications-container" class="w-full flex flex-col gap-2 pr-1 max-h-[380px] overflow-y-auto modal-scrollbar"></div>`,
            mount(body) {
                const container = body.querySelector('#mailbox-notifications-container');
                const tabs = body.querySelectorAll('.wood-tab-btn');

                function renderNotifications(filter = 'all') {
                    container.innerHTML = '';
                    const filtered = notificationsList.filter(n => filter === 'all' || n.type === filter);

                    if (filtered.length === 0) {
                        container.innerHTML = `<span class="text-white/60 text-xs font-bold py-8 text-center">No notifications in this folder.</span>`;
                        return;
                    }

                    filtered.forEach(item => {
                        const row = document.createElement('div');
                        row.className = 'game-card-row p-2.5 flex items-center justify-between gap-2 flex-shrink-0';

                        let actionHTML = '';
                        if (item.reward) {
                            actionHTML = `
                                <div class="flex items-center gap-2 flex-shrink-0">
                                    ${renderItemSlotHTML({ rarity: 'epic', graphic: item.reward.type === 'gold' ? 'img/Coin.png' : 'img/Diamond.png' }, 'w-11 h-11')}
                                    <button class="claim-notif-btn btn-wood-empty w-24 ${item.reward.claimed ? 'opacity-50 pointer-events-none' : ''}">
                                        <img src="img/Empty-button.png" class="btn-bg-art">
                                        <span class="btn-inner-content text-white font-black text-[10px]">${item.reward.claimed ? 'Claimed' : 'Claim'}</span>
                                    </button>
                                </div>
                            `;
                        } else if (item.senderId) {
                            actionHTML = `
                                <button class="accept-notif-friend-btn btn-wood-empty w-24 ${item.accepted ? 'opacity-50 pointer-events-none' : ''}">
                                    <img src="img/Empty-button.png" class="btn-bg-art">
                                    <span class="btn-inner-content text-white font-black text-[10px]">${item.accepted ? 'Accepted' : 'Accept'}</span>
                                </button>
                            `;
                        }

                        row.innerHTML = `
                            <div class="flex flex-col text-left min-w-0">
                                <div class="flex items-center gap-2">
                                    <span class="text-[#ffd875] text-xs font-black truncate">${item.title}</span>
                                    <span class="text-white/50 text-[9px]">${item.time}</span>
                                </div>
                                <span class="text-white/80 text-[10px] mt-0.5 leading-snug">${item.text}</span>
                            </div>
                            ${actionHTML}
                        `;

                        const claimBtn = row.querySelector('.claim-notif-btn');
                        if (claimBtn) {
                            claimBtn.addEventListener('click', () => {
                                if (item.reward.claimed) return;
                                item.reward.claimed = true;
                                if (item.reward.type === 'gold') currentGold += item.reward.amount;
                                else currentGems += item.reward.amount;
                                updateCurrenciesDisplay();
                                playSound('reward');
                                renderNotifications(filter);
                            });
                        }

                        const acceptBtn = row.querySelector('.accept-notif-friend-btn');
                        if (acceptBtn) {
                            acceptBtn.addEventListener('click', () => {
                                item.accepted = true;
                                playSound('save');
                                renderNotifications(filter);
                            });
                        }

                        container.appendChild(row);
                    });
                }

                tabs.forEach(t => {
                    t.addEventListener('click', () => {
                        tabs.forEach(tab => tab.classList.remove('active'));
                        t.classList.add('active');
                        renderNotifications(t.getAttribute('data-tab'));
                    });
                });

                body.querySelector('#mail-claim-all-btn').addEventListener('click', () => {
                    notificationsList.forEach(n => {
                        if (n.reward && !n.reward.claimed) {
                            n.reward.claimed = true;
                            if (n.reward.type === 'gold') currentGold += n.reward.amount;
                            else currentGems += n.reward.amount;
                        }
                    });
                    updateCurrenciesDisplay();
                    renderNotifications('all');
                    playSound('reward');
                });

                renderNotifications('all');
            }
        },

        // ---------- 13. المتجر (Shop) ----------
        shop: {
            title: 'Gold & Gem Store', icon: 'img/Rank.png', size: 'size-lg',
            footer: null,
            body: () => `
                <div class="flex gap-2 mb-2 flex-shrink-0">
                    <button class="wood-tab-btn active" data-shop="currency">Coins & Gems</button>
                    <button class="wood-tab-btn" data-shop="packs">Special Bundles</button>
                </div>
                <div id="shop-items-container" class="w-full grid grid-cols-2 sm:grid-cols-3 gap-3 pr-1"></div>`,
            mount(body) {
                const container = body.querySelector('#shop-items-container');
                const tabs = body.querySelectorAll('.wood-tab-btn');

                const shopItems = [
                    { name: 'Pouch of Gold', amount: '5,000 Coins', icon: 'img/Coin.png', price: '$0.99', type: 'currency', goldAdd: 5000, gemAdd: 0, rarity: 'common' },
                    { name: 'Chest of Gold', amount: '25,000 Coins', icon: 'img/Coin.png', price: '$4.99', type: 'currency', goldAdd: 25000, gemAdd: 0, rarity: 'rare' },
                    { name: 'Sack of Gems', amount: '200 Gems', icon: 'img/Diamond.png', price: '$1.99', type: 'currency', goldAdd: 0, gemAdd: 200, rarity: 'rare' },
                    { name: 'Vault of Gems', amount: '1,200 Gems', icon: 'img/Diamond.png', price: '$9.99', type: 'currency', goldAdd: 0, gemAdd: 1200, rarity: 'epic' },
                    { name: 'Warrior Pack', amount: '10K Gold + 100 Gems', graphic: sampleItemIcons.sword, price: '$2.99', type: 'packs', goldAdd: 10000, gemAdd: 100, rarity: 'epic' },
                    { name: 'Dragon Bundle', amount: '50K Gold + 500 Gems', graphic: sampleItemIcons.chest, price: '$14.99', type: 'packs', goldAdd: 50000, gemAdd: 500, rarity: 'legendary' }
                ];

                function renderShop(filter = 'currency') {
                    container.innerHTML = '';
                    const filtered = shopItems.filter(i => i.type === filter);

                    filtered.forEach(item => {
                        const card = document.createElement('div');
                        card.className = 'game-card-row p-2.5 flex flex-col items-center cursor-pointer';
                        card.innerHTML = `
                            ${renderItemSlotHTML(item, 'w-14 h-14 my-1')}
                            <span class="text-white text-xs font-black text-center mt-1 truncate w-full">${item.name}</span>
                            <span class="text-[#ffd875] text-[10px] font-bold text-center">${item.amount}</span>
                            <button class="buy-shop-item-btn btn-wood-empty w-24 mt-2">
                                <img src="img/Empty-button.png" class="btn-bg-art">
                                <span class="btn-inner-content text-white font-black text-xs">${item.price}</span>
                            </button>
                        `;

                        card.querySelector('.buy-shop-item-btn').addEventListener('click', () => {
                            currentGold += item.goldAdd;
                            currentGems += item.gemAdd;
                            updateCurrenciesDisplay();
                            playSound('reward');
                        });

                        container.appendChild(card);
                    });
                }

                tabs.forEach(tab => {
                    tab.addEventListener('click', () => {
                        tabs.forEach(t => t.classList.remove('active'));
                        tab.classList.add('active');
                        renderShop(tab.getAttribute('data-shop'));
                    });
                });

                renderShop('currency');
            }
        },

        // ---------- 14. المهام اليومية والأسبوعية (Daily & Weekly Tasks) ----------
        'daily-quests': {
            title: t('events.dailyQuestsTitle'), icon: 'img/Task.png', size: 'size-lg',
            footer: null,
            body: () => `
                <div class="w-full flex flex-col gap-2">
                    <!-- التبويبات والعداد التنازلي -->
                    <div class="w-full flex items-center justify-between bg-black/60 p-2 rounded-xl border c-border-primary">
                        <div class="flex items-center gap-2">
                            <button id="tab-quests-daily-btn" class="wood-tab-btn active cursor-pointer">📅 ${t('quests.tabs.daily')}</button>
                            <button id="tab-quests-weekly-btn" class="wood-tab-btn cursor-pointer">🏆 ${t('quests.tabs.weekly')}</button>
                        </div>
                        <button id="quests-claim-all-btn" class="btn-compact-wood !py-1 !px-3 text-yellow-300">
                            <span>✨</span> ${t('quests.claimAll')}
                        </button>
                    </div>

                    <div class="flex items-center justify-between px-1 text-[10px] c-text-gold-80">
                        <span id="quests-timer-text"></span>
                        <span class="text-white/60">${t('quests.hint')}</span>
                    </div>

                    <!-- قائمة المهام -->
                    <div id="quests-list-container" class="w-full flex flex-col gap-2 pr-1 max-h-[350px] overflow-y-auto modal-scrollbar"></div>
                </div>`,
            mount(body) {
                const list = body.querySelector('#quests-list-container');
                const timerText = body.querySelector('#quests-timer-text');
                const dailyTab = body.querySelector('#tab-quests-daily-btn');
                const weeklyTab = body.querySelector('#tab-quests-weekly-btn');
                const claimAllBtn = body.querySelector('#quests-claim-all-btn');

                let currentTab = 'daily';

                const questsData = {
                    daily: getDailyQuests('daily'),
                    weekly: getDailyQuests('weekly')
                };

                function renderQuests() {
                    list.innerHTML = '';
                    const activeQuests = questsData[currentTab];
                    timerText.textContent = currentTab === 'daily' ? t('quests.dailyRefresh') : t('quests.weeklyRefresh');

                    activeQuests.forEach(q => {
                        const isReady = q.progress >= q.max && !q.claimed;
                        const row = document.createElement('div');
                        row.className = 'game-card-row p-2.5 flex items-center justify-between gap-2';

                        row.innerHTML = `
                            <div class="flex flex-col text-left min-w-0 pr-2">
                                <div class="flex items-center gap-1.5 flex-wrap">
                                    <span class="text-[#ffd875] text-xs font-black truncate">${t(q.titleKey)}:</span>
                                    <span class="text-white text-xs font-bold truncate">${t(q.descKey)}</span>
                                </div>
                                <span class="c-text-gold-70 text-[9.5px] mt-0.5 leading-tight">💡 ${t(q.guideKey)}</span>
                                <div class="flex items-center gap-2 mt-1.5 flex-wrap">
                                    <div class="w-32 h-2.5 bg-black/70 rounded-full overflow-hidden border border-[#BC4526]">
                                        <div class="bg-gradient-to-r from-amber-500 to-yellow-400 h-full transition-all duration-300" style="width: ${Math.min(100, (q.progress / q.max) * 100)}%"></div>
                                    </div>
                                    <span class="text-[#ffd875] text-[10px] font-black">${q.progress}/${q.max}</span>
                                    <div class="flex items-center gap-2 ml-2">
                                        <span class="text-white text-[10px] font-bold flex items-center gap-0.5"><img src="img/Coin.png" class="w-3.5 h-3.5">+${q.rewardGold}</span>
                                        <span class="text-white text-[10px] font-bold flex items-center gap-0.5"><img src="img/Diamond.png" class="w-3.5 h-3.5">+${q.rewardGems}</span>
                                    </div>
                                </div>
                            </div>
                            <button class="quest-claim-btn btn-compact-wood !py-1 !px-3 text-[10px] flex-shrink-0 ${!isReady ? 'opacity-50 pointer-events-none' : ''}" data-id="${q.id}">
                                <span>${q.claimed ? '✓ ' + t('ui.claimed') : (isReady ? '🎁 ' + t('ui.claim') : t('ui.pending'))}</span>
                            </button>
                        `;

                        const btn = row.querySelector('.quest-claim-btn');
                        if (isReady) {
                            btn.addEventListener('click', () => {
                                q.claimed = true;
                                currentGold += q.rewardGold;
                                currentGems += q.rewardGems;
                                updateCurrenciesDisplay();
                                playSound('reward');
                                renderQuests();
                            });
                        }

                        list.appendChild(row);
                    });
                }

                dailyTab.addEventListener('click', () => {
                    currentTab = 'daily';
                    dailyTab.classList.add('active');
                    weeklyTab.classList.remove('active');
                    playSound('click');
                    renderQuests();
                });

                weeklyTab.addEventListener('click', () => {
                    currentTab = 'weekly';
                    weeklyTab.classList.add('active');
                    dailyTab.classList.remove('active');
                    playSound('click');
                    renderQuests();
                });

                claimAllBtn.addEventListener('click', () => {
                    let totalGold = 0, totalGems = 0;
                    questsData[currentTab].forEach(q => {
                        if (q.progress >= q.max && !q.claimed) {
                            q.claimed = true;
                            totalGold += q.rewardGold;
                            totalGems += q.rewardGems;
                        }
                    });
                    if (totalGold > 0 || totalGems > 0) {
                        currentGold += totalGold;
                        currentGems += totalGems;
                        updateCurrenciesDisplay();
                        playSound('reward');
                        renderQuests();
                    }
                });

                renderQuests();
            }
        },

        // ---------- 15. أنماط المعركة (Battle Modes) ----------
        'play-modes': {
            title: 'Select Battle Mode', size: 'size-sm',
            footer: null,
            body: () => `
                <div class="w-full flex flex-col items-center gap-2.5 py-1">
                    <button class="play-mode-choice-btn btn-wood-empty w-full max-w-[280px]" data-mode="classic">
                        <img src="img/Empty-button.png" class="btn-bg-art">
                        <div class="btn-inner-content">
                            <span class="text-[#ffd875] text-sm font-black uppercase tracking-wider">⚔️ Classic Arena</span>
                            <span class="text-white/90 text-[10px] font-bold">1v1 PvP Matchmaking</span>
                        </div>
                    </button>
                    <button class="play-mode-choice-btn btn-wood-empty w-full max-w-[280px]" data-mode="endless">
                        <img src="img/Empty-button.png" class="btn-bg-art">
                        <div class="btn-inner-content">
                            <span class="text-[#ffd875] text-sm font-black uppercase tracking-wider">🔥 Survival Run</span>
                            <span class="text-white/90 text-[10px] font-bold">Endless Monster Waves</span>
                        </div>
                    </button>
                </div>`,
            mount(body) {
                body.querySelectorAll('.play-mode-choice-btn').forEach(btn => {
                    btn.addEventListener('click', () => {
                        closeModal('play-modes');
                        startMatchmaking();
                    });
                });
            }
        },

        // ---------- 16. محاكاة البحث عن لاعبين (Matchmaking) ----------
        matchmaking: {
            title: 'Matchmaking', size: 'size-sm',
            body: () => `
                <span class="text-white font-extrabold text-sm tracking-wider drop-shadow uppercase">Searching Players...</span>
                <span id="matchmaking-timer" class="text-[#ffd875] text-xs font-black">00:00</span>
                <div class="grid grid-cols-4 gap-2 w-full max-w-[280px] my-2">
                    <div class="flex flex-col items-center">
                        <div class="w-12 h-12 rounded-full border-2 border-[#37AA49] overflow-hidden">
                            <img src="${savedProfile.avatar}" class="w-full h-full object-cover">
                        </div>
                        <span class="text-[#37AA49] text-[9px] font-bold mt-1">You</span>
                    </div>
                    ${[2, 3, 4].map(i => `
                    <div class="flex flex-col items-center">
                        <div id="slot-${i}-avatar" class="w-12 h-12 rounded-full border-2 border-dashed border-[#BC4526] bg-black/40 flex items-center justify-center animate-pulse">
                            <span class="text-[#FFD875] text-xs font-bold">?</span>
                        </div>
                        <span id="slot-${i}-name" class="text-white/60 text-[9px] font-bold mt-1">Waiting</span>
                    </div>`).join('')}
                </div>
                <button id="cancel-matchmaking-btn" class="btn-wood-empty w-32">
                    <img src="img/Empty-button.png" class="btn-bg-art">
                    <span class="btn-inner-content text-red-400 font-black text-xs">Cancel</span>
                </button>`,
            mount(body, inst) {
                inst.querySelector('#cancel-matchmaking-btn').addEventListener('click', () => {
                    clearInterval(matchmakingInterval);
                    closeModal('matchmaking');
                });
            }
        },

        // ---------- 17. نافذة الإبلاغ (Report) ----------
        report: {
            title: 'Report Player', size: 'size-sm',
            footer: { id: 'confirm-report-btn', title: 'Send Report' },
            body: () => `
                <span class="text-white/90 text-xs font-bold text-center px-2">Select a reason to report this player to Game Masters:</span>
                <div class="flex flex-col gap-1.5 w-full max-w-[260px] my-2">
                    <label class="game-card-row p-2 flex items-center gap-2 cursor-pointer">
                        <input type="radio" name="report_reason" value="toxic" checked class="accent-amber-500">
                        <span class="text-white text-xs font-bold">Toxic Behavior / Harassment</span>
                    </label>
                    <label class="game-card-row p-2 flex items-center gap-2 cursor-pointer">
                        <input type="radio" name="report_reason" value="cheating" class="accent-amber-500">
                        <span class="text-white text-xs font-bold">Cheating or Exploits</span>
                    </label>
                    <label class="game-card-row p-2 flex items-center gap-2 cursor-pointer">
                        <input type="radio" name="report_reason" value="afk" class="accent-amber-500">
                        <span class="text-white text-xs font-bold">AFK / Intentional Loss</span>
                    </label>
                </div>`,
            mount(body, inst) {
                inst.querySelector('#confirm-report-btn').addEventListener('click', () => {
                    playSound('alert');
                    closeModal('report');
                });
            }
        },

        // ---------- 18. تأكيد الخروج (Exit) ----------
        exit: {
            title: 'Quit Game?', size: 'size-sm',
            body: () => `
                <span class="text-white/90 text-xs font-bold text-center px-4 leading-relaxed">Are you sure you want to return to desktop?</span>
                <div class="flex gap-2.5 mt-3">
                    <button id="cancel-exit-btn" class="btn-wood-empty w-24">
                        <img src="img/Empty-button.png" class="btn-bg-art">
                        <span class="btn-inner-content text-[#ffd875] font-black text-xs">Stay</span>
                    </button>
                    <button id="confirm-exit-btn" class="btn-wood-empty w-24">
                        <img src="img/Empty-button.png" class="btn-bg-art">
                        <span class="btn-inner-content text-red-400 font-black text-xs">Exit</span>
                    </button>
                </div>`,
            mount(body, inst) {
                inst.querySelector('#cancel-exit-btn').addEventListener('click', () => closeModal('exit'));
                inst.querySelector('#confirm-exit-btn').addEventListener('click', () => closeModal('exit'));
            }
        }
    };

    // =======================================================
    // 8. عرض بروفايل اللاعبين وتفعيل أدوات الشات، الحظر، والإبلاغ
    // =======================================================
    function showUserDetail(player) {
        if (!player) return;
        openModal('user-detail');
        const inst = modalInstances.get('user-detail');
        const body = inst.querySelector('.wood-modal-body');

        body.querySelector('#detail-avatar-img').src = player.avatar;
        body.querySelector('#detail-player-name').textContent = player.name;
        const idEl = body.querySelector('#detail-player-id');
        idEl.textContent = `ID: #${player.id}`;
        idEl.setAttribute('data-id', player.id);
        body.querySelector('#detail-player-level').textContent = `Lvl ${player.level}`;
        body.querySelector('#detail-player-score').textContent = `${player.score} Score`;
        body.querySelector('#detail-pass-badge').textContent = `👑 Pass Lvl ${player.passLvl}`;

        const strangerChatBtn = body.querySelector('#stranger-chat-action-btn');
        strangerChatBtn.onclick = () => {
            activeWhisperTarget = player;
            closeModal('user-detail');
            openModal('chat');
        };

        const strangerBlockBtn = body.querySelector('#stranger-block-action-btn');
        const blockLabel = body.querySelector('#block-action-label');
        blockLabel.textContent = player.isBlocked ? 'Unblock' : 'Block';
        strangerBlockBtn.onclick = () => {
            player.isBlocked = !player.isBlocked;
            blockLabel.textContent = player.isBlocked ? 'Unblock' : 'Block';
            playSound(player.isBlocked ? 'alert' : 'pop');
            if (player.isBlocked && !blockedUsersData.some(b => b.id === player.id)) {
                blockedUsersData.push({
                    id: player.id, name: player.name, level: player.level,
                    reason: 'Blocked via Profile', blockedDate: 'Today', avatar: player.avatar
                });
            }
        };

        const strangerReportBtn = body.querySelector('#stranger-report-action-btn');
        strangerReportBtn.onclick = () => {
            openModal('report');
        };

        const actionContainer = body.querySelector('#detail-action-container');
        actionContainer.innerHTML = '';

        if (!player.isFriend) {
            const addBtn = document.createElement('button');
            addBtn.className = 'btn-wood-empty w-36';
            addBtn.innerHTML = `
                <img src="img/Empty-button.png" class="btn-bg-art">
                <span class="btn-inner-content text-white font-black text-xs">+ Add Friend</span>
            `;
            addBtn.addEventListener('click', () => {
                player.isFriend = true;
                friendsData.push({
                    name: player.name, id: player.id, level: player.level, passLvl: player.passLvl,
                    score: player.score, status: 'Online', isOnline: true, isFriend: true, isBlocked: false, avatar: player.avatar
                });
                addBtn.style.opacity = '0.5';
                addBtn.style.pointerEvents = 'none';
                addBtn.querySelector('.btn-inner-content').textContent = 'Request Sent';
                playSound('save');
            });
            actionContainer.appendChild(addBtn);
        } else {
            const inviteBtn = document.createElement('button');
            inviteBtn.className = 'btn-wood-empty w-36';
            inviteBtn.innerHTML = `
                <img src="img/Empty-button.png" class="btn-bg-art">
                <span class="btn-inner-content text-[#37AA49] font-black text-xs">Invite Match</span>
            `;
            inviteBtn.addEventListener('click', () => {
                playSound('save');
                closeModal('user-detail');
            });
            actionContainer.appendChild(inviteBtn);
        }
    }

    // =======================================================
    // 9. محاكي البحث عن لاعبين (Matchmaking Simulation)
    // =======================================================
    let matchmakingInterval = null;
    let matchSeconds = 0;

    function startMatchmaking() {
        openModal('matchmaking');
        const inst = modalInstances.get('matchmaking');
        const timer = inst.querySelector('#matchmaking-timer');
        matchSeconds = 0;
        timer.textContent = '00:00';

        const fillSlot = (i, avatar, name, sound) => {
            const a = inst.querySelector(`#slot-${i}-avatar`);
            const n = inst.querySelector(`#slot-${i}-name`);
            if (a) a.innerHTML = `<img src="${avatar}" class="w-full h-full object-cover">`;
            if (n) n.textContent = name;
            playSound(sound);
        };

        setTimeout(() => fillSlot(2, availableAvatars[1], 'CyberSamurai', 'pop'), 1200);
        setTimeout(() => fillSlot(3, availableAvatars[2], 'SarahConnor', 'pop'), 2400);
        setTimeout(() => fillSlot(4, availableAvatars[3], 'DragonSlayer', 'save'), 3500);

        clearInterval(matchmakingInterval);
        matchmakingInterval = setInterval(() => {
            matchSeconds++;
            const mm = String(Math.floor(matchSeconds / 60)).padStart(2, '0');
            const ss = String(matchSeconds % 60).padStart(2, '0');
            if (inst.classList.contains('active')) timer.textContent = `${mm}:${ss}`;
        }, 1000);
    }

    // =======================================================
    // 10. ربط جميع أزرار الواجهة بالمعرفات الفريدة (DOM Binding)
    // =======================================================
    document.getElementById('open-settings-btn')?.addEventListener('click', (e) => { createRipple(e, e.currentTarget); openModal('settings'); });
    document.getElementById('profile-section-wrapper')?.addEventListener('click', (e) => { createRipple(e, e.currentTarget); openFullPage('profile'); });
    // friends-nav-btn merged into chat fullpage — no standalone button
    document.getElementById('wardrobe-nav-btn')?.addEventListener('click', (e) => { createRipple(e, e.currentTarget); openFullPage('wardrobe'); });
    // inventory-nav-btn removed from HTML — handled via wardrobe bag tab
    document.getElementById('rank-nav-btn')?.addEventListener('click', (e) => { createRipple(e, e.currentTarget); openModal('rank'); });
    document.getElementById('play-action-btn')?.addEventListener('click', (e) => { createRipple(e, e.currentTarget); openModal('play-modes'); });
    document.getElementById('mail-nav-btn')?.addEventListener('click', (e) => { createRipple(e, e.currentTarget); openModal('mailbox'); });
    document.getElementById('shop-nav-btn')?.addEventListener('click', (e) => { createRipple(e, e.currentTarget); openFullPage('shop'); });
    document.getElementById('gold-hud-pill')?.addEventListener('click', (e) => { createRipple(e, e.currentTarget); openFullPage('shop'); });
    document.getElementById('gems-hud-pill')?.addEventListener('click', (e) => { createRipple(e, e.currentTarget); openFullPage('shop'); });
    document.getElementById('daily-chest-btn')?.addEventListener('click', (e) => { createRipple(e, e.currentTarget); openModal('daily-rewards'); });
    document.getElementById('daily-quests-btn')?.addEventListener('click', (e) => { createRipple(e, e.currentTarget); openModal('daily-quests'); });
    document.getElementById('royal-pass-btn')?.addEventListener('click', (e) => { createRipple(e, e.currentTarget); openModal('royal-pass'); });
    document.getElementById('create-room-action-btn')?.addEventListener('click', (e) => { createRipple(e, e.currentTarget); openModal('create-room'); });
    const exitBtn = document.getElementById('exit-action-btn');
    if (exitBtn) exitBtn.addEventListener('click', (e) => { createRipple(e, e.currentTarget); openModal('exit'); });

    // ربط محدد السيرفر والقائمة المنسدلة (Server Selector)
    const serverBtn = document.getElementById('server-selector-btn');
    const serverMenu = document.getElementById('server-dropdown-menu');
    const activeServerName = document.getElementById('active-server-name');
    const activeServerPing = document.getElementById('active-server-ping');
    const activeServerDot = document.getElementById('active-server-status-dot');

    if (serverBtn && serverMenu) {
        serverBtn.addEventListener('click', (e) => {
            e.stopPropagation();
            serverMenu.classList.toggle('hidden');
            playSound('click');
        });

        document.querySelectorAll('.server-option-btn').forEach(btn => {
            btn.addEventListener('click', (e) => {
                e.stopPropagation();
                const serverId = btn.getAttribute('data-server-id');
                const serverDef = uiRegistry?.serverOptions?.find(s => s.id === serverId);
                const sName = serverDef ? t(serverDef.nameKey) : btn.getAttribute('data-server');
                const sPing = btn.getAttribute('data-ping');
                const sStatus = btn.getAttribute('data-status');

                if (activeServerName) activeServerName.textContent = sName;
                if (activeServerPing) {
                    activeServerPing.textContent = sPing;
                    activeServerPing.className = sStatus === 'emerald' 
                        ? 'text-[9px] font-black text-[#37AA49] c-bg-burgundy px-1 rounded border c-border-green flex-shrink-0'
                        : 'text-[9px] font-black text-[#FFD875] c-bg-burgundy px-1 rounded border c-border-primary flex-shrink-0';
                }
                if (activeServerDot) {
                    activeServerDot.className = sStatus === 'emerald'
                        ? 'w-2 h-2 rounded-full bg-[#37AA49] animate-pulse flex-shrink-0'
                        : 'w-2 h-2 rounded-full bg-[#FFD875] animate-pulse flex-shrink-0';
                }
                serverMenu.classList.add('hidden');
                playSound('save');
            });
        });

        document.addEventListener('click', (e) => {
            if (!serverMenu.contains(e.target) && e.target !== serverBtn) {
                serverMenu.classList.add('hidden');
            }
        });
    }

    // محاكاة حية طفيفة لأعداد اللاعبين والغرف النشطة عبر السيرفرات
    const playersEl = document.getElementById('server-players-count');
    const roomsEl = document.getElementById('server-rooms-count');
    if (playersEl && roomsEl) {
        setInterval(() => {
            const currentP = parseInt(playersEl.textContent.replace(/,/g, '')) || 4820;
            const deltaP = Math.floor(Math.random() * 5) - 2;
            const newP = Math.max(4700, Math.min(5200, currentP + deltaP));
            playersEl.textContent = newP.toLocaleString();

            const currentR = parseInt(roomsEl.textContent) || 340;
            const deltaR = Math.floor(Math.random() * 3) - 1;
            const newR = Math.max(320, Math.min(390, currentR + deltaR));
            roomsEl.textContent = String(newR);
        }, 6000);
    }

    document.getElementById('chat-toggle-btn')?.addEventListener('click', (e) => {
        createRipple(e, e.currentTarget);
        activeWhisperTarget = null;
        const isDesktop = window.innerWidth >= 1024;
        if (isDesktop) {
            const popup = document.getElementById('desktop-chat-popup-sidebar');
            if (popup) {
                playSound('chat');
                popup.classList.toggle('hidden');
                return;
            }
        }
        if (typeof openFullPage === 'function') openFullPage('chat');
        else openModal('chat');
    });

    // تبويبات عمودية في الشريط الجانبي لسطح المكتب
    const popupTabBtns = document.querySelectorAll('#desktop-popup-vertical-tabs .desktop-popup-tab-item');
    
    function renderDesktopPopupTab(targetView) {
        if (targetView === 'friends') {
            const container = document.getElementById('desktop-popup-view-friends');
            if (container) {
                container.innerHTML = friendsData.map(f => `
                    <div class="flex items-center justify-between p-2 rounded-xl bg-black/60 border c-border-primary hover:c-border-gold transition-all cursor-pointer group">
                        <div class="flex items-center gap-2">
                            <div class="relative">
                                <img src="${f.avatar}" class="w-8 h-8 rounded-full border border-[#BC4526] object-cover">
                                <span class="absolute bottom-0 right-0 w-2.5 h-2.5 rounded-full ${f.isOnline ? (f.status === 'In Game' ? 'bg-[#FFD875]' : 'bg-[#37AA49]') : 'bg-white/40'} border-2 border-black"></span>
                            </div>
                            <div class="flex flex-col">
                                <span class="text-xs font-black text-white group-hover:text-[#FFD875] transition-colors">${f.name}</span>
                                <span class="text-[9px] ${f.isOnline ? 'text-[#37AA49]' : 'text-white/40'} font-bold">${f.status} · Lvl.${f.level}</span>
                            </div>
                        </div>
                        <button class="px-2.5 py-1 rounded-lg bg-[#BC4526] hover:bg-[#7E2025] text-white text-[10px] font-black cursor-pointer transition-colors shadow">
                            <i class="fa-solid fa-comment-dots mr-1"></i>همسة
                        </button>
                    </div>
                `).join('');
            }
        } else if (targetView === 'recent') {
            const container = document.getElementById('desktop-popup-view-recent');
            if (container) {
                container.innerHTML = friendsData.slice(0, 4).map(f => `
                    <div class="flex items-center justify-between p-2 rounded-xl bg-black/60 border c-border-primary hover:c-border-gold transition-all cursor-pointer">
                        <div class="flex items-center gap-2 min-w-0">
                            <img src="${f.avatar}" class="w-8 h-8 rounded-full border border-[#BC4526] object-cover flex-shrink-0">
                            <div class="flex flex-col min-w-0">
                                <span class="text-xs font-black text-white truncate">${f.name}</span>
                                <span class="text-[9.5px] c-text-gold-80 truncate">${f.lastMsg || 'مرحباً بك!'}</span>
                            </div>
                        </div>
                        <span class="text-[8px] text-white/50 flex-shrink-0">${f.lastTime || 'now'}</span>
                    </div>
                `).join('');
            }
        } else if (targetView === 'blocked') {
            const container = document.getElementById('desktop-popup-view-blocked');
            if (container) {
                container.innerHTML = blockedUsersData.map(b => `
                    <div class="flex items-center justify-between p-2 rounded-xl bg-black/60 border border-[#7E2025]/50">
                        <div class="flex items-center gap-2">
                            <img src="${b.avatar}" class="w-8 h-8 rounded-full border border-[#7E2025] object-cover grayscale">
                            <div class="flex flex-col">
                                <span class="text-xs font-black text-white/70 line-through">${b.name}</span>
                                <span class="text-[8.5px] text-[#BC4526]">${b.reason}</span>
                            </div>
                        </div>
                        <button class="px-2 py-1 rounded-lg bg-[#37AA49] hover:bg-[#37AA49]/80 text-white text-[9px] font-black cursor-pointer">
                            فك الحظر
                        </button>
                    </div>
                `).join('');
            }
        }
    }

    popupTabBtns.forEach(btn => {
        btn.addEventListener('click', () => {
            popupTabBtns.forEach(b => {
                b.classList.remove('active', 'text-[#FFD875]', 'bg-[#7E2025]', 'shadow');
                b.classList.add('text-white/70');
            });
            btn.classList.remove('text-white/70');
            btn.classList.add('active', 'text-[#FFD875]', 'bg-[#7E2025]', 'shadow');

            const targetView = btn.getAttribute('data-tab');
            document.querySelectorAll('.desktop-popup-subview').forEach(v => v.classList.add('hidden'));
            const activeView = document.getElementById(`desktop-popup-view-${targetView}`);
            if (activeView) activeView.classList.remove('hidden');

            renderDesktopPopupTab(targetView);
            playSound('click');
        });
    });

    // زر تكبير الدردشة للشاشة الكاملة
    document.getElementById('expand-chat-to-fullpage')?.addEventListener('click', () => {
        document.getElementById('desktop-chat-popup-sidebar')?.classList.add('hidden');
        if (typeof openFullPage === 'function') openFullPage('chat');
        else openModal('chat');
    });

    // زر إغلاق الشريط الجانبي
    document.getElementById('close-desktop-chat-popup-btn')?.addEventListener('click', () => {
        playSound('close');
        document.getElementById('desktop-chat-popup-sidebar')?.classList.add('hidden');
    });

    // التهيئة الابتدائية للصوت
    setAudioSettings(savedSettings);
});