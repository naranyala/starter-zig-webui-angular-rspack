# Dynamic Documentation Menu System

## Overview

The documentation menu is now **dynamically generated** from markdown files. When you add a new markdown file to the docs directory, it will automatically appear in the menu.

---

## How It Works

```
┌─────────────────────────────────────────────────────────────┐
│  1. Create markdown file in src/assets/docs/                │
│     e.g., my-new-guide.md                                   │
└────────────────────┬────────────────────────────────────────┘
                     │
                     ▼
┌─────────────────────────────────────────────────────────────┐
│  2. Run: bun run generate-docs-manifest                     │
│     - Scans docs directory for .md files                    │
│     - Extracts title from first h1 heading                  │
│     - Assigns to group based on filename                    │
│     - Generates docs-manifest.ts                            │
└────────────────────┬────────────────────────────────────────┘
                     │
                     ▼
┌─────────────────────────────────────────────────────────────┐
│  3. Menu automatically includes new documentation           │
│     - Appears in correct group                              │
│     - Has proper icon and description                       │
│     - Searchable and filterable                             │
└─────────────────────────────────────────────────────────────┘
```

---

## Adding New Documentation

### Step 1: Create Markdown File

Create a new `.md` file in `frontend/src/assets/docs/`:

```bash
# Example: Add a new deployment guide
touch frontend/src/assets/docs/deployment-guide.md
```

### Step 2: Add Content with Title

The **first h1 heading** becomes the menu title:

```markdown
# Deployment Guide

This guide covers deploying to production...
```

### Step 3: Run Generator

```bash
cd frontend
bun run generate-docs-manifest
```

### Step 4: Verify

The new documentation will appear in the menu under the appropriate group.

---

## File Naming Convention

The filename determines which **group** the documentation belongs to:

| Filename Pattern | Group | Icon |
|-----------------|-------|------|
| `duckdb-*.md` | DuckDB CRUD Integration | 🦆 |
| `sqlite-*.md` | SQLite CRUD Integration | 🗄️ |
| `*-comparison.md` | Database Comparison | ⚖️ |
| `*-vs-*.md` | Database Comparison | ⚖️ |
| `use-cases.md` | Database Comparison | ⚖️ |
| `security-*.md` | Production Guide | 🚀 |
| `error-*.md` | Production Guide | 🚀 |
| `testing-*.md` | Production Guide | 🚀 |
| `troubleshooting.md` | Production Guide | 🚀 |
| `deployment-*.md` | Production Guide | 🚀 |

### Examples

```
duckdb-advanced.md          → DuckDB group
sqlite-optimization.md      → SQLite group
performance-benchmarks.md   → Comparison group
production-deployment.md    → Production group
```

---

## Automatic Icon Assignment

Icons are automatically assigned based on keywords in the title/filename:

| Keyword | Icon |
|---------|------|
| guide, integration, crud | 📖 |
| quick, start | ⚡ |
| architecture, design | 🏗️ |
| schema, database | 📋 |
| api, reference | 🔌 |
| performance, benchmark | 🚀 |
| comparison, vs | 🆚 |
| use, cases | 🎯 |
| security, checklist | 🔒 |
| error, handling | ⚠️ |
| testing, tests | 🧪 |
| troubleshooting | 🔍 |

---

## Manual Customization

For more control, edit `docs-manifest.ts` directly:

```typescript
export const DOCS_MANIFEST: DocGroup[] = [
  {
    id: 'duckdb-crud',
    title: 'DuckDB CRUD Integration',
    icon: '🦆',
    sections: [
      {
        id: 'my-custom-doc',      // Must match filename
        title: 'Custom Title',     // Override auto-extracted title
        icon: '🎨',                // Custom icon
        description: 'My description',
        order: 99,                 // Display order
        tags: ['custom', 'duckdb'], // Search tags
        related: ['other-doc-id'],  // Related docs
      },
    ],
  },
];
```

> ⚠️ **Note**: Manual changes will be overwritten when running `generate-docs-manifest`. To preserve customizations, either:
> 1. Run the generator once, then manually edit
> 2. Add metadata comments to markdown files (future feature)

---

## Script Options

### Full Regeneration

```bash
# Regenerate manifest from all markdown files
bun run generate-docs-manifest
```

### Output

```
📚 Documentation Manifest Generator

🔍 Scanning for markdown files...
   Found 19 documentation files

📁 Files by category:
   🦆 duckdb: 7 files
   🗄️ sqlite: 6 files
   ⚖️ comparison: 3 files
   🚀 production: 3 files

✏️  Generating manifest...
   Written to: src/assets/docs/docs-manifest.ts

✅ Manifest generation complete!
```

---

## File Structure

```
frontend/
├── src/
│   └── assets/
│       └── docs/
│           ├── docs-manifest.ts          # Generated manifest
│           ├── DUCKDB_CRUD_INTEGRATION.md
│           ├── duckdb-quickstart.md
│           ├── sqlite-quickstart.md
│           ├── deployment-guide.md       # ← New file
│           └── ...
├── scripts/
│   └── generate-docs-manifest.ts         # Generator script
└── package.json
    └── scripts.generate-docs-manifest    # npm script
```

---

## Search & Filtering

The dynamic menu includes built-in search:

```typescript
// Search by title
filterDocs('quick')  // Shows all "Quick Start" docs

// Search by description
filterDocs('benchmark')  // Shows performance docs

// Search by tags
filterDocs('security')  // Shows security-related docs
```

---

## Related Documentation

Link related docs together using the `related` field:

```typescript
{
  id: 'duckdb-performance',
  title: 'Performance Guide',
  related: [
    'duckdb-architecture',
    'performance-comparison',
    'sqlite-performance'
  ],
}
```

Related docs appear at the bottom of each documentation page.

---

## Troubleshooting

### New Doc Not Appearing

1. **Check filename**: Must be `.md` extension
2. **Check location**: Must be in `src/assets/docs/`
3. **Run generator**: `bun run generate-docs-manifest`
4. **Rebuild**: `bun run build`

### Wrong Group

1. **Rename file**: Include group keyword in filename
2. **Manual edit**: Edit `docs-manifest.ts` directly

### Wrong Icon

1. **Add keyword**: Include icon keyword in title
2. **Manual edit**: Set `icon` field in manifest

### Title Not Extracted

1. **Add h1 heading**: First line must be `# Title`
2. **Check format**: Must be h1 (`#`), not h2 (`##`)

---

## Advanced: Custom Metadata (Future)

Future versions may support frontmatter metadata:

```markdown
---
title: Custom Title
icon: 🎨
group: production
order: 10
tags: [custom, advanced]
related: [other-doc]
---

# Content starts here...
```

---

## API Reference

### Manifest Functions

```typescript
// Get all doc IDs
getAllDocIds(): string[]

// Get section by ID
getSectionById(id: string): DocSection | undefined

// Get group by ID
getGroupById(id: string): DocGroup | undefined

// Search docs
searchDocs(keyword: string): { groups: DocGroup[]; sections: DocSection[] }

// Get related sections
getRelatedSections(sectionId: string): DocSection[]
```

### Interfaces

```typescript
interface DocSection {
  id: string;
  title: string;
  icon: string;
  description: string;
  order: number;
  tags?: string[];
  related?: string[];
}

interface DocGroup {
  id: string;
  title: string;
  description: string;
  icon: string;
  order: number;
  sections: DocSection[];
  expanded?: boolean;
}
```

---

## Examples

### Example 1: Add Quick Start Guide

```bash
# Create file
cat > frontend/src/assets/docs/duckdb-advanced.md << 'EOF'
# DuckDB Advanced Features

Learn advanced DuckDB features...
EOF

# Generate manifest
bun run generate-docs-manifest

# Build
bun run build
```

### Example 2: Add Production Checklist

```bash
# Create file
cat > frontend/src/assets/docs/production-monitoring.md << 'EOF'
# Production Monitoring

Monitoring best practices...
EOF

# Generate manifest
bun run generate-docs-manifest

# Appears in Production Guide group with 🔍 icon
```

---

## Summary

| Feature | Status |
|---------|--------|
| Auto-discovery | ✅ Automatic |
| Title extraction | ✅ From h1 |
| Group assignment | ✅ By filename |
| Icon assignment | ✅ By keyword |
| Search | ✅ Full-text |
| Related docs | ✅ Configurable |
| Manual override | ✅ Edit manifest |

**Build Status**: ✅ Successful

---

**Last Updated**: 2026-03-31  
**Script**: `bun run generate-docs-manifest`
