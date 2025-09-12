import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import { MarkdownRenderer } from './MarkdownRenderer';
import { SettingsProvider } from '../contexts/SettingsContext';

// Mock component wrapper with SettingsProvider
function MarkdownTestWrapper({ content }: { content: string }) {
  return (
    <SettingsProvider>
      <MarkdownRenderer content={content} />
    </SettingsProvider>
  );
}

describe('MarkdownRenderer', () => {
  it('renders basic markdown text', () => {
    render(<MarkdownTestWrapper content="Hello **world**!" />);
    expect(screen.getByText('world')).toBeInTheDocument();
  });

  it('renders headers correctly', () => {
    render(<MarkdownTestWrapper content="# Main Title" />);
    expect(screen.getByRole('heading', { level: 1 })).toHaveTextContent('Main Title');
    
    render(<MarkdownTestWrapper content="## Subtitle" />);
    expect(screen.getByRole('heading', { level: 2 })).toHaveTextContent('Subtitle');
  });

  it('renders code blocks', () => {
    const codeContent = '```javascript\nconst hello = "world";\n```';
    render(<MarkdownTestWrapper content={codeContent} />);
    // Check for individual parts since syntax highlighter splits into tokens
    expect(screen.getByText('const')).toBeInTheDocument();
    expect(screen.getByText('"world"')).toBeInTheDocument();
  });

  it('renders inline code', () => {
    render(<MarkdownTestWrapper content="Use `npm install` command" />);
    expect(screen.getByText('npm install')).toBeInTheDocument();
  });

  it('renders lists correctly', () => {
    const listContent = '- Item 1\n- Item 2\n- Item 3';
    render(<MarkdownTestWrapper content={listContent} />);
    expect(screen.getByText('Item 1')).toBeInTheDocument();
    expect(screen.getByText('Item 2')).toBeInTheDocument();
    expect(screen.getByText('Item 3')).toBeInTheDocument();
  });

  it('renders links correctly', () => {
    render(<MarkdownTestWrapper content="Check [Google](https://google.com)" />);
    const link = screen.getByRole('link', { name: 'Google' });
    expect(link).toHaveAttribute('href', 'https://google.com');
    expect(link).toHaveAttribute('target', '_blank');
    expect(link).toHaveAttribute('rel', 'noopener noreferrer');
  });

  it('renders blockquotes', () => {
    render(<MarkdownTestWrapper content="> This is a quote" />);
    expect(screen.getByText('This is a quote')).toBeInTheDocument();
  });
});