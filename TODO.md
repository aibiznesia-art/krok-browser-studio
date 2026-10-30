

## Оновлення v0.6

- [x] Додано `Dockerfile`, `package.json` і server start command для container runtime.
- [x] Налаштовано WebDev deploy domain з health path `/api/health`.
- [x] Додано `.env.example` без секретних значень і захист `.env*` у `.gitignore`.
- [x] Документовано, що GitHub Pages лишається статичним і не може виконувати server API.
- [ ] Окремо підтвердити live variables у published container після першого server deployment.
