# 🧹 project-cleanup

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
npm install -g project-cleanup

# Or run directly with npx
npx project-cleanup
```

## Usage

### Basic Scanning

```bash
# Scan the current directory
project-cleanup

# Scan a specific directory
project-cleanup --path ./my-project
```

### Cleanup Options

```bash
# Dry run (simulate cleanup without removing files)
project-cleanup --dry-run

# Interactive cleanup (with confirmation)
project-cleanup --clean

# Non-interactive cleanup (use with caution!)
project-cleanup --clean --no-interactive
```

### Filtering

```bash
# Only scan specific types
project-cleanup --only "images,styles"

# Exclude specific patterns
project-cleanup --exclude "test/**,*.spec.js,assets/vendor/**"
```

### Reporting

```bash
# Generate a Markdown report
project-cleanup --report cleanup-report.md

# Generate a JSON report
project-cleanup --report cleanup-report.json
```

### Advanced Options

```bash
# Set confidence threshold (default: 70%)
project-cleanup --threshold 80

# Git safety mode (only suggest committed files)
project-cleanup --git-safe

# Custom ignore file
project-cleanup --ignore-file .mycleanupignore
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
🧹 project-cleanup — A Developer's Spring Cleaning CLI Tool
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