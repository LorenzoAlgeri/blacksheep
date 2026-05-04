export type Registration = {
  subscriber: {
    gender?: string | null;
    status?: string | null;
  } | null;
};

export type RegistrationStats = {
  total: number;
  confirmed: number;
  pending: number;
  women: number;
  men: number;
  womenConfirmed: number;
};

export function calculateStats(registrations: Registration[]): RegistrationStats {
  let confirmed = 0;
  let pending = 0;
  let women = 0;
  let men = 0;
  let womenConfirmed = 0;

  for (const reg of registrations) {
    const status = reg.subscriber?.status ?? null;
    const gender = reg.subscriber?.gender ?? null;

    const isConfirmed = status === "confirmed";
    const isWoman = gender === "female";
    const isMan = gender === "male";

    if (isConfirmed) confirmed++;
    else pending++;

    if (isWoman) {
      women++;
      if (isConfirmed) womenConfirmed++;
    } else if (isMan) {
      men++;
    }
  }

  return {
    total: registrations.length,
    confirmed,
    pending,
    women,
    men,
    womenConfirmed,
  };
}
