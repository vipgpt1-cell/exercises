# Testlar va mashqlar — qisqa qo‘llanma

Ilovangiz ichida ko‘z testlari kabi ochiladigan veb-modul. **19 ta test va 12 ta mashq**, to‘rt bo‘lim:
Eshitish · Xotira va diqqat · Qo‘l va barmoqlar · Bo‘yin, bel va nafas. Tillar: o‘zbekcha, ruscha, inglizcha.
Profil va ro‘yxatdan o‘tish yo‘q — bular ilovaning o‘zida bo‘ladi. Natijalar faqat telefonda saqlanadi.

Pastda to‘rtta bo‘lim (tab):
- **Asosiy** — to‘rt bo‘lim, so‘nggi natijalar, shu haftadagi mashqlar.
- **Tarix** — barcha test natijalari va mashqlar, har bir test uchun o‘zgarish grafigi.
- **Tahlil** — 7 / 30 / 90 kun yoki butun davr uchun grafiklar: kunlik/haftalik mashq daqiqalari, bo‘limlar holati, natijalar o‘zgarishi.
- **Hisobot** — shifokor yoki mutaxassis uchun. Avval hisobotning o‘zi, uning ostida **“Mutaxassisga yuborish”**: **PDF**, chatga **matn** yoki **CSV jadval**. Eng pastda **“Zaxira nusxa”**: natijalar faqat telefonda (WebView xotirasida) saqlanadi, shuning uchun telefon almashtirilsa yoki ilova qayta o‘rnatilsa, ular yo‘qolishi mumkin. Zaxira fayl (JSON) barcha natijalar, mashqlar va shaxsiy ma’lumotlarni saqlaydi; “Zaxira fayldan tiklash” esa yetishmayotgan yozuvlarni qaytaradi (takrorlanmaydi, begona fayl qabul qilinmaydi).

## 1. Ilovadan ochish
- `website/` — papkani HTTPS hostingga yuklang va manzilni WebView’da oching (tavsiya etiladi).
- `app-offline/index.html` — bitta fayl, ilova ichiga qo‘shib, internetsiz ochsa bo‘ladi.

Havolalar (`#` dan keyingi qism):
```
.../tests/                         bosh sahifa (4 bo‘lim)
.../tests/#/field/hearing          bitta bo‘lim: hearing | memory | hands | spine
.../tests/#/test/tone-audiometry   bitta test
.../tests/#/exercise/breathing     bitta mashq
.../tests/#/history                tarix
.../tests/#/analytics              tahlil (grafiklar)
.../tests/#/report                 hisobot
```

Ilovadan uzatiladigan sozlamalar (ixtiyoriy):
```
.../tests/?lang=uz&age=54&theme=dark#/field/hearing
```
- `lang` — `uz`, `ru`, `en` (berilsa, til almashtirgich yashiriladi)
- `age` yoki `birthYear` — yosh; berilsa, foydalanuvchidan yosh so‘ralmaydi
- `theme` — `light`, `dark`, `system`; `text` — `normal`, `large`, `xl`
- `sex` — `male` / `female`; `hand` — `right` / `left`; `sound` — `1` / `0`
- `name` — hisobotda ko‘rsatiladigan ism (foydalanuvchi uni Hisobot bo‘limida ham yozishi mumkin)

Yosh berilmasa, yoshga bog‘liq 7 ta test “Boshlash” tugmasi oldida faqat bir marta yoshni so‘raydi.

## 2. Orqaga tugmasi
- Har bir sahifada o‘zining orqaga strelkasi bor.
- Telefonning orqaga tugmasi oddiy WebView tarixi bilan ishlaydi (`canGoBack()` / `goBack()`).
- Test yoki mashq ketayotganda orqaga tugmasi bosilsa, test yo‘qolmaydi — “To‘xtatasizmi?” deb so‘raladi.

## 3. WebView sozlamalari
Android: `javaScriptEnabled = true`, `domStorageEnabled = true` (natijalar shu yerda saqlanadi),
`mediaPlaybackRequiresUserGesture = false`. iOS: `allowsInlineMediaPlayback = true`.
Qo‘l titrashi testi telefon harakat sensorini ishlatadi — u faqat `https` sahifada ishlaydi.

Fayllar (PDF, CSV, zaxira): WebView ichida oddiy yuklab olish ko‘pincha ishlamaydi. Shuning uchun ilova
`window.AppBridge.saveFile(nom, mime, base64)` funksiyasini (Android) yoki `saveFile` nomli handlerni (iOS) bersa,
fayl ilovaga uzatiladi va ilova uni ulashadi yoki saqlaydi. Bo‘lmasa, telefonning “Ulashish” oynasi yoki oddiy yuklab olish ishlatiladi.
“Zaxira fayldan tiklash” uchun Android’da `onShowFileChooser` qo‘llab-quvvatlanishi kerak. Batafsil: `README.md`.
Batafsil misollar (Android, iOS, React Native, Flutter): `README.md`, 1-bo‘lim.

## 4. Natijalarni saqlash
- Natijalar telefonda **IndexedDB**da saqlanadi (localStorage’dan ancha katta; eski versiyadagi ma’lumotlar o‘zi ko‘chiriladi). IndexedDB ishlamasa — localStorage’ga o‘tadi.
- Telefon xotirasi doimiy joy emas: ilova qayta o‘rnatilsa yoki telefon almashtirilsa, natijalar yo‘qoladi. **Tavsiya: har bir natijani TezMed serveriga yuboring.** Har bir yakunlangan test va mashq ilovaga yuboriladi: Android’da `AppBridge.onTestResult(json)`, iOS’da `testResult` handler.
- Bir telefonda bir nechta akkaunt bo‘lsa, havolaga `user=<id>` qo‘shing (telefon raqami emas, yashirin id). Har bir foydalanuvchining natijalari alohida saqlanadi.
- Ilova `window.TezMedTests` orqali hammasini o‘qishi (`getData()`), serverdan qaytarishi (`importData()`) va chiqishda o‘chirishi (`clearData()`) mumkin.
- Batafsil va kod namunalari: `README.md`, “Saving results”.

## 5. Dasturchilar uchun
```bash
cd source   # GitHub’da: loyiha papkasining o‘zi
npm install
npm run dev            # ishlab chiqish rejimi
npm test               # unit-testlar
npm run build          # sayt versiyasi → dist/
npm run build:offline  # bitta fayl versiyasi → dist-offline/
```
Node 22.12 yoki yangisi kerak. Matnlar har bir test faylining ichida (UZ/RU/EN).

## 6. Muhim
- Bu tibbiy asbob emas — o‘zini tekshirish va kuzatish vositasi.
- Tovush eshitish testi oddiy quloqchinda taxminiy natija beradi (±10 dB). Eng ishonchlisi — quloqlar orasidagi farq va o‘sha telefon hamda quloqchindagi o‘zgarishlar.
- O‘zbekcha raqamlarni kompyuter ovozi o‘qiydi; klinik foydalanish uchun studiya yozuvi bilan almashtirish tavsiya etiladi (README, 5-bo‘lim).
- Og‘riq testida og‘riyotgan joy tana xaritasida (orqa tomondan, mushak guruhlari bilan) belgilanadi.
- Og‘riq testida xavfli belgilar belgilansa, ilova darhol shifokorga murojaat qilishni tavsiya qiladi.
