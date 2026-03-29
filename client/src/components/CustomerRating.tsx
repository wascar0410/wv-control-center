import React, { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Star, AlertCircle, ThumbsUp, ThumbsDown } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { toast } from 'sonner';

interface CustomerRating {
  id: string;
  clientName: string;
  date: string;
  rating: number;
  comment: string;
  issues?: string[];
}

interface RatingPrompt {
  clientName: string;
  loadId: string;
  deliveryDate: string;
}

export function CustomerRating() {
  const [showRatingDialog, setShowRatingDialog] = useState(false);
  const [selectedRating, setSelectedRating] = useState<number>(0);
  const [comment, setComment] = useState('');
  const [issues, setIssues] = useState<string[]>([]);
  const [currentPrompt, setCurrentPrompt] = useState<RatingPrompt | null>(null);

  // Mock pending ratings
  const pendingRatings: RatingPrompt[] = [
    {
      clientName: 'ABC Logistics',
      loadId: 'LOAD-001',
      deliveryDate: '2026-03-28',
    },
    {
      clientName: 'XYZ Shipping',
      loadId: 'LOAD-002',
      deliveryDate: '2026-03-27',
    },
  ];

  // Mock rating history
  const ratingHistory: CustomerRating[] = [
    {
      id: 'RATING-001',
      clientName: 'FastFreight',
      date: '2026-03-26',
      rating: 5,
      comment: 'Excelente comunicación y entrega a tiempo',
      issues: [],
    },
    {
      id: 'RATING-002',
      clientName: 'Global Transport',
      date: '2026-03-25',
      rating: 3,
      comment: 'Entrega completada pero con retraso',
      issues: ['Retraso', 'Comunicación lenta'],
    },
    {
      id: 'RATING-003',
      clientName: 'Premium Cargo',
      date: '2026-03-24',
      rating: 4,
      comment: 'Buena entrega, cliente amable',
      issues: [],
    },
  ];

  const issueOptions = [
    'Retraso',
    'Comunicación lenta',
    'Instrucciones confusas',
    'Problema con carga',
    'Cliente difícil',
    'Ubicación difícil',
    'Otro',
  ];

  const handleOpenRating = (prompt: RatingPrompt) => {
    setCurrentPrompt(prompt);
    setSelectedRating(0);
    setComment('');
    setIssues([]);
    setShowRatingDialog(true);
  };

  const handleToggleIssue = (issue: string) => {
    setIssues((prev) =>
      prev.includes(issue) ? prev.filter((i) => i !== issue) : [...prev, issue]
    );
  };

  const handleSubmitRating = () => {
    if (selectedRating === 0) {
      toast.error('Por favor selecciona una calificación');
      return;
    }

    console.log('Submitting rating:', {
      client: currentPrompt?.clientName,
      rating: selectedRating,
      comment,
      issues,
    });

    toast.success(`Calificación enviada para ${currentPrompt?.clientName}`);
    setShowRatingDialog(false);
  };

  const getRatingColor = (rating: number) => {
    if (rating >= 4) return 'text-green-600';
    if (rating >= 3) return 'text-yellow-600';
    return 'text-red-600';
  };

  const getAverageRating = (): number => {
    if (ratingHistory.length === 0) return 0;
    return parseFloat(
      (
        ratingHistory.reduce((sum, r) => sum + r.rating, 0) / ratingHistory.length
      ).toFixed(1)
    );
  };

  return (
    <div className="space-y-6">
      {/* Stats */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              Calificación Promedio
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex items-center gap-2">
              <p className="text-2xl font-bold">{getAverageRating().toFixed(1)}/5.0</p>
              <div className="flex gap-1">
                {[...Array(5)].map((_, i) => (
                  <Star
                    key={i}
                    className={`w-4 h-4 ${
                      i < Math.round(getAverageRating())
                        ? 'fill-yellow-400 text-yellow-400'
                        : 'text-gray-300'
                    }`}
                  />
                ))}
              </div>
            </div>
            <p className="text-xs text-muted-foreground mt-1">
              Basado en {ratingHistory.length} calificaciones
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              Calificaciones Positivas
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-2xl font-bold text-green-600">
              {ratingHistory.filter((r) => r.rating >= 4).length}
            </p>
            <p className="text-xs text-muted-foreground mt-1">
              {Math.round(
                (ratingHistory.filter((r) => r.rating >= 4).length / ratingHistory.length) * 100
              )}% de todas las calificaciones
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              Pendientes de Calificar
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-2xl font-bold text-orange-600">{pendingRatings.length}</p>
            <p className="text-xs text-muted-foreground mt-1">
              Entregas completadas sin calificar
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Pending Ratings */}
      {pendingRatings.length > 0 && (
        <Card className="border-orange-200 bg-orange-50">
          <CardHeader>
            <CardTitle className="text-orange-900">Pendientes de Calificar</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            {pendingRatings.map((prompt) => (
              <div
                key={prompt.loadId}
                className="flex items-center justify-between p-3 bg-white rounded border"
              >
                <div>
                  <p className="font-medium">{prompt.clientName}</p>
                  <p className="text-sm text-muted-foreground">
                    Entregado el {prompt.deliveryDate}
                  </p>
                </div>
                <Button
                  size="sm"
                  onClick={() => handleOpenRating(prompt)}
                >
                  Calificar
                </Button>
              </div>
            ))}
          </CardContent>
        </Card>
      )}

      {/* Rating History */}
      <Card>
        <CardHeader>
          <CardTitle>Historial de Calificaciones</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {ratingHistory.map((rating) => (
              <div key={rating.id} className="border rounded-lg p-4 space-y-2">
                <div className="flex items-start justify-between">
                  <div>
                    <p className="font-semibold">{rating.clientName}</p>
                    <p className="text-sm text-muted-foreground">{rating.date}</p>
                  </div>
                  <div className="flex gap-1">
                    {[...Array(5)].map((_, i) => (
                      <Star
                        key={i}
                        className={`w-4 h-4 ${
                          i < rating.rating
                            ? 'fill-yellow-400 text-yellow-400'
                            : 'text-gray-300'
                        }`}
                      />
                    ))}
                  </div>
                </div>

                {rating.comment && (
                  <p className="text-sm text-gray-700 italic">"{rating.comment}"</p>
                )}

                {rating.issues && rating.issues.length > 0 && (
                  <div className="flex flex-wrap gap-2 pt-2">
                    {rating.issues && rating.issues.map((issue: string) => (
                      <Badge key={issue} variant="secondary" className="text-xs">
                        <AlertCircle className="w-3 h-3 mr-1" />
                        {issue}
                      </Badge>
                    ))}
                  </div>
                )}

                {rating.rating >= 4 && (
                  <div className="flex items-center gap-2 text-green-600 text-sm pt-2">
                    <ThumbsUp className="w-4 h-4" />
                    Calificación positiva
                  </div>
                )}
                {rating.rating < 3 && (
                  <div className="flex items-center gap-2 text-red-600 text-sm pt-2">
                    <ThumbsDown className="w-4 h-4" />
                    Calificación baja
                  </div>
                )}
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* Rating Dialog */}
      <Dialog open={showRatingDialog} onOpenChange={setShowRatingDialog}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Calificar a {currentPrompt?.clientName}</DialogTitle>
          </DialogHeader>

          <div className="space-y-4">
            {/* Star Rating */}
            <div>
              <p className="text-sm font-medium mb-3">¿Cómo fue tu experiencia?</p>
              <div className="flex gap-3 justify-center">
                {[1, 2, 3, 4, 5].map((star) => (
                  <button
                    key={star}
                    onClick={() => setSelectedRating(star)}
                    className="transition-transform hover:scale-110"
                  >
                    <Star
                      className={`w-8 h-8 ${
                        star <= selectedRating
                          ? 'fill-yellow-400 text-yellow-400'
                          : 'text-gray-300'
                      }`}
                    />
                  </button>
                ))}
              </div>
            </div>

            {/* Issues */}
            <div>
              <p className="text-sm font-medium mb-2">¿Hubo algún problema? (Opcional)</p>
              <div className="flex flex-wrap gap-2">
                {issueOptions.map((issue) => (
                  <button
                    key={issue}
                    onClick={() => handleToggleIssue(issue)}
                    className={`px-3 py-1 rounded-full text-sm transition ${
                      issues.includes(issue)
                        ? 'bg-red-100 text-red-700 border border-red-300'
                        : 'bg-gray-100 text-gray-700 border border-gray-300'
                    }`}
                  >
                    {issue}
                  </button>
                ))}
              </div>
            </div>

            {/* Comment */}
            <div>
              <p className="text-sm font-medium mb-2">Comentario (Opcional)</p>
              <Textarea
                placeholder="Comparte tu experiencia con este cliente..."
                value={comment}
                onChange={(e) => setComment(e.target.value)}
                className="resize-none"
                rows={3}
              />
            </div>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setShowRatingDialog(false)}>
              Cancelar
            </Button>
            <Button onClick={handleSubmitRating}>Enviar Calificación</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
