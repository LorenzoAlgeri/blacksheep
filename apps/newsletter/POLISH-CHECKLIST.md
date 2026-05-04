# POLISH-CHECKLIST — blacksheep/newsletter

Items da risolvere prima del deploy in production. Non bloccanti per sviluppo locale.

---

## Admin gaps post-Phase 7A

Identificati durante l'exploration pre-Phase 7A (2026-05-04).

- [ ] **Rate limiting in-memory** — gli endpoint rate-limited (`/api/auth`, `/api/subscribe`, `/api/events/register`) usano una `Map` in-memory che viene azzerata ad ogni restart del server. Migrare a Redis/Upstash per garantire persistenza in production.
- [ ] **Session expiry handling** — JWT TTL è 3600s ma l'UI non avvisa l'admin della scadenza imminente. Aggiungere un warning a ~5 min dalla scadenza + redirect automatico al login.
- [ ] **Audit log azioni admin** — nessuna traccia delle azioni admin nel database. Aggiungere tabella `admin_audit_log(id, admin_email, action, target_id, target_type, ip, created_at)` per compliance GDPR e tracciabilità operativa.
