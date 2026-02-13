/**
 * Quick test script for peptide category mapping improvements
 * Run: npx tsx test-peptide-mapping.mjs
 */

// Since we're using TypeScript, we'll use dynamic imports
const tests = [
  { input: "Oral Peptides", expected: "peptides", shouldMatch: true },
  { input: "Peptides (Oral)", expected: "peptides", shouldMatch: true },
  { input: "Peptide Capsules", expected: "peptides", shouldMatch: true },
  { input: "Capsules", expected: "peptides", shouldMatch: true },
  { input: "Peptide Nasal Spray", expected: "peptides", shouldMatch: true },
  { input: "Spray", expected: null, shouldMatch: false }, // Must NOT map (single token)
];

async function runTests() {
  const { mapCategoryToSlug, normalizeCategoryInput } = await import("./lib/utils/category.ts");

  console.log("Testing Peptide Category Mappings\n" + "=".repeat(50));

  let passed = 0;
  let failed = 0;

  for (const test of tests) {
    const result = mapCategoryToSlug(test.input);
    const normalized = normalizeCategoryInput(test.input);
    
    const success = test.shouldMatch 
      ? (result.matched && result.slug === test.expected)
      : !result.matched;
    
    if (success) {
      passed++;
      console.log(`✓ "${test.input}"`);
      console.log(`  Normalized: "${normalized}"`);
      if (result.matched) {
        console.log(`  → ${result.slug} (${result.reason}, ${result.confidence})`);
      } else {
        console.log(`  → NO MATCH (as expected)`);
      }
    } else {
      failed++;
      console.log(`✗ "${test.input}"`);
      console.log(`  Normalized: "${normalized}"`);
      console.log(`  Expected: ${test.shouldMatch ? test.expected : "NO MATCH"}`);
      console.log(`  Got: ${result.matched ? result.slug : "NO MATCH"}`);
      if (!result.matched && result.error) {
        console.log(`  Error: ${result.error}`);
      }
    }
    console.log();
  }

  console.log("=".repeat(50));
  console.log(`Results: ${passed} passed, ${failed} failed`);

  if (failed > 0) {
    process.exit(1);
  }
}

runTests().catch(console.error);
