# Koerperkarte

Moderne Next.js-Web-App fuer Therapeuten zur interaktiven Visualisierung von Triggerpunkten, Dermatomen und Myotomen.

## Start

```bash
npm install --cache /tmp/npm-cache
npm run dev
```

Danach die lokale URL aus der Next-Ausgabe oeffnen, normalerweise `http://localhost:3000`.

## Firebase Hosting starten

Die App ist fuer Firebase Hosting als statischer Next-Export vorbereitet.

Einmalig Firebase CLI installieren:

```bash
npm install -g firebase-tools
```

Einloggen:

```bash
firebase login
```

Projekt bauen und deployen:

```bash
npm run deploy
```

Alternativ Schritt fuer Schritt:

```bash
npm run build
firebase deploy --only hosting
```

Nach dem Deploy zeigt Firebase die Hosting-URL an, typischerweise:

```text
https://koerperkarte.web.app
```

## Module

- Triggerpunkte: Muskel direkt auswaehlen oder Schmerzregion in der SVG-Koerperkarte anklicken.
- Dermatome: Region anklicken und zugeordnete Segmente anzeigen.
- Myotome: Muskelgruppe anklicken und Bewegung plus Segmente anzeigen.
- Periphere Nerven und weitere Karten sind als Startkacheln vorbereitet.

## Datenstruktur

Die anatomischen Demo-Daten liegen modular in JSON-Dateien:

- `data/triggerpoints.json`
- `data/dermatomes.json`
- `data/myotomes.json`

Neue Eintraege koennen dort ergaenzt werden. Die SVG-Flaechen nutzen einfache `path`-Koordinaten im gemeinsamen `viewBox="0 0 400 820"` der Koerperkarte.

## Firebase Realtime Database

Die App prueft beim Start diese Pfade in der Realtime Database:

- `muscles`
- `dermatomes`
- `myotomes`

Wenn ein Pfad leer ist oder die Realtime Database noch nicht erreichbar ist, nutzt die App automatisch die lokalen Demo-Daten.

Empfohlene Objekt-Keys:

- Muskel: `upper-trapezius`
- Dermatom: `c5-c6`
- Myotom: `shoulder-abduction`

Die Felder entsprechen den JSON-Strukturen in `data/`. Beispiel fuer `muscles/upper-trapezius`:

```json
{
  "name": "M. trapezius pars descendens",
  "bodyArea": "Nacken / Schulter",
  "course": "Vom Hinterhaupt und Nackenband zum lateralen Drittel der Clavicula.",
  "explanation": "Typische Punkte koennen in Richtung Nacken, Schlaefe und seitlicher Kopfregion ausstrahlen.",
  "painRegions": ["neck", "temple", "shoulder"],
  "triggerpoints": [
    { "id": "tp-trap-1", "label": "TP 1", "x": 220, "y": 154 }
  ],
  "referralArea": "Seitlicher Hals, Schlaefe, Kieferwinkel und Schulterdach.",
  "referralPath": "M206 154 C182 126 178 94 198 62 C220 92 236 122 232 164 C238 180 252 193 272 202 C248 210 224 194 206 154"
}
```

Fuer einen ersten Test muessen die Realtime-Database-Regeln Lesezugriff erlauben. Fuer produktive Nutzung sollte der Schreibzugriff nur fuer autorisierte Admins freigegeben werden.

Beispielstruktur:

```json
{
  "muscles": {
    "upper-trapezius": {
      "name": "M. trapezius pars descendens"
    }
  },
  "dermatomes": {
    "c5-c6": {
      "name": "Lateraler Arm"
    }
  },
  "myotomes": {
    "shoulder-abduction": {
      "name": "Schulterabduktion"
    }
  }
}
```

## Hinweis

Die enthaltenen Daten sind Demo-Daten fuer Lern- und Praxisunterstuetzung. Vor produktiver Nutzung muessen sie fachlich-medizinisch geprueft werden.
