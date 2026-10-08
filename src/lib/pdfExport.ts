import { jsPDF } from "jspdf";
import autoTable from "jspdf-autotable";
import { IInvoice } from "./types";
import { normalizeDateToMMDDYY } from "./calculations";

/**
 * Generates and downloads a clean, professional PDF matching the user's
 * exact ledger format (AP Home Care / ALC HOME HEALTH invoice layout).
 */
export function generateInvoicePDF(invoice: IInvoice): void {
  // Letter size in inches: 8.5 x 11
  const doc = new jsPDF({
    orientation: "portrait",
    unit: "pt",
    format: "letter",
  });

  const pageWidth = doc.internal.pageSize.getWidth();
  const marginLeft = 54; // 0.75 in margin
  const marginRight = pageWidth - 54;

  // Header Left: Company Name & Phone
  doc.setFont("helvetica", "bold");
  doc.setFontSize(22);
  doc.setTextColor(0, 0, 0);
  doc.text("AP Home care", marginLeft, 60);

  doc.setFontSize(10);
  doc.text("Phone 786 287-4540", marginLeft, 80);

  // Header Right: INVOICE title & Date
  doc.setFontSize(26);
  doc.text("INVOICE", marginRight, 60, { align: "right" });

  doc.setFontSize(11);
  const formattedInvoiceDate = invoice.invoiceDate
    ? new Date(invoice.invoiceDate).toLocaleDateString("en-US", {
        month: "numeric",
        day: "numeric",
        year: "numeric",
      })
    : new Date().toLocaleDateString("en-US");
  doc.text(formattedInvoiceDate, marginRight, 80, { align: "right" });

  // Invoice Number Row
  let y = 120;
  doc.setFontSize(11);
  doc.setFont("helvetica", "bold");
  doc.text("INVOICE #", marginLeft, y);

  const workerSuffix =
    invoice.items && invoice.items[0]?.workerName
      ? ` ${invoice.items[0].workerName.split(" ")[0].toLowerCase()}`
      : "";
  const invoiceNumberFull = `${invoice.invoiceNumber || "75-62"}${workerSuffix}`;
  doc.text(invoiceNumberFull, marginLeft + 80, y);

  // Bill To Box
  y += 24;
  doc.setFontSize(11);
  doc.text("Bill To:", marginLeft, y);

  y += 15;
  doc.setFontSize(10.5);
  doc.text((invoice.clientName || "ALC HOME HEALTH").toUpperCase(), marginLeft, y);

  y += 14;
  doc.setFontSize(9.5);
  doc.text((invoice.clientAddress || "1916 NW 84 AVE").toUpperCase(), marginLeft, y);

  y += 13;
  doc.text("DORAL, FLORIDA 33126", marginLeft, y);

  // Prepare table data
  const tableRows: (string | number)[][] = [];

  const items = invoice.items || [];
  items.forEach((it) => {
    // Visit Date
    let visitDateFormatted = "-";
    if (it.visitDate) {
      visitDateFormatted = normalizeDateToMMDDYY(it.visitDate);
    } else if (invoice.periodStart) {
      visitDateFormatted = normalizeDateToMMDDYY(invoice.periodStart);
    }

    // Patient Name
    let rawPatient = it.patientName || "";
    if (!rawPatient && it.description) {
      const parts = it.description.split(/PATIENT:\s*/i);
      rawPatient = parts.length > 1 ? parts[1] : it.description;
    }
    rawPatient = rawPatient.replace(/^PATIENT:\s*/i, "").trim().toUpperCase();

    // Service Code
    let rawService = it.serviceType || "";
    if (!rawService && it.description) {
      const match = it.description.match(/^([A-Za-z0-9\s]+?)\s*-\s*Patient/i);
      if (match && match[1]) rawService = match[1].trim();
    }
    const displayService = (rawService || "SOC").toUpperCase();

    const rate = (Number(it.regularRate) || 0).toFixed(2);
    const qty = it.regularHours || 1;
    const amount = (Number(it.amount) || 0).toFixed(2);

    tableRows.push([
      rawPatient,
      visitDateFormatted,
      displayService,
      rate,
      qty,
      amount,
    ]);
  });

  // Minimum 24-25 lines as displayed in invoice sheet
  const minRows = 24;
  const remaining = Math.max(0, minRows - tableRows.length);
  for (let i = 0; i < remaining; i++) {
    tableRows.push(["", "", "", "", "", "-"]);
  }

  const totalQty = items.reduce(
    (acc, it) => acc + (Number(it.regularHours) || 1),
    0
  );
  const totalAmountStr = new Intl.NumberFormat("en-US", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(invoice.totalAmount || 0);

  // AutoTable
  autoTable(doc, {
    startY: y + 25,
    margin: { left: marginLeft, right: 54 },
    head: [["PATIENT NAME", "DATE", "SERVICE", "RATE", "QTY", "AMOUNT"]],
    body: tableRows,
    foot: [["TOTAL", "", "", "", totalQty, totalAmountStr]],
    theme: "plain",
    styles: {
      font: "helvetica",
      fontSize: 9,
      fontStyle: "bold",
      textColor: [0, 0, 0],
      lineColor: [0, 0, 0],
      lineWidth: 1,
      cellPadding: { top: 3.5, bottom: 3.5, left: 5, right: 5 },
      overflow: "ellipsize",
      valign: "middle",
    },
    headStyles: {
      fillColor: [255, 255, 255],
      textColor: [0, 0, 0],
      fontStyle: "bold",
      fontSize: 8.5,
      halign: "left",
      lineColor: [0, 0, 0],
      lineWidth: 1,
    },
    columnStyles: {
      0: { halign: "left" }, // PATIENT NAME
      1: { halign: "center", cellWidth: 65 }, // DATE
      2: { halign: "left", cellWidth: 70 }, // SERVICE
      3: { halign: "right", cellWidth: 60 }, // RATE
      4: { halign: "center", cellWidth: 40 }, // QTY
      5: { halign: "right", cellWidth: 70 }, // AMOUNT
    },
    footStyles: {
      fillColor: [255, 255, 255],
      textColor: [0, 0, 0],
      fontStyle: "bold",
      fontSize: 9.5,
      lineColor: [0, 0, 0],
      lineWidth: 1,
    },
    didParseCell: (data) => {
      // Alignments in head & foot
      if (data.section === "head") {
        if (data.column.index === 1 || data.column.index === 4) {
          data.cell.styles.halign = "center";
        } else if (data.column.index === 3 || data.column.index === 5) {
          data.cell.styles.halign = "right";
        }
      }
      if (data.section === "foot") {
        if (data.column.index === 0) {
          data.cell.styles.halign = "center";
        } else if (data.column.index === 4) {
          data.cell.styles.halign = "center";
        } else if (data.column.index === 5) {
          data.cell.styles.halign = "right";
        }
      }
      // If it's an empty filler row with "-" in amount
      if (data.section === "body" && data.cell.raw === "-") {
        data.cell.styles.halign = "center";
      }
    },
  });

  const baseInvNum = invoice.invoiceNumber ? invoice.invoiceNumber.trim() : "download";
  const fileName = baseInvNum.toUpperCase().startsWith("INV-")
    ? `${baseInvNum}.pdf`
    : `INV-${baseInvNum}.pdf`;
  doc.save(fileName);
}
