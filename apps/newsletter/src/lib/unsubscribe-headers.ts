export interface ListUnsubscribeHeadersOptions {
  unsubscribeUrl: string;
  mailtoAddress: string;
  mailtoSubjectToken?: string;
}

export function buildListUnsubscribeHeaders(
  options: ListUnsubscribeHeadersOptions,
): Record<string, string> {
  const tokenSuffix = options.mailtoSubjectToken?.trim()
    ? `-${encodeURIComponent(options.mailtoSubjectToken.trim())}`
    : "";
  const mailto = `mailto:${options.mailtoAddress}?subject=unsubscribe${tokenSuffix}`;

  return {
    "List-Unsubscribe": `<${options.unsubscribeUrl}>, <${mailto}>`,
    "List-Unsubscribe-Post": "List-Unsubscribe=One-Click",
  };
}
