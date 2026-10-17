/** A fixed account identifier; changing the Native resident name never retags it. */
export type SocialPerson = { userId: string; name: string; friendCode: string; townId: string; townName: string; portrait?: string };
export type FriendRequest = { id: string; person: SocialPerson; createdAt: number };
export type SocialState = { self: SocialPerson; friends: SocialPerson[]; incoming: FriendRequest[]; outgoing: FriendRequest[] };
export function friendCode(value: unknown): string | null {
  if (typeof value !== 'string') return null;
  const code = value.trim().normalize('NFC');
  return /^[^#\p{Cc}]{1,32}#[0-9]{4}$/u.test(code) ? code : null;
}
