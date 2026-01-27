---
name: social-media
description: Use this skill when creating social media content for LinkedIn or Twitter/X
---

# Social Media Content

This skill helps you create engaging social media posts that connect with your audience.

## When to Use

- Writing a LinkedIn post
- Creating a Twitter/X thread
- Sharing insights or announcements on social platforms

## Input

You receive content ideas or topics from the creator. If you need more information, you can use `web_search` to research the topic.

## Platform Guidelines

### LinkedIn

**Format:**
- ~1,300 characters (first ~210 visible before "see more")
- Line breaks improve readability
- 3-5 hashtags at the end

**Tone:**
- Professional but personal
- Share insights and experiences
- Ask questions to spark discussion

**Structure idea:**
```
[Hook - one compelling line]

[Context - why this matters]

[Main insight]

[Question or call to action]

#hashtag1 #hashtag2
```

### Twitter/X

**Format:**
- 280 characters per tweet
- Use threads (1/🧵 format) for longer content
- 1-2 hashtags max per tweet

**Thread structure idea:**
```
1/🧵 [Hook]
2/ [Supporting point]
3/ [Example]
4/ [Conclusion + CTA]
```

## Image (Optional)

Social images work best when they're bold and simple:

```
generate_image(
  prompt="Single focal point, high contrast, simple background...",
  outputPath="linkedin/<slug>/image.png"
)
```

## Output

- LinkedIn: `linkedin/<slug>/post.md`
- Twitter: `tweets/<slug>/thread.md`

## Publishing (Optional)

If you want to publish directly:

```
publish_post(
  platform="linkedin",  // or "twitter"
  content="...",
  imagePath="linkedin/<slug>/image.png"
)
```
