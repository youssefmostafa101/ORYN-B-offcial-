# How to create the next blog post

The public blog is generated from readable Markdown posts. No website redesign is needed for each article. Generated pages are committed with the source, so the existing GitHub Pages hosting continues to work without installing packages or adding a server.

## The ordinary-English workflow

1. Open the brand's content chat. Name the brand and the problem the reader wants to solve.
2. Ask it to inspect current search results, identify one primary query, and propose a useful angle. Search volume and keyword difficulty stay unknown unless a real tool supplies them.
3. Ask for a complete sourced article, using the existing repository's `content/templates/article.md` and preserving its design. Real examples need proof; hypothetical examples need labels. Supplement articles must distinguish ingredient research from finished-product claims and get appropriate review before publication.
4. Review the actual article, sources, byline, claims and CTA. The AI draft is not approval.
5. Have the assistant create a branch, add the approved post in `content/posts/`, run `node scripts/build-blog.mjs` and `node scripts/test-blog.mjs`, check desktop/mobile previews, and open a pull request. It should not merge or publish until you approve.
6. After you approve and merge, wait for GitHub Pages, open the real article and blog index, and verify the links. Then record the live URL and share platform-native versions.

## Copy this prompt

“Create the next blog post for [brand] about [reader question]. Inspect the current site and search results. Choose one primary keyword and natural related terms; do not invent volume or ranking potential. Use current primary/official sources, original examples and the existing article template. Give me complete copy, title, meta description, slug, image brief/alt text, internal links and one relevant CTA. Check facts, author attribution and brand identity. Save the draft under content/posts, build and test it, show desktop/mobile previews and open a PR for my review. Do not merge or publish. For ORYN-B, do not extrapolate ingredient studies into finished-product claims or invent clinical review.”

## What the assistant changes

- `content/posts/<slug>.md`: metadata and the article text.
- `assets/blog/`: any approved new image, with a descriptive name.
- `node scripts/build-blog.mjs`: automatically updates article HTML, the blog index, RSS and sitemap.
- `node scripts/test-blog.mjs`: checks links, metadata, images, and the next-post/draft workflow.

`status: draft` excludes a post from generated pages. `status: ready` includes it in the branch preview; it does not mean the article is approved or live. Dates must reflect the actual intended publication and later meaningful updates. Adjust the date before merging if review takes longer. Keep a published slug stable; changing it later needs a proper redirect plan.

There is no strict word-count, keyword-density or meta-description-length ranking rule. Put the main topic naturally in the title/H1, introduction and relevant subheadings. Answer the actual question. Keep headings useful, paragraphs readable, internal links descriptive, sources accurate and images accessible.

## What is automatic, and what still needs you

Automatic: shared layout, crawlable HTML, canonical, title/meta description, Open Graph tags, honest BlogPosting markup, table of contents, blog listing, RSS and sitemap entries.

Human: topic judgment, accurate proof, editorial/medical review when needed, approval, and verification after publication. Do not invent a person or credentials for the byline; brand authorship is explicit in the starter articles.

After launch, verify the domain in Google Search Console, submit `/sitemap.xml`, inspect the live article URL, and request indexing if appropriate. Indexing and rankings are Google's decision. Use Search Console's actual queries, impressions, clicks and position data to decide what to improve; do not treat one short reporting period as proof of causality.

Official starting points:
- https://developers.google.com/search/docs/fundamentals/seo-starter-guide
- https://developers.google.com/search/docs/fundamentals/creating-helpful-content
- https://developers.google.com/search/docs/appearance/structured-data/article
- https://developers.google.com/search/docs/crawling-indexing/links-crawlable

The sharing-image labels use a readable Arial fallback; the website itself loads its existing Manrope/DM Mono identity. Logo geometry and existing product artwork are reused, not generated.
