
export const cryptoUtils = {
  // Hash password using SHA-256 (returns Hex string)
  async hashPassword(password: string): Promise<string> {
    const msgBuffer = new TextEncoder().encode(password);
    const hashBuffer = await crypto.subtle.digest('SHA-256', msgBuffer);
    const hashArray = Array.from(new Uint8Array(hashBuffer));
    return hashArray.map(b => b.toString(16).padStart(2, '0')).join('');
  },

  // Generate a random 256-bit key for AES encryption (returns Base64 string)
  generateKey(): string {
    const key = new Uint8Array(32); 
    crypto.getRandomValues(key);
    // Convert to binary string then btoa
    let binary = '';
    const len = key.byteLength;
    for (let i = 0; i < len; i++) {
        binary += String.fromCharCode(key[i]);
    }
    return btoa(binary);
  },

  // Encrypt JSON string using AES-GCM (returns Base64 string containing IV + Ciphertext)
  async encryptData(data: string, keyStr: string): Promise<string> {
    const key = await this.importKey(keyStr);
    const iv = crypto.getRandomValues(new Uint8Array(12));
    const encodedData = new TextEncoder().encode(data);
    
    const encrypted = await crypto.subtle.encrypt(
      { name: 'AES-GCM', iv: iv },
      key,
      encodedData
    );

    // Combine IV (12 bytes) and Encrypted Data for storage
    const ivArr = Array.from(iv);
    const encArr = Array.from(new Uint8Array(encrypted));
    const combined = new Uint8Array(ivArr.length + encArr.length);
    combined.set(ivArr);
    combined.set(encArr, ivArr.length);
    
    let binary = '';
    const len = combined.byteLength;
    for (let i = 0; i < len; i++) {
        binary += String.fromCharCode(combined[i]);
    }
    return btoa(binary);
  },

  // Decrypt Base64 string (containing IV + Ciphertext) -> returns JSON string
  async decryptData(encryptedBase64: string, keyStr: string): Promise<string> {
    if (!encryptedBase64) return "";
    try {
      const key = await this.importKey(keyStr);
      
      const binaryString = atob(encryptedBase64);
      const combined = new Uint8Array(binaryString.length);
      for (let i = 0; i < binaryString.length; i++) {
          combined[i] = binaryString.charCodeAt(i);
      }
      
      const iv = combined.slice(0, 12);
      const data = combined.slice(12);

      const decrypted = await crypto.subtle.decrypt(
        { name: 'AES-GCM', iv: iv },
        key,
        data
      );

      return new TextDecoder().decode(decrypted);
    } catch (e) {
      console.error("Decryption failed", e);
      return ""; 
    }
  },

  async importKey(keyStr: string): Promise<CryptoKey> {
    const binaryString = atob(keyStr);
    const binaryKey = new Uint8Array(binaryString.length);
    for (let i = 0; i < binaryString.length; i++) {
        binaryKey[i] = binaryString.charCodeAt(i);
    }

    return await crypto.subtle.importKey(
      "raw",
      binaryKey,
      { name: "AES-GCM" },
      true,
      ["encrypt", "decrypt"]
    );
  },

  // Simple Base64 encoding for URL parameters (shared with backend)
  encryptUrlData(text: string, secret: string): string {
    try {
      const utf8Bytes = new TextEncoder().encode(text);
      let binaryString = '';
      for (let i = 0; i < utf8Bytes.length; i++) {
        binaryString += String.fromCharCode(utf8Bytes[i]);
      }
      return btoa(binaryString).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
    } catch (e) {
      console.error("URL Encryption failed", e);
      return "";
    }
  },

  decryptUrlData(encoded: string, secret: string): string {
    try {
      let base64 = encoded.replace(/-/g, '+').replace(/_/g, '/');
      while (base64.length % 4) {
        base64 += '=';
      }
      const binaryString = atob(base64);
      const bytes = new Uint8Array(binaryString.length);
      for (let i = 0; i < binaryString.length; i++) {
        bytes[i] = binaryString.charCodeAt(i);
      }
      return new TextDecoder().decode(bytes);
    } catch (e) {
      console.error("URL Decryption failed", e);
      return "";
    }
  }
};
