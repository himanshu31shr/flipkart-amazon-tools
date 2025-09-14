# Create Pull Request Command

This command creates a pull request using the GitHub MCP tool against the base branch (master) with automatic changeset generation and commit functionality.

## Implementation

```javascript
// Get current branch and commit information
const { execSync } = require('child_process');
const fs = require('fs');
const crypto = require('crypto');

// Helper function to determine change type from branch name or commits
function determineChangeType(branchName, commits) {
  const branchLower = branchName.toLowerCase();
  const commitsLower = commits.toLowerCase();
  
  // Check for breaking changes indicators
  if (branchLower.includes('breaking') || 
      branchLower.includes('major') ||
      commitsLower.includes('breaking change') ||
      commitsLower.includes('!:')) {
    return 'major';
  }
  
  // Check for feature indicators
  if (branchLower.includes('feat/') || 
      branchLower.includes('feature/') ||
      branchLower.includes('add') ||
      commitsLower.includes('feat:') ||
      commitsLower.includes('add')) {
    return 'minor';
  }
  
  // Default to patch for fixes, maintenance, etc.
  return 'patch';
}

// Helper function to generate changeset description from commits
function generateChangesetDescription(commits, changeType) {
  if (!commits) return 'Automated changeset generation';
  
  const commitLines = commits.split('\n').filter(line => line.trim());
  
  if (commitLines.length === 1) {
    // Single commit - use commit message
    return commitLines[0].replace(/^\w+\s+/, '').trim();
  } else {
    // Multiple commits - create summary
    const summary = commitLines.map(line => 
      line.replace(/^\w+\s+/, '').trim()
    ).join('; ');
    
    return summary.length > 100 ? 
      summary.substring(0, 97) + '...' : 
      summary;
  }
}

// Get current branch
const currentBranch = execSync('git rev-parse --abbrev-ref HEAD', { encoding: 'utf8' }).trim();

// Ensure we're not on master
if (currentBranch === 'master') {
  throw new Error('Cannot create PR from master branch. Please switch to a feature branch.');
}

// Get recent commits for PR description
const commits = execSync(`git log master..HEAD --oneline`, { encoding: 'utf8' }).trim();

if (!commits) {
  throw new Error('No commits found ahead of master. Please make some changes first.');
}

// Determine change type automatically
const changeType = determineChangeType(currentBranch, commits);

// Generate changeset description
const changesetDescription = generateChangesetDescription(commits, changeType);

// Generate changeset filename (format: adjective-noun-verb.md)
const changesetId = crypto.randomBytes(4).toString('hex');
const changesetFilename = `.changeset/automated-${changesetId}.md`;

// Create changeset content following the project's format
const changesetContent = `---
"sacred-sutra-tools": ${changeType}
---

${changesetDescription}
`;

// Write changeset file
fs.writeFileSync(changesetFilename, changesetContent, 'utf8');
console.log(`📝 Created changeset: ${changesetFilename}`);

// Stage and commit the changeset
execSync('git add .changeset/', { stdio: 'inherit' });
execSync(`git commit -m "chore: add changeset for ${changeType} release

${changesetDescription}"`, { stdio: 'inherit' });

console.log('✅ Changeset committed to branch');

// Generate PR title from branch name or recent commit
let prTitle = '';
if (currentBranch.includes('feat/')) {
  prTitle = currentBranch.replace('feat/', '').replace(/-/g, ' ');
  prTitle = prTitle.charAt(0).toUpperCase() + prTitle.slice(1);
} else if (currentBranch.includes('fix/')) {
  prTitle = 'Fix: ' + currentBranch.replace('fix/', '').replace(/-/g, ' ');
} else if (currentBranch.includes('feature/')) {
  prTitle = currentBranch.replace('feature/', '').replace(/-/g, ' ');
  prTitle = prTitle.charAt(0).toUpperCase() + prTitle.slice(1);
} else {
  // Use the most recent commit message as title
  const latestCommit = execSync('git log -1 --pretty=format:"%s"', { encoding: 'utf8' }).trim();
  prTitle = latestCommit;
}

// Determine which change type checkbox to check
const changeTypeChecks = {
  patch: '- [x] 🐛 Bug fix (patch)\n- [ ] ✨ New feature (minor)\n- [ ] 💥 Breaking change (major)',
  minor: '- [ ] 🐛 Bug fix (patch)\n- [x] ✨ New feature (minor)\n- [ ] 💥 Breaking change (major)',
  major: '- [ ] 🐛 Bug fix (patch)\n- [ ] ✨ New feature (minor)\n- [x] 💥 Breaking change (major)'
};

// Create PR body based on template with pre-filled changeset information
const prBody = `## 📋 Description
${commits ? 'Changes in this PR:\n' + commits.split('\n').map(line => `- ${line}`).join('\n') : 'Brief description of the changes made in this PR.'}

## 🔄 Type of Change
${changeTypeChecks[changeType]}
- [ ] 📚 Documentation update
- [ ] 🔧 Refactoring/maintenance
- [ ] 🧪 Test updates

## 🦋 Changeset Required?
- [x] **Yes** - This change affects users and requires a changeset
- [ ] **No** - This is internal/maintenance work (tests, docs, refactoring)

### ✅ Changeset Created
A **${changeType}** changeset has been automatically created and committed:
\`\`\`
${changesetDescription}
\`\`\`

**Need help?** See the [Changeset Workflow Guide](../docs/CHANGESET_WORKFLOW.md)

## 🧪 Testing
- [ ] Tests added/updated for the changes
- [ ] All existing tests pass
- [ ] Manual testing completed

## 📸 Screenshots (if applicable)
Add screenshots or recordings for UI changes.

## 📝 Additional Notes
${changeType === 'major' ? '⚠️ **BREAKING CHANGE**: This is a major version bump that may require user action.' : ''}
${changeType === 'minor' ? '✨ **NEW FEATURE**: This adds new functionality without breaking existing features.' : ''}
${changeType === 'patch' ? '🐛 **BUG FIX**: This fixes issues without adding new features or breaking changes.' : ''}

---

### Pre-merge Checklist
- [ ] Code follows project style guidelines
- [ ] Self-review completed
- [x] Changeset created (automatically generated)
- [ ] Tests pass locally
- [ ] No console errors/warnings
- [ ] Documentation updated (if needed)`;

// Push the branch with the changeset
execSync(`git push origin ${currentBranch}`, { stdio: 'inherit' });
console.log('🚀 Pushed branch with changeset to remote');

// Use GitHub MCP to create the PR
const result = await mcp__github__create_pull_request({
  owner: 'himanshu31shr',
  repo: 'labelMerger',
  title: prTitle,
  head: currentBranch,
  base: 'master',
  body: prBody,
  draft: false
});

console.log(`✅ Pull request created successfully: ${result.html_url}`);
```

## Usage

This enhanced command will:

1. **Validate Environment** - Ensures you're on a feature branch with commits ahead of master
2. **Automatic Change Detection** - Analyzes branch names and commit messages to determine change type:
   - `major` for breaking changes, major features
   - `minor` for new features, enhancements  
   - `patch` for bug fixes, maintenance
3. **Generate Changeset** - Creates a properly formatted changeset file following project conventions
4. **Commit Changeset** - Automatically stages and commits the changeset to the current branch
5. **Intelligent PR Creation** - Uses GitHub MCP to create a PR with:
   - Pre-filled change type checkboxes
   - Automatic changeset confirmation
   - Contextual descriptions based on commit history
   - Change-specific additional notes
6. **Push to Remote** - Ensures the branch with changeset is available for the PR

## Changeset Generation Logic

### Change Type Detection
- **Major**: Branch/commits containing "breaking", "major", or "!:"
- **Minor**: Branch/commits with "feat/", "feature/", "add", or "feat:"
- **Patch**: Default for fixes, maintenance, documentation

### Description Generation
- **Single commit**: Uses cleaned commit message
- **Multiple commits**: Creates summary of all changes
- **Automatic truncation**: Limits to 100 characters for readability

## Prerequisites

- Must be on a feature branch (not master)
- Branch should have commits ahead of master
- GitHub authentication must be configured for MCP
- Changeset configuration must exist (.changeset/config.json)

## Error Handling

The command will fail gracefully if:
- Running from master branch
- No commits ahead of master
- Git operations fail
- GitHub API errors
- File system permissions issues

## Integration with Project Workflow

This command integrates seamlessly with the existing Sacred Sutra Tools changeset workflow:
- Follows the established semantic versioning pattern
- Uses the configured changelog format (@changesets/changelog-github)
- Respects the baseBranch configuration (master)
- Maintains the "sacred-sutra-tools" package naming convention