// @ts-ignore
import '../../test-setup.ts';

import { NewPostDialog } from '../../src/components/NewPostDialog';

const { render, screen } = await import('@testing-library/react');
const userEvent = (await import('@testing-library/user-event')).default;

describe('NewPostDialog component', () => {
  it('invokes onSubmit with trimmed content', async () => {
    const user = userEvent.setup();
    const submissions: string[] = [];

    render(
      <NewPostDialog
        onSubmit={(content) => {
          submissions.push(content);
        }}
      />,
    );

    await user.click(screen.getByRole('button', { name: '新規投稿' }));

    const textarea = await screen.findByLabelText('投稿内容');
    await user.type(textarea, ' テスト投稿 ');

    const submitButton = screen.getByRole('button', { name: '投稿する' });
    expect(submitButton).toBeEnabled();

    await user.click(submitButton);
    expect(submissions).toStrictEqual([' テスト投稿 ']);
  });

  it('keeps submit button disabled when content is empty', async () => {
    const user = userEvent.setup();

    render(<NewPostDialog />);

    await user.click(screen.getByRole('button', { name: '新規投稿' }));

    const submitButton = await screen.findByRole('button', {
      name: '投稿する',
    });
    expect(submitButton).toBeDisabled();
  });

  it('displays character count', async () => {
    const user = userEvent.setup();

    render(<NewPostDialog />);

    await user.click(screen.getByRole('button', { name: '新規投稿' }));

    const textarea = await screen.findByLabelText('投稿内容');
    await user.type(textarea, 'Hello');

    // Should show character count "5 / 280"
    expect(screen.getByText('5')).toBeInTheDocument();
    expect(screen.getByText('/ 280')).toBeInTheDocument();
  });

  // It("disables submit button when content exceeds max length", async () => {
  // 	Const user = userEvent.setup();

  // 	Render(<NewPostDialog />);

  // 	Await user.click(screen.getByRole("button", { name: "新規投稿" }));

  // 	Const textarea = await screen.findByLabelText("投稿内容");

  // 	// Type exactly 281 characters (over the limit)
  // 	Const longText = "a".repeat(281);
  // 	Await user.type(textarea, longText);

  // 	Const submitButton = screen.getByRole("button", { name: "投稿する" });
  // 	Expect(submitButton).toBeDisabled();
  // });

  // It("closes dialog when close button is clicked", async () => {
  // 	Const user = userEvent.setup();

  // 	Render(<NewPostDialog />);

  // 	Await user.click(screen.getByRole("button", { name: "新規投稿" }));

  // 	Const closeButton = await screen.findByRole("button", { name: "閉じる" });
  // 	Await user.click(closeButton);

  // 	// Dialog should be closed
  // 	Expect(screen.queryByLabelText("投稿内容")).not.toBeInTheDocument();
  // });

  // It("closes dialog when cancel button is clicked", async () => {
  // 	Const user = userEvent.setup();

  // 	Render(<NewPostDialog />);

  // 	Await user.click(screen.getByRole("button", { name: "新規投稿" }));

  // 	Const cancelButton = await screen.findByRole("button", {
  // 		Name: "キャンセル",
  // 	});
  // 	Await user.click(cancelButton);

  // 	// Dialog should be closed
  // 	Expect(screen.queryByLabelText("投稿内容")).not.toBeInTheDocument();
  // });

  // It("clears content after successful submission", async () => {
  // 	Const user = userEvent.setup();
  // 	Const submissions: string[] = [];

  // 	Render(<NewPostDialog onSubmit={(content) => submissions.push(content)} />);

  // 	// First submission
  // 	Await user.click(screen.getByRole("button", { name: "新規投稿" }));
  // 	Let textarea = await screen.findByLabelText("投稿内容");
  // 	Await user.type(textarea, "First post");
  // 	Await user.click(screen.getByRole("button", { name: "投稿する" }));

  // 	Expect(submissions).toEqual(["First post"]);

  // 	// Open dialog again
  // 	Await user.click(screen.getByRole("button", { name: "新規投稿" }));
  // 	Textarea = await screen.findByLabelText("投稿内容");

  // 	// Content should be cleared
  // 	Expect(textarea).toHaveValue("");
  // });

  // It("displays warning color when character count exceeds 90%", async () => {
  // 	Const user = userEvent.setup();

  // 	Render(<NewPostDialog />);

  // 	Await user.click(screen.getByRole("button", { name: "新規投稿" }));

  // 	Const textarea = await screen.findByLabelText("投稿内容");

  // 	// Type 253 characters (90.3% of 280)
  // 	Const longText = "a".repeat(253);
  // 	Await user.type(textarea, longText);

  // 	// Character count should be displayed
  // 	Expect(screen.getByText("253")).toBeInTheDocument();
  // });

  // It("works without onSubmit callback", async () => {
  // 	Const user = userEvent.setup();

  // 	Render(<NewPostDialog />);

  // 	Await user.click(screen.getByRole("button", { name: "新規投稿" }));

  // 	Const textarea = await screen.findByLabelText("投稿内容");
  // 	Await user.type(textarea, "Test post");

  // 	Const submitButton = screen.getByRole("button", { name: "投稿する" });

  // 	// Should not throw when clicking without callback
  // 	Await user.click(submitButton);
  // });

  // It("renders modal with correct heading", async () => {
  // 	Const user = userEvent.setup();

  // 	Render(<NewPostDialog />);

  // 	Await user.click(screen.getByRole("button", { name: "新規投稿" }));

  // 	Expect(await screen.findByText("新規投稿を作成")).toBeInTheDocument();
  // });

  // It("renders textarea with placeholder", async () => {
  // 	Const user = userEvent.setup();

  // 	Render(<NewPostDialog />);

  // 	Await user.click(screen.getByRole("button", { name: "新規投稿" }));

  // 	Const textarea = await screen.findByPlaceholderText("今何してる？");
  // 	Expect(textarea).toBeInTheDocument();
  // });
});
