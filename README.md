# 🧹 unused-dependencies-remover

A developer's spring cleaning CLI tool that detects and removes unused files and code from your projects.

![Project Cleanup CLI](https://i.imgur.com/1234567.png)

## Features

- 🔍 **Smart Detection**: Identifies unused images, styles, components, and code
- 🧪 **Safe Cleanup**: Provides confidence scores and interactive confirmation before removal
- 📊 **Detailed Reports**: Generates comprehensive reports in JSON or Markdown
- 🛡️ **Git Safety**: Option to only clean files that are committed to git
- 🔧 **Configurable**: Exclude patterns, confidence thresholds, and more

## Installation

```bash
# Install globally
npm install -g unused-dependencies-remover

# Or run directly with npx
npx unused-dependencies-remover
```

## Usage

### Basic Scanning

```bash
# Scan the current directory
unused-dependencies-remover

# Scan a specific directory
unused-dependencies-remover --path ./my-project
```

### Cleanup Options

```bash
# Dry run (simulate cleanup without removing files)
unused-dependencies-remover --dry-run

# Interactive cleanup (with confirmation)
unused-dependencies-remover --clean

# Non-interactive cleanup (use with caution!)
unused-dependencies-remover --clean --no-interactive
```

### Filtering

```bash
# Only scan specific types
unused-dependencies-remover --only "images,styles"

# Exclude specific patterns
unused-dependencies-remover --exclude "test/**,*.spec.js,assets/vendor/**"
```

### Reporting

```bash
# Generate a Markdown report
unused-dependencies-remover --report cleanup-report.md

# Generate a JSON report
unused-dependencies-remover --report cleanup-report.json
```

### Advanced Options

```bash
# Set confidence threshold (default: 70%)
unused-dependencies-remover --threshold 80

# Git safety mode (only suggest committed files)
unused-dependencies-remover --git-safe

# Custom ignore file
unused-dependencies-remover --ignore-file .mycleanupignore
```

## Configuration

You can create a `.cleanupignore` file in your project root to specify patterns to ignore:

```
# Ignore these patterns
dist/**
build/**
node_modules/**
**/*.min.js
assets/required/**
```

## Example Output

```
🧹 unused-dependencies-remover — A Developer's Spring Cleaning CLI Tool
v0.1.0
───────────────────────────────────────────────────

📊 Scan Results:
──────────────────────────────────────

🖼️  Images & Media:
  ✅ assets/old-logo.png (95%)
  ✅ assets/unused-image.jpg (90%)
  ❔ assets/background.png (65%)

🎨 Style Files:
  ✅ styles/unused.css (85%)
  ✅ styles/temp.scss (90%)

📜 Scripts:
  ✅ utils/deprecated.js (95%)
  ❔ components/test.js (60%)

📋 Summary:
──────────────────────────────────────
  5 files can likely be removed
  3 unused exports detected
  2 items below confidence threshold (70%)

💡 Tip: Run with --clean to remove items, or --report report.md to save findings.
```

## License

MIT