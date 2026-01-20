/**
 * INJECTED.JS - Main World Bridge Script
 * Bu script sayfa context'inde (Main World) çalışır
 * CSP kısıtlamalarını bypass etmek için __doPostBack çağrılarını yapar
 */

(function () {
    'use strict';

    // Content script'ten gelen mesajları dinle
    window.addEventListener('message', function (event) {
        // Sadece kendi mesajlarımızı işle
        if (event.source !== window) return;
        if (!event.data || event.data.type !== 'OBS_POSTBACK_REQUEST') return;

        const { eventTarget, eventArgument } = event.data;

        console.log('[OBS-Injected] PostBack request received:', eventTarget, eventArgument);

        try {
            // Yöntem 1: __doPostBack fonksiyonu varsa doğrudan çağır
            if (typeof __doPostBack === 'function') {
                console.log('[OBS-Injected] Calling __doPostBack directly');
                __doPostBack(eventTarget, eventArgument);

                window.postMessage({
                    type: 'OBS_POSTBACK_RESPONSE',
                    success: true,
                    method: '__doPostBack'
                }, '*');
                return;
            }

            // Yöntem 2: Hidden form alanlarını doldur ve submit et
            const form = document.forms[0];
            const eventTargetField = document.getElementById('__EVENTTARGET');
            const eventArgumentField = document.getElementById('__EVENTARGUMENT');

            if (form && eventTargetField && eventArgumentField) {
                console.log('[OBS-Injected] Using form submit method');
                eventTargetField.value = eventTarget;
                eventArgumentField.value = eventArgument || '';
                form.submit();

                window.postMessage({
                    type: 'OBS_POSTBACK_RESPONSE',
                    success: true,
                    method: 'form_submit'
                }, '*');
                return;
            }

            // Yöntem 3: WebForm_DoPostBackWithOptions varsa kullan (ASP.NET AJAX)
            if (typeof WebForm_DoPostBackWithOptions === 'function') {
                console.log('[OBS-Injected] Using WebForm_DoPostBackWithOptions');
                WebForm_DoPostBackWithOptions(new WebForm_PostBackOptions(eventTarget, eventArgument, true, '', '', false, true));

                window.postMessage({
                    type: 'OBS_POSTBACK_RESPONSE',
                    success: true,
                    method: 'WebForm_DoPostBackWithOptions'
                }, '*');
                return;
            }

            console.error('[OBS-Injected] No postback method available');
            window.postMessage({
                type: 'OBS_POSTBACK_RESPONSE',
                success: false,
                error: 'No postback method available'
            }, '*');

        } catch (error) {
            console.error('[OBS-Injected] PostBack error:', error);
            window.postMessage({
                type: 'OBS_POSTBACK_RESPONSE',
                success: false,
                error: error.message
            }, '*');
        }
    });

    // Sayfa yüklendiğinde hazır olduğumuzu bildir
    window.postMessage({
        type: 'OBS_BRIDGE_READY'
    }, '*');

    console.log('[OBS-Injected] Main World Bridge initialized');
})();
