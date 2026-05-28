import { esc } from '../src/modules/escape.js';

export function renderSeriesIndex(name, { hasThemeCss = false } = {}) {
  const safe = esc(name);
  const themeCssLink = hasThemeCss ? '\n  <link rel="stylesheet" href="theme.css">' : '';
  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>${safe} — Series Tracker</title>
  <link rel="stylesheet" href="../../style.css">${themeCssLink}
</head>
<body>
  <div id="app"></div>
  <script type="module">
    import { initShell } from '../../src/shell.js';
    initShell(document.getElementById('app'), '.');
  </script>
</body>
</html>
`;
}
