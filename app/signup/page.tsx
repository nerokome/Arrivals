"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { FiArrowLeft, FiCheck, FiUploadCloud } from "react-icons/fi";
import { toast } from "sonner";

type SignupForm = {
  organizationName: string;
  name: string;
  email: string;
  phone: string;
  password: string;
  gender: string;
};

const getRequestErrorMessage = (error: unknown, fallback: string) => {
  const requestError = error as {
    response?: { data?: { message?: unknown } };
    message?: unknown;
  };
  const apiMessage = requestError.response?.data?.message;
  if (typeof apiMessage === "string" && apiMessage) return apiMessage;
  if (typeof requestError.message === "string" && requestError.message) return requestError.message;
  return fallback;
};

const getValidationMessages = (payload: any): string[] => {
  const errors = payload?.errors ?? payload?.data?.errors ?? payload?.message ?? payload?.data?.message;
  if (Array.isArray(errors)) {
    return errors.map((error) => typeof error === "string" ? error : error?.msg ?? error?.message).filter(Boolean);
  }
  if (typeof errors === "string") return [errors];
  if (errors && typeof errors === "object") {
    return Object.values(errors).flatMap((value) => Array.isArray(value) ? value : [value]).filter((value): value is string => typeof value === "string");
  }
  return [];
};

const API_BASE_URL = (process.env.NEXT_PUBLIC_BASE_URL ?? "").replace(/\/+$/, "");
const API_VERSION = "/api/v1";
const organizationEndpoint = (path: string) => {
  const base = API_BASE_URL.endsWith(API_VERSION)
    ? API_BASE_URL
    : `${API_BASE_URL}${API_VERSION}`;
  return `${base}${path}`;
};
const MAX_IMAGE_SIZE = 5 * 1024 * 1024;
const ACCEPTED_IMAGE_TYPES = ["image/jpeg", "image/png", "image/webp"];

const initialForm: SignupForm = {
  organizationName: "",
  name: "",
  email: "",
  phone: "",
  password: "",
  gender: "",
};

export default function OrganizationSignupPage() {
  const [step, setStep] = useState<"signup" | "image" | "complete">("signup");
  const [form, setForm] = useState(initialForm);
  const [token, setToken] = useState("");
  const [imageFile, setImageFile] = useState<File | null>(null);
  const [previewUrl, setPreviewUrl] = useState("");
  const [uploadedImageUrl, setUploadedImageUrl] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [signupErrors, setSignupErrors] = useState<string[]>([]);

  useEffect(() => {
    if (!imageFile) {
      setPreviewUrl("");
      return;
    }
    const url = URL.createObjectURL(imageFile);
    setPreviewUrl(url);
    return () => URL.revokeObjectURL(url);
  }, [imageFile]);

  const updateField = (field: keyof SignupForm, value: string) => {
    setForm((current) => ({ ...current, [field]: value }));
  };

  const submitSignup = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setSignupErrors([]);
    setIsSubmitting(true);
    try {
      const response = await fetch(organizationEndpoint("/organizations/signup"), {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          organizationName: form.organizationName.trim(),
          name: form.name.trim(),
          email: form.email.trim(),
          phone: form.phone.trim(),
          password: form.password,
          gender: form.gender,
        }),
      });
      const responseData = await response.json().catch(() => ({}));
      if (!response.ok) {
        const validationMessages = response.status === 400 ? getValidationMessages(responseData) : [];
        if (validationMessages.length) {
          setSignupErrors(validationMessages);
          throw new Error(validationMessages.join(" "));
        }
        throw new Error(responseData?.message || responseData?.data?.message || "Unable to create your organization. Please try again.");
      }
      const signupData = responseData?.data ?? responseData;
      const authToken = signupData?.token;
      if (typeof authToken !== "string" || !authToken) {
        throw new Error(signupData?.message || "Signup succeeded without an auth token. Please contact support.");
      }
      setToken(authToken);
      const organization = signupData?.organization ?? signupData?.org;
      const owner = signupData?.owner ?? signupData?.admin ?? signupData?.user;
      window.localStorage.setItem("attendly_organization", JSON.stringify({
        id: organization?.id,
        name: organization?.name || form.organizationName.trim(),
        ownerId: organization?.ownerId ?? owner?.id,
        logoUrl: organization?.logoUrl ?? organization?.logo ?? null,
        bannerUrl: organization?.bannerUrl ?? organization?.banner ?? null,
      }));
      setStep("image");
      toast.success("Organization created. Add a banner or finish setup.");
    } catch (error: unknown) {
      toast.error(getRequestErrorMessage(error, "Unable to create your organization. Please try again."));
    } finally {
      setIsSubmitting(false);
    }
  };

  const selectImage = (file: File | undefined) => {
    if (!file) return;
    if (!ACCEPTED_IMAGE_TYPES.includes(file.type)) {
      setImageFile(null);
      toast.error("Choose a JPG, PNG, or WebP image.");
      return;
    }
    if (file.size > MAX_IMAGE_SIZE) {
      setImageFile(null);
      toast.error("The image must be 5 MB or smaller.");
      return;
    }
    setImageFile(file);
  };

  const submitImage = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (!imageFile || !token) return;
    setIsSubmitting(true);
    try {
      const body = new FormData();
      body.append("image", imageFile);
      const response = await fetch(organizationEndpoint("/organizations/me/image"), {
        method: "POST",
        headers: { Authorization: `Bearer ${token}` },
        body,
      });
      const responseData = await response.json().catch(() => ({}));
      if (!response.ok) {
        const messages = getValidationMessages(responseData);
        throw new Error(messages.join(" ") || responseData?.message || "Unable to upload the image. Please try again.");
      }
      const organization = responseData?.data?.organization ?? responseData?.organization ?? responseData?.data ?? responseData;
      const responseImageUrl = organization?.imageUrl ?? responseData?.imageUrl;
      const bannerUrl = organization?.bannerUrl ?? organization?.banner ?? responseImageUrl;
      const imageUrl = bannerUrl;
      window.localStorage.setItem("attendly_organization", JSON.stringify({
        id: organization?.id,
        name: organization?.name || form.organizationName,
        ownerId: organization?.ownerId,
        logoUrl: null,
        bannerUrl: bannerUrl ?? null,
      }));
      setUploadedImageUrl(typeof imageUrl === "string" ? imageUrl : "");
      setStep("complete");
      toast.success("Your organization banner has been uploaded.");
    } catch (error: unknown) {
      toast.error(getRequestErrorMessage(error, "Unable to upload the image. Please try again."));
    } finally {
      setIsSubmitting(false);
    }
  };

  const stepNumber = step === "signup" ? 1 : step === "image" ? 2 : 3;

  return (
    <main className="min-h-screen !w-full !overflow-y-auto !p-4 sm:!p-8 flex items-center justify-center bg-slate-50">
      <section className="w-full max-w-2xl rounded-2xl border border-slate-200 bg-white p-6 shadow-xl sm:p-10">
        <Link href="/" className="mb-7 inline-flex items-center gap-2 text-sm font-medium text-slate-500 hover:text-[#263238]">
          <FiArrowLeft aria-hidden="true" /> Back to sign in
        </Link>

        <div className="mb-8">
          <div className="mb-3 flex items-center gap-2 font-semibold text-slate-900">
            <img src="/punchly-icon.svg" alt="" className="h-10 w-10 rounded-lg" />
            <span className="text-xl">Punchly</span>
          </div>
          <div className="mb-3 flex items-center gap-2 text-xs font-semibold uppercase tracking-wide text-[#263238]">
            <span>Step {stepNumber} of 3</span>
            <span className="h-px flex-1 bg-slate-200" />
          </div>
          <h1 className="text-2xl font-semibold text-slate-900 sm:text-3xl">
            {step === "signup" ? "Create your organization" : step === "image" ? "Add your organization banner" : "You’re all set"}
          </h1>
          <p className="mt-2 text-sm text-slate-600">
            {step === "signup" && "Set up your organization and administrator account."}
            {step === "image" && "Upload a banner so your organization is easy to recognize."}
            {step === "complete" && "Your organization is ready. Sign in to continue to Punchly."}
          </p>
          {step === "signup" && signupErrors.length > 0 && (
            <div role="alert" className="mb-5 rounded-lg border border-red-200 bg-red-50 p-3 text-sm text-red-800">
              <p className="mb-1 font-semibold">Please correct the following:</p>
              <ul className="list-inside list-disc">{signupErrors.map((message, index) => <li key={`${index}-${message}`}>{message}</li>)}</ul>
            </div>
          )}
        </div>

        {step === "signup" && (
          <form onSubmit={submitSignup} className="grid grid-cols-1 gap-5 sm:grid-cols-2">
            <label className="text-sm font-medium text-slate-700 sm:col-span-2">
              Organization name
              <input required minLength={2} maxLength={120} autoComplete="organization" value={form.organizationName} onChange={(event) => updateField("organizationName", event.target.value)} placeholder="Your organization" className="mt-2 w-full rounded-lg border border-slate-300 px-3 py-3 text-base outline-none transition focus:border-[#36474F] focus:ring-2 focus:ring-[#DCE4E6]" />
            </label>
            <label className="text-sm font-medium text-slate-700">
              Admin name
              <input required autoComplete="name" value={form.name} onChange={(event) => updateField("name", event.target.value)} placeholder="Full name" className="mt-2 w-full rounded-lg border border-slate-300 px-3 py-3 text-base outline-none transition focus:border-[#36474F] focus:ring-2 focus:ring-[#DCE4E6]" />
            </label>
            <label className="text-sm font-medium text-slate-700">
              Gender
              <select required value={form.gender} onChange={(event) => updateField("gender", event.target.value)} className="mt-2 w-full rounded-lg border border-slate-300 bg-white px-3 py-3 text-base outline-none focus:border-[#36474F] focus:ring-2 focus:ring-[#DCE4E6]">
                <option value="" disabled>Select gender</option>
                <option value="Male">Male</option>
                <option value="Female">Female</option>
              </select>
            </label>
            <label className="text-sm font-medium text-slate-700">
              Work email
              <input required type="email" autoComplete="email" value={form.email} onChange={(event) => updateField("email", event.target.value)} placeholder="you@company.com" className="mt-2 w-full rounded-lg border border-slate-300 px-3 py-3 text-base outline-none focus:border-[#36474F] focus:ring-2 focus:ring-[#DCE4E6]" />
            </label>
            <label className="text-sm font-medium text-slate-700">
              Phone
              <input required type="tel" autoComplete="tel" value={form.phone} onChange={(event) => updateField("phone", event.target.value)} placeholder="Phone number" className="mt-2 w-full rounded-lg border border-slate-300 px-3 py-3 text-base outline-none focus:border-[#36474F] focus:ring-2 focus:ring-[#DCE4E6]" />
            </label>
            <label className="text-sm font-medium text-slate-700 sm:col-span-2">
              Password
              <input required type="password" minLength={6} autoComplete="new-password" value={form.password} onChange={(event) => updateField("password", event.target.value)} placeholder="Create a password" className="mt-2 w-full rounded-lg border border-slate-300 px-3 py-3 text-base outline-none focus:border-[#36474F] focus:ring-2 focus:ring-[#DCE4E6]" />
            </label>
            <button type="submit" disabled={isSubmitting} className="!mt-1 !w-full rounded-lg !bg-[#36474F] px-4 py-3 font-semibold text-white hover:!bg-[#263238] disabled:cursor-wait disabled:opacity-60 sm:col-span-2">
              {isSubmitting ? "Creating organization…" : "Create organization"}
            </button>
          </form>
        )}

        {step === "image" && (
          <form onSubmit={submitImage} className="space-y-5">
            <label className="block text-sm font-medium text-slate-700">
              <span className="mt-2 block text-sm text-slate-600">Organization banner</span>
            </label>

            <label className="flex min-h-48 cursor-pointer flex-col items-center justify-center rounded-xl border-2 border-dashed border-slate-300 bg-slate-50 px-5 py-8 text-center transition hover:border-[#53666D] hover:bg-[#EDF2F3]">
              {previewUrl ? (
                <img src={previewUrl} alt="Preview of organization banner" className="mb-4 max-h-48 w-full object-contain" />
              ) : (
                <FiUploadCloud className="mb-3 text-[#36474F]" size={32} aria-hidden="true" />
              )}
              <span className="font-semibold text-slate-800">{imageFile ? imageFile.name : "Choose a banner to preview"}</span>
              <span className="mt-1 text-xs text-slate-500">JPG, PNG, or WebP · up to 5 MB</span>
              <input type="file" accept="image/jpeg,image/png,image/webp,.jpg,.jpeg,.png,.webp" className="sr-only" onChange={(event) => selectImage(event.target.files?.[0])} />
            </label>

            <div className="flex flex-col-reverse gap-3 sm:flex-row sm:justify-between">
              <div className="flex flex-col-reverse gap-3 sm:flex-row">
                <button type="button" onClick={() => setStep("signup")} className="rounded-lg border border-slate-300 px-4 py-3 font-medium text-slate-700 hover:bg-slate-50">Back</button>
                <button type="button" onClick={() => setStep("complete")} className="rounded-lg border border-slate-300 px-4 py-3 font-medium text-slate-700 hover:bg-slate-50">Skip for now</button>
              </div>
              <button type="submit" disabled={!imageFile || isSubmitting} className="!m-0 rounded-lg !bg-[#36474F] px-5 py-3 font-semibold text-white hover:!bg-[#263238] disabled:cursor-not-allowed disabled:opacity-50">
                {isSubmitting ? "Uploading image…" : "Upload and finish"}
              </button>
            </div>
          </form>
        )}

        {step === "complete" && (
          <div className="text-center">
            {uploadedImageUrl ? (
              <img src={uploadedImageUrl} alt="Uploaded organization banner" className="mx-auto mb-5 max-h-40 max-w-full rounded-lg object-contain" />
            ) : (
              <div className="mx-auto mb-5 flex h-16 w-16 items-center justify-center rounded-full bg-green-100 text-green-700"><FiCheck size={30} /></div>
            )}
            <p className="mb-7 text-sm text-slate-600">{form.organizationName} has been created successfully.</p>
            <Link href="/" className="inline-flex w-full items-center justify-center rounded-lg bg-[#36474F] px-5 py-3 font-semibold text-white hover:bg-[#263238]">Go to sign in</Link>
          </div>
        )}
      </section>
    </main>
  );
}
