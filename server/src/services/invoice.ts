// ─────────────────────────────────────────────────────────────────────────────
// services/invoice.ts — PDF Invoice Generator
//
// Uses PDFKit to generate a professional PDF invoice when a milestone is
// RELEASED. The PDF is saved to disk and can be downloaded from the UI.
// ─────────────────────────────────────────────────────────────────────────────

import PDFDocument from 'pdfkit';
import fs from 'fs';
import path from 'path';
import { db } from '../db';
import { config } from '../config';
import { formatInr } from '../utils/money';

/**
 * generateInvoicePdf — builds a PDF for a released milestone
 *
 * @param milestoneId ID of the milestone that was just released
 */
export async function generateInvoicePdf(milestoneId: number): Promise<void> {
  const invoice = await db.invoice.findUnique({
    where: { milestoneId },
    include: {
      project:   { include: { client: true, freelancer: true } },
      milestone: true,
    },
  });

  if (!invoice) throw new Error('Invoice record not found.');

  const pdfPath = path.resolve(config.invoicesDir, path.basename(invoice.pdfPath));

  return new Promise((resolve, reject) => {
    const doc = new PDFDocument({ margin: 50 });
    const stream = fs.createWriteStream(pdfPath);

    doc.pipe(stream);

    // ─── Header ───────────────────────────────────────────────────────────────
    doc.fontSize(24).font('Helvetica-Bold').text('TRUSTPAY INVOICE', { align: 'right' });
    doc.moveDown();
    
    doc.fontSize(10).font('Helvetica')
       .text(`Invoice Number: ${invoice.invoiceNumber}`, { align: 'right' })
       .text(`Date Issued: ${invoice.issuedAt.toISOString().split('T')[0]}`, { align: 'right' })
       .text(`Status: PAID (Via Escrow)`, { align: 'right' });

    doc.moveDown(2);

    // ─── Parties ──────────────────────────────────────────────────────────────
    const yParties = doc.y;
    
    doc.font('Helvetica-Bold').text('Billed To (Client):', 50, yParties);
    doc.font('Helvetica').text(invoice.project.client.name, 50, yParties + 15);
    doc.text(invoice.project.client.email, 50, yParties + 30);

    doc.font('Helvetica-Bold').text('Payable To (Freelancer):', 300, yParties);
    doc.font('Helvetica').text(invoice.project.freelancer.name, 300, yParties + 15);
    doc.text(invoice.project.freelancer.email, 300, yParties + 30);

    doc.moveDown(4);

    // ─── Project Details ──────────────────────────────────────────────────────
    doc.font('Helvetica-Bold').text('Project Details:');
    doc.font('Helvetica')
       .text(`Project ID: #${invoice.projectId}`)
       .text(`Title: ${invoice.project.title}`);
    
    doc.moveDown(2);

    // ─── Line Items (Table) ───────────────────────────────────────────────────
    const tableTop = doc.y;
    doc.font('Helvetica-Bold');
    doc.text('Description', 50, tableTop);
    doc.text('Amount', 450, tableTop, { width: 90, align: 'right' });
    
    doc.moveTo(50, tableTop + 15).lineTo(550, tableTop + 15).stroke();
    
    doc.font('Helvetica');
    doc.text(`Milestone ${invoice.milestone.order}: ${invoice.milestone.title}`, 50, tableTop + 25);
    doc.text(formatInr(invoice.amount), 450, tableTop + 25, { width: 90, align: 'right' });

    doc.moveTo(50, tableTop + 45).lineTo(550, tableTop + 45).stroke();

    // ─── Total ────────────────────────────────────────────────────────────────
    doc.font('Helvetica-Bold').fontSize(14)
       .text('Total Paid:', 350, tableTop + 60)
       .text(formatInr(invoice.amount), 450, tableTop + 60, { width: 90, align: 'right' });

    doc.moveDown(4);
    
    doc.fontSize(10).font('Helvetica-Oblique')
       .text('Thank you for using TrustPay! This payment was secured and released via our smart escrow system.', 50, doc.y, { align: 'center' });

    doc.end();

    stream.on('finish', () => resolve());
    stream.on('error', (err) => reject(err));
  });
}
