import { Document, Packer, Paragraph, TextRun, AlignmentType, HeadingLevel, BorderStyle, TabStopType, TabStopPosition } from 'docx';
import { saveAs } from 'file-saver';
import { ResumeData } from '../types';

export async function generateDocx(resume: ResumeData, jobTitle: string): Promise<void> {
  const doc = new Document({
    styles: {
      default: {
        document: {
          run: {
            font: "Times New Roman",
            size: 22, // 11pt font size
            color: "000000", // Black
          },
          paragraph: {
            spacing: { line: 240 }, // 1.0 spacing
          },
        },
      },
    },
    sections: [
      {
        properties: {
          page: {
            margin: {
              top: 720,    // 0.5 inch
              right: 720,  // 0.5 inch
              bottom: 720, // 0.5 inch
              left: 720,   // 0.5 inch
            },
          },
        },
        children: [
          // Header - Name
          new Paragraph({
            alignment: AlignmentType.CENTER,
            spacing: { after: 100 },
            children: [
              new TextRun({
                text: resume.name.toUpperCase(),
                bold: true,
                size: 32, // 16pt
              }),
            ],
          }),

          // Header - Contact Info
          new Paragraph({
            alignment: AlignmentType.CENTER,
            spacing: { after: 300 },
            children: [
              new TextRun({ text: `${resume.email}  |  ${resume.phone}` }),
            ],
          }),

          // Professional Summary Section
          new Paragraph({
            text: 'PROFESSIONAL SUMMARY',
            heading: HeadingLevel.HEADING_1,
            border: {
              bottom: { color: "000000", space: 1, style: BorderStyle.SINGLE, size: 6 },
            },
            spacing: { before: 200, after: 100 },
          }),
          new Paragraph({
            alignment: AlignmentType.JUSTIFIED,
            spacing: { after: 200 },
            children: [new TextRun(resume.summary)],
          }),

          // Skills Section
          new Paragraph({
            text: 'SKILLS',
            heading: HeadingLevel.HEADING_1,
            border: {
              bottom: { color: "000000", space: 1, style: BorderStyle.SINGLE, size: 6 },
            },
            spacing: { before: 200, after: 100 },
          }),
          new Paragraph({
            spacing: { after: 200 },
            children: [new TextRun(resume.skills.join('  •  '))],
          }),

          // Experience Section
          new Paragraph({
            text: 'EXPERIENCE',
            heading: HeadingLevel.HEADING_1,
            border: {
              bottom: { color: "000000", space: 1, style: BorderStyle.SINGLE, size: 6 },
            },
            spacing: { before: 200, after: 100 },
          }),

          ...resume.experience.flatMap(exp => [
            // Company and Location/Dates line (tab stops to align dates right)
            new Paragraph({
              tabStops: [
                { type: TabStopType.RIGHT, position: 10000 },
              ],
              spacing: { before: 100, after: 50 },
              children: [
                new TextRun({ text: exp.company, bold: true }),
                new TextRun({ text: `\t${exp.duration}`, bold: true }),
              ],
            }),
            // Job Title line
            new Paragraph({
              spacing: { after: 100 },
              children: [
                new TextRun({ text: exp.title, italics: true }),
              ],
            }),
            // Bullets
            ...exp.description.map(desc =>
              new Paragraph({
                text: `•  ${desc}`,
                indent: { left: 360, hanging: 360 }, // 0.25 inch hanging indent
                alignment: AlignmentType.JUSTIFIED,
                spacing: { after: 100 },
              })
            ),
          ]),

          // Education Section
          new Paragraph({
            text: 'EDUCATION',
            heading: HeadingLevel.HEADING_1,
            border: {
              bottom: { color: "000000", space: 1, style: BorderStyle.SINGLE, size: 6 },
            },
            spacing: { before: 200, after: 100 },
          }),

          ...resume.education.map(edu =>
            new Paragraph({
              tabStops: [
                { type: TabStopType.RIGHT, position: 10000 },
              ],
              spacing: { before: 100, after: 100 },
              children: [
                new TextRun({ text: edu.institution, bold: true }),
                new TextRun({ text: ` - ${edu.degree}` }),
                new TextRun({ text: `\t${edu.year}`, bold: true }),
              ],
            })
          ),
        ],
      },
    ],
  });

  const blob = await Packer.toBlob(doc);
  const fileName = `Tailored_Resume_${jobTitle.replace(/\s+/g, '_')}.docx`;
  saveAs(blob, fileName);
}
