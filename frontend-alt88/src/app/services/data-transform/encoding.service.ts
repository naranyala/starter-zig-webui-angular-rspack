/**
 * Encoding Service
 * 
 * Various encoding/decoding for web compatibility
 */
import { Injectable } from '@angular/core';

@Injectable({ providedIn: 'root' })
export class EncodingService {
  /**
   * Base64 encode string
   */
  base64Encode(data: string): string {
    return btoa(unescape(encodeURIComponent(data)));
  }

  /**
   * Base64 encode binary
   */
  base64EncodeBinary(data: Uint8Array): string {
    let binary = '';
    for (let i = 0; i < data.byteLength; i++) {
      binary += String.fromCharCode(data[i]);
    }
    return btoa(binary);
  }

  /**
   * Base64 decode to string
   */
  base64Decode(base64: string): string {
    return decodeURIComponent(escape(atob(base64)));
  }

  /**
   * Base64 decode to binary
   */
  base64DecodeBinary(base64: string): Uint8Array {
    const binary = atob(base64);
    const bytes = new Uint8Array(binary.length);
    for (let i = 0; i < binary.length; i++) {
      bytes[i] = binary.charCodeAt(i);
    }
    return bytes;
  }

  /**
   * URL encode
   */
  urlEncode(str: string): string {
    return encodeURIComponent(str);
  }

  /**
   * URL decode
   */
  urlDecode(encoded: string): string {
    return decodeURIComponent(encoded);
  }

  /**
   * URL encode component (for path segments)
   */
  urlEncodeComponent(component: string): string {
    return encodeURIComponent(component);
  }

  /**
   * URL decode component
   */
  urlDecodeComponent(component: string): string {
    return decodeURIComponent(component);
  }

  /**
   * HTML encode (XSS prevention)
   */
  htmlEncode(str: string): string {
    const div = document.createElement('div');
    div.textContent = str;
    return div.innerHTML;
  }

  /**
   * HTML decode
   */
  htmlDecode(encoded: string): string {
    const div = document.createElement('div');
    div.innerHTML = encoded;
    return div.textContent || '';
  }

  /**
   * HTML encode attribute
   */
  htmlEncodeAttribute(str: string): string {
    return str
      .replace(/&/g, '&amp;')
      .replace(/"/g, '&quot;')
      .replace(/'/g, '&#39;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;');
  }

  /**
   * Hex encode
   */
  hexEncode(data: Uint8Array): string {
    return Array.from(data)
      .map(b => b.toString(16).padStart(2, '0'))
      .join('');
  }

  /**
   * Hex decode
   */
  hexDecode(hex: string): Uint8Array {
    const bytes = new Uint8Array(hex.length / 2);
    for (let i = 0; i < hex.length; i += 2) {
      bytes[i / 2] = parseInt(hex.substr(i, 2), 16);
    }
    return bytes;
  }
}
