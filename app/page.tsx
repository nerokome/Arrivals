
'use client';
import React, { useEffect, useState } from "react";
import { FaEye, FaEyeSlash } from "react-icons/fa";
import { FiMail, FiLock } from "react-icons/fi";
import { useRouter } from "next/navigation";
import { useUserPrivileges } from "@/utils/userPrivileges";
import { SVGLoader } from "@/components/SVGLoader";
import { toast } from "sonner";
import Link from "next/link";
import { useAuth } from "@/app/utils/AuthProvider";
import { getStoredOrganization, type AuthUser } from "@/utils/auth";



const Login = () => {
  const router = useRouter()
  const { signIn } = useAuth();
  const { isSuperAdmin, isAdmin, isAgent } = useUserPrivileges();
  const [password, setPassword] = React.useState<string>('');
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [email, setEmail] = useState("");



  const submitHandler = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setLoading(true);

    try {
      const configuredBase = (process.env.NEXT_PUBLIC_BASE_URL ?? "").replace(/\/+$/, "");
      const apiBase = configuredBase.endsWith("/api/v1") ? configuredBase : `${configuredBase}/api/v1`;
      const response = await fetch(`${apiBase}/users/login`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, password }),
      });
      const responseData = await response.json().catch(() => ({}));
      if (!response.ok) {
        throw new Error(responseData?.message || "Invalid email or password");
      }
      let { user, token } = responseData?.data ?? {};

      if (!user || !token) {
        throw new Error(responseData?.message || "Invalid email or password");
      }
      const currentUserResponse = await fetch(`${apiBase}/users/current-user`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (currentUserResponse.ok) {
        const currentUserPayload = await currentUserResponse.json().catch(() => ({}));
        const currentUserData = currentUserPayload?.data ?? {};
        const currentUser = currentUserData?.user ?? currentUserPayload?.user ?? currentUserData;
        user = { ...user, ...currentUserData, ...currentUser };
      }
      const authenticatedUser: AuthUser = {
        id: user.id,
        email: user.email,
        token,
        role: user.role,
        phone: user.phone ?? "",
        gender: user.gender ?? "",
        fullName: `${user.name ?? user.fullName ?? ""}`,
        officeId: user.officeId ?? "",
        organizationId: user.organizationId ?? "",
        profilePictureUrl: user.profilePictureUrl ?? null,
        organization:
          user.organization ?? responseData?.data?.organization ?? getStoredOrganization(user.id) ?? undefined,
      };
      signIn(authenticatedUser);
      toast.success("Login successful!");
      router.push('/dashboard');
    } catch (error: unknown) {
      toast.error(error instanceof Error ? error.message : "Unable to log in. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (isSuperAdmin || isAdmin) {
      router.push('/dashboard');
    } else if (isAgent) {
      router.push('/dashboard');
    }
  }, [isSuperAdmin, isAdmin, isAgent]);



  return (
    <div id="login-wrapper" className="relative">
      <div className='img_licence-containers_login'>
        <div className="w-full flex">
          <div className="flex items-center gap-2 font-semibold text-gray-900 ">
            <img src="/punchly-icon.svg" alt="" className="h-10 w-10 rounded-lg" />
            <span className="text-xl tracking-tight">Punchly</span>
          </div>
        </div>
      </div>
      <div className="login-form-container">
        <div className="form-container_text mb-4">
          <h1>Welcome back</h1>
          <p>Enter your credentials to access your account.</p>
        </div>
        <form onSubmit={submitHandler}>
          <div className="form-ctrl">
            <FiMail />
            <input
              className="input-group"
              type="text"
              placeholder="Enter your email"
              value={email}
              onChange={(e) => {
                setEmail(e.target.value);
              }}
            />
          </div>
          <div className="form-ctrl">
            <FiLock />
            <input
              className="input-group"
              type={showPassword ? "text" : "password"}
              placeholder="Enter your password"
              value={password}
              onChange={(e) => {
                setPassword(e.target.value);
              }}
            />

            <span id="i-FaEye" onClick={() => setShowPassword(!showPassword)}>
              {showPassword ? <FaEye /> : <FaEyeSlash />}
            </span>
          </div>

          <button type="submit" className="login_btn cursor-pointer">
            {loading ? <SVGLoader width={"20px"} height={"20px"} color={"#FFF"} /> : "Login"}
          </button>
        </form>
        <p className="mt-5 text-center text-sm text-gray-600">
          New to Punchly?{" "}
          <Link href="/signup" className="font-semibold text-[#36474F] hover:underline">
            Create an organization
          </Link>
        </p>
      </div>
      <div className="forgot_your_pass cursor-pointer"></div>
      <div className="absolute bottom-4 right-4 z-10">
        <Link
          href="/privacy"
          className="text-xs text-gray-500 hover:text-[#36474F] hover:underline transition-colors duration-200"
        >
          Privacy Policy
        </Link>
      </div>
    </div>
  );
};

export default Login;



