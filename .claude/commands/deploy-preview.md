---
name: deploy-preview
description: Deploy preview su Vercel e verifica
---
Esegui in ordine:
1. npm run build
2. npx tsc --noEmit  
3. npm run lint
4. Se tutto passa: git add -A && git commit -m "$ARGUMENTS" && git push
5. Vercel deploya automaticamente. Aspetta il link di preview.
6. Riporta il link.
