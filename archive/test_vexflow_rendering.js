// Test VexFlow rendering for all rhythm patterns
const patterns = [
    {
        id: 'quarter',
        name: 'Quarter Note',
        vexflow: [{ keys: ['b/4'], duration: 'q' }]
    },
    {
        id: 'two-eighths',
        name: 'Two Eighths',
        vexflow: [
            { keys: ['b/4'], duration: '8' },
            { keys: ['b/4'], duration: '8' }
        ]
    },
    {
        id: 'four-sixteenths',
        name: 'Four Sixteenths',
        vexflow: [
            { keys: ['b/4'], duration: '16' },
            { keys: ['b/4'], duration: '16' },
            { keys: ['b/4'], duration: '16' },
            { keys: ['b/4'], duration: '16' }
        ]
    },
    {
        id: 'dotted-quarter',
        name: 'Dotted Quarter',
        vexflow: [{ keys: ['b/4'], duration: 'q', dots: 1 }]
    },
    {
        id: 'dotted-quarter-eighth',
        name: 'Dotted Quarter + Eighth',
        vexflow: [
            { keys: ['b/4'], duration: 'q', dots: 1 },
            { keys: ['b/4'], duration: '8' }
        ]
    },
    {
        id: 'eighth-dotted-quarter',
        name: 'Eighth + Dotted Quarter',
        vexflow: [
            { keys: ['b/4'], duration: '8' },
            { keys: ['b/4'], duration: 'q', dots: 1 }
        ]
    },
    {
        id: 'half',
        name: 'Half Note',
        vexflow: [{ keys: ['b/4'], duration: 'h' }]
    },
    {
        id: 'eighth-rest-eighth',
        name: 'Eighth Rest + Eighth',
        vexflow: [
            { keys: ['b/4'], duration: '8r' },
            { keys: ['b/4'], duration: '8' }
        ]
    },
    {
        id: 'eighth-eighth-rest',
        name: 'Eighth + Eighth Rest',
        vexflow: [
            { keys: ['b/4'], duration: '8' },
            { keys: ['b/4'], duration: '8r' }
        ]
    },
    {
        id: 'quarter-rest',
        name: 'Quarter Rest',
        vexflow: [{ keys: ['b/4'], duration: 'qr' }]
    },
    {
        id: 'half-rest',
        name: 'Half Rest',
        vexflow: [{ keys: ['b/4'], duration: 'hr' }]
    },
    {
        id: 'eighth-two-sixteenths',
        name: 'Eighth + 2 Sixteenths',
        vexflow: [
            { keys: ['b/4'], duration: '8' },
            { keys: ['b/4'], duration: '16' },
            { keys: ['b/4'], duration: '16' }
        ]
    },
    {
        id: 'two-sixteenths-eighth',
        name: '2 Sixteenths + Eighth',
        vexflow: [
            { keys: ['b/4'], duration: '16' },
            { keys: ['b/4'], duration: '16' },
            { keys: ['b/4'], duration: '8' }
        ]
    },
    {
        id: 'triplet-eighths',
        name: 'Triplet Eighths',
        vexflow: [
            { keys: ['b/4'], duration: '8', triplet: true },
            { keys: ['b/4'], duration: '8', triplet: true },
            { keys: ['b/4'], duration: '8', triplet: true }
        ]
    }
];

console.log('Testing VexFlow patterns...');

patterns.forEach(pattern => {
    console.log(`\n--- Testing ${pattern.id} (${pattern.name}) ---`);

    try {
        // Simulate VexFlow note creation
        pattern.vexflow.forEach((noteData, index) => {
            console.log(`Note ${index + 1}:`, noteData);

            // Check for potential issues
            if (!noteData.keys || !Array.isArray(noteData.keys)) {
                console.error(`  ERROR: Invalid keys for note ${index + 1}`);
            }

            if (!noteData.duration) {
                console.error(`  ERROR: Missing duration for note ${index + 1}`);
            }

            // Check dotted note configuration
            if (noteData.dots && noteData.duration.includes('d')) {
                console.warn(`  WARNING: Both dots property and 'd' suffix found in ${noteData.duration}`);
            }

            if (noteData.triplet) {
                console.log(`  INFO: Triplet note detected`);
            }
        });

        console.log(`✓ Pattern ${pattern.id} looks valid`);

    } catch (error) {
        console.error(`✗ Pattern ${pattern.id} has errors:`, error.message);
    }
});

console.log('\n--- Summary ---');
console.log(`Tested ${patterns.length} patterns`);
console.log('Check console output above for any errors or warnings');