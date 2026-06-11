Steps to build the Tailwind CSS for this project

1. Install dev dependencies (run in project root):

```bash
npm install
```

2. Build the CSS once:

```bash
npm run build:css
```

This will generate `./dist/styles.css` which is the compiled Tailwind output that contains the converted styles from the original `style.css`.

3. Update your `index.html` stylesheet link to point to the compiled file (replace current `style.css` link):

Example:

```html
<link rel="stylesheet" href="dist/styles.css">
```

Notes:
- I left `index.html` unchanged so your styles remain separate from the markup.
- The `tailwind.css` file is the source file (contains `@tailwind` + converted components). Edit that if you want to adjust styles.
- If you prefer live rebuilding while editing, run `npm run watch:css`.
