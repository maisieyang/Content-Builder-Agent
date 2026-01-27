---
name: blog-post
description: Use this skill when writing blog posts, tutorials, or articles
---

# Blog Post Writing

This skill helps you create engaging blog posts that share your ideas with readers.

## When to Use

- Writing a blog post or article
- Creating a tutorial or how-to guide
- Developing thought leadership content

## Your Approach

Feel free to explore the topic in your own way. Here are some ideas:

### Research (Optional)
If you need more context, use the `researcher` subagent or `web_search` to gather information. Save findings to `research/<slug>.md` if useful for future reference.

### Writing Structure
A typical blog post might include:
- **Hook**: Start with something that grabs attention
- **Context**: Why does this matter?
- **Main content**: Break into sections with clear headers
- **Conclusion**: What should the reader take away?

But feel free to experiment with different structures.

### Cover Image (Optional)
If you want to create a visual, use `generate_image`:

```
generate_image(
  prompt="Describe the image you envision...",
  outputPath="blogs/<slug>/hero.png"
)
```

**Tips for image prompts:**
- Be specific about subject, style, and colors
- Consider the mood you want to convey
- Leave space for text overlay if needed

## Output

Save your blog post to `blogs/<slug>/post.md`

Example: A post about "AI Agents" → `blogs/ai-agents/post.md`

## Writing Tips

- Use active voice
- One idea per paragraph
- Include concrete examples
- Keep it conversational
