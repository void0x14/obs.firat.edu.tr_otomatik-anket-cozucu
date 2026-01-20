document.addEventListener('DOMContentLoaded', () => {
    const scoreSelect = document.getElementById('scoreSelect');
    const saveMsg = document.getElementById('saveMsg');
    const openObsBtn = document.getElementById('openObs');
    const downloadLogsBtn = document.getElementById('downloadLogs');
    const clearLogsBtn = document.getElementById('clearLogs');
    const logCountEl = document.getElementById('logCount');

    const isExtension = typeof chrome !== 'undefined' && chrome.storage && chrome.storage.local;

    if (!isExtension) {
        console.warn("[System] Not running in extension context. Storage is disabled.");
        const warning = document.createElement('div');
        warning.style.cssText = "color: #856404; background-color: #fff3cd; border: 1px solid #ffeeba; padding: 10px; margin-bottom: 10px; font-size: 12px; border-radius: 4px;";
        warning.innerHTML = "⚠️ <b>Hata:</b> Eklenti olarak yüklenmedi! Lütfen <code>chrome://extensions</code> üzerinden 'Paketlenmemiş öğe yükle' ile klasörü seçin.";
        document.body.prepend(warning);
    }

    // Load saved preference
    if (isExtension) {
        chrome.storage.local.get(['surveyScore'], (result) => {
            if (result.surveyScore) {
                scoreSelect.value = result.surveyScore;
            }
        });

        // Update log count
        updateLogCount();
    }

    // Save preference on change
    scoreSelect.addEventListener('change', () => {
        const val = scoreSelect.value;
        if (isExtension) {
            chrome.storage.local.set({ surveyScore: val }, () => {
                saveMsg.style.display = 'block';
                setTimeout(() => {
                    saveMsg.style.display = 'none';
                }, 2000);
            });
        } else {
            localStorage.setItem('surveyScore', val);
            saveMsg.innerText = "✓ Ayarlar (Yerel) kaydedildi.";
            saveMsg.style.display = 'block';
            setTimeout(() => {
                saveMsg.style.display = 'none';
            }, 2000);
        }
    });

    // Open OBS
    openObsBtn.addEventListener('click', () => {
        const checkUrl = 'https://obs.firat.edu.tr/oibs/std/';

        if (isExtension) {
            chrome.tabs.create({ url: checkUrl }, (tab) => {
                setTimeout(() => {
                    chrome.tabs.get(tab.id, (updatedTab) => {
                        if (updatedTab.url.includes('login') || updatedTab.url.includes('giris')) {
                            chrome.tabs.update(tab.id, {
                                url: 'https://obs.firat.edu.tr/oibs/ogrenci/login.aspx'
                            });
                        }
                    });
                }, 2000);
            });
        } else {
            window.open(checkUrl, '_blank');
        }
    });

    // Download debug logs
    downloadLogsBtn.addEventListener('click', () => {
        if (!isExtension) {
            alert('Eklenti bağlamında değilsiniz!');
            return;
        }

        chrome.storage.local.get(['debug_logs'], (result) => {
            const logs = result.debug_logs || [];

            if (logs.length === 0) {
                alert('Henüz log kaydı yok.');
                return;
            }

            // Log'ları okunabilir formata çevir
            const logText = logs.map(log => {
                const data = log.data ? ` | Data: ${JSON.stringify(log.data)}` : '';
                return `[${log.timestamp}] [${log.level.toUpperCase()}] ${log.message}${data} | URL: ${log.url}`;
            }).join('\n');

            // Dosya olarak indir
            const blob = new Blob([logText], { type: 'text/plain' });
            const url = URL.createObjectURL(blob);
            const a = document.createElement('a');
            a.href = url;
            a.download = `obs_debug_${new Date().toISOString().replace(/[:.]/g, '-')}.log`;
            document.body.appendChild(a);
            a.click();
            document.body.removeChild(a);
            URL.revokeObjectURL(url);
        });
    });

    // Clear logs
    clearLogsBtn.addEventListener('click', () => {
        if (!isExtension) {
            alert('Eklenti bağlamında değilsiniz!');
            return;
        }

        if (confirm('Tüm debug loglarını silmek istediğinize emin misiniz?')) {
            chrome.storage.local.set({ debug_logs: [] }, () => {
                updateLogCount();
                alert('Loglar temizlendi.');
            });
        }
    });

    // Update log count display
    function updateLogCount() {
        if (!isExtension) return;

        chrome.storage.local.get(['debug_logs'], (result) => {
            const logs = result.debug_logs || [];
            logCountEl.textContent = `📊 ${logs.length} log kaydı mevcut`;
        });
    }
});
