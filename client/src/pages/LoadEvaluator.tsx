import { TrendingUp } from "lucide-react";
import { useLoadEvaluatorForm } from "@/hooks/useLoadEvaluatorForm";
import { LoadEvaluatorFormComponent, LoadEvaluatorEmptyState } from "@/components/LoadEvaluatorForm";
import { LoadEvaluatorResults } from "@/components/LoadEvaluatorResults";

export default function LoadEvaluator() {
  const { form, handleChange, resetForm, handleSave, evaluation, canEvaluate, isSaving } =
    useLoadEvaluatorForm();

  return (
    <div className="container mx-auto py-8 space-y-6">
      <div>
        <h1 className="text-3xl font-bold flex items-center gap-2">
          <TrendingUp className="w-8 h-8" />
          Evaluador de Cargas
        </h1>
        <p className="text-muted-foreground mt-2">
          Analiza la rentabilidad de cada carga basándote en tu configuración de costos
        </p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Left column: Input form */}
        <div className="lg:col-span-2">
          <LoadEvaluatorFormComponent
            form={form}
            onFormChange={handleChange}
            onReset={resetForm}
            onSave={handleSave}
            isSaving={isSaving}
            canSave={!!(canEvaluate && form.clientName && form.origin && form.destination)}
          />
        </div>

        {/* Right column: Results */}
        <div>
          {canEvaluate && evaluation ? (
            <LoadEvaluatorResults result={evaluation} form={form} />
          ) : (
            <LoadEvaluatorEmptyState />
          )}
        </div>
      </div>
    </div>
  );
}
