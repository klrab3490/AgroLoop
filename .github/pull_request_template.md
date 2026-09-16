## Description
<!-- Provide a clear, concise summary of the changes proposed in this Pull Request. -->

## Target Branch
- [ ] Base: `dev` (for all feature, bugfix, and refactoring PRs)
- [ ] Base: `main` (for stable release promotions from `dev` only)

## Type of Change
- [ ] ✨ New feature (non-breaking change adding functionality)
- [ ] 🐛 Bug fix (non-breaking change fixing an issue)
- [ ] ♻️ Refactoring / Architectural improvement
- [ ] 📝 Documentation update
- [ ] ⚙️ CI / Build / Infrastructure configuration

## OOP & Architectural Principles Checklist
- [ ] **Encapsulation:** State mutations are encapsulated in private fields and domain methods.
- [ ] **Inheritance / Polymorphism:** Subclasses adhere to Liskov Substitution and interface abstractions.
- [ ] **Layering:** Controllers talk exclusively through Services/DTOs without leaking database persistence.

## Quality & Verification Checklist
- [ ] Code compiles cleanly with Java 21 (`mvn clean test`).
- [ ] All unit and integration tests pass without failures or flakiness.
- [ ] Flyway database migration scripts added/tested (if schema changed).
- [ ] **Living Documentation:** `docs/INDEX.md` and module-specific markdown files updated with clickable file mappings and function catalogs.
