// @ts-ignore
import '../../test-setup.ts';

import { SearchResults } from '../../src/components/SearchResults';

const { render, screen } = await import('@testing-library/react');

const samplePost = {
  author: '田中太郎',
  content: 'React Aria を触っています',
  id: 'post-1',
  likes: 10,
  replies: 0,
  reposts: 1,
  timestamp: '1時間前',
  username: 'tanaka',
};

const sampleUser = {
  bio: 'アクセシビリティ愛好家',
  followers: 1200,
  id: 'user-1',
  name: '山田花子',
  username: 'yamada',
  verified: true,
};

const sampleTrend = {
  category: 'テクノロジー',
  id: 'trend-1',
  posts: 5234,
  topic: 'React Aria',
};

describe('SearchResults component', () => {
  it('renders empty state when query is blank', () => {
    render(<SearchResults query="" type="all" />);

    expect(screen.getByText('何かを検索してみましょう')).toBeInTheDocument();
    expect(
      screen.getByText('ユーザー名、投稿内容、トレンドなどを検索できます'),
    ).toBeInTheDocument();
  });

  it('renders grouped results when type is all', () => {
    render(
      <SearchResults
        query="React"
        type="all"
        posts={[samplePost]}
        users={[sampleUser]}
        trends={[sampleTrend]}
      />,
    );

    expect(screen.getByRole('heading', { name: 'ユーザー' })).toBeInTheDocument();
    expect(screen.getByRole('heading', { name: '投稿' })).toBeInTheDocument();
    expect(screen.getByRole('heading', { name: 'トレンド' })).toBeInTheDocument();

    expect(screen.getByText('@tanaka')).toBeInTheDocument();
    expect(screen.getAllByText((content) => content.includes('React')).length).toBeGreaterThan(0);
    expect(screen.getByText('5,234 件の投稿')).toBeInTheDocument();
  });

  it('highlights matching text in post results', () => {
    render(
      <SearchResults
        query="React"
        type="posts"
        posts={[{ ...samplePost, content: 'React と Remix を学ぶ' }]}
      />,
    );

    const highlights = screen.getAllByText('React', { selector: 'mark' });
    expect(highlights).toHaveLength(1);
    expect(highlights[0]).toBeInTheDocument();
  });

  it('shows no results message when type is all with no results', () => {
    render(<SearchResults query="React" type="all" posts={[]} users={[]} trends={[]} />);

    expect(screen.getByText('「React」に一致する結果が見つかりませんでした')).toBeInTheDocument();
    expect(
      screen.getByText('別のキーワードで検索するか、スペルを確認してください'),
    ).toBeInTheDocument();
  });

  it('shows no results message when specific filter has no data', () => {
    render(<SearchResults query="React" type="users" users={[]} />);

    expect(screen.getByText('「React」に一致する結果が見つかりませんでした')).toBeInTheDocument();
  });

  it('renders trends only when type is trends', () => {
    render(<SearchResults query="React" type="trends" trends={[sampleTrend]} />);

    expect(screen.getByText('React Aria')).toBeInTheDocument();
    expect(screen.getByText((content) => content.includes('テクノロジー'))).toBeInTheDocument();
    expect(screen.getByText('5,234 件の投稿')).toBeInTheDocument();
  });

  it('shows no results when type is trends with empty trends', () => {
    render(<SearchResults query="React" type="trends" trends={[]} />);

    expect(screen.getByText('「React」に一致する結果が見つかりませんでした')).toBeInTheDocument();
  });

  it('shows no results when type is posts with empty posts', () => {
    render(<SearchResults query="React" type="posts" posts={[]} />);

    expect(screen.getByText('「React」に一致する結果が見つかりませんでした')).toBeInTheDocument();
  });
});
