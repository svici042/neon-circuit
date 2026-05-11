# NEON CIRCUIT — Futuristic Racing Game

3D futuristinė lenktynių žaidimas naršyklėje, sukurtas su React, Three.js ir Web Audio API.

---

## Žaidimo aprašymas

Lenktyniaukite 10 skirtingų trasų neoninėje futuristinėje aplinkoje. Surinkite greičio impulsus (boost pads), aplenkite kliūtis ir pasiekite geriausią laiką rezultatų lentelėje.

### Funkcijos
- 10 trasų (Easy → Expert)
- 3D grafika su Three.js / React Three Fiber
- Greičio impulsai (boost pads) — oranžiniai plotai trasoje
- Sintetinis garso variklis (Web Audio API) — muzika + variklio garsas
- Lietiminių ekranų valdymas (◀ ▶ ▲ ▼ mygtukai)
- Giroskopo vairavimas (palaikoma iOS ir Android)
- Pauzės meniu (ESC klavišas arba mygtuku)
- Rezultatų lentelė (išsaugoma naršyklėje)
- Pilnas reagavimas į ekrano dydį ir orientaciją

---

## Technologijų stack'as

| Technologija | Paskirtis |
|---|---|
| React 18 + Vite | UI framework + build tool |
| TypeScript | Tipai |
| @react-three/fiber | Three.js React wrapper |
| @react-three/drei | Three.js pagalbiniai komponentai |
| three.js | 3D grafika |
| Web Audio API | Sintetinis garsas ir muzika |
| localStorage | Rezultatų išsaugojimas |

---

## Failų struktūra

```
src/
├── main.tsx                  — React entry point
├── App.tsx                   — Root komponentas
├── index.css                 — Global stiliai
├── pages/
│   └── GamePage.tsx          — Pagrindinis žaidimo state machine
└── game/
    ├── RacingGame.tsx        — 3D Canvas, automobilis, fizika
    ├── Track.tsx             — 3D trasa (kelias, sienos, boost pads)
    ├── tracks.ts             — 10 trasų apibrėžimai
    ├── controls.ts           — Valdymo singleton (klaviatūra + giroskopas)
    ├── TouchControls.tsx     — Lietiminiai mygtukai + giroskopo UI
    ├── HUD.tsx               — Heads-Up Display (greitis, laikas, ratas)
    ├── AudioEngine.ts        — Web Audio sintetinis variklis ir muzika
    ├── Leaderboard.tsx       — Rezultatų lentelė
    └── ErrorBoundary.tsx     — WebGL klaidos apdorojimas
```

---

## Kaip paleisti lokaliai

### Reikalavimai
- Node.js 20+
- pnpm 9+

### Paleisti

```bash
# Instaliuoti priklausomybes
pnpm install

# Paleisti development serverį
pnpm --filter @workspace/3d-game run dev
```

Atidaryti naršyklėje: `http://localhost:24982`

---

## Valdymas

### Klaviatūra (kompiuteris)
| Klavišas | Veiksmas |
|---|---|
| W / ↑ | Duoti dujų |
| S / ↓ | Stabdyti / atgal |
| A / ← | Sukti kairėn |
| D / → | Sukti dešinėn |
| ESC | Pauzė |

### Lietiminiai mygtukai (telefonas/planšetė)
| Mygtukas | Veiksmas |
|---|---|
| ▲ | Duoti dujų |
| ▼ | Stabdyti |
| ◀ | Sukti kairėn |
| ▶ | Sukti dešinėn |
| 📱 GIROSKOPAS | Įjungti vairavimą pasvirimu |

### Giroskopo vairavimas
Pakreipkite telefoną kairėn / dešinėn — veikia portrait ir landscape režimuose. Mirties zona ±7°.

---

## Trasų sąrašas

| # | Pavadinimas | Sunkumas | Aprašymas |
|---|---|---|---|
| 1 | Neon Oval | Easy | Klasikinis ovalas. Puikiai tinka pradedantiesiems |
| 2 | The Bullet | Easy | Itin pailga trasa. Pasiekite maksimalų greitį |
| 3 | City Crunch | Medium | Kompaktiškas miesto blokas. Kiekvienas posūkis svarbus |
| 4 | Grand Prix | Easy | Plati trasa. Greita ir atlaidžiai |
| 5 | The Needle | Hard | Pavojingai siaura. Viena klaida — ir esite sienoje |
| 6 | Midnight Loop | Medium | Trumpesnė trasa su glaudžiais išėjimais |
| 7 | Kart Circuit | Medium | Mažytė, bet intensyvi |
| 8 | Glacier Run | Medium | Ledinis atmosferos apskritimas |
| 9 | Power Surge | Easy | Boost pads visur! Maksimalus greitis |
| 10 | Nightmare | Expert | Skutimuisi ploni keliai. Tik legendos finišuoja |

---

## Kodo aprašymas

### `GamePage.tsx`
Pagrindinis žaidimo valdiklis. Valdo šias būsenas:
- `menu` → `countdown` → `racing` → `finished`
- Pauzė (`paused: boolean`) — atskira būsena
- Laikmatis naudoja `requestAnimationFrame`, sustoja pauzės metu
- `AudioEngine` inicializuojamas pirmą kartą paspaudus Start (naršyklių reikalavimas)

### `RacingGame.tsx`
- `Car` komponentas — automobilio fizika `useFrame` cikle
- Greitis, pagreitis, stabdymas, trintis
- Susidūrimų aptikimas su `collisionZones` (ašinė AABB)
- Boost pad aptikimas
- Rato/finišo linijos aptikimas (checkpoint → finish)
- Kamera seka automobilį su `lerp` (sklandus judėjimas)

### `controls.ts`
Bendrinis valdymo singleton objektas:
```typescript
export const controls = { forward, backward, left, right }
```
Naudojamas tiek klaviatūros, tiek lietiminio ir giroskopo valdymui.

**Giroskopo orientacijos logika:**
- `screen.orientation.angle === 0` (portrait) → naudoja `gamma`
- `screen.orientation.angle === 90` (landscape, viršus kairėn) → naudoja `-beta`
- `screen.orientation.angle === 270` (landscape, viršus dešinėn) → naudoja `beta`

### `AudioEngine.ts`
Pilnai sintetinis garso variklis (nėra audio failų):
- **Variklio garsas** — du oscialiatoriai (sawtooth + square) su distorsija ir filtru; pikis keičiasi pagal greitį
- **Boost whoosh** — sawtooth sweep + sinuso garso efektas
- **Muzika** — bas linija, kick, hi-hat, atmosferinis pad, 128 BPM
- Nutildinimas — `masterGain` tarp 0 ir 1

### `tracks.ts`
Visos 10 trasų generuojamos su `makeOval(sx, sz, rw, meta)` fabrika:
- `sx`, `sz` — pusinis plotis/ilgis
- `rw` — kelio plotis
- Automatiškai generuoja: keliai, sienos, boost pads, susidūrimų zonos, SVG peržiūros

---

## Rezultatų lentelė

Išsaugoma `localStorage` raktu `futuristic-racing-leaderboard-v2`.

Kiekvienas įrašas:
```typescript
{
  name: string;      // Trasos pavadinimas
  totalTime: number; // Bendras laikas ms
  bestLap: number;   // Geriausias ratas ms
  date: string;      // Data
}
```

---

## Pakeitimai ir istorija

| Versija | Pakeitimai |
|---|---|
| v1 | Pradinis žaidimas — 1 trasa, klaviatūros valdymas, laikmatis, leaderboard |
| v2 | 10 trasų, trasų pasirinkimas meniu, spalvų temos kiekvienai trasai |
| v3 | Pauzės meniu, ESC klavišas, laikmačio pauzė |
| v4 | Lietiminiai mygtukai, giroskopo vairavimas, TiltIndicator |
| v5 | AudioEngine — variklio garsas, boost whoosh, synthwave muzika, nutildymo mygtukas |
| v6 | Pilnas reagavimas į ekrano dydį, giroskopo orientacijos taisymas (landscape), HUD su clamp() |

---

## Licencija

Sukurta Replit platformoje. Naudokite laisvai savo projektuose.
