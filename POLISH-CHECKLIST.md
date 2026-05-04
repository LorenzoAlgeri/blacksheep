# Polish checklist — feat/blacksheep-list

Voci di polish identificate durante l'implementazione, da rivisitare PRE-MERGE in main o post-Fase 6C.

## Visual / UX

- [ ] Transitional section editoriale tra hero e EventsList (valutata e scartata in 6B; rivedere se ancora necessaria post-6C)
- [ ] Verificare card peeking comportamento su viewport > 1200px (attualmente garantito below-fold da .page-column min-h-dvh)

## Architectural

- [ ] `.page-column` ha `min-h-dvh !important` — l'!important è anti-pattern; verificare se conflitto specificità con LandingMotion può essere risolto senza !important
- [ ] EventsListGate `FALLBACK_TIMEOUT_MS = 5000` — verifica che resti >= durata MascotteIntro dopo eventuali modifiche al timing intro
- [ ] `bs-line-draw` keyframe ha stessa architettura `from{scaleX(0)}` del CTA fix — risk teorico per linea decorativa al fondo card. Audit design system animation
- [ ] EventsList: distinguere empty REALE (api ok, 0 records) da empty MASCHERATO (api fail, fallback `[]`) propagando flag `degraded`

## Dev experience

- [ ] Aggiornare seed-local.sql con 2-3 eventi futuri pubblicati (attualmente API ne ritorna 1 perché filtri `published + event_date >= NOW()`)
- [ ] Investigare 3 false-positive `unused eslint-disable` su EventCard.tsx (mismatch versione plugin react-hooks vs config?)

## Tooling

- [ ] Playwright viewport-only screenshot non cattura sticky heading correttamente — limitazione del tool. Considerare full-page screenshots come default per visual review
