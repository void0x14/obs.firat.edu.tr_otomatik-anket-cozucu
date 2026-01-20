/**
 * OBS ANKET OTOMASYONU v2.1 - FIXED
 * 
 * Sorunlar düzeltildi:
 * - Sadece <a> taglarındaki "Zorunlu Anket" linklerine tıkla
 * - Modal killer spam kaldırıldı
 * - Daha spesifik element seçimi
 */

(function () {
    'use strict';

    const CONFIG = {
        defaultHighScoreValue: "5",
        autoFillDelay: 2500,
        unfilledAttr: 'data-anket-processed',
        clickDelay: 1500
    };

    function log(msg) {
        console.log('[OBS-Anket]', msg);
    }

    function showOverlay(message, isError = false) {
        const id = 'anket-solver-overlay';
        let overlay = document.getElementById(id);
        if (!overlay) {
            overlay = document.createElement('div');
            overlay.id = id;
            overlay.style.cssText = `
                position: fixed; top: 20px; right: 20px; padding: 15px 25px;
                border-radius: 12px; font-weight: 600; z-index: 2147483647;
                box-shadow: 0 8px 32px rgba(0,0,0,0.4);
                font-family: system-ui, sans-serif; max-width: 400px;
            `;
            document.body.appendChild(overlay);
        }
        overlay.style.backgroundColor = isError ? '#dc3545' : '#28a745';
        overlay.style.color = 'white';
        overlay.innerHTML = `🚀 ${message}`;
        overlay.style.opacity = '1';
        setTimeout(() => { if (overlay) overlay.style.opacity = '0'; }, 5000);
    }

    /**
     * SADECE <a> taglarında "Zorunlu Anket" ara
     */
    function findZorunluAnketLinks() {
        log("Zorunlu Anket <a> linkleri aranıyor...");

        // SADECE <a> tagları - tablo veya div değil!
        const allLinks = document.querySelectorAll('a');
        const zorunluLinks = [];

        for (const link of allLinks) {
            const text = (link.innerText || link.textContent || '').trim().toLowerCase();

            // Tam olarak "zorunlu anket" içeren linkler
            if (text.includes('zorunlu anket') || text === 'zorunlu anket') {
                // Görünür olmalı
                if (link.offsetParent !== null && !link.hasAttribute(CONFIG.unfilledAttr)) {
                    zorunluLinks.push(link);
                    log(`Bulundu: "${link.innerText.trim()}"`);
                }
            }
        }

        log(`${zorunluLinks.length} zorunlu anket linki bulundu`);
        return zorunluLinks;
    }

    /**
     * İlk zorunlu ankete tıkla
     */
    function clickFirstZorunluAnket() {
        const links = findZorunluAnketLinks();

        if (links.length > 0) {
            const firstLink = links[0];
            showOverlay(`${links.length} zorunlu anket bulundu. İlki açılıyor...`);
            log(`Tıklanıyor: "${firstLink.innerText.trim()}"`);

            firstLink.setAttribute(CONFIG.unfilledAttr, 'clicked');

            // 1 saniye bekle ve tıkla
            setTimeout(() => {
                firstLink.scrollIntoView({ behavior: 'smooth', block: 'center' });
                setTimeout(() => {
                    firstLink.click();
                    log("Link tıklandı!");
                }, 500);
            }, 500);

            return true;
        } else {
            log("Zorunlu anket linki bulunamadı");
            showOverlay("Zorunlu anket bulunamadı veya hepsi tamamlandı!", false);
            return false;
        }
    }

    /**
     * Sayfa türünü tespit et
     */
    function detectPageType() {
        const bodyText = document.body.innerText.toLowerCase();
        const hasRadios = document.querySelectorAll('input[type="radio"]').length > 0;
        const zorunluLinks = findZorunluAnketLinks();

        if (hasRadios) {
            return 'SURVEY_FORM';
        }

        if (zorunluLinks.length > 0) {
            return 'GRADE_LIST';
        }

        if (bodyText.includes('not listesi')) {
            return 'GRADE_LIST';
        }

        return 'UNKNOWN';
    }

    /**
     * Anket formunu doldur
     */
    function fillSurveyForm(scoreValue) {
        log(`Form doldurma başlıyor (puan: ${scoreValue})...`);
        let filledCount = 0;

        // RADIO BUTTONS
        const radios = document.querySelectorAll(`input[type="radio"]:not([${CONFIG.unfilledAttr}])`);
        const groupedRadios = {};
        radios.forEach(r => {
            if (!groupedRadios[r.name]) groupedRadios[r.name] = [];
            groupedRadios[r.name].push(r);
        });

        log(`${Object.keys(groupedRadios).length} radio grubu bulundu`);

        Object.keys(groupedRadios).forEach(name => {
            const group = groupedRadios[name];
            let targetRadio = group.find(r => r.value === scoreValue) ||
                group.find(r => r.value === scoreValue.toString()) ||
                (group.length >= parseInt(scoreValue) ? group[parseInt(scoreValue) - 1] : null) ||
                group[group.length - 1];

            if (targetRadio && !targetRadio.checked) {
                targetRadio.checked = true;
                targetRadio.dispatchEvent(new Event('click', { bubbles: true }));
                targetRadio.dispatchEvent(new Event('change', { bubbles: true }));
                filledCount++;
                group.forEach(r => r.setAttribute(CONFIG.unfilledAttr, 'true'));
            }
        });

        // SELECT DROPDOWNS
        const selects = document.querySelectorAll(`select:not([${CONFIG.unfilledAttr}])`);
        selects.forEach(s => {
            const options = Array.from(s.options);
            const targetOption = options.find(o => o.value === scoreValue) ||
                options.find(o => o.text.includes(scoreValue)) ||
                options[options.length - 1];

            if (targetOption && s.value !== targetOption.value) {
                s.value = targetOption.value;
                s.dispatchEvent(new Event('change', { bubbles: true }));
                filledCount++;
                s.setAttribute(CONFIG.unfilledAttr, 'true');
            }
        });

        // TEXT INPUTS - Soldan sayı kopyala
        const textInputs = document.querySelectorAll(`input[type="text"]:not([${CONFIG.unfilledAttr}]), input[type="number"]:not([${CONFIG.unfilledAttr}])`);
        textInputs.forEach(input => {
            if (input.value.trim()) return;

            const row = input.closest('tr');
            if (!row) return;

            const cells = Array.from(row.cells || []);
            let leftValue = "";

            for (let i = 0; i < cells.length; i++) {
                const cell = cells[i];
                if (cell.contains(input)) break;

                const numbers = (cell.innerText || "").match(/(\d+)/g);
                if (numbers) leftValue = numbers[numbers.length - 1];
            }

            if (!leftValue) leftValue = scoreValue;

            input.value = leftValue;
            input.dispatchEvent(new Event('input', { bubbles: true }));
            input.dispatchEvent(new Event('change', { bubbles: true }));
            input.setAttribute(CONFIG.unfilledAttr, 'true');
            filledCount++;
            log(`Text input: "${leftValue}"`);
        });

        // TEXTAREAS
        const textareas = document.querySelectorAll(`textarea:not([${CONFIG.unfilledAttr}])`);
        textareas.forEach(textarea => {
            if (textarea.value.trim()) return;
            textarea.value = "Başarılı bir ders oldu.";
            textarea.dispatchEvent(new Event('change', { bubbles: true }));
            textarea.setAttribute(CONFIG.unfilledAttr, 'true');
            filledCount++;
        });

        if (filledCount > 0) {
            log(`${filledCount} alan dolduruldu`);
            showOverlay(`${filledCount} alan dolduruldu. KAYDET butonuna basın!`);
            hookSaveButton();
        } else {
            log("Doldurulacak alan yok");
            showOverlay("Doldurulacak alan bulunamadı.", true);
        }
    }

    function hookSaveButton() {
        const buttons = Array.from(document.querySelectorAll('input[type="submit"], input[type="button"], button'))
            .filter(btn => {
                const txt = (btn.value || btn.innerText || '').toLowerCase();
                return txt.includes("kaydet") || txt.includes("save") || txt.includes("gönder");
            })
            .filter(btn => btn.offsetParent !== null);

        const targetBtn = buttons[0];

        if (targetBtn && !targetBtn.hasAttribute('data-hooked')) {
            log(`Kaydet butonu bulundu: "${targetBtn.value || targetBtn.innerText}"`);

            targetBtn.addEventListener('click', () => {
                log("Kaydet tıklandı, 3sn sonra sonraki anket aranacak...");
                showOverlay("Kaydediliyor...");
                setTimeout(() => {
                    // Sayfayı yenile ve sonraki anketi bul
                    window.location.reload();
                }, 3000);
            });

            targetBtn.setAttribute('data-hooked', 'true');
            targetBtn.style.border = "4px solid #28a745";
            targetBtn.style.boxShadow = "0 0 15px rgba(40, 167, 69, 0.7)";
            targetBtn.style.backgroundColor = "#28a745";
            targetBtn.style.color = "white";
        }
    }

    /**
     * Ana fonksiyon
     */
    function init() {
        log(`Aktif. URL: ${window.location.href}`);

        const isExtension = typeof chrome !== 'undefined' && chrome.storage && chrome.storage.local;

        const startLogic = (userScore) => {
            log(`Puan: ${userScore}`);

            // 2 saniye bekle, sayfa yüklensin
            setTimeout(() => {
                const pageType = detectPageType();
                log(`Sayfa: ${pageType}`);

                if (pageType === 'SURVEY_FORM') {
                    log("Form tespit edildi");
                    showOverlay("Anket formu doldurulacak...");
                    setTimeout(() => fillSurveyForm(userScore), CONFIG.autoFillDelay);
                } else if (pageType === 'GRADE_LIST') {
                    log("Not listesi tespit edildi");
                    showOverlay("Zorunlu anketler aranıyor...");
                    setTimeout(clickFirstZorunluAnket, CONFIG.clickDelay);
                } else {
                    log("Bilinmeyen sayfa, 3sn sonra tekrar deneyecek");
                    showOverlay("Sayfa analiz ediliyor...");
                    setTimeout(() => {
                        const retry = detectPageType();
                        if (retry === 'SURVEY_FORM') fillSurveyForm(userScore);
                        else if (retry === 'GRADE_LIST') clickFirstZorunluAnket();
                        else showOverlay("Sayfa türü tespit edilemedi", true);
                    }, 3000);
                }
            }, 2000);
        };

        if (isExtension) {
            chrome.storage.local.get(['surveyScore'], (result) => {
                startLogic(result.surveyScore || CONFIG.defaultHighScoreValue);
            });
        } else {
            startLogic(CONFIG.defaultHighScoreValue);
        }
    }

    // Başlat
    if (document.body) {
        init();
    } else {
        document.addEventListener('DOMContentLoaded', init);
    }

})();
