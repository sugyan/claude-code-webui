#!/usr/bin/env node

import { spawn } from "child_process";
import { existsSync, readdirSync, statSync } from "fs";
import { join } from "path";

/**
 * Demo video comparison script for CI/CD pipeline
 * Compares new demo videos with reference videos to determine if README needs updating
 */

interface VideoComparisonResult {
  scenario: string;
  theme: string;
  hasSignificantChanges: boolean;
  similarityPercentage: number;
  frameCountDiff: number;
  sizeDiff: number;
  details: string;
}

interface ComparisonSummary {
  overallChangesDetected: boolean;
  changedScenarios: string[];
  results: VideoComparisonResult[];
  shouldUpdateReadme: boolean;
}

async function generateFrameHashes(videoPath: string): Promise<string[]> {
  try {
    const output = await new Promise<string>((resolve, reject) => {
      const child = spawn('ffmpeg', [
        '-i', videoPath,
        '-vf', 'scale=160:90',
        '-f', 'framemd5',
        '-'
      ], { stdio: ['pipe', 'pipe', 'pipe'] });
      
      let output = '';
      child.stdout.on('data', (data) => {
        output += data.toString();
      });
      
      child.on('close', (code) => {
        if (code === 0) {
          resolve(output);
        } else {
          reject(new Error(`ffmpeg failed with code ${code}`));
        }
      });
      
      child.on('error', reject);
    });
    
    const lines = output.split('\n').filter(line => line.startsWith('0,'));
    return lines.map(line => line.split(',')[2]);
  } catch (error) {
    console.warn(`Could not generate frame hashes for ${videoPath}: ${error}`);
    return [];
  }
}

async function compareVideoFrames(video1Path: string, video2Path: string): Promise<{
  similarityPercentage: number;
  frameCountDiff: number;
  details: string;
}> {
  const [hashes1, hashes2] = await Promise.all([
    generateFrameHashes(video1Path),
    generateFrameHashes(video2Path)
  ]);
  
  if (hashes1.length === 0 || hashes2.length === 0) {
    return {
      similarityPercentage: 0,
      frameCountDiff: Math.abs(hashes1.length - hashes2.length),
      details: "Could not generate frame hashes for comparison"
    };
  }
  
  const minFrames = Math.min(hashes1.length, hashes2.length);
  const maxFrames = Math.max(hashes1.length, hashes2.length);
  const frameCountDiff = maxFrames - minFrames;
  
  let identicalFrames = 0;
  
  for (let i = 0; i < minFrames; i++) {
    if (hashes1[i] === hashes2[i]) {
      identicalFrames++;
    }
  }
  
  const similarityPercentage = minFrames > 0 ? (identicalFrames / minFrames) * 100 : 0;
  
  let details = `Frames: ${hashes1.length} vs ${hashes2.length}, `;
  details += `Identical: ${identicalFrames}/${minFrames} (${similarityPercentage.toFixed(1)}%)`;
  
  if (frameCountDiff > 0) {
    details += `, Frame count difference: ${frameCountDiff}`;
  }
  
  return { similarityPercentage, frameCountDiff, details };
}

function getVideoFiles(dir: string, pattern?: string): string[] {
  if (!existsSync(dir)) {
    return [];
  }
  
  return readdirSync(dir)
    .filter(file => file.endsWith('.webm'))
    .filter(file => !pattern || file.includes(pattern))
    .map(file => join(dir, file));
}

function parseVideoFilename(filename: string): { scenario: string; theme: string; timestamp: string } | null {
  // Expected format: scenario-theme-timestamp.webm or scenario-timestamp.webm
  const match = filename.match(/^([^-]+)(?:-([^-]+))?-(\d{4}-\d{2}-\d{2}T\d{2}-\d{2}-\d{2})\.webm$/);
  if (!match) {
    return null;
  }
  
  const [, scenario, theme, timestamp] = match;
  return {
    scenario,
    theme: theme || 'light',
    timestamp
  };
}

async function compareVideos(
  currentVideosDir: string,
  referenceVideosDir: string,
  threshold: number = 95 // Similarity threshold percentage
): Promise<ComparisonSummary> {
  const currentVideos = getVideoFiles(currentVideosDir);
  const referenceVideos = getVideoFiles(referenceVideosDir);
  
  console.log(`🔍 Comparing ${currentVideos.length} current videos with ${referenceVideos.length} reference videos`);
  
  const results: VideoComparisonResult[] = [];
  const changedScenarios: Set<string> = new Set();
  
  for (const currentVideo of currentVideos) {
    const currentFilename = currentVideo.split('/').pop()!;
    const parsed = parseVideoFilename(currentFilename);
    
    if (!parsed) {
      console.warn(`⚠️ Could not parse filename: ${currentFilename}`);
      continue;
    }
    
    const { scenario, theme } = parsed;
    
    // Find matching reference video
    const matchingReference = referenceVideos.find(refVideo => {
      const refFilename = refVideo.split('/').pop()!;
      const refParsed = parseVideoFilename(refFilename);
      return refParsed && refParsed.scenario === scenario && refParsed.theme === theme;
    });
    
    if (!matchingReference) {
      console.log(`📹 New video detected: ${scenario} (${theme})`);
      results.push({
        scenario,
        theme,
        hasSignificantChanges: true,
        similarityPercentage: 0,
        frameCountDiff: 0,
        sizeDiff: 0,
        details: "New video - no reference to compare"
      });
      changedScenarios.add(scenario);
      continue;
    }
    
    console.log(`🔄 Comparing ${scenario} (${theme})...`);
    
    // Get file sizes
    const currentSize = statSync(currentVideo).size;
    const referenceSize = statSync(matchingReference).size;
    const sizeDiff = Math.abs(currentSize - referenceSize);
    
    // Compare frames
    const comparison = await compareVideoFrames(currentVideo, matchingReference);
    const hasSignificantChanges = comparison.similarityPercentage < threshold;
    
    results.push({
      scenario,
      theme,
      hasSignificantChanges,
      similarityPercentage: comparison.similarityPercentage,
      frameCountDiff: comparison.frameCountDiff,
      sizeDiff,
      details: comparison.details
    });
    
    if (hasSignificantChanges) {
      changedScenarios.add(scenario);
      console.log(`📊 ${scenario} (${theme}): ${comparison.similarityPercentage.toFixed(1)}% similar - CHANGED`);
    } else {
      console.log(`✅ ${scenario} (${theme}): ${comparison.similarityPercentage.toFixed(1)}% similar - NO CHANGE`);
    }
  }
  
  const overallChangesDetected = changedScenarios.size > 0;
  const shouldUpdateReadme = overallChangesDetected;
  
  return {
    overallChangesDetected,
    changedScenarios: Array.from(changedScenarios),
    results,
    shouldUpdateReadme
  };
}

function printSummary(summary: ComparisonSummary): void {
  console.log('\n📋 Video Comparison Summary');
  console.log('=' .repeat(50));
  
  if (summary.overallChangesDetected) {
    console.log(`🔄 Changes detected in ${summary.changedScenarios.length} scenario(s):`);
    for (const scenario of summary.changedScenarios) {
      console.log(`   • ${scenario}`);
    }
    console.log(`\n💡 README update recommended: ${summary.shouldUpdateReadme ? 'YES' : 'NO'}`);
  } else {
    console.log('✅ No significant changes detected');
    console.log('💡 README update needed: NO');
  }
  
  console.log('\n📊 Detailed Results:');
  console.log('-'.repeat(50));
  
  for (const result of summary.results) {
    const status = result.hasSignificantChanges ? '🔄 CHANGED' : '✅ NO CHANGE';
    console.log(`${result.scenario} (${result.theme}): ${status}`);
    console.log(`   Similarity: ${result.similarityPercentage.toFixed(1)}%`);
    console.log(`   ${result.details}`);
    if (result.sizeDiff > 0) {
      console.log(`   Size difference: ${result.sizeDiff} bytes`);
    }
  }
}

async function main() {
  const args = process.argv.slice(2);
  
  if (args.length < 2) {
    console.error('Usage: compare-demo-videos.ts <current-videos-dir> <reference-videos-dir> [threshold]');
    console.error('Example: compare-demo-videos.ts ./demo-recordings ./reference-videos 95');
    process.exit(1);
  }
  
  const [currentVideosDir, referenceVideosDir, thresholdArg] = args;
  const threshold = thresholdArg ? parseFloat(thresholdArg) : 95;
  
  console.log('🎬 Demo Video Comparison Tool');
  console.log('==============================');
  console.log(`Current videos: ${currentVideosDir}`);
  console.log(`Reference videos: ${referenceVideosDir}`);
  console.log(`Similarity threshold: ${threshold}%`);
  console.log('');
  
  try {
    const summary = await compareVideos(currentVideosDir, referenceVideosDir, threshold);
    printSummary(summary);
    
    // Set GitHub Actions outputs if running in CI
    if (process.env.GITHUB_ACTIONS) {
      console.log(`\n::set-output name=changes_detected::${summary.overallChangesDetected}`);
      console.log(`::set-output name=should_update_readme::${summary.shouldUpdateReadme}`);
      console.log(`::set-output name=changed_scenarios::${summary.changedScenarios.join(',')}`);
    }
    
    // Exit with code 1 if changes detected (for conditional workflow steps)
    process.exit(summary.overallChangesDetected ? 1 : 0);
    
  } catch (error) {
    console.error('❌ Video comparison failed:', error instanceof Error ? error.message : error);
    process.exit(1);
  }
}

if (
  import.meta.url === `file://${process.argv[1]}` ||
  process.argv[1]?.endsWith("/compare-demo-videos.ts")
) {
  main().catch(console.error);
}

export { compareVideos, type ComparisonSummary, type VideoComparisonResult };