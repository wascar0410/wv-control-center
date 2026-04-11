/**
 * DispatchDetailDrawer.tsx
 * Simple right-side drawer with load details
 */

import { useLocation } from "wouter";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { MapPin, DollarSign, Truck, ChevronDown, ExternalLink } from "lucide-react";
import {
  formatMargin,
  formatProfit,
  formatRate,
  getStatusColor,
  getFinancialStatusColor,
} from "@/utils/dispatchHelpers";

interface DispatchDetailDrawerProps {
  load: any | null;
  isOpen: boolean;
  onClose: () => void;
  onAssign: (loadId: number) => void;
  onReassign: (loadId: number) => void;
}

export default function DispatchDetailDrawer({
  load,
  isOpen,
  onClose,
  onAssign,
  onReassign,
}: DispatchDetailDrawerProps) {
  const [, navigate] = useLocation();

  if (!load) return null;

  const snapshot = load.financialSnapshot || {
    margin: 0,
    profit: 0,
    ratePerMile: 0,
    status: "loss",
  };

  const statusColor = getStatusColor(load.status);
  const financialStatusColor = getFinancialStatusColor(snapshot.status);

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-md max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Load #{load.id}</DialogTitle>
        </DialogHeader>

        <div className="space-y-4">
          {/* Overview Section */}
          <div>
            <h3 className="font-semibold text-sm mb-3">Overview</h3>
            <div className="space-y-2 text-sm">
              <div className="flex justify-between">
                <span className="text-muted-foreground">Client:</span>
                <span className="font-semibold">{load.clientName}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-muted-foreground">Status:</span>
                <Badge className={statusColor}>{load.status}</Badge>
              </div>
              <div className="flex items-start gap-2">
                <span className="text-muted-foreground">Pickup:</span>
                <span className="text-right flex-1">{load.pickupAddress}</span>
              </div>
              <div className="flex items-start gap-2">
                <span className="text-muted-foreground">Delivery:</span>
                <span className="text-right flex-1">{load.deliveryAddress}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-muted-foreground">Weight:</span>
                <span>{load.weight} lbs</span>
              </div>
              <div className="flex justify-between">
                <span className="text-muted-foreground">Merchandise:</span>
                <span>{load.merchandiseType}</span>
              </div>
            </div>
          </div>

          <Separator />

          {/* Financial Section */}
          <div>
            <h3 className="font-semibold text-sm mb-3">Financial</h3>
            <div className="space-y-2 text-sm">
              <div className="flex justify-between">
                <span className="text-muted-foreground">Total Price:</span>
                <span className="font-semibold">${load.totalPrice?.toFixed(2)}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-muted-foreground">Margin:</span>
                <span className="font-semibold text-blue-400">{formatMargin(snapshot.margin)}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-muted-foreground">Profit:</span>
                <span className="font-semibold">{formatProfit(snapshot.profit)}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-muted-foreground">Rate/Mile:</span>
                <span className="font-semibold">{formatRate(snapshot.ratePerMile)}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-muted-foreground">Status:</span>
                <Badge className={financialStatusColor}>{snapshot.status}</Badge>
              </div>
            </div>
          </div>

          <Separator />

          {/* Assignment Section */}
          <div>
            <h3 className="font-semibold text-sm mb-3">Assignment</h3>
            <div className="space-y-2 text-sm">
              <div className="flex justify-between">
                <span className="text-muted-foreground">Driver ID:</span>
                <span>{load.assignedDriverId || "Unassigned"}</span>
              </div>
              {load.createdAt && (
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Created:</span>
                  <span>{new Date(load.createdAt).toLocaleDateString()}</span>
                </div>
              )}
            </div>
          </div>

          <Separator />

          {/* Actions Section */}
          <div className="flex gap-2">
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button className="flex-1">
                  Assign <ChevronDown className="w-4 h-4 ml-1" />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="center" className="w-40">
                <DropdownMenuItem onClick={() => onAssign(load.id)}>
                  Assign to Driver
                </DropdownMenuItem>
                {load.assignedDriverId && (
                  <DropdownMenuItem onClick={() => onReassign(load.id)}>
                    Reassign
                  </DropdownMenuItem>
                )}
              </DropdownMenuContent>
            </DropdownMenu>

            <Button
              variant="outline"
              className="flex-1"
              onClick={() => {
                navigate(`/loads/${load.id}`);
                onClose();
              }}
            >
              <ExternalLink className="w-4 h-4 mr-1" />
              Full Detail
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
