---
name: social-media
description: Use this skill when creating social media content for LinkedIn or Twitter/X
---

# Social Media Content

This skill provides a structured approach to creating engaging social media posts for LinkedIn and Twitter/X. It emphasizes platform-specific optimization and quality iteration.

## When to Use

- Writing a LinkedIn post
- Creating a Twitter/X thread
- Repurposing blog content for social media
- Sharing insights or announcements

## Process Overview

```
1. Setup      → Create folder, identify platform
2. Research   → Quick context gathering (if needed)
3. Draft      → Write platform-optimized content
4. Review     → Get feedback from editor
5. Revise     → Optimize for engagement
6. Image      → Generate visual (optional)
7. Publish    → Post or save for later
```

## Step-by-Step Workflow

### Step 1: Setup

Create a folder for the content:

**For LinkedIn:**
```
mkdir linkedin/<slug>
```

**For Twitter:**
```
mkdir tweets/<slug>
```

**Folder structure:**
```
linkedin/<slug>/          tweets/<slug>/
├── post.md               ├── thread.md
├── draft.md              ├── draft.md
└── image.png             └── image.png
```

### Step 2: Quick Research (If Needed)

For content requiring context or data:

1. **Quick web search:**
   ```
   web_search(query="[specific stat or fact needed]", maxResults=3)
   ```

2. **For deeper research**, delegate to researcher:
   ```
   "Research [TOPIC] briefly and save to research/<slug>.md.
   Focus on: 2-3 key statistics or recent developments"
   ```

**Research Guidelines:**
- Personal story/opinion: No research needed
- Industry insight: Find 1-2 supporting stats
- News commentary: Verify facts, find source
- Educational content: Research key points

### Step 3: Write Draft

Create the draft in the appropriate location.

---

## Platform: LinkedIn

### LinkedIn Format Rules

| Element | Guideline |
|---------|-----------|
| Total length | ~1,300 characters max |
| Hook visibility | First ~210 characters before "see more" |
| Line breaks | Use for readability |
| Hashtags | 3-5 at the end |
| Emojis | Sparingly, if at all |

### LinkedIn Draft Template

Save to `linkedin/<slug>/draft.md`:

```markdown
[HOOK - Must be compelling in first 210 characters]

[CONTEXT - 1-2 sentences on why this matters]

[MAIN INSIGHT - The core value you're sharing]

[SUPPORTING POINT - Evidence, example, or story]

[QUESTION or CALL TO ACTION]

#hashtag1 #hashtag2 #hashtag3
```

### LinkedIn Hook Patterns

**Pattern 1: Contrarian**
```
Everyone says [common belief].

I disagree.

Here's why...
```

**Pattern 2: Story**
```
Last week, something unexpected happened.

[Brief story setup]

Here's what I learned...
```

**Pattern 3: List tease**
```
3 things I wish I knew about [topic] before [event]:

(The last one changed everything)
```

**Pattern 4: Question**
```
What if [provocative question]?

I've been thinking about this a lot lately.
```

### LinkedIn Tone Guidelines

- Professional but personal
- Share genuine insights, not generic advice
- Use "I" and "you" - be conversational
- Acknowledge uncertainty when appropriate
- Ask questions to spark discussion

---

## Platform: Twitter/X

### Twitter Format Rules

| Element | Guideline |
|---------|-----------|
| Tweet length | 280 characters max |
| Thread format | 1/🧵, 2/, 3/, etc. |
| Hashtags | 1-2 per tweet max |
| Links | Use sparingly, last tweet |

### Twitter Thread Template

Save to `tweets/<slug>/draft.md`:

```markdown
1/🧵 [HOOK - Strong opening that stops the scroll]

2/ [CONTEXT or SETUP - Why should they care?]

3/ [MAIN POINT 1]

4/ [MAIN POINT 2 or EXAMPLE]

5/ [MAIN POINT 3 or STORY]

6/ [CONCLUSION + CTA]

(Like this thread? Follow for more on [topic])
```

### Twitter Hook Patterns

**Pattern 1: Bold claim**
```
1/🧵 [Bold statement that challenges assumptions]

Most people get this wrong.
```

**Pattern 2: Story tease**
```
1/🧵 [Intriguing situation]

Here's what happened (and what you can learn from it):
```

**Pattern 3: How-to**
```
1/🧵 How to [achieve desirable outcome] in [timeframe]:

(Thread)
```

**Pattern 4: List**
```
1/🧵 [Number] [things/lessons/mistakes] about [topic]:

👇
```

### Twitter Tone Guidelines

- Punchy and direct
- One idea per tweet
- Use line breaks for emphasis
- Threads should be self-contained (each tweet makes sense alone)
- End with engagement ask

---

### Step 4: Review with Editor

After completing the draft:

**For LinkedIn:**
```
"Review the LinkedIn post at linkedin/<slug>/draft.md.
Check: hook strength, professional tone, engagement potential."
```

**For Twitter:**
```
"Review the Twitter thread at tweets/<slug>/draft.md.
Check: hook strength, tweet flow, each tweet stands alone."
```

### Step 5: Revise for Engagement

Apply editor feedback with platform focus:

**LinkedIn optimization:**
- [ ] Hook is visible before "see more" (first 210 chars)
- [ ] No walls of text - use line breaks
- [ ] Ends with question or clear CTA
- [ ] Hashtags are relevant, not spammy

**Twitter optimization:**
- [ ] Hook stops the scroll
- [ ] Each tweet is under 280 characters
- [ ] Thread flows logically
- [ ] Last tweet has clear CTA

### Step 6: Generate Image (Optional)

Social images should be bold and simple:

```
generate_image(
  prompt="[Simple, high-contrast visual with single focal point]",
  outputPath="linkedin/<slug>/image.png"  // or tweets/<slug>/image.png
)
```

**Social Image Guidelines:**
- Simple composition (one main element)
- High contrast for mobile viewing
- Leave space for text overlay if needed
- Avoid small text - won't be readable
- Bold colors perform better

**Example prompts:**
- "Minimalist illustration of a lightbulb with geometric patterns, yellow and dark blue, clean flat design"
- "Abstract network of connected dots, gradient from blue to purple, dark background, modern tech aesthetic"
- "Single rocket launching upward, trail of stars, vibrant orange against deep space, inspirational mood"

### Step 7: Publish or Save

**Option A: Save for manual posting**
- Rename draft to final: `draft.md` → `post.md` or `thread.md`

**Option B: Publish directly**

```
// LinkedIn
publish_post(
  platform="linkedin",
  content="[full post content]",
  imagePath="linkedin/<slug>/image.png"  // optional
)

// Twitter (first tweet of thread)
publish_post(
  platform="twitter",
  content="[thread content]",
  imagePath="tweets/<slug>/image.png"  // optional
)
```

**Tip:** Content will be published directly. Make sure you're happy with it before calling publish_post.

## Available Tools

| Tool | Purpose | When to Use |
|------|---------|-------------|
| `researcher` | Research with sources | Need statistics or facts |
| `editor` | Content review | After completing draft |
| `web_search` | Quick fact lookup | Verify claims |
| `generate_image` | Create social image | Visual content needed |
| `publish_post` | Post to platform | Ready to publish |
| `write_file` | Save content | Every step |

## Quick Reference: LinkedIn vs Twitter

| Aspect | LinkedIn | Twitter |
|--------|----------|---------|
| Length | ~1,300 chars | 280 per tweet |
| Tone | Professional-personal | Punchy-direct |
| Hashtags | 3-5 at end | 1-2 inline |
| Hook | 210 chars visible | First tweet critical |
| Format | Single post | Thread |
| Images | Professional | Bold/simple |
| CTA | Question preferred | Follow/RT ask |

## Best Practices

- **Hook is everything**: 80% of success is the first line
- **Platform-native**: Don't cross-post identical content
- **One idea**: Each post should have one clear takeaway
- **Authentic voice**: Sound like a person, not a brand
- **Engage back**: Social media is two-way
- **Test and learn**: Try different formats, see what works
