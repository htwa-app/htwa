/**
 * app/(tabs)/index.tsx
 *
 * Home tab — re-exports the HomeScreen from app/home.tsx so that the screen
 * code lives in one place and can be reached both as the tab root (/(tabs))
 * and directly (/home) during development/testing.
 */

export { default } from '../home';
