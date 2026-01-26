# Active Context

## Güncel Durum (v3.2.2 - RECOVERY SUCCESSFUL)
**Tarih:** 2026-01-26
**Durum:** STABLE (Kod temizlendi ve dinamik hale getirildi)

## YAPILAN DÜZELTMELER (v3.2.2)

### 1. Hardcoded URL'lerin Kaldırılması
`window.location.href = 'not_listesi.aspx'` gibi tahminlere dayalı tüm yönlendirmeler kaldırıldı. Artık navigasyon sadece ekrandaki DOM elemanlarına (menü linkleri, butonlar) tıklanarak yapılıyor. Eğer link bulunamazsa hata logu basılıyor ancak sistem yanlış yere yönlendirilmiyor.

### 2. Gelişmiş State Machine
`detectCurrentState` fonksiyonu daha robust hale getirildi:
- Sadece URL'e değil, sayfa içeriğindeki anahtar kelimelere ve form elementlerine bakarak durum tespiti yapıyor.
- "Not Listesi" sayfasını tespit etmek için tablo yapılarını (`ders kodu`, `notu` vb.) kontrol ediyor.
- Anket formlarını tespit etmek için radio button ve select sayısını kontrol ediyor.

### 3. Dinamik Menü Navigasyonu
`navigateToGradeList` artık önce doğrudan linki arıyor, bulamazsa üst menüleri (Ders ve Dönem İşlemleri) açıp tekrar aramaya başlıyor. Bu sayede menü yapısı değişse bile sistem çalışmaya devam edebiliyor.

### 4. AKTS ve İş Yükü Desteği
Anketlerdeki sayısal girdi gerektiren (Örn: "Bu ders için haftada kaç saat çalıştınız?") alanlar için otomatik sayı tespiti ve doldurma mantığı eklendi.

### 5. Bridge ve PostBack İyileştirmeleri
`injected.js` içindeki PostBack mekanizması, `WebForm_PostBackOptions` kontrolü ile daha güvenli hale getirildi. Click simülasyonu iyileştirildi.

## KRİTİK UYARILAR
- Sistem şu an tamamen DOM tabanlıdır. Eğer OBS arayüzünde çok köklü bir HTML değişikliği olursa seçicilerin (selectors) güncellenmesi gerekebilir.
- Iframe'ler arası iletişim PostMessage üzerinden sağlıklı bir şekilde yürütülmektedir.

## GELECEK ADIMLAR
- Kullanıcı arayüzüne "Otomasyonu Durdur" butonu eklenebilir.
- Farklı tarayıcılarda (Edge, Firefox) testler yapılabilir.