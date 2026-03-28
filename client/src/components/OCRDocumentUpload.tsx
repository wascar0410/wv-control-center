import { useState, useRef } from "react";
import { Upload, Loader2, CheckCircle, AlertCircle, Eye } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { trpc } from "@/lib/trpc";
import Tesseract from "tesseract.js";

interface ExtractedData {
  vendor: string | null;
  date: string | null;
  amount: number | null;
  category: string | null;
  description: string | null;
  confidence: number;
  rawText: string;
}

interface ProcessedDocument {
  id: string;
  file: File;
  preview: string;
  extracted: ExtractedData | null;
  processing: boolean;
  error: string | null;
}

export default function OCRDocumentUpload() {
  const [documents, setDocuments] = useState<ProcessedDocument[]>([]);
  const [selectedDoc, setSelectedDoc] = useState<ProcessedDocument | null>(null);
  const [showPreview, setShowPreview] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const processInvoice = trpc.ocr.processInvoice.useMutation();
  const saveExtractedData = trpc.ocr.saveExtractedData.useMutation();

  const handleFileSelect = async (files: FileList | null) => {
    if (!files) return;

    const newDocs: ProcessedDocument[] = [];
    for (let i = 0; i < files.length; i++) {
      const file = files[i];
      const reader = new FileReader();

      reader.onload = (e) => {
        const preview = e.target?.result as string;
        newDocs.push({
          id: `doc_${Date.now()}_${i}`,
          file,
          preview,
          extracted: null,
          processing: true,
          error: null,
        });

        if (newDocs.length === files.length) {
          setDocuments((prev) => [...prev, ...newDocs]);
          // Start OCR processing
          newDocs.forEach((doc) => processDocument(doc));
        }
      };

      reader.readAsDataURL(file);
    }
  };

  const processDocument = async (doc: ProcessedDocument) => {
    try {
      // Use Tesseract.js to extract text from image
      const result = await Tesseract.recognize(doc.preview, "eng", {
        logger: (m) => console.log("OCR Progress:", m),
      });

      const ocrText = result.data.text;

      // Send to backend for data extraction
      const response = await processInvoice.mutateAsync({
        imageBase64: doc.preview,
        ocrText,
      });

      if (response.success && response.data) {
        setDocuments((prev) =>
          prev.map((d) =>
            d.id === doc.id
              ? {
                  ...d,
                  extracted: response.data,
                  processing: false,
                }
              : d
          )
        );
      } else {
        setDocuments((prev) =>
          prev.map((d) =>
            d.id === doc.id
              ? {
                  ...d,
                  error: response.error || "Failed to process document",
                  processing: false,
                }
              : d
          )
        );
      }
    } catch (error) {
      setDocuments((prev) =>
        prev.map((d) =>
          d.id === doc.id
            ? {
                ...d,
                error: error instanceof Error ? error.message : "Unknown error",
                processing: false,
              }
            : d
        )
      );
    }
  };

  const handleSaveDocument = async (doc: ProcessedDocument) => {
    if (!doc.extracted) return;

    try {
      const result = await saveExtractedData.mutateAsync({
        vendor: doc.extracted.vendor,
        date: doc.extracted.date,
        amount: doc.extracted.amount || 0,
        category: doc.extracted.category || "other",
        description: doc.extracted.description,
        confidence: doc.extracted.confidence,
        rawText: doc.extracted.rawText,
      });

      if (result.success) {
        // Remove from list after successful save
        setDocuments((prev) => prev.filter((d) => d.id !== doc.id));
      }
    } catch (error) {
      console.error("Failed to save document:", error);
    }
  };

  const handleRemoveDocument = (docId: string) => {
    setDocuments((prev) => prev.filter((d) => d.id !== docId));
  };

  const categories = [
    "fuel",
    "maintenance",
    "tolls",
    "insurance",
    "parking",
    "meals",
    "supplies",
    "utilities",
    "equipment",
    "other",
  ];

  return (
    <div className="space-y-6">
      {/* Upload Area */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Upload className="w-5 h-5" />
            Upload Documents for OCR Processing
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div
            className="border-2 border-dashed border-gray-300 rounded-lg p-8 text-center hover:border-blue-500 transition cursor-pointer"
            onClick={() => fileInputRef.current?.click()}
            onDragOver={(e) => {
              e.preventDefault();
              e.currentTarget.classList.add("border-blue-500");
            }}
            onDragLeave={(e) => {
              e.currentTarget.classList.remove("border-blue-500");
            }}
            onDrop={(e) => {
              e.preventDefault();
              e.currentTarget.classList.remove("border-blue-500");
              handleFileSelect(e.dataTransfer.files);
            }}
          >
            <input
              ref={fileInputRef}
              type="file"
              multiple
              onChange={(e) => handleFileSelect(e.target.files)}
              className="hidden"
              accept="image/*,.pdf"
            />
            <Upload className="w-8 h-8 mx-auto mb-2 text-muted-foreground" />
            <p className="font-medium">Drag & drop invoices here</p>
            <p className="text-sm text-muted-foreground">or click to browse (JPG, PNG, PDF)</p>
          </div>
        </CardContent>
      </Card>

      {/* Processing Documents */}
      {documents.length > 0 && (
        <div className="space-y-4">
          <h3 className="font-semibold">Processing Documents ({documents.length})</h3>

          {documents.map((doc) => (
            <Card key={doc.id} className="overflow-hidden">
              <CardContent className="p-4">
                <div className="flex gap-4">
                  {/* Document Preview */}
                  <div className="flex-shrink-0 w-24 h-24 bg-gray-100 rounded overflow-hidden">
                    <img
                      src={doc.preview}
                      alt="Document preview"
                      className="w-full h-full object-cover"
                    />
                  </div>

                  {/* Document Info */}
                  <div className="flex-1 space-y-3">
                    <div>
                      <p className="font-medium text-sm">{doc.file.name}</p>
                      <p className="text-xs text-muted-foreground">
                        {(doc.file.size / 1024).toFixed(2)} KB
                      </p>
                    </div>

                    {/* Processing Status */}
                    {doc.processing && (
                      <div className="flex items-center gap-2 text-sm text-blue-600">
                        <Loader2 className="w-4 h-4 animate-spin" />
                        Processing with OCR...
                      </div>
                    )}

                    {doc.error && (
                      <div className="flex items-center gap-2 text-sm text-red-600">
                        <AlertCircle className="w-4 h-4" />
                        {doc.error}
                      </div>
                    )}

                    {doc.extracted && (
                      <div className="space-y-2 text-sm">
                        <div className="flex items-center gap-2">
                          <CheckCircle className="w-4 h-4 text-green-600" />
                          <span className="font-medium">Extracted Data</span>
                          <span className="text-xs text-gray-500">
                            Confidence: {(doc.extracted.confidence * 100).toFixed(0)}%
                          </span>
                        </div>

                        <div className="grid grid-cols-2 gap-2 bg-gray-50 p-2 rounded">
                          <div>
                            <p className="text-xs text-gray-600">Vendor</p>
                            <p className="font-medium">{doc.extracted.vendor || "—"}</p>
                          </div>
                          <div>
                            <p className="text-xs text-gray-600">Date</p>
                            <p className="font-medium">{doc.extracted.date || "—"}</p>
                          </div>
                          <div>
                            <p className="text-xs text-gray-600">Amount</p>
                            <p className="font-medium">
                              ${doc.extracted.amount?.toFixed(2) || "—"}
                            </p>
                          </div>
                          <div>
                            <p className="text-xs text-gray-600">Category</p>
                            <p className="font-medium capitalize">{doc.extracted.category || "—"}</p>
                          </div>
                        </div>
                      </div>
                    )}
                  </div>

                  {/* Actions */}
                  <div className="flex flex-col gap-2">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => {
                        setSelectedDoc(doc);
                        setShowPreview(true);
                      }}
                    >
                      <Eye className="w-4 h-4" />
                    </Button>

                    {doc.extracted && (
                      <Button
                        size="sm"
                        onClick={() => handleSaveDocument(doc)}
                        disabled={saveExtractedData.isPending}
                      >
                        {saveExtractedData.isPending ? (
                          <Loader2 className="w-4 h-4 animate-spin" />
                        ) : (
                          "Save"
                        )}
                      </Button>
                    )}

                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => handleRemoveDocument(doc.id)}
                    >
                      Remove
                    </Button>
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      {/* Preview Dialog */}
      <Dialog open={showPreview} onOpenChange={setShowPreview}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>Document Preview & Extracted Data</DialogTitle>
          </DialogHeader>

          {selectedDoc && (
            <div className="space-y-4">
              {/* Image Preview */}
              <div className="border rounded overflow-auto max-h-96">
                <img
                  src={selectedDoc.preview}
                  alt="Document"
                  className="w-full"
                />
              </div>

              {/* Extracted Data */}
              {selectedDoc.extracted && (
                <div className="space-y-3 border-t pt-4">
                  <h4 className="font-semibold">Extracted Information</h4>

                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label className="text-sm text-gray-600">Vendor</label>
                      <p className="font-medium">{selectedDoc.extracted.vendor || "—"}</p>
                    </div>
                    <div>
                      <label className="text-sm text-gray-600">Date</label>
                      <p className="font-medium">{selectedDoc.extracted.date || "—"}</p>
                    </div>
                    <div>
                      <label className="text-sm text-gray-600">Amount</label>
                      <p className="font-medium">
                        ${selectedDoc.extracted.amount?.toFixed(2) || "—"}
                      </p>
                    </div>
                    <div>
                      <label className="text-sm text-gray-600">Category</label>
                      <select className="w-full px-2 py-1 border rounded text-sm">
                        {categories.map((cat) => (
                          <option
                            key={cat}
                            value={cat}
                            selected={cat === selectedDoc.extracted?.category}
                          >
                            {cat.charAt(0).toUpperCase() + cat.slice(1)}
                          </option>
                        ))}
                      </select>
                    </div>
                  </div>

                  <div>
                    <label className="text-sm text-gray-600">Description</label>
                    <p className="text-sm">{selectedDoc.extracted.description || "—"}</p>
                  </div>

                  <div className="bg-gray-50 p-3 rounded">
                    <p className="text-xs text-gray-600 mb-1">Confidence Score</p>
                    <div className="w-full bg-gray-200 rounded-full h-2">
                      <div
                        className="bg-green-600 h-2 rounded-full"
                        style={{
                          width: `${selectedDoc.extracted.confidence * 100}%`,
                        }}
                      />
                    </div>
                    <p className="text-xs text-gray-600 mt-1">
                      {(selectedDoc.extracted.confidence * 100).toFixed(0)}% confidence
                    </p>
                  </div>
                </div>
              )}
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}
