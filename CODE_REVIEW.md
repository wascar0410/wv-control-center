# Revisión de Código: Componente Quotation

## Análisis General

El componente `Quotation` está bien estructurado y sigue buenas prácticas de React. A continuación se detallan los puntos fuertes y áreas de mejora.

---

## ✅ Puntos Fuertes

### 1. **Separación de Responsabilidades**
El componente delega cálculos a funciones puras (`formatCurrency`, `formatMiles`, `getVerdictStyle`, `getRecommendation`), lo que facilita testing y mantenimiento.

### 2. **Manejo de Estado Limpio**
Usa `useState` de manera clara para `result`, `showCreateLoadModal`, `formDataForLoad` y `dismissedAlerts`. El estado es predecible y fácil de seguir.

### 3. **Optimización con useMemo**
Implementa `useMemo` para `visibleAlerts`, `summaryCards` y `recommendation`, evitando recálculos innecesarios en cada render.

### 4. **Manejo de Errores**
Captura errores en la mutación tRPC y muestra notificaciones al usuario con `toast.error()`.

### 5. **Diseño Responsivo**
Usa Tailwind CSS con breakpoints (`md:`, `lg:`, `xl:`) para adaptar el layout a diferentes pantallas.

### 6. **Accesibilidad Básica**
Incluye iconos descriptivos y texto alternativo en badges y botones.

---

## ⚠️ Áreas de Mejora

### 1. **Lógica de Veredicto Frágil**
```typescript
// ❌ Actual: Busca strings en el veredicto
if (v.includes("accept") || v.includes("acept") || v.includes("good") || ...)
```

**Mejora:** Usar enum o constantes para veredictos:
```typescript
enum VerdictType {
  ACCEPT = "ACCEPT",
  NEGOTIATE = "NEGOTIATE",
  REJECT = "REJECT",
}

function getVerdictStyle(verdict: VerdictType) {
  const styles: Record<VerdictType, string> = {
    [VerdictType.ACCEPT]: "bg-green-100 ...",
    [VerdictType.NEGOTIATE]: "bg-yellow-100 ...",
    [VerdictType.REJECT]: "bg-red-100 ...",
  };
  return styles[verdict];
}
```

### 2. **Tipado Incompleto**
El tipo `QuotationResult` incluye propiedades opcionales (`?`) que pueden ser `undefined`. Esto puede causar errores en tiempo de ejecución.

**Mejora:** Usar tipos más estrictos o proporcionar valores por defecto:
```typescript
interface QuotationResult {
  // ... propiedades requeridas
  minimumIncome: number; // No opcional
  ratePerLoadedMile: number;
  differenceVsMinimum: number;
}
```

### 3. **Funciones de Formato No Manejan Casos Extremos**
```typescript
// ❌ Si value es 0, devuelve "$0.00" (correcto, pero no diferencia de null)
function formatCurrency(value: number | undefined) {
  if (value == null || Number.isNaN(value)) return "$0.00";
  // ...
}
```

**Mejora:** Ser explícito con valores por defecto:
```typescript
function formatCurrency(value: number | undefined, defaultValue = "$0.00") {
  if (value == null || Number.isNaN(value)) return defaultValue;
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD",
    maximumFractionDigits: 2,
  }).format(value);
}
```

### 4. **Recomendación Basada en Números Mágicos**
```typescript
// ❌ Números hardcodeados
if (profit > 0 && margin >= 15 && !verdict.includes("reject")) {
  // ACEPTAR
}
if (profit > 0 && margin >= 8) {
  // NEGOCIAR
}
```

**Mejora:** Extraer a constantes:
```typescript
const RECOMMENDATION_THRESHOLDS = {
  ACCEPT_MIN_MARGIN: 15,
  NEGOTIATE_MIN_MARGIN: 8,
  MIN_PROFIT: 0,
};

function getRecommendation(result: QuotationResult | null) {
  if (!result) return DEFAULT_RECOMMENDATION;
  
  const { estimatedProfit, profitMarginPercent, verdict } = result;
  
  if (
    estimatedProfit > RECOMMENDATION_THRESHOLDS.MIN_PROFIT &&
    profitMarginPercent >= RECOMMENDATION_THRESHOLDS.ACCEPT_MIN_MARGIN &&
    !verdict.toLowerCase().includes("reject")
  ) {
    return ACCEPT_RECOMMENDATION;
  }
  // ...
}
```

### 5. **Falta de Validación de Datos**
No hay validación de que `formDataForLoad` sea válido antes de usarlo en `CreateLoadModal`.

**Mejora:** Agregar validación:
```typescript
const isFormDataValid = (data: QuotationFormData | null): data is QuotationFormData => {
  return data !== null && 
         data.pickupAddress && 
         data.deliveryAddress && 
         data.weight > 0;
};

// En el render:
{result && isFormDataValid(formDataForLoad) && (
  <CreateLoadModal {...} />
)}
```

### 6. **Sin Persistencia de Estado**
Si el usuario recarga la página, los resultados de la cotización se pierden.

**Mejora:** Guardar en localStorage o URL:
```typescript
useEffect(() => {
  if (result) {
    localStorage.setItem("lastQuotation", JSON.stringify(result));
  }
}, [result]);

useEffect(() => {
  const saved = localStorage.getItem("lastQuotation");
  if (saved) {
    try {
      setResult(JSON.parse(saved));
    } catch (e) {
      console.error("Error loading saved quotation", e);
    }
  }
}, []);
```

### 7. **Accesibilidad Mejorable**
Los badges y alertas no tienen suficiente contraste en modo claro. Las etiquetas de iconos podrían ser más descriptivas.

**Mejora:** Agregar aria-labels:
```typescript
<span
  className={`rounded-full border px-3 py-1 text-xs font-semibold ${getVerdictStyle(result.verdict)}`}
  role="status"
  aria-label={`Veredicto: ${result.verdict}`}
>
  {result.verdict}
</span>
```

---

## 📋 Recomendaciones de Refactorización

### Opción 1: Extraer Lógica a Custom Hook
```typescript
function useQuotationLogic() {
  const [result, setResult] = useState<QuotationResult | null>(null);
  const [showCreateLoadModal, setShowCreateLoadModal] = useState(false);
  const [formDataForLoad, setFormDataForLoad] = useState<QuotationFormData | null>(null);
  const [dismissedAlerts, setDismissedAlerts] = useState<number[]>([]);

  const calculateQuotation = trpc.quotation.calculateQuotation.useMutation({
    onSuccess: (data) => setResult(data),
    onError: (error) => toast.error(error.message),
  });

  return {
    result,
    setResult,
    showCreateLoadModal,
    setShowCreateLoadModal,
    formDataForLoad,
    setFormDataForLoad,
    dismissedAlerts,
    setDismissedAlerts,
    calculateQuotation,
  };
}
```

### Opción 2: Crear Componentes Separados
- `QuotationForm` (ya existe)
- `QuotationResults` (nuevo)
- `RecommendationCard` (nuevo)
- `SummaryCards` (nuevo)

---

## 🧪 Testing

Agregar tests para funciones puras:

```typescript
describe("Quotation utilities", () => {
  describe("formatCurrency", () => {
    it("should format positive numbers", () => {
      expect(formatCurrency(100.5)).toBe("$100.50");
    });
    it("should handle undefined", () => {
      expect(formatCurrency(undefined)).toBe("$0.00");
    });
  });

  describe("getRecommendation", () => {
    it("should return ACCEPT for profitable loads", () => {
      const result = getRecommendation({
        estimatedProfit: 500,
        profitMarginPercent: 20,
        verdict: "ACCEPT",
      });
      expect(result.status).toBe("ACEPTAR");
    });
  });
});
```

---

## 📊 Resumen de Mejoras

| Aspecto | Actual | Mejora |
|--------|--------|--------|
| Veredictos | Strings con includes() | Enum tipado |
| Números mágicos | Hardcodeados | Constantes |
| Validación | Mínima | Completa con tipos |
| Persistencia | No existe | localStorage |
| Accesibilidad | Básica | WCAG AA compliant |
| Testing | No visible | Tests unitarios |

---

## Conclusión

El código es **sólido y funcional**, pero puede mejorarse en **tipado, validación y mantenibilidad**. Las recomendaciones anteriores harán el código más robusto, testeable y fácil de mantener.
