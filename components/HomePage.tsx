"use client";
import React, { useState } from "react";
import { useToast } from "./ui/use-toast";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import FileUpload from "./FileUploader";
import { 
  Copy, 
  Check, 
  Download, 
  Search, 
  FileJson, 
  FileText, 
  LayoutGrid, 
  UploadCloud,
  User,
  Building2,
  Calendar,
  Hash,
  Activity,
  CheckCircle2,
  AlertCircle,
  CreditCard
} from "lucide-react";

interface ParsedData {
  fileName: string;
  rawText: string;
  jsonData: Record<string, any>;
}

function HomePage() {
  const [uploadedFile, setUploadedFile] = useState<File | null>(null);
  const { toast } = useToast();
  const [parsedData, setParsedData] = useState<ParsedData | null>(null);
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  
  // UI states for the JSON viewer
  const [activeTab, setActiveTab] = useState<"structured" | "json" | "raw">("structured");
  const [searchQuery, setSearchQuery] = useState("");
  const [copied, setCopied] = useState(false);

  const handleFileUpload = async (file: File) => {
    setUploadedFile(file);
    setOpen(false);
    toast({
      variant: "default",
      title: "File Selected",
      description: `${file.name} is being processed.`,
    });
    setLoading(true);
    // Reset parsed data on new upload
    setParsedData(null);
  };

  const handleCopy = async () => {
    if (!parsedData) return;
    try {
      const textToCopy = activeTab === "raw" 
        ? parsedData.rawText 
        : JSON.stringify(parsedData.jsonData, null, 2);
      
      await navigator.clipboard.writeText(textToCopy);
      setCopied(true);
      toast({
        title: "Copied!",
        description: `${activeTab === "raw" ? "Raw text" : "JSON"} copied to clipboard.`,
      });
      setTimeout(() => setCopied(false), 2000);
    } catch (err) {
      toast({
        variant: "destructive",
        title: "Copy Failed",
        description: "Could not copy text to clipboard.",
      });
    }
  };

  const handleDownload = () => {
    if (!parsedData) return;
    try {
      const dataStr = "data:text/json;charset=utf-8," + encodeURIComponent(JSON.stringify(parsedData.jsonData, null, 2));
      const downloadAnchor = document.createElement('a');
      downloadAnchor.setAttribute("href", dataStr);
      downloadAnchor.setAttribute("download", `${uploadedFile?.name.replace(".pdf", "") || "parsed"}_data.json`);
      document.body.appendChild(downloadAnchor);
      downloadAnchor.click();
      downloadAnchor.remove();
      toast({
        title: "Downloaded",
        description: "JSON file downloaded successfully.",
      });
    } catch (err) {
      toast({
        variant: "destructive",
        title: "Download Failed",
        description: "Could not generate download file.",
      });
    }
  };

  return (
    <div className="flex flex-col items-center justify-center min-h-screen bg-slate-50 p-6 md:p-12">
      {/* Hero Section */}
      <div className="text-center max-w-xl mb-8">
        <h1 className="text-4xl font-extrabold tracking-tight bg-gradient-to-r from-blue-600 to-indigo-600 bg-clip-text text-transparent mb-3">
          PDF Parser & Extractor
        </h1>
        <p className="text-slate-600 text-base">
          Upload any PDF document to instantly extract its raw text and automatically structure it into a clean JSON key-value format.
        </p>
      </div>

      {/* Upload Action */}
      <Dialog open={open} onOpenChange={setOpen}>
        <DialogTrigger asChild>
          <button className="flex items-center gap-2 bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 text-white font-semibold py-3 px-6 rounded-xl shadow-lg hover:shadow-xl transition-all duration-200 transform hover:-translate-y-0.5 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2">
            <UploadCloud size={20} />
            {parsedData ? "Upload Another File" : "Upload PDF File"}
          </button>
        </DialogTrigger>
        <DialogContent className="sm:max-w-[450px] p-8 bg-white rounded-2xl shadow-2xl border border-slate-100">
          <DialogHeader className="mb-4">
            <DialogTitle className="text-center text-xl font-bold text-slate-800">
              Upload PDF Document
            </DialogTitle>
          </DialogHeader>
          <div className="grid gap-4">
            <FileUpload
              onFileUpload={handleFileUpload}
              setParsedData={(data) => {
                setParsedData(data);
                setLoading(false);
              }}
              maxSize={8 * 1024 * 1024} // 8 MB
            />
          </div>
        </DialogContent>
      </Dialog>

      {/* Loading Spinner */}
      {loading && (
        <div className="mt-12 flex flex-col items-center justify-center gap-4">
          <div className="relative flex items-center justify-center">
            <div className="animate-spin rounded-full h-16 w-16 border-4 border-slate-200 border-t-blue-600"></div>
          </div>
          <p className="text-slate-500 font-medium animate-pulse">Extracting and structuring document content...</p>
        </div>
      )}

      {/* Results Section */}
      {parsedData && !loading && (
        <div className="mt-8 w-full max-w-4xl bg-white border border-slate-200/80 rounded-2xl shadow-xl overflow-hidden transition-all duration-300">
          {/* Header Panel */}
          <div className="bg-slate-900 px-6 py-4 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 border-b border-slate-800">
            <div>
              <span className="text-xs font-semibold uppercase tracking-wider text-blue-400">Successfully Processed</span>
              <h3 className="text-lg font-bold text-white truncate max-w-md">
                {uploadedFile?.name || "document.pdf"}
              </h3>
            </div>
            
            {/* Action buttons */}
            <div className="flex items-center gap-2 self-end sm:self-center">
              <button 
                onClick={handleCopy}
                className="flex items-center gap-1.5 bg-slate-800 hover:bg-slate-700 text-slate-200 hover:text-white px-3 py-1.5 rounded-lg text-sm font-medium transition-colors border border-slate-700/60"
                title="Copy to Clipboard"
              >
                {copied ? <Check size={15} className="text-green-400" /> : <Copy size={15} />}
                {copied ? "Copied!" : "Copy"}
              </button>
              <button 
                onClick={handleDownload}
                className="flex items-center gap-1.5 bg-blue-600 hover:bg-blue-500 text-white px-3 py-1.5 rounded-lg text-sm font-medium transition-colors"
                title="Download JSON file"
              >
                <Download size={15} />
                Download JSON
              </button>
            </div>
          </div>

          {/* Navigation Tabs & Search */}
          <div className="border-b border-slate-200 bg-slate-50 px-6 py-3 flex flex-col md:flex-row md:items-center md:justify-between gap-4">
            <div className="flex bg-slate-200/60 p-1 rounded-xl w-fit">
              <button
                onClick={() => setActiveTab("structured")}
                className={`flex items-center gap-1.5 px-4 py-2 rounded-lg text-sm font-semibold transition-all ${
                  activeTab === "structured" 
                    ? "bg-white text-blue-600 shadow-sm" 
                    : "text-slate-600 hover:text-slate-900"
                }`}
              >
                <LayoutGrid size={15} />
                Structured Grid
              </button>
              <button
                onClick={() => setActiveTab("json")}
                className={`flex items-center gap-1.5 px-4 py-2 rounded-lg text-sm font-semibold transition-all ${
                  activeTab === "json" 
                    ? "bg-white text-blue-600 shadow-sm" 
                    : "text-slate-600 hover:text-slate-900"
                }`}
              >
                <FileJson size={15} />
                JSON Output
              </button>
              <button
                onClick={() => setActiveTab("raw")}
                className={`flex items-center gap-1.5 px-4 py-2 rounded-lg text-sm font-semibold transition-all ${
                  activeTab === "raw" 
                    ? "bg-white text-blue-600 shadow-sm" 
                    : "text-slate-600 hover:text-slate-900"
                }`}
              >
                <FileText size={15} />
                Raw Text
              </button>
            </div>

            {/* Live Search inside structured tab */}
            {activeTab === "structured" && (
              <div className="relative max-w-xs w-full">
                <Search className="absolute left-3 top-2.5 h-4 w-4 text-slate-400" />
                <input
                  type="text"
                  placeholder="Filter by service name or code..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="pl-9 pr-4 py-2 w-full text-sm bg-white border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all shadow-sm placeholder:text-slate-400"
                />
              </div>
            )}
          </div>

          {/* View Panels */}
          <div className="p-6 min-h-[300px] max-h-[550px] overflow-y-auto">
            {/* Tab 1: Structured Grid View */}
            {activeTab === "structured" && (
              <div className="space-y-6">
                {/* 1. Metadata Section */}
                <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-4 bg-slate-50 p-4 rounded-xl border border-slate-100">
                  <div className="flex items-center gap-3">
                    <div className="p-2 bg-blue-50 text-blue-600 rounded-lg">
                      <User size={18} />
                    </div>
                    <div className="min-w-0">
                      <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Patient Name</p>
                      <p className="text-sm font-semibold text-slate-700 truncate">{parsedData.jsonData["Patient Name"] || "N/A"}</p>
                    </div>
                  </div>
                  <div className="flex items-center gap-3">
                    <div className="p-2 bg-indigo-50 text-indigo-600 rounded-lg">
                      <Building2 size={18} />
                    </div>
                    <div className="min-w-0">
                      <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Provider / Facility</p>
                      <p className="text-sm font-semibold text-slate-700 truncate">{parsedData.jsonData["Provider/Facility"] || "N/A"}</p>
                    </div>
                  </div>
                  <div className="flex items-center gap-3">
                    <div className="p-2 bg-emerald-50 text-emerald-600 rounded-lg">
                      <Calendar size={18} />
                    </div>
                    <div className="min-w-0">
                      <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Billing Date</p>
                      <p className="text-sm font-semibold text-slate-700 truncate">{parsedData.jsonData["Billing Date"] || "N/A"}</p>
                    </div>
                  </div>
                  <div className="flex items-center gap-3">
                    <div className="p-2 bg-violet-50 text-violet-600 rounded-lg">
                      <Hash size={18} />
                    </div>
                    <div className="min-w-0">
                      <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Claim / Invoice #</p>
                      <p className="text-sm font-semibold text-slate-700 truncate">{parsedData.jsonData["Claim/Invoice Number"] || "N/A"}</p>
                    </div>
                  </div>
                </div>

                {/* 2. Financial Summary Cards */}
                {parsedData.jsonData["Financial Summary"] && (
                  <div>
                    <h4 className="text-xs font-bold uppercase tracking-wider text-slate-400 mb-3">Financial Overview</h4>
                    <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-4">
                      {/* Billed */}
                      <div className="bg-gradient-to-br from-blue-50 to-blue-100/50 border border-blue-100 p-4 rounded-2xl flex flex-col justify-between min-h-[100px] shadow-sm hover:shadow transition-shadow">
                        <div className="flex justify-between items-start">
                          <span className="text-xs font-bold text-blue-600/80 uppercase tracking-wider">Total Billed</span>
                          <Activity size={16} className="text-blue-500" />
                        </div>
                        <p className="text-2xl font-black text-blue-900 mt-2">{parsedData.jsonData["Financial Summary"]["Total Billed"] || "$0.00"}</p>
                      </div>

                      {/* Settled / Paid */}
                      <div className="bg-gradient-to-br from-emerald-50 to-emerald-100/50 border border-emerald-100 p-4 rounded-2xl flex flex-col justify-between min-h-[100px] shadow-sm hover:shadow transition-shadow">
                        <div className="flex justify-between items-start">
                          <span className="text-xs font-bold text-emerald-600/80 uppercase tracking-wider">Total Settled</span>
                          <CheckCircle2 size={16} className="text-emerald-500" />
                        </div>
                        <p className="text-2xl font-black text-emerald-900 mt-2">{parsedData.jsonData["Financial Summary"]["Total Settled"] || "$0.00"}</p>
                      </div>

                      {/* Patient Responsibility */}
                      <div className="bg-gradient-to-br from-amber-50 to-amber-100/50 border border-amber-100 p-4 rounded-2xl flex flex-col justify-between min-h-[100px] shadow-sm hover:shadow transition-shadow">
                        <div className="flex justify-between items-start">
                          <span className="text-xs font-bold text-amber-600/80 uppercase tracking-wider">Patient Responsibility</span>
                          <CreditCard size={16} className="text-amber-500" />
                        </div>
                        <p className="text-2xl font-black text-amber-900 mt-2">{parsedData.jsonData["Financial Summary"]["Total Patient Responsibility"] || "$0.00"}</p>
                      </div>

                      {/* In Dispute */}
                      <div className="bg-gradient-to-br from-rose-50 to-rose-100/50 border border-rose-100 p-4 rounded-2xl flex flex-col justify-between min-h-[100px] shadow-sm hover:shadow transition-shadow">
                        <div className="flex justify-between items-start">
                          <span className="text-xs font-bold text-rose-600/80 uppercase tracking-wider">In Dispute</span>
                          <AlertCircle size={16} className="text-rose-500" />
                        </div>
                        <p className="text-2xl font-black text-rose-900 mt-2">{parsedData.jsonData["Financial Summary"]["Total in Dispute"] || "$0.00"}</p>
                      </div>
                    </div>
                  </div>
                )}

                {/* 3. Procedures Detail List/Table */}
                <div>
                  <div className="flex items-center justify-between mb-3">
                    <h4 className="text-xs font-bold uppercase tracking-wider text-slate-400">Procedures & Service Details</h4>
                    {parsedData.jsonData["Procedures Detail"] && (
                      <span className="text-[10px] bg-slate-100 text-slate-600 font-bold px-2 py-0.5 rounded-full">
                        {parsedData.jsonData["Procedures Detail"].length} item(s)
                      </span>
                    )}
                  </div>
                  
                  {parsedData.jsonData["Procedures Detail"] && Array.isArray(parsedData.jsonData["Procedures Detail"]) ? (
                    (() => {
                      const filteredProcedures = parsedData.jsonData["Procedures Detail"].filter((proc: any) => {
                        const searchLower = searchQuery.toLowerCase();
                        return (
                          (proc.description || "").toLowerCase().includes(searchLower) ||
                          (proc.cptCode || "").toLowerCase().includes(searchLower) ||
                          (proc.dateOfService || "").toLowerCase().includes(searchLower)
                        );
                      });

                      if (filteredProcedures.length === 0) {
                        return (
                          <div className="text-center py-10 border border-dashed border-slate-200 rounded-2xl bg-slate-50/50">
                            <p className="text-sm text-slate-400 font-medium">No matching procedures found.</p>
                          </div>
                        );
                      }

                      return (
                        <div className="overflow-hidden border border-slate-200/80 rounded-2xl shadow-sm">
                          <div className="overflow-x-auto">
                            <table className="min-w-full divide-y divide-slate-200 text-left text-sm">
                              <thead className="bg-slate-50 text-[10px] font-bold text-slate-400 uppercase tracking-wider">
                                <tr>
                                  <th className="px-4 py-3">Date</th>
                                  <th className="px-4 py-3">CPT Code</th>
                                  <th className="px-6 py-3">Description</th>
                                  <th className="px-4 py-3 text-right">Billed</th>
                                  <th className="px-4 py-3 text-right">Settled</th>
                                  <th className="px-4 py-3 text-right">Disputed</th>
                                </tr>
                              </thead>
                              <tbody className="divide-y divide-slate-100 bg-white">
                                {filteredProcedures.map((proc: any, index: number) => (
                                  <tr key={index} className="hover:bg-slate-50/40 transition-colors">
                                    <td className="whitespace-nowrap px-4 py-3 font-semibold text-slate-500 text-xs">
                                      {proc.dateOfService || "—"}
                                    </td>
                                    <td className="whitespace-nowrap px-4 py-3">
                                      <span className="font-mono text-[11px] font-semibold px-2 py-0.5 bg-slate-100 text-slate-600 rounded border border-slate-200/60">
                                        {proc.cptCode || "—"}
                                      </span>
                                    </td>
                                    <td className="px-6 py-3 font-medium text-slate-700 max-w-xs truncate">
                                      {proc.description || "Medical Service"}
                                    </td>
                                    <td className="whitespace-nowrap px-4 py-3 text-right font-semibold text-slate-700">
                                      {proc.billedAmount}
                                    </td>
                                    <td className="whitespace-nowrap px-4 py-3 text-right font-bold text-emerald-600">
                                      {proc.settledAmount}
                                    </td>
                                    <td className="whitespace-nowrap px-4 py-3 text-right font-bold text-rose-600">
                                      {proc.disputedAmount}
                                    </td>
                                  </tr>
                                ))}
                              </tbody>
                            </table>
                          </div>
                        </div>
                      );
                    })()
                  ) : (
                    <div className="text-center py-10 border border-dashed border-slate-200 rounded-2xl bg-slate-50/50">
                      <p className="text-sm text-slate-400 font-medium">No procedure details parsed.</p>
                    </div>
                  )}
                </div>

                {/* 4. Other Details Section (Fallback for items not in standard schema) */}
                {(() => {
                  const standardKeys = ["Patient Name", "Provider/Facility", "Billing Date", "Claim/Invoice Number", "Financial Summary", "Procedures Detail"];
                  const otherKeys = Object.keys(parsedData.jsonData).filter(k => !standardKeys.includes(k));
                  
                  if (otherKeys.length === 0) return null;
                  
                  return (
                    <div>
                      <h4 className="text-xs font-bold uppercase tracking-wider text-slate-400 mb-3">Other Extracted Details</h4>
                      <div className="grid gap-3 sm:grid-cols-1 md:grid-cols-2">
                        {otherKeys.map(key => {
                          const val = parsedData.jsonData[key];
                          return (
                            <div key={key} className="border border-slate-100 p-4 rounded-xl bg-slate-50/30">
                              <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-1">{key}</p>
                              <p className="text-sm font-semibold text-slate-700 break-words whitespace-pre-wrap">{String(val)}</p>
                            </div>
                          );
                        })}
                      </div>
                    </div>
                  );
                })()}
              </div>
            )}

            {/* Tab 2: Raw JSON code block */}
            {activeTab === "json" && (
              <div className="relative rounded-xl overflow-hidden bg-slate-900 border border-slate-800 text-left font-mono text-xs leading-relaxed text-slate-300 p-5 shadow-inner">
                <div className="absolute top-2 right-2 text-slate-600 text-[10px] uppercase font-bold tracking-wider select-none">
                  JSON FORMAT
                </div>
                <pre className="overflow-x-auto max-h-[450px] whitespace-pre-wrap">
                  {JSON.stringify(parsedData.jsonData, null, 2)}
                </pre>
              </div>
            )}

            {/* Tab 3: Raw parsed text */}
            {activeTab === "raw" && (
              <div className="bg-slate-50 border border-slate-200/80 rounded-xl p-5 text-slate-700 text-sm leading-relaxed whitespace-pre-wrap font-sans text-left max-h-[450px] overflow-y-auto">
                {parsedData.rawText || (
                  <span className="italic text-slate-400">Empty document text content.</span>
                )}
              </div>
            )}
          </div>
          
          {/* Metadata Footer */}
          <div className="bg-slate-50 border-t border-slate-100 px-6 py-3.5 flex items-center justify-between text-xs text-slate-500 font-medium">
            <span>ID: <code className="bg-slate-100 border border-slate-200/60 px-1.5 py-0.5 rounded text-[11px] text-slate-600">{parsedData.fileName}</code></span>
            <span>Total Parsed Fields: {Object.keys(parsedData.jsonData).length}</span>
          </div>
        </div>
      )}
    </div>
  );
}

export default HomePage;
