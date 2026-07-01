import { NextRequest, NextResponse } from "next/server";
import { promises as fs } from "fs";
import { v4 as uuidv4 } from "uuid";
import PDFParser from "pdf2json";
import os from "os";
import path from "path";

export async function POST(req: NextRequest) {
  const formData: FormData = await req.formData();
  const uploadedFiles = formData.getAll("FILE");
  let fileName = "";
  let parsedText = "";

  if (uploadedFiles && uploadedFiles.length > 0) {
    const uploadedFile = uploadedFiles[0];
    console.log("Uploaded file:", uploadedFile);

    if (uploadedFile instanceof File) {
      fileName = uuidv4();

      const tempDir = os.tmpdir();
      const tempFilePath = path.join(tempDir, `${fileName}.pdf`);

      const fileBuffer = Buffer.from(await uploadedFile.arrayBuffer());

      await fs.writeFile(tempFilePath, fileBuffer);
      const pdfParser = new (PDFParser as any)(null, 1);

      pdfParser.on("pdfParser_dataError", (errData: any) =>
        console.log(errData.parserError),
      );

      pdfParser.on("pdfParser_dataReady", () => {
        const rawContent = (pdfParser as any).getRawTextContent();
        parsedText = safeDecodeURI(rawContent);
      });

      try {
        await new Promise((resolve, reject) => {
          pdfParser.loadPDF(tempFilePath);
          pdfParser.on("pdfParser_dataReady", resolve);
          pdfParser.on("pdfParser_dataError", reject);
        });
      } finally {
        try {
          await fs.unlink(tempFilePath);
        } catch (err) {
          console.error("Failed to delete temporary PDF file:", err);
        }
      }
    } else {
      console.log("Uploaded file is not in the expected format.");
      return new NextResponse("Uploaded file is not in the expected format.", {
        status: 500,
      });
    }
  } else {
    console.log("No files found.");
    return new NextResponse("No File Found", { status: 404 });
  }

  const jsonResult = convertTextToJson(parsedText);
  return NextResponse.json({
    fileName,
    rawText: parsedText,
    jsonData: jsonResult,
  });
}

function safeDecodeURI(str: string): string {
  try {
    return decodeURIComponent(str);
  } catch (e) {
    return str;
  }
}

function convertTextToJson(text: string): Record<string, any> {
  const lines = text.split(/\r?\n/);
  
  let patientName = "";
  let providerName = "";
  let invoiceDate = "";
  let claimNumber = "";
  
  let totalBilled = 0;
  let totalPaid = 0;
  let totalPatient = 0;
  let totalDisputed = 0;
  
  const procedures: any[] = [];
  const billingKeys: Record<string, string> = {};

  // Regex definitions
  const amountRegex = /\-?\$?\b\d{1,3}(?:,\d{3})*(?:\.\d{2})\b/g;
  const dateRegex = /\b\d{1,2}[\/\-]\d{1,2}[\/\-]\d{2,4}\b/;
  const cptRegex = /\b(?:\d{5}|[A-Z]\d{4})\b/i;

  for (let line of lines) {
    line = line.trim();
    if (!line) continue;

    // Check for typical noisy parser lines (PDF header/footer page count etc.)
    if (/^page\s+\d+$/i.test(line) || line.includes("pdfParser_data") || line.length < 3) {
      continue;
    }

    const lowerLine = line.toLowerCase();

    // 1. Extract metadata (Patient, Provider, Date, Claim)
    if (!patientName) {
      const match = line.match(/(?:patient|member|insured|subscriber)(?:\s+name)?\s*[:\-\=]\s*([a-zA-Z\s,\.]+)/i);
      if (match && match[1]) {
        const val = match[1].trim();
        if (val.length > 2 && val.length < 50 && !val.toLowerCase().includes("id") && !val.toLowerCase().includes("number")) {
          patientName = val;
        }
      }
    }

    if (!providerName) {
      const match = line.match(/(?:provider|facility|doctor|physician|clinic|hospital|billing\s+entity)\s*[:\-\=]\s*([a-zA-Z0-9\s,\.\&]+)/i);
      if (match && match[1]) {
        const val = match[1].trim();
        if (val.length > 2 && val.length < 60 && !val.toLowerCase().includes("date") && !val.toLowerCase().includes("tax")) {
          providerName = val;
        }
      }
    }

    if (!invoiceDate) {
      const match = line.match(/(?:statement|invoice|billing|claim|service)\s*date\s*[:\-\=]\s*(\d{1,2}[\/\-]\d{1,2}[\/\-]\d{2,4})/i);
      if (match && match[1]) {
        invoiceDate = match[1].trim();
      } else {
        const match2 = line.match(/\b(?:date)\b\s*[:\-\=]\s*(\d{1,2}[\/\-]\d{1,2}[\/\-]\d{2,4})/i);
        if (match2 && match2[1]) {
          invoiceDate = match2[1].trim();
        }
      }
    }

    if (!claimNumber) {
      const match = line.match(/(?:claim|invoice|account|bill|statement|reference)\s*(?:id|number|num|ref|\#)\s*[:\-\=]\s*([a-zA-Z0-9\-]+)/i);
      if (match && match[1]) {
        claimNumber = match[1].trim();
      }
    }

    // 2. Parse general billing key-value lines
    const colonIndex = line.indexOf(":");
    if (colonIndex > 0 && colonIndex < line.length - 1) {
      const key = line.substring(0, colonIndex).trim();
      const val = line.substring(colonIndex + 1).trim();

      const isBillingKey = /billed|charge|allowed|paid|settled|disputed|denied|adjustment|deductible|copay|coinsurance|patient|member/i.test(key);
      const valAmounts = val.match(amountRegex);

      if (isBillingKey && valAmounts && valAmounts.length > 0 && key.length < 55) {
        billingKeys[key] = val;

        const amt = parseFloat(valAmounts[0].replace(/[\$,]/g, ""));
        if (/billed|charge|total\s+amount/i.test(key) && !/paid|patient/i.test(key)) {
          totalBilled = Math.max(totalBilled, amt);
        } else if (/paid|settled|payment|reimburse/i.test(key)) {
          totalPaid = Math.max(totalPaid, amt);
        } else if (/patient|member|responsibility|deductible|copay|coins/i.test(key)) {
          totalPatient = Math.max(totalPatient, amt);
        } else if (/disputed|denied|adjusted|write|discount/i.test(key)) {
          totalDisputed = Math.max(totalDisputed, amt);
        }
      }
    }

    // 3. Scan for procedure table lines
    const lineAmounts = line.match(amountRegex);
    const dateMatch = line.match(dateRegex);
    const cptMatch = line.match(cptRegex);

    if (lineAmounts && lineAmounts.length > 0 && (dateMatch || cptMatch || /cpt|hcpcs|procedure|code|service/i.test(line))) {
      const dateVal = dateMatch ? dateMatch[0] : "";
      const cptVal = cptMatch ? cptMatch[0] : "";

      // Reconstruct description
      let description = line;
      if (dateVal) description = description.replace(dateVal, "");
      if (cptVal) description = description.replace(cptVal, "");
      lineAmounts.forEach(amt => {
        description = description.replace(amt, "");
      });
      description = description.replace(/[\:\-\=\,\$\(\)\/]/g, "").replace(/\s+/g, " ").trim();
      if (description.length > 80) {
        description = description.substring(0, 80) + "...";
      }

      // Parse amounts on the line
      let billed = "$0.00";
      let settled = "$0.00";
      let disputed = "$0.00";

      const parsedAmts = lineAmounts.map(val => parseFloat(val.replace(/[\$,]/g, "")));

      if (parsedAmts.length === 1) {
        if (/paid|settled|payment/i.test(line)) {
          settled = `$${parsedAmts[0].toFixed(2)}`;
        } else {
          billed = `$${parsedAmts[0].toFixed(2)}`;
        }
      } else if (parsedAmts.length === 2) {
        billed = `$${parsedAmts[0].toFixed(2)}`;
        settled = `$${parsedAmts[1].toFixed(2)}`;
        const diff = Math.max(0, parsedAmts[0] - parsedAmts[1]);
        disputed = `$${diff.toFixed(2)}`;
      } else if (parsedAmts.length >= 3) {
        billed = `$${parsedAmts[0].toFixed(2)}`;
        settled = `$${parsedAmts[1].toFixed(2)}`;
        disputed = `$${parsedAmts[2].toFixed(2)}`;
      }

      procedures.push({
        dateOfService: dateVal || undefined,
        cptCode: cptVal || undefined,
        description: description || "Medical Procedure",
        billedAmount: billed,
        settledAmount: settled,
        disputedAmount: disputed
      });
    }
  }

  // Calculate totals if they were not explicitly extracted
  if (totalBilled === 0 && procedures.length > 0) {
    totalBilled = procedures.reduce((sum, item) => sum + parseFloat(item.billedAmount.replace(/[\$,]/g, "")), 0);
  }
  if (totalPaid === 0 && procedures.length > 0) {
    totalPaid = procedures.reduce((sum, item) => sum + parseFloat(item.settledAmount.replace(/[\$,]/g, "")), 0);
  }
  if (totalDisputed === 0 && procedures.length > 0) {
    totalDisputed = procedures.reduce((sum, item) => sum + parseFloat(item.disputedAmount.replace(/[\$,]/g, "")), 0);
  }

  // Build the clean JSON structure
  const summary: Record<string, string> = {
    "Total Billed": `$${totalBilled.toFixed(2)}`,
    "Total Settled": `$${totalPaid.toFixed(2)}`,
    "Total Patient Responsibility": `$${totalPatient.toFixed(2)}`,
    "Total in Dispute": `$${totalDisputed.toFixed(2)}`
  };

  const result: Record<string, any> = {};
  if (patientName) result["Patient Name"] = patientName;
  if (providerName) result["Provider/Facility"] = providerName;
  if (invoiceDate) result["Billing Date"] = invoiceDate;
  if (claimNumber) result["Claim/Invoice Number"] = claimNumber;
  
  result["Financial Summary"] = summary;
  
  if (procedures.length > 0) {
    result["Procedures Detail"] = procedures;
  }

  // Final fallback in case PDF text extraction was completely unstructured (empty result)
  if (Object.keys(result).length <= 1 && procedures.length === 0) {
    let lineNum = 0;
    for (let line of lines) {
      line = line.trim();
      if (!line || line.length < 5 || /^page\s+\d+$/i.test(line)) continue;
      
      const colonIndex = line.indexOf(":");
      if (colonIndex > 0 && colonIndex < line.length - 1) {
        const key = line.substring(0, colonIndex).trim();
        const value = line.substring(colonIndex + 1).trim();
        if (/^[a-zA-Z0-9_\s-\(\)\/]+$/.test(key) && key.length < 50) {
          result[key] = value;
        }
      } else {
        lineNum++;
        result[`item_${lineNum}`] = line;
      }
    }
  }

  return result;
}

