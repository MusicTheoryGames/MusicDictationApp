// Test script to verify beaming logic for Question 16
const questions = require('./questions_4-4_2m_C-major_complex.js');

// Simulate the beaming logic from app_modular.js
function testBeamingLogic(measureData) {
    console.log('Testing beaming for measure:', measureData.map(n => `${n.keys[0]} ${n.duration}`));

    // Calculate beat positions for each eighth note
    const eighthNotesWithBeats = [];
    let currentBeat = 0;

    for (let i = 0; i < measureData.length; i++) {
        const note = measureData[i];
        const duration = note.duration;
        let beats;

        // Calculate beats for each duration
        if (duration === 'w') beats = 4;
        else if (duration === 'hd') beats = 3;
        else if (duration === 'h') beats = 2;
        else if (duration === 'qd') beats = 1.5;
        else if (duration === 'q') beats = 1;
        else if (duration === '8') beats = 0.5;
        else if (duration === '16') beats = 0.25;
        else beats = 1; // default

        if (duration === '8') {
            eighthNotesWithBeats.push({
                note: `${note.keys[0]} ${note.duration}`,
                startBeat: currentBeat,
                endBeat: currentBeat + beats,
                beatNumber: Math.floor(currentBeat) + 1 // Beat 1, 2, 3, or 4
            });
        }

        currentBeat += beats;
    }

    console.log('Eighth notes with beat positions:');
    eighthNotesWithBeats.forEach((info, i) => {
        console.log(`  ${i+1}. ${info.note} - beats ${info.startBeat}-${info.endBeat} (beat ${info.beatNumber})`);
    });

    // Group eighth notes by beat boundaries
    const beamGroups = [];
    let currentGroup = [];
    let currentBeatNum = null;

    for (const eighthInfo of eighthNotesWithBeats) {
        const startBeatNum = Math.floor(eighthInfo.startBeat) + 1;
        const endBeatNum = Math.floor(eighthInfo.endBeat - 0.001) + 1; // Slight offset to handle exact beat boundaries

        // If eighth note crosses beat boundary or starts new beat, start new group
        if (currentBeatNum !== null && (startBeatNum !== currentBeatNum || startBeatNum !== endBeatNum)) {
            // Finalize current group if it has 2+ notes
            if (currentGroup.length >= 2) {
                beamGroups.push([...currentGroup]);
            }
            currentGroup = [];
        }

        currentGroup.push(eighthInfo.note);
        currentBeatNum = startBeatNum;

        // If note crosses beat boundary, finalize group
        if (startBeatNum !== endBeatNum) {
            if (currentGroup.length >= 2) {
                beamGroups.push([...currentGroup]);
            }
            currentGroup = [];
            currentBeatNum = null;
        }
    }

    // Finalize last group
    if (currentGroup.length >= 2) {
        beamGroups.push([...currentGroup]);
    }

    console.log('Beam groups:');
    if (beamGroups.length === 0) {
        console.log('  No beaming (all eighth notes will be unbeamed)');
    } else {
        beamGroups.forEach((group, i) => {
            console.log(`  Group ${i+1}: [${group.join(', ')}]`);
        });
    }

    console.log('');
}

// Test Question 16, Option 0 (the problematic one)
const q16 = questions[5]; // Question 16 (0-indexed)
console.log('=== QUESTION 16 BEAMING TEST ===\n');

console.log('Option 0 (CORRECT) - Before fix: D-E-F all beamed together ❌');
console.log('Expected after fix: D unbeamed, E-F beamed together ✅\n');

testBeamingLogic(q16[0].measure1);