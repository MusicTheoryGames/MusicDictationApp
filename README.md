# Music Dictation Helper App

A web-based music dictation training application that helps students practice identifying musical notation by ear.

## Features

- 11 progressive questions alternating between treble and bass clef
- 6 similar notation options per question to develop careful listening skills
- Professional music notation using VexFlow
- Piano audio playback with Web Audio API
- Question navigation and randomized option shuffling
- C major tonality throughout for consistency

## Usage

1. Start a local server:
   ```bash
   python3 -m http.server 8000
   ```

2. Open http://localhost:8000 in your browser

3. Click "Play Melody" to hear the musical phrase

4. Select the correct notation from the 6 options

5. Use Previous/Next buttons to navigate between questions

## Technical Details

- **VexFlow**: Professional music notation rendering
- **Web Audio API**: Piano sound synthesis
- **Tone.js**: Enhanced audio capabilities
- **Vanilla JavaScript**: No framework dependencies

## Question Structure

- Questions 1, 3, 5, 7, 9, 11: Treble clef
- Questions 2, 4, 6, 8, 10: Bass clef
- All questions use C major scale patterns
- Progressive difficulty with different rhythm patterns

## Development

The app includes developer navigation controls for easier testing between question sets.