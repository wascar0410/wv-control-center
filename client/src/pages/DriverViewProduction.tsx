"use client";

import { useState } from "react";
import DashboardLayout from "@/components/DashboardLayout";
import { Card, CardContent } from "@/components/ui/card";
import { Package, Truck, CheckCircle, DollarSign } from "lucide-react";

export default function DriverViewProduction() {
  const [loads] = useState([
    {
      id: 1,
      clientName: "Cliente Demo",
      pickupAddress: "New Jersey",
      deliveryAddress: "New York",
      price: 450,
      status: "available",
    },
  ]);

  const stats = {
    activeLoads: 0,
    completedToday: 0,
    totalEarnings: 0,
  };

  return (
    <DashboardLayout>
      <div className="space-y-6">
        <h1 className="text-2xl font-bold">Driver Panel (Modo Seguro)</h1>

        {/* Stats */}
        <div className="grid grid-cols-3 gap-4">
          <Card>
            <CardContent className="p-4">
              <Truck className="mb-2" />
              <p>Cargas Activas</p>
              <p className="font-bold">{stats.activeLoads}</p>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="p-4">
              <CheckCircle className="mb-2" />
              <p>Completadas</p>
              <p className="font-bold">{stats.completedToday}</p>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="p-4">
              <DollarSign className="mb-2" />
              <p>Ganancias</p>
              <p className="font-bold">${stats.totalEarnings}</p>
            </CardContent>
          </Card>
        </div>

        {/* Loads */}
        <Card>
          <CardContent className="p-4">
            {loads.length === 0 ? (
              <p>No hay cargas</p>
            ) : (
              loads.map((l) => (
                <div key={l.id} className="border p-3 rounded-lg mb-2">
                  <p className="font-medium">{l.clientName}</p>
                  <p className="text-sm text-muted-foreground">
                    {l.pickupAddress} → {l.deliveryAddress}
                  </p>
                  <p className="font-bold text-green-500">${l.price}</p>
                </div>
              ))
            )}
          </CardContent>
        </Card>
      </div>
    </DashboardLayout>
  );
}
