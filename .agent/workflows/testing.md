---
description: Regole di testing per CronoReport
---

## Regole Browser

1. **NON aprire MAI il browser automaticamente** per testare micro-aggiornamenti (CSS, fix variabili, pulizia codice, ecc.)
2. Il browser va aperto **SOLO quando l'utente lo chiede esplicitamente**
3. Per verificare che il codice compili, usare solo `npx vite build`
4. L'utente testa in autonomia nel suo browser — non serve la subagent per ogni modifica
