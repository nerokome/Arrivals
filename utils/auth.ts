export interface AuthUser {
  id: string;
  email: string;
  token: string;
  role: string;
  fullName: string;
  officeId: string;
  phone: string;
}

const AUTH_USER_KEY = "attendly_user";

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
      phone: getString("phone" in user ? user.phone : ""),
    };
  } catch (error) {
    console.error("Unable to read stored user:", error);
    window.localStorage.removeItem(AUTH_USER_KEY);
    return null;
  }
}
