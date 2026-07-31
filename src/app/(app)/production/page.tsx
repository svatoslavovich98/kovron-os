"use client";

import { useState } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Avatar } from "@/components/ui/avatar";
import { formatCurrency, formatDate, cn } from "@/lib/utils";
import { demoOrders, demoClients, demoCars, demoUsers, demoStatuses, kitLabels } from "@/lib/demo-data";
import { Calendar, User, Package, GripVertical } from "lucide-react";

const boardColumns = [
  { key: "pending_production", label: "Ожидает" },
  { key: "assigned", label: "Передано Оксане" },
  { key: "in_progress", label: "В работе" },
  { key: "paused", label: "Приостановлено" },
  { key: "ready", label: "Готово" },
  { key: "pending_delivery", label: "Ожидает выдачи" },
] as const;

export default function ProductionPage() {
  const [showToday, setShowToday] = useState(false);

  const productionOrders = demoOrders.filter(
    (o) => !["new", "pending_clarification", "pending_measurement", "measured",
             "pending_prepayment", "completed", "cancelled", "delivered"].includes(o.status)
  );

  return (
    <div className="p-4 lg:p-6 max-w-full mx-auto space-y-4">
      <div className="flex items-center justify-between">
        <h1 className="text-xl font-bold">Производство</h1>
        <button
          onClick={() => setShowToday(!showToday)}
          className={cn(
            "px-4 py-1.5 rounded-full text-xs font-semibold transition-all border",
            showToday ? "bg-primary text-primary-foreground border-primary" : "border-border text-muted-foreground"
          )}
        >
          Сегодня
        </button>
      </div>

      {/* Kanban Board */}
      <div className="flex gap-3 overflow-x-auto pb-4" style={{ scrollbarWidth: "thin" }}>
        {boardColumns.map((col) => {
          const colOrders = productionOrders
            .filter((o) => o.status === col.key)
            .map((o) => ({
              ...o,
              client: demoClients.find((c) => c.id === o.clientId),
              car: demoCars.find((c) => c.id === o.carId),
              assignee: demoUsers.find((u) => u.id === o.assigneeId),
            }));

          const statusConfig = demoStatuses.find((s) => s.key === col.key);

          return (
            <div key={col.key} className="flex-shrink-0 w-72 lg:w-80">
              <div className="flex items-center gap-2 mb-3 px-1">
                <div className="h-2.5 w-2.5 rounded-full" style={{ backgroundColor: statusConfig?.color }} />
                <h3 className="text-sm font-semibold">{col.label}</h3>
                <span className="text-xs text-muted-foreground bg-card px-2 py-0.5 rounded-full">
                  {colOrders.length}
                </span>
              </div>

              <div className="space-y-2 min-h-[200px]">
                {colOrders.map((order) => (
                  <Card key={order.id} className="cursor-grab active:cursor-grabbing hover:border-primary/30 transition-all">
                    <CardContent className="p-3 space-y-2">
                      <div className="flex items-start justify-between">
                        <div>
                          <p className="font-semibold text-sm">
                            {order.car?.brand} {order.car?.model}
                          </p>
                          <p className="text-xs text-muted-foreground">
                            {order.kitTypes.map((k) => kitLabels[k] || k).join(", ")}
                          </p>
                        </div>
                        <GripVertical className="h-4 w-4 text-muted-foreground shrink-0" />
                      </div>

                      {order.desiredDate && (
                        <div className="flex items-center gap-1 text-xs text-muted-foreground">
                          <Calendar className="h-3 w-3" />
                          {formatDate(order.desiredDate)}
                          {new Date(order.desiredDate) < new Date() && (
                            <span className="text-expense font-medium ml-1">Просрочено</span>
                          )}
                        </div>
                      )}

                      <div className="flex items-center justify-between">
                        {order.assignee ? (
                          <div className="flex items-center gap-1.5">
                            <Avatar name={order.assignee.name} size="sm" />
                            <span className="text-xs text-muted-foreground">{order.assignee.name}</span>
                          </div>
                        ) : (
                          <span className="text-xs text-muted-foreground italic">Не назначен</span>
                        )}
                        <span className="text-xs font-medium text-primary">
                          {formatCurrency(order.seamstressPayment)}
                        </span>
                      </div>

                      {/* Color dots */}
                      <div className="flex gap-1">
                        {[order.materialColor, order.edgeColor, order.stitchColor].map((color, i) => (
                          <div
                            key={i}
                            className="h-3.5 w-3.5 rounded-full border border-border"
                            title={color}
                            style={{
                              backgroundColor:
                                color === "Чёрный" ? "#1a1a1a" :
                                color === "Серый" ? "#6b6b6b" :
                                color === "Бежевый" ? "#d4b896" :
                                color === "Коричневый" ? "#6b4226" :
                                color === "Синий" ? "#2a4494" :
                                color === "Красный" ? "#b82020" :
                                color === "Зелёный" ? "#2d6b3f" : "#f0f0f0",
                            }}
                          />
                        ))}
                      </div>

                      {order.priority === "high" || order.priority === "urgent" ? (
                        <Badge variant="expense" className="text-[10px]">
                          {order.priority === "urgent" ? "Срочно" : "Высокий"}
                        </Badge>
                      ) : null}
                    </CardContent>
                  </Card>
                ))}

                {colOrders.length === 0 && (
                  <div className="border-2 border-dashed border-border rounded-md p-8 text-center">
                    <p className="text-xs text-muted-foreground">Пусто</p>
                  </div>
                )}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
