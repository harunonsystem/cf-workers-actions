Update CHANGELOG.md with all changes from the latest tag to the current commit.

First, get the last tag and collect commit/PR information using gh CLI:
```bash
# Get last tag
git describe --tags --abbrev=0 2>/dev/null

# Get commit log since last tag
git log $(git describe --tags --abbrev=0 2>/dev/null)..HEAD --oneline

# Get merged PRs since last release (if applicable)
gh pr list --state merged --limit 100 --json number,title,author,mergedAt,labels
```

Based on the commit and PR information, categorize the changes into:
- **Added**: New features
- **Changed**: Changes in existing functionality
- **Deprecated**: Soon-to-be removed features
- **Removed**: Removed features
- **Fixed**: Bug fixes
- **Security**: Vulnerability fixes
- **Thanks**: Contributors with GitHub usernames and PR numbers

When processing commits:
- Use GitHub usernames from the script output, not git author names
- In the Thanks section, list only contributors, excluding the maintainer "harunon"
- Include PR numbers when available
- Categorize based on commit subject and body

After adding the content, inform the user in Japanese about what was added and ask for confirmation using `say`.

If the user confirms with "OK":
1. Run `npm version --no-git-tag-version patch` to update version
2. Create a version section in CHANGELOG.md and move Unreleased content there
3. Update version links at the bottom of CHANGELOG.md (add new version link and update Unreleased link)
4. Commit CHANGELOG.md and package.json with message "chore: release v{version}"
5. Create a git tag with the current version
6. Run `git push origin main --tags`
7. Create a GitHub Release using the CHANGELOG content for that version (use `gh` command against origin)

Important notes:
- This project is a GitHub Actions package, so npm publish is NOT required
- GitHub Marketplace publishing is manual (not automated)
- Show the user the created release URL at the end

After completion, inform the user in Japanese that the release is complete and provide next steps for optional Marketplace publishing.
