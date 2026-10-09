# Manual Tests

Use a local server or GitHub Pages deployment and run `tools/prepare-site.ps1` before testing.

1. Open the viewer with no URL and confirm the empty state is clear.
2. Load a valid GitHub blob `.html` URL.
3. Load a valid `raw.githubusercontent.com` `.html` URL.
4. Try an unsupported host and confirm it is rejected.
5. Try an `http://` URL and confirm it is rejected.
6. Try a non-HTML file and confirm it is rejected.
7. Preview `samples/with-relative-assets/report.html` from GitHub and confirm relative CSS and JS load.
8. Preview `samples/with-cdn.html` and confirm the CDN CSS loads.
9. Preview `samples/multi-page/index.html` and confirm the relative details link is rewritten through the viewer.
10. Confirm an external HTTPS link is not rewritten.
11. Confirm a `mailto:` link is not rewritten.
12. Confirm a `javascript:` link is not rewritten.
13. Use the Full screen button and confirm the preview area enters full screen.
14. Use Copy preview link and confirm the canonical `?url=` URL is copied.
15. Use Open source on GitHub and confirm the blob URL opens.
16. Use Open raw file and confirm the raw file URL opens.
17. Open a direct `?url=` preview and confirm the landing screen does not flash before the preview loads.
18. Preview a report containing relative HTML iframes and confirm they show lazy placeholders by default.
19. Add `&embed=live` to that preview URL and confirm nested HTML iframes render immediately.
20. Add `&embed=off` to that preview URL and confirm nested HTML iframes are skipped with a clear placeholder.
21. Open the base domain and confirm the favicon, source CTA, and generic share metadata assets are present.
22. In the ChartForgeX catalog, open an example and confirm it opens through the previewer.
23. On an example page, confirm SVG and PNG downloads point to the raw artifacts.
24. Load a report URL containing query parameters. Confirm its `html-preview-source-url` meta tag retains the full source URL, while the document base still resolves relative assets from the source directory. Repeat with a nested report.
25. In the ChartForgeX catalog, select a theme and search filter, open an example, select PNG and follow another variant. Confirm the selected format and theme survive, then return to the catalog and confirm the filter survives.
