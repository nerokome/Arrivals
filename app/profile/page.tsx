"use client";

import React, { useState, useEffect, Suspense } from "react";
import { useUserPrivileges } from "@/utils/userPrivileges";
import PageHeader from "@/components/PageHeader";
import Input from "@/components/Input";
import Dropdowns from "@/components/CustomDropdown";
import { SVGLoader } from "@/components/SVGLoader";
import { toast } from "sonner";
import { getErrorMessage } from "@/utils/getErrorMessage";
import {
  useGetUserByIdQuery,
  useUpdateProfileMutation,
  useUpdatePasswordMutation
} from "@/utils/APISlice/userApi";
import { useAuth } from "@/app/utils/AuthProvider";
import type { OrganizationInfo } from "@/utils/auth";

type OrganizationImageType = "profilePicture" | "banner";

const getOrganizationImageSrc = (imageUrl?: string | null) => {
  if (!imageUrl) return "";
  return `/api/organization-image?url=${encodeURIComponent(imageUrl)}`;
};

const ProfileContent = () => {
  const { user } = useUserPrivileges();
  const isAgent = user?.role?.toUpperCase() === "AGENT";
  const { signIn } = useAuth();
  const userId = user?.id;
  const [activeTab, setActiveTab] = useState("info");
  const [organization, setOrganization] = useState<OrganizationInfo | null>(user?.organization ?? null);
  const [selectedImages, setSelectedImages] = useState<Partial<Record<OrganizationImageType, File>>>({});
  const [previewUrls, setPreviewUrls] = useState<Partial<Record<OrganizationImageType, string>>>({});
  const [uploadingType, setUploadingType] = useState<OrganizationImageType | null>(null);
  const [profilePictureUrl, setProfilePictureUrl] = useState<string | null>(user?.profilePictureUrl ?? null);

  useEffect(() => {
    setOrganization(user?.organization ?? null);
  }, [user?.organization]);

  useEffect(() => {
    setProfilePictureUrl(user?.profilePictureUrl ?? null);
  }, [user?.profilePictureUrl]);

  useEffect(() => {
    const nextPreviews: Partial<Record<OrganizationImageType, string>> = {};
    (Object.keys(selectedImages) as OrganizationImageType[]).forEach((type) => {
      const file = selectedImages[type];
      if (file) nextPreviews[type] = URL.createObjectURL(file);
    });
    setPreviewUrls(nextPreviews);
    return () => Object.values(nextPreviews).forEach((url) => URL.revokeObjectURL(url));
  }, [selectedImages]);

  useEffect(() => {
    if (!user?.token || isAgent) return;
    const configuredBase = (process.env.NEXT_PUBLIC_BASE_URL ?? "").replace(/\/+$/, "");
    const apiBase = configuredBase.endsWith("/api/v1") ? configuredBase : `${configuredBase}/api/v1`;
    fetch(`${apiBase}/organizations/me`, { headers: { Authorization: `Bearer ${user.token}` } })
      .then(async (response) => {
        if (!response.ok) return;
        const payload = await response.json();
        const fetched = payload?.data?.organization ?? payload?.organization;
        if (!fetched?.name) return;
        const nextOrganization: OrganizationInfo = {
          ...organization,
          id: fetched.id ?? organization?.id,
          name: fetched.name,
          logoUrl: fetched.logoUrl ?? null,
          bannerUrl: fetched.bannerUrl ?? null,
          ownerId: fetched.ownerId ?? organization?.ownerId,
        };
        setOrganization(nextOrganization);
        window.localStorage.setItem("attendly_organization", JSON.stringify(nextOrganization));
        signIn({ ...user, organization: nextOrganization });
      })
      .catch(() => undefined);
  // Fetch once for the active session; upload updates are handled locally below.
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user?.token, isAgent]);

  const handleImageSelection = (type: OrganizationImageType, file?: File) => {
    if (!file) return;
    if (!/^image\/(jpeg|png|webp)$/.test(file.type)) {
      toast.error("Choose a JPG, PNG, or WebP image.");
      return;
    }
    if (file.size > 5 * 1024 * 1024) {
      toast.error("Image must be 5 MB or smaller.");
      return;
    }
    setSelectedImages((current) => ({ ...current, [type]: file }));
  };

  const handleUploadImage = async (type: OrganizationImageType) => {
    const file = selectedImages[type];
    if (!file || !user?.token) {
      toast.error(file ? "Please sign in again before uploading." : "Choose an image first.");
      return;
    }
    setUploadingType(type);
    try {
      const configuredBase = (process.env.NEXT_PUBLIC_BASE_URL ?? "").replace(/\/+$/, "");
      const apiBase = configuredBase.endsWith("/api/v1") ? configuredBase : `${configuredBase}/api/v1`;
      const body = new FormData();
      body.append("image", file);
      const endpoint = type === "profilePicture"
        ? "/users/me/profile-picture"
        : "/organizations/me/banner";
      const response = await fetch(`${apiBase}${endpoint}`, {
        method: "PUT",
        headers: { Authorization: `Bearer ${user.token}` },
        body,
      });
      const payload = await response.json().catch(() => ({}));
      if (!response.ok) throw new Error(payload?.message || "Image upload failed.");

      if (type === "profilePicture") {
        const nextUrl = payload?.data?.user?.profilePictureUrl;
        if (!nextUrl) throw new Error("The response did not include the profile picture URL.");
        setProfilePictureUrl(nextUrl);
        signIn({ ...user, profilePictureUrl: nextUrl });
      } else {
        const returnedOrganization = payload?.data?.organization;
        const nextUrl = returnedOrganization?.bannerUrl;
        if (!nextUrl) throw new Error("The response did not include the organization banner URL.");
        const nextOrganization: OrganizationInfo = {
          ...(organization ?? { name: returnedOrganization.name ?? "Organization" }),
          id: returnedOrganization.id ?? organization?.id,
          name: returnedOrganization.name ?? organization?.name ?? "Organization",
          ownerId: returnedOrganization.ownerId ?? organization?.ownerId,
          logoUrl: returnedOrganization.logoUrl ?? organization?.logoUrl ?? null,
          bannerUrl: nextUrl,
        };
        setOrganization(nextOrganization);
        window.localStorage.setItem("attendly_organization", JSON.stringify(nextOrganization));
        signIn({ ...user, organization: nextOrganization });
      }
      setSelectedImages((current) => ({ ...current, [type]: undefined }));
      toast.success(payload?.message || "Image updated.");
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Image upload failed.");
    } finally {
      setUploadingType(null);
    }
  };

  // RTK Query endpoints
  const { data: userData, isLoading: isLoadingUser } = useGetUserByIdQuery(
    userId || "",
    { skip: !userId || isAgent }
  );

  const [updateProfile, { isLoading: isUpdatingProfile }] = useUpdateProfileMutation();
  const [updatePassword, { isLoading: isUpdatingPassword }] = useUpdatePasswordMutation();

  // Profile Form State
  const [profileInput, setProfileInput] = useState({
    name: "",
    phone: "",
    gender: "",
  });

  // Password Form State
  const [passwordInput, setPasswordInput] = useState({
    oldPassword: "",
    newPassword: "",
    confirmPassword: "",
  });

  // Populate profile info from fetched API user details
  useEffect(() => {
    if (userData) {
      const u = userData.data?.user || userData.data?.data || userData.data || userData;
      setProfilePictureUrl(u?.profilePictureUrl ?? user?.profilePictureUrl ?? null);
      if (u?.profilePictureUrl && u.profilePictureUrl !== user?.profilePictureUrl && user) {
        signIn({ ...user, profilePictureUrl: u.profilePictureUrl });
      }
      setProfileInput({
        name: u?.name || u?.fullName || "",
        phone: u?.phone || "",
        gender: u?.gender || "",
      });
      if (typeof window !== "undefined") {
        localStorage.setItem("attendly_user_profile", JSON.stringify(u));
      }
    } else {
      if (typeof window !== "undefined") {
        const storedProfile = localStorage.getItem("attendly_user_profile");
        if (storedProfile) {
          try {
            const u = JSON.parse(storedProfile);
            setProfileInput({
              name: u?.name || u?.fullName || "",
              phone: u?.phone || "",
              gender: u?.gender || "",
            });
            return;
          } catch (e) {
            console.error(e);
          }
        }
      }
      if (user) {
        setProfileInput({
          name: user.fullName || "",
          phone: user.phone || "",
          gender: user.gender || "",
        });
      }
    }
  }, [userData, user, signIn]);

  const handleProfileChange = (field: string, value: string) => {
    setProfileInput((prev) => ({ ...prev, [field]: value }));
  };

  const handlePasswordChange = (field: string, value: string) => {
    setPasswordInput((prev) => ({ ...prev, [field]: value }));
  };

  const handleUpdateProfile = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!profileInput.name.trim()) {
      toast.error("Full name is required.");
      return;
    }
    try {
      const res = await updateProfile({
        name: profileInput.name,
        phone: profileInput.phone,
        gender: profileInput.gender,
      }).unwrap();
      if (user) {
        signIn({
          ...user,
          fullName: profileInput.name,
          phone: profileInput.phone,
          gender: profileInput.gender,
        });
      }
      toast.success(res?.message || "Profile updated successfully!");
    } catch (err: any) {
      toast.error(getErrorMessage(err, "Failed to update profile."));
    }
  };

  const handleUpdatePassword = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!passwordInput.oldPassword) {
      toast.error("Current password is required.");
      return;
    }
    if (!passwordInput.newPassword) {
      toast.error("New password is required.");
      return;
    }
    if (passwordInput.newPassword !== passwordInput.confirmPassword) {
      toast.error("New password and confirm password do not match.");
      return;
    }
    try {
      const res = await updatePassword({
        oldPassword: passwordInput.oldPassword,
        newPassword: passwordInput.newPassword,
      }).unwrap();
      toast.success(res?.message || "Password updated successfully!");
      setPasswordInput({
        oldPassword: "",
        newPassword: "",
        confirmPassword: "",
      });
    } catch (err: any) {
      toast.error(getErrorMessage(err, "Failed to update password."));
    }
  };

  if (!userId && isLoadingUser) {
    return (
      <div className="flex justify-center items-center h-[300px] w-full">
        <SVGLoader width="40px" height="40px" color="#36474F" />
      </div>
    );
  }

  return (
    <div className="w-full">
      <div className="flex flex-row justify-between gap-[20px] border border-[#fff] border-b-[#E5E7EB] pb-[20px]">
        <PageHeader text="Profile Settings" />
      </div>

      <div className="flex flex-col md:flex-row gap-[30px] mt-[24px]">
        {/* Navigation Sidebar Tabs */}
        <div className="w-full md:w-[25%] flex flex-col gap-[8px]">
          <button
            onClick={() => setActiveTab("info")}
            className={`w-full text-left px-[16px] py-[12px] text-[14px] leading-[150%] font-medium transition cursor-pointer rounded-none border ${activeTab === "info"
                ? "!bg-[#36474F] text-white border-[#36474F]"
                : "!bg-white text-[#344249] border-[#E5E7EB] hover:bg-gray-50"
              }`}
          >
            Personal Information
          </button>
          <button
            onClick={() => setActiveTab("password")}
            className={`w-full text-left px-[16px] py-[12px] text-[14px] leading-[150%] font-medium transition cursor-pointer rounded-none border ${activeTab === "password"
                ? "!bg-[#36474F] text-white border-[#36474F]"
                : "!bg-white text-[#344249] border-[#E5E7EB] hover:bg-gray-50"
              }`}
          >
            Security & Password
          </button>
          <button
            onClick={() => setActiveTab("branding")}
            className={`w-full text-left px-[16px] py-[12px] text-[14px] leading-[150%] font-medium transition cursor-pointer rounded-none border ${activeTab === "branding"
                ? "!bg-[#36474F] text-white border-[#36474F]"
                : "!bg-white text-[#344249] border-[#E5E7EB] hover:bg-gray-50"
              }`}
          >
            {isAgent ? "Profile Picture" : "Organization Branding"}
          </button>
        </div>

        {/* Tab Content Panel */}
        <div className="w-full md:w-[75%] bg-white border border-[#E5E7EB] p-[24px]">
          {activeTab === "info" ? (
            <form onSubmit={handleUpdateProfile} className="flex flex-col gap-[20px]">
              <h2 className="text-[16px] font-semibold text-[#344249] border-b border-[#F2F4F7] pb-[10px] mb-[10px]">
                Update Profile Details
              </h2>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-[20px]">
                <Input
                  value={profileInput.name}
                  handleOnChange={(e) => handleProfileChange("name", e.target.value)}
                  label="Full Name"
                  placeholder="Enter full name"
                  type="text"
                />

                <Input
                  value={profileInput.phone}
                  handleOnChange={(e) => handleProfileChange("phone", e.target.value)}
                  label="Phone Number"
                  placeholder="Enter phone number"
                  type="text"
                />
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-[20px] items-end">
                <div className="flex flex-col w-full">
                  <Dropdowns
                    label={profileInput.gender || "Select Gender"}
                    options={[
                      "Male",
                      "Female",
                      "Other",
                      "Prefer not to say"
                    ]}
                    name="gender"
                    handleOnChange={handleProfileChange}
                    islabelone="Gender"
                  />
                </div>

                <Input
                  value={user?.email || ""}
                  handleOnChange={() => { }}
                  label="Email Address (Read Only)"
                  placeholder=""
                  type="text"
                  disabled
                />
              </div>

              <div className="flex justify-end mt-[10px]">
                <button
                  type="submit"
                  disabled={isUpdatingProfile}
                  className="px-6 py-[10px] !bg-[#36474F] text-white font-medium text-[14px] hover:!bg-[#263238] transition cursor-pointer min-w-[150px] flex items-center justify-center rounded-none"
                >
                  {isUpdatingProfile ? (
                    <SVGLoader width="24px" height="24px" color="#FFF" />
                  ) : (
                    "Save Changes"
                  )}
                </button>
              </div>
            </form>
          ) : activeTab === "password" ? (
            <form onSubmit={handleUpdatePassword} className="flex flex-col gap-[20px]">
              <h2 className="text-[16px] font-semibold text-[#344249] border-b border-[#F2F4F7] pb-[10px] mb-[10px]">
                Change Password
              </h2>

              <div className="flex flex-col w-full md:w-[60%] gap-[15px]">
                <Input
                  value={passwordInput.oldPassword}
                  handleOnChange={(e) => handlePasswordChange("oldPassword", e.target.value)}
                  label="Current Password"
                  placeholder="Enter current password"
                  type="password"
                />

                <Input
                  value={passwordInput.newPassword}
                  handleOnChange={(e) => handlePasswordChange("newPassword", e.target.value)}
                  label="New Password"
                  placeholder="Enter new password"
                  type="password"
                />

                <Input
                  value={passwordInput.confirmPassword}
                  handleOnChange={(e) => handlePasswordChange("confirmPassword", e.target.value)}
                  label="Confirm New Password"
                  placeholder="Confirm new password"
                  type="password"
                />
              </div>

              <div className="flex justify-end mt-[10px]">
                <button
                  type="submit"
                  disabled={isUpdatingPassword}
                  className="px-6 py-[10px] !bg-[#36474F] text-white font-medium text-[14px] hover:!bg-[#263238] transition cursor-pointer min-w-[150px] flex items-center justify-center rounded-none"
                >
                  {isUpdatingPassword ? (
                    <SVGLoader width="24px" height="24px" color="#FFF" />
                  ) : (
                    "Update Password"
                  )}
                </button>
              </div>
            </form>
          ) : (
            <div className="flex flex-col gap-[20px]">
              <div>
                <h2 className="text-[16px] font-semibold text-[#344249]">{isAgent ? "Profile Picture" : "Organization Branding"}</h2>
                <p className="text-[14px] text-[#66747A] mt-1">{isAgent ? "Change your profile picture." : "Change the profile picture and banner shown across your workspace."}</p>
              </div>
              {((isAgent ? ["profilePicture"] : ["profilePicture", "banner"]) as OrganizationImageType[]).map((type) => {
                const isProfilePicture = type === "profilePicture";
                const title = isProfilePicture ? "Profile picture" : "Organization banner";
                const savedUrl = isProfilePicture ? profilePictureUrl : organization?.bannerUrl;
                const preview = previewUrls[type] || getOrganizationImageSrc(savedUrl);
                return (
                  <section key={type} className="border border-[#E5E7EB] p-5 flex flex-col gap-4">
                    <div>
                      <h3 className="font-semibold text-[#344249]">{title}</h3>
                      <p className="text-[13px] text-[#66747A] mt-1">JPG, PNG, or WebP. Maximum size 5 MB.</p>
                    </div>
                    {isProfilePicture ? (
                      <div className="w-24 h-24 rounded-full overflow-hidden bg-[#EEF1F2] border border-[#DCE2E4] flex items-center justify-center text-[#66747A] text-xs">
                        {preview ? <img src={preview} alt="Profile picture preview" className="w-full h-full object-cover" /> : "No picture"}
                      </div>
                    ) : (
                      <div className="w-full h-36 overflow-hidden bg-[#EEF1F2] border border-[#DCE2E4] flex items-center justify-center text-[#66747A] text-xs">
                        {preview ? <img src={preview} alt="Organization banner preview" className="w-full h-full object-cover" /> : "No banner"}
                      </div>
                    )}
                    <div className="flex flex-wrap gap-3 items-center">
                      <label className="px-4 py-2 border border-[#36474F] text-[#36474F] text-sm font-medium cursor-pointer hover:bg-[#F2F4F5]">
                        Choose image
                        <input
                          type="file"
                          accept="image/jpeg,image/png,image/webp,.jpg,.jpeg,.png,.webp"
                          className="sr-only"
                          onChange={(event) => {
                            handleImageSelection(type, event.target.files?.[0]);
                            event.currentTarget.value = "";
                          }}
                        />
                      </label>
                      <button
                        type="button"
                        onClick={() => handleUploadImage(type)}
                        disabled={!selectedImages[type] || uploadingType !== null}
                        className="px-4 py-2 !bg-[#36474F] text-white text-sm font-medium hover:!bg-[#263238] disabled:opacity-50 disabled:cursor-not-allowed"
                      >
                        {uploadingType === type ? "Uploading…" : "Save image"}
                      </button>
                      {selectedImages[type] && <span className="text-xs text-[#66747A]">{selectedImages[type]?.name}</span>}
                    </div>
                  </section>
                );
              })}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

const ProfilePage = () => {
  return (
    <Suspense fallback={
      <div className="flex justify-center items-center h-[300px] w-full">
        <SVGLoader width="40px" height="40px" color="#36474F" />
      </div>
    }>
      <ProfileContent />
    </Suspense>
  );
};

export default ProfilePage;
