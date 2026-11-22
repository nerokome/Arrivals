export interface AuthUser {
  id: string;
  email: string;
  token: string;
  role: string;
  fullName: string;
  officeId: string;
  organizationId?: string;
  phone: string;
  gender?: string;
  profilePictureUrl?: string | null;
  organization?: OrganizationInfo;
}

export interface OrganizationInfo {
  id?: string;
  name: string;
  logoUrl?: string | null;
  bannerUrl?: string | null;
  ownerId?: string;
}

const AUTH_USER_KEY = "attendly_user";
const AUTH_ORGANIZATION_KEY = "attendly_organization";

export function getStoredOrganization(ownerId?: string): OrganizationInfo | null {
  if (typeof window === "undefined") return null;
  const storedOrganization = window.localStorage.getItem(AUTH_ORGANIZATION_KEY);
  if (!storedOrganization) return null;

  try {
    const organization: unknown = JSON.parse(storedOrganization);
    if (
      typeof organization !== "object" ||
      organization === null ||
      !("name" in organization) ||
      typeof organization.name !== "string"
    ) {
      throw new Error("Stored organization data is invalid");
    }

    const getOptionalString = (value: unknown) => typeof value === "string" ? value : undefined;
    const storedOwnerId = getOptionalString("ownerId" in organization ? organization.ownerId : undefined);
    if (ownerId && storedOwnerId && storedOwnerId !== ownerId) return null;

    return {
      id: getOptionalString("id" in organization ? organization.id : undefined),
      name: organization.name,
      logoUrl: getOptionalString("logoUrl" in organization ? organization.logoUrl : undefined) ?? null,
      bannerUrl: getOptionalString("bannerUrl" in organization ? organization.bannerUrl : undefined) ?? null,
      ownerId: storedOwnerId,
    };
  } catch (error) {
    console.error("Unable to read stored organization:", error);
    window.localStorage.removeItem(AUTH_ORGANIZATION_KEY);
    return null;
  }
}

export function getStoredAuthUser(): AuthUser | null {
  if (typeof window === "undefined") {
    return null;
  }

  const storedUser = window.localStorage.getItem(AUTH_USER_KEY);
  if (!storedUser) {
    return null;
  }

  try {
    const user: unknown = JSON.parse(storedUser);
    if (
      typeof user !== "object" ||
      user === null ||
      !("token" in user) ||
      typeof user.token !== "string" ||
      !("role" in user) ||
      typeof user.role !== "string"
    ) {
      throw new Error("Stored user data is invalid");
    }

    const getString = (value: unknown) =>
      typeof value === "string" ? value : "";

    return {
      id: getString("id" in user ? user.id : ""),
      email: getString("email" in user ? user.email : ""),
      token: user.token,
      role: user.role,
      fullName: getString("fullName" in user ? user.fullName : ""),
      officeId: getString("officeId" in user ? user.officeId : ""),
      organizationId: getString("organizationId" in user ? user.organizationId : "") || undefined,
      phone: getString("phone" in user ? user.phone : ""),
      gender: getString("gender" in user ? user.gender : "") || undefined,
      profilePictureUrl: getString("profilePictureUrl" in user ? user.profilePictureUrl : "") || null,
      organization:
        "organization" in user && typeof user.organization === "object" && user.organization !== null &&
        "name" in user.organization && typeof user.organization.name === "string"
          ? (user.organization as OrganizationInfo)
          : undefined,
    };
  } catch (error) {
    console.error("Unable to read stored user:", error);
    window.localStorage.removeItem(AUTH_USER_KEY);
    return null;
  }
}
