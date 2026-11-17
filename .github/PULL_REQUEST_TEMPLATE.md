## Summary
<!-- Briefly describe the changes in this Pull Request. -->

## Related Issue
<!-- Closes #... -->

## Type of Change
- [ ] `feat`: New feature
- [ ] `fix`: Bug fix
- [ ] `docs`: Documentation update
- [ ] `refactor` / `perf` / `test` / `ci`: Internal improvement

## Checklist
- [ ] PR title follows **Conventional Commits** format (e.g., `feat(games): add around the clock mode`)
- [ ] **Zero npm dependencies**: No `package-lock.json`, `node_modules`, or external npm packages added
- [ ] **Light DOM & CSS Tokens**: Web Components do not use Shadow DOM (`attachShadow`) and respect `public/css/tokens/tokens.css`
- [ ] Syntax checks pass (`find server public -name "*.js" -type f -print0 | xargs -0 -n 1 node --check`)
- [ ] Full test suite passes (`npm run test:all`)
