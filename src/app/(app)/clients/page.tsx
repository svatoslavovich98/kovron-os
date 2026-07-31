"use client";

import { useState, useMemo } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { formatCurrency, formatDate, cn } from "@/lib/utils";
import { demoClients, demoOrders, demoCars } from "@/lib/demo-data";
import { Search, Phone, MessageCircle, ShoppingBag, Calendar, ChevronRight } from "lucide-react";

export default function ClientsPage() {
  const [search, setSearch] = useState("");

  const clients = useMemo(() => {
    let list = demoClients.map((c) => {
      const orders = demoOrders.filter((o) => o.clientId === c.id);
      const totalSum = orders.reduce((s, o) => s + o.totalPrice, 0);
      const totalPaid = orders.reduce((s, o) => s + o.paid, 0);
      const debt = orders.reduce((s, o) => s + o.remaining, 0);
      const cars = orders.map((o) => demoCars.find((car) => car.id === o.carId)).filter(Boolean);
      return { ...c, orders, totalSum, totalPaid, debt, cars, orderCount: orders.length };
    });

    if (search) {
      const q = search.toLowerCase();
      list = list.filter(
        (c) => c.name.toLowerCase().includes(q) || c.phone.includes(q)
      );
    }

    return list;
  }, [search]);

  return (
    <div className="p-4 lg:p-6 max-w-3xl mx-auto space-y-4">
      <h1 className="text-xl font-bold">Клиенты</h1>

      <div className="relative">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
        <Input placeholder="Поиск по имени или телефону" value={search} onChange={(e) => setSearch(e.target.value)} className="pl-10" />
      </div>

      <p className="text-sm text-muted-foreground">{clients.length} клиентов</p>

      <div className="space-y-2">
        {clients.map((client) => (
          <Card key={client.id} className="hover:border-primary/30 transition-colors cursor-pointer">
            <CardContent className="p-4">
              <div className="flex items-center justify-between mb-2">
                <h3 className="font-semibold">{client.name}</h3>
                <ChevronRight className="h-4 w-4 text-muted-foreground" />
              </div>
              <div className="space-y-1.5">
                <div className="flex items-center gap-2 text-sm text-muted-foreground">
                  <Phone className="h-3.5 w-3.5" />
                  {client.phone}
                </div>
                {client.messenger && (
                  <div className="flex items-center gap-2 text-sm text-muted-foreground">
                    <MessageCircle className="h-3.5 w-3.5" />
                    {client.messenger}
                  </div>
                )}
                <div className="flex items-center gap-2 text-sm text-muted-foreground">
                  <ShoppingBag className="h-3.5 w-3.5" />
                  Заказов: {client.orderCount}
                </div>
                {client.source && (
                  <div className="flex items-center gap-2 text-sm text-muted-foreground">
                    <Calendar className="h-3.5 w-3.5" />
                    {client.source} • {formatDate(client.createdAt)}
                  </div>
                )}
              </div>
              <div className="flex gap-4 mt-3 pt-3 border-t border-border text-sm">
                <div>
                  <span className="text-muted-foreground">Всего: </span>
                  <span className="font-semibold">{formatCurrency(client.totalSum)}</span>
                </div>
                <div>
                  <span className="text-muted-foreground">Оплачено: </span>
                  <span className="text-income font-semibold">{formatCurrency(client.totalPaid)}</span>
                </div>
                {client.debt > 0 && (
                  <div>
                    <span className="text-muted-foreground">Долг: </span>
                    <span className="text-expense font-semibold">{formatCurrency(client.debt)}</span>
                  </div>
                )}
              </div>
              {client.cars.length > 0 && (
                <div className="flex flex-wrap gap-1.5 mt-2">
                  {client.cars.map((car) => car && (
                    <Badge key={car.id} variant="muted" className="text-[10px]">
                      {car.brand} {car.model}
                    </Badge>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  );
}
