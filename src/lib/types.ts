export type Role = "admin" | "director" | "educator";

export interface UserProfile {
  uid: string;
  role: Role;
  fullName: string;
  login: string;
  active: boolean;
}
