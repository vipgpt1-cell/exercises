# Tests and exercises: hearing, memory, hands, neck & back

A web module (UZ / RU / EN) that opens inside your mobile app, the same way as the eye tests.
It has **19 tests** and **12 guided exercises** in four sections:

| Section | Tests | Exercises |
|---|---|---|
| **Hearing** (`hearing`) | Tone hearing test (audiogram) · Speech in noise · Ear balance · High-pitch hearing | Pitch training · Listening in noise |
| **Memory & attention** (`memory`) | Reaction time · Digit span · Corsi blocks · Stroop · Trail Making A & B · Go / No-Go | Schulte tables · N-back · Memory pairs |
| **Hands & fingers** (`hands`) | Finger tapping · Spiral drawing · Target tapping · Hand tremor (phone sensor) | Hand & finger exercises · Tracing practice · Target practice |
| **Neck, back & breathing** (`spine`) | Pain check with warning signs · Neck & back in daily life · Mobility · Breath-hold (BOLT) · Breathing rate | Guided breathing · Neck & shoulder routine · Lower back routine · Desk break |

Each test has a short explanation, practice rounds where useful, a result with colour bands, comparison with
people of the same age where published norms exist, recommendations and a history with a trend chart.

Four tabs at the bottom:
- **Home**: the four sections, latest results, this week's exercise.
- **History**: every test result and exercise session, and each test's trend chart.
- **Analytics**: charts for 7 / 30 / 90 days or all time: exercise minutes per day or week by section,
  the latest status of each section, and how each repeated test changes.
- **Report**: a summary for a doctor or specialist. Below it, **Send to a specialist** offers a **PDF**, **plain text**
  for a chat or a **CSV table**. At the bottom, **Backup** saves all results, exercise sessions and personal details to a
  JSON file and restores them later or on another phone (only missing entries are added; other files are rejected).

There is no login and no profile screen: the host app provides those. Results are stored on the device only (localStorage).

---

## 1. Opening it from the app

Two builds are included:

| Folder | Use |
|---|---|
| `website/` | Upload to any HTTPS static host (nginx, Netlify, cPanel …) and open the URL in a WebView. **Recommended.** |
| `app-offline/index.html` | One self-contained file (≈ 2.6 MB). Can be shipped inside the app and loaded from local assets, works with no internet. |

### Links

Routing uses the `#` part of the URL, so no server configuration is needed and any sub-folder works.

```
https://your-host/tests/                       start page (all four sections)
https://your-host/tests/#/field/hearing        one section: hearing | memory | hands | spine
https://your-host/tests/#/test/tone-audiometry one test
https://your-host/tests/#/exercise/breathing   one exercise
https://your-host/tests/#/history              the user's results
https://your-host/tests/#/analytics            charts
https://your-host/tests/#/report               report for a specialist
```

Test ids: `tone-audiometry, digits-in-noise, ear-balance, high-frequency-range, reaction-time, digit-span,
corsi-blocks, stroop, trail-making, go-nogo, finger-tapping, spiral-drawing, target-tapping, hand-tremor,
pain-check, neck-back-function, mobility-check, bolt, breathing-rate`

Exercise ids: `pitch-training, noise-training, schulte, nback, memory-pairs, hand-routine, tracing-practice,
target-practice, breathing, neck-routine, back-routine, desk-break`

### Parameters from the app (all optional)

```
https://your-host/tests/?lang=uz&age=54&theme=dark#/field/hearing
```

| Parameter | Values | Effect |
|---|---|---|
| `lang` | `uz` · `ru` · `en` | Language. When given, the language switch is hidden in Settings. |
| `theme` | `light` · `dark` · `system` | Colours. When given, the theme switch is hidden. |
| `text` | `normal` · `large` · `xl` | Text size. |
| `age` or `birthYear` | `7–100` or e.g. `1972` | Used by the 7 age-normed tests. **If you pass it, users are never asked for their age.** |
| `sex` | `male` · `female` | Only used by the tone hearing test (age curves differ slightly). |
| `hand` | `right` · `left` | Main hand, used by the hand tests. |
| `sound` | `1` · `0` | Sound effects on/off. |
| `name` | text | Printed on the report (the user can also type it on the Report tab). |

Parameters may also be written after the route (`#/field/hearing?lang=uz`). Values are saved, so they stay in effect.
Without `age`, a test that needs it shows one short "Your age" field before the Start button, and remembers the answer.

### Back button

- Every page has its own back arrow. On the first page opened from the app (e.g. a deep link to a test) it goes up
  to the section, then to the start page.
- The phone's back button works with normal WebView history (`canGoBack()` / `goBack()`).
- While a test or exercise is running, the phone's back button asks "Stop now?" instead of silently throwing the
  test away. A second press closes the question.

### WebView settings

**Android (WebView)**
```kotlin
webView.settings.javaScriptEnabled = true
webView.settings.domStorageEnabled = true            // results are kept in localStorage
webView.settings.mediaPlaybackRequiresUserGesture = false
onBackPressedDispatcher.addCallback(this) {
    if (webView.canGoBack()) webView.goBack() else finish()
}
```
To ship the offline file inside the app, serve it with `WebViewAssetLoader`
(`https://appassets.androidplatform.net/assets/tests/index.html?lang=uz#/field/hands`), which gives it a secure origin.
The hand-tremor test needs the motion sensor, which browsers allow only on `https` pages.

**iOS (WKWebView)**
```swift
let config = WKWebViewConfiguration()
config.allowsInlineMediaPlayback = true
config.mediaTypesRequiringUserActionForPlayback = []
let webView = WKWebView(frame: .zero, configuration: config)
webView.allowsBackForwardNavigationGestures = true
```
The tremor test asks for motion access with its own button (iOS shows the system prompt).

### Saving files (PDF, CSV, backup) and choosing a file to restore

Browsers download files normally. Inside an app's WebView a download often does nothing, so the Report tab tries,
in this order: **(1)** a bridge the app provides, **(2)** the phone's share sheet (iOS and Chrome), **(3)** a normal
download. On Android System WebView without a bridge it shows a short note and suggests "Copy as text" instead.

The bridge is one function. The page calls it with the file name, MIME type and the file as base64:

```js
window.AppBridge.saveFile(name, mimeType, base64)            // Android: addJavascriptInterface(obj, "AppBridge")
window.webkit.messageHandlers.saveFile.postMessage({ name, mime, base64 })   // iOS: add a handler named "saveFile"
```
```kotlin
class AppBridge(private val activity: Activity) {
    @JavascriptInterface fun saveFile(name: String, mime: String, base64: String) {
        val file = File(activity.cacheDir, name).apply { writeBytes(Base64.decode(base64, Base64.DEFAULT)) }
        val uri = FileProvider.getUriForFile(activity, "${activity.packageName}.files", file)
        activity.startActivity(Intent.createChooser(Intent(Intent.ACTION_SEND).setType(mime)
            .putExtra(Intent.EXTRA_STREAM, uri).addFlags(Intent.FLAG_GRANT_READ_URI_PERMISSION), name))
    }
}
webView.addJavascriptInterface(AppBridge(this), "AppBridge")
```
React Native / Flutter: inject a tiny script that defines `window.AppBridge.saveFile` and forwards the call to your
message channel (`window.ReactNativeWebView.postMessage(...)` / `window.flutter_inappwebview.callHandler(...)`).

"Restore from a file" uses a normal file picker (`<input type="file">`). iOS shows it by itself; on Android implement
`WebChromeClient.onShowFileChooser` (React Native WebView and Flutter plugins already do).

**React Native (`react-native-webview`)**: `javaScriptEnabled domStorageEnabled allowsInlineMediaPlayback
mediaPlaybackRequiresUserAction={false}`, and call `webViewRef.current.goBack()` from the Android back handler when
`canGoBack` is true. **Flutter (`webview_flutter`)**: `JavaScriptMode.unrestricted`, and use `controller.canGoBack()` /
`goBack()` in `PopScope`.

---

## 2. Development

```bash
cd source
npm install
npm run dev            # http://localhost:5173
npm test               # unit tests (scoring, statistics, signal processing)
npm run typecheck && npm run lint
npm run build          # → dist/          (website)
npm run build:offline  # → dist-offline/  (single-file index.html)
```
Requires **Node 22.12 or newer**. If the project sits in a OneDrive folder, `npm install` can be slow; a normal folder
such as `C:\projects\` is better.

---

## 3. How the measurements work (short)

**Hearing**
- *Tone test*: automated modified Hughson–Westlake procedure (10 dB down / 5 dB up, threshold = lowest level heard on
  at least half of the ascending tries). Pulsed tones, strict left/right routing, random gaps, false-tap tracking and a
  1 kHz repeat for reliability. Levels in dB HL via ISO 389-1 reference levels and a volume calibration step
  (clinics can enter a sound level meter value). Scoring: average of 0.5/1/2/4 kHz, WHO 2021 grades, difference
  between ears (≥ 15 dB), noise-notch pattern, cross-hearing warning, ISO 7029 age curves on the chart.
- *Speech in noise (Digits-in-Noise)*: 24 digit triplets, adaptive signal-to-noise ratio (4 dB then 2 dB steps),
  result = mean of triplets 5–24; noise shaped to the spectrum of the digits.
- *Ear balance*: alternating loudness matching at 0.5/1/2/4 kHz, two runs each from opposite starting offsets.
- *High-pitch hearing*: descending and ascending sweeps, corrected for reaction time.

**Memory & attention**: frame-accurate stimulus timing and hardware event timestamps. Norms: Der & Deary (reaction
time), Wechsler (digit span), Kessels (Corsi), Tombaugh 2004 (Trail Making, by age), Go/No-Go scored with d′
(shown to users as an "attention score").

**Hands**: tapping speed/rhythm/fatigue per hand; spiral: distance from the guide and tremor spectrum (3–12 Hz);
target tapping: Fitts' law throughput with effective target width (shown as a "coordination score");
phone-sensor tremor: band power (m/s²), main frequency and estimated movement.

**Neck, back & breathing**: a body map (seen from behind, muscle groups grouped into 10 regions) to mark where it hurts; 0–10 pain scale and warning-sign screening with emergency / urgent advice; our own
daily-life questionnaire (0–4 per item, % of maximum, modelled on known clinical questionnaires); guided mobility
check; BOLT breath-hold; breathing rate from tapped breaths.

All scoring is in pure, unit-tested files: `src/features/*/{audiometry,din,balance,range,norms,analysis,scoring}.ts`.

### Limitations
- This is a self-check and tracking tool, not a medical device, and it does not diagnose.
- Ordinary headphones are not calibrated audiometers: tone levels are estimates (about ±10 dB). The difference
  between the ears and changes over time on the same phone and headphones are the most reliable parts.
- The spoken digits were produced with speech synthesis (EN/RU neural voices; UZ with a closely related Turkic voice).
  For clinical use, replace them with studio recordings (see §5).
- Screen/touch delay (about 30–60 ms) is included in reaction times; compare results on the same phone.

---

## 4. Project structure
```
src/
  App.tsx, main.tsx, index.css      routes, design tokens (light/dark, text size)
  catalog/                          list of all tests/exercises, the four sections
  components/                       UI kit, charts, keypad, test frame, settings panel, routine player + figures
  pages/                            start page, section, test/exercise intro + run, result, history, analytics, report
  features/report/                  report model, plain-text and CSV export, PDF (jsPDF, loaded only when asked)
  lib/                              store (localStorage), launch parameters, i18n, router, audio, stats, DSP
  features/hearing|cognitive|motor|spine/   one file per test/exercise (+ scoring modules and their tests)
  assets/audio/                     spoken digits (one file per language) + speech-shaped noise
scripts/generate_din_audio.py       how the digit/noise audio was made
```
Each module keeps its EN/UZ/RU texts next to its code. The texts are type-checked: a missing Uzbek or Russian
text is a build error.

## 5. Customising
- **Texts**: in each feature file (`const S = defineStrings({ en, uz, ru })`), shared words in `src/i18n/`.
- **Colours**: `src/index.css` (`:root` and `.dark`).
- **Spoken digits**: replace `src/assets/audio/din-{en,ru,uz}.wav` and the offsets in
  `src/features/hearing/din-audio.ts`, keeping the same loudness as the noise file.
- **New test**: add a module in `src/features/<section>/` and register it in `src/catalog/index.ts`.

## 6. Privacy
No network requests while it runs (fonts and audio are bundled). Results and settings are kept in the WebView's
localStorage for that address. Users can save a backup file and restore it (Report tab), and delete all results in
Settings (gear icon on the start page).

Fonts: Inter (SIL Open Font License). Icons: Lucide (ISC). Body map artwork (`src/features/spine/body-back.ts`): from
`male-back.svg` supplied by TezMed; check its license before release.
