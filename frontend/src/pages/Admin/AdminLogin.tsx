import { useState, useEffect } from "react";
import { useNavigate } from "react-router";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import Footer from "@/components/Footer";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { confirmSignIn } from "aws-amplify/auth";
import { Eye, EyeOff, ArrowLeft } from "lucide-react";
import { AuthService } from "@/functions/authService";

type ViewState = "login" | "newPassword" | "forgotPassword" | "resetPassword";

export default function AdminLogin() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [resetCode, setResetCode] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [showNewPassword, setShowNewPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [error, setError] = useState("");
  const [successMessage, setSuccessMessage] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [viewState, setViewState] = useState<ViewState>("login");
  const navigate = useNavigate();

  useEffect(() => {
    const checkAuthStatus = async () => {
      try {
        const session = await AuthService.getAuthSession(true);
        if (session?.tokens?.accessToken) {
          // User is already authenticated, redirect to dashboard
          navigate("/admin/dashboard");
        }
      } catch (error) {
        // User is not authenticated, stay on login page
        console.log("Not authenticated");
      }
    };

    checkAuthStatus();
  }, [navigate]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    setIsLoading(true);

    try {
      const result = await AuthService.signIn(email, password);

      if (!result.success) {
        setError(result.error || "Invalid email or password");
        return;
      }

      if (result.isSignedIn) {
        // Check if user is in admin group
        const session = await AuthService.getAuthSession(false);
        const idToken = session?.tokens?.idToken;
        const groups = idToken?.payload?.["cognito:groups"] as string[] | undefined;
        
        if (!groups || !groups.includes("admin")) {
          await AuthService.signOut();
          setError("Access denied. You must be an administrator to access this portal.");
          return;
        }
        
        navigate("/admin/dashboard");
      } else if (
        result.nextStep?.signInStep ===
        "CONFIRM_SIGN_IN_WITH_NEW_PASSWORD_REQUIRED"
      ) {
        setViewState("newPassword");
      }
    } catch (err: any) {
      setError(err.message || "Invalid email or password");
    } finally {
      setIsLoading(false);
    }
  };

  const handleNewPasswordSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");

    if (newPassword !== confirmPassword) {
      setError("Passwords do not match");
      return;
    }

    if (newPassword.length < 8) {
      setError("Password must be at least 8 characters");
      return;
    }

    setIsLoading(true);

    try {
      const user = await confirmSignIn({
        challengeResponse: newPassword,
      });

      if (user.isSignedIn) {
        // Clear cache to ensure fresh session
        AuthService.clearAuthCache();
        navigate("/admin/dashboard");
      }
    } catch (err: any) {
      setError(err.message || "Failed to set new password");
    } finally {
      setIsLoading(false);
    }
  };

  const handleForgotPasswordSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    setIsLoading(true);

    try {
      const result = await AuthService.forgotPassword(email);

      if (!result.success) {
        setError(result.error || "Failed to send reset code");
        return;
      }

      setSuccessMessage("A verification code has been sent to your email.");
      setViewState("resetPassword");
    } catch (err: any) {
      setError(err.message || "Failed to send reset code");
    } finally {
      setIsLoading(false);
    }
  };

  const handleResetPasswordSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    setSuccessMessage("");

    if (newPassword !== confirmPassword) {
      setError("Passwords do not match");
      return;
    }

    if (newPassword.length < 8) {
      setError("Password must be at least 8 characters");
      return;
    }

    setIsLoading(true);

    try {
      const result = await AuthService.confirmForgotPassword(
        email,
        resetCode,
        newPassword
      );

      if (!result.success) {
        setError(result.error || "Failed to reset password");
        return;
      }

      setSuccessMessage("Password reset successfully! You can now log in.");
      setNewPassword("");
      setConfirmPassword("");
      setResetCode("");
      setViewState("login");
    } catch (err: any) {
      setError(err.message || "Failed to reset password");
    } finally {
      setIsLoading(false);
    }
  };

  const resetToLogin = () => {
    setError("");
    setSuccessMessage("");
    setNewPassword("");
    setConfirmPassword("");
    setResetCode("");
    setViewState("login");
  };

  const getTitle = () => {
    switch (viewState) {
      case "newPassword":
        return "Set New Password";
      case "forgotPassword":
        return "Forgot Password";
      case "resetPassword":
        return "Reset Password";
      default:
        return "Admin Login";
    }
  };

  const getDescription = () => {
    switch (viewState) {
      case "newPassword":
        return "Please set a new password for your account";
      case "forgotPassword":
        return "Enter your email to receive a password reset code";
      case "resetPassword":
        return "Enter the code sent to your email and your new password";
      default:
        return "Enter your credentials to access the admin dashboard";
    }
  };

  return (
    <div className="min-h-screen flex flex-col bg-gray-50">
      <div className="flex-1 flex items-center justify-center px-4">
        <Card className="w-full max-w-md">
          <CardHeader className="space-y-1 text-center">
            <CardTitle className="text-2xl font-bold">{getTitle()}</CardTitle>
            <CardDescription>{getDescription()}</CardDescription>
          </CardHeader>
          <CardContent>
            {successMessage && (
              <div className="text-sm text-green-600 bg-green-50 p-3 rounded mb-4">
                {successMessage}
              </div>
            )}

            {viewState === "login" && (
              <form onSubmit={handleSubmit} className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="email">Email</Label>
                  <Input
                    id="email"
                    type="email"
                    placeholder="admin@example.com"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    required
                    disabled={isLoading}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="password">Password</Label>
                  <div className="relative">
                    <Input
                      id="password"
                      type={showPassword ? "text" : "password"}
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      required
                      disabled={isLoading}
                    />
                    <button
                      type="button"
                      onClick={() => setShowPassword(!showPassword)}
                      className="absolute right-3 top-1/2 -translate-y-1/2"
                    >
                      {showPassword ? (
                        <EyeOff className="h-4 w-4 text-gray-500" />
                      ) : (
                        <Eye className="h-4 w-4 text-gray-500" />
                      )}
                    </button>
                  </div>
                </div>
                {error && (
                  <div className="text-sm text-red-600 bg-red-50 p-3 rounded">
                    {error}
                  </div>
                )}
                <Button type="submit" className="w-full" disabled={isLoading}>
                  {isLoading ? "Logging in..." : "Login"}
                </Button>
                <button
                  type="button"
                  onClick={() => {
                    setError("");
                    setViewState("forgotPassword");
                  }}
                  className="w-full text-sm text-[#2c5f7c] hover:underline"
                >
                  Forgot password?
                </button>
              </form>
            )}

            {viewState === "forgotPassword" && (
              <form onSubmit={handleForgotPasswordSubmit} className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="resetEmail">Email</Label>
                  <Input
                    id="resetEmail"
                    type="email"
                    placeholder="admin@example.com"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    required
                    disabled={isLoading}
                  />
                </div>
                {error && (
                  <div className="text-sm text-red-600 bg-red-50 p-3 rounded">
                    {error}
                  </div>
                )}
                <Button type="submit" className="w-full" disabled={isLoading}>
                  {isLoading ? "Sending..." : "Send Reset Code"}
                </Button>
                <button
                  type="button"
                  onClick={resetToLogin}
                  className="w-full text-sm text-gray-500 hover:text-gray-700 flex items-center justify-center gap-1"
                >
                  <ArrowLeft className="h-3 w-3" />
                  Back to login
                </button>
              </form>
            )}

            {viewState === "resetPassword" && (
              <form onSubmit={handleResetPasswordSubmit} className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="resetCode">Verification Code</Label>
                  <Input
                    id="resetCode"
                    type="text"
                    placeholder="Enter 6-digit code"
                    value={resetCode}
                    onChange={(e) => setResetCode(e.target.value)}
                    required
                    disabled={isLoading}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="newResetPassword">New Password</Label>
                  <div className="relative">
                    <Input
                      id="newResetPassword"
                      type={showNewPassword ? "text" : "password"}
                      value={newPassword}
                      onChange={(e) => setNewPassword(e.target.value)}
                      required
                      disabled={isLoading}
                      placeholder="Enter new password"
                    />
                    <button
                      type="button"
                      onClick={() => setShowNewPassword(!showNewPassword)}
                      className="absolute right-3 top-1/2 -translate-y-1/2"
                    >
                      {showNewPassword ? (
                        <EyeOff className="h-4 w-4 text-gray-500" />
                      ) : (
                        <Eye className="h-4 w-4 text-gray-500" />
                      )}
                    </button>
                  </div>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="confirmResetPassword">
                    Confirm New Password
                  </Label>
                  <div className="relative">
                    <Input
                      id="confirmResetPassword"
                      type={showConfirmPassword ? "text" : "password"}
                      value={confirmPassword}
                      onChange={(e) => setConfirmPassword(e.target.value)}
                      required
                      disabled={isLoading}
                      placeholder="Confirm new password"
                    />
                    <button
                      type="button"
                      onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                      className="absolute right-3 top-1/2 -translate-y-1/2"
                    >
                      {showConfirmPassword ? (
                        <EyeOff className="h-4 w-4 text-gray-500" />
                      ) : (
                        <Eye className="h-4 w-4 text-gray-500" />
                      )}
                    </button>
                  </div>
                </div>
                {error && (
                  <div className="text-sm text-red-600 bg-red-50 p-3 rounded">
                    {error}
                  </div>
                )}
                <Button type="submit" className="w-full" disabled={isLoading}>
                  {isLoading ? "Resetting..." : "Reset Password"}
                </Button>
                <button
                  type="button"
                  onClick={resetToLogin}
                  className="w-full text-sm text-gray-500 hover:text-gray-700 flex items-center justify-center gap-1"
                >
                  <ArrowLeft className="h-3 w-3" />
                  Back to login
                </button>
              </form>
            )}

            {viewState === "newPassword" && (
              <form onSubmit={handleNewPasswordSubmit} className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="newPassword">New Password</Label>
                  <div className="relative">
                    <Input
                      id="newPassword"
                      type={showNewPassword ? "text" : "password"}
                      value={newPassword}
                      onChange={(e) => setNewPassword(e.target.value)}
                      required
                      disabled={isLoading}
                      placeholder="Enter new password"
                    />
                    <button
                      type="button"
                      onClick={() => setShowNewPassword(!showNewPassword)}
                      className="absolute right-3 top-1/2 -translate-y-1/2"
                    >
                      {showNewPassword ? (
                        <EyeOff className="h-4 w-4 text-gray-500" />
                      ) : (
                        <Eye className="h-4 w-4 text-gray-500" />
                      )}
                    </button>
                  </div>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="confirmPassword">Confirm New Password</Label>
                  <div className="relative">
                    <Input
                      id="confirmPassword"
                      type={showConfirmPassword ? "text" : "password"}
                      value={confirmPassword}
                      onChange={(e) => setConfirmPassword(e.target.value)}
                      required
                      disabled={isLoading}
                      placeholder="Confirm new password"
                    />
                    <button
                      type="button"
                      onClick={() =>
                        setShowConfirmPassword(!showConfirmPassword)
                      }
                      className="absolute right-3 top-1/2 -translate-y-1/2"
                    >
                      {showConfirmPassword ? (
                        <EyeOff className="h-4 w-4 text-gray-500" />
                      ) : (
                        <Eye className="h-4 w-4 text-gray-500" />
                      )}
                    </button>
                  </div>
                </div>
                {error && (
                  <div className="text-sm text-red-600 bg-red-50 p-3 rounded">
                    {error}
                  </div>
                )}
                <Button type="submit" className="w-full" disabled={isLoading}>
                  {isLoading ? "Setting Password..." : "Set New Password"}
                </Button>
              </form>
            )}
          </CardContent>
        </Card>
      </div>
      <Footer />
    </div>
  );
}
