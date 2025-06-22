#!/usr/bin/env node

import { readFileSync, writeFileSync, existsSync, readdirSync } from "fs";
import { join } from "path";
import { execSync } from "child_process";

/**
 * README demo update automation script
 * Updates README.md with new demo video links when significant changes are detected
 */

interface DemoVideoInfo {
  scenario: string;
  theme: string;
  filename: string;
  url?: string;
}

interface ReadmeUpdateOptions {
  readmePath: string;
  demoVideosDir: string;
  repositoryUrl: string;
  dryRun?: boolean;
}

function findDemoVideos(demoVideosDir: string): DemoVideoInfo[] {
  if (!existsSync(demoVideosDir)) {
    console.warn(`⚠️ Demo videos directory not found: ${demoVideosDir}`);
    return [];
  }
  
  const videos = readdirSync(demoVideosDir)
    .filter((file: string) => file.endsWith('.webm'))
    .map((filename: string) => {
      // Parse filename: scenario-theme-timestamp.webm or scenario-timestamp.webm
      const match = filename.match(/^([^-]+)(?:-([^-]+))?-(\d{4}-\d{2}-\d{2}T\d{2}-\d{2}-\d{2})\.webm$/);
      if (!match) {
        console.warn(`⚠️ Could not parse video filename: ${filename}`);
        return null;
      }
      
      const [, scenario, theme, timestamp] = match;
      return {
        scenario,
        theme: theme || 'light',
        filename,
        timestamp
      };
    })
    .filter((video: DemoVideoInfo | null): video is DemoVideoInfo => video !== null)
    .sort((a: DemoVideoInfo, b: DemoVideoInfo) => {
      // Sort by scenario first, then by theme (light before dark)
      if (a.scenario !== b.scenario) {
        return a.scenario.localeCompare(b.scenario);
      }
      return a.theme.localeCompare(b.theme);
    });
  
  return videos;
}

function generateVideoMarkdown(videos: DemoVideoInfo[], repositoryUrl: string): string {
  // Group videos by scenario
  const grouped = videos.reduce((acc, video) => {
    if (!acc[video.scenario]) {
      acc[video.scenario] = [];
    }
    acc[video.scenario].push(video);
    return acc;
  }, {} as Record<string, DemoVideoInfo[]>);
  
  let markdown = '';
  
  for (const [scenario, scenarioVideos] of Object.entries(grouped)) {
    // Use the primary video (prefer dark theme, or light if dark not available)
    const primaryVideo = scenarioVideos.find(v => v.theme === 'dark') || scenarioVideos[0];
    
    if (primaryVideo) {
      // Create video embed markdown (using GitHub user-attachments format)
      markdown += `### ${scenario.charAt(0).toUpperCase() + scenario.slice(1)} Demo\n\n`;
      markdown += `https://github.com/user-attachments/assets/placeholder-${scenario}-${primaryVideo.theme}\n\n`;
      
      // Add theme variants if both exist
      if (scenarioVideos.length > 1) {
        markdown += `<details>\n`;
        markdown += `<summary>Other themes</summary>\n\n`;
        
        for (const video of scenarioVideos) {
          if (video !== primaryVideo) {
            markdown += `**${video.theme} theme**: [${video.filename}](${repositoryUrl}/releases/latest/download/${video.filename})\n\n`;
          }
        }
        
        markdown += `</details>\n\n`;
      }
    }
  }
  
  return markdown.trim();
}

function updateReadmeContent(content: string, newDemoSection: string): string {
  // Look for existing demo section
  const demoSectionStart = content.indexOf('## Demo');
  const demoSectionStartAlt = content.indexOf('# Demo');
  
  let actualStart = -1;
  if (demoSectionStart !== -1) {
    actualStart = demoSectionStart;
  } else if (demoSectionStartAlt !== -1) {
    actualStart = demoSectionStartAlt;
  }
  
  if (actualStart !== -1) {
    // Find the end of the demo section (next ## heading or end of file)
    const afterDemoStart = actualStart + (actualStart === demoSectionStart ? 7 : 6); // "## Demo" or "# Demo"
    const nextSectionMatch = content.slice(afterDemoStart).match(/\n(##?\s)/);
    const demoSectionEnd = nextSectionMatch 
      ? actualStart + afterDemoStart + nextSectionMatch.index!
      : content.length;
    
    // Replace the demo section
    const beforeDemo = content.slice(0, actualStart);
    const afterDemo = content.slice(demoSectionEnd);
    
    return beforeDemo + `## Demo\n\n${newDemoSection}\n\n` + afterDemo;
  } else {
    // Look for a good place to insert the demo section
    // Try to insert after the initial description but before installation
    const installationMatch = content.match(/\n(##?\s*(Installation|Install|Getting Started|Setup))/i);
    
    if (installationMatch && installationMatch.index !== undefined) {
      const insertPoint = installationMatch.index;
      const beforeInsert = content.slice(0, insertPoint);
      const afterInsert = content.slice(insertPoint);
      
      return beforeInsert + `\n## Demo\n\n${newDemoSection}\n` + afterInsert;
    } else {
      // Fallback: append at the end
      return content + `\n\n## Demo\n\n${newDemoSection}\n`;
    }
  }
}

function findExistingVideoEmbeds(content: string): string[] {
  // Look for existing GitHub video embeds
  const videoRegex = /\[([^\]]+\.webm)\]\(([^)]+)\)/g;
  const embeds: string[] = [];
  let match;
  
  while ((match = videoRegex.exec(content)) !== null) {
    embeds.push(match[0]); // Full match
  }
  
  // Also look for direct GitHub user-attachments URLs
  const attachmentRegex = /https:\/\/github\.com\/user-attachments\/assets\/[a-f0-9-]+/g;
  while ((match = attachmentRegex.exec(content)) !== null) {
    embeds.push(match[0]);
  }
  
  return embeds;
}

async function updateReadmeWithDemos(options: ReadmeUpdateOptions): Promise<boolean> {
  const { readmePath, demoVideosDir, repositoryUrl, dryRun = false } = options;
  
  console.log('📝 Updating README with demo videos...');
  console.log(`   README: ${readmePath}`);
  console.log(`   Videos: ${demoVideosDir}`);
  console.log(`   Repository: ${repositoryUrl}`);
  
  if (!existsSync(readmePath)) {
    console.error(`❌ README not found: ${readmePath}`);
    return false;
  }
  
  // Read current README content
  const originalContent = readFileSync(readmePath, 'utf-8');
  
  // Find demo videos
  const videos = findDemoVideos(demoVideosDir);
  console.log(`📹 Found ${videos.length} demo videos`);
  
  if (videos.length === 0) {
    console.log('⚠️ No demo videos found, skipping README update');
    return false;
  }
  
  // Check for existing video embeds
  const existingEmbeds = findExistingVideoEmbeds(originalContent);
  console.log(`🔍 Found ${existingEmbeds.length} existing video embed(s) in README`);
  
  // Generate new demo section
  const newDemoSection = generateVideoMarkdown(videos, repositoryUrl);
  
  // Update README content
  const updatedContent = updateReadmeContent(originalContent, newDemoSection);
  
  // Check if content actually changed
  if (updatedContent === originalContent) {
    console.log('✅ README already up to date');
    return false;
  }
  
  console.log('📝 README content changes detected');
  
  if (dryRun) {
    console.log('🔍 DRY RUN - Would update README with:');
    console.log('---');
    console.log(newDemoSection);
    console.log('---');
    return true;
  }
  
  // Write updated content
  try {
    writeFileSync(readmePath, updatedContent, 'utf-8');
    console.log('✅ README updated successfully');
    return true;
  } catch (error) {
    console.error('❌ Failed to update README:', error);
    return false;
  }
}

async function main() {
  const args = process.argv.slice(2);
  
  if (args.includes('--help') || args.includes('-h')) {
    console.log('Demo README Update Tool');
    console.log('=======================');
    console.log('');
    console.log('Usage: update-readme-demos.ts [options]');
    console.log('');
    console.log('Options:');
    console.log('  --readme <path>       Path to README.md (default: ./README.md)');
    console.log('  --videos <dir>        Directory containing demo videos (default: ./demo-recordings)');
    console.log('  --repo <url>          Repository URL for video links (default: auto-detect from git)');
    console.log('  --dry-run             Show what would be changed without writing');
    console.log('  --help, -h            Show this help message');
    console.log('');
    console.log('Examples:');
    console.log('  update-readme-demos.ts');
    console.log('  update-readme-demos.ts --dry-run');
    console.log('  update-readme-demos.ts --videos ./my-videos --readme ./docs/README.md');
    process.exit(0);
  }
  
  // Parse arguments
  const readmePath = args.find((arg, i) => args[i-1] === '--readme') || join(process.cwd(), 'README.md');
  const demoVideosDir = args.find((arg, i) => args[i-1] === '--videos') || join(process.cwd(), 'demo-recordings');
  let repositoryUrl = args.find((arg, i) => args[i-1] === '--repo');
  const dryRun = args.includes('--dry-run');
  
  // Auto-detect repository URL if not provided
  if (!repositoryUrl) {
    try {
      const remoteUrl = execSync('git config --get remote.origin.url', { encoding: 'utf8' }).trim();
      
      // Convert SSH URLs to HTTPS
      if (remoteUrl.startsWith('git@github.com:')) {
        repositoryUrl = remoteUrl.replace('git@github.com:', 'https://github.com/').replace('.git', '');
      } else if (remoteUrl.startsWith('https://github.com/')) {
        repositoryUrl = remoteUrl.replace('.git', '');
      } else {
        throw new Error('Could not parse repository URL');
      }
    } catch {
      console.error('❌ Could not auto-detect repository URL. Please provide --repo argument.');
      process.exit(1);
    }
  }
  
  console.log('📝 Demo README Update Tool');
  console.log('===========================');
  console.log(`Mode: ${dryRun ? 'DRY RUN' : 'UPDATE'}`);
  console.log('');
  
  try {
    const updated = await updateReadmeWithDemos({
      readmePath,
      demoVideosDir,
      repositoryUrl,
      dryRun
    });
    
    // Set GitHub Actions outputs if running in CI
    if (process.env.GITHUB_ACTIONS) {
      console.log(`\n::set-output name=readme_updated::${updated}`);
    }
    
    process.exit(updated ? 0 : 1);
    
  } catch (error) {
    console.error('❌ README update failed:', error instanceof Error ? error.message : error);
    process.exit(1);
  }
}

if (
  import.meta.url === `file://${process.argv[1]}` ||
  process.argv[1]?.endsWith("/update-readme-demos.ts")
) {
  main().catch(console.error);
}

export { updateReadmeWithDemos, type ReadmeUpdateOptions };