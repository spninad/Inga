/**
 * Dark Mode Test Verification Script
 * 
 * This file helps verify that our dark mode implementation is working correctly
 * by checking color definitions and theme consistency.
 */

import { Colors } from '../constants/Colors';

interface ColorTestResult {
  category: string;
  passed: boolean;
  issues: string[];
}

// Test that all dark mode colors are properly defined
function testColorDefinitions(): ColorTestResult {
  const result: ColorTestResult = {
    category: 'Color Definitions',
    passed: true,
    issues: []
  };

  const lightColors = Object.keys(Colors.light);
  const darkColors = Object.keys(Colors.dark);

  // Check that light and dark have the same keys
  const missingInDark = lightColors.filter(key => !darkColors.includes(key));
  const missingInLight = darkColors.filter(key => !lightColors.includes(key));

  if (missingInDark.length > 0) {
    result.passed = false;
    result.issues.push(`Missing in dark theme: ${missingInDark.join(', ')}`);
  }

  if (missingInLight.length > 0) {
    result.passed = false;
    result.issues.push(`Missing in light theme: ${missingInLight.join(', ')}`);
  }

  // Check that colors are not the same between light and dark
  const sameCounts = lightColors.filter(key => 
    Colors.light[key as keyof typeof Colors.light] === Colors.dark[key as keyof typeof Colors.dark]
  );

  if (sameCounts.length > 2) { // Allow a few to be the same (like primary brand color)
    result.passed = false;
    result.issues.push(`Too many identical colors between themes: ${sameCounts.join(', ')}`);
  }

  return result;
}

// Test color contrast and accessibility
function testColorContrast(): ColorTestResult {
  const result: ColorTestResult = {
    category: 'Color Contrast',
    passed: true,
    issues: []
  };

  // Basic checks for readability
  const lightTheme = Colors.light;
  const darkTheme = Colors.dark;

  // Check that text colors are sufficiently different from backgrounds
  if (lightTheme.text === lightTheme.background) {
    result.passed = false;
    result.issues.push('Light theme: text and background colors are identical');
  }

  if (darkTheme.text === darkTheme.background) {
    result.passed = false;
    result.issues.push('Dark theme: text and background colors are identical');
  }

  return result;
}

// Run all tests
export function runDarkModeTests(): { passed: boolean; results: ColorTestResult[] } {
  const results = [
    testColorDefinitions(),
    testColorContrast()
  ];

  const passed = results.every(result => result.passed);

  return { passed, results };
}

// Log test results
export function logTestResults() {
  const { passed, results } = runDarkModeTests();
  
  console.log('🌓 Dark Mode Implementation Test Results');
  console.log('=' * 50);
  
  results.forEach(result => {
    const emoji = result.passed ? '✅' : '❌';
    console.log(`${emoji} ${result.category}: ${result.passed ? 'PASSED' : 'FAILED'}`);
    
    if (result.issues.length > 0) {
      result.issues.forEach(issue => {
        console.log(`   ⚠️  ${issue}`);
      });
    }
  });
  
  console.log('=' * 50);
  console.log(`Overall Result: ${passed ? '✅ ALL TESTS PASSED' : '❌ SOME TESTS FAILED'}`);
  
  return passed;
}

// Example usage
if (typeof window !== 'undefined') {
  // Only run in browser environment
  logTestResults();
}