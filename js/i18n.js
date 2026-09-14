// =======================================================
// i18n.js — Localization & Translation Engine
// AntWar RPG — reads JSON translation files dynamically
// =======================================================

let currentLang = 'ar';
let currentTranslation = {};
let langConfig = null;

/**
 * Initialize the i18n system — loads language.json then the active translation
 */
export async function initI18n() {
    try {
        const resp = await fetch('language/language.json');
        langConfig = await resp.json();
        const saved = localStorage.getItem('antwar_lang');
        const lastDefault = localStorage.getItem('antwar_last_default_lang');
        
        let targetLang;
        // If developer changed defaultLanguage in language.json, respect the new default
        if (langConfig.defaultLanguage && langConfig.defaultLanguage !== lastDefault) {
            targetLang = langConfig.defaultLanguage;
            localStorage.setItem('antwar_last_default_lang', langConfig.defaultLanguage);
            localStorage.setItem('antwar_lang', targetLang);
        } else {
            targetLang = saved || langConfig.defaultLanguage || 'en';
        }

        await setLanguage(targetLang);
    } catch (e) {
        console.warn('[i18n] Failed to load language config:', e);
    }
}

/**
 * Switch the active language and apply to the DOM
 * @param {string} code - language code e.g. 'ar' or 'en'
 */
export async function setLanguage(code) {
    const langDef = langConfig?.supportedLanguages?.find(l => l.code === code);
    if (!langDef) {
        console.warn('[i18n] Unknown language:', code);
        return;
    }

    try {
        const resp = await fetch(langDef.translationFile);
        currentTranslation = await resp.json();
        currentLang = code;
        localStorage.setItem('antwar_lang', code);

        // Apply dir and lang to html
        document.documentElement.setAttribute('lang', code);
        document.documentElement.setAttribute('dir', langDef.dir);

        // Apply fonts via CSS variables
        applyFonts(langDef.fonts);

        // Apply translations to all elements with data-i18n attribute
        applyTranslations();

        // Dispatch change event
        window.dispatchEvent(new CustomEvent('languageChanged', { 
            detail: { lang: code, dir: langDef.dir, translation: currentTranslation } 
        }));
    } catch (e) {
        console.warn('[i18n] Failed to load translation:', e);
    }
}

/**
 * Get a translation by dot-notation key e.g. t('nav.shop')
 * @param {string} key
 * @param {Object} vars - optional variable replacements
 * @returns {string}
 */
export function t(key, vars = {}) {
    if (!key) return '';
    const parts = key.split('.');
    let val = currentTranslation;
    for (const part of parts) {
        if (val && typeof val === 'object') {
            val = val[part];
        } else {
            val = null;
            break;
        }
    }
    if (typeof val !== 'string') return key; // fallback to key
    
    // Replace {{var}} placeholders
    return val.replace(/\{\{(\w+)\}\}/g, (_, k) => vars[k] ?? `{{${k}}}`);
}

/** Returns the current language code */
export function getCurrentLang() { return currentLang; }

/** Returns the current language direction */
export function getCurrentDir() {
    return langConfig?.supportedLanguages?.find(l => l.code === currentLang)?.dir ?? 'rtl';
}

/** Returns all supported languages */
export function getSupportedLanguages() {
    return langConfig?.supportedLanguages ?? [];
}

// Apply CSS font variables based on language fonts config
function applyFonts(fonts) {
    if (!fonts) return;
    const root = document.documentElement;
    if (fonts.display) root.style.setProperty('--font-display', `'${fonts.display.family}', sans-serif`);
    if (fonts.body) root.style.setProperty('--font-body', `'${fonts.body.family}', sans-serif`);
}

// Walk DOM and apply translations to data-i18n elements
export function applyTranslations() {
    document.querySelectorAll('[data-i18n]').forEach(el => {
        const key = el.getAttribute('data-i18n');
        const translated = t(key);
        if (translated && translated !== key) {
            if (el.children.length === 0) {
                el.textContent = translated;
            } else {
                // Find direct text child or a designated label span
                let foundText = false;
                for (const node of el.childNodes) {
                    if (node.nodeType === Node.TEXT_NODE && node.textContent.trim().length > 0) {
                        node.textContent = (node.textContent.startsWith(' ') ? ' ' : '') + translated + (node.textContent.endsWith(' ') ? ' ' : '');
                        foundText = true;
                        break;
                    }
                }
                if (!foundText) {
                    const labelChild = el.querySelector('.rpg-btn-label, .bnav-label, .btn-inner-content, .i18n-text');
                    if (labelChild) {
                        labelChild.textContent = translated;
                    }
                }
            }
        }
    });
    document.querySelectorAll('[data-i18n-title]').forEach(el => {
        const key = el.getAttribute('data-i18n-title');
        const translated = t(key);
        if (translated && translated !== key) el.title = translated;
    });
    document.querySelectorAll('[data-i18n-placeholder]').forEach(el => {
        const key = el.getAttribute('data-i18n-placeholder');
        const translated = t(key);
        if (translated && translated !== key) el.placeholder = translated;
    });
}
