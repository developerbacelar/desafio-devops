import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { clearToken, getToken, isAuthenticated, setToken } from "@/lib/adminAuth";

describe("lib/adminAuth", () => {
  beforeEach(() => {
    sessionStorage.clear();
  });

  afterEach(() => {
    sessionStorage.clear();
  });

  it("getToken retorna null quando nao ha token salvo", () => {
    expect(getToken()).toBeNull();
  });

  it("setToken salva o token e getToken retorna o mesmo valor", () => {
    setToken("token-123");
    expect(getToken()).toBe("token-123");
  });

  it("clearToken remove o token salvo", () => {
    setToken("token-123");
    clearToken();
    expect(getToken()).toBeNull();
  });

  it("isAuthenticated e false sem token e true depois de setToken", () => {
    expect(isAuthenticated()).toBe(false);
    setToken("token-123");
    expect(isAuthenticated()).toBe(true);
  });

  it("isAuthenticated volta a false depois de clearToken", () => {
    setToken("token-123");
    clearToken();
    expect(isAuthenticated()).toBe(false);
  });
});
