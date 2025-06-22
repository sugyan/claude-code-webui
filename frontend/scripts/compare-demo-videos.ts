#!/usr/bin/env node

import { spawn } from "child_process";
import { existsSync, statSync } from "fs";

/**
 * Demo video comparison script
 * Compares two demo videos using frame-by-frame analysis
 */

interface VideoComparisonResult {
  similarityPercentage: number;
  frameCountDiff: number;
  sizeDiff: number;
  details: string;
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

async function compareVideoFrames(video1Path: string, video2Path: string): Promise<VideoComparisonResult> {
  const [hashes1, hashes2] = await Promise.all([
    generateFrameHashes(video1Path),
    generateFrameHashes(video2Path)
  ]);
  
  if (hashes1.length === 0 || hashes2.length === 0) {
    return {
      similarityPercentage: 0,
      frameCountDiff: Math.abs(hashes1.length - hashes2.length),
      sizeDiff: 0,
      details: "Could not generate frame hashes for comparison"
    };
  }
  
  const minFrames = Math.min(hashes1.length, hashes2.length);
  const frameCountDiff = Math.abs(hashes1.length - hashes2.length);
  
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
  
  // Get file sizes
  const size1 = statSync(video1Path).size;
  const size2 = statSync(video2Path).size;
  const sizeDiff = Math.abs(size1 - size2);
  
  return { 
    similarityPercentage, 
    frameCountDiff, 
    sizeDiff,
    details 
  };
}

async function compareVideos(video1Path: string, video2Path: string, threshold: number = 95): Promise<boolean> {
  console.log('🎬 Demo Video Comparison Tool');
  console.log('==============================');
  console.log(`Video 1: ${video1Path}`);
  console.log(`Video 2: ${video2Path}`);
  console.log(`Similarity threshold: ${threshold}%`);
  console.log('');

  // Check if files exist
  if (!existsSync(video1Path)) {
    console.error(`❌ Video 1 not found: ${video1Path}`);
    return false;
  }
  
  if (!existsSync(video2Path)) {
    console.error(`❌ Video 2 not found: ${video2Path}`);
    return false;
  }

  console.log('🔍 Comparing videos...');
  
  try {
    const result = await compareVideoFrames(video1Path, video2Path);
    
    console.log('📊 Comparison Results:');
    console.log('=' .repeat(50));
    console.log(`Similarity: ${result.similarityPercentage.toFixed(1)}%`);
    console.log(`${result.details}`);
    
    if (result.sizeDiff > 0) {
      console.log(`Size difference: ${result.sizeDiff} bytes`);
    }
    
    const hasSignificantChanges = result.similarityPercentage < threshold;
    
    if (hasSignificantChanges) {
      console.log(`🔄 SIGNIFICANT CHANGES DETECTED (< ${threshold}% similar)`);
      console.log('💡 README update may be needed');
    } else {
      console.log(`✅ NO SIGNIFICANT CHANGES (>= ${threshold}% similar)`);
      console.log('💡 README update not needed');
    }
    
    // Set GitHub Actions outputs if running in CI
    if (process.env.GITHUB_ACTIONS) {
      console.log(`\n::set-output name=changes_detected::${hasSignificantChanges}`);
      console.log(`::set-output name=similarity_percentage::${result.similarityPercentage.toFixed(1)}`);
    }
    
    // Return true if changes detected (for script exit code)
    return hasSignificantChanges;
    
  } catch (error) {
    console.error('❌ Video comparison failed:', error instanceof Error ? error.message : error);
    return false;
  }
}

async function main() {
  const args = process.argv.slice(2);
  
  if (args.length === 0 || args.includes('--help') || args.includes('-h')) {
    console.log('🎬 Demo Video Comparison Tool');
    console.log('==============================');
    console.log('');
    console.log('Usage:');
    console.log('  compare-demo-videos.ts <video1> <video2> [threshold]');
    console.log('');
    console.log('Examples:');
    console.log('  compare-demo-videos.ts video1.webm video2.webm');
    console.log('  compare-demo-videos.ts video1.webm video2.webm 90');
    console.log('');
    console.log('Options:');
    console.log('  video1      Path to first video file');
    console.log('  video2      Path to second video file');
    console.log('  threshold   Similarity threshold percentage (default: 95)');
    console.log('  --help, -h  Show this help message');
    console.log('');
    console.log('Exit codes:');
    console.log('  0 - No significant changes detected');
    console.log('  1 - Significant changes detected');
    console.log('  2 - Error occurred');
    process.exit(0);
  }
  
  if (args.length < 2) {
    console.error('❌ Insufficient arguments');
    console.error('Usage: compare-demo-videos.ts <video1> <video2> [threshold]');
    process.exit(2);
  }
  
  const [video1Path, video2Path, thresholdArg] = args;
  const threshold = thresholdArg ? parseFloat(thresholdArg) : 95;
  
  try {
    const changesDetected = await compareVideos(video1Path, video2Path, threshold);
    
    // Exit with code 1 if changes detected, 0 if no changes
    process.exit(changesDetected ? 1 : 0);
    
  } catch (error) {
    console.error('❌ Unexpected error:', error instanceof Error ? error.message : error);
    process.exit(2);
  }
}

if (
  import.meta.url === `file://${process.argv[1]}` ||
  process.argv[1]?.endsWith("/compare-demo-videos.ts")
) {
  main().catch(console.error);
}

export { compareVideos, compareVideoFrames, type VideoComparisonResult };