

### Важливе обмеження GitHub Pages

GitHub Pages є статичним хостингом і не виконує `/api/content/generate`. Реальний AI endpoint працює в server/container runtime KROK Studio; для безкоштовного Pages-публікування workflow має спочатку згенерувати й перевірити `generated/latest-content.json`, а потім викласти статичний результат. Не можна переносити `BUILT_IN_FORGE_API_KEY` у Pages або frontend.
