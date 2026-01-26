// OBS ANKET OTOMASYONU - Main World Script
// Bu script doğrudan sayfanın bağlamında çalışır ve __doPostBack'i çağırır.

(function () {
    // Sadece content_script'ten gelen güvenli mesajları dinle
    window.addEventListener('message', function (event) {
        if (!event.data) return;

        // POSTBACK REQUEST
        if (event.data.type === 'OBS_POSTBACK_REQUEST') {
            const { eventTarget, eventArgument } = event.data;
            console.log(`[OBS-Bridge] PostBack: ${eventTarget} (Arg: ${eventArgument})`);

            try {
                // Yöntem 1: WebForm_DoPostBackWithOptions (Validation varsa)
                if (typeof window.WebForm_DoPostBackWithOptions === 'function' && typeof window.WebForm_PostBackOptions === 'function') {
                    const options = new WebForm_PostBackOptions(eventTarget, eventArgument, true, "", "", false, true);
                    window.WebForm_DoPostBackWithOptions(options);
                }
                // Yöntem 2: Standart ASP.NET __doPostBack
                else if (typeof window.__doPostBack === 'function') {
                    window.__doPostBack(eventTarget, eventArgument);
                }
                // Yöntem 3: Form submit (Fallback)
                else {
                    const form = document.forms[0] || document.querySelector('form');
                    const targetField = document.getElementById('__EVENTTARGET');
                    const argField = document.getElementById('__EVENTARGUMENT');

                    if (form && targetField) {
                        targetField.value = eventTarget;
                        if (argField) argField.value = eventArgument || '';
                        form.submit();
                    } else {
                        throw new Error('PostBack mekanizması bulunamadı');
                    }
                }

                window.postMessage({ type: 'OBS_POSTBACK_RESPONSE', success: true }, '*');
            } catch (e) {
                console.error('[OBS-Bridge] PostBack Hata:', e);
                window.postMessage({ type: 'OBS_POSTBACK_RESPONSE', success: false, error: e.message }, '*');
            }
        }

        // CLICK REQUEST
        if (event.data.type === 'OBS_CLICK_REQUEST') {
            try {
                const element = document.querySelector(event.data.selector);
                if (element) {
                    console.log('[OBS-Bridge] Clicking element:', event.data.selector);
                    // Fiziksel click simülasyonu
                    const clickEvent = new MouseEvent('click', {
                        view: window,
                        bubbles: true,
                        cancelable: true
                    });
                    element.dispatchEvent(clickEvent);
                    
                    // Eğer href javascript: içeriyorsa manuel tetikle
                    const href = element.getAttribute('href');
                    if (href && href.startsWith('javascript:')) {
                        const code = href.replace('javascript:', '');
                        new Function(code)();
                    }
                }
            } catch (e) {
                console.error('[OBS-Bridge] Click Hata:', e);
            }
        }
    });

    // ==================== AUTO MODAL CLOSER (MutationObserver) ====================
    // Sayfada beliren "Başarıyla kaydedildi" pencerelerini bridge beklemeden anında yakalar ve kapatır.
    const modalObserver = new MutationObserver((mutations) => {
        for (const mutation of mutations) {
            if (mutation.addedNodes.length > 0) {
                const bodyText = (document.body.innerText || '').toLowerCase();
                const isSuccess = bodyText.includes('başarıyla kaydedildi') || 
                                 bodyText.includes('işlem başarılı') || 
                                 bodyText.includes('kayıt edildi') ||
                                 bodyText.includes('tamamlanmıştır');

                if (isSuccess) {
                    const buttons = Array.from(document.querySelectorAll('button, input[type="button"], a'))
                        .filter(b => {
                            const txt = (b.innerText || b.value || '').toLowerCase().trim();
                            return txt.includes('tamam') || txt.includes('kapat') || txt === 'ok' || txt === 'kapat';
                        })
                        .filter(b => b.offsetParent !== null);

                    if (buttons.length > 0) {
                        console.log('[OBS-Bridge] Success modal detected, clicking:', buttons[0].innerText || buttons[0].value);
                        buttons[0].click();
                        window.postMessage({ type: 'OBS_SUCCESS_EVENT' }, '*');
                    }
                }
            }
        }
    });

    modalObserver.observe(document.body, { childList: true, subtree: true });

    // Hazırız mesajı
    setTimeout(() => {
        window.postMessage({ type: 'OBS_BRIDGE_READY' }, '*');
        console.log('[OBS-Bridge] Bridge aktif ve dinliyor (MutationObserver aktif).');
    }, 500);
})();
