#!/usr/bin/env node
/**
 * GUARDRAILS CHECK - Production Safety Verification
 * 
 * Prevents forbidden patterns from entering the codebase:
 * - Vendor ID spoofing via headers
 * - Duplicate Stripe refund call sites
 * 
 * This script runs before every build to enforce security invariants.
 */

const fs = require('fs');
const path = require('path');

// Forbidden patterns that indicate security vulnerabilities
const FORBIDDEN_PATTERNS = [
  {
    name: 'Vendor ID Header Spoofing',
    pattern: /headers?\.get\s*\(\s*['"]x-vendor-id['"]\s*\)/gi,
    severity: 'CRITICAL',
    explanation: 'Vendor identity must come from authenticated session only (requireVendor)',
  },
  {
    name: 'Direct x-vendor-id Usage',
    pattern: /['"]x-vendor-id['"]\s*:/gi,
    severity: 'CRITICAL',
    explanation: 'Header-based vendor identification is forbidden',
    excludePatterns: [
      /\/\*[\s\S]*?\*\//g,  // Multi-line comments
      /\/\/.*/g,             // Single-line comments
    ],
  },
];

// Special check: Stripe refund calls must only exist in ONE file
const STRIPE_REFUND_PATTERN = /stripe\.refunds\.create\s*\(/gi;
const ALLOWED_REFUND_FILE = 'lib/payments/refunds.ts';

// Files and directories to ignore
const IGNORE_PATTERNS = [
  'node_modules',
  '.next',
  'dist',
  'build',
  '.git',
  'coverage',
  'scripts/guardrails-check.js', // This file itself
];

const violations = [];
let filesScanned = 0;

/**
 * Recursively find all TypeScript/JavaScript files
 */
function findSourceFiles(dir, fileList = []) {
  const files = fs.readdirSync(dir);

  files.forEach((file) => {
    const filePath = path.join(dir, file);
    const stat = fs.statSync(filePath);

    // Skip ignored directories
    if (stat.isDirectory()) {
      const shouldIgnore = IGNORE_PATTERNS.some((pattern) =>
        filePath.includes(pattern)
      );
      if (!shouldIgnore) {
        findSourceFiles(filePath, fileList);
      }
    } else if (stat.isFile()) {
      // Only scan TypeScript and JavaScript files
      if (/\.(ts|tsx|js|jsx)$/.test(file)) {
        fileList.push(filePath);
      }
    }
  });

  return fileList;
}

/**
 * Remove comments from code to avoid false positives
 */
function removeComments(content) {
  // Remove multi-line comments
  let cleaned = content.replace(/\/\*[\s\S]*?\*\//g, '');
  // Remove single-line comments
  cleaned = cleaned.replace(/\/\/.*/g, '');
  return cleaned;
}

/**
 * Check file for forbidden patterns
 */
function checkFile(filePath) {
  filesScanned++;
  const content = fs.readFileSync(filePath, 'utf-8');
  const lines = content.split('\n');
  
  // Clean content for pattern checking (remove comments)
  const cleanedContent = removeComments(content);

  // Check forbidden patterns
  FORBIDDEN_PATTERNS.forEach((forbiddenPattern) => {
    const matches = [...cleanedContent.matchAll(forbiddenPattern.pattern)];
    
    if (matches.length > 0) {
      // Find line numbers for each match
      matches.forEach((match) => {
        const matchIndex = content.indexOf(match[0]);
        const lineNumber = content.substring(0, matchIndex).split('\n').length;
        
        violations.push({
          file: filePath,
          line: lineNumber,
          pattern: forbiddenPattern.name,
          severity: forbiddenPattern.severity,
          explanation: forbiddenPattern.explanation,
          snippet: lines[lineNumber - 1]?.trim(),
        });
      });
    }
  });

  // Check Stripe refund pattern (special case)
  const refundMatches = [...cleanedContent.matchAll(STRIPE_REFUND_PATTERN)];
  if (refundMatches.length > 0) {
    const relativePath = path.relative(process.cwd(), filePath);
    
    // Only allowed in lib/payments/refunds.ts
    if (!relativePath.endsWith(ALLOWED_REFUND_FILE)) {
      refundMatches.forEach((match) => {
        const matchIndex = content.indexOf(match[0]);
        const lineNumber = content.substring(0, matchIndex).split('\n').length;
        
        violations.push({
          file: filePath,
          line: lineNumber,
          pattern: 'Unauthorized Stripe Refund Call',
          severity: 'CRITICAL',
          explanation: `Stripe refunds must ONLY be created in ${ALLOWED_REFUND_FILE}`,
          snippet: lines[lineNumber - 1]?.trim(),
        });
      });
    }
  }
}

/**
 * Main execution
 */
function main() {
  console.log('🔍 Running guardrails check...\n');

  const startTime = Date.now();
  const sourceFiles = findSourceFiles(process.cwd());

  console.log(`📁 Scanning ${sourceFiles.length} files...\n`);

  sourceFiles.forEach(checkFile);

  const duration = Date.now() - startTime;

  console.log(`✓ Scanned ${filesScanned} files in ${duration}ms\n`);

  if (violations.length > 0) {
    console.error('❌ GUARDRAILS CHECK FAILED\n');
    console.error(`Found ${violations.length} security violation(s):\n`);

    violations.forEach((violation, index) => {
      const relativePath = path.relative(process.cwd(), violation.file);
      console.error(`${index + 1}. [${violation.severity}] ${violation.pattern}`);
      console.error(`   File: ${relativePath}:${violation.line}`);
      console.error(`   Code: ${violation.snippet}`);
      console.error(`   Fix:  ${violation.explanation}\n`);
    });

    console.error('🛑 Build blocked. Fix violations above before deploying.\n');
    process.exit(1);
  }

  console.log('✅ GUARDRAILS CHECK PASSED\n');
  console.log('All security invariants verified:');
  console.log('  ✓ No vendor ID header spoofing');
  console.log(`  ✓ Stripe refunds only in ${ALLOWED_REFUND_FILE}`);
  console.log('  ✓ No forbidden patterns detected\n');
  
  process.exit(0);
}

main();
