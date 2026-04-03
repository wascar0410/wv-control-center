/**
 * DriverLoadDetail.tsx
 * Design: Driver-focused load detail with evidence collection system
 * - Full route information display
 * - Status action buttons (accept, start transit, confirm delivery)
 * - Evidence collection: pickup photos, delivery photos, BOL scan, damage reports
 * - Evidence timeline showing all uploaded proof
 * - No map (driver uses broker's app for navigation)
 */
import { useState, useRef } from "react";
import { useParams, useLocation } from "wouter";
import { trpc } from "@/lib/trpc";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import { toast } from "sonner";
import {
  Truck,
  MapPin,
  Package,
  DollarSign,
  ArrowRight,
  CheckCircle2,
  Camera,
  FileText,
  AlertTriangle,
  Upload,
  Loader2,
  ArrowLeft,
  Clock,
  Weight,
  Hash,
  Image,
  Eye,
  Shield,
  ChevronDown,
  ChevronUp,
  X,
  Fuel,
} from "lucide-react";

function formatCurrency(value: number | string | null | undefined) {
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD",
  }).format(Number(value || 0));
}

function formatDate(date: Date | string | null | undefined) {
  if (!date) return "Not specified";
  return new Date(date).toLocaleDateString("en-US", {
    weekday: "short",
    month: "short",
    day: "numeric",
    year: "numeric",
  });
}

function formatDateTime(date: Date | string | null | undefined) {
  if (!date) return "—";
  return new Date(date).toLocaleString("en-US", {
    month: "short",
    day: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

const STATUS_CONFIG: Record<string, { label: string; color: string; bg: string }> = {
  available: { label: "Available", color: "text-blue-400", bg: "bg-blue-500/15 border-blue-500/30" },
  in_transit: { label: "In Transit", color: "text-amber-400", bg: "bg-amber-500/15 border-amber-500/30" },
  delivered: { label: "Delivered", color: "text-green-400", bg: "bg-green-500/15 border-green-500/30" },
  invoiced: { label: "Invoiced", color: "text-purple-400", bg: "bg-purple-500/15 border-purple-500/30" },
  paid: { label: "Paid", color: "text-emerald-400", bg: "bg-emerald-500/15 border-emerald-500/30" },
};

const EVIDENCE_TYPES = [
  { value: "pickup_photo", label: "Pickup Photo", icon: Camera, description: "Photo confirming cargo pickup", color: "blue" },
  { value: "delivery_photo", label: "Delivery Photo", icon: Camera, description: "Photo confirming delivery", color: "green" },
  { value: "bol_scan", label: "BOL Scan", icon: FileText, description: "Bill of Lading document", color: "purple" },
  { value: "damage_report", label: "Damage Report", icon: AlertTriangle, description: "Document any cargo damage", color: "red" },
  { value: "receipt", label: "Receipt", icon: DollarSign, description: "Fuel or toll receipt", color: "orange" },
  { value: "other", label: "Other", icon: Image, description: "Other documentation", color: "gray" },
] as const;

type EvidenceType = typeof EVIDENCE_TYPES[number]["value"];

export default function DriverLoadDetail() {
  const params = useParams<{ id: string }>();
  const [, setLocation] = useLocation();
  const loadId = parseInt(params.id || "0");

  const [showEvidenceModal, setShowEvidenceModal] = useState(false);
  const [selectedEvidenceType, setSelectedEvidenceType] = useState<EvidenceType>("pickup_photo");
  const [evidenceCaption, setEvidenceCaption] = useState("");
  const [isUploading, setIsUploading] = useState(false);
  const [showRejectModal, setShowRejectModal] = useState(false);
  const [rejectReason, setRejectReason] = useState("");
  const [showDeliveryModal, setShowDeliveryModal] = useState(false);
  const [deliveryNotes, setDeliveryNotes] = useState("");
  const [showEvidenceSection, setShowEvidenceSection] = useState(true);
  const [previewImage, setPreviewImage] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const utils = trpc.useUtils();

  const { data: load, isLoading } = trpc.loads.byId.useQuery(
    { id: loadId },
    { enabled: !!loadId, refetchInterval: 30000 }
  );

  const { data: evidence, isLoading: evidenceLoading } = trpc.driver.getEvidence.useQuery(
    { loadId },
    { enabled: !!loadId }
  );

  const acceptMutation = trpc.loads.acceptLoad.useMutation({
    onSuccess: () => {
      toast.success("Load accepted — you're now in transit!");
      utils.loads.byId.invalidate({ id: loadId });
    },
    onError: (e) => toast.error(e.message),
  });

  const rejectMutation = trpc.loads.rejectLoad.useMutation({
    onSuccess: () => {
      toast.success("Load rejected");
      setShowRejectModal(false);
      setLocation("/driver");
    },
    onError: (e) => toast.error(e.message),
  });

  const deliverMutation = trpc.driver.confirmDelivery.useMutation({
    onSuccess: () => {
      toast.success("Delivery confirmed! Great work.");
      setShowDeliveryModal(false);
      utils.loads.byId.invalidate({ id: loadId });
    },
    onError: (e) => toast.error(e.message),
  });

  const uploadEvidenceMutation = trpc.driver.uploadEvidence.useMutation({
    onSuccess: () => {
      toast.success("Evidence uploaded successfully");
      setShowEvidenceModal(false);
      setEvidenceCaption("");
      utils.driver.getEvidence.invalidate({ loadId });
    },
    onError: (e) => toast.error(e.message || "Upload failed"),
  });

  const handleFileUpload = async (file: File) => {
    if (!file) return;
    setIsUploading(true);
    try {
      const reader = new FileReader();
      reader.onload = async (e) => {
        const base64 = (e.target?.result as string).split(",")[1];
        await uploadEvidenceMutation.mutateAsync({
          loadId,
          evidenceType: selectedEvidenceType,
          fileBase64: base64,
          fileName: file.name,
          mimeType: file.type,
          fileSize: file.size,
          caption: evidenceCaption || undefined,
        });
        setIsUploading(false);
      };
      reader.readAsDataURL(file);
    } catch {
      setIsUploading(false);
    }
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <Loader2 className="w-8 h-8 animate-spin text-muted-foreground" />
      </div>
    );
  }

  if (!load) {
    return (
      <div className="text-center py-16">
        <Package className="w-12 h-12 text-muted-foreground mx-auto mb-3" />
        <p className="text-muted-foreground">Load not found</p>
        <Button variant="outline" className="mt-4" onClick={() => setLocation("/driver")}>
          Back to My Loads
        </Button>
      </div>
    );
  }

  const statusCfg = STATUS_CONFIG[load.status] || STATUS_CONFIG.available;
  const isAssignedToMe = true; // In driver context, always true
  const canAccept = load.status === "available" && isAssignedToMe;
  const canStartTransit = false; // Accept immediately sets to in_transit
  const canDeliver = load.status === "in_transit";
  const isCompleted = ["delivered", "invoiced", "paid"].includes(load.status);

  // Group evidence by type
  const evidenceByType = (evidence || []).reduce((acc: any, item: any) => {
    if (!acc[item.evidenceType]) acc[item.evidenceType] = [];
    acc[item.evidenceType].push(item);
    return acc;
  }, {});

  const totalEvidence = (evidence || []).length;

  return (
    <div className="space-y-5 pb-8">
      {/* Back Button */}
      <Button
        variant="ghost"
        size="sm"
        className="gap-2 -ml-2 text-muted-foreground hover:text-foreground"
        onClick={() => setLocation("/driver")}
      >
        <ArrowLeft className="w-4 h-4" />
        Back to My Loads
      </Button>

      {/* Load Header */}
      <div className="rounded-xl border border-border bg-card p-5">
        <div className="flex items-start justify-between gap-4 mb-4">
          <div>
            <div className="flex items-center gap-2 mb-1">
              <Badge variant="outline" className={`text-xs border ${statusCfg.bg} ${statusCfg.color}`}>
                {statusCfg.label}
              </Badge>
              <span className="text-xs text-muted-foreground">Load #{load.id}</span>
            </div>
            <h1 className="text-xl font-bold">{load.clientName}</h1>
            {(load as any).rateConfirmationNumber && (
              <div className="flex items-center gap-1.5 mt-1 text-xs text-muted-foreground">
                <Hash className="w-3 h-3" />
                <span>RC# {(load as any).rateConfirmationNumber}</span>
              </div>
            )}
          </div>
          <div className="text-right">
            <p className="text-2xl font-bold text-primary">{formatCurrency(load.price)}</p>
            <p className="text-xs text-muted-foreground mt-1">
              Net: {formatCurrency(load.netMargin)}
            </p>
          </div>
        </div>

        {/* Route */}
        <div className="space-y-3">
          <div className="flex items-start gap-3">
            <div className="w-8 h-8 rounded-full bg-blue-500/15 flex items-center justify-center flex-shrink-0 mt-0.5">
              <MapPin className="w-4 h-4 text-blue-400" />
            </div>
            <div>
              <p className="text-xs font-medium text-blue-400 uppercase tracking-wide">Pickup</p>
              <p className="text-sm font-medium text-foreground">{load.pickupAddress}</p>
              {load.pickupDate && (
                <p className="text-xs text-muted-foreground mt-0.5">
                  {formatDate(load.pickupDate)}
                </p>
              )}
            </div>
          </div>

          <div className="ml-4 border-l-2 border-dashed border-border h-4" />

          <div className="flex items-start gap-3">
            <div className="w-8 h-8 rounded-full bg-green-500/15 flex items-center justify-center flex-shrink-0 mt-0.5">
              <CheckCircle2 className="w-4 h-4 text-green-400" />
            </div>
            <div>
              <p className="text-xs font-medium text-green-400 uppercase tracking-wide">Delivery</p>
              <p className="text-sm font-medium text-foreground">{load.deliveryAddress}</p>
              {load.deliveryDate && (
                <p className="text-xs text-muted-foreground mt-0.5">
                  {formatDate(load.deliveryDate)}
                </p>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Cargo Details */}
      <div className="grid grid-cols-2 gap-3">
        <div className="rounded-xl border border-border bg-card p-4">
          <div className="flex items-center gap-2 mb-2">
            <Weight className="w-4 h-4 text-muted-foreground" />
            <p className="text-xs text-muted-foreground">Weight</p>
          </div>
          <p className="text-lg font-bold">{load.weight} {load.weightUnit}</p>
        </div>
        <div className="rounded-xl border border-border bg-card p-4">
          <div className="flex items-center gap-2 mb-2">
            <Package className="w-4 h-4 text-muted-foreground" />
            <p className="text-xs text-muted-foreground">Cargo Type</p>
          </div>
          <p className="text-sm font-semibold leading-tight">{load.merchandiseType}</p>
        </div>
        {(load as any).estimatedFuel && Number((load as any).estimatedFuel) > 0 && (
          <div className="rounded-xl border border-border bg-card p-4">
            <div className="flex items-center gap-2 mb-2">
              <Fuel className="w-4 h-4 text-muted-foreground" />
              <p className="text-xs text-muted-foreground">Est. Fuel</p>
            </div>
            <p className="text-lg font-bold">{formatCurrency((load as any).estimatedFuel)}</p>
          </div>
        )}
        {load.notes && (
          <div className="rounded-xl border border-border bg-card p-4 col-span-2">
            <p className="text-xs text-muted-foreground mb-1">Notes</p>
            <p className="text-sm">{load.notes}</p>
          </div>
        )}
      </div>

      {/* Action Buttons */}
      {canAccept && (
        <div className="space-y-3">
          <div className="rounded-xl border border-blue-500/30 bg-blue-500/10 p-4">
            <p className="text-sm font-medium text-blue-300 mb-1">Load assigned to you</p>
            <p className="text-xs text-muted-foreground">
              Review the details above and accept or reject this load.
            </p>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <Button
              className="bg-green-600 hover:bg-green-700 text-white h-12"
              onClick={() => acceptMutation.mutate({ loadId: load.id })}
              disabled={acceptMutation.isPending}
            >
              {acceptMutation.isPending ? (
                <Loader2 className="w-4 h-4 animate-spin" />
              ) : (
                <>
                  <CheckCircle2 className="w-4 h-4 mr-2" />
                  Accept Load
                </>
              )}
            </Button>
            <Button
              variant="destructive"
              className="h-12"
              onClick={() => setShowRejectModal(true)}
            >
              <X className="w-4 h-4 mr-2" />
              Reject
            </Button>
          </div>
        </div>
      )}

      {canDeliver && (
        <Button
          className="w-full h-12 bg-green-600 hover:bg-green-700 text-white"
          onClick={() => setShowDeliveryModal(true)}
        >
          <CheckCircle2 className="w-5 h-5 mr-2" />
          Confirm Delivery
        </Button>
      )}

      {isCompleted && (
        <div className="rounded-xl border border-green-500/30 bg-green-500/10 p-4 text-center">
          <CheckCircle2 className="w-8 h-8 text-green-400 mx-auto mb-2" />
          <p className="text-sm font-medium text-green-300">Load Completed</p>
          <p className="text-xs text-muted-foreground mt-1">
            This load has been delivered and is being processed.
          </p>
        </div>
      )}

      {/* Evidence Collection Section */}
      <div className="rounded-xl border border-border bg-card overflow-hidden">
        <button
          className="w-full flex items-center justify-between p-4 hover:bg-muted/30 transition-colors"
          onClick={() => setShowEvidenceSection(!showEvidenceSection)}
        >
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 rounded-lg bg-primary/15 flex items-center justify-center">
              <Shield className="w-4 h-4 text-primary" />
            </div>
            <div className="text-left">
              <p className="text-sm font-semibold">Evidence & Documentation</p>
              <p className="text-xs text-muted-foreground">
                {totalEvidence} file{totalEvidence !== 1 ? "s" : ""} uploaded • Dispute protection
              </p>
            </div>
          </div>
          {showEvidenceSection ? (
            <ChevronUp className="w-4 h-4 text-muted-foreground" />
          ) : (
            <ChevronDown className="w-4 h-4 text-muted-foreground" />
          )}
        </button>

        {showEvidenceSection && (
          <div className="px-4 pb-4 space-y-4">
            {/* Upload Button */}
            <Button
              className="w-full gap-2"
              variant="outline"
              onClick={() => setShowEvidenceModal(true)}
            >
              <Camera className="w-4 h-4" />
              Add Evidence / Photo
            </Button>

            {/* Evidence by Type */}
            {EVIDENCE_TYPES.map((type) => {
              const items = evidenceByType[type.value] || [];
              if (items.length === 0) return null;
              const TypeIcon = type.icon;
              return (
                <div key={type.value}>
                  <div className="flex items-center gap-2 mb-2">
                    <TypeIcon className="w-3.5 h-3.5 text-muted-foreground" />
                    <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide">
                      {type.label} ({items.length})
                    </p>
                  </div>
                  <div className="grid grid-cols-3 gap-2">
                    {items.map((item: any) => (
                      <div
                        key={item.id}
                        className="relative aspect-square rounded-lg overflow-hidden border border-border bg-muted/30 cursor-pointer hover:border-primary/50 transition-colors"
                        onClick={() => setPreviewImage(item.fileUrl)}
                      >
                        {item.mimeType?.startsWith("image/") ? (
                          <img
                            src={item.fileUrl}
                            alt={item.caption || item.fileName}
                            className="w-full h-full object-cover"
                          />
                        ) : (
                          <div className="w-full h-full flex flex-col items-center justify-center p-2">
                            <FileText className="w-6 h-6 text-muted-foreground mb-1" />
                            <p className="text-xs text-muted-foreground text-center truncate w-full">
                              {item.fileName}
                            </p>
                          </div>
                        )}
                        <div className="absolute bottom-0 left-0 right-0 bg-black/60 px-1.5 py-0.5">
                          <p className="text-xs text-white/80 truncate">
                            {formatDateTime(item.uploadedAt)}
                          </p>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              );
            })}

            {totalEvidence === 0 && (
              <div className="text-center py-6 text-muted-foreground">
                <Camera className="w-8 h-8 mx-auto mb-2 opacity-40" />
                <p className="text-sm">No evidence uploaded yet</p>
                <p className="text-xs mt-1">
                  Upload photos and documents to protect against disputes
                </p>
              </div>
            )}

            {/* Evidence Guide */}
            <div className="rounded-lg bg-muted/30 p-3">
              <p className="text-xs font-medium text-foreground mb-2">Evidence Checklist</p>
              <div className="space-y-1.5">
                {[
                  { type: "pickup_photo", label: "Pickup photo (cargo loaded)" },
                  { type: "bol_scan", label: "BOL signed by shipper" },
                  { type: "delivery_photo", label: "Delivery photo (cargo unloaded)" },
                ].map((item) => {
                  const uploaded = (evidenceByType[item.type] || []).length > 0;
                  return (
                    <div key={item.type} className="flex items-center gap-2">
                      <div className={`w-4 h-4 rounded-full flex items-center justify-center flex-shrink-0 ${
                        uploaded ? "bg-green-500/20" : "bg-muted"
                      }`}>
                        {uploaded ? (
                          <CheckCircle2 className="w-3 h-3 text-green-400" />
                        ) : (
                          <div className="w-2 h-2 rounded-full bg-muted-foreground/40" />
                        )}
                      </div>
                      <p className={`text-xs ${uploaded ? "text-green-400 line-through" : "text-muted-foreground"}`}>
                        {item.label}
                      </p>
                    </div>
                  );
                })}
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Reject Modal */}
      <Dialog open={showRejectModal} onOpenChange={setShowRejectModal}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Reject Load</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-2">
            <p className="text-sm text-muted-foreground">
              Please provide a reason for rejecting this load. This will be sent to dispatch.
            </p>
            <div>
              <Label>Reason</Label>
              <Textarea
                value={rejectReason}
                onChange={(e) => setRejectReason(e.target.value)}
                placeholder="e.g., Vehicle unavailable, route conflict..."
                className="mt-1.5"
                rows={3}
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowRejectModal(false)}>
              Cancel
            </Button>
            <Button
              variant="destructive"
              disabled={!rejectReason.trim() || rejectMutation.isPending}
              onClick={() => rejectMutation.mutate({ loadId: load.id, reason: rejectReason })}
            >
              {rejectMutation.isPending ? <Loader2 className="w-4 h-4 animate-spin" /> : "Reject Load"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Delivery Confirmation Modal */}
      <Dialog open={showDeliveryModal} onOpenChange={setShowDeliveryModal}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Confirm Delivery</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-2">
            <div className="rounded-lg bg-green-500/10 border border-green-500/30 p-3">
              <p className="text-sm text-green-300 font-medium">
                Confirm delivery for: {load.clientName}
              </p>
              <p className="text-xs text-muted-foreground mt-1">
                {load.deliveryAddress}
              </p>
            </div>
            <div>
              <Label>Delivery Notes (optional)</Label>
              <Textarea
                value={deliveryNotes}
                onChange={(e) => setDeliveryNotes(e.target.value)}
                placeholder="Any notes about the delivery..."
                className="mt-1.5"
                rows={3}
              />
            </div>
            {(evidenceByType["delivery_photo"] || []).length === 0 && (
              <div className="rounded-lg bg-amber-500/10 border border-amber-500/30 p-3">
                <div className="flex items-start gap-2">
                  <AlertTriangle className="w-4 h-4 text-amber-400 flex-shrink-0 mt-0.5" />
                  <p className="text-xs text-amber-300">
                    No delivery photo uploaded. We recommend uploading a delivery photo before confirming.
                  </p>
                </div>
              </div>
            )}
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowDeliveryModal(false)}>
              Cancel
            </Button>
            <Button
              className="bg-green-600 hover:bg-green-700"
              disabled={deliverMutation.isPending}
              onClick={() => deliverMutation.mutate({ loadId: load.id, notes: deliveryNotes || undefined })}
            >
              {deliverMutation.isPending ? (
                <Loader2 className="w-4 h-4 animate-spin" />
              ) : (
                <>
                  <CheckCircle2 className="w-4 h-4 mr-2" />
                  Confirm Delivery
                </>
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Upload Evidence Modal */}
      <Dialog open={showEvidenceModal} onOpenChange={setShowEvidenceModal}>
        <DialogContent className="max-w-sm">
          <DialogHeader>
            <DialogTitle>Add Evidence</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-2">
            {/* Evidence Type Selection */}
            <div>
              <Label className="mb-2 block">Evidence Type</Label>
              <div className="grid grid-cols-2 gap-2">
                {EVIDENCE_TYPES.map((type) => {
                  const TypeIcon = type.icon;
                  return (
                    <button
                      key={type.value}
                      className={`flex items-center gap-2 p-2.5 rounded-lg border text-left transition-colors ${
                        selectedEvidenceType === type.value
                          ? "border-primary bg-primary/10 text-primary"
                          : "border-border hover:border-primary/50"
                      }`}
                      onClick={() => setSelectedEvidenceType(type.value)}
                    >
                      <TypeIcon className="w-4 h-4 flex-shrink-0" />
                      <span className="text-xs font-medium">{type.label}</span>
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Caption */}
            <div>
              <Label>Caption (optional)</Label>
              <Input
                value={evidenceCaption}
                onChange={(e) => setEvidenceCaption(e.target.value)}
                placeholder="Describe this evidence..."
                className="mt-1.5"
              />
            </div>

            {/* File Upload */}
            <div>
              <input
                ref={fileInputRef}
                type="file"
                accept="image/jpeg,image/png,image/webp,application/pdf"
                className="hidden"
                onChange={(e) => {
                  const file = e.target.files?.[0];
                  if (file) handleFileUpload(file);
                }}
                capture="environment"
              />
              <Button
                className="w-full gap-2"
                variant="outline"
                onClick={() => fileInputRef.current?.click()}
                disabled={isUploading || uploadEvidenceMutation.isPending}
              >
                {isUploading || uploadEvidenceMutation.isPending ? (
                  <Loader2 className="w-4 h-4 animate-spin" />
                ) : (
                  <>
                    <Camera className="w-4 h-4" />
                    Take Photo / Choose File
                  </>
                )}
              </Button>
              <p className="text-xs text-muted-foreground mt-1.5 text-center">
                JPG, PNG, WebP, or PDF • Max 10MB
              </p>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowEvidenceModal(false)}>
              Cancel
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Image Preview Modal */}
      {previewImage && (
        <div
          className="fixed inset-0 z-50 bg-black/90 flex items-center justify-center p-4"
          onClick={() => setPreviewImage(null)}
        >
          <button
            className="absolute top-4 right-4 w-10 h-10 rounded-full bg-white/10 flex items-center justify-center"
            onClick={() => setPreviewImage(null)}
          >
            <X className="w-5 h-5 text-white" />
          </button>
          <img
            src={previewImage}
            alt="Evidence preview"
            className="max-w-full max-h-full object-contain rounded-lg"
            onClick={(e) => e.stopPropagation()}
          />
        </div>
      )}
    </div>
  );
}
