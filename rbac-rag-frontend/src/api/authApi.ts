import { apiClient, setStoredToken } from './axiosClient';
import {
  AuthenticatedUser,
  RoleUpdateRequest,
  TokenResponse,
} from '../types/auth';

export async function loginUser(
  email: string,
  password: string,
  persistToken: boolean = true
): Promise<TokenResponse> {
  const response = await apiClient.post<TokenResponse>('/api/v1/auth/login', {
    email,
    password,
  });
  if (persistToken && response.data?.access_token) {
    setStoredToken(response.data.access_token);
  }
  return response.data;
}

export async function registerUser(
  email: string,
  password: string,
  fullName: string
): Promise<TokenResponse> {
  const response = await apiClient.post<TokenResponse>('/api/v1/auth/register', {
    email,
    password,
    full_name: fullName,
  });
  if (response.data?.access_token) {
    setStoredToken(response.data.access_token);
  }
  return response.data;
}

export async function fetchCurrentUser(): Promise<AuthenticatedUser> {
  const response = await apiClient.get<AuthenticatedUser>('/api/v1/auth/me');
  return response.data;
}

export async function updateUserRoleAdmin(
  payload: RoleUpdateRequest
): Promise<AuthenticatedUser> {
  const response = await apiClient.put<AuthenticatedUser>(
    '/api/v1/auth/admin/update-role',
    payload
  );
  return response.data;
}

