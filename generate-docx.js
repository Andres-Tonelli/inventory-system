const marked = require('marked');
const htmlToDocx = require('html-to-docx');
const fs = require('fs');
const path = require('path');

function convertMarkdownToHtml(markdownContent) {
  // Convert markdown to HTML
  let html = marked.parse(markdownContent);
  
  // Strip <hr> tags which crash html-to-docx
  html = html.replace(/<hr\s*\/?>/g, '');

  // Find all image tags in HTML and convert relative file paths to base64 data URIs
  const imgRegex = /<img src="([^"]+)" alt="([^"]*)"[^>]*>/g;
  html = html.replace(imgRegex, (match, src, alt) => {
    try {
      let relativeClean = src;
      if (src.startsWith('./')) {
        relativeClean = src.substring(2);
      }
      const absolutePath = path.resolve(path.join(__dirname, 'docs', relativeClean));
      if (fs.existsSync(absolutePath)) {
        const imageBuffer = fs.readFileSync(absolutePath);
        const ext = path.extname(absolutePath).substring(1);
        const mimeType = ext === 'png' ? 'image/png' : ext === 'jpg' || ext === 'jpeg' ? 'image/jpeg' : `image/${ext}`;
        const base64Image = imageBuffer.toString('base64');
        return `<img src="data:${mimeType};base64,${base64Image}" alt="${alt}" width="600" height="375" />`;
      } else {
        console.warn(`Warning: Image file not found at ${absolutePath}`);
      }
    } catch (e) {
      console.error(`Error embedding image ${src}:`, e);
    }
    return match;
  });

  // Clean up <p> tags that wrap <img> tags to avoid html-to-docx crash (wrapping them in <div> instead)
  html = html.replace(/<p>\s*(<img[^>]+>)\s*<\/p>/g, '<div style="text-align: center; margin: 12px 0;">$1</div>');

  return html;
}

(async () => {
  const docsDir = path.join(__dirname, 'docs');
  
  try {
    // Convert Collaborator manual
    console.log('Generating docs/manual_colaboradores.docx ...');
    const colabMarkdown = fs.readFileSync(path.join(docsDir, 'manual_colaboradores.md'), 'utf-8');
    const colabHtml = convertMarkdownToHtml(colabMarkdown);
    const colabDocxBuffer = await htmlToDocx(colabHtml, null, {
      title: 'Manual de Colaboradores',
      creator: 'Antigravity AI',
      description: 'Manual de Usuario para Colaboradores - Sistema de Gestión de Inventario'
    });
    fs.writeFileSync(path.join(docsDir, 'manual_colaboradores.docx'), colabDocxBuffer);
    console.log('Generated docs/manual_colaboradores.docx successfully!');

    // Convert Admin manual
    console.log('Generating docs/manual_administradores.docx ...');
    const adminMarkdown = fs.readFileSync(path.join(docsDir, 'manual_administradores.md'), 'utf-8');
    const adminHtml = convertMarkdownToHtml(adminMarkdown);
    const adminDocxBuffer = await htmlToDocx(adminHtml, null, {
      title: 'Manual de Administradores',
      creator: 'Antigravity AI',
      description: 'Manual de Usuario para Administradores - Sistema de Gestión de Inventario'
    });
    fs.writeFileSync(path.join(docsDir, 'manual_administradores.docx'), adminDocxBuffer);
    console.log('Generated docs/manual_administradores.docx successfully!');

    console.log('DOCX generation complete!');
  } catch (err) {
    console.error('Failed to generate DOCX manuals:', err);
  }
})();
