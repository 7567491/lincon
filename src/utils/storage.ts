class SecureStorage {
  private key = "linode-secure-key";

  // 简单的加密存储（实际应用需要更强的加密）
  save(key: string, value: string): void {
    const encrypted = btoa(value); // Base64编码
    localStorage.setItem(`${this.key}-${key}`, encrypted);
  }

  load(key: string): string | null {
    const encrypted = localStorage.getItem(`${this.key}-${key}`);
    if (!encrypted) return null;
    try {
      return atob(encrypted); // Base64解码
    } catch {
      return null;
    }
  }

  remove(key: string): void {
    localStorage.removeItem(`${this.key}-${key}`);
  }

  clear(): void {
    Object.keys(localStorage)
      .filter((key) => key.startsWith(this.key))
      .forEach((key) => localStorage.removeItem(key));
  }
}

export const secureStorage = new SecureStorage();
