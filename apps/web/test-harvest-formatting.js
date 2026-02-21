// Test script to verify TBS weight formatting changes
// Run this in browser console to test the formatting

// Test TBS weight formatting with 2 decimal places
const testWeights = [150, 150.1, 150.12, 150.126, 150.2536, 123.4567];

console.log("=== TBS Weight Formatting Test ===");
console.log("Testing toFixed(2) formatting for various weight values:");

testWeights.forEach(weight => {
  const formatted = weight.toFixed(2);
  console.log(`${weight} kg → ${formatted} kg`);
});

// Test the specific case mentioned in requirements
console.log("\n=== Specific Test Cases ===");
console.log(`150 kg → ${(150).toFixed(2)} kg (should be 150.00)`);
console.log(`150.2536 kg → ${(150.2536).toFixed(2)} kg (should be 150.25)`);

// Test sample harvest record formatting
console.log("\n=== Sample Harvest Record Display ===");
const sampleRecord = {
  beratTbs: 150.2536,
  block: { kodeBlok: "B001" }
};

console.log(`Berat TBS: ${sampleRecord.beratTbs.toFixed(2)} kg`);
console.log(`Toast notification: Blok ${sampleRecord.block.kodeBlok} - ${sampleRecord.beratTbs.toFixed(2)} kg`);

console.log("\n✅ All formatting tests completed!");