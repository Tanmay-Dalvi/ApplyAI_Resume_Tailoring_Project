import { Document, Packer, Paragraph, TextRun, AlignmentType, HeadingLevel, BorderStyle, TabStopType, TabStopPosition } from 'docx';
import { saveAs } from 'file-saver';
import { ResumeData } from '../types';

export async function generateDocx(resume: ResumeData, jobTitle: string): Promise<void> {
  const sectionBorderBottom = {
    bottom: { color: "000000", space: 1, style: BorderStyle.SINGLE, size: 6 },
  };

  const sectionHeading = (title: string) =>
    new Paragraph({
      text: title,
      heading: HeadingLevel.HEADING_1,
      border: sectionBorderBottom,
      spacing: { before: 200, after: 100 },
    });

  // Build extra sections paragraphs dynamically
  const extraSectionParagraphs: Paragraph[] = [];
  if (resume.extra_sections && resume.extra_sections.length > 0) {
    for (const section of resume.extra_sections) {
      extraSectionParagraphs.push(sectionHeading(section.title.toUpperCase()));

      for (const item of section.items) {
        // If has heading/subheading (e.g. a project)
        if (item.heading) {
          extraSectionParagraphs.push(
            new Paragraph({
              spacing: { before: 100, after: 40 },
              children: [
                new TextRun({ text: item.heading, bold: true }),
                ...(item.subheading ? [new TextRun({ text: `  |  ${item.subheading}`, italics: true })] : []),
              ],
            })
          );
        }
        // Bullet points
        if (item.bullets && item.bullets.length > 0) {
          for (const bullet of item.bullets) {
            extraSectionParagraphs.push(
              new Paragraph({
                text: `•  ${bullet}`,
                indent: { left: 360, hanging: 360 },
                alignment: AlignmentType.JUSTIFIED,
                spacing: { after: 80 },
              })
            );
          }
        }
        // Plain text line (e.g. language: "English - Native")
        if (item.plain) {
          extraSectionParagraphs.push(
            new Paragraph({
              spacing: { after: 80 },
              children: [new TextRun({ text: `•  ${item.plain}` })],
            })
          );
        }
      }
    }
  }

  const doc = new Document({
    styles: {
      default: {
        document: {
          run: {
            font: "Times New Roman",
            size: 22, // 11pt
            color: "000000",
          },
          paragraph: {
            spacing: { line: 240 },
          },
        },
      },
    },
    sections: [
      {
        properties: {
          page: {
            margin: {
              top: 720,
              right: 720,
              bottom: 720,
              left: 720,
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
                size: 32,
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

          // Professional Summary
          sectionHeading('PROFESSIONAL SUMMARY'),
          new Paragraph({
            alignment: AlignmentType.JUSTIFIED,
            spacing: { after: 200 },
            children: [new TextRun(resume.summary)],
          }),

          // Skills
          sectionHeading('SKILLS'),
          new Paragraph({
            spacing: { after: 200 },
            children: [new TextRun(resume.skills.join('  •  '))],
          }),

          // Experience
          sectionHeading('EXPERIENCE'),
          ...resume.experience.flatMap(exp => [
            new Paragraph({
              tabStops: [{ type: TabStopType.RIGHT, position: TabStopPosition.MAX }],
              spacing: { before: 100, after: 50 },
              children: [
                new TextRun({ text: exp.company, bold: true }),
                new TextRun({ text: `\t${exp.duration}`, bold: true }),
              ],
            }),
            new Paragraph({
              spacing: { after: 100 },
              children: [new TextRun({ text: exp.title, italics: true })],
            }),
            ...exp.description.map(desc =>
              new Paragraph({
                text: `•  ${desc}`,
                indent: { left: 360, hanging: 360 },
                alignment: AlignmentType.JUSTIFIED,
                spacing: { after: 100 },
              })
            ),
          ]),

          // Education
          sectionHeading('EDUCATION'),
          ...resume.education.map(edu =>
            new Paragraph({
              tabStops: [{ type: TabStopType.RIGHT, position: TabStopPosition.MAX }],
              spacing: { before: 100, after: 100 },
              children: [
                new TextRun({ text: edu.institution, bold: true }),
                new TextRun({ text: ` - ${edu.degree}` }),
                new TextRun({ text: `\t${edu.year}`, bold: true }),
              ],
            })
          ),

          // Extra Sections (Projects, Achievements, Languages, etc.)
          ...extraSectionParagraphs,
        ],
      },
    ],
  });

  const blob = await Packer.toBlob(doc);
  const fileName = `ApplyAI_Resume_${jobTitle.replace(/\s+/g, '_')}.docx`;
  saveAs(blob, fileName);
}
