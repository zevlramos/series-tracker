export function renderSeriesIndex(name) {
  const safe = escapeHtml(name);
  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>${safe} — Series Tracker</title>
  <link rel="stylesheet" href="../../style.css">
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

function escapeHtml(str) {
  return str
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}
