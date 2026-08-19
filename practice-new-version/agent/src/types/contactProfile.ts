// Value stored in the BaseStore under CONTACT_PROFILE_NAMESPACE; the key is the sender's email.
export interface ContactProfileValue {
  name: string | null;
  tone: string | null;
  facts: string[];
}
