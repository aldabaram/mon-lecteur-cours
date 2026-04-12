const fs = require("fs");
const path = require("path");
const MarkdownIt = require("markdown-it");
const markdownItAnchor = require("markdown-it-anchor");
const markdownItToc = require("markdown-it-table-of-contents");

const ROOT_DIR = path.resolve(__dirname, "..");
const COURSES_DIR = path.join(ROOT_DIR, "cours");

const md = new MarkdownIt({
  html: true,
  linkify: true,
  typographer: true,
});

md.use(markdownItAnchor);
md.use(markdownItToc, {
  includeLevel: [1, 2, 3, 4],
});

function preprocessMarkdown(input) {
  const lines = input.replace(/\r\n/g, "\n").split("\n");
  const out = [];

  for (let i = 0; i < lines.length; i += 1) {
    const line = lines[i];

    if (/^\[TOC\]\s*$/i.test(line.trim())) {
      out.push("[[toc]]");
      continue;
    }

    const admonitionStart = line.match(/^!!!\s+([a-zA-Z0-9_-]+)\s*(.*)$/);
    if (admonitionStart) {
      const kind = admonitionStart[1].toLowerCase();
      const customTitle = (admonitionStart[2] || "").trim();
      const label = customTitle || (kind.charAt(0).toUpperCase() + kind.slice(1));
      const safeKind = ["warning", "info", "note"].includes(kind) ? kind : "note";
      const blockLines = [
        `<div class="admonition admonition-${safeKind}">`,
        `<p class="admonition-title">${label}</p>`,
      ];

      let j = i + 1;
      let hasContent = false;
      while (j < lines.length) {
        const contentLine = lines[j];
        if (contentLine.startsWith("    ") || contentLine.startsWith("\t")) {
          const cleaned = contentLine.replace(/^( {4}|\t)/, "");
          if (cleaned.trim() === "") {
            blockLines.push("<br>");
          } else {
            blockLines.push(`<p>${md.renderInline(cleaned)}</p>`);
            hasContent = true;
          }
          j += 1;
        } else {
          break;
        }
      }

      if (!hasContent) {
        blockLines.push("<p></p>");
      }
      blockLines.push("</div>", "");

      out.push(...blockLines);
      i = j - 1;
      continue;
    }

    out.push(line);
  }

  return out.join("\n");
}

function markdownToHtml(markdown) {
  const prepared = preprocessMarkdown(markdown);
  return md.render(prepared);
}

function escapeHtml(str) {
  return str
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;");
}

function buildHtmlDocument(title, bodyContent) {
  return `<!DOCTYPE html>
<html lang="fr">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>${escapeHtml(title)}</title>
  <style>
    :root { color-scheme: light; }
    body {
      max-width: 950px;
      margin: 30px auto;
      padding: 20px;
      font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif;
      line-height: 1.6;
      color: #1f2937;
      background: #ffffff;
    }
    h1, h2, h3, h4, h5, h6 {
      line-height: 1.25;
      margin-top: 1.2em;
    }
    pre {
      padding: 14px;
      background: #f3f4f6;
      border-radius: 8px;
      overflow-x: auto;
    }
    code {
      font-family: Consolas, Monaco, monospace;
      background: #f3f4f6;
      padding: 2px 6px;
      border-radius: 4px;
    }
    blockquote {
      margin: 16px 0;
      padding: 8px 14px;
      border-left: 4px solid #9ca3af;
      background: #f9fafb;
    }
    .admonition {
      margin: 16px 0;
      padding: 10px 14px;
      border-left: 5px solid #9ca3af;
      border-radius: 8px;
    }
    .admonition-title {
      margin: 0 0 6px;
      font-weight: 700;
    }
    .admonition p {
      margin: 6px 0;
    }
    .admonition-warning {
      background: #fef2f2;
      border-left-color: #dc2626;
      color: #7f1d1d;
    }
    .admonition-info {
      background: #eff6ff;
      border-left-color: #2563eb;
      color: #1e3a8a;
    }
    .admonition-note {
      background: #f8fafc;
      border-left-color: #475569;
      color: #334155;
    }
    hr {
      border: 0;
      border-top: 1px solid #d1d5db;
      margin: 20px 0;
    }
    table {
      border-collapse: collapse;
      width: 100%;
    }
    th, td {
      border: 1px solid #d1d5db;
      padding: 8px 10px;
      text-align: left;
    }
    img { max-width: 100%; height: auto; }
    a { color: #0b63c6; }
    .table-of-contents ul { padding-left: 18px; }
  </style>
</head>
<body>
${bodyContent}
</body>
</html>
`;
}

function collectMarkdownFiles(startDir) {
  const result = [];

  function walk(dir) {
    const entries = fs.readdirSync(dir, { withFileTypes: true });
    for (const entry of entries) {
      const fullPath = path.join(dir, entry.name);
      if (entry.isDirectory()) {
        walk(fullPath);
      } else if (entry.isFile() && entry.name.toLowerCase().endsWith(".md")) {
        result.push(fullPath);
      }
    }
  }

  walk(startDir);
  return result;
}

function convertAll() {
  if (!fs.existsSync(COURSES_DIR)) {
    console.error(`Dossier introuvable: ${COURSES_DIR}`);
    process.exit(1);
  }

  const mdFiles = collectMarkdownFiles(COURSES_DIR);
  let converted = 0;

  for (const mdFile of mdFiles) {
    const mdContent = fs.readFileSync(mdFile, "utf8");
    const htmlBody = markdownToHtml(mdContent);
    const title = path.basename(mdFile, ".md");
    const fullHtml = buildHtmlDocument(title, htmlBody);

    const outFile = mdFile.replace(/\.md$/i, ".html");
    fs.writeFileSync(outFile, fullHtml, "utf8");
    converted += 1;
    console.log(`Converti: ${path.relative(ROOT_DIR, mdFile)} -> ${path.relative(ROOT_DIR, outFile)}`);
  }

  console.log(`\nTermine: ${converted} fichier(s) converti(s).`);
}

convertAll();
