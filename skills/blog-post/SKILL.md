---
name: blog-post
description: Use this skill when writing blog posts, tutorials, or articles
---

# Blog Post Writing

This skill provides a structured approach to creating engaging blog posts. It emphasizes research, quality iteration, and clear organization.

## When to Use

- Writing a blog post or article
- Creating a tutorial or how-to guide
- Developing thought leadership content
- Explaining technical concepts

## Process Overview

```
1. Setup      → Create folder structure
2. Research   → Gather information (optional)
3. Draft      → Write initial content
4. Review     → Get feedback from editor
5. Revise     → Improve based on feedback
6. Image      → Generate cover image (optional)
7. Finalize   → Save final version
```

## Step-by-Step Workflow

### Step 1: Create Folder Structure

Before writing, create a dedicated folder for the blog post:

```
mkdir blogs/<slug>
```

Where `<slug>` is a URL-friendly version of the title (e.g., "ai-agents-explained").

**Folder contents will include:**
```
blogs/<slug>/
├── post.md       # Final blog post
├── draft.md      # Working draft (optional)
└── hero.png      # Cover image (optional)
```

### Step 2: Research (If Needed)

For topics requiring current information or sources:

1. **Delegate to researcher subagent:**
   ```
   "Research [TOPIC] and save findings to research/<slug>.md.
   Focus on: [specific aspects you need]"
   ```

2. **Or use web_search directly** for quick lookups:
   ```
   web_search(query="[specific question]", maxResults=5)
   ```

**Research Guidelines:**
- Simple opinion pieces: Skip research
- Tutorial/how-to: Research best practices, common pitfalls
- Thought leadership: Research current trends, statistics
- Technical deep-dive: Research documentation, examples

### Step 3: Write Draft

Create the initial draft at `blogs/<slug>/draft.md`.

**Recommended Structure:**

```markdown
# [Title]

[Hook - 1-2 sentences that grab attention]

## Introduction

[Context - Why does this matter? Who is this for?]

## [Main Section 1]

[Content with examples]

## [Main Section 2]

[Content with examples]

## [Main Section 3] (if needed)

[Content with examples]

## Conclusion

[Key takeaway + call to action]

---
*Sources: [if applicable]*
```

**Writing Checklist:**
- [ ] Hook creates curiosity or emotional connection
- [ ] Each section has a clear purpose
- [ ] Concrete examples support abstract ideas
- [ ] Paragraphs are focused (one idea each)
- [ ] Headers guide the reader through the content

### Step 4: Review with Editor

After completing the draft, get feedback:

```
"Review the blog post at blogs/<slug>/draft.md and provide feedback
on structure, clarity, and engagement."
```

The editor will return:
- What works well
- Specific improvements needed
- Priority actions

### Step 5: Revise Based on Feedback

Update the draft based on editor feedback:

1. Address priority actions first
2. Incorporate suggested improvements
3. Keep what works well

**Revision Tips:**
- Focus on clarity over cleverness
- Cut anything that doesn't serve the reader
- Strengthen the hook if feedback mentions weak opening
- Add examples where content feels abstract

### Step 6: Generate Cover Image (Optional)

Create a visual for the blog post:

```
generate_image(
  prompt="[Detailed description: subject, style, colors, mood]",
  outputPath="blogs/<slug>/hero.png"
)
```

**Image Prompt Tips:**
- Be specific: "A minimalist illustration of..." not "An image about..."
- Include style: "flat design", "3D render", "watercolor style"
- Specify colors: "blue and orange color scheme", "muted earth tones"
- Consider composition: "centered subject with negative space for text"

**Example prompts:**
- Technical: "Isometric illustration of interconnected nodes and data flows, blue and purple gradient, clean modern style, dark background"
- Tutorial: "Hands typing on keyboard with code floating above, warm lighting, photorealistic, shallow depth of field"
- Thought leadership: "Abstract representation of innovation, geometric shapes transforming, gold and navy color scheme, minimalist"

### Step 7: Finalize

1. **Rename draft to final:**
   - Move `blogs/<slug>/draft.md` → `blogs/<slug>/post.md`
   - Or write final version directly to `blogs/<slug>/post.md`

2. **Final quality check:**
   - [ ] Title is compelling and clear
   - [ ] Hook appears in first 2 lines
   - [ ] All sections flow logically
   - [ ] No spelling/grammar issues
   - [ ] Sources cited if facts are claimed
   - [ ] Image matches content tone (if included)

## Available Tools

| Tool | Purpose | When to Use |
|------|---------|-------------|
| `researcher` | Deep research with sources | Complex topics, need statistics |
| `editor` | Content review and feedback | After completing draft |
| `web_search` | Quick information lookup | Simple fact-checking |
| `generate_image` | Create cover image | Visual content needed |
| `write_file` | Save content | Every step |
| `read_file` | Review content | Before editing |

## Output Format

**Final blog post** (`blogs/<slug>/post.md`):

```markdown
# [Compelling Title]

[Hook that makes reader want to continue]

## [Section 1 Header]

[Content...]

## [Section 2 Header]

[Content...]

## Conclusion

[Key takeaway and call to action]

---

*Published: [Date]*
*Tags: [tag1], [tag2], [tag3]*
```

## Best Practices

- **Start with the reader**: What problem are you solving for them?
- **One big idea**: Each post should have one main takeaway
- **Show, don't tell**: Use examples, stories, and concrete details
- **Respect their time**: Every sentence should earn its place
- **End with action**: Give the reader something to do next
