export interface AuthResult {
  success: boolean;
  error?: string;
}

export interface SignInResult extends AuthResult {
  isSignedIn?: boolean;
  nextStep?: {
    signInStep: string;
  };
}

export interface UserResult extends AuthResult {
  user?: any;
}

export interface TokenResult extends AuthResult {
  token?: any;
}

export class AuthService {
  static signUp(
    email: string,
    password: string,
    firstName: string,
    lastName: string
  ): Promise<UserResult>;
  static confirmSignUp(
    email: string,
    confirmationCode: string
  ): Promise<AuthResult>;
  static signIn(email: string, password: string): Promise<SignInResult>;
  static signOut(): Promise<AuthResult>;
  static getCurrentUser(): Promise<UserResult>;
  static getAuthToken(useCache?: boolean): Promise<TokenResult>;
  static getAuthSession(useCache?: boolean): Promise<any>;
  static clearAuthCache(): void;
  static isTokenExpiringSoon(token: any): boolean;
  static forgotPassword(email: string): Promise<AuthResult & { nextStep?: any }>;
  static confirmForgotPassword(
    email: string,
    confirmationCode: string,
    newPassword: string
  ): Promise<AuthResult>;
}
