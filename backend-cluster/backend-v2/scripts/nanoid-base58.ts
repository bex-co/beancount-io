import 'dotenv/config';

import { customAlphabet } from 'nanoid';

// Base58 alphabet (Bitcoin/IPFS style - excludes 0, O, I, l to avoid confusion)
const BASE58_ALPHABET = '123456789ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnopqrstuvwxyz';

// Create nanoid generator with Base58 alphabet
// Default length of 64 characters provides similar collision resistance to standard nanoid
const nanoidBase58 = customAlphabet(BASE58_ALPHABET, 64);

/**
 * Generates Base58-encoded nanoid strings
 * Base58 is URL-safe and avoids confusing characters (0, O, I, l)
 */
async function generateNanoidBase58() {
  console.log('🔑 Generating 10 Base58-encoded nanoid strings...');
  console.log('================================================\n');

  console.log('Alphabet:', BASE58_ALPHABET);
  console.log('Length: 64 characters');
  console.log('Character set size:', BASE58_ALPHABET.length);
  console.log('\nGenerated IDs:\n');

  for (let i = 1; i <= 10; i++) {
    const id = nanoidBase58();
    console.log(id);
  }

  console.log('\n================================================');
  console.log('✅ Generation complete!');
}

// Run the script
generateNanoidBase58().catch((error) => {
  console.error('❌ Generation failed with error:', error);
  process.exit(1);
});
