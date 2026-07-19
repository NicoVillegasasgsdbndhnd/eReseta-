<?php

/**
 * Builds a single print-ready HTML document from the turnover markdown files.
 *
 *   php docs/build-docs.php
 *
 * Then open docs/eReseta_Documentation.html in a browser and Ctrl+P → Save as PDF.
 */

require __DIR__ . '/../api/vendor/autoload.php';

use League\CommonMark\Environment\Environment;
use League\CommonMark\Extension\CommonMark\CommonMarkCoreExtension;
use League\CommonMark\Extension\Table\TableExtension;
use League\CommonMark\MarkdownConverter;

$environment = new Environment(['html_input' => 'allow', 'allow_unsafe_links' => false]);
$environment->addExtension(new CommonMarkCoreExtension());
$environment->addExtension(new TableExtension());
$converter = new MarkdownConverter($environment);

$docs = [
    'INSTALLATION.md'             => 'Installation Guide (Installer)',
    'API_DOCUMENTATION.md'        => 'API Documentation & Keys',
    'DATABASE_AND_REPOSITORY.md'  => 'Database & Git Repository',
];

$body     = '';
$sections = [];   // file => rendered HTML, for the individual documents

foreach ($docs as $file => $title) {
    $path = __DIR__ . '/' . $file;
    if (! is_file($path)) {
        fwrite(STDERR, "skipped (missing): {$file}\n");
        continue;
    }
    $rendered       = $converter->convert(file_get_contents($path))->getContent();
    $sections[$file] = ['title' => $title, 'html' => $rendered];
    $body .= "<section class=\"doc\">\n" . $rendered . "</section>\n";
    echo "added: {$file}\n";
}

$css = <<<'CSS'
:root { --ink:#0f172a; --muted:#475569; --line:#e2e8f0; --accent:#0369a1; }
* { box-sizing: border-box; }
body {
  font-family: "Segoe UI", system-ui, -apple-system, Roboto, sans-serif;
  color: var(--ink); line-height: 1.6; max-width: 900px;
  margin: 0 auto; padding: 40px 32px;
}
h1 { font-size: 26px; color: var(--accent); border-bottom: 3px solid var(--accent);
     padding-bottom: 8px; margin: 0 0 20px; }
h2 { font-size: 20px; margin: 28px 0 12px; padding-bottom: 6px; border-bottom: 1px solid var(--line); }
h3 { font-size: 16px; margin: 20px 0 8px; color: var(--muted); }
p, li { font-size: 13.5px; }
code { background:#f1f5f9; padding:1px 5px; border-radius:4px;
       font-family: Consolas, "Courier New", monospace; font-size: 12px; }
pre { background:#f8fafc; border:1px solid var(--line); border-left:3px solid var(--accent);
      padding:12px 14px; border-radius:6px; overflow-x:auto; page-break-inside: avoid; }
pre code { background:none; padding:0; font-size: 11.5px; line-height: 1.5; }
table { border-collapse: collapse; width:100%; margin:14px 0; font-size:12.5px;
        page-break-inside: avoid; }
th, td { border:1px solid var(--line); padding:7px 10px; text-align:left; vertical-align: top; }
th { background:#f1f5f9; font-weight:600; }
tr:nth-child(even) td { background:#fafcfe; }
blockquote { border-left:4px solid #f59e0b; background:#fffbeb; margin:14px 0;
             padding:10px 14px; font-size:13px; }
blockquote p { margin: 4px 0; }
hr { border:none; border-top:1px solid var(--line); margin:28px 0; }
a { color: var(--accent); }
.doc { page-break-after: always; }
.doc:last-child { page-break-after: auto; }
.cover { text-align:center; padding:60px 0 40px; page-break-after: always; }
.cover h1 { border:none; font-size:30px; margin-bottom:6px; }
.cover .sub { color: var(--muted); font-size:15px; margin:4px 0; }
.cover .meta { margin-top:36px; font-size:13px; color: var(--muted); }
@media print {
  body { padding: 0; max-width: none; }
  a { text-decoration: none; }
  pre, table, blockquote { page-break-inside: avoid; }
}
CSS;

$generated = date('F j, Y');

$html = <<<HTML
<!doctype html>
<html lang="en">
<head>
<meta charset="utf-8">
<title>eReseta+ — System Documentation</title>
<style>{$css}</style>
</head>
<body>

<div class="cover">
  <h1>eReseta+</h1>
  <p class="sub">Healthcare Appointment Booking and Patient Record Management System<br>
     with Digital Prescription using Hyperledger Fabric</p>
  <p class="sub"><strong>Dr. Eutiquio Ll. Atanacio Jr. Memorial Hospital Inc. (DEAMHI)</strong></p>
  <p class="meta">
    System Documentation<br>
    Installer &middot; API Documentation &amp; Keys &middot; Database &amp; Repository<br><br>
    Generated {$generated}
  </p>
</div>

{$body}
</body>
</html>
HTML;

file_put_contents(__DIR__ . '/eReseta_Documentation.html', $html);
echo "\nWrote: docs/eReseta_Documentation.html  (all three combined)\n";

// Also write each document on its own, so they can be submitted as separate files.
$individual = [
    'INSTALLATION.md'            => '1_Installer.html',
    'API_DOCUMENTATION.md'       => '2_API_Documentation_and_Keys.html',
    'DATABASE_AND_REPOSITORY.md' => '3_Database_and_Repository.html',
];

// Credentials are confidential and git-ignored, so they're rendered separately and are
// never part of the combined document.
$credPath = __DIR__ . '/CREDENTIALS.md';
if (is_file($credPath)) {
    $sections['CREDENTIALS.md'] = [
        'title' => 'System Credentials (Confidential)',
        'html'  => $converter->convert(file_get_contents($credPath))->getContent(),
    ];
    $individual['CREDENTIALS.md'] = '4_Credentials.html';
    echo "added: CREDENTIALS.md (confidential — separate file only)\n";
}

foreach ($individual as $source => $outFile) {
    if (! isset($sections[$source])) {
        continue;
    }

    $title = $sections[$source]['title'];
    $page  = <<<HTML
    <!doctype html>
    <html lang="en">
    <head>
    <meta charset="utf-8">
    <title>eReseta+ — {$title}</title>
    <style>{$css}</style>
    </head>
    <body>
    <div class="cover">
      <h1>eReseta+</h1>
      <p class="sub">Healthcare Appointment Booking and Patient Record Management System<br>
         with Digital Prescription using Hyperledger Fabric</p>
      <p class="sub"><strong>Dr. Eutiquio Ll. Atanacio Jr. Memorial Hospital Inc. (DEAMHI)</strong></p>
      <p class="meta">{$title}<br><br>Generated {$generated}</p>
    </div>
    {$sections[$source]['html']}
    </body>
    </html>
    HTML;

    file_put_contents(__DIR__ . '/' . $outFile, $page);
    echo "Wrote: docs/{$outFile}\n";
}

echo "\nOpen each in a browser, then Ctrl+P -> Save as PDF.\n";
