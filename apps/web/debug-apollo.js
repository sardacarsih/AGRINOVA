try {
    const react = require('@apollo/client/react');
    console.log('Exports from @apollo/client/react:', Object.keys(react));
} catch (e) {
    console.log('Could not require @apollo/client/react:', e.message);
}

try {
    const reactHooks = require('@apollo/client/react/hooks');
    console.log('Exports from @apollo/client/react/hooks:', Object.keys(reactHooks));
} catch (e) {
    console.log('Could not require @apollo/client/react/hooks:', e.message);
}
