# 🔊 Zmiany w algorytmie dźwięku 3D

## ✅ Wprowadzone poprawki

### 1. Panel pozycji 3D przeniesiony pod obiekty
Panel z suwakami (odległość, azymut, elevacja) jest teraz bezpośrednio pod siatką obiektów — zgodnie z Twoją uwagą.

---

### 2. Nowy suwak: Głośność bazowa (0-200%)
Każdy obiekt ma teraz **suwak głośności bazowej** (baseVolume), który pozwala:
- Znormalizować głośność różnych plików audio
- Cichsze pliki można podbić do 200%
- Głośniejsze pliki można wyciszyć

**Lokalizacja:** Panel pozycji 3D → pierwszy suwak "🔊 Głośność bazowa"

---

### 3. Naprawiony algorytm tłumienia dźwięku z odległością

#### Problem
Poprzednia konfiguracja:
```javascript
refDistance = 1    // ❌ za małe
rolloffFactor = 1  // ❌ domyślne (za szybkie tłumienie)
```

Przy 40m głośność wynosiła zaledwie **2.5%** — praktycznie niesłyszalne!

#### Rozwiązanie (oparte na nauce akustyki)
```javascript
refDistance = 2       // ✅ "bliski dźwięk" = 2 metry
rolloffFactor = 0.3   // ✅ wolniejsze tłumienie
```

---

## 📐 Podstawy naukowe

### Model tłumienia "inverse" w Web Audio API
```
gain = refDistance / (refDistance + rolloffFactor × (distance - refDistance))
```

### Porównanie starej vs nowej konfiguracji

| Odległość | STARA (ref=1, roll=1) | NOWA (ref=2, roll=0.3) |
|-----------|----------------------|------------------------|
| 2m        | 50%                  | **100%** (blisko)     |
| 10m       | 10%                  | **45%**               |
| 20m       | 5%                   | **27%**               |
| 40m       | 2.5%                 | **14%**               |
| 60m       | 1.7%                 | **10%**               |
| 100m      | 1%                   | **6.4%**              |

### Dlaczego rolloffFactor = 0.3?
- **Prawo odwrotnych kwadratów** (1/r²) opisuje idealne tłumienie w wolnej przestrzeni
- W **rzeczywistości** tłumienie jest wolniejsze z powodu:
  - Odbić od powierzchni
  - Absorpcji atmosferycznej
  - Efektów środowiskowych
- `rolloffFactor = 0.3` daje **realistyczne, przyjemne tłumienie**

---

## 🎯 Domyślna odległość: 20m (zamiast 50m)
Zmieniono domyślną odległość obiektów z 50m na 20m, aby:
- Nowo włączone obiekty były od razu dobrze słyszalne (~27%)
- Użytkownik mógł je łatwo zlokalizować w przestrzeni
- Potem można przesunąć dalej według potrzeb

---

## 📁 Struktura plików (przypomnienie)

```
przestrzen-relaksu/
├── index.html      ← (zaktualizowany - panel 3D pod obiektami + suwak głośności)
├── styles.css      
├── script.js       ← (zaktualizowany - nowy algorytm + baseVolume)
└── assets/         ← UWAGA: "assets" nie "assests"!
    └── audio/
        ├── voice/
        ├── scenes/
        └── objects/
```

---

## 🧪 Jak przetestować zmiany

1. Włącz dowolny obiekt (np. Misa 🔔)
2. Powinien być teraz dobrze słyszalny na domyślnej odległości 20m
3. Użyj suwaka **Głośność bazowa** aby dostosować poziom pliku
4. Przesuń suwak **Odległość** — dźwięk powinien płynnie cichnąć, ale nadal być słyszalny nawet przy 100m

---

**Gotowe! 🎧**
