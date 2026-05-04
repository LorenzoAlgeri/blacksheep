export type EmailValidation =
  | { kind: "valid" }
  | { kind: "invalid_format" }
  | { kind: "suggestion"; original: string; suggested: string; reason: "tld" | "domain" }
  | { kind: "disposable"; domain: string };

// Curated list of known disposable/temporary email providers (2024-2025)
// ~70 domains — sweet spot for accuracy vs maintenance burden
const DISPOSABLE_DOMAINS = new Set([
  "mailinator.com",
  "yopmail.com",
  "yopmail.fr",
  "10minutemail.com",
  "10minutemail.net",
  "guerrillamail.com",
  "guerrillamail.info",
  "guerrillamail.biz",
  "guerrillamail.de",
  "guerrillamail.net",
  "guerrillamail.org",
  "guerrillamailblock.com",
  "tempmail.io",
  "temp-mail.org",
  "temp-mail.io",
  "throwaway.email",
  "throwam.com",
  "maildrop.cc",
  "getnada.com",
  "sharklasers.com",
  "spam4.me",
  "trashmail.com",
  "trashmail.me",
  "trashmail.net",
  "trashmail.org",
  "trashmail.at",
  "trashmail.io",
  "fakeinbox.com",
  "tempinbox.com",
  "mintemail.com",
  "mohmal.com",
  "mailnull.com",
  "spamgourmet.com",
  "spamgourmet.net",
  "spamgourmet.org",
  "dispostable.com",
  "discard.email",
  "discardmail.com",
  "discardmail.de",
  "tempail.com",
  "tempr.email",
  "mailnesia.com",
  "mailscrap.com",
  "spamfree24.org",
  "tmpmail.net",
  "tmpmail.org",
  "mail-temp.com",
  "tempmailo.com",
  "fakemail.net",
  "getairmail.com",
  "mailboxy.fun",
  "mailtemp.info",
  "inboxbear.com",
  "spambox.io",
  "dropjar.com",
  "damnthespam.com",
  "trbvm.com",
  "pookmail.com",
  "dontreg.com",
  "sofort-mail.de",
  "mytemp.email",
  "lroid.com",
  "spam.la",
  "grr.la",
  "cool.fr.nf",
  "jetable.fr.nf",
  "moncourrier.fr.nf",
  "nospam.ze.tc",
  "mailnow.top",
  "tempmail.net",
  "spamherelots.com",
]);

const COMMON_DOMAINS = [
  "gmail.com",
  "hotmail.com",
  "hotmail.it",
  "libero.it",
  "yahoo.com",
  "yahoo.it",
  "icloud.com",
  "outlook.com",
  "outlook.it",
  "virgilio.it",
  "alice.it",
  "tin.it",
  "fastwebnet.it",
  "tiscali.it",
  "pec.it",
] as const;

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/;

function levenshtein(a: string, b: string): number {
  const m = a.length,
    n = b.length;
  const dp = Array.from({ length: m + 1 }, (_, i) =>
    Array.from({ length: n + 1 }, (_, j) => (i === 0 ? j : j === 0 ? i : 0)),
  );
  for (let i = 1; i <= m; i++) {
    for (let j = 1; j <= n; j++) {
      dp[i][j] =
        a[i - 1] === b[j - 1]
          ? dp[i - 1][j - 1]
          : 1 + Math.min(dp[i - 1][j], dp[i][j - 1], dp[i - 1][j - 1]);
    }
  }
  return dp[m][n];
}

function splitDomain(domain: string): { name: string; tld: string } {
  const dot = domain.lastIndexOf(".");
  return dot < 0
    ? { name: domain, tld: "" }
    : { name: domain.slice(0, dot), tld: domain.slice(dot + 1) };
}

export function validateEmail(email: string): EmailValidation {
  const trimmed = email.trim();
  if (!EMAIL_RE.test(trimmed)) return { kind: "invalid_format" };

  const atIdx = trimmed.lastIndexOf("@");
  const local = trimmed.slice(0, atIdx).toLowerCase();
  const domain = trimmed.slice(atIdx + 1).toLowerCase();

  // Disposable check takes priority over suggestion
  if (DISPOSABLE_DOMAINS.has(domain)) {
    return { kind: "disposable", domain };
  }

  if (COMMON_DOMAINS.includes(domain as (typeof COMMON_DOMAINS)[number])) {
    return { kind: "valid" };
  }

  const { name: userDomainName, tld: userTld } = splitDomain(domain);

  let bestDomain = "";
  let bestScore = Infinity;

  for (const candidate of COMMON_DOMAINS) {
    const { name: candName, tld: candTld } = splitDomain(candidate);
    const domainDist = levenshtein(userDomainName, candName);
    const tldDist = levenshtein(userTld, candTld);
    if (domainDist <= 2 && tldDist <= 1) {
      const score = domainDist + tldDist;
      if (score < bestScore) {
        bestScore = score;
        bestDomain = candidate;
      }
    }
  }

  if (!bestDomain) return { kind: "valid" };

  const { name: bestDomainName } = splitDomain(bestDomain);
  const reason: "tld" | "domain" = userDomainName === bestDomainName ? "tld" : "domain";

  return {
    kind: "suggestion",
    original: trimmed,
    suggested: `${local}@${bestDomain}`,
    reason,
  };
}
