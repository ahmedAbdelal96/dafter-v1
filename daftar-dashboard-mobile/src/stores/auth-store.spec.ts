import { authApi } from "@/lib/api/auth.api";
import * as clientModule from "@/lib/api/client";
import { useAuthStore } from "@/stores/auth-store";

jest.mock("@/lib/api/auth.api", () => ({
  authApi: {
    getMe: jest.fn(),
    login: jest.fn(),
    logout: jest.fn(),
  },
}));

jest.mock("@/lib/api/client", () => ({
  __esModule: true,
  default: {
    get: jest.fn(),
  },
  tokenStore: {
    load: jest.fn(),
    isAuthenticated: jest.fn(),
    clearAll: jest.fn(),
    getRefreshToken: jest.fn(),
  },
  registerSessionExpiredHandler: jest.fn(),
}));

jest.mock("@/lib/api/config", () => ({
  API_ENDPOINTS: {
    companies: {
      me: "/companies/me",
    },
  },
}));

const mockedAuthApi = authApi as jest.Mocked<typeof authApi>;
const mockedApiClient = clientModule.default as unknown as { get: jest.Mock };
const mockedTokenStore = clientModule.tokenStore as jest.Mocked<
  typeof clientModule.tokenStore
>;
const mockedRegisterSessionExpiredHandler =
  clientModule.registerSessionExpiredHandler as jest.MockedFunction<
    typeof clientModule.registerSessionExpiredHandler
  >;

const seededUser = {
  id: "user-1",
  email: "u@example.com",
  fullName: "Demo User",
  role: "OWNER",
  companyId: "company-1",
} as never;

const seededTenant = {
  id: "company-1",
  name: "Demo Tenant",
} as never;

function seedAuthenticatedState(): void {
  useAuthStore.setState({
    user: seededUser,
    tenant: seededTenant,
    isAuthenticated: true,
    isInitialized: false,
    isLoading: false,
    error: "stale-error",
  });
}

describe("useAuthStore reset behavior", () => {
  beforeEach(() => {
    jest.clearAllMocks();
    seedAuthenticatedState();

    mockedTokenStore.load.mockResolvedValue(undefined);
    mockedTokenStore.clearAll.mockResolvedValue(undefined);
    mockedTokenStore.isAuthenticated.mockReturnValue(true);
    mockedTokenStore.getRefreshToken.mockReturnValue("refresh-token");

    mockedApiClient.get.mockResolvedValue({ data: { data: seededTenant } });
  });

  it("initialize failure should clear tokens and reset to unauthenticated state", async () => {
    mockedAuthApi.getMe.mockRejectedValue(new Error("expired token"));

    await useAuthStore.getState().initialize();

    const state = useAuthStore.getState();

    expect(mockedTokenStore.load).toHaveBeenCalledTimes(1);
    expect(mockedTokenStore.clearAll).toHaveBeenCalledTimes(1);
    expect(mockedRegisterSessionExpiredHandler).toHaveBeenCalledTimes(1);

    expect(state.user).toBeNull();
    expect(state.tenant).toBeNull();
    expect(state.isAuthenticated).toBe(false);
    expect(state.isInitialized).toBe(true);
  });

  it("clearSession should reset state consistently and clear local tokens", () => {
    useAuthStore.getState().clearSession();

    const state = useAuthStore.getState();

    expect(mockedTokenStore.clearAll).toHaveBeenCalledTimes(1);
    expect(state.user).toBeNull();
    expect(state.tenant).toBeNull();
    expect(state.isAuthenticated).toBe(false);
    expect(state.isInitialized).toBe(true);
    expect(state.error).toBeNull();
  });

  it("logout should reset state in finally even when API logout fails", async () => {
    mockedAuthApi.logout.mockRejectedValue(new Error("network error"));

    await useAuthStore.getState().logout();

    const state = useAuthStore.getState();

    expect(mockedAuthApi.logout).toHaveBeenCalledWith("refresh-token");
    expect(mockedTokenStore.clearAll).toHaveBeenCalledTimes(1);
    expect(state.user).toBeNull();
    expect(state.tenant).toBeNull();
    expect(state.isAuthenticated).toBe(false);
    expect(state.isLoading).toBe(false);
    expect(state.error).toBeNull();
  });

  it("all reset paths should share the same core unauthenticated shape", async () => {
    mockedAuthApi.getMe.mockRejectedValue(new Error("expired token"));

    await useAuthStore.getState().initialize();
    const initializeReset = useAuthStore.getState();

    seedAuthenticatedState();
    mockedAuthApi.logout.mockRejectedValue(new Error("network error"));
    await useAuthStore.getState().logout();
    const logoutReset = useAuthStore.getState();

    seedAuthenticatedState();
    useAuthStore.getState().clearSession();
    const clearSessionReset = useAuthStore.getState();

    const pickCore = (state: typeof initializeReset) => ({
      user: state.user,
      tenant: state.tenant,
      isAuthenticated: state.isAuthenticated,
    });

    expect(pickCore(initializeReset)).toEqual({
      user: null,
      tenant: null,
      isAuthenticated: false,
    });
    expect(pickCore(logoutReset)).toEqual(pickCore(initializeReset));
    expect(pickCore(clearSessionReset)).toEqual(pickCore(initializeReset));
  });
});

describe("useAuthStore initialize/login flow behavior", () => {
  const loginCredentials = {
    email: "owner@example.com",
    password: "secret",
  };

  const loginResponse = {
    accessToken: "access-token",
    refreshToken: "refresh-token",
    user: seededUser,
    tenant: {
      id: "company-1",
      name: "Tenant From Login",
    },
  };

  beforeEach(() => {
    jest.clearAllMocks();

    useAuthStore.setState({
      user: null,
      tenant: null,
      isAuthenticated: false,
      isInitialized: false,
      isLoading: false,
      error: null,
    });

    mockedTokenStore.load.mockResolvedValue(undefined);
    mockedTokenStore.clearAll.mockResolvedValue(undefined);
    mockedTokenStore.getRefreshToken.mockReturnValue("refresh-token");
    mockedApiClient.get.mockResolvedValue({ data: { data: seededTenant } });
    mockedAuthApi.login.mockResolvedValue(loginResponse as never);
    mockedAuthApi.getMe.mockResolvedValue(seededUser);
  });

  it("initialize success should authenticate and hydrate user/tenant", async () => {
    mockedTokenStore.isAuthenticated.mockReturnValue(true);

    await useAuthStore.getState().initialize();

    const state = useAuthStore.getState();

    expect(mockedTokenStore.load).toHaveBeenCalledTimes(1);
    expect(mockedAuthApi.getMe).toHaveBeenCalledTimes(1);
    expect(mockedApiClient.get).toHaveBeenCalledWith("/companies/me");
    expect(state.user).toEqual(seededUser);
    expect(state.tenant).toEqual(seededTenant);
    expect(state.isAuthenticated).toBe(true);
    expect(state.isInitialized).toBe(true);
  });

  it("initialize should keep authenticated user with null tenant when company fetch fails", async () => {
    mockedTokenStore.isAuthenticated.mockReturnValue(true);
    mockedApiClient.get.mockRejectedValue(new Error("company fetch failed"));

    await useAuthStore.getState().initialize();

    const state = useAuthStore.getState();

    expect(mockedAuthApi.getMe).toHaveBeenCalledTimes(1);
    expect(state.user).toEqual(seededUser);
    expect(state.tenant).toBeNull();
    expect(state.isAuthenticated).toBe(true);
    expect(state.isInitialized).toBe(true);
  });

  it("initialize with no token should end unauthenticated and initialized", async () => {
    seedAuthenticatedState();
    mockedTokenStore.isAuthenticated.mockReturnValue(false);

    await useAuthStore.getState().initialize();

    const state = useAuthStore.getState();

    expect(mockedAuthApi.getMe).not.toHaveBeenCalled();
    expect(mockedApiClient.get).not.toHaveBeenCalled();
    expect(state.user).toBeNull();
    expect(state.tenant).toBeNull();
    expect(state.isAuthenticated).toBe(false);
    expect(state.isInitialized).toBe(true);
  });

  it("login success should set authenticated state with hydrated tenant", async () => {
    mockedApiClient.get.mockResolvedValue({
      data: { data: { id: "company-1", name: "Hydrated Tenant" } },
    });

    await useAuthStore.getState().login(loginCredentials);

    const state = useAuthStore.getState();

    expect(mockedAuthApi.login).toHaveBeenCalledWith(loginCredentials);
    expect(mockedApiClient.get).toHaveBeenCalledWith("/companies/me");
    expect(state.user).toEqual(seededUser);
    expect(state.tenant).toEqual({ id: "company-1", name: "Hydrated Tenant" });
    expect(state.isAuthenticated).toBe(true);
    expect(state.error).toBeNull();
    expect(state.isLoading).toBe(false);
  });

  it("login success should fallback to login tenant when company fetch fails", async () => {
    mockedApiClient.get.mockRejectedValue(new Error("company fetch failed"));

    await useAuthStore.getState().login(loginCredentials);

    const state = useAuthStore.getState();

    expect(state.user).toEqual(seededUser);
    expect(state.tenant).toEqual(loginResponse.tenant);
    expect(state.isAuthenticated).toBe(true);
    expect(state.isLoading).toBe(false);
  });

  it("login failure should set error and keep unauthenticated state", async () => {
    mockedAuthApi.login.mockRejectedValue({
      response: { data: { message: "Invalid credentials" } },
    });

    await expect(
      useAuthStore.getState().login(loginCredentials),
    ).rejects.toBeTruthy();

    const state = useAuthStore.getState();

    expect(state.user).toBeNull();
    expect(state.tenant).toBeNull();
    expect(state.isAuthenticated).toBe(false);
    expect(state.error).toBe("Invalid credentials");
    expect(state.isLoading).toBe(false);
  });

  it("login failure should use fallback message when backend message is missing", async () => {
    mockedAuthApi.login.mockRejectedValue({});

    await expect(
      useAuthStore.getState().login(loginCredentials),
    ).rejects.toBeTruthy();

    const state = useAuthStore.getState();

    expect(state.user).toBeNull();
    expect(state.tenant).toBeNull();
    expect(state.isAuthenticated).toBe(false);
    expect(state.error).toBe("فشل تسجيل الدخول");
    expect(state.isLoading).toBe(false);
  });

  it("session-expired callback should clear auth state when invoked", async () => {
    mockedTokenStore.isAuthenticated.mockReturnValue(true);
    await useAuthStore.getState().initialize();

    const handler = mockedRegisterSessionExpiredHandler.mock.calls.at(-1)?.[0];
    expect(typeof handler).toBe("function");

    seedAuthenticatedState();
    handler?.();

    const state = useAuthStore.getState();

    expect(mockedTokenStore.clearAll).toHaveBeenCalledTimes(1);
    expect(state.user).toBeNull();
    expect(state.tenant).toBeNull();
    expect(state.isAuthenticated).toBe(false);
    expect(state.isInitialized).toBe(true);
    expect(state.error).toBeNull();
  });
});
