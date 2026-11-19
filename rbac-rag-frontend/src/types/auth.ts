export type AllowedRole =
  | "admin"
  | "hr"
  | "finance"
  | "engineering"
  | "intern"
  | "all_employees";

export interface AuthenticatedUser {
  user_id: number;
  email: string;
  full_name?: string;
  role: AllowedRole;
  is_active: boolean;
  is_demo?: boolean;
}

export interface TokenResponse {
  access_token: string;
  token_type: string;
  user_id: number;
  email: string;
  role: AllowedRole;
  is_demo?: boolean;
}

export interface RoleUpdateRequest {
  user_id: number;
  new_role: AllowedRole;
  is_active: boolean;
}

