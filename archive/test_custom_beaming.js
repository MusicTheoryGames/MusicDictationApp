// Test custom beaming logic for Question 16
const questions = require('./questions_4-4_2m_C-major_complex.js');

// Simulate the custom beaming logic from app_modular.js
function testCustomBeaming(measureData) {
    console.log('Testing custom beaming for:', measureData.map(n => `${n.keys[0]} ${n.duration}`));

    const beams = [];
    let consecutiveEighths = [];
    let currentBeat = 0;
    let lastBeatGroup = -1;

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

        console.log(`Note ${i+1}: ${note.keys[0]} ${duration} - beats ${currentBeat}-${currentBeat + beats}`);

        if (duration === '8') {
            // Determine which beat this eighth note belongs to
            // Beat groups: 0-1=beat1, 1-2=beat2, 2-3=beat3, 3-4=beat4
            const startBeatGroup = Math.floor(currentBeat);
            const endBeatGroup = Math.floor(currentBeat + beats - 0.001);

            console.log(`  Start beat group: ${startBeatGroup}, End beat group: ${endBeatGroup}, Last beat group: ${lastBeatGroup}`);

            // If this eighth note starts a new beat group, finalize previous group
            if (lastBeatGroup !== -1 && startBeatGroup !== lastBeatGroup) {
                console.log(`  New beat group detected! Finalizing group: [${consecutiveEighths.map(n => n.keys[0] + ' ' + n.duration).join(', ')}]`);
                if (consecutiveEighths.length >= 2) {
                    beams.push([...consecutiveEighths]);
                }
                consecutiveEighths = [];
            }

            consecutiveEighths.push(note);
            lastBeatGroup = startBeatGroup;
            console.log(`  Added to group: [${consecutiveEighths.map(n => n.keys[0] + ' ' + n.duration).join(', ')}], lastBeatGroup: ${lastBeatGroup}`);

            // If this eighth note spans across beat boundaries, end the group
            if (startBeatGroup !== endBeatGroup) {
                console.log(`  Note spans beats, finalizing group: [${consecutiveEighths.map(n => n.keys[0] + ' ' + n.duration).join(', ')}]`);
                if (consecutiveEighths.length >= 2) {
                    beams.push([...consecutiveEighths]);
                }
                consecutiveEighths = [];
                lastBeatGroup = -1;
            }
        } else {
            // Non-eighth note breaks the sequence
            console.log(`  Non-eighth note, finalizing group: [${consecutiveEighths.map(n => n.keys[0] + ' ' + n.duration).join(', ')}]`);
            if (consecutiveEighths.length >= 2) {
                beams.push([...consecutiveEighths]);
            }
            consecutiveEighths = [];
            lastBeatGroup = -1;
        }

        currentBeat += beats;
    }

    // Handle any remaining consecutive eighths
    if (consecutiveEighths.length >= 2) {
        beams.push([...consecutiveEighths]);
    }

    console.log('\\nFinal beam groups:');
    if (beams.length === 0) {
        console.log('  No beaming (all eighth notes standalone)');
    } else {
        beams.forEach((group, i) => {
            console.log(`  Beam ${i+1}: [${group.map(n => n.keys[0] + ' ' + n.duration).join(', ')}]`);
        });
    }

    return beams;
}

// Test Question 16, Option 0
const q16 = questions[5]; // Question 16 (0-indexed)
console.log('=== QUESTION 16 CUSTOM BEAMING TEST ===\\n');
testCustomBeaming(q16[0].measure1);