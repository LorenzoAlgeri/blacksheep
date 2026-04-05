# Database Schema — BLACK SHEEP Newsletter

> Database: Supabase (PostgreSQL)
> Last updated: 2026-04-05

---

## Table: `subscribers`

| Column                  | Type          | Nullable | Default             | Notes                                         |
| ----------------------- | ------------- | -------- | ------------------- | --------------------------------------------- |
| `id`                    | `uuid`        | NOT NULL | `gen_random_uuid()` | PK                                            |
| `email`                 | `text`        | NOT NULL | —                   | UNIQUE constraint                             |
| `name`                  | `text`        | NULL     | —                   | Optional display name                         |
| `status`                | `text`        | NOT NULL | `'pending'`         | CHECK: `pending`, `confirmed`, `unsubscribed` |
| `token`                 | `uuid`        | NOT NULL | `gen_random_uuid()` | UNIQUE — used for confirm/unsubscribe links   |
| `subscribed_ip`         | `text`        | NULL     | —                   | GDPR audit trail                              |
| `subscribed_user_agent` | `text`        | NULL     | —                   | GDPR audit trail                              |
| `consent_version`       | `text`        | NULL     | `'1.0'`             | Policy version at time of consent             |
| `subscribed_at`         | `timestamptz` | NOT NULL | `now()`             | When the subscriber signed up                 |
| `updated_at`            | `timestamptz` | NOT NULL | `now()`             | Auto-updated via trigger                      |

### Indexes

| Name                          | Columns        | Type            | Notes                      |
| ----------------------------- | -------------- | --------------- | -------------------------- |
| `subscribers_pkey`            | `id`           | PK (B-tree)     |                            |
| `subscribers_email_key`       | `email`        | UNIQUE (B-tree) |                            |
| `idx_subscribers_email_lower` | `LOWER(email)` | UNIQUE (B-tree) | Case-insensitive dedup     |
| `subscribers_token_unique`    | `token`        | UNIQUE (B-tree) | Constraint, not just index |
| `idx_subscribers_status`      | `status`       | B-tree          | Filter by status           |

### Triggers

| Name                         | Event         | Function                                                 |
| ---------------------------- | ------------- | -------------------------------------------------------- |
| `trg_subscribers_updated_at` | BEFORE UPDATE | `update_updated_at_column()` — sets `updated_at = now()` |

### Constraints

| Name                       | Type        | Definition                                           |
| -------------------------- | ----------- | ---------------------------------------------------- |
| `subscribers_pkey`         | PRIMARY KEY | `(id)`                                               |
| `subscribers_email_key`    | UNIQUE      | `(email)`                                            |
| `subscribers_token_unique` | UNIQUE      | `(token)`                                            |
| `subscribers_status_check` | CHECK       | `status IN ('pending', 'confirmed', 'unsubscribed')` |

---

## Table: `scheduled_newsletters`

| Column         | Type          | Nullable | Default             | Notes                                    |
| -------------- | ------------- | -------- | ------------------- | ---------------------------------------- |
| `id`           | `uuid`        | NOT NULL | `gen_random_uuid()` | PK                                       |
| `subject`      | `text`        | NOT NULL | —                   | Email subject line                       |
| `html`         | `text`        | NOT NULL | —                   | Full HTML body                           |
| `scheduled_at` | `timestamptz` | NOT NULL | —                   | When to send                             |
| `status`       | `text`        | NOT NULL | `'scheduled'`       | `scheduled`, `sending`, `sent`, `failed` |
| `created_at`   | `timestamptz` | NOT NULL | `now()`             |                                          |

---

## Migrations

| File                                | Description                                                                       |
| ----------------------------------- | --------------------------------------------------------------------------------- |
| `20260405_gdpr_consent_columns.sql` | Add GDPR audit columns (IP, UA, consent version)                                  |
| `20260405_schema_hardening.sql`     | NOT NULL on status, LOWER(email) unique index, token UNIQUE, updated_at + trigger |

---

## Notes

- Email is normalized to **lowercase** before insert (in `subscribe` route)
- Double opt-in: subscriber starts as `pending`, becomes `confirmed` via token link
- `token` is used for both confirmation and unsubscribe (one token per subscriber)
- Rate limiting is applied at the API layer, not DB layer
