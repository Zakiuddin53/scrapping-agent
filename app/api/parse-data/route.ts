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

  // Flexible amount regex matching integer values ($250, $ 450) and standard decimal values (120.00, 0.50)
  const amountRegex = /(?:(?:\-\s*)?\$[-+]?\s*\d{1,3}(?:,\d{3})*(?:\.\d{2})?)|(?:\b\-?\d{1,3}(?:,\d{3})*\.\d{2}\b)/g;
  const dateRegex = /\b\d{1,2}[\/\-]\d{1,2}[\/\-]\d{2,4}\b/;
  const cptRegex = /\b(?:\d{5}|[A-Z]\d{4})\b/i;

  let lastSeenDate = "";
  let lastSeenCpt = "";
  let lastSeenDateLine = -10;
  let lastSeenCptLine = -10;

  const cleanLines: string[] = [];
  for (let line of lines) {
    line = line.trim();
    if (!line) continue;
    if (/^page\s+\d+$/i.test(line) || line.includes("pdfParser_data") || line.length < 3) {
      continue;
    }
    cleanLines.push(line);
  }

  for (let i = 0; i < cleanLines.length; i++) {
    const line = cleanLines[i];
    const lowerLine = line.toLowerCase();

    // Track dates and CPT codes lookback history
    const dateMatch = line.match(dateRegex);
    if (dateMatch) {
      lastSeenDate = dateMatch[0];
      lastSeenDateLine = i;
    }
    const cptMatch = line.match(cptRegex);
    if (cptMatch) {
      lastSeenCpt = cptMatch[0];
      lastSeenCptLine = i;
    }

    // 1. Extract metadata
    if (!patientName) {
      const match = line.match(/(?:patient|member|insured|subscriber|recipient)(?:\s+name)?\s*[:\-\=\|\s]\s*([a-zA-Z\s,\.]+)/i);
      if (match && match[1]) {
        const val = match[1].trim();
        if (val.length > 2 && val.length < 50 && !/id|number|no\b|code/i.test(val)) {
          patientName = val;
        }
      }
    }

    if (!providerName) {
      const match = line.match(/(?:provider|facility|doctor|physician|clinic|hospital|billing\s+entity|vendor|payee)\s*[:\-\=\|\s]\s*([a-zA-Z0-9\s,\.\&\#\-]+)/i);
      if (match && match[1]) {
        const val = match[1].trim();
        if (val.length > 2 && val.length < 60 && !/date|tax|npi|phone/i.test(val)) {
          providerName = val;
        }
      }
    }

    if (!invoiceDate) {
      const match = line.match(/(?:statement|invoice|billing|claim|service|dos)\s*date\s*[:\-\=\|\s]\s*(\d{1,2}[\/\-]\d{1,2}[\/\-]\d{2,4})/i);
      if (match && match[1]) {
        invoiceDate = match[1].trim();
      } else {
        const match2 = line.match(/\b(?:date)\b\s*[:\-\=\|\s]\s*(\d{1,2}[\/\-]\d{1,2}[\/\-]\d{2,4})/i);
        if (match2 && match2[1]) {
          invoiceDate = match2[1].trim();
        }
      }
    }

    if (!claimNumber) {
      const match = line.match(/(?:claim|invoice|account|bill|statement|reference|authorization)\s*(?:id|number|num|ref|\#)?\s*[:\-\=\|\s]\s*([a-zA-Z0-9\-]+)/i);
      if (match && match[1]) {
        claimNumber = match[1].trim();
      }
    }

    // 2. Parse billing key-value lines
    const colonIndex = line.indexOf(":");
    if (colonIndex > 0 && colonIndex < line.length - 1) {
      const key = line.substring(0, colonIndex).trim();
      const val = line.substring(colonIndex + 1).trim();

      const isBillingKey = /billed|charge|allowed|paid|settled|disputed|denied|adjustment|deductible|copay|coinsurance|patient|member/i.test(key);
      const valAmounts = val.match(amountRegex);

      if (isBillingKey && valAmounts && valAmounts.length > 0 && key.length < 55) {
        billingKeys[key] = val;

        const amt = parseFloat(valAmounts[0].replace(/[\$,\s]/g, ""));
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

    // 3. Scan for procedure lines
    const lineAmounts = line.match(amountRegex);

    if (lineAmounts && lineAmounts.length > 0) {
      const hasDate = !!dateMatch;
      const hasCpt = !!cptMatch;
      const isNearDate = (i - lastSeenDateLine) <= 3;
      const isNearCpt = (i - lastSeenCptLine) <= 3;
      
      const isProcedureLine = hasDate || hasCpt || isNearDate || isNearCpt || 
        /cpt|hcpcs|procedure|code|service|office|visit|therapy|eval|mod|lab/i.test(line);

      const isSummaryLine = /total|summary|grand|balance|due|patient\s+pays/i.test(line);

      if (isProcedureLine && !isSummaryLine) {
        const dateVal = dateMatch ? dateMatch[0] : (isNearDate ? lastSeenDate : "");
        const cptVal = cptMatch ? cptMatch[0] : (isNearCpt ? lastSeenCpt : "");

        let description = line;
        if (dateMatch && dateMatch[0]) description = description.replace(dateMatch[0], "");
        if (cptMatch && cptMatch[0]) description = description.replace(cptMatch[0], "");
        lineAmounts.forEach(amt => {
          description = description.replace(amt, "");
        });
        description = description.replace(/[\:\-\=\,\$\(\)\/]/g, "").replace(/\s+/g, " ").trim();
        if (description.length > 80) {
          description = description.substring(0, 80) + "...";
        }
        if (!description) description = "Medical Procedure / Service";

        let billed = "$0.00";
        let settled = "$0.00";
        let disputed = "$0.00";

        const parsedAmts = lineAmounts.map(val => parseFloat(val.replace(/[\$,\s]/g, "")));

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
          description,
          billedAmount: billed,
          settledAmount: settled,
          disputedAmount: disputed
        });
      }
    }
  }

  // Fallbacks if no procedures or explicit totals were found
  const allAmounts: number[] = [];
  for (const line of cleanLines) {
    const lineAmts = line.match(amountRegex);
    if (lineAmts) {
      lineAmts.forEach(val => {
        const parsed = parseFloat(val.replace(/[\$,\s]/g, ""));
        if (!isNaN(parsed) && parsed > 0 && parsed < 100000) {
          allAmounts.push(parsed);
        }
      });
    }
  }

  allAmounts.sort((a, b) => b - a);

  if (totalBilled === 0) {
    if (procedures.length > 0) {
      totalBilled = procedures.reduce((sum, item) => sum + parseFloat(item.billedAmount.replace(/[\$,\s]/g, "")), 0);
    } else if (allAmounts.length > 0) {
      totalBilled = allAmounts[0];
    }
  }

  if (totalPaid === 0) {
    if (procedures.length > 0) {
      totalPaid = procedures.reduce((sum, item) => sum + parseFloat(item.settledAmount.replace(/[\$,\s]/g, "")), 0);
    } else if (allAmounts.length > 1) {
      totalPaid = allAmounts[1];
    }
  }

  if (totalDisputed === 0) {
    if (procedures.length > 0) {
      totalDisputed = procedures.reduce((sum, item) => sum + parseFloat(item.disputedAmount.replace(/[\$,\s]/g, "")), 0);
    } else if (totalBilled > totalPaid) {
      totalDisputed = totalBilled - totalPaid;
    }
  }

  // Name fallback
  if (!patientName && cleanLines.length > 0) {
    for (let j = 0; j < Math.min(5, cleanLines.length); j++) {
      const line = cleanLines[j];
      if (/name\s*[:\-\=\|]/i.test(line)) {
        const parts = line.split(/[:\-\=\|]/);
        if (parts[1] && parts[1].trim().length > 2 && parts[1].trim().length < 40) {
          patientName = parts[1].trim();
          break;
        }
      }
    }
  }

  // Billing Date fallback
  if (!invoiceDate) {
    for (const line of cleanLines) {
      const match = line.match(dateRegex);
      if (match) {
        invoiceDate = match[0];
        break;
      }
    }
  }

  const summary: Record<string, string> = {
    "Total Billed": `$${totalBilled.toFixed(2)}`,
    "Total Settled": `$${totalPaid.toFixed(2)}`,
    "Total Patient Responsibility": `$${totalPatient.toFixed(2)}`,
    "Total in Dispute": `$${totalDisputed.toFixed(2)}`
  };

  const result: Record<string, any> = {};
  result["Patient Name"] = patientName || "Not Identified";
  result["Provider/Facility"] = providerName || "Not Identified";
  result["Billing Date"] = invoiceDate || "Not Identified";
  result["Claim/Invoice Number"] = claimNumber || "Not Identified";
  
  result["Financial Summary"] = summary;
  
  if (procedures.length > 0) {
    result["Procedures Detail"] = procedures;
  } else {
    // Simulated procedures fallback (lines with numbers)
    const simulatedProcedures: any[] = [];
    for (const line of cleanLines) {
      const amts = line.match(amountRegex);
      if (amts && amts.length > 0 && !/total|summary|grand|balance/i.test(line)) {
        let desc = line;
        amts.forEach(a => { desc = desc.replace(a, ""); });
        desc = desc.replace(/[\:\-\=\,\$\(\)\/]/g, "").replace(/\s+/g, " ").trim();
        
        simulatedProcedures.push({
          description: desc || "Document Item",
          billedAmount: amts[0] || "$0.00",
          settledAmount: amts[1] || "$0.00",
          disputedAmount: amts[2] || "$0.00"
        });
      }
    }
    if (simulatedProcedures.length > 0) {
      result["Procedures Detail"] = simulatedProcedures;
    }
  }

  return result;
}

