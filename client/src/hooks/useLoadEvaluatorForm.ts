import { useState, useCallback, useMemo } from "react";
import { trpc } from "@/lib/trpc";
import { toast } from "sonner";

export interface LoadEvaluatorFormData {
  brokerName: string;
  clientName: string;
  origin: string;
  destination: string;
  offeredPrice: string;
  loadedMiles: string;
  deadheadMiles: string;
  weightLbs: string;
  pickupDate: string;
  deliveryDate: string;
  notes: string;
}

const INITIAL_FORM: LoadEvaluatorFormData = {
  brokerName: "",
  clientName: "",
  origin: "",
  destination: "",
  offeredPrice: "",
  loadedMiles: "",
  deadheadMiles: "0",
  weightLbs: "0",
  pickupDate: "",
  deliveryDate: "",
  notes: "",
};

export function useLoadEvaluatorForm() {
  const [form, setForm] = useState<LoadEvaluatorFormData>(INITIAL_FORM);

  // Memoize parsed values to prevent infinite query triggers
  const parsedValues = useMemo(
    () => ({
      offeredPrice: parseFloat(form.offeredPrice) || 0,
      loadedMiles: parseFloat(form.loadedMiles) || 0,
      deadheadMiles: parseFloat(form.deadheadMiles) || 0,
      weightLbs: parseFloat(form.weightLbs) || 0,
    }),
    [form.offeredPrice, form.loadedMiles, form.deadheadMiles, form.weightLbs]
  );

  // Check if we can evaluate
  const canEvaluate = useMemo(
    () => parsedValues.offeredPrice > 0 && parsedValues.loadedMiles > 0,
    [parsedValues.offeredPrice, parsedValues.loadedMiles]
  );

  // Evaluate load with real-time query
  const evaluateQuery = trpc.loadEvaluator.evaluate.useQuery(
    {
      brokerName: form.brokerName,
      clientName: form.clientName,
      origin: form.origin,
      destination: form.destination,
      offeredPrice: parsedValues.offeredPrice,
      loadedMiles: parsedValues.loadedMiles,
      deadheadMiles: parsedValues.deadheadMiles,
      weightLbs: parsedValues.weightLbs,
      pickupDate: form.pickupDate,
      deliveryDate: form.deliveryDate,
      notes: form.notes,
    },
    {
      enabled: canEvaluate,
    }
  );

  // Save evaluated load
  const saveMutation = trpc.loadEvaluator.save.useMutation({
    onSuccess: () => {
      toast.success("Carga guardada correctamente");
      resetForm();
    },
    onError: (error) => toast.error(error.message),
  });

  // Handle form field changes
  const handleChange = useCallback((key: keyof LoadEvaluatorFormData, value: string) => {
    setForm((prev) => ({ ...prev, [key]: value }));
  }, []);

  // Reset form to initial state
  const resetForm = useCallback(() => {
    setForm(INITIAL_FORM);
  }, []);

  // Save the current evaluation
  const handleSave = useCallback(async () => {
    if (!form.clientName || !form.origin || !form.destination) {
      toast.error("Completa cliente, origen y destino");
      return;
    }

    await saveMutation.mutateAsync({
      brokerName: form.brokerName,
      clientName: form.clientName,
      origin: form.origin,
      destination: form.destination,
      offeredPrice: parsedValues.offeredPrice,
      loadedMiles: parsedValues.loadedMiles,
      deadheadMiles: parsedValues.deadheadMiles,
      weightLbs: parsedValues.weightLbs,
      pickupDate: form.pickupDate,
      deliveryDate: form.deliveryDate,
      notes: form.notes,
    });
  }, [form, parsedValues, saveMutation]);

  return {
    form,
    handleChange,
    resetForm,
    handleSave,
    evaluation: evaluateQuery.data,
    isEvaluating: evaluateQuery.isLoading,
    canEvaluate,
    isSaving: saveMutation.isPending,
  };
}
