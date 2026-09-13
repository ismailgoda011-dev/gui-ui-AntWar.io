// =======================================================
// loader.js — Resilient image preloader & diagnostics
// =======================================================

const ASSETS_TO_PRELOAD = [
    'bg0.png', 'bg5.png', 'box.png', 'box-big.png', 'box-big-Brother.png',
    'box-white.png', 'box-white-brother.png', 'frame.png', 'frame-item.png',
    'ant1.png', 'ant2.png', 'beetle.png', 'Play.png', 'Create Room.png',
    'Empty-button.png', 'X.png', 'Coin.png', 'Diamond.png', 'bag.png',
    'shop.png', 'mail.png', 'Rank.png', 'Wardrobe.png', 'friend.png',
    'Settings.png', 'Chat.png', 'Daily-Gifts.png', 'Task.png', 'RoyalPass.png',
    'enable.png', 'disabled.png', 'arrow-Menu.png', 'option-Menu.png',
    'Text BackgroundBox.png', 'namePalyer.png', 'topbar-box.png', 'Save.png', 'Exit.png'
].map(name => `img/${name}`);

export function getPreloadAssets() {
    return [...ASSETS_TO_PRELOAD];
}

export async function startPreloader(onComplete) {
    const screen = document.getElementById('loading-screen');
    const bar = document.getElementById('loading-progress-bar');
    const percentText = document.getElementById('loading-percent-text');
    const counterText = document.getElementById('loading-assets-counter');

    if (!screen) {
        onComplete?.({ loaded: 0, failed: [], total: 0 });
        return;
    }

    const total = ASSETS_TO_PRELOAD.length;
    let loaded = 0;
    const failed = [];

    const updateUI = () => {
        const pct = total ? Math.round((loaded / total) * 100) : 100;
        if (bar) bar.style.width = `${pct}%`;
        if (percentText) percentText.textContent = `${pct}%`;
        if (counterText) counterText.textContent = `${loaded} / ${total}`;
    };

    updateUI();

    await Promise.all(ASSETS_TO_PRELOAD.map(src => new Promise(resolve => {
        const img = new Image();
        img.onload = () => { loaded++; updateUI(); resolve(src); };
        img.onerror = () => { loaded++; failed.push(src); updateUI(); resolve(src); };
        img.src = src;
    })));

    if (failed.length) {
        console.warn(`[Preloader] ${failed.length}/${total} assets failed to load:`, failed);
        window.dispatchEvent(new CustomEvent('preloader:assets-failed', { detail: { failed, total } }));
    }

    const result = { loaded: total - failed.length, failed, total };

    setTimeout(() => {
        const finish = () => {
            screen.style.display = 'none';
            onComplete?.(result);
        };
        if (window.gsap) {
            window.gsap.to(screen, { opacity: 0, duration: 0.6, ease: 'power2.inOut', onComplete: finish });
        } else {
            screen.style.opacity = '0';
            setTimeout(finish, 600);
        }
    }, 400);
}
