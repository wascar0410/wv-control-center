import { useState } from "react";
import { Download, FileText, Sheet } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
  DropdownMenuSeparator,
} from "@/components/ui/dropdown-menu";


export interface ExportButtonProps {
  onExportPDF?: () => Promise<void>;
  onExportExcel?: () => Promise<void>;
  label?: string;
  disabled?: boolean;
}

export function ExportButton({
  onExportPDF,
  onExportExcel,
  label = "Exportar",
  disabled = false,
}: ExportButtonProps) {
  const [isLoading, setIsLoading] = useState(false);
  // Toast notifications handled via console for now

  const handleExport = async (
    exportFn: (() => Promise<void>) | undefined,
    format: string
  ) => {
    if (!exportFn) return;

    setIsLoading(true);
    try {
      await exportFn();
      console.log(`Successfully exported to ${format}`);
    } catch (error) {
      console.error(`Error exporting to ${format}:`, error);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button
          variant="outline"
          size="sm"
          disabled={disabled || isLoading}
          className="gap-2"
        >
          <Download className="w-4 h-4" />
          {label}
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end">
        {onExportPDF && (
          <DropdownMenuItem
            onClick={() => handleExport(onExportPDF, "PDF")}
            disabled={isLoading}
          >
            <FileText className="w-4 h-4 mr-2" />
            Exportar a PDF
          </DropdownMenuItem>
        )}
        {onExportExcel && (
          <DropdownMenuItem
            onClick={() => handleExport(onExportExcel, "Excel")}
            disabled={isLoading}
          >
            <Sheet className="w-4 h-4 mr-2" />
            Exportar a Excel
          </DropdownMenuItem>
        )}
        {onExportPDF && onExportExcel && <DropdownMenuSeparator />}
        {onExportPDF && onExportExcel && (
          <DropdownMenuItem
            onClick={() => {
              handleExport(onExportPDF, "PDF");
              setTimeout(() => handleExport(onExportExcel, "Excel"), 500);
            }}
            disabled={isLoading}
          >
            <Download className="w-4 h-4 mr-2" />
            Exportar Ambos
          </DropdownMenuItem>
        )}
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
