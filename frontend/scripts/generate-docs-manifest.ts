#!/usr/bin/env bun
/**
 * Documentation Manifest Generator
 * 
 * This script scans the docs directory for markdown files
 * and generates/updates the docs-manifest.ts file.
 * 
 * Usage: bun run generate-docs-manifest
 */

import { readdir, readFile, writeFile } from 'fs/promises';
import { join, dirname } from 'path';

// Get the frontend root directory (parent of scripts directory)
const FRONTEND_ROOT = dirname(import.meta.dir);
const DOCS_DIR = join(FRONTEND_ROOT, 'src/assets/docs');
const MANIFEST_FILE = join(FRONTEND_ROOT, 'src/assets/docs/docs-manifest.ts');

// Files to exclude from manifest
const EXCLUDED_FILES = [
  'docs-manifest.ts',
  'README.md',
];

// Group configuration (files will be auto-assigned to groups)
const GROUP_CONFIG: Record<string, { title: string; description: string; icon: string; order: number }> = {
  'duckdb': {
    title: 'DuckDB CRUD Integration',
    description: 'Column-oriented OLAP database for analytics and bulk operations',
    icon: '🦆',
    order: 1,
  },
  'sqlite': {
    title: 'SQLite CRUD Integration',
    description: 'Row-oriented OLTP database for transactions and simple lookups',
    icon: '🗄️',
    order: 2,
  },
  'comparison': {
    title: 'Database Comparison',
    description: 'Choose the right database for your use case',
    icon: '⚖️',
    order: 3,
  },
  'production': {
    title: 'Production Guide',
    description: 'Deploy to production with confidence',
    icon: '🚀',
    order: 4,
  },
};

// Icon mapping for section titles
const ICON_MAPPING: Record<string, string> = {
  'guide': '📖',
  'quick': '⚡',
  'start': '⚡',
  'architecture': '🏗️',
  'schema': '📋',
  'api': '🔌',
  'reference': '🔌',
  'performance': '🚀',
  'benchmark': '📊',
  'comparison': '🆚',
  'vs': '🆚',
  'use': '🎯',
  'cases': '🎯',
  'security': '🔒',
  'checklist': '🔒',
  'error': '⚠️',
  'handling': '⚠️',
  'testing': '🧪',
  'troubleshooting': '🔍',
  'integration': '📖',
  'crud': '📖',
};

interface MarkdownFile {
  id: string;
  filename: string;
  title: string;
  group: string;
  order: number;
}

/**
 * Extract title from markdown content (first h1 heading)
 */
function extractTitle(content: string): string {
  const match = content.match(/^#\s+(.+)$/m);
  if (match) {
    return match[1].trim();
  }
  return '';
}

/**
 * Determine which group a file belongs to
 */
function determineGroup(filename: string): string {
  const lowerFilename = filename.toLowerCase();
  
  for (const [group] of Object.entries(GROUP_CONFIG)) {
    if (lowerFilename.includes(group)) {
      return group;
    }
  }
  
  // Default to production for unknown files
  return 'production';
}

/**
 * Get icon for a section based on its title/filename
 */
function getIcon(filename: string, title: string): string {
  const lowerText = `${filename} ${title}`.toLowerCase();
  
  for (const [keyword, icon] of Object.entries(ICON_MAPPING)) {
    if (lowerText.includes(keyword)) {
      return icon;
    }
  }
  
  return '📄'; // Default icon
}

/**
 * Generate description from title
 */
function generateDescription(title: string, filename: string): string {
  // Try to extract from title
  const descriptions: Record<string, string> = {
    'Complete Guide': 'Full implementation guide',
    'Quick Start': 'Get started in 5 minutes',
    'Architecture': 'System architecture and design',
    'Database Schema': 'Table design and indexes',
    'API Reference': 'Backend API documentation',
    'Performance': 'Benchmarks and optimization',
    'Comparison': 'Feature and performance comparison',
    'Use Cases': 'Recommended use cases',
    'Security Checklist': 'Production security measures',
    'Error Handling': 'Graceful error management',
    'Testing Guide': 'Unit and integration tests',
    'Troubleshooting': 'Common issues and solutions',
  };
  
  for (const [key, desc] of Object.entries(descriptions)) {
    if (title.toLowerCase().includes(key.toLowerCase())) {
      return desc;
    }
  }
  
  // Generate from filename
  return `${title} documentation`;
}

/**
 * Scan docs directory for markdown files
 */
async function scanDocsFiles(): Promise<MarkdownFile[]> {
  const files: MarkdownFile[] = [];
  
  try {
    const entries = await readdir(DOCS_DIR, { withFileTypes: true });
    
    for (const entry of entries) {
      if (!entry.isFile() || !entry.name.endsWith('.md')) {
        continue;
      }
      
      if (EXCLUDED_FILES.includes(entry.name)) {
        continue;
      }
      
      const filename = entry.name.replace('.md', '');
      const filepath = join(DOCS_DIR, entry.name);
      
      // Read file to extract title
      let title = filename
        .replace(/[-_]/g, ' ')
        .replace(/\b\w/g, l => l.toUpperCase());
      
      try {
        const content = await readFile(filepath, 'utf-8');
        const extractedTitle = extractTitle(content);
        if (extractedTitle) {
          title = extractedTitle;
        }
      } catch (err) {
        console.warn(`Warning: Could not read ${entry.name}`);
      }
      
      const group = determineGroup(entry.name);
      const icon = getIcon(entry.name, title);
      const description = generateDescription(title, entry.name);
      
      files.push({
        id: filename,
        filename: entry.name,
        title,
        group,
        order: files.filter(f => f.group === group).length + 1,
      });
    }
    
    return files.sort((a, b) => {
      // Sort by group order, then by file order
      if (a.group !== b.group) {
        return GROUP_CONFIG[a.group as keyof typeof GROUP_CONFIG].order -
               GROUP_CONFIG[b.group as keyof typeof GROUP_CONFIG].order;
      }
      return a.order - b.order;
    });
  } catch (err) {
    console.error('Error scanning docs directory:', err);
    return [];
  }
}

/**
 * Generate manifest TypeScript code
 */
function generateManifest(files: MarkdownFile[]): string {
  // Group files
  const grouped: Record<string, typeof files> = {};
  for (const file of files) {
    if (!grouped[file.group]) {
      grouped[file.group] = [];
    }
    grouped[file.group].push(file);
  }
  
  // Generate section entries
  const sectionsByGroup: Record<string, string[]> = {};
  for (const [group, groupFiles] of Object.entries(grouped)) {
    sectionsByGroup[group] = groupFiles.map(file => `{
        id: '${file.id}',
        title: '${file.title}',
        icon: '${getIcon(file.filename, file.title)}',
        description: '${generateDescription(file.title, file.filename)}',
        order: ${file.order},
        tags: ['${group}', '${file.id.replace(/[-_]/g, '-')}'],
      }`);
  }
  
  // Generate groups
  const groups = Object.entries(GROUP_CONFIG)
    .filter(([groupId]) => sectionsByGroup[groupId])
    .map(([groupId, config], index) => `{
    id: '${groupId}',
    title: '${config.title}',
    description: '${config.description}',
    icon: '${config.icon}',
    order: ${index + 1},
    expanded: false,
    sections: [
      ${sectionsByGroup[groupId].join(',\n      ')}
    ],
  }`);
  
  return `/**
 * Documentation Manifest
 * 
 * AUTO-GENERATED FILE - DO NOT EDIT MANUALLY
 * This file is generated by: bun run generate-docs-manifest
 * 
 * To customize:
 * 1. Edit this file directly (changes will be overwritten on next generation)
 * 2. Or add metadata comments to markdown files (future feature)
 * 
 * Files discovered: ${files.length}
 * Generated: ${new Date().toISOString()}
 */

export interface DocSection {
  /** Unique identifier (matches markdown filename without .md) */
  id: string;
  /** Display title */
  title: string;
  /** Icon emoji */
  icon: string;
  /** Short description */
  description: string;
  /** Display order within group */
  order: number;
  /** Tags for search/filtering */
  tags?: string[];
  /** Related section IDs */
  related?: string[];
}

export interface DocGroup {
  /** Unique identifier for URL routing */
  id: string;
  /** Display title */
  title: string;
  /** Description */
  description: string;
  /** Icon emoji */
  icon: string;
  /** Display order */
  order: number;
  /** Sections in this group */
  sections: DocSection[];
  /** Whether this group is expanded by default */
  expanded?: boolean;
}

/**
 * Documentation Groups Configuration
 * 
 * Auto-generated from markdown files in src/assets/docs/
 */
export const DOCS_MANIFEST: DocGroup[] = [
  ${groups.join(',\n  ')}
];

/**
 * Get all available documentation IDs
 */
export function getAllDocIds(): string[] {
  return DOCS_MANIFEST.flatMap(group => 
    group.sections.map(section => section.id)
  );
}

/**
 * Get a section by ID
 */
export function getSectionById(id: string): DocSection | undefined {
  for (const group of DOCS_MANIFEST) {
    const section = group.sections.find(s => s.id === id);
    if (section) return section;
  }
  return undefined;
}

/**
 * Get a group by ID
 */
export function getGroupById(id: string): DocGroup | undefined {
  return DOCS_MANIFEST.find(g => g.id === id);
}

/**
 * Search documentation by keyword
 */
export function searchDocs(keyword: string): { groups: DocGroup[]; sections: DocSection[] } {
  const lowerKeyword = keyword.toLowerCase();
  
  const matchingSections: DocSection[] = [];
  const matchingGroups: DocGroup[] = [];
  
  for (const group of DOCS_MANIFEST) {
    if (
      group.title.toLowerCase().includes(lowerKeyword) ||
      group.description.toLowerCase().includes(lowerKeyword)
    ) {
      matchingGroups.push(group);
    }
    
    for (const section of group.sections) {
      if (
        section.title.toLowerCase().includes(lowerKeyword) ||
        section.description.toLowerCase().includes(lowerKeyword) ||
        section.tags?.some(tag => tag.toLowerCase().includes(lowerKeyword))
      ) {
        matchingSections.push(section);
      }
    }
  }
  
  return { groups: matchingGroups, sections: matchingSections };
}

/**
 * Get related sections for a given section ID
 */
export function getRelatedSections(sectionId: string): DocSection[] {
  const section = getSectionById(sectionId);
  if (!section?.related) return [];
  
  return section.related
    .map(id => getSectionById(id))
    .filter((s): s is DocSection => s !== undefined);
}
`;
}

/**
 * Main function
 */
async function main() {
  console.log('📚 Documentation Manifest Generator\n');
  
  // Scan for markdown files
  console.log('🔍 Scanning for markdown files...');
  const files = await scanDocsFiles();
  console.log(`   Found ${files.length} documentation files\n`);
  
  // Group by category
  const groups: Record<string, number> = {};
  for (const file of files) {
    groups[file.group] = (groups[file.group] || 0) + 1;
  }
  
  console.log('📁 Files by category:');
  for (const [group, count] of Object.entries(groups)) {
    console.log(`   ${GROUP_CONFIG[group as keyof typeof GROUP_CONFIG]?.icon || '📄'} ${group}: ${count} files`);
  }
  console.log();
  
  // Generate manifest
  console.log('✏️  Generating manifest...');
  const manifest = generateManifest(files);
  
  // Write manifest file
  await writeFile(MANIFEST_FILE, manifest, 'utf-8');
  console.log(`   Written to: ${MANIFEST_FILE}\n`);
  
  console.log('✅ Manifest generation complete!');
  console.log('\n📝 To add new documentation:');
  console.log('   1. Create a .md file in src/assets/docs/');
  console.log('   2. Run: bun run generate-docs-manifest');
  console.log('   3. The new doc will appear in the menu automatically\n');
}

// Run
main().catch(console.error);
