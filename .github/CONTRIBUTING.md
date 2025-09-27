# Contributing to Sacred Sutra Tools

> **Welcome Contributors!** 🎉  
> Thank you for your interest in contributing to Sacred Sutra Tools.

## 🚀 Quick Start

### Development Setup

1. **Clone the repository**
   ```bash
   git clone https://github.com/yourusername/sacred-sutra-tools.git
   cd sacred-sutra-tools
   ```

2. **Install dependencies**
   ```bash
   npm install
   ```

3. **Start development server**
   ```bash
   npm run dev
   ```

4. **Run tests**
   ```bash
   npm run test
   ```

## 🔄 Development Workflow

### 1. Create a Branch
```bash
git checkout -b feature/your-feature-name
# or
git checkout -b fix/bug-description
```

### 2. Make Your Changes
- Write clean, maintainable code
- Follow existing code style and patterns
- Add tests for new functionality
- Update documentation as needed

### 3. Create a Changeset (Important!)
If your changes affect users, create a changeset:
```bash
npm run changeset
```

**When to create changesets:**
- ✅ New features or components
- ✅ Bug fixes users will notice
- ✅ Performance improvements
- ✅ API or behavior changes
- ❌ Internal refactoring
- ❌ Test-only changes
- ❌ Documentation updates

### 4. Test Your Changes
```bash
# Run all tests
npm run test

# Type checking
npm run type-check

# Linting
npm run lint

# Build verification
npm run build
```

### 5. Commit and Push
```bash
git add .
git commit -m "feat: add your feature description"
git push origin feature/your-feature-name
```

### 6. Create Pull Request
- Use the PR template
- Include screenshots for UI changes
- Reference any related issues
- Ensure all CI checks pass

## 📝 Code Standards

### TypeScript
- Use strict TypeScript settings
- Provide proper type annotations
- Avoid `any` types when possible

### React Components
- Use functional components with hooks
- Implement proper prop types
- Handle loading and error states
- Follow Material-UI patterns

### Testing
- Write unit tests for utilities and services
- Add component tests for complex logic
- Include integration tests for user flows
- Maintain good test coverage

### Commit Messages
Follow conventional commit format:
- `feat:` - New features
- `fix:` - Bug fixes
- `docs:` - Documentation changes
- `test:` - Test additions/updates
- `refactor:` - Code refactoring
- `chore:` - Maintenance tasks

## 🎯 Project Structure

```
src/
├── components/          # Reusable UI components
├── pages/              # Page components and routing
├── services/           # API and business logic
├── store/             # Redux state management
├── types/             # TypeScript type definitions
├── utils/             # Helper functions and utilities
└── __tests__/         # Test files
```

## 🔧 Available Scripts

| Command | Description |
|---------|-------------|
| `npm run dev` | Start development server with Firebase emulators |
| `npm run build` | Build for production |
| `npm run test` | Run test suite |
| `npm run lint` | Check code style |
| `npm run type-check` | TypeScript type checking |
| `npm run changeset` | Create a changeset for your changes |

## 🦋 Release Process

This project uses automated releases via Changesets:

1. **Development:** Make changes and create changesets
2. **PR Review:** Code review and CI validation
3. **Merge:** Changes merged to master branch
4. **Version PR:** Automated PR created for version bump
5. **Release:** Automated release when version PR is merged

See [Changeset Workflow Guide](../docs/CHANGESET_WORKFLOW.md) for details.

## 🐛 Bug Reports

When reporting bugs, please include:
- Clear description of the issue
- Steps to reproduce
- Expected vs actual behavior
- Browser/environment details
- Screenshots if applicable

## 💡 Feature Requests

For new features:
- Describe the use case and problem it solves
- Provide examples or mockups if possible
- Consider the impact on existing functionality
- Discuss implementation approach

## 🛠️ Development Tips

### Firebase Emulators
The project uses Firebase emulators for local development:
```bash
# Start emulators with seeded data
npm run dev

# Start emulators only
npm run emulator:start
```

### Code Quality
- Use ESLint and TypeScript for code quality
- Run tests before committing
- Use Husky pre-commit hooks for validation

### Debugging
- Use browser dev tools for frontend debugging
- Check Firebase emulator UI for backend debugging
- Review test output for failing scenarios

## 📚 Resources

- [React Documentation](https://reactjs.org/docs)
- [Material-UI Components](https://mui.com/components/)
- [Firebase Documentation](https://firebase.google.com/docs)
- [TypeScript Handbook](https://www.typescriptlang.org/docs/)
- [Changesets Documentation](https://github.com/changesets/changesets)

## 🤝 Community Guidelines

- Be respectful and inclusive
- Provide constructive feedback
- Help others learn and grow
- Follow the code of conduct

## ❓ Getting Help

- Check existing issues and documentation
- Ask questions in GitHub discussions
- Contact maintainers for urgent issues

---

**Thank you for contributing to Sacred Sutra Tools!** 🙏 