/**
 * __tests__/unit/LegalDocScreen.test.tsx
 * Tests for app/legal/[doc].tsx — in-app legal viewer + markdown-lite parser.
 */
import React from 'react';
import { render, screen } from '@testing-library/react-native';

const mockBack = jest.fn();
let mockParams: Record<string, string> = { doc: 'terms' };
jest.mock('expo-router', () => ({
  useRouter: () => ({ back: mockBack }),
  useLocalSearchParams: () => mockParams,
}));
jest.mock('@expo/vector-icons', () => {
  const { View } = require('react-native');
  return { Ionicons: (p: { name: string }) => <View testID={`icon-${p.name}`} /> };
});

import LegalDocScreen, { parseMarkdown } from '../../app/legal/[doc]';

beforeEach(() => {
  jest.clearAllMocks();
  mockParams = { doc: 'terms' };
});

describe('parseMarkdown', () => {
  it('parses headings, bullets, rules and paragraphs', () => {
    const blocks = parseMarkdown('# Title\n\n## Section\n\nSome **bold** text\nwrapped line\n\n- item one\n- item two\n\n---\n');
    expect(blocks).toEqual([
      { type: 'h1', text: 'Title' },
      { type: 'h2', text: 'Section' },
      { type: 'para', text: 'Some bold text wrapped line' },
      { type: 'bullet', text: 'item one' },
      { type: 'bullet', text: 'item two' },
      { type: 'rule', text: '' },
    ]);
  });

  it('strips HTML comments (adviser notes) from display', () => {
    const blocks = parseMarkdown('Before <!-- ADVISER NOTE: secret --> after');
    expect(blocks).toHaveLength(1);
    expect(blocks[0].type).toBe('para');
    expect(blocks[0].text).not.toContain('ADVISER NOTE');
    expect(blocks[0].text).toMatch(/^Before\s+after$/);
  });
});

describe('LegalDocScreen', () => {
  it.each([['terms', 'Terms of Service'], ['privacy', 'Privacy Policy'], ['safety-pledge', 'Community Safety Pledge']])(
    'renders %s with its title',
    (slug, title) => {
      mockParams = { doc: slug };
      render(<LegalDocScreen />);
      expect(screen.getByTestId(`legal-${slug}`)).toBeTruthy();
      expect(screen.getAllByText(title).length).toBeGreaterThan(0);
    },
  );

  it('unknown slug shows not-found, never a blank screen', () => {
    mockParams = { doc: 'nonexistent' };
    render(<LegalDocScreen />);
    expect(screen.getByTestId('legal-not-found')).toBeTruthy();
  });
});
