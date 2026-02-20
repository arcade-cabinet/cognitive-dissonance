/**
 * Jest mock for react-native.
 * Provides minimal stubs for modules that import { Platform } from 'react-native'.
 */
export const Platform = {
  OS: 'web' as const,
  select: (specifics: Record<string, unknown>) => specifics.web ?? specifics.default,
};
