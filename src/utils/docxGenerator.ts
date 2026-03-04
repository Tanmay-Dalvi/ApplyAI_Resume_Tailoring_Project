import { Document, Packer, Paragraph, TextRun, AlignmentType, HeadingLevel } from 'docx';
import { saveAs } from 'file-saver';
import { ResumeData } from '../types';

export async function generateDocx(resume: ResumeData, jobTitle: string): Promise<void> {
  const doc = new Document({
    sections: [
      {
        children: [
          new Paragraph({
            text: resume.name,
            heading: HeadingLevel.TITLE,
            alignment: AlignmentType.CENTER,
            spacing: { after: 200 },
          }),

          new Paragraph({
            alignment: AlignmentType.CENTER,
            spacing: { after: 400 },
            children: [
              new TextRun(`${resume.email} | ${resume.phone}`),
            ],
          }),

          new Paragraph({
            text: 'PROFESSIONAL SUMMARY',
            heading: HeadingLevel.HEADING_1,
            spacing: { before: 300, after: 200 },
          }),

          new Paragraph({
            text: resume.summary,
            spacing: { after: 400 },
          }),

          new Paragraph({
            text: 'SKILLS',
            heading: HeadingLevel.HEADING_1,
            spacing: { before: 300, after: 200 },
          }),

          new Paragraph({
            text: resume.skills.join(' • '),
            spacing: { after: 400 },
          }),

          new Paragraph({
            text: 'EXPERIENCE',
            heading: HeadingLevel.HEADING_1,
            spacing: { before: 300, after: 200 },
          }),

          ...resume.experience.flatMap(exp => [
            new Paragraph({
              children: [
                new TextRun({ text: exp.title, bold: true }),
                new TextRun(` | ${exp.company}`),
              ],
              spacing: { after: 100 },
            }),
            new Paragraph({
              children: [
                new TextRun({ text: exp.duration, italics: true }),
              ],
              spacing: { after: 200 },
            }),
            ...exp.description.map(desc =>
              new Paragraph({
                text: `• ${desc}`,
                spacing: { after: 100 },
              })
            ),
            new Paragraph({ text: '', spacing: { after: 200 } }),
          ]),

          new Paragraph({
            text: 'EDUCATION',
            heading: HeadingLevel.HEADING_1,
            spacing: { before: 300, after: 200 },
          }),

          ...resume.education.map(edu =>
            new Paragraph({
              children: [
                new TextRun({ text: edu.degree, bold: true }),
                new TextRun(` - ${edu.institution}, ${edu.year}`),
              ],
              spacing: { after: 200 },
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
