# 🎧 Przestrzeń Relaksu — Binaural Mixer

**Aplikacja do medytacji z dźwiękiem przestrzennym 3D (HRTF)**

Statyczna strona HTML/CSS/JS zaprojektowana do hostingu na GitHub Pages.

---

## 🌟 Funkcje

- **5 sesji medytacji prowadzonej** - skanowanie ciała, oddech, obserwacja myśli, rozluźnienie, wizualizacja
- **Canvas 3D Visualization** - wizualizacja przestrzeni z perspektywy top-down
- **Full 3D Positioning** - azymut (0-360°), elevacja (-90° do +90°), odległość (1-100m)
- **Drag & Drop** - przeciąganie obiektów na canvas (touch + mouse)
- **4 sceny tła** - plaża, górska polana, letni las, nocne cykady
- **4 dodatkowe obiekty dźwiękowe** - tybetańska misa, zegar, śpiew kosa, strumień
- **Dźwięk przestrzenny 3D (HRTF)** - pełna kontrola pozycjonowania w przestrzeni
- **Timer przestrzeni** - automatyczne wyłączenie po zadanym czasie
- **Synchronizacja** - możliwość zsynchronizowania końca przestrzeni z końcem medytacji
- **Responsywny design** - mobile-first, touch-friendly UI
- **Accessibility** - pełna obsługa klawiatury, ARIA labels

---

## 🚀 Demo

**Strona dostępna pod:**  
👉 **[[https://sanefungus.github.io/relaxation-mixer/](https://sanefungus.github.io/relaxation-mixer/)]()**

---

## 📦 Technologie

- **HTML5** - semantyczna struktura
- **CSS3** - CSS Variables, Flexbox, Grid, animacje
- **Vanilla JavaScript (ES6+)** - bez frameworków
- **Web Audio API** - zaawansowane przetwarzanie audio
- **HRTF Panning** - przestrzenny dźwięk 3D
- **Canvas 2D API** - wizualizacja przestrzeni dźwiękowej
- **Touch Events** - drag & drop na mobile

---

## 🛠️ Instalacja lokalna

### 1. Sklonuj repozytorium
```bash
git clone https://github.com/[twoja-nazwa]/przestrzen-relaksu.git
cd przestrzen-relaksu
```

### 2. Uruchom lokalny serwer
**Opcja A - Python 3:**
```bash
python -m http.server 8000
```

**Opcja B - Node.js (http-server):**
```bash
npx http-server -p 8000
```

**Opcja C - VS Code Live Server:**
- Zainstaluj rozszerzenie "Live Server"
- Kliknij prawym na `index.html` → "Open with Live Server"

### 3. Otwórz przeglądarkę
```
http://localhost:8000
```

---

## 📁 Struktura projektu

```
przestrzen-relaksu/
├── index.html           # Główny plik HTML
├── css/
│   └── styles.css       # Wszystkie style (CSS Variables, animacje)
├── js/
│   └── script.js        # Logika aplikacji (Web Audio API)
├── assets/
│   └── audio/
│       ├── voice/       # Sesje medytacji (.webm + .mp3 fallback)
│       ├── scenes/      # Sceny tła (.webm + .mp3)
│       ├── objects/     # Obiekty dźwiękowe (.webm + .mp3)
│       └── timer/       # Dźwięki timera (.webm + .mp3)
├── DEPLOYMENT.md        # Szczegółowa instrukcja deployment
└── README.md            # Ten plik
```

---

## 🎨 Customizacja

### Zmiana kolorów
Edytuj CSS Variables w `css/styles.css`:
```css
:root {
  --cyan-glow: #32b8c6;      /* Główny akcent */
  --magenta-pulse: #c850a0;  /* Drugi akcent */
  --violet-mist: #6366f1;    /* Akcent timera */
}
```

### Dodanie nowej sesji medytacji
Edytuj `js/script.js` → `CONFIG.sessions`:
```javascript
{
  id: 'moja-sesja',
  name: 'Moja sesja',
  icon: '🌟',
  file: 'assets/audio/voice/moja-sesja.webm',
  fallback: 'assets/audio/voice/moja-sesja.mp3',
  description: 'Krótki opis sesji'
}
```

---

## 🔊 Formaty audio

Aplikacja obsługuje **progresywne wzbogacanie**:

1. **Preferowany:** `.webm` (kodek Opus)
   - Bezszwowe zapętlanie (brak padding)
   - Lepsza kompresja
   - Natywna obsługa Web Audio API

2. **Fallback:** `.mp3`
   - Dla starszych przeglądarek
   - Automatyczne przełączenie jeśli WebM niedostępny

### Konwersja MP3 → WebM (ffmpeg)
```bash
ffmpeg -i input.mp3 -c:a libopus -b:a 128k -vn output.webm
```

---

## 🐛 Naprawione problemy

### ✅ Race Conditions
- Każda instancja audio ma unikalny ID
- Weryfikacja przed cleanup przy async operacjach
- Uniemożliwia zatrzymanie nowo uruchomionego źródła

### ✅ Async Validation
- State guard przy szybkim włączaniu/wyłączaniu
- Loading flag blokuje wielokrotne kliknięcia
- Walidacja stanu po zakończeniu ładowania

### ✅ Audio Pops (trzaski)
- Używamy `setTargetAtTime()` zamiast `setValueAtTime()`
- Płynne przejścia logarytmiczne dla pozycji przestrzennej
- Eliminuje nagłe skoki wartości

### ✅ UI Sync
- Reaktywny system synchronizacji stanu
- `markStateChanged()` inkrementuje wersję stanu
- Automatyczne odświeżenie UI po każdej zmianie

---

## 📱 Kompatybilność

### Przeglądarki desktop
- ✅ Chrome/Edge 90+
- ✅ Firefox 88+
- ✅ Safari 14.1+

### Przeglądarki mobile
- ✅ Chrome Android
- ✅ Safari iOS 14.5+
- ⚠️ Samsung Internet (może wymagać fallbacku MP3)

### Wymagania
- JavaScript włączony
- Web Audio API support
- HTTPS (lub localhost) - wymagane dla audio context

---

## 🤝 Contributing

Pull requesty mile widziane! Dla większych zmian:
1. Fork repo
2. Utwórz feature branch (`git checkout -b feature/AmazingFeature`)
3. Commit zmian (`git commit -m 'Add some AmazingFeature'`)
4. Push do brancha (`git push origin feature/AmazingFeature`)
5. Otwórz Pull Request

---

## 📄 Licencja

MIT License - możesz swobodnie używać, modyfikować i dystrybuować.

Zobacz [LICENSE](LICENSE) dla szczegółów.

---

## 🙏 Podziękowania

- **Web Audio API** - za potężne możliwości audio w przeglądarce
- **HRTF** - za prawdziwy dźwięk przestrzenny 3D
- **GitHub Pages** - za darmowy hosting statyczny

---

## 📧 Kontakt

Pytania? Issues? Pull requesty?  
👉 [Issues](https://github.com/[twoja-nazwa]/przestrzen-relaksu/issues)

---

**Zbudowane z ❤️ dla spokoju i relaksu**
