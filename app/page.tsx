
'use client';
import React, { useEffect, useState } from "react";
import { FaEye, FaEyeSlash } from "react-icons/fa";
import { FiMail, FiLock } from "react-icons/fi";
import { useRouter } from "next/navigation";
import axios from "axios";
import { useUserPrivileges } from "@/utils/userPrivileges";
import { SVGLoader } from "@/components/SVGLoader";
import { toast } from "sonner";
import Link from "next/link";
import { useAuth } from "@/app/utils/AuthProvider";
import type { AuthUser } from "@/utils/auth";



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
      const response = await axios.post(
        `${process.env.NEXT_PUBLIC_BASE_URL}/users/login`,
        { email, password }
      );
      const { user, token } = response.data?.data ?? {};

      if (!user || !token) {
        throw new Error(response.data?.message || "Invalid email or password");
      }
      if (user.role?.toUpperCase() === "AGENT") {
        throw new Error(
          "Access Denied: Agents are not allowed to log in to the web application."
        );
      }

      const authenticatedUser: AuthUser = {
        id: user.id,
        email: user.email,
        token,
        role: user.role,
        phone: user.phone ?? "",
        fullName: `${user.name ?? ""}`,
        officeId: user.officeId ?? "",
      };
      signIn(authenticatedUser);
      toast.success("Login successful!");
      router.push('/dashboard');
    } catch (error: unknown) {
      const message = axios.isAxiosError(error)
        ? error.response?.data?.message || error.message
        : error instanceof Error
          ? error.message
          : "Unable to log in. Please try again.";
      toast.error(message);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (isSuperAdmin || isAdmin) {
      router.push('/dashboard');
    } else if (isAgent) {
      router.push('/profile');
    }
  }, [isSuperAdmin, isAdmin, isAgent]);



  return (
    <div id="login-wrapper" className="relative">
      <div className='img_licence-containers_login'>
        <div className="w-full flex">
          <div className="flex items-center gap-2 font-semibold text-gray-900 ">
            <div className="bg-[#2563EB] p-2 rounded-lg">
              <svg
                className="w-6 h-6 text-white"
                fill="currentColor"
                viewBox="0 0 24 24" >
                <path d="M19 3h-1V1h-2v2H8V1H6v2H5a2 2 0 0 0-2 2v14a2 
        2 0 0 0 2 2h14a2 2 0 0 0 2-2V5a2 2 0 0 0-2-2Zm0 
        16H5V10h14Zm0-11H5V5h14Z" />
              </svg>
            </div>
            <span className="text-xl tracking-tight">Attendly</span>
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
      </div>
      <div className="forgot_your_pass cursor-pointer"></div>
      <div className="absolute bottom-4 right-4 z-10">
        <Link
          href="/privacy"
          className="text-xs text-gray-500 hover:text-[#2563EB] hover:underline transition-colors duration-200"
        >
          Privacy Policy
        </Link>
      </div>
    </div>
  );
};

export default Login;



