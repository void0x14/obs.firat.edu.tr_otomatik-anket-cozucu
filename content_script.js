/**
 * OBS ANKET OTOMASYONU v3.2.2 - DYNAMIC NAVIGATION FIX
 * 
 * Mimari:
 * 1. Content Script (Isolated World) - Element tespiti ve UI
 * 2. Injected Script (Main World) - __doPostBack ve Click işlemleri
 * 3. postMessage Bridge - İki dünya arası iletişim
 */

(function () {
    'use strict';

    // ==================== CONFIG ====================
    const CONFIG = {
        defaultHighScoreValue: "5",
        autoFillDelay: 1500,
        navigationDelay: 1000,
        retryDelay: 3000,
        maxRetries: 3,
        unfilledAttr: 'data-anket-processed',
        bridgeAttr: 'data-obs-bridge-id'
    };

    // ==================== DEBUG LOG SYSTEM ====================
    const DebugLog = {
        logs: [],
        add(level, message, data = null) {
            const entry = {
                timestamp: new Date().toISOString(),
                level: level.toUpperCase(),
                message: message,
                context: data,
                url: window.location.href.split('?')[0]
            };
            this.logs.push(entry);
            const prefix = `[OBS-${level.toUpperCase()}]`;
            const style = level === 'error' ? 'color: #ff4d4d; font-weight: bold;' :
                level === 'warn' ? 'color: #ffa500;' : 'color: #00ff00;';
            console.log(`%c${prefix} ${message}`, style, data || '');
            this.saveToStorage();
        },
        info(msg, data) { this.add('info', msg, data); },
        warn(msg, data) { this.add('warn', msg, data); },
        error(msg, data) { this.add('error', msg, data); },
        saveToStorage() {
            if (typeof chrome !== 'undefined' && chrome.storage && chrome.storage.local) {
                chrome.storage.local.set({ debug_logs: this.logs.slice(-500) });
            }
        }
    };

    // ==================== MAIN WORLD BRIDGE ====================
    let bridgeReady = false;

    function injectMainWorldScript() {
        return new Promise((resolve) => {
            if (bridgeReady) { resolve(); return; }
            const script = document.createElement('script');
            script.src = chrome.runtime.getURL('injected.js');
            script.onload = function () { this.remove(); };
            (document.head || document.documentElement).appendChild(script);

            const handler = (event) => {
                if (event.data && event.data.type === 'OBS_BRIDGE_READY') {
                    bridgeReady = true;
                    window.removeEventListener('message', handler);
                    DebugLog.info('Main World Bridge hazır');
                    resolve();
                }
            };
            window.addEventListener('message', handler);
            setTimeout(() => { if (!bridgeReady) resolve(); }, 2000);
        });
    }

    async function clickElementSafely(element) {
        if (!element) return;
        const bridgeId = 'obs-' + Math.random().toString(36).substr(2, 9);
        element.setAttribute(CONFIG.bridgeAttr, bridgeId);
        window.postMessage({ type: 'OBS_CLICK_REQUEST', selector: `[${CONFIG.bridgeAttr}="${bridgeId}"]` }, '*');
        setTimeout(() => element.removeAttribute(CONFIG.bridgeAttr), 3000);
    }

    // ==================== UI OVERLAY ====================
    function showOverlay(message, isError = false) {
        const id = 'anket-solver-overlay';
        let overlay = document.getElementById(id);
        if (!overlay) {
            overlay = document.createElement('div');
            overlay.id = id;
            overlay.style.cssText = `position: fixed; top: 20px; right: 20px; padding: 15px 25px; border-radius: 12px; font-weight: 600; z-index: 2147483647; box-shadow: 0 8px 32px rgba(0,0,0,0.4); font-family: system-ui, sans-serif; transition: opacity 0.3s;`;
            document.body.appendChild(overlay);
        }
        overlay.style.backgroundColor = isError ? '#dc3545' : '#28a745';
        overlay.style.color = 'white';
        overlay.innerHTML = `🚀 ${message}`;
        overlay.style.opacity = '1';
        setTimeout(() => { if (overlay) overlay.style.opacity = '0'; }, 3000);
    }

    // ==================== NAVIGATION ENGINE ====================
    const NavigationState = {
        UNKNOWN: 'UNKNOWN',
        MAIN_PAGE: 'MAIN_PAGE',
        GRADE_LIST: 'GRADE_LIST',
        SURVEY_FORM: 'SURVEY_FORM',
        SUCCESS: 'SUCCESS'
    };

    function detectCurrentState() {
        const bodyText = (document.body.innerText || '').toLowerCase();

        // 1. Success Message (En yüksek öncelik)
        if (bodyText.includes('başarıyla kaydedildi') || bodyText.includes('işlem başarılı') || bodyText.includes('tamamlanmıştır')) {
            return NavigationState.SUCCESS;
        }

        // 2. Survey Form (Anket form elementleri varsa)
        const hasRadios = document.querySelectorAll('input[type="radio"]').length > 0;
        const hasFormSelects = document.querySelectorAll('select').length > 3;
        const hasAnketTitle = bodyText.includes('anket') && (bodyText.includes('doldur') || bodyText.includes('formu'));
        
        if (hasRadios || (hasFormSelects && hasAnketTitle)) {
            return NavigationState.SURVEY_FORM;
        }

        // 3. Grade List (Not Listesi / Zorunlu Anket Linkleri)
        const zorunluLinks = findZorunluAnketLinks();
        if (zorunluLinks.length > 0) {
            return NavigationState.GRADE_LIST;
        }
        
        // Eğer sayfada "Ders Kodu", "Ders Adı", "Vize" gibi tablolar varsa ama anket linki yoksa 
        // muhtemelen tüm anketler bitmiştir veya not listesi sayfasındayızdır.
        const isGradeTable = bodyText.includes('ders kodu') && bodyText.includes('notu');
        if (isGradeTable) {
            return NavigationState.GRADE_LIST;
        }

        // 4. Main Page (Ana Sayfa / Menü Frame)
        const hasMenuLink = Array.from(document.querySelectorAll('a, span, div, li')).some(el => {
            const txt = (el.innerText || '').toLowerCase().trim();
            return txt === 'not listesi' || txt === 'not listem' || (txt.includes('not') && txt.includes('listesi'));
        });

        if (hasMenuLink || bodyText.includes('öğrenci bilgi sistemi')) {
            return NavigationState.MAIN_PAGE;
        }

        return NavigationState.UNKNOWN;
    }

    function findZorunluAnketLinks() {
        const selectors = ['a', 'span', 'div', 'td', 'input[type="button"]'];
        const elements = [];
        selectors.forEach(s => elements.push(...Array.from(document.querySelectorAll(s))));
        
        return elements.filter(el => {
            const text = (el.innerText || el.value || '').trim().toLowerCase();
            const hasAnketText = (text.includes('anket') && (text.includes('zorunlu') || text.includes('doldur') || text.includes('formu'))) || 
                                (text.includes('ders') && text.includes('değerlendirme'));
            const isVisible = el.offsetParent !== null;
            const notProcessed = !el.hasAttribute(CONFIG.unfilledAttr);
            
            // Link veya tıklanabilir element kontrolü
            const isClickable = el.tagName === 'A' || el.hasAttribute('onclick') || 
                               el.getAttribute('href')?.startsWith('javascript:') ||
                               window.getComputedStyle(el).cursor === 'pointer';
            
            return hasAnketText && isVisible && notProcessed && isClickable;
        });
    }

    async function navigateToGradeList() {
        DebugLog.info('Not Listesi sayfasına gidiliyor...');
        showOverlay('Not Listesi sayfasına gidiliyor...');

        // 1. Doğrudan "Not Listesi" linkini ara
        const allElements = Array.from(document.querySelectorAll('a, span, div, li, [onclick]'));
        const target = allElements.find(el => {
            const txt = (el.innerText || el.textContent || '').toLowerCase().trim();
            const isMatch = txt === 'not listesi' || txt === 'not listem' || (txt.includes('not') && txt.includes('listesi'));
            const isVisible = el.offsetParent !== null;
            return isMatch && isVisible;
        });

        if (target) {
            DebugLog.info('Not Listesi hedefi bulundu, tıklanıyor.');
            await clickElementSafely(target);
            return true;
        }

        // 2. Eğer bulunamadıysa "Ders ve Dönem İşlemleri" menüsünü bulmayı dene (Kapalı olabilir)
        const menuDers = allElements.find(el => {
            const txt = (el.innerText || el.textContent || '').toLowerCase();
            return txt.includes('ders') && txt.includes('dönem') && el.offsetParent !== null;
        });

        if (menuDers) {
            DebugLog.info('Ana menü öğesi bulundu, açılıyor...');
            await clickElementSafely(menuDers);
            // Menü açıldıktan kısa süre sonra tekrar dene
            setTimeout(navigateToGradeList, 1500);
            return true;
        }

        DebugLog.warn('Not Listesi linki bu frame içinde bulunamadı.');
        return false;
    }

    async function clickFirstZorunluAnket() {
        const links = findZorunluAnketLinks();
        if (links.length === 0) {
            showOverlay('Tüm anketler tamamlandı! 🎉');
            return false;
        }
        const firstLink = links[0];
        firstLink.setAttribute(CONFIG.unfilledAttr, 'clicked');
        await clickElementSafely(firstLink);
        return true;
    }

    // ==================== FORM FILLING ====================
    function fillSurveyForm(scoreValue) {
        DebugLog.info(`Filling form with score: ${scoreValue}`);
        let filledCount = 0;

        // Radios
        const radios = document.querySelectorAll(`input[type="radio"]:not([${CONFIG.unfilledAttr}])`);
        const names = new Set(Array.from(radios).map(r => r.name));

        names.forEach(name => {
            const group = Array.from(document.querySelectorAll(`input[name="${name}"]`));
            const scoreMap = {
                "5": { pos: ["kesinlikle katılıyorum", "çok iyi", "tamamen", "çok yeterli", "her zaman"], neg: ["katılmıyorum", "zayıf", "yetersiz"] },
                "4": { pos: ["katılıyorum", "iyi", "yeterli", "genellikle"], neg: ["katılmıyorum", "zayıf", "kesinlikle"] },
                "3": { pos: ["kararsızım", "orta", "kısmen"], neg: [] },
                "2": { pos: ["katılmıyorum", "zayıf", "yetersiz", "nadiren"], neg: ["kesinlikle", "iyi", "çok"] },
                "1": { pos: ["kesinlikle katılmıyorum", "çok zayıf", "hiçbir zaman"], neg: [" katılıyorum", " iyi"] }
            };
            const config = scoreMap[scoreValue] || { pos: [scoreValue], neg: [] };

            let target = group.find(radio => {
                const label = document.querySelector(`label[for="${radio.id}"]`);
                if (!label) return false;
                const txt = label.innerText.toLowerCase();
                return config.pos.some(k => txt.includes(k)) && !config.neg.some(k => txt.includes(k));
            });

            if (!target) target = group.find(r => r.value === scoreValue);
            if (!target) {
                // Eğer metin eşleşmesi yoksa, radio button sırasına göre seç (5 -> sonuncu, 1 -> ilk gibi)
                const index = Math.min(parseInt(scoreValue) - 1, group.length - 1);
                target = group[index];
            }

            if (target) {
                const label = document.querySelector(`label[for="${target.id}"]`);
                if (label) label.click();
                target.checked = true;
                target.dispatchEvent(new Event('change', { bubbles: true }));
                group.forEach(r => r.setAttribute(CONFIG.unfilledAttr, 'true'));
                filledCount++;
            }
        });

        // Selects
        document.querySelectorAll(`select:not([${CONFIG.unfilledAttr}])`).forEach(s => {
            if (s.offsetParent === null) return;
            const opts = Array.from(s.options).filter(o => o.value && o.value !== "0");
            const target = opts.find(o => o.value === scoreValue) || opts[opts.length - 1];
            if (target) {
                s.value = target.value;
                s.dispatchEvent(new Event('change', { bubbles: true }));
                filledCount++;
            }
            s.setAttribute(CONFIG.unfilledAttr, 'true');
        });

        // Textareas & Inputs (Comment/Workload)
        const inputs = document.querySelectorAll(`textarea:not([${CONFIG.unfilledAttr}]), input[type="text"]:not([${CONFIG.unfilledAttr}]), input[type="number"]:not([${CONFIG.unfilledAttr}])`);
        inputs.forEach(input => {
            if (input.offsetParent === null) return;
            let val = scoreValue;
            
            // Eğer bir sayı isteniyorsa (İş yükü tablosu gibi)
            const rowText = (input.closest('tr')?.innerText || "").toLowerCase();
            if (rowText.includes('saat') || rowText.includes('gün') || input.type === 'number') {
                const match = rowText.match(/(\d+)/g);
                val = match ? match[match.length - 1] : "2"; // Default 2 saat
            } else if (input.tagName === 'TEXTAREA') {
                val = "Ders içeriği ve işleyişi oldukça verimliydi. Teşekkürler.";
            }

            input.focus();
            input.value = val;
            ['input', 'change', 'blur'].forEach(evt => input.dispatchEvent(new Event(evt, { bubbles: true })));
            input.setAttribute(CONFIG.unfilledAttr, 'true');
            filledCount++;
        });

        if (filledCount > 0) {
            showOverlay(`${filledCount} alan dolduruldu. Kaydet butonuna basılıyor...`);
            setTimeout(autoClickSaveButton, 2500);
        } else {
            // Hiç alan bulunamadıysa bir şeyler ters gitmiş olabilir veya sayfa henüz yüklenmemiştir
            DebugLog.warn('Doldurulacak alan bulunamadı.');
        }
    }

    async function autoClickSaveButton() {
        const btn = Array.from(document.querySelectorAll('input[type="submit"], input[type="button"], button, a'))
            .find(b => {
                const txt = (b.value || b.innerText || '').toLowerCase();
                const isSave = txt.includes("kaydet") || txt.includes("gönder") || txt.includes("onayla") || txt.includes("tamamla");
                return isSave && b.offsetParent !== null;
            });

        if (btn) {
            DebugLog.info('Kaydet butonu bulundu, tıklanıyor.');
            await clickElementSafely(btn);
            showOverlay('Kaydediliyor...');
        } else {
            DebugLog.warn('Kaydet butonu bulunamadı!');
        }
    }

    async function handleSuccessAction() {
        showOverlay('İşlem başarılı! Bir sonraki adıma geçiliyor...');
        // Başarı durumunda sayfayı yenilemek yerine biraz bekleyip durumu tekrar kontrol etmek daha güvenli olabilir
        // veya üst frame'in menüyü tetiklemesini bekleyebiliriz.
        setTimeout(() => {
            const state = detectCurrentState();
            if (state === NavigationState.SUCCESS) {
                // Eğer hala başarı sayfasındaysak, kullanıcıyı Grade List'e geri döndürmek için 
                // sayfadaki "Geri" veya "Kapat" butonlarını arayabiliriz.
                const backBtn = Array.from(document.querySelectorAll('a, button, input'))
                    .find(el => {
                        const t = (el.innerText || el.value || "").toLowerCase();
                        return t.includes('geri') || t.includes('kapat') || t.includes('list');
                    });
                if (backBtn) clickElementSafely(backBtn);
            }
        }, 2000);
    }

    // ==================== RUNNER ====================
    async function runStateMachine(userScore) {
        const state = detectCurrentState();
        DebugLog.info(`Current State: ${state}`);

        switch (state) {
            case NavigationState.SUCCESS: 
                await handleSuccessAction(); 
                break;
            case NavigationState.MAIN_PAGE: 
                await navigateToGradeList(); 
                break;
            case NavigationState.GRADE_LIST: 
                const linkClicked = await clickFirstZorunluAnket(); 
                if (!linkClicked) {
                    // Eğer link bulunamadıysa ama bu frame'de menü varsa oraya bak
                    await navigateToGradeList();
                }
                break;
            case NavigationState.SURVEY_FORM: 
                fillSurveyForm(userScore); 
                break;
            default: 
                // Unknown state ise bekle ve tekrar dene
                setTimeout(() => runStateMachine(userScore), CONFIG.retryDelay);
                return;
        }
        
        // Döngüyü devam ettir
        setTimeout(() => runStateMachine(userScore), 4000);
    }

    async function init() {
        try {
            await injectMainWorldScript();
            window.addEventListener('message', (event) => {
                if (event.data && event.data.type === 'OBS_SUCCESS_EVENT') handleSuccessAction();
            });

            let score = CONFIG.defaultHighScoreValue;
            if (typeof chrome !== 'undefined' && chrome.storage && chrome.storage.local) {
                const res = await chrome.storage.local.get(['surveyScore']);
                score = res?.surveyScore || CONFIG.defaultHighScoreValue;
            }
            setTimeout(() => runStateMachine(score), CONFIG.navigationDelay);
        } catch (e) { DebugLog.error('Init Error:', e.message); }
    }

    if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', init);
    else init();

})();
